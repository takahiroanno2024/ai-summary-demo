import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProjectWithCsv, uploadCommentsBulk, generateQuestions as generateProjectQuestions } from '../config/api';
import { CommentSourceType, CommentInput, CommentOptions } from '../types/comment';
import Papa from 'papaparse';
import type { ParseResult } from 'papaparse';

interface CsvRow {
  content: string;
  sourceType: CommentSourceType;
  sourceUrl: string;
}

const CsvUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem('adminKey'));

  // Project form states
  const [projectName, setProjectName] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');
  const [extractionTopic, setExtractionTopic] = useState<string>('');
  const [context, setContext] = useState<string>('');
  const [currentProjectId, setCurrentProjectId] = useState<string>('');

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{
    totalRows: number;
    isValid: boolean;
  } | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState<boolean>(true);

  // Progress states
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<'project' | 'upload' | 'questions' | 'complete'>('project');
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Admin権限チェック
  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
    }
  }, [isAdmin, navigate]);

  // AdminKeyの変更を監視
  useEffect(() => {
    const handleStorageChange = () => {
      const hasAdminKey = !!localStorage.getItem('adminKey');
      setIsAdmin(hasAdminKey);
      if (!hasAdminKey) {
        navigate('/');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [navigate]);

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

  const createProject = async () => {
    if (!projectName || !extractionTopic) {
      setStatus('プロジェクト名と抽出トピックを入力してください');
      return;
    }

    setIsProcessing(true);
    setStatus('プロジェクトを作成中...');

    try {
      const project = await createProjectWithCsv({
        name: projectName,
        description: projectDescription,
        extractionTopic,
        context,
      });
      setCurrentProjectId(project._id);
      setCurrentStep('upload');
      setStatus('プロジェクトが作成されました。CSVファイルをアップロードしてください。');
    } catch (error) {
      console.error('Error creating project:', error);
      setStatus(`プロジェクトの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const processInBatches = async (data: CsvRow[], batchSize: number = 100) => {
    const totalBatches = Math.ceil(data.length / batchSize);
    let processedBatches = 0;

    for (let i = 0; i < data.length; i += batchSize) {
      if (abortControllerRef.current?.signal.aborted) {
        setStatus('アップロードがキャンセルされました');
        return;
      }

      const batch = data.slice(i, i + batchSize);
      const comments: CommentInput[] = batch.map(row => ({
        content: row.content,
        sourceType: row.sourceType || 'other',
        sourceUrl: row.sourceUrl || ''
      }));

      try {
        const options: CommentOptions = { skipDuplicates };
        await uploadCommentsBulk(currentProjectId, comments, options);
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

    setStatus('コメントのアップロードが完了しました');
    setCurrentStep('questions');
  };

  const handleStartUpload = useCallback(async () => {
    if (!selectedFile || !currentProjectId || !previewData?.isValid) {
      setStatus('有効なファイルを選択してください');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatus('CSVを解析中...');

    abortControllerRef.current = new AbortController();

    Papa.parse<CsvRow>(selectedFile, {
      header: true,
      complete: async (results: ParseResult<CsvRow>) => {
        const data = results.data;
        if (data.length === 0) {
          setStatus('CSVファイルが空です');
          setIsProcessing(false);
          return;
        }

        setStatus(`${data.length}件のデータを処理開始`);
        await processInBatches(data);
        setIsProcessing(false);
      },
      error: (error: Error) => {
        console.error('CSV parse error:', error);
        setStatus(`CSVの解析に失敗しました: ${error.message}`);
        setIsProcessing(false);
      }
    });
  }, [currentProjectId, selectedFile, previewData]);

  const generateQuestions = async () => {
    setIsProcessing(true);
    setStatus('質問を生成中...');

    try {
      await generateProjectQuestions(currentProjectId);
      setStatus('質問の生成が完了しました');
      setCurrentStep('complete');
    } catch (error) {
      console.error('Error generating questions:', error);
      setStatus(`質問の生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    setProgress(0);
    setStatus('処理がキャンセルされました');
  }, []);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">CSVアップロード</h1>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center">
          {['project', 'upload', 'questions', 'complete'].map((step, index) => (
            <React.Fragment key={step}>
              <div className={`flex items-center ${currentStep === step ? 'text-blue-600' : 'text-gray-500'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 
                  ${currentStep === step ? 'border-blue-600 bg-blue-100' : 'border-gray-300'}`}>
                  {index + 1}
                </div>
                <span className="ml-2">
                  {step === 'project' && 'プロジェクト作成'}
                  {step === 'upload' && 'CSVアップロード'}
                  {step === 'questions' && '質問生成'}
                  {step === 'complete' && '完了'}
                </span>
              </div>
              {index < 3 && (
                <div className={`flex-1 h-0.5 mx-4 ${
                  index < ['project', 'upload', 'questions', 'complete'].indexOf(currentStep)
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Project creation form */}
      {currentStep === 'project' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              プロジェクト名
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                disabled={isProcessing}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              プロジェクトの説明
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                disabled={isProcessing}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              抽出トピック (これを正しく設定しないと主張抽出がうまくいきません。)
              <input
                type="text"
                value={extractionTopic}
                onChange={(e) => setExtractionTopic(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                disabled={isProcessing}
              />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              プロジェクトの背景情報
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                placeholder="プロジェクトに関連する背景情報を入力してください"
                disabled={isProcessing}
              />
            </label>
          </div>
          <button
            onClick={createProject}
            disabled={isProcessing || !projectName || !extractionTopic}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            プロジェクトを作成
          </button>
        </div>
      )}

      {/* CSV upload form */}
      {currentStep === 'upload' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              CSVファイル
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={isProcessing}
                className="mt-1 block w-full"
              />
            </label>
            <p className="mt-1 text-sm text-gray-500">
              必要な列: content, sourceType ('youtube' | 'x' | 'form' | 'chat' | 'other' | null), sourceUrl (optional)
            </p>
          </div>
{selectedFile && previewData?.isValid && !isProcessing && (
  <div>
    <div className="flex items-center mt-4">
      <input
        id="skipDuplicates"
        type="checkbox"
        checked={skipDuplicates}
        onChange={(e) => setSkipDuplicates(e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label htmlFor="skipDuplicates" className="ml-2 block text-sm text-gray-700">
        コメントが重複している場合に追加しない
      </label>
    </div>
    <button
      onClick={handleStartUpload}
      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
    >
      アップロード開始
    </button>
  </div>
)}
        </div>
      )}

      {/* Question generation step */}
      {currentStep === 'questions' && !isProcessing && (
        <div className="space-y-4">
          <p className="text-gray-700">
            コメントのアップロードが完了しました。論点を生成し、立場をラベル付けしますか?
          </p>
          <button
            onClick={generateQuestions}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            処理開始
          </button>
        </div>
      )}

      {/* Complete step */}
      {currentStep === 'complete' && (
        <div className="space-y-4">
          <p className="text-gray-700">
            すべての処理が完了しました。
          </p>
          <a
            href={`/projects/${currentProjectId}`}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            プロジェクトページへ
          </a>
        </div>
      )}

      {/* Progress and status */}
      {isProcessing && (
        <div className="mt-4">
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

      {!isProcessing && status && (
        <p className="mt-4 text-sm text-gray-600">{status}</p>
      )}
    </div>
  );
};

export default CsvUploadPage;