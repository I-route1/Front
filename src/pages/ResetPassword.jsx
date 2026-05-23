import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const PASSWORD_RULES = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/

export default function ResetPassword() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    newPassword: '',
    newPasswordConfirm: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

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

    if (!form.newPassword) {
      nextErrors.newPassword = '새 비밀번호를 입력해 주세요'
    } else if (!PASSWORD_RULES.test(form.newPassword)) {
      nextErrors.newPassword = '영문·숫자·특수문자를 포함하여 8자 이상 입력해 주세요'
    }

    if (!form.newPasswordConfirm) {
      nextErrors.newPasswordConfirm = '새 비밀번호 확인을 입력해 주세요'
    } else if (form.newPassword !== form.newPasswordConfirm) {
      nextErrors.newPasswordConfirm = '비밀번호가 일치하지 않습니다'
    }

    return nextErrors
  }

  const handleResetPassword = async () => {
    const nextErrors = validate()

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      // TODO: POST /api/auth/password/reset
      // request body 예시:
      // {
      //   resetToken: 'email-link-token',
      //   newPassword: form.newPassword
      // }
      await new Promise((resolve) => setTimeout(resolve, 800))

      setSuccess(true)

      setTimeout(() => {
        navigate('/login', { replace: true })
      }, 1600)
    } catch {
      setErrors({
        submit: '비밀번호 재설정에 실패했습니다. 다시 시도해 주세요.',
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

        <h1 style={{ fontSize: 24, fontWeight: 800 }}>비밀번호 재설정</h1>
        <p style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
          새로운 비밀번호를 입력해 주세요.
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
        {!success ? (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                background: 'var(--color-primary-light)',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700 }}>
                비밀번호 규칙
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.6 }}>
                영문, 숫자, 특수문자를 포함하여 8자 이상 입력해 주세요.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">새 비밀번호</label>
              <input
                className="input-field"
                type="password"
                value={form.newPassword}
                onChange={(event) => update('newPassword', event.target.value)}
                placeholder="영문·숫자·특수문자 포함 8자 이상"
                style={{ borderColor: errors.newPassword ? 'var(--color-danger)' : '' }}
              />
              {errors.newPassword && (
                <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                  {errors.newPassword}
                </p>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">새 비밀번호 확인</label>
              <input
                className="input-field"
                type="password"
                value={form.newPasswordConfirm}
                onChange={(event) => update('newPasswordConfirm', event.target.value)}
                placeholder="새 비밀번호를 다시 입력해 주세요"
                style={{
                  borderColor:
                    errors.newPasswordConfirm ||
                    (form.newPasswordConfirm && form.newPassword !== form.newPasswordConfirm)
                      ? 'var(--color-danger)'
                      : '',
                }}
              />

              {errors.newPasswordConfirm && (
                <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                  {errors.newPasswordConfirm}
                </p>
              )}

              {!errors.newPasswordConfirm &&
                form.newPasswordConfirm &&
                form.newPassword !== form.newPasswordConfirm && (
                  <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                    비밀번호가 일치하지 않습니다
                  </p>
                )}

              {!errors.newPasswordConfirm &&
                form.newPasswordConfirm &&
                form.newPassword &&
                form.newPassword === form.newPasswordConfirm && (
                  <p style={{ fontSize: 12, color: 'var(--color-success)' }}>
                    비밀번호가 일치합니다
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
              onClick={handleResetPassword}
              disabled={loading}
              className="btn btn--primary btn--full"
              style={{
                padding: 15,
                opacity: loading ? 0.65 : 1,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '재설정 중...' : '비밀번호 재설정'}
            </button>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: 28 }}>
            <div style={{ fontSize: 54 }}>✅</div>

            <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>
              비밀번호가 재설정되었습니다
            </h2>

            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.6 }}>
              새 비밀번호로 다시 로그인해 주세요.
              <br />
              잠시 후 로그인 화면으로 이동합니다.
            </p>

            <Link
              to="/login"
              className="btn btn--primary btn--full"
              style={{ marginTop: 20 }}
            >
              로그인하러 가기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}