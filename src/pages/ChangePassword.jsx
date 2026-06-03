import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import BackButton from '../components/common/BackButton'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { changePassword } = useAuth()

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const errorTextStyle = {
    color: '#ef4444',
    fontSize: '13px',
    marginTop: '6px',
    marginBottom: 0,
    fontWeight: 500,
  }

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '', submit: '' }))
  }

  const validate = () => {
    const e = {}

    if (!form.currentPassword.trim()) {
      e.currentPassword = '현재 비밀번호를 입력해 주세요.'
    }

    if (!form.newPassword.trim()) {
      e.newPassword = '새 비밀번호를 입력해 주세요.'
    } else if (
        !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/.test(
            form.newPassword
        )
    ) {
      e.newPassword = '새 비밀번호는 영문, 숫자, 특수문자를 포함해 8자 이상이어야 합니다.'
    }

    if (!form.newPasswordConfirm.trim()) {
      e.newPasswordConfirm = '새 비밀번호 확인을 입력해 주세요.'
    } else if (form.newPassword !== form.newPasswordConfirm) {
      e.newPasswordConfirm = '새 비밀번호가 일치하지 않습니다.'
    }

    if (form.currentPassword && form.currentPassword === form.newPassword) {
      e.newPassword = '현재 비밀번호와 다른 비밀번호를 입력해 주세요.'
    }

    return e
  }

  const handleSubmit = async () => {
    const e = validate()

    if (Object.keys(e).length > 0) {
      setErrors(e)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        newPasswordConfirm: form.newPasswordConfirm,
      })

      setSuccess(true)
    } catch (err) {
      if (err.message?.includes('현재 비밀번호')) {
        setErrors({
          currentPassword: err.message,
        })
        return
      }

      setErrors({
        submit: err.message || '비밀번호 변경에 실패했습니다.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
      <div>
        <section
            style={{
              padding: '16px 20px',
              background: 'var(--color-surface)',
              borderBottom: '1px solid var(--color-border)',
            }}
        >
          <BackButton
              label="뒤로가기"
              style={{ color: 'var(--color-primary)' }}
          />
        </section>

        <section className="section">
          <div className="section__header">
            <h1 className="section__title" style={{ fontSize: 22 }}>
              비밀번호 변경
            </h1>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
                style={{
                  background: 'var(--color-primary-light)',
                  borderRadius: 12,
                  padding: 14,
                }}
            >
              <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700 }}>
                안전한 계정 보호를 위해 비밀번호를 주기적으로 변경해 주세요.
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                새 비밀번호는 영문, 숫자, 특수문자를 포함하여 8자 이상이어야 합니다.
              </p>
            </div>

            <div className="input-group">
              <label className="input-label">현재 비밀번호</label>
              <input
                  className="input-field"
                  type="password"
                  value={form.currentPassword}
                  onChange={(e) => update('currentPassword', e.target.value)}
                  placeholder="현재 비밀번호를 입력해 주세요"
              />
              {errors.currentPassword && (
                  <p style={errorTextStyle}>{errors.currentPassword}</p>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">새 비밀번호</label>
              <input
                  className="input-field"
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => update('newPassword', e.target.value)}
                  placeholder="영문·숫자·특수문자 포함 8자 이상"
              />
              {errors.newPassword && (
                  <p style={errorTextStyle}>{errors.newPassword}</p>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">새 비밀번호 확인</label>
              <input
                  className="input-field"
                  type="password"
                  value={form.newPasswordConfirm}
                  onChange={(e) => update('newPasswordConfirm', e.target.value)}
                  placeholder="새 비밀번호를 다시 입력해 주세요"
              />
              {errors.newPasswordConfirm && (
                  <p style={errorTextStyle}>{errors.newPasswordConfirm}</p>
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
                  <p
                      style={{
                        color: '#ef4444',
                        fontSize: 13,
                        fontWeight: 500,
                        margin: 0,
                      }}
                  >
                    {errors.submit}
                  </p>
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn--primary btn--full"
                style={{ padding: 15, opacity: loading ? 0.65 : 1 }}
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </section>

        {success && (
            <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: 20,
                }}
            >
              <div
                  style={{
                    background: 'var(--color-surface)',
                    borderRadius: 18,
                    padding: '28px 24px',
                    width: '100%',
                    maxWidth: 360,
                    textAlign: 'center',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
                  }}
              >
                <div style={{ fontSize: 46, marginBottom: 12 }}>✅</div>

                <h3
                    style={{
                      margin: 0,
                      marginBottom: 8,
                      fontSize: 20,
                      fontWeight: 800,
                      color: 'var(--color-text)',
                    }}
                >
                  비밀번호 변경 완료
                </h3>

                <p
                    style={{
                      margin: 0,
                      marginBottom: 22,
                      fontSize: 14,
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.5,
                    }}
                >
                  비밀번호가 성공적으로 변경되었습니다.
                </p>

                <button
                    className="btn btn--primary btn--full"
                    style={{ padding: 14 }}
                    onClick={() => {
                      setSuccess(false)
                      navigate('/profile')
                    }}
                >
                  확인
                </button>
              </div>
            </div>
        )}
      </div>
  )
}