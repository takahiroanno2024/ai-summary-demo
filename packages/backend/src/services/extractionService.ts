import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

async function isRelevantToTopic(content: string, topic: string): Promise<boolean> {
  try {
    const prompt = `You are a professional research assistant helping to analyze public consultation responses.

Your task is to determine if the following comment is relevant to the topic of "${topic}".

Comment to analyze:
"""
${content}
"""

Please respond with either "RELEVANT" or "NOT_RELEVANT". Consider a comment relevant if it expresses any opinion, argument, or insight related to the topic, even if the connection is indirect.`;

    console.log('Relevance Check LLM Input:', prompt);

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('Relevance Check LLM Output:', text);

    return text.trim() === "RELEVANT";
  } catch (error) {
    console.error('Error in relevance check:', error);
    return false;
  }
}

export async function extractContent(content: string, extractionTopic?: string): Promise<string | null> {
  if (!extractionTopic) {
    return null;
  }

  try {
    // First check if the content is relevant to the topic
    const isRelevant = await isRelevantToTopic(content, extractionTopic);
    if (!isRelevant) {
      return null;
    }

    // If relevant, proceed with extraction
    const prompt = `あなたはプロのリサーチアシスタントであり、議論のデータセットをきれいに整える手助けをしています。
　与えられたコメントから冗長な表現を排除し、トピックに関する主張を抽出した一人称視点の文章を出力してください。
  以下に「AI技術」に関するコメントを処理した例を示しますので、同じ方法で「${extractionTopic}」に関する実際のコメントを処理してください。

  「AI技術」に関するコメントを処理した例：

  入力例:
  """
  AIは本当に恐ろしいもので、みんな目を覚ますべきです!!! すでに勤勉な人々から仕事を奪っています - 私の友人のいとこは「自動化システム」とやらに仕事を奪われました。😡😡😡
  """

  出力例:
  """
  私はAIが仕事を奪うことを懸念しています。具体的な例として、友人のいとこが自動化によって仕事を失ったケースがあります。
  """

  では、同じレベルの明確さと簡潔さで「${extractionTopic}」に関するコメントを処理してください。
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
  } catch (error) {
    console.error('Error in content extraction:', error);
    return null;
  }
}