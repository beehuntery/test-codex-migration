# API 仕様（現行 / フェーズ5時点）

## ベースURL
- ステージング: `https://test-codex-migration-stg.onrender.com`
- 本番: `https://test-codex-migration-prd.onrender.com`

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
    "dueDate": "2025-11-30T00:00:00.000Z" | null,
    "createdAt": "ISO string",
    "updatedAt": "ISO string" | null,
    "order": 0,
    "tags": ["tagId", ...]
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
  "tags": ["tag-id-1"]        // 任意
}
```

**レスポンス 201**: 作成された Task オブジェクト

**バリデーションエラー 400**
- title が空/非文字列
- status が `todo|in_progress|done` 以外
- dueDate が無効日付

### PATCH /api/tasks/reorder
タスクの並び順を更新。

**リクエスト例**
```json
{
  "orderedIds": ["task-id-1", "task-id-2", ...]
}
```

**レスポンス 200**: 並び替え後の Task 配列

### GET /api/tags
タグ一覧を取得。

**レスポンス 200**
```json
[
  { "id": "uuid", "name": "tag", "createdAt": "ISO", "updatedAt": "ISO|null" }
]
```

## エラーレスポンスの例
```json
{
  "error": "Task title is required."
}
```
HTTP ステータス: 400 / 404 / 500 など実装に準拠。

## 今後の変更予定（フェーズ6）
- API を Next.js Route Handlers へ統合（エンドポイントは同一を維持予定）。
- データストアを Postgres へ移行。
- （必要に応じて）認証/認可を追加検討。
