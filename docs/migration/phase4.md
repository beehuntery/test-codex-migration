# フェーズ4: 開発体制整備

- ステータス: 🚧 着手 (2025-11-02)
- 目的: Next.js / Express 並行稼働の Cutover Plan を確立し、テスト・CI/CD 体制を統合して本番移行に備える。

## スコープ
- Express と Next.js の共存期間におけるルーティング/プロキシ設計、ロールバック手順、監視ポイントのドキュメント化。
- Storybook・Playwright・Vitest を用いた統合テストパイプラインの整備と自動実行。
- `public/` 配下のレガシー資産を棚卸しし、Next.js 版へ完全移行するための削除/アーカイブ計画を策定。
- README / 運用手順書の更新により、新 UI をデフォルトの動線として明示。

## 成果物
- Cutover Runbook（チェックリスト、ロールバック手順、リスク対策）。
- CI パイプライン（Next.js build, Storybook build, Vitest, Playwright）まとめと成否通知の整備。
- `public/` アセット削除計画と対応スケジュール。
- 利用者/オペレーター向けの更新済みドキュメント一式。

## マイルストーン
- **M4.1: Runbook Draft** – Cutover 計画とロールバック手順をドキュメント化。
- **M4.2: Unified CI** – Storybook / Playwright / Vitest を統合した CI を安定運用。
- **M4.3: Legacy Sunset** – `public/` 資産の削除計画とリポジトリ整備を完了。
- **M4.4: Comms Ready** – README・リリースノート・運用手順を更新し、利害関係者へのアナウンス準備を整える。

## バックログ
- [x] `public/` ディレクトリの棚卸しおよび削除対象・保守対象のリストアップ。
- [x] README と運用ドキュメントを Next.js ベースへ更新し、旧 UI 参照をアーカイブに移動。
- [x] Cutover Runbook（並行稼働・ロールバック・監視）の初稿を作成。
- [x] CI パイプラインの通知・成否可視化（GitHub Actions Status, Slack/メール連携案）を検討。
- [x] Storybook/Playwright に追加すべきシナリオを列挙し、自動化の優先度を決定。
- [x] Next.js / Express 同期ポイント（API ベース URL, セッション等）を確認し、切替時の注意点を整理。
- [x] Cutover リハーサル（ステージング/本番相当）を計画し、ドライランの手順とサインオフ基準を定義。
- [x] 監視・アラート（メトリクス、ログ、UX フィードバック）の更新計画を策定し、Cutover 時のチェックを自動化。
- [x] ステークホルダー向けコミュニケーションパック（アナウンス文、FAQ、リリースノート下書き）を準備。
- [x] Cutover 後の検証チェックリスト（機能スモーク、パフォーマンス、SEO/リンク等）と担当者振り分けを整理。

## リスクと対応
- **Cutover 失敗時のダウンタイム**: Runbook でロールバック手順を具体化し、CI でのスモークを義務化。
- **テスト時間の長期化**: Storybook/Playwright の並列化や選択的実行を検討し、CI 実行時間の上限を管理する。
- **レガシー資産依存**: `public/` の使用箇所を検索・トラッキングし、削除までの代替策を早期に決定する。
- **関係者への周知不足**: README/リリースノートに加えてアナウンス用テンプレートを用意し、Cutover 前にレビューを実施。

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
| 準備 (T-3〜T-2) | リハーサル環境の整備 | Staging に最新 `main` をデプロイ。`NEXT_PUBLIC_API_BASE_URL` を staging API に設定し、Prisma/JSON データを同期。 | DevOps |
| 準備 (T-2) | テストデータ投入 | Playwright で使用するテストシナリオ用のタスクを Seeds スクリプトで投入。 | QA |
| 実施 (T-1 午前) | 並行起動確認 | Express(3000) + Next.js(3001) を同時起動し、リバースプロキシで `/tasks` の向き先を手動で切り替え。 | DevOps |
| 実施 (T-1 午前) | 自動テスト | `npm run playwright:e2e -- --project next-smoke` を実行し、主要シナリオ（作成/削除/フィルター/通知）を確認。失敗時は Issue と Runbook を更新。 | QA |
| 実施 (T-1 午後) | 手動チェック | Storybook `Tasks/Notifications` と Next.js UI を手動で操作し、完了ハイライトやトースト表示を確認。 | Product/Design |
| 実施 (T-1 午後) | サインオフ会議 | Dev/QA/PM で 30 分の確認ミーティング。CI 緑化・Playwright結果・手動確認メモを共有し、Cutover 実施可否を判断。 | PM |
| 事後 (T-1 夕方) | ロールバック手順リハーサル | `NEXT_UI_ENABLED=false` とリバースプロキシ差し替えを実際に実施し、5 分以内に旧 UI へ戻せることを確認。 | DevOps |

