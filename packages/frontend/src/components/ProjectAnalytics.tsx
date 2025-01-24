import { useState, useCallback, useEffect } from 'react';
import { Project } from '../types/project';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_URL } from '../config/api';

interface ProjectAnalyticsProps {
  project: Project;
}

interface ProjectAnalysisResult {
  projectName: string;
  questionAnalyses: {
    question: string;
    stanceAnalysis: {
      [key: string]: {
        count: number;
        comments: string[];
      };
    };
    analysis: string;
  }[];
  overallAnalysis: string;
}

export const ProjectAnalytics = ({ project }: ProjectAnalyticsProps) => {
  const [analysisResult, setAnalysisResult] = useState<ProjectAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/projects/${project._id}/analysis`);
      
      if (!response.ok) {
        throw new Error('分析レポートの取得に失敗しました');
      }

      const data = await response.json();
      setAnalysisResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [project._id]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="flex items-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm text-gray-600">分析レポートを読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-md">
        {error}
      </div>
    );
  }

  if (!analysisResult) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* 全体分析 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          プロジェクト全体の分析
        </h3>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown">{analysisResult.overallAnalysis}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};