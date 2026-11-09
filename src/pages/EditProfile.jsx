import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, USER_ROLES } from '@/context/AuthContext'
import BackButton from '../components/common/BackButton'
import { studentAPI } from '@/api/student'
import { profileAPI } from '@/api/profile'
import { authAPI } from '@/api/auth'

export default function EditProfile() {
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()

  const makeDefaultChild = () => ({
    id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    studentId: null,
    name: '',
    grade: '',
    academyCodeInput: '',
    academies: [],
    isNew: true,
  })

  const normalizeGrade = (grade) => {
    if (!grade) return ''
    const str = grade.trim().replace(/\s/g, '')

    if (
        str === '미취학' ||
        str === '미취학아동' ||
        str === '유치원' ||
        str === '유치원생' ||
        str === '어린이집'
    ) {
      return '미취학'
    }

    const numMatch = str.match(/\d+/)
    const num = numMatch ? numMatch[0] : ''

    if (str.includes('초')) return `초${num}`
    if (str.includes('중')) return `중${num}`
    if (str.includes('고')) return `고${num}`

    return str
  }

  const isValidGrade = (grade) => {
    if (!grade || !grade.trim()) return false
    const normalized = normalizeGrade(grade)
    const pattern = /^(미취학|초[1-6]|중[1-3]|고[1-3])$/
    return pattern.test(normalized)
  }

  const makeDefaultAcademy = () => ({
    id: `academy-${Date.now()}`,
    academyName: '',
    academyAddress: '',
    businessNumber: '',
    academyCode: '발급 예정',
  })

  const normalizeAcademies = (userInfo) => {
    if (Array.isArray(userInfo?.academies) && userInfo.academies.length > 0) {
      return userInfo.academies.map((academy, index) => ({
        id: academy.id ?? academy.academyId ?? `academy-${index}`,
        academyName: academy.academyName ?? academy.name ?? '',
        academyAddress: academy.academyAddress ?? academy.address ?? '',
        businessNumber: academy.businessNumber ?? '',
        academyCode: academy.academyCode ?? academy.code ?? '발급 예정',
      }))
    }

    if (userInfo?.role === USER_ROLES.ACADEMY) {
      return [
        {
          id: userInfo?.id ?? 'academy-001',
          academyName: userInfo?.academyName ?? '',
          academyAddress: userInfo?.academyAddress ?? '',
          businessNumber: userInfo?.businessNumber ?? '',
          academyCode: userInfo?.academyCode ?? '발급 예정',
        },
      ]
    }

    return [makeDefaultAcademy()]
  }

  const [form, setForm] = useState({
    name: user?.name ?? '',
    nickname: user?.nickname ?? '',
    email: user?.email ?? '',
    phone: user?.phoneNumber ?? user?.phone ?? '',
    children: [],
    academyName: user?.academyName ?? '',
    academyAddress: user?.academyAddress ?? '',
    academies: normalizeAcademies(user),
  })

  // 내 원래 기존 정보 저장 (내 정보와 일치 여부 비교용)
  const [initialEmail, setInitialEmail] = useState('')
  const [initialNickname, setInitialNickname] = useState('')
  const [initialPhone, setInitialPhone] = useState('')

  const [isEmailVerified, setIsEmailVerified] = useState(true)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    profileAPI
        .getMyProfile()
        .then((res) => {
          const userData = res?.data ?? res ?? {}
          const fetchedEmail = userData.email ?? user?.email ?? ''
          const fetchedNickname = userData.nickname ?? userData.nickName ?? user?.nickname ?? ''
          const fetchedPhone = (userData.phoneNumber ?? userData.phone ?? user?.phoneNumber ?? user?.phone ?? '').replace(/\D/g, '')

          setForm((prev) => ({
            ...prev,
            name: userData.name ?? prev.name,
            nickname: fetchedNickname,
            email: fetchedEmail,
            phone: fetchedPhone,
          }))

          // 기존 본인 정보 저장
          setInitialEmail(fetchedEmail)
          setInitialNickname(fetchedNickname)
          setInitialPhone(fetchedPhone)
        })
        .catch((err) => console.error('내 정보 로드 실패:', err))

    if (user?.role === USER_ROLES.PARENT) {
      studentAPI
          .getMyChildren()
          .then((res) => {
            const list = Array.isArray(res) ? res : res?.data ?? []
            if (list.length > 0) {
              setForm((prev) => ({
                ...prev,
                children: list.map((child, index) => {
                  const realDbId = child.studentId ?? child.id ?? `db-${index}`
                  return {
                    id: realDbId,
                    studentId: child.studentId ?? child.id,
                    name: child.name ?? '',
                    grade: child.grade ?? '',
                    academyCodeInput: child.academyCode ?? '',
                    academies: child.academyName
                        ? [{ id: child.academyId ?? `aca-${index}`, name: child.academyName, code: child.academyCode }]
                        : [],
                    isNew: false,
                  }
                }),
              }))
            } else {
              setForm((prev) => ({ ...prev, children: [] }))
            }
          })
          .catch((err) => {
            console.warn('자녀 정보 로드 실패 (토큰 만료 또는 자녀 없음):', err)
            setForm((prev) => ({ ...prev, children: [] }))
          })
    }
  }, [])

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '', submit: '' }))

    if (key === 'email') {
      if (value.trim() !== initialEmail.trim()) {
        setIsEmailVerified(false)
        setEmailSent(false)
      } else {
        setIsEmailVerified(true)
      }
    }
  }

  const updateChild = (childId, key, value) => {
    setForm((prev) => ({
      ...prev,
      children: prev.children.map((child) =>
          child.id === childId ? { ...child, [key]: value } : child
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
      children: [...prev.children, makeDefaultChild()],
    }))

    setErrors((prev) => ({ ...prev, children: '' }))
  }

  const removeChild = async (childId) => {
    const targetChild = form.children.find((child) => child.id === childId)
    if (!targetChild) return

    if (!window.confirm(`'${targetChild.name || '자녀'}' 정보를 정말 삭제하시겠습니까?`)) {
      return
    }

    const targetStudentId = targetChild.studentId ?? childId

    if (!targetChild.isNew && targetStudentId && !isNaN(Number(targetStudentId))) {
      try {
        await studentAPI.deleteChild(Number(targetStudentId))
        alert('자녀 정보가 삭제되었습니다.')
      } catch (err) {
        console.error('자녀 DB 삭제 실패:', err)
        alert('자녀 삭제에 실패했습니다.')
        return
      }
    }

    setForm((prev) => ({
      ...prev,
      children: prev.children.filter((child) => child.id !== childId),
    }))

    setErrors((prev) => ({ ...prev, children: '' }))
  }

  const addAcademyToChild = (childId) => {
    const targetChild = form.children.find((child) => child.id === childId)
    const academyCode = targetChild?.academyCodeInput?.trim()

    if (!academyCode) {
      setErrors((prev) => ({
        ...prev,
        [`${childId}-academyCode`]: '학원 코드를 입력해 주세요',
      }))
      return
    }

    const alreadyConnected = targetChild?.academies?.some(
        (academy) => academy.code.toLowerCase() === academyCode.toLowerCase()
    )

    if (alreadyConnected) {
      setErrors((prev) => ({
        ...prev,
        [`${childId}-academyCode`]: '이미 추가된 학원 코드입니다',
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      children: prev.children.map((child) =>
          child.id === childId
              ? {
                ...child,
                academyCodeInput: '',
                academies: [
                  ...child.academies,
                  { id: `academy-${Date.now()}`, code: academyCode, name: '학원명 확인 예정' },
                ],
              }
              : child
      ),
    }))

    setErrors((prev) => ({ ...prev, [`${childId}-academyCode`]: '' }))
  }

  const removeAcademyFromChild = (childId, academyId) => {
    setForm((prev) => ({
      ...prev,
      children: prev.children.map((child) =>
          child.id === childId
              ? {
                ...child,
                academies: child.academies.filter((academy) => academy.id !== academyId),
              }
              : child
      ),
    }))
  }

  // [인증 요청] 버튼 클릭 시
  const handleSendEmailVerification = async () => {
    const email = form.email.trim()

    if (!email || !email.includes('@')) {
      setErrors((prev) => ({ ...prev, email: '올바른 이메일 주소를 입력해 주세요.' }))
      return
    }

    // 💡 내가 기존에 사용하던 이메일과 같으면 바로 인증 성공 처리
    if (email === initialEmail.trim()) {
      setIsEmailVerified(true)
      alert('현재 사용 중인 본인 이메일입니다.')
      return
    }

    setEmailSending(true)
    setErrors((prev) => ({ ...prev, email: '' }))

    try {
      if (profileAPI.checkDuplicate) {
        const checkRes = await profileAPI.checkDuplicate('email', email)
        const isDup = checkRes?.duplicate ?? checkRes?.isDuplicate ?? checkRes?.data?.duplicate

        if (isDup) {
          setErrors((prev) => ({ ...prev, email: '이미 사용 중인 이메일입니다.' }))
          setEmailSending(false)
          return
        }
      }

      if (authAPI?.sendVerificationEmail) {
        await authAPI.sendVerificationEmail(email)
      }

      setEmailSent(true)
      alert('인증 메일이 발송되었습니다. 수신함에서 인증 링크를 클릭해 주세요.')
    } catch (err) {
      console.error('인증 메일 발송 실패:', err)
      const msg = err?.response?.data?.message || err?.message || '인증 메일 발송에 실패했습니다.'
      setErrors((prev) => ({ ...prev, email: msg }))
    } finally {
      setEmailSending(false)
    }
  }

  // [인증 완료 확인] 버튼 클릭 시
  const handleCheckEmailStatus = async () => {
    try {
      if (authAPI?.checkEmailStatus) {
        const res = await authAPI.checkEmailStatus(form.email.trim())
        if (res?.verified || res?.data?.verified) {
          setIsEmailVerified(true)
          alert('이메일 인증이 성공적으로 완료되었습니다!')
          setErrors((prev) => ({ ...prev, email: '' }))
        } else {
          alert('아직 이메일 인증이 완료되지 않았습니다. 메일함의 인증 링크를 확인해 주세요.')
        }
      }
    } catch (err) {
      alert('인증 상태 확인 중 오류가 발생했습니다.')
    }
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = '이름을 입력해 주세요'
    if (!form.nickname.trim()) nextErrors.nickname = '닉네임을 입력해 주세요'
    if (!form.email.includes('@')) nextErrors.email = '올바른 이메일을 입력해 주세요'

    if (form.email.trim() !== initialEmail.trim() && !isEmailVerified) {
      nextErrors.email = '이메일 변경을 위해 인증이 필요합니다.'
    }

    if (form.phone.replace(/\D/g, '').length < 10) nextErrors.phone = '올바른 전화번호를 입력해 주세요'

    if (user?.role === USER_ROLES.PARENT) {
      if (form.children && form.children.length > 0) {
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
    }

    if (user?.role === USER_ROLES.ACADEMY) {
      const academyList = form.academies ?? []
      if (academyList.length < 1) nextErrors.academies = '관리 학원은 최소 1개 이상 필요합니다'

      academyList.forEach((academy) => {
        if (!academy.academyName.trim()) nextErrors[`${academy.id}-academyName`] = '학원명을 입력해 주세요'
        if (!academy.academyAddress.trim()) nextErrors[`${academy.id}-academyAddress`] = '학원 주소를 입력해 주세요'

        const businessNumber = academy.businessNumber.replace(/\D/g, '')
        if (!businessNumber) {
          nextErrors[`${academy.id}-businessNumber`] = '사업자번호를 입력해 주세요'
        } else if (businessNumber.length !== 10) {
          nextErrors[`${academy.id}-businessNumber`] = '사업자번호 10자리를 입력해 주세요'
        }
      })
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
      const formattedPhone = form.phone.replace(/\D/g, '')
      const updated = {
        name: form.name.trim(),
        nickname: form.nickname.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        phoneNumber: formattedPhone,
      }

      // 💡 내 기존 정보와 다를 때만 중복 검사 실행 (자신의 정보 중복 오인 방지!)
      if (profileAPI.checkDuplicate) {
        // 닉네임이 기존 내 닉네임과 다를 때만 체크
        if (updated.nickname !== initialNickname) {
          const nickCheck = await profileAPI.checkDuplicate('nickname', updated.nickname)
          const isDup = nickCheck?.duplicate ?? nickCheck?.isDuplicate ?? nickCheck?.data?.duplicate
          if (isDup) {
            setErrors((prev) => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다.' }))
            setLoading(false)
            return
          }
        }

        // 전화번호가 기존 내 번호와 다를 때만 체크
        if (formattedPhone !== initialPhone) {
          const phoneCheck = await profileAPI.checkDuplicate('phoneNumber', formattedPhone)
          const isDup = phoneCheck?.duplicate ?? phoneCheck?.isDuplicate ?? phoneCheck?.data?.duplicate
          if (isDup) {
            setErrors((prev) => ({ ...prev, phone: '이미 등록된 휴대폰 번호입니다.' }))
            setLoading(false)
            return
          }
        }
      }

      if (profileAPI.updateMyProfile) {
        await profileAPI.updateMyProfile({
          name: updated.name,
          nickname: updated.nickname,
          email: updated.email,
          phoneNumber: updated.phoneNumber,
        })
      }

      if (user?.role === USER_ROLES.PARENT) {
        if (form.children.length > 0) {
          const childPromises = form.children.map((child) => {
            const formattedGrade = normalizeGrade(child.grade)
            const code = child.academyCodeInput || child.academies[0]?.code || ''

            if (child.isNew) {
              return studentAPI.addChild({
                name: child.name.trim(),
                grade: formattedGrade,
                academies: code ? [{ code }] : [],
              })
            } else if (studentAPI.updateChild) {
              return studentAPI.updateChild(child.studentId, {
                name: child.name.trim(),
                grade: formattedGrade,
              })
            }
            return Promise.resolve()
          })

          await Promise.all(childPromises)
        }

        const freshRes = await studentAPI.getMyChildren()
        updated.children = Array.isArray(freshRes) ? freshRes : freshRes?.data ?? []
      }

      if (user?.role === USER_ROLES.ACADEMY) {
        const nextAcademies = (form.academies ?? []).map((academy) => ({
          id: academy.id,
          academyName: academy.academyName.trim(),
          academyAddress: academy.academyAddress.trim(),
          businessNumber: academy.businessNumber.replace(/\D/g, ''),
          academyCode: academy.academyCode,
        }))

        updated.academies = nextAcademies
        updated.academyName = nextAcademies[0]?.academyName ?? ''
        updated.academyAddress = nextAcademies[0]?.academyAddress ?? ''
        updated.businessNumber = nextAcademies[0]?.businessNumber ?? ''
        updated.academyCode = nextAcademies[0]?.academyCode ?? '발급 예정'
      }

      await updateUser(updated)
      alert('프로필 및 자녀 정보가 성공적으로 저장되었습니다.')
      navigate('/profile')
    } catch (err) {
      console.error('프로필 저장 실패:', err)
      const errorMsg = err?.response?.data?.message || err?.message || String(err)
      const formattedPhone = form.phone.replace(/\D/g, '')

      if (errorMsg.includes('Duplicate entry')) {
        // 기존 내 닉네임/전화번호가 아닐 때에만 에러 출력
        if (errorMsg.includes(`'${form.nickname.trim()}'`) && form.nickname.trim() !== initialNickname) {
          setErrors((prev) => ({ ...prev, nickname: '이미 사용 중인 닉네임입니다.' }))
        } else if (errorMsg.includes(`'${formattedPhone}'`) && formattedPhone !== initialPhone) {
          setErrors((prev) => ({ ...prev, phone: '이미 등록된 휴대폰 번호입니다.' }))
        } else if (errorMsg.includes(`'${form.email.trim()}'`) && form.email.trim() !== initialEmail) {
          setErrors((prev) => ({ ...prev, email: '이미 사용 중인 이메일입니다.' }))
        } else {
          setErrors({ submit: '프로필 변경을 저장하는 중 오류가 발생했습니다.' })
        }
      } else {
        setErrors({ submit: errorMsg || '프로필 저장에 실패했습니다.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
      <div style={{ minHeight: '100vh', paddingBottom: 120 }}>
        <section style={{ padding: '16px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
          <BackButton label="뒤로가기" style={{ color: 'var(--color-primary)' }} />
        </section>

        <section className="section">
          <div className="section__header">
            <h1 className="section__title" style={{ fontSize: 22 }}>프로필 수정</h1>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Field label="닉네임" error={errors.nickname}>
              <input className="input-field" value={form.nickname} onChange={(e) => update('nickname', e.target.value)} placeholder="닉네임을 입력해 주세요" />
            </Field>

            <Field label="이름" error={errors.name}>
              <input className="input-field" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="이름을 입력해 주세요" />
            </Field>

            {/* 💡 이메일 입력 및 상시 [인증 요청] 버튼 */}
            <Field label="이메일" error={errors.email}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                    className="input-field"
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    placeholder="example@email.com"
                />
                <button
                    type="button"
                    onClick={handleSendEmailVerification}
                    disabled={emailSending}
                    style={{
                      padding: '0 12px',
                      borderRadius: 10,
                      background: 'var(--color-primary)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      border: 'none',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                >
                  {emailSending ? '발송 중...' : '인증 요청'}
                </button>
              </div>

              {emailSent && !isEmailVerified && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F0F7FF', padding: '8px 12px', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--color-primary)' }}>
                  📩 인증 메일이 발송되었습니다.
                </span>
                    <button
                        type="button"
                        onClick={handleCheckEmailStatus}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--color-primary)',
                          color: 'var(--color-primary)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                    >
                      인증 완료 확인
                    </button>
                  </div>
              )}

              {isEmailVerified && form.email.trim() !== initialEmail.trim() && (
                  <p style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>
                    ✓ 이메일 인증이 완료되었습니다.
                  </p>
              )}
            </Field>

            <Field label="전화번호" error={errors.phone}>
              <input className="input-field" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="010-0000-0000" />
            </Field>

            {user?.role === USER_ROLES.PARENT && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, borderRadius: 14, background: 'var(--color-primary-light)', border: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>자녀 정보</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
                        자녀가 없으실 경우 등록하지 않고 저장하실 수 있습니다.
                      </p>
                    </div>

                    <button type="button" onClick={addChild} style={{ minWidth: 72, height: 40, padding: '0 12px', borderRadius: 12, background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                      + 추가
                    </button>
                  </div>

                  {errors.children && (
                      <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{errors.children}</p>
                  )}

                  {form.children.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', background: 'var(--color-surface)', borderRadius: 12, border: '1px dashed var(--color-border)' }}>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>등록된 자녀 정보가 없습니다.</p>
                      </div>
                  ) : (
                      form.children.map((child, index) => (
                          <div key={child.id ? `child-${child.id}-${index}` : `child-temp-${index}`} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 14, borderRadius: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                              <p style={{ fontSize: 13, fontWeight: 800 }}>자녀 {index + 1}</p>

                              <button type="button" onClick={() => removeChild(child.id)} style={{ padding: '7px 10px', borderRadius: 8, background: '#FFE9E9', color: 'var(--color-danger)', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                                삭제
                              </button>
                            </div>

                            <Field label="자녀 이름" error={errors[`${child.id}-name`]}>
                              <input className="input-field" value={child.name} onChange={(e) => updateChild(child.id, 'name', e.target.value)} placeholder="자녀 이름" />
                            </Field>

                            <Field label="자녀 학년" error={errors[`${child.id}-grade`]}>
                              <input className="input-field" value={child.grade} onChange={(e) => updateChild(child.id, 'grade', e.target.value)} placeholder="예: 미취학 또는 초6" />
                            </Field>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, borderRadius: 12, background: 'var(--color-primary-light)', border: '1px solid var(--color-border)' }}>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>연결된 학원</p>
                                <p style={{ marginTop: 3, fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                  학원에서 받은 코드를 입력해 자녀와 학원을 연결할 수 있습니다.
                                </p>
                              </div>

                              {child.academies.length > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {child.academies.map((academy, acaIndex) => (
                                        <div key={academy.id ? `aca-${academy.id}-${acaIndex}` : `aca-code-${academy.code}-${acaIndex}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 12px', borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                                          <div>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{academy.name}</p>
                                            <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-muted)' }}>코드 {academy.code}</p>
                                          </div>

                                          <button type="button" onClick={() => removeAcademyFromChild(child.id, academy.id)} style={{ padding: '6px 9px', borderRadius: 8, background: '#FFE9E9', color: 'var(--color-danger)', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', border: 'none', cursor: 'pointer' }}>
                                            해제
                                          </button>
                                        </div>
                                    ))}
                                  </div>
                              ) : (
                                  <div style={{ padding: '12px', borderRadius: 10, background: 'var(--color-surface)', border: '1px dashed var(--color-border)', textAlign: 'center' }}>
                                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>아직 연결된 학원이 없습니다.</p>
                                  </div>
                              )}

                              <div style={{ display: 'flex', gap: 8 }}>
                                <input className="input-field" value={child.academyCodeInput} onChange={(e) => updateChild(child.id, 'academyCodeInput', e.target.value)} placeholder="학원 코드 입력" />

                                <button type="button" onClick={() => addAcademyToChild(child.id)} style={{ width: 72, flexShrink: 0, borderRadius: 12, background: 'var(--color-primary)', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                                  추가
                                </button>
                              </div>

                              {errors[`${child.id}-academyCode`] && (
                                  <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{errors[`${child.id}-academyCode`]}</p>
                              )}
                            </div>
                          </div>
                      ))
                  )}
                </div>
            )}

            {errors.submit && (
                <div style={{ background: '#FFE9E9', border: '1px solid #FFBCBC', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 13, color: 'var(--color-danger)', fontWeight: 600 }}>{errors.submit}</p>
                </div>
            )}

            <button onClick={handleSubmit} disabled={loading} className="btn btn--primary btn--full" style={{ padding: 15, opacity: loading ? 0.65 : 1 }}>
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
        {error && <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>{error}</p>}
      </div>
  )
}