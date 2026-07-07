import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { GameModel } from './game.model';
import { PlayerModel } from './player.model';
import { StandingModel } from './standing.model';

@ObjectType('League')
export class LeagueModel {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => [PlayerModel])
  players!: PlayerModel[];

  @Field(() => [GameModel])
  games!: GameModel[];

  @Field(() => [StandingModel])
  standings!: StandingModel[];

  umaSmall!: number;
  umaBig!: number;
  oka!: number;
  returnPoint!: number;
}
