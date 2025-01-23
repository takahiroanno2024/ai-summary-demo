import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Project } from '../types/project';
import { Comment, CommentSourceType } from '../types/comment';
import { CommentList } from '../components/CommentList';
import { ProjectQuestionsAndStances } from '../components/ProjectQuestionsAndStances';
import { CommentForm } from '../components/CommentForm';
import { StanceAnalytics } from '../components/StanceAnalytics';
import { QuestionGenerationButton } from '../components/QuestionGenerationButton';
import { API_URL } from '../config/api';

export const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'analytics'>('comments');

  const fetchProject = async () => {
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}`);
      if (!response.ok) throw new Error('プロジェクトの取得に失敗しました');
      const data = await response.json();
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/comments`);
      if (!response.ok) throw new Error('コメントの取得に失敗しました');
      const data = await response.json();
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    }
  };

  const handleSubmitComment = async (data: { content: string; sourceType?: CommentSourceType; sourceUrl?: string }) => {
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('コメントの投稿に失敗しました');
      await fetchComments();
      setError(''); // 成功したらエラーをクリア
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      throw err;
    }
  };

  useEffect(() => {
    if (projectId) {
      setIsLoading(true);
      fetchProject();
      fetchComments();
    }
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-red-500">プロジェクトが見つかりませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
      {project.description && (
        <p className="text-gray-700 mb-8">{project.description}</p>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('comments')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'comments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            コメント一覧
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
              ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            立場の分析
          </button>
        </nav>
      </div>

      <div className="mt-8">
        {activeTab === 'comments' && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                新規コメント
              </h2>
              <CommentForm
                onSubmit={handleSubmitComment}
                project={project}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <ProjectQuestionsAndStances project={project} />
            </div>
            <CommentList comments={comments} project={project} />
          </>
        )}

        {activeTab === 'analytics' && (
          <>
            <div className="mb-6">
              <QuestionGenerationButton
                isGenerating={isLoading}
                onGenerate={async () => {
                  setIsLoading(true);
                  try {
                    const response = await fetch(
                      `${API_URL}/projects/${projectId}/generate-questions`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                      }
                    );

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.message || '質問の生成に失敗しました');
                    }

                    const updatedProject = await response.json();
                    setProject(updatedProject);
                    // 質問が更新されたので、コメントも再取得
                    await fetchComments();
                    setError('');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : '質問の生成に失敗しました');
                  } finally {
                    setIsLoading(false);
                  }
                }}
              />
            </div>
            <StanceAnalytics comments={comments} project={project} />
          </>
        )}
      </div>
    </div>
  );
};