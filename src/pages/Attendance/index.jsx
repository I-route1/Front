import { useAuth, USER_ROLES } from '@/context/AuthContext'
import ParentAttendance from './ParentAttendance'
import AcademyAttendance from './AcademyAttendance'
import DriverAttendance from './Driverattendance'

export default function Attendance() {
  const { user } = useAuth()

  if (!user) return null

  // 기사 → 오늘 탑승 명단 + 승하차 처리
  if (user.role === USER_ROLES.DRIVER) {
    return <DriverAttendance user={user} />
  }

  // 학원/관리자 → 버스 출결 + NFC 등록
  if (user.role === USER_ROLES.ACADEMY || user.role === USER_ROLES.ADMIN) {
    return <AcademyAttendance user={user} />
  }

  // 학부모 → 자녀 출결 이력
  if (user.role === USER_ROLES.PARENT) {
    // 💡 자녀가 없더라도 차단 화면(NoChildScreen)을 띄우지 않고 ParentAttendance로 진입
    return <ParentAttendance user={user} />
  }

  return (
      <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
        출결 기능 준비 중입니다
      </div>
  )
}