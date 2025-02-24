import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import axios from 'axios';
import { SessionManager } from './services/SessionManager';
import { WebSocketMessage, Project } from './types';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const sessionManager = new SessionManager();

// バックエンドAPIの設定
const backendApi = axios.create({
  baseURL: process.env.BACKEND_API_URL || 'http://localhost:3001/api'
});

// WebSocketアップグレードの処理
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url;
  
  // プロジェクトIDの抽出 (/project/:projectId/chat の形式)
  const match = pathname?.match(/^\/project\/([^\/]+)\/chat$/);
  if (!match) {
    socket.destroy();
    return;
  }

  const projectId = match[1];
  
  wss.handleUpgrade(request, socket, head, (ws) => {
    const session = sessionManager.createSession(projectId);
    handleConnection(ws, session.id, projectId);
  });
});

async function getProjectQuestions(projectId: string): Promise<Project['questions']> {
  try {
    const response = await backendApi.get<Project>(`/projects/${projectId}`);
    return response.data.questions || [];
  } catch (error) {
    console.error('Error fetching project questions:', error);
    return [];
  }
}

function formatQuestionsList(questions: Project['questions']): string {
  if (questions.length === 0) {
    return '論点はまだ設定されていません。';
  }
  return '論点一覧:\n' + questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n');
}

async function handleConnection(ws: WebSocket, sessionId: string, projectId: string) {
  console.log(`New connection established for project: ${projectId}, session: ${sessionId}`);

  ws.on('message', async (data: string) => {
    try {
      const message: WebSocketMessage = JSON.parse(data);
      
      if (message.type === 'message') {
        // ユーザーメッセージを保存
        const userMessage = sessionManager.addMessage(sessionId, message.content, 'user');
        if (!userMessage) {
          ws.send(JSON.stringify({ error: 'Session not found' }));
          return;
        }

        let response: string;
        
        // "questions"コマンドの処理
        if (message.content.toLowerCase() === 'questions') {
          const questions = await getProjectQuestions(projectId);
          response = formatQuestionsList(questions);
        } else {
          // 通常のメッセージはオウム返し
          response = message.content;
        }

        // ボットの応答を保存して送信
        const botMessage = sessionManager.addMessage(sessionId, response, 'bot');
        ws.send(JSON.stringify({
          type: 'message',
          message: botMessage
        }));
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log(`Connection closed for session: ${sessionId}`);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error in session ${sessionId}:`, error);
  });
}

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
  console.log(`Chat bot server is running on port ${PORT}`);
});