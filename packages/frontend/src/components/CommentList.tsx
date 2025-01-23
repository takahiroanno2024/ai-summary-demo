import { Comment, CommentSourceType } from '../types/comment';
import { Project } from '../types/project';
import { useEffect, useState } from 'react';

interface CommentListProps {
  comments: Comment[];
  project: Project;
}

export const CommentList = ({ comments, project }: CommentListProps) => {
  const [hideEmpty, setHideEmpty] = useState(() => {
    const saved = localStorage.getItem('hideEmptyResults');
    return saved ? JSON.parse(saved) : true;
  });

  const [showStances, setShowStances] = useState(() => {
    const saved = localStorage.getItem('showStances');
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('hideEmptyResults', JSON.stringify(hideEmpty));
    localStorage.setItem('showStances', JSON.stringify(showStances));
  }, [hideEmpty, showStances]);

  const filteredComments = hideEmpty
    ? comments.filter((comment) => comment.extractedContent)
    : comments;

  // 立場の名前を取得する関数
  const getStanceName = (questionId: string, stanceId: string): string | null => {
    const question = project.questions.find(q => q.id === questionId);
    if (!question) return null;
    
    // 特殊な立場のIDを確認
    if (stanceId === 'neutral') return null; // 「立場なし」は表示しない
    if (stanceId === 'other') return 'その他の立場';
    
    const stance = question.stances.find(s => s.id === stanceId);
    if (!stance) return null;
    return stance.name;
  };

  // 信頼度を表示用に変換する関数
  // const formatConfidence = (confidence: number) => {
  //   return `${Math.round(confidence * 100)}%`;
  // };

  // データソースタイプに応じたスタイルを取得する関数
  const getSourceTypeStyle = (sourceType: CommentSourceType) => {
    switch (sourceType) {
      case 'youtube':
        return 'bg-red-100 text-red-800';
      case 'x':
        return 'bg-gray-900 text-white';
      case 'form':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // データソースタイプの表示名を取得する関数
  const getSourceTypeName = (sourceType: CommentSourceType) => {
    switch (sourceType) {
      case 'youtube':
        return 'YouTube';
      case 'x':
        return 'X (Twitter)';
      case 'form':
        return 'フォーム';
      default:
        return 'その他';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end mb-4 space-x-4">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={hideEmpty}
            onChange={(e) => setHideEmpty(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ms-3 text-sm font-medium text-gray-500">
            抽出結果なしを非表示
          </span>
        </label>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={showStances}
            onChange={(e) => setShowStances(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          <span className="ms-3 text-sm font-medium text-gray-500">
            立場を表示
          </span>
        </label>
      </div>

      {filteredComments.map((comment) => (
        <div
          key={comment._id}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
              {comment.sourceType && (
                <div className="flex items-center gap-2">
                  {comment.sourceUrl ? (
                    <a
                      href={comment.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium hover:opacity-80 ${getSourceTypeStyle(comment.sourceType)}`}
                    >
                      {getSourceTypeName(comment.sourceType)}
                    </a>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSourceTypeStyle(comment.sourceType)}`}>
                      {getSourceTypeName(comment.sourceType)}
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* 抽出結果の表示 */}
            <div className="mt-2">
              <p className="text-gray-700">
                {comment.extractedContent || '抽出結果なし'}
              </p>
            </div>

            {/* 立場の表示 */}
            {showStances && comment.stances && comment.stances.length > 0 && (
              <div className="mt-4 pt-2 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {comment.stances
                    .filter(stance => {
                      const question = project.questions.find(q => q.id === stance.questionId);
                      const stanceName = question?.stances.find(s => s.id === stance.stanceId)?.name;
                      return stanceName !== '立場なし';
                    })
                    .map((stance) => {
                      const question = project.questions.find(q => q.id === stance.questionId);
                      if (!question) return null;

                      const stanceName = getStanceName(stance.questionId, stance.stanceId);
                      if (!stanceName) return null;

                      return (
                        <div key={stance.questionId} className="group relative">
                          <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg">
                            <span className="text-sm font-medium text-blue-800">
                              {stanceName}
                            </span>
                            {/* <span className="text-xs text-gray-500">
                              {formatConfidence(stance.confidence)}
                            </span> */}
                          </div>
                          <div className="invisible group-hover:visible absolute z-10 w-64 p-2 mt-2 text-sm bg-gray-900 text-white rounded shadow-lg">
                            {question.text}
                          </div>
                        </div>
                      );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      {filteredComments.length === 0 && (
        <p className="text-center text-gray-500">
          {hideEmpty && comments.length > 0
            ? '抽出結果のあるコメントはまだありません'
            : 'コメントはまだありません'}
        </p>
      )}
    </div>
  );
};