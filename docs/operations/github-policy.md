# Git/GitHub 運用ガイド

`AGENTS.md` の運用方針に対応するための手順と設定をまとめます。下記のチェックリストを順に実施してください。

## 1. ブランチ/タグ保護
- 設定場所: GitHub > Settings > Branches
  - `main` を保護対象に追加
  - **Require a pull request before merging**: 1 以上のレビュー必須
  - **Require status checks to pass before merging**: 以下のワークフローを必須に設定
    - `CI / lint`
    - `CI / build`
    - `CI / test`
    - `Playwright E2E / e2e`
    - `CodeQL / analyze`
  - **Require branches to be up to date before merging** を有効化
  - **Require linear history** と **Disallow force pushes** を有効化
  - **Automatically delete head branches** を有効化
- Tag 保護: Settings > Repositories > Tags で `v*` を保護（force push 禁止）

## 2. セキュリティ機能
- Settings > Security & analysis で以下をオン
  - Secret scanning + Push protection
  - Dependabot alerts & security updates
  - CodeQL code scanning (workflow は `.github/workflows/codeql.yml`)
- 2FA は今回必須ではありませんが推奨します。

## 3. CI/CD 構成
- `.github/workflows/ci.yml`: lint/test/build を並列で実行し、`concurrency` で最新のみ維持。
- `.github/workflows/playwright.yml`: UI E2E を実行、Slack への通知は `SLACK_WEBHOOK_URL` を設定すると有効。
- `.github/workflows/codeql.yml`: 週次＋PR/pushで静的解析。
- `.github/workflows/deploy-staging.yml`: `main` push で自動実行。`Deploy to staging` ステップに実コマンドを設定してください。
- `.github/workflows/deploy-production.yml`: `workflow_dispatch` で承認付きデプロイを実行（Environment = `production` を設定し、Required reviewers を付与）。
- `.github/workflows/release.yml`: 手動入力したバージョンでタグとリリースノートを生成。必要に応じて自動化スクリプトを置き換えてください。

## 4. コミット/ブランチ規約
- `.github/workflows/commitlint.yml`: PR 上のコミットが Conventional Commits に適合するか検証します。
- `.github/workflows/branch-name-check.yml`: ブランチ名が命名規約に沿っているか検証します。
- `commitlint.config.js`: Conventional Commits をベースに lint します。

## 5. コードオーナー & レビュー
- `.github/CODEOWNERS` をプロジェクトの責任者で更新してください。
- PR テンプレート (`.github/pull_request_template.md`) と Issue テンプレートを利用し、レビュー SLA を守ってください。

## 6. ラベル運用
- `.github/labels.yml` で標準ラベルを定義しています。`Sync Labels` workflow (`.github/workflows/labels.yml`) を実行して反映してください。

## 7. Dependabot
- `.github/dependabot.yml` が npm（ルート/`apps/web`）と GitHub Actions の週次チェックを作成します。PR を確認し、必要に応じてマージしてください。

## 8. ドキュメント
- `CONTRIBUTING.md` と `SECURITY.md` に最新の運用ルールが反映されています。
- プルリク提出前にローカルで `npm run lint && npm run build && npm test` を実行してください。

## 9. 手動タスクまとめ
- [ ] Branch protection rule を適用
- [ ] Tag protection (`v*`)
- [ ] Secret scanning, push protection, Dependabot alerts, security updates を有効化
- [ ] `staging`/`production` Environment を作成し、必要なシークレットと reviewers を設定
- [ ] CODEOWNERS の担当者を正式な GitHub ユーザー/チームに変更
- [ ] Slack Webhook や各種 API シークレットを Actions Secrets に登録

すべて完了したら、`AGENTS.md` に定義された運用ポリシーと整合します（2FAのみ任意）。
