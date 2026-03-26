import { useState, useEffect } from "react"
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  FileText,
  Layers,
  Building2,
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePriceBoard } from "@/hooks/use-market-data"

const API_BASE = import.meta.env.VITE_API_URL || "/api/v1"

function fmtVnd(n: number): string {
  return Math.round(n).toLocaleString("vi-VN")
}

// MSN prices are in x1000 format (128.8 = 128,800 VND)
function fmtPrice(n: number): string {
  if (!n || n <= 0) return "—"
  return (n * 1000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })
}

function fmtBillion(n: number): string {
  if (!n) return "—"
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(0) + " nghìn tỷ"
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + " tỷ"
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + " triệu"
  return fmtVnd(n)
}

function fmtPct(v: number | undefined | null, multiplied = true): string {
  if (v == null) return "—"
  const pct = multiplied ? v * 100 : v
  return pct.toFixed(2) + "%"
}

interface CompanyProfile {
  organName?: string
  enOrganName?: string
  organShortName?: string
  icbName2?: string
  icbName3?: string
  icbName4?: string
  issueShare?: number
  companyProfile?: string
  [key: string]: any
}

interface PriceInfo {
  financialRatio?: {
    yearReport?: number
    revenue?: number
    revenueGrowth?: number
    netProfit?: number
    netProfitGrowth?: number
    roe?: number
    roa?: number
    pe?: number
    pb?: number
    eps?: number
    bvps?: number
    currentRatio?: number
    grossMargin?: number
    netProfitMargin?: number
    de?: number
    dividend?: number
    marketCap?: number
  }
  highestPrice1Year?: number
  lowestPrice1Year?: number
  foreignCurrentRoom?: number
  foreignCurrentPercent?: number
  averageMatchVolume2Week?: number
  [key: string]: any
}

interface Shareholder {
  ownerFullName?: string
  percentage?: number
  quantity?: number
}

interface Manager {
  fullName?: string
  positionName?: string
  percentage?: number
}

