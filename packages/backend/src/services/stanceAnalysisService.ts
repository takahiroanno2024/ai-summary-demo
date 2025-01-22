import { GoogleGenerativeAI } from '@google/generative-ai';
import { IComment } from '../models/comment';
import { StanceAnalysis, IStanceAnalysis } from '../models/stanceAnalysis';
import mongoose from 'mongoose';

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

export class StanceAnalysisService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  private async generateAnalysisPrompt(
    questionText: string,
    stanceAnalysis: Map<string, { count: number; comments: string[] }>,
    stanceNames: Map<string, string>
  ): Promise<string> {
    return `以下の質問に対する様々な立場とそれぞれの意見を読み、各立場の意見の傾向、主張の根拠、そして立場間の関係性について分析し、
    その内容を万人に伝わるように徹底的に分かりやすく簡単に説明してください。

質問: ${questionText}

${Array.from(stanceAnalysis.entries()).map(([stanceId, data]) => {
  const stanceName = stanceNames.get(stanceId) || 'Unknown';
  return `
立場: ${stanceName}
コメント数: ${data.count}
コメント内容:
${data.comments.join('\n')}
`;
}).join('\n')}

分析のポイント:
- 各立場の主張の要点
- 異なる立場間の対立点や共通点
- 特徴的な意見や興味深い視点

コツ:
- Markdown記法の見出し、箇条書き、太字などを積極的に利用し、徹底的に読みやすくしてください。
- 難しい表現や長い文章は使わずに、誰にでも分かりやすい単純化した言葉で説明してください。
- パッと読んで誰でも理解できるように簡潔にまとめてください。
- 興味関心を喚起するような表現を使い、読者に興味を持たせるようにしてください。
`;
  }

  async getAnalysis(
    projectId: string,
    questionId: string
  ): Promise<IStanceAnalysis | null> {
    return StanceAnalysis.findOne({
      projectId: new mongoose.Types.ObjectId(projectId),
      questionId
    });
  }

  async analyzeStances(
    projectId: string,
    questionText: string,
    comments: IComment[],
    stances: { id: string; name: string }[],
    questionId: string
  ): Promise<StanceAnalysisResult> {
    // まず、既存の分析結果を確認
    const existingAnalysis = await this.getAnalysis(projectId, questionId);
    if (existingAnalysis) {
      return {
        question: questionText,
        stanceAnalysis: existingAnalysis.stanceAnalysis,
        analysis: existingAnalysis.analysis
      };
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
      const prompt = await this.generateAnalysisPrompt(questionText, stanceAnalysis, stanceNames);
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