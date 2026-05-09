import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { loginWithKakao, isLoggedIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoggedIn) navigate('/home', { replace: true })
  }, [isLoggedIn, navigate])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0A1628 0%, #1A3A6B 60%, #1A56DB 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 32px',
      gap: '40px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{
          width: 72, height: 72,
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 36,
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}>
          🛡️
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px' }}>아이루트</h1>
        <p style={{ marginTop: 8, fontSize: 15, opacity: 0.75, lineHeight: 1.5 }}>
          자녀의 안전한 통학을 위한<br />스마트 플랫폼
        </p>
      </div>

      {/* 기능 소개 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
        {FEATURES.map(({ icon, title, desc }) => (
          <div key={title} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 14,
            padding: '14px 16px',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{title}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 카카오 로그인 */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={loginWithKakao}
          style={{
            width: '100%',
            padding: '16px',
            background: '#FEE500',
            borderRadius: 14,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 16,
            fontWeight: 700,
            color: '#1A1A1A',
            boxShadow: '0 4px 16px rgba(254,229,0,0.4)',
            fontFamily: 'inherit',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#1A1A1A">
            <path d="M12 3C6.477 3 2 6.477 2 11c0 2.84 1.535 5.353 3.875 6.944L4.95 21.45a.5.5 0 0 0 .715.555l4.218-2.576C10.577 19.476 11.28 19.5 12 19.5c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
          </svg>
          카카오로 시작하기
        </button>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          가입 시 서비스 이용약관 및 개인정보처리방침에 동의합니다
        </p>
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: '📍', title: '실시간 위치 추적', desc: 'GPS 기반 자녀 이동 경로 확인' },
  { icon: '📚', title: 'AI 학습 로드맵',  desc: '개인 맞춤형 학습 계획 추천' },
  { icon: '🔔', title: '안전 알림',       desc: '도착/이탈 시 즉시 푸시 알림' },
]
