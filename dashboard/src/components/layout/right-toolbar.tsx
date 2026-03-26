import {
  ShoppingCart,
  Eye,
  Newspaper,
  BarChart2,
  Lightbulb,
  TrendingUp,
  List,
  MessageSquare,
  Bell,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { useChat } from "@/contexts/chat-context"

interface QuickAction {
  icon: React.ReactNode
  label: string
  id: string
  badge?: number
  onClick?: () => void
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: <ShoppingCart className="size-4" />, label: "Đặt lệnh", id: "order" },
  { icon: <Eye className="size-4" />, label: "Danh mục theo dõi", id: "watchlist" },
  { icon: <List className="size-4" />, label: "Danh mục đầu tư", id: "portfolio" },
  { icon: <TrendingUp className="size-4" />, label: "Tín hiệu kỹ thuật", id: "signals" },
  { icon: <BarChart2 className="size-4" />, label: "Mẫu hình nến", id: "patterns" },
]

function ActionButton({ action }: { action: QuickAction }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          id={`quick-${action.id}`}
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground relative"
          onClick={action.onClick}
        >
          {action.icon}
          {action.badge && action.badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-3.5 bg-destructive text-white text-[8px] font-bold rounded-full flex items-center justify-center">
              {action.badge > 9 ? "9+" : action.badge}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">
        <p>{action.label}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export function RightToolbar() {
  const { isOpen, setIsOpen, rooms } = useChat()

  const totalUnread = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0)

  const INFO_ACTIONS: QuickAction[] = [
    { icon: <Newspaper className="size-4" />, label: "Tin tức", id: "news", badge: 3 },
    { icon: <Lightbulb className="size-4" />, label: "AI Phân tích", id: "ai-insight" },
    {
      icon: <MessageSquare className={`size-4 ${isOpen ? "text-primary" : ""}`} />,
      label: "Chat / Thảo luận",
      id: "chat",
      badge: totalUnread,
      onClick: () => setIsOpen(!isOpen),
    },
    { icon: <Bell className="size-4" />, label: "Cảnh báo giá", id: "alerts" },
  ]

  return (
    <aside
      id="right-toolbar"
      className="flex w-10 shrink-0 flex-col items-center border-l border-border bg-card py-1.5 gap-0.5"
    >
      {/* Quick Trading Actions */}
      <div className="flex flex-col items-center gap-0.5">
        {QUICK_ACTIONS.map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
      </div>

      <Separator className="w-6 my-1" />

      {/* Information Actions */}
      <div className="flex flex-col items-center gap-0.5">
        {INFO_ACTIONS.map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
      </div>

      <div className="flex-1" />
    </aside>
  )
}

