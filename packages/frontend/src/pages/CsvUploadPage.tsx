import React, { useState, useCallback, useRef, useEffect } from 'react';
import { API_URL } from '../config/api';
import { CommentSourceType } from '../types/comment';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';

interface CsvRow {
  content: string;
  sourceType: CommentSourceType;
  sourceUrl: string;
}

interface Project {
  _id: string;
  name: string;
}

const CsvUploadPage: React.FC = () => {
  const [projectId, setProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    isValid: boolean;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`${API_URL}/projects`);
        if (!response.ok) {
          throw new Error('プロジェクトの取得に失敗しました');
        }
        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
        setStatus('プロジェクトの取得に失敗しました');
      }
    };

    fetchProjects();
  }, []);

  const processInBatches = async (data: CsvRow[], batchSize: number = 100) => {
    const totalBatches = Math.ceil(data.length / batchSize);
    let processedBatches = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      if (abortControllerRef.current?.signal.aborted) {
        setStatus('アップロードがキャンセルされました');
        return;
      }

      const batch = data.slice(i, i + batchSize);
      const comments = batch.map(row => ({
        content: row.content,
        sourceType: row.sourceType || 'other',
        sourceUrl: row.sourceUrl || '',
        stances: []
      }));

      try {
        const response = await fetch(`${API_URL}/projects/${projectId}/comments/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comments }),
        });

        if (!response.ok) {
          throw new Error(`APIエラー: ${response.statusText}`);
        }

        processedBatches++;
        const newProgress = (processedBatches / totalBatches) * 100;
        setProgress(newProgress);
        setStatus(`${processedBatches}/${totalBatches} バッチを処理中...`);
      } catch (error) {
        console.error('Error uploading batch:', error);
        setStatus(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
        return;
      }
    }

    setStatus('アップロード完了');
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      setPreviewData(null);
      setStatus('');
      return;
    }

    setSelectedFile(file);
    setStatus('CSVを検証中...');

    Papa.parse<CsvRow>(file, {
      header: true,
      preview: 1,
      complete: (results: ParseResult<CsvRow>) => {
        const hasRequiredColumns = results.meta.fields?.includes('content') ?? false;
        setPreviewData({
          totalRows: results.data.length,
          isValid: hasRequiredColumns
        });
        setStatus(
          hasRequiredColumns 
            ? `${file.name} が選択されました (${results.data.length}件のデータ)`
            : 'CSVファイルに必要な列(content)が含まれていません'
        );
      },
      error: (error: Error) => {
        console.error('CSV parse error:', error);
        setStatus(`CSVの検証に失敗しました: ${error.message}`);
        setPreviewData(null);
      }
    });
  }, []);

  const handleStartUpload = useCallback(() => {
    if (!selectedFile || !projectId || !previewData?.isValid) {
      setStatus('有効なファイルとプロジェクトを選択してください');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setStatus('CSVを解析中...');

    abortControllerRef.current = new AbortController();

    Papa.parse<CsvRow>(selectedFile, {
      header: true,
      complete: async (results: ParseResult<CsvRow>) => {
        const data = results.data;
        if (data.length === 0) {
          setStatus('CSVファイルが空です');
          setIsUploading(false);
          return;
        }

        setStatus(`${data.length}件のデータを処理開始`);
        await processInBatches(data);
        setIsUploading(false);
      },
      error: (error: Error) => {
        console.error('CSV parse error:', error);
        setStatus(`CSVの解析に失敗しました: ${error.message}`);
        setIsUploading(false);
      }
    });
  }, [projectId, selectedFile, previewData]);

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsUploading(false);
    setProgress(0);
    setStatus('アップロードがキャンセルされました');
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">CSVアップロード</h1>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          プロジェクト
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">プロジェクトを選択</option>
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">
          CSVファイル
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="mt-1 block w-full"
          />
        </label>
        <p className="mt-1 text-sm text-gray-500">
          必要な列: content, sourceType (optional), sourceUrl (optional)
        </p>
      </div>

      {selectedFile && previewData?.isValid && !isUploading && (
        <div className="mb-4">
          <button
            onClick={handleStartUpload}
            disabled={!projectId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            アップロード開始
          </button>
        </div>
      )}

      {isUploading && (
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">{status}</p>
          <button
            onClick={handleCancel}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            キャンセル
          </button>
        </div>
      )}

      {!isUploading && status && (
        <p className="text-sm text-gray-600">{status}</p>
      )}
    </div>
  );
};

export default CsvUploadPage;