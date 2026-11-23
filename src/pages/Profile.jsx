import { useEffect, useState } from 'react'
import { useAuth, USER_ROLES } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { studentAPI } from '@/api'
import { apiCall } from '@/api/client'
import { resolveProfileImageUrl, DEFAULT_PROFILE_IMAGE } from '@/utils/profileImage'

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

function AcademyInviteCard() {
    const [code, setCode] = useState('')
    const [message, setMessage] = useState('')

    useEffect(() => {
        const controller = new AbortController()
        apiCall('/api/academies/me/invite-code', { method: 'POST', signal: controller.signal })
            .then(data => {
                if (!controller.signal.aborted) setCode(data.inviteCode)
            })
            .catch(() => {
                if (!controller.signal.aborted) setMessage('학원 코드를 불러오지 못했습니다.')
            })
        return () => controller.abort()
    }, [])

    async function copyCode() {
        try {
            await navigator.clipboard.writeText(code)
            setMessage('학원 코드를 복사했습니다.')
        } catch {
            setMessage('코드를 선택해 직접 복사해 주세요.')
        }
    }

    return (
        <section aria-labelledby="profile-academy-code"
            style={{ padding: '0 16px', marginTop: -44, marginBottom: 8, position: 'relative', zIndex: 10 }}>
            <div className="card" style={{ padding: 16, display: 'grid', gap: 8 }}>
                <h2 id="profile-academy-code" style={{ fontSize: 15 }}>학원 코드</h2>
                {code ? (
                    <>
                        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            학부모가 자녀를 학원에 연결할 때 사용하는 코드예요.
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                            <code style={{ minWidth: 0, flex: '1 1 180px', overflowWrap: 'anywhere', userSelect: 'all' }}>
                                {code}
                            </code>
                            <button type="button" className="btn btn--secondary" onClick={copyCode}>코드 복사</button>
                        </div>
                    </>
                ) : !message && <p role="status">학원 코드를 불러오는 중입니다.</p>}
                {message && <p role="status" style={{ fontSize: 12 }}>{message}</p>}
            </div>
        </section>
    )
}

export default function Profile() {
    const { user, logout, updateUser } = useAuth()
    const navigate = useNavigate()
    const [fetchedChildren, setFetchedChildren] = useState(null)

    // 💡 자녀 데이터 동기화
    useEffect(() => {
        if (user?.role !== USER_ROLES.PARENT) return

        studentAPI
            .getMyChildren()
            .then((res) => {
                const list = Array.isArray(res) ? res : res?.data ?? []
                setFetchedChildren(list)
            })
            .catch((err) => {
                console.error('자녀 목록 불러오기 실패:', err)
                setFetchedChildren(user?.children ?? [])
            })
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

    const displayName = user?.nickname ?? user?.name ?? '사용자'
    const avatarSrc = resolveProfileImageUrl(user?.profileImageUrl ?? user?.avatar)
    const displayInitial = displayName[0] ?? '?'
    const [imgLoadError, setImgLoadError] = useState(false)

    useEffect(() => {
        setImgLoadError(false)
    }, [user?.profileImageUrl, user?.avatar])

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
                            background: '#E2E8F0',
                            border: '2.5px solid rgba(255,255,255,0.4)',
                            overflow: 'hidden',
                            flexShrink: 0,
                        }}
                    >
                        <img
                            src={avatarSrc}
                            alt={displayName}
                            onError={(e) => {
                                e.currentTarget.onerror = null
                                e.currentTarget.src = DEFAULT_PROFILE_IMAGE
                            }}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    </div>

                    <div>
                        {/* 💡 닉네임 최우선 표시 (없을 경우 이름) */}
                        <h2 style={{ fontSize: 20, fontWeight: 800 }}>{displayName}</h2>
                        <p style={{ fontSize: 13, opacity: 0.75, marginTop: 3 }}>
                            {ROLE_LABEL[user?.role] ?? '사용자'} · {user?.username ?? '계정'}
                        </p>

                        {user?.email && (
                            <p style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{user.email}</p>
                        )}
                    </div>
                </div>
            </div>

            {user?.role === USER_ROLES.ACADEMY && <AcademyInviteCard key={user.id ?? user.userId} />}

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
                                        key={child.studentId ?? child.id ?? `child-${index}`}
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
                                        borderBottom: i < group.items.length - 1 ? '1px solid var(--color-border)' : 'none',
                                        cursor: 'pointer',
                                        fontFamily: 'inherit',
                                        textAlign: 'left',
                                        transition: 'background 0.1s',
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
                                            color: item.danger ? 'var(--color-danger)' : 'var(--color-text-primary)',
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
                    }}
                >
                    로그아웃
                </button>
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
        items: [{ icon: '🔔', label: '푸시 알림', color: '#1A56DB', to: '/notification-settings' }],
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