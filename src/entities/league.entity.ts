import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LeaguePlayerEntity } from './league-player.entity';
import { GameEntity } from './game.entity';

@Entity('leagues')
export class LeagueEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ type: 'int', default: 10 })
  umaSmall!: number;

  @Column({ type: 'int', default: 30 })
  umaBig!: number;

  @Column({ type: 'int', default: 20 })
  oka!: number;

  @Column({ type: 'int', default: 25000 })
  startPoint!: number;

  @Column({ type: 'int', default: 30000 })
  returnPoint!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => LeaguePlayerEntity, (lp) => lp.league)
  leaguePlayers!: LeaguePlayerEntity[];

  @OneToMany(() => GameEntity, (g) => g.league)
  games!: GameEntity[];
}
