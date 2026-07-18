import { Injectable, Scope } from '@nestjs/common';
import DataLoader = require('dataloader');
import { GameResultEntity } from '../entities/game-result.entity';
import { GameEntity } from '../entities/game.entity';
import { PlayerEntity } from '../entities/player.entity';
import { LeagueService, StandingAggregate } from './league.service';

export interface LeaguePlayerKey {
  leagueId: string;
  playerId: string;
}

const leaguePlayerCacheKey = (key: LeaguePlayerKey): string =>
  `${key.leagueId}:${key.playerId}`;

// 同一リクエスト内のキーはほぼ単一リーグだが、複数リーグが混ざっても壊れないようにリーグ単位でまとめる
const groupByLeague = (keys: readonly LeaguePlayerKey[]): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();
  for (const { leagueId, playerId } of keys) {
    const ids = grouped.get(leagueId);
    if (ids) {
      ids.push(playerId);
    } else {
      grouped.set(leagueId, [playerId]);
    }
  }
  return grouped;
};

// リクエストごとに生成されるDataLoaderの束。
// 同一リクエスト内で発生したloadをtick単位でまとめ、IN句1本のクエリにバッチする。
@Injectable({ scope: Scope.REQUEST })
export class LeagueLoaders {
  constructor(private readonly leagueService: LeagueService) {}

  readonly playerById = new DataLoader<string, PlayerEntity>(async (ids) => {
    const players = await this.leagueService.findPlayersByIds(ids);
    const byId = new Map(players.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id) ?? new Error(`Player not found: ${id}`));
  });

  readonly gameById = new DataLoader<string, GameEntity>(async (ids) => {
    const games = await this.leagueService.findGamesByIds(ids);
    const byId = new Map(games.map((g) => [g.id, g]));
    return ids.map((id) => byId.get(id) ?? new Error(`Game not found: ${id}`));
  });

  readonly resultsByGameId = new DataLoader<string, GameResultEntity[]>(
    async (gameIds) => {
      const results = await this.leagueService.findResultsByGameIds(gameIds);
      const grouped = new Map<string, GameResultEntity[]>();
      for (const result of results) {
        const list = grouped.get(result.gameId);
        if (list) {
          list.push(result);
        } else {
          grouped.set(result.gameId, [result]);
        }
      }
      return gameIds.map((id) => grouped.get(id) ?? []);
    },
  );

  readonly resultsByLeaguePlayer = new DataLoader<
    LeaguePlayerKey,
    GameResultEntity[],
    string
  >(
    async (keys) => {
      const grouped = new Map<string, GameResultEntity[]>();
      await Promise.all(
        [...groupByLeague(keys)].map(async ([leagueId, playerIds]) => {
          const rows = await this.leagueService.findResultsForPlayers(leagueId, playerIds);
          for (const row of rows) {
            const cacheKey = `${leagueId}:${row.playerId}`;
            const list = grouped.get(cacheKey);
            if (list) {
              list.push(row);
            } else {
              grouped.set(cacheKey, [row]);
            }
          }
        }),
      );
      return keys.map((key) => grouped.get(leaguePlayerCacheKey(key)) ?? []);
    },
    { cacheKeyFn: leaguePlayerCacheKey },
  );

  readonly aggregateByLeaguePlayer = new DataLoader<
    LeaguePlayerKey,
    StandingAggregate,
    string
  >(
    async (keys) => {
      const aggregates = new Map<string, StandingAggregate>();
      await Promise.all(
        [...groupByLeague(keys)].map(async ([leagueId, playerIds]) => {
          const rows = await this.leagueService.aggregateForPlayers(leagueId, playerIds);
          for (const [playerId, agg] of rows) {
            aggregates.set(`${leagueId}:${playerId}`, agg);
          }
        }),
      );
      return keys.map(
        (key) =>
          aggregates.get(leaguePlayerCacheKey(key)) ?? {
            totalGames: 0,
            totalPoint: 0,
            avgRank: 0,
            topRate: 0,
            lastRate: 0,
          },
      );
    },
    { cacheKeyFn: leaguePlayerCacheKey },
  );
}
