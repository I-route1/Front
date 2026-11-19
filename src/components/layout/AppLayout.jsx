import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { connectBoardNotifications } from '@/api/boardNotifications'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080')
    .replace(/\/$/, '')

export default function AppLayout() {
    const { user } = useAuth()
    const token = user?.token
    const [boardNotifications, setBoardNotifications] = useState([])

    useEffect(() => {
        setBoardNotifications([])
        if (!token) return

        return connectBoardNotifications(API_BASE, token, setBoardNotifications)
    }, [token])

    return (
        <div className="app-shell">
            <TopBar boardNotifications={boardNotifications} />
            <main className="page-content">
                <div className="page-enter">
                    <Outlet context={{ boardNotifications, setBoardNotifications }} />
                </div>
            </main>
            <BottomNav />
        </div>
    )
}