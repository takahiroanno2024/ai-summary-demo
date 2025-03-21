import { PromptTemplate } from "../../utils/promptTemplate";
import type { ReportPrompts } from "./types";

export const reportPrompts: ReportPrompts = {
  stanceReport: (
    questionText: string,
    stanceAnalysisEntries: Array<
      [string, { count: number; comments: string[] }]
    >,
    stanceNames: Map<string, string>,
    customPrompt?: string,
  ) => {
    const stanceEntriesText = stanceAnalysisEntries
      .filter(([_, data]) => data.count > 0)
      .map(([stanceId, data]) => {
        const stanceName = stanceNames.get(stanceId) || "Unknown";
        return `
立場: ${stanceName}
コメント数: ${data.count}
コメント内容:
${data.comments.join("\n")}
`;
      })
      .join("\n");

    return PromptTemplate.generate(
      customPrompt || "stance-report",
      {
        questionText,
        stanceEntries: stanceEntriesText,
      },
      !!customPrompt,
    );
  },

  projectReport: (
    project: {
      name: string;
      description: string;
    },
    questionAnalyses: Array<{
      question: string;
      questionId: string;
      stanceAnalysis: {
        [key: string]: {
          count: number;
          comments: string[];
        };
      };
      analysis: string;
    }>,
  ) => {
    const totalComments = questionAnalyses.reduce(
      (total, qa) =>
        total +
        Object.values(qa.stanceAnalysis).reduce(
          (sum, stance) => sum + (stance?.count || 0),
          0,
        ),
      0,
    );

    const questionAnalysesText = questionAnalyses
      .map(
        (qa, index) => `
[論点${index + 1}: ${qa.question}](question://${qa.questionId})

論点に対する立場の分布と代表的なコメント:
${Object.entries(qa.stanceAnalysis)
  .map(
    ([stance, data]) => `
- ${stance}: ${data.count}件のコメント
`,
  )
  .join("")}

分析結果:
${qa.analysis}
`,
      )
      .join("\n---\n");

    return PromptTemplate.generate("project-report", {
      projectName: project.name,
      projectDescription: project.description,
      questionAnalyses: questionAnalysesText,
      totalComments: totalComments.toString(),
      currentDate: new Date().toLocaleDateString(),
    });
  },
};
