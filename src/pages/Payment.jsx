import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { paymentAPI } from '@/api/payment'

const PLANS = [
  {
    key: 'PREMIUM_REPORT',
    name: 'AI 프리미엄 리포트',
    price: 5000,
    description: 'AI가 생성하는 통합 분석 리포트 1회',
    badge: '단건',
    badgeColor: '#FF6B35',
    subscription: false,
    features: ['AI 학습 분석 리포트', '맞춤 피드백 제공', '크레딧 1개 지급'],
  },
  {
    key: 'MONTHLY_BASIC',
    name: 'i-Route 베이직',
    price: 9900,
    description: '매월 자동 결제되는 베이직 구독',
    badge: '구독',
    badgeColor: '#1A56DB',
    subscription: true,
    features: ['실시간 위치 추적', '승하차 알림', '기본 리포트'],
  },
  {
    key: 'MONTHLY_PREMIUM',
    name: 'i-Route 프리미엄',
    price: 19900,
    description: '매월 자동 결제되는 프리미엄 구독',
    badge: '구독',
    badgeColor: '#9B59B6',
    subscription: true,
    features: ['베이직 플랜 전체 포함', 'AI 리포트 무제한', '우선 고객 지원'],
    recommended: true,
  },
]

function loadTossSDK() {
  return new Promise((resolve, reject) => {
    if (window.TossPayments) {
      resolve(window.TossPayments)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.tosspayments.com/v1/payment'
    script.onload = () => resolve(window.TossPayments)
    script.onerror = () => reject(new Error('Toss SDK 로드 실패'))
    document.head.appendChild(script)
  })
}

export default function Payment() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePayment = async () => {
    if (!selectedPlan) return
    setError('')
    setLoading(true)

    try {
      const TossPayments = await loadTossSDK()
      const plan = PLANS.find((p) => p.key === selectedPlan)
      const origin = window.location.origin

      if (!plan.subscription) {
        const order = await paymentAPI.createOrder(selectedPlan)
        const toss = TossPayments(order.clientKey)
        await toss.requestPayment('카드', {
          amount: order.amount,
          orderId: order.orderId,
          orderName: order.orderName,
          customerName: user?.name ?? '고객',
          successUrl: `${origin}/payment/success`,
          failUrl: `${origin}/payment/fail`,
        })
      } else {
        const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY
        if (!clientKey) {
          setError('결제 설정이 올바르지 않습니다. 관리자에게 문의해주세요.')
          return
        }
        sessionStorage.setItem('toss-billing-plan', selectedPlan)
        const toss = TossPayments(clientKey)
        await toss.requestBillingAuth('카드', {
          customerKey: `customer_${user?.id ?? 'guest'}`,
          successUrl: `${origin}/payment/billing/success`,
          failUrl: `${origin}/payment/fail`,
        })
      }
    } catch (e) {
      if (e?.code === 'USER_CANCEL') {
        setError('결제가 취소되었습니다.')
      } else {
        setError(e?.message ?? '결제 중 오류가 발생했습니다.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* 헤더 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)',
          padding: '28px 20px 32px',
          color: 'white',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '4px 0',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontFamily: 'inherit',
            opacity: 0.85,
          }}
        >
          ← 뒤로
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>요금제 선택</h1>
        <p style={{ fontSize: 13, opacity: 0.75 }}>
          필요한 플랜을 선택하고 결제해주세요
        </p>
      </div>

      {/* 플랜 카드 목록 */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PLANS.map((plan) => {
          const selected = selectedPlan === plan.key
          return (
            <button
              key={plan.key}
              onClick={() => setSelectedPlan(plan.key)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'var(--color-surface)',
                border: selected
                  ? `2px solid var(--color-primary)`
                  : '2px solid var(--color-border)',
                borderRadius: 16,
                padding: 18,
                cursor: 'pointer',
                fontFamily: 'inherit',
                position: 'relative',
                boxShadow: selected ? '0 0 0 3px rgba(26,86,219,0.12)' : 'var(--shadow-sm)',
                transition: 'all 0.15s',
              }}
            >
              {plan.recommended && (
                <span
                  style={{
                    position: 'absolute',
                    top: -10,
                    right: 16,
                    background: 'var(--color-primary)',
                    color: 'white',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 999,
                  }}
                >
                  추천
                </span>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: plan.badgeColor,
                        background: plan.badgeColor + '18',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {plan.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {plan.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>
                    {plan.description}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                    {plan.price.toLocaleString()}원
                  </p>
                  {plan.subscription && (
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>/ 월</p>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                {plan.features.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 6,
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    <span style={{ color: 'var(--color-success)', fontSize: 14, flexShrink: 0 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>

              {selected && (
                <div
                  style={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div
          style={{
            margin: '0 16px',
            padding: '12px 16px',
            background: '#FFF2F2',
            border: '1px solid #FFCDD2',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--color-danger)',
          }}
        >
          {error}
        </div>
      )}

      {/* 결제 버튼 */}
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={handlePayment}
          disabled={!selectedPlan || loading}
          style={{
            width: '100%',
            padding: '16px',
            background: !selectedPlan || loading ? 'var(--color-border)' : 'var(--color-primary)',
            color: !selectedPlan || loading ? 'var(--color-text-muted)' : 'white',
            border: 'none',
            borderRadius: 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: !selectedPlan || loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
        >
          {loading ? '처리 중...' : selectedPlan ? `결제하기` : '플랜을 선택해주세요'}
        </button>

        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            marginTop: 12,
            lineHeight: 1.6,
          }}
        >
          결제는 토스페이먼츠를 통해 안전하게 처리됩니다.{'\n'}
          구독은 언제든지 해지할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
