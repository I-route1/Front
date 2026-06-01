// src/pages/Attendance/index.jsx
import { useAuth, USER_ROLES } from '@/context/AuthContext'
import ParentAttendance from './ParentAttendance'
import AcademyAttendance from './AcademyAttendance'

export default function Attendance() {
  const { user } = useAuth()

  if (!user) return null

  // 학원/관리자 → 버스 출결 + NFC 등록
  if (user.role === USER_ROLES.ACADEMY || user.role === USER_ROLES.ADMIN) {
    return <AcademyAttendance user={user} />
  }

  // 학부모 → 자녀 출결 이력
  if (user.role === USER_ROLES.PARENT) {
    return <ParentAttendance user={user} />
  }

  // 기사님 — 현재 탑승 목록 (추후 구현 가능)
  return (
    <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
      출결 기능 준비 중입니다
    </div>
  )
}