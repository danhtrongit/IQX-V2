import { useState, useEffect } from "react"
import { Layers, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SectorItem {
  icbCode: number
  icbName: string | null
  icbLevel: number | null
  input: { D: number | null; W: number | null; M: number | null; VD: number | null }
  result: { label: string | null }
}

const LABEL_COLORS: Record<string, string> = {
  "Dẫn sóng": "bg-emerald-500/20 text-emerald-400",
  "Hút tiền": "bg-blue-500/20 text-blue-400",
  "Tích lũy": "bg-amber-500/20 text-amber-400",
  "Phân phối": "bg-orange-500/20 text-orange-400",
  "Hồi kỹ thuật": "bg-purple-500/20 text-purple-400",
  "Suy yếu": "bg-red-500/20 text-red-400",
}

export function SectorData() {
  const [items, setItems] = useState<SectorItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("trading/sector-signals/all-levels", { searchParams: { group: "HOSE" } }).json<any>()
        setItems(res.data?.items || [])
      } catch {
        setItems([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const fmtPct = (v: number | null) => {
    if (v === null) return "—"
    return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`
  }
  const pctColor = (v: number | null) => {
    if (v === null) return "text-muted-foreground"
    return v > 0 ? "text-emerald-500" : v < 0 ? "text-red-500" : "text-amber-500"
  }

  return (
    <div className="bg-card rounded-lg border border-border flex flex-col" style={{ minHeight: 300 }}>
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        <Layers className="size-3.5 text-primary" />
        <h3 className="text-xs font-semibold text-foreground">Dữ liệu ngành</h3>
      </div>
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="size-4 animate-spin text-primary" /></div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="text-[9px] text-muted-foreground/70">
                <th className="text-left py-1.5 px-2 font-medium">Ngành</th>
                <th className="text-center py-1.5 px-1 font-medium">Tín hiệu</th>
                <th className="text-right py-1.5 px-1.5 font-medium">Ngày</th>
                <th className="text-right py-1.5 px-1.5 font-medium">Tuần</th>
                <th className="text-right py-1.5 px-1.5 font-medium">Tháng</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.icbCode} className="hover:bg-muted/30 transition-colors border-t border-border/30">
                  <td className="py-1.5 px-2">
                    <span className="text-[11px] font-medium text-foreground line-clamp-1">{s.icbName || `ICB ${s.icbCode}`}</span>
                  </td>
                  <td className="py-1.5 px-1 text-center">
                    {s.result.label ? (
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${LABEL_COLORS[s.result.label] || "bg-muted text-muted-foreground"}`}>
                        {s.result.label}
                      </span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground/50">—</span>
                    )}
                  </td>
                  <td className={`text-right py-1.5 px-1.5 text-[10px] font-medium tabular-nums ${pctColor(s.input.D)}`}>{fmtPct(s.input.D)}</td>
                  <td className={`text-right py-1.5 px-1.5 text-[10px] font-medium tabular-nums ${pctColor(s.input.W)}`}>{fmtPct(s.input.W)}</td>
                  <td className={`text-right py-1.5 px-1.5 text-[10px] font-medium tabular-nums ${pctColor(s.input.M)}`}>{fmtPct(s.input.M)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ScrollArea>
    </div>
  )
}
