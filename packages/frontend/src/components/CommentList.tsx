import { Comment } from '../types/comment';

interface CommentListProps {
  comments: Comment[];
}

export const CommentList = ({ comments }: CommentListProps) => {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
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
      {comments.length === 0 && (
        <p className="text-center text-gray-500">コメントはまだありません</p>
      )}
    </div>
  );
};