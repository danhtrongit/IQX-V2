import { Module } from '@nestjs/common';
import { ProxyHttpModule } from '../../common/services/proxy-http.module';
import { RedisCacheModule } from '../../common/modules/redis-cache/redis-cache.module';
import { ReferenceController } from './reference/reference.controller';
import { ReferenceService } from './reference/reference.service';
import { FundamentalController } from './fundamental/fundamental.controller';
import { FundamentalService } from './fundamental/fundamental.service';
import { MacroController } from './macro/macro.controller';
import { MacroService } from './macro/macro.service';
import { AnalysisController } from './analysis/analysis.controller';
import { AnalysisService } from './analysis/analysis.service';
import { ValuationController } from './valuation/valuation.controller';
import { ValuationService } from './valuation/valuation.service';
import { InternationalController } from './international/international.controller';
import { InternationalService } from './international/international.service';
import { FundsController } from './funds/funds.controller';
import { FundsService } from './funds/funds.service';

@Module({
  imports: [ProxyHttpModule, RedisCacheModule],
  controllers: [
    ReferenceController,
    FundamentalController,
    MacroController,
    AnalysisController,
    ValuationController,
    InternationalController,
    FundsController,
  ],
  providers: [
    ReferenceService,
    FundamentalService,
    MacroService,
    AnalysisService,
    ValuationService,
    InternationalService,
    FundsService,
  ],
  exports: [
    ReferenceService,
    FundamentalService,
    MacroService,
    AnalysisService,
    ValuationService,
    InternationalService,
    FundsService,
  ],
})
export class MarketDataModule {}
