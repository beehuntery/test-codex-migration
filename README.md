# Task Manager Web App

## 概要

シンプルなタスク管理アプリです。Express (Node.js) をバックエンドに、純粋な HTML/CSS/JavaScript で構築したフロントエンドが REST API を呼び出します。タスクの追加・編集・ステータス変更に加え、タグの作成／インライン編集／削除、さらにタスクごとのタグ付けが可能です。データは `data/tasks.json` と `data/tags.json` に保存されるため、デモ用途や小規模チームの共有に向いています。

## 技術スタック

| レイヤ | 使用技術 | 用途 |
| --- | --- | --- |
| フロントエンド | HTML5 / CSS3 / Vanilla JavaScript | シングルページ風 UI の描画と REST API の呼び出し |
| バックエンド | Node.js / Express 5 / TypeScript | API エンドポイントの提供と静的ファイル配信 |
| データストア | JSON ファイル (`data/tasks.json`, `data/tags.json`) / SQLite (`dev.db`) | 既定では JSON 永続化。`DATA_STORE=prisma` で Prisma + SQLite にスイッチ可能、移行ユーティリティを同梱 |
| 開発ツール | Nodemon / ts-node / TypeScript Compiler | `npm run dev` / `npm run build` 実行時のホットリロードとトランスパイル |

## 開発環境での起動手順（Express + Vanilla UI）

1. 依存関係をインストールします。
 ```bash
  npm install
  ```
2. SQLite を利用する場合は環境ファイルを設定します（任意）。
   ```bash
   cp .env.example .env
   ```
3. 開発用サーバーを起動します（自動再起動付き）。
   ```bash
   npm run dev
   ```
   または、シンプルに起動する場合は `npm start` を利用します。
4. ブラウザで `http://localhost:3000` を開き、アプリにアクセスします。

> メモ: JSON ファイルにデータが保存されます。リポジトリにコミットしたくない場合は `.gitignore` で除外してください。

## フェーズ3: Next.js プレビュー UI を試す

Next.js 版のフロントエンド（フェーズ3）は既存 Express API と並行で動作します。以下の 2 プロセスを起動してください。

```bash
npm run start                       # Express API (http://localhost:3000)
NEXT_PORT=3001 npm run web:dev      # Next.js App Router (http://localhost:3001)
```

ブラウザで `http://localhost:3001/tasks` を開くと、新しい UI を確認できます。タグ／ステータスのフィルター、Alt + ↑/↓ での並び替え、削除ボタンなどフェーズ3で移植した機能が含まれています。

### Storybook でコンポーネントを確認

```bash
npm run web:storybook
```

Storybook では `Tasks/TaskCard` や `Tasks/TaskDeleteButton` のドキュメントを参照できます。削除ボタンのストーリーでは確認ダイアログまでの流れを再現しています。

## Playwright E2E テスト

フェーズ3で追加した Next.js UI を自動テストする Playwright スイートがあります。実行前に上記 2 プロセスを起動したうえで、以下のように実行してください。

```bash
npm run playwright:e2e
# 例: 削除シナリオのみ実行
npx playwright test tests/e2e/delete-task.spec.ts
```

`--workers=1` を付けるとテストが直列実行され、デバッグが容易です。失敗時のスクリーンショットやログは `test-results/` に出力されます。

### GitHub Actions での自動実行

`.github/workflows/playwright.yml` では、`main` ブランチへの push / PR 時に Playwright E2E を自動実行します。ローカルで追加した `playwright.config.ts` の `webServer` 設定により、Express と Next.js の両方が起動した状態でテストが走ります。

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
