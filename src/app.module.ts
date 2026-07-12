import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { trace, TraceFlags } from '@opentelemetry/api';
import { LoggerModule } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';
import { join } from 'path';
import { GameResultEntity } from './entities/game-result.entity';
import { GameEntity } from './entities/game.entity';
import { LeaguePlayerEntity } from './entities/league-player.entity';
import { LeagueEntity } from './entities/league.entity';
import { PlayerEntity } from './entities/player.entity';
import { LeagueModule } from './league/league.module';
import { PlayerModule } from './player/player.module';

// Cloud Logging severity names; pino's numeric levels mean nothing to GCP
const PINO_LEVEL_TO_SEVERITY: Record<string, string> = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        // Cloud Run emits its own request log for every request
        autoLogging: false,
        // Cloud Logging reads `message`, not pino's default `msg`
        messageKey: 'message',
        // epoch-millis `time` is ignored by Cloud Logging; ISO strings are parsed
        timestamp: stdTimeFunctions.isoTime,
        formatters: {
          level: (label) => ({
            severity: PINO_LEVEL_TO_SEVERITY[label] ?? 'DEFAULT',
          }),
        },
        // the default req serializer dumps all headers into every in-request log
        serializers: {
          req: (req: { id: unknown; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
        },
        // attach the active OTel span so Cloud Logging links each line to its trace
        mixin: () => {
          const spanContext = trace.getActiveSpan()?.spanContext();
          if (!spanContext) return {};
          const project = process.env['GOOGLE_CLOUD_PROJECT'] ?? 'tech-inspect';
          return {
            'logging.googleapis.com/trace': `projects/${project}/traces/${spanContext.traceId}`,
            'logging.googleapis.com/spanId': spanContext.spanId,
            'logging.googleapis.com/trace_sampled':
              (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED,
          };
        },
      },
    }),
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
        logging: ['error', 'warn'],
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
