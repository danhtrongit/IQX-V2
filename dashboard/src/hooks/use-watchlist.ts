import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

interface WatchlistItem {
  id: string
  name: string
  symbols: string[]
}

interface UseWatchlistReturn {
  watchlists: WatchlistItem[]
  isLoading: boolean
  isSymbolWatched: (symbol: string) => boolean
  toggleSymbol: (symbol: string) => Promise<void>
  defaultListId: string | null
  refresh: () => Promise<void>
}

const DEFAULT_LIST_NAME = "Mặc định"

export function useWatchlist(): UseWatchlistReturn {
  const [watchlists, setWatchlists] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { isAuthenticated } = useAuth()
  const loadedRef = useRef(false)

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setWatchlists([])
      return
    }
    setIsLoading(true)
    try {
      const res = await api.get("watchlist").json<{ data: WatchlistItem[] }>()
      setWatchlists(res.data || [])
    } catch {
      setWatchlists([])
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!loadedRef.current && isAuthenticated) {
      loadedRef.current = true
      load()
    }
    if (!isAuthenticated) {
      loadedRef.current = false
      setWatchlists([])
    }
  }, [isAuthenticated, load])

  const defaultListId = watchlists.length > 0 ? watchlists[0].id : null

  const allWatchedSymbols = new Set(
    watchlists.flatMap((w) => w.symbols.map((s) => s.toUpperCase())),
  )

  const isSymbolWatched = useCallback(
    (symbol: string) => allWatchedSymbols.has(symbol.toUpperCase()),
    [allWatchedSymbols],
  )

  const ensureDefaultList = useCallback(async (): Promise<string> => {
    if (defaultListId) return defaultListId
    const res = await api
      .post("watchlist", { json: { name: DEFAULT_LIST_NAME, symbols: [] } })
      .json<{ data: WatchlistItem }>()
    const newList = res.data
    setWatchlists((prev) => [newList, ...prev])
    return newList.id
  }, [defaultListId])

  const toggleSymbol = useCallback(
    async (symbol: string) => {
      if (!isAuthenticated) return
      const upper = symbol.toUpperCase()
      const watched = allWatchedSymbols.has(upper)

      if (watched) {
        const list = watchlists.find((w) =>
          w.symbols.map((s) => s.toUpperCase()).includes(upper),
        )
        if (!list) return

        await api.delete(`watchlist/${list.id}/symbols/${upper}`).json()
        setWatchlists((prev) =>
          prev.map((w) =>
            w.id === list.id
              ? { ...w, symbols: w.symbols.filter((s) => s.toUpperCase() !== upper) }
              : w,
          ),
        )
      } else {
        const listId = await ensureDefaultList()
        await api
          .post(`watchlist/${listId}/symbols`, { json: { symbol: upper } })
          .json()
        setWatchlists((prev) =>
          prev.map((w) =>
            w.id === listId ? { ...w, symbols: [...w.symbols, upper] } : w,
          ),
        )
      }
    },
    [isAuthenticated, allWatchedSymbols, watchlists, ensureDefaultList],
  )

  return {
    watchlists,
    isLoading,
    isSymbolWatched,
    toggleSymbol,
    defaultListId,
    refresh: load,
  }
}
