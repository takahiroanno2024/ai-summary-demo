import { Project } from '../types/project';

interface ProjectQuestionsAndStancesProps {
  project: Project;
}

export const ProjectQuestionsAndStances = ({ project }: ProjectQuestionsAndStancesProps) => {
  return (
    <>
      {project.questions && project.questions.length > 0 && (
        // <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
        <>
          <p className="font-medium mb-2">このプロジェクトの論点と立場:</p>
          <ul className="list-disc pl-5 space-y-2">
            {project.questions.map((question, index) => (
              <li key={question.id}>
                <span className="font-medium">論点 {index + 1}:</span> {question.text}
                <div className="mt-1 flex flex-wrap gap-1">
                  {question.stances.map(stance => (
                    <span
                      key={stance.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {stance.name}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-gray-500">
            ※ コメントの内容から、各論点に対する立場が自動的に分析されます
          </p>
        </>
        // </div>
      )}
    </>
  );
};