import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import {
  fetchPriceBoard,
  type PriceBoardData,
  type IndexData,
} from "@/hooks/use-market-data"
import { connectMarketSocket, disconnectMarketSocket } from "@/lib/socket"

// ── Types ──

interface MarketDataContextType {
  priceMap: Record<string, PriceBoardData>
  indices: IndexData[]
  isLoading: boolean
  subscribe: (symbols: string[]) => () => void
}

const MarketDataContext = createContext<MarketDataContextType>({
  priceMap: {},
  indices: [],
  isLoading: true,
  subscribe: () => () => {},
})

// ── Constants ──

const PRICE_INTERVAL = 5_000  // 5s — unified for all consumers

// ── Provider ──

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const [priceMap, setPriceMap] = useState<Record<string, PriceBoardData>>({})
  const [indices, setIndices] = useState<IndexData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Ref-counted subscription tracking
  // Key: uppercase symbol, Value: number of active subscribers
  const refCountMap = useRef<Map<string, number>>(new Map())
  const [subscribedSymbols, setSubscribedSymbols] = useState<string[]>([])

  const subscribe = useCallback((symbols: string[]): (() => void) => {
    const map = refCountMap.current
    let changed = false

    for (const sym of symbols) {
      const upper = sym.toUpperCase()
      if (!upper) continue
      const prev = map.get(upper) || 0
      map.set(upper, prev + 1)
      if (prev === 0) changed = true
    }

    if (changed) {
      setSubscribedSymbols(Array.from(map.keys()))
    }

    // Return unsubscribe function
    return () => {
      let removed = false
      for (const sym of symbols) {
        const upper = sym.toUpperCase()
        if (!upper) continue
        const count = map.get(upper) || 0
        if (count <= 1) {
          map.delete(upper)
          removed = true
        } else {
          map.set(upper, count - 1)
        }
      }
      if (removed) {
        setSubscribedSymbols(Array.from(map.keys()))
      }
    }
  }, [])

  // ── Price polling (single batch for ALL symbols) ──

  const symbolsKey = useMemo(
    () => [...subscribedSymbols].sort().join(","),
    [subscribedSymbols],
  )

  useEffect(() => {
    if (!symbolsKey) {
      setIsLoading(false)
      return
    }

    const syms = symbolsKey.split(",").filter(Boolean)
    let cancelled = false

    const load = async () => {
      const results = await fetchPriceBoard(syms)
      if (cancelled) return
      const map: Record<string, PriceBoardData> = {}
      for (const item of results) {
        map[item.symbol] = item
      }
      // Merge: keep data for symbols not in this batch
      setPriceMap((prev) => ({ ...prev, ...map }))
      setIsLoading(false)
    }

    load() // immediate first fetch
    const timer = setInterval(load, PRICE_INTERVAL)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [symbolsKey])

  // ── Indices: WebSocket Subscription ──

  useEffect(() => {
    const s = connectMarketSocket()

    const onIndicesUpdate = (rawList: any[]) => {
      if (rawList && rawList.length > 0) {
        const INDEX_DISPLAY: Record<string, string> = {
          VNINDEX: "VN-Index",
          VN30: "VN30",
          HNX: "HNX-Index",
          HNX30: "HNX30",
          UPCOM: "UPCOM",
        }

        // Only take the main indices we care about
        const mainKeys = ["VNINDEX", "VN30", "HNX", "UPCOM"]
        const filtered = rawList.filter(r => mainKeys.includes(r.symbol))

        const mapped: IndexData[] = filtered.map(r => ({
          name: INDEX_DISPLAY[r.symbol] || r.symbol,
          value: r.price,
          change: r.change,
          changePercent: r.changePercent,
          trend: r.change > 0 ? "up" : r.change < 0 ? "down" : "flat",
        }))

        // Sort properly
        mapped.sort((a, b) => mainKeys.indexOf(Object.keys(INDEX_DISPLAY).find(k => INDEX_DISPLAY[k] === a.name) || a.name) - mainKeys.indexOf(Object.keys(INDEX_DISPLAY).find(k => INDEX_DISPLAY[k] === b.name) || b.name))

        setIndices(mapped)
        setIsLoading(false)
      }
    }

    s.on("market_indices_update", onIndicesUpdate)
    
    // Fallback/Initial Request if socket takes time? We can wait.

    return () => {
      s.off("market_indices_update", onIndicesUpdate)
      disconnectMarketSocket()
    }
  }, [])

  // ── Pause polling when tab is hidden ──

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        // Tab became visible → trigger immediate refresh
        const syms = Array.from(refCountMap.current.keys())
        if (syms.length > 0) {
          fetchPriceBoard(syms).then((results) => {
            const map: Record<string, PriceBoardData> = {}
            for (const item of results) {
              map[item.symbol] = item
            }
            setPriceMap((prev) => ({ ...prev, ...map }))
          })
        }
        // Indices are automatically updated by websocket on reconnection if needed.
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)
    return () => document.removeEventListener("visibilitychange", handleVisibility)
  }, [])

  const value = useMemo(
    () => ({ priceMap, indices, isLoading, subscribe }),
    [priceMap, indices, isLoading, subscribe],
  )

  return (
    <MarketDataContext.Provider value={value}>
      {children}
    </MarketDataContext.Provider>
  )
}

// ── Consumer Hooks ──

/** Raw context access */
export function useMarketData() {
  return useContext(MarketDataContext)
}

/** Subscribe to a single symbol's live price */
export function usePrice(symbol: string): { data: PriceBoardData | null; isLoading: boolean } {
  const { priceMap, isLoading, subscribe } = useContext(MarketDataContext)
  const upper = symbol.toUpperCase()

  useEffect(() => {
    if (!upper) return
    return subscribe([upper])
  }, [upper, subscribe])

  return {
    data: upper ? priceMap[upper] ?? null : null,
    isLoading: isLoading && !priceMap[upper],
  }
}

/** Subscribe to multiple symbols' live prices (batch) */
export function usePrices(symbols: string[]): { priceMap: Record<string, PriceBoardData>; isLoading: boolean } {
  const ctx = useContext(MarketDataContext)

  const symbolsKey = useMemo(
    () => symbols.map((s) => s.toUpperCase()).sort().join(","),
    [symbols],
  )

  useEffect(() => {
    const syms = symbolsKey.split(",").filter(Boolean)
    if (syms.length === 0) return
    return ctx.subscribe(syms)
  }, [symbolsKey, ctx.subscribe])

  const subset = useMemo(() => {
    const result: Record<string, PriceBoardData> = {}
    for (const sym of symbolsKey.split(",")) {
      if (sym && ctx.priceMap[sym]) {
        result[sym] = ctx.priceMap[sym]
      }
    }
    return result
  }, [symbolsKey, ctx.priceMap])

  return {
    priceMap: subset,
    isLoading: ctx.isLoading,
  }
}

/** Get market indices data (auto-polled) */
export function useIndices(): { indices: IndexData[]; isLoading: boolean } {
  const { indices, isLoading } = useContext(MarketDataContext)
  return { indices, isLoading: isLoading && indices.length === 0 }
}
