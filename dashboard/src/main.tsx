import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/contexts/auth-context"
import { ChatProvider } from "@/contexts/chat-context"
import "./index.css"
import App from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ChatProvider>
          <TooltipProvider delayDuration={200}>
            <App />
            <Toaster
              position="top-right"
              richColors
              toastOptions={{
                className: "text-xs",
                duration: 3000,
              }}
            />
          </TooltipProvider>
        </ChatProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

