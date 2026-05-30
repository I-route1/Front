import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { gradesAPI } from '@/api'
import { SUBJECTS, SUBJECT_COLORS } from '../../data/mockData'

export default function GradePanel({ student }) {
  const [grades, setGrades] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  useEffect(() => {
    if (!student?.id) return
    
    setLoading(true)
    setError(null)
    
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
        // 응답 구조 대비 (배열/객체 둘 다)
        const gradeList = Array.isArray(gradesData) 
          ? gradesData 
          : (gradesData?.grades || gradesData?.data || [])
        setGrades(gradeList)
        setAnalysis(analysisData)
      })
      .finally(() => setLoading(false))
  }, [student?.id])
  
  if (loading) {
    return (
      <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
        성적 데이터 분석 중...
      </div>
    )
  }
  
  // 데이터 없을 때 → mock scores 폴백
  const hasApiData = grades && grades.length > 0
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      
      {/* 1. 분석 요약 (백엔드 분석 결과) */}
      {analysis && (analysis.summary || analysis.message) && (
        <div style={{ padding:'12px 14px', borderRadius:10, background:'linear-gradient(135deg, #E8F0FF, #F0F5FF)', border:'1px solid #1A56DB30' }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', marginBottom:6 }}>📊 AI 성적 분석</p>
          <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>
            {analysis.summary || analysis.message}
          </p>
          {analysis.trend && (
            <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:6 }}>
              추세: <strong>{analysis.trend}</strong>
            </p>
          )}
        </div>
      )}
      
      {/* 2. 과목별 최신 점수 */}
        <div>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
            📚 과목별 최신 점수
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {hasApiData ? (
            // 🆕 API 데이터: 과목별로 그룹화해서 가장 최근 것만 표시
            (() => {
                // 과목별로 가장 최근 성적만 추출
                const latestBySubject = {}
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
                
                return Object.values(latestBySubject).map((g, i) => {
                const color = SUBJECT_COLORS[g.subject] || '#1A56DB'
                return (
                    <SubjectBar 
                    key={i} 
                    subject={g.subject} 
                    score={g.score} 
                    color={color}
                    date={g.date}
                    />
                )
                })
            })()
            ) : (
            // mock 폴백
            SUBJECTS.map(subject => {
                const score = student.scores?.[subject] ?? 0
                const color = SUBJECT_COLORS[subject] || '#1A56DB'
                return (
                <SubjectBar key={subject} subject={subject} score={score} color={color} />
                )
            })
            )}
        </div>
        
        {/* 🆕 총 시험 기록 수 표시 */}
        {hasApiData && grades.length > 5 && (
            <p style={{ fontSize:10, color:'var(--color-text-muted)', marginTop:8, textAlign:'right' }}>
            총 {grades.length}개의 시험 기록이 있어요
            </p>
        )}
        </div>
      
      {/* 3. 성적 추이 그래프 (데이터 충분할 때만) */}
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
                <YAxis 
                  domain={[0,100]} 
                  tick={{ fontSize:10, fill:'#94A3B8' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} 
                  formatter={v => [`${v}점`]} 
                />
                <Line 
                  type="monotone" 
                  dataKey={d => d.score ?? d.totalScore ?? 0} 
                  stroke="#1A56DB" 
                  strokeWidth={2} 
                  dot={{ r:4, fill:'#1A56DB' }}
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
    </div>
  )
}

// 과목별 막대 컴포넌트 (재사용)
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
            height:'100%', 
            width:`${Math.min(score, 100)}%`, 
            background:color, 
            borderRadius:5,
            transition:'width 0.3s',
          }} />
        </div>
        <div style={{ width:60, textAlign:'right', flexShrink:0 }}>
          <p style={{ fontSize:13, fontWeight:700, color, lineHeight:1 }}>
            {score}점
          </p>
          {date && (
            <p style={{ fontSize:9, color:'var(--color-text-muted)', marginTop:2 }}>
              {date.slice(5)}  {/* "2026-05-15" → "05-15" */}
            </p>
          )}
        </div>
      </div>
    )
  }