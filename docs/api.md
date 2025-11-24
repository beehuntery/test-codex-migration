# API 仕様（Next.js Route Handlers / フェーズ6）

## ベースURL
- ステージング (Next): `https://test-codex-migration-next-stg.onrender.com`
- 本番 (Next): GitHub Environments で `NEXT_PUBLIC_API_BASE_URL` に設定した URL（同一ドメイン運用。Expressドメインはロールバック用）
- 旧Express: `https://test-codex-migration-stg.onrender.com` / `https://test-codex-migration-prd.onrender.com`（段階的廃止予定）

## 共通事項
- Content-Type: `application/json`
- レスポンス: JSON
- 認証: なし（現状）

## エンドポイント一覧

### GET /api/health
ヘルスチェック。サービス情報を返す。

**レスポンス 200**
```json
{
  "status": "ok",
  "timestamp": "2025-11-23T07:23:39.530Z",
  "nodeEnv": "production",
  "serviceId": "srv-...",
  "serviceName": "test-codex-migration-stg" // Render 環境変数に依存
}
```

### GET /api/tasks
タスク一覧を取得。

**レスポンス 200**
```json
[
  {
    "id": "uuid",
    "title": "string",
    "description": "string",
    "status": "todo|in_progress|done",
    "dueDate": "2025-11-30" | null,
    "createdAt": "ISO string",
    "updatedAt": "ISO string" | null,
    "order": 0,
    "tags": ["tag-name", ...]
  }
]
```

### POST /api/tasks
タスクを作成。

**リクエスト例**
```json
{
  "title": "Write docs",
  "description": "",          // 任意
  "status": "todo",           // 省略時 todo
  "dueDate": "2025-12-01",    // 任意, null可
  "tags": ["frontend", "playwright"]        // 任意
}
```

**レスポンス 201**: 作成された Task オブジェクト

**バリデーションエラー 400**
- title が空/非文字列
- status が `todo|in_progress|done` 以外
- dueDate が無効日付

### GET /api/tasks/:taskId
単一タスクを取得（存在しない場合 404）。

### PATCH /api/tasks/:taskId
タスクを更新（タイトル/説明/ステータス/期限/タグ/並び順）。

**リクエスト例**
```json
{
  "status": "done",
  "tags": ["frontend", "e2e"],
  "dueDate": "2025-12-10"
}
```

**レスポンス 200**: 更新後 Task オブジェクト

### DELETE /api/tasks/:taskId
タスクを削除。レスポンスは削除済み Task。

### PATCH /api/tasks/reorder
タスクの並び順を更新。

**リクエスト例**
```json
{
  "order": ["task-id-1", "task-id-2", ...]
}
```

**レスポンス 200**: 並び替え後の Task 配列

### GET /api/tags
タグ名の配列を取得（昇順）。

**レスポンス 200**
```json
["frontend", "playwright", "qa"]
```

## エラーレスポンスの例
```json
{
  "error": "Task title is required."
}
```
HTTP ステータス: 400 / 404 / 500 など実装に準拠。

## 今後の変更予定（フェーズ6）
- Postgres への切替とスキーマ移行
- 認証/認可の追加検討
