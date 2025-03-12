import express from 'express';
import { AnalysisService } from '../services/analysisService';
import { StanceReportGenerator } from '../services/stanceReportGenerator';
import { ProjectReportGenerator } from '../services/projectReportGenerator';
import { ProjectVisualReportGenerator } from '../services/projectVisualReportGenerator';
import { validateObjectId } from '../middleware/validateObjectId';

const router = express.Router();

// サービスのインスタンスを作成
const apiKey = process.env.OPENROUTER_API_KEY || '';
const stanceReportGenerator = new StanceReportGenerator(apiKey);
const projectReportGenerator = new ProjectReportGenerator(apiKey);
const projectVisualReportGenerator = new ProjectVisualReportGenerator(apiKey);
const analysisService = new AnalysisService(stanceReportGenerator, projectReportGenerator, projectVisualReportGenerator);

// 質問ごとの立場の分析を取得
router.get('/projects/:projectId/questions/:questionId/stance-analysis',
  validateObjectId('projectId'),
  async (req, res, next) => {
    try {
      const { projectId, questionId } = req.params;
      const forceRegenerate = req.query.forceRegenerate === 'true';
      const customPrompt = req.query.customPrompt as string | undefined;
      
      const analysis = await analysisService.analyzeStances(
        projectId,
        questionId,
        forceRegenerate,
        customPrompt
      );
      
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  }
);

// プロジェクト全体の分析レポートを生成 (Markdown)
router.get('/projects/:projectId/analysis',
  validateObjectId('projectId'),
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const forceRegenerate = req.query.forceRegenerate === 'true';
      const customPrompt = req.query.customPrompt as string | undefined;
      
      const analysis = await analysisService.generateProjectReport(
        projectId,
        forceRegenerate,
        customPrompt
      );
      
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  }
);

// プロジェクト全体のビジュアル分析レポートを生成 (HTML+CSS)
router.get('/projects/:projectId/visual-analysis',
  validateObjectId('projectId'),
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const forceRegenerate = req.query.forceRegenerate === 'true';
      const customPrompt = req.query.customPrompt as string | undefined;
      
      const analysis = await analysisService.generateProjectVisualReport(
        projectId,
        forceRegenerate,
        customPrompt
      );
      
      res.json(analysis);
    } catch (error) {
      next(error);
    }
  }
);

// プロジェクトデータをCSVとしてエクスポート
router.get('/projects/:projectId/export-csv',
  validateObjectId('projectId'),
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const csvData = await analysisService.exportProjectDataToCsv(projectId);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=project-${projectId}-export.csv`);
      res.send(csvData);
    } catch (error) {
      next(error);
    }
  }
);

export default router;