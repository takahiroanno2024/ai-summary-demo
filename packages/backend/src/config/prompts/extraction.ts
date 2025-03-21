import { PromptTemplate } from "../../utils/promptTemplate";
import type { ExtractionPrompts } from "./types";

export const extractionPrompts: ExtractionPrompts = {
  relevanceCheck: (topic: string, context?: string) =>
    PromptTemplate.generate("relevance-check", {
      topic,
      context: context || "",
      content: "{content}", // This will be replaced by the actual content later
    }),

  contentExtraction: (extractionTopic: string, context?: string) =>
    PromptTemplate.generate("content-extraction", {
      extractionTopic,
      context: context || "",
      content: "{content}", // This will be replaced by the actual content later
    }),
};
