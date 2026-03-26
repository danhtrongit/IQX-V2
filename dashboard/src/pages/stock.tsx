import { useState } from "react"
import {
  Header,
  MarketBar,
  RightPanel,
  RightToolbar,
  Footer,
} from "@/components/layout"
import { ChatPanel } from "@/components/chat/chat-panel"
import { TVChart } from "@/components/chart/tv-chart"
import { StockOverview } from "@/components/stock/stock-overview"
import { StockFinancials } from "@/components/stock/stock-financials"
import { StockAiInsight } from "@/components/stock/stock-ai-insight"
import { useParams } from "react-router"
import { SymbolProvider } from "@/contexts/symbol-context"
import { BarChart3, LineChart, Info, Brain } from "lucide-react"

type StockTab = "chart" | "overview" | "financials" | "ai-insight"

export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const ticker = symbol?.toUpperCase() || "VNINDEX"
  const [activeTab, setActiveTab] = useState<StockTab>("chart")

  const tabs: { id: StockTab; label: string; icon: React.ReactNode }[] = [
    { id: "chart", label: "Biểu đồ", icon: <LineChart className="size-3.5" /> },
    { id: "overview", label: "Tổng quan", icon: <Info className="size-3.5" /> },
    { id: "financials", label: "Tài chính", icon: <BarChart3 className="size-3.5" /> },
    { id: "ai-insight", label: "AI Insight", icon: <Brain className="size-3.5" /> },
  ]

  return (
    <SymbolProvider symbol={ticker}>
      <div id="dashboard-root" className="flex h-svh flex-col overflow-hidden bg-background">
        <Header />
        <MarketBar />

        <div className="flex flex-1 min-h-0">
          <section className="flex flex-1 flex-col min-w-0 bg-background">
            {/* Tab Navigation */}
            <div className="flex items-center border-b border-border px-2 shrink-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors relative ${
                    activeTab === tab.id
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0">
              {activeTab === "chart" && (
                <TVChart symbol={ticker} interval="D" theme="dark" />
              )}
              {activeTab === "overview" && (
                <StockOverview symbol={ticker} />
              )}
              {activeTab === "financials" && (
                <StockFinancials symbol={ticker} />
              )}
              {activeTab === "ai-insight" && (
                <StockAiInsight symbol={ticker} />
              )}
            </div>
          </section>

          <RightPanel />
          <RightToolbar />
        </div>

        <Footer />
        <ChatPanel />
      </div>
    </SymbolProvider>
  )
}
