import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'jantrack'),
        password: config.get<string>('DB_PASSWORD', 'jantrack'),
        database: config.get<string>('DB_DATABASE', 'jantrack'),
        entities: [
          PlayerEntity,
          LeagueEntity,
          LeaguePlayerEntity,
          GameEntity,
          GameResultEntity,
        ],
        synchronize: false,
      }),
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
