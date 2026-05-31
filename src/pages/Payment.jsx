import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { paymentAPI } from '@/api/payment'

const PLAN_GROUPS = [
  {
    groupKey: 'report',
    groupName: 'AI 프리미엄 리포트',
    groupDesc: '단건 결제 · 사용한 만큼만',
    options: [
      {
        key: 'PREMIUM_REPORT',
        label: '1회',
        price: 3000,
        priceUnit: '/ 회',
        subscription: false,
        tag: null,
        features: ['AI 통합 분석 리포트 1회', '크레딧 1개 지급'],
      },
      {
        key: 'PREMIUM_REPORT_10',
        label: '10회 패키지',
        price: 27000,
        priceUnit: null,
        subscription: false,
        tag: '1회 추가 증정',
        features: ['AI 통합 분석 리포트 10회', '1회 무료 추가 (총 11회)', '회당 2,454원'],
      },
    ],
  },
  {
    groupKey: 'basic',
    groupName: 'i-Route 베이직',
    groupDesc: '실시간 위치 추적 · 승하차 알림',
    options: [
      {
        key: 'MONTHLY_BASIC',
        label: '1개월',
        price: 7000,
        priceUnit: '/ 월',
        subscription: true,
        tag: null,
        features: ['실시간 위치 추적', '승하차 알림', '기본 리포트'],
      },
      {
        key: 'MONTHLY_BASIC_ANNUAL',
        label: '12개월',
        price: 70000,
        priceUnit: '/ 년',
        subscription: false,
        tag: '2개월 절약',
        features: ['실시간 위치 추적', '승하차 알림', '기본 리포트', '월 5,833원 환산'],
      },
    ],
  },
  {
    groupKey: 'premium',
    groupName: 'i-Route 프리미엄',
    groupDesc: 'AI 리포트 무제한 · 우선 지원',
    options: [
      {
        key: 'MONTHLY_PREMIUM',
        label: '1개월',
        price: 14900,
        priceUnit: '/ 월',
        subscription: true,
        tag: null,
        features: ['베이직 플랜 전체 포함', 'AI 리포트 무제한', '우선 고객 지원'],
      },
    ],
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

const ALL_OPTIONS = PLAN_GROUPS.flatMap((g) => g.options)

export default function Payment() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedKey, setSelectedKey] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedOption = ALL_OPTIONS.find((o) => o.key === selectedKey)

  const handlePayment = async () => {
    if (!selectedOption) return
    setError('')
    setLoading(true)

    try {
      const TossPayments = await loadTossSDK()
      const origin = window.location.origin

      if (!selectedOption.subscription) {
        const order = await paymentAPI.createOrder(selectedKey)
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
        sessionStorage.setItem('toss-billing-plan', selectedKey)
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
            background: 'none', border: 'none', color: 'white',
            cursor: 'pointer', padding: '4px 0', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 14, fontFamily: 'inherit', opacity: 0.85,
          }}
        >
          ← 뒤로
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>요금제 선택</h1>
        <p style={{ fontSize: 13, opacity: 0.75 }}>필요한 플랜을 선택하고 결제해주세요</p>
      </div>

      {/* 플랜 그룹 */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {PLAN_GROUPS.map((group) => (
          <div key={group.groupKey}>
            {/* 그룹 헤더 */}
            <div style={{ marginBottom: 10, paddingLeft: 2 }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {group.groupName}
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {group.groupDesc}
              </p>
            </div>

            {/* 옵션 카드들 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {group.options.map((option) => {
                const selected = selectedKey === option.key
                return (
                  <button
                    key={option.key}
                    onClick={() => setSelectedKey(option.key)}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: 'var(--color-surface)',
                      border: selected ? '2px solid var(--color-primary)' : '2px solid var(--color-border)',
                      borderRadius: 14, padding: '14px 16px',
                      cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: selected ? '0 0 0 3px rgba(26,86,219,0.1)' : 'var(--shadow-sm)',
                      transition: 'all 0.15s',
                      position: 'relative',
                    }}
                  >
                    {/* 태그 */}
                    {option.tag && (
                      <span
                        style={{
                          position: 'absolute', top: -10, right: 14,
                          background: '#FF6B35', color: 'white',
                          fontSize: 11, fontWeight: 700,
                          padding: '2px 9px', borderRadius: 999,
                        }}
                      >
                        {option.tag}
                      </span>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      {/* 라벨 + 구독 뱃지 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          {option.label}
                        </p>
                        {option.subscription && (
                          <span
                            style={{
                              fontSize: 10, fontWeight: 700,
                              color: 'var(--color-primary)',
                              background: 'var(--color-primary-light)',
                              padding: '2px 7px', borderRadius: 999,
                            }}
                          >
                            자동결제
                          </span>
                        )}
                      </div>

                      {/* 가격 */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                          {option.price.toLocaleString()}원
                        </span>
                        {option.priceUnit && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                            {option.priceUnit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 혜택 목록 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {option.features.map((f) => (
                        <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          <span style={{ color: 'var(--color-success)', flexShrink: 0 }}>✓</span>
                          {f}
                        </div>
                      ))}
                    </div>

                    {/* 선택 체크 */}
                    {selected && (
                      <div
                        style={{
                          position: 'absolute', top: 14, right: 14,
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--color-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: 12, fontWeight: 700,
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 에러 */}
      {error && (
        <div
          style={{
            margin: '0 16px 16px',
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
      <div style={{ padding: '0 16px' }}>
        <button
          onClick={handlePayment}
          disabled={!selectedKey || loading}
          style={{
            width: '100%', padding: '16px',
            background: !selectedKey || loading ? 'var(--color-border)' : 'var(--color-primary)',
            color: !selectedKey || loading ? 'var(--color-text-muted)' : 'white',
            border: 'none', borderRadius: 14,
            fontSize: 16, fontWeight: 700,
            cursor: !selectedKey || loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}
        >
          {loading ? '처리 중...' : selectedOption ? `${selectedOption.price.toLocaleString()}원 결제하기` : '플랜을 선택해주세요'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12, lineHeight: 1.6 }}>
          결제는 토스페이먼츠를 통해 안전하게 처리됩니다.{'\n'}
          구독은 언제든지 해지할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
