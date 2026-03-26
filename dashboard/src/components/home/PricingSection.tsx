import { Check, Zap } from 'lucide-react';

export default function PricingSection() {
    return (
        <section
            id="pricing"
            style={{
                position: 'relative',
                padding: '120px 40px',
                background: '#000',
            }}
        >
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h2 style={{
                        fontSize: 'clamp(32px, 4vw, 48px)',
                        fontWeight: 700,
                        color: '#fff',
                        marginBottom: '16px',
                        letterSpacing: '-0.5px',
                    }}>
                        Giải pháp AI tự động hóa tốt nhất,
                        <br />
                        với mức giá hợp lý
                    </h2>
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '4px',
                    marginBottom: '60px',
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '12px',
                    padding: '4px',
                    width: 'fit-content',
                    margin: '0 auto 60px',
                }}>
                    {[
                        { label: '1 Tháng', active: true },
                        { label: '6 Tháng', badge: 'Tiết kiệm tới 20%' },
                        { label: '12 Tháng', badge: 'Tiết kiệm tới 30%' },
                    ].map((period, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                            {period.badge && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-24px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    background: '#00A8E8',
                                    color: '#0a0a0a',
                                    padding: '2px 10px',
                                    borderRadius: '100px',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {period.badge}
                                </span>
                            )}
                            <button
                                style={{
                                    padding: '12px 28px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: period.active ? '#fff' : 'rgba(255,255,255,0.5)',
                                    background: period.active ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                {period.label}
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '24px',
                    maxWidth: '1000px',
                    margin: '0 auto',
                }} className="pricing-grid">
                    {/* Starter */}
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '20px',
                        padding: '36px 28px',
                        transition: 'all 0.3s ease',
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0, 168, 232, 0.2)';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Zap size={20} color="#00A8E8" />
                            <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Gói Cơ bản</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '42px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>100,000</span>
                            <span style={{ fontSize: '18px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>VND</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>/tháng · Phân tích cơ bản</p>
                        <a href="#" style={{
                            display: 'block', textAlign: 'center', padding: '14px', borderRadius: '10px',
                            background: '#00A8E8', color: '#0a0a0a', fontWeight: 600, fontSize: '15px',
                            textDecoration: 'none', marginBottom: '24px', transition: 'all 0.2s ease',
                        }}>Chọn gói này</a>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {['Phân tích 5 lớp cơ bản', 'Tín hiệu hàng ngày', 'Cảnh báo rủi ro', 'Hỗ trợ qua email'].map((f) => (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Check size={16} color="#00A8E8" />
                                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Popular */}
                    <div style={{
                        background: 'rgba(0, 168, 232, 0.03)',
                        border: '1px solid rgba(0, 168, 232, 0.2)',
                        borderRadius: '20px',
                        padding: '36px 28px',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 168, 232, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        <span style={{
                            position: 'absolute', top: '16px', right: '16px',
                            background: '#00A8E8', color: '#0a0a0a', fontSize: '11px', fontWeight: 700,
                            padding: '4px 12px', borderRadius: '100px',
                        }}>Phổ biến</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Zap size={20} color="#00A8E8" fill="#00A8E8" />
                            <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Gói Pro</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '42px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>300,000</span>
                            <span style={{ fontSize: '18px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>VND</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>/tháng · Phân tích chuyên sâu</p>
                        <a href="#" style={{
                            display: 'block', textAlign: 'center', padding: '14px', borderRadius: '10px',
                            background: '#00A8E8', color: '#0a0a0a', fontWeight: 600, fontSize: '15px',
                            textDecoration: 'none', marginBottom: '24px', transition: 'all 0.2s ease',
                        }}>Chọn gói này</a>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {['Toàn bộ gói Cơ bản', 'Phân tích 5 lớp chuyên sâu', 'Kịch bản hành động chi tiết', 'Cảnh báo real-time', 'Quét mẫu hình nến & giá', 'Hỗ trợ ưu tiên 24/7'].map((f) => (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Check size={16} color="#00A8E8" />
                                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Enterprise */}
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '20px',
                        padding: '36px 28px',
                        transition: 'all 0.3s ease',
                    }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(0, 168, 232, 0.2)';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                            <Zap size={20} color="#00A8E8" />
                            <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Doanh nghiệp</span>
                        </div>
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '42px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>Liên hệ</span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '28px' }}>Webhook API & tích hợp tùy chỉnh</p>
                        <a href="#contact" style={{
                            display: 'block', textAlign: 'center', padding: '14px', borderRadius: '10px',
                            background: 'transparent', color: '#fff', fontWeight: 600, fontSize: '15px',
                            textDecoration: 'none', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.2)',
                            transition: 'all 0.2s ease',
                        }}>Liên hệ Sales</a>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {['Toàn bộ gói Pro', 'Webhook API', 'Tích hợp hệ thống riêng', 'Quản lý đa tài khoản', 'SLA & hỗ trợ riêng'].map((f) => (
                                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Check size={16} color="#00A8E8" />
                                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @media (max-width: 768px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
            max-width: 400px !important;
          }
        }
      `}</style>
        </section>
    );
}
