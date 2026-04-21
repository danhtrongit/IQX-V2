import {
  ShoppingCart,
  Eye,
  Newspaper,
  BarChart2,
  Lightbulb,
  MessageSquare,
  Activity,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useChat } from "@/contexts/chat-context"
import { useSidebar, type SidebarPanel } from "@/contexts/sidebar-context"

interface ToolbarItem {
  icon: React.ElementType
  label: string
  id: string
  badge?: number
  panel?: SidebarPanel
  onClick?: () => void
}

function ToolbarButton({
  item,
  isActive,
  onClick,
}: {
  item: ToolbarItem
  isActive: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      id={`toolbar-${item.id}`}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center gap-0.5 w-full py-2 px-1 rounded-md transition-colors ${
        isActive
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      }`}
    >
      <Icon className="size-[18px]" />
      <span className="text-[9px] font-medium leading-tight text-center">
        {item.label}
      </span>
      {item.badge != null && item.badge > 0 && (
        <span className="absolute top-1 right-1 size-3.5 bg-destructive text-white text-[7px] font-bold rounded-full flex items-center justify-center">
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      )}
    </button>
  )
}

export function RightToolbar({ onActionClick }: { onActionClick?: (id: string) => void }) {
  const { rooms } = useChat()
  const { activePanel, setActivePanel } = useSidebar()

  const totalUnread = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0)

  const handleClick = (item: ToolbarItem) => {
    if (item.panel) {
      setActivePanel(item.panel)
    } else if (item.onClick) {
      item.onClick()
    } else {
      onActionClick?.(item.id)
    }
  }

  const ITEMS: ToolbarItem[] = [
    { icon: ShoppingCart, label: "Đặt lệnh", id: "order", panel: "trading" },
    { icon: Eye, label: "Danh mục", id: "watchlist", panel: "watchlist" },
    { icon: Newspaper, label: "Tin tức", id: "news", panel: "news" },
    { icon: BarChart2, label: "Mẫu hình", id: "patterns" },
    { icon: Lightbulb, label: "AI Phân tích", id: "ai-insight", onClick: () => onActionClick?.("ai-insight") },
    { icon: Activity, label: "Biến động", id: "signals" },
  ]

  const BOTTOM_ITEMS: ToolbarItem[] = [
    { icon: MessageSquare, label: "Chat", id: "chat", panel: "chat", badge: totalUnread },
  ]

  return (
    <aside
      id="right-toolbar"
      className="fixed bottom-0 left-0 right-0 z-50 w-full h-[52px] bg-card border-t border-border flex flex-row items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] md:static md:w-16 md:h-full md:flex-col md:border-l md:border-t-0 md:py-1 md:px-0.5 gap-0.5"
    >
      {ITEMS.map((item) => (
        <ToolbarButton
          key={item.id}
          item={item}
          isActive={item.panel === activePanel}
          onClick={() => handleClick(item)}
        />
      ))}

      <Separator className="hidden md:block w-8 my-0.5" />
      <Separator orientation="vertical" className="md:hidden h-8 mx-0.5" />

      {BOTTOM_ITEMS.map((item) => (
        <ToolbarButton
          key={item.id}
          item={item}
          isActive={item.panel === activePanel}
          onClick={() => handleClick(item)}
        />
      ))}

      <div className="hidden md:block flex-1" />
    </aside>
  )
}
