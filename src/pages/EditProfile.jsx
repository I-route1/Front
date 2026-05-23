import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, USER_ROLES } from '@/context/AuthContext'

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    childName: user?.children?.[0]?.name ?? '',
    childGrade: user?.children?.[0]?.grade ?? '',
    academyName: user?.academyName ?? '',
    academyAddress: user?.academyAddress ?? '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = '이름을 입력해 주세요'
    if (!form.email.includes('@')) nextErrors.email = '올바른 이메일을 입력해 주세요'
    if (form.phone.replace(/\D/g, '').length < 10) nextErrors.phone = '올바른 전화번호를 입력해 주세요'

    if (user?.role === USER_ROLES.PARENT) {
      if (!form.childName.trim()) nextErrors.childName = '자녀 이름을 입력해 주세요'
      if (!form.childGrade.trim()) nextErrors.childGrade = '자녀 학년을 입력해 주세요'
    }

    if (user?.role === USER_ROLES.ACADEMY) {
      if (!form.academyName.trim()) nextErrors.academyName = '학원명을 입력해 주세요'
      if (!form.academyAddress.trim()) nextErrors.academyAddress = '학원 주소를 입력해 주세요'
    }

    return nextErrors
  }

  const handleSubmit = async () => {
    const nextErrors = validate()

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)

    try {
      const updated = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      }

      if (user?.role === USER_ROLES.PARENT) {
        updated.children = [
          {
            id: user?.children?.[0]?.id ?? `child-${Date.now()}`,
            name: form.childName.trim(),
            grade: form.childGrade.trim(),
          },
        ]
      }

      if (user?.role === USER_ROLES.ACADEMY) {
        updated.academyName = form.academyName.trim()
        updated.academyAddress = form.academyAddress.trim()
      }

      await updateUser(updated)
      alert('프로필이 수정되었습니다.')
      navigate('/profile')
    } catch (err) {
      setErrors({ submit: err.message || '프로필 수정에 실패했습니다' })
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
            프로필 수정
          </h1>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="이름" error={errors.name}>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="이름을 입력해 주세요"
            />
          </Field>

          <Field label="이메일" error={errors.email}>
            <input
              className="input-field"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="example@email.com"
            />
          </Field>

          <Field label="전화번호" error={errors.phone}>
            <input
              className="input-field"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="010-0000-0000"
            />
          </Field>

          {user?.role === USER_ROLES.PARENT && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                padding: 16,
                borderRadius: 14,
                background: 'var(--color-primary-light)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>
                자녀 정보
              </p>

              <Field label="자녀 이름" error={errors.childName}>
                <input
                  className="input-field"
                  value={form.childName}
                  onChange={(e) => update('childName', e.target.value)}
                  placeholder="자녀 이름"
                />
              </Field>

              <Field label="자녀 학년" error={errors.childGrade}>
                <input
                  className="input-field"
                  value={form.childGrade}
                  onChange={(e) => update('childGrade', e.target.value)}
                  placeholder="예: 초6"
                />
              </Field>
            </div>
          )}

          {user?.role === USER_ROLES.ACADEMY && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                padding: 16,
                borderRadius: 14,
                background: 'var(--color-primary-light)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>
                학원 정보
              </p>

              <Field label="학원명" error={errors.academyName}>
                <input
                  className="input-field"
                  value={form.academyName}
                  onChange={(e) => update('academyName', e.target.value)}
                  placeholder="학원명을 입력해 주세요"
                />
              </Field>

              <Field label="학원 주소" error={errors.academyAddress}>
                <input
                  className="input-field"
                  value={form.academyAddress}
                  onChange={(e) => update('academyAddress', e.target.value)}
                  placeholder="학원 주소를 입력해 주세요"
                />
              </Field>
            </div>
          )}

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
            {loading ? '저장 중...' : '저장하기'}
          </button>
        </div>
      </section>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      {children}
      {error && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</p>}
    </div>
  )
}