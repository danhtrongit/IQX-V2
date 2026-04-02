import { useState, useEffect, useCallback } from "react"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

// ── Types (shared by context + consumers) ──

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

export async function fetchIndexData(): Promise<IndexData[]> {
  const results: IndexData[] = []

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

  return INDEX_SYMBOLS.map((s) =>
    results.find((r) => r.name === (INDEX_DISPLAY[s] || s)),
  ).filter(Boolean) as IndexData[]
}

// ── Fetch PriceBoard (batch) ──

export async function fetchPriceBoard(symbols: string[]): Promise<PriceBoardData[]> {
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

// ── Arena Account Hook (independent — not part of market data context) ──

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
