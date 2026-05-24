import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function FindId() {
  const [form, setForm] = useState({ name: '', email: '' })
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
    setResult(null)
  }

  const handleSubmit = async () => {
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = '이름을 입력해 주세요'
    if (!form.email.includes('@')) nextErrors.email = '올바른 이메일을 입력해 주세요'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 700))

      setResult({
        username: 'parent_user',
        joinedAt: '2026.03.27',
      })
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
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>아이디 찾기</h1>
        <p style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
          가입 시 입력한 정보를 통해 아이디를 확인합니다.
        </p>
      </div>

      <div style={{ padding: '28px 20px', maxWidth: 480, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="input-label">이름</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="이름을 입력해 주세요"
              style={{ borderColor: errors.name ? 'var(--color-danger)' : '' }}
            />
            {errors.name && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{errors.name}</p>}
          </div>

          <div className="input-group">
            <label className="input-label">이메일</label>
            <input
              className="input-field"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="example@email.com"
              style={{ borderColor: errors.email ? 'var(--color-danger)' : '' }}
            />
            {errors.email && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{errors.email}</p>}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn--primary btn--full"
            style={{ padding: 15, opacity: loading ? 0.65 : 1 }}
          >
            {loading ? '확인 중...' : '아이디 찾기'}
          </button>
        </div>

        {result && (
          <div className="card" style={{ borderColor: 'var(--color-primary)', background: 'var(--color-primary-light)' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              입력하신 정보와 일치하는 아이디입니다.
            </p>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>
              {result.username}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
              가입일: {result.joinedAt}
            </p>
            <Link to="/login" className="btn btn--primary btn--full" style={{ marginTop: 16 }}>
              로그인하러 가기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}