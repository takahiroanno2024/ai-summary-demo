import { Comment, CommentSourceType, ICommentStance } from '../models/comment';
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

  async createComment(projectId: string, commentData: CommentInput) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const extractedContent = await extractContent(commentData.content, project.extractionTopic);
    const analysisResults = extractedContent === null ? [] : await this.stanceAnalyzer.analyzeAllStances(
      extractedContent,
      project.questions.map(q => ({
        id: q.id,
        text: q.text,
        stances: q.stances,
      })),
      [] // 新規コメントなので空の配列を渡す
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

    return await comment.save();
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
    
    const processedComments = await processInBatches(
      comments,
      50,
      async (comment) => {
        const content = typeof comment === 'string' ? comment : comment.content;
        const sourceType = typeof comment === 'string' ? 'other' : (comment.sourceType || 'other');
        const sourceUrl = typeof comment === 'string' ? '' : (comment.sourceUrl || '');

        const extractedContent = await extractContent(content, project.extractionTopic);
        const analysisResults = extractedContent !== null
          ? await this.stanceAnalyzer.analyzeAllStances(
              extractedContent,
              project.questions.map(q => ({
                id: q.id,
                text: q.text,
                stances: q.stances,
              })),
              [] // 新規コメントなので空の配列を渡す
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