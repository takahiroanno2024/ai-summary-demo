import { v4 as uuidv4 } from "uuid";
import type { ChatMessage, ChatSession } from "../types";

export class SessionManager {
  private sessions: Map<string, ChatSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // 定期的に古いセッションをクリーンアップ
    setInterval(() => this.cleanupOldSessions(), 5 * 60 * 1000);
  }

  createSession(projectId: string): ChatSession {
    const session: ChatSession = {
      id: uuidv4(),
      projectId,
      history: [],
      lastActivity: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): ChatSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  addMessage(
    sessionId: string,
    content: string,
    sender: "user" | "bot",
  ): ChatMessage | undefined {
    const session = this.getSession(sessionId);
    if (!session) return undefined;

    const message: ChatMessage = {
      id: uuidv4(),
      content,
      timestamp: new Date(),
      sender,
    };

    session.history.push(message);
    return message;
  }

  private cleanupOldSessions() {
    const now = new Date().getTime();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.sessions.delete(sessionId);
      }
    }
  }
}
