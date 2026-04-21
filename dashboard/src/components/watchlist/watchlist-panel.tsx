import { useState, useEffect, useCallback, useMemo } from "react"
import {
  Eye,
  Briefcase,
  History,
  Plus,
  X,
  Loader2,
  Star,
  LogIn,
  Clock,
  Search,
} from "lucide-react"
import { StockLogo } from "@/components/stock/stock-logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/auth-context"
import { api } from "@/lib/api"
import { useNavigate } from "react-router"
import { type PriceBoardData } from "@/hooks/use-market-data"
import { usePrices } from "@/contexts/market-data-context"
import {
  normalizePortfolioItem,
  type PortfolioApiItem,
  type PortfolioItem,
} from "./portfolio-utils"

type WatchlistTab = "watchlist" | "holdings" | "history"

interface WatchlistItem {
  id: string
  name: string
  symbols: string[]
  createdAt: string
}

interface OrderItem {
  id: string
  symbol: string
  side: "BUY" | "SELL"
  quantity: number
  price: number
  total: number
  status: string
  createdAt: string
}

// ── Utility ──
const fp = (n: number) => (!n || n <= 0 ? "—" : (n * 1000).toLocaleString("vi-VN", { maximumFractionDigits: 0 }))
const fv = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n))

function pc(price: number, ref: number, ceil: number, floor: number): string {
  if (!price || !ref) return "text-foreground"
  if (price >= ceil) return "text-fuchsia-500"
  if (price <= floor) return "text-cyan-400"
  if (price > ref) return "text-emerald-400"
  if (price < ref) return "text-red-400"
  return "text-amber-400"
}

