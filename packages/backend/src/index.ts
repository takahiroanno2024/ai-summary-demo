import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRouter from './routes/chat';
import projectRouter from './routes/projects';
import commentRouter from './routes/comments';
import analysisRouter from './routes/analysis';
import promptRouter from './routes/prompts';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/authMiddleware';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// ミドルウェアの設定
app.use(cors());
app.use(express.json());
app.use('/api', authMiddleware); // 全APIルートに認可ミドルウェアを適用

// MongoDBへの接続
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/comment-system')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// MongoDB接続監視
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// ルーターの設定
// 各ルーターを個別のパスプレフィックスで設定
app.use('/api/chat', chatRouter);
app.use('/api/projects', projectRouter);
app.use('/api', commentRouter); // コメントルーターは/api/projects/:projectId/commentsのパスを持つ
app.use('/api', analysisRouter); // 分析ルーターは/api/projects/:projectId/analysisのパスを持つ
app.use('/api/prompts', promptRouter); // プロンプト関連のエンドポイント

// エラーハンドリングミドルウェア
app.use(errorHandler);

// サーバーの起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
