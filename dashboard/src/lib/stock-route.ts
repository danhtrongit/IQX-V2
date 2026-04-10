import { isKnownIndexSymbol } from "./market-symbols"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

interface StockLookupResponse {
  data?: {
    symbol?: string | null
  } | null
}

export async function isSupportedStockRouteSymbol(
  symbol: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const normalizedSymbol = symbol.toUpperCase().trim()

  if (!normalizedSymbol) return false
  if (isKnownIndexSymbol(normalizedSymbol)) return true

  try {
    const response = await fetchImpl(
      `${API_BASE}/stocks/${encodeURIComponent(normalizedSymbol)}`,
    )

    if (!response.ok) return true

    const payload = (await response.json()) as StockLookupResponse
    return Boolean(payload?.data?.symbol)
  } catch {
    // Do not route to 404 on transient network failures.
    return true
  }
}
