// プロンプトの型定義
export interface ExtractionPrompts {
  relevanceCheck: (topic: string, context?: string) => string;
  contentExtraction: (extractionTopic: string, context?: string) => string;
}

export interface StancePrompts {
  stanceAnalysis: (
    questionText: string,
    stanceOptions: string,
    context?: string
  ) => string;
}

export interface QuestionPrompts {
  questionGeneration: (comments: string[]) => string;
}

export interface ReportPrompts {
  stanceReport: (
    questionText: string,
    stanceAnalysisEntries: Array<[string, { count: number; comments: string[] }]>,
    stanceNames: Map<string, string>
  ) => string;
  projectReport: (
    project: {
      name: string;
      description: string;
    },
    questionAnalyses: Array<{
      question: string;
      stanceAnalysis: {
        [key: string]: {
          count: number;
          comments: string[];
        };
      };
      analysis: string;
    }>
  ) => string;
}