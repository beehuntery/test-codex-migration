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
1. デプロイ設定と GitHub Environments の役割整理（[設定手順はこちら](./github-environments.md)）。
2. Render 上に **Express 用** と **Next.js 用** の 2 サービスを作成。
3. サービスごとに環境変数・Secrets・Persistent Disk を設定。
4. 初回デプロイと Smoke テストを実施。
5. 監視/通知（Slack, Grafana）との連携。

---

## 1. デプロイ設定
1. Trunk-Based GitHub Flow を維持するため、ステージング環境も `main` ブランチから自動デプロイします。機能開発は短命ブランチ（`feature/...` 等）→ PR → `main` マージ → Render staging へ自動反映、という流れに統一してください。
2. ステージングと本番の住み分けは **Render の Web Service（stg/prod で Express＋Next.js の 2 本立て）＋ GitHub Environments（staging, production）** で管理します。ステージング環境はレビュアー承認なしの自動デプロイ、本番環境は `workflow_dispatch` + 必須レビューで昇格させます。
3. README に記載のビルド/スタートコマンドを再確認し、`package.json` の `prestart` が `npm run build` を呼ぶため、Render 側の Build Command は `npm install --include=dev`（devDependencies も取得）を推奨します。Prisma モードで JSON から初期データを投入する場合、Start Command を `npm run start:render`（`prisma:migrate` → `migrate:json` → 本番起動）に変更するとテーブルが自動作成されます。README.md#L108-L129
   - `start:render` は `prisma db push --force-reset` を実行するため、既存データが消えて困る環境では使用しないでください。本番では `DATA_STORE=json` で先にデータをバックアップするか、`prisma migrate deploy` ベースの別スクリプトを用意してください。
   - 既存データを保持したままマイグレーションを適用したい場合は `npm run start:render-safe`（= `prisma migrate deploy` → `npm start`）に Start Command を切り替えます。schema 変更のみ反映され、`migrate:json` のような再投入は行いません。
   - Next.js 用の Web Service では Prisma を使わないため、Build Command 実行時に `SKIP_PRISMA_GENERATE=1` の環境変数を設定してください（`package.json` の `prepare` スクリプトがスキップされ、`prisma` コマンドを探しに行かなくなります）。

## 2. Render でステージング Web Service を作成

### 2.1 Express (API) サービス `test-codex-migration-stg`
1. Render ダッシュボードで「New」→「Web Service」。リポジトリは `beehuntery/test-codex-migration`（ルート直下）を指定し、ブランチは `main`。
2. Service name は `test-codex-migration-stg`（本番は `-prod` を推奨）。リージョンは本番と同じにする。
3. プランは `Starter` 以上。Free プランだとスリープ復帰が遅く Cutover スモークに支障が出る。
4. Build Command: `npm install --include=dev`（Prisma 生成は `prebuild` が面倒を見ます）。
5. Start Command: `npm run start:render-safe` を推奨。初期データを毎回削除したくない場合は safe 版を使い、初期化が必要なリハーサル時のみ `start:render` に切替。
6. Auto Deploy を ON、PR Preview は任意。ステージング URL を Runbook に記載し、GitHub Environment `staging` に紐付けます。

### 2.2 Next.js (App Router) サービス `test-codex-migration-next-stg`
1. 同じく「New」→「Web Service」。リポジトリは `beehuntery/test-codex-migration`、ただし `Root Directory` に `apps/web` を指定。
2. Service name は `test-codex-migration-next-stg`。リージョン/プランは Express と同じく `Starter` 以上。
3. Build Command: `SKIP_PRISMA_GENERATE=1 npm install --include=dev && npm run build`（Prisma 依存を避けるため環境変数を付与）。
4. Start Command: `npm run start`。Auto Deploy を ON にし、PR Preview は任意。
5. `NEXT_PUBLIC_API_BASE_URL` を Express ステージング URL に合わせるため、後述の環境変数設定を忘れない。
6. GitHub Environment `staging` の保護ルールを Next.js workflow にも適用し、`deploy-staging.yml` がこの環境を使うようにする。

## 3. 環境変数・Secrets 設定

### Express サービス（バックエンド）
| 変数 | 必須 | 推奨値 (stg) | 備考 |
| --- | --- | --- | --- |
| `NODE_ENV` | ✅ | `production` | 本番挙動・ログレベルを一致させる。
| `PORT` | ✅ | `3000` | Render で公開される内部ポートと合わせる。
| `DATA_STORE` | ✅ | `json` or `prisma` | Phase5 では `json` 維持→Prisma切替リハーサル時に更新。
| `JSON_DATA_ROOT` | 任意 | `/var/data/tasks` | Persistent Disk を `Add Disk` で `/var/data` にマウント。
| `DATABASE_URL` | Prisma利用時 | `file:./dev.db` or Postgres URL | `.env.example` と同じ形式。
| `SLACK_WEBHOOK_URL` | ✅ | (Secret) | CI/デプロイ/監視通知用。Secret として格納。
| `PRISMA_MAX_RETRIES` 等 | 任意 | `.env.example` 参照 | `src/server/config.ts` に型定義あり。

### Next.js サービス（フロントエンド）
| 変数 | 必須 | 推奨値 (stg) | 備考 |
| --- | --- | --- | --- |
| `NODE_ENV` | ✅ | `production` | Next.js を本番モードで起動。
| `PORT` | ✅ | `3000` | Render の標準設定。
| `NEXT_PUBLIC_API_BASE_URL` | ✅ | `https://test-codex-migration-stg.onrender.com` | Express ステージング API を参照。
| `NEXT_PUBLIC_ENV` | ✅ | `staging` | UI で環境表示に使用。
| `SLACK_WEBHOOK_URL` | 任意 | (Secret) | Next.js 側の通知が必要な場合のみ。
| `SKIP_PRISMA_GENERATE` | Build Command で付与 | `1` | Prisma の `prepare` フックをスキップ。

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
