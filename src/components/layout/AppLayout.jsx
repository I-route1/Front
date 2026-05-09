import { Outlet } from 'react-router-dom'
import TopBar from './TopBar'
import BottomNav from './BottomNav'

export default function AppLayout() {
  return (
    <div className="app-shell">
      <TopBar />
      <main className="page-content">
        <div className="page-enter">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
