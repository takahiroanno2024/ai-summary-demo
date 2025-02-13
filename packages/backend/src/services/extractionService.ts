import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1秒

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isRelevantToTopic(content: string, topic: string, context?: string): Promise<boolean> {
  let retries = 0;
  
  while (true) {
    try {
      const prompt = `You are a professional research assistant helping to analyze public consultation responses.

Your task is to determine if the following comment is relevant to the topic of "${topic}".

${context ? `Background context about the topic:
"""
${context}
"""

` : ''}Comment to analyze:
"""
${content}
"""

Please respond with either "RELEVANT" or "NOT_RELEVANT". Consider a comment relevant if it expresses any opinion or argument related to the topic, taking into account the provided background context if available.`;

      console.log('Relevance Check LLM Input:', prompt);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log('Relevance Check LLM Output:', text);

      return text.trim() === "RELEVANT";
    } catch (error: any) {
      console.error(`Error in relevance check (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      
      // 503エラーの場合のみリトライ
      if (error?.status === 503 && retries < MAX_RETRIES - 1) {
        // 指数バックオフで待機時間を計算
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retries);
        console.log(`Received 503 error, retrying after ${delay}ms...`);
        await sleep(delay);
        retries++;
        continue;
      }
      
      // 503エラーでない場合、またはリトライ回数が上限に達した場合
      if (error?.status === 503) {
        console.log('Giving up after retry: 503 error persists');
      } else {
        console.log('Giving up: encountered error:', error?.status || 'unknown error');
      }
      return false;
    }
  }
}

export async function extractContent(content: string, extractionTopic?: string, context?: string): Promise<string | null> {
  if (!extractionTopic) {
    return null;
  }

  let retries = 0;

  while (true) {
    try {
      // First check if the content is relevant to the topic
      const isRelevant = await isRelevantToTopic(content, extractionTopic, context);
      if (!isRelevant) {
        return null;
      }

      // If relevant, proceed with extraction
      const prompt = `あなたはプロのリサーチアシスタントであり、議論のデータセットをきれいに整える手助けをしています。
与えられたコメントから冗長な表現を排除し、トピックに関する主張を抽出した一人称視点の文章を出力してください。
${context ? `
トピックに関する背景情報:
"""
${context}
"""

` : ''}  以下に「AI技術」に関するコメントを処理した例を示しますので、同じ方法で「${extractionTopic}」に関する実際のコメントを処理してください。

  「AI技術」に関するコメントを処理した例：

  入力例:
  """
  AIは本当に恐ろしいもので、みんな目を覚ますべきです!!! すでに勤勉な人々から仕事を奪っています - 私の友人のいとこは「自動化システム」とやらに仕事を奪われました。😡😡😡
  """

  出力例:
  """
  私はAIが仕事を奪うことを懸念しています。具体的な例として、友人のいとこが自動化によって仕事を失ったケースがあります。
  """

  では、同じレベルの明確さと簡潔さで「${extractionTopic}」に関するコメントから主張を抽出してください。
  """
  ${content}
  """

  処理結果を生のテキストで回答してください。出力は日本語でお願いします。`;

      console.log('Extraction LLM Input:', prompt);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log('Extraction LLM Output:', text);

      return text.trim();
    } catch (error: any) {
      console.error(`Error in content extraction (attempt ${retries + 1}/${MAX_RETRIES}):`, error);
      
      // 503エラーの場合のみリトライ
      if (error?.status === 503 && retries < MAX_RETRIES - 1) {
        // 指数バックオフで待機時間を計算
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retries);
        console.log(`Received 503 error, retrying after ${delay}ms...`);
        await sleep(delay);
        retries++;
        continue;
      }
      
      // 503エラーでない場合、またはリトライ回数が上限に達した場合
      if (error?.status === 503) {
        console.log('Giving up after retry: 503 error persists');
      } else {
        console.log('Giving up: encountered error:', error?.status || 'unknown error');
      }
      return null;
    }
  }
}