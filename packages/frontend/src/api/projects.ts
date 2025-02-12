import { API_URL } from '../config/api';
import { Project } from '../types/project';

interface CreateProjectData {
  name: string;
  description?: string;
  extractionTopic?: string;
}

interface UpdateProjectData extends CreateProjectData {
  questions?: any[];
}

// プロジェクト一覧の取得
export const getAllProjects = async (): Promise<Project[]> => {
  const response = await fetch(`${API_URL}/projects`);
  if (!response.ok) {
    throw new Error('Failed to fetch projects');
  }
  return response.json();
};

// 特定のプロジェクトの取得
export const getProjectById = async (projectId: string): Promise<Project> => {
  const response = await fetch(`${API_URL}/projects/${projectId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch project');
  }
  return response.json();
};

// プロジェクトの作成
export const createProject = async (data: CreateProjectData): Promise<Project> => {
  const response = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to create project');
  }
  return response.json();
};

// プロジェクトの更新
export const updateProject = async (
  projectId: string,
  data: UpdateProjectData
): Promise<Project> => {
  const response = await fetch(`${API_URL}/projects/${projectId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update project');
  }
  return response.json();
};

// プロジェクトの質問を自動生成
export const generateQuestions = async (projectId: string): Promise<Project> => {
  const response = await fetch(`${API_URL}/projects/${projectId}/generate-questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Failed to generate questions');
  }
  return response.json();
};