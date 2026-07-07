import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import { GameResultEntity } from '../entities/game-result.entity';
import { GameEntity } from '../entities/game.entity';
import { LeagueEntity } from '../entities/league.entity';
import { LeaguePlayerEntity } from '../entities/league-player.entity';
import { PlayerEntity } from '../entities/player.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  username: process.env['DB_USERNAME'] ?? 'jantrack',
  password: process.env['DB_PASSWORD'] ?? 'jantrack',
  database: process.env['DB_DATABASE'] ?? 'jantrack',
  entities: [
    PlayerEntity,
    LeagueEntity,
    LeaguePlayerEntity,
    GameEntity,
    GameResultEntity,
  ],
  migrations: ['migrations/*.ts'],
  synchronize: false,
  logging: false,
});
