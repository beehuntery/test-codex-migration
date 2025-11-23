# フェーズ5: 移行とリリース計画（具体化）

## 目的
- ステージングで安定動作している Next.js + Express 構成を本番へ安全に切り替える。
- デプロイ／ロールバックを自動化し、Playwright で主要ユーザーフローを継続検証できる状態にする。

## スコープ
- 対象: `test-codex-migration`（Express + Next.js）。データストアは SQLite（Render）。
- 対象環境: Staging (`test-codex-migration-stg`), Production (`test-codex-migration-prd`).
- 非スコープ: 旧フロントの追加開発、データモデル拡張、デザイン刷新（Phase6以降）。

## 完了基準（Done）
1. 本番サービスの Start Command が `npm run start:render-safe` に固定されている。
2. Prisma マイグレーションが本番で最新適用（`20251122134157_create_tag_to_task` を含む）。
3. デプロイ手段が Render Deploy Hook で統一され、GitHub Actions `Deploy Production` が成功する。
4. Playwright E2E（主要 3 シナリオ: タスクCRUD、タグ付け、キーボード並び替え）が本番 URL でグリーン。
5. 監視ダッシュボード／アラート（Render ログ閲覧 + Uptime + Error rate）が運用ハンドブックに記載されている。
6. Go/No-Go チェックリスト（`phase5-go-no-go.md`）が更新済みで、Go 判定が取得できる。

## タイムライン（例）
- T-5d: Phase5 キックオフ、責務アサイン
- T-3d: ステージング最終リハーサル（デプロイ＋Playwright）
- T-1d: Go/No-Go 実施、フリーズ開始
- T0: 本番切替（Deploy Hook 実行 → Smoke → Playwright）
- T+1d: 監視強化期間終了、事後レビュー

## 役割
| 領域 | 担当 | バックアップ |
| --- | --- | --- |
| デプロイ実行 | Dev オーナー | SRE |
| QA（Playwright） | QA | Dev |
| 承認（Go/No-Go） | TL | PM |

## 作業項目（WBS）
- インフラ
  - 本番 Start Command を `start:render-safe` に確認/固定（Render ダッシュボード）
  - Render Deploy Hook 本番（Express/Next）鍵設定確認
- アプリ/DB
  - Prisma マイグレーション最新版確認（stg→prd）
  - Seed/JSON→SQLite 移行スクリプトの本番実行手順を決定（必要なら実行）
- CI/CD
  - GitHub Actions `Deploy Production` の入力不要化（Deploy Hook で commit pin 自動取得）
  - Playwright ジョブを本番 URL で実行できるよう環境変数/Secrets/Variables を整理
- テスト
  - スモーク: `/api/health`, `/api/tasks` GET/POST
  - E2E: タスクCRUD、タグ付け、並び替え
- 運用
  - 監視手順: Render ログ（MCP で確認）、Uptime、エラー通知
  - ロールバック手順ドキュメント更新
  - コミュニケーションプラン（Slack/Issueテンプレ）準備

## デプロイフロー（本番）
1. 前提確認
   - `RENDER_API_KEY`（GitHub Environment）設定済み
   - Deploy Hook URL
     - Express: `https://api.render.com/deploy/srv-d47mk5ndiees739g0nag?key=zl0-VCuxrWw`
     - Next.js: `https://api.render.com/deploy/srv-d47mk5ndiees739g0nag?key=gXB9pL9m7Ng`
   - Start Command: `npm run start:render-safe`
2. Deploy Production ワークフローを手動実行
   - 入力: タグ `vX.Y.Z`（SemVer）
   - ワークフロー内で `curl -X POST <hook>` を実行し commit を固定
3. デプロイ完了待ち（Render ダッシュボード）
4. スモークテスト
   - `curl -f https://test-codex-migration-prd.onrender.com/api/health`
   - `curl -f https://test-codex-migration-prd.onrender.com/api/tasks`
5. Playwright 本番ターゲットで実行（workflow_dispatch）
6. 結果共有 & Go 判定

## ロールバック
- 方針: 直前のリリースタグへ再デプロイ（Deploy Hook に `clearCache=false` で POST）。
- DB: Prisma migrate は後方互換前提。不可逆変更がある場合はダウングレード手順を別紙に記載。

## リスクと緩和
- DB スキーマ不整合: デプロイ前に `prisma migrate deploy --schema prisma/schema.prisma` を Render で実行する手順を明文化。
- Playwright 失敗（データ初期化依存）: `migrate:json` を本番では実行しない。必要データは手動投入 or 移行スクリプトで限定的に実行。
- サービス再起動でデータ初期化されるリスク: `start:render-safe` 以外を禁止、環境変数に `START_COMMAND_LOCK=start:render-safe` を記録しておく。

## 監視・アラート
- Render ログ: MCP で `list_logs` → `srv-d47e4a6r433s739f6lig`/`prd ID` を確認。
- Uptime/エラーレート: （ツール未指定）→ Phase5 期間中は手動チェックを最低 2h 間隔で実施。
- Playwright ジョブ失敗時は同時刻の Render ログをセットで添付する運用。

## データ移行方針
- 既存 JSON → SQLite は本番では原則実行しない（既存データ保持）。必要な場合は読み取り専用バックアップを取得し、`prisma db execute` で挿入する。

## コミュニケーション
- Go/No-Go: 前日 17:00 JST に実施。議事録を `phase5-go-no-go.md` に反映。
- デプロイ通知: GitHub Actions 成功/失敗を Slack #release に連携（Webhook は別設定）。

## 成果物
- 更新された Go/No-Go チェックリスト
- リリースノート（Release Drafter）
- デプロイ実行ログ（GitHub Actions + Render）

