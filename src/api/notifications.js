import { apiCall } from './client'

export const notificationsAPI = {
  // 9-1. 알림 즉시 생성 (앱 진입 시 호출)
  trigger: (studentId) =>
    apiCall(`/api/notifications/trigger?studentId=${studentId}`, {
      method: 'POST',
    }),

  // 9-2. 전체 알림 목록 조회
  getAll: (studentId) =>
    apiCall(`/api/notifications?studentId=${studentId}`),

  // 9-3. 읽지 않은 알림 조회 (뱃지 숫자용)
  getUnread: (studentId) =>
    apiCall(`/api/notifications/unread?studentId=${studentId}`),

  // 9-4. 알림 읽음 처리
  markAsRead: (id) =>
    apiCall(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),
}