import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paymentAPI } from '@/api/payment'

export default function PaymentBillingSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const authKey = searchParams.get('authKey')
    const planType = sessionStorage.getItem('toss-billing-plan')

    if (!authKey || !planType) {
      setStatus('error')
      setErrorMsg('구독 정보가 올바르지 않습니다.')
      return
    }

    paymentAPI
      .issueBilling(authKey, planType)
      .then(() => {
        sessionStorage.removeItem('toss-billing-plan')
        setStatus('done')
      })
      .catch((e) => {
        setStatus('error')
        setErrorMsg(e?.message ?? '구독 처리 중 오류가 발생했습니다.')
      })
  }, [])

  if (status === 'loading') {
    return (
      <div style={centerStyle}>
        <div style={spinnerStyle} />
        <p style={{ marginTop: 20, fontSize: 15, color: 'var(--color-text-secondary)' }}>
          구독을 처리하는 중입니다...
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>
          구독 처리 실패
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 28, textAlign: 'center' }}>
          {errorMsg}
        </p>
        <button onClick={() => navigate('/payment')} style={btnStyle}>
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div style={centerStyle}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--color-text-primary)' }}>
        구독 완료!
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 28, textAlign: 'center' }}>
        구독이 시작되었습니다. 매월 자동으로 갱신됩니다.
      </p>
      <button onClick={() => navigate('/payment/history')} style={btnStyle}>
        결제 내역 보기
      </button>
      <button
        onClick={() => navigate('/home')}
        style={{ ...btnStyle, marginTop: 10, background: 'var(--color-surface)', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary)' }}
      >
        홈으로 이동
      </button>
    </div>
  )
}

const centerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  padding: '32px 24px',
}

const btnStyle = {
  width: '100%',
  maxWidth: 300,
  padding: '14px',
  background: 'var(--color-primary)',
  color: 'white',
  border: 'none',
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const spinnerStyle = {
  width: 44,
  height: 44,
  border: '4px solid var(--color-border)',
  borderTop: '4px solid var(--color-primary)',
  borderRadius: '50%',
  animation: 'spin 0.9s linear infinite',
}