### サインオフ基準
- Playwright スモークが 2 回連続で成功していること（途中で flaky が出た場合は原因を解析し、再実行で安定性を確認）。
- 手動チェックリスト（通知、完了ハイライト、フィルター、ドラッグ）がすべて ✅ であること。
- Slack 通知・Actions Summary に失敗がなく、CI 全体が緑であること。
- ロールバック手順がドキュメント通りに 5 分以内で完了できることをリハーサルで確認。

### 追跡方法
- GitHub Projects に「Cutover Rehearsal」ボードを作成し、上記タスクをカード化して担当者と期日を設定。
- チェックリストは `/docs/migration/phase4.md` に反映し、Runbook から参照できるようにする。

## CI 通知・可視化計画
- GitHub Actions の `Playwright E2E` ワークフローは Next.js build → Storybook build → Vitest → Playwright の順で実行し、完了後に **Actions Summary** へ成否を集約する。
- Slack Webhook（`SLACK_WEBHOOK_URL` シークレット）を設定すると、成功・失敗で自動通知される。失敗通知には該当 Run へのリンクを含め、即時調査を可能にする。
- Slack を設定していない場合でも Summary で確認可能。将来的に OpsGenie 等のオンコール通知が必要になった場合は GitHub Actions の `workflow_run` トリガーと組み合わせた拡張を行う。
- Runbook フェーズ2（本番カットオーバー）では、CI が緑であることと Slack 通知が成功していることを出発条件に追加する。
- 設定手順メモ: ① GitHub -> Repository Settings -> Actions -> Secrets and variables に `SLACK_WEBHOOK_URL` を登録。② `.github/workflows/playwright.yml` の Slack ステップが成功/失敗時に summary と通知を出すことを確認。③ 失敗時は `PLAYWRIGHT_FAILED` フラグが `GITHUB_ENV` に記録されるため、run の Actions Summary に ❌ とログリンクが表示される。

## 監視・アラート計画

| カテゴリ | 監視対象 | ツール / 設定 | アラート条件 | Cutover 時の確認 |
| --- | --- | --- | --- | --- |
| メトリクス | API レイテンシ・エラーレート (`/api/tasks*`) | Render Metrics または Prometheus/Grafana。`status=5xx` とレスポンスタイム 95%tile を収集。 | 5xx > 2% または レイテンシ > 800ms が 5 分継続。 | Cutover 直後 15 分間ウォッチし、グラフに大きなスパイクがないか確認。 |
| ログ | Express アプリログ、Next.js Server Action エラー | Pino 出力を JSON 形式で Cloud Logging / Loki へ送信。Next.js 側は `NEXT_RUNTIME_LOG=1` を有効化。 | `error` レベルが 5 分で 3 回以上発生したら通知。 | カットオーバー後 30 分間で新規エラーがないかフィルター。 |
| UX シグナル | フロントエンドのトースト送信数、Unhandled Promise Rejection | Next.js `_app` で `window.addEventListener('unhandledrejection')` を計測イベントとして送信。トーストイベントは Segment 等に送出。 | Unhandled Rejection > 0 または トーストメッセージに `error` が多発。 | カットオーバー当日はダッシュボードでトースト内訳を確認し、エラー比率が 5% 未満かチェック。 |
| Playwright | `/tasks` スモーク（作成/削除/フィルター） | GitHub Actions + Playwright。`next-smoke` プロジェクトをスケジュール実行（cron 毎日）。 | E2E 失敗時に Slack 通知。 | Cutover リハーサルと本番直後に手動で実行し結果を Runbook に記録。 |

