import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { authMiddleware } from "./middleware/authMiddleware";
import { errorHandler } from "./middleware/errorHandler";
import analysisRouter from "./routes/analysis";
import commentRouter from "./routes/comments";
import projectRouter from "./routes/projects";
import promptRouter from "./routes/prompts";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// CORS設定 - すべてのオリジンを許可
app.use(
  cors({
    origin: "*",
    credentials: false, // credentialsはfalseに設定（'*'との組み合わせではtrueは使用不可）
  }),
);

// その他のミドルウェア設定
app.use(express.json());
app.use("/api", authMiddleware); // 全APIルートに認可ミドルウェアを適用

// MongoDBへの接続
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/comment-system",
  )
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// MongoDB接続監視
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected");
});

// ルーターの設定
// 各ルーターを個別のパスプレフィックスで設定
app.use("/api/projects", projectRouter);
app.use("/api", commentRouter); // コメントルーターは/api/projects/:projectId/commentsのパスを持つ
app.use("/api", analysisRouter); // 分析ルーターは/api/projects/:projectId/analysisのパスを持つ
app.use("/api/prompts", promptRouter); // プロンプト関連のエンドポイント

// エラーハンドリングミドルウェア
app.use(errorHandler);

// サーバーの起動
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
