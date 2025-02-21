# フロントエンド アーキテクチャドキュメント

## 1. アプリケーション構造

### 1.1 主要なディレクトリ構成
```
src/
├── components/     # 再利用可能なUIコンポーネント
├── pages/         # ページコンポーネント
├── types/         # TypeScript型定義
├── config/        # 設定ファイル
└── utils/         # ユーティリティ関数
```

### 1.2 ルーティング構造
- `/` - ホームページ
- `/projects` - プロジェクト一覧
- `/projects/:projectId` - プロジェクト詳細
  - `/comments` - コメント一覧
  - `/analytics` - 分析結果
  - `/overall` - 全体概要
  - `/chat` - チャット
- `/csv-upload` - CSVアップロード
- `/adminauth` - 管理者認証

## 2. データモデル

### 2.1 Project（プロジェクト）
```typescript
interface Project {
  _id: string;
  name: string;
  description?: string;
  extractionTopic?: string;
  questions: Question[];
  createdAt: string;
  commentCount: number;
}
```

### 2.2 Comment（コメント）
```typescript
interface Comment {
  _id: string;
  content: string;
  projectId: string;
  extractedContent?: string;
  stances: CommentStance[];
  createdAt: string;
  sourceType?: CommentSourceType;
  sourceUrl?: string;
}
```

### 2.3 Question & Stance（質問と立場）
```typescript
interface Question {
  id: string;
  text: string;
  stances: Stance[];
}

interface Stance {
  id: string;
  name: string;
}
```

## 3. データフロー

### 3.1 APIとの通信
- バックエンドAPIとの通信は `src/config/api.ts` で集中管理
- APIエンドポイントは動的に生成（`http://${host}:3001/api`）
- 認証はヘッダーの `x-api-key` で管理

### 3.2 状態管理フロー
1. ページコンポーネントでデータをフェッチ
2. 取得したデータを状態（state）として保持
3. 子コンポーネントにpropsとして渡す
4. データ更新時はページコンポーネントで再フェッチ

### 3.3 典型的なデータフロー例（プロジェクト一覧）
1. `ProjectListPage` がマウント時にプロジェクト一覧を取得
2. データを `projects` 状態として保持
3. `ProjectList` コンポーネントに渡して表示
4. 新規作成/編集は `ProjectForm` で行い、送信後に一覧を再取得

## 4. 認証システム

### 4.1 管理者認証
- LocalStorageの `adminKey` でアクセス制御
- API リクエスト時に `x-api-key` ヘッダーとして送信
- 認証状態の変更を `storage` イベントで監視

### 4.2 認証フロー
1. 管理者ページアクセス時に `adminKey` の存在確認
2. 未認証の場合はホームページにリダイレクト
3. APIリクエスト時に自動的にヘッダーに認証情報を付加

## 5. コンポーネント構造

### 5.1 ページコンポーネント
- `HomePage` - アプリケーションのエントリーポイント
- `ProjectListPage` - プロジェクト一覧と管理
- `ProjectPage` - プロジェクト詳細と分析
- `CsvUploadPage` - データインポート
- `AdminAuthPage` - 管理者認証

### 5.2 再利用可能なコンポーネント
- `ProjectList` - プロジェクト一覧表示
- `ProjectForm` - プロジェクト作成/編集フォーム
- `CommentList` - コメント一覧表示
- `CommentForm` - コメント投稿フォーム
- `ProjectAnalytics` - 分析結果表示
- `ChatRoom` - チャットインターフェース

## 6. エラーハンドリング

### 6.1 API通信エラー
- 各APIコールでtry-catch処理
- エラーメッセージを状態として保持
- ユーザーフレンドリーなエラー表示

### 6.2 認証エラー
- 認証切れの場合はホームページにリダイレクト
- LocalStorageの変更を監視して即時反映

## 7. 拡張性と保守性

### 7.1 型安全性
- TypeScriptによる型定義
- APIレスポンスの型定義
- コンポーネントpropsの型定義

### 7.2 コードの再利用性
- 共通コンポーネントの分離
- ユーティリティ関数の集中管理
- API通信の抽象化