### 運用ルール
- アラート送信先は Slack `#alerts-nextjs` チャンネル（未作成の場合は QA/DevOps で準備）。Urgent な場合はオンコールに転送するフローを別途定義。 
- メトリクス/ログダッシュボードは Cutover 1 週間前にスクリーンショットと URL を Runbook に添付する。 
- 監視閾値は Cutover 後に再チューニング可能なよう、ダッシュボード設定を Git 管理（Grafana provisioning など）する。 
- 重大アラートが発生した場合は Runbook のロールバック手順を即時実施し、事後に原因と対策を `docs/migration/phase4.md` に追記する。 

### 自動化アイデア
- GitHub Actions に nightly スケジュールを追加し、Playwright スモークを実施 → 成否を Slack 通知。 
- Render/Heroku などのホスティングで Webhook を利用し、再起動やエラー時に Slack/メールへ通知。 
- Next.js 側で簡易ヘルスチェック API (`/api/health`) を追加し、監視サービスから 1 分間隔で確認。 
## 関連ドキュメント
- [フェーズ3: フロントエンド再構築](./phase3.md)
- [技術スタック移行計画 概要](./plan.md)
- [テスト戦略ガイド](../testing/README.md)

### Storybook / Playwright シナリオ拡張
- TODO: Storybook 追加ストーリー
  - [ ] Tasks/Notifications – 成功/エラー/情報トースト＋完了ハイライトを確認
  - [ ] Tasks/ReorderList – ドラッグ・キーボード操作・完了ハイライト表示
- TODO: Playwright 追加シナリオ
  - [ ] notifications.spec.ts – CRUD/ステータス操作時のトースト内容と完了ハイライト検証
  - [ ] filters-combination.spec.ts – タグ/ステータス/詳細フィルター組み合わせとURL同期
  - [ ] legacy-parity.spec.ts（任意） – 旧 UI と Next.js UI の基本機能比較

## ステークホルダー向けコミュニケーションパック（2025-11-02）

### アナウンス文テンプレート（Cutover 前日配信）
```
件名: 【予告】Next.js ベースの新タスク UI 切替のお知らせ（11月XX日）

平素よりタスク管理ツールをご利用いただきありがとうございます。
11月XX日（火）に、フロントエンド UI を Next.js ベースへ切り替える作業を実施します。

■ 影響範囲
- タスク一覧/詳細画面の操作 UI（URL: /tasks）が刷新されます。
- API / 自動化スクリプトには影響ありません。

■ 作業予定
- 日時: 11月XX日（火） 20:00 - 21:00（予備日: 11月YY日）
- 所要時間: 約 30 分（サービスは継続提供）
- 切替後 1 時間は監視体制を強化し、問題があれば旧 UI へ即時戻します。

■ お問い合わせ
- 不具合・質問は Slack #support もしくは support@example.com までご連絡ください。

ご不明点等ありましたらお気軽にお知らせください。
引き続きよろしくお願いいたします。
```

### FAQ（想定質問と回答）
| 質問 | 回答 |
| --- | --- |
| 旧 UI に戻すことはできますか？ | 切替後も緊急時は運用側で一時的に旧 UI に戻すことができますが、通常利用は新 UI をご利用ください。 |
| ブックマークは変わりますか？ | `/tasks` の URL は変更ありません。フィルター付き URL もそのまま利用できます。 |
| API 仕様は変わりますか？ | 今回はフロントエンドのみの切替で API 仕様は変わりません。 |
| トラブルが起きた場合の窓口は？ | Slack #support、メール support@example.com、または社内ヘルプデスクまでご連絡ください。 |
| 主要変更点は？ | タスク作成・フィルター・完了ハイライトの UX が向上し、トースト通知で結果が分かりやすくなります。 |

### リリースノート（ドラフト）
- **日付**: 2025-11-XX
- **タイトル**: Next.js ベースのタスク管理 UI を正式リリース
- **概要**:
  - `/tasks` で新しい React/Next.js UI を提供開始。
  - タスク作成・削除・ステータス更新時にトースト通知と完了ハイライトを追加。
  - フィルター UI を折りたたみ式に刷新し、URL クエリと連動するよう改善。
  - Playwright スモーク + Slack 通知による監視体制を整備。
- **既知の注意点**:
  - 旧 UI の `/public/index.html` は 1 週間の並行運用後に廃止予定。
  - 追加のご要望はプロダクトボードもしくは Slack #product-feedback で受け付けます。

### 送付・告知チャネル
- 社内 Slack `#general`（前日アナウンス + 当日完了報告）
- 社外顧客の場合はメール（Support チーム経由）
- ドキュメント更新（README、社内 wiki）
- Cutover 後にリリースノートを公開し、FAQ リンクを添付

### 運用メモ
- アナウンス文・FAQ・リリースノートの最新版は `docs/migration/phase4.md` を参照。
- 配信前に PM / CX チームでレビューし、日付とサポート窓口を最新化する。
- Cutover 完了後 24 時間以内に「リリース完了」メッセージを Slack/メールで配信する。

## Cutover 後検証チェックリスト（2025-11-02）

| カテゴリ | チェック項目 | 詳細 | 担当 |
| --- | --- | --- | --- |
| 機能スモーク | タスク作成・削除・編集 | Playwright `next-smoke` を再実行し、Slack 通知が成功したことを記録。 | QA |
| 機能スモーク | フィルター＆並び替え | `/tasks` 上でタグ・ステータス・詳細フィルターと並び替えを手動確認。 | QA |
| UX | トースト通知・完了ハイライト | 通知メッセージとハイライトが正しく表示されるか、主要ブラウザ（Chrome/Edge/Safari）で確認。 | Product/Design |
| アクセシビリティ | キーボード操作 / スクリーンリーダー | Tab 操作で全 UI がアクセスできるか、ARIA ラベルが正しいかを簡易チェック。 | Product/Design |
| パフォーマンス | Web Vitals (LCP / TTI) | Lighthouse スモークを `/tasks` で実行し、LCP < 2.5s, TTI < 5s を確認。 | Dev |
| パフォーマンス | API レイテンシ | Render/Grafana のダッシュボードで `/api/tasks` の p95 レイテンシが正常範囲に収まるか確認。 | DevOps |
| SEO / リンク | canonical / robots / sitemap | Next.js で生成されるメタタグが旧 UI と同等か、Broken Link がないかを `npm run lint:links` (任意) でチェック。 | Dev |
| ログ | エラーログ確認 | Cutover 後 1 時間の Express/Next.js ログを確認し、新規エラーがないか調査。 | DevOps |
| サポート | 問い合わせ状況 | Support チケット・Slack #support の投稿をモニタリングし、重大インシデントがないか報告。 | CX |

### 実施ルール
- 上記チェックは Cutover 完了後 30 分以内に開始し、2 時間以内に結果を共有（Slack #cutover-report）。
- 各担当はチェック完了後に ✅ を記入し、問題があれば Runbook のロールバック判断フローに従う。
- チェック結果は Jira / GitHub Discussion などにまとめ、KPT フィードバックをフェーズ5に持ち越す。
