import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useNavigate } from 'react-router';
import { TrendingUp, Droplets, ArrowLeftRight, Users, Newspaper, Brain, Sparkles } from 'lucide-react';

const DEMO_LAYERS = [
    { key: 'trend', label: 'Xu hướng', icon: TrendingUp, color: '#3b82f6', summary: 'Tăng — Giá trên MA20, xu hướng ngắn hạn tích cực' },
    { key: 'liquidity', label: 'Thanh khoản', icon: Droplets, color: '#06b6d4', summary: 'Cải thiện — Volume vượt trung bình, thanh khoản tốt' },
    { key: 'moneyFlow', label: 'Dòng tiền lớn', icon: ArrowLeftRight, color: '#10b981', summary: 'Khối ngoại mua ròng, tự doanh trung tính' },
    { key: 'insider', label: 'Sự kiện nội bộ', icon: Users, color: '#f59e0b', summary: 'Ban lãnh đạo mua vào — Tín hiệu hỗ trợ' },
    { key: 'news', label: 'Tin tức', icon: Newspaper, color: '#ec4899', summary: 'Nghiêng tích cực — Doanh thu kỷ lục quý 4' },
    { key: 'decision', label: 'Hành động & Kịch bản', icon: Brain, color: '#8b5cf6', summary: 'Giữ vị thế — Xu hướng thuận lợi, thanh khoản tốt' },
];

export default function HeroSection() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isAuthenticated, setShowAuthModal, setAuthModalTab } = useAuth();
    const navigate = useNavigate();
    const [activeLayer, setActiveLayer] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveLayer((prev) => (prev + 1) % DEMO_LAYERS.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let animationId: number;
        const stars: { x: number; y: number; r: number; speed: number; opacity: number }[] = [];
        const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
        resize();
        window.addEventListener('resize', resize);
        for (let i = 0; i < 200; i++) {
            stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.5 + 0.5, speed: Math.random() * 0.3 + 0.1, opacity: Math.random() * 0.8 + 0.2 });
        }
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach((star) => {
                star.opacity += (Math.random() - 0.5) * 0.02;
                star.opacity = Math.max(0.1, Math.min(1, star.opacity));
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * 0.6})`;
                ctx.fill();
                star.y -= star.speed * 0.3;
                if (star.y < -5) { star.y = canvas.height + 5; star.x = Math.random() * canvas.width; }
            });
            animationId = requestAnimationFrame(animate);
        };
        animate();
        return () => { cancelAnimationFrame(animationId); window.removeEventListener('resize', resize); };
    }, []);

    const handleLogin = () => {
        if (isAuthenticated) { navigate('/dashboard'); return; }
        setAuthModalTab('login');
        setShowAuthModal(true);
    };
    const handleRegister = () => {
        if (isAuthenticated) { navigate('/dashboard'); return; }
        setAuthModalTab('register');
        setShowAuthModal(true);
    };

    const active = DEMO_LAYERS[activeLayer];
    const ActiveIcon = active.icon;

    return (
        <section id="hero" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden', background: '#000' }}>
            <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />
            <div style={{ position: 'absolute', width: '700px', height: '700px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 168, 232, 0.25) 0%, rgba(0, 168, 232, 0.08) 30%, transparent 70%)', filter: 'blur(60px)', zIndex: 2, left: '20%', top: '50%', transform: 'translate(-50%, -50%)' }} />

            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1300px', margin: '0 auto', padding: '0 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }} className="hero-grid">

                {/* Left — Text */}
                <div>
                    <div className="animate-fade-in-up" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '8px 20px', marginBottom: '32px' }}>
                        <span style={{ background: '#00A8E8', color: '#0a0a0a', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mới</span>
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500 }}>AI thế hệ mới</span>
                    </div>
                    <h1 className="animate-fade-in-up animation-delay-200" style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 700, lineHeight: 1.1, marginBottom: '24px', background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1.5px' }}>
                        AI thế hệ mới<br />Phân tích chứng khoán toàn diện
                    </h1>
                    <p className="animate-fade-in-up animation-delay-400" style={{ fontSize: 'clamp(15px, 1.5vw, 18px)', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: '520px', marginBottom: '40px' }}>
                        Dữ liệu đa nguồn bảo chứng độ tin cậy – AI dựa trên dữ liệu để phân tích đa chiều và gợi ý hành động.
                    </p>
                    <div className="animate-fade-in-up animation-delay-600" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <button id="hero-btn-login" onClick={handleLogin} style={{ background: '#00A8E8', color: '#0a0a0a', padding: '14px 36px', borderRadius: '8px', fontSize: '16px', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.3s ease' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#33BFEF'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 168, 232, 0.35)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#00A8E8'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            {isAuthenticated ? 'Vào Dashboard' : 'Đăng nhập'}
                        </button>
                        {!isAuthenticated && (
                            <button id="hero-btn-register" onClick={handleRegister} style={{ color: '#fff', padding: '14px 36px', borderRadius: '8px', fontSize: '16px', fontWeight: 500, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'all 0.3s ease' }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; }}
                            >
                                Đăng ký
                            </button>
                        )}
                    </div>
                </div>

                {/* Right — AI Insight Demo */}
                <div className="animate-fade-in-up animation-delay-400">
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '28px', backdropFilter: 'blur(20px)' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Sparkles size={18} color="#00A8E8" />
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>IQX AI Insights</span>
                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>VIC</span>
                        </div>

                        {/* Layers */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {DEMO_LAYERS.map((layer, i) => {
                                const Icon = layer.icon;
                                const isActive = i === activeLayer;
                                return (
                                    <div key={layer.key}
                                        onClick={() => setActiveLayer(i)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                                            background: isActive ? `${layer.color}12` : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isActive ? `${layer.color}40` : 'rgba(255,255,255,0.04)'}`,
                                            transition: 'all 0.4s ease',
                                            transform: isActive ? 'scale(1.02)' : 'scale(1)',
                                        }}
                                    >
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${layer.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Icon size={16} color={layer.color} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '12px', fontWeight: 600, color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>{layer.label}</div>
                                            <div style={{ fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'all 0.4s ease', maxHeight: isActive ? '20px' : '0', opacity: isActive ? 1 : 0 }}>
                                                {layer.summary}
                                            </div>
                                        </div>
                                        {isActive && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: layer.color, flexShrink: 0, animation: 'pulse-dot 1.5s ease-in-out infinite' }} />}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Active layer detail */}
                        <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', background: `${active.color}08`, border: `1px solid ${active.color}20`, transition: 'all 0.4s ease' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <ActiveIcon size={14} color={active.color} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: active.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{active.label}</span>
                            </div>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: 0 }}>{active.summary}</p>
                        </div>
                    </div>

                    {/* Description under demo */}
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginTop: '16px', textAlign: 'center' }}>
                        Hệ thống AI tổng hợp mọi tín hiệu quan trọng thành 6 lớp phân tích rõ ràng
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.5); } }
                @media (max-width: 900px) { .hero-grid { grid-template-columns: 1fr !important; gap: 40px !important; text-align: center; } }
            `}</style>
        </section>
    );
}
