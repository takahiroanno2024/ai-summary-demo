import { PromptTemplate } from "../../utils/promptTemplate";
import type { QuestionPrompts } from "./types";

export const questionPrompts: QuestionPrompts = {
  questionGeneration: (comments: string[]) =>
    PromptTemplate.generate("question-generation", {
      comments: comments.join("\n"),
    }),
};
