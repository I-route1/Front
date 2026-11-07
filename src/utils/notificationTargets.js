// 알림은 학생 단위로 저장된다 (GET /api/notifications?studentId=).
// 학부모는 자녀들의 알림을, 학생은 자기 알림을 본다. 학부모 본인 ID는 학생 ID가 아니다.
import { normalizeRole, USER_ROLES } from '@/context/AuthContext'

export function notificationTargets(user) {
  const role = normalizeRole(user?.role)
  if (role === USER_ROLES.PARENT) {
    return (user?.children ?? [])
      .map(c => ({ studentId: c?.studentId ?? c?.id, name: c?.name ?? '' }))
      .filter(c => Number.isInteger(Number(c.studentId)) && Number(c.studentId) > 0)
  }
  if (role === USER_ROLES.STUDENT && user?.id != null) return [{ studentId: user.id, name: user.name ?? '' }]
  return []
}

export const notificationTargetKey = (user) => notificationTargets(user).map(t => t.studentId).join(',')
