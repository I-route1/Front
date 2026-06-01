import { useState, useEffect } from 'react'
import { analysisAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { STUDENTS, SUBJECT_COLORS, SUBJECTS } from './data/mockData'

export default function OverviewTab() {
  const { user } = useAuth()
  const [filterGrade, setFilterGrade] = useState('전체')
  const [filterClass, setFilterClass] = useState('전체')
  const [apiRiskStudents, setApiRiskStudents] = useState([])

  useEffect(() => {
    if (!user?.id) return
    const stringIds = STUDENTS.map(s => s.id).filter(id => typeof id === 'string')
    Promise.allSettled(stringIds.map(id => analysisAPI.getRiskAnalysis(id)))
      .then(results => {
        const risks = results
          .filter(r => r.status === 'fulfilled' && r.value?.atRisk)
          .map(r => r.value)
        setApiRiskStudents(risks)
      })
      .catch(e => console.error('위험 학생 조회 실패:', e))
  }, [user?.id])

  const grades  = ['전체', '초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3']
  const classes = ['전체', 'A반', 'B반', 'C반']

  // 필터 적용된 학생 목록
  const filtered = STUDENTS
    .filter(s => filterGrade === '전체' || s.grade === filterGrade)
    .filter(s => filterClass === '전체' || s.class === filterClass)

  // 필터 기반 통계 자동 계산
  const totalStudents = filtered.length
  const avgScore = totalStudents
    ? Math.round(filtered.reduce((a, s) => a + s.avgScore, 0) / totalStudents)
    : 0
  const topCount  = filtered.filter(s => s.avgScore >= 80).length
  const riskCount = filtered.filter(s => s.risk === 'high').length
  const riskStudents = filtered.filter(s => s.risk === 'high')

  // 과목별 평균 계산
  const subjectAvg = SUBJECTS.map(sub => ({
    subject: sub,
    avg: totalStudents
      ? Math.round(filtered.reduce((a, s) => a + s.scores[sub], 0) / totalStudents)
      : 0,
    color: SUBJECT_COLORS[sub],
  }))

  // 등급 분포 계산
  const getGrade = (score) => {
    if (score >= 96) return '1등급'
    if (score >= 89) return '2등급'
    if (score >= 77) return '3등급'
    if (score >= 60) return '4등급'
    return '5등급'
  }
  const gradeDist = ['1등급','2등급','3등급','4등급','5등급'].map((g, i) => ({
    grade: g,
    count: filtered.filter(s => getGrade(s.avgScore) === g).length,
    color: ['#1A56DB','#00C49A','#FFB800','#FF6B35','#FF3B3B'][i],
  }))

  // 반별 평균
  const classAvgs = ['A반','B반','C반'].map(cls => {
    const students = filtered.filter(s => s.class === cls)
    return {
      cls,
      avg: students.length
        ? Math.round(students.reduce((a, s) => a + s.avgScore, 0) / students.length)
        : 0,
      count: students.length,
      color: { 'A반':'#1A56DB', 'B반':'#00C49A', 'C반':'#9B59B6' }[cls],
    }
  }).filter(c => c.count > 0)  // 학생 없는 반은 숨김

  const filterLabel = [
    filterGrade !== '전체' ? filterGrade : '',
    filterClass !== '전체' ? filterClass : '',
  ].filter(Boolean).join(' ') || '전체'

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>스마트 학원 관리자</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>학원 전체 현황</h2>
      </div>

      {/* 학년 필터 */}
      <div style={{ margin:'16px 16px 0' }}>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', marginBottom:6 }}>학년</p>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {grades.map(g => (
            <button key={g} onClick={() => setFilterGrade(g)} style={{
              padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600,
              background: filterGrade===g ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filterGrade===g ? 'white' : 'var(--color-text-muted)',
              border: filterGrade===g ? 'none' : '1px solid var(--color-border)',
              transition:'all 0.15s',
            }}>{g}</button>
          ))}
        </div>
      </div>

      {/* 반 필터 */}
      <div style={{ margin:'10px 16px 0' }}>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', marginBottom:6 }}>반</p>
        <div style={{ display:'flex', gap:6 }}>
          {classes.map(c => (
            <button key={c} onClick={() => setFilterClass(c)} style={{
              flex:1, padding:'7px 4px', borderRadius:8, cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:600,
              background: filterClass===c ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filterClass===c ? 'white' : 'var(--color-text-muted)',
              border: filterClass===c ? 'none' : '1px solid var(--color-border)',
              transition:'all 0.15s',
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* 통계 카드 — 필터 연동 */}
      <div style={{ margin:'12px 16px 0' }}>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-muted)', marginBottom:8 }}>
          📊 {filterLabel} 통계
        </p>
        {totalStudents === 0 ? (
          <div style={{ padding:'24px', textAlign:'center', background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', color:'var(--color-text-muted)', fontSize:13 }}>
            해당하는 학생이 없어요
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
            {[
              { label:'학생 수',          value:`${totalStudents}명`,  icon:'👥', bg:'#F0F4FF', color:'var(--color-primary)' },
              { label:'평균 점수',         value:`${avgScore}점`,       icon:'📊', bg:'#E8F8F4', color:'var(--color-success)' },
              { label:'우수 학생 (80↑)',   value:`${topCount}명`,       icon:'🏆', bg:'#FFFBEA', color:'#8A6500' },
              { label:'주의 학생',         value:`${riskCount}명`,      icon:'⚠️', bg:'#FFF5F5', color:'var(--color-danger)' },
            ].map(c => (
              <div key={c.label} style={{ background:c.bg, borderRadius:14, padding:'14px', border:`1px solid ${c.color}20` }}>
                <p style={{ fontSize:11, color:c.color, opacity:0.8, marginBottom:4 }}>{c.icon} {c.label}</p>
                <p style={{ fontSize:24, fontWeight:800, color:c.color }}>{c.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 주의 학생 알림 */}
      {riskStudents.length > 0 && (
        <div style={{ margin:'12px 16px 0' }}>
          <div style={{ background:'#FFF5F5', borderRadius:16, border:'1px solid #FF3B3B30', padding:16 }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--color-danger)', marginBottom:12 }}>⚠️ 상담 필요 학생</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {riskStudents.map(s => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, background:'white', border:'1px solid #FF3B3B20' }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'#FF3B3B15', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'var(--color-danger)' }}>
                    {s.name[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <p style={{ fontSize:13, fontWeight:700 }}>{s.name}</p>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20, background:'#F0F4FF', color:'var(--color-primary)' }}>{s.grade}</span>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20, background:'var(--color-surface-2)', color:'var(--color-text-muted)' }}>{s.class}</span>
                    </div>
                    <p style={{ fontSize:11, color:'var(--color-danger)', marginTop:2 }}>
                      평균 {s.avgScore}점 · {s.trendVal}점 하락
                    </p>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20, background:'#FF3B3B15', color:'var(--color-danger)' }}>상담 필요</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 과목별 평균 — 필터 연동 */}
      {totalStudents > 0 && (
        <div style={{ margin:'12px 16px 0' }}>
          <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
            <p style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>📚 과목별 평균 점수</p>
            <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>{filterLabel} 기준</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={subjectAvg} margin={{ top:4, right:8, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize:12, fill:'#4A5568' }} />
                <YAxis domain={[0,100]} tick={{ fontSize:11, fill:'#94A3B8' }} />
                <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={v => [`${v}점`, '평균']} />
                <Bar dataKey="avg" radius={[6,6,0,0]}>
                  {subjectAvg.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 등급 분포 — 필터 연동 */}
      {totalStudents > 0 && (
        <div style={{ margin:'12px 16px 0' }}>
          <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
            <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🎯 성적 등급 분포</p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {gradeDist.map(g => (
                <div key={g.grade} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:12, fontWeight:700, width:40, color:g.color }}>{g.grade}</span>
                  <div style={{ flex:1, height:10, background:'var(--color-surface-2)', borderRadius:5, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${totalStudents ? (g.count/totalStudents)*100 : 0}%`, background:g.color, borderRadius:5, transition:'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:g.color, width:20, textAlign:'right' }}>{g.count}명</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 반별 평균 — 학년 필터 연동 (전체반 선택 시만 표시) */}
      {totalStudents > 0 && filterClass === '전체' && (
        <div style={{ margin:'12px 16px 16px' }}>
          <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
            <p style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>🏫 반별 평균 비교</p>
            <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>
              {filterGrade !== '전체' ? `${filterGrade} 기준` : '전체 학년 기준'}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {classAvgs.map(c => (
                <div key={c.cls} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontSize:12, fontWeight:700, width:28, color:c.color }}>{c.cls}</span>
                  <div style={{ flex:1, height:10, background:'var(--color-surface-2)', borderRadius:5, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${c.avg}%`, background:c.color, borderRadius:5, transition:'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:c.color, width:36, textAlign:'right' }}>{c.avg}점</span>
                  <span style={{ fontSize:11, color:'var(--color-text-muted)', width:24 }}>{c.count}명</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ height:24 }} />
    </div>
  )
}