import { useSEO } from "@/hooks/use-seo"
import { Header, MarketBar, Footer } from "@/components/layout"
import { MarketDataProvider } from "@/contexts/market-data-context"
import { SymbolProvider } from "@/contexts/symbol-context"
import { VnindexChart } from "./vnindex-chart"
import { MarketVolume } from "./market-volume"
import { AiMarketAnalysis } from "./ai-market-analysis"
import { MarketNews } from "./market-news"
import { MacroIndicators } from "./macro-indicators"
import { CommodityPrices } from "./commodity-prices"
import { SectorData } from "./sector-data"
import { SectorPerformanceChart } from "./sector-performance-chart"
import { MarketLeaders } from "./market-leaders"
import { ProprietaryTrading } from "./proprietary-trading"
import { ForeignFlow } from "./foreign-flow"
import { InterbankRates } from "./interbank-rates"
import { BondYields } from "./bond-yields"
import { ExchangeRates } from "./exchange-rates"

export default function ThiTruongPage() {
  useSEO({
    title: "Thị trường | IQX",
    description: "Tổng quan thị trường chứng khoán Việt Nam",
    url: "https://beta.iqx.vn/thi-truong",
  })

  return (
    <MarketDataProvider>
      <SymbolProvider symbol="VNINDEX">
        <div className="flex h-svh flex-col overflow-hidden bg-background">
          <Header />
          <MarketBar />
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-[1800px] mx-auto p-3 space-y-3">
              {/* Line 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" style={{ minHeight: 340 }}>
                <VnindexChart />
                <MarketVolume />
                <AiMarketAnalysis />
              </div>
              {/* Line 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <MarketNews />
                <MacroIndicators />
                <CommodityPrices />
              </div>
              {/* Line 3 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <SectorData />
                <SectorPerformanceChart />
              </div>
              {/* Line 4 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <MarketLeaders />
                <ProprietaryTrading />
                <ForeignFlow />
              </div>
              {/* Line 5 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <InterbankRates />
                <BondYields />
                <ExchangeRates />
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </SymbolProvider>
    </MarketDataProvider>
  )
}
