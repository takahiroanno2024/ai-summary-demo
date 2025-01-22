import mongoose from 'mongoose';

export interface IProject {
  name: string;
  description?: string;
  extractionTopic?: string;
  createdAt: Date;
}

const projectSchema = new mongoose.Schema<IProject>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  extractionTopic: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Project = mongoose.model<IProject>('Project', projectSchema);