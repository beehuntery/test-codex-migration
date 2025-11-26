# テスト項目一覧

最終更新日: 2025-11-25

本書では現在リポジトリに存在する自動テストを種別ごとに列挙し、カバレッジの概要と確認ポイントを整理する。
（注）API は Next.js Route Handlers に統合済み。`legacy-parity` E2E シナリオのみ、Express 停止までバックワード互換を確認する目的で残している。

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
| `tests/e2e/create-task.spec.ts` | Create task form | タスク作成フォームで入力した内容がリストに即時表示される。 |
| `tests/e2e/delete-task.spec.ts` | Task delete button | 削除確認ダイアログを経てタスクが UI から除去される。 |
| `tests/e2e/due-date.spec.ts` | Task due date editor | 期限入力の変更が表示書式 (YYYY/MM/DD) で反映される。 |
| `tests/e2e/status-toggle.spec.ts` | Task status toggle | ステータストグル操作で `todo → 進行中 → 完了` と遷移する。 |
| `tests/e2e/tag-editor.spec.ts` | Task tag editor | タグ削除操作が UI とバックエンドで整合し、コンソールエラーが発生しない。 |
| `tests/e2e/task-filters.spec.ts` | Task advanced filters | 詳細フィルターでキーワード・期限による絞り込み／リセットができる。 |
| `tests/e2e/filters-combination.spec.ts` | Combined task filters | タグ・ステータス・キーワード・期限フィルターを組み合わせて適用し、URL パラメーターと結果が同期する。 |
| `tests/e2e/notifications.spec.ts` | Task notifications | タスク追加・状態変更時のトースト表示と完了ハイライトが正しく動作する。 |
| `tests/e2e/task-reorder.spec.mjs` | Drag & drop reorder persistence | HTML モック環境でのドラッグ＆ドロップ順序が API フェッチとリロード後も維持される。 |
| `tests/e2e/task-reorder-keyboard.spec.ts` | Keyboard-based reorder | `Alt + Arrow` によるキーボード並び替えが反映され、順序が戻せる。 |
| `tests/e2e/legacy-parity.spec.ts` | Legacy UI parity | Next.js UI で行った更新が Express ベースのレガシー UI へ反映される。 |
| `tests/e2e/simple.spec.mjs` | Harness sanity check | Playwright テスト基盤が最低限動作することの確認。 |

### 追加で整備する予定のシナリオ（QA/UX改善）
- Tag edit persistence: タグ追加・削除を行い、再読み込み後も反映されることを確認
- Combined filters + reorder persistence: 複合フィルター適用後に並び替えし、再取得後も順序・フィルター結果が維持されること
- Notification UX: タスク完了時のトースト表示とアクセシビリティ（フォーカス戻し）を検証


### 補足
- `tests/e2e/global-setup.ts` は E2E 実行前に `/tasks` へウォームアップフェッチを行い、Next.js dev サーバー立ち上がりの揺らぎを吸収する。
- `tests/e2e/utils.ts` にはタスク生成ヘルパー・コンソールエラートラップなど、複数シナリオで共通利用するユーティリティを集約している。

## 未整備・今後の検討
- Prisma ストアに対する実データベース統合テスト（現在はモックベースの監視ロジック検証のみ）。
- フロントエンドのアクセシビリティ回帰（キーボード操作以外のフォーカス管理など）の自動化。
- モバイル UI に関する E2E シナリオ追加。
