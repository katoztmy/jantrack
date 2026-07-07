import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameResultEntity } from '../entities/game-result.entity';
import { PlayerEntity } from '../entities/player.entity';
import { PlayerResolver } from './player.resolver';
import { PlayerService } from './player.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerEntity, GameResultEntity])],
  providers: [PlayerService, PlayerResolver],
  exports: [PlayerService],
})
export class PlayerModule {}
