import {
  Header,
  MarketBar,
  CenterPanel,
  RightPanel,
  RightToolbar,
  Footer,
} from "@/components/layout"
import { ChatPanel } from "@/components/chat/chat-panel"
import { SymbolProvider } from "@/contexts/symbol-context"

export default function DashboardPage() {
  return (
    <SymbolProvider symbol="VNINDEX">
      <div id="dashboard-root" className="flex h-svh flex-col overflow-hidden bg-background">
        <Header />
        <MarketBar />

        <div className="flex flex-1 min-h-0">
          <CenterPanel />
          <RightPanel />
          <RightToolbar />
        </div>

        <Footer />
        <ChatPanel />
      </div>
    </SymbolProvider>
  )
}
