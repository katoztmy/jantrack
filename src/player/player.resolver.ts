import { Args, ID, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { GameResultEntity } from '../entities/game-result.entity';
import { PlayerEntity } from '../entities/player.entity';
import { GameResultModel } from '../graphql/models/game-result.model';
import { PlayerModel } from '../graphql/models/player.model';
import { PlayerService } from './player.service';

@Resolver(() => PlayerModel)
export class PlayerResolver {
  constructor(private readonly playerService: PlayerService) {}

  @Query(() => PlayerModel, { nullable: true })
  async player(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<PlayerEntity | null> {
    return this.playerService.findOne(id);
  }

  @ResolveField(() => [GameResultModel])
  async recentResults(
    @Parent() player: PlayerEntity,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<GameResultEntity[]> {
    return this.playerService.findRecentResults(player.id, limit);
  }
}
