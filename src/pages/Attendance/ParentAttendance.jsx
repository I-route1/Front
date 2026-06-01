// src/pages/Attendance/ParentAttendance.jsx
import { useState, useEffect } from 'react'
import { getAttendanceByParent, getChildren, MOCK_ATTENDANCE, MOCK_CHILDREN } from '@/api/attendance'

const USE_MOCK = true // 백엔드 연동 시 false로 변경

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ParentAttendance({ user }) {
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [records, setRecords] = useState([])
  const [date, setDate] = useState(getTodayStr())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 자녀 목록 로드
  useEffect(() => {
    if (USE_MOCK) {
      setChildren(MOCK_CHILDREN)
      setSelectedChild(MOCK_CHILDREN[0])
      return
    }
    getChildren(user.id)
      .then(data => {
        setChildren(data)
        if (data.length > 0) setSelectedChild(data[0])
      })
      .catch(() => setError('자녀 목록을 불러오지 못했습니다.'))
  }, [user.id])

  // 출결 이력 로드
  useEffect(() => {
    if (!selectedChild) return
    setLoading(true)
    setError(null)

    if (USE_MOCK) {
      setTimeout(() => {
        setRecords(MOCK_ATTENDANCE)
        setLoading(false)
      }, 400)
      return
    }

    getAttendanceByParent(user.id, date)
      .then(data => setRecords(data))
      .catch(() => setError('출결 이력을 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [selectedChild, date, user.id])

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

      {/* 자녀 선택 탭 (자녀 2명 이상일 때) */}
      {children.length > 1 && (
        <div style={styles.childTabs}>
          {children.map(child => (
            <button
              key={child.gpsStudentId}
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
            {isOnBus ? '탑승중' : '하차'}
          </div>
        </div>
      )}

      {/* 이력 목록 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          {formatDate(date)} 기록
        </div>

        {loading && (
          <div style={styles.center}>
            <div style={styles.spinner} />
          </div>
        )}
        {error && <div style={styles.errorBox}>{error}</div>}

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