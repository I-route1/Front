import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, USER_ROLES } from '@/context/AuthContext'
import DriverBoardingList from '@/pages/DriverBoardingList'
import TodayReviewWidget from '@/components/home/TodayReviewWidget'
import NoChildScreen from '@/components/common/NoChildScreen'
import { notificationsAPI } from '@/api'

export default function Home() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [notiLoading, setNotiLoading] = useState(true)

  const childName = user?.children?.[0]?.name ?? '자녀'
  const studentId = user?.children?.[0]?.id ?? user?.id

  // 알림 조회
  useEffect(() => {
    if (!user?.id) return
    setNotiLoading(true)
    notificationsAPI.getAll(String(user.id))
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.notifications || data?.content || [])
        setNotifications(list.slice(0, 3)) // 최근 3개만
      })
      .catch(() => setNotifications([]))
      .finally(() => setNotiLoading(false))
  }, [user?.id])

  const handleDriverContact = () => {
    const driverName = '김기사'
    const driverPhone = '010-1111-2222'
    const phoneNumber = driverPhone.replace(/\D/g, '')
    const shouldCall = window.confirm(
      `담당 기사님\n\n${driverName}\n${driverPhone}\n\n전화 앱으로 연결할까요?`
    )
    if (shouldCall) window.location.href = `tel:${phoneNumber}`
  }

  if (role === USER_ROLES.DRIVER)  return <DriverHome user={user} />
  if (role === USER_ROLES.ACADEMY) return <AcademyHome user={user} />
  if (role === USER_ROLES.ADMIN)   return <AdminHome user={user} navigate={navigate} />

  // 학부모인데 자녀 없으면 빈 화면
  const isParent = role === USER_ROLES.PARENT
  const hasNoChildren = isParent && (!user?.children || user.children.length === 0)
  if (hasNoChildren) {
    return <NoChildScreen message={'자녀를 등록하면 홈 화면에서\n위치, 학습 리포트를 확인할 수 있어요'} />
  }

  return (
    <div>
      {/* 인사 배너 */}
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)', padding: '24px 20px 28px', color: 'white' }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>안녕하세요 👋</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
          {user?.name ?? '사용자'}님
        </h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>오늘도 안전한 하루 되세요</p>

        {/* 현재 상태 카드 */}
        <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00C49A', boxShadow: '0 0 0 4px rgba(0,196,154,0.3)', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>{childName} · 이동 중</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>실시간 위치 확인 가능</p>
          </div>
          <button
            onClick={() => navigate('/map')}
            style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '6px 12px', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            위치 보기
          </button>
        </div>
      </div>

      {/* 빠른 실행 */}
      <section className="section">
        <div className="section__header">
          <h3 className="section__title">빠른 실행</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {QUICK_ACTIONS.map(({ icon, label, color, to }) => (
            <button
              key={label}
              onClick={() => {
                if (label === '기사\n연락') { handleDriverContact(); return }
                if (to) navigate(to)
              }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'inherit', transition: 'transform 0.1s' }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onPointerUp={e => e.currentTarget.style.transform = ''}
              onPointerLeave={e => e.currentTarget.style.transform = ''}
            >
              <span style={{ width: 44, height: 44, borderRadius: 12, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* 오늘의 복습 */}
      <TodayReviewWidget studentId={studentId} />

      <div className="divider" />

      {/* 최근 알림 — 실제 API 연동 */}
      <section className="section">
        <div className="section__header">
          <h3 className="section__title">최근 알림</h3>
          <button
            type="button"
            className="section__link"
            onClick={() => navigate('/notifications')}
            style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            더 보기
          </button>
        </div>

        {notiLoading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
            알림 불러오는 중...
          </div>
        ) : notifications.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map((n, i) => {
              const title   = n.title   || n.subject  || '알림'
              const message = n.message || n.content  || n.body || ''
              const isRead  = n.read    || n.isRead   || false
              const type    = (n.type   || n.notificationType || '').toUpperCase()
              const emoji   =
                type.includes('REVIEW')     ? '📖' :
                type.includes('RISK')       ? '⚠️' :
                type.includes('GRADE')      ? '📊' :
                type.includes('FEEDBACK')   ? '💬' :
                type.includes('ATTENDANCE') ? '🚌' : '🔔'

              return (
                <div
                  key={n.id || i}
                  className="card"
                  onClick={() => navigate('/notifications')}
                  style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', opacity: isRead ? 0.7 : 1, cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: isRead ? 500 : 700, color: 'var(--color-text-primary)' }}>{title}</p>
                    {message && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {message}
                      </p>
                    )}
                  </div>
                  {!isRead && (
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>새로운 알림이 없어요</p>
          </div>
        )}
      </section>
    </div>
  )
}

function AcademyHome({ user }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 96, background: 'var(--color-bg)' }}>
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)', padding: '24px 20px 28px', color: 'white' }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>학원 관리자 홈</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>{user?.academyName ?? user?.name ?? '학원'}님</h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>오늘의 학원 운영 현황을 확인해 보세요</p>
        <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.18)' }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>등록 학원</p>
          <p style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{user?.academyAddress ?? '학원 주소가 등록되지 않았습니다.'}</p>
        </div>
      </div>
      <section className="section">
        <div className="section__header"><h3 className="section__title">오늘의 관리 현황</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ACADEMY_STATUS.map(item => (
            <div key={item.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{item.desc}</p>
              </div>
              <span className="badge badge--blue">{item.count}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AdminHome({ user, navigate }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', paddingBottom: 96, background: 'var(--color-bg)' }}>
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)', padding: '24px 20px 28px', color: 'white' }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>관리자 홈</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>{user?.name ?? '관리자'}님</h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>서비스 관리 현황을 확인해 보세요</p>
      </div>
      <section className="section">
        <div className="section__header"><h3 className="section__title">관리자 빠른 실행</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 10 }}>
          <button onClick={() => navigate('/board')} className="card" style={{ padding: '18px 12px', textAlign: 'center', cursor: 'pointer', fontFamily: 'inherit' }}>
            <p style={{ fontSize: 24 }}>📋</p>
            <p style={{ fontSize: 13, fontWeight: 700, marginTop: 8 }}>게시판 관리</p>
          </button>
        </div>
      </section>
    </div>
  )
}

