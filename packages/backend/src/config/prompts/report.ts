import { ReportPrompts } from './types';

export const reportPrompts: ReportPrompts = {
  stanceReport: (
    questionText: string,
    stanceAnalysisEntries: Array<[string, { count: number; comments: string[] }]>,
    stanceNames: Map<string, string>
  ) => `以下の論点に対する様々な立場とそれぞれの意見を読み、各立場の意見の傾向、主張の根拠、そして立場間の関係性について分析し、
    その内容を万人に伝わるように徹底的に分かりやすく、かつ十分に専門的で具体的になるように丁寧に説明してください。

  論点: ${questionText}

  ${stanceAnalysisEntries.filter(([_, data]) => data.count > 0).map(([stanceId, data]) => {
    const stanceName = stanceNames.get(stanceId) || 'Unknown';
    return `
  立場: ${stanceName}
  コメント数: ${data.count}
  コメント内容:
  ${data.comments.join('\n')}
  `;
  }).join('\n')}

  分析のポイント:
  - 各立場の主張の要点
  - 異なる立場間の対立点や共通点
  - 特徴的な意見や興味深い視点

  コツ:
  - Markdown記法の見出し、箇条書き、太字などを積極的に利用し、徹底的に読みやすくしてください。
  - パッと読んで誰でも理解できるように簡潔にまとめてください。
  `,

  projectReport: (
    project: {
      name: string;
      description: string;
    },
    questionAnalyses: Array<{
      question: string;
      stanceAnalysis: {
        [key: string]: {
          count: number;
          comments: string[];
        };
      };
      analysis: string;
    }>
  ) => `以下のプロジェクトの分析結果を読み、プロジェクト全体の傾向や特徴について理解し、
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
`
};