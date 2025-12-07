# Postgres 移行計画（ドラフト）

## ゴール
- Render Postgres に移行し、本番 `DATABASE_URL` を Postgres に切替。データリセットやSQLiteロックを解消する。

## フェーズ
1. 準備（dev環境）
   - Render Postgres をプロビジョニング（stg/prd用に2インスタンス想定）
   - 環境変数を追加：`DATABASE_URL`（Postgres）、`PRISMA_SCHEMA_ENGINE_BINARY` 不要
   - Prisma スキーマの datasource を Postgres に切替し、`prisma migrate dev` で初期マイグレーション生成

2. ステージング移行
   - `DATABASE_URL` を stg 環境で Postgres に設定
   - マイグレーション適用: `prisma migrate deploy`
   - データ移行（SQLite → Postgres）: jsonToSqlite と同等のロジックで Postgres に書き込むスクリプトを作成
   - Playwright / API スモークで回帰確認

3. 本番移行
   - メンテナンス時間を確保し、SQLite を凍結（デプロイ停止）
   - SQLite データを Postgres へ移送
   - 本番 `DATABASE_URL` を Postgres に切替しデプロイ
   - スモーク（/api/health, /api/tasks, Playwright短縮版）
   - 必要に応じて旧SQLiteへリバートするロールバック手順を用意

## タスク分解（進捗付き）
- [x] Render Postgres (stg) プロビジョニング  
  - name: `test-codex-migration-stg-db` (free, v15, Oregon)
- [ ] Render Postgres (prd) プロビジョニング（現在 stg DB を暫定共用中。専用DBを後日作成）
- [x] Prisma datasource を Postgres に切替（main 反映済）
- [x] 初期マイグレーションを作成（Postgres向け）: `20251203_postgres_init`
- [x] データ移行スクリプト（SQLite→Postgres）: `npm run import:pg` (`src/scripts/importToPostgres.ts`)
- [x] stg: migrate deploy & データ移行 & スモーク
- [ ] prd: メンテ時間確保 → **専用DB作成** → migrate deploy → （必要なら）データ移行 → スモーク
- [ ] ロールバック手順明文化（旧SQLiteに戻す手順／前タグDeployHookで戻す手順）

## リスクと対策
- データ不整合: 移行前後で件数ハッシュを比較
- ダウンタイム: 本番切替は短時間メンテウィンドウを確保
- ロールバック: 切替前のSQLiteを温存し、環境変数を戻すだけで復旧できるようにする
- **DB共用リスク（暫定運用）**: 現在 prod/stg が同一 DB。stg でのテストデータが prod に混入するため、stg での更新系操作は禁止・読み取りのみとする暫定ルールを Runbook/Slack で周知すること。

## 直近で実施した stg/prd 手順（ログ用）
1. 失敗状態のマイグレーションを `migrate resolve --applied 20251203_postgres_init` で適用済みにマーク  
2. `npx prisma db push --schema prisma/schema.prisma` でスキーマ同期  
3. Render stg / prd (Next) を再デプロイ → stg 成功、本番は stg DB を参照する形で動作確認  
4. 必要に応じ `npm run import:pg` で JSON データ投入（本番では未実施）

## prd 移行の提案フロー（改訂：専用DB前提）
1) prd 用 Postgres を Render でプロビジョニング（Starter+推奨。Free枠共用は暫定のみ）  
2) `.env.production` / Render Environment に `DATABASE_URL` を **prd専用DB** で設定  
3) メンテ時間内に以下を実行  
   - `npx prisma migrate deploy --schema prisma/schema.prisma`  
   - （必要なら）`npm run import:pg` でデータ投入  
4) デプロイ → `/api/health` `/api/tasks` スモーク → 短縮版 Playwright  
5) ロールバック: DeployHook で前タグを再デプロイ（`scripts/rollback.sh <service_id> <hook> <tag>`） または `DATABASE_URL` を旧DBに戻す

## 補足
- Prisma のマイグレーションは SQLite と Postgres で SQL が異なるため、Postgres用マイグレーションを新規生成する。
- Playwright などテストは Postgres 環境で再実行し、ロックやトランザクションタイムアウトを確認。

## 現在のリソース
- stg: Render Postgres (free, v15, region oregon) — **available**
  - name: `test-codex-migration-stg-db`
  - id: `dpg-d4mdlojuibrs738gqn00-a`
  - dashboard: https://dashboard.render.com/d/dpg-d4mdlojuibrs738gqn00-a
  - connection strings: Renderダッシュボードに表示（`DATABASE_URL` を stg 環境に設定して使用）
