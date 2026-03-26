import { useState, useEffect, useCallback, useRef } from "react"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

// ── Types ──

export interface IndexData {
  name: string
  value: number
  change: number
  changePercent: number
  trend: "up" | "down" | "flat"
}

export interface PriceBoardData {
  symbol: string
  exchange: string
  ceilingPrice: number
  floorPrice: number
  referencePrice: number
  openPrice: number
  closePrice: number
  highestPrice: number
  lowestPrice: number
  priceChange: number
  percentChange: number
  totalVolume: number
  totalValue: number
  bid: { price: number; volume: number }[]
  ask: { price: number; volume: number }[]
  foreignBuy: number
  foreignSell: number
  foreignRoom: number | null
}

// ── Fetch Indices from quote/history (last 2 bars) ──

const INDEX_SYMBOLS = ["VNINDEX", "VN30", "HNX", "HNX30", "UPCOM"]
const INDEX_DISPLAY: Record<string, string> = {
  VNINDEX: "VN-Index",
  VN30: "VN30",
  HNX: "HNX-Index",
  HNX30: "HNX30",
  UPCOM: "UPCOM",
}

function formatDateParam(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0")
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = date.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

async function fetchIndexData(): Promise<IndexData[]> {
  const results: IndexData[] = []

  // Only fetch last 7 days (covers weekends/holidays)
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const from = formatDateParam(weekAgo)
  const to = formatDateParam(now)

  await Promise.all(
    INDEX_SYMBOLS.map(async (symbol) => {
      try {
        const resp = await fetch(
          `${API_BASE}/quote/history/${symbol}?interval=1D&from=${from}&to=${to}`
        )
        if (!resp.ok) return
        const json = await resp.json()
        const items = json?.data || []
        if (items.length < 1) return

        // KBS returns data oldest-first → take last items
        const latest = items[items.length - 1]
        const prev = items.length > 1 ? items[items.length - 2] : latest

        const value = latest.close
        const change = value - prev.close
        const changePercent = prev.close ? (change / prev.close) * 100 : 0

        results.push({
          name: INDEX_DISPLAY[symbol] || symbol,
          value,
          change,
          changePercent,
          trend: change > 0 ? "up" : change < 0 ? "down" : "flat",
        })
      } catch {
        // skip failed indices
      }
    }),
  )

  // Sort by original order
  return INDEX_SYMBOLS.map((s) =>
    results.find((r) => r.name === (INDEX_DISPLAY[s] || s)),
  ).filter(Boolean) as IndexData[]
}

// ── Fetch PriceBoard ──

async function fetchPriceBoard(symbols: string[]): Promise<PriceBoardData[]> {
  try {
    const resp = await fetch(`${API_BASE}/trading/price-board`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols }),
    })
    if (!resp.ok) return []
    const json = await resp.json()
    return json?.data || []
  } catch {
    return []
  }
}

// ── Hooks ──

export function useMarketIndices(refreshInterval = 30000) {
  const [indices, setIndices] = useState<IndexData[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    const data = await fetchIndexData()
    if (data.length > 0) setIndices(data)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    load()
    const timer = setInterval(load, refreshInterval)
    return () => clearInterval(timer)
  }, [load, refreshInterval])

  return { indices, isLoading }
}

export function usePriceBoard(symbol: string, refreshInterval = 10000) {
  const [data, setData] = useState<PriceBoardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const prevSymbol = useRef(symbol)

  const load = useCallback(async (sym: string) => {
    if (!sym) return
    const results = await fetchPriceBoard([sym.toUpperCase()])
    if (results.length > 0) setData(results[0])
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (symbol !== prevSymbol.current) {
      setIsLoading(true)
      setData(null)
      prevSymbol.current = symbol
    }
    load(symbol)
    const timer = setInterval(() => load(symbol), refreshInterval)
    return () => clearInterval(timer)
  }, [symbol, load, refreshInterval])

  return { data, isLoading }
}

// ── Arena Account Hook ──

export interface ArenaAccountData {
  id: string
  balance: number
  initialBalance: number
  pnl: number
  pnlPercent: number
  winRate: number
  totalOrders: number
  pendingOrders: number
  portfolio: { symbol: string; quantity: number; avgBuyPrice: number }[]
}

export function useArenaAccount(isAuthenticated: boolean, refreshInterval = 15000) {
  const [account, setAccount] = useState<ArenaAccountData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setAccount(null)
      return
    }
    setIsLoading(true)
    try {
      const token = localStorage.getItem("accessToken")
      if (!token) return
      const resp = await fetch(`${API_BASE}/arena/account`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) {
        setAccount(null)
        return
      }
      const json = await resp.json()
      setAccount(json?.data || null)
    } catch {
      setAccount(null)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    load()
    if (!isAuthenticated) return
    const timer = setInterval(load, refreshInterval)
    return () => clearInterval(timer)
  }, [load, isAuthenticated, refreshInterval])

  return { account, isLoading, refresh: load }
}
