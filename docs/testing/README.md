# テスト戦略概要

## テストスイート構成

| スイート | 対象 | 実行方法 |
| --- | --- | --- |
| ユニットテスト | Node.js サイドのデータストアおよびドラッグ演算ユーティリティ | `npm run test` |
| E2E テスト (Chromium / MCP) | フロントエンドのドラッグ＆ドロップ挙動 | `npm run playwright:e2e` または Codex CLI で `:call playwright.test {"command":"test tests/e2e --config=playwright.config.ts"}` |

### ユニットテスト
- `src/server/storage/jsonStore.ts`: JSON データストアの CRUD/並び替えを検証。
- `src/frontend/drag-utils.ts`: ドラッグ対象位置計算ロジック `findInsertTarget` の境界ケースを検証。
- ユニットテストは Vitest を使用し、Node 環境で実行される。

### E2E テスト (Playwright / MCP)
- Playwright MCP サーバーを経由して Chromium 実ブラウザ上でドラッグ＆ドロップ UI の動作を検証する。
- `tests/e2e/task-reorder.spec.mjs` をはじめとしたシナリオが内蔵モック API を用い、DOM 更新や reorder ヘルパー (`window.__testHelpers.reorderTasks`) の挙動を検証する。
- ローカルでは `npm run playwright:e2e`（CI と同じ構成）または Codex CLI の MCP コマンドで実行可能。
- `tests/e2e/global-setup.ts` が `/tasks` へウォームアップリクエストを送り、Turbopack dev サーバー初回コンパイルを吸収してからテストを開始する。

### CI パイプライン要約
- GitHub Actions では `next dev --turbo`（API 側は `npm run start:ts`）を Playwright の `webServer` として起動し、本番ビルドを事前に作らずに E2E を実施する。
- `actions/cache` で Next.js `.next/cache`、Storybook/Vite キャッシュ、Playwright ブラウザバイナリ (`.playwright-browsers/`) を再利用。Storybook ビルドもパス差分を検知し、必要時のみ実行する。
- main への push かつフロントエンド差分がある場合のみ `npm --workspace @test-codex/web run build` を追加で実行して本番ビルドの破断を検知。差分が無い場合はスキップするため CI 所要時間は ~1m25s 程度。
- Playwright は `retain-on-failure` のトレース、スクリーンショット、HTML レポートを生成し、`playwright-artifacts-*` としてアップロードする。Slack 通知とサマリーにも Storybook/Next.js ビルドの実行可否が表示される。

## 実行手順

```bash
npm install
npm run test
npx playwright install chromium
```

### E2E テスト (MCP) の流れ
1. Codex CLI を開き、プロジェクトディレクトリ（`/home/yousukeayada/test-codex-clone2`）をカレントにする。
2. MCP Playwright サーバーが有効なことを確認する（`:tools` で `playwright.test` が表示されれば OK）。
3. ビルドが必要な場合は別ターミナルで `npm run build` を実行する。
4. Codex CLI のプロンプトで次を入力して E2E テストを実行する。  
   `:call playwright.test {"command":"test tests/e2e --config=playwright.config.ts"}`
5. テスト結果は Codex CLI 上で確認し、必要に応じてスクリーンショットなどの出力（`/tmp/playwright-mcp-output/...`）を参照する。

## ブラウザでの手動確認
1. `npm run dev` または `npm start` でサーバーを起動。
2. `http://localhost:3000` をブラウザで開き、タスクの追加・ドラッグ＆ドロップ・フィルタ操作が機能することを確認。

## 今後の検討事項
- Playwright テストに実ブラウザでのエビデンス保存（スクリーンショット・動画）を追加する。
- JSON ストアだけでなく Prisma ストアを対象にした統合テスト整備。
- 主要機能 (検索、フィルタ、タグ編集) の追加テストケース拡充。
