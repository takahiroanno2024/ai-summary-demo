import express from "express";
import { validateObjectId } from "../middleware/validateObjectId";
import { CommentService } from "../services/commentService";
import { StanceAnalyzer } from "../services/stanceAnalyzer";

const router = express.Router();

// サービスのインスタンスを作成
const stanceAnalyzer = new StanceAnalyzer(process.env.OPENROUTER_API_KEY || "");
const commentService = new CommentService(stanceAnalyzer);

// プロジェクトのコメント一覧の取得
router.get(
  "/projects/:projectId/comments",
  validateObjectId("projectId"),
  async (req, res, next) => {
    try {
      const comments = await commentService.getProjectComments(
        req.params.projectId,
      );
      res.json(comments);
    } catch (error) {
      next(error);
    }
  },
);

// プロジェクトへのコメント追加
router.post(
  "/projects/:projectId/comments",
  validateObjectId("projectId"),
  async (req, res, next) => {
    try {
      const { content, sourceType, sourceUrl, skipDuplicates } = req.body;
      const result = await commentService.createComment(
        req.params.projectId,
        {
          content,
          sourceType,
          sourceUrl,
        },
        { skipDuplicates },
      );
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

// コメントの一括インポート
router.post(
  "/projects/:projectId/comments/bulk",
  validateObjectId("projectId"),
  async (req, res, next) => {
    try {
      const { comments, skipDuplicates } = req.body;
      const savedComments = await commentService.bulkImportComments(
        req.params.projectId,
        comments,
        { skipDuplicates },
      );
      res.status(201).json(savedComments);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
