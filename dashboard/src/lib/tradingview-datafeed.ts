/**
 * TradingView Custom DataFeed
 * Connects to our backend /quote API to provide OHLCV data
 */

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

// ── News mark types (exported for popover) ──

export interface NewsMarkItem {
  id: string
  title: string
  slug: string
  sentiment: string | null
  sourceName: string | null
  updatedAt: string
  imageUrl: string | null
}

export interface NewsMarkGroup {
  dateKey: string
  timestamp: number
  items: NewsMarkItem[]
  dominantSentiment: "positive" | "negative" | "neutral"
}

// Resolution mapping: TradingView resolution → our API interval
const RESOLUTION_MAP: Record<string, string> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "30": "30m",
  "60": "1H",
  "120": "1H",
  "240": "1H",
  "D": "1D",
  "1D": "1D",
  "W": "1W",
  "1W": "1W",
  "M": "1M",
  "1M": "1M",
}

interface Bar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface DataFeedConfig {
  supported_resolutions: string[]
  exchanges: { value: string; name: string; desc: string }[]
  symbols_types: { name: string; value: string }[]
}

const CONFIG: DataFeedConfig & { supports_marks: boolean } = {
  supported_resolutions: ["1", "5", "15", "30", "60", "D", "W", "M"],
  supports_marks: true,
  exchanges: [
    { value: "HOSE", name: "HOSE", desc: "Sở giao dịch TP.HCM" },
    { value: "HNX", name: "HNX", desc: "Sở giao dịch Hà Nội" },
    { value: "UPCOM", name: "UPCOM", desc: "Thị trường UPCoM" },
    { value: "INDEX", name: "INDEX", desc: "Chỉ số" },
  ],
  symbols_types: [
    { name: "Tất cả", value: "" },
    { name: "Cổ phiếu", value: "stock" },
    { name: "Chỉ số", value: "index" },
  ],
}

// Known index symbols
const INDEX_SYMBOLS = new Set([
  "VNINDEX", "VN30", "HNX", "HNX30", "UPCOM", "VN100",
  "VNMID", "VNSMALL", "VNALL", "VN30F1M", "VN30F2M",
])

function getSymbolInfo(symbol: string) {
  const isIndex = INDEX_SYMBOLS.has(symbol.toUpperCase())
  return {
    name: symbol,
    ticker: symbol,
    description: isIndex ? `Chỉ số ${symbol}` : symbol,
    type: isIndex ? "index" : "stock",
    session: "0900-1130,1300-1445",
    timezone: "Asia/Ho_Chi_Minh",
    exchange: isIndex ? "INDEX" : "HOSE",
    listed_exchange: isIndex ? "INDEX" : "HOSE",
    minmov: 1,
    pricescale: isIndex ? 100 : 1000,
    has_intraday: true,
    has_daily: true,
    has_weekly_and_monthly: true,
    supported_resolutions: CONFIG.supported_resolutions,
    volume_precision: 0,
    data_status: "streaming",
    currency_code: "VND",
    format: "price" as const,
  }
}

// Seconds per resolution for countBack calculation
const RESOLUTION_SECONDS: Record<string, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1H": 3600,
  "1D": 86400,
  "1W": 604800,
  "1M": 2592000,
}

async function fetchBars(
  symbol: string,
  interval: string,
  from?: number,
  to?: number,
): Promise<Bar[]> {
  try {
    let url = `${API_BASE}/quote/history/${symbol.toUpperCase()}?interval=${interval}`

    if (from) url += `&from=${formatDateParam(new Date(from * 1000))}`
    if (to) url += `&to=${formatDateParam(new Date(to * 1000))}`

    const resp = await fetch(url)

    if (!resp.ok) return []

    const json = await resp.json()
    const items = json?.data || []

    const bars: Bar[] = items
      .map((item: any) => ({
        time: new Date(item.time).getTime(),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume) || 0,
      }))
      .filter((b: Bar) => !isNaN(b.time) && b.time > 0)
      .sort((a: Bar, b: Bar) => a.time - b.time)

    return bars
  } catch {
    return []
  }
}

// ── News marks helpers ──

const newsMarkCache = new Map<string, NewsMarkGroup[]>()

