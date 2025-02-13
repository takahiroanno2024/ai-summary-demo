import mongoose from 'mongoose';

export interface IStance {
  id: string;
  name: string;
}

export interface IQuestion {
  id: string;
  text: string;
  stances: IStance[];
}

export interface IProject {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  extractionTopic?: string;
  context?: string;
  questions: IQuestion[];
  createdAt: Date;
}

const stanceSchema = new mongoose.Schema<IStance>({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
});

const questionSchema = new mongoose.Schema<IQuestion>({
  id: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
    trim: true,
  },
  stances: {
    type: [stanceSchema],
    required: true,
    default: [],
  },
});

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
  context: {
    type: String,
    trim: true,
  },
  questions: {
    type: [questionSchema],
    required: true,
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Project = mongoose.model<IProject>('Project', projectSchema);