import { IComment } from '../models/comment';
import { StanceAnalysis, IStanceAnalysis } from '../models/stanceAnalysis';
import mongoose from 'mongoose';
import { reportPrompts } from '../config/prompts';
import { openRouterService } from './openRouterService';

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
    forceRegenerate: boolean = false,
    customPrompt?: string
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
      console.log('Generating stance report with params:', {
        questionText,
        stanceAnalysisEntries: Array.from(stanceAnalysis.entries()),
        stanceNamesMap: Object.fromEntries(stanceNames),
        hasCustomPrompt: !!customPrompt
      });

      let prompt;
      try {
        prompt = customPrompt
          ? reportPrompts.stanceReport(
              questionText,
              Array.from(stanceAnalysis.entries()),
              stanceNames,
              customPrompt
            )
          : reportPrompts.stanceReport(
              questionText,
              Array.from(stanceAnalysis.entries()),
              stanceNames
            );
        console.log('Generated prompt:', prompt);
      } catch (error: any) {
        console.error('Failed to generate prompt:', error);
        throw new Error(`Prompt generation failed: ${error?.message || 'Unknown error'}`);
      }

      const analysis = await openRouterService.chat({
        model: 'google/gemini-2.0-flash-001',
        messages: [{ role: 'user', content: prompt }],
      });

      if (!analysis) {
        throw new Error('Analysis generation failed in openRouterService');
      }

      // 分析結果をデータベースに保存
      try {
        const stanceAnalysisDoc = new StanceAnalysis({
          projectId: new mongoose.Types.ObjectId(projectId),
          questionId,
          analysis,
          stanceAnalysis: Object.fromEntries(stanceAnalysis),
        });
        await stanceAnalysisDoc.save();
        console.log('Successfully saved analysis to database:', {
          projectId,
          questionId,
          analysisLength: analysis.length,
          stanceCount: stanceAnalysis.size
        });
      } catch (error: any) {
        console.error('Failed to save analysis to database:', {
          error: error?.message || 'Unknown error',
          stack: error?.stack,
          projectId,
          questionId
        });
        throw new Error(`Database save failed: ${error?.message || 'Unknown error'}`);
      }

      const finalResult = {
        question: questionText,
        stanceAnalysis: Object.fromEntries(stanceAnalysis),
        analysis
      };
      console.log('Returning final analysis result:', {
        question: finalResult.question,
        stanceCount: Object.keys(finalResult.stanceAnalysis).length,
        analysisLength: finalResult.analysis.length
      });
      return finalResult;
    } catch (error: any) {
      console.error('Analysis generation failed:', {
        error: error?.message || 'Unknown error',
        stack: error?.stack,
        projectId,
        questionId,
        questionText
      });
      throw new Error(`Analysis generation failed: ${error?.message || 'Unknown error'}`);
    }
  }
}