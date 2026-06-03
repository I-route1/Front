import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, USER_ROLES } from '@/context/AuthContext'
import BackButton from '../components/common/BackButton'

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  const makeDefaultChild = () => ({
    id: `child-${Date.now()}`,
    name: '',
    grade: '',
  })

  const normalizeGrade = (grade) => {
  const trimmedGrade = grade.trim().replace(/\s/g, '')

  if (
    trimmedGrade === '미취학' ||
    trimmedGrade === '미취학아동' ||
    trimmedGrade === '유치원' ||
    trimmedGrade === '유치원생' ||
    trimmedGrade === '어린이집' ||
    trimmedGrade === '어린이집생'
  ) {
    return '미취학'
  }

  return trimmedGrade
    .replace(/초등학교/g, '초')
    .replace(/초등/g, '초')
    .replace(/중학교/g, '중')
    .replace(/중등/g, '중')
    .replace(/고등학교/g, '고')
    .replace(/고등/g, '고')
    .replace(/학년/g, '')
}

const isValidGrade = (grade) => {
  const normalizedGrade = normalizeGrade(grade)

  const preschoolPattern = /^미취학$/
  const elementaryPattern = /^초[1-6]$/
  const middleSchoolPattern = /^중[1-3]$/
  const highSchoolPattern = /^고[1-3]$/

  return (
    preschoolPattern.test(normalizedGrade) ||
    elementaryPattern.test(normalizedGrade) ||
    middleSchoolPattern.test(normalizedGrade) ||
    highSchoolPattern.test(normalizedGrade)
  )
}

  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    children:
      user?.children && user.children.length > 0
        ? user.children.map((child, index) => ({
            id: child.id ?? `child-${Date.now()}-${index}`,
            name: child.name ?? '',
            grade: child.grade ?? '',
          }))
        : [makeDefaultChild()],
    academyName: user?.academyName ?? '',
    academyAddress: user?.academyAddress ?? '',
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const updateChild = (childId, key, value) => {
    setForm((prev) => ({
      ...prev,
      children: prev.children.map((child) =>
        child.id === childId
          ? {
              ...child,
              [key]: value,
            }
          : child
      ),
    }))

    setErrors((prev) => ({
      ...prev,
      children: '',
      [`${childId}-${key}`]: '',
    }))
  }

  const addChild = () => {
    setForm((prev) => ({
      ...prev,
      children: [
        ...prev.children,
        {
          id: `child-${Date.now()}-${prev.children.length}`,
          name: '',
          grade: '',
        },
      ],
    }))

    setErrors((prev) => ({
      ...prev,
      children: '',
    }))
  }

  const removeChild = (childId) => {
    if (form.children.length <= 1) {
      setErrors((prev) => ({
        ...prev,
        children: '자녀 정보는 최소 1명 이상 필요합니다',
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      children: prev.children.filter((child) => child.id !== childId),
    }))

    setErrors((prev) => ({
      ...prev,
      children: '',
    }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.name.trim()) {
      nextErrors.name = '이름을 입력해 주세요'
    }

    if (!form.email.includes('@')) {
      nextErrors.email = '올바른 이메일을 입력해 주세요'
    }

    if (form.phone.replace(/\D/g, '').length < 10) {
      nextErrors.phone = '올바른 전화번호를 입력해 주세요'
    }

    if (user?.role === USER_ROLES.PARENT) {
      if (!form.children || form.children.length < 1) {
        nextErrors.children = '자녀 정보는 최소 1명 이상 필요합니다'
      }

      form.children.forEach((child) => {
        if (!child.name.trim()) {
          nextErrors[`${child.id}-name`] = '자녀 이름을 입력해 주세요'
        }

        if (!child.grade.trim()) {
  nextErrors[`${child.id}-grade`] = '자녀 학년을 입력해 주세요'
} else if (!isValidGrade(child.grade)) {
  nextErrors[`${child.id}-grade`] = '학년은 미취학, 초1~초6, 중1~중3, 고1~고3 형식으로 입력해 주세요'
}
      })
    }

    if (user?.role === USER_ROLES.ACADEMY) {
      if (!form.academyName.trim()) {
        nextErrors.academyName = '학원명을 입력해 주세요'
      }

      if (!form.academyAddress.trim()) {
        nextErrors.academyAddress = '학원 주소를 입력해 주세요'
      }
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
        updated.children = form.children.map((child) => ({
  id: child.id,
  name: child.name.trim(),
  grade: normalizeGrade(child.grade),
}))
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
  <div
    style={{
      minHeight: '100vh',
      paddingBottom: 120,
    }}
  >
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
              <div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  }}
>
                <div>
  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>
    자녀 정보
  </p>
  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
    학년은 미취학, 초1~초6, 중1~중3, 고1~고3 형식으로 입력해 주세요
  </p>
</div>

                <button
  type="button"
  onClick={addChild}
  style={{
    minWidth: 72,
    height: 40,
    padding: '0 12px',
    borderRadius: 12,
    background: 'var(--color-primary)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }}
>
  + 추가
</button>
              </div>

              {errors.children && (
                <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                  {errors.children}
                </p>
              )}

              {form.children.map((child, index) => (
                <div
                  key={child.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    padding: 14,
                    borderRadius: 12,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
  style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  }}
>
                    <p style={{ fontSize: 13, fontWeight: 800 }}>
                      자녀 {index + 1}
                    </p>

                    <button
                      type="button"
                      onClick={() => removeChild(child.id)}
                      style={{
                        padding: '7px 10px',
                        borderRadius: 8,
                        background: '#FFE9E9',
                        color: 'var(--color-danger)',
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      삭제
                    </button>
                  </div>

                  <Field label="자녀 이름" error={errors[`${child.id}-name`]}>
                    <input
                      className="input-field"
                      value={child.name}
                      onChange={(e) => updateChild(child.id, 'name', e.target.value)}
                      placeholder="자녀 이름"
                    />
                  </Field>

                  <Field label="자녀 학년" error={errors[`${child.id}-grade`]}>
                    <input
                      className="input-field"
                      value={child.grade}
                      onChange={(e) => updateChild(child.id, 'grade', e.target.value)}
                      placeholder="예: 미취학 또는 초6"
                    />
                  </Field>
                </div>
              ))}
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