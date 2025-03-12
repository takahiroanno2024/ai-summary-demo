import OpenAI from 'openai';
import mongoose from 'mongoose';
import { IProject } from '../models/project';
import { IComment } from '../models/comment';
import { StanceReportGenerator } from './stanceReportGenerator';
import { ProjectAnalysis, IProjectAnalysis } from '../models/projectAnalysis';
import { reportPrompts } from '../config/prompts';

export interface ProjectAnalysisResult {
  projectName: string;
  overallAnalysis: string;
}

export class ProjectReportGenerator {
  private openai: OpenAI;
  private stanceReportGenerator: StanceReportGenerator;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
    });
    this.stanceReportGenerator = new StanceReportGenerator(apiKey);
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
    forceRegenerate: boolean = false,
    customPrompt?: string
  ): Promise<ProjectAnalysisResult> {
    try {
      // 強制再生成でない場合のみ既存の分析結果を確認
      console.log('Checking for existing analysis...');
      const existingAnalysis = await this.getAnalysis(project._id.toString());
      console.log('Existing analysis:', existingAnalysis);
      if (!forceRegenerate && existingAnalysis) {
        console.log('Using existing analysis');
        return {
          projectName: existingAnalysis.projectName,
          overallAnalysis: existingAnalysis.overallAnalysis
        };
      }
      console.log('No existing analysis found or force regenerate is true');

      // 各質問の分析を実行(全体分析のための入力として使用)
      console.log('Generating question analyses...');
      const questionAnalyses = await Promise.all(
        project.questions.map(async question => {
          console.log(`Analyzing question: ${question.text}`);
          const analysis = await this.stanceReportGenerator.analyzeStances(
            project._id.toString(),
            question.text,
            comments,
            question.stances,
            question.id,
            false,
            customPrompt
          );

          console.log('Stance analysis result:', JSON.stringify(analysis.stanceAnalysis, null, 2));


          const result = {
            question: question.text,
            questionId: question.id,
            stanceAnalysis: analysis.stanceAnalysis,
            analysis: analysis.analysis
          };
          console.log('Question analysis result:', JSON.stringify(result, null, 2));
          return result;
        })
      );
      console.log('All question analyses:', JSON.stringify(questionAnalyses, null, 2));

      // プロジェクト全体の分析を生成
      const prompt = reportPrompts.projectReport(
        {
          name: project.name,
          description: project.description || '' // デフォルト値を設定
        },
        questionAnalyses,
        customPrompt
      );
      
      const completion = await this.openai.chat.completions.create({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      
      let overallAnalysis = completion.choices[0].message.content || '';

      // Remove triple quotes or backticks if they exist
      overallAnalysis = overallAnalysis.replace(/^"""|"""$|^```|```$/g, '').trim();

      // 分析結果をデータベースに保存 (既存のドキュメントがあれば更新、なければ新規作成)
      await ProjectAnalysis.findOneAndUpdate(
        { projectId: project._id },
        {
          projectId: project._id,
          projectName: project.name,
          overallAnalysis,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

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