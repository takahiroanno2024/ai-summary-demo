import { GoogleGenerativeAI } from '@google/generative-ai';
import { IComment } from '../models/comment';
import { StanceAnalysis, IStanceAnalysis } from '../models/stanceAnalysis';
import mongoose from 'mongoose';
import { reportPrompts } from '../config/prompts';

export interface StanceAnalysisResult {
  question: string;
  stanceAnalysis: {
    [key: string]: {
      count: number;
      comments: string[];
    };
  };
  analysis: string;
}

export class StanceReportGenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  async getAnalysis(
    projectId: string,
    questionId: string
  ): Promise<IStanceAnalysis | null> {
    const analysis = await StanceAnalysis.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
      questionId
    }).lean();

    if (analysis) {
      // MongoDBのMapをプレーンなオブジェクトに変換
      const plainStanceAnalysis: {
        [key: string]: {
          count: number;
          comments: string[];
        };
      } = {};
      for (const [key, value] of Object.entries(analysis.stanceAnalysis)) {
        plainStanceAnalysis[key] = {
          count: Number(value.count),  // 確実に数値型に変換
          comments: value.comments
        };
      }
      return {
        ...analysis,
        stanceAnalysis: plainStanceAnalysis
      };
    }
    return null;
  }

  async analyzeStances(
    projectId: string,
    questionText: string,
    comments: IComment[],
    stances: { id: string; name: string }[],
    questionId: string,
    forceRegenerate: boolean = false
  ): Promise<StanceAnalysisResult> {
    // 既存の分析結果を確認（強制再生成でない場合のみ）
    if (!forceRegenerate) {
      const existingAnalysis = await this.getAnalysis(projectId, questionId);
      if (existingAnalysis) {
        console.log('Using existing analysis:', JSON.stringify(existingAnalysis, null, 2));
        console.log('Existing stanceAnalysis:', JSON.stringify(existingAnalysis.stanceAnalysis, null, 2));
        const result = {
          question: questionText,
          stanceAnalysis: existingAnalysis.stanceAnalysis,
          analysis: existingAnalysis.analysis
        };
        console.log('Returning existing analysis result:', JSON.stringify(result, null, 2));
        return result;
      }
    }

    // 立場ごとのコメントを集計
    const stanceAnalysis = new Map<string, { count: number; comments: string[] }>();
    const stanceNames = new Map(stances.map(s => [s.id, s.name]));
    
    // 初期化
    stances.forEach(stance => {
      stanceAnalysis.set(stance.id, { count: 0, comments: [] });
    });

    // コメントを分類
    comments.forEach(comment => {
      const stance = comment.stances?.find(s => s.questionId === questionId);
      if (stance && comment.extractedContent) {
        const analysis = stanceAnalysis.get(stance.stanceId);
        if (analysis) {
          analysis.count++;
          analysis.comments.push(comment.extractedContent);
        }
      }
    });

    try {
      // Geminiによる分析
      const prompt = reportPrompts.stanceReport(questionText, Array.from(stanceAnalysis.entries()), stanceNames);
      const result = await this.model.generateContent(prompt);
      const analysis = result.response.text();

      // 分析結果をデータベースに保存
      const stanceAnalysisDoc = new StanceAnalysis({
        projectId: new mongoose.Types.ObjectId(projectId),
        questionId,
        analysis,
        stanceAnalysis: Object.fromEntries(stanceAnalysis),
      });
      await stanceAnalysisDoc.save();

      return {
        question: questionText,
        stanceAnalysis: Object.fromEntries(stanceAnalysis),
        analysis
      };
    } catch (error) {
      console.error('Analysis generation failed:', error);
      throw error;
    }
  }
}