import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'

// 알림 타입별 표시 정보
const NOTIFICATION_TYPE = {
  'REVIEW':    { emoji: '📚', label: '복습 알림', color: '#1A56DB' },
  'ANALYSIS':  { emoji: '🤖', label: 'AI 분석', color: '#9C88FF' },
  'FEEDBACK':  { emoji: '💬', label: '강사 피드백', color: '#00C49A' },
  'GRADE':     { emoji: '📊', label: '성적 알림', color: '#FFB800' },
  'RISK':      { emoji: '⚠️', label: '위험 알림', color: '#FF3B3B' },
  'DEFAULT':   { emoji: '🔔', label: '알림', color: '#94A3B8' },
}

function getTypeInfo(type) {
  return NOTIFICATION_TYPE[type?.toUpperCase()] || NOTIFICATION_TYPE.DEFAULT
}

// 시간 표시 헬퍼 (예: "방금 전", "5분 전", "어제")
function formatTime(timeStr) {
  if (!timeStr) return ''
  try {
    const time = new Date(timeStr)
    const now = new Date()
    const diff = Math.floor((now - time) / 1000)  // 초 단위
    
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`
    if (diff < 172800) return '어제'
    if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`
    
    return time.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  } catch {
    return timeStr
  }
}

export default function Notifications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')  // 'all' | 'unread'
  
  // 알림 목록 조회
  useEffect(() => {
    if (!user?.id) return
    
    setLoading(true)
    notificationsAPI.getAll(user.id)
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.notifications || data?.data || [])
        // 최신순 정렬
        list.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.date || 0)
          const dateB = new Date(b.createdAt || b.date || 0)
          return dateB - dateA
        })
        setNotifications(list)
      })
      .catch(e => {
        console.error('알림 조회 실패:', e)
        setNotifications([])
      })
      .finally(() => setLoading(false))
  }, [user?.id])
  
  // 알림 클릭 → 읽음 처리
  const handleClick = async (notification) => {
    const id = notification.id || notification.notificationId
    const isRead = notification.isRead ?? notification.read
    
    // 안 읽은 알림이면 markAsRead 호출
    if (!isRead && id) {
      try {
        await notificationsAPI.markAsRead(id)
        // 로컬 상태 업데이트
        setNotifications(prev => prev.map(n => {
          const nId = n.id || n.notificationId
          return nId === id ? { ...n, isRead: true, read: true } : n
        }))
      } catch (e) {
        console.error('읽음 처리 실패:', e)
      }
    }
    
    // 알림 타입별 라우팅 (선택)
    // 예: REVIEW 알림 → 학습 페이지로, RISK 알림 → 분석 페이지로
    // 일단은 현 페이지 유지
  }
  
  // 필터링
  const filtered = filter === 'unread' 
    ? notifications.filter(n => !(n.isRead ?? n.read))
    : notifications
  
  const unreadCount = notifications.filter(n => !(n.isRead ?? n.read)).length
  
  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>
          안 읽음 {unreadCount}개 / 전체 {notifications.length}개
        </p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>🔔 알림</h2>
      </div>
      
      {/* 필터 */}
      <div style={{ margin:'16px 16px 0', display:'flex', gap:6 }}>
        {[
          { id: 'all',    label: '전체' },
          { id: 'unread', label: `안 읽음${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding:'7px 16px', borderRadius:20, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600,
              background: filter === f.id ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filter === f.id ? 'white' : 'var(--color-text-muted)',
              border: filter === f.id ? 'none' : '1px solid var(--color-border)',
              transition:'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      
      {/* 알림 목록 */}
      <div style={{ margin:'12px 16px 16px', display:'flex', flexDirection:'column', gap:8 }}>
        {loading ? (
          <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
            알림을 불러오는 중...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:'40px 16px', textAlign:'center', background:'var(--color-surface)', borderRadius:14, border:'1px dashed var(--color-border)' }}>
            <p style={{ fontSize:32, marginBottom:8 }}>📭</p>
            <p style={{ fontSize:13, color:'var(--color-text-muted)' }}>
              {filter === 'unread' ? '안 읽은 알림이 없어요' : '아직 알림이 없어요'}
            </p>
          </div>
        ) : (
          filtered.map((n, i) => {
            const id = n.id || n.notificationId || i
            const type = getTypeInfo(n.type || n.notificationType)
            const isRead = n.isRead ?? n.read
            const title = n.title || type.label
            const content = n.content || n.message || n.body || ''
            const time = formatTime(n.createdAt || n.date)
            
            return (
              <div
                key={id}
                onClick={() => handleClick(n)}
                style={{
                  padding:'14px', borderRadius:12, cursor:'pointer',
                  background: isRead ? 'var(--color-surface)' : `${type.color}08`,
                  border: `1px solid ${isRead ? 'var(--color-border)' : type.color + '40'}`,
                  transition:'all 0.15s',
                }}
              >
                <div style={{ display:'flex', gap:12 }}>
                  <span style={{ fontSize:24, flexShrink:0 }}>{type.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ 
                        fontSize:11, fontWeight:700, color:type.color,
                        padding:'2px 8px', borderRadius:20, background:type.color+'15',
                      }}>
                        {type.label}
                      </span>
                      {!isRead && (
                        <span style={{ 
                          width:8, height:8, borderRadius:'50%', 
                          background:'#FF3B3B', flexShrink:0,
                        }} />
                      )}
                      <span style={{ fontSize:10, color:'var(--color-text-muted)', marginLeft:'auto' }}>
                        {time}
                      </span>
                    </div>
                    
                    {title && title !== type.label && (
                      <p style={{ 
                        fontSize:13, fontWeight: isRead ? 600 : 700, 
                        marginBottom:4, color:'var(--color-text-primary)',
                      }}>
                        {title}
                      </p>
                    )}
                    
                    <p style={{ 
                      fontSize:12, lineHeight:1.5, 
                      color: isRead ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
                    }}>
                      {content}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}