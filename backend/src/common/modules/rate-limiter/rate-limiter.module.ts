import { Module, Global } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuardImpl } from './throttler-guard.impl';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const defaultLimit = configService.get<number>('RATE_LIMIT_DEFAULT', 100);
        const defaultTtl = configService.get<number>('RATE_LIMIT_TTL', 60000);

        return [
          {
            ttl: defaultTtl,
            limit: defaultLimit,
            name: 'default',
          },
        ];
      },
    }),
  ],
  providers: [
    ThrottlerGuardImpl,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuardImpl,
    },
  ],
  exports: [ThrottlerModule],
})
export class RateLimiterModule {}