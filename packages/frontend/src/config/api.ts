import { CustomPrompts, STORAGE_KEY, PromptType } from '../types/prompt';

export const getApiUrl = () => {
  return import.meta.env.VITE_API_URL + "/api";
};

export const API_URL = getApiUrl();

// デフォルトプロンプトを取得
export const getDefaultPrompts = async (): Promise<CustomPrompts> => {
  const response = await fetch(`${API_URL}/prompts/default`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('デフォルトプロンプトの取得に失敗しました');
  }
  return response.json();
};

const getHeaders = (contentType = true) => {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  const adminKey = localStorage.getItem('adminKey');
  if (adminKey) {
    headers['x-api-key'] = adminKey;
  }
  return headers;
};

// カスタムプロンプト関連のヘルパー関数
const getCustomPrompt = (type: PromptType): string | undefined => {
  console.log('Getting custom prompt for type:', type);
  try {
    const savedPrompts = localStorage.getItem(STORAGE_KEY);
    console.log('Saved prompts from localStorage:', savedPrompts);
    if (savedPrompts) {
      const prompts: CustomPrompts = JSON.parse(savedPrompts);
      const result = prompts[type];
      console.log('Custom prompt result:', result);
      return result;
    }
  } catch (e) {
    console.error('Failed to get custom prompt:', e);
  }
  console.log('No custom prompt found, returning undefined');
  return undefined;
};

// 抽出関連のAPI
export const checkRelevance = async (
  projectId: string,
  topic: string,
  context?: string
): Promise<any> => {
  const customPrompt = getCustomPrompt('relevanceCheck');
  
  const queryParams = new URLSearchParams({
    topic,
    ...(context && { context }),
    ...(customPrompt && { customPrompt })
  });
  
  const endpoint = `${API_URL}/projects/${projectId}/relevance-check?${queryParams}`;

  const response = await fetch(endpoint, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('関連性チェックに失敗しました');
  }
  return response.json();
};

export const extractContent = async (
  projectId: string,
  extractionTopic: string,
  context?: string
): Promise<any> => {
  const customPrompt = getCustomPrompt('contentExtraction');
  
  const queryParams = new URLSearchParams({
    extractionTopic,
    ...(context && { context }),
    ...(customPrompt && { customPrompt })
  });
  
  const endpoint = `${API_URL}/projects/${projectId}/content-extraction?${queryParams}`;

  const response = await fetch(endpoint, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('コンテンツ抽出に失敗しました');
  }
  return response.json();
};

// 立場分析関連のAPI
export const analyzeStance = async (
  projectId: string,
  questionText: string,
  stanceOptions: string,
  context?: string
): Promise<any> => {
  const customPrompt = getCustomPrompt('stanceAnalysis');
  
  console.log('Stance Analysis Request:', {
    projectId,
    questionText,
    stanceOptions,
    context,
    hasCustomPrompt: !!customPrompt
  });
  
  const queryParams = new URLSearchParams({
    questionText,
    stanceOptions,
    ...(context && { context }),
    ...(customPrompt && { customPrompt })
  });
  
  const endpoint = `${API_URL}/projects/${projectId}/stance-analysis?${queryParams}`;
  console.log('Stance Analysis Endpoint:', endpoint);

  try {
    const response = await fetch(endpoint, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stance Analysis Failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error('立場分析に失敗しました');
    }

    const result = await response.json();
    console.log('Stance Analysis Response:', result);
    return result;
  } catch (error) {
    console.error('Stance Analysis Error:', error);
    throw error;
  }
};

// 分析レポート関連のAPI
export const analyzeStances = async (
  projectId: string,
  questionId: string,
  forceRegenerate: boolean = false
): Promise<any> => {
  const customPrompt = getCustomPrompt('stanceReport');
  
  console.log('Analyze Stances Request:', {
    projectId,
    questionId,
    forceRegenerate,
    hasCustomPrompt: !!customPrompt
  });
  
  const queryParams = new URLSearchParams({
    ...(forceRegenerate && { forceRegenerate: 'true' }),
    ...(customPrompt && { customPrompt })
  });
  
  const endpoint = `${API_URL}/projects/${projectId}/questions/${questionId}/stance-analysis?${queryParams}`;

  try {
    const response = await fetch(endpoint, {
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Analyze Stances Failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error('立場分析の取得に失敗しました');
    }

    const result = await response.json();
    console.log('Analyze Stances Success:', {
      stanceCount: Object.keys(result.stanceAnalysis || {}).length,
      analysisLength: result.analysis?.length || 0
    });
    return result;
  } catch (error) {
    console.error('Analyze Stances Error:', error);
    throw error;
  }
};

export const generateProjectReport = async (
  projectId: string,
  forceRegenerate: boolean = false
): Promise<any> => {
  const customPrompt = getCustomPrompt('projectReport');
  
  const queryParams = new URLSearchParams({
    ...(forceRegenerate && { forceRegenerate: 'true' }),
    ...(customPrompt && { customPrompt })
  });
  
  const endpoint = `${API_URL}/projects/${projectId}/analysis?${queryParams}`;

  const response = await fetch(endpoint, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('プロジェクトレポートの生成に失敗しました');
  }
  return response.json();
};

// プロジェクト関連のAPI
export const getProject = async (projectId: string) => {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('プロジェクトの取得に失敗しました');
  }
  return response.json();
};

export const getComments = async (projectId: string) => {
  const response = await fetch(`${API_URL}/projects/${projectId}/comments`, {
    headers: getHeaders(false),
  });
  if (!response.ok) {
    throw new Error('コメントの取得に失敗しました');
  }
  return response.json();
};

import { CommentInput, CommentOptions } from '../types/comment';

export const addComment = async (projectId: string, data: CommentInput, options?: CommentOptions) => {
  const response = await fetch(`${API_URL}/projects/${projectId}/comments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      ...data,
      skipDuplicates: options?.skipDuplicates
    }),
  });
  if (!response.ok) {
    throw new Error('コメントの投稿に失敗しました');
  }
  return response.json();
};

export const generateQuestions = async (projectId: string) => {
  const response = await fetch(
    `${API_URL}/projects/${projectId}/generate-questions`,
    {
      method: 'POST',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    throw new Error('質問の生成に失敗しました');
  }
  return response.json();
};

// CSVアップロード関連のAPI
export const createProjectWithCsv = async (data: {
  name: string;
  description?: string;
  extractionTopic: string;
  context?: string;
}) => {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('プロジェクトの作成に失敗しました');
  }
  return response.json();
};

export const uploadCommentsBulk = async (
  projectId: string,
  comments: CommentInput[],
  options?: CommentOptions
) => {
  const response = await fetch(`${API_URL}/projects/${projectId}/comments/bulk`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      comments,
      skipDuplicates: options?.skipDuplicates
    }),
  });
  if (!response.ok) {
    throw new Error('コメントのアップロードに失敗しました');
  }
  return response.json();
};
