import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, ChatRoom as IChatRoom, NewChatMessage } from '../types/chat';
import { addMessage, getMessages } from '../config/api';

interface ChatRoomProps {
  room: IChatRoom;
  userName: string;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({ room, userName }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // メッセージ一覧の取得
  const fetchMessages = async () => {
    try {
      setIsLoading(true);
      const fetchedMessages = await getMessages(room._id);
      setMessages(fetchedMessages);
      setError(null);
    } catch (err) {
      setError('メッセージの取得に失敗しました');
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回読み込み時にメッセージ一覧を取得
  useEffect(() => {
    fetchMessages();
  }, [room._id]);

  // メッセージ送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setIsLoading(true);
      const messageData: NewChatMessage = {
        content: newMessage.trim(),
        authorName: userName,
      };
      await addMessage(room._id, messageData);
      setNewMessage('');
      await fetchMessages(); // メッセージ一覧を更新
      setError(null);
    } catch (err) {
      setError('メッセージの送信に失敗しました');
      console.error('Error sending message:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">{room.name}</h2>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && messages.length === 0 && <div>読み込み中...</div>}
        {error && (
          <div className="p-2 text-red-500 bg-red-100 rounded">
            {error}
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${
              message.type === 'system' ? 'justify-center' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] p-3 rounded ${
                message.type === 'system'
                  ? 'bg-gray-100 text-gray-600 text-sm'
                  : 'bg-blue-100'
              }`}
            >
              {message.type !== 'system' && (
                <div className="text-sm text-gray-600 mb-1">
                  {message.authorName}
                </div>
              )}
              <div>{message.content}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(message.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力フォーム */}
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="メッセージを入力"
            className="flex-1 px-3 py-2 border rounded"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400"
            disabled={isLoading || !newMessage.trim()}
          >
            送信
          </button>
        </div>
      </form>
    </div>
  );
};