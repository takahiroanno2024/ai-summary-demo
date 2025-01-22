import { useState } from 'react';

interface ProjectFormProps {
  onSubmit: (name: string, description: string, extractionTopic: string) => Promise<void>;
  initialData?: {
    name: string;
    description?: string;
    extractionTopic?: string;
  };
  mode?: 'create' | 'edit';
}

export const ProjectForm = ({ onSubmit, initialData, mode = 'create' }: ProjectFormProps) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [extractionTopic, setExtractionTopic] = useState(initialData?.extractionTopic || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(name, description, extractionTopic);
      if (mode === 'create') {
        setName('');
        setDescription('');
        setExtractionTopic('');
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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