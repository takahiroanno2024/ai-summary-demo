import { GoogleGenerativeAI } from '@google/generative-ai';

export interface StanceAnalysisResult {
  questionId: string;
  stanceId: string | null;
  confidence: number | null;
}

export class StanceAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private lastRequestTime: number = 0;
  private readonly MIN_DELAY_MS: number = 1000; // 1秒の最小遅延

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_DELAY_MS) {
      const delayTime = this.MIN_DELAY_MS - timeSinceLastRequest;
      await this.delay(delayTime);
    }
    
    this.lastRequestTime = Date.now();
  }

  private async generatePrompt(
    comment: string,
    questionText: string,
    stances: { id: string; name: string }[]
  ): Promise<string> {
    const stanceOptions = stances.map(s => s.name).join('", "');
    return `
以下のコメントに対して、質問「${questionText}」について、コメントがどの立場を取っているか分析してください。

コメント:
"""
${comment}
"""

可能な立場: "${stanceOptions}"

注意事項:
- "立場なし": コメントが質問に対して立場を示していない場合
- "その他の立場": コメントが立場を示しているが、与えられた選択肢のいずれにも当てはまらない場合

以下のJSON形式で回答してください:
{
  "reasoning": "判断理由の説明"
  "stance": "立場の名前",
  "confidence": 信頼度（0から1の数値）,
}
`;
  }

  private async parseResponse(response: string): Promise<{ stance: string | null; confidence: number | null }> {
    try {
      const cleaned = response.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleaned);
      return {
        stance: result.stance,
        confidence: result.confidence,
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      return {
        stance: null,
        confidence: null,
      };
    }
  }

  private ensureSpecialStances(stances: { id: string; name: string }[]): { id: string; name: string }[] {
    const specialStances = [
      { id: 'neutral', name: '立場なし' },
      { id: 'other', name: 'その他の立場' }
    ];
    
    const result = [...stances];
    
    for (const special of specialStances) {
      if (!stances.some(s => s.name === special.name)) {
        result.push(special);
      }
    }
    
    return result;
  }

  async analyzeStance(
    comment: string,
    questionId: string,
    questionText: string,
    stances: { id: string; name: string }[]
  ): Promise<StanceAnalysisResult> {
    try {
      // 特殊な立場を確実に含める
      const stancesWithSpecial = this.ensureSpecialStances(stances);
      
      const prompt = await this.generatePrompt(comment, questionText, stancesWithSpecial);
      console.log('Generated Prompt:', prompt);
      
      await this.enforceRateLimit();
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      console.log('LLM Response:', response);
      
      const { stance, confidence } = await this.parseResponse(response);
      
      // 立場名からIDを取得
      const matchedStance = stancesWithSpecial.find(s => s.name === stance);
      
      if (!matchedStance) {
        // マッチする立場が見つからない場合はnullを返す
        return {
          questionId,
          stanceId: null,
          confidence: null,
        };
      }
      
      return {
        questionId,
        stanceId: matchedStance.id,
        confidence,
      };
    } catch (error) {
      console.error('Stance analysis failed:', error);
      return {
        questionId,
        stanceId: null,
        confidence: null,
      };
    }
  }

  async analyzeAllStances(
    comment: string,
    questions: { id: string; text: string; stances: { id: string; name: string }[] }[],
    existingStances: StanceAnalysisResult[] = []
  ): Promise<StanceAnalysisResult[]> {
    // 新しい問いと既存の分析結果をマッピング
    const existingStanceMap = new Map(
      existingStances.map(stance => [stance.questionId, stance])
    );

    // 各問いに対して処理（Promise.allを維持）
    const results = await Promise.all(
      questions.map(async (question, index) => {
        // 既存の分析結果があれば再利用
        const existingStance = existingStanceMap.get(question.id);
        if (existingStance) {
          return existingStance;
        }

        // インデックスに基づいて初期遅延を設定（リクエストの分散）
        await this.delay(index * (this.MIN_DELAY_MS / 2));

        // 新しい問いに対してのみ分析を実行
        return this.analyzeStance(comment, question.id, question.text, question.stances);
      })
    );

    return results;
  }
}
