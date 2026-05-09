import { useAuth, USER_ROLES } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'

const ROLE_LABEL = {
  [USER_ROLES.PARENT]:  '학부모',
  [USER_ROLES.DRIVER]:  '기사',
  [USER_ROLES.ACADEMY]: '학원 관리자',
  [USER_ROLES.STUDENT]: '학생',
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div>
      {/* 프로필 헤더 */}
      <div style={{
        background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)',
        padding: '32px 20px 80px',
        color: 'white',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: '2.5px solid rgba(255,255,255,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700,
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {user?.avatar
              ? <img src={user.avatar} alt={user.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
              : user?.name?.[0] ?? '?'
            }
          </div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>{user?.name ?? '사용자'}</h2>
            <p style={{ fontSize: 13, opacity: 0.75, marginTop: 3 }}>
              {ROLE_LABEL[user?.role] ?? '사용자'} · 카카오 로그인
            </p>
          </div>
        </div>
      </div>

      {/* 자녀 정보 카드 */}
      {user?.role === USER_ROLES.PARENT && (
        <div style={{ padding: '0 16px', marginTop: -44, marginBottom: 8, position: 'relative', zIndex: 10 }}>
          <div className="card" style={{ padding: '16px' }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10, fontWeight: 600 }}>
              🧒 자녀 정보
            </p>
            {(user?.children ?? []).map((child) => (
              <div key={child.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'var(--color-primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  👦
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{child.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{child.grade}</p>
                </div>
                <button style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  background: 'var(--color-primary-light)',
                  border: 'none',
                  borderRadius: 8,
                  color: 'var(--color-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}>
                  수정
                </button>
              </div>
            ))}
            <button style={{
              width: '100%',
              marginTop: 12,
              padding: '10px',
              background: 'var(--color-surface-2)',
              border: '1.5px dashed var(--color-border)',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              + 자녀 추가
            </button>
          </div>
        </div>
      )}

      {/* 설정 메뉴 */}
      <div style={{ marginTop: 8 }}>
        {SETTINGS.map((group) => (
          <div key={group.title}>
            <p style={{
              fontSize: 11, fontWeight: 700,
              color: 'var(--color-text-muted)',
              letterSpacing: '0.08em',
              padding: '12px 20px 6px',
              textTransform: 'uppercase',
            }}>
              {group.title}
            </p>
            <div style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
              {group.items.map((item, i) => (
                <button
                  key={item.label}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: i < group.items.length - 1 ? '1px solid var(--color-border)' : 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    transition: 'background 0.1s',
                  }}
                  onPointerDown={e => e.currentTarget.style.background = 'var(--color-surface-2)'}
                  onPointerUp={e => e.currentTarget.style.background = 'transparent'}
                  onPointerLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: item.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17, flexShrink: 0,
                  }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: item.danger ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                    {item.label}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
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
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 12 }}>
          아이루트 v0.1.0
        </p>
      </div>
    </div>
  )
}

const SETTINGS = [
  {
    title: '알림 설정',
    items: [
      { icon: '🔔', label: '푸시 알림',       color: '#1A56DB' },
      { icon: '📍', label: '위치 추적 설정',  color: '#00C49A' },
      { icon: '⚠️', label: '경고 구역 설정',  color: '#FF6B35' },
    ],
  },
  {
    title: '계정',
    items: [
      { icon: '👤', label: '프로필 수정',     color: '#9B59B6' },
      { icon: '🔒', label: '개인정보 보호',   color: '#3498DB' },
    ],
  },
  {
    title: '앱',
    items: [
      { icon: '❓', label: '도움말',         color: '#95A5A6' },
      { icon: '📋', label: '이용약관',       color: '#7F8C8D' },
    ],
  },
]
