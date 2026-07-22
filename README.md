# 雀Track (jantrack)

麻雀リーグ成績管理 API — OpenTelemetry 技術記事用デモアプリ

GraphQL の N+1 問題を**意図的に含んだ状態**で構築しています。後工程で OpenTelemetry による計測・DataLoader による修正を行う題材として使います。

## 技術スタック

- **NestJS** (code-first GraphQL)
- **@nestjs/graphql** + **Apollo Driver**
- **TypeORM** + **PostgreSQL 16**
- TypeScript strict mode

---

## 起動手順

### 1. PostgreSQL を起動

```bash
docker compose up -d
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. `.env` を用意

```bash
cp .env.example .env
# 必要に応じて編集
```

### 4. マイグレーション実行

```bash
npm run migration:run
```

### 5. シードデータ投入

```bash
npm run seed
```

リーグ 10 × プレイヤー 20 人 × 半荘 300 回 = GameResult 12,000 行 が作成されます。

### 6. アプリ起動

```bash
npm run start:dev
```

GraphQL Playground: http://localhost:3000/graphql

---

## 動作確認用サンプルクエリ

### ① リーグ結果ページ（集計 N+1 + プレイヤー別結果 N+1 が発生）

```graphql
query LeagueStandings($id: ID!) {
  league(id: $id) {
    name
    standings {
      player { id name }
      totalGames
      totalPoint
      avgRank
      topRate
      lastRate
      results {
        rank
        point
        game { playedAt }
      }
    }
  }
}
```

### ② 対局履歴（ネスト N+1 が発生）

```graphql
query LeagueGames($id: ID!) {
  league(id: $id) {
    games(limit: 50) {
      playedAt
      tableNo
      results {
        rank
        rawScore
        point
        player { name }
      }
    }
  }
}
```

### ③ 個人成績ページ（軽いクエリ。比較用）

```graphql
query PlayerDetail($id: ID!) {
  player(id: $id) {
    name
    recentResults(limit: 20) {
      rank
      point
    }
  }
}
```

### ④ ①+② の合体版（計測デモ用の最重クエリ）

```graphql
query LeagueFull($id: ID!) {
  league(id: $id) {
    name
    standings {
      player { id name }
      totalGames
      totalPoint
      avgRank
      topRate
      lastRate
      results {
        rank
        point
        game { playedAt }
      }
    }
    games(limit: 50) {
      playedAt
      tableNo
      results {
        rank
        rawScore
        point
        player { name }
      }
    }
  }
}
```

> ④ を 1 回実行すると、standings（プレイヤー 20 人×集計 + 20 人×results 取得 + 全 result の game 取得）+ games 50 件×results + results 200 件×player で **数千本の SQL** が発行されます。

---

## 意図的に仕込んでいた N+1（DataLoader で解消済み）

記事執筆時は下記 5 箇所を N+1 のまま放置していましたが、現在は `LeagueLoaders`（`src/league/league.loaders.ts`）による DataLoader 化で解消しています。`before-dataloader` タグに未修正時点のコードを残しています。

| 箇所 | 内容 |
|---|---|
| `League.standings` | プレイヤー 1 人ずつ集計クエリ（SUM/AVG/COUNT）を発行 → `aggregateByLeaguePlayer` でバッチ化 |
| `Standing.results` | プレイヤー 1 人ずつ対局結果を `find` で取得 → `resultsByLeaguePlayer` で IN 句 1 本に |
| `Game.results` | Game ごとに `find({ where: { gameId } })` を発行 → `resultsByGameId` で IN 句 1 本に |
| `GameResult.player` | GameResult ごとに `findOne` を発行 → `playerById` でキャッシュ込みバッチ化 |
| `GameResult.game` | GameResult ごとに `findOne` を発行 → `gameById` でキャッシュ込みバッチ化 |

---

## ディレクトリ構成

```
jantrack/
├── docker-compose.yml
├── migrations/          # TypeORM マイグレーション
├── scripts/
│   └── seed.ts          # npm run seed
└── src/
    ├── app.module.ts
    ├── main.ts
    ├── database/
    │   └── data-source.ts
    ├── entities/        # TypeORM エンティティ
    ├── graphql/models/  # GraphQL ObjectType
    ├── player/          # Player モジュール
    └── league/          # League / Game / GameResult モジュール
```
