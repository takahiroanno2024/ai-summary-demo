import express from 'express';
import { PromptTemplate } from '../utils/promptTemplate';

const router = express.Router();

// デフォルトプロンプトを取得
router.get('/default', async (req, res) => {
  try {
    const defaultPrompts = {
      stanceAnalysis: PromptTemplate.getDefaultPrompt('stance-analysis'),
      contentExtraction: PromptTemplate.getDefaultPrompt('content-extraction'),
      questionGeneration: PromptTemplate.getDefaultPrompt('question-generation'),
      relevanceCheck: PromptTemplate.getDefaultPrompt('relevance-check'),
      stanceReport: PromptTemplate.getDefaultPrompt('stance-report'),
      projectReport: PromptTemplate.getDefaultPrompt('project-report')
    };
    res.json(defaultPrompts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load default prompts' });
  }
});

export default router;