import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth, getDefaultRoute } from '@/context/AuthContext'

export default function Login() {
  const { loginWithKakao, loginWithCredentials, isLoggedIn, role } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isLoggedIn) navigate(getDefaultRoute(role), { replace: true })
  }, [isLoggedIn, role, navigate])

  const update = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const handleLogin = async () => {
    const e = {}

    if (!form.username.trim()) e.username = '아이디를 입력해 주세요'
    if (!form.password) e.password = '비밀번호를 입력해 주세요'

    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }

    setLoading(true)

    try {
      await loginWithCredentials(form.username, form.password)
    } catch (err) {
      setErrors({ submit: err.message || '아이디 또는 비밀번호가 올바르지 않습니다' })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {/* 상단 헤더 */}
      <div
        style={{
          background: 'linear-gradient(160deg, #0A1628 0%, #1A3A6B 60%, #1A56DB 100%)',
          padding: '56px 32px 40px',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: 36,
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          🛡️
        </div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' }}>아이루트</h1>
        <p style={{ marginTop: 8, fontSize: 14, opacity: 0.7 }}>자녀의 안전한 통학 플랫폼</p>
      </div>

      {/* 로그인 폼 */}
      <div
        style={{
          flex: 1,
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxWidth: 480,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div className="input-group">
          <label className="input-label">아이디</label>
          <input
            className="input-field"
            placeholder="아이디를 입력해 주세요"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="username"
            style={{ borderColor: errors.username ? 'var(--color-danger)' : '' }}
          />
          {errors.username && (
            <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
              {errors.username}
            </p>
          )}
        </div>

        <div className="input-group">
          <label className="input-label">비밀번호</label>
          <input
            className="input-field"
            type="password"
            placeholder="비밀번호를 입력해 주세요"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
            style={{ borderColor: errors.password ? 'var(--color-danger)' : '' }}
          />
          {errors.password && (
            <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
              {errors.password}
            </p>
          )}
        </div>

        {errors.submit && (
          <div style={{ background: '#FFE9E9', border: '1px solid #FFBCBC', borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontSize: 13, color: 'var(--color-danger)', fontWeight: 600 }}>
              {errors.submit}
            </p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 14,
            border: 'none',
            background: loading ? 'var(--color-text-muted)' : 'var(--color-primary)',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(26,86,219,0.35)',
            transition: 'all 0.15s',
          }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>

        {/* 구분선 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>또는</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        {/* 카카오 로그인 */}
        <button
          onClick={loginWithKakao}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 14,
            border: 'none',
            background: '#FEE500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            fontSize: 15,
            fontWeight: 700,
            color: '#1A1A1A',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(254,229,0,0.4)',
            transition: 'all 0.15s',
          }}
        >
          <KakaoIcon />
          카카오로 시작하기
        </button>

        {/* 하단 링크 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 8, flexWrap: 'wrap' }}>
          <Link to="/register" style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>
            회원가입
          </Link>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <Link to="/find-id" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            아이디 찾기
          </Link>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <Link to="/find-password" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            비밀번호 찾기
          </Link>
        </div>

      </div>
    </div>
  )
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1A1A1A">
      <path d="M12 3C6.477 3 2 6.477 2 11c0 2.84 1.535 5.353 3.875 6.944L4.95 21.45a.5.5 0 0 0 .715.555l4.218-2.576C10.577 19.476 11.28 19.5 12 19.5c5.523 0 10-3.477 10-7.5S17.523 3 12 3z" />
    </svg>
  )
}