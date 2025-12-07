# フェーズ6 Go / No-Go チェックリスト

## 目的
Next.js Route Handlers への完全切替と Postgres 移行後、本番運用に進めるかを判定する。

## 判定方法
- 全チェックが ✅ なら **Go**。未完があれば **No-Go** とし、対処計画を明記して再判定。
- 判定者: TL（バックアップ: PM）。記録はこのファイルに残す。

## 前提確認
- [x] 対象コミット/デプロイ: main 最新 (`test-codex-migration-next-prd`)
- [x] 判定日時 (UTC/JST): 2025-12-07 / (入力)
- [x] 判定者: (入力)
- [x] 連絡チャネル（Slack/Issue）周知済み

## 技術条件
- [x] Next.js ルート `/api/*` が本番で 200（GET/POST/PATCH/DELETE/REORDER）
- [x] `NEXT_PUBLIC_API_BASE_URL` が Next 本番 URL を指す
- [x] Prisma datasource は Postgres に切替済み（本番サービスは stg DB を暫定利用）
- [x] マイグレーションは最新適用済み（`20251203_postgres_init`）
- [x] Playwright コアシナリオ（tag-persistence, reorder-persistence）がローカル/CIでグリーン
- [x] 本番 `/tasks` UI でタスク作成・更新・削除が成功

## 運用・リスク
- [x] 監視手順（Uptime/Renderログ/手動ログフィルタ）が Runbook に記載
- [x] ロールバック手順（Deploy Hook / DATABASE_URL 差し戻し）が Runbook に記載
- [x] 本番 Express は Suspend 済み（ロールバックで Resume 可能）
- [ ] DB 共用リスクを許容し、stg でのテスト運用を制限するルールを周知（暫定）

## データ/リリース管理
- [x] 本番デプロイ後スモーク（/api/health, /api/tasks GET/POST）成功
- [x] リリースノート草案（Release Drafter 下書き）更新
- [ ] 本番専用 Postgres は未作成（Free 制約のため）。共用継続の承認を記録

## 判定結果
- [ ] **Go** / [ ] **No-Go**
- 備考:
  - 本番 DB は stg と共用（暫定）。専用 DB 作成は今後の改善項目。
  - stg でのデータ操作は prod へ影響するため、stg テスト運用を制限するルールが必要。

