import mongoose from 'mongoose';

export interface IProjectVisualAnalysis {
  projectId: mongoose.Types.ObjectId;
  projectName: string;
  overallAnalysis: string; // This will contain HTML+CSS content
  createdAt: Date;
  updatedAt: Date;
}

const projectVisualAnalysisSchema = new mongoose.Schema<IProjectVisualAnalysis>({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  projectName: {
    type: String,
    required: true,
  },
  overallAnalysis: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// プロジェクトIDでユニークにする
projectVisualAnalysisSchema.index({ projectId: 1 }, { unique: true });

export const ProjectVisualAnalysis = mongoose.model<IProjectVisualAnalysis>('ProjectVisualAnalysis', projectVisualAnalysisSchema);