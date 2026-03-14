import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitmqService } from './rabbitmq.service';

@Global()
@Module({
  providers: [
    RabbitmqService,
    {
      provide: 'RABBITMQ_CONFIG',
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RabbitMQModule');
        const url = configService.get<string>('rabbitmq.url');
        logger.log('RabbitMQ configuration loaded');
        return { url };
      },
      inject: [ConfigService],
    },
  ],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}
