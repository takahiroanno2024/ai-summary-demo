import { Project } from '../types/project';
import { Link } from 'react-router-dom';

interface ProjectListProps {
  projects: Project[];
  onEdit?: (project: Project) => void;
}

export const ProjectList = ({ projects, onEdit }: ProjectListProps) => {
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
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{project.commentCount}件のコメント</span>
                  <span>•</span>
                  <span>{project.questions.length}件の問い</span>
                </div>
              </Link>
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