# Release Notes (Draft)

## 最新デプロイ (2025-12-07, v0.0.8)
- Next.js Route Handlers へ完全移行（/api/health, /api/tasks, /api/tags, /api/tasks/:id, /api/tasks/reorder）
- Prisma datasource を Postgres に切替
- Express サービスを stg/prd とも Suspend（ロールバックで Resume 可）
- UI/UX P1 改善完了（typedRoutes 警告解消、トーストA11y、並び替えヘルプ、空状態スケルトン、タグ削除トースト）
- ログ出力強化：POST /api/tasks でエラーを `console.error` に出力

## 既知事項
- 本番は stg Postgres を暫定共用中（Free プラン制約）。stg でのデータ操作は prod に影響するため、テスト運用を制限すること。

## ロールバック
- DeployHook で前タグを再デプロイ（`scripts/rollback.sh` 参照）
- DATABASE_URL を旧設定に戻して再デプロイ
- Express を Resume（Suspend 解除）することで旧経路に戻す

## 今後の改善候補
- 本番専用 Postgres（Starter 以上）への移行
- Playwright 本番短縮版の自動スモーク
- ログ監視の自動化（現状手動フィルタ）
