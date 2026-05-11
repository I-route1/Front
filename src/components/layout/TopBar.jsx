import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const PAGE_TITLES = {
  '/home':     null,          // 홈은 로고 표시
  '/map':      '실시간 위치',
  '/learning': '학습 리포트',
  '/notice':   '공지사항',
  '/profile':  '마이페이지',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const { user }     = useAuth()
  const title = PAGE_TITLES[pathname]

  return (
    <header className="topbar">
      {title ? (
        <span className="topbar__title">{title}</span>
      ) : (
        <span className="topbar__logo">
          아이<span>루트</span>
        </span>
      )}

      <div className="topbar__actions">
        {/* 알림 버튼 */}
        <button
          aria-label="알림"
          style={{ position:'relative', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%' }}
          onClick={() => {/* TODO: 알림 패널 */}}
        >
          <BellIcon />
          {/* 읽지 않은 알림 배지 */}
          <span style={{
            position:'absolute', top:6, right:6,
            width:8, height:8,
            background:'var(--color-accent)',
            borderRadius:'50%',
            border:'2px solid white',
          }} />
        </button>

        {/* 아바타 */}
        <button
          aria-label="프로필"
          style={{ width:32, height:32, borderRadius:'50%', background:'var(--color-primary-light)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}
        >
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : <span style={{ fontSize:14, fontWeight:600, color:'var(--color-primary)' }}>{user?.name?.[0] ?? '?'}</span>
          }
        </button>
      </div>
    </header>
  )
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}
