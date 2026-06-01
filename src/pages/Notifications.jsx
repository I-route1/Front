// src/pages/Notifications.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'

// 알림 타입별 아이콘/색상
const NOTI_TYPE = {
  REVIEW:     { emoji: '📖', color: '#1A56DB', label: '복습 알림' },
  RISK:       { emoji: '⚠️', color: '#FF3B3B', label: '위험 감지' },
  ROADMAP:    { emoji: '🗺️', color: '#9B59B6', label: '로드맵' },
  GRADE:      { emoji: '📊', color: '#FF6B35', label: '성적' },
  FEEDBACK:   { emoji: '💬', color: '#00C49A', label: '피드백' },
  ATTENDANCE: { emoji: '🚌', color: '#FFB800', label: '출결' },
  SYSTEM:     { emoji: '🔔', color: '#94A3B8', label: '시스템' },
  DEFAULT:    { emoji: '🔔', color: '#94A3B8', label: '알림' },
}

function getNotiType(noti) {
  const type = (noti.type || noti.notificationType || noti.category || '').toUpperCase()
  return NOTI_TYPE[type] || NOTI_TYPE.DEFAULT
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)   return '방금 전'
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
  return `${Math.floor(diff / 86400)}일 전`
}

// mock 폴백 데이터
const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'REVIEW',     title: '오늘의 복습 알림',       message: '분수 나눗셈 개념을 복습할 시간이에요! (3일 주기)', createdAt: new Date(Date.now() - 5 * 60000).toISOString(),  read: false },
  { id: 2, type: 'GRADE',      title: '성적 분석 완료',          message: '이번 달 수학 성적이 72점으로 저번보다 8점 올랐어요.', createdAt: new Date(Date.now() - 2 * 3600000).toISOString(), read: false },
  { id: 3, type: 'FEEDBACK',   title: '새 피드백이 도착했어요',  message: '선생님이 학습 기록에 피드백을 남겼습니다.', createdAt: new Date(Date.now() - 5 * 3600000).toISOString(), read: false },
  { id: 4, type: 'ATTENDANCE', title: '승차 완료',               message: '홍민준 학생이 오후 2:30에 버스에 탑승했습니다.', createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), read: true },
  { id: 5, type: 'ROADMAP',    title: 'AI 로드맵 업데이트',      message: '이번 주 학습 목표가 업데이트되었습니다.', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), read: true },
  { id: 6, type: 'RISK',       title: '학습 위험 감지',          message: '최근 3일간 학습 기록이 없습니다. 확인이 필요해요.', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), read: true },
]

