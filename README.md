# このプロジェクトについて
- オンライン上の政策熟議PFを構築する「いどばたPJ」のリポジトリです。
    - PJ全体の意義・意図は[こちらのスライド](https://docs.google.com/presentation/d/1etZjpfj9v59NW5REC4bOv4QwVq_ApZMFDMQZqPDHb8Q/edit#slide=id.g339b8863127_0_989)のP20からP50を参照ください。
- 本PJは、以下に示す複数のモジュールで構築されています
    - [idobata-agent](https://github.com/takahiroanno2024/idobata-agent/) (フォーラムの投稿に反応し、モデレーションを行うモジュール)
    - [idobata-analyst](https://github.com/takahiroanno2024/idobata-analyst/)（フォーラムやSNSの投稿を分析し、レポートを作成するモジュール）
    - [idobata-infra](https://github.com/takahiroanno2024/idobata-infra/)（フォーラムのインフラを構築する設定）
    - [idobata-sns-agent](https://github.com/takahiroanno2024/idobata-sns-agent/)（SNSの投稿を収集したり、投稿を行うためのモジュール）

## 開発への参加方法について

- 本PJは、開発者の方からのコントリビュートを募集しています！ぜひ一緒に日本のデジタル民主主義を進めましょう！
- プロジェクトのタスクは[GitHub Project](https://github.com/orgs/takahiroanno2024/projects/4)で管理されています。
    - [good first issueタグ](https://github.com/orgs/takahiroanno2024/projects/4/views/1?filterQuery=good+first+issue)がついたIssueは特に取り組みやすくなっています！
- プロジェクトについてのやりとりは、原則[デジタル民主主義2030のSlackの「開発_いどばた」チャンネル](https://w1740803485-clv347541.slack.com/archives/C08FF5MM59C)までお願いします
- コントリビュートにあたっては、本リポジトリのrootディレクトリにあるCLA.md（コントリビューターライセンス）へ同意が必要です。
    - PRのテンプレートに従ってください



# 論点整理モジュール

## セットアップと実行方法

### 1. 環境変数の設定

各ディレクトリの `.env.example` ファイルを `.env` にコピーして必要な環境変数を設定します：


lll
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
