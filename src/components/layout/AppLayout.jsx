import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { connectBoardNotifications } from '@/api/boardNotifications'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080')
    .replace(/\/$/, '')
const PUSH_TOAST_MS = 8000

export default function AppLayout() {
    const { user } = useAuth()
    const token = user?.token
    const [boardNotifications, setBoardNotifications] = useState([])
    const push = usePushNotifications({ apiBase: API_BASE, accessToken: token, userId: user?.id })

    useEffect(() => {
        setBoardNotifications([])
        if (!token) return

        return connectBoardNotifications(API_BASE, token, setBoardNotifications)
    }, [token])

    return (
        <div className="app-shell">
            <TopBar boardNotifications={boardNotifications} />
            <PushToast message={push.message} onClose={push.dismissMessage} />
            <main className="page-content">
                <div className="page-enter">
                    <Outlet context={{ boardNotifications, setBoardNotifications, push }} />
                </div>
            </main>
            <BottomNav />
        </div>
    )
}

// 앱을 보고 있을 때 온 푸시 알림 (지각 위험·경로 이탈 등). 누르면 지도 화면으로 간다.
// 화면 흐름 안에 넣으면 아래 내용(지도 등)이 밀려 내려가므로, 상단 바 바로 아래에 화면 위로 겹쳐 띄운다
function PushToast({ message, onClose }) {
    const navigate = useNavigate()

    useEffect(() => {
        if (!message) return undefined
        const timer = setTimeout(onClose, PUSH_TOAST_MS)
        return () => clearTimeout(timer)
    }, [message, onClose])

    if (!message) return null
    return (
        <div role="alert" style={{
            position: 'fixed', top: 'calc(var(--topbar-height) + var(--safe-top) + 8px)', zIndex: 1000,
            left: '50%', transform: 'translateX(-50%)',
            width: 'calc(min(100vw, var(--app-max-width)) - 24px)', boxSizing: 'border-box',
            padding: '12px 14px', borderRadius: 12,
            background: '#0A1628', color: 'white', boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
            <button type="button" onClick={() => { onClose(); navigate('/map') }} style={{
                flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0,
                color: 'inherit', cursor: 'pointer',
            }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800 }}>🔔 {message.title}</span>
                {message.body && (
                    <span style={{ display: 'block', marginTop: 2, fontSize: 13, opacity: 0.85, wordBreak: 'keep-all' }}>
                        {message.body}
                    </span>
                )}
            </button>
            <button type="button" aria-label="알림 닫기" onClick={onClose} style={{
                background: 'none', border: 'none', color: 'inherit', opacity: 0.7, fontSize: 18, lineHeight: 1,
                cursor: 'pointer', padding: 2,
            }}>✕</button>
        </div>
    )
}
