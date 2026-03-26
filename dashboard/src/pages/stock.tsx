import { useState, useRef } from "react"
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
import { BarChart3, LineChart, Info, X, GripHorizontal } from "lucide-react"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { Button } from "@/components/ui/button"

type StockTab = "chart" | "overview" | "financials"

export default function StockPage() {
  const { symbol } = useParams<{ symbol: string }>()
  const ticker = symbol?.toUpperCase() || "VNINDEX"
  const [activeTab, setActiveTab] = useState<StockTab>("chart")
  const [isAiInsightOpen, setIsAiInsightOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()

  const tabs: { id: StockTab; label: string; icon: React.ReactNode }[] = [
    { id: "chart", label: "Biểu đồ", icon: <LineChart className="size-3.5" /> },
    { id: "overview", label: "Tổng quan", icon: <Info className="size-3.5" /> },
    { id: "financials", label: "Tài chính", icon: <BarChart3 className="size-3.5" /> },
  ]

  const handleActionClick = (id: string) => {
    if (id === "ai-insight") {
      setIsAiInsightOpen((prev) => !prev)
    }
  }

  return (
    <SymbolProvider symbol={ticker}>
      <div id="dashboard-root" className="flex h-svh flex-col overflow-hidden bg-background relative" ref={containerRef}>
        <Header />
        <MarketBar />

        <div className="flex flex-1 min-h-0 relative">
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
            <div className="flex-1 min-h-0 relative">
              {activeTab === "chart" && (
                <TVChart symbol={ticker} interval="D" theme="dark" />
              )}
              {activeTab === "overview" && (
                <StockOverview symbol={ticker} />
              )}
              {activeTab === "financials" && (
                <StockFinancials symbol={ticker} />
              )}
            </div>
          </section>

          <RightPanel />
          <RightToolbar onActionClick={handleActionClick} />

        </div>

        <Footer />
        <ChatPanel />

        {/* Draggable AI Insight Window */}
        <AnimatePresence>
          {isAiInsightOpen && (
            <div className="absolute inset-0 z-[100] pointer-events-none" style={{ overflow: "hidden" }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                drag
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={containerRef}
                dragMomentum={false}
                dragElastic={0}
                className="absolute flex flex-col bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl overflow-hidden pointer-events-auto"
                style={{
                  width: "1100px",
                  height: "700px",
                  top: "calc(50% - 350px)",
                  left: "calc(50% - 550px)",
                }}
              >
                {/* Window Header */}
                <div
                  className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border cursor-move shrink-0"
                  onPointerDown={(e) => dragControls.start(e)}
                >
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripHorizontal className="size-4" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground select-none">
                      AI Insight - {ticker}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 rounded-sm hover:bg-destructive/20 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAiInsightOpen(false);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <X className="size-4" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0 relative bg-background/50">
                  <StockAiInsight symbol={ticker} />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </SymbolProvider>
  )
}
