import { useEffect } from 'react'
import HomeHeader from '@/components/home/HomeHeader'
import HeroSection from '@/components/home/HeroSection'
import CoreValuesSection from '@/components/home/CoreValuesSection'
import InsightSection from '@/components/home/InsightSection'
import PricingSection from '@/components/home/PricingSection'
import ContactSection from '@/components/home/ContactSection'
import FAQSection from '@/components/home/FAQSection'
import HomeFooter from '@/components/home/HomeFooter'

export default function HomePage() {
    useEffect(() => {
        // Khóa cuộn của trình duyệt để chỉ dùng vùng cuộn của fullpage
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    return (
        <div className="fullpage-container">
            <HomeHeader />
            <div className="fullpage-main">
                <HeroSection />
                <CoreValuesSection />
                <InsightSection />
                <PricingSection />
                <ContactSection />
                <FAQSection />
                <div style={{ scrollSnapAlign: 'end' }}>
                    <HomeFooter />
                </div>
            </div>

            <style>{`
                .fullpage-container {
                    background: #000;
                    height: 100vh;
                    width: 100vw;
                    overflow: hidden;
                }
                .fullpage-main {
                    height: 100vh;
                    width: 100%;
                    overflow-y: auto;
                    overflow-x: hidden;
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
                        display: block;
                    }
                }
                /* Tắt scrollbar mặc định cho đẹp */
                .fullpage-main::-webkit-scrollbar {
                    width: 8px;
                }
                .fullpage-main::-webkit-scrollbar-track {
                    background: #000;
                }
                .fullpage-main::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 4px;
                }
                .fullpage-main::-webkit-scrollbar-thumb:hover {
                    background: rgba(0, 168, 232, 0.5);
                }
            `}</style>
        </div>
    )
}
