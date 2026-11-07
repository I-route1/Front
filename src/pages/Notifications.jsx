// src/pages/Notifications.jsx
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { notificationTargets, notificationTargetKey } from '@/utils/notificationTargets'

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

export default function Notifications() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [filter, setFilter]               = useState('all') // 'all' | 'unread'
  const [markingAll, setMarkingAll]       = useState(false)

  // 알림 목록 불러오기
  // 알림은 학생 단위: 학부모는 자녀들의 알림을 합쳐서 최신순으로 보여준다.
  // 불러오지 못하면 예시 알림 대신 오류 안내를 보여준다.
  const targetKey = notificationTargetKey(user)
  const fetchNotifications = useCallback(async () => {
    const targets = notificationTargets(user)
    setLoading(true)
    setError(null)
    if (targets.length === 0) {
      setNotifications([])
      setLoading(false)
      return
    }
    const results = await Promise.allSettled(targets.map(t => notificationsAPI.getAll(t.studentId)))
    const merged = []
    results.forEach((r, i) => {
      if (r.status !== 'fulfilled') return
      const data = r.value
      const list = Array.isArray(data) ? data : (data?.notifications || data?.content || [])
      list.forEach(n => merged.push({ ...n, studentName: targets.length > 1 ? targets[i].name : '' }))
    })
    merged.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
    const failed = results.filter(r => r.status === 'rejected').length
    if (failed === results.length) {
      console.error('알림 조회 실패:', results[0].reason)
      setError('알림을 불러오지 못했어요.')
    } else if (failed > 0) {
      setError('일부 자녀의 알림을 불러오지 못했어요.')
    }
    setNotifications(merged)
    setLoading(false)
  }, [targetKey]) // eslint-disable-line react-hooks/exhaustive-deps

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

        {!loading && error && (
          <div role="alert" style={{ padding: '12px 14px', borderRadius: 12, background: '#FFF1F1', color: '#B42318', fontSize: 13 }}>
            {error}{' '}
            <button type="button" onClick={fetchNotifications} style={{ border: 'none', background: 'none', color: 'inherit', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
              다시 불러오기
            </button>
          </div>
        )}

        {!loading && filtered.length === 0 && !(error && notifications.length === 0) && (
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
                  {noti.studentName && (
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6, background: 'var(--color-surface-2, #F1F5F9)', color: 'var(--color-text-secondary, #475569)' }}>
                      {noti.studentName}
                    </span>
                  )}
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