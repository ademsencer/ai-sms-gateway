import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyHelmet from '@fastify/helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
    }),
  );

  const configService = app.get(ConfigService);

  // Global prefix
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Security
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
  });

  // CORS
  const corsOrigins = configService.get<string[]>('app.corsOrigins', ['*']);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-device-key',
    ],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SMS Gateway Platform')
    .setDescription('Enterprise Android SMS Gateway — API Documentation')
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-device-key',
        in: 'header',
        description: 'Device API key for authentication',
      },
      'x-device-key',
    )
    .addServer(`http://localhost:${configService.get<number>('app.port', 3000)}`)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
  });

  // Start server
  const port = configService.get<number>('app.port', 3000);
  await app.listen(port, '0.0.0.0');

  logger.log(`SMS Gateway API running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`Environment: ${configService.get<string>('app.nodeEnv', 'development')}`);
}

void bootstrap();
