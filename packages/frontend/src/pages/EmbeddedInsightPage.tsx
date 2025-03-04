import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Project } from '../types/project';
import { Comment } from '../types/comment';
import { StanceAnalytics } from '../components/StanceAnalytics';
import { getProject, getComments } from '../config/api';
import { ProjectAnalytics } from '../components/ProjectAnalytics';

export const EmbeddedInsightPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const view = searchParams.get('view') || 'stance';
  const questionId = searchParams.get('question');
  const analyticsUrl = `/projects/${projectId}/analytics`;

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) {
        setError('プロジェクトIDが指定されていません');
        setIsLoading(false);
        return;
      }

      try {
        const [projectData, commentsData] = await Promise.all([
          getProject(projectId),
          getComments(projectId)
        ]);
        setProject(projectData);
        setComments(commentsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-4">
        <div className="text-red-500 text-sm">
          {error || 'プロジェクトが見つかりませんでした'}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white h-[600px] overflow-hidden relative">
      {view === 'stance' ? (
        <StanceAnalytics
          comments={comments}
          project={project}
          initialQuestionId={questionId}
        />
      ) : (
        <ProjectAnalytics project={project} />
      )}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent flex items-end justify-center pb-4">
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors"
            onClick={() => {
              window.open(analyticsUrl, '_blank');
            }}
          >
            もっと見る
          </button>
        </div>
    </div>
  );
};
