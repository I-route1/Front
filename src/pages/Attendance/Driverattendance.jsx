// src/pages/Attendance/DriverAttendance.jsx
// 출결 탭 — 모든 아이들 이름 리스트

import { useState, useEffect } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function getMyBusAttendance() {
  const saved = sessionStorage.getItem('i-route-user')
  const user = saved ? JSON.parse(saved) : null
  const token = user?.token
  const res = await fetch(`${BASE_URL}/api/gps/drivers/my-bus/attendance`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('출석부 조회 실패')
  return res.json()
}

const STATUS_LABEL = {
  WAITING: '대기 중',
  BOARDED: '승차 완료',
  EXITED:  '하차 완료',
}

const STATUS_STYLE = {
  WAITING: { background: '#fef3c7', color: '#92400e' },
  BOARDED: { background: '#dcfce7', color: '#166534' },
  EXITED:  { background: '#f1f5f9', color: '#475569' },
}

export default function DriverAttendance({ user }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    setLoading(true)
    getMyBusAttendance()
      .then(data => {
        // 학생별 마지막 이벤트로 status 계산
        const latest = {}
        ;[...(Array.isArray(data) ? data : [])].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .forEach(e => {
            latest[e.studentId] = {
              studentId: e.studentId,
              name: e.studentName ?? e.name,
              stopName: e.stopName ?? '',
              status: e.eventType === 'BOARD' ? 'BOARDED' : e.eventType === 'EXIT' ? 'EXITED' : 'WAITING',
            }
          })
        setStudents(Object.values(latest))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={s.center}>
      <div style={s.spinner} />
      <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 12 }}>학생 목록 불러오는 중...</p>
    </div>
  )

  if (error) return (
    <div style={s.center}>
      <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>
    </div>
  )

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>전체 학생 목록</h2>
        <p style={s.subtitle}>총 {students.length}명</p>
      </div>

      {students.length === 0 ? (
        <div style={s.empty}>
          <p>등록된 학생이 없습니다.</p>
        </div>
      ) : (
        <div style={s.list}>
          {students.map((student, i) => (
            <div key={student.studentId ?? i} style={s.row}>
              <div style={s.index}>{i + 1}</div>
              <div style={s.info}>
                <span style={s.name}>{student.name}</span>
                {student.stopName && (
                  <span style={s.stop}>{student.stopName}</span>
                )}
              </div>
              <span style={{ ...s.badge, ...STATUS_STYLE[student.status ?? 'WAITING'] }}>
                {STATUS_LABEL[student.status ?? 'WAITING']}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  container: {
    padding: '20px 16px 100px',
    background: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    margin: '4px 0 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#fff',
    borderRadius: 14,
    padding: '14px 16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  index: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#e0e7ff',
    color: '#1A56DB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 800,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0f172a',
  },
  stop: {
    fontSize: 12,
    color: '#94a3b8',
  },
  badge: {
    fontSize: 12,
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 8,
    whiteSpace: 'nowrap',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #1A56DB',
    animation: 'spin 0.8s linear infinite',
  },
  empty: {
    textAlign: 'center',
    padding: '40px 0',
    color: '#94a3b8',
    fontSize: 14,
  },
}