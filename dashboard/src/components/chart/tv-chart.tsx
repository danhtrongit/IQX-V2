import { useEffect, useRef, memo } from "react"
import { createDataFeed } from "@/lib/tradingview-datafeed"

interface TVChartProps {
  symbol?: string
  interval?: string
  theme?: "dark" | "light"
  autosize?: boolean
  className?: string
}

function TVChartInner({
  symbol = "VNINDEX",
  interval = "D",
  theme = "dark",
  autosize = true,
  className = "",
}: TVChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const containerId = `tv_chart_${Date.now()}`
    containerRef.current.id = containerId

    // Wait for TradingView library to be available
    const initChart = () => {
      const TradingView = (window as any).TradingView
      if (!TradingView) {
        // Retry after script loads
        setTimeout(initChart, 200)
        return
      }

      if (widgetRef.current) {
        try {
          widgetRef.current.remove()
        } catch {
          // ignore
        }
      }

      const widget = new TradingView.widget({
        symbol,
        interval,
        container: containerId,
        datafeed: createDataFeed(),
        library_path: "/charting_library/",
        locale: "vi",
        theme,
        autosize,

        // UI customization
        disabled_features: [
          "use_localstorage_for_settings",
          "header_compare",
          "display_market_status",
          "timeframes_toolbar",
          "go_to_date",
          "header_saveload",
          "study_templates",
        ],
        enabled_features: [
          "side_toolbar_in_fullscreen_mode",
          "drawing_templates",
        ],

        // Dark finance theme
        overrides: {
          // Chart background
          "paneProperties.background": theme === "dark" ? "#0a0a0f" : "#ffffff",
          "paneProperties.backgroundType": "solid",

          // Grid
          "paneProperties.vertGridProperties.color": theme === "dark" ? "#1a1a2e" : "#f0f0f0",
          "paneProperties.horzGridProperties.color": theme === "dark" ? "#1a1a2e" : "#f0f0f0",

          // Candles - bullish (green)
          "mainSeriesProperties.candleStyle.upColor": "#00c853",
          "mainSeriesProperties.candleStyle.borderUpColor": "#00c853",
          "mainSeriesProperties.candleStyle.wickUpColor": "#00c853",

          // Candles - bearish (red)
          "mainSeriesProperties.candleStyle.downColor": "#ff1744",
          "mainSeriesProperties.candleStyle.borderDownColor": "#ff1744",
          "mainSeriesProperties.candleStyle.wickDownColor": "#ff1744",

          // Volume
          "volumePaneSize": "medium",
        },

        // Loading indicator
        loading_screen: {
          backgroundColor: theme === "dark" ? "#0a0a0f" : "#ffffff",
          foregroundColor: theme === "dark" ? "#2962ff" : "#2962ff",
        },

        // Custom toolbar CSS
        custom_css_url: "",
        toolbar_bg: theme === "dark" ? "#0a0a0f" : "#ffffff",

        // Timeframe defaults
        time_frames: [
          { text: "1N", resolution: "D" as any, description: "1 Ngày" },
          { text: "1T", resolution: "W" as any, description: "1 Tuần" },
          { text: "1Th", resolution: "M" as any, description: "1 Tháng" },
          { text: "3Th", resolution: "M" as any, description: "3 Tháng" },
          { text: "6Th", resolution: "M" as any, description: "6 Tháng" },
          { text: "1Y", resolution: "D" as any, description: "1 Năm" },
        ],
      })

      widgetRef.current = widget
    }

    initChart()

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove()
        } catch {
          // ignore cleanup errors
        }
        widgetRef.current = null
      }
    }
  }, [symbol, interval, theme, autosize])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
    />
  )
}

export const TVChart = memo(TVChartInner)
