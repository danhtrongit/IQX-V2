import HomeHeader from '@/components/home/HomeHeader'
import HeroSection from '@/components/home/HeroSection'
import CoreValuesSection from '@/components/home/CoreValuesSection'
import InsightSection from '@/components/home/InsightSection'
import PricingSection from '@/components/home/PricingSection'
import ContactSection from '@/components/home/ContactSection'
import FAQSection from '@/components/home/FAQSection'
import HomeFooter from '@/components/home/HomeFooter'
import { useEffect } from 'react'

export default function HomePage() {
    useEffect(() => {
        document.documentElement.style.overflow = 'hidden'
        document.body.style.overflow = 'hidden'
        return () => {
            document.documentElement.style.overflow = ''
            document.body.style.overflow = ''
        }
    }, [])

    return (
        <div className="fp-root">
            <HomeHeader />
            <div className="fp-scroller">
                <HeroSection />
                <CoreValuesSection />
                <InsightSection />
                <PricingSection />
                <ContactSection />
                <FAQSection />
                <HomeFooter />
            </div>

            <style>{`
                .fp-root {
                    position: fixed;
                    inset: 0;
                    background: #000;
                    display: flex;
                    flex-direction: column;
                }
                .fp-scroller {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    scroll-snap-type: y mandatory;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                }
                .fp-scroller > section,
                .fp-scroller > footer {
                    scroll-snap-align: start;
                    min-height: 100vh;
                }
                .fp-scroller::-webkit-scrollbar {
                    width: 0;
                    display: none;
                }
                .fp-scroller {
                    scrollbar-width: none;
                }
                @media (max-width: 900px) {
                    .fp-scroller {
                        scroll-snap-type: none;
                    }
                }
            `}</style>
        </div>
    )
}
