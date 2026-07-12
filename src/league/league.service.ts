import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameResultEntity } from '../entities/game-result.entity';
import { GameEntity } from '../entities/game.entity';
import { LeaguePlayerEntity } from '../entities/league-player.entity';
import { LeagueEntity } from '../entities/league.entity';
import { PlayerEntity } from '../entities/player.entity';

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
    return Promise.all(
      lps.map((lp) => this.playerRepo.findOneOrFail({ where: { id: lp.playerId } })),
    );
  }

  findGames(leagueId: string, limit?: number): Promise<GameEntity[]> {
    return this.gameRepo.find({
      where: { leagueId },
      order: { playedAt: 'DESC' },
      ...(limit != null ? { take: limit } : {}),
    });
  }

  // N+1 ①: プレイヤー1人ずつ集計クエリを発行する
  async aggregateForPlayer(
    leagueId: string,
    playerId: string,
  ): Promise<{
    totalGames: number;
    totalPoint: number;
    avgRank: number;
    topRate: number;
    lastRate: number;
  }> {
    const raw = await this.gameResultRepo
      .createQueryBuilder('gr')
      .innerJoin('gr.game', 'g')
      .where('g.leagueId = :leagueId', { leagueId })
      .andWhere('gr.playerId = :playerId', { playerId })
      .select('COUNT(*)', 'totalGames')
      .addSelect('SUM(gr.point)', 'totalPoint')
      .addSelect('AVG(gr.rank)', 'avgRank')
      .addSelect('SUM(CASE WHEN gr.rank = 1 THEN 1 ELSE 0 END)::float / COUNT(*)', 'topRate')
      .addSelect('SUM(CASE WHEN gr.rank = 4 THEN 1 ELSE 0 END)::float / COUNT(*)', 'lastRate')
      .getRawOne<{
        totalGames: string;
        totalPoint: string;
        avgRank: string;
        topRate: string;
        lastRate: string;
      }>();

    return {
      totalGames: parseInt(raw?.totalGames ?? '0', 10),
      totalPoint: parseFloat(raw?.totalPoint ?? '0'),
      avgRank: parseFloat(raw?.avgRank ?? '0'),
      topRate: parseFloat(raw?.topRate ?? '0'),
      lastRate: parseFloat(raw?.lastRate ?? '0'),
    };
  }

  // N+1 ②: プレイヤー1人ずつ対局結果を取得する
  findResultsForPlayer(leagueId: string, playerId: string): Promise<GameResultEntity[]> {
    return this.gameResultRepo
      .createQueryBuilder('gr')
      .innerJoin('gr.game', 'g')
      .where('g.leagueId = :leagueId', { leagueId })
      .andWhere('gr.playerId = :playerId', { playerId })
      .orderBy('g.playedAt', 'ASC')
      .getMany();
  }

  // N+1 ③: Gameごとに結果を取得する
  findResultsForGame(gameId: string): Promise<GameResultEntity[]> {
    return this.gameResultRepo.find({
      where: { gameId },
      order: { rank: 'ASC' },
    });
  }

  // N+1 ④: GameResultごとにPlayerを取得する
  findPlayerById(playerId: string): Promise<PlayerEntity> {
    return this.playerRepo.findOneOrFail({ where: { id: playerId } });
  }

  // N+1 ⑤: GameResultごとにGameを取得する
  findGameById(gameId: string): Promise<GameEntity> {
    return this.gameRepo.findOneOrFail({ where: { id: gameId } });
  }
}
