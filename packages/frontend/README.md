# フロントエンド開発ガイド

## 技術スタック

- **フレームワーク**: React 18
- **言語**: TypeScript
- **ビルドツール**: Vite
- **スタイリング**: TailwindCSS
- **ルーティング**: React Router DOM
- **HTTP通信**: Fetch API
- **その他の主要ライブラリ**:
  - `react-markdown`: Markdownレンダリング
  - `recharts`: グラフ描画
  - `papaparse`: CSV解析

## プロジェクト構造

```
src/
├── components/     # 再利用可能なUIコンポーネント
├── pages/         # ページコンポーネント
├── config/        # 設定ファイル（API設定など）
├── types/         # TypeScript型定義
└── utils/         # ユーティリティ関数
```

## 主要機能とルーティング

- `/`: ホームページ
- `/projects`: プロジェクト一覧
- `/projects/:projectId`: プロジェクト詳細
  - `/comments`: コメント一覧
  - `/analytics`: 分析結果
  - `/overall`: 全体概要
- `/csv-upload`: CSVアップロード
- `/adminauth`: 管理者認証
- `/prompt-settings`: プロンプト設定

## API連携

APIとの通信は `src/config/api.ts` で一元管理されています。主な機能：

### 認証
- 管理者キーはlocalStorageに保存され、APIリクエストヘッダーに自動的に付与されます
- `x-api-key` ヘッダーを使用した認証

### 主要なAPI機能

1. **プロジェクト管理**
   - プロジェクト取得: `getProject(projectId)`
   - プロジェクト作成: `createProjectWithCsv(data)`

2. **コメント管理**
   - コメント取得: `getComments(projectId)`
   - コメント追加: `addComment(projectId, data)`
   - 一括アップロード: `uploadCommentsBulk(projectId, comments)`

3. **分析機能**
   - 関連性チェック: `checkRelevance(projectId, topic, context?)`
   - コンテンツ抽出: `extractContent(projectId, extractionTopic, context?)`
   - 立場分析: `analyzeStance(projectId, questionText, stanceOptions, context?)`
   - プロジェクトレポート生成: `generateProjectReport(projectId)`

4. **プロンプト管理**
   - デフォルトプロンプト取得: `getDefaultPrompts()`
   - カスタムプロンプトの管理（localStorage使用）

## 開発環境のセットアップ

1. 依存関係のインストール
```bash
npm install
```

2. 環境変数の設定
- `.env.example` をコピーして `.env` を作成
- `VITE_API_URL` を適切なバックエンドURLに設定

3. 開発サーバーの起動
```bash
npm run dev
```

4. ビルド
```bash
npm run build
```

## 開発ガイドライン

1. **コンポーネント開発**
   - 再利用可能なコンポーネントは `components/` に配置
   - ページコンポーネントは `pages/` に配置
   - TypeScriptの型定義は `types/` に配置

2. **API通信**
   - 新しいAPIエンドポイントは `api.ts` に追加
   - エラーハンドリングを適切に実装
   - カスタムプロンプトの対応を考慮

3. **スタイリング**
   - TailwindCSSのユーティリティクラスを使用
   - レスポンシブデザインに対応

4. **認証**
   - 管理者機能は `isAdmin` チェックを実装
   - APIリクエストには適切な認証ヘッダーを付与

## デプロイメント

1. 本番用ビルド
```bash
npm run build
```

2. 静的ファイルの配信
- `dist/` ディレクトリ内のファイルを配信
- Nginxなどのウェブサーバーで適切に設定

## トラブルシューティング

1. **API接続エラー**
   - 環境変数 `VITE_API_URL` が正しく設定されているか確認
   - バックエンドサーバーが起動しているか確認
   - CORS設定を確認

2. **ビルドエラー**
   - `node_modules` を削除して再インストール
   - TypeScriptの型エラーを解消
   - 依存関係の競合を確認
