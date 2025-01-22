import { GoogleGenerativeAI } from '@google/generative-ai';

export interface StanceAnalysisResult {
  questionId: string;
  stanceId: string;
  confidence: number;
}

export class StanceAnalyzer {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
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

  private async parseResponse(response: string): Promise<{ stance: string; confidence: number }> {
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
        stance: '立場なし',
        confidence: 0,
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
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      console.log('LLM Response:', response);
      
      const { stance, confidence } = await this.parseResponse(response);
      
      // 立場名からIDを取得
      const matchedStance = stancesWithSpecial.find(s => s.name === stance);
      
      if (!matchedStance) {
        // マッチする立場が見つからない場合は立場なしを返す
        const neutralStance = stancesWithSpecial.find(s => s.name === '立場なし');
        if (!neutralStance) {
          throw new Error('Neutral stance not found');
        }
        return {
          questionId,
          stanceId: neutralStance.id,
          confidence: 0,
        };
      }
      
      return {
        questionId,
        stanceId: matchedStance.id,
        confidence,
      };
    } catch (error) {
      console.error('Stance analysis failed:', error);
      const neutralStance = this.ensureSpecialStances(stances).find(s => s.name === '立場なし');
      return {
        questionId,
        stanceId: neutralStance!.id,
        confidence: 0,
      };
    }
  }

  async analyzeAllStances(
    comment: string,
    questions: { id: string; text: string; stances: { id: string; name: string }[] }[]
  ): Promise<StanceAnalysisResult[]> {
    const results = await Promise.all(
      questions.map(question =>
        this.analyzeStance(comment, question.id, question.text, question.stances)
      )
    );
    return results;
  }
}
