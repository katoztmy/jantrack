import {
  Args,
  ID,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { GameResultEntity } from '../entities/game-result.entity';
import { GameEntity } from '../entities/game.entity';
import { LeagueEntity } from '../entities/league.entity';
import { PlayerEntity } from '../entities/player.entity';
import { GameResultModel } from '../graphql/models/game-result.model';
import { GameModel } from '../graphql/models/game.model';
import { LeagueModel } from '../graphql/models/league.model';
import { PlayerModel } from '../graphql/models/player.model';
import { StandingModel } from '../graphql/models/standing.model';
import { LeagueService } from './league.service';

@Resolver(() => LeagueModel)
export class LeagueResolver {
  constructor(private readonly leagueService: LeagueService) {}

  @Query(() => [LeagueModel])
  leagues(): Promise<LeagueEntity[]> {
    return this.leagueService.findAll();
  }

  @Query(() => LeagueModel, { nullable: true })
  league(@Args('id', { type: () => ID }) id: string): Promise<LeagueEntity | null> {
    return this.leagueService.findOne(id);
  }

  @ResolveField(() => [PlayerModel])
  async players(@Parent() league: LeagueEntity): Promise<PlayerEntity[]> {
    return this.leagueService.findLeaguePlayers(league.id);
  }

  @ResolveField(() => [GameModel])
  async games(
    @Parent() league: LeagueEntity,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<GameEntity[]> {
    return this.leagueService.findGames(league.id, limit);
  }

  // N+1 ①: プレイヤー一覧取得後、1人ずつ集計クエリを発行
  @ResolveField(() => [StandingModel])
  async standings(@Parent() league: LeagueEntity): Promise<StandingModel[]> {
    const players = await this.leagueService.findLeaguePlayers(league.id);

    const standings = await Promise.all(
      players.map(async (player) => {
        const agg = await this.leagueService.aggregateForPlayer(league.id, player.id);
        const standing = new StandingModel();
        standing.player = player as unknown as PlayerModel;
        standing.leagueId = league.id;
        standing.playerId = player.id;
        standing.totalGames = agg.totalGames;
        standing.totalPoint = agg.totalPoint;
        standing.avgRank = agg.avgRank;
        standing.topRate = agg.topRate;
        standing.lastRate = agg.lastRate;
        standing.results = [];
        return standing;
      }),
    );

    return standings
      .filter((s) => s.totalGames > 0)
      .sort((a, b) => b.totalPoint - a.totalPoint);
  }
}

@Resolver(() => StandingModel)
export class StandingResolver {
  constructor(private readonly leagueService: LeagueService) {}

  // N+1 ②: プレイヤー1人ずつ、そのリーグ内の対局結果を取得
  @ResolveField(() => [GameResultModel])
  async results(@Parent() standing: StandingModel): Promise<GameResultEntity[]> {
    return this.leagueService.findResultsForPlayer(standing.leagueId, standing.playerId);
  }
}

@Resolver(() => GameModel)
export class GameResolver {
  constructor(private readonly leagueService: LeagueService) {}

  // N+1 ③: Gameごとに結果を取得
  @ResolveField(() => [GameResultModel])
  async results(@Parent() game: GameEntity): Promise<GameResultEntity[]> {
    return this.leagueService.findResultsForGame(game.id);
  }
}

@Resolver(() => GameResultModel)
export class GameResultResolver {
  constructor(private readonly leagueService: LeagueService) {}

  // N+1 ④: GameResultごとにPlayerを取得
  @ResolveField(() => PlayerModel)
  async player(@Parent() result: GameResultEntity): Promise<PlayerEntity> {
    return this.leagueService.findPlayerById(result.playerId);
  }

  // N+1 ⑤: GameResultごとにGameを取得
  @ResolveField(() => GameModel)
  async game(@Parent() result: GameResultEntity): Promise<GameEntity> {
    return this.leagueService.findGameById(result.gameId);
  }
}
