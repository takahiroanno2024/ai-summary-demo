export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: "user" | "bot";
}

export interface ChatSession {
  id: string;
  projectId: string;
  history: ChatMessage[];
  lastActivity: Date;
}

export interface WebSocketMessage {
  type: "message";
  content: string;
}
