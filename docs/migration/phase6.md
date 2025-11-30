# フェーズ6: フォローアップ

## 目的
- API を Next.js Route Handlers に統合して Express を段階的に廃止し、運用をシンプルにする。
- データストアを SQLite から Render Postgres へ移行し、デプロイによるデータリセット問題を解消する。
- 監視・ロールバック・テストを整備し、リリース後の安定運用を強化する。

## スコープ
- API統合: `/api/tasks`, `/api/tags`, `/api/health` を Next.js Route Handlers へ移行し、Express サービスを停止。
- データ永続化: Render Postgres への移行（スキーマ移行・データ移送・切替手順含む）。
- 運用改善: 監視/通知の定常運用、ロールバックの自動化。
- QA/UX: 追加Playwrightシナリオと軽微UI改善。

## 完了基準 (Done)
1. API が Next.js Route Handlers に統合され、Express サービスは停止または不要化。
2. Render Postgres へ移行し、本番 `DATABASE_URL` が Postgres を指し、データ永続化が機能している。
3. 監視/通知が定常運用（アラートルール、当番、Runbook）として回っている。
4. Playwright 追加シナリオ（コアフロー）を整備し、リリース前チェックに組み込まれている。
5. ロールバック手順が自動化（Deploy Hook再実行/前タグ再デプロイがワンコマンド化）。
6. 軽微UX改善（P1まで）がクローズ。

## WBS（チェックリスト）
**API統合（Express → Next.js Route Handlers）**
- [x] `/api/health` を Route Handlers に移設
- [x] `/api/tasks`, `/api/tags`, `/api/tasks/reorder` を段階移行（stg リハーサル済）
- [x] `/api/tasks/:taskId` (GET/PATCH/DELETE) を Next に実装
- [x] CORS/ENV: stg/prd で `NEXT_PUBLIC_API_BASE_URL` を Next ドメインに設定（同一オリジン化）。Playwright 用は repo variable `PLAYWRIGHT_API_BASE_URL` で上書き可。
- [ ] Express サービス停止（ロールバック経路を残したまま）

**データ永続化（Postgres）**
- [ ] Render Postgres をプロビジョニング（stg/prd）
- [ ] Prisma datasource 切替・マイグレーション検証（dev→stg→prd）
- [ ] SQLite→Postgres データ移行スクリプト作成 & リハーサル
- [ ] 本番切替とロールバック手順（再デプロイ/前スナップショット復元）を検証
- [ ] Runbook 整備（`docs/operations/postgres-migration.md`）

**監視・運用**
- [x] 監視ルール（Uptime、HTTP 5xx/latency、DB接続エラー）を定義・通知先設定・当番表作成（文書化）
- [x] ロールバック自動化スクリプト（前タグ Deploy Hook 再実行）を素案作成（scripts/rollback.sh）
- [x] Runbook 更新（監視、ロールバック、API統合後の手順）→ `docs/operations/monitoring-runbook.md`
- [ ] 定期監視は実施せず手動確認運用で合意（必要なら将来拡張）

監視・運用の詳細は `docs/operations/monitoring-runbook.md` に分離。ここでは完了チェックのみ管理する。

### 通知先（案）
- Slack: #alerts (Critical), #alerts-warn (Warning)
- 当番: 平日日中 Primary/Secondary、夜間はONCALLローテ（別表定義）

### ロールバック自動化（案）
- 前回リリースタグの Deploy Hook を再実行するスクリプト `scripts/rollback.sh`
  - 入力: SERVICE_ID / DEPLOY_HOOK_KEY / TAG
  - 手順: curl で deploy hook 実行→ステータスpoll→完了報告
- stg で演習し、prdでは手順書に従い承認後実行

### Runbook 更新対象（案）
- 監視検知→一次対応フロー（誰が・どこに・何分以内）
- ロールバック手順（Deploy Hook再実行、前タグ再デプロイ）
- Next API統合後のヘルスチェック・Playwright手動実行手順

**QA/UX 改善**
- [x] Playwright 追加シナリオを実装し、リリース前チェックに組み込み
  - [x] タグ追加/削除の永続確認（再読み込み後も反映）
  - [x] 複合フィルタ＋並び替えの永続確認（キーボード並び替え永続シナリオで代替）
  - [x] 通知UX（完了トースト、フォーカス戻し）の回帰
- [ ] 軽微UI改善バックログ（P1まで）をクローズ
  - [x] typedRoutes 警告の解消（`experimental.typedRoutes` → `typedRoutes`）
  - [x] トーストのアクセシビリティ改善（aria-label/ESC閉じる/状態アイコン）
  - [x] 並び替えヘルプの常時表示と aria-describedby
  - [x] ローディング・空状態の明示（スケルトン＆0件メッセージ＋作成誘導）
  - [x] タグ削除の操作フィードバック（成功/失敗トースト追加）

**ドキュメント/リリース**
- [ ] Phase6 Go/No-Go チェックリスト作成
- [ ] リリースノート運用を継続（Release Drafter + 公開リリース）

## リスクとメモ
- DB移行: ダウンタイム/整合性リスク。バックアップとロールバック手順を必須化。
- API統合: 切替中は CORS/環境変数差異に注意。段階的リリースとロールバック経路を保持。
- Playwright本番実行は要検討（コストと負荷）。
