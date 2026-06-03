import { useEffect, useState } from 'react'
import { useAuth, USER_ROLES } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { studentAPI } from '@/api'

const ROLE_LABEL = {
  [USER_ROLES.PARENT]: '학부모',
  [USER_ROLES.ACADEMY]: '학원',
  [USER_ROLES.ADMIN]: '관리자',
  [USER_ROLES.TEACHER]: '학원 강사',
  [USER_ROLES.DRIVER]: '기사',
  [USER_ROLES.STUDENT]: '학생',
}

function formatBusinessNumber(value) {
  const raw = String(value ?? '').replace(/\D/g, '').slice(0, 10)

  if (raw.length <= 3) return raw
  if (raw.length <= 5) return `${raw.slice(0, 3)}-${raw.slice(3)}`
  return `${raw.slice(0, 3)}-${raw.slice(3, 5)}-${raw.slice(5)}`
}

function normalizeAcademyList(user) {
  if (Array.isArray(user?.academies) && user.academies.length > 0) {
    return user.academies.map((academy, index) => ({
      id: academy.id ?? academy.academyId ?? `academy-${index}`,
      academyName: academy.academyName ?? academy.name ?? '학원 정보 없음',
      academyAddress: academy.academyAddress ?? academy.address ?? '학원 주소가 등록되지 않았습니다.',
      businessNumber: academy.businessNumber ?? '',
      academyCode: academy.academyCode ?? academy.code ?? user?.academyCode ?? '발급 예정',
    }))
  }

  if (user?.role === USER_ROLES.ACADEMY) {
    return [
      {
        id: user?.id ?? 'academy-001',
        academyName: user?.academyName ?? '학원 정보 없음',
        academyAddress: user?.academyAddress ?? '학원 주소가 등록되지 않았습니다.',
        businessNumber: user?.businessNumber ?? '',
        academyCode: user?.academyCode ?? '발급 예정',
      },
    ]
  }

  return []
}

export default function Profile() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [fetchedChildren, setFetchedChildren] = useState(null)

  useEffect(() => {
    if (user?.role !== USER_ROLES.PARENT) return
    studentAPI.getMyChildren()
      .then((data) => setFetchedChildren(data ?? []))
      .catch(() => setFetchedChildren(null))
  }, [user?.role])

  const children = fetchedChildren ?? user?.children ?? []

  const [managedAcademies, setManagedAcademies] = useState(() => normalizeAcademyList(user))
  const [isAcademyFormOpen, setIsAcademyFormOpen] = useState(false)
  const [academyForm, setAcademyForm] = useState({
    academyName: '',
    academyAddress: '',
    businessNumber: '',
  })
  const [academyFormError, setAcademyFormError] = useState('')

  const handleLogout = async () => {
  await logout()
  navigate('/login', { replace: true })
}

  const handleMenuClick = (item) => {
    if (item.to) {
      navigate(item.to)
      return
    }

    alert(`${item.label} 기능은 추후 제공 예정입니다.`)
  }

  const updateAcademyForm = (key, value) => {
  setAcademyForm((prev) => ({
    ...prev,
    [key]: key === 'businessNumber' ? formatBusinessNumber(value) : value,
  }))

  setAcademyFormError('')
}

const handleCopyAcademyCode = async (academyCode) => {
  if (!academyCode || academyCode === '발급 예정') {
    alert('아직 발급된 학원 고유코드가 없습니다.')
    return
  }

  try {
    await navigator.clipboard.writeText(academyCode)
    alert('학원 고유코드가 복사되었습니다.')
  } catch {
    alert('복사에 실패했습니다. 코드를 직접 선택해서 복사해 주세요.')
  }
}

const handleAddAcademy = async () => {
  const academyName = academyForm.academyName.trim()
  const academyAddress = academyForm.academyAddress.trim()
  const businessNumber = academyForm.businessNumber.replace(/\D/g, '')

  if (!academyName) {
    setAcademyFormError('학원명을 입력해 주세요.')
    return
  }

  if (!academyAddress) {
    setAcademyFormError('학원 주소를 입력해 주세요.')
    return
  }

  if (businessNumber.length !== 10) {
    setAcademyFormError('사업자번호 10자리를 입력해 주세요.')
    return
  }

  const newAcademy = {
    id: `academy-${Date.now()}`,
    academyName,
    academyAddress,
    businessNumber,
    academyCode: '발급 예정',
  }

  const nextAcademies = [...managedAcademies, newAcademy]

  setManagedAcademies(nextAcademies)
  setAcademyForm({
    academyName: '',
    academyAddress: '',
    businessNumber: '',
  })
  setAcademyFormError('')
  setIsAcademyFormOpen(false)

  try {
    await updateUser({
      academies: nextAcademies,
      academyName: nextAcademies[0]?.academyName,
      academyAddress: nextAcademies[0]?.academyAddress,
      academyCode: nextAcademies[0]?.academyCode,
    })
  } catch {
    alert('학원 정보 임시 저장에 실패했습니다.')
  }
}

  return (
    <div>
      {/* 프로필 헤더 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)',
          padding: '32px 20px 80px',
          color: 'white',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '2.5px solid rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              user?.name?.[0] ?? '?'
            )}
          </div>

          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>{user?.name ?? '사용자'}</h2>
            <p style={{ fontSize: 13, opacity: 0.75, marginTop: 3 }}>
              {ROLE_LABEL[user?.role] ?? '사용자'} · {user?.username ?? '계정'}
            </p>

            {user?.email && (
              <p style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                {user.email}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 자녀 정보 카드 */}
      {user?.role === USER_ROLES.PARENT && (
        <div
          style={{
            padding: '0 16px',
            marginTop: -44,
            marginBottom: 8,
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div className="card" style={{ padding: '16px' }}>
            <div style={{ marginBottom: 12 }}>
  <p
    style={{
      fontSize: 12,
      color: 'var(--color-text-muted)',
      fontWeight: 600,
    }}
  >
    🧒 자녀 정보
  </p>
  <p
    style={{
      fontSize: 11,
      color: 'var(--color-text-muted)',
      marginTop: 3,
    }}
  >
    등록된 자녀 {children.length}명
  </p>
</div>

            {children.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {children.map((child, index) => (
                  <div
                    key={child.id ?? `child-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px',
                      borderRadius: 12,
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: 'var(--color-primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      👦
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
  <p style={{ fontSize: 14, fontWeight: 700 }}>
    {child.name || `자녀 ${index + 1}`}
  </p>

  <p
    style={{
      fontSize: 12,
      color: 'var(--color-text-muted)',
      marginTop: 2,
    }}
  >
    {child.grade || (child.gradeStudentId ? `학생 ID: ${child.gradeStudentId}` : '학년 정보 없음')}
  </p>

  {Array.isArray(child.academies) && child.academies.length > 0 ? (
    <div
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginTop: 7,
      }}
    >
      {child.academies.slice(0, 2).map((academy) => (
        <span
          key={academy.id ?? academy.code ?? academy.name}
          style={{
            maxWidth: 112,
            padding: '4px 7px',
            borderRadius: 999,
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            fontSize: 10,
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {academy.name ?? academy.academyName ?? academy.code ?? '학원'}
        </span>
      ))}

      {child.academies.length > 2 && (
        <span
          style={{
            padding: '4px 7px',
            borderRadius: 999,
            background: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
            fontSize: 10,
            fontWeight: 700,
            border: '1px solid var(--color-border)',
          }}
        >
          +{child.academies.length - 2}
        </span>
      )}
    </div>
  ) : (
    <p
      style={{
        fontSize: 11,
        color: 'var(--color-text-muted)',
        marginTop: 6,
      }}
    >
      연결된 학원 없음
    </p>
  )}
</div>

                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        background: 'var(--color-primary-light)',
                        padding: '5px 8px',
                        borderRadius: 999,
                        flexShrink: 0,
                      }}
                    >
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '18px 12px',
                  borderRadius: 12,
                  background: 'var(--color-surface-2)',
                  border: '1px dashed var(--color-border)',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  등록된 자녀 정보가 없습니다.
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    marginTop: 4,
                  }}
                >
                  프로필 수정에서 자녀 정보를 등록해 주세요.
                </p>
              </div>
            )}

            <button
              onClick={() => navigate('/profile/edit')}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '10px',
                background: 'var(--color-surface)',
                border: '1.5px dashed var(--color-border)',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              + 자녀 추가 / 수정
            </button>
          </div>
        </div>
      )}

      {/* 학원 정보 카드 */}
{user?.role === USER_ROLES.ACADEMY && (
  <div
    style={{
      padding: '0 16px',
      marginTop: -44,
      marginBottom: 8,
      position: 'relative',
      zIndex: 10,
    }}
  >
    <div className="card" style={{ padding: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              fontWeight: 600,
            }}
          >
            🏫 관리 학원
          </p>
          <p
            style={{
              fontSize: 11,
              color: 'var(--color-text-muted)',
              marginTop: 3,
            }}
          >
            등록된 학원 {managedAcademies.length}개
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAcademyFormOpen((prev) => !prev)}
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            background: 'var(--color-primary)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {isAcademyFormOpen ? '닫기' : '+ 학원 추가'}
        </button>
      </div>

      {managedAcademies.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {managedAcademies.map((academy, index) => (
            <div
              key={academy.id ?? `academy-${index}`}
              style={{
                padding: 12,
                borderRadius: 12,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {academy.academyName}
                  </p>

                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {academy.academyAddress}
                  </p>

                  {academy.businessNumber && (
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        marginTop: 3,
                      }}
                    >
                      사업자번호 {formatBusinessNumber(academy.businessNumber)}
                    </p>
                  )}
                </div>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: 'var(--color-primary)',
                    background: 'var(--color-primary-light)',
                    padding: '5px 8px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {index + 1}
                </span>
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 10,
                  background: 'var(--color-primary-light)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--color-primary)',
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                >
                  학원 고유코드
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <code
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text-primary)',
                      fontSize: 13,
                      fontWeight: 800,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {academy.academyCode ?? '발급 예정'}
                  </code>

                  <button
                    type="button"
                    onClick={() => handleCopyAcademyCode(academy.academyCode)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'var(--color-primary)',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    복사
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: '18px 12px',
            borderRadius: 12,
            background: 'var(--color-surface-2)',
            border: '1px dashed var(--color-border)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--color-text-primary)',
            }}
          >
            등록된 학원이 없습니다.
          </p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--color-text-muted)',
              marginTop: 4,
            }}
          >
            학원 추가 버튼을 눌러 관리할 학원을 등록해 주세요.
          </p>
        </div>
      )}

      {isAcademyFormOpen && (
        <div
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 14,
            background: 'var(--color-primary-light)',
            border: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: 'var(--color-primary)',
              }}
            >
              학원 추가
            </p>
            <p
              style={{
                marginTop: 3,
                fontSize: 11,
                color: 'var(--color-text-muted)',
                lineHeight: 1.5,
              }}
            >
              현재는 UI 확인용 임시 추가입니다. 실제 학원 등록과 고유코드 발급은 추후 백엔드 API 연동 후 처리됩니다.
            </p>
          </div>

          <div className="input-group">
            <label className="input-label">학원명</label>
            <input
              className="input-field"
              value={academyForm.academyName}
              onChange={(event) => updateAcademyForm('academyName', event.target.value)}
              placeholder="학원명을 입력해 주세요"
            />
          </div>

          <div className="input-group">
            <label className="input-label">학원 주소</label>
            <input
              className="input-field"
              value={academyForm.academyAddress}
              onChange={(event) => updateAcademyForm('academyAddress', event.target.value)}
              placeholder="학원 주소를 입력해 주세요"
            />
          </div>

          <div className="input-group">
            <label className="input-label">사업자번호</label>
            <input
              className="input-field"
              value={academyForm.businessNumber}
              onChange={(event) => updateAcademyForm('businessNumber', event.target.value)}
              placeholder="000-00-00000"
            />
          </div>

          {academyFormError && (
            <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
              {academyFormError}
            </p>
          )}

          <button
            type="button"
            onClick={handleAddAcademy}
            className="btn btn--primary btn--full"
            style={{ padding: 12 }}
          >
            학원 추가
          </button>
        </div>
      )}

      <button
        onClick={() => navigate('/profile/edit')}
        className="btn btn--secondary btn--full"
        style={{ marginTop: 12 }}
      >
        학원 정보 수정
      </button>
    </div>
  </div>
)}

            {/* 관리자 정보 카드 */}
      {user?.role === USER_ROLES.ADMIN && (
        <div
          style={{
            padding: '0 16px',
            marginTop: -44,
            marginBottom: 8,
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div className="card" style={{ padding: '16px' }}>
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                marginBottom: 10,
                fontWeight: 600,
              }}
            >
              🛠 관리자 정보
            </p>
            <p style={{ fontSize: 15, fontWeight: 800 }}>
              {user?.name ?? '관리자'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {user?.adminLevel ?? '서비스 관리자'}
            </p>
            
          </div>
        </div>
      )}

      {/* 설정 메뉴 */}
      <div style={{ marginTop: 8 }}>
        {SETTINGS.map((group) => (
          <div key={group.title}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-text-muted)',
                letterSpacing: '0.08em',
                padding: '12px 20px 6px',
                textTransform: 'uppercase',
              }}
            >
              {group.title}
            </p>
            <div
              style={{
                background: 'var(--color-surface)',
                borderTop: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {group.items.map((item, i) => (
                <button
                  key={item.label}
                  onClick={() => handleMenuClick(item)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom:
                      i < group.items.length - 1 ? '1px solid var(--color-border)' : 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onPointerDown={(e) => {
                    e.currentTarget.style.background = 'var(--color-surface-2)'
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                  onPointerLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      background: item.color + '15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 17,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: 500,
                      color: item.danger
                        ? 'var(--color-danger)'
                        : 'var(--color-text-primary)',
                    }}
                  >
                    {item.label}
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-text-muted)"
                    strokeWidth="2"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 로그아웃 */}
      <div style={{ padding: '16px 20px 32px' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '14px',
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-danger)',
            borderRadius: 14,
            color: 'var(--color-danger)',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
        >
          로그아웃
        </button>
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            marginTop: 12,
          }}
        >
          아이루트 v0.1.0
        </p>
      </div>
    </div>
  )
}

const SETTINGS = [
  {
    title: '구독 / 결제',
    items: [
      { icon: '💳', label: '요금제 구독', color: '#1A56DB', to: '/payment' },
      { icon: '📜', label: '결제 내역', color: '#9B59B6', to: '/payment/history' },
    ],
  },
  {
  title: '알림 설정',
  items: [
    { icon: '🔔', label: '푸시 알림', color: '#1A56DB', to: '/notification-settings' },
  ],
},
  {
    title: '계정',
    items: [
      { icon: '👤', label: '프로필 수정', color: '#9B59B6', to: '/profile/edit' },
      { icon: '🔒', label: '비밀번호 변경', color: '#3498DB', to: '/profile/password' },
      { icon: '🚪', label: '계정 탈퇴', color: '#FF3B3B', to: '/profile/delete', danger: true },
    ],
  },
  {
  title: '앱',
  items: [
    { icon: '❓', label: '도움말', color: '#95A5A6', to: '/help' },
    { icon: '📋', label: '이용약관', color: '#7F8C8D', to: '/terms' },
  ],
},
]