import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProxyHttpModule } from './common/services/proxy-http.module';
import { ListingModule } from './modules/listing/listing.module';
import { QuoteModule } from './modules/quote/quote.module';
import { CompanyModule } from './modules/company/company.module';
import { FinancialModule } from './modules/financial/financial.module';
import { TradingModule } from './modules/trading/trading.module';
import { StocksModule } from './modules/stocks/stocks.module';
import { ArenaModule } from './modules/arena/arena.module';
import { ChatModule } from './modules/chat/chat.module';
import { AiNewsModule } from './modules/ai-news/ai-news.module';
import { AiInsightModule } from './modules/ai-insight/ai-insight.module';
import { AiDashboardModule } from './modules/ai-dashboard/ai-dashboard.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { RedisCacheModule } from './common/modules/redis-cache/redis-cache.module';
import { RateLimiterModule } from './common/modules/rate-limiter/rate-limiter.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as any,
        },
      }),
    }),
    RedisCacheModule,
    RateLimiterModule,
    PrismaModule,
    ProxyHttpModule,
    AuthModule,
    UsersModule,
    PaymentsModule,
    ListingModule,
    QuoteModule,
    CompanyModule,
    FinancialModule,
    TradingModule,
    StocksModule,
    ArenaModule,
    ChatModule,
    AiNewsModule,
    AiInsightModule,
    AiDashboardModule,
    MarketDataModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
