import { useState } from 'react';
import { Project } from '../types/project';
import { Link } from 'react-router-dom';

interface ProjectListProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
}

export const ProjectList = ({ projects, onEdit }: ProjectListProps) => {
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleExpand = (projectId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  return (
    <div className="space-y-4">
      {projects.map((project) => (
        <div
          key={project._id}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <Link
                to={`/projects/${project._id}`}
                className="block hover:text-blue-500"
              >
                <h3 className="font-medium text-gray-900">{project.name}</h3>
                {project.description && (
                  <p className="mt-2 text-gray-700">{project.description}</p>
                )}
                <span className="text-sm text-gray-500 block mt-2">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </Link>

              {/* 問いと立場の表示 */}
              {project.questions && project.questions.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      toggleExpand(project._id);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    <span className="mr-1">
                      {expandedProjects[project._id] ? '▼' : '▶'}
                    </span>
                    問いと立場を{expandedProjects[project._id] ? '隠す' : '表示'}
                    <span className="ml-2 text-gray-500">
                      ({project.questions.length}件の問い)
                    </span>
                  </button>

                  {expandedProjects[project._id] && (
                    <div className="mt-2 pl-4 border-l-2 border-gray-200">
                      {project.questions.map((question, index) => (
                        <div key={question.id} className="mt-3 first:mt-0">
                          <h4 className="text-sm font-medium text-gray-900">
                            問い {index + 1}: {question.text}
                          </h4>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {question.stances.map(stance => (
                              <span
                                key={stance.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                              >
                                {stance.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {onEdit && (
              <button
                onClick={() => onEdit(project)}
                className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              >
                設定を編集
              </button>
            )}
          </div>
        </div>
      ))}
      {projects.length === 0 && (
        <p className="text-center text-gray-500">プロジェクトはまだありません</p>
      )}
    </div>
  );
};