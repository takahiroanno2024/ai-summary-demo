export interface ChatSession {
  id: string;
  projectId: string;
  history: ChatMessage[];
  lastActivity: Date;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: "user" | "bot";
}

export interface WebSocketMessage {
  type: "message" | "ping" | "pong";
  content?: string;
}

export interface Project {
  _id: string;
  name: string;
  description?: string;
  extractionTopic?: string;
  questions: {
    id: string;
    text: string;
  }[];
  createdAt: string;
  commentCount: number;
}
