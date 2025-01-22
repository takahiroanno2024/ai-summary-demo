import { useState } from 'react';
import { Project } from '../types/project';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  project: Project;
}

export const CommentForm = ({ onSubmit, project }: CommentFormProps) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700">
          コメント
        </label>
        <div className="mt-1 space-y-2">
          {project.questions && project.questions.length > 0 && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
              <p className="font-medium mb-2">このプロジェクトの問いと立場:</p>
              <ul className="list-disc pl-5 space-y-2">
                {project.questions.map((question, index) => (
                  <li key={question.id}>
                    <span className="font-medium">問い {index + 1}:</span> {question.text}
                    <div className="mt-1 flex flex-wrap gap-1">
                      {question.stances.map(stance => (
                        <span
                          key={stance.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {stance.name}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-gray-500">
                ※ コメントの内容から、各問いに対する立場が自動的に分析されます
              </p>
            </div>
          )}
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            コメントを分析中...
          </span>
        ) : (
          'コメントを投稿'
        )}
      </button>
    </form>
  );
};