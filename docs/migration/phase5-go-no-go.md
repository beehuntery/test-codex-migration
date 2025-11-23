# フェーズ5 Go / No-Go チェックリスト

## 目的
本番切替前に、必要条件が満たされているかを客観的に判断するためのチェックリスト。

## 判定方法
- 全チェックが ✅ なら **Go**。1つでも未完なら **No-Go** とし、対処計画を明記して再判定。
- 判定者: TL（バックアップ: PM）。記録はこのファイルに残す。

## 前提確認
- [x] リリース対象コミット/タグ: v0.0.7
- [x] 判定日時 (UTC/JST): 2025-11-23T09:05Z / 2025-11-23T18:05 JST
- [x] 判定者: TL（仮）
- [x] 連絡チャネル（Slack/Issue）周知済み

## 技術条件
- [x] Start Command (stg/prd) が `npm run start:render-safe` である
- [x] Prisma マイグレーションが本番適用済み（`20251122134157_create_tag_to_task` を含む）
- [x] Render Deploy Hook（Express/Next）キー・URLが Secrets/Env にセット済み
- [x] GitHub Actions `Deploy Production` が直近の実行で成功（v0.0.7 作成済み／環境承認後デプロイ完了）
- [x] Playwright E2E 主要3シナリオ：ステージング/ローカル運用とし、本番直叩きは不要（必要時のみ実施）
- [x] スモーク `/api/health`, `/api/tasks` GET/POST が本番で成功

## 運用・リスク
- [x] 監視手順（Render ログ + Uptime/エラーレート）が Runbook に記載
- [x] Playwright 失敗時の調査フロー（Render ログ突合）が Runbook に記載
- [x] ロールバック手順（直前タグへ Deploy Hook 再実行）が更新済み
- [x] コミュニケーションプラン（通知テンプレ、連絡先）が準備済み

## データ/リリース管理
- [x] 本番で `db push`/`migrate:json` が走らない設定になっている（`start:render-safe` のみ）
- [x] 初期データ投入: 不要と判断（既存データ維持。必要時は手動で限定投入）
- [x] タグ作成/入力フロー（SemVer）の運用が決定し、対象タグが発行済み（v0.0.7 最新）
- [x] リリースノート（Release Drafter 等）が準備済み（v0.0.7 公開）

## 判定結果
- [x] **Go** / [ ] **No-Go**
- 備考・アクション:
  - 本番/ステージング Start Command `start:render-safe` 固定済み。
  - 本番マイグレーション最新（`20251122134157_create_tag_to_task`）、デプロイ v0.0.7 完了。
  - Playwright 本番直叩きは不要方針。必要時のみ URL 切替で実施。
