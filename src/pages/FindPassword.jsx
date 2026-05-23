import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function FindPassword() {
  const [form, setForm] = useState({
    loginIdOrEmail: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

    setErrors((prev) => ({
      ...prev,
      [key]: '',
      submit: '',
    }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.loginIdOrEmail.trim()) {
      nextErrors.loginIdOrEmail = '이메일 또는 아이디를 입력해 주세요'
    } else if (form.loginIdOrEmail.trim().length < 4) {
      nextErrors.loginIdOrEmail = '이메일 또는 아이디는 4자 이상 입력해 주세요'
    }

    return nextErrors
  }

  const handleSendResetLink = async () => {
    const nextErrors = validate()

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      // TODO: POST /api/auth/password/reset-link
      // request body 예시:
      // {
      //   loginIdOrEmail: form.loginIdOrEmail
      // }
      await new Promise((resolve) => setTimeout(resolve, 800))

      setSent(true)
    } catch {
      setErrors({
        submit: '비밀번호 재설정 링크 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
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
        <Link
          to="/login"
          style={{
            position: 'absolute',
            left: 20,
            top: 16,
            color: 'rgba(255,255,255,0.75)',
            fontSize: 24,
          }}
        >
          ←
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 800 }}>비밀번호 찾기</h1>
        <p style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
          가입한 이메일 또는 아이디로 비밀번호 재설정 링크를 발송합니다.
        </p>
      </div>

      <div
        style={{
          padding: '28px 20px',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
        }}
      >
        {!sent ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: 'var(--color-primary-light)',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700 }}>
                비밀번호 재설정 안내
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.6 }}>
                입력한 정보가 가입 정보와 일치하면 비밀번호 재설정 링크가 이메일로 발송됩니다.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">이메일 또는 아이디</label>
              <input
                className="input-field"
                value={form.loginIdOrEmail}
                onChange={(event) => update('loginIdOrEmail', event.target.value)}
                placeholder="이메일 또는 아이디를 입력해 주세요"
                style={{ borderColor: errors.loginIdOrEmail ? 'var(--color-danger)' : '' }}
              />
              {errors.loginIdOrEmail && (
                <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                  {errors.loginIdOrEmail}
                </p>
              )}
            </div>

            {errors.submit && (
              <div
                style={{
                  background: '#FFE9E9',
                  border: '1px solid #FFBCBC',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              >
                <p style={{ fontSize: 13, color: 'var(--color-danger)', fontWeight: 600 }}>
                  {errors.submit}
                </p>
              </div>
            )}

            <button
              onClick={handleSendResetLink}
              disabled={loading}
              className="btn btn--primary btn--full"
              style={{
                padding: 15,
                opacity: loading ? 0.65 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '발송 중...' : '재설정 링크 발송'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
              아이디가 기억나지 않나요?{' '}
              <Link to="/find-id" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                아이디 찾기
              </Link>
            </p>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 54 }}>📩</div>

            <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>
              재설정 링크가 발송되었습니다
            </h2>

            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.6 }}>
              입력한 정보가 가입 정보와 일치하면 이메일로 비밀번호 재설정 링크가 발송됩니다.
              <br />
              메일함을 확인해 주세요.
            </p>

            <div
              style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 12,
                background: 'var(--color-primary-light)',
                textAlign: 'left',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
                이메일을 확인해 주세요
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.6 }}>
                비밀번호 재설정 링크는 일정 시간 동안만 유효합니다.
                메일이 보이지 않는 경우 스팸함을 확인하거나 다시 요청해 주세요.
              </p>
            </div>

            <button
              onClick={() => setSent(false)}
              className="btn btn--secondary btn--full"
              style={{ marginTop: 10 }}
            >
              다시 입력하기
            </button>

            <Link
              to="/login"
              className="btn btn--primary btn--full"
              style={{ marginTop: 10 }}
            >
              로그인 화면으로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}