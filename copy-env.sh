# エラー時にスクリプトを停止する & 変数が未定義の場合にエラーを出す & 実行したコマンドを表示する
# cf. https://qiita.com/yamato999/items/efb159e32fc37a9dc879
set -eux

# ルートディレクトリ
cp .env.example .env

# バックエンド
cp packages/backend/.env.example packages/backend/.env

# フロントエンド
cp packages/frontend/.env.example packages/frontend/.env