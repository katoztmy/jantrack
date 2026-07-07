import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameResultEntity } from '../entities/game-result.entity';
import { PlayerEntity } from '../entities/player.entity';

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(PlayerEntity)
    private readonly playerRepo: Repository<PlayerEntity>,
    @InjectRepository(GameResultEntity)
    private readonly gameResultRepo: Repository<GameResultEntity>,
  ) {}

  findOne(id: string): Promise<PlayerEntity | null> {
    return this.playerRepo.findOne({ where: { id } });
  }

  findOneByIdUnsafe(id: string): Promise<PlayerEntity> {
    return this.playerRepo.findOneOrFail({ where: { id } });
  }

  findRecentResults(playerId: string, limit: number): Promise<GameResultEntity[]> {
    return this.gameResultRepo.find({
      where: { playerId },
      order: { game: { playedAt: 'DESC' } },
      relations: ['game'],
      take: limit,
    });
  }
}
