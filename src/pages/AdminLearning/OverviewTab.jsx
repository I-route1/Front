import { useState, useEffect, useMemo, useCallback } from 'react'
import { analysisAPI, gradesAPI, studentAPI } from '@/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { SUBJECT_COLORS } from './data/mockData'
import { normalizeGrades, summarizeGrades, GRADE_SUBJECTS } from '@/utils/gradeSummary'

const GRADE_ORDER = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3']
const CONCURRENCY = 6 // 학생이 많아도 서버에 한 번에 너무 많이 요청하지 않는다

// 학생마다 요청을 보내되 동시에 CONCURRENCY개까지만
async function mapLimited(items, fn, onProgress) {
  const results = new Array(items.length)
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]).catch(() => null)
      onProgress?.(++done)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
  return results
}

const LEVELS = [
  { grade: '1등급', min: 96, color: '#1A56DB' },
  { grade: '2등급', min: 89, color: '#00C49A' },
  { grade: '3등급', min: 77, color: '#FFB800' },
  { grade: '4등급', min: 60, color: '#FF6B35' },
  { grade: '5등급', min: 0, color: '#FF3B3B' },
]
const levelOf = (score) => LEVELS.find(l => score >= l.min).grade

const card = { background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', padding: 16 }

export default function OverviewTab() {
  const [rows, setRows] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [filterGrade, setFilterGrade] = useState('전체')
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey(k => k + 1), [])

  // 학원 학생 → 학생별 성적·위험도 (실제 API)
  useEffect(() => {
    let cancelled = false
    setState('loading')
    setRows([])
    ;(async () => {
      let students
      try {
        const data = await studentAPI.getAcademyStudents()
        students = (Array.isArray(data) ? data : []).filter(s => s?.studentId != null)
      } catch (e) {
        console.error('학원 학생 조회 실패:', e)
        if (!cancelled) setState('error')
        return
      }
      if (cancelled) return
      setProgress({ done: 0, total: students.length })
      const result = await mapLimited(students, async (s) => {
        const grades = await gradesAPI.getGrades(s.studentId).catch(() => [])
        const summary = summarizeGrades(normalizeGrades(grades))
        // 위험도(성적 하락) 분석은 성적이 있는 학생만 요청한다
        const risk = summary.average == null
          ? null
          : await analysisAPI.getRiskAnalysis(String(s.studentId)).catch(() => null)
        return {
          id: s.studentId,
          name: s.name ?? `학생 ${s.studentId}`,
          grade: s.grade ?? '',
          average: summary.average,
          current: summary.current,
          risk: risk?.atRisk ? risk : null,
        }
      }, done => { if (!cancelled) setProgress(p => ({ ...p, done })) })
      if (cancelled) return
      setRows(result.filter(Boolean))
      setState('ready')
    })()
    return () => { cancelled = true }
  }, [reloadKey])

  const gradeOptions = useMemo(() => [
    '전체',
    ...[...new Set(rows.map(r => r.grade).filter(Boolean))]
      .sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b)),
  ], [rows])

  const filtered = useMemo(
    () => rows.filter(r => filterGrade === '전체' || r.grade === filterGrade),
    [rows, filterGrade],
  )
  const graded = filtered.filter(r => r.average != null)
  const riskStudents = filtered.filter(r => r.risk)
  const avgScore = graded.length ? Math.round(graded.reduce((a, r) => a + r.average, 0) / graded.length) : null
  const topCount = graded.filter(r => r.average >= 80).length

  // 과목별 평균: 그 과목 성적이 있는 학생만
  const subjectAvg = GRADE_SUBJECTS.map(sub => {
    const vals = graded.map(r => r.current[sub]).filter(v => v != null)
    return {
      subject: sub,
      avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
      count: vals.length,
      color: SUBJECT_COLORS[sub],
    }
  }).filter(s => s.count > 0)

  const gradeDist = LEVELS.map(l => ({ ...l, count: graded.filter(r => levelOf(r.average) === l.grade).length }))
  const filterLabel = filterGrade === '전체' ? '전체' : filterGrade

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)', padding: '24px 20px', color: 'white' }}>
        <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>스마트 학원 관리자</p>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>학원 전체 현황</h2>
        {state === 'ready' && (
          <p style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
            학생 {rows.length}명 · 성적 등록 {rows.filter(r => r.average != null).length}명
          </p>
        )}
      </div>

      {state === 'loading' && (
        <div role="status" style={{ margin: '16px', ...card, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
          {progress.total ? `학생 ${progress.total}명 중 ${progress.done}명의 성적을 불러오는 중...` : '학원 학생 목록을 불러오는 중...'}
          {progress.total > 0 && (
            <div style={{ marginTop: 10, height: 6, borderRadius: 3, background: 'var(--color-surface-2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(progress.done / progress.total) * 100}%`, background: 'var(--color-primary)', transition: 'width 0.2s' }} />
            </div>
          )}
        </div>
      )}

      {state === 'error' && (
        <div role="alert" style={{ margin: '16px', padding: '14px 16px', borderRadius: 12, background: '#FFF1F1', color: '#B42318', fontSize: 13 }}>
          학원 학생 목록을 불러오지 못했어요.{' '}
          <button type="button" onClick={reload} style={{ border: 'none', background: 'none', color: 'inherit', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
            다시 불러오기
          </button>
        </div>
      )}

      {state === 'ready' && rows.length === 0 && (
        <div style={{ margin: '16px', ...card, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
          아직 학원에 등록된 학생이 없어요.
        </div>
      )}

      {state === 'ready' && rows.length > 0 && (
        <>
          {/* 학년 필터 (실제 학생의 학년만) */}
          <div style={{ margin: '16px 16px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>학년</p>
            <div role="group" aria-label="학년 선택" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {gradeOptions.map(g => (
                <button key={g} type="button" aria-pressed={filterGrade === g} onClick={() => setFilterGrade(g)} style={{
                  padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  background: filterGrade === g ? 'var(--color-primary)' : 'var(--color-surface)',
                  color: filterGrade === g ? 'white' : 'var(--color-text-muted)',
                  border: filterGrade === g ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                }}>{g}</button>
              ))}
            </div>
          </div>

          {/* 통계 카드 */}
          <div style={{ margin: '12px 16px 0' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8 }}>📊 {filterLabel} 통계</p>
            <div aria-label={`${filterLabel} 통계`} style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { label: '학생 수', value: `${filtered.length}명`, sub: graded.length < filtered.length ? `성적 미등록 ${filtered.length - graded.length}명` : null, icon: '👥', bg: '#F0F4FF', color: 'var(--color-primary)' },
                { label: '평균 점수', value: avgScore == null ? '-' : `${avgScore}점`, sub: graded.length ? `성적 있는 ${graded.length}명 기준` : '성적 없음', icon: '📊', bg: '#E8F8F4', color: '#047857' },
                { label: '우수 학생 (80↑)', value: `${topCount}명`, sub: null, icon: '🏆', bg: '#FFFBEA', color: '#8A6500' },
                { label: '주의 학생', value: `${riskStudents.length}명`, sub: '성적 하락 위험 분석', icon: '⚠️', bg: '#FFF5F5', color: 'var(--color-danger)' },
              ].map(c => (
                <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: '14px', border: `1px solid ${c.color}20` }}>
                  <p style={{ fontSize: 11, color: c.color, marginBottom: 4 }}>{c.icon} {c.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</p>
                  {c.sub && <p style={{ fontSize: 10, color: c.color, opacity: 0.8, marginTop: 2 }}>{c.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* 주의 학생: 위험도 분석 API 결과 */}
          {riskStudents.length > 0 && (
            <div style={{ margin: '12px 16px 0' }}>
              <section aria-label="상담 필요 학생" style={{ background: '#FFF5F5', borderRadius: 16, border: '1px solid #FF3B3B30', padding: 16 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 12 }}>⚠️ 상담 필요 학생</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {riskStudents.map(s => (
                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'white', border: '1px solid #FF3B3B20' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: '#FF3B3B15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--color-danger)' }}>
                        {s.name[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</p>
                          {s.grade && <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#F0F4FF', color: 'var(--color-primary)' }}>{s.grade}</span>}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-danger)', marginTop: 2, lineHeight: 1.4 }}>
                          {s.risk.riskSummary || '성적 하락 위험이 감지됐어요'}
                          {s.average != null ? ` · 평균 ${s.average}점` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* 과목별 평균 */}
          {subjectAvg.length > 0 && (
            <div style={{ margin: '12px 16px 0' }}>
              <div style={card}>
                <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>📚 과목별 평균 점수</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 14 }}>{filterLabel} · 학생별 그 과목의 최근 점수 기준</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={subjectAvg} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
                    <XAxis dataKey="subject" tick={{ fontSize: 12, fill: '#4A5568' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} formatter={(v, _, p) => [`${v}점 (${p.payload.count}명)`, '평균']} />
                    <Bar dataKey="avg" radius={[6, 6, 0, 0]}>
                      {subjectAvg.map(entry => <Cell key={entry.subject} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 등급 분포 */}
          {graded.length > 0 && (
            <div style={{ margin: '12px 16px 16px' }}>
              <div style={card}>
                <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>🎯 성적 등급 분포</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 14 }}>학생별 과목 평균 점수 기준</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {gradeDist.map(g => (
                    <div key={g.grade} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, width: 40, color: g.color }}>{g.grade}</span>
                      <div style={{ flex: 1, height: 10, background: 'var(--color-surface-2)', borderRadius: 5, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(g.count / graded.length) * 100}%`, background: g.color, borderRadius: 5, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: g.color, width: 32, textAlign: 'right' }}>{g.count}명</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}
