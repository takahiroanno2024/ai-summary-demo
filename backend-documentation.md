# バックエンドシステム技術仕様書

[前半部分は同じなので省略...]

## プロンプト管理システム

### ディレクトリ構造
```
src/config/
├── prompt-templates/    # プロンプトのテキストテンプレート
│   ├── content-extraction.txt
│   ├── project-report.txt
│   ├── question-generation.txt
│   ├── relevance-check.txt
│   ├── stance-analysis.txt
│   └── stance-report.txt
└── prompts/            # プロンプト設定と型定義
    ├── extraction.ts
    ├── index.ts
    ├── question.ts
    ├── report.ts
    ├── stance.ts
    └── types.ts
```

### プロンプトテンプレートシステム

#### テンプレート管理（PromptTemplate クラス）
- テンプレートファイルのキャッシング機能
- 変数置換機能
- コンテキストブロックの特別な処理

```typescript
class PromptTemplate {
  static generate(templateName: string, variables: Record<string, string>): string
}
```

#### プロンプトの種類と用途

1. **抽出関連プロンプト**
   ```typescript
   interface ExtractionPrompts {
     // 関連性チェック
     relevanceCheck: (topic: string, context?: string, customPrompt?: string) => string;
     // コンテンツ抽出
     contentExtraction: (extractionTopic: string, context?: string, customPrompt?: string) => string;
   }
   ```

2. **立場分析プロンプト**
   ```typescript
   interface StancePrompts {
     // 立場分析
     stanceAnalysis: (
       questionText: string,
       stanceOptions: string,
       context?: string,
       customPrompt?: string
     ) => string;
   }
   ```

3. **質問生成プロンプト**
   ```typescript
   interface QuestionPrompts {
     // 質問自動生成
     questionGeneration: (comments: string[], customPrompt?: string) => string;
   }
   ```

4. **レポート生成プロンプト**
   ```typescript
   interface ReportPrompts {
     // 立場分析レポート
     stanceReport: (
       questionText: string,
       stanceAnalysisEntries: Array<[string, { count: number; comments: string[] }]>,
       stanceNames: Map<string, string>,
       customPrompt?: string
     ) => string;
     
     // プロジェクト全体レポート
     projectReport: (
       project: { name: string; description: string },
       questionAnalyses: Array<{
         question: string;
         stanceAnalysis: { [key: string]: { count: number; comments: string[] } };
         analysis: string;
       }>,
       customPrompt?: string
     ) => string;
   }
   ```

### プロンプトテンプレートの例

#### 立場分析プロンプト（stance-analysis.txt）
```
以下のコメントに対して、論点「$questionText」について、コメントがどの立場を取っているか分析してください。立場が明確でなければ「立場なし」を選択してください。

$context_block

コメント:
"""
$content
"""

可能な立場: "$stanceOptions"

注意事項:
- "立場なし": コメントが論点に対して明確な立場を示していない場合
- "その他の立場": コメントが論点に対して明確な立場を示しているが、与えられた選択肢のいずれにも当てはまらない場合
- コメントの言外の意味を読み取ろうとせず、明示的に書かれている内容のみを分析してください

以下のJSON形式で回答してください:
{
  "reasoning": "考察"
  "stance": "立場の名前",
  "confidence": 信頼度（0から1の数値）,
}
```

### プロンプトの使用フロー

1. **テンプレートの読み込みと変数置換**
   ```typescript
   // 例: 立場分析プロンプトの生成（デフォルトテンプレート）
   const defaultPrompt = PromptTemplate.generate('stance-analysis', {
     questionText: '原子力発電所の再稼働について',
     stanceOptions: '賛成, 反対, 条件付き賛成',
     context: '2024年のエネルギー政策に関する議論',
     content: 'コメントの内容'
   });

   // カスタムプロンプトを使用した例
   const customPrompt = PromptTemplate.generate('stance-analysis', {
     questionText: '原子力発電所の再稼働について',
     stanceOptions: '賛成, 反対, 条件付き賛成',
     context: '2024年のエネルギー政策に関する議論',
     content: 'コメントの内容',
     customPrompt: '以下のコメントについて、特に環境影響と安全性の観点から立場を分析してください。'
   });
   ```

