import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import axios from 'axios';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { SessionManager } from './services/SessionManager';
import { WebSocketMessage, Project, ChatMessage } from './types';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });
const sessionManager = new SessionManager();

// Gemini APIの初期化
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash',
});

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

function formatChatHistory(history: ChatMessage[]): string {
  return history.map(msg => `${msg.sender === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`).join('\n');
}

async function generateResponse(
  userMessage: string,
  questions: Project['questions'],
  history: ChatMessage[]
): Promise<string> {
  try {
    const messages = [];
    
    // システムプロンプトを追加
    messages.push({
      role: 'user',
      parts: [{text: `
あなたは議論を深めるためのアシスタントです。以下の論点に基づいて、ユーザーの発言を分析し、
適切な論点に誘導しながら建設的な議論を展開してください。

【論点一覧】
${questions.map((q, i) => `${i + 1}. ${q.text}`).join('\n')}

以下の点を意識して返答を生成してください：
1. ユーザーの発言が論点のいずれかに関連している場合、その論点についてより深い議論を促す
2. ユーザーの発言が論点から外れている場合、適切な論点に誘導する
3. 常に建設的で具体的な議論となるよう導く
4. 一方的な主張を避け、ユーザーの意見を引き出すよう心がける`}]
    });

    // チャット履歴を追加
    for (const msg of history.slice(-5)) { // 直近5件のみ使用
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{text: msg.content}]
      });
    }

    // 最新のユーザーメッセージを追加
    messages.push({
      role: 'user',
      parts: [{text: userMessage}]
    });

    const result = await model.generateContent({
      contents: messages,
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    });

    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating response:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if ('status' in error) {
        console.error('Status:', (error as any).status);
      }
    }
    return 'すみません、応答の生成中にエラーが発生しました。APIキーの設定や権限を確認してください。';
  }
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

        const session = sessionManager.getSession(sessionId);
        if (!session) {
          ws.send(JSON.stringify({ error: 'Session not found' }));
          return;
        }

        let response: string;
        
        // "questions"コマンドの処理
        if (message.content.toLowerCase() === 'questions') {
          const questions = await getProjectQuestions(projectId);
          response = formatQuestionsList(questions);
        } else {
          // Gemini APIを使用して応答を生成
          const questions = await getProjectQuestions(projectId);
          response = await generateResponse(
            message.content,
            questions,
            session.history
          );
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