interface QuestionGenerationButtonProps {
  isGenerating: boolean;
  onGenerate: () => void;
}

export const QuestionGenerationButton: React.FC<QuestionGenerationButtonProps> = ({
  isGenerating,
  onGenerate,
}) => {
  const handleClick = () => {
    if (!confirm('現在の論点と立場をすべて削除して、新しい論点と立場を生成しますか？')) {
      return;
    }
    onGenerate();
  };

  return (
    <button
      onClick={handleClick}
      disabled={isGenerating}
      className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isGenerating ? (
      <span className="flex items-center">
        <svg
        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
        </svg>
        生成中...
      </span>
      ) : (
      '論点を全て消去して再生成する (開発用)'
      )}
    </button>
  );
};