function getDominantSentiment(items: NewsMarkItem[]): "positive" | "negative" | "neutral" {
  let pos = 0, neg = 0
  for (const item of items) {
    const s = (item.sentiment || "").toLowerCase()
    if (s === "positive") pos++
    else if (s === "negative") neg++
  }
  if (pos > neg) return "positive"
  if (neg > pos) return "negative"
  return "neutral"
}

function sentimentToColor(s: "positive" | "negative" | "neutral"): { border: string; background: string } {
  switch (s) {
    case "positive": return { border: "#10b981", background: "#10b981" }
    case "negative": return { border: "#ef4444", background: "#ef4444" }
    default: return { border: "#f59e0b", background: "#f59e0b" }
  }
}

async function fetchNewsMarks(symbol: string, from: number, to: number): Promise<NewsMarkGroup[]> {
  const cacheKey = `${symbol}-${from}-${to}`
  if (newsMarkCache.has(cacheKey)) return newsMarkCache.get(cacheKey)!

  try {
    const fromDate = new Date(from * 1000).toISOString().slice(0, 10)
    // Cap toDate to today — TradingView may pass far-future timestamps
    const rawTo = new Date(to * 1000)
    const now = new Date()
    const toDate = (rawTo > now ? now : rawTo).toISOString().slice(0, 10)

    const resp = await fetch(
      `${API_BASE}/ai-news/news?ticker=${encodeURIComponent(symbol)}&updateFrom=${fromDate}&updateTo=${toDate}&pageSize=100&language=vi`
    )
    if (!resp.ok) return []

    const json = await resp.json()
    const items: any[] = json?.data || []

    // Group by date (YYYY-MM-DD)
    const grouped = new Map<string, NewsMarkItem[]>()
    for (const item of items) {
      const dateStr = (item.updatedAt || "").slice(0, 10)
      if (!dateStr) continue
      if (!grouped.has(dateStr)) grouped.set(dateStr, [])
      grouped.get(dateStr)!.push({
        id: item.id,
        title: item.title,
        slug: item.slug,
        sentiment: item.sentiment,
        sourceName: item.sourceName,
        updatedAt: item.updatedAt,
        imageUrl: item.imageUrl,
      })
    }

    const result: NewsMarkGroup[] = []
    for (const [dateKey, newsItems] of grouped) {
      // Convert date to start-of-day UTC+7 timestamp
      const d = new Date(dateKey + "T00:00:00+07:00")
      result.push({
        dateKey,
        timestamp: Math.floor(d.getTime() / 1000),
        items: newsItems,
        dominantSentiment: getDominantSentiment(newsItems),
      })
    }

    newsMarkCache.set(cacheKey, result)
    // Keep cache small
    if (newsMarkCache.size > 20) {
      const firstKey = newsMarkCache.keys().next().value
      if (firstKey) newsMarkCache.delete(firstKey)
    }

    return result
  } catch {
    return []
  }
}

/** Get cached news marks for a specific mark ID (dateKey) */
export function getNewsMarkGroup(_symbol: string, markId: string): NewsMarkGroup | null {
  for (const groups of newsMarkCache.values()) {
    const found = groups.find(g => g.dateKey === markId)
    if (found) return found
  }
  return null
}

