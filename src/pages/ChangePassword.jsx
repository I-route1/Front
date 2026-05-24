import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { changePassword, reissueToken } = useAuth()

  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setErrors({})

    try {
      await changePassword(form)
      await reissueToken()
      alert('비밀번호가 변경되었습니다.')
      navigate('/profile')
    } catch (err) {
      setErrors({ submit: err.message || '비밀번호 변경에 실패했습니다' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <section style={{ padding: '16px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}
        >
          ← 뒤로가기
        </button>
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
          </div>

          {errors.submit && (
            <div style={{ background: '#FFE9E9', border: '1px solid #FFBCBC', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 13, color: 'var(--color-danger)', fontWeight: 600 }}>
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
    </div>
  )
}