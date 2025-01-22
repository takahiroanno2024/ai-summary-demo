export interface Stance {
  id: string;
  name: string;
}

export interface Question {
  id: string;
  text: string;
  stances: Stance[];
}

export interface StanceAnalysisReport {
  question: string;
  stanceAnalysis: {
    [key: string]: {
      count: number;
      comments: string[];
    };
  };
  analysis: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  extractionTopic?: string;
  questions: Question[];
  createdAt: string;
}