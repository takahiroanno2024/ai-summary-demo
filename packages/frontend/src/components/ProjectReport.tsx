import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { generateProjectReport } from "../config/api";
import type { Project } from "../types/project";

interface ProjectAnalyticsProps {
  project: Project;
}

interface ProjectAnalysisResult {
  projectName: string;
  overallAnalysis: string;
}

export const ProjectReport = ({ project }: ProjectAnalyticsProps) => {
  const [analysisResult, setAnalysisResult] =
    useState<ProjectAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin] = useState(() => !!localStorage.getItem("adminKey"));

  // マークダウン内のquestion://リンクを実際のURLに変換する関数
  const convertQuestionLinks = (markdown: string) => {
    const baseUrl = `${window.location.protocol}//${window.location.host}/projects/${project._id}/analytics`;

    // 変換前の内容をログ
    console.log("=== Converting Links ===");
    console.log("Original markdown:", markdown);

    // [text](question://id) 形式のリンクを検索して変換
    const converted = markdown.replace(
      /\[([^\]]+)\]\(question:\/\/([^)]+)\)/g,
      (match, text, questionId) => {
        const newUrl = `${baseUrl}?question=${questionId}`;
        console.log("Converting link:", {
          from: match,
          to: `[${text}](${newUrl})`,
        });
        return `[${text}](${newUrl})`;
      },
    );

    // 変換結果をログ
    console.log("Converted markdown:", converted);
    console.log("===================");

    return converted;
  };

  const fetchAnalysis = useCallback(
    async (forceRegenerate = false) => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await generateProjectReport(project._id, forceRegenerate);
        setAnalysisResult(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "予期せぬエラーが発生しました",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [project._id],
  );

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="flex items-center space-x-2">
          <svg
            className="animate-spin h-5 w-5 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            role="img"
            aria-label="読み込み中"
          >
            <title>読み込み中</title>
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-gray-600">
            分析レポートを読み込み中...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-50 text-red-700 p-4 rounded-md">{error}</div>;
  }

  if (!analysisResult) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* 全体分析 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            プロジェクト全体の分析
          </h3>
          {isAdmin && (
            <button
              type="button"
              onClick={() => fetchAnalysis(true)}
              disabled={isLoading}
              className={`
                inline-flex items-center px-2 py-1 text-sm font-medium rounded
                border border-gray-300 bg-white hover:bg-gray-50
                text-blue-600 hover:text-blue-700
                ${isLoading ? "cursor-not-allowed opacity-50" : ""}
              `}
            >
              <svg
                className={`mr-1 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="再生成"
              >
                <title>再生成</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {isLoading ? "再生成中" : "再生成"}
            </button>
          )}
        </div>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown">
            {convertQuestionLinks(analysisResult.overallAnalysis)}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
