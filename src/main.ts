import './tracing'; // must be first: instrumentation patches modules at require time
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // buffer until pino takes over so even startup logs are structured
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  logger.log(`jantrack is running on port ${port}`);
}

bootstrap().catch(console.error);
