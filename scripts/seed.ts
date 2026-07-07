import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();
import { faker } from '@faker-js/faker/locale/ja';
import { DataSource } from 'typeorm';
import { GameResultEntity } from '../src/entities/game-result.entity';
import { GameEntity } from '../src/entities/game.entity';
import { LeaguePlayerEntity } from '../src/entities/league-player.entity';
import { LeagueEntity } from '../src/entities/league.entity';
import { PlayerEntity } from '../src/entities/player.entity';

const DB_CONFIG = {
  type: 'postgres' as const,
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  username: process.env['DB_USERNAME'] ?? 'jantrack',
  password: process.env['DB_PASSWORD'] ?? 'jantrack',
  database: process.env['DB_DATABASE'] ?? 'jantrack',
  entities: [PlayerEntity, LeagueEntity, LeaguePlayerEntity, GameEntity, GameResultEntity],
  synchronize: false,
};

const LEAGUE_COUNT = 10;
const PLAYERS_PER_LEAGUE = 20;
const GAMES_PER_LEAGUE = 300;
const TOTAL_RAW_SCORE = 100_000;

function sampleRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy.slice(0, n);
}

function generateRawScores(): [number, number, number, number] {
  // 正規分布近似で4人分生成し、合計100,000に正規化して100点単位に丸める
  const gaussians = Array.from({ length: 4 }, () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  });

  const sum = gaussians.reduce((a, b) => a + b, 0);
  // 平均25000, 標準偏差約8000で正規化
  const scaled = gaussians.map((g) => 25000 + ((g - sum / 4) * 8000));
  // 100点単位に丸め
  const rounded = scaled.map((s) => Math.round(s / 100) * 100);
  // 合計を100,000に合わせ、誤差は1位(最高点)に寄せる
  const roundedSum = rounded.reduce((a, b) => a + b, 0);
  const diff = TOTAL_RAW_SCORE - roundedSum;

  const sorted = [...rounded].sort((a, b) => b - a);
  sorted[0] = (sorted[0] ?? 0) + diff;

  return sorted as [number, number, number, number];
}

function calcPoint(
  rawScore: number,
  rank: number,
  returnPoint: number,
  umaSmall: number,
  umaBig: number,
  oka: number,
): number {
  const umaMap: Record<number, number> = { 1: umaBig, 2: umaSmall, 3: -umaSmall, 4: -umaBig };
  const base = (rawScore - returnPoint) / 1000 + (umaMap[rank] ?? 0);
  const okaBonus = rank === 1 ? oka : 0;
  return Math.round((base + okaBonus) * 10) / 10;
}

async function main(): Promise<void> {
  const dataSource = new DataSource(DB_CONFIG);
  await dataSource.initialize();
  console.log('Connected to database');

  // 冪等: 全テーブルtruncate
  await dataSource.query(
    'TRUNCATE game_results, games, league_players, leagues, players RESTART IDENTITY CASCADE',
  );
  console.log('Truncated all tables');

  const playerRepo = dataSource.getRepository(PlayerEntity);
  const leagueRepo = dataSource.getRepository(LeagueEntity);
  const leaguePlayerRepo = dataSource.getRepository(LeaguePlayerEntity);
  const gameRepo = dataSource.getRepository(GameEntity);
  const gameResultRepo = dataSource.getRepository(GameResultEntity);

  // グローバルプレイヤープール(リーグをまたいで同じプレイヤーを共有)
  const totalUniquePlayers = LEAGUE_COUNT * PLAYERS_PER_LEAGUE;
  const playerEntities = await playerRepo.save(
    Array.from({ length: totalUniquePlayers }, () =>
      playerRepo.create({ name: faker.person.fullName() }),
    ),
  );
  console.log(`Created ${playerEntities.length} players`);

  for (let li = 0; li < LEAGUE_COUNT; li++) {
    const league = await leagueRepo.save(
      leagueRepo.create({
        name: `${faker.location.city()}リーグ Season ${li + 1}`,
        umaSmall: 10,
        umaBig: 30,
        oka: 20,
        startPoint: 25000,
        returnPoint: 30000,
      }),
    );

    // このリーグの参加プレイヤー20人
    const leaguePlayers = playerEntities.slice(
      li * PLAYERS_PER_LEAGUE,
      (li + 1) * PLAYERS_PER_LEAGUE,
    );

    await leaguePlayerRepo.save(
      leaguePlayers.map((p) => leaguePlayerRepo.create({ leagueId: league.id, playerId: p.id })),
    );

    // 半荘300回
    const baseDate = faker.date.past({ years: 1 });
    const gameResultsBatch: Partial<GameResultEntity>[] = [];

    for (let gi = 0; gi < GAMES_PER_LEAGUE; gi++) {
      const playedAt = new Date(baseDate.getTime() + gi * 30 * 60 * 1000); // 30分刻み
      const game = await gameRepo.save(
        gameRepo.create({ leagueId: league.id, playedAt, tableNo: gi + 1 }),
      );

      const fourPlayers = sampleRandom(leaguePlayers, 4);
      const rawScores = generateRawScores();

      fourPlayers.forEach((player, idx) => {
        const rank = idx + 1;
        const rawScore = rawScores[idx] ?? 25000;
        const point = calcPoint(
          rawScore,
          rank,
          league.returnPoint,
          league.umaSmall,
          league.umaBig,
          league.oka,
        );
        gameResultsBatch.push(
          gameResultRepo.create({ gameId: game.id, playerId: player.id, rank, rawScore, point }),
        );
      });

      // バッチ挿入(500件ごと)
      if (gameResultsBatch.length >= 500) {
        await gameResultRepo.save(gameResultsBatch.splice(0, 500));
      }
    }

    if (gameResultsBatch.length > 0) {
      await gameResultRepo.save(gameResultsBatch);
    }

    console.log(`League ${li + 1}/${LEAGUE_COUNT}: "${league.name}" seeded`);
  }

  await dataSource.destroy();
  console.log('Seed completed successfully');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
