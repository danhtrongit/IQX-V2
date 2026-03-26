import { useEffect, useRef } from 'react';
import { Link } from 'react-router';

export default function HeroSection() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;
        const stars: { x: number; y: number; r: number; speed: number; opacity: number }[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.3 + 0.1,
                opacity: Math.random() * 0.8 + 0.2,
            });
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
                if (star.y < -5) {
                    star.y = canvas.height + 5;
                    star.x = Math.random() * canvas.width;
                }
            });

            animationId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <section
            id="hero"
            style={{
                position: 'relative',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                background: '#000',
            }}
        >
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 1,
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    width: '700px',
                    height: '700px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(0, 168, 232, 0.35) 0%, rgba(0, 168, 232, 0.12) 30%, rgba(0, 168, 232, 0.03) 60%, transparent 80%)',
                    filter: 'blur(40px)',
                    zIndex: 2,
                    animation: 'pulse-glow 6s ease-in-out infinite',
                }}
            />

            <div
                style={{
                    position: 'absolute',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    border: '2px solid rgba(0, 168, 232, 0.15)',
                    zIndex: 2,
                    animation: 'pulse-glow 8s ease-in-out infinite',
                }}
            />

            <div
                style={{
                    position: 'relative',
                    zIndex: 10,
                    textAlign: 'center',
                    maxWidth: '900px',
                    padding: '0 24px',
                }}
            >
                <div
                    className="animate-fade-in-up"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '100px',
                        padding: '8px 20px',
                        marginBottom: '32px',
                    }}
                >
                    <span style={{
                        background: '#00A8E8',
                        color: '#0a0a0a',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '100px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                    }}>
                        Mới
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 500 }}>
                        AI thế hệ mới
                    </span>
                </div>

                <h1
                    className="animate-fade-in-up animation-delay-200"
                    style={{
                        fontSize: 'clamp(40px, 6vw, 72px)',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        marginBottom: '28px',
                        background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        letterSpacing: '-1.5px',
                    }}
                >
                    AI thế hệ mới
                    <br />
                    Phân tích chứng khoán toàn diện
                </h1>

                <p
                    className="animate-fade-in-up animation-delay-400"
                    style={{
                        fontSize: 'clamp(16px, 2vw, 20px)',
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.6,
                        maxWidth: '700px',
                        margin: '0 auto 48px',
                        fontWeight: 400,
                    }}
                >
                    Dữ liệu đa nguồn bảo chứng độ tin cậy – AI dựa trên dữ liệu để phân tích đa chiều và gợi ý hành động.
                </p>

                <div
                    className="animate-fade-in-up animation-delay-600"
                    style={{
                        display: 'flex',
                        gap: '16px',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                    }}
                >
                    <Link
                        to="/dashboard"
                        id="hero-cta-primary"
                        style={{
                            background: '#00A8E8',
                            color: '#0a0a0a',
                            padding: '14px 36px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            transition: 'all 0.3s ease',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#33BFEF';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 168, 232, 0.35)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#00A8E8';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        Truy cập Dashboard
                    </Link>
                    <a
                        href="#features"
                        id="hero-cta-secondary"
                        style={{
                            color: '#fff',
                            padding: '14px 36px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 500,
                            textDecoration: 'none',
                            border: '1px solid rgba(255,255,255,0.2)',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        Tính năng
                    </a>
                </div>
            </div>
        </section>
    );
}
