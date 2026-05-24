import { useNavigate } from 'react-router-dom'
import { useAuth, USER_ROLES } from '@/context/AuthContext'
import DriverBoardingList from '@/pages/DriverBoardingList'

export default function Home() {
  const { user, role } = useAuth()
  const navigate = useNavigate()

  const handleDriverContact = () => {
    const driverName = '김기사'
    const driverPhone = '010-1111-2222'
    const phoneNumber = driverPhone.replace(/\D/g, '')

    const shouldCall = window.confirm(
      `담당 기사님\n\n${driverName}\n${driverPhone}\n\n전화 앱으로 연결할까요?`
    )

    if (shouldCall) {
      window.location.href = `tel:${phoneNumber}`
    }
  }

  if (role === USER_ROLES.DRIVER) {
  return <DriverHome user={user} />
}

if (role === USER_ROLES.ACADEMY) {
  return <AcademyHome user={user} />
}

if (role === USER_ROLES.ADMIN) {
  return <AdminHome user={user} navigate={navigate} />
}

  return (
    <div>
      {/* 인사 배너 */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)',
          padding: '24px 20px 28px',
          color: 'white',
        }}
      >
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>안녕하세요 👋</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
          {user?.name ?? '사용자'}님
        </h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>오늘도 안전한 하루 되세요</p>

        {/* 현재 상태 카드 */}
        <div
          style={{
            marginTop: 20,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 14,
            padding: '14px 16px',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#00C49A',
              boxShadow: '0 0 0 4px rgba(0,196,154,0.3)',
              flexShrink: 0,
            }}
          />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>홍민준 · 이동 중</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>수학학원 방면 · 예상 도착 14분</p>
          </div>
          <button
            onClick={() => navigate('/map')}
            style={{
              marginLeft: 'auto',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
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
      if (label === '기사\n연락') {
        handleDriverContact()
        return
      }

      if (to) {
        navigate(to)
      }
    }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '14px 8px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'transform 0.1s',
              }}
              onPointerDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)'
              }}
              onPointerUp={(e) => {
                e.currentTarget.style.transform = ''
              }}
              onPointerLeave={(e) => {
                e.currentTarget.style.transform = ''
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: color + '20',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                }}
              >
                {icon}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-text-secondary)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* 오늘의 일정 */}
<section className="section">
  <div className="section__header">
    <h3 className="section__title">오늘의 일정</h3>
  </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SCHEDULES.map((s) => (
            <div
              key={s.id}
              className="card"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: s.color + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {s.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {s.time} · {s.place}
                </p>
              </div>
              <span
                className={`badge badge--${
                  s.status === '완료' ? 'green' : s.status === '이동중' ? 'yellow' : 'blue'
                }`}
              >
                {s.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

            {/* 최근 알림 */}
      <section className="section">
        <div className="section__header">
          <h3 className="section__title">최근 알림</h3>
          <button
            type="button"
            className="section__link"
            onClick={() => navigate('/notice')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            더 보기
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NOTIFICATIONS.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: '12px 14px',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{n.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {n.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {n.desc}
                </p>
              </div>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                {n.time}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function AcademyHome({ user }) {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        paddingBottom: 96,
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)',
          padding: '24px 20px 28px',
          color: 'white',
        }}
      >
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>학원 관리자 홈</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
          {user?.academyName ?? user?.name ?? '학원'}님
        </h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          오늘의 학원 운영 현황을 확인해 보세요
        </p>

        <div
          style={{
            marginTop: 20,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 14,
            padding: '14px 16px',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700 }}>등록 학원</p>
          <p style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            {user?.academyAddress ?? '학원 주소가 등록되지 않았습니다.'}
          </p>
        </div>
      </div>

      <section className="section">
        <div className="section__header">
          <h3 className="section__title">오늘의 관리 현황</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ACADEMY_STATUS.map((item) => (
            <div
              key={item.id}
              className="card"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: item.color + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {item.desc}
                </p>
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
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        paddingBottom: 96,
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)',
          padding: '24px 20px 28px',
          color: 'white',
        }}
      >
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>관리자 홈</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
          {user?.name ?? '관리자'}님
        </h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          서비스 관리 현황을 확인해 보세요
        </p>
      </div>

      <section className="section">
        <div className="section__header">
          <h3 className="section__title">관리자 빠른 실행</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 10 }}>

          <button
            onClick={() => navigate('/board')}
            className="card"
            style={{
              padding: '18px 12px',
              textAlign: 'center',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
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
    <div
      style={{
        minHeight: '100dvh',
        paddingBottom: 96,
        background: '#F3F4F6',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)',
          padding: '24px 20px 28px',
          color: 'white',
        }}
      >
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>기사님 홈</p>
        <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>
          {user?.name ?? '기사님'}님
        </h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>
          오늘의 운행 및 탑승 명단을 확인해 보세요
        </p>

        <div
          style={{
            marginTop: 20,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 14,
            padding: '14px 16px',
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700 }}>배정 차량</p>
          <p style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            {user?.vehicleNumber ?? '차량 정보가 등록되지 않았습니다.'}
          </p>
          <p style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
            {user?.academyName ?? '배정 학원 정보가 등록되지 않았습니다.'}
          </p>
        </div>
      </div>

      <DriverBoardingList />
    </div>
  )
}

const QUICK_ACTIONS = [
  { icon: '📍', label: '위치\n확인', color: '#1A56DB', to: '/map' },
  { icon: '📞', label: '기사\n연락', color: '#00C49A', to: null },
  { icon: '📋', label: '공지사항', color: '#FF6B35', to: '/notice' },
  { icon: '📊', label: '학습\n리포트', color: '#9B59B6', to: '/learning' },
]

const ACADEMY_STATUS = [
  {
    id: 1,
    icon: '👨‍👩‍👧',
    title: '등록 학부모',
    desc: '오늘 기준 등록된 학부모 수',
    color: '#1A56DB',
    count: '24명',
  },
  {
    id: 2,
    icon: '🚐',
    title: '운행 요청',
    desc: '오늘 예정된 운행 요청',
    color: '#00C49A',
    count: '8건',
  },
  {
    id: 3,
    icon: '📢',
    title: '공지사항',
    desc: '최근 등록된 학원 공지',
    color: '#FF6B35',
    count: '3건',
  },
]

const SCHEDULES = [
  {
    id: 1,
    icon: '📐',
    name: '수학학원',
    time: '14:00',
    place: '대구수학원',
    color: '#1A56DB',
    status: '이동중',
  },
  {
    id: 2,
    icon: '🔤',
    name: '영어학원',
    time: '16:30',
    place: '탑클래스영어',
    color: '#00C49A',
    status: '예정',
  },
  {
    id: 3,
    icon: '🎨',
    name: '미술학원',
    time: '18:00',
    place: '창의미술',
    color: '#FF6B35',
    status: '예정',
  },
]

const NOTIFICATIONS = [
  {
    id: 1,
    icon: '✅',
    title: '수학학원 출발',
    desc: '홍민준이 수학학원에서 출발했습니다',
    time: '13:55',
  },
  {
    id: 2,
    icon: '📢',
    title: '수학학원 공지',
    desc: '이번 주 토요일 수업이 변경됩니다',
    time: '11:20',
  },
  {
    id: 3,
    icon: '📊',
    title: 'AI 학습 리포트',
    desc: '이번 주 수학 약점 분석 리포트가 도착했습니다',
    time: '09:00',
  },
]