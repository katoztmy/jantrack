import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GameEntity } from './game.entity';
import { PlayerEntity } from './player.entity';

@Entity('game_results')
export class GameResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  gameId!: string;

  @Column('uuid')
  playerId!: string;

  @Column({ type: 'smallint' })
  rank!: number;

  @Column({ type: 'int' })
  rawScore!: number;

  @Column({ type: 'decimal', precision: 7, scale: 1 })
  point!: number;

  @ManyToOne(() => GameEntity, (g) => g.results)
  @JoinColumn({ name: 'gameId' })
  game!: GameEntity;

  @ManyToOne(() => PlayerEntity, (p) => p.gameResults)
  @JoinColumn({ name: 'playerId' })
  player!: PlayerEntity;
}