2. **プロンプトの実行と結果の処理**
   ```typescript
   // StanceAnalyzerでの使用例
   const result = await this.model.generateContent(prompt);
   const response = result.response.text();
   const { stance, confidence } = await this.parseResponse(response);
   ```

### カスタムプロンプト機能

#### 概要
すべてのプロンプトは、デフォルトのテンプレートに加えて、カスタムプロンプトをサポートしています。これにより、特定のユースケースや要件に応じてプロンプトの動作をカスタマイズすることができます。

#### カスタムプロンプトの使用方法

1. **APIエンドポイント**
   ```
   # 立場分析
   GET /api/projects/:projectId/questions/:questionId/stance-analysis?customPrompt=...

   # プロジェクト全体レポート
   GET /api/projects/:projectId/analysis?customPrompt=...
   ```

2. **プログラムでの使用**
   ```typescript
   // 立場分析の例
   const analysis = await analysisService.analyzeStances(
     projectId,
     questionId,
     forceRegenerate,
     customPrompt
   );

   // コンテンツ抽出の例
   const extractedContent = await extractionService.extractContent(
     content,
     extractionTopic,
     context,
     customPrompt
   );
   ```

#### カスタムプロンプトの優先順位
1. カスタムプロンプトが指定された場合、そのプロンプトが使用されます
2. カスタムプロンプトが指定されない場合、デフォルトのテンプレートが使用されます

#### 使用例

1. **立場分析のカスタマイズ**
   ```typescript
   // デフォルト
   const defaultAnalysis = await analysisService.analyzeStances(projectId, questionId);

   // より詳細な分析を要求するカスタムプロンプト
   const customAnalysis = await analysisService.analyzeStances(
     projectId,
     questionId,
     false,
     "以下のコメントの立場を詳細に分析し、その理由も含めて説明してください。特に:\n" +
     "1. コメント内の具体的な表現や文脈\n" +
     "2. 立場を示す根拠となる部分\n" +
     "3. 確信度の判断理由\n" +
     "を明確に示してください。"
   );
   ```

2. **プロジェクトレポートのカスタマイズ**
   ```typescript
   // より簡潔なレポートを要求するカスタムプロンプト
   const customReport = await analysisService.generateProjectReport(
     projectId,
     false,
     "プロジェクトの分析結果を3つの重要なポイントにまとめ、各ポイントを100文字以内で説明してください。"
   );
   ```

### プロンプトテンプレートの特徴

1. **変数置換システム**
   - `$variableName` 形式での変数定義
   - 特別な `$context_block` 処理による柔軟なコンテキスト挿入
   - テンプレート内での条件付きブロック

2. **キャッシング機能**
   - テンプレートファイルの内容をメモリにキャッシュ
   - パフォーマンス最適化
   - 起動時の初期ロード

3. **モジュール化**
   - 目的別のテンプレートファイル
   - 再利用可能なプロンプトコンポーネント
   - 保守性の向上

4. **型安全性**
   - TypeScriptインターフェースによる型定義
   - プロンプト生成時の型チェック
   - 開発時のエラー防止

### プロンプトの保守と更新

1. **テンプレートの更新手順**
   - テンプレートファイルの編集
   - 型定義の更新（必要な場合）
   - キャッシュのクリア

2. **バージョン管理**
   - テンプレートファイルのGit管理
   - 変更履歴の追跡
   - レビュープロセス

3. **品質管理**
   - プロンプトの応答品質モニタリング
   - エラーケースの収集
   - 継続的な改善

[以下の部分は同じなので省略...]