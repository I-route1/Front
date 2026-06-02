import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paymentAPI } from '@/api/payment'

const STATUS_LABEL = {
  PENDING: '대기',
  DONE: '완료',
  CANCELLED: '취소',
  FAILED: '실패',
}

const STATUS_COLOR = {
  PENDING: '#FFB800',
  DONE: '#00C49A',
  CANCELLED: '#94A3B8',
  FAILED: '#FF3B3B',
}

const PLAN_LABEL = {
  PREMIUM_REPORT: 'AI 프리미엄 리포트',
  MONTHLY_BASIC: 'i-Route 베이직',
  MONTHLY_PREMIUM: 'i-Route 프리미엄',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function PaymentHistory() {
  const navigate = useNavigate()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    paymentAPI
      .getHistory()
      .then((data) => setHistory(data ?? []))
      .catch((e) => setError(e?.message ?? '결제 내역을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* 홈으로 플로팅 버튼 */}
      <button
        onClick={() => navigate(-1)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 100,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'white',
          borderRadius: 10,
          padding: '8px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        ← 뒤로
      </button>
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
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>결제 내역</h1>
        <p style={{ fontSize: 13, opacity: 0.75 }}>나의 결제 및 구독 내역입니다</p>
      </div>

      <div style={{ padding: '16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>
            <div style={spinnerStyle} />
            <p style={{ marginTop: 16, fontSize: 14 }}>불러오는 중...</p>
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              padding: '16px',
              background: '#FFF2F2',
              border: '1px solid #FFCDD2',
              borderRadius: 12,
              fontSize: 14,
              color: 'var(--color-danger)',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '56px 24px',
              color: 'var(--color-text-muted)',
            }}
          >
            <p style={{ fontSize: 36, marginBottom: 12 }}>💳</p>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'var(--color-text-primary)' }}>
              결제 내역이 없습니다
            </p>
            <p style={{ fontSize: 13 }}>요금제를 구독하거나 결제해보세요.</p>
            <button
              onClick={() => navigate('/payment')}
              style={{
                marginTop: 20,
                padding: '12px 24px',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              요금제 보기
            </button>
          </div>
        )}

        {!loading && !error && history.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map((item) => (
              <div
                key={item.paymentId}
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 14,
                  padding: '16px',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 3 }}>
                      {PLAN_LABEL[item.planType] ?? item.orderName}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {formatDate(item.confirmedAt || item.createdAt)}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                      {item.amount.toLocaleString()}원
                    </p>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: STATUS_COLOR[item.status] ?? '#94A3B8',
                        background: (STATUS_COLOR[item.status] ?? '#94A3B8') + '18',
                        padding: '3px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </div>
                </div>

                {item.method && (
                  <div
                    style={{
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      결제수단
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {item.method}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const spinnerStyle = {
  width: 36,
  height: 36,
  border: '3px solid var(--color-border)',
  borderTop: '3px solid var(--color-primary)',
  borderRadius: '50%',
  animation: 'spin 0.9s linear infinite',
  margin: '0 auto',
}
