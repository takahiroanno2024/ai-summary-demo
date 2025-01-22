import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Comment, IComment } from './models/comment';
import { Project, IProject, IQuestion } from './models/project';
import { extractContent } from './services/extractionService';
import { StanceAnalyzer } from './services/stanceAnalyzer';
import { StanceAnalysisService } from './services/stanceAnalysisService';
import { QuestionGenerator } from './services/questionGenerator';
import { v4 as uuidv4 } from 'uuid';

// 並列処理を制御するユーティリティ関数
async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

// 環境変数から並列処理の上限を取得（デフォルト値: 5）
const PARALLEL_ANALYSIS_LIMIT = parseInt(process.env.PARALLEL_ANALYSIS_LIMIT || '5', 10);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ミドルウェアの設定
app.use(cors());
app.use(express.json());

// サービスの初期化
const stanceAnalyzer = new StanceAnalyzer(process.env.GEMINI_API_KEY || '');
const questionGenerator = new QuestionGenerator(process.env.GEMINI_API_KEY || '');
const stanceAnalysisService = new StanceAnalysisService(process.env.GEMINI_API_KEY || '');

// MongoDBへの接続
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/comment-system')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// APIエンドポイント

// プロジェクト関連のエンドポイント
// プロジェクト一覧の取得
app.get('/api/projects', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects', error });
  }
});

// プロジェクトの追加
app.post('/api/projects', async (req, res) => {
  try {
    const { name, description, extractionTopic } = req.body;
    const project = new Project({
      name,
      description,
      extractionTopic,
      questions: [], // 初期値として空の配列を設定
    });
    const savedProject = await project.save();
    res.status(201).json(savedProject);
  } catch (error) {
    res.status(400).json({ message: 'Error creating project', error });
  }
});

// 特定のプロジェクトの取得
app.get('/api/projects/:projectId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project', error });
  }
});

// プロジェクトの更新
app.put('/api/projects/:projectId', async (req, res) => {
  try {
    const { name, description, extractionTopic, questions } = req.body;
    const projectId = req.params.projectId;

    // 現在のプロジェクトを取得
    const currentProject = await Project.findById(projectId);
    if (!currentProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // 問いが変更されているか確認
    const hasQuestionsChanged = JSON.stringify(currentProject.questions) !== JSON.stringify(questions);

    // プロジェクトを更新
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { name, description, extractionTopic, questions },
      { new: true }
    );

    // 問いが変更された場合、全コメントの立場を並列で再分析
    if (hasQuestionsChanged && questions) {
      const comments = await Comment.find({ projectId });
      const commentsToAnalyze = comments.filter(comment => comment.extractedContent);
      
      const mappedQuestions = questions.map((q: IQuestion) => ({
        id: q.id,
        text: q.text,
        stances: q.stances,
      }));

      // コメントを並列で処理
      await processInBatches(
        commentsToAnalyze,
        PARALLEL_ANALYSIS_LIMIT,
        async (comment) => {
          const newStances = await stanceAnalyzer.analyzeAllStances(
            comment.extractedContent!,
            mappedQuestions,
            comment.stances || []
          );
          
          await Comment.findByIdAndUpdate(comment._id, { stances: newStances });
        }
      );
    }

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Error updating project', error });
  }
});

// プロジェクトの質問を自動生成
app.post('/api/projects/:projectId/generate-questions', async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // プロジェクトの存在確認
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // プロジェクトの全コメントを取得
    const comments = await Comment.find({ projectId });
    
    // 抽出されたコンテンツのみを使用
    const extractedContents = comments
      .map(comment => comment.extractedContent)
      .filter((content): content is string => content !== null);

    if (extractedContents.length === 0) {
      return res.status(400).json({
        message: 'No extracted contents found in this project'
      });
    }

    // 新しい質問と立場を生成
    const generatedQuestions = await questionGenerator.generateQuestions(extractedContents);

    if (generatedQuestions.length === 0) {
      return res.status(500).json({
        message: 'Failed to generate questions'
      });
    }

    // 生成された質問をプロジェクトのフォーマットに変換
    const formattedQuestions = generatedQuestions.map(q => ({
      id: uuidv4(),
      text: q.text,
      stances: q.stances.map(s => ({
        id: uuidv4(),
        name: s.name
      }))
    }));

    // プロジェクトの質問を更新
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { questions: formattedQuestions },
      { new: true }
    );

    // 全コメントの立場を並列で再分析
    const commentsToAnalyze = comments.filter(comment => comment.extractedContent);
    const mappedQuestions = formattedQuestions.map(q => ({
      id: q.id,
      text: q.text,
      stances: q.stances,
    }));

    // コメントを並列で処理
    await processInBatches(
      commentsToAnalyze,
      PARALLEL_ANALYSIS_LIMIT,
      async (comment) => {
        const newStances = await stanceAnalyzer.analyzeAllStances(
          comment.extractedContent!,
          mappedQuestions
        );
        
        await Comment.findByIdAndUpdate(comment._id, { stances: newStances });
      }
    );

    res.json(updatedProject);
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      message: 'Error generating questions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// コメント関連のエンドポイント
// プロジェクトのコメント一覧の取得
app.get('/api/projects/:projectId/comments', async (req, res) => {
  try {
    const comments = await Comment.find({
      projectId: req.params.projectId
    }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error });
  }
});

// プロジェクトへのコメント追加
app.post('/api/projects/:projectId/comments', async (req, res) => {
  try {
    const { content } = req.body;
    const projectId = req.params.projectId;

    // プロジェクトの取得
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // 内容の抽出
    const extractedContent = await extractContent(content, project.extractionTopic);

    // // 抽出結果がnullの場合（トピックなし、無関係、エラー）は立場分析をスキップ
    // const stances = extractedContent === null ? [] : await stanceAnalyzer.analyzeAllStances(
    //   extractedContent,
    //   project.questions.map(q => ({
    //     id: q.id,
    //     text: q.text,
    //     stances: q.stances,
    //   }))
    // );
    const stances: any[] = [];

    // コメントの保存
    const comment = new Comment({
      content,
      projectId,
      extractedContent,
      stances,
    });
    const savedComment = await comment.save();
    res.status(201).json(savedComment);
  } catch (error) {
    res.status(400).json({ message: 'Error creating comment', error });
  }
});

// 質問ごとの立場の分析を取得
app.get('/api/projects/:projectId/questions/:questionId/stance-analysis', async (req, res) => {
  try {
    const { projectId, questionId } = req.params;

    // プロジェクトの存在確認
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // 質問の存在確認
    const question = project.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // プロジェクトの全コメントを取得
    const comments = await Comment.find({ projectId });

    // 立場ごとのコメントを集計
    const stanceAnalysis = new Map<string, { count: number; comments: string[] }>();
    
    // 初期化
    question.stances.forEach(stance => {
      stanceAnalysis.set(stance.id, { count: 0, comments: [] });
    });

    // コメントを分類
    comments.forEach(comment => {
      const stance = comment.stances?.find(s => s.questionId === questionId);
      if (stance && comment.extractedContent) {
        const analysis = stanceAnalysis.get(stance.stanceId);
        if (analysis) {
          analysis.count++;
          analysis.comments.push(comment.extractedContent);
        }
      }
    });

    const result = await stanceAnalysisService.analyzeStances(
      projectId,
      question.text,
      comments,
      question.stances,
      questionId
    );

    res.json(result);
  } catch (error) {
    console.error('Error analyzing stances:', error);
    res.status(500).json({
      message: 'Error analyzing stances',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// サーバーの起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});