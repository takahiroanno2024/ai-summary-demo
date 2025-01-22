import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Project } from '../types/project';
import { Comment } from '../types/comment';
import { CommentList } from '../components/CommentList';
import { CommentForm } from '../components/CommentForm';

const API_URL = 'http://localhost:3001/api';

export const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string>('');

  const fetchProject = async () => {
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}`);
      if (!response.ok) throw new Error('プロジェクトの取得に失敗しました');
      const data = await response.json();
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
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

  const handleSubmitComment = async (content: string) => {
    try {
      const response = await fetch(`${API_URL}/projects/${projectId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('コメントの投稿に失敗しました');
      await fetchComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
      throw err;
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchComments();
    }
  }, [projectId]);

  if (!project) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">読み込み中...</p>
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

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          新規コメント
        </h2>
        <CommentForm onSubmit={handleSubmitComment} />
      </div>

      <CommentList comments={comments} />
    </div>
  );
};