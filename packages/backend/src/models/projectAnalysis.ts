import mongoose from "mongoose";

export interface IProjectAnalysis {
  projectId: mongoose.Types.ObjectId;
  projectName: string;
  overallAnalysis: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectAnalysisSchema = new mongoose.Schema<IProjectAnalysis>({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
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
projectAnalysisSchema.index({ projectId: 1 }, { unique: true });

export const ProjectAnalysis = mongoose.model<IProjectAnalysis>(
  "ProjectAnalysis",
  projectAnalysisSchema,
);
