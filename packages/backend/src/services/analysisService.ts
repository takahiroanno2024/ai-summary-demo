import { Project } from '../models/project';
import { Comment } from '../models/comment';
import { StanceReportGenerator } from './stanceReportGenerator';
import { ProjectReportGenerator } from './projectReportGenerator';
import { AppError } from '../middleware/errorHandler';

export class AnalysisService {
  constructor(
    private stanceReportGenerator: StanceReportGenerator,
    private projectReportGenerator: ProjectReportGenerator
  ) {}

  async analyzeStances(
    projectId: string,
    questionId: string,
    forceRegenerate: boolean = false,
    customPrompt?: string
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const question = project.questions.find(q => q.id === questionId);
    if (!question) {
      throw new AppError(404, 'Question not found');
    }

    const comments = await Comment.find({ projectId });
    return await this.stanceReportGenerator.analyzeStances(
      projectId,
      question.text,
      comments,
      question.stances,
      questionId,
      forceRegenerate,
      customPrompt
    );
  }

  async generateProjectReport(projectId: string, forceRegenerate: boolean = false, customPrompt?: string) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, 'Project not found');
    }

    const comments = await Comment.find({ projectId });
    
    return await this.projectReportGenerator.generateProjectReport(
      project,
      comments,
      forceRegenerate,
      customPrompt
    );
  }

  async exportProjectDataToCsv(projectId: string): Promise<string> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, 'Project not found');
    }

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

    return csvRows.join('\n');
  }
}