# Next.js Route Handlers への切替手順（Express → Next）

## 目的
stg/prd で API を Express から Next.js Route Handlers に切り替え、最終的に Express サービスを停止する。

## 前提
- Next.js 側に `/api/health`, `/api/tasks`, `/api/tags`, `/api/tasks/reorder` が実装済み（main 最新）。
- Deploy Hook で Next.js/Express 双方をデプロイ可能。
- 環境変数の更新権限あり（GitHub Environments / Render）。

## 環境変数/設定
- Render stg/prd (Next.js サービス): `NEXT_PUBLIC_API_BASE_URL` を空または Next.js サービス URL に設定（同一オリジン化）。
- GitHub Actions (Playwright/ビルド): `PLAYWRIGHT_API_BASE_URL` / `STAGING_API_BASE_URL` はテスト用上書きであり、本番稼働時は Render 側設定を使う。
- Express サービス: Start Command `npm run start:render-safe`（切替完了後は停止予定）。

## 手順（stg → prd）
1. **stgで切替リハーサル**
   - stg Environment で `NEXT_PUBLIC_API_BASE_URL` を **Next.js サービスURL（フロントURLと同一ドメイン）** に設定（空でも可）。
   - Deploy Staging を実行。
   - 確認は **Next.js サービスの URL**（例: `https://<next-stg-domain>/api/tasks` か、同一オリジンの場合はフロントURL `/api/tasks`）で行う。Express のドメインは叩かない。
   - Playwright（stg向け）を実行し回帰確認。
   - ロールバック確認: `NEXT_PUBLIC_API_BASE_URL` を元に戻し Deploy Staging を再実行して復旧できること。

2. **本番切替**
   - production Environment の `NEXT_PUBLIC_API_BASE_URL` を Next.js サービスURL（同一オリジン）に設定。
   - Deploy Production（最新タグ）を実行。
   - スモーク: `/api/health`, `/api/tasks`, `/api/tags` が 200 を返すこと。
   - 必要なら本番 Playwright を実行（方針に従う）。

3. **Express 停止（任意タイミング）**
   - Render prd/stg の Express サービスを Stop もしくは Start Command を no-op に変更。
   - ロールバック用に Deploy Hook / Start Command をメモしておく。

## ロールバック
- `NEXT_PUBLIC_API_BASE_URL` を元の Express URL に戻し、Deploy Hook で再デプロイ。
- Express サービスを再起動（Stop→Start）。
- 必要なら前タグに Deploy Production を実行。

## 検証チェックリスト
- [ ] stg: 切替後に `/api/tasks` が Next.js で 200 応答
- [ ] stg: ロールバックして Express で 200 応答
- [ ] prd: 切替後にスモーク OK
- [ ] prd: ロールバック手順を手元 Runbook で確認
