import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import { IProject } from '../models/project';
import { IComment } from '../models/comment';
import { StanceReportGenerator } from './stanceReportGenerator';
import { ProjectAnalysis, IProjectAnalysis } from '../models/projectAnalysis';

export interface ProjectAnalysisResult {
  projectName: string;
  overallAnalysis: string;
}

export class ProjectReportGenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private stanceReportGenerator: StanceReportGenerator;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    this.stanceReportGenerator = new StanceReportGenerator(apiKey);
  }

  private async generateOverallAnalysisPrompt(
    project: IProject,
    questionAnalyses: {
      question: string;
      stanceAnalysis: {
        [key: string]: {
          count: number;
          comments: string[];
        };
      };
      analysis: string;
    }[]
  ): Promise<string> {
    return `以下のプロジェクトの分析結果を読み、プロジェクト全体の傾向や特徴について理解し、
その内容を万人に伝わるように分かりやすく、かつ十分に専門的で具体的になるように丁寧に説明してください。

プロジェクト名: ${project.name}
プロジェクト概要: ${project.description}

${questionAnalyses.map((qa, index) => `
論点${index + 1}: ${qa.question}

論点に対する立場の分布と代表的なコメント:
${Object.entries(qa.stanceAnalysis).map(([stance, data]) => `
- ${stance}: ${data.count}件のコメント
`).join('')}

分析結果:
${qa.analysis}
`).join('\n---\n')}

分析のポイント:
- 特に重要な論点と対立軸
- 全体で合意できている、できていない論点
- 質問間の関連性や共通パターン
- 特に注目すべき独特な意見や傾向
- プロジェクト全体を通じて見えてくる重要な示唆

コツ:
- Markdown記法の見出し、箇条書き、太字などを積極的に利用し、徹底的に読みやすくしてください。tableは使わないでください。
- パッと読んで誰でも理解できるように簡潔にまとめてください。
- 質問間の関連性や全体的なパターンを重視してください。
`;
  }

  async getAnalysis(
    projectId: string
  ): Promise<IProjectAnalysis | null> {
    return ProjectAnalysis.findOne({
      projectId: new mongoose.Types.ObjectId(projectId)
    });
  }

  async generateProjectReport(
    project: IProject & { _id: mongoose.Types.ObjectId },
    comments: IComment[],
    forceRegenerate: boolean = false
  ): Promise<ProjectAnalysisResult> {
    try {
      // 既存の分析結果を確認(強制再生成でない場合のみ)
      if (!forceRegenerate) {
        const existingAnalysis = await this.getAnalysis(project._id.toString());
        if (existingAnalysis) {
          return {
            projectName: existingAnalysis.projectName,
            overallAnalysis: existingAnalysis.overallAnalysis
          };
        }
      }

      // 各質問の分析を実行(全体分析のための入力として使用)
      const questionAnalyses = await Promise.all(
        project.questions.map(async question => {
          const analysis = await this.stanceReportGenerator.analyzeStances(
            project._id.toString(),
            question.text,
            comments,
            question.stances,
            question.id
          );

          return {
            question: question.text,
            stanceAnalysis: analysis.stanceAnalysis,
            analysis: analysis.analysis
          };
        })
      );

      // プロジェクト全体の分析を生成
      const prompt = await this.generateOverallAnalysisPrompt(project, questionAnalyses);
      const result = await this.model.generateContent(prompt);
      const overallAnalysis = result.response.text();

      // 分析結果をデータベースに保存
      const projectAnalysisDoc = new ProjectAnalysis({
        projectId: project._id,
        projectName: project.name,
        overallAnalysis,
      });
      await projectAnalysisDoc.save();

      return {
        projectName: project.name,
        overallAnalysis
      };
    } catch (error) {
      console.error('Project analysis generation failed:', error);
      throw error;
    }
  }
}