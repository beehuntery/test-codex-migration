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

## タスク分解
- [x] Render Postgres (stg) プロビジョニング
  - [ ] Render Postgres (prd) プロビジョニング
- [ ] Prisma datasource を Postgres に切替（ブランチで）
- [ ] 初期マイグレーションを作成（Postgres向け）
- [ ] データ移行スクリプト（SQLite→Postgres）を作成
- [ ] stg: migrate deploy & データ移行 & スモーク
- [ ] prd: メンテ時間確保 → データ移行 → 切替 → スモーク
- [ ] ロールバック手順明文化（旧SQLiteに戻す手順）

## リスクと対策
- データ不整合: 移行前後で件数ハッシュを比較
- ダウンタイム: 本番切替は短時間メンテウィンドウを確保
- ロールバック: 切替前のSQLiteを温存し、環境変数を戻すだけで復旧できるようにする

## 補足
- Prisma のマイグレーションは SQLite と Postgres で SQL が異なるため、Postgres用マイグレーションを新規生成する。
- Playwright などテストは Postgres 環境で再実行し、ロックやトランザクションタイムアウトを確認。

## 現在のリソース
- stg: Render Postgres (free, v15, region oregon) — **available**
  - name: `test-codex-migration-stg-db`
  - id: `dpg-d4mdlojuibrs738gqn00-a`
  - dashboard: https://dashboard.render.com/d/dpg-d4mdlojuibrs738gqn00-a
  - connection strings: Renderダッシュボードに表示（`DATABASE_URL` を stg 環境に設定して使用）
