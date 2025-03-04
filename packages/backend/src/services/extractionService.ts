import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractionPrompts } from '../config/prompts';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is required in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1秒

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function isRelevantToTopic(content: string, topic: string, context?: string, customPrompt?: string): Promise<boolean> {
  let retries = 0;
  
  while (true) {
    try {
      const prompt = extractionPrompts.relevanceCheck(topic, context, customPrompt).replace('{content}', content);
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

export async function extractContent(content: string, extractionTopic?: string, context?: string, customPrompt?: string): Promise<string[] | null> {
  if (!extractionTopic) {
    return null;
  }

  let retries = 0;

  while (true) {
    try {
      // First check if the content is relevant to the topic
      const isRelevant = await isRelevantToTopic(content, extractionTopic, context, customPrompt);
      if (!isRelevant) {
        return null;
      }

      // If relevant, proceed with extraction
      const prompt = extractionPrompts.contentExtraction(extractionTopic, context, customPrompt).replace('{content}', content);
      console.log('Extraction LLM Input:', prompt);

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      console.log('Extraction LLM Output:', text);

      // Split extracted content by new lines and filter out empty strings
      const extractedContents = text
        .trim()
        .split(/\n+/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // If we have no extracted content, return null
      if (extractedContents.length === 0) {
        return null;
      }
      
      return extractedContents;
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