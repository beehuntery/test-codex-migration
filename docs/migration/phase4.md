# フェーズ4: 開発体制整備

- ステータス: ✅ 完了 (2025-11-02)
- 目的: Next.js / Express 並行稼働の Cutover Plan を確立し、テスト・CI/CD 体制を統合して本番移行に備える。

## ドキュメント
- [フェーズ4 補助ドキュメント集](./phase4-runbook.md)

## マイルストーン
- **M4.1: Runbook Draft** – 完了。Cutover 計画とロールバック手順は補助ドキュメントを参照。
- **M4.2: Unified CI** – 完了。GitHub Actions（Slack 通知・Summary）を整備。
- **M4.3: Legacy Sunset** – 完了。`public/` 資産の棚卸しと削除計画を策定。
- **M4.4: Comms Ready** – 完了。アナウンス文／FAQ／リリースノート草案を準備。

## バックログ概要
- 進捗や作業項目の一覧は補助ドキュメント「バックログ詳細」を参照。（フェーズ4で着手したタスクはすべて完了済み）

## 次のステップ
- フェーズ5「移行とリリース」に向け、Cutover 日程の確定と実運用を進める。
- Storybook / Playwright の追加シナリオ（通知、ReorderList、legacy parity）は実装済み。CI への組み込みとカバレッジ維持をフェーズ5の運用タスクに引き継ぐ。詳細は補助ドキュメントの「Storybook / Playwright シナリオ拡張」を参照。

## 関連ドキュメント
- [フェーズ3: フロントエンド再構築](./phase3.md)
- [技術スタック移行計画 概要](./plan.md)
- [テスト戦略ガイド](../testing/README.md)
