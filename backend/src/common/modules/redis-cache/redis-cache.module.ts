import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModule, CacheModuleOptions } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { RedisCacheService } from './redis-cache.service';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync<CacheModuleOptions>({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        const store = await redisStore({
          host: redisHost,
          port: redisPort,
          password: redisPassword || undefined,
          ttl: 300 * 1000,
          maxRetryCount: 3,
        });

        return {
          store,
          defaultNoTfWait: false,
        };
      },
    }),
  ],
  controllers: [MonitoringController],
  providers: [RedisCacheService, MetricsService],
  exports: [CacheModule, RedisCacheService, MetricsService],
})
export class RedisCacheModule {}
