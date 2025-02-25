# Chat Bot System

プロジェクト固有のチャットボットを提供するWebSocketベースのチャットシステム。

## 機能

- プロジェクトごとの独立したチャットボット
- WebSocketを使用したリアルタイム通信
- セッション管理とチャット履歴の保持
- 自動クリーンアップ機能

## 技術スタック

- Node.js
- TypeScript
- Express
- WebSocket (ws)
- Docker

## セットアップ

### 開発環境

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### Docker環境

```bash
# 開発環境での起動
docker-compose up chat-bot

# 本番環境用ビルド
docker build -t chat-bot .
```

## 使用方法

### WebSocket接続

エンドポイント: `ws://localhost:3030/project/:projectId/chat`

`:projectId`は各プロジェクトの固有IDに置き換えてください。

### メッセージフォーマット

#### 送信メッセージ
```json
{
  "type": "message",
  "content": "こんにちは"
}
```

#### 受信メッセージ
```json
{
  "type": "message",
  "message": {
    "id": "uuid",
    "content": "こんにちは",
    "timestamp": "2024-02-23T...",
    "sender": "bot"
  }
}
```

### エラーレスポンス
```json
{
  "error": "エラーメッセージ"
}
```

## セッション管理

- 各WebSocket接続に対して一意のセッションが作成されます
- セッションは30分間保持され、その後自動的にクリーンアップされます
- セッション中のすべてのメッセージはメモリ内に保持されます

## 開発ガイド

### プロジェクト構造

```
src/
  ├── index.ts          # メインサーバーファイル
  ├── types.ts          # 型定義
  └── services/
      └── SessionManager.ts  # セッション管理
```

### ビルドとデプロイ

1. TypeScriptのビルド
```bash
npm run build
```

2. 本番環境での実行
```bash
npm start
```

### 環境変数

- `PORT`: サーバーポート（デフォルト: 3030）

## 今後の拡張予定

- メッセージ永続化
- プロジェクト固有の設定
- より高度な会話機能
- セキュリティ強化（認証・認可）