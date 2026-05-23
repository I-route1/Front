import { useState } from 'react'
import { Link } from 'react-router-dom'

const PASSWORD_RULES = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/

export default function FindPassword() {
  const [step, setStep] = useState('verify')
  const [form, setForm] = useState({
    username: '',
    email: '',
    authCode: '',
    newPassword: '',
    newPasswordConfirm: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const handleVerify = async () => {
    const nextErrors = {}

    if (!form.username.trim()) nextErrors.username = '아이디를 입력해 주세요'
    if (!form.email.includes('@')) nextErrors.email = '올바른 이메일을 입력해 주세요'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 700))
      setStep('reset')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    const nextErrors = {}

    if (!form.authCode.trim()) {
      nextErrors.authCode = '인증번호를 입력해 주세요'
    }

    if (!form.newPassword) {
      nextErrors.newPassword = '새 비밀번호를 입력해 주세요'
    } else if (!PASSWORD_RULES.test(form.newPassword)) {
      nextErrors.newPassword = '영문·숫자·특수문자 포함 8자 이상'
    }

    if (form.newPassword !== form.newPasswordConfirm) {
      nextErrors.newPasswordConfirm = '비밀번호가 일치하지 않습니다'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 700))
      setStep('complete')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)',
          padding: '48px 24px 32px',
          color: 'white',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <Link to="/login" style={{ position: 'absolute', left: 20, top: 16, color: 'rgba(255,255,255,0.75)', fontSize: 24 }}>
          ←
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>비밀번호 찾기</h1>
        <p style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
          본인 확인 후 새로운 비밀번호를 설정합니다.
        </p>
      </div>

      <div style={{ padding: '28px 20px', maxWidth: 480, width: '100%', margin: '0 auto' }}>
        {step === 'verify' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">아이디</label>
              <input
                className="input-field"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                placeholder="아이디를 입력해 주세요"
                style={{ borderColor: errors.username ? 'var(--color-danger)' : '' }}
              />
              {errors.username && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{errors.username}</p>}
            </div>

            <div className="input-group">
              <label className="input-label">이메일</label>
              <input
                className="input-field"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="example@email.com"
                style={{ borderColor: errors.email ? 'var(--color-danger)' : '' }}
              />
              {errors.email && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{errors.email}</p>}
            </div>

            <button
              onClick={handleVerify}
              disabled={loading}
              className="btn btn--primary btn--full"
              style={{ padding: 15, opacity: loading ? 0.65 : 1 }}
            >
              {loading ? '확인 중...' : '인증번호 받기'}
            </button>
          </div>
        )}

        {step === 'reset' && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--color-primary-light)', borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700 }}>
                인증번호가 이메일로 발송되었습니다.
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                테스트용 인증번호는 123456으로 입력하면 됩니다.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">인증번호</label>
              <input
                className="input-field"
                value={form.authCode}
                onChange={(e) => update('authCode', e.target.value)}
                placeholder="인증번호 6자리"
                style={{ borderColor: errors.authCode ? 'var(--color-danger)' : '' }}
              />
              {errors.authCode && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{errors.authCode}</p>}
            </div>

            <div className="input-group">
              <label className="input-label">새 비밀번호</label>
              <input
                className="input-field"
                type="password"
                value={form.newPassword}
                onChange={(e) => update('newPassword', e.target.value)}
                placeholder="영문·숫자·특수문자 포함 8자 이상"
                style={{ borderColor: errors.newPassword ? 'var(--color-danger)' : '' }}
              />
              {errors.newPassword && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{errors.newPassword}</p>}
            </div>

            <div className="input-group">
              <label className="input-label">새 비밀번호 확인</label>
              <input
                className="input-field"
                type="password"
                value={form.newPasswordConfirm}
                onChange={(e) => update('newPasswordConfirm', e.target.value)}
                placeholder="새 비밀번호를 다시 입력해 주세요"
                style={{ borderColor: errors.newPasswordConfirm ? 'var(--color-danger)' : '' }}
              />
              {errors.newPasswordConfirm && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{errors.newPasswordConfirm}</p>}
            </div>

            <button
              onClick={handleReset}
              disabled={loading}
              className="btn btn--primary btn--full"
              style={{ padding: 15, opacity: loading ? 0.65 : 1 }}
            >
              {loading ? '변경 중...' : '비밀번호 재설정'}
            </button>
          </div>
        )}

        {step === 'complete' && (
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 54 }}>✅</div>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>
              비밀번호가 재설정되었습니다
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8 }}>
              새 비밀번호로 다시 로그인해 주세요.
            </p>
            <Link to="/login" className="btn btn--primary btn--full" style={{ marginTop: 20 }}>
              로그인하러 가기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}