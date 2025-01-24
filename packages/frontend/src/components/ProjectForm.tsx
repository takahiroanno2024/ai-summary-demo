import { useState } from 'react';
import { Question } from '../types/project';
import { v4 as uuidv4 } from 'uuid';

interface ProjectFormProps {
  onSubmit: (
    name: string,
    description: string,
    extractionTopic: string,
    questions: Question[]
  ) => Promise<void>;
  initialData?: {
    name: string;
    description?: string;
    extractionTopic?: string;
    questions?: Question[];
  };
  mode?: 'create' | 'edit';
}

export const ProjectForm = ({ onSubmit, initialData, mode = 'create' }: ProjectFormProps) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [extractionTopic, setExtractionTopic] = useState(initialData?.extractionTopic || '');
  const [questions, setQuestions] = useState<Question[]>(initialData?.questions || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 新しい論点を追加
  const addQuestion = () => {
    const newQuestion: Question = {
      id: uuidv4(),
      text: '',
      stances: [
        { id: uuidv4(), name: '立場なし' } // デフォルトの立場を追加
      ]
    };
    setQuestions([...questions, newQuestion]);
  };

  // 論点を削除
  const removeQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  // 論点のテキストを更新
  const updateQuestionText = (questionId: string, text: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId ? { ...q, text } : q
    ));
  };

  // 新しい立場を追加
  const addStance = (questionId: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? {
            ...q,
            stances: [...q.stances, { id: uuidv4(), name: '' }]
          }
        : q
    ));
  };

  // 立場を削除
  const removeStance = (questionId: string, stanceId: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? {
            ...q,
            stances: q.stances.filter(s => s.id !== stanceId)
          }
        : q
    ));
  };

  // 立場の名前を更新
  const updateStanceName = (questionId: string, stanceId: string, name: string) => {
    setQuestions(questions.map(q =>
      q.id === questionId
        ? {
            ...q,
            stances: q.stances.map(s =>
              s.id === stanceId ? { ...s, name } : s
            )
          }
        : q
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(name, description, extractionTopic, questions);
      if (mode === 'create') {
        setName('');
        setDescription('');
        setExtractionTopic('');
        setQuestions([]);
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          プロジェクト名
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          説明
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      <div>
        <label htmlFor="extractionTopic" className="block text-sm font-medium text-gray-700">
          抽出トピック
        </label>
        <textarea
          id="extractionTopic"
          value={extractionTopic}
          onChange={(e) => setExtractionTopic(e.target.value)}
          rows={3}
          placeholder="コメントから抽出したい内容のトピックを入力してください"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* 論点と立場の設定セクション */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">論点と立場の設定</h3>
          <button
            type="button"
            onClick={addQuestion}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            論点を追加
          </button>
        </div>

        {questions.map((question, qIndex) => (
          <div key={question.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex-1 mr-4">
                <label className="block text-sm font-medium text-gray-700">
                  論点 {qIndex + 1}
                </label>
                <input
                  type="text"
                  value={question.text}
                  onChange={(e) => updateQuestionText(question.id, e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="論点を入力してください"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removeQuestion(question.id)}
                className="text-red-600 hover:text-red-800"
              >
                削除
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  立場の選択肢
                </label>
                <button
                  type="button"
                  onClick={() => addStance(question.id)}
                  className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  選択肢を追加
                </button>
              </div>
              {question.stances.map((stance) => (
                <div key={stance.id} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={stance.name}
                    onChange={(e) => updateStanceName(question.id, stance.id, e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="立場の名前"
                    required
                  />
                  {stance.name !== '立場なし' && (
                    <button
                      type="button"
                      onClick={() => removeStance(question.id, stance.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting
          ? (mode === 'create' ? '作成中...' : '更新中...')
          : (mode === 'create' ? 'プロジェクトを作成' : '設定を更新')}
      </button>
    </form>
  );
};