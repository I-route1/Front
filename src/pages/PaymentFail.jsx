import { useSearchParams, useNavigate } from 'react-router-dom'

export default function PaymentFail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const code = searchParams.get('code') ?? ''
  const message = searchParams.get('message') ?? '알 수 없는 오류가 발생했습니다.'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '32px 24px',
      }}
    >
      <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
      <p style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'var(--color-text-primary)' }}>
        결제 실패
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6, textAlign: 'center' }}>
        {message}
      </p>
      {code && (
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 28 }}>
          오류 코드: {code}
        </p>
      )}
      {!code && <div style={{ marginBottom: 28 }} />}

      <button
        onClick={() => navigate('/payment')}
        style={{
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
          marginBottom: 10,
        }}
      >
        다시 시도
      </button>
      <button
        onClick={() => navigate('/home')}
        style={{
          width: '100%',
          maxWidth: 300,
          padding: '14px',
          background: 'var(--color-surface)',
          color: 'var(--color-primary)',
          border: '1.5px solid var(--color-primary)',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        홈으로 이동
      </button>
    </div>
  )
}
