# Phase6 API Migration Plan (Express -> Next.js Route Handlers)

> 進捗管理はフェーズ6 WBS（`phase6.md`）を主とし、本ドキュメントは手順詳細とサブチェックリストとして扱う。

## 対象エンドポイント
- `/api/health`
- `/api/tasks` (GET, POST)
- `/api/tags` (GET)
- `/api/tasks/reorder` (PATCH) ※存在する場合を想定

## 進め方（段階移行）
1. **Health から移行**
   - apps/web/app/api/health/route.ts を追加し、`serviceId`, `serviceName`, `nodeEnv`, `timestamp` を返却。
   - Express の `/api/health` は残しつつ stg で Next.js 側を優先的に叩く設定で確認。
2. **Read 系 (GET tasks/tags) を移行**
   - Route Handlers で Prisma 呼び出しを実装（現行の Prisma クライアントを共有）。
   - `NEXT_PUBLIC_API_BASE_URL` を Next.js サービスに向けることでフロントが新APIを利用。
   - stg で整合性確認後、Express 側 read を廃止。
3. **Write 系 (POST tasks, PATCH reorder) を移行**
   - バリデーションは既存スキーマ（TaskCreateInput 等）を再利用。
   - 競合防止のため stg で一時的に書き込み先を Next.js に固定、データ整合を確認。
4. **Express 停止**
   - Render 本番・stg の Start Command を Next.js サービスのみで起動する形に変更。
   - Express サービスは最終的に停止または削除（ロールバック手順で復活可能にしておく）。

## 技術メモ
- Next.js Route Handlers で Prisma を使う場合は、`apps/web` 直下に `lib/prisma.ts` を設けてクライアントを singleton 化。
- 共通型/スキーマは `src/server/types` から `apps/web` へ移設または共有パッケージ化を検討。
- CORS/同一ドメイン化: `NEXT_PUBLIC_API_BASE_URL` を Next.js サービス自身の URL に設定し、フロントとAPIを同一オリジンに。

## ロールバック方針
- 各段階で Express ルートは一時残存させ、環境変数で Next.js / Express の切替を可能にする。
- デプロイごとに切替スイッチを持つことで、問題発生時に Express に即時戻せる。

## 残タスク（抜粋：進捗は phase6.md と同期）
- [x] apps/web に Prisma クライアントの共有実装を追加
- [x] `/api/health` Route Handler 実装（stg確認含む）
- [ ] `/api/tasks` GET/POST Route Handler 実装（バリデーション移植、stgで整合確認）
- [ ] `/api/tags` GET Route Handler 実装（stg確認）
- [ ] `/api/tasks/reorder` Route Handler 実装（存在する場合）
- [ ] `NEXT_PUBLIC_API_BASE_URL` を Next.js サービスに向けるデプロイ設定（stg → prd）
- [ ] Express 停止手順/ロールバック手順を Runbook に記載し、stgで演習
