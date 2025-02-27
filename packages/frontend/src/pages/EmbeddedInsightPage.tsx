import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Project } from '../types/project';
import { Comment } from '../types/comment';
import { StanceAnalytics } from '../components/StanceAnalytics';
import { ProjectAnalytics } from '../components/ProjectAnalytics';
import { getProject, getComments } from '../config/api';

export const EmbeddedInsightPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const view = searchParams.get('view') || 'stance';
  const questionId = searchParams.get('question');

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
    <div className="bg-white">
      {view === 'stance' ? (
        <StanceAnalytics
          comments={comments}
          project={project}
          initialQuestionId={questionId}
        />
      ) : (
        <ProjectAnalytics project={project} />
      )}
    </div>
  );
};