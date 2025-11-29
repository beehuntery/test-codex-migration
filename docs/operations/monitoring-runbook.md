# 監視・運用 Runbook

本ドキュメントは Next.js/Express（退役予定）サービスの監視と運用フローをまとめる。UptimeRobot による外形監視は **設定済み** を前提とし、残りの監視・通知・手順を補完する。

## 対象コンポーネント
- Next.js Web/API（stg/prd）: `https://test-codex-migration-next-<env>.onrender.com`
- Express（暫定）: `https://test-codex-migration-<env>.onrender.com` ※退役予定
- Render デプロイジョブ
- DB: Prisma/SQLite → 将来 Postgres

## シグナルと閾値（提案）
- HTTP 5xx rate: 5分窓で ≥1% or >10件 → Warn / ≥5% or >30件 → Critical
- Latency p95: 60s窓で >2s → Warn / >4s → Critical
- DB 接続エラー: Prisma P1001/P1002 が 5分で >3件 → Warn
- Deploy 失敗: Render deploy status=failed で Critical
- End-to-end 動作: デプロイ後に Playwright smoke を手動/自動で実行

## 通知チャネル（案）
- Slack: `#alerts-warn`（Warning）, `#alerts`（Critical）

### Render → Slack 通知設定手順（Deploy失敗など）
1. Slackで Incoming Webhook を作成（`#alerts` 推奨）。Webhook URL を控える。
2. Render ダッシュボード → Service → Notifications → "Add Destination" → "Slack/Webhook" を選択。
3. Webhook URL を貼り付け、イベントとして "Deploy Failed" を選択（必要に応じて Deploy Succeeded も）。
4. 保存してテスト送信を実施。Slack側でメッセージ受信を確認。
※ 既に設定済みの場合はこの節は参照のみ。

## 実装方針
### 1) HTTP 5xx / Latency
- 代替案: デプロイ後に Playwright smoke（既存 E2E の一部を短縮版で）を実行し、失敗時に Slack へ通知。
- もしログ集約（Datadog / LogDNA 等）を導入できる場合は、Render のログエクスポートを設定し上記閾値でモニタを作成。

### 2) DB 接続エラー
- Render logs を対象に P1001/P1002 をフィルタし、連続検出時に通知。
- 手動チェック用ワンライナー（例）:
  ```bash
  # 直近10分の P1001/P1002 を Render logs API で取得（TOKEN には Render API Key を設定）
  TOKEN=$RENDER_API_KEY
  SERVICE=srv-d47ga4ndiees739bm360  # stg Next サービスID
  curl -sS "https://api.render.com/v1/services/$SERVICE/logs?limit=200" \
    -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.message|test("P1001|P1002"))'
  ```
- 将来的にはログ集約先で正規表現フィルタ＋アラートを設定。

### 3) デプロイ失敗
- Render の Webhook を Slack Incoming Webhook に接続。イベント: deploy failed -> `#alerts`。
- 代替: GitHub Actions の Deploy job 失敗を `actions/github-script` で Slack 通知。

### 4) Playwright smoke（デプロイ後検証）
- ワークフロー: `playwright.yml` を `workflow_dispatch` で走らせ、ターゲットURLをステージングに固定。失敗時に Slack 通知。
- 将来的に Deploy Production 後に短縮スモーク（ヘルスチェック＋タスク作成/削除）を自動実行する軽量ワークフローを追加。

## 運用フロー（インシデント）
1. アラート受信（Slack #alerts / #alerts-warn）
2. 5分以内にアサイン確認・一次切り分け（対象URL / 時刻 / デプロイ有無 / 直近ログ）
3. 影響範囲評価（stg/prd、主要ユーザー影響）
4. ロールバック判断：
   - 最新デプロイが原因 → 前回タグの Deploy Hook を `scripts/rollback.sh` で実行
   - DB接続不可 → サービス再起動/DB再接続、ログ確認
5. 復旧後：Slackに暫定報告、Issueに事後報告と恒久対応タスクリスト作成

## ロールバック手順（簡易版）
1. Render Deploy Hook キーと Service ID を確認（Runbook/Secrets）
2. スクリプト例:
   ```bash
   RENDER_API_KEY=... ./scripts/rollback.sh <SERVICE_ID> <DEPLOY_HOOK_KEY> <TAG>
   ```
3. デプロイ完了を Render ダッシュボードで確認
4. `/api/health` と Playwright smoke を実行して復旧確認

## TODO（実装タスク）
- [ ] Slack Webhook/Alert ルールを実環境に設定
- [ ] デプロイ失敗 Webhook → Slack の配線
- [ ] ログ集約（または Render logs API 定期ポーリング）で 5xx/P1001/P1002 を監視
- [ ] デプロイ後スモーク用軽量 Playwright ワークフロー追加
