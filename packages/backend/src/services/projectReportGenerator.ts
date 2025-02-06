import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';
import { IProject } from '../models/project';
import { IComment } from '../models/comment';
import { StanceReportGenerator } from './stanceReportGenerator';
import { ProjectAnalysis, IProjectAnalysis } from '../models/projectAnalysis';

export interface ProjectAnalysisResult {
  projectName: string;
  overallAnalysis: string;
}

export class ProjectReportGenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private stanceReportGenerator: StanceReportGenerator;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    this.stanceReportGenerator = new StanceReportGenerator(apiKey);
  }

  private async generateOverallAnalysisPrompt(
    project: IProject,
    questionAnalyses: {
      question: string;
      stanceAnalysis: {
        [key: string]: {
          count: number;
          comments: string[];
        };
      };
      analysis: string;
    }[]
  ): Promise<string> {
    return `以下のプロジェクトの分析結果を読み、プロジェクト全体の傾向や特徴について理解し、
その内容を万人に伝わるように分かりやすく、かつ十分に専門的で具体的になるように丁寧に説明してください。

プロジェクト名: ${project.name}
プロジェクト概要: ${project.description}

${questionAnalyses.map((qa, index) => `
論点${index + 1}: ${qa.question}

論点に対する立場の分布と代表的なコメント:
${Object.entries(qa.stanceAnalysis).map(([stance, data]) => `
- ${stance}: ${data.count}件のコメント
`).join('')}

分析結果:
${qa.analysis}
`).join('\n---\n')}

分析のポイント:
- 特に重要な論点と対立軸
- 全体で合意できている、できていない論点
- 質問間の関連性や共通パターン
- 特に注目すべき独特な意見や傾向
- プロジェクト全体を通じて見えてくる重要な示唆

以下のテンプレートに一字一句従いつつ、[]の部分を埋めてください。
テンプレート:
"""
# [プロジェクト名]の分析レポート

本レポートはX, YouTube, フォーム等から収集された${questionAnalyses.reduce((total, qa) => total + Object.values(qa.stanceAnalysis).reduce((sum, stance) => sum + (stance?.count || 0), 0), 0)}件のコメントを元に、議論を集約・分析したものです。
[全体像を2~3文で要約]

## 1. 主要な論点と対立軸
- **最も重要な論点**:
  - [論点の概要]
  - [主な対立軸の説明]

- **その他の重要な論点**:
  - [論点2の概要と対立軸]
  - [論点3の概要と対立軸]

## 2. 合意形成の状況
### 合意が得られている点
- [合意点1の説明]
- [合意点2の説明]

### 意見が分かれている点
- [対立点1の説明]
- [対立点2の説明]

## 3. 質問間の関連性とパターン
- **共通するテーマ**:
  - [テーマ1の説明]
  - [テーマ2の説明]

- **相互に影響する論点**:
  - [関連性1の説明]
  - [関連性2の説明]

## 4. 特筆すべき意見や傾向
- **独特な視点**:
  - [特徴的な意見1]
  - [特徴的な意見2]

- **注目すべきパターン**:
  - [パターン1の説明]
  - [パターン2の説明]

## 5. 重要な示唆
- **プロジェクト全体からの学び**:
  - [主要な示唆1]
  - [主要な示唆2]

- **今後の検討課題**:
  - [課題1]
  - [課題2]

---

## 注意事項
- 本分析で使用した情報ソースでは、一人のユーザーが複数の意見を投稿できる仕様となっているため、数値はあくまで参考情報としてご認識ください。
- データ分析実施日: ${new Date().toLocaleDateString()}
"""

コツ:
- Markdown記法の見出し、箇条書き、太字などを積極的に利用し、徹底的に読みやすくしてください。tableは使わないでください。
- パッと読んで誰でも理解できるように簡潔にまとめてください。
- 質問間の関連性や全体的なパターンを重視してください。
`;
  }

  async getAnalysis(
    projectId: string
  ): Promise<IProjectAnalysis | null> {
    return ProjectAnalysis.findOne({
      projectId: new mongoose.Types.ObjectId(projectId)
    });
  }

  async generateProjectReport(
    project: IProject & { _id: mongoose.Types.ObjectId },
    comments: IComment[],
    forceRegenerate: boolean = false
  ): Promise<ProjectAnalysisResult> {
    try {
      // 強制再生成でない場合のみ既存の分析結果を確認
      console.log('Checking for existing analysis...');
      const existingAnalysis = await this.getAnalysis(project._id.toString());
      console.log('Existing analysis:', existingAnalysis);
      if (!forceRegenerate && existingAnalysis) {
        console.log('Using existing analysis');
        return {
          projectName: existingAnalysis.projectName,
          overallAnalysis: existingAnalysis.overallAnalysis
        };
      }
      console.log('No existing analysis found or force regenerate is true');

      // 各質問の分析を実行(全体分析のための入力として使用)
      console.log('Generating question analyses...');
      const questionAnalyses = await Promise.all(
        project.questions.map(async question => {
          console.log(`Analyzing question: ${question.text}`);
          const analysis = await this.stanceReportGenerator.analyzeStances(
            project._id.toString(),
            question.text,
            comments,
            question.stances,
            question.id
          );

          console.log('Stance analysis result:', JSON.stringify(analysis.stanceAnalysis, null, 2));
          const result = {
            question: question.text,
            stanceAnalysis: analysis.stanceAnalysis,
            analysis: analysis.analysis
          };
          console.log('Question analysis result:', JSON.stringify(result, null, 2));
          return result;
        })
      );
      console.log('All question analyses:', JSON.stringify(questionAnalyses, null, 2));

      // プロジェクト全体の分析を生成
      const prompt = await this.generateOverallAnalysisPrompt(project, questionAnalyses);
      const result = await this.model.generateContent(prompt);
      const overallAnalysis = result.response.text();

      // 分析結果をデータベースに保存 (既存のドキュメントがあれば更新、なければ新規作成)
      await ProjectAnalysis.findOneAndUpdate(
        { projectId: project._id },
        {
          projectId: project._id,
          projectName: project.name,
          overallAnalysis,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      return {
        projectName: project.name,
        overallAnalysis
      };
    } catch (error) {
      console.error('Project analysis generation failed:', error);
      throw error;
    }
  }
}