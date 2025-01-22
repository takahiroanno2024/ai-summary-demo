import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Comment, IComment } from './models/comment';
import { Project, IProject } from './models/project';
import { extractContent } from './services/extractionService';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ミドルウェアの設定
app.use(cors());
app.use(express.json());

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
    const { name, description, extractionTopic } = req.body;
    const updatedProject = await Project.findByIdAndUpdate(
      req.params.projectId,
      { name, description, extractionTopic },
      { new: true }
    );
    if (!updatedProject) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: 'Error updating project', error });
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

    // コメントの保存
    const comment = new Comment({
      content,
      projectId,
      extractedContent,
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