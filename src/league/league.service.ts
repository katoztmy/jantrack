import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { GameResultEntity } from '../entities/game-result.entity';
import { GameEntity } from '../entities/game.entity';
import { LeaguePlayerEntity } from '../entities/league-player.entity';
import { LeagueEntity } from '../entities/league.entity';
import { PlayerEntity } from '../entities/player.entity';

export interface StandingAggregate {
  totalGames: number;
  totalPoint: number;
  avgRank: number;
  topRate: number;
  lastRate: number;
}

@Injectable()
export class LeagueService {
  private readonly logger = new Logger(LeagueService.name);

  constructor(
    @InjectRepository(LeagueEntity)
    private readonly leagueRepo: Repository<LeagueEntity>,
    @InjectRepository(LeaguePlayerEntity)
    private readonly leaguePlayerRepo: Repository<LeaguePlayerEntity>,
    @InjectRepository(GameEntity)
    private readonly gameRepo: Repository<GameEntity>,
    @InjectRepository(GameResultEntity)
    private readonly gameResultRepo: Repository<GameResultEntity>,
    @InjectRepository(PlayerEntity)
    private readonly playerRepo: Repository<PlayerEntity>,
  ) {}

  async findAll(): Promise<LeagueEntity[]> {
    const leagues = await this.leagueRepo.find({ order: { createdAt: 'ASC' } });
    this.logger.log(`Fetched ${leagues.length} leagues`);
    return leagues;
  }

  findOne(id: string): Promise<LeagueEntity | null> {
    return this.leagueRepo.findOne({ where: { id } });
  }

  async findLeaguePlayers(leagueId: string): Promise<PlayerEntity[]> {
    const lps = await this.leaguePlayerRepo.find({ where: { leagueId } });
    if (lps.length === 0) return [];
    return this.playerRepo.find({ where: { id: In(lps.map((lp) => lp.playerId)) } });
  }

  findGames(leagueId: string, limit?: number): Promise<GameEntity[]> {
    return this.gameRepo.find({
      where: { leagueId },
      order: { playedAt: 'DESC' },
      ...(limit != null ? { take: limit } : {}),
    });
  }

  findPlayersByIds(ids: readonly string[]): Promise<PlayerEntity[]> {
    return this.playerRepo.find({ where: { id: In([...ids]) } });
  }

  findGamesByIds(ids: readonly string[]): Promise<GameEntity[]> {
    return this.gameRepo.find({ where: { id: In([...ids]) } });
  }

  findResultsByGameIds(gameIds: readonly string[]): Promise<GameResultEntity[]> {
    return this.gameResultRepo.find({
      where: { gameId: In([...gameIds]) },
      order: { rank: 'ASC' },
    });
  }

  findResultsForPlayers(
    leagueId: string,
    playerIds: readonly string[],
  ): Promise<GameResultEntity[]> {
    return this.gameResultRepo
      .createQueryBuilder('gr')
      .innerJoin('gr.game', 'g')
      .where('g.leagueId = :leagueId', { leagueId })
      .andWhere('gr.playerId IN (:...playerIds)', { playerIds: [...playerIds] })
      .orderBy('g.playedAt', 'ASC')
      .getMany();
  }

  async aggregateForPlayers(
    leagueId: string,
    playerIds: readonly string[],
  ): Promise<Map<string, StandingAggregate>> {
    const rows = await this.gameResultRepo
      .createQueryBuilder('gr')
      .innerJoin('gr.game', 'g')
      .where('g.leagueId = :leagueId', { leagueId })
      .andWhere('gr.playerId IN (:...playerIds)', { playerIds: [...playerIds] })
      .groupBy('gr.playerId')
      .select('gr.playerId', 'playerId')
      .addSelect('COUNT(*)', 'totalGames')
      .addSelect('SUM(gr.point)', 'totalPoint')
      .addSelect('AVG(gr.rank)', 'avgRank')
      .addSelect('SUM(CASE WHEN gr.rank = 1 THEN 1 ELSE 0 END)::float / COUNT(*)', 'topRate')
      .addSelect('SUM(CASE WHEN gr.rank = 4 THEN 1 ELSE 0 END)::float / COUNT(*)', 'lastRate')
      .getRawMany<{
        playerId: string;
        totalGames: string;
        totalPoint: string;
        avgRank: string;
        topRate: string;
        lastRate: string;
      }>();

    return new Map(
      rows.map((raw) => [
        raw.playerId,
        {
          totalGames: parseInt(raw.totalGames, 10),
          totalPoint: parseFloat(raw.totalPoint),
          avgRank: parseFloat(raw.avgRank),
          topRate: parseFloat(raw.topRate),
          lastRate: parseFloat(raw.lastRate),
        },
      ]),
    );
  }
}
