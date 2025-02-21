import mongoose, { Schema, Document } from 'mongoose';

export interface IChatRoom extends Document {
  projectId: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatRoomSchema = new Schema({
  projectId: {
    type: Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

export const ChatRoom = mongoose.model<IChatRoom>('ChatRoom', chatRoomSchema);