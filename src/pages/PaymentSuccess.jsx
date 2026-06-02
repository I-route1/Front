import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { paymentAPI } from '@/api/payment'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const returnTo = sessionStorage.getItem('payment-return-to')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')

    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setErrorMsg('결제 정보가 올바르지 않습니다.')
      return
    }

    paymentAPI
      .confirmPayment(paymentKey, orderId, amount)
      .then(() => {
        sessionStorage.removeItem('payment-return-to')
        setStatus('done')
      })
      .catch((e) => {
        setStatus('error')
        setErrorMsg(e?.message ?? '결제 승인 중 오류가 발생했습니다.')
      })
  }, [])

  if (status === 'loading') {
    return (
      <div style={centerStyle}>
        <div style={spinnerStyle} />
        <p style={{ marginTop: 20, fontSize: 15, color: 'var(--color-text-secondary)' }}>
          결제를 확인하는 중입니다...
        </p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={centerStyle}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
        <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-primary)' }}>
          결제 승인 실패
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
      <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
      <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--color-text-primary)' }}>
        결제 완료!
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 28, textAlign: 'center' }}>
        결제가 성공적으로 처리되었습니다.
      </p>
      {returnTo && (
        <button onClick={() => navigate(returnTo)} style={btnStyle}>
          AI 리포트로 돌아가기
        </button>
      )}
      <button
        onClick={() => navigate('/payment/history')}
        style={{ ...btnStyle, marginTop: returnTo ? 10 : 0, background: returnTo ? 'var(--color-surface)' : 'var(--color-primary)', color: returnTo ? 'var(--color-primary)' : 'white', border: returnTo ? '1.5px solid var(--color-primary)' : 'none' }}
      >
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
