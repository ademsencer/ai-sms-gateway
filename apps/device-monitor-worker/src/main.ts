import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('DeviceMonitorWorker');
  const app = await NestFactory.createApplicationContext(AppModule);

  logger.log('Device Monitor Worker started — checking heartbeats every 30s');

  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, shutting down...`);
      await app.close();
      process.exit(0);
    });
  }
}

void bootstrap();
