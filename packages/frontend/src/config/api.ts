import { ChatMessage, ChatRoom, NewChatMessage, NewChatRoom } from '../types/chat';

export const getApiUrl = () => {
  const host = window.location.hostname;
  return `http://${host}:3001/api`;
};

export const API_URL = getApiUrl();

// チャットルーム関連のAPI
export const createChatRoom = async (projectId: string, data: NewChatRoom): Promise<ChatRoom> => {
  const response = await fetch(`${API_URL}/projects/${projectId}/chat-rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create chat room');
  }
  return response.json();
};

export const getChatRooms = async (projectId: string): Promise<ChatRoom[]> => {
  const response = await fetch(`${API_URL}/projects/${projectId}/chat-rooms`);
  if (!response.ok) {
    throw new Error('Failed to fetch chat rooms');
  }
  return response.json();
};

export const getChatRoom = async (chatRoomId: string): Promise<ChatRoom> => {
  const response = await fetch(`${API_URL}/chat-rooms/${chatRoomId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch chat room');
  }
  return response.json();
};

// メッセージ関連のAPI
export const addMessage = async (chatRoomId: string, data: NewChatMessage): Promise<ChatMessage> => {
  const response = await fetch(`${API_URL}/chat-rooms/${chatRoomId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add message');
  }
  return response.json();
};

export const getMessages = async (chatRoomId: string): Promise<ChatMessage[]> => {
  const response = await fetch(`${API_URL}/chat-rooms/${chatRoomId}/messages`);
  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }
  return response.json();
};