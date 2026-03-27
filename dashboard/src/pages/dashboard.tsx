import {
  Header,
  MarketBar,
  CenterPanel,
  RightSidebar,
  RightToolbar,
  Footer,
} from "@/components/layout"
import { SymbolProvider } from "@/contexts/symbol-context"
import { SidebarProvider } from "@/contexts/sidebar-context"
import { toast } from "sonner"
import { Lightbulb } from "lucide-react"

export default function DashboardPage() {
  const handleActionClick = (id: string) => {
    if (id === "ai-insight") {
      toast("AI Phân tích chưa khả dụng", {
        description:
          "Vui lòng chọn một mã cổ phiếu cụ thể (VD: VCB, FPT, HPG) để sử dụng tính năng AI Phân tích.",
        icon: <Lightbulb className="size-4 text-amber-500" />,
        duration: 4000,
      })
    }
  }

  return (
    <SymbolProvider symbol="VNINDEX">
      <SidebarProvider defaultPanel="news">
        <div id="dashboard-root" className="flex h-svh flex-col overflow-hidden bg-background">
          <Header />
          <MarketBar />

          <div className="flex flex-1 min-h-0">
            <CenterPanel />
            <RightSidebar />
            <RightToolbar onActionClick={handleActionClick} />
          </div>

          <Footer />
        </div>
      </SidebarProvider>
    </SymbolProvider>
  )
}
