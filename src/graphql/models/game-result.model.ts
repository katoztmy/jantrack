import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { GameModel } from './game.model';
import { PlayerModel } from './player.model';

@ObjectType('GameResult')
export class GameResultModel {
  @Field(() => Int)
  rank!: number;

  @Field(() => Int)
  rawScore!: number;

  @Field(() => Float)
  point!: number;

  @Field(() => PlayerModel)
  player!: PlayerModel;

  @Field(() => GameModel)
  game!: GameModel;

  id!: string;
  gameId!: string;
  playerId!: string;
}
