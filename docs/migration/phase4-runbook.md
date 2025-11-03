# フェーズ4 補助ドキュメント集

このファイルにはフェーズ4で作成した詳細ドキュメントを集約しています。

- [レガシー資産棚卸し](#レガシー資産棚卸し2025-11-02)
- [Cutover Runbook](#cutover-runbook-draft-v01)
- [Next.js / Express 同期ポイント](#nextjs--express-同期ポイントメモ2025-11-02-更新)
- [Cutover リハーサル計画](#cutover-リハーサル計画2025-11-02-更新)
- [CI 通知・可視化計画](#ci-通知可視化計画)
- [監視・アラート計画](#監視アラート計画)
- [ステークホルダー向けコミュニケーションパック](#ステークホルダー向けコミュニケーションパック2025-11-02)
- [Cutover 後検証チェックリスト](#cutover-後検証チェックリスト2025-11-02)
- [Storybook / Playwright シナリオ拡張 TODO](#storybook--playwright-シナリオ拡張)

## レガシー資産棚卸し（2025-11-02）
| ファイル | 現状利用箇所 | Next.js / 代替 | 対応メモ |
| --- | --- | --- | --- |
| `public/app.js` | 旧 UI（手動確認用）、Playwright 特性テスト（`tests/e2e/task-reorder.spec.mjs`）、ユニットテスト（`src/frontend/app-dnd.test.ts`） | Next.js `/tasks` + `TaskReorderList` へ移行済み | Phase4 でテスト用フィクスチャへ切り出し、最終的に削除する。 |
| `public/drag-utils.mjs` | 同上（テスト専用に読み込んで挙動比較） | Next.js 版では `TaskReorderList` の内部ロジックを使用 | テストを新実装へ移し、モジュールをアーカイブ後削除。 |
| `public/styles.css` | 旧 `index.html` のみに参照。Tailwind 4 とは独立。 | Tailwind 設定 + デザイントークン | 必要なトークンを抽出後、CSS は廃止。 |
| `public/index.html` | 旧スタティック UI の検証用。 | Next.js App Router | Cutover 後にリダイレクトか削除。ドキュメント参照を更新。 |
| `drag-utils.d.ts` | TypeScript 向け型定義（テスト用） | 今後は削除予定 | 新しいユーティリティへの型移行後に不要。 |

## Cutover Runbook (Draft v0.1)

### フェーズ0: 事前チェック（T-7〜T-1 日）
| チェック | 詳細 | 担当 |
| --- | --- | --- |
| CI 緑化 | `main` で Next.js build / Storybook build / Vitest / Playwright が全て成功していることを確認。 | Dev |
| データ整合性 | Prisma / JSON ストアが同期済みかを `npm run migrate:json` → `npm run prisma:migrate` の順で検証。 | DevOps |
| Rollback 条件 | 失敗時に Express ルートへ戻す Feature Flag (`NEXT_UI_ENABLED`) を ON/OFF できるようにする。 | DevOps |
| ステークホルダー通知 | カットオーバースケジュール、影響範囲、連絡先を共有する。 | PM |

### フェーズ1: ステージングリハーサル（T-1 日）
1. ステージングで Express (3000) と Next.js (3001) を起動し、`NEXT_UI_ENABLED=true` で `/tasks` を Next.js に切替。 
2. Playwright スモーク (`npm run playwright:e2e -- --project next-smoke`) を実行し、タスク作成/フィルター/削除が成功するか確認。 
3. Storybook `Tasks/Notifications` を手動で開き、トースト/完了ハイライトが動作するか確認。 
4. ログ/メトリクス（タスク作成数、エラーログ）を確認し、問題がなければサインオフ。 
5. 問題発生時は `NEXT_UI_ENABLED=false` で旧 UI に戻し、Runbook に事象と対策を追記。 

### フェーズ2: 本番カットオーバー（T 日）
1. デプロイ前に `main` からリリースブランチを作成し、CI が緑であることを確認。 
2. インフラでリバースプロキシ設定を更新（例: Render なら rewrite rule を Next.js へ切替）。 
3. デプロイ直後に Playwright のスモークを実行。失敗した場合は即座に Feature Flag を戻す。 
4. 監視ダッシュボードで 15 分間メトリクス・ログ・UX フィードバック（トーストイベント数等）を観測。 
5. 問題なしの場合、アナウンス文を公開し、Cutover 完了をステークホルダーへ通知。 

### フェーズ3: ロールバック手順
1. `NEXT_UI_ENABLED=false` を設定し、リバースプロキシを Express に戻す。 
2. Next.js を停止し、Express のログとデータストアを確認して整合性を確保。 
3. 失敗原因を Issue Tracker に記録し、再カットオーバーの条件とタスクを定義。 

### フェーズ4: カットオーバー後フォロー
1. 24 時間以内に Playwright 回帰テストを再実行し、安定性を確認。 
2. README / Release Notes を公開版に更新し、旧 UI のリンクを削除。 
3. `public/` の不要アセット削除を行い、テストを Next.js ベースに移行。 
4. 監視/アラート設定を本番運用モードへ更新し、フレーク検知を通知チャネルへ連携。 

> 次回更新予定: フェーズ1・2で実施するチェックリストを GitHub Projects に落とし込み、担当者アサインを自動化する。

## Next.js / Express 同期ポイントメモ（2025-11-02 更新）

| 項目 | Next.js 側 | Express 側 | 注意点 |
| --- | --- | --- | --- |
| API 呼び出し先 | `apps/web/lib/api.ts` の `API_BASE_URL`（`NEXT_PUBLIC_API_BASE_URL` 未指定時は `http://localhost:3000`） | `src/server/index.ts` の REST API (`/api/*`, ポート 3000) | Cutover 時は環境ごとに `NEXT_PUBLIC_API_BASE_URL` を更新し、HTTPS/ドメインを一致させる。 |
| 開発時ポート | `NEXT_PORT` 環境変数で調整（未指定なら 3000）。ドキュメントでは `NEXT_PORT=3001 npm --workspace @test-codex/web run dev` を利用。 | `npm run dev:ts` が 3000 を使用し、`public/` を静的配信。 | 並行起動時はポート衝突を避けるため Next.js を 3001 へ移行。Cutover 後はリバースプロキシで `/tasks` を Next.js へルーティング。 |
| データストア | Server Actions が REST API を介して書き込み後 `revalidatePath('/tasks')`。クライアント側 Fetch は `cache: 'no-store'`。 | `getDataStore()` が JSON もしくは Prisma を選択。 | Prisma へ切替える際は Express 側の `DATABASE_URL` を更新するだけで Next.js の API 呼び出しはそのまま利用可能。 |
| スキーマ | `@shared/api` の Zod スキーマを Next.js から参照。 | 同じスキーマを Express 側でも利用。 | API 変更時はスキーマ更新 → 両環境を再ビルド。互換性テストを追加する。 |
| セッション / 認証 | 現状なし（匿名利用）。 | 同じく未実装。 | 認証導入時は Cookie/Token の共有方法、CORS 設定を Runbook に追記する。 |
| CI での設定 | `.github/workflows/playwright.yml` で `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000` を指定。Playwright の `baseURL` は `http://localhost:${process.env.NEXT_PORT ?? 3001}/tasks`。 | Playwright の `webServer` が `npm run dev:ts` を起動し、REST API を提供。 | 本番用 Runbook では同じ環境変数をステージング/本番の URL に差し替え、スモークテストの接続先を統一する。 |

### 運用メモ
- フィーチャーフラグ `NEXT_UI_ENABLED` を導入する際は Express / Next.js / リバースプロキシで同じ値を参照する。
- Cutover 前に staging で `NEXT_PUBLIC_API_BASE_URL` を staging API へ向け、Playwright の `baseURL` と一致させてドライランする。
- `apps/web/lib/api.ts` は HEAD リクエストも `cache: 'no-store'` で実行するため、API への rate limit が問題になりそうな場合は App Router の `fetch` オプションを調整する。
- Next.js を serverless 環境に配置する場合は、`NEXT_PUBLIC_API_BASE_URL` を VPC 内の Private URL か API Gateway に切り替えることを Runbook に明記する。

## Cutover リハーサル計画（2025-11-02 更新）

| フェーズ | 作業項目 | 詳細 | 担当 |
| --- | --- | --- | --- |
| 準備 (T-3〜T-2) | リハーサル環境の整備 | Staging に最新 `main^{... truncated ...}EOF
