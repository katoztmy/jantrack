import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GameResultModel } from './game-result.model';

@ObjectType('Player')
export class PlayerModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => [GameResultModel])
  recentResults!: GameResultModel[];
}
