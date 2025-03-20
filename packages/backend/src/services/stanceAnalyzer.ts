import OpenAI from "openai";
import { stancePrompts } from "../config/prompts";

export interface StanceAnalysisResult {
  questionId: string;
  stanceId: string | null;
  confidence: number | null;
}

export class StanceAnalyzer {
  private openai: OpenAI;
  constructor(apiKey: string) {
    this.openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKey,
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async enforceRateLimit(): Promise<void> {
    // Rate limit is handled by the Gemini API client
    return Promise.resolve();
  }

  private async parseResponse(
    response: string,
  ): Promise<{ stance: string | null; confidence: number | null }> {
    try {
      const cleaned = response.replace(/```json|```/g, "").trim();
      const result = JSON.parse(cleaned);
      return {
        stance: result.stance,
        confidence: result.confidence,
      };
    } catch (error) {
      console.error("Failed to parse Gemini response:", error);
      return {
        stance: null,
        confidence: null,
      };
    }
  }

  private ensureSpecialStances(
    stances: { id: string; name: string }[],
  ): { id: string; name: string }[] {
    const specialStances = [
      { id: "neutral", name: "立場なし" },
      { id: "other", name: "その他の立場" },
    ];

    const result = [...stances];

    for (const special of specialStances) {
      if (!stances.some((s) => s.name === special.name)) {
        result.push(special);
      }
    }

    return result;
  }

  async analyzeStance(
    comment: string,
    questionId: string,
    questionText: string,
    stances: { id: string; name: string }[],
    context?: string,
    customPrompt?: string,
  ): Promise<StanceAnalysisResult> {
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        // 特殊な立場を確実に含める
        const stancesWithSpecial = this.ensureSpecialStances(stances);
        const stanceOptions = stancesWithSpecial
          .map((s) => s.name)
          .join('", "');

        const prompt = stancePrompts
          .stanceAnalysis(questionText, stanceOptions, context, customPrompt)
          .replace("{content}", comment);
        console.log("Generated Prompt:", prompt);

        await this.enforceRateLimit();

        const completion = await this.openai.chat.completions.create({
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });

        const response = completion.choices[0].message.content || "";
        console.log("LLM Response:", response);

        const { stance, confidence } = await this.parseResponse(response);

        // confidenceが0.8未満、またはnullの場合は結果を棄却
        if (!confidence || confidence < 0.8) {
          return {
            questionId,
            stanceId: null,
            confidence: null,
          };
        }

        // 立場名からIDを取得
        const matchedStance = stancesWithSpecial.find((s) => s.name === stance);

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
      } catch (error: any) {
        console.error("Stance analysis failed:", error);

        // 503エラーの場合、かつリトライ回数が上限未満の場合は再試行
        if (error?.status === 503 && retryCount < maxRetries) {
          console.log("Received 503 error, retrying...");
          retryCount++;
          // 再試行前に少し待機
          await this.delay(1000);
          continue;
        }

        // リトライ回数が上限に達した場合、またはその他のエラーの場合
        if (error?.status === 503) {
          console.log("Giving up after retry: 503 error persists");
        } else {
          console.log(
            "Giving up: encountered error:",
            error?.status || "unknown error",
          );
        }

        return {
          questionId,
          stanceId: null,
          confidence: null,
        };
      }
    }

    // このコードは実行されないはずですが、TypeScriptの型チェックを満たすために必要
    return {
      questionId,
      stanceId: null,
      confidence: null,
    };
  }

  async analyzeAllStances(
    comment: string,
    questions: Array<{
      id: string;
      text: string;
      stances: Array<{ id: string; name: string }>;
    }>,
    existingStances: StanceAnalysisResult[] = [],
    context?: string,
    customPrompt?: string,
  ): Promise<StanceAnalysisResult[]> {
    // 新しい論点と既存の分析結果をマッピング
    const existingStanceMap = new Map(
      existingStances.map((stance) => [stance.questionId, stance]),
    );

    // 論点.allを維持）
    const results = await Promise.all(
      questions.map(async (question) => {
        // 既存の分析結果があれば再利用
        const existingStance = existingStanceMap.get(question.id);
        if (existingStance) {
          return existingStance;
        }

        // 新しい論点に対してのみ分析を実行
        return this.analyzeStance(
          comment,
          question.id,
          question.text,
          question.stances,
          context,
          customPrompt,
        );
      }),
    );

    return results;
  }
}
