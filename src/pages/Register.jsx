import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '@/api'
const ROLES = [
  { value: 'parent', label: '학부모' },
  { value: 'academy', label: '학원' },
]

const PASSWORD_RULES = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/

const DUPLICATE_STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  VALID: 'valid',
  INVALID: 'invalid',
}

const EMAIL_AUTH_STATUS = {
  IDLE: 'idle',
  SENT: 'sent',
  VERIFIED: 'verified',
}

export default function Register() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    username: '',
    nickname: '',
    password: '',
    passwordConfirm: '',
    name: '',
    email: '',
    phone: '',
    role: 'parent',
    academyName: '',
    academyAddress: '',
    businessNumber: '',
  })

  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const [emailAuthStatus, setEmailAuthStatus] = useState(EMAIL_AUTH_STATUS.IDLE)
  const [emailAuthLoading, setEmailAuthLoading] = useState(false)

  const [duplicateStatus, setDuplicateStatus] = useState({
    username: DUPLICATE_STATUS.IDLE,
    nickname: DUPLICATE_STATUS.IDLE,
    email: DUPLICATE_STATUS.IDLE,
    phone: DUPLICATE_STATUS.IDLE,
  })

  const update = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    setErrors((prev) => ({ ...prev, [key]: '' }))

    if (key === 'username' || key === 'nickname' || key === 'phone') {
      setDuplicateStatus((prev) => ({
        ...prev,
        [key]: DUPLICATE_STATUS.IDLE,
      }))
    }

    if (key === 'email') {
      setDuplicateStatus((prev) => ({
        ...prev,
        email: DUPLICATE_STATUS.IDLE,
      }))
      setEmailAuthStatus(EMAIL_AUTH_STATUS.IDLE)
    }
  }

  const validateDuplicateTarget = (type) => {
    const nextErrors = {}

    if (type === 'username') {
      if (!form.username.trim()) nextErrors.username = '아이디를 입력해 주세요'
      else if (form.username.trim().length < 4) nextErrors.username = '아이디는 4자 이상이어야 합니다'
    }

    if (type === 'nickname') {
      if (!form.nickname.trim()) nextErrors.nickname = '닉네임을 입력해 주세요'
      else if (form.nickname.trim().length < 2) nextErrors.nickname = '닉네임은 2자 이상이어야 합니다'
    }

    if (type === 'email') {
      if (!form.email.includes('@')) nextErrors.email = '올바른 이메일을 입력해 주세요'
    }

    if (type === 'phone') {
      if (form.phone.replace(/\D/g, '').length < 10) nextErrors.phone = '올바른 전화번호를 입력해 주세요'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...nextErrors }))
      return false
    }

    return true
  }

  const handleDuplicateCheck = async (type) => {
  if (!validateDuplicateTarget(type)) return

  setDuplicateStatus((prev) => ({
    ...prev,
    [type]: DUPLICATE_STATUS.CHECKING,
  }))

  try {
    const value = form[type]?.trim?.() ?? ''

    if (type === 'username') {
      await new Promise((resolve) => setTimeout(resolve, 400))

      const isDuplicated =
        value.toLowerCase() === 'admin' ||
        value.toLowerCase() === 'test' ||
        value.toLowerCase() === 'blacklist'

      if (isDuplicated) {
        setDuplicateStatus((prev) => ({
          ...prev,
          [type]: DUPLICATE_STATUS.INVALID,
        }))

        setErrors((prev) => ({
          ...prev,
          username: '이미 사용 중인 아이디입니다',
        }))
        return
      }

      setDuplicateStatus((prev) => ({
        ...prev,
        username: DUPLICATE_STATUS.VALID,
      }))
      return
    }

    const apiValue =
      type === 'phone'
        ? form.phone.replace(/\D/g, '')
        : value

    const data = await authAPI.checkDuplicate(type, apiValue)

    if (!data?.isAvailable) {
      const label = getDuplicateLabel(type)

      setDuplicateStatus((prev) => ({
        ...prev,
        [type]: DUPLICATE_STATUS.INVALID,
      }))

      setErrors((prev) => ({
        ...prev,
        [type]: data?.message || `이미 사용 중인 ${label}입니다`,
      }))
      return
    }

    setDuplicateStatus((prev) => ({
      ...prev,
      [type]: DUPLICATE_STATUS.VALID,
    }))

    setErrors((prev) => ({
      ...prev,
      [type]: '',
    }))
  } catch (error) {
    setDuplicateStatus((prev) => ({
      ...prev,
      [type]: DUPLICATE_STATUS.INVALID,
    }))

    setErrors((prev) => ({
      ...prev,
      [type]: error.message || '중복 확인 중 오류가 발생했습니다',
    }))
  }
}

  const handleSendEmailAuth = async () => {
  if (!form.email.includes('@')) {
    setErrors((prev) => ({ ...prev, email: '올바른 이메일을 입력해 주세요' }))
    return
  }

  if (duplicateStatus.email !== DUPLICATE_STATUS.VALID) {
    setErrors((prev) => ({ ...prev, email: '이메일 중복 확인을 먼저 진행해 주세요' }))
    return
  }

  setEmailAuthLoading(true)

  try {
    if (emailAuthStatus === EMAIL_AUTH_STATUS.SENT) {
      await authAPI.resendEmailVerification(form.email.trim())
    } else {
      await authAPI.sendEmailVerification(form.email.trim())
    }

    setEmailAuthStatus(EMAIL_AUTH_STATUS.SENT)
    setErrors((prev) => ({ ...prev, email: '' }))
  } catch (error) {
    setErrors((prev) => ({
      ...prev,
      email: error.message || '인증 메일 발송에 실패했습니다',
    }))
  } finally {
    setEmailAuthLoading(false)
  }
}

  const handleVerifyEmail = async () => {
    setEmailAuthLoading(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setEmailAuthStatus(EMAIL_AUTH_STATUS.VERIFIED)
      setErrors((prev) => ({ ...prev, email: '' }))
    } finally {
      setEmailAuthLoading(false)
    }
  }

  const validate = () => {
    const e = {}

    if (!form.username.trim()) e.username = '아이디를 입력해 주세요'
    else if (form.username.trim().length < 4) e.username = '아이디는 4자 이상이어야 합니다'

    if (!form.nickname.trim()) e.nickname = '닉네임을 입력해 주세요'
    else if (form.nickname.trim().length < 2) e.nickname = '닉네임은 2자 이상이어야 합니다'

    if (!form.password) e.password = '비밀번호를 입력해 주세요'
    else if (!PASSWORD_RULES.test(form.password)) e.password = '영문·숫자·특수문자 포함 8자 이상'

    if (form.password !== form.passwordConfirm) e.passwordConfirm = '비밀번호가 일치하지 않습니다'

    if (!form.name.trim()) e.name = '이름을 입력해 주세요'

    if (!form.email.includes('@')) e.email = '올바른 이메일을 입력해 주세요'

    if (form.phone.replace(/\D/g, '').length < 10) e.phone = '올바른 전화번호를 입력해 주세요'

    if (duplicateStatus.username !== DUPLICATE_STATUS.VALID) {
      e.username = '아이디 중복 확인을 완료해 주세요'
    }

    if (duplicateStatus.nickname !== DUPLICATE_STATUS.VALID) {
      e.nickname = '닉네임 중복 확인을 완료해 주세요'
    }

    if (duplicateStatus.email !== DUPLICATE_STATUS.VALID) {
      e.email = '이메일 중복 확인을 완료해 주세요'
    }

    if (duplicateStatus.phone !== DUPLICATE_STATUS.VALID) {
      e.phone = '휴대폰 번호 중복 확인을 완료해 주세요'
    }

    if (emailAuthStatus !== EMAIL_AUTH_STATUS.VERIFIED) {
      e.email = '이메일 인증을 완료해 주세요'
    }

    if (!agreed) e.agree = '개인정보 수집 및 이용에 동의해 주세요'

    if (form.role === 'academy') {
      if (!form.academyName.trim()) e.academyName = '학원 이름을 입력해 주세요'
      if (!form.academyAddress.trim()) e.academyAddress = '학원 주소를 입력해 주세요'

      const businessNumber = form.businessNumber.replace(/\D/g, '')
      if (businessNumber.length !== 10) e.businessNumber = '사업자번호 10자리를 입력해 주세요'
    }

    return e
  }

  const checkBlacklistUser = async () => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const blockedKeywords = ['blacklist', 'blocked', '탈퇴회원']
    const targetText = `${form.username} ${form.email} ${form.phone} ${form.name}`.toLowerCase()

    return blockedKeywords.some((keyword) => targetText.includes(keyword))
  }

  const handleSubmit = async () => {
  const e = validate()
  if (Object.keys(e).length > 0) {
    setErrors(e)
    return
  }

  setLoading(true)

  try {
    const isBlacklisted = await checkBlacklistUser()

    if (isBlacklisted) {
      setErrors({ submit: '가입이 제한된 사용자입니다. 관리자에게 문의해 주세요.' })
      return
    }

    const commonPayload = {
      username: form.username.trim(),
      nickname: form.nickname.trim(),
      password: form.password,
      passwordConfirm: form.passwordConfirm,
      name: form.name.trim(),
      email: form.email.trim(),
      phoneNumber: form.phone.replace(/\D/g, ''),
    }

    if (form.role === 'parent') {
      await authAPI.registerParent({
        ...commonPayload,
        role: 'PARENT',
      })
    }

    if (form.role === 'academy') {
      await authAPI.registerAcademy({
        ...commonPayload,
        role: 'ACADEMY',
        academyName: form.academyName.trim(),
        academyAddress: form.academyAddress.trim(),
        businessNumber: form.businessNumber.replace(/\D/g, ''),
      })
    }

    try {
      await authAPI.sendWelcomeEmail(form.email.trim())
    } catch {
      console.warn('환영 이메일 발송에 실패했지만 회원가입은 완료되었습니다.')
    }

    setSuccess(true)
    setTimeout(() => navigate('/login'), 1800)
  } catch (error) {
    setErrors({
      submit: error.message || '회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    })
  } finally {
    setLoading(false)
  }
}

  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-bg)',
          gap: 16,
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 56 }}>🎉</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)' }}>
          회원가입이 완료되었습니다!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          가입 완료 안내 및 환영 이메일이 발송되었습니다.
          <br />
          로그인 화면으로 이동합니다...
        </p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '0 0 40px' }}>
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
            color: 'rgba(255,255,255,0.7)',
            fontSize: 24,
          }}
        >
          ←
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>회원가입</h1>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 6 }}>
          아이루트 서비스에 오신 것을 환영합니다
        </p>
      </div>

      <div
        style={{
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          maxWidth: 480,
          margin: '0 auto',
        }}
      >
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
            가입 유형
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {ROLES.map((role) => (
              <button
                key={role.value}
                onClick={() => update('role', role.value)}
                style={{
                  padding: '10px 4px',
                  borderRadius: 10,
                  border: `2px solid ${
                    form.role === role.value ? 'var(--color-primary)' : 'var(--color-border)'
                  }`,
                  background: form.role === role.value ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  color: form.role === role.value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="아이디" error={errors.username}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              placeholder="아이디 (4자 이상)"
              value={form.username}
              onChange={(event) => update('username', event.target.value)}
            />
            <CheckButton
              status={duplicateStatus.username}
              onClick={() => handleDuplicateCheck('username')}
            />
          </div>
          <StatusText status={duplicateStatus.username} label="아이디" />
        </Field>

        <Field label="닉네임" error={errors.nickname}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              placeholder="닉네임을 입력해 주세요"
              value={form.nickname}
              onChange={(event) => update('nickname', event.target.value)}
            />
            <CheckButton
              status={duplicateStatus.nickname}
              onClick={() => handleDuplicateCheck('nickname')}
            />
          </div>
          <StatusText status={duplicateStatus.nickname} label="닉네임" />
        </Field>

        <Field label="비밀번호" error={errors.password}>
          <input
            className="input-field"
            type="password"
            placeholder="영문·숫자·특수문자 포함 8자 이상"
            value={form.password}
            onChange={(event) => update('password', event.target.value)}
          />
        </Field>

        <Field label="비밀번호 확인" error={errors.passwordConfirm}>
  <input
    className="input-field"
    type="password"
    placeholder="비밀번호를 다시 입력해 주세요"
    value={form.passwordConfirm}
    onChange={(event) => update('passwordConfirm', event.target.value)}
    style={{
      borderColor:
        form.passwordConfirm && form.password !== form.passwordConfirm
          ? 'var(--color-danger)'
          : '',
    }}
  />

  {form.passwordConfirm && form.password !== form.passwordConfirm && (
    <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 2 }}>
      비밀번호가 일치하지 않습니다
    </p>
  )}

  {form.passwordConfirm && form.password === form.passwordConfirm && (
    <p style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 2 }}>
      비밀번호가 일치합니다
    </p>
  )}
</Field>

        <Field label="이름" error={errors.name}>
          <input
            className="input-field"
            placeholder="실명을 입력해 주세요"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
          />
        </Field>

        <Field label="이메일" error={errors.email}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              type="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
            />
            <CheckButton
              status={duplicateStatus.email}
              onClick={() => handleDuplicateCheck('email')}
            />
          </div>

          <StatusText status={duplicateStatus.email} label="이메일" />

          <div
            style={{
              display: 'flex',
              gap: 8,
              marginTop: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={handleSendEmailAuth}
              disabled={emailAuthLoading || duplicateStatus.email !== DUPLICATE_STATUS.VALID}
              style={{
                padding: '9px 12px',
                borderRadius: 10,
                background:
                  emailAuthStatus === EMAIL_AUTH_STATUS.VERIFIED
                    ? 'var(--color-success)'
                    : 'var(--color-primary)',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                opacity:
                  emailAuthLoading || duplicateStatus.email !== DUPLICATE_STATUS.VALID
                    ? 0.55
                    : 1,
                cursor:
                  emailAuthLoading || duplicateStatus.email !== DUPLICATE_STATUS.VALID
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {emailAuthStatus === EMAIL_AUTH_STATUS.IDLE && '인증 링크 발송'}
              {emailAuthStatus === EMAIL_AUTH_STATUS.SENT && '인증 메일 재발송'}
              {emailAuthStatus === EMAIL_AUTH_STATUS.VERIFIED && '인증 완료'}
            </button>

            {emailAuthStatus === EMAIL_AUTH_STATUS.SENT && (
              <button
                onClick={handleVerifyEmail}
                disabled={emailAuthLoading}
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                인증 완료 처리
              </button>
            )}
          </div>

          {emailAuthStatus === EMAIL_AUTH_STATUS.SENT && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
              이메일로 발송된 인증 링크를 확인해 주세요. 테스트에서는 ‘인증 완료 처리’를 누르면 인증됩니다.
            </p>
          )}

          {emailAuthStatus === EMAIL_AUTH_STATUS.VERIFIED && (
            <p style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 6 }}>
              이메일 인증이 완료되었습니다.
            </p>
          )}
        </Field>

        <Field label="전화번호" error={errors.phone}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-field"
              type="tel"
              placeholder="010-0000-0000"
              value={form.phone}
              onChange={(event) => update('phone', formatPhone(event.target.value))}
            />
            <CheckButton
              status={duplicateStatus.phone}
              onClick={() => handleDuplicateCheck('phone')}
            />
          </div>
          <StatusText status={duplicateStatus.phone} label="휴대폰 번호" />
        </Field>

        {form.role === 'academy' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              background: 'var(--color-primary-light)',
              border: '1.5px solid var(--color-primary)',
              borderRadius: 14,
              padding: '16px 16px 20px',
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: -4 }}>
              🏫 학원 정보
            </p>

            <Field label="학원 이름" error={errors.academyName}>
              <input
                className="input-field"
                placeholder="학원 이름을 입력해 주세요"
                value={form.academyName}
                onChange={(event) => update('academyName', event.target.value)}
              />
            </Field>

            <Field label="학원 주소" error={errors.academyAddress}>
              <input
                className="input-field"
                placeholder="도로명 주소를 입력해 주세요"
                value={form.academyAddress}
                onChange={(event) => update('academyAddress', event.target.value)}
              />
            </Field>

            <Field label="사업자 번호" error={errors.businessNumber}>
              <input
                className="input-field"
                placeholder="000-00-00000"
                value={form.businessNumber}
                onChange={(event) => update('businessNumber', formatBusinessNumber(event.target.value))}
              />
            </Field>
          </div>
        )}

        <div
          style={{
            background: 'var(--color-surface)',
            border: `1.5px solid ${errors.agree ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
            onClick={() => {
              setAgreed((prev) => !prev)
              setErrors((prev) => ({ ...prev, agree: '' }))
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                flexShrink: 0,
                marginTop: 1,
                border: `2px solid ${agreed ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: agreed ? 'var(--color-primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              {agreed && <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>✓</span>}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                개인정보 수집 및 이용 동의 <span style={{ color: 'var(--color-danger)' }}>(필수)</span>
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.5 }}>
                아이루트는 서비스 제공을 위해 아이디, 닉네임, 이름, 이메일, 전화번호를 수집하며 회원 탈퇴 시 소프트 삭제 처리됩니다.
              </p>
            </div>
          </div>
          {errors.agree && (
            <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 8 }}>
              {errors.agree}
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
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 14,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? 'var(--color-text-muted)' : 'var(--color-primary)',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'inherit',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(26,86,219,0.35)',
            transition: 'all 0.15s',
          }}
        >
          {loading ? '처리 중...' : '회원가입'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, error, children }) {
  return (
    <div className="input-group">
      <label className="input-label">{label}</label>
      {children}
      {error && (
        <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 2 }}>
          {error}
        </p>
      )}
    </div>
  )
}

