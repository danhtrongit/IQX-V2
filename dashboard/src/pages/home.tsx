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
        <div className="fullpage-container">
            <HomeHeader />
            <main className="fullpage-main">
                <HeroSection />
                <CoreValuesSection />
                <InsightSection />
                <PricingSection />
                <ContactSection />
                <FAQSection />
            </main>
            <HomeFooter />

            <style>{`
                .fullpage-container {
                    background: #000;
                    min-height: 100vh;
                }
                .fullpage-main {
                    height: 100vh;
                    overflow-y: auto;
                    scroll-snap-type: y mandatory;
                    scroll-behavior: smooth;
                }
                .fullpage-main > section {
                    scroll-snap-align: start;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                @media (max-width: 900px) {
                    .fullpage-main {
                        scroll-snap-type: none;
                    }
                    .fullpage-main > section {
                        min-height: auto;
                    }
                }
            `}</style>
        </div>
    )
}
