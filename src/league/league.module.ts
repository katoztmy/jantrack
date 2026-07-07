import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameResultEntity } from '../entities/game-result.entity';
import { GameEntity } from '../entities/game.entity';
import { LeaguePlayerEntity } from '../entities/league-player.entity';
import { LeagueEntity } from '../entities/league.entity';
import { PlayerEntity } from '../entities/player.entity';
import {
  GameResolver,
  GameResultResolver,
  LeagueResolver,
  StandingResolver,
} from './league.resolver';
import { LeagueService } from './league.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LeagueEntity,
      LeaguePlayerEntity,
      GameEntity,
      GameResultEntity,
      PlayerEntity,
    ]),
  ],
  providers: [
    LeagueService,
    LeagueResolver,
    StandingResolver,
    GameResolver,
    GameResultResolver,
  ],
})
export class LeagueModule {}
