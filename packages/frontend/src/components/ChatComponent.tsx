import { useEffect, useState, useRef } from 'react';
import { ChatMessage } from '../types/chat';

interface ChatComponentProps {
  projectId: string;
}

export const ChatComponent = ({ projectId }: ChatComponentProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const wsUrl = `${import.meta.env.VITE_CHAT_WS_URL || 'ws://localhost:3030'}/project/${projectId}/chat`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.type === 'message' && data.message) {
        const newMessage: ChatMessage = {
          id: data.message.id,
          content: data.message.content,
          timestamp: new Date(data.message.timestamp),
          sender: data.message.sender
        };
        setMessages(prev => [...prev, newMessage]);
      }
    };

    ws.onerror = () => {
      setError('WebSocketの接続中にエラーが発生しました');
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [projectId]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current || !isConnected) return;

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      content: inputMessage,
      timestamp: new Date(),
      sender: 'user'
    };

    wsRef.current.send(JSON.stringify({
      type: 'message',
      content: inputMessage
    }));

    setMessages(prev => [...prev, message]);
    setInputMessage('');
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 text-sm">
          {error}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="メッセージを入力..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !inputMessage.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            送信
          </button>
        </div>
        {!isConnected && (
          <p className="text-sm text-gray-500 mt-2">
            接続が切断されました。ページを再読み込みしてください。
          </p>
        )}
      </div>
    </div>
  );
};