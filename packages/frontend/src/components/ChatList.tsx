import React, { useState, useEffect } from 'react';
import { ChatRoom, NewChatRoom } from '../types/chat';
import { createChatRoom, getChatRooms } from '../config/api';

interface ChatListProps {
  projectId: string;
  onSelectRoom: (room: ChatRoom) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ projectId, onSelectRoom }) => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // チャットルーム一覧の取得
  const fetchChatRooms = async () => {
    try {
      setIsLoading(true);
      const rooms = await getChatRooms(projectId);
      setChatRooms(rooms);
      setError(null);
    } catch (err) {
      setError('チャットルームの取得に失敗しました');
      console.error('Error fetching chat rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 初回読み込み時にチャットルーム一覧を取得
  useEffect(() => {
    fetchChatRooms();
  }, [projectId]);

  // 新規チャットルーム作成
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    try {
      setIsLoading(true);
      const newRoom: NewChatRoom = { name: newRoomName.trim() };
      await createChatRoom(projectId, newRoom);
      setNewRoomName('');
      await fetchChatRooms(); // 一覧を更新
      setError(null);
    } catch (err) {
      setError('チャットルームの作成に失敗しました');
      console.error('Error creating chat room:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 新規チャットルーム作成フォーム */}
      <form onSubmit={handleCreateRoom} className="space-y-2">
        <input
          type="text"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="新規チャットルーム名"
          className="w-full px-3 py-2 border rounded"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400"
          disabled={isLoading || !newRoomName.trim()}
        >
          {isLoading ? '作成中...' : 'チャットルームを作成'}
        </button>
      </form>

      {/* エラーメッセージ */}
      {error && (
        <div className="p-2 text-red-500 bg-red-100 rounded">
          {error}
        </div>
      )}

      {/* チャットルーム一覧 */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">チャットルーム一覧</h3>
        {isLoading && <div>読み込み中...</div>}
        {!isLoading && chatRooms.length === 0 && (
          <div className="text-gray-500">
            チャットルームがありません
          </div>
        )}
        {chatRooms.map((room) => (
          <div
            key={room._id}
            onClick={() => onSelectRoom(room)}
            className="p-3 border rounded cursor-pointer hover:bg-gray-50"
          >
            <div className="font-medium">{room.name}</div>
            <div className="text-sm text-gray-500">
              最終更新: {new Date(room.updatedAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};