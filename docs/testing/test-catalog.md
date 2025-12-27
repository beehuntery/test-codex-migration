# テスト項目一覧

最終更新日: 2025-12-25

本書では現在リポジトリに存在する自動テストを種別ごとに列挙し、カバレッジの概要と確認ポイントを整理する。
（注）API は Next.js Route Handlers に統合済み。レガシー Express UI は廃止済みのため、関連シナリオは削除または skip に移行。

## ユニットテスト (Vitest)

| ファイル | テストケース | 主な検証対象 |
| --- | --- | --- |
| `src/tasks/task-filters.test.ts` | - `normalizes swapped date ranges`<br>- `extracts the date portion from ISO strings with time`<br>- `matches created/updated date ranges against ISO timestamps`<br>- `ignores invalid statuses when parsing` | タスク一覧フィルター用ユーティリティ（期間正規化、ISO 日付抽出、ステータス解析）が境界値でも正しい結果を返すことを確認。 |
| `src/frontend/drag-utils.test.ts` | - `ポインタが全要素の下側にある場合は null を返す`<br>- `ポインタが最上段より上にある場合は先頭要素を返す`<br>- `1番目と2番目/2番目と3番目の間にある場合は該当要素を返す` | `findInsertTarget` によるドラッグ挿入位置計算がリスト全域の境界ケースで正確に判定されること。 |
| `src/frontend/animate-reorder.test.ts` | - `FLIP の変換指示を適用してインラインスタイルをリセットする`<br>- `prefers-reduced-motion が有効な場合はアニメーションをスキップする` | `animateReorder` が FLIP アニメーションの適用→リセット、およびメディアクエリによるアニメーション抑制を正しく処理すること。 |
| `src/server/storage/prismaStore.monitoring.test.ts` | - `リトライ可能なエラーを再試行してメトリクスを記録する`<br>- `設定した閾値を超える低速クエリを記録する` | Prisma ベースのデータストアで、リトライ制御と低速クエリ監視用メトリクスの更新ロジックが機能すること。 |

## 統合テスト (Vitest)

| ファイル | テストケース | 主な検証対象 |
| --- | --- | --- |
| `src/server/storage/jsonStore.test.ts` | - `タスク作成時に順序とタグが正規化される`<br>- `指定したフィールドのみ更新され未指定項目は保持される`<br>- `並び替え API でタスク順が意図通りに更新される` | 一時ディレクトリ上の JSON ストアを通じて、永続化・更新・並び替えの挙動とスキーマ整合性を検証。 |
| `src/server/index.test.ts` | - `共有スキーマに沿ったタスクを作成し取得できる`<br>- `タグ API が共有スキーマに従って検証される` | Express API と Zod スキーマの整合性、タグバリデーション、エラーレスポンスのフォーマットを Supertest 経由で確認。 |

## 静的回帰チェック

| ファイル | テストケース | 主な検証対象 |
| --- | --- | --- |
| `src/frontend/app-dnd.test.ts` | - `dragover 処理で隣接する要素と入れ替えるかを確認する` | ビルド済み `public/app.js` にドラッグ＆ドロップに必要な DOM API 呼び出し・リクエスト配線が残っているかを静的に検証。 |

## E2E テスト (Playwright)

| ファイル | シナリオ | 主な確認ポイント |
| --- | --- | --- |
| `tests/e2e/create-task.spec.ts` | クイック追加 | タイトル必須で作成でき、トースト表示と一覧反映が行われる。 |
| `tests/e2e/quick-add-bulk-undo.spec.ts` | バルク削除 | 追加→チェック→削除で行が消える。選択バーの表示が正しく更新される。 |
| `tests/e2e/reorder-persistence.spec.ts` | 並び替え保持（Alt+Arrow） | Alt+↑/↓ で手動順が更新され、リロード後も保持される。 |
| `tests/e2e/task-reorder-keyboard.spec.ts` | キーボード並び替え | Alt+↑/↓ でタスクの順序が変わる。 |
| `tests/e2e/task-reorder-dnd.spec.mjs` | D&D 並び替え | ドラッグ＆ドロップで順序が変わり、再取得後も維持される。 |
| `tests/e2e/tag-ui.spec.ts` | タグUI | ドロップダウン選択・新規作成（Enter）・連続追加が成立する。 |
| `tests/e2e/keyboard-shortcuts.spec.ts` | キーボード操作 | `/` 検索フォーカス、`L` リストフォーカス、`j/k` 移動、`Shift+j` 範囲拡大、`S` ステータス巡回。 |
| `tests/e2e/status-extended.spec.ts` | ステータス拡張 | `waiting` / `pending` がドロップダウンで選択できる。 |
| `tests/e2e/layout.spec.ts` | レイアウト回帰 | ヘッダと1行目が重ならず、行高が過剰に肥大化しない。 |
| `tests/e2e/inline-edit.spec.ts` | インライン編集 | タイトル編集時に行選択が暴発せず、入力が反映される。 |
| `tests/e2e/due-date.spec.ts` | 期限編集 | 期限を編集して表示（MM/DD）が更新される。 |
| `tests/e2e/notifications.spec.ts` | 通知フロー | ステータス更新のトースト表示と完了時ハイライトが機能する。 |
| `tests/e2e/tag-editor.spec.ts` | タグ削除 | タグ削除操作が反映され、コンソールエラーが出ない。 |
| `tests/e2e/tag-persistence.spec.ts` | タグ永続化 | タグ削除がAPIとリロード後に保持される。 |
| `tests/e2e/simple.spec.mjs` | ハーネス健全性 | Playwright 実行環境の健全性確認。 |


### 補足
- `tests/e2e/global-setup.ts` は E2E 実行前に `/tasks` へウォームアップフェッチを行い、Next.js dev サーバー立ち上がりの揺らぎを吸収する。
- `tests/e2e/utils.ts` はタスク生成ヘルパーや `gotoTasks()` などを共通化し、外部サーバー利用時の遷移揺らぎを吸収している。
