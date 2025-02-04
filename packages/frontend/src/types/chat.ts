export interface ChatRoom {
  _id: string;
  projectId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id: string;
  chatRoomId: string;
  type: 'user' | 'system';
  content: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewChatRoom {
  name: string;
}

export interface NewChatMessage {
  content: string;
  authorName: string;
}