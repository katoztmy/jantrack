import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { GraphQLISODateTime } from '@nestjs/graphql';
import { GameResultModel } from './game-result.model';

@ObjectType('Game')
export class GameModel {
  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLISODateTime)
  playedAt!: Date;

  @Field(() => Int)
  tableNo!: number;

  @Field(() => [GameResultModel])
  results!: GameResultModel[];
}
