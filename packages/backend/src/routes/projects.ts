import express from 'express';
import { ProjectService } from '../services/projectService';
import { StanceAnalyzer } from '../services/stanceAnalyzer';
import { QuestionGenerator } from '../services/questionGenerator';
import { validateObjectId } from '../middleware/validateObjectId';

const router = express.Router();

// サービスのインスタンスを作成
const stanceAnalyzer = new StanceAnalyzer(process.env.GEMINI_API_KEY || '');
const questionGenerator = new QuestionGenerator(process.env.GEMINI_API_KEY || '');
const projectService = new ProjectService(stanceAnalyzer, questionGenerator);

// プロジェクト一覧の取得
router.get('/', async (req, res, next) => {
  try {
    const projects = await projectService.getAllProjects();
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

// プロジェクトの追加
router.post('/', async (req, res, next) => {
  try {
    const { name, description, extractionTopic } = req.body;
    const project = await projectService.createProject({
      name,
      description,
      extractionTopic
    });
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

// 特定のプロジェクトの取得
router.get('/:projectId', 
  validateObjectId('projectId'),
  async (req, res, next) => {
    try {
      const project = await projectService.getProjectById(req.params.projectId);
      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

// プロジェクトの更新
router.put('/:projectId',
  validateObjectId('projectId'),
  async (req, res, next) => {
    try {
      const { name, description, extractionTopic, questions } = req.body;
      const updatedProject = await projectService.updateProject(req.params.projectId, {
        name,
        description,
        extractionTopic,
        questions
      });
      res.json(updatedProject);
    } catch (error) {
      next(error);
    }
  }
);

// プロジェクトの質問を自動生成
router.post('/:projectId/generate-questions',
  validateObjectId('projectId'),
  async (req, res, next) => {
    try {
      const updatedProject = await projectService.generateQuestions(req.params.projectId);
      res.json(updatedProject);
    } catch (error) {
      next(error);
    }
  }
);

export default router;