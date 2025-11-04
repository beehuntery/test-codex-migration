# テスト戦略概要

## テストスイート構成

| スイート | 対象 | 実行方法 |
| --- | --- | --- |
| ユニットテスト | Node.js サイドのデータストアおよびドラッグ演算ユーティリティ | `npm run test` |
| E2E テスト (Chromium / MCP) | フロントエンドのドラッグ＆ドロップ挙動 | Codex CLI で `:call playwright.test {"command":"test tests/e2e --config=playwright.config.ts"}` |

### ユニットテスト
- `src/server/storage/jsonStore.ts`: JSON データストアの CRUD/並び替えを検証。
- `src/frontend/drag-utils.ts`: ドラッグ対象位置計算ロジック `findInsertTarget` の境界ケースを検証。
- ユニットテストは Vitest を使用し、Node 環境で実行される。

### E2E テスト (MCP)
- Playwright MCP サーバーを経由して Chromium 実ブラウザ上でドラッグ＆ドロップ UI の動作を検証する。
- テスト前に `npm run build` が実行され、`tests/e2e/task-reorder.spec.mjs` が内蔵のモック API を使って UI を読み込み、テスト用ヘルパー (`window.__testHelpers.reorderTasks`) を介して並び替え処理と DOM 更新を検証する。
- 実行は Codex CLI から MCP ツール `playwright.test` を呼び出す。Playwright CLI (`npm run test:e2e`) は補助用途に限定し、定常の E2E テストは MCP 版を利用する。
- CI では Playwright が `npm run start:ts` と `npm run start --prefix apps/web` を用いてビルド済みの API/Next.js サーバーを上げるため、`npm run playwright:e2e` が事前にバックエンドの TypeScript ビルドを自動実行するようになった。

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
