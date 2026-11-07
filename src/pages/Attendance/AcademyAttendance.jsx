// src/pages/Attendance/AcademyAttendance.jsx
import { useState, useEffect } from 'react'
import { getAttendanceByBus, registerNfcCard } from '@/api/attendance'
import { studentAPI } from '@/api/student'
import { busesFromStudents, latestStatusByStudent } from '@/utils/busAttendance'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function AcademyAttendance({ user }) {
  const [tab, setTab] = useState('records') // 'records' | 'nfc'
  const [selectedBus, setSelectedBus] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // NFC 등록 폼
  const [nfcStudentId, setNfcStudentId] = useState('')
  const [nfcCardId, setNfcCardId] = useState('')
  const [nfcLoading, setNfcLoading] = useState(false)
  const [nfcMsg, setNfcMsg] = useState(null) // { type: 'success'|'error', text }

  // 학원 학생 목록 (버스 목록과 NFC 등록에 같이 쓴다)
  const [students, setStudents] = useState([])
  const [studentsLoading, setStudentsLoading] = useState(true)
  const [studentsError, setStudentsError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStudentsLoading(true)
    setStudentsError(false)
    studentAPI.getAcademyStudents()
      .then(data => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : []
        setStudents(list)
        const buses = busesFromStudents(list)
        setSelectedBus(prev => buses.find(b => b.busId === prev?.busId) ?? buses[0] ?? null)
      })
      .catch(err => { console.error('학생 목록 로드 실패:', err); if (!cancelled) setStudentsError(true) })
      .finally(() => { if (!cancelled) setStudentsLoading(false) })
    return () => { cancelled = true }
  }, [reloadKey])

  const buses = busesFromStudents(students)

  // 버스 출결 로드 (버스를 빨리 바꿔도 마지막 요청 결과만 반영)
  useEffect(() => {
    if (tab !== 'records' || !selectedBus) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setRecords([])
    getAttendanceByBus(selectedBus.busId)
      .then(data => { if (!cancelled) setRecords(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setError('출결 정보를 불러오지 못했습니다.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedBus, tab, reloadKey])

  // 학생별 가장 최근 상태
  const studentStatus = latestStatusByStudent(records)

  async function handleNfcRegister() {
    if (!nfcStudentId || !nfcCardId.trim()) {
      setNfcMsg({ type: 'error', text: '학생과 카드 UID를 모두 입력하세요.' })
      return
    }
    setNfcLoading(true)
    setNfcMsg(null)

    try {
      await registerNfcCard(Number(nfcStudentId), nfcCardId.trim())
      setNfcMsg({ type: 'success', text: 'NFC 카드가 등록되었습니다.' })
      setNfcCardId('')
    } catch (e) {
      setNfcMsg({ type: 'error', text: e.message })
    } finally {
      setNfcLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* 상단 탭 */}
      <div style={styles.tabRow}>
        <button
          style={{ ...styles.tab, ...(tab === 'records' ? styles.tabActive : {}) }}
          onClick={() => setTab('records')}
        >
          📋 출결 현황
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'nfc' ? styles.tabActive : {}) }}
          onClick={() => setTab('nfc')}
        >
          💳 NFC 카드 등록
        </button>
      </div>

      {/* ─── 출결 현황 탭 ─── */}
      {tab === 'records' && (
        <>
          {studentsLoading && <div style={styles.center}><div style={styles.spinner} /></div>}
          {studentsError && (
            <div role="alert" style={styles.errorBox}>
              학원 학생 정보를 불러오지 못했습니다.{' '}
              <button type="button" onClick={() => setReloadKey(k => k + 1)} style={styles.retryButton}>다시 불러오기</button>
            </div>
          )}
          {!studentsLoading && !studentsError && buses.length === 0 && (
            <div style={styles.empty}>버스가 배정된 학생이 없습니다</div>
          )}

          {/* 버스 선택: 학생에게 배정된 버스만 */}
          {buses.length > 0 && (
          <div style={styles.busRow}>
            {buses.map(bus => (
              <button
                key={bus.busId}
                type="button"
                aria-pressed={selectedBus?.busId === bus.busId}
                onClick={() => setSelectedBus(bus)}
                style={{
                  ...styles.busBtn,
                  ...(selectedBus?.busId === bus.busId ? styles.busBtnActive : {}),
                }}
              >
                🚌 {bus.label} <span style={{ opacity: 0.7, fontWeight: 500 }}>· {bus.count}명</span>
              </button>
            ))}
          </div>
          )}

          {/* 요약 카드 */}
          <div style={styles.summaryRow}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryNum}>
                {Object.values(studentStatus).filter(s => s === 'BOARD').length}
              </div>
              <div style={styles.summaryLabel}>현재 탑승</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={{ ...styles.summaryNum, color: '#00C49A' }}>
                {Object.values(studentStatus).filter(s => s === 'EXIT').length}
              </div>
              <div style={styles.summaryLabel}>하차 완료</div>
            </div>
            <div style={styles.summaryCard}>
              <div style={{ ...styles.summaryNum, color: '#f59e0b' }}>
                {records.length}
              </div>
              <div style={styles.summaryLabel}>전체 기록</div>
            </div>
          </div>

          {/* 기록 목록 */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>오늘 기록 (시간순)</div>

            {loading && (
              <div style={styles.center}><div style={styles.spinner} /></div>
            )}
            {error && (
              <div role="alert" style={styles.errorBox}>
                {error}{' '}
                <button type="button" onClick={() => setReloadKey(k => k + 1)} style={styles.retryButton}>다시 불러오기</button>
              </div>
            )}
            {!loading && !error && selectedBus && records.length === 0 && (
              <div style={styles.empty}>오늘 기록이 없습니다</div>
            )}

            {!loading && [...records].sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp))).map(r => (
              <div key={r.attendanceId} style={styles.record}>
                <div style={{
                  ...styles.eventBadge,
                  background: r.eventType === 'BOARD' ? '#dbeafe' : '#dcfce7',
                  color: r.eventType === 'BOARD' ? '#1d4ed8' : '#15803d',
                }}>
                  {r.eventType === 'BOARD' ? '승차' : '하차'}
                </div>
                <div style={styles.recordName}>{r.studentName}</div>
                <div style={styles.recordTime}>{formatTime(r.timestamp)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── NFC 카드 등록 탭 ─── */}
      {tab === 'nfc' && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>학생 NFC 카드 등록</div>
          <p style={styles.nfcDesc}>
            학생에게 NFC 카드 UID를 연결합니다. 이미 다른 학생에게 등록된 카드는 거부됩니다.
          </p>

          {/* 학생 선택 */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>학생 선택</label>
            <select
              value={nfcStudentId}
              onChange={e => setNfcStudentId(e.target.value)}
              style={styles.select}
              disabled={studentsLoading}
            >
              <option value="">{studentsLoading ? '로딩 중...' : studentsError ? '학생 목록을 불러오지 못했어요' : '-- 학생을 선택하세요 --'}</option>
              {students.map(s => (
                <option key={s.studentId} value={s.studentId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* NFC 카드 UID 입력 */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>NFC 카드 UID</label>
            <input
              type="text"
              value={nfcCardId}
              onChange={e => setNfcCardId(e.target.value.toUpperCase())}
              placeholder="예: AABBCCDD"
              style={styles.input}
              maxLength={20}
            />
            <span style={styles.hint}>PN532 리더기로 읽은 카드 UID를 입력하세요</span>
          </div>

          {nfcMsg && (
            <div style={{
              ...styles.msgBox,
              background: nfcMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: nfcMsg.type === 'success' ? '#15803d' : '#dc2626',
              border: `1px solid ${nfcMsg.type === 'success' ? '#86efac' : '#fca5a5'}`,
            }}>
              {nfcMsg.type === 'success' ? '✅ ' : '❌ '}{nfcMsg.text}
            </div>
          )}

          <button
            onClick={handleNfcRegister}
            disabled={nfcLoading}
            style={{ ...styles.submitBtn, opacity: nfcLoading ? 0.6 : 1 }}
          >
            {nfcLoading ? '등록 중...' : '💳 카드 등록'}
          </button>
        </div>
      )}
    </div>
  )
}

const styles = {
  retryButton: {
    border: 'none', background: 'transparent', color: 'inherit', fontWeight: 700,
    textDecoration: 'underline', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit',
  },
  container: {
    padding: '16px',
    maxWidth: 430,
    margin: '0 auto',
    paddingBottom: 80,
  },
  tabRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 12,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 13,
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
  },
  tabActive: {
    background: 'var(--color-primary, #1A56DB)',
    color: '#fff',
    border: '1.5px solid var(--color-primary, #1A56DB)',
  },
  busRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  busBtn: {
    padding: '8px 16px',
    borderRadius: 20,
    border: '1.5px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
  },
  busBtnActive: {
    background: '#0A1628',
    color: '#fff',
    border: '1.5px solid #0A1628',
  },
  summaryRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    background: '#fff',
    borderRadius: 12,
    padding: '14px 8px',
    textAlign: 'center',
    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
  },
  summaryNum: {
    fontSize: 24,
    fontWeight: 800,
    color: 'var(--color-primary, #1A56DB)',
    lineHeight: 1,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 600,
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
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #f1f5f9',
  },
  eventBadge: {
    borderRadius: 6,
    padding: '3px 8px',
    fontSize: 12,
    fontWeight: 700,
    minWidth: 40,
    textAlign: 'center',
  },
  recordName: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
    color: '#1e293b',
  },
  recordTime: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: 600,
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
  nfcDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.6,
    marginBottom: 20,
    marginTop: 0,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    fontSize: 14,
    color: '#1e293b',
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1.5px solid #e2e8f0',
    fontSize: 14,
    color: '#1e293b',
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    letterSpacing: '0.1em',
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
    display: 'block',
  },
  msgBox: {
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 14,
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    borderRadius: 12,
    border: 'none',
    background: 'var(--color-primary, #1A56DB)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
  },
}