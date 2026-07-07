import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { GameResultModel } from './game-result.model';
import { PlayerModel } from './player.model';

@ObjectType()
export class StandingModel {
  @Field(() => PlayerModel)
  player!: PlayerModel;

  @Field(() => Int)
  totalGames!: number;

  @Field(() => Float)
  totalPoint!: number;

  @Field(() => Float)
  avgRank!: number;

  @Field(() => Float)
  topRate!: number;

  @Field(() => Float)
  lastRate!: number;

  @Field(() => [GameResultModel])
  results!: GameResultModel[];

  leagueId!: string;
  playerId!: string;
}
