// プロンプトの種類を定義
export type PromptType = 
  | 'stanceAnalysis'
  | 'contentExtraction'
  | 'questionGeneration'
  | 'relevanceCheck'
  | 'stanceReport'
  | 'projectReport';

// カスタムプロンプトの設定インターフェース
export interface CustomPrompts {
  stanceAnalysis?: string;
  contentExtraction?: string;
  questionGeneration?: string;
  relevanceCheck?: string;
  stanceReport?: string;
  projectReport?: string;
}

// プロンプト設定のデフォルト値
export const defaultPrompts: Partial<CustomPrompts> = {
  stanceAnalysis: undefined,
  contentExtraction: undefined,
  questionGeneration: undefined,
  relevanceCheck: undefined,
  stanceReport: undefined,
  projectReport: undefined,
};

// LocalStorageのキー
export const STORAGE_KEY = 'customPrompts';

// プロンプト設定のバリデーション
export interface PromptValidation {
  isValid: boolean;
  error?: string;
}

export const validatePrompt = (prompt: string): PromptValidation => {
  if (!prompt.trim()) {
    return { isValid: false, error: 'プロンプトを入力してください' };
  }
  
  if (prompt.length > 10000) {
    return { isValid: false, error: 'プロンプトが長すぎます（最大10000文字）' };
  }

  return { isValid: true };
};

// プロンプト設定のフォーム状態
export interface PromptFormState {
  type: PromptType;
  content: string;
  error?: string;
}

// プロンプト設定のコンテキスト
export interface PromptSettingsContext {
  customPrompts: CustomPrompts;
  updatePrompt: (type: PromptType, content: string) => void;
  resetPrompt: (type: PromptType) => void;
  resetAllPrompts: () => void;
}