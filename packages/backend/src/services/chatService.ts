import { ChatRoom, IChatRoom } from '../models/chatRoom';
import { ChatMessage, IChatMessage, MessageType } from '../models/chatMessage';
import mongoose from 'mongoose';

export class ChatService {
  // チャットルーム関連
  async createChatRoom(projectId: string, name: string): Promise<IChatRoom> {
    const chatRoom = new ChatRoom({
      projectId: new mongoose.Types.ObjectId(projectId),
      name,
    });
    return await chatRoom.save();
  }

  async getChatRoomsByProjectId(projectId: string): Promise<IChatRoom[]> {
    return await ChatRoom.find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .sort({ updatedAt: -1 });
  }

  async getChatRoomById(chatRoomId: string): Promise<IChatRoom | null> {
    return await ChatRoom.findById(chatRoomId);
  }

  // メッセージ関連
  async addMessage(
    chatRoomId: string,
    type: MessageType,
    content: string,
    authorName: string
  ): Promise<IChatMessage> {
    const message = new ChatMessage({
      chatRoomId: new mongoose.Types.ObjectId(chatRoomId),
      type,
      content,
      authorName,
    });
    
    const savedMessage = await message.save();
    
    // チャットルームの最終更新日時を更新
    await ChatRoom.findByIdAndUpdate(chatRoomId, {
      updatedAt: new Date(),
    });

    return savedMessage;
  }

  async getMessagesByChatRoomId(chatRoomId: string): Promise<IChatMessage[]> {
    return await ChatMessage.find({ chatRoomId: new mongoose.Types.ObjectId(chatRoomId) })
      .sort({ createdAt: 1 });
  }

  // システムメッセージ送信用のユーティリティメソッド
  async addSystemMessage(chatRoomId: string, content: string): Promise<IChatMessage> {
    return this.addMessage(chatRoomId, MessageType.SYSTEM, content, 'System');
  }
}

export const chatService = new ChatService();