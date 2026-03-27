import { useState } from 'react';
import { Check, Zap, Crown, Rocket } from 'lucide-react';

const periods = [
    { key: '1m', label: '1 Tháng', discount: 0, badge: '' },
    { key: '6m', label: '6 Tháng', discount: 20, badge: 'Tiết kiệm 20%' },
    { key: '1y', label: '1 Năm', discount: 30, badge: 'Tiết kiệm 30%' },
] as const;

const plans = [
    {
        name: 'Cơ bản',
        icon: <Zap size={22} />,
        basePrice: 199000,
        description: 'Phân tích cơ bản cho nhà đầu tư mới',
        features: ['Phân tích 5 lớp cơ bản', 'Tín hiệu hàng ngày', 'Cảnh báo rủi ro', 'Hỗ trợ qua email'],
        popular: false,
    },
    {
        name: 'Pro',
        icon: <Crown size={22} />,
        basePrice: 499000,
        description: 'Phân tích chuyên sâu, kịch bản chi tiết',
        features: ['Toàn bộ gói Cơ bản', 'Phân tích 6 lớp chuyên sâu', 'Kịch bản hành động chi tiết', 'Cảnh báo real-time', 'Quét mẫu hình nến & giá', 'Hỗ trợ ưu tiên 24/7'],
        popular: true,
    },
    {
        name: 'Premium',
        icon: <Rocket size={22} />,
        basePrice: 999000,
        description: 'Toàn bộ tính năng + API tích hợp',
        features: ['Toàn bộ gói Pro', 'Webhook API', 'Tích hợp hệ thống riêng', 'Quản lý đa tài khoản', 'SLA & hỗ trợ riêng'],
        popular: false,
    },
];

function fmtPrice(amount: number) {
    return new Intl.NumberFormat('vi-VN').format(amount);
}

export default function PricingSection() {
    const [selectedPeriod, setSelectedPeriod] = useState<'1m' | '6m' | '1y'>('6m');
    const period = periods.find((p) => p.key === selectedPeriod)!;

    return (
        <section id="pricing" style={{ position: 'relative', padding: '120px 40px', background: '#000' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '48px' }}>
                    <h2 style={{ fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 700, color: '#fff', marginBottom: '16px', letterSpacing: '-0.5px' }}>
                        Giải pháp AI tự động hóa tốt nhất,
                        <br />với mức giá hợp lý
                    </h2>
                </div>

                {/* Period Toggle */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '60px' }}>
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '5px', position: 'relative' }}>
                        {periods.map((p) => (
                            <div key={p.key} style={{ position: 'relative' }}>
                                {p.badge && (
                                    <span style={{
                                        position: 'absolute', top: '-22px', left: '50%', transform: 'translateX(-50%)',
                                        fontSize: '10px', fontWeight: 700,
                                        background: 'linear-gradient(135deg, #00A8E8, #0081B7)',
                                        color: '#fff', padding: '3px 10px', borderRadius: '100px', whiteSpace: 'nowrap',
                                    }}>{p.badge}</span>
                                )}
                                <button
                                    onClick={() => setSelectedPeriod(p.key)}
                                    style={{
                                        padding: '12px 28px', borderRadius: '10px', fontSize: '14px', fontWeight: 600,
                                        border: 'none', cursor: 'pointer', transition: 'all 0.25s ease',
                                        color: selectedPeriod === p.key ? '#fff' : 'rgba(255,255,255,0.5)',
                                        background: selectedPeriod === p.key ? 'rgba(0, 168, 232, 0.15)' : 'transparent',
                                        boxShadow: selectedPeriod === p.key ? '0 0 20px rgba(0, 168, 232, 0.1)' : 'none',
                                    }}
                                >{p.label}</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', maxWidth: '1060px', margin: '0 auto' }} className="pricing-grid">
                    {plans.map((plan, i) => {
                        const discounted = Math.round(plan.basePrice * (1 - period.discount / 100));
                        const multiplier = selectedPeriod === '1m' ? 1 : selectedPeriod === '6m' ? 6 : 12;
                        const totalLabel = multiplier > 1 ? `${fmtPrice(discounted * multiplier)} VND tổng` : '';

                        return (
                            <div key={i} style={{
                                background: plan.popular ? 'rgba(0, 168, 232, 0.04)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${plan.popular ? 'rgba(0, 168, 232, 0.25)' : 'rgba(255,255,255,0.08)'}`,
                                borderRadius: '20px', padding: '36px 28px', position: 'relative', transition: 'all 0.3s ease',
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                    e.currentTarget.style.boxShadow = plan.popular ? '0 16px 60px rgba(0, 168, 232, 0.15)' : '0 12px 40px rgba(0,0,0,0.3)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {plan.popular && (
                                    <span style={{ position: 'absolute', top: '16px', right: '16px', background: 'linear-gradient(135deg, #00A8E8, #0081B7)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '5px 14px', borderRadius: '100px' }}>
                                        Phổ biến nhất
                                    </span>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                    <div style={{ color: '#00A8E8' }}>{plan.icon}</div>
                                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{plan.name}</span>
                                </div>
                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>{plan.description}</p>

                                <div style={{ marginBottom: '6px' }}>
                                    {period.discount > 0 && (
                                        <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', marginRight: '8px' }}>
                                            {fmtPrice(plan.basePrice)}
                                        </span>
                                    )}
                                    <span style={{ fontSize: '40px', fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>{fmtPrice(discounted)}</span>
                                    <span style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: '4px' }}>VND</span>
                                </div>
                                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '24px', minHeight: '16px' }}>
                                    /tháng {totalLabel && `· ${totalLabel}`}
                                </p>

                                <a href="#" style={{
                                    display: 'block', textAlign: 'center', padding: '14px', borderRadius: '10px', fontWeight: 600, fontSize: '15px', textDecoration: 'none', marginBottom: '24px', transition: 'all 0.2s ease',
                                    background: plan.popular ? '#00A8E8' : 'transparent',
                                    color: plan.popular ? '#0a0a0a' : '#fff',
                                    border: plan.popular ? 'none' : '1px solid rgba(255,255,255,0.2)',
                                }}>Chọn gói này</a>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {plan.features.map((f) => (
                                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Check size={16} color="#00A8E8" />
                                            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <style>{`@media (max-width: 768px) { .pricing-grid { grid-template-columns: 1fr !important; max-width: 400px !important; } }`}</style>
        </section>
    );
}
