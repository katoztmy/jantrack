import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { LeagueEntity } from './league.entity';
import { PlayerEntity } from './player.entity';

@Entity('league_players')
export class LeaguePlayerEntity {
  @PrimaryColumn('uuid')
  leagueId!: string;

  @PrimaryColumn('uuid')
  playerId!: string;

  @CreateDateColumn()
  joinedAt!: Date;

  @ManyToOne(() => LeagueEntity, (l) => l.leaguePlayers)
  @JoinColumn({ name: 'leagueId' })
  league!: LeagueEntity;

  @ManyToOne(() => PlayerEntity, (p) => p.leaguePlayers)
  @JoinColumn({ name: 'playerId' })
  player!: PlayerEntity;
}
