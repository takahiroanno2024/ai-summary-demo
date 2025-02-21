import express from 'express';
import { chatService } from '../services/chatService';
import { MessageType } from '../models/chatMessage';

const router = express.Router();

// チャットルーム作成
router.post('/projects/:projectId/chat-rooms', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const chatRoom = await chatService.createChatRoom(projectId, name);
    res.status(201).json(chatRoom);
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// プロジェクトのチャットルーム一覧取得
router.get('/projects/:projectId/chat-rooms', async (req, res) => {
  try {
    const { projectId } = req.params;
    const chatRooms = await chatService.getChatRoomsByProjectId(projectId);
    res.json(chatRooms);
  } catch (error) {
    console.error('Error getting chat rooms:', error);
    res.status(500).json({ error: 'Failed to get chat rooms' });
  }
});

// チャットルーム詳細取得
router.get('/chat-rooms/:chatRoomId', async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const chatRoom = await chatService.getChatRoomById(chatRoomId);
    
    if (!chatRoom) {
      return res.status(404).json({ error: 'Chat room not found' });
    }
    
    res.json(chatRoom);
  } catch (error) {
    console.error('Error getting chat room:', error);
    res.status(500).json({ error: 'Failed to get chat room' });
  }
});

// メッセージ追加
router.post('/chat-rooms/:chatRoomId/messages', async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const { content, authorName } = req.body;

    if (!content || !authorName) {
      return res.status(400).json({ error: 'Content and author name are required' });
    }

    const message = await chatService.addMessage(
      chatRoomId,
      MessageType.USER,
      content,
      authorName
    );
    res.status(201).json(message);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// メッセージ一覧取得
router.get('/chat-rooms/:chatRoomId/messages', async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const messages = await chatService.getMessagesByChatRoomId(chatRoomId);
    res.json(messages);
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

export default router;