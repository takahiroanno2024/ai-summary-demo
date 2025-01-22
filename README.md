# ai-summary-demo

## 開発環境のセットアップ

### 開発モード（ホットリロード対応）

開発時は以下のコマンドを使用します。ソースコードの変更が自動的に反映されます：

```bash
docker-compose -f docker-compose.dev.yml up --build
```

- フロントエンド: http://localhost:3000
- バックエンド: http://localhost:3001

開発モードでは：
- フロントエンド: Viteの開発サーバーを使用し、変更時に自動的にリロードされます
- バックエンド: ts-node-devを使用し、TypeScriptファイルの変更を監視・自動コンパイルします
- ソースコードはDockerボリュームを通じてコンテナと同期されます

### プロダクションモード

本番環境用のビルドと実行：

```bash
docker-compose up --build
```

プロダクションモードでは：
- フロントエンド: 最適化されたビルドをNginxで配信
- バックエンド: TypeScriptがコンパイルされ、最適化されたJavaScriptを実行
- 静的ファイルとアプリケーションコードが最適化されます

## プロジェクト構成

```
.
├── docker-compose.yml      # 本番環境用の構成
├── docker-compose.dev.yml  # 開発環境用の構成
├── packages/
    ├── frontend/          # Reactフロントエンド
    │   ├── Dockerfile     # 本番用ビルド
    │   └── Dockerfile.dev # 開発用ビルド
    └── backend/           # Expressバックエンド
        ├── Dockerfile     # 本番用ビルド
        └── Dockerfile.dev # 開発用ビルド
