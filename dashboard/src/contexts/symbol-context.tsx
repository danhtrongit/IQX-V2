import { createContext, useContext, useState, type ReactNode } from "react"

interface SymbolContextType {
  symbol: string
  setSymbol: (s: string) => void
}

const SymbolContext = createContext<SymbolContextType>({
  symbol: "VNINDEX",
  setSymbol: () => {},
})

export function SymbolProvider({ symbol: initial, children }: { symbol: string; children: ReactNode }) {
  const [symbol, setSymbol] = useState(initial)
  return (
    <SymbolContext.Provider value={{ symbol, setSymbol }}>
      {children}
    </SymbolContext.Provider>
  )
}

export function useSymbol() {
  return useContext(SymbolContext)
}
