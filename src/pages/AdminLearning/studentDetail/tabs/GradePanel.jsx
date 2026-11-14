import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { gradesAPI, analysisAPI } from '@/api'
import { SUBJECT_COLORS } from '../../data/mockData'
import LearningResults from '@/components/learning/LearningResults'
import useStudentRecords from '@/hooks/useStudentRecords'
import { normalizeGrades, summarizeGrades, subjectReportFacts } from '@/utils/gradeSummary'

const loadGrades = id => gradesAPI.getGrades(id).then(normalizeGrades)

export default function GradePanel({ student }) {
  const studentId = student?.id == null ? null : String(student.id)
  const grades = useStudentRecords(studentId, loadGrades)
  const summary = useMemo(() => summarizeGrades(grades.data), [grades.data])
  const [analysis, setAnalysis] = useState(null)

  // 과목별 종합 리포트 상태 (성적이 있는 과목만 고를 수 있다)
  const [pickedSubject, setPickedSubject] = useState(null)
  const reportSubject = summary.subjects.includes(pickedSubject) ? pickedSubject : summary.subjects[0] ?? null
  const [report, setReport] = useState({ key: null, data: null, loading: false })

  useEffect(() => {
    if (!studentId) return
    let active = true
    setAnalysis(null)
    gradesAPI.getGradeAnalysis(studentId)
      .then(data => { if (active) setAnalysis(data) })
      .catch(() => { if (active) setAnalysis(null) })
    return () => { active = false }
  }, [studentId])

  useEffect(() => {
    if (!studentId || !reportSubject) return
    let active = true
    const key = `${studentId}:${reportSubject}`
    setReport({ key, data: null, loading: true })
    analysisAPI.getReport(studentId, reportSubject)
      .then(data => { if (active) setReport({ key, data, loading: false }) })
      .catch(() => { if (active) setReport({ key, data: null, loading: false }) })
    return () => { active = false }
  }, [studentId, reportSubject])

  const reportState = report.key === `${studentId}:${reportSubject}` ? report : { data: null, loading: true }
  const analysisMessage = analysis?.summary || analysis?.summaryMessage || analysis?.message
  const hasGrades = summary.subjects.length > 0

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <LearningResults key={student.studentId ?? student.id} studentId={student.studentId ?? student.id} />

      {grades.loading ? (
        <div style={{ padding:'24px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
          성적을 불러오는 중...
        </div>
      ) : grades.error ? (
        <div role="alert" style={emptyBox}>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:8 }}>성적을 불러오지 못했어요.</p>
          <button type="button" onClick={grades.reload} style={smallButton}>다시 불러오기</button>
        </div>
      ) : !hasGrades ? (
        <div data-testid="admin-grade-empty" style={emptyBox}>
          <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:4 }}>아직 등록된 성적이 없어요</p>
          <p style={{ fontSize:11, color:'var(--color-text-muted)' }}>'🎯 성적 등록' 탭에서 시험 점수를 입력하면 여기에 표시돼요.</p>
        </div>
      ) : (
        <>
          {/* 1. 분석 요약 */}
          {analysisMessage && (
            <div style={{ padding:'12px 14px', borderRadius:10, background:'linear-gradient(135deg, #E8F0FF, #F0F5FF)', border:'1px solid #1A56DB30' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', marginBottom:6 }}>📊 성적 분석</p>
              <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>{analysisMessage}</p>
            </div>
          )}

          {/* 2. 과목별 최신 점수 (시험을 본 과목만) */}
          <div>
            <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
              📚 과목별 최신 점수 {summary.average != null && <span style={{ fontWeight:500 }}>· 평균 {summary.average}점</span>}
            </p>
            <div data-testid="admin-latest-scores" style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {summary.subjects.map(subject => {
                const latest = grades.data.filter(g => g.subject === subject).at(-1)
                return <SubjectBar key={subject} subject={subject} score={latest.score} color={SUBJECT_COLORS[subject] || '#1A56DB'} date={latest.date} />
              })}
            </div>
            <p style={{ fontSize:10, color:'var(--color-text-muted)', marginTop:8, textAlign:'right' }}>
              총 {grades.data.length}개의 시험 기록
            </p>
          </div>

          {/* 3. 성적 추이 (월별, 과목별 선) */}
          {summary.trend.length >= 2 && (
            <div>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>📈 성적 추이</p>
              <div style={{ background:'var(--color-surface-2)', borderRadius:10, padding:12 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={summary.trend} margin={{ top:8, right:8, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize:10, fill:'#94A3B8' }} />
                    <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#94A3B8' }} />
                    <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={(v, name) => [`${v}점`, name]} />
                    <Legend wrapperStyle={{ fontSize:10 }} />
                    {summary.subjects.map(subject => (
                      <Line key={subject} type="monotone" dataKey={subject} connectNulls
                        stroke={SUBJECT_COLORS[subject] || '#1A56DB'} strokeWidth={2} dot={{ r:3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 4. 과목별 종합 분석 */}
          <div style={{ marginTop: 8, paddingTop: 14, borderTop: '1px dashed var(--color-border)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: 'var(--color-text-primary)' }}>
              📑 과목별 종합 분석
            </p>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {summary.subjects.map(sub => {
                const isActive = reportSubject === sub
                const color = SUBJECT_COLORS[sub] || '#1A56DB'
                return (
                  <button key={sub} type="button" onClick={() => setPickedSubject(sub)} style={{
                    padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                    background: isActive ? color : 'var(--color-surface)', color: isActive ? 'white' : 'var(--color-text-muted)',
                    border: isActive ? 'none' : '1px solid var(--color-border)',
                  }}>{sub}</button>
                )
              })}
            </div>
            {reportState.loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>{reportSubject} 분석 중...</div>
            ) : reportState.data ? (
              <ReportContent report={reportState.data} subject={reportSubject}
                scores={grades.data.filter(g => g.subject === reportSubject).map(g => g.score)} />
            ) : (
              <div style={emptyBox}>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{reportSubject} 분석 결과를 불러오지 못했어요</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const emptyBox = {
  padding: '20px 16px', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 10,
  border: '1px dashed var(--color-border)',
}
const smallButton = {
  border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontFamily: 'inherit',
  background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer',
}

function SubjectBar({ subject, score, color, date }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
      <span style={{
        width:36, padding:'3px 8px', borderRadius:7, flexShrink:0,
        background:color+'18', color, fontSize:11, fontWeight:700,
        textAlign:'center',
      }}>
        {subject}
      </span>
      <div style={{ flex:1, height:10, background:'var(--color-border)', borderRadius:5, overflow:'hidden' }}>
        <div style={{ 
          height:'100%', width:`${Math.min(score, 100)}%`, 
          background:color, borderRadius:5, transition:'width 0.3s',
        }} />
      </div>
      <div style={{ width:60, textAlign:'right', flexShrink:0 }}>
        <p style={{ fontSize:13, fontWeight:700, color, lineHeight:1 }}>
          {score}점
        </p>
        {date && (
          <p style={{ fontSize:9, color:'var(--color-text-muted)', marginTop:2 }}>
            {date.slice(5)}
          </p>
        )}
      </div>
    </div>
  )
}

function ReportContent({ report, subject, scores }) {
  const color = SUBJECT_COLORS[subject] || '#1A56DB'
  const f = subjectReportFacts(report, scores)
  const facts = [
    f.latest != null && ['최근 점수', `${f.latest}점`],
    f.average != null && ['전체 학생 평균', `${f.average}점`],
    f.gap != null && ['평균과 차이', `${f.gap > 0 ? '+' : ''}${f.gap}점`],
    f.change != null && ['지난 시험 대비', f.change === 0 ? '변동 없음' : `${f.change > 0 ? '+' : ''}${f.change}점`],
  ].filter(Boolean)

  return (
    <div data-testid="admin-subject-report" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ padding: '12px 14px', borderRadius: 10, background: `${color}10`, border: `1px solid ${color}30` }}>
        <p style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 8 }}>{subject} 종합 분석</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {facts.map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
      {f.weak && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#FFE9E915', border: '1px solid #FF3B3B30' }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 4 }}>📌 보완할 점</p>
          <p style={{ fontSize: 11, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>{f.weak}</p>
        </div>
      )}
    </div>
  )
}
