import { createContext, useContext, useState, type ReactNode } from "react"

export type SidebarPanel = "news" | "chat" | "trading" | "watchlist"

interface SidebarContextType {
  activePanel: SidebarPanel
  setActivePanel: (panel: SidebarPanel) => void
  togglePanel: (panel: SidebarPanel) => void
}

const SidebarContext = createContext<SidebarContextType>({
  activePanel: "news",
  setActivePanel: () => {},
  togglePanel: () => {},
})

export function SidebarProvider({
  defaultPanel = "news",
  children,
}: {
  defaultPanel?: SidebarPanel
  children: ReactNode
}) {
  const [activePanel, setActivePanel] = useState<SidebarPanel>(defaultPanel)

  const togglePanel = (panel: SidebarPanel) => {
    setActivePanel((prev) => (prev === panel ? prev : panel))
  }

  return (
    <SidebarContext.Provider value={{ activePanel, setActivePanel, togglePanel }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
