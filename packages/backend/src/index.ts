import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Comment, IComment, CommentSourceType } from './models/comment';
import { Project, IProject, IQuestion } from './models/project';
import { extractContent } from './services/extractionService';
import { StanceAnalyzer } from './services/stanceAnalyzer';
import { StanceReportGenerator } from './services/stanceReportGenerator';
import { ProjectReportGenerator } from './services/projectReportGenerator';
import { QuestionGenerator } from './services/questionGenerator';
import { v4 as uuidv4 } from 'uuid';


const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 並列処理を制御するユーティリティ関数
async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>,
  delayMs: number = 1000 // デフォルトで1秒の遅延
): Promise<R[]> {
  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);
  console.log(`Starting batch processing of ${items.length} items in ${totalBatches} batches of size ${batchSize}`);

  for (let i = 0; i < items.length; i += batchSize) {
    const currentBatch = Math.floor(i / batchSize) + 1;
    const batch = items.slice(i, i + batchSize);
    console.log(`Processing batch ${currentBatch}/${totalBatches} (${batch.length} items)`);

    // バッチ内の各アイテムを並列処理
    const batchPromises = batch.map(async (item, j) => {
      const result = await processor(item);
      console.log(`Completed item ${i + j + 1}/${items.length}`);
      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // バッチ処理後に遅延を入れる
    if (i < items.length - batchSize) {
      console.log(`Waiting ${delayMs}ms before processing next batch...`);
      await delay(delayMs);
    }

    console.log(`Completed batch ${currentBatch}/${totalBatches}`);
  }

  console.log('Batch processing completed');
  return results;
}

// 環境変数から並列処理の上限を取得（デフォルト値: 5）
const PARALLEL_ANALYSIS_LIMIT = parseInt(process.env.PARALLEL_ANALYSIS_LIMIT || '50', 10);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ミドルウェアの設定
app.use(cors());
app.use(express.json());

// サービスの初期化
const stanceAnalyzer = new StanceAnalyzer(process.env.GEMINI_API_KEY || '');
const questionGenerator = new QuestionGenerator(process.env.GEMINI_API_KEY || '');
const stanceAnalysisService = new StanceReportGenerator(process.env.GEMINI_API_KEY || '');
const projectReportGenerator = new ProjectReportGenerator(process.env.GEMINI_API_KEY || '');

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
    
    // 各プロジェクトのコメント件数を取得
    const projectsWithCommentCount = await Promise.all(
      projects.map(async (project) => {
        const commentCount = await Comment.countDocuments({ projectId: project._id });
        return {
          ...project.toObject(),
          commentCount
        };
      })
    );
    
    res.json(projectsWithCommentCount);
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

    // 論点が変更されているか確認
    const hasQuestionsChanged = JSON.stringify(currentProject.questions) !== JSON.stringify(questions);

    // プロジェクトを更新
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { name, description, extractionTopic, questions },
      { new: true }
    );

    // 論点が変更された場合、全コメントの立場を並列で再分析
    if (hasQuestionsChanged && questions) {
      console.log(`Questions changed for project ${projectId}. Starting comment reanalysis...`);
      const comments = await Comment.find({ projectId });
      const commentsToAnalyze = comments.filter(comment => comment.extractedContent);
      console.log(`Found ${commentsToAnalyze.length} comments with extracted content to analyze`);
      
      const mappedQuestions = questions.map((q: IQuestion) => ({
        id: q.id,
        text: q.text,
        stances: q.stances,
      }));
      console.log(`Mapped ${mappedQuestions.length} questions for analysis`);

      // コメントを並列で処理
      await processInBatches(
        commentsToAnalyze,
        PARALLEL_ANALYSIS_LIMIT,
        async (comment) => {
          console.log(`Analyzing stances for comment ${comment._id}`);
          const newStances = await stanceAnalyzer.analyzeAllStances(
            comment.extractedContent!,
            mappedQuestions,
            comment.stances || []
          );
          
          await Comment.findByIdAndUpdate(comment._id, { stances: newStances });
          console.log(`Updated stances for comment ${comment._id}`);
        },
        0
      );
      console.log(`Completed reanalysis of all comments for project ${projectId}`);
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
    console.log(`Starting stance reanalysis after question generation for project ${projectId}`);
    const commentsToAnalyze = comments.filter(comment => comment.extractedContent);
    console.log(`Found ${commentsToAnalyze.length} comments with extracted content to analyze`);
    
    const mappedQuestions = formattedQuestions.map(q => ({
      id: q.id,
      text: q.text,
      stances: q.stances,
    }));
    console.log(`Mapped ${mappedQuestions.length} newly generated questions for analysis`);

    // コメントを並列で処理
    await processInBatches(
      commentsToAnalyze,
      PARALLEL_ANALYSIS_LIMIT,
      async (comment) => {
        console.log(`Analyzing stances for comment ${comment._id} with new questions`);
        const newStances = await stanceAnalyzer.analyzeAllStances(
          comment.extractedContent!,
          mappedQuestions
        );
        
        await Comment.findByIdAndUpdate(comment._id, { stances: newStances });
        console.log(`Updated stances for comment ${comment._id} with new questions`);
      },
      0
    );
    console.log(`Completed stance reanalysis for all comments in project ${projectId}`);

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
// コメントの一括インポート
app.post('/api/projects/:projectId/comments/bulk', async (req, res) => {
  try {
    const { comments } = req.body;
    const projectId = req.params.projectId;

    if (!Array.isArray(comments)) {
      return res.status(400).json({ message: 'Comments must be an array' });
    }

    // プロジェクトの取得
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    console.log(`Starting bulk import of ${comments.length} comments for project ${projectId}`);
    
    // コメントを並列で処理
    const processedComments = await processInBatches(
      comments,
      PARALLEL_ANALYSIS_LIMIT,
      async (comment) => {
        // コメントの内容とソース情報を取得
        const content = typeof comment === 'string' ? comment : comment.content;
        const sourceType = typeof comment === 'string' ? 'other' : (comment.sourceType || 'other');
        const sourceUrl = typeof comment === 'string' ? '' : (comment.sourceUrl || '');
        console.log(`Processing comment: ${content.substring(0, 50)}...`);

        // 内容の抽出
        console.log('Extracting content based on topic...');
        const extractedContent = await extractContent(content, project.extractionTopic);
        if (extractedContent === null) {
          console.log('No relevant content extracted for this comment');
        } else {
          console.log(`Extracted content: ${extractedContent.substring(0, 50)}...`);
        }

        // 抽出結果がnullの場合は立場分析をスキップ
        let stances: { questionId: string; stanceId: string | null }[] = [];
        if (extractedContent !== null) {
          console.log('Analyzing stances for extracted content...');
          stances = await stanceAnalyzer.analyzeAllStances(
            extractedContent,
            project.questions.map(q => ({
              id: q.id,
              text: q.text,
              stances: q.stances,
            }))
          );
          console.log(`Stance analysis completed with ${stances.length} stances`);
        }

        // コメントオブジェクトの作成
        console.log('Creating comment object...');
        return new Comment({
          content,
          projectId,
          extractedContent,
          stances,
          sourceType: sourceType as CommentSourceType,
          sourceUrl,
        });
      },
      0
    );
    
    console.log(`Completed processing ${processedComments.length} comments`);

    // 全コメントを一括保存
    const savedComments = await Comment.insertMany(processedComments);
    res.status(201).json(savedComments);
  } catch (error) {
    console.error('Error importing comments:', error);
    res.status(400).json({
      message: 'Error importing comments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

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
    const { content, sourceType = 'other', sourceUrl = '' } = req.body;
    const projectId = req.params.projectId;

    // プロジェクトの取得
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // 内容の抽出
    const extractedContent = await extractContent(content, project.extractionTopic);

    // 抽出結果がnullの場合（トピックなし、無関係、エラー）は立場分析をスキップ
    const stances = extractedContent === null ? [] : await stanceAnalyzer.analyzeAllStances(
      extractedContent,
      project.questions.map(q => ({
        id: q.id,
        text: q.text,
        stances: q.stances,
      }))
    );

    // コメントの保存
    const comment = new Comment({
      content,
      projectId,
      extractedContent,
      stances,
      sourceType: sourceType as CommentSourceType,
      sourceUrl,
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

    const forceRegenerate = req.query.forceRegenerate === 'true';
    
    const result = await stanceAnalysisService.analyzeStances(
      projectId,
      question.text,
      comments,
      question.stances,
      questionId,
      forceRegenerate
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
// プロジェクト全体の分析レポートを生成
app.get('/api/projects/:projectId/analysis', async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // プロジェクトの取得
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // プロジェクトの全コメントを取得
    const comments = await Comment.find({ projectId });

    // プロジェクト全体の分析を生成
    const analysis = await projectReportGenerator.generateProjectReport(
      project,
      comments
    );

    res.json(analysis);
  } catch (error) {
    console.error('Error generating project analysis:', error);
    res.status(500).json({
      message: 'Error generating project analysis',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// プロジェクトデータをCSVとしてエクスポート
app.get('/api/projects/:projectId/export-csv', async (req, res) => {
  try {
    const projectId = req.params.projectId;

    // プロジェクトの取得
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // プロジェクトの全コメントを取得
    const comments = await Comment.find({ projectId }).sort({ createdAt: 1 });

    // CSVヘッダーの作成
    const headers = ['CommentID', 'Content', 'ExtractedContent', 'Source', 'URL'];
    project.questions.forEach(question => {
      headers.push(`Q${question.id}(${question.text})`);
    });

    // CSVデータの作成
    const csvRows = [headers.join(',')];

    // 各コメントについて処理
    comments.forEach(comment => {
      const row = [
        comment._id.toString(),
        `"${comment.content.replace(/"/g, '""')}"`,
        comment.extractedContent ? `"${comment.extractedContent.replace(/"/g, '""')}"` : '',
        comment.sourceType || '',
        comment.sourceUrl || ''
      ];

      // 各質問に対する立場を追加
      project.questions.forEach(question => {
        const stance = comment.stances.find(s => s.questionId === question.id);
        if (stance) {
          const stanceObj = question.stances.find(s => s.id === stance.stanceId);
          row.push(stanceObj ? stanceObj.name : '');
        } else {
          row.push('');
        }
      });

      csvRows.push(row.join(','));
    });

    // CSVファイルとしてレスポンスを返す
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}-export.csv`);
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Error exporting project data:', error);
    res.status(500).json({
      message: 'Error exporting project data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
