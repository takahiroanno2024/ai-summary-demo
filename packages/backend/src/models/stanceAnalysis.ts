import mongoose from "mongoose";

export interface IStanceAnalysis {
  projectId: mongoose.Types.ObjectId;
  questionId: string;
  analysis: string;
  stanceAnalysis: {
    [key: string]: {
      count: number;
      comments: string[];
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const stanceAnalysisSchema = new mongoose.Schema<IStanceAnalysis>({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  questionId: {
    type: String,
    required: true,
  },
  analysis: {
    type: String,
    required: true,
  },
  stanceAnalysis: {
    type: Map,
    of: {
      count: Number,
      comments: [String],
    },
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

// プロジェクトIDと質問IDの組み合わせでユニークにする
stanceAnalysisSchema.index({ projectId: 1, questionId: 1 }, { unique: true });

export const StanceAnalysis = mongoose.model<IStanceAnalysis>(
  "StanceAnalysis",
  stanceAnalysisSchema,
);
