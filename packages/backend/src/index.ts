import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Comment, IComment } from './models/comment';
import { Project, IProject, IQuestion } from './models/project';
import { extractContent } from './services/extractionService';
import { StanceAnalyzer } from './services/stanceAnalyzer';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ミドルウェアの設定
app.use(cors());
app.use(express.json());

// StanceAnalyzerの初期化
const stanceAnalyzer = new StanceAnalyzer(process.env.GEMINI_API_KEY || '');

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

    // 問いが変更された場合、全コメントの立場を再分析
    if (hasQuestionsChanged && questions) {
      const comments = await Comment.find({ projectId });
      
      for (const comment of comments) {
        if (comment.extractedContent) {
          const newStances = await stanceAnalyzer.analyzeAllStances(
            comment.extractedContent,
            questions.map((q: IQuestion) => ({
              id: q.id,
              text: q.text,
              stances: q.stances,
            })),
            comment.stances || [] // 既存の分析結果を渡す
          );
          
          await Comment.findByIdAndUpdate(comment._id, { stances: newStances });
        }
      }
    }

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Error updating project', error });
  }
});

// // プロジェクトの問いと立場の更新
// app.put('/api/projects/:projectId/questions', async (req, res) => {
//   try {
//     const { questions } = req.body;
//     const projectId = req.params.projectId;

//     console.log('Received questions:', questions);
//     console.log('Project ID:', projectId);

//     // プロジェクトの更新
//     const updatedProject = await Project.findByIdAndUpdate(
//       projectId,
//       { questions },
//       { new: true }
//     );
//     if (!updatedProject) {
//       console.log('Project not found');
//       return res.status(404).json({ message: 'Project not found' });
//     }

//     console.log('Updated project:', updatedProject);

//     // プロジェクトの全コメントを取得
//     const comments = await Comment.find({ projectId });
//     console.log('Comments found:', comments.length);

//     // 抽出されたコンテンツがあるコメントのみを再分析
//     for (const comment of comments) {
//       if (comment.extractedContent) {
//         console.log('Reanalyzing comment:', comment._id);
//         const newStances = await stanceAnalyzer.analyzeAllStances(
//           comment.extractedContent,
//           questions.map((q: { id: string; text: string; stances: { id: string; name: string }[] }) => ({
//             id: q.id,
//             text: q.text,
//             stances: q.stances,
//           })),
//           comment.stances || [] // 既存の分析結果を渡す
//         );

//         // コメントの立場情報を更新
//         await Comment.findByIdAndUpdate(comment._id, { stances: newStances });
//         console.log('Updated stances for comment:', comment._id);
//       }
//     }

//     res.json(updatedProject);
//   } catch (error) {
//     console.error('Error updating project questions:', error);
//     res.status(500).json({ message: 'Error updating project questions', error });
//   }
// });

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
    });
    const savedComment = await comment.save();
    res.status(201).json(savedComment);
  } catch (error) {
    res.status(400).json({ message: 'Error creating comment', error });
  }
});

// サーバーの起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});