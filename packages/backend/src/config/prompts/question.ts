import { QuestionPrompts } from './types';
import { PromptTemplate } from '../../utils/promptTemplate';

export const questionPrompts: QuestionPrompts = {
  questionGeneration: (comments: string[]) =>
    PromptTemplate.generate('question-generation', {
      comments: comments.join('\n')
    })
};