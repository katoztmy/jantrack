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
import { LeagueLoaders } from './league.loaders';
import { LeagueService } from './league.service';

@Resolver(() => LeagueModel)
export class LeagueResolver {
  constructor(
    private readonly leagueService: LeagueService,
    private readonly loaders: LeagueLoaders,
  ) {}

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

  // N+1 ①だった箇所: loadは同一tick内でまとめられ、全プレイヤー分が1本のGROUP BYになる
  @ResolveField(() => [StandingModel])
  async standings(@Parent() league: LeagueEntity): Promise<StandingModel[]> {
    const players = await this.leagueService.findLeaguePlayers(league.id);

    const standings = await Promise.all(
      players.map(async (player) => {
        const agg = await this.loaders.aggregateByLeaguePlayer.load({
          leagueId: league.id,
          playerId: player.id,
        });
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
  constructor(private readonly loaders: LeagueLoaders) {}

  // N+1 ②だった箇所: リーグ内全プレイヤーの結果をIN句1本で取得
  @ResolveField(() => [GameResultModel])
  async results(@Parent() standing: StandingModel): Promise<GameResultEntity[]> {
    return this.loaders.resultsByLeaguePlayer.load({
      leagueId: standing.leagueId,
      playerId: standing.playerId,
    });
  }
}

@Resolver(() => GameModel)
export class GameResolver {
  constructor(private readonly loaders: LeagueLoaders) {}

  // N+1 ③だった箇所: 全GameのIDをIN句1本にバッチ
  @ResolveField(() => [GameResultModel])
  async results(@Parent() game: GameEntity): Promise<GameResultEntity[]> {
    return this.loaders.resultsByGameId.load(game.id);
  }
}

@Resolver(() => GameResultModel)
export class GameResultResolver {
  constructor(private readonly loaders: LeagueLoaders) {}

  // N+1 ④だった箇所: 重複playerIdはDataLoaderのキャッシュが吸収する
  @ResolveField(() => PlayerModel)
  async player(@Parent() result: GameResultEntity): Promise<PlayerEntity> {
    return this.loaders.playerById.load(result.playerId);
  }

  // N+1 ⑤だった箇所
  @ResolveField(() => GameModel)
  async game(@Parent() result: GameResultEntity): Promise<GameEntity> {
    return this.loaders.gameById.load(result.gameId);
  }
}
