import { useState } from 'react'
import { STUDENTS, SUBJECTS, SUBJECT_COLORS, AI_REPORTS } from './data/mockData'

export default function StudentsTab() {
    const [search, setSearch]         = useState('')
    const [filterGrade, setFilterGrade] = useState('전체')  // ← 학년 추가
    const [filterClass, setFilterClass] = useState('전체')
    const [sortBy, setSortBy]         = useState('name')
    const [selectedId, setSelectedId] = useState(null)
    const [loadingReport, setLoadingReport] = useState(false)
    const [showReport, setShowReport] = useState(null)
  
    // 학년/반 목록 동적 생성
    const grades  = ['전체', ...new Set(STUDENTS.map(s => s.grade))].sort()
    const classes = ['전체', 'A반', 'B반', 'C반']
  
    const filtered = STUDENTS
      .filter(s => filterGrade === '전체' || s.grade === filterGrade)
      .filter(s => filterClass === '전체' || s.class === filterClass)
      .filter(s => s.name.includes(search))
      .sort((a, b) => {
        if (sortBy === 'score') return b.avgScore - a.avgScore
        if (sortBy === 'risk')  return (b.risk === 'high' ? 1 : 0) - (a.risk === 'high' ? 1 : 0)
        return a.name.localeCompare(b.name, 'ko')
      })
  
    const handleAIReport = async (studentId) => {
      setLoadingReport(true)
      setShowReport(null)
      await new Promise(r => setTimeout(r, 1800))
      setShowReport(AI_REPORTS[studentId] || null)
      setLoadingReport(false)
    }
  
    return (
      <div>
        {/* 헤더 */}
        <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)', padding:'24px 20px', color:'white' }}>
          <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>총 {STUDENTS.length}명 등록</p>
          <h2 style={{ fontSize:20, fontWeight:800 }}>학생 관리</h2>
        </div>
  
        {/* 검색 */}
        <div style={{ margin:'16px 16px 0' }}>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedId(null); setShowReport(null) }}
            placeholder="🔍 학생 이름 검색"
            style={{
              width:'100%', padding:'11px 14px', borderRadius:12,
              border:'1.5px solid var(--color-border)', background:'var(--color-surface)',
              fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box',
            }}
          />
        </div>
  
        {/* 학년 필터 */}
        <div style={{ margin:'10px 16px 0' }}>
          <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', marginBottom:6 }}>학년</p>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {grades.map(g => (
              <button key={g} onClick={() => { setFilterGrade(g); setSelectedId(null); setShowReport(null) }} style={{
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
  
        {/* 반 필터 + 정렬 */}
        <div style={{ margin:'10px 16px 0', display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ display:'flex', gap:6, flex:1 }}>
            {classes.map(c => (
              <button key={c} onClick={() => { setFilterClass(c); setSelectedId(null); setShowReport(null) }} style={{
                flex:1, padding:'7px 4px', borderRadius:8, cursor:'pointer',
                fontFamily:'inherit', fontSize:12, fontWeight:600,
                background: filterClass===c ? 'var(--color-primary)' : 'var(--color-surface)',
                color: filterClass===c ? 'white' : 'var(--color-text-muted)',
                border: filterClass===c ? 'none' : '1px solid var(--color-border)',
                transition:'all 0.15s',
              }}>{c}</button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              padding:'7px 10px', borderRadius:8, border:'1px solid var(--color-border)',
              background:'var(--color-surface)', fontSize:12, fontFamily:'inherit', outline:'none',
            }}
          >
            <option value="name">이름순</option>
            <option value="score">성적순</option>
            <option value="risk">주의순</option>
          </select>
        </div>
  
        {/* 필터 결과 카운트 */}
        <div style={{ margin:'8px 16px 0' }}>
          <p style={{ fontSize:12, color:'var(--color-text-muted)' }}>
            {filterGrade !== '전체' || filterClass !== '전체'
              ? `${filterGrade !== '전체' ? filterGrade : ''} ${filterClass !== '전체' ? filterClass : ''} · `
              : '전체 · '}
            {filtered.length}명
          </p>
        </div>
  
        {/* 학생 리스트 */}
        <div style={{ margin:'8px 16px 0', display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0', color:'var(--color-text-muted)', fontSize:13 }}>
              해당하는 학생이 없어요
            </div>
          )}
          {filtered.map(s => (
            <div key={s.id}>
              {/* 학생 카드 */}
              <div
                onClick={() => {
                  if (selectedId === s.id) { setSelectedId(null); setShowReport(null) }
                  else { setSelectedId(s.id); setShowReport(null) }
                }}
                style={{
                  background:'var(--color-surface)', borderRadius:14,
                  border:`1.5px solid ${selectedId===s.id ? 'var(--color-primary)' : s.risk==='high' ? '#FF3B3B40' : 'var(--color-border)'}`,
                  padding:'13px 14px', cursor:'pointer', transition:'all 0.15s',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {/* 아바타 */}
                  <div style={{
                    width:40, height:40, borderRadius:12, flexShrink:0,
                    background: s.risk==='high' ? '#FF3B3B15' : 'var(--color-primary-light)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:16, fontWeight:800,
                    color: s.risk==='high' ? 'var(--color-danger)' : 'var(--color-primary)',
                  }}>
                    {s.name[0]}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:14, fontWeight:700 }}>{s.name}</span>
                      {/* 학년 뱃지 추가 */}
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20, background:'#F0F4FF', color:'var(--color-primary)' }}>{s.grade}</span>
                      <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20, background:'var(--color-surface-2)', color:'var(--color-text-muted)' }}>{s.class}</span>
                      {s.risk === 'high' && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:20, background:'#FF3B3B15', color:'var(--color-danger)' }}>주의</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontSize:18, fontWeight:800, color: s.avgScore>=80 ? 'var(--color-primary)' : s.avgScore<70 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                      {s.avgScore}점
                    </p>
                    <p style={{ fontSize:11, fontWeight:700, marginTop:1, color: s.trendVal>0 ? 'var(--color-success)' : s.trendVal<0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                      {s.trendVal>0 ? `▲${s.trendVal}` : s.trendVal<0 ? `▼${Math.abs(s.trendVal)}` : '→'}
                    </p>
                  </div>
                </div>
              </div>
  
              {/* 상세 펼침 */}
              {selectedId === s.id && (
                <div style={{ background:'var(--color-surface-2)', borderRadius:'0 0 14px 14px', border:'1.5px solid var(--color-primary)', borderTop:'none', padding:16, marginTop:-4 }}>
  
                  {/* 과목별 점수 */}
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:10 }}>과목별 점수</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                    {SUBJECTS.map(sub => (
                      <div key={sub} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ width:28, height:28, borderRadius:7, flexShrink:0, background:SUBJECT_COLORS[sub]+'18', color:SUBJECT_COLORS[sub], fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{sub}</span>
                        <div style={{ flex:1, height:8, background:'var(--color-border)', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${s.scores[sub]}%`, background:SUBJECT_COLORS[sub], borderRadius:4 }} />
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:SUBJECT_COLORS[sub], width:32, textAlign:'right' }}>{s.scores[sub]}점</span>
                      </div>
                    ))}
                  </div>
  
                  {/* AI 분석 리포트 버튼 */}
                  {!showReport && (
                    <button
                      onClick={() => handleAIReport(s.id)}
                      disabled={loadingReport}
                      style={{
                        width:'100%', padding:'12px', borderRadius:10, border:'none',
                        background: loadingReport ? 'var(--color-text-muted)' : 'linear-gradient(90deg, #1A56DB, #00C49A)',
                        color:'white', fontSize:13, fontWeight:700, fontFamily:'inherit',
                        cursor: loadingReport ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {loadingReport ? '🤖 AI 분석 중...' : '🤖 AI 분석 리포트 생성'}
                    </button>
                  )}
  
                  {/* AI 리포트 결과 */}
                  {showReport && (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--color-primary-light)', border:'1px solid #1A56DB30' }}>
                        <p style={{ fontSize:12, fontWeight:700, color:'var(--color-primary)', marginBottom:6 }}>🤖 AI 종합 분석</p>
                        <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>{showReport.summary}</p>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <div style={{ padding:'10px 12px', borderRadius:10, background:'#D1FAF015', border:'1px solid #00C49A30' }}>
                          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-success)', marginBottom:4 }}>💪 강점</p>
                          <p style={{ fontSize:12, color:'var(--color-text-primary)' }}>{showReport.strong}</p>
                        </div>
                        <div style={{ padding:'10px 12px', borderRadius:10, background:'#FFE9E915', border:'1px solid #FF3B3B30' }}>
                          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-danger)', marginBottom:4 }}>📌 보완 필요</p>
                          <p style={{ fontSize:12, color:'var(--color-text-primary)' }}>{showReport.weak}</p>
                        </div>
                      </div>
                      <div style={{ padding:'10px 12px', borderRadius:10, background:'#FFF8E0', border:'1px solid #FFB80030' }}>
                        <p style={{ fontSize:11, fontWeight:700, color:'#8A6500', marginBottom:4 }}>📋 추천 조치</p>
                        <p style={{ fontSize:12, color:'var(--color-text-primary)' }}>{showReport.recommend}</p>
                      </div>
                      <button
                        onClick={() => setShowReport(null)}
                        style={{
                          width:'100%', padding:'10px', borderRadius:10, border:'1px solid var(--color-border)',
                          background:'transparent', color:'var(--color-text-muted)', fontSize:12,
                          fontWeight:600, fontFamily:'inherit', cursor:'pointer',
                        }}
                      >
                        리포트 닫기
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ height:24 }} />
      </div>
    )
  }