import { useSidebar } from "@/contexts/sidebar-context"
import { NewsFeedPanel } from "@/components/news/news-feed-panel"
import { ChatSidebarPanel } from "@/components/chat/chat-sidebar-panel"
import { WatchlistPanel } from "@/components/watchlist/watchlist-panel"
import { RightPanel as TradingPanel } from "./right-panel"

/**
 * Dynamic right sidebar that switches between panels:
 * - news: Market news feed with filters
 * - chat: Inline chat (replaces the Sheet-based approach)
 * - trading: Stock trading form (order book + order placement)
 * - watchlist: Watchlist, holdings, and trade history
 */
export function RightSidebar() {
  const { activePanel } = useSidebar()

  switch (activePanel) {
    case "news":
      return <NewsFeedPanel />
    case "chat":
      return <ChatSidebarPanel />
    case "trading":
      return <TradingPanel />
    case "watchlist":
      return <WatchlistPanel />
    default:
      return <NewsFeedPanel />
  }
}