function DriverHome({ user }) {
  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 96, background: '#F3F4F6' }}>
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)', padding: '24px 20px 28px', color: 'white' }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>기사님 홈</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>{user?.name ?? '기사님'}님</h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>오늘의 운행 및 탑승 명단을 확인해 보세요</p>
        <div style={{ marginTop: 20, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.18)' }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>배정 차량</p>
          <p style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{user?.vehicleNumber ?? '차량 정보가 등록되지 않았습니다.'}</p>
          <p style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{user?.academyName ?? '배정 학원 정보가 등록되지 않았습니다.'}</p>
        </div>
      </div>
      <DriverBoardingList />
    </div>
  )
}

const QUICK_ACTIONS = [
  { icon: '📍', label: '위치\n확인',  color: '#1A56DB', to: '/map' },
  { icon: '📞', label: '기사\n연락',  color: '#00C49A', to: null },
  { icon: '📋', label: '공지사항',    color: '#FF6B35', to: '/notice' },
  { icon: '📊', label: '학습\n리포트', color: '#9B59B6', to: '/learning' },
]

const ACADEMY_STATUS = [
  { id: 1, icon: '👨‍👩‍👧', title: '등록 학부모',  desc: '오늘 기준 등록된 학부모 수', color: '#1A56DB', count: '24명' },
  { id: 2, icon: '🚐',    title: '운행 요청',    desc: '오늘 예정된 운행 요청',       color: '#00C49A', count: '8건' },
  { id: 3, icon: '📢',    title: '공지사항',     desc: '최근 등록된 학원 공지',       color: '#FF6B35', count: '3건' },
]