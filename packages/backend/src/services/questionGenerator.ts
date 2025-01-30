import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeneratedQuestion {
    text: string;
    stances: { name: string }[];
}

export class QuestionGenerator {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private lastRequestTime: number = 0;
    private readonly MIN_DELAY_MS: number = 1000; // 1秒の最小遅延

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
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

    private generatePrompt(comments: string[]): string {
        const combinedComments = comments.join('\n');
        return `
以下のコメントリストを分析し、コメントの内容から適切な論点と立場のリストを生成してください。

コメントリスト:
"""
${combinedComments}
"""

要件:
- 論点は、コメントの内容で頻繁に言及されている重要なトピックや論点を抽出して作成してください
- 論点は質問形式で5個程度生成してください
    - 立場が一つに偏るであろう論点を2個程度
    - 立場が多様になる論点を3個程度
- 立場は「〇〇派」のように、10~20文字程度の具体的な名前で表現してください。立場は1~3個生成してください。
    - 立場が互いに重複しないようにしてください
    - 「その他派」などは絶対に使わず、各立場は具体的で明確な意見を表すようにしてください。

以下のJSON形式で回答してください:
{
    "questions": [
        {
            "text": "論点の文",
            "stances": [
                { "name": "立場1の名前" },
                { "name": "立場2の名前" }
            ]
        }
    ]
}
`;
    }

    private async parseResponse(response: string): Promise<GeneratedQuestion[]> {
        try {
            const cleaned = response.replace(/```json|```/g, '').trim();
            const result = JSON.parse(cleaned);
            return result.questions;
        } catch (error) {
            console.error('Failed to parse Gemini response:', error);
            return [];
        }
    }

    async generateQuestions(comments: string[]): Promise<GeneratedQuestion[]> {
        try {
            const prompt = this.generatePrompt(comments);
            console.log('Generated Prompt:', prompt);
            
            await this.enforceRateLimit();
            console.log('Sending prompt to LLM...');
            const result = await this.model.generateContent(prompt);
            const response = await result.response.text();
            console.log('LLM Response:', response);
            
            return this.parseResponse(response);
        } catch (error) {
            console.error('Question generation failed:', error);
            return [];
        }
    }
}