# Render ステージング環境セットアップ手順

## 目的
フェーズ5「Hosting & Deployment」の一環として、Render 上に Next.js/Express アプリのステージング環境を構築し、本番 Cutover 前の検証・監視・ロールバック演習を実施できる状態にします。本書は README の一般的なデプロイ手順を具体化し、Go/No-Go チェックリスト (#12) の証跡を作成するための手順書です。

## 前提条件
- Render アカウントと Web Service 作成権限（Organization/Team 側で権限確認済みであること）。
- GitHub リポジトリ `yousukeayada/test-codex-clone2` へのアクセス権。
- Slack Webhook（`SLACK_WEBHOOK_URL`）と Incident チャンネルが発行済み。
- データ永続化の要件に応じて Persistent Disk もしくは外部 DB（SQLite/PostgreSQL）の準備。
- フェーズ4 Runbook に記載されている Cutover スケジュールと担当表を参照できること。

## 手順概要
1. デプロイ設定の整理
2. Render でステージング Web Service を作成
3. 環境変数・Secrets・Persistent Disk を設定
4. 初回デプロイと Smoke テスト
5. 監視/通知（Slack, Grafana）との連携

---

## 1. デプロイ設定
1. Trunk-Based GitHub Flow を維持するため、ステージング環境も `main` ブランチから自動デプロイします。機能開発は短命ブランチ（`feature/...` 等）→ PR → `main` マージ → Render staging へ自動反映、という流れに統一してください。
2. ステージングと本番の住み分けは **Render の Web Service（stg/prod で別サービス）＋ GitHub Environments（staging, production）** で管理します。ブランチを分ける代わりに、ステージング用サービスで自動デプロイ、production 用サービスは `workflow_dispatch` + Environment 承認で昇格させます。
3. README に記載のビルド/スタートコマンドを再確認し、`package.json` の `prestart` が `npm run build` を呼ぶため、Render 側の Build Command は `npm install --include=dev`（devDependencies も取得）を推奨します。Prisma モードで JSON から初期データを投入する場合、Start Command を `npm run start:render`（`prisma:migrate` → `migrate:json` → 本番起動）に変更するとテーブルが自動作成されます。README.md#L108-L129
   - `start:render` は `prisma db push --force-reset` を実行するため、既存データが消えて困る環境では使用しないでください。本番では `DATA_STORE=json` で先にデータをバックアップするか、`prisma migrate deploy` ベースの別スクリプトを用意してください。
   - 既存データを保持したままマイグレーションを適用したい場合は `npm run start:render-safe`（= `prisma migrate deploy` → `npm start`）に Start Command を切り替えます。schema 変更のみ反映され、`migrate:json` のような再投入は行いません。

## 2. Render でステージング Web Service を作成
1. Render ダッシュボードで「New」→「Web Service」を選択。
2. GitHub リポジトリを選択し、`main` ブランチを指定（Trunk-Based を維持するため）。Preview Deploys を ON にすると、PR の Preview ブランチがステージング URL で確認できます（この場合もマージ後は main → staging で統一）。
3. Service Name 例: `task-manager-stg`。Region は本番と同じリージョンを選ぶ（例: Oregon / Singapore 等）。
4. インスタンスは `Starter` 以上を推奨（Playwright スモークを走らせる場合は `Starter Plus` 以上を検討）。
5. Auto Deploy を ON にし、`Preview Deploys` は任意（PR ごとにステージングへ反映したい場合は ON）。

## 3. 環境変数・Secrets 設定
| 変数 | 必須 | 推奨値 (ステージング) | 役割 |
| --- | --- | --- | --- |
| `NODE_ENV` | ✅ | `production` | Express/Next.js を本番相当で動かす。
| `PORT` | ✅ | `3000` | Express API の待受ポート。Render の内部ポートに合わせる。
| `DATA_STORE` | ✅ | `json` (初期) / `prisma` | データストア切り替え。Prisma を使う場合は後述の DB 設定も必須。
| `JSON_DATA_ROOT` | 任意 | `/var/data/tasks` | Persistent Disk 利用時の JSON 保存先。
| `DATABASE_URL` | 任意 | `file:./dev.db` or `postgresql://...` | Prisma + SQLite/PostgreSQL を使う場合に設定。
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | `https://task-manager-stg.onrender.com` | Next.js フロントエンドから API を叩くベース URL。
| `NEXT_PUBLIC_ENV` | ✅ | `staging` | UI 上で環境を識別するための任意フラグ。
| `SLACK_WEBHOOK_URL` | ✅ | (機密) | CI / デプロイ / 監視通知で使用。Render の Secret として登録。
| `PRISMA_MAX_RETRIES` 等 | 任意 | 既定値 | `src/server/config.ts` の schema に準拠。性能要件に応じ調整。

> 機密値（Slack、DB パスワードなど）は Render の **Secret File** または Environment Secrets として登録し、チーム共有は LastPass/1Password で行います。

## 4. Persistent Disk / DB
- JSON モードのまま運用する場合: Render サービスの「Add Disk」から Persistent Disk を割り当て、`/var/data` をマウント。`JSON_DATA_ROOT` を `"/var/data/tasks"` に設定し、初回デプロイ後に `data/tasks.json` の初期内容をコピーします。
- Prisma + SQLite: デプロイ前に `DATABASE_URL="file:./dev.db"` を設定し、Render の Build Command で `npm run prisma:migrate && npm run migrate:json` を実行するように `build.sh` を追加するか、デプロイ後に Web Shell で同コマンドを実行してください。
- Prisma + PostgreSQL: Render Database を追加し、接続文字列を `DATABASE_URL` として設定。`DATA_STORE=prisma` に変更すると API が Prisma 経由で動作します。

## 5. 初回デプロイと Smoke テスト
1. Render が Build → Deploy を完了したら、`https://task-manager-stg.onrender.com/tasks` へアクセスし、Next.js UI が表示されるか確認します。
2. API ヘルスチェック: `https://task-manager-stg.onrender.com/api/tasks` をブラウザ or curl で叩き、HTTP 200 が返ることを確認。
3. Playwright スモーク: ローカルまたは GitHub Actions から `NEXT_PUBLIC_API_BASE_URL` をステージング URL に設定し、`npm run playwright:e2e` を実行。結果を Slack へ共有します。
4. 監視: Render Metrics（レスポンスタイム/エラーレート）を確認し、閾値を Phase4 Runbook のチェックリストに記録。

## 6. Slack / Grafana 連携
1. Render の Notification（Events → Webhook）を使う場合は、`SLACK_WEBHOOK_URL` にステージング用チャンネルを指定し、デプロイ完了/失敗を通知。
2. Grafana を導入済みの場合は、`canary-request` 系メトリクスの `environment=staging` ラベルが収集されるよう、Exporter をステージングに接続します（詳細は `docs/observability/canary-dashboard.md`）。
3. Incident 連絡系はステージングでも #incidents-stg など分け、本番と混在しないようにする。

## 7. 証跡の残し方
- Render デプロイログ、環境変数一覧、Persistent Disk 設定画面のスクリーンショットを取得し、`docs/migration/phase5.md` の Hosting & Deployment セクションにリンク。
- Go/No-Go チェックリスト #12 の「証跡リンク」に上記スクショ or Wiki ページを記載。
- Runbook（`docs/migration/phase4-runbook.md`）の「リハーサル環境」欄にステージング URL と担当者を追記。

## 次のステップ
- 本番 Web Service を同手順で構築し、環境変数を本番値に差し替える。
- フェーズ5バックログ #3 のステータスを更新し、Grafana スタック (#4) と接続テストを行う。
- Cutover Prep (T-3) でステージングに最新 `main` をデプロイし、Playwright + Storybook スモークと Canary ダッシュボードを使ったリハーサルを実施する。
