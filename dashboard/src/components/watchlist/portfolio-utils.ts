export interface PortfolioItem {
  symbol: string
  quantity: number
  avgPrice: number
  currentPrice: number
  totalValue: number
  pnl: number
  pnlPercent: number
}

export interface PortfolioApiItem {
  symbol?: string | null
  quantity?: number | string | null
  avgPrice?: number | string | null
  avgBuyPrice?: number | string | null
  currentPrice?: number | string | null
  totalValue?: number | string | null
  pnl?: number | string | null
  pnlPercent?: number | string | null
}

function toFiniteNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizePortfolioItem(item: PortfolioApiItem): PortfolioItem {
  return {
    symbol: String(item.symbol ?? "").toUpperCase(),
    quantity: toFiniteNumber(item.quantity),
    avgPrice: toFiniteNumber(item.avgPrice ?? item.avgBuyPrice),
    currentPrice: toFiniteNumber(item.currentPrice),
    totalValue: toFiniteNumber(item.totalValue),
    pnl: toFiniteNumber(item.pnl),
    pnlPercent: toFiniteNumber(item.pnlPercent),
  }
}
