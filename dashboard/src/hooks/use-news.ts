import { useState, useEffect, useCallback, useRef } from "react"
import { api } from "@/lib/api"

export interface NewsItem {
  id: string
  ticker: string | null
  industry: string | null
  title: string
  shortContent: string | null
  sourceLink: string | null
  imageUrl: string | null
  updatedAt: string
  source: string | null
  sourceName: string | null
  sentiment: string | null
  score: number | null
  slug: string
}

export interface NewsArticle {
  id: string
  ticker: string | null
  companyName: string | null
  industry: string | null
  title: string
  shortContent: string | null
  summary: string | null
  highlightPosition: string | null
  fullContent: string | null
  sourceLink: string | null
  imageUrl: string | null
  updatedAt: string
  source: string | null
  sourceName: string | null
  sentiment: string | null
  score: number | null
  slug: string
  newsType: string | null
  fileAttachments: any[]
}

export interface NewsFilter {
  ticker?: string
  sentiment?: string
  newsfrom?: string
  industry?: string
}

interface NewsListResponse {
  message: string
  data: NewsItem[]
  pagination: { total: number; page: number; pageSize: number }
}

interface ArticleResponse {
  message: string
  data: NewsArticle | null
}

interface FilterOption {
  name: string
  value: string
}

export function useNewsList(filters: NewsFilter = {}, pageSize = 15) {
  const [items, setItems] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const fetchNews = useCallback(async (p: number, f: NewsFilter) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setIsLoading(true)
    try {
      const params: Record<string, string | number> = {
        page: p,
        pageSize,
        language: "vi",
      }
      if (f.ticker) params.ticker = f.ticker
      if (f.sentiment) params.sentiment = f.sentiment
      if (f.newsfrom) params.newsfrom = f.newsfrom
      if (f.industry) params.industry = f.industry

      const res = await api
        .get("ai-news/news", { searchParams: params, signal: ctrl.signal })
        .json<NewsListResponse>()

      setItems(res.data)
      setTotal(res.pagination.total)
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setItems([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    setPage(1)
    fetchNews(1, filters)
  }, [filters.ticker, filters.sentiment, filters.newsfrom, filters.industry, fetchNews])

  const loadPage = (p: number) => {
    setPage(p)
    fetchNews(p, filters)
  }

  const refresh = () => fetchNews(page, filters)

  return { items, isLoading, page, total, pageSize, loadPage, refresh }
}

export function useNewsArticle(slug: string | null) {
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!slug) {
      setArticle(null)
      return
    }
    let cancelled = false
    setIsLoading(true)
    api
      .get(`ai-news/article/${slug}`, { searchParams: { language: "vi" } })
      .json<ArticleResponse>()
      .then((res) => {
        if (!cancelled) setArticle(res.data)
      })
      .catch(() => {
        if (!cancelled) setArticle(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [slug])

  return { article, isLoading }
}

export function useNewsFilters() {
  const [industries, setIndustries] = useState<FilterOption[]>([])
  const [sources, setSources] = useState<FilterOption[]>([])

  useEffect(() => {
    api
      .get("ai-news/industries", { searchParams: { language: "vi" } })
      .json<{ data: FilterOption[] }>()
      .then((r) => setIndustries(r.data))
      .catch(() => {})

    api
      .get("ai-news/sources", { searchParams: { language: "vi" } })
      .json<{ data: FilterOption[] }>()
      .then((r) => setSources(r.data))
      .catch(() => {})
  }, [])

  return { industries, sources }
}
