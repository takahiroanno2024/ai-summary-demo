import { PromptTemplate } from "../../utils/promptTemplate";
import type { StancePrompts } from "./types";

export const stancePrompts: StancePrompts = {
  stanceAnalysis: (
    questionText: string,
    stanceOptions: string,
    context?: string,
  ) =>
    PromptTemplate.generate("stance-analysis", {
      questionText,
      stanceOptions,
      context: context || "",
      content: "{content}", // This will be replaced by the actual content later
    }),
};
