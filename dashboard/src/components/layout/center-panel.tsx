import { TVChart } from "@/components/chart/tv-chart"

export function CenterPanel() {
  return (
    <section
      id="center-panel"
      className="flex flex-1 flex-col min-w-0 bg-background"
    >
      {/* TradingView Chart - fills entire center panel */}
      <div className="flex-1 min-h-0">
        <TVChart symbol="VNINDEX" interval="D" theme="dark" />
      </div>
    </section>
  )
}
