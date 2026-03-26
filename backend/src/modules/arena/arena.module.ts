import { Module } from '@nestjs/common';
import { ArenaController, WatchlistController } from './arena.controller';
import { ArenaService } from './arena.service';
import { LeaderboardService } from './leaderboard.service';
import { WatchlistService } from './watchlist.service';
import { TradingModule } from '../trading/trading.module';

@Module({
  imports: [TradingModule],
  controllers: [ArenaController, WatchlistController],
  providers: [ArenaService, LeaderboardService, WatchlistService],
})
export class ArenaModule {}