function CheckButton({ status, onClick }) {
  const isChecking = status === DUPLICATE_STATUS.CHECKING
  const isValid = status === DUPLICATE_STATUS.VALID

  return (
    <button
      onClick={onClick}
      disabled={isChecking}
      style={{
        width: 86,
        flexShrink: 0,
        borderRadius: 12,
        background: isValid ? 'var(--color-success)' : 'var(--color-primary)',
        color: 'white',
        fontSize: 12,
        fontWeight: 700,
        opacity: isChecking ? 0.6 : 1,
        cursor: isChecking ? 'not-allowed' : 'pointer',
      }}
    >
      {isChecking ? '확인 중' : isValid ? '확인 완료' : '중복 확인'}
    </button>
  )
}

function StatusText({ status, label }) {
  if (status === DUPLICATE_STATUS.IDLE) return null

  if (status === DUPLICATE_STATUS.CHECKING) {
    return (
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
        {label} 중복 여부를 확인하고 있습니다.
      </p>
    )
  }

  if (status === DUPLICATE_STATUS.VALID) {
    return (
      <p style={{ fontSize: 12, color: 'var(--color-success)', marginTop: 4 }}>
        사용 가능한 {label}입니다.
      </p>
    )
  }

  return null
}

function getDuplicateLabel(type) {
  if (type === 'username') return '아이디'
  if (type === 'nickname') return '닉네임'
  if (type === 'email') return '이메일'
  if (type === 'phone') return '휴대폰 번호'
  return '값'
}

function formatPhone(value) {
  const raw = value.replace(/\D/g, '').slice(0, 11)

  if (raw.length <= 3) return raw
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`
}

function formatBusinessNumber(value) {
  const raw = value.replace(/\D/g, '').slice(0, 10)

  if (raw.length <= 3) return raw
  if (raw.length <= 5) return `${raw.slice(0, 3)}-${raw.slice(3)}`
  return `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`
}