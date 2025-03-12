# バックエンドAPI仕様書

## 概要
このAPIは、プロジェクト管理、コメント管理、分析レポート生成機能を提供するRESTful APIです。

## 認証
全てのAPIエンドポイントは認証システムによって保護されています。認証は`/api`パス以下の全てのルートに適用されます。

### 認証方法
- リクエストヘッダーに`x-api-key`を付与する必要があります
- Admin APIキーは環境変数`ADMIN_API_KEY`で設定された値と一致する必要があります

### アクセス権限
APIは2つのアクセスレベルを提供します:

1. 一般アクセス(パブリックエンドポイント)
   - APIキー不要
   - 読み取り専用の操作のみ可能
   
2. Admin アクセス
   - 有効なAdmin APIキーが必要
   - 全てのエンドポイントにアクセス可能
   - データの作成・更新・削除が可能

### パブリックエンドポイント
以下のエンドポイントは一般アクセス(APIキー不要)で利用可能です:

- `GET /projects/:projectId` - 特定のプロジェクトの取得
- `GET /projects/:projectId/comments` - プロジェクトのコメント一覧の取得
- `GET /projects/:projectId/questions/:questionId/stance-analysis` - 立場分析レポートの取得(再生成オプション無効時のみ)
- `GET /projects/:projectId/analysis` - プロジェクト全体の分析レポートの取得(再生成オプション無効時のみ)

### Admin権限が必要なエンドポイント
以下の操作にはAdmin APIキーが必要です:

- プロジェクト一覧の取得 (`GET /projects`)
- プロジェクトの作成・更新
- コメントの追加・一括インポート
- 分析レポートの強制再生成(forceRegenerate=true)
- 埋め込みデータの操作

## ベースURL
```
http://localhost:3001/api
```

## エンドポイント一覧

### プロジェクト管理 API

#### プロジェクト一覧の取得
```
GET /projects
```
- 説明: 全てのプロジェクトを取得します
- 認証: Admin必須
- リクエストヘッダー: `x-api-key: <ADMIN_API_KEY>`
- レスポンス: プロジェクトの配列

#### プロジェクトの作成
```
POST /projects
```
- 説明: 新しいプロジェクトを作成します
- 認証: Admin必須
- リクエストヘッダー: `x-api-key: <ADMIN_API_KEY>`
- リクエストボディ:
  ```json
  {
    "name": "プロジェクト名",
    "description": "プロジェクトの説明",
    "extractionTopic": "抽出トピック"
  }
  ```
- レスポンス: 作成されたプロジェクト情報

#### プロジェクトの取得
```
GET /projects/:projectId
```
- 説明: 指定されたIDのプロジェクトを取得します
- 認証: 不要
- パラメータ: projectId (MongoDB ObjectId)
- レスポンス: プロジェクト情報

#### プロジェクトの更新
```
PUT /projects/:projectId
```
- 説明: 指定されたプロジェクトを更新します
- 認証: Admin必須
- リクエストヘッダー: `x-api-key: <ADMIN_API_KEY>`
- パラメータ: projectId (MongoDB ObjectId)
- リクエストボディ:
  ```json
  {
    "name": "プロジェクト名",
    "description": "プロジェクトの説明",
    "extractionTopic": "抽出トピック",
    "questions": ["論点1", "論点2"]
  }
  ```
- レスポンス: 更新されたプロジェクト情報

#### プロジェクトの論点自動生成
```
POST /projects/:projectId/generate-questions
```
- 説明: プロジェクトの内容に基づいて論点を自動生成します
- 認証: Admin必須
- リクエストヘッダー: `x-api-key: <ADMIN_API_KEY>`
- パラメータ: projectId (MongoDB ObjectId)
- レスポンス: 更新されたプロジェクト情報(生成された論点を含む)

### コメント管理 API

#### プロジェクトのコメント一覧取得
```
GET /projects/:projectId/comments
```
- 説明: 指定されたプロジェクトの全コメントを取得します
- 認証: 不要
- パラメータ: projectId (MongoDB ObjectId)
- レスポンス: コメントの配列

#### コメントの追加
```
POST /projects/:projectId/comments
```
- 説明: プロジェクトに新しいコメントを追加します
- 認証: Admin必須
- リクエストヘッダー: `x-api-key: <ADMIN_API_KEY>`
- パラメータ: projectId (MongoDB ObjectId)
- リクエストボディ:
  ```json
  {
    "content": "コメント内容",
    "sourceType": "コメントのソースタイプ",
    "sourceUrl": "コメントのソースURL",
    "skipDuplicates": true
  }
  ```
  注: `skipDuplicates`パラメータはオプションで、デフォルトは`true`です。`true`の場合、同じ内容のコメントが既に存在する場合は追加されません。
