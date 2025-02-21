import mongoose, { Schema, Document } from 'mongoose';

export enum MessageType {
  USER = 'user',
  SYSTEM = 'system',
}

export interface IChatMessage extends Document {
  chatRoomId: mongoose.Types.ObjectId;
  type: MessageType;
  content: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema({
  chatRoomId: {
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true,
  },
  type: {
    type: String,
    enum: Object.values(MessageType),
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  authorName: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Export schema for external hooks
export { chatMessageSchema };

// Create and export model
export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);