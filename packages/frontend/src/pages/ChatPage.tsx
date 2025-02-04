import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChatList } from '../components/ChatList';
import { ChatRoom } from '../components/ChatRoom';
import { ChatRoom as IChatRoom } from '../types/chat';

export const ChatPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedRoom, setSelectedRoom] = useState<IChatRoom | null>(null);
  
  // 仮のユーザー名(後で認証システムと連携する)
  const userName = 'ユーザー';

  if (!projectId) {
    return <div>プロジェクトIDが見つかりません</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex gap-4">
        {/* チャットルーム一覧 */}
        <div className="w-1/3">
          <ChatList
            projectId={projectId}
            onSelectRoom={(room) => setSelectedRoom(room)}
          />
        </div>

        {/* チャットルーム */}
        <div className="w-2/3">
          {selectedRoom ? (
            <div className="border rounded h-[600px]">
              <ChatRoom room={selectedRoom} userName={userName} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[600px] border rounded text-gray-500">
              チャットルームを選択してください
            </div>
          )}
        </div>
      </div>
    </div>
  );
};