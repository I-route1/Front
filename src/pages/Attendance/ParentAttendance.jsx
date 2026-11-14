// src/pages/Attendance/ParentAttendance.jsx
import { useState, useEffect } from 'react'
import { getAttendanceByStudent, getChildren } from '@/api/attendance'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

// 기기 시간대 기준 오늘 (toISOString은 UTC라서 한국 오전 9시 전에는 어제 날짜가 된다)
function getTodayStr(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const toChild = c => ({ gpsStudentId: c.studentId ?? c.id, name: c.name, grade: c.grade ?? '' })

export default function ParentAttendance({ user }) {
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [records, setRecords] = useState([])
  const [date, setDate] = useState(getTodayStr())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [childState, setChildState] = useState('loading') // loading | ready | error
  const [reloadKey, setReloadKey] = useState(0)

  // 자녀 목록: 로그인 정보에 있으면 바로 보여주고, 서버에서 최신 목록으로 다시 맞춘다.
  // 실패해도 예시 자녀를 보여주지 않는다.
  useEffect(() => {
    let cancelled = false
    const cached = (user?.children ?? []).map(toChild).filter(c => c.gpsStudentId != null)
    if (cached.length > 0) {
      setChildren(cached)
      setSelectedChild(prev => cached.find(c => c.gpsStudentId === prev?.gpsStudentId) ?? cached[0])
      setChildState('ready')
    } else {
      setChildState('loading')
    }
    getChildren()
      .then(data => {
        if (cancelled) return
        const list = (Array.isArray(data) ? data : []).map(toChild).filter(c => c.gpsStudentId != null)
        setChildren(list)
        setSelectedChild(prev => list.find(c => c.gpsStudentId === prev?.gpsStudentId) ?? list[0] ?? null)
        setChildState('ready')
      })
      .catch(() => { if (!cancelled && cached.length === 0) setChildState('error') })
    return () => { cancelled = true }
  }, [user?.id, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 출결 이력 로드 (자녀나 날짜를 빨리 바꿔도 마지막 요청 결과만 반영)
  useEffect(() => {
    if (!selectedChild) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setRecords([])
    getAttendanceByStudent(selectedChild.gpsStudentId, date)
      .then(data => { if (!cancelled) setRecords(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setError('출결 이력을 불러오지 못했습니다.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedChild?.gpsStudentId, date, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // 같은 자녀를 새 목록으로 다시 받아도(객체만 바뀜) 출결을 두 번 요청하지 않도록 ID로 비교한다

  // 마지막 상태 계산
  const lastRecord = records[0]
  const isOnBus = lastRecord?.eventType === 'BOARD'

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h2 style={styles.title}>자녀 출결</h2>
        <input
          type="date"
          value={date}
          max={getTodayStr()}
          onChange={e => setDate(e.target.value)}
          style={styles.datePicker}
        />
      </div>

      {childState === 'loading' && children.length === 0 && (
        <div role="status" style={styles.center}><div style={styles.spinner} /></div>
      )}
      {childState === 'error' && (
        <div role="alert" style={styles.errorBox}>
          자녀 정보를 불러오지 못했습니다.{' '}
          <button type="button" onClick={() => setReloadKey(k => k + 1)} style={styles.retryButton}>다시 불러오기</button>
        </div>
      )}
      {childState === 'ready' && children.length === 0 && (
        <div style={styles.empty}>등록된 자녀가 없습니다. 마이 › 자녀 관리에서 자녀를 추가해 주세요.</div>
      )}

      {/* 자녀 선택 탭 (자녀 2명 이상일 때) */}
      {children.length > 1 && (
        <div style={styles.childTabs}>
          {children.map(child => (
            <button
              key={child.gpsStudentId}
              type="button"
              aria-pressed={selectedChild?.gpsStudentId === child.gpsStudentId}
              onClick={() => setSelectedChild(child)}
              style={{
                ...styles.childTab,
                ...(selectedChild?.gpsStudentId === child.gpsStudentId ? styles.childTabActive : {}),
              }}
            >
              {child.name}
            </button>
          ))}
        </div>
      )}

      {/* 현재 탑승 상태 카드 */}
      {selectedChild && (
        <div style={{ ...styles.statusCard, background: isOnBus ? 'var(--color-primary)' : '#1e293b' }}>
          <div style={styles.statusIcon}>{isOnBus ? '🚌' : '🏠'}</div>
          <div>
            <div style={styles.statusName}>{selectedChild.name}</div>
            <div style={styles.statusText}>
              {lastRecord
                ? isOnBus
                  ? `${formatTime(lastRecord.timestamp)} 승차 — 버스 탑승 중`
                  : `${formatTime(lastRecord.timestamp)} 하차 완료`
                : '오늘 기록 없음'}
            </div>
          </div>
          <div style={{ ...styles.statusBadge, background: isOnBus ? '#3b82f6' : '#475569' }}>
            {!lastRecord ? '기록 없음' : isOnBus ? '탑승중' : '하차'}
          </div>
        </div>
      )}

      {/* 이력 목록 */}
      {selectedChild && (
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          {formatDate(date)} 기록
        </div>

        {loading && (
          <div style={styles.center}>
            <div style={styles.spinner} />
          </div>
        )}
        {error && (
          <div role="alert" style={styles.errorBox}>
            {error}{' '}
            <button type="button" onClick={() => setReloadKey(k => k + 1)} style={styles.retryButton}>다시 불러오기</button>
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div style={styles.empty}>이날 출결 기록이 없습니다</div>
        )}

        {!loading && records.map(r => (
          <div key={r.attendanceId} style={styles.record}>
            <div style={{
              ...styles.recordDot,
              background: r.eventType === 'BOARD' ? 'var(--color-primary, #1A56DB)' : 'var(--color-success, #00C49A)',
            }} />
            <div style={styles.recordInfo}>
              <span style={styles.recordEvent}>
                {r.eventType === 'BOARD' ? '🚌 승차' : '🏠 하차'}
              </span>
              <span style={styles.recordStudent}>{r.studentName}</span>
            </div>
            <div style={styles.recordTime}>{formatTime(r.timestamp)}</div>
          </div>
        ))}
      </div>
      )}

      {/* 알림 안내 */}
      <div style={styles.noticeBox}>
        <span style={{ fontSize: 14 }}>🔔</span>
        <span style={styles.noticeText}>
          승하차 시 푸시 알림이 전송됩니다. 알림이 안 오면 설정에서 허용해주세요.
        </span>
      </div>
    </div>
  )
}

const styles = {
  retryButton: {
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    fontWeight: 700,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
    fontSize: 'inherit',
  },
  container: {
    padding: '16px',
    maxWidth: 430,
    margin: '0 auto',
    paddingBottom: 80,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--color-text, #0f172a)',
    margin: 0,
  },
  datePicker: {
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 13,
    color: 'var(--color-text, #0f172a)',
    background: '#f8fafc',
    outline: 'none',
  },
  childTabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  childTab: {
    flex: 1,
    padding: '8px 0',
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 14,
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
  },
  childTabActive: {
    background: 'var(--color-primary, #1A56DB)',
    color: '#fff',
    border: '1.5px solid var(--color-primary, #1A56DB)',
  },
  statusCard: {
    borderRadius: 16,
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    color: '#fff',
    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
  },
  statusIcon: {
    fontSize: 36,
    lineHeight: 1,
  },
  statusName: {
    fontSize: 17,
    fontWeight: 700,
    marginBottom: 2,
  },
  statusText: {
    fontSize: 13,
    opacity: 0.85,
  },
  statusBadge: {
    marginLeft: 'auto',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    whiteSpace: 'nowrap',
  },
  section: {
    background: '#fff',
    borderRadius: 16,
    padding: '16px',
    marginBottom: 16,
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 12,
  },
  record: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  recordInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  recordEvent: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
  },
  recordStudent: {
    fontSize: 12,
    color: '#94a3b8',
  },
  recordTime: {
    fontSize: 14,
    fontWeight: 700,
    color: '#475569',
  },
  center: {
    display: 'flex',
    justifyContent: 'center',
    padding: '24px 0',
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid #e2e8f0',
    borderTop: '3px solid var(--color-primary, #1A56DB)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  errorBox: {
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 13,
  },
  empty: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '24px 0',
    fontSize: 14,
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: '#eff6ff',
    borderRadius: 12,
    padding: '12px 14px',
  },
  noticeText: {
    fontSize: 12,
    color: '#3b82f6',
    lineHeight: 1.5,
  },
}