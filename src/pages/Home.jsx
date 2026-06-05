import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, USER_ROLES } from '@/context/AuthContext'
import TodayReviewWidget from '@/components/home/TodayReviewWidget'
import NoChildScreen from '@/components/common/NoChildScreen'
import { notificationsAPI } from '@/api'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'
const POLL_INTERVAL = 10000

function getAuthHeader() {
  const saved = sessionStorage.getItem('i-route-user')
  const user = saved ? JSON.parse(saved) : null
  const token = user?.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function getMyBusAttendance() {
  const res = await fetch(`${BASE_URL}/api/gps/drivers/my-bus/attendance`, {
    headers: getAuthHeader(),
  })
  if (!res.ok) throw new Error('탑승 명단 조회 실패')
  return res.json()
}

async function postAttendance({ studentId, eventType }) {
  const res = await fetch(`${BASE_URL}/api/gps/attendance/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ studentId, eventType }),
  })
  if (!res.ok) throw new Error('처리 실패')
  return res.json()
}

const STATUS_LABEL = { WAITING: '대기 중', BOARDED: '승차 완료', EXITED: '하차 완료' }
const STATUS_STYLE = {
  WAITING: { background: '#fef3c7', color: '#92400e' },
  BOARDED: { background: '#dcfce7', color: '#166534' },
  EXITED:  { background: '#f1f5f9', color: '#475569' },
}

export default function Home() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [notiLoading, setNotiLoading] = useState(true)

  const childName = user?.children?.[0]?.name ?? '자녀'
  const studentId = user?.children?.[0]?.id ?? user?.id

  useEffect(() => {
    if (!user?.id) return
    setNotiLoading(true)
    notificationsAPI.getAll(String(user.id))
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.notifications || data?.content || [])
        setNotifications(list.slice(0, 3))
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

  const isParent = role === USER_ROLES.PARENT
  const hasNoChildren = isParent && (!user?.children || user.children.length === 0)
  if (hasNoChildren) {
    return <NoChildScreen message={'자녀를 등록하면 홈 화면에서\n위치, 학습 리포트를 확인할 수 있어요'} />
  }

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)', padding: '24px 20px 28px', color: 'white' }}>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>안녕하세요 👋</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
          {user?.name ?? '사용자'}님
        </h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>오늘도 안전한 하루 되세요</p>
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

      <TodayReviewWidget studentId={studentId} />

      <div className="divider" />

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

function DriverHome({ user }) {
  const [passengers, setPassengers] = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [actionLoading, setActionLoading] = useState({})
  const [toastMsg, setToastMsg]     = useState(null)
  const [filter, setFilter]         = useState('ALL')
  const [lastUpdated, setLastUpdated] = useState(null)

  const buildPassengers = (data) => {
    const latest = {}
    ;[...(Array.isArray(data) ? data : [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .forEach(e => {
        latest[e.studentId] = {
          studentId: e.studentId,
          name: e.studentName ?? e.name,
          stopName: e.stopName ?? '',
          profileImage: e.profileImage ?? null,
          status: e.eventType === 'BOARD' ? 'BOARDED' : e.eventType === 'EXIT' ? 'EXITED' : 'WAITING',
        }
      })
    return Object.values(latest)
  }

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await getMyBusAttendance()
      setPassengers(buildPassengers(data))
      setLastUpdated(new Date())
    } catch (e) {
      if (!silent) setError(e.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(() => load(true), POLL_INTERVAL)
    return () => clearInterval(t)
  }, [load])

  async function handleAction(student, eventType) {
    setActionLoading(p => ({ ...p, [student.studentId]: true }))
    try {
      await postAttendance({ studentId: student.studentId, eventType })
      setPassengers(p => p.map(s =>
        s.studentId === student.studentId
          ? { ...s, status: eventType === 'BOARD' ? 'BOARDED' : 'EXITED' }
          : s
      ))
      showToast(`${student.name} ${eventType === 'BOARD' ? '승차' : '하차'} 처리 완료`)
    } catch (e) {
      showToast(`처리 실패: ${e.message}`, 'error')
    } finally {
      setActionLoading(p => ({ ...p, [student.studentId]: false }))
    }
  }

  function showToast(text, type = 'success') {
    setToastMsg({ text, type })
    setTimeout(() => setToastMsg(null), 3000)
  }

  function formatTime(ts) {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
  }

  const filtered = passengers.filter(p => filter === 'ALL' || p.status === filter)
  const stats = {
    total:   passengers.length,
    waiting: passengers.filter(p => p.status === 'WAITING').length,
    boarded: passengers.filter(p => p.status === 'BOARDED').length,
    exited:  passengers.filter(p => p.status === 'EXITED').length,
  }

  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.stopName]) acc[p.stopName] = []
    acc[p.stopName].push(p)
    return acc
  }, {})

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

      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>오늘의 탑승 명단</h2>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>오늘의 탑승 예정 학생 리스트를 조회하세요.</p>
          </div>
          {lastUpdated && <span style={{ fontSize: 11, color: '#94a3b8', paddingTop: 4 }}>{formatTime(lastUpdated)} 기준</span>}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { label: '전체', value: stats.total,   color: '#1A56DB' },
            { label: '대기', value: stats.waiting, color: '#92400e' },
            { label: '승차', value: stats.boarded, color: '#166534' },
            { label: '하차', value: stats.exited,  color: '#475569' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '10px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>정류장 선택</span>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #1A56DB', fontSize: 14, color: '#1e293b', background: '#fff', outline: 'none', appearance: 'none' }}
          >
            <option value="ALL">전체 노선</option>
            <option value="WAITING">대기 중</option>
            <option value="BOARDED">승차 완료</option>
            <option value="EXITED">하차 완료</option>
          </select>
        </div>

        {loading && <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: '40px 0' }}>불러오는 중...</p>}
        {error   && <p style={{ textAlign: 'center', color: '#ef4444', fontSize: 14, padding: '20px 0' }}>{error}</p>}

        {!loading && !error && Object.entries(grouped).map(([stopName, list]) => (
          <div key={stopName}>
            {filter === 'ALL' && (
              <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: '16px 0 8px 4px', letterSpacing: '0.05em' }}>{stopName}</p>
            )}
            {list.map(student => {
              const status = student.status || 'WAITING'
              return (
                <div key={student.studentId} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 16, padding: '14px 16px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                    {student.profileImage
                      ? <img src={student.profileImage} alt={student.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', background: '#e0e7ff', color: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>{student.name?.[0]}</div>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, color: '#94a3b8', display: 'block' }}>{student.stopName}</span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{student.name}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, ...STATUS_STYLE[status] }}>
                      {STATUS_LABEL[status]}
                    </span>
                    {status === 'WAITING' && (
                      <button
                        style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#1A56DB', color: '#fff', cursor: 'pointer' }}
                        onClick={() => handleAction(student, 'BOARD')}
                        disabled={!!actionLoading[student.studentId]}
                      >
                        {actionLoading[student.studentId] ? '...' : '승차'}
                      </button>
                    )}
                    {status === 'BOARDED' && (
                      <button
                        style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer' }}
                        onClick={() => handleAction(student, 'EXIT')}
                        disabled={!!actionLoading[student.studentId]}
                      >
                        {actionLoading[student.studentId] ? '...' : '하차'}
                      </button>
                    )}
                    {status === 'EXITED' && (
                      <button
                        style={{ fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, border: 'none', background: '#e2e8f0', color: '#64748b', cursor: 'pointer' }}
                        onClick={() => handleAction(student, 'BOARD')}
                        disabled={!!actionLoading[student.studentId]}
                      >
                        {actionLoading[student.studentId] ? '...' : '재승차'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: 14 }}>해당 학생이 없습니다.</div>
        )}
      </div>

      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', padding: '12px 24px', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 600, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', background: toastMsg.type === 'error' ? '#ef4444' : '#1A56DB' }}>
          {toastMsg.text}
        </div>
      )}
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

const QUICK_ACTIONS = [
  { icon: '📍', label: '위치\n확인',   color: '#1A56DB', to: '/map' },
  { icon: '📞', label: '기사\n연락',   color: '#00C49A', to: null },
  { icon: '📋', label: '공지사항',     color: '#FF6B35', to: '/notice' },
  { icon: '📊', label: '학습\n리포트', color: '#9B59B6', to: '/learning' },
]

const ACADEMY_STATUS = [
  { id: 1, icon: '👨‍👩‍👧', title: '등록 학부모',  desc: '오늘 기준 등록된 학부모 수', color: '#1A56DB', count: '24명' },
  { id: 2, icon: '🚐',    title: '운행 요청',    desc: '오늘 예정된 운행 요청',       color: '#00C49A', count: '8건' },
  { id: 3, icon: '📢',    title: '공지사항',     desc: '최근 등록된 학원 공지',       color: '#FF6B35', count: '3건' },
]