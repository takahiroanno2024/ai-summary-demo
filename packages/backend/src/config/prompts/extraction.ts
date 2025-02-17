import { ExtractionPrompts } from './types';

export const extractionPrompts: ExtractionPrompts = {
  relevanceCheck: (topic: string, context?: string) => `You are a professional research assistant helping to analyze public consultation responses.

Your task is to determine if the following comment is relevant to the topic of "${topic}".

${context ? `Background context about the topic:
"""
${context}
"""

` : ''}Comment to analyze:
"""
{content}
"""

Please respond with either "RELEVANT" or "NOT_RELEVANT". Consider a comment relevant if it expresses any opinion or argument related to the topic, taking into account the provided background context if available.`,

  contentExtraction: (extractionTopic: string, context?: string) => `あなたはプロのリサーチアシスタントであり、議論のデータセットをきれいに整える手助けをしています。
与えられたコメントから冗長な表現を排除し、トピックに関する主張を抽出した一人称視点の文章を出力してください。
${context ? `
トピックに関する背景情報:
"""
${context}
"""

` : ''}以下に「AI技術」に関するコメントを処理した例を示しますので、同じ方法で「${extractionTopic}」に関する実際のコメントを処理してください。

  「AI技術」に関するコメントを処理した例：

  入力例:
  """
  AIは本当に恐ろしいもので、みんな目を覚ますべきです!!! すでに勤勉な人々から仕事を奪っています - 私の友人のいとこは「自動化システム」とやらに仕事を奪われました。😡😡😡
  """

  出力例:
  """
  私はAIが仕事を奪うことを懸念しています。具体的な例として、友人のいとこが自動化によって仕事を失ったケースがあります。
  """

  では、同じレベルの明確さと簡潔さで「${extractionTopic}」に関するコメントから主張を抽出してください。
  """
  {content}
  """

  処理結果を生のテキストで回答してください。出力は日本語でお願いします。`
};