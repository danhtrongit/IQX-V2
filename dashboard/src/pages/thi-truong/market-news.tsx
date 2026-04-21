import { useState, useEffect } from "react"
import { Newspaper, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"

interface NewsItem {
  id: string
  title: string
  source: string
  publishedAt: string
  sentiment?: string
}

export function MarketNews() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("ai-news/news", { searchParams: { limit: "10" } }).json<any>()
        setNews(res.data?.items || [])
      } catch {
        setNews([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const timeAgo = (d: string) => {
    const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
    if (m < 60) return `${m}p`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  const dot = (s?: string) => s === "positive" ? "bg-emerald-500" : s === "negative" ? "bg-red-500" : "bg-amber-500"

  return (
    <div className="bg-card rounded-lg border border-border flex flex-col" style={{ minHeight: 280 }}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <Newspaper className="size-3.5 text-primary" />
        <h3 className="text-xs font-semibold text-foreground">Tin tức nổi bật</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-4 animate-spin text-primary" /></div>
          ) : news.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-8">Chưa có tin tức</div>
          ) : (
            news.map((item, i) => (
              <div key={item.id || i} className="flex gap-2 p-2 rounded-md hover:bg-muted/40 transition-colors cursor-pointer group">
                <div className={`size-1.5 rounded-full mt-1.5 shrink-0 ${dot(item.sentiment)}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-muted-foreground">{item.source}</span>
                    <span className="text-[9px] text-muted-foreground/50">{timeAgo(item.publishedAt)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
