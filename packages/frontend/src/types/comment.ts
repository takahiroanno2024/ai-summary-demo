export interface Comment {
  _id: string;
  content: string;
  projectId: string;
  extractedContent?: string;
  createdAt: string;
}