export default function Notifications() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [filter, setFilter]               = useState('all') // 'all' | 'unread'
  const [markingAll, setMarkingAll]       = useState(false)

  // 알림 목록 불러오기
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const data = await notificationsAPI.getAll(String(user.id))
      const list = Array.isArray(data) ? data : (data?.notifications || data?.content || [])
      setNotifications(list.length > 0 ? list : MOCK_NOTIFICATIONS)
    } catch (e) {
      console.error('알림 조회 실패:', e)
      setNotifications(MOCK_NOTIFICATIONS)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // 개별 읽음 처리
  const handleRead = async (noti) => {
    const isRead = noti.read ?? noti.isRead ?? false
    if (isRead) return

    // 낙관적 업데이트
    setNotifications(prev =>
      prev.map(n => n.id === noti.id ? { ...n, read: true, isRead: true } : n)
    )

    try {
      await notificationsAPI.markAsRead(noti.id)
    } catch (e) {
      console.error('읽음 처리 실패:', e)
      // 롤백
      setNotifications(prev =>
        prev.map(n => n.id === noti.id ? { ...n, read: false, isRead: false } : n)
      )
    }
  }

  // 전체 읽음 처리
  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !(n.read ?? n.isRead))
    if (unread.length === 0) return

    setMarkingAll(true)
    // 낙관적 업데이트
    setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })))

    try {
      await Promise.all(unread.map(n => notificationsAPI.markAsRead(n.id)))
    } catch (e) {
      console.error('전체 읽음 처리 실패:', e)
      fetchNotifications() // 실패 시 다시 불러오기
    } finally {
      setMarkingAll(false)
    }
  }

  const filtered = filter === 'unread'
    ? notifications.filter(n => !(n.read ?? n.isRead))
    : notifications

  const unreadCount = notifications.filter(n => !(n.read ?? n.isRead)).length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg, #F8FAFF)' }}>

      {/* 헤더 */}
      <div style={{
        background: 'var(--color-surface, white)',
        borderBottom: '1px solid var(--color-border, #E2E8F0)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: '6px 8px', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-primary, #1E293B)', lineHeight: 1 }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary, #1E293B)' }}>
            알림
          </h1>
          {unreadCount > 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted, #94A3B8)', marginTop: 1 }}>
              읽지 않은 알림 {unreadCount}개
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid var(--color-border, #E2E8F0)',
              background: 'transparent', cursor: markingAll ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              color: 'var(--color-primary, #1A56DB)',
              opacity: markingAll ? 0.5 : 1,
            }}
          >
            {markingAll ? '처리 중...' : '모두 읽음'}
          </button>
        )}
      </div>

      {/* 필터 탭 */}
      <div style={{
        display: 'flex', gap: 0,
        background: 'var(--color-surface, white)',
        borderBottom: '1px solid var(--color-border, #E2E8F0)',
        padding: '0 20px',
      }}>
        {[
          { id: 'all',    label: `전체 ${notifications.length}` },
          { id: 'unread', label: `안읽음 ${unreadCount}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '12px 16px', border: 'none', background: 'transparent',
              fontSize: 13, fontWeight: filter === tab.id ? 700 : 500,
              fontFamily: 'inherit', cursor: 'pointer',
              color: filter === tab.id ? 'var(--color-primary, #1A56DB)' : 'var(--color-text-muted, #94A3B8)',
              borderBottom: filter === tab.id ? '2px solid var(--color-primary, #1A56DB)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 알림 목록 */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {loading && (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted, #94A3B8)' }}>
              🔔 알림 불러오는 중...
            </p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: '60px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🎉</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary, #1E293B)' }}>
              {filter === 'unread' ? '읽지 않은 알림이 없어요!' : '알림이 없어요!'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted, #94A3B8)', marginTop: 6 }}>
              새로운 알림이 오면 여기서 확인할 수 있어요
            </p>
          </div>
        )}

        {!loading && filtered.map((noti, i) => {
          const typeInfo = getNotiType(noti)
          const isRead   = noti.read ?? noti.isRead ?? false
          const title    = noti.title   || noti.subject  || '알림'
          const message  = noti.message || noti.content  || noti.body || ''
          const time     = noti.createdAt || noti.timestamp || noti.sentAt || ''

          return (
            <div
              key={noti.id || i}
              onClick={() => handleRead(noti)}
              style={{
                display: 'flex', gap: 14, padding: '14px 16px',
                borderRadius: 14,
                background: isRead
                  ? 'var(--color-surface, white)'
                  : `${typeInfo.color}08`,
                border: `1px solid ${isRead ? 'var(--color-border, #E2E8F0)' : typeInfo.color + '25'}`,
                cursor: isRead ? 'default' : 'pointer',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {/* 읽지 않음 도트 */}
              {!isRead && (
                <div style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 8, height: 8, borderRadius: '50%',
                  background: typeInfo.color,
                }} />
              )}

              {/* 아이콘 */}
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: typeInfo.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22,
              }}>
                {typeInfo.emoji}
              </div>

              {/* 내용 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                    background: typeInfo.color + '15', color: typeInfo.color,
                  }}>
                    {typeInfo.label}
                  </span>
                  {time && (
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted, #94A3B8)' }}>
                      {timeAgo(time)}
                    </span>
                  )}
                </div>
                <p style={{
                  fontSize: 13, fontWeight: isRead ? 500 : 700,
                  color: 'var(--color-text-primary, #1E293B)',
                  marginBottom: message ? 4 : 0,
                }}>
                  {title}
                </p>
                {message && (
                  <p style={{
                    fontSize: 12, color: 'var(--color-text-muted, #94A3B8)',
                    lineHeight: 1.5,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  }}>
                    {message}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 하단 여백 */}
      <div style={{ height: 80 }} />
    </div>
  )
}