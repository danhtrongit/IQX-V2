import { Routes, Route } from "react-router"
import HomePage from "@/pages/home"
import DashboardPage from "@/pages/dashboard"
import StockPage from "@/pages/stock"
import SettingsPage from "@/pages/settings"
import PremiumPage from "@/pages/premium"
import PaymentResultPage from "@/pages/payment-result"
import NotFoundPage from "@/pages/404"
import MaintenancePage from "@/pages/503"
import { AuthModal } from "@/components/auth/auth-modal"

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/co-phieu/:symbol" element={<StockPage />} />
        <Route path="/cai-dat" element={<SettingsPage />} />
        <Route path="/nang-cap" element={<PremiumPage />} />
        <Route path="/thanh-toan/thanh-cong" element={<PaymentResultPage type="success" />} />
        <Route path="/thanh-toan/that-bai" element={<PaymentResultPage type="error" />} />
        <Route path="/thanh-toan/huy" element={<PaymentResultPage type="cancel" />} />
        <Route path="/503" element={<MaintenancePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <AuthModal />
    </>
  )
}
