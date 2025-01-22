import mongoose from 'mongoose';

export interface IComment {
  content: string;
  projectId: mongoose.Types.ObjectId;
  extractedContent?: string;
  createdAt: Date;
}

const commentSchema = new mongoose.Schema<IComment>({
  content: {
    type: String,
    required: true,
    trim: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  extractedContent: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Comment = mongoose.model<IComment>('Comment', commentSchema);