/**
 * 「**text**」形式のテキストを**「text」**形式に変換する
 * @param text 変換対象のテキスト
 * @returns 変換後のテキスト
 */
export const convertBoldBrackets = (text: string): string => {
  // **「text」** -> 「**text**」の形式に変換
  return text.replace(/\*\*「([^」]*?)」\*\*/g, '「**$1**」');
};