import HomeHeader from '@/components/home/HomeHeader'
import HeroSection from '@/components/home/HeroSection'
import CoreValuesSection from '@/components/home/CoreValuesSection'
import InsightSection from '@/components/home/InsightSection'
import PricingSection from '@/components/home/PricingSection'
import ContactSection from '@/components/home/ContactSection'
import FAQSection from '@/components/home/FAQSection'
import HomeFooter from '@/components/home/HomeFooter'

export default function HomePage() {
    return (
        <div style={{ background: '#000', minHeight: '100vh' }}>
            <HomeHeader />
            <main>
                {/* Section 1 — Hero: Text + Auth + AI Demo */}
                <HeroSection />
                {/* Section 2 — ARIX AI: Giá trị cốt lõi */}
                <CoreValuesSection />
                {/* Section 3 — Tổng quan */}
                <InsightSection />
                {/* Section 4 — Giá */}
                <PricingSection />
                {/* Section 5 — Liên hệ */}
                <ContactSection />
                {/* Section 6 — FAQ */}
                <FAQSection />
            </main>
            <HomeFooter />
        </div>
    )
}