function formatDateParam(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

// DataPulse for real-time updates (polling)
class DataPulse {
  private _subscribers: Map<
    string,
    {
      symbolInfo: any
      resolution: string
      lastBar: Bar | null
      callback: (bar: Bar) => void
    }
  > = new Map()
  private _timer: ReturnType<typeof setInterval> | null = null

  start() {
    if (this._timer) return
    this._timer = setInterval(() => this._poll(), 15000) // Poll every 15s
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  }

  subscribe(
    key: string,
    symbolInfo: any,
    resolution: string,
    callback: (bar: Bar) => void,
    lastBar: Bar | null,
  ) {
    this._subscribers.set(key, { symbolInfo, resolution, lastBar, callback })
    this.start()
  }

  unsubscribe(key: string) {
    this._subscribers.delete(key)
    if (this._subscribers.size === 0) this.stop()
  }

  private async _poll() {
    for (const [, sub] of this._subscribers) {
      try {
        const interval = RESOLUTION_MAP[sub.resolution] || "1D"
        const now = Math.floor(Date.now() / 1000)
        const from = sub.lastBar ? Math.floor(sub.lastBar.time / 1000) - 60 : now - 86400

        const bars = await fetchBars(sub.symbolInfo.ticker, interval, from, now)
        if (bars.length > 0) {
          const latestBar = bars[bars.length - 1]
          if (!sub.lastBar || latestBar.time >= sub.lastBar.time) {
            sub.lastBar = latestBar
            sub.callback(latestBar)
          }
        }
      } catch {
        // silently continue
      }
    }
  }
}

// ── Export DataFeed ──

export function createDataFeed(): any {
  const dataPulse = new DataPulse()

  return {
    onReady(callback: (config: DataFeedConfig) => void) {
      setTimeout(() => callback(CONFIG), 0)
    },

    async searchSymbols(
      userInput: string,
      _exchange: string,
      _symbolType: string,
      onResult: (items: any[]) => void,
    ) {
      const input = userInput.trim()
      if (!input) {
        onResult([])
        return
      }

      try {
        const resp = await fetch(
          `${API_BASE}/stocks?q=${encodeURIComponent(input)}&limit=20`,
        )
        if (!resp.ok) {
          onResult([])
          return
        }

        const json = await resp.json()
        const items = json?.data || []

        const results = items.map((item: any) => {
          const symbol = (item.symbol || "").toUpperCase()
          const isIndex = INDEX_SYMBOLS.has(symbol)
          return {
            symbol,
            full_name: `${item.exchange || (isIndex ? "INDEX" : "HOSE")}:${symbol}`,
            description: item.name || item.nameEn || (isIndex ? `Chỉ số ${symbol}` : symbol),
            exchange: item.exchange || (isIndex ? "INDEX" : "HOSE"),
            type: isIndex ? "index" : "stock",
            ticker: symbol,
          }
        })

        onResult(results)
      } catch {
        onResult([])
      }
    },

    resolveSymbol(
      symbolName: string,
      onResolve: (info: any) => void,
      onError: (reason: string) => void,
    ) {
      setTimeout(() => {
        const symbol = symbolName.split(":").pop() || symbolName
        try {
          const info = getSymbolInfo(symbol.toUpperCase())
          onResolve(info)
        } catch {
          onError("Symbol not found")
        }
      }, 0)
    },

    getBars(
      symbolInfo: any,
      resolution: string,
      periodParams: { from: number; to: number; firstDataRequest: boolean; countBack?: number },
      onResult: (bars: Bar[], meta: { noData: boolean }) => void,
      onError: (reason: string) => void,
    ) {
      const interval = RESOLUTION_MAP[resolution] || "1D"

      // Calculate proper from based on countBack
      let from: number | undefined = periodParams.from
      const to = periodParams.to

      if (periodParams.countBack && periodParams.countBack > 0) {
        const secPerBar = RESOLUTION_SECONDS[interval] || 86400
        // Add 50% buffer for weekends/holidays
        const needed = Math.ceil(periodParams.countBack * secPerBar * 1.5)
        const countBackFrom = to - needed
        // Use whichever is earlier
        from = Math.min(from || countBackFrom, countBackFrom)
      }

      if (periodParams.firstDataRequest) {
        // On first load, don't limit - let backend use its default range
        from = undefined
      }

      fetchBars(symbolInfo.ticker, interval, from, to)
        .then((bars) => {
          if (bars.length === 0) {
            onResult([], { noData: true })
          } else {
            onResult(bars, { noData: false })
          }
        })
        .catch((err) => onError(err?.message || "Failed to fetch bars"))
    },

    getMarks(
      symbolInfo: any,
      from: number,
      to: number,
      onDataCallback: (marks: any[]) => void,
      _resolution: string,
    ) {
      fetchNewsMarks(symbolInfo.ticker, from, to)
        .then((groups) => {
          const marks = groups.map((group) => ({
            id: group.dateKey,
            time: group.timestamp,
            color: sentimentToColor(group.dominantSentiment),
            text: group.items.map((n) => n.title).join("\n"),
            label: String(group.items.length),
            labelFontColor: "#ffffff",
            minSize: 20,
          }))
          onDataCallback(marks)
        })
        .catch(() => onDataCallback([]))
    },

    subscribeBars(
      symbolInfo: any,
      resolution: string,
      onTick: (bar: Bar) => void,
      listenerGuid: string,
    ) {
      dataPulse.subscribe(listenerGuid, symbolInfo, resolution, onTick, null)
    },

    unsubscribeBars(listenerGuid: string) {
      dataPulse.unsubscribe(listenerGuid)
    },
  }
}
