import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { apiCall } from '@/api/client'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { notificationsAPI } from '@/api'
import { notificationTargets, notificationTargetKey } from '@/utils/notificationTargets'
import { resolveProfileImageUrl, DEFAULT_PROFILE_IMAGE } from '@/utils/profileImage'

const PAGE_TITLES = {
    '/home': null,
    '/map': '실시간 위치',
    '/driver/map': '운행',
    '/learning': '학습 리포트',
    '/notice': '공지사항',
    '/notifications': '알림',
    '/board': '게시판',
    '/board/write': '게시글 작성',
    '/profile': '마이페이지',
    '/profile/edit': '프로필 수정',
    '/profile/password': '비밀번호 변경',
    '/profile/delete': '계정 탈퇴',
    '/admin/learning': '학습 관리',
}

export default function TopBar({ boardNotifications = [] }) {
    const hasUnreadBoardNotice = boardNotifications.some(item => !item.readAt)
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { user } = useAuth()

    const [hasUnread, setHasUnread] = useState(false)
    const [unreadMessages, setUnreadMessages] = useState(0)
    const accountId = user?.id ?? user?.userId

    useEffect(() => {
        if (!accountId) return
        const controller = new AbortController()
        let timer

        async function refreshUnreadMessages() {
            try {
                const result = await apiCall('/api/direct-messages/unread', { signal: controller.signal })
                if (!controller.signal.aborted) setUnreadMessages(result.count)
            } catch {
                // The next refresh retries while the user remains signed in.
            } finally {
                if (!controller.signal.aborted) timer = setTimeout(refreshUnreadMessages, 5000)
            }
        }

        setUnreadMessages(0)
        void refreshUnreadMessages()
        return () => {
            controller.abort()
            clearTimeout(timer)
        }
    }, [accountId])

    const avatarSrc = resolveProfileImageUrl(user?.profileImageUrl ?? user?.avatar)

    // 안 읽은 알림 확인
    useEffect(() => {
        const targets = notificationTargets(user)
        if (targets.length === 0) { setHasUnread(false); return }
        let cancelled = false
        Promise.all(targets.map(t => notificationsAPI.getUnread(t.studentId).catch(() => [])))
            .then(lists => { if (!cancelled) setHasUnread(lists.some(d => (Array.isArray(d) ? d.length : (d?.count ?? 0)) > 0)) })
        return () => { cancelled = true }
    }, [notificationTargetKey(user)]) // eslint-disable-line react-hooks/exhaustive-deps

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
                <button type="button" className="topbar__icon-button" onClick={() => navigate('/messages')}
                    aria-label={unreadMessages ? '메시지, 읽지 않음 ' + unreadMessages + '개' : '메시지'}>
                    <MessageCircle size={22} aria-hidden="true" style={{ transform: 'translate(3px, -1px)' }} />
                    {unreadMessages > 0 && (
                        <span className="topbar__unread-dot" aria-hidden="true" />
                    )}
                </button>
                {/* 알림 버튼 */}
                <button
                    type="button"
                    className="topbar__icon-button"
                    aria-label={hasUnread || hasUnreadBoardNotice ? '읽지 않은 알림 있음' : '알림'}
                    onClick={() => navigate('/notifications')}
                >
                    <BellIcon />
                    {(hasUnread || hasUnreadBoardNotice) && (
                        <span className="topbar__unread-dot" aria-hidden="true" />
                    )}
                </button>

                {/* 아바타 */}
                <button
                    type="button"
                    aria-label="프로필 수정"
                    title="프로필 수정"
                    onClick={() => navigate('/profile/edit')}
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: '#E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        padding: 0,
                        border: 'none',
                    }}
                >
                    <img
                        src={avatarSrc}
                        alt={user?.nickname ?? user?.name ?? '프로필'}
                        onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = DEFAULT_PROFILE_IMAGE
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </button>
            </div>
        </header>
    )
}

function getPageTitle(pathname) {
    if (pathname === '/messages' || pathname.startsWith('/messages/')) return '메시지'
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
        <svg
            width="24"
            height="24"
            style={{ transform: 'translateX(-2px)' }}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
    )
}