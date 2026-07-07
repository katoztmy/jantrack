import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LeaguePlayerEntity } from './league-player.entity';
import { GameResultEntity } from './game-result.entity';

@Entity('players')
export class PlayerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => LeaguePlayerEntity, (lp) => lp.player)
  leaguePlayers!: LeaguePlayerEntity[];

  @OneToMany(() => GameResultEntity, (gr) => gr.player)
  gameResults!: GameResultEntity[];
}
