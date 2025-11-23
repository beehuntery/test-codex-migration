# システムアーキテクチャ（移行前後）

## 概要
移行前のレガシー構成と、移行後（フェーズ5完了時点）の構成を比較し、主要コンポーネントとデータフローを整理する。

## 移行前（レガシー）
- フロント: 静的 HTML/JS（`public/`）
- バックエンド: 単体 Express (`server.js`)、SQLite ファイルを直接操作
- データ: ローカル SQLite（デプロイごとにリセット）
- CI/CD: 最小限（自動テスト/デプロイほぼなし）
- 監視: なし（手動）

## 移行後（現行: フェーズ5完了）
- フロント: Next.js 15 App Router（`apps/web`）
- バックエンド: Express + Prisma（`src/server` → `dist/server`）
- データ: SQLite（Render ローカルファイル）※フェーズ6で Postgres へ永続化予定
- CI/CD: GitHub Actions（lint/test/build、Playwright E2E、Release、Deploy stg/prd）
- デプロイ: Render Web Service（stg/prd）、Deploy Hook で commit pin デプロイ、Start Command `npm run start:render-safe`
- 監視: Render ログ（MCP経由で確認）、簡易 Uptime/エラーレート（手動）

## コンポーネント構成（移行後）
- Next.js (apps/web)
  - API クライアント: `NEXT_PUBLIC_API_BASE_URL` で Express API を呼び出し
- Express API
  - ルート: `/api/tasks`, `/api/tags`, `/api/health`
  - データアクセス: Prisma -> SQLite/Postgres(予定)
- Prisma
  - マイグレーション: `prisma/migrations`（最新 `20251122134157_create_tag_to_task`）
- CI/CD
  - `ci.yml`: lint/test/build
  - `playwright.yml`: E2E（stg/ローカル向け）
  - `deploy-staging.yml` / `deploy-production.yml`: Render Deploy Hook
  - `release.yml`: タグ・Release作成（公開）

## データフロー（移行後）
1. ユーザ → Next.js → Express API (`/api/...`)
2. Express → Prisma → DB（SQLite → フェーズ6で Postgres 予定）
3. デプロイ: GitHub Actions → Deploy Hook → Render Service → Start Command 実行

## フェーズ6への課題
- データ永続化（Postgres）
- 監視/通知の定常運用強化
- 追加E2Eシナリオ（必要に応じ本番URL対応）
- ロールバックの自動化
