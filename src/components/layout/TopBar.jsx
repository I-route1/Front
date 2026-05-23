import { useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const PAGE_TITLES = {
  '/home': null,
  '/map': '실시간 위치',
  '/learning': '학습 리포트',
  '/notice': '공지사항',
  '/board': '게시판',
  '/board/write': '게시글 작성',
  '/profile': '마이페이지',
  '/profile/edit': '프로필 수정',
  '/profile/password': '비밀번호 변경',
  '/profile/delete': '계정 탈퇴',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const title = getPageTitle(pathname)

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
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
          }}
          onClick={() => {}}
        >
          <BellIcon />
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              background: 'var(--color-accent)',
              borderRadius: '50%',
              border: '2px solid white',
            }}
          />
        </button>

        {/* 아바타 */}
        <button
          aria-label="프로필"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)' }}>
              {user?.name?.[0] ?? '?'}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname] !== undefined) {
    return PAGE_TITLES[pathname]
  }

  if (pathname.startsWith('/board/') && pathname.endsWith('/edit')) {
    return '게시글 수정'
  }

  if (pathname.startsWith('/board/')) {
    return '게시글 상세'
  }

  return null
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}