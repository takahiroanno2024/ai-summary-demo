# 論点整理モジュール

## セットアップと実行方法

### 1. 環境変数の設定

各ディレクトリの `.env.example` ファイルを `.env` にコピーして必要な環境変数を設定します：

```bash
# ルートディレクトリ
cp .env.example .env

# バックエンド
cp packages/backend/.env.example packages/backend/.env

# フロントエンド
cp packages/frontend/.env.example packages/frontend/.env
```

### 2. アプリケーションの起動

以下のコマンドでアプリケーションを起動します：

```bash
docker-compose up --build
```

- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:3001

## プロジェクト構成

```
.
├── docker-compose.yml      # Docker構成ファイル
├── packages/
    ├── frontend/          # Reactフロントエンド
    │   └── Dockerfile     # フロントエンドのビルド設定
    └── backend/           # Expressバックエンド
        └── Dockerfile     # バックエンドのビルド設定

