import { Comment } from '../types/comment';
import { useEffect, useState } from 'react';

interface CommentListProps {
  comments: Comment[];
}

export const CommentList = ({ comments }: CommentListProps) => {
  const [hideEmpty, setHideEmpty] = useState(() => {
    const saved = localStorage.getItem('hideEmptyResults');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('hideEmptyResults', JSON.stringify(hideEmpty));
  }, [hideEmpty]);

  const filteredComments = hideEmpty
    ? comments.filter((comment) => comment.extractedContent)
    : comments;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end mb-4">
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
      </div>

      {filteredComments.map((comment) => (
        <div
          key={comment._id}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex flex-col">
            <span className="text-sm text-gray-500 mb-2">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
            <p className="text-gray-700 mb-2">{comment.content}</p>
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-500">抽出結果:</p>
              <p className="text-gray-700 mt-1">
                {comment.extractedContent || '抽出結果なし'}
              </p>
            </div>
          </div>
        </div>
      ))}
      {filteredComments.length === 0 && (
        <p className="text-center text-gray-500">
          {hideEmpty && comments.length > 0
            ? '抽出結果のあるコメントはありません'
            : 'コメントはまだありません'}
        </p>
      )}
    </div>
  );
};