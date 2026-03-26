import { Routes, Route } from "react-router"
import HomePage from "@/pages/home"
import DashboardPage from "@/pages/dashboard"
import StockPage from "@/pages/stock"
import { AuthModal } from "@/components/auth/auth-modal"

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/co-phieu/:symbol" element={<StockPage />} />
      </Routes>
      <AuthModal />
    </>
  )
}
