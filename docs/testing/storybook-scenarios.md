# Storybook / Playwright シナリオ拡張メモ (2025-11-02)

## 既存シナリオの棚卸し
| 区分 | ファイル/Story | カバレッジ | 備考 |
| --- | --- | --- | --- |
| Storybook | Tasks/TaskCard / Tasks/TaskDeleteButton / Tasks/Filters/TagFilter | 表示/確認 UI | 通知・状態変化の再現は限定的 |
| Playwright | `tests/e2e/create-task.spec.ts` | タスク作成フォームの成功ケース | 通知の UX 検証は未カバー |
| Playwright | `tests/e2e/status-toggle.spec.ts` | トグル操作によるステータス更新 | 完了ハイライトまでは未確認 |
| Playwright | `tests/e2e/due-date.spec.ts` | 期限更新 | エラー通知などの異常系は未検証 |
| Playwright | `tests/e2e/task-filters.spec.ts` | 詳細フィルター（検索・期限） | タグ/ステータス組み合わせは未カバー |
| Playwright | `tests/e2e/tag-editor.spec.ts` | タグ追加/削除 | 重複タグ・通知表示は未検証 |
| Playwright | `tests/e2e/task-reorder*.spec.*` | 並び替え（ドラッグ/キーボード） | 完了ハイライトとの相互作用は未検証 |

## 追加が必要な Storybook シナリオ
1. **Tasks/Notifications**: トースト種別（success/error/info）と完了ハイライトの連動確認。
2. **Tasks/Filters/CombinedFilters**: タグ・ステータス・詳細フィルターを同時に操作し、URL 更新を可視化。
3. **Tasks/ReorderList**: 完了ハイライト・ドラッグ状態・キーボードソート状態を個別に確認できる Story を追加。
4. **Legacy vs Next.js Diff**: 旧 UI のスクリーンショットを参照できる比較 Story を用意し、削除前の確認用に活用。

## 追加が必要な Playwright シナリオ
1. **notifications.spec.ts**
   - タスク作成・更新・削除・ステータス変更時にトースト通知が表示され、内容が正しいかを検証。
   - 完了ステータスに変更した際、カードにハイライトクラスが付与されることを確認。
   - 事前に `page.on('console')` でエラーがないか監視し、通知実装の退行を検知。
2. **filters-combination.spec.ts**
   - タグ・ステータス・詳細フィルターを組み合わせて SSR された結果が正しいことを確認。
   - URL クエリが想定通り変化し、ブラウザリロード後もフィルター状態が維持されることを検証。
3. **legacy-parity.spec.ts** (任意)
   - `public/index.html` と `/tasks` の主要操作（作成/削除/並び替え）が一致することを比較。
   - Cutover 前のパリティチェックに活用し、旧 UI 削除判断のエビデンスとする。

## 自動化優先度（Phase4）
| 優先度 | シナリオ | 理由 |
| --- | --- | --- |
| 高 | notifications.spec.ts | Cutover 後、通知/完了演出の退行リスクが高いため。 |
| 高 | Storybook: Tasks/Notifications / CombinedFilters | コミュニケーション/設計レビューで必要。 |
| 中 | filters-combination.spec.ts | フィルター機能の複合操作をエンドツーエンドで保証。 |
| 中 | ReorderList Story | 完了ハイライトとドラッグの相互作用確認。 |
| 低 | legacy-parity.spec.ts | 旧 UI 完全削除の判断材料として利用。 |

## 実装メモ
- Playwright の追加シナリオは `tests/e2e/` 配下に新規ファイルを作成。起動コマンドは既存 `playwright.config.ts` の `use.baseURL` と `webServer` 設定を流用できる。
- Storybook のシナリオは `apps/web/app/tasks/_components/` 配下に追加する。通知系は `TaskNotificationProvider` をラップするデコレーターの共通化を検討。
- CI 実行時間を増やさないため、通知シナリオは `@tags=smoke` のようなフィルターで選択的に実行する案を検討する。

