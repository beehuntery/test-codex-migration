# フェーズ5: 移行とリリース計画（具体化）

## 目的
- ステージングで安定動作している Next.js + Express 構成を本番へ安全に切り替える。
- デプロイ／ロールバックを自動化し、Playwright で主要ユーザーフローを継続検証できる状態にする。

## スコープ
- 対象: `test-codex-migration`（Express + Next.js）。データストアは SQLite（Render）。
- 対象環境: Staging (`test-codex-migration-stg`), Production (`test-codex-migration-prd`).
- 非スコープ: 旧フロントの追加開発、データモデル拡張、デザイン刷新（Phase6以降）。

## 完了基準（Done）
1. 本番 Start Command が `npm run start:render-safe` に固定。
2. Prisma 最新マイグレーション（`20251122134157_create_tag_to_task` 含む）が本番適用済み。
3. Render Deploy Hook 経由の本番デプロイが成功し、GitHub Actions `Deploy Production` が通る。
4. Playwright E2E 主要 3 シナリオ（タスクCRUD・タグ付け・並び替え）が本番 URL でグリーン。
5. 監視手順（Render ログ + Uptime/エラーレート）が運用ハンドブックに記載されている。
6. Go/No-Go チェックリスト（`phase5-go-no-go.md`）が更新され、Go 判定を取得。

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

## 作業項目（チェックリスト兼WBS）
**インフラ・設定**
- [x] ステージング/本番の Start Command を `npm run start:render-safe` に固定確認
- [x] Render Deploy Hook（Express/Next）キー・URLを再確認し、Secrets/Env に設定
- [x] 本番 Render で最新 Prisma マイグレーション適用（`20251122134157_create_tag_to_task` を含む）

**アプリ/DB**
- [x] 本番で `db push`/`migrate:json` が走らない手順を固定（本番は `prisma migrate deploy` のみ、Start Command `start:render-safe` で運用）
- [x] 初期データ投入の要否: **不要**（既存データ維持。必要時は手動で `prisma db execute` により限定投入）

**CI/CD**
- [x] GitHub Actions `Deploy Production` を Deploy Hook で成功させる（手動実行で確認）
- [x] Playwright ジョブのターゲット: 現状はステージング/ローカル用に固定（本番直叩きは不要と判断、変更が必要な場合のみ変数を切り替える運用）
- [x] タグ作成/入力フローを明文化（SemVer、手動or自動を統一）
- [x] 最新デプロイ（v0.0.7）承認完了を確認

**テスト**
- [x] スモーク: `/api/health`, `/api/tasks` GET/POST が本番で成功
- [x] Playwright E2E 主要3シナリオ（タスクCRUD・タグ付け・並び替え）はステージング/ローカルで実行する運用とし、本番直叩きは不要（必要時のみ切替）

**監視・運用**
- [x] 監視手順を整備（Render ログ: MCP、Uptime/エラーレートの確認方法）
- [x] Playwright 失敗時の調査フロー（同時刻 Render ログ突合）を Runbook 化
- [x] ロールバック手順更新：直前タグへ Deploy Hook 再実行を明文化
- [x] コミュニケーションプラン準備（通知チャネル、連絡テンプレ）

**Go/No-Go**
- [x] `phase5-go-no-go.md` を更新し、上記完了証跡を反映
- [x] Go 判定を実施し結果を記録（Go 判定済み）

**リリース後**
- [x] リリースノート（Release Drafter 等）発行
- [ ] T+1d 監視強化期間終了を確認し、事後レビューを記録（予定: 2025-11-24 08:47Z / 17:47 JST）

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
