import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { gradesAPI, analysisAPI } from '@/api'
import { SUBJECTS, SUBJECT_COLORS } from '../../data/mockData'

export default function GradePanel({ student }) {
  const [grades, setGrades] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // 종합 리포트 상태
  const [reportSubject, setReportSubject] = useState('수학')
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)
  
  // 성적 + 분석 조회
  useEffect(() => {
    if (!student?.id) return
    
    setLoading(true)
    const studentId = String(student.id)
    
    Promise.all([
      gradesAPI.getGrades(studentId).catch(e => { 
        console.error('성적 조회 실패:', e); return null 
      }),
      gradesAPI.getGradeAnalysis(studentId).catch(e => { 
        console.error('성적 분석 실패:', e); return null 
      }),
    ])
      .then(([gradesData, analysisData]) => {
        const gradeList = Array.isArray(gradesData) 
          ? gradesData 
          : (gradesData?.grades || gradesData?.data || [])
        setGrades(gradeList)
        setAnalysis(analysisData)
      })
      .finally(() => setLoading(false))
  }, [student?.id])
  
  // 과목별 종합 리포트 조회 (과목 바뀌면 재호출)
  useEffect(() => {
    if (!student?.id) return
    
    setReportLoading(true)
    analysisAPI.getReport(String(student.id), reportSubject)
      .then(data => setReport(data))
      .catch(e => {
        console.error('종합 리포트 조회 실패:', e)
        setReport(null)
      })
      .finally(() => setReportLoading(false))
  }, [student?.id, reportSubject])
  
  if (loading) {
    return (
      <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
        성적 데이터 분석 중...
      </div>
    )
  }
  
  const hasApiData = grades && grades.length > 0
  
  // 과목별 최신 점수만 추출
  const latestBySubject = {}
  if (hasApiData) {
    grades.forEach(g => {
      const subject = g.subject || g.subjectName || '미상'
      const date = g.examDate || g.date || ''
      if (!latestBySubject[subject] || date > latestBySubject[subject].date) {
        latestBySubject[subject] = {
          subject,
          score: g.score ?? g.totalScore ?? 0,
          date,
        }
      }
    })
  }
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      
      {/* 1. 분석 요약 */}
      {analysis && (analysis.summary || analysis.summaryMessage || analysis.message) && (
        <div style={{ padding:'12px 14px', borderRadius:10, background:'linear-gradient(135deg, #E8F0FF, #F0F5FF)', border:'1px solid #1A56DB30' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', marginBottom:6 }}>📊 AI 성적 분석</p>
          <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>
            {analysis.summary || analysis.summaryMessage || analysis.message}
          </p>
        </div>
      )}
      
      {/* 2. 과목별 최신 점수 */}
      <div>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
          📚 과목별 최신 점수
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {hasApiData ? (
            Object.values(latestBySubject).map((g, i) => {
              const color = SUBJECT_COLORS[g.subject] || '#1A56DB'
              return (
                <SubjectBar key={i} subject={g.subject} score={g.score} color={color} date={g.date} />
              )
            })
          ) : (
            SUBJECTS.map(subject => {
              const score = student.scores?.[subject] ?? 0
              const color = SUBJECT_COLORS[subject] || '#1A56DB'
              return (
                <SubjectBar key={subject} subject={subject} score={score} color={color} />
              )
            })
          )}
        </div>
        
        {hasApiData && grades.length > 5 && (
          <p style={{ fontSize:10, color:'var(--color-text-muted)', marginTop:8, textAlign:'right' }}>
            총 {grades.length}개의 시험 기록이 있어요
          </p>
        )}
      </div>
      
      {/* 3. 성적 추이 그래프 */}
      {hasApiData && grades.length >= 3 && (
        <div>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
            📈 성적 추이
          </p>
          <div style={{ background:'var(--color-surface-2)', borderRadius:10, padding:12 }}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={grades.slice(-10)} margin={{ top:8, right:8, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
                <XAxis 
                  dataKey={d => d.examDate || d.date || d.subject || ''} 
                  tick={{ fontSize:10, fill:'#94A3B8' }} 
                />
                <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#94A3B8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} 
                  formatter={v => [`${v}점`]} 
                />
                <Line 
                  type="monotone" 
                  dataKey={d => d.score ?? d.totalScore ?? 0} 
                  stroke="#1A56DB" strokeWidth={2} dot={{ r:4, fill:'#1A56DB' }}
                  name="점수"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* 4. 데이터 없음 안내 */}
      {!hasApiData && !analysis && (
        <div style={{ padding:'12px 14px', borderRadius:10, background:'#FFF8E0', border:'1px solid #FFB80030' }}>
          <p style={{ fontSize:11, color:'#8A6500', lineHeight:1.5 }}>
            💡 이 학생의 성적 데이터가 아직 백엔드에 없어 mock 데이터를 표시합니다
          </p>
        </div>
      )}
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 🆕 과목별 종합 리포트 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      
      <div style={{ 
        marginTop: 8, paddingTop: 14, 
        borderTop: '1px dashed var(--color-border)',
      }}>
        <p style={{ 
          fontSize: 13, fontWeight: 800, marginBottom: 10,
          color: 'var(--color-text-primary)',
        }}>
          📑 과목별 종합 분석
        </p>
        
        {/* 과목 선택 칩 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {SUBJECTS.map(sub => {
            const isActive = reportSubject === sub
            const color = SUBJECT_COLORS[sub] || '#1A56DB'
            return (
              <button
                key={sub}
                onClick={() => setReportSubject(sub)}
                disabled={reportLoading}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
                  cursor: reportLoading ? 'wait' : 'pointer',
                  background: isActive ? color : 'var(--color-surface)',
                  color: isActive ? 'white' : 'var(--color-text-muted)',
                  border: isActive ? 'none' : '1px solid var(--color-border)',
                  transition: 'all 0.15s',
                }}
              >
                {sub}
              </button>
            )
          })}
        </div>
        
        {/* 리포트 결과 */}
        {reportLoading ? (
          <div style={{ 
            padding: '24px', textAlign: 'center',
            color: 'var(--color-text-muted)', fontSize: 12,
          }}>
            🤖 {reportSubject} 종합 분석 중...
          </div>
        ) : report ? (
          <ReportContent report={report} subject={reportSubject} />
        ) : (
          <div style={{ 
            padding: '20px 16px', textAlign: 'center',
            background: 'var(--color-surface-2)', borderRadius: 10,
            border: '1px dashed var(--color-border)',
          }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {reportSubject} 분석 데이터가 충분하지 않아요
            </p>
          </div>
        )}
      </div>
    </div>
  )
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

// 🆕 과목별 종합 리포트 표시 컴포넌트
function ReportContent({ report, subject }) {
  const color = SUBJECT_COLORS[subject] || '#1A56DB'
  
  // 응답 구조 대비
  const summary = report.summary || report.message || report.analysis || report.overallSummary || ''
  const strong  = report.strong || report.strengths || report.strongPoint || ''
  const weak    = report.weak || report.weakness || report.weakPoint || ''
  const advice  = report.advice || report.recommendation || report.recommend || report.suggestion || ''
  const score   = report.currentScore ?? report.score ?? null
  const trend   = report.trend || report.tendency || ''
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      
      {summary && (
        <div style={{ 
          padding: '12px 14px', borderRadius: 10,
          background: `${color}10`, border: `1px solid ${color}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>🤖</span>
            <p style={{ fontSize: 11, fontWeight: 700, color }}>
              AI {subject} 종합 리포트
            </p>
            {score != null && (
              <span style={{ 
                marginLeft: 'auto', padding: '2px 8px', borderRadius: 20,
                background: color, color: 'white', fontSize: 10, fontWeight: 700,
              }}>
                {score}점
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
            {summary}
          </p>
          {trend && (
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
              추세: <strong>{trend}</strong>
            </p>
          )}
        </div>
      )}
      
      {(strong || weak) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {strong && (
            <div style={{ 
              padding: '10px 12px', borderRadius: 10,
              background: '#D1FAF015', border: '1px solid #00C49A30',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-success)', marginBottom: 4 }}>
                💪 강점
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {strong}
              </p>
            </div>
          )}
          {weak && (
            <div style={{ 
              padding: '10px 12px', borderRadius: 10,
              background: '#FFE9E915', border: '1px solid #FF3B3B30',
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 4 }}>
                📌 보완
              </p>
              <p style={{ fontSize: 11, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                {weak}
              </p>
            </div>
          )}
        </div>
      )}
      
      {advice && (
        <div style={{ 
          padding: '10px 12px', borderRadius: 10,
          background: '#FFF8E0', border: '1px solid #FFB80030',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#8A6500', marginBottom: 4 }}>
            💡 권장 학습
          </p>
          <p style={{ fontSize: 11, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
            {advice}
          </p>
        </div>
      )}
    </div>
  )
}