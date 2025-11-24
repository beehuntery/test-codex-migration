# 回答形式
以下の項目を含める。
```md
## 現在のフェーズ
## 現在のマイルストーン
## 今回の作業内容
## 確認手順
## 次回の作業内容
```

# ドキュメント
- 索引: ./docs/index.md
- ドキュメント追加が必要なときは、`./docs/` 配下に適切なディレクトリを作成してください。

# ディレクトリ構成
- `./data/` : タスクとタグのJSONデータソース（`tasks.json`, `tags.json`）。
- `./public/` : クライアント向けの静的アセット（`index.html`, `app.js`, `styles.css`）。
- `./node_modules/` : NPM依存パッケージ（自動生成のため編集不可）。
- `./server.js` : バックエンドのエントリーポイント。
- `./package.json` / `./package-lock.json` : プロジェクト設定と依存関係定義。

# 開発ルール

## Git/GitHub運用方針
**対象**: 3〜10名の開発チーム  
**目的**: 速く安全に出荷するための最小で強いルールを統一する

---

### 0. 原則（TL;DR）
- **Trunk-Based（GitHub Flow）**：`main` は常にデプロイ可能。短命ブランチ（1〜3日）で開発し PR で統合する。
- **保護された `main`**：レビュー必須＋CI必須チェック合格でのみ **Squash Merge**。履歴は **linear**。
- **自動化**：PR/`main` で **lint/test/build** を実行。`main`→stagingは自動、productionは承認付き。
- **リリース**：**SemVer タグ**（`vMAJOR.MINOR.PATCH`）で出荷。必要時のみ短命 `release/` ブランチ。
- **セキュリティ**：2FA、CodeQL、Secret/Dependabot/Tag保護を既定で有効化。
- **記法**：**Conventional Commits**。小さく早く出す（PRは小粒）。

---

### 1. リポジトリ設定（MUST）
- **Branch protection（`main`）**
  - Reviews: **≥1**（可能なら CODEOWNERS 必須）
  - Required status checks: `lint` / `test` / `build`（必要なら `coverage`/`e2e`）
  - **Require up‑to‑date branch** / **Linear history** / **Force‑push 禁止**
  - Merge方式: **Squash only**（merge-commit OFF、rebaseは任意）
- **Tag protection**: `v*` を保護（上書き禁止）
- **Security & Compliance**
  - Org/Repo：**2FA 必須**
  - **Secret scanning** / **Dependabot alerts & updates** / **CodeQL code scanning** ON
  - 署名付きコミット推奨（Verified）
- **Hygiene**：マージ後ブランチ自動削除、`.editorconfig`/`.gitattributes`/`.gitignore`、`README`/`CONTRIBUTING`/`SECURITY`/`LICENSE`

---

### 2. ブランチ & コミット規約（MUST）
- **命名**：`feature/{issue#}-{desc}` / `fix/{issue#}-{desc}` / `chore/{desc}` / `hotfix/{desc}` / （必要時）`release/{YYYY-MM-DD|version}`
- **更新方針**：`main` を頻繁に取り込み（`rebase origin/main` 推奨）
- **Conventional Commits**
  - 例: `feat: …` / `fix(scope): …` / `chore(deps): …` / 破壊的変更は `feat!:` か本文に `BREAKING CHANGE:`

---

### 3. 日々のフロー（SHOULD）
1. Issue 起票 → ブランチ作成 → 小さく実装（1〜3日）
2. ローカルで `lint`/`test` 通過 → **Draft PR** で早期共有
3. 完成で Ready → 説明・スクショ・テスト・**リスク/ロールバック**をPRに記載
4. **CI合格 & レビュー ≥1** → **Squash Merge**（PRタイトル＝最終コミット）
5. `main` マージで **staging 自動デプロイ**。production は承認経由で昇格

---

### 4. PR ルール（MUST）
- **小粒**：差分目安 ≤ ~400 LOC。WIP は **Draft** で出す
- **テンプレ必須**：目的 / 変更点 / 動作確認 / テスト / リスク&ロールバック / `Fixes #123`
- **レビュー SLA**：当日中（遅くとも翌営業日）

---

### 5. CI/CD（MUST）
- **CI トリガ**：`pull_request` と `push`（`main`）
- **必須チェック**：`lint` / `test` / `build`（型/依存監査/簡易e2e は必要に応じ追加）
- **CD**：
  - `main` → **staging 自動**
  - production → **workflow_dispatch + Environment 承認（Required reviewers, Secrets）**
- **並列安全**：同一 ref のジョブは `concurrency` で取消し（cancel‑in‑progress）

---

### 6. リリース & ロールバック（MUST）
- **基本**：`main` の安定状態に **タグ付け**（`vX.Y.Z`）→出荷。Releaseノートはコミット/PRから自動生成
- **安定化が必要な週**：短命 `release/…` を切り Hotfix のみ許可、完了後 `main` にマージバック
- **Hotfix**：`hotfix/…` を最優先でPR→タグ出荷
- **ロールバック**：直近タグを再デプロイ or `git revert`（マージは `-m 1`）

---

### 7. セキュリティ & 権限（MUST）
- 最小権限：外部コントリビュータは **fork→PR**
- 機密は **Actions Secrets / Environments** へ。**秘匿情報はコミット禁止**（露出時は revoke＋履歴除去）
- 依存は **Dependabot**（週次以上）で更新
- 大きなバイナリは **Git LFS**

---

### 8. ラベル & CODEOWNERS（SHOULD）
- **ラベル例**：`type: feature|bug|chore|docs` / `area: frontend|backend|infra` / `priority: p0|p1|p2`
- **CODEOWNERS** で自動アサイン（例：`/frontend/ @org/frontend-team`、`* @org/tech-leads`）

---

### 9. 非推奨（DON’Ts）
- 長命ブランチ／大規模PR／未検証の直接 `main` push
- 秘密情報のコミット／未レビューの本番デプロイ
- 無秩序なタグ付け（`v*` 以外の出荷タグ）

---

### 10. 例外処理
- 緊急時のみ Tech Lead が保護設定の一時緩和を承認。事後に**必ず**振り返り＆再発防止を記録


## テスト駆動開発方針
**目的**  
変更容易性と回帰防止を最小コストで担保する。TDDは「設計の進め方」として適用。

**適用範囲（優先度順）**  
1) ドメインロジック/変換/検証 2) 公開API/SDK 3) サービス境界（契約テスト）  
UI/探索的実装はスパイク可（後で要テスト化）。

**基本サイクル**  
Red → Green → Refactor（最小実装でGreen、設計はRefactorで整える）。

**テスト構成（目安）**  
- ユニット:統合:契約/E2E ≈ 70:20:10  
- “速いテストを多数、遅いテストは要点のみ”

**モック指針**  
外部境界（DB/HTTP/メッセージング）のみ。内部詳細への過度なモック禁止。

**不安定要素の扱い**  
時刻/乱数/並行は抽象化して差し替え可能に。プロパティベーステストは変換系で検討。

**レガシー対応**  
現状仕様は特性テストで固定 → 以降TDDで小刻みに改善。

**命名/書式**  
振る舞いベース命名＋AAA（Arrange-Act-Assert）。テストは実行可能な仕様として読む。

**CIゲート**  
- 全テスト緑＋フレーク0（連続2回）  
- カバレッジ閾値（例）行80%/分岐60%（数値より重要経路の網羅を優先）  
- テスト実行時間予算を超えたら分割/高速化。

**DoD（機能完了の定義）**  
主要ユースケースの上位テスト1本以上＋コアロジックのユニットTDD＋外部I/Oの契約テスト。

**計測/改善**  
欠陥率・変更当たりのテスト修正量・実行時間・フレーク率を定点観測し、四半期ごとに調整。

## 許可不要のコマンド
- 参照コマンド
  - 例: `gh run view`, `gh run list`, `gh run watch` など
