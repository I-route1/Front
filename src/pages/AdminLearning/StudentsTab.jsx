import { useState, useEffect } from 'react'
import { analysisAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { STUDENTS } from './data/mockData'
import StudentDetail from './studentDetail/StudentDetail'

export default function StudentsTab() {
  const { user } = useAuth()
  const [search, setSearch]           = useState('')
  const [filterGrade, setFilterGrade] = useState('전체')
  const [filterClass, setFilterClass] = useState('전체')
  const [sortBy, setSortBy]           = useState('name')
  const [selectedId, setSelectedId]   = useState(null)
  
  // API 위험도 맵
  const [riskMap, setRiskMap] = useState({})
  
  // 전체 학생 위험도 일괄 조회
  useEffect(() => {
    if (!user?.id) return
    
    Promise.all(
      STUDENTS.map(s =>
        analysisAPI.getRiskAnalysis(String(s.id))
          .then(data => [s.id, data])
          .catch(() => [s.id, null])
      )
    ).then(entries => {
      const map = {}
      entries.forEach(([id, data]) => { if (data) map[id] = data })
      setRiskMap(map)
    })
  }, [user?.id])
  
  const GRADE_ORDER = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3']

  const grades = [
    '전체',
    ...[...new Set(STUDENTS.map(s => s.grade))]
      .sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b))
  ]
  // 결과: ['전체', '초5', '초6', '고1']
  const classes = ['전체', 'A반', 'B반', 'C반']
  
  // mock + API 위험도 병합
  const enrichedStudents = STUDENTS.map(s => ({
    ...s,
    risk: riskMap[s.id]?.atRisk ? 'high' : s.risk,
  }))
  
  const filtered = enrichedStudents
    .filter(s => filterGrade === '전체' || s.grade === filterGrade)
    .filter(s => filterClass === '전체' || s.class === filterClass)
    .filter(s => s.name.includes(search))
    .sort((a, b) => {
      if (sortBy === 'score') return b.avgScore - a.avgScore
      if (sortBy === 'risk')  return (b.risk === 'high' ? 1 : 0) - (a.risk === 'high' ? 1 : 0)
      return a.name.localeCompare(b.name, 'ko')
    })
  
  return (
    <div>
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)', padding: '24px 20px', color: 'white' }}>
        <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>총 {STUDENTS.length}명 등록</p>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>학생 관리</h2>
      </div>

      {/* 검색 */}
      <div style={{ margin: '16px 16px 0' }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setSelectedId(null) }}
          placeholder="🔍 학생 이름 검색"
          style={{
            width: '100%', padding: '11px 14px', borderRadius: 12,
            border: '1.5px solid var(--color-border)', background: 'var(--color-surface)',
            fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 학년 필터 */}
      <div style={{ margin: '10px 16px 0' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>학년</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {grades.map(g => (
            <button key={g} onClick={() => { setFilterGrade(g); setSelectedId(null) }} style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              background: filterGrade === g ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filterGrade === g ? 'white' : 'var(--color-text-muted)',
              border: filterGrade === g ? 'none' : '1px solid var(--color-border)',
              transition: 'all 0.15s',
            }}>{g}</button>
          ))}
        </div>
      </div>

      {/* 반 필터 + 정렬 */}
      <div style={{ margin: '10px 16px 0', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {classes.map(c => (
            <button key={c} onClick={() => { setFilterClass(c); setSelectedId(null) }} style={{
              flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
              background: filterClass === c ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filterClass === c ? 'white' : 'var(--color-text-muted)',
              border: filterClass === c ? 'none' : '1px solid var(--color-border)',
              transition: 'all 0.15s',
            }}>{c}</button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 8, border: '1px solid var(--color-border)',
            background: 'var(--color-surface)', fontSize: 12, fontFamily: 'inherit', outline: 'none',
          }}
        >
          <option value="name">이름순</option>
          <option value="score">성적순</option>
          <option value="risk">주의순</option>
        </select>
      </div>

      {/* 필터 결과 카운트 */}
      <div style={{ margin: '8px 16px 0' }}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {filterGrade !== '전체' || filterClass !== '전체'
            ? `${filterGrade !== '전체' ? filterGrade : ''} ${filterClass !== '전체' ? filterClass : ''} · `
            : '전체 · '}
          {filtered.length}명
        </p>
      </div>

      {/* 학생 리스트 */}
      <div style={{ margin: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            해당하는 학생이 없어요
          </div>
        )}
        {filtered.map(s => (
          <div key={s.id}>
            {/* 학생 카드 */}
            <div
              onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
              style={{
                background: 'var(--color-surface)', borderRadius: 14,
                border: `1.5px solid ${selectedId === s.id ? 'var(--color-primary)' : s.risk === 'high' ? '#FF3B3B40' : 'var(--color-border)'}`,
                padding: '13px 14px', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: s.risk === 'high' ? '#FF3B3B15' : 'var(--color-primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800,
                  color: s.risk === 'high' ? 'var(--color-danger)' : 'var(--color-primary)',
                }}>
                  {s.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{s.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: '#F0F4FF', color: 'var(--color-primary)' }}>{s.grade}</span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20, background: 'var(--color-surface-2)', color: 'var(--color-text-muted)' }}>{s.class}</span>
                    {s.risk === 'high' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#FF3B3B15', color: 'var(--color-danger)' }}>주의</span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: s.avgScore >= 80 ? 'var(--color-primary)' : s.avgScore < 70 ? 'var(--color-danger)' : 'var(--color-text-primary)' }}>
                    {s.avgScore}점
                  </p>
                  <p style={{ fontSize: 11, fontWeight: 700, marginTop: 1, color: s.trendVal > 0 ? 'var(--color-success)' : s.trendVal < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                    {s.trendVal > 0 ? `▲${s.trendVal}` : s.trendVal < 0 ? `▼${Math.abs(s.trendVal)}` : '→'}
                  </p>
                </div>
              </div>
            </div>

            {/* 상세 펼침 - 5탭 구조 */}
            {selectedId === s.id && (
              <div style={{
                background: 'var(--color-surface-2)',
                borderRadius: '0 0 14px 14px',
                border: '1.5px solid var(--color-primary)',
                borderTop: 'none',
                padding: 16,
                marginTop: -4,
              }}>
                <StudentDetail student={s} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 24 }} />
    </div>
  )
}