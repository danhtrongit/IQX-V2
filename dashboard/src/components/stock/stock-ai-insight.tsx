import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  type NodeProps,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { motion, AnimatePresence } from "framer-motion"
import {
  TrendingUp,
  Droplets,
  ArrowLeftRight,
  Users,
  Newspaper,
  Brain,
  X,
  Database,
  Sparkles,
  Clock,
  ChevronDown,
  Table,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

// ── Layer config ──

const LAYERS_ORDER = ["trend", "liquidity", "moneyFlow", "insider", "news"] as const

const LAYER_CONFIG: Record<string, {
  label: string
  shortLabel: string
  icon: typeof TrendingUp
  color: string
  description: string
}> = {
  trend: {
    label: "Xu hướng",
    shortLabel: "L1",
    icon: TrendingUp,
    color: "#3b82f6",
    description: "MA, hỗ trợ/kháng cự",
  },
  liquidity: {
    label: "Thanh khoản",
    shortLabel: "L2",
    icon: Droplets,
    color: "#06b6d4",
    description: "Cung cầu, áp lực vào/ra",
  },
  moneyFlow: {
    label: "Dòng tiền",
    shortLabel: "L3",
    icon: ArrowLeftRight,
    color: "#10b981",
    description: "Nước ngoài, tự doanh",
  },
  insider: {
    label: "Nội bộ",
    shortLabel: "L4",
    icon: Users,
    color: "#f59e0b",
    description: "GD cổ đông, ban lãnh đạo",
  },
  news: {
    label: "Tin tức",
    shortLabel: "L5",
    icon: Newspaper,
    color: "#ec4899",
    description: "AI sentiment, điểm tin",
  },
}

interface InsightResponse {
  symbol: string
  timestamp: string
  layers: Record<string, { label: string; output: any }>
  rawInput: {
    trend: { realtime: any; ohlcv: any[]; computed: { ma10: number; ma20: number; volMa10: number; volMa20: number; latestClose: number } }
    liquidity: { latest: any; avg30: any; history: any[] }
    moneyFlow: { foreign: any[]; proprietary: any[] }
    insider: { transactions: any[] }
    news: { items: any[]; tickerScore: any }
  }
  dataSummary: Record<string, any>
}

// ── Utility ──

function fmtNum(n: number): string {
  if (n == null) return "—"
  const abs = Math.abs(n)
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B"
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M"
  if (abs >= 1e3) return (n / 1e3).toFixed(0) + "K"
  return n.toLocaleString("vi-VN")
}

function renderOutput(output: any): React.ReactNode {
  if (!output) return null
  if (typeof output === "string") return <span>{output}</span>
  if (output.error) return <span className="text-red-400 text-[10px]">⚠️ {output.error}</span>
  if (output.text) return <span className="whitespace-pre-wrap">{output.text}</span>

  // Structured JSON output → render key-value (keys are Vietnamese)
  return (
    <div className="space-y-1">
      {Object.entries(output).map(([key, val]) => {
        if ((key === "items" || key === "Tin tức") && Array.isArray(val)) {
          return (
            <div key={key} className="space-y-0.5">
              <span className="text-[10px] text-muted-foreground font-semibold">{key}:</span>
              {(val as string[]).map((item, i) => (
                <div key={i} className="text-[11px] text-foreground/80 pl-2 border-l-2 border-border/20">
                  {item}
                </div>
              ))}
            </div>
          )
        }
        return (
          <div key={key} className="flex gap-2">
            <span className="text-[10px] text-muted-foreground shrink-0 min-w-[80px] font-semibold">
              {key}:
            </span>
            <span className="text-[11px] text-foreground/90">{String(val)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Custom Nodes ──

function LayerNode({ data }: NodeProps) {
  const cfg = LAYER_CONFIG[data.layerKey as string]
  if (!cfg) return null
  const Icon = cfg.icon
  const isActive = data.isActive as boolean
  const isVisible = data.isVisible as boolean
  const animDelay = (data.animDelay as number) || 0
  const layerOutput = data.layerOutput as any

  // Build full description from structured output (Vietnamese keys)
  const description = useMemo(() => {
    if (!layerOutput || typeof layerOutput !== "object") return ""
    if (layerOutput.text) return layerOutput.text
    const key = data.layerKey as string
    if (key === "trend") {
      const parts = [
        layerOutput["Xu hướng"] || layerOutput.trend,
        layerOutput["Trạng thái"] || layerOutput.state,
        layerOutput["Ghi chú"] || layerOutput.note,
      ].filter(Boolean)
      return parts.join(". ")
    }
    if (key === "liquidity") {
      return [
        layerOutput["Thanh khoản"] || layerOutput.liquidity,
        layerOutput["Cung - Cầu"] || layerOutput.supplyDemand,
        layerOutput["Tác động"] || layerOutput.impact,
      ].filter(Boolean).join(". ")
    }
    if (key === "moneyFlow") {
      return [
        layerOutput["Khối ngoại"] || layerOutput.foreign,
        layerOutput["Tự doanh"] || layerOutput.proprietary,
        layerOutput["Tác động"] || layerOutput.implication,
      ].filter(Boolean).join(". ")
    }
    if (key === "insider") {
      return [
        layerOutput.insider,
        layerOutput.impactLevel,
      ].filter(Boolean).join(". ")
    }
    if (key === "news") {
      return [
        layerOutput["Tổng quan"] || layerOutput.overview,
        layerOutput["Tác động"] || layerOutput.implication,
      ].filter(Boolean).join(". ")
    }
    return Object.values(layerOutput).filter(v => typeof v === "string").join(". ")
  }, [layerOutput, data.layerKey])

  // Extract tags for trend layer (supports both old English + new Vietnamese keys)
  const tags = useMemo(() => {
    if (!layerOutput || data.layerKey !== "trend") return []
    const result: { label: string; color: string }[] = []
    const trendVal = layerOutput["Xu hướng"] || layerOutput.trend
    if (trendVal) {
      const t = String(trendVal).toLowerCase()
      if (t.includes("tăng")) result.push({ label: "Tăng", color: "#10b981" })
      else if (t.includes("giảm")) result.push({ label: "Giảm", color: "#ef4444" })
      else result.push({ label: "Đi ngang", color: "#f59e0b" })
    }
    const stateVal = layerOutput["Trạng thái"] || layerOutput.state
    if (stateVal) {
      const s = String(stateVal).toLowerCase()
      if (s.includes("mạnh")) result.push({ label: "Mạnh", color: "#3b82f6" })
      else if (s.includes("yếu")) result.push({ label: "Yếu", color: "#94a3b8" })
      else result.push({ label: "Giằng co", color: "#f59e0b" })
    }
    return result
  }, [layerOutput, data.layerKey])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.3 }}
      animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }}
      transition={{ delay: animDelay, duration: 0.5, type: "spring", stiffness: 160, damping: 16 }}
    >
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div className={`cursor-pointer transition-all duration-300 ${isActive ? "scale-[1.03]" : "hover:scale-[1.02]"}`}>
        <div
          className="w-[230px] rounded-xl border backdrop-blur-sm p-3"
          style={{
            backgroundColor: `${cfg.color}06`,
            borderColor: isActive ? cfg.color : `${cfg.color}25`,
            boxShadow: isActive
              ? `0 0 20px ${cfg.color}25, 0 4px 16px rgba(0,0,0,0.3)`
              : `0 2px 8px rgba(0,0,0,0.15)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[8px] font-black uppercase tracking-[0.15em]" style={{ color: cfg.color }}>{cfg.shortLabel === "L1" ? "TREND" : cfg.shortLabel === "L2" ? "LIQUIDITY" : cfg.shortLabel === "L3" ? "INSTITUTIONAL" : cfg.shortLabel === "L4" ? "INSIDER" : "RULES"}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="size-4 shrink-0" style={{ color: cfg.color }} />
            <span className="text-[12px] font-bold text-foreground">{cfg.label}</span>
          </div>

          {/* Description — full text */}
          {description && (
            <p className="text-[10px] text-foreground/75 leading-relaxed mb-2">{description}</p>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function DecisionNode({ data }: NodeProps) {
  const isVisible = data.isVisible as boolean
  const isActive = data.isActive as boolean
  const layerOutput = data.layerOutput as any
  const priceData = data.priceData as { price: number; change: number; changePct: number } | null

  const overview = useMemo(() => {
    if (!layerOutput || typeof layerOutput !== "object") return ""
    return layerOutput["Tổng quan"] || layerOutput.overview || layerOutput["Hành động chính"] || layerOutput.mainAction || ""
  }, [layerOutput])

  // Extract trend + state tags from L1 output passed via data
  const trendTags = data.trendTags as { label: string; color: string }[] | undefined

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
      transition={{ delay: 1.6, duration: 0.7, type: "spring", stiffness: 110, damping: 14 }}
    >
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div className={`cursor-pointer transition-all duration-300 ${isActive ? "scale-105" : "hover:scale-[1.02]"}`}>
        <div
          className="w-[260px] rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/8 via-background/90 to-background/80 backdrop-blur-sm p-4"
          style={{
            boxShadow: isActive
              ? "0 0 28px hsl(var(--primary) / 0.25), 0 8px 24px rgba(0,0,0,0.3)"
              : "0 4px 20px rgba(0,0,0,0.25)",
          }}
        >
          {/* Title */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="size-4 text-primary" />
            <div className="text-center">
              <p className="text-[11px] font-bold text-foreground">IQX AI Insights</p>
              <p className="text-[8px] text-muted-foreground uppercase tracking-widest">Tổng hợp phân tích</p>
            </div>
          </div>

          {/* Price */}
          {priceData && (
            <div className="text-center mb-2">
              <span className="text-xl font-bold text-foreground tabular-nums">
                {priceData.price.toLocaleString("vi-VN")}
              </span>
              <span className={`text-[11px] font-semibold ml-2 px-1.5 py-0.5 rounded ${priceData.changePct >= 0 ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                {priceData.changePct >= 0 ? "+" : ""}{priceData.changePct.toFixed(2)}%
              </span>
            </div>
          )}

          {/* Trend + State tags */}
          {trendTags && trendTags.length > 0 && (
            <div className="flex justify-center gap-1.5 mb-2">
              {trendTags.map((tag) => (
                <span
                  key={tag.label}
                  className="text-[9px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}30` }}
                >
                  {"Xu hướng " + tag.label.charAt(0).toUpperCase() + tag.label.slice(1)}
                </span>
              )).slice(0, 1)}
              {trendTags.slice(1, 2).map((tag) => (
                <span
                  key={tag.label}
                  className="text-[9px] font-semibold px-2.5 py-0.5 rounded-full"
                  style={{ backgroundColor: `${tag.color}20`, color: tag.color, border: `1px solid ${tag.color}30` }}
                >
                  {"Sức mạnh " + tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Summary */}
          {overview && (
            <div className="bg-background/40 rounded-lg p-2 border border-border/15">
              <p className="text-[10px] text-foreground/80 leading-relaxed text-center">
                ⚡ {overview}
              </p>
            </div>
          )}

          {/* Bottom hint */}
          <p className="text-[8px] text-muted-foreground text-center mt-2">Click để xem chi tiết kịch bản</p>
        </div>
      </div>
    </motion.div>
  )
}

const nodeTypes = { layerNode: LayerNode, decisionNode: DecisionNode }

// ── Detail Panel ──

function DetailPanel({
  layerKey,
  insight,
  onClose,
}: {
  layerKey: string
  insight: InsightResponse
  onClose: () => void
}) {
  const layerData = insight.layers[layerKey]
  const cfg = layerKey === "decision"
    ? { label: "Tổng hợp & Hành động", shortLabel: "L6", icon: Brain, color: "hsl(var(--primary))" }
    : LAYER_CONFIG[layerKey]
  if (!cfg || !layerData) return null
  const Icon = cfg.icon
  const [showRawData, setShowRawData] = useState(false)

  return (
    <motion.div
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 340, opacity: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="absolute top-0 right-0 bottom-0 w-[400px] z-50 bg-background/95 backdrop-blur-xl border-l border-border/30 shadow-2xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${cfg.color}15` }}>
            <Icon className="size-3.5" style={{ color: cfg.color }} />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-bold uppercase" style={{ color: cfg.color }}>{cfg.shortLabel}</span>
              <h3 className="text-xs font-bold text-foreground">{cfg.label}</h3>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="size-6 rounded-md bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors cursor-pointer">
          <X className="size-3 text-muted-foreground" />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {/* AI Analysis Output */}
        <div className="p-3 border-b border-border/10">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="size-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Kết quả phân tích</span>
          </div>
          <div className="text-xs leading-relaxed">
            {renderOutput(layerData.output)}
          </div>
        </div>

        {/* Raw Input Data (expandable) */}
        {layerKey !== "decision" && (
          <div className="p-3">
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors w-full"
            >
              <Database className="size-3" />
              <span className="uppercase tracking-wider">Dữ liệu đầu vào chi tiết</span>
              <ChevronDown className={`size-3 ml-auto transition-transform ${showRawData ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showRawData && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3">
                    <RawInputContent layerKey={layerKey} rawInput={insight.rawInput} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>
    </motion.div>
  )
}

// ── Raw Input Tables per Layer ──

function RawInputContent({ layerKey, rawInput }: { layerKey: string; rawInput: InsightResponse["rawInput"] }) {
  switch (layerKey) {
    case "trend": return <TrendRawInput data={rawInput.trend} />
    case "liquidity": return <LiquidityRawInput data={rawInput.liquidity} />
    case "moneyFlow": return <MoneyFlowRawInput data={rawInput.moneyFlow} />
    case "insider": return <InsiderRawInput data={rawInput.insider} />
    case "news": return <NewsRawInput data={rawInput.news} />
    default: return null
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <Table className="size-3 text-muted-foreground" />
      <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">{children}</span>
    </div>
  )
}

function DataRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between py-0.5 border-b border-border/5 last:border-0">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-[10px] font-mono font-medium ${color || "text-foreground"}`}>{value}</span>
    </div>
  )
}

function TrendRawInput({ data }: { data: InsightResponse["rawInput"]["trend"] }) {
  const { computed, realtime, ohlcv } = data
  return (
    <>
      {/* Realtime */}
      <div>
        <SectionTitle>Realtime</SectionTitle>
        {realtime ? (
          <>
            <DataRow label="Giá hiện tại (P0)" value={realtime.price} />
            <DataRow label="Volume hiện tại (V0)" value={fmtNum(realtime.volume)} />
            <DataRow label="Cao / Thấp" value={`${realtime.high} / ${realtime.low}`} />
            <DataRow label="Tham chiếu" value={realtime.ref} />
          </>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">Ngoài giờ giao dịch</p>
        )}
      </div>

      {/* Computed MA */}
      <div>
        <SectionTitle>MA & VolMA</SectionTitle>
        <DataRow label="MA10" value={computed.ma10} color="text-blue-400" />
        <DataRow label="MA20" value={computed.ma20} color="text-amber-400" />
        <DataRow label="VolMA10" value={fmtNum(computed.volMa10)} />
        <DataRow label="VolMA20" value={fmtNum(computed.volMa20)} />
        <DataRow label="Giá đóng cửa gần nhất" value={computed.latestClose?.toFixed(2) || "—"} />
      </div>

      {/* OHLCV table (last 10) */}
      <div>
        <SectionTitle>OHLCV ({ohlcv.length} phiên)</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="text-muted-foreground border-b border-border/20">
                <th className="text-left py-1 pr-2">Ngày</th>
                <th className="text-right px-1">O</th>
                <th className="text-right px-1">H</th>
                <th className="text-right px-1">L</th>
                <th className="text-right px-1">C</th>
                <th className="text-right pl-1">Vol</th>
              </tr>
            </thead>
            <tbody>
              {ohlcv.slice(-10).map((r: any, i: number) => (
                <tr key={i} className="border-b border-border/5 hover:bg-muted/10">
                  <td className="py-0.5 pr-2 text-muted-foreground">{r.date?.split("T")[0]}</td>
                  <td className="text-right px-1 tabular-nums">{r.open?.toFixed(1)}</td>
                  <td className="text-right px-1 tabular-nums text-emerald-400">{r.high?.toFixed(1)}</td>
                  <td className="text-right px-1 tabular-nums text-red-400">{r.low?.toFixed(1)}</td>
                  <td className="text-right px-1 tabular-nums font-medium">{r.close?.toFixed(1)}</td>
                  <td className="text-right pl-1 tabular-nums">{fmtNum(r.volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function LiquidityRawInput({ data }: { data: InsightResponse["rawInput"]["liquidity"] }) {
  const { latest, avg30, history } = data
  return (
    <>
      <div>
        <SectionTitle>Phiên gần nhất</SectionTitle>
        {latest ? (
          <>
            <DataRow label="KL chưa khớp Mua" value={fmtNum(latest.buyUnmatchedVolume)} />
            <DataRow label="KL chưa khớp Bán" value={fmtNum(latest.sellUnmatchedVolume)} />
            <DataRow label="Số lệnh Mua" value={fmtNum(latest.buyTradeCount)} />
            <DataRow label="Số lệnh Bán" value={fmtNum(latest.sellTradeCount)} />
            <DataRow label="KL đặt Mua" value={fmtNum(latest.buyTradeVolume)} />
            <DataRow label="KL đặt Bán" value={fmtNum(latest.sellTradeVolume)} />
            <DataRow label="Volume khớp" value={fmtNum(latest.totalVolume)} color="text-blue-400" />
          </>
        ) : <p className="text-[10px] text-muted-foreground italic">Không có dữ liệu</p>}
      </div>
      {avg30 && (
        <div>
          <SectionTitle>Trung bình 30 phiên</SectionTitle>
          <DataRow label="KL chưa khớp Mua TB" value={fmtNum(avg30.buyUnmatchedVolume)} />
          <DataRow label="KL chưa khớp Bán TB" value={fmtNum(avg30.sellUnmatchedVolume)} />
          <DataRow label="Volume khớp TB" value={fmtNum(avg30.totalVolume)} color="text-amber-400" />
        </div>
      )}
      {history.length > 0 && (
        <div>
          <SectionTitle>Lịch sử 10 phiên</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px]">
              <thead>
                <tr className="text-muted-foreground border-b border-border/20">
                  <th className="text-left py-1">Ngày</th>
                  <th className="text-right">Mua chưa khớp</th>
                  <th className="text-right">Bán chưa khớp</th>
                  <th className="text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-border/5">
                    <td className="py-0.5 text-muted-foreground">{r.date?.split("T")[0]}</td>
                    <td className="text-right tabular-nums">{fmtNum(r.buyUnmatchedVolume)}</td>
                    <td className="text-right tabular-nums">{fmtNum(r.sellUnmatchedVolume)}</td>
                    <td className="text-right tabular-nums">{fmtNum(r.totalVolume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

function MoneyFlowRawInput({ data }: { data: InsightResponse["rawInput"]["moneyFlow"] }) {
  const renderTable = (items: any[], label: string) => (
    <div>
      <SectionTitle>{label} (15 phiên)</SectionTitle>
      <table className="w-full text-[9px]">
        <thead>
          <tr className="text-muted-foreground border-b border-border/20">
            <th className="text-left py-1">Ngày</th>
            <th className="text-right">Ròng khớp</th>
            <th className="text-right">Ròng deal</th>
            <th className="text-right">Tổng ròng</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r: any, i: number) => {
            const net = r.totalNetVolume ?? r.matchNetVolume ?? 0
            return (
              <tr key={i} className="border-b border-border/5">
                <td className="py-0.5 text-muted-foreground">{r.date?.split("T")[0]}</td>
                <td className={`text-right tabular-nums ${(r.matchNetVolume ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtNum(r.matchNetVolume ?? 0)}
                </td>
                <td className="text-right tabular-nums">{fmtNum(r.dealNetVolume ?? 0)}</td>
                <td className={`text-right tabular-nums font-medium ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtNum(net)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      {renderTable(data.foreign, "Nước ngoài")}
      {renderTable(data.proprietary, "Tự doanh")}
    </>
  )
}

function InsiderRawInput({ data }: { data: InsightResponse["rawInput"]["insider"] }) {
  return (
    <div>
      <SectionTitle>Giao dịch nội bộ ({data.transactions.length})</SectionTitle>
      <table className="w-full text-[9px]">
        <thead>
          <tr className="text-muted-foreground border-b border-border/20">
            <th className="text-left py-1">Hành động</th>
            <th className="text-right">KL đăng ký</th>
            <th className="text-right">KL thực hiện</th>
            <th className="text-right">Ngày</th>
          </tr>
        </thead>
        <tbody>
          {data.transactions.slice(0, 15).map((r: any, i: number) => (
            <tr key={i} className="border-b border-border/5">
              <td className={`py-0.5 ${r.action?.includes("Bán") || r.action?.includes("bán") ? "text-red-400" : "text-emerald-400"}`}>
                {r.action}
              </td>
              <td className="text-right tabular-nums">{fmtNum(r.shareRegistered)}</td>
              <td className="text-right tabular-nums">{fmtNum(r.shareExecuted)}</td>
              <td className="text-right text-muted-foreground">{r.startDate?.split("T")[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function NewsRawInput({ data }: { data: InsightResponse["rawInput"]["news"] }) {
  return (
    <>
      {data.tickerScore && (
        <div>
          <SectionTitle>AI Score</SectionTitle>
          <DataRow label="Điểm" value={`${data.tickerScore.score}/10`} color="text-primary" />
          <DataRow label="Sentiment" value={data.tickerScore.sentiment || "—"} />
          <DataRow label="Tích cực" value={data.tickerScore.countPositive || 0} color="text-emerald-400" />
          <DataRow label="Tiêu cực" value={data.tickerScore.countNegative || 0} color="text-red-400" />
          <DataRow label="Trung lập" value={data.tickerScore.countNeutral || 0} />
        </div>
      )}
      <div>
        <SectionTitle>Tin tức ({data.items.length})</SectionTitle>
        <div className="space-y-1.5">
          {data.items.map((n: any, i: number) => (
            <div key={i} className="p-1.5 rounded-md bg-muted/10 border border-border/10">
              <p className="text-[10px] text-foreground/90 font-medium leading-snug">{n.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] text-muted-foreground">{n.sourceName || n.source}</span>
                <span className="text-[9px] text-muted-foreground">{n.updatedAt?.split(" ")[0]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ── Main Component ──

export function StockAiInsight({ symbol }: { symbol: string }) {
  const [insight, setInsight] = useState<InsightResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null)
  const [layersVisible, setLayersVisible] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    setError("")
    setSelectedLayer(null)
    setLayersVisible(false)

    fetch(`${API_BASE}/ai-insight/${symbol.toUpperCase()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res?.data) {
          setInsight(res.data)
          setTimeout(() => setLayersVisible(true), 200)
        } else {
          setError(res?.message || "Không có dữ liệu AI Insight")
        }
      })
      .catch(() => setError("Lỗi kết nối tới AI Insight"))
      .finally(() => setIsLoading(false))
  }, [symbol])

  const handleLayerClick = useCallback((key: string) => {
    setSelectedLayer((prev) => (prev === key ? null : key))
  }, [])

  // Extract trend tags for center node
  const trendTags = useMemo(() => {
    const trendOut = insight?.layers?.trend?.output
    if (!trendOut || typeof trendOut !== "object") return []
    const result: { label: string; color: string }[] = []
    const trendVal = trendOut["Xu hướng"] || trendOut.trend
    if (trendVal) {
      const t = String(trendVal).toLowerCase()
      if (t.includes("tăng")) result.push({ label: "Tăng", color: "#10b981" })
      else if (t.includes("giảm")) result.push({ label: "Giảm", color: "#ef4444" })
      else result.push({ label: "Đi ngang", color: "#f59e0b" })
    }
    const stateVal = trendOut["Trạng thái"] || trendOut.state
    if (stateVal) {
      const s = String(stateVal).toLowerCase()
      if (s.includes("mạnh")) result.push({ label: "Mạnh", color: "#3b82f6" })
      else if (s.includes("yếu")) result.push({ label: "Yếu", color: "#94a3b8" })
      else result.push({ label: "Giằng co", color: "#f59e0b" })
    }
    return result
  }, [insight])

  // Build price data for center node
  const priceData = useMemo(() => {
    const rt = insight?.rawInput?.trend?.realtime
    const computed = insight?.rawInput?.trend?.computed
    if (rt?.price) {
      const ref = rt.ref || computed?.latestClose || rt.price
      const change = rt.price - ref
      const changePct = ref ? (change / ref) * 100 : 0
      return { price: rt.price, change, changePct }
    }
    if (computed?.latestClose) {
      return { price: computed.latestClose, change: 0, changePct: 0 }
    }
    return null
  }, [insight])

  const { initialNodes, initialEdges } = useMemo(() => {
    const keys = [...LAYERS_ORDER]
    // Positions: L1 top-left, L2 mid-left, L3 bottom-left, L4 bottom-right, L5 top-right
    // Center node in the middle
    const positions: Record<string, { x: number; y: number }> = {
      trend:     { x: 10,  y: 30 },
      liquidity: { x: 10,  y: 215 },
      moneyFlow: { x: 10,  y: 400 },
      insider:   { x: 580, y: 30 },
      news:      { x: 580, y: 300 },
    }

    const nodes: Node[] = keys.map((key, i) => ({
      id: key,
      type: "layerNode",
      position: positions[key],
      data: {
        layerKey: key,
        isActive: selectedLayer === key,
        animDelay: i * 0.2,
        isVisible: layersVisible,
        layerOutput: insight?.layers[key]?.output,
      },
      draggable: false,
    }))

    nodes.push({
      id: "decision",
      type: "decisionNode",
      position: { x: 285, y: 160 },
      data: {
        isActive: selectedLayer === "decision",
        isVisible: layersVisible,
        layerOutput: insight?.layers.decision?.output,
        priceData,
        trendTags,
      },
      draggable: false,
    })

    const edges: Edge[] = keys.map((key) => ({
      id: `${key}-decision`,
      source: key,
      target: "decision",
      animated: true,
      type: "default",
      style: { stroke: LAYER_CONFIG[key].color, strokeWidth: 1.5, strokeOpacity: 0.3, strokeDasharray: "6 3" },
    }))

    return { initialNodes: nodes, initialEdges: edges }
  }, [selectedLayer, layersVisible, handleLayerClick, insight, priceData, trendTags])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    onNodesChange(initialNodes.map((n) => ({ type: "replace" as const, id: n.id, item: n })))
  }, [initialNodes, onNodesChange])

  useEffect(() => {
    onEdgesChange(initialEdges.map((e) => ({ type: "replace" as const, id: e.id, item: e })))
  }, [initialEdges, onEdgesChange])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}>
          <Brain className="size-10 text-primary/40" />
        </motion.div>
        <p className="text-sm font-medium text-foreground/80">Đang phân tích {symbol}</p>
        <p className="text-[11px] text-muted-foreground">AI đang xử lý 6 lớp dữ liệu...</p>
        <div className="flex gap-1 mt-1">
          {["L1", "L2", "L3", "L4", "L5", "L6"].map((l, i) => (
            <motion.span
              key={l}
              className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/40 text-muted-foreground"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
            >
              {l}
            </motion.span>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Brain className="size-10 text-muted-foreground/30" />
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!insight) return null

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Badge */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background/80 backdrop-blur-sm border border-border/20">
        <Sparkles className="size-3 text-primary" />
        <span className="text-[10px] font-medium text-foreground">{insight.symbol}</span>
        <Clock className="size-2.5 text-muted-foreground ml-1" />
        <span className="text-[9px] text-muted-foreground">
          {new Date(insight.timestamp).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
        </span>
      </div>

      {/* Hint */}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-1 rounded-lg bg-background/70 backdrop-blur-sm border border-border/15">
        <span className="text-[9px] text-muted-foreground">Click layer → xem dữ liệu đầu vào chi tiết</span>
      </div>

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_event, node) => handleLayerClick(node.id)}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        nodesDraggable={false}
        nodesConnectable={false}
        minZoom={0.8}
        maxZoom={1.2}
      >
        <Background gap={20} size={1} color="hsl(var(--border) / 0.08)" />
      </ReactFlow>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedLayer && insight && (
          <DetailPanel layerKey={selectedLayer} insight={insight} onClose={() => setSelectedLayer(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
