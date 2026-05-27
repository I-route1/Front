import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { notificationsAPI } from '@/api'
import { useAuth, USER_ROLES, isAcademy } from '@/context/AuthContext'

const PARENT_NAV = [
  { to: '/home',     label: '홈',   icon: HomeIcon },
  { to: '/map',      label: '지도', icon: MapIcon },
  { to: '/learning', label: '학습', icon: BookIcon },
  { to: '/board',    label: '게시판', icon: NoticeIcon },
  { to: '/profile',  label: '마이', icon: ProfileIcon },
]

const ACADEMY_NAV = [
  { to: '/admin/learning', label: '학습 관리', icon: BookIcon },
  { to: '/board',          label: '게시판', icon: NoticeIcon },
  { to: '/profile',        label: '마이', icon: ProfileIcon },
]

const ADMIN_NAV = [
  { to: '/home',    label: '홈',   icon: HomeIcon },
  { to: '/board',   label: '게시판', icon: NoticeIcon },
  { to: '/profile', label: '마이', icon: ProfileIcon },
]

const DRIVER_NAV = [
  { to: '/home',    label: '홈',   icon: HomeIcon },
  { to: '/map',     label: '지도', icon: MapIcon },
  { to: '/profile', label: '마이', icon: ProfileIcon },
]

export default function BottomNav() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    notificationsAPI.getUnread(user.id)
      .then(data => setUnreadCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setUnreadCount(0))
  }, [user?.id])

  const getNavItems = () => {
    if (user?.role === USER_ROLES.ADMIN)   return ADMIN_NAV
    if (user?.role === USER_ROLES.ACADEMY || user?.role === USER_ROLES.TEACHER) return ACADEMY_NAV
    if (user?.role === USER_ROLES.DRIVER)  return DRIVER_NAV
    return PARENT_NAV
  }

  const NAV_ITEMS = getNavItems().map(item =>
    item.label === '게시판' ? { ...item, badge: unreadCount } : item
  )

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      <div className="bottom-nav__items">
        {NAV_ITEMS.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `bottom-nav__item${isActive ? ' active' : ''}`
            }
            aria-label={label}
          >
            <div className="bottom-nav__icon"><Icon /></div>
            <span>{label}</span>
            {badge > 0 && (
              <span className="bottom-nav__badge">{badge > 9 ? '9+' : badge}</span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  )
}
function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}
function NoticeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function ProfileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}