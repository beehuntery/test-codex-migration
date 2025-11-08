# GitHub Environments 設定手順

## 1. 目的
Render のステージング/本番サービスと GitHub Actions を安全に連携させるため、`staging` と `production` の 2 つの GitHub Environment を作成し、ブランチ保護・シークレット・レビュー承認を一元管理します。`deploy-staging.yml` / `deploy-production.yml` などのワークフローはここで定義した環境を参照します。

## 2. 作成する Environment と紐付け
| Environment | 用途 | 紐付く Render サービス | 備考 |
| --- | --- | --- | --- |
| `staging` | `main` 自動反映・Cutover リハーサル | `test-codex-migration-stg` (Express), `test-codex-migration-next-stg` (Next.js) | Auto Deploy / Preview を許可。**Reviewer 承認は不要（トリアージ迅速化のため未設定）**。|
| `production` | 本番カットオーバー／Cutover 本番 | 予定: `test-codex-migration-prd`, `test-codex-migration-next-prd` | `workflow_dispatch` からのみデプロイ。レビュー必須: Tech Lead + PM。|

## 3. 設定手順
### 3.1 共通フロー
1. GitHub リポジトリ `beehuntery/test-codex-migration` → **Settings** → **Environments**。
2. 「New environment」を押し、環境名（`staging` など）を入力して作成。
3. 作成後、以下を設定。
   - **Deployment protection rules**: Reviewer（ユーザー or チーム）を最低 1 名は指定。
   - **Environment secrets / variables**: Render やワークフローが参照する値を登録。
   - **Wait timer / Branch restrictions**: 今回は Branch 制限は `main` のみ、Wait timer は不要。

### 3.2 `staging` 環境
- **Secrets**（最低限）
  - `STAGING_API_BASE_URL`: `https://test-codex-migration-stg.onrender.com`
  - `STAGING_NEXT_BASE_URL`: `https://test-codex-migration-next-stg.onrender.com`
  - `SLACK_WEBHOOK_URL`: ステージング通知用チャンネルの Incoming Webhook
- **Variables**（任意）
  - `RENDER_SERVICE_EXPRESS_STG`: `test-codex-migration-stg`
  - `RENDER_SERVICE_NEXT_STG`: `test-codex-migration-next-stg`
- **Protection**
  - Reviewer設定は不要（Approvals 0）。Cutover リハーサルを頻繁に回せるようフリーパスとする。
- **Workflow 連携**
  - `.github/workflows/deploy-staging.yml` の `environment.name: staging` がこの設定を参照。Deploy step 中で `NEXT_PUBLIC_API_BASE_URL` に `secrets.STAGING_API_BASE_URL` を注入する。

### 3.3 `production` 環境
- **Secrets**
  - `PRODUCTION_API_BASE_URL`: 本番 Express URL
  - `PRODUCTION_NEXT_BASE_URL`: 本番 Next.js URL
  - `SLACK_WEBHOOK_URL`: 本番用通知チャンネル（Staging と分離）
- **Variables**（任意）
  - `RENDER_SERVICE_EXPRESS_PRD`
  - `RENDER_SERVICE_NEXT_PRD`
- **Protection**
  - Reviewer: Tech Lead + PM など 2 名を Required reviewers に指定。
  - 待機時間（任意）: 5 分など。Cutover Go/No-Go のフローに合わせる。
- **Workflow 連携**
  - `.github/workflows/deploy-production.yml` の `environment.name: production` がこの設定を参照。`workflow_dispatch` の入力で Release タグを指定し、承認後にのみ Render へ反映する。

## 4. GitHub Actions との結線ポイント

| Workflow | Environment | 主な参照シークレット/変数 |
| --- | --- | --- |
| `.github/workflows/deploy-staging.yml` | `staging` | `STAGING_API_BASE_URL`, `SLACK_WEBHOOK_URL` |
| `.github/workflows/deploy-production.yml` | `production` | `PRODUCTION_API_BASE_URL`, `SLACK_WEBHOOK_URL` |
| `.github/workflows/playwright.yml` | （任意）staging | Playwright の `NEXT_PUBLIC_API_BASE_URL` を環境変数化する場合に利用 |

> 参考: Render 側のサービス名・環境変数との対応は [Render ステージング環境セットアップ手順](./render-staging-setup.md) を参照してください。

## 5. チェックリスト
- [ ] `staging` / `production` Environment が作成済み
- [ ] 必須シークレットが登録され、最新 URL と一致
- [ ] `production` Environment の Required reviewers が Cutover Runbook の担当者と一致
- [ ] Go/No-Go チェックリスト #12 に設定スクリーンショット or Wiki リンクを記録

完了後、Runbook（`docs/migration/phase4-runbook.md`）の該当セクションに Environment URL と承認者を追記してください。

## 6. 構築順序（特に本番環境）
1. **Render サービスを先に作成**し、最終的なドメイン/URL を確定させる（例: `test-codex-migration-prd`）。
2. Render で発行された URL やサービス名を控えたうえで、GitHub Environments (`production`) を設定し、Secrets/Variables にそれらを登録する。
3. GitHub Environments 側で承認ルール・シークレットが揃ったら、`deploy-production.yml` を `workflow_dispatch` で実行し、Render 本番サービスへ初回デプロイ。

> 理由: 先に Render を用意しておくことで、GitHub Environments に格納する URL/サービス名を確定させてから承認ルールを組めるためです。逆順だとダミー値で Secrets を設定し直す手間が増えます。