- レスポンス:
  ```json
  {
    "comments": [
      {
        "content": "コメント内容",
        "projectId": "プロジェクトID",
        "extractedContent": "抽出されたコンテンツ1",
        "stances": [
          {
            "questionId": "論点ID",
            "stanceId": "立場ID",
            "confidence": 0.95
          }
        ],
        "sourceType": "コメントのソースタイプ",
        "sourceUrl": "コメントのソースURL"
      },
      {
        "content": "コメント内容",
        "projectId": "プロジェクトID",
        "extractedContent": "抽出されたコンテンツ2",
        "stances": [
          {
            "questionId": "論点ID",
            "stanceId": "立場ID",
            "confidence": 0.90
          }
        ],
        "sourceType": "コメントのソースタイプ",
        "sourceUrl": "コメントのソースURL"
      }
    ]
  }
  ```
  
  注: 一つのコメント内容から複数の主張が抽出された場合、それぞれの主張が別々のコメントとして作成されます。

#### コメントの一括インポート
```
POST /projects/:projectId/comments/bulk
```
- 説明: 複数のコメントを一括でインポートします
- 認証: Admin必須
- リクエストヘッダー: `x-api-key: <ADMIN_API_KEY>`
- パラメータ: projectId (MongoDB ObjectId)
- リクエストボディ:
  ```json
  {
    "comments": [
      {
        "content": "コメント内容1",
        "sourceType": "ソースタイプ1",
        "sourceUrl": "ソースURL1"
      },
      {
        "content": "コメント内容2",
        "sourceType": "ソースタイプ2",
        "sourceUrl": "ソースURL2"
      }
    ],
    "skipDuplicates": true
  }
  ```
  注: `skipDuplicates`パラメータはオプションで、デフォルトは`true`です。`true`の場合、同じ内容のコメントが既に存在する場合は追加されません。
- レスポンス: インポートされたコメントの配列

### 分析レポート API

#### 論点ごとの立場分析レポート
```
GET /projects/:projectId/questions/:questionId/stance-analysis
```
- 説明: 特定の論点に対するコメントの立場分析レポートを取得します
- 認証:
  - 基本取得: 不要
  - 強制再生成: Admin必須
- パラメータ:
  - projectId (MongoDB ObjectId)
  - questionId (string)
  - forceRegenerate (query, boolean, optional): 強制的に再分析を行うかどうか
  - customPrompt (query, string, optional): カスタム分析プロンプト
- レスポンス: 立場分析レポート（JSON形式）

#### プロジェクト全体の分析レポート
```
GET /projects/:projectId/analysis
```
- 説明: プロジェクト全体の包括的な分析レポートを生成します
- 認証:
  - 基本取得: 不要
  - 強制再生成: Admin必須
- パラメータ:
  - projectId (MongoDB ObjectId)
  - forceRegenerate (query, boolean, optional): 強制的に再分析を行うかどうか
  - customPrompt (query, string, optional): カスタム分析プロンプト
- レスポンス: プロジェクト分析レポート（JSON形式）

#### プロジェクトデータのCSVエクスポート
```
GET /projects/:projectId/export-csv
```
- 説明: プロジェクトの分析データをCSV形式でエクスポートします
- 認証: Admin必須
- リクエストヘッダー: `x-api-key: <ADMIN_API_KEY>`
- パラメータ: projectId (MongoDB ObjectId)
- レスポンス:
  - Content-Type: text/csv
  - Content-Disposition: attachment; filename=project-[projectId]-export.csv
  - ボディ: CSVデータ

### プロンプト管理 API

#### デフォルトプロンプトの取得
```
GET /prompts/default
```
- 説明: システムで使用される各種デフォルトプロンプトを取得します
- 認証: Admin必須
- リクエストヘッダー: `x-api-key: <ADMIN_API_KEY>`
- レスポンス:
  ```json
  {
    "stanceAnalysis": "立場分析用プロンプト",
    "contentExtraction": "内容抽出用プロンプト",
    "questionGeneration": "質問生成用プロンプト",
    "relevanceCheck": "関連性チェック用プロンプト",
    "stanceReport": "立場レポート生成用プロンプト",
    "projectReport": "プロジェクトレポート生成用プロンプト"
  }
  ```

## エラーレスポンス
エラーが発生した場合、以下の形式でレスポンスが返されます:
```json
{
  "error": {
    "message": "エラーメッセージ",
    "code": "エラーコード"
  }
}
```

### 認証エラー
認証が必要なエンドポイントに無効なAPIキーでアクセスした場合:
```json
{
  "error": {
    "message": "Admin privileges required",
    "code": 403
  }
}