import HomeHeader from '@/components/home/HomeHeader'
import HeroSection from '@/components/home/HeroSection'
import InsightSection from '@/components/home/InsightSection'
import CoreValuesSection from '@/components/home/CoreValuesSection'
import PricingSection from '@/components/home/PricingSection'
import AgentsSection from '@/components/home/AgentsSection'
import AnalysisSection from '@/components/home/AnalysisSection'
import ScenarioSection from '@/components/home/ScenarioSection'
import FAQSection from '@/components/home/FAQSection'
import CTASection from '@/components/home/CTASection'
import HomeFooter from '@/components/home/HomeFooter'

export default function HomePage() {
    return (
        <div style={{ background: '#000', minHeight: '100vh' }}>
            <HomeHeader />
            <main>
                <HeroSection />
                <InsightSection />
                <CoreValuesSection />
                <PricingSection />
                <AgentsSection />
                <AnalysisSection />
                <ScenarioSection />
                <FAQSection />
                <CTASection />
            </main>
            <HomeFooter />
        </div>
    )
}