// ── Compact stock row — dense bảng giá style ──
function StockRow({
  symbol,
  d,
  onClick,
}: {
  symbol: string
  d?: PriceBoardData
  onClick: () => void
}) {
  const price = d?.closePrice || 0
  const chg = d?.priceChange || 0
  const pct = d?.percentChange || 0
  const ref = d?.referencePrice || 0
  const ceil = d?.ceilingPrice || 0
  const floor = d?.floorPrice || 0
  const isUp = chg > 0
  const isDown = chg < 0

  const color = pc(price, ref, ceil, floor)

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-2 py-1.5 hover:bg-muted/40 transition-colors group active:scale-[0.995]"
    >
      <div className="flex items-center gap-2">
        <StockLogo symbol={symbol} size={28} />
        <div className="flex-1 min-w-0 flex justify-between items-center">
          {/* Left: Symbol */}
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
              {symbol}
            </span>
          </div>

          {/* Right: Price & Percent */}
          <div className="flex flex-col items-end">
            <span className={`text-xs font-black tabular-nums tracking-tight ${color}`}>
              {fp(price)}
            </span>
            {price > 0 ? (
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`text-[9px] font-semibold tabular-nums px-1 py-[1px] rounded leading-none ${
                    isUp
                      ? "bg-emerald-500/15 text-emerald-500"
                      : isDown
                        ? "bg-red-500/15 text-red-500"
                        : "bg-muted text-amber-500"
                  }`}
                >
                  {isUp ? "+" : ""}{(pct || 0).toFixed(2)}%
                </span>
              </div>
            ) : (
              <span className="text-[9px] text-muted-foreground/50 mt-0.5">---</span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Pulse dot ──
function PulseDot() {
  return (
    <span className="relative flex size-1.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
    </span>
  )
}

/* ─── Tab: Danh sách theo dõi ─── */
function WatchlistTabContent() {
  const [lists, setLists] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [addingSymbol, setAddingSymbol] = useState(false)
  const [newSymbol, setNewSymbol] = useState("")
  const navigate = useNavigate()

  const fetchLists = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("watchlist").json<{ data: WatchlistItem[] }>()
      const data = res.data || []
      setLists(data)
    } catch {
      setLists([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLists() }, [fetchLists])

  const allSymbols = useMemo(
    () => [...new Set(lists.flatMap((l) => l.symbols))],
    [lists],
  )
  const { priceMap } = usePrices(allSymbols)

  const handleAddSymbol = async () => {
    const sym = newSymbol.trim().toUpperCase()
    if (!sym) return
    setAddingSymbol(true)
    try {
      // Add to the first watchlist, or create one if none exists
      if (lists.length === 0) {
        await api.post("watchlist", { json: { name: "Danh mục", symbols: [sym] } }).json()
      } else {
        await api.put(`watchlist/${lists[0].id}/symbols`, { json: { symbol: sym } }).json()
      }
      setNewSymbol("")
      fetchLists()
    } catch {}
    finally {
      setAddingSymbol(false)
    }
  }

  const handleRemoveSymbol = async (sym: string) => {
    try {
      if (lists.length > 0) {
        await api.delete(`watchlist/${lists[0].id}/symbols/${sym}`).json()
        fetchLists()
      }
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground mb-2" />
        <span className="text-[10px] text-muted-foreground">Đang tải...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-1.5">
          <PulseDot />
          <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">
            Live · 10s
          </span>
        </div>
        <span className="text-[8px] text-muted-foreground tabular-nums">
          {allSymbols.length} mã
        </span>
      </div>

      {/* Add symbol */}
      <div className="px-1.5 py-1.5 border-b border-border/40">
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/50" />
            <Input
              placeholder="Thêm mã cổ phiếu..."
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleAddSymbol()}
              className="h-6 text-[10px] bg-muted/20 border-transparent focus:border-primary/50 pl-6 pr-2"
            />
          </div>
          <Button
            size="icon"
            className="size-6 shrink-0"
            onClick={handleAddSymbol}
            disabled={!newSymbol.trim() || addingSymbol}
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="py-0.5">
          {allSymbols.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Star className="size-7 mb-2 opacity-20" />
              <p className="text-[10px]">Chưa có mã theo dõi</p>
              <p className="text-[9px] mt-1 text-center px-4 opacity-50">
                Thêm mã cổ phiếu để bắt đầu theo dõi
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {allSymbols.map((sym) => (
                <div key={sym} className="relative group">
                  <StockRow
                    symbol={sym}
                    d={priceMap[sym.toUpperCase()]}
                    onClick={() => navigate(`/co-phieu/${sym}`)}
                  />
                  <button
                    onClick={() => handleRemoveSymbol(sym)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 size-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 text-destructive"
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

/* ─── Tab: Danh mục nắm giữ ─── */
function HoldingsTabContent() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [loading, setLoading] = useState(true)
  const [account, setAccount] = useState<{
    balance: number
    totalAssets: number
    pnl: number
    pnlPercent: number
  } | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [portfolioRes, accountRes] = await Promise.all([
          api.get("arena/portfolio").json<{ data: PortfolioApiItem[] }>(),
          api.get("arena/account").json<{ data: any }>(),
        ])
        setItems((portfolioRes.data || []).map(normalizePortfolioItem))
        setAccount(accountRes.data)
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const holdingSymbols = useMemo(() => items.map((i) => i.symbol), [items])
  const { priceMap } = usePrices(holdingSymbols)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground mb-2" />
        <span className="text-[10px] text-muted-foreground">Đang tải...</span>
      </div>
    )
  }

  const totalPnl = account?.pnl ?? 0
  const totalPnlPct = account?.pnlPercent ?? 0
  const isProfit = totalPnl >= 0

  return (
    <div className="flex flex-col h-full">
      {/* Account Summary — compact */}
      {account && (
        <div className="px-2 py-1.5 border-b border-border/50 bg-muted/10 space-y-[3px]">
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-muted-foreground">Tài sản</span>
            <span className="font-bold text-foreground tabular-nums">
              {fv(account.totalAssets ?? 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-muted-foreground">Tiền mặt</span>
            <span className="text-foreground/80 tabular-nums">{fv(account.balance ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-muted-foreground">Lãi/Lỗ</span>
            <div className="flex items-center gap-1">
              <span className={`font-bold tabular-nums ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                {isProfit ? "+" : ""}{fv(totalPnl)}
              </span>
              <span
                className={`text-[8px] font-bold tabular-nums px-1 py-[1px] rounded ${
                  isProfit ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                }`}
              >
                {isProfit ? "+" : ""}{totalPnlPct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Realtime indicator */}
      {items.length > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/30 bg-muted/5">
          <PulseDot />
          <span className="text-[8px] text-muted-foreground font-medium uppercase tracking-wider">
            Live · 10s
          </span>
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <div className="py-0.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Briefcase className="size-7 mb-2 opacity-20" />
              <p className="text-[10px]">Chưa nắm giữ cổ phiếu nào</p>
              <p className="text-[9px] mt-1 opacity-50">Đặt lệnh mua để bắt đầu</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {items.map((item) => {
                const live = priceMap[item.symbol.toUpperCase()]
                const currentPrice = live?.closePrice || item.currentPrice || 0
                const ref = live?.referencePrice || 0
                const ceil = live?.ceilingPrice || 0
                const floor = live?.floorPrice || 0
                const pnlPct = item.pnlPercent ?? 0
                const isP = pnlPct >= 0
                const priceColor = pc(currentPrice, ref, ceil, floor)

                return (
                  <button
                    key={item.symbol}
                    onClick={() => navigate(`/co-phieu/${item.symbol}`)}
                    className="w-full text-left px-2 py-1.5 hover:bg-muted/40 transition-colors group active:scale-[0.995]"
                  >
                    <div className="flex items-center gap-2">
                      <StockLogo symbol={item.symbol} size={28} />
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Mã | Số lượng | Giá hiện tại */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {item.symbol}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {(item.quantity ?? 0).toLocaleString("vi-VN")}
                            </span>
                            <span className={`text-xs font-black tabular-nums tracking-tight min-w-[52px] text-right ${priceColor}`}>
                              {fp(currentPrice)}
                            </span>
                          </div>
                        </div>
                        {/* Row 2: (gap) | Giá vốn | % lãi/lỗ */}
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[9px] text-muted-foreground/60"></span>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] text-muted-foreground/70 tabular-nums">
                              {fv(item.avgPrice)}
                            </span>
                            <span
                              className={`text-[9px] font-bold tabular-nums px-1 py-[1px] rounded leading-none min-w-[52px] text-right ${
                                isP
                                  ? "bg-emerald-500/15 text-emerald-500"
                                  : "bg-red-500/15 text-red-500"
                              }`}
                            >
                              {isP ? "+" : ""}{pnlPct.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

/* ─── Tab: Lịch sử ─── */
function HistoryTabContent() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true)
      try {
        const params: Record<string, string | number> = { page: 1, limit: 30 }
        if (statusFilter && statusFilter !== "all") params.status = statusFilter
        const res = await api
          .get("arena/orders", { searchParams: params })
          .json<{ data: OrderItem[] }>()
        setOrders(res.data || [])
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [statusFilter])

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("vi-VN", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    })

  const statusCls: Record<string, string> = {
    FILLED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    CANCELLED: "bg-muted text-muted-foreground border-border",
    REJECTED: "bg-red-500/15 text-red-400 border-red-500/20",
  }
  const statusLbl: Record<string, string> = {
    FILLED: "Khớp", PENDING: "Chờ", CANCELLED: "Huỷ", REJECTED: "Từ chối",
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground mb-2" />
        <span className="text-[10px] text-muted-foreground">Đang tải...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex gap-1 px-1.5 py-1 border-b border-border/40 overflow-x-auto">
        {[
          { value: "all", label: "Tất cả" },
          { value: "FILLED", label: "Khớp" },
          { value: "PENDING", label: "Chờ" },
          { value: "CANCELLED", label: "Huỷ" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-1.5 py-[2px] rounded-full text-[9px] font-medium transition-colors whitespace-nowrap ${
              statusFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted/20 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="py-0.5">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="size-7 mb-2 opacity-20" />
              <p className="text-[10px]">Chưa có lịch sử giao dịch</p>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center gap-1.5 px-2 py-[5px] hover:bg-muted/30 transition-colors border-b border-border/10 last:border-0"
              >
                {/* Side */}
                <div
                  className={`size-5 rounded flex items-center justify-center shrink-0 ${
                    order.side === "BUY"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  <span className="text-[7px] font-black">{order.side === "BUY" ? "M" : "B"}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <StockLogo symbol={order.symbol} size={14} />
                      <span className="text-[10px] font-bold text-foreground">{order.symbol}</span>
                      <Badge className={`text-[6px] px-[3px] py-0 h-3 ${statusCls[order.status] || ""}`}>
                        {statusLbl[order.status] || order.status}
                      </Badge>
                    </div>
                    <span className="text-[9px] text-foreground tabular-nums font-medium">{fv(order.price)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-[1px]">
                    <span className="text-[8px] text-muted-foreground/60 flex items-center gap-0.5">
                      <Clock className="size-2" />{fmtDate(order.createdAt)}
                    </span>
                    <span className="text-[8px] text-muted-foreground tabular-nums">{order.quantity} cp</span>
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

/* ─── Main Panel ─── */
const TABS: { id: WatchlistTab; label: string; icon: React.ElementType }[] = [
  { id: "watchlist", label: "Theo dõi", icon: Eye },
  { id: "holdings", label: "Nắm giữ", icon: Briefcase },
  { id: "history", label: "Lịch sử", icon: History },
]

export function WatchlistPanel() {
  const { isAuthenticated, setShowAuthModal } = useAuth()
  const [activeTab, setActiveTab] = useState<WatchlistTab>("watchlist")

  if (!isAuthenticated) {
    return (
      <aside className="flex w-full shrink-0 flex-col bg-card items-center justify-center h-full">
        <Eye className="size-8 mb-2 text-muted-foreground opacity-20" />
        <p className="text-[10px] text-muted-foreground mb-2">Đăng nhập để sử dụng</p>
        <Button size="sm" className="text-[10px] h-6" onClick={() => setShowAuthModal(true)}>
          <LogIn className="size-3 mr-1" />Đăng nhập
        </Button>
      </aside>
    )
  }

  return (
    <aside className="flex w-full shrink-0 flex-col bg-card h-full">
      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-colors relative ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3" />
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === "watchlist" && <WatchlistTabContent />}
        {activeTab === "holdings" && <HoldingsTabContent />}
        {activeTab === "history" && <HistoryTabContent />}
      </div>
    </aside>
  )
}
