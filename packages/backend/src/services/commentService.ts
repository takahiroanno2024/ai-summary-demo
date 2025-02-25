import mongoose from 'mongoose';
import { Comment, CommentSourceType, ICommentStance, IComment } from '../models/comment';
import { Project } from '../models/project';
import { StanceAnalyzer, StanceAnalysisResult } from './stanceAnalyzer';
import { extractContent } from './extractionService';
import { AppError } from '../middleware/errorHandler';
import { processInBatches } from '../utils/batchProcessor';

export interface CommentInput {
  content: string;
  sourceType?: CommentSourceType;
  sourceUrl?: string;
}

export interface CommentCreateResponse {
  comment: mongoose.Document<unknown, {}, IComment> & IComment & { _id: mongoose.Types.ObjectId };
  analyzedQuestions: {
    id: string;
    text: string;
    stances: ICommentStance[];
  }[];
}

export class CommentService {
  constructor(
    private stanceAnalyzer: StanceAnalyzer
  ) {}

  async getProjectComments(projectId: string) {
    return await Comment.find({ projectId }).sort({ createdAt: -1 });
  }

  private filterValidStances(stances: StanceAnalysisResult[]): ICommentStance[] {
    return stances
      .filter((stance): stance is ICommentStance => 
        stance.stanceId !== null && 
        stance.confidence !== null
      );
  }

  async createComment(projectId: string, commentData: CommentInput): Promise<CommentCreateResponse> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const extractedContent = await extractContent(commentData.content, project.extractionTopic, project.context);
    const analysisResults = extractedContent === null ? [] : await this.stanceAnalyzer.analyzeAllStances(
      extractedContent,
      project.questions.map(q => ({
        id: q.id,
        text: q.text,
        stances: q.stances,
      })),
      [], // 新規コメントなので空の配列を渡す
      project.context // プロジェクトのcontextを渡す
    );

    const stances = this.filterValidStances(analysisResults);

    const comment = new Comment({
      content: commentData.content,
      projectId,
      extractedContent,
      stances,
      sourceType: commentData.sourceType || 'other',
      sourceUrl: commentData.sourceUrl || '',
    });

    const savedComment = await comment.save();

    // Group stances by question
    const analyzedQuestions = project.questions.map(question => ({
      id: question.id,
      text: question.text,
      stances: stances.filter(stance => stance.questionId === question.id)
    }));

    return {
      comment: savedComment,
      analyzedQuestions
    };
  }

  async bulkImportComments(projectId: string, comments: (string | CommentInput)[]) {
    if (!Array.isArray(comments)) {
      throw new AppError(400, 'Comments must be an array');
    }

    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    console.log(`Starting bulk import of ${comments.length} comments for project ${projectId}`);
    const validComments = comments.filter((c: any) => (c != "" && !!c?.content));

    const processedComments = await processInBatches(
      validComments,
      50,
      async (comment) => {
        const content = typeof comment === 'string' ? comment : comment.content;
        const sourceType = typeof comment === 'string' ? 'other' : (comment.sourceType || 'other');
        const sourceUrl = typeof comment === 'string' ? '' : (comment.sourceUrl || '');

        const extractedContent = await extractContent(content, project.extractionTopic, project.context);
        const analysisResults = extractedContent !== null
          ? await this.stanceAnalyzer.analyzeAllStances(
              extractedContent,
              project.questions.map(q => ({
                id: q.id,
                text: q.text,
                stances: q.stances,
              })),
              [], // 新規コメントなので空の配列を渡す
              project.context // プロジェクトのcontextを渡す
            )
          : [];

        const stances = this.filterValidStances(analysisResults);

        return new Comment({
          content,
          projectId,
          extractedContent,
          stances,
          sourceType,
          sourceUrl,
        });
      },
      0
    );

    return await Comment.insertMany(processedComments);
  }
}