# システムアーキテクチャ（移行前後）

## 概要
移行前のレガシー構成と、移行完了後（フェーズ6完了時点）の構成を比較し、主要コンポーネントとデータフローを整理する。

## 移行前（レガシー）
- フロント: 静的 HTML/JS（`public/`）
- バックエンド: 単体 Express (`server.js`)、SQLite ファイルを直接操作
- データ: ローカル SQLite（デプロイごとにリセット）
- CI/CD: 最小限（自動テスト/デプロイほぼなし）
- 監視: なし（手動）

## 移行後（現行: フェーズ6完了）
- フロント/バックエンド: Next.js 15 App Router + Route Handlers（`apps/web`）
- Express: stg/prd とも **Suspend**（ロールバック時のみ Resume）
- データ: Render Postgres（stg DB を prod と暫定共用、Free 制約）。Prisma datasource は postgresql。
- CI/CD: GitHub Actions（lint/test/build、Playwright E2E、Release、Deploy stg/prd）、タグ v0.0.8 でリリース
- デプロイ: Render Web Service（Next stg/prd）。Start Command: `npm run start`
- 監視: Uptime（済）、Render ログ手動確認、デプロイ失敗通知 Slack、DBエラー手動フィルタ

## コンポーネント構成（現行）
- Next.js (apps/web)
  - Route Handlers: `/api/health`, `/api/tasks`, `/api/tasks/:id` (GET/PATCH/DELETE), `/api/tasks/reorder`, `/api/tags`
  - API クライアント: `NEXT_PUBLIC_API_BASE_URL` は Next 本番 URL に固定
- Express API
  - サービス自体は Suspend（ロールバック用）。実運用では使用しない。
- Prisma
  - datasource: postgresql
  - マイグレーション: `prisma/migrations`（最新 `20251203_postgres_init`）
- DB
  - Render Postgres (free, Oregon)。prod/stg 共用（暫定）。stgでの更新は禁止する運用ルール。
- CI/CD
  - `ci.yml`: lint/test/build
  - `playwright.yml`: E2E（stg/ローカル向け）
  - `deploy-staging.yml` / `deploy-production.yml`: Render Deploy Hook
  - `release.yml`: タグ・Release 作成（v0.0.8 公開済み）

## データフロー（現行）
1. ユーザ → Next.js (/tasks) → Route Handlers `/api/...`
2. Route Handlers → Prisma → Postgres (stg DB を共用)
3. デプロイ: GitHub Actions → Deploy Hook → Render Service (Next) → Start Command 実行

## 補足とリスク
- DB共用は暫定措置。stg での更新は禁止（参照のみ）。将来は本番専用 Postgres への切替が望ましい。