// ── Row: label + value ──
function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline justify-between py-[5px] border-b border-border/10 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs tabular-nums text-right ${bold ? "font-bold text-foreground" : "text-foreground/90"}`}>
        {value}
      </span>
    </div>
  )
}

// ── Section Header ──
function SectionHead({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 pb-1.5 pt-1 mb-1">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">{title}</span>
    </div>
  )
}

export function StockOverview({ symbol }: { symbol: string }) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null)
  const [shareholders, setShareholders] = useState<Shareholder[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Live price from MSN price board (same source as RightPanel)
  const { data: liveData } = usePriceBoard(symbol)

  useEffect(() => {
    setIsLoading(true)
    const s = symbol.toUpperCase()
    Promise.all([
      fetch(`${API_BASE}/company/${s}/profile`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/company/${s}/price-info`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/company/${s}/shareholders`).then((r) => r.json()).catch(() => null),
      fetch(`${API_BASE}/company/${s}/managers`).then((r) => r.json()).catch(() => null),
    ]).then(([profileRes, priceRes, shRes, mgRes]) => {
      setProfile(profileRes?.data || null)
      setPriceInfo(priceRes?.data || null)
      setShareholders(Array.isArray(shRes?.data) ? shRes.data : [])
      setManagers(Array.isArray(mgRes?.data) ? mgRes.data : [])
      setIsLoading(false)
    })
  }, [symbol])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const fr = priceInfo?.financialRatio

  // Use live MSN data for price (x1000 format)
  const price = liveData?.closePrice || 0
  const change = liveData?.priceChange || 0
  const changePct = liveData?.percentChange || 0
  // VCI returns highestPrice1Year/lowestPrice1Year in raw VND
  const high52 = priceInfo?.highestPrice1Year || 0
  const low52 = priceInfo?.lowestPrice1Year || 0

  // Normalize: convert MSN price (x1000) to VND for range bar calculation
  const priceVnd = price * 1000
  const rangeWidth = high52 - low52
  const rangePos = rangeWidth > 0 ? ((priceVnd - low52) / rangeWidth) * 100 : 50

  return (
    <ScrollArea className="h-full">
      <div className="grid grid-cols-3 gap-0 divide-x divide-border/20 min-h-0" style={{ minHeight: "100%" }}>

        {/* ── Left Column: Price + Valuation + Profitability ── */}
        <div className="p-4 space-y-3">

          {/* Price Header */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {price ? fmtPrice(price) : "—"}
              </span>
              {change !== 0 && (
                <span className={`text-sm font-semibold flex items-center gap-0.5 ${change >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {change >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                  {change >= 0 ? "+" : ""}{fmtPrice(Math.abs(change))} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
                </span>
              )}
            </div>

            {/* 52-week range (VCI values in raw VND) */}
            {high52 > 0 && (
              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>{fmtVnd(low52)}</span>
                  <span className="text-[10px]">52 tuần</span>
                  <span>{fmtVnd(high52)}</span>
                </div>
                <div className="relative h-1 bg-muted/40 rounded-full">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 size-2.5 rounded-full bg-primary border-2 border-background shadow"
                    style={{ left: `${Math.max(2, Math.min(98, rangePos))}%`, transform: "translate(-50%, -50%)" }}
                  />
                  <div
                    className="h-full bg-primary/40 rounded-full"
                    style={{ width: `${rangePos}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ĐỊNH GIÁ */}
          <section>
            <SectionHead icon={<Layers className="size-3.5" />} title="Định giá" />
            <InfoRow label="Vốn hóa" value={fr?.marketCap ? fmtBillion(fr.marketCap) : "—"} bold />
            <InfoRow label="P/E" value={fr?.pe?.toFixed(2) ?? "—"} />
            <InfoRow label="P/B" value={fr?.pb?.toFixed(2) ?? "—"} />
            <InfoRow label="EPS" value={fr?.eps ? fmtVnd(fr.eps) + " VND" : "—"} />
            <InfoRow label="BVPS" value={fr?.bvps ? fmtVnd(fr.bvps) + " VND" : "—"} />
          </section>

          {/* SINH LỢI */}
          <section>
            <SectionHead icon={<TrendingUp className="size-3.5" />} title="Sinh lợi" />
            <InfoRow label="ROE" value={fmtPct(fr?.roe)} />
            <InfoRow label="ROA" value={fmtPct(fr?.roa)} />
            <InfoRow label="D/E" value={fr?.de?.toFixed(1) ?? "—"} />
            <InfoRow label="Cổ tức" value={fr?.dividend ? fmtVnd(fr.dividend) + " VND" : "0 VND"} />
          </section>

          {/* SỞ HỮU NN */}
          <section>
            <SectionHead icon={<Users className="size-3.5" />} title="Sở hữu NN" />
            <InfoRow
              label="Tỷ lệ sở hữu"
              value={priceInfo?.foreignCurrentPercent != null ? priceInfo.foreignCurrentPercent.toFixed(2) + "%" : "—"}
            />
            <InfoRow
              label="Room còn lại"
              value={priceInfo?.foreignCurrentRoom != null ? fmtVnd(priceInfo.foreignCurrentRoom) : "—"}
            />
          </section>
        </div>

        {/* ── Middle Column: Shareholders + Management ── */}
        <div className="p-4 space-y-4">

          {/* CỔ ĐÔNG LỚN */}
          {shareholders.length > 0 && (
            <section>
              <SectionHead icon={<Users className="size-3.5" />} title="Cổ đông lớn" />
              <div className="space-y-0">
                {shareholders.slice(0, 8).map((sh, i) => (
                  <div key={i} className="flex items-center justify-between py-[6px] border-b border-border/10 last:border-0 gap-2">
                    <span className="text-xs text-foreground/80 truncate flex-1 min-w-0">
                      {sh.ownerFullName}
                    </span>
                    <span className="text-xs font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {sh.percentage != null ? sh.percentage.toFixed(2) + "%" : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* BAN LÃNH ĐẠO */}
          {managers.length > 0 && (
            <section>
              <SectionHead icon={<Briefcase className="size-3.5" />} title="Ban lãnh đạo" />
              <div className="space-y-0">
                {managers.slice(0, 6).map((mg, i) => (
                  <div key={i} className="flex items-center justify-between py-[6px] border-b border-border/10 last:border-0 gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-foreground block truncate">{mg.fullName}</span>
                      <span className="text-[10px] text-muted-foreground">{mg.positionName}</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums whitespace-nowrap">
                      {mg.percentage != null && mg.percentage > 0 ? mg.percentage.toFixed(2) + "%" : "0%"}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Right Column: Intro + ICB + Basic Info ── */}
        <div className="p-4 space-y-4">

          {/* GIỚI THIỆU */}
          {profile?.companyProfile && (
            <section>
              <SectionHead icon={<FileText className="size-3.5" />} title="Giới thiệu" />
              <p className="text-xs text-muted-foreground leading-[1.6] whitespace-pre-line">
                {profile.companyProfile.slice(0, 600)}
                {profile.companyProfile.length > 600 ? "..." : ""}
              </p>
            </section>
          )}

          {/* PHÂN NGÀNH ICB */}
          {(profile?.icbName2 || profile?.icbName3 || profile?.icbName4) && (
            <section>
              <SectionHead icon={<Building2 className="size-3.5" />} title="Phân ngành ICB" />
              <div className="space-y-0">
                {profile?.icbName2 && (
                  <div className="flex items-center gap-2 py-[5px] border-b border-border/10">
                    <span className="text-[10px] text-muted-foreground w-5">L2</span>
                    <span className="text-xs text-foreground">{profile.icbName2}</span>
                  </div>
                )}
                {profile?.icbName3 && (
                  <div className="flex items-center gap-2 py-[5px] border-b border-border/10">
                    <span className="text-[10px] text-muted-foreground w-5">L3</span>
                    <span className="text-xs text-foreground">{profile.icbName3}</span>
                  </div>
                )}
                {profile?.icbName4 && (
                  <div className="flex items-center gap-2 py-[5px]">
                    <span className="text-[10px] text-muted-foreground w-5">L4</span>
                    <span className="text-xs text-foreground">{profile.icbName4}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* THÔNG TIN CƠ BẢN */}
          <section>
            <SectionHead icon={<Layers className="size-3.5" />} title="Thông tin cơ bản" />
            <InfoRow label="Sàn" value={liveData?.exchange || priceInfo?.exchange || "—"} />
            <InfoRow label="SLCP lưu hành" value={profile?.issueShare ? fmtVnd(profile.issueShare) : "—"} />
            <InfoRow label="KL TB 2 tuần" value={priceInfo?.averageMatchVolume2Week ? fmtVnd(priceInfo.averageMatchVolume2Week) : "—"} />
          </section>
        </div>
      </div>
    </ScrollArea>
  )
}
