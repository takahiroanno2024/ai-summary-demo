import { extractionPrompts } from "../config/prompts";
import { openRouterService } from "./openRouterService";

async function isRelevantToTopic(
  content: string,
  topic: string,
  context?: string,
  customPrompt?: string,
): Promise<boolean> {
  const prompt = extractionPrompts
    .relevanceCheck(topic, context, customPrompt)
    .replace("{content}", content);
  console.log("Relevance Check LLM Input:", prompt);

  const text = await openRouterService.chat({
    model: "google/gemini-2.0-flash-001",
    messages: [{ role: "user", content: prompt }],
  });
  console.log("Relevance Check LLM Output:", text);

  if (text === null) {
    return false;
  }

  return text.trim() === "RELEVANT";
}

export async function extractContent(
  content: string,
  extractionTopic?: string,
  context?: string,
  customPrompt?: string,
): Promise<string[] | null> {
  if (!extractionTopic) {
    return null;
  }

  // First check if the content is relevant to the topic
  const isRelevant = await isRelevantToTopic(
    content,
    extractionTopic,
    context,
    customPrompt,
  );
  if (!isRelevant) {
    return null;
  }

  // If relevant, proceed with extraction
  const prompt = extractionPrompts
    .contentExtraction(extractionTopic, context, customPrompt)
    .replace("{content}", content);
  console.log("Extraction LLM Input:", prompt);

  const text = await openRouterService.chat({
    model: "google/gemini-2.0-flash-001",
    messages: [{ role: "user", content: prompt }],
  });
  console.log("Extraction LLM Output:", text);

  if (text === null) {
    return null;
  }

  // Split extracted content by new lines and filter out empty strings
  const extractedContents = text
    .trim()
    .split(/\n+/)
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0);

  // If we have no extracted content, return null
  if (extractedContents.length === 0) {
    return null;
  }

  return extractedContents;
}
