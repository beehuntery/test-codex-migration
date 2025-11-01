# Task Manager Web App

## 概要

シンプルなタスク管理アプリです。バックエンドは Express (Node.js)、フロントエンドは Next.js 15 App Router + Tailwind CSS をベースに再構築済みで、旧来の Vanilla JS UI も比較・検証用に残しています。タスクの追加・編集・ステータス変更に加え、タグの作成／インライン編集／削除、さらにタスクごとのタグ付けが可能です。データは `data/tasks.json` と `data/tags.json` に保存されるため、デモ用途や小規模チームの共有に向いています。

## 技術スタック

| レイヤ | 使用技術 | 用途 |
| --- | --- | --- |
| フロントエンド (現行) | Next.js 15 App Router / React 19 / Tailwind CSS 4 | `/tasks` の SSR/CSR、通知・フィルター UI、Storybook |
| フロントエンド (レガシー) | HTML5 / CSS3 / Vanilla JavaScript | 比較/検証用の従来 UI (`public/index.html`) |
| バックエンド | Node.js / Express 5 / TypeScript | API エンドポイントの提供と静的ファイル配信 |
| データストア | JSON ファイル (`data/tasks.json`, `data/tags.json`) / SQLite (`dev.db`) | 既定では JSON 永続化。`DATA_STORE=prisma` で Prisma + SQLite にスイッチ可能、移行ユーティリティを同梱 |
| 開発ツール | Nodemon / ts-node / TypeScript Compiler | `npm run dev` / `npm run build` 実行時のホットリロードとトランスパイル |

## 開発環境での起動手順

### Next.js + Express（推奨）

1. 依存関係をインストールします。
   ```bash
   npm install
   ```
2. （任意）SQLite を利用する場合は `.env` を準備し、`DATABASE_URL` を設定します。
3. Express API と Next.js App Router を並行で起動します。
   ```bash
   npm run dev:ts                                 # Express API (http://localhost:3000)
   NEXT_PORT=3001 npm --workspace @test-codex/web run dev  # Next.js (http://localhost:3001)
   ```
4. ブラウザで `http://localhost:3001/tasks` を開き、最新の UI を確認します。
   - タスク作成/更新/削除時のトースト通知
   - タグ・ステータス・詳細フィルター（折りたたみ UI と URL 同期）
   - Alt + ↑/↓ またはドラッグ＆ドロップによる並び替え + 完了ハイライト

> メモ: Next.js を本番モードで確認したい場合は `npm --workspace @test-codex/web run build` → `npm --workspace @test-codex/web run start` を利用してください。

### Express + Vanilla UI（レガシー比較用）

1. Express サーバーを起動します。
   ```bash
   npm run dev
   ```
2. ブラウザで `http://localhost:3000` を開き、従来 UI を比較検証できます。

> JSON ファイルにデータが保存されます。リポジトリにコミットしたくない場合は `.gitignore` で除外してください。

### Storybook でコンポーネントを確認

```bash
npm --workspace @test-codex/web run storybook
```

Storybook では `Tasks/Notifications` や `Tasks/Filters/CombinedFilters` など、Next.js UI の状態管理を確認できます。削除ボタンやタグフィルターの操作は URL クエリやトースト通知のモックと連動しています。

## Playwright E2E テスト

Next.js UI を自動テストする Playwright スイートがあります。実行前に上記 2 プロセスを起動したうえで、以下のように実行してください。

```bash
npm run playwright:e2e
# 例: 削除シナリオのみ実行
npx playwright test tests/e2e/delete-task.spec.ts
```

`--workers=1` を付けるとテストが直列実行され、デバッグが容易です。失敗時のスクリーンショットやログは `test-results/` に出力されます。

### GitHub Actions での自動実行

`.github/workflows/playwright.yml` では、`main` ブランチへの push / PR 時に Next.js ビルド → Storybook ビルド → Vitest → Playwright の順で自動実行します。`playwright.config.ts` の `webServer` 設定により Express と Next.js の両方が起動します。ワークフローの完了時には GitHub Actions の summary に成否が集約され、失敗時は `playwright_failed` フラグで原因を追跡できます。`SLACK_WEBHOOK_URL` シークレットを設定すると、成功/失敗の結果が Slack へ自動通知されます。

## Cutover 準備 (Phase4)

- 最新の移行ドキュメントは `docs/migration/phase4.md` を参照してください。Cutover Runbook、ロールバック手順、監視ポイントを随時更新しています。
- Next.js `/tasks` を本番化する際は、CI が緑であることと Playwright スモーク（タスク作成/フィルター/削除）が成功していることをチェックリストに含めてください。
- 旧 UI (`public/index.html`) は比較用に残っていますが、Phase4 内で削除計画を策定します。新規開発・修正は Next.js 側で行ってください。

## Prisma / SQLite ワークフロー（任意）

フェーズ2では Prisma + SQLite への移行を段階的に進めています。ローカルで試す場合は以下を参考にしてください。

1. `.env` を準備し、`DATABASE_URL="file:./dev.db"` を設定します。
2. Prisma Client を生成します。
   ```bash
   npm run prisma:generate
   ```
3. スキーマを SQLite に適用します（非対話環境では `prisma migrate dev` が使えないため `db push` を利用）。
   ```bash
   npm run prisma:migrate
   ```
4. 既存の JSON データを SQLite に投入します。
   ```bash
   npm run migrate:json
   ```
5. 実験的に Prisma ベースのデータストアを試す場合は `DATA_STORE=prisma npm start` でサーバーを起動します（Prisma Client の生成が必須）。
   - Prisma モードではタスク CRUD・並び替え・タグ操作がトランザクション内で差分更新されます。

## テスト

ユニットテストは Vitest を利用しています。

```bash
npm run test
```

> Render 等にデプロイする際は、Persistent Disk かクラウド DB を利用し、`DATABASE_URL` を適宜上書きしてください。

## Render へのデプロイ手順

1. **GitHub にコードを Push**
   - リポジトリを初期化し、`git add` → `git commit` → `git push origin main` を実行します。

2. **Render で Web Service を作成**
   - Render にログインし「New Web Service」を選択。
   - GitHub のリポジトリを選択し、以下を設定します。
     - Build Command: `npm install`
     - Start Command: `npm start`
     - （任意）Environment → `NODE_VERSION` を指定。

3. **ストレージの検討**
   - デフォルトでは Render のディスクは再起動で初期化されるため、永続化が必要なら Persistent Disk を追加するか、SQLite/PostgreSQL などの DB を導入してください。

4. **デプロイと確認**
   - Render がビルドとデプロイを実行し、完了すると公開 URL (例: `https://<サービス名>.onrender.com`) が発行されます。
   - ブラウザでアクセスし、タスクやタグの CRUD が機能することを確認します。

5. **カスタムドメイン（任意）**
   - Render の管理画面でドメインを追加し、DNS の CNAME を設定すれば HTTPS が自動で適用されます。

この README をベースに、必要に応じてスクリーンショットや API 仕様などを追記してください。
