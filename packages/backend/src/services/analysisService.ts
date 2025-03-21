import { AppError } from "../middleware/errorHandler";
import { Comment } from "../models/comment";
import { Project } from "../models/project";
import type { ProjectReportGenerator } from "./projectReportGenerator";
import type { ProjectVisualReportGenerator } from "./projectVisualReportGenerator";
import type { StanceReportGenerator } from "./stanceReportGenerator";

export class AnalysisService {
  constructor(
    private stanceReportGenerator: StanceReportGenerator,
    private projectReportGenerator: ProjectReportGenerator,
    private projectVisualReportGenerator: ProjectVisualReportGenerator,
  ) {}

  async analyzeStances(
    projectId: string,
    questionId: string,
    forceRegenerate = false,
    customPrompt?: string,
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, "Project not found");
    }

    const question = project.questions.find((q) => q.id === questionId);
    if (!question) {
      throw new AppError(404, "Question not found");
    }

    const comments = await Comment.find({ projectId });
    return await this.stanceReportGenerator.analyzeStances(
      projectId,
      question.text,
      comments,
      question.stances,
      questionId,
      forceRegenerate,
      customPrompt,
    );
  }

  async generateProjectReport(
    projectId: string,
    forceRegenerate = false,
    customPrompt?: string,
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, "Project not found");
    }

    const comments = await Comment.find({ projectId });

    return await this.projectReportGenerator.generateProjectReport(
      project,
      comments,
      forceRegenerate,
      customPrompt,
    );
  }

  async generateProjectVisualReport(
    projectId: string,
    forceRegenerate = false,
    customPrompt?: string,
  ) {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, "Project not found");
    }

    const comments = await Comment.find({ projectId });

    return await this.projectVisualReportGenerator.generateProjectVisualReport(
      project,
      comments,
      forceRegenerate,
      customPrompt,
    );
  }

  async exportProjectDataToCsv(projectId: string): Promise<string> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError(404, "Project not found");
    }

    const comments = await Comment.find({ projectId }).sort({ createdAt: 1 });

    // CSVヘッダーの作成
    const headers = [
      "CommentID",
      "Content",
      "ExtractedContent",
      "Source",
      "URL",
    ];
    for (const question of project.questions) {
      headers.push(`Q${question.id}(${question.text})`);
    }

    // CSVデータの作成
    const csvRows = [headers.join(",")];

    // 各コメントについて処理
    for (const comment of comments) {
      const row = [
        comment._id.toString(),
        `"${comment.content.replace(/"/g, '""')}"`,
        comment.extractedContent
          ? `"${comment.extractedContent.replace(/"/g, '""')}"`
          : "",
        comment.sourceType || "",
        comment.sourceUrl || "",
      ];

      // 各質問に対する立場を追加
      for (const question of project.questions) {
        const stance = comment.stances.find(
          (s) => s.questionId === question.id,
        );
        if (stance) {
          const stanceObj = question.stances.find(
            (s) => s.id === stance.stanceId,
          );
          row.push(stanceObj ? stanceObj.name : "");
        } else {
          row.push("");
        }
      }

      csvRows.push(row.join(","));
    }

    return csvRows.join("\n");
  }
}
