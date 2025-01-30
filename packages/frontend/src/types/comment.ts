export type CommentSourceType = 'youtube' | 'x' | 'form' | 'other';

export interface CommentStance {
  questionId: string;
  stanceId: string;
  confidence: number;  // Gemini APIの判定信頼度
}

export interface Comment {
  _id: string;
  content: string;
  projectId: string;
  extractedContent?: string;
  stances: CommentStance[];  // 論点
  createdAt: string;
  sourceType?: CommentSourceType;
  sourceUrl?: string;
}