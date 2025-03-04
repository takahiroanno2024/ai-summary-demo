import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Project } from '../types/project';
import { Comment } from '../types/comment';
import { StanceGraphComponent } from '../components/StanceGraphComponent';
import { ProjectQuestionsAndStances } from '../components/ProjectQuestionsAndStances';
import { getProject, getComments } from '../config/api';

export const EmbeddedInsightPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

  const view = searchParams.get('view') || 'stance';
  const questionId = searchParams.get('question');
  const isOverallRoute = location.pathname.endsWith('/overall');
  const isAnalyticsRoute = location.pathname.endsWith('/analytics');

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

  // プロジェクトが読み込まれたら選択された論点を更新
  useEffect(() => {
    if (project) {
      if (questionId) {
        const question = project.questions.find(q => q.id === questionId);
        if (question) {
          setSelectedQuestion(question);
          return;
        }
      }
      
      // /overall ルートの場合またはquestionIdが指定されていない場合は、selectedQuestionをnullに設定
      if (isOverallRoute || (!questionId && !isAnalyticsRoute)) {
        setSelectedQuestion(null);
        return;
      }
      
      // /analytics ルートでquestionIdが指定されていない場合は、最初の論点を選択
      if (isAnalyticsRoute && !questionId && project.questions.length > 0) {
        setSelectedQuestion(project.questions[0]);
        return;
      }
      
      if (project.questions.length > 0) {
        setSelectedQuestion(project.questions[0]);
      } else {
        setSelectedQuestion(null);
      }
    }
  }, [project, questionId, isOverallRoute, isAnalyticsRoute]);

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

  // /overall ルートの場合は、プロジェクト全体のレポートを表示
  if (isOverallRoute && project) {
    return (
      <div className="bg-white">
        <ProjectQuestionsAndStances project={project} />
      </div>
    );
  }

  // /analytics ルート以外で、questionIdが指定されていない場合は、プロジェクト全体のレポートを表示
  if (!isAnalyticsRoute && !questionId && project) {
    return (
      <div className="bg-white">
        <ProjectQuestionsAndStances project={project} />
      </div>
    );
  }

  if (!selectedQuestion) {
    return <div className="p-4">論点が設定されていません</div>;
  }

  return (
    <div className="bg-white">
      {view === 'stance' ? (
        <StanceGraphComponent
          comments={comments}
          selectedQuestion={selectedQuestion}
          showTitle={true} // 埋め込みビューではタイトルを表示する
        />
      ) : (
        <ProjectQuestionsAndStances project={project} />
      )}
    </div>
  );
};