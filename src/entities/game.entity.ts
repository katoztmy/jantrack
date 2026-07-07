import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LeagueEntity } from './league.entity';
import { GameResultEntity } from './game-result.entity';

@Entity('games')
export class GameEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  leagueId!: string;

  @Column({ type: 'timestamptz' })
  playedAt!: Date;

  @Column({ type: 'int' })
  tableNo!: number;

  @ManyToOne(() => LeagueEntity, (l) => l.games)
  @JoinColumn({ name: 'leagueId' })
  league!: LeagueEntity;

  @OneToMany(() => GameResultEntity, (gr) => gr.game)
  results!: GameResultEntity[];
}
