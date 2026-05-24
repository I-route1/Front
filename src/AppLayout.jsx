import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

const getNavItems = (role) => [
  { to: '/home',     label: '홈',        icon: HomeIcon },
  { to: '/map',      label: '실시간 위치', icon: MapIcon,    badge: 0 },
  {
    to: role === 'academy' ? '/admin/learning' : '/learning',
    label: '학습 리포트',
    icon: BookIcon,
  },
  { to: '/notice',   label: '공지사항',   icon: NoticeIcon, badge: 2 },
  { to: '/profile',  label: '마이페이지', icon: ProfileIcon },
]

const ROLE_LABEL = {
  parent: '학부모', driver: '기사', academy: '학원 관리자', student: '학생',
}

export default function AppLayout() {
  const { user } = useAuth()
  const navItems = getNavItems(user?.role)

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100dvh',
      overflow: 'hidden',
      background: 'var(--color-bg)',
    }}>
      <SidebarNav user={user} navItems={navItems} />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 0,
        overflow: 'hidden',
      }}>
        <TopBar />

        <main style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}>
          <Outlet />
        </main>

        <BottomNav navItems={navItems} />
      </div>
    </div>
  )
}

function SidebarNav({ user, navItems }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">아이<span>루트</span></div>

      <nav className="sidebar__nav">
        <p className="sidebar__section-label">메뉴</p>
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar__item${isActive ? ' active' : ''}`}
          >
            <span className="sidebar__item-icon"><Icon /></span>
            <span>{label}</span>
            {badge > 0 && <span className="sidebar__badge">{badge}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__user">
          <div className="sidebar__avatar">
            {user?.name?.[0] ?? '?'}
          </div>
          <div className="sidebar__user-info">
            <p className="sidebar__user-name">{user?.name ?? '사용자'}</p>
            <p className="sidebar__user-role">{ROLE_LABEL[user?.role] ?? ''}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

/* ── SVG Icons ── */
function HomeIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> }
function MapIcon()     { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> }
function BookIcon()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> }
function NoticeIcon()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> }
function ProfileIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }