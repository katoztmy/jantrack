import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { GameResultEntity } from './entities/game-result.entity';
import { GameEntity } from './entities/game.entity';
import { LeaguePlayerEntity } from './entities/league-player.entity';
import { LeagueEntity } from './entities/league.entity';
import { PlayerEntity } from './entities/player.entity';
import { LeagueModule } from './league/league.module';
import { PlayerModule } from './player/player.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
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
      synchronize: false,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
    }),
    PlayerModule,
    LeagueModule,
  ],
})
export class AppModule {}
