import { useState, useMemo, useEffect } from 'react'
import { gradesAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import {
  SUBJECTS, EXAM_TYPES, EXAM_TYPE_MOCK, SUBJECT_COLORS,
  INIT_TREND, WRONG_TYPES,
  getGrade, getPercentile,
} from './data/mockData'
import { calcMockExamScores } from './utils/mockExamScoring'

export default function GradeTab({ studentId: propStudentId, selectedChild }) {
  const { user } = useAuth()
  const gradeKey = selectedChild?.gradeStudentId ?? String(propStudentId ?? user?.id ?? '')
  useEffect(() => {
    if (!gradeKey) return
    gradesAPI.getGrades(gradeKey)
      .then(data => {
        if (!data || data.length === 0) return
        // 날짜별로 그룹핑해서 trendData 형식으로 변환
        const grouped = {}
        data.forEach(g => {
          const d = new Date(g.examDate)
          const label = `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}`
          if (!grouped[label]) {
            grouped[label] = { date: label, 국어:0, 수학:0, 영어:0, 사회:0, 과학:0 }
          }
          grouped[label][g.subject] = g.score
        })
        const trend = Object.values(grouped).sort((a,b) => a.date.localeCompare(b.date))
        if (trend.length > 0) setTrendData(trend)
      })
      .catch(e => console.error('성적 조회 실패:', e))
    }, [gradeKey])

  const [trendData, setTrendData] = useState(INIT_TREND)
  const [showForm, setShowForm]   = useState(false)
  const [examType, setExamType]   = useState('중간고사')
  const [examDate, setExamDate]   = useState('')
  const [scores, setScores]       = useState({ 국어:'', 수학:'', 영어:'', 사회:'', 과학:'' })
  const [activeSubs, setActiveSubs] = useState(['국어','수학','영어'])
  const [saveMsg, setSaveMsg]     = useState('')

  const latest = trendData[trendData.length - 1]
  const prev   = trendData[trendData.length - 2] ?? latest
  const isLatestMock = latest.examType === EXAM_TYPE_MOCK

  const mockPreview = useMemo(() => {
    if (examType !== EXAM_TYPE_MOCK) return {}
    const raw = {}
    SUBJECTS.forEach(s => {
      if (scores[s] !== '' && !Number.isNaN(Number(scores[s]))) raw[s] = scores[s]
    })
    return calcMockExamScores(raw)
  }, [examType, scores])

  const reportData = useMemo(() => SUBJECTS.map(s => {
    const mock = latest.mockMeta?.[s]
    if (mock) {
      const prevMock = prev.mockMeta?.[s]
      return {
        subject: s,
        score: mock.raw,
        displayScore: `${mock.raw}점 (표준 ${mock.standard})`,
        prev: prevMock?.raw ?? prev[s],
        percentile: mock.percentile,
        grade: mock.gradeLabel,
        standard: mock.standard,
        isMock: true,
      }
    }
    return {
      subject: s,
      score: latest[s],
      displayScore: `${latest[s]}점`,
      prev: prev[s],
      percentile: getPercentile(latest[s]),
      grade: getGrade(latest[s]),
      isMock: false,
    }
  }), [latest, prev])

  const radarData = useMemo(() => SUBJECTS.map(s => {
    const vals = trendData.map(d => d[s]).filter(v => v && v > 0)
    const subjectAvg = vals.length > 0
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 72
    return { subject: s, score: latest[s], avg: subjectAvg }
  }), [latest, trendData])

  const totalAvg  = Math.round(SUBJECTS.reduce((a,s) => a + latest[s], 0) / SUBJECTS.length)
  const mockAvgStandard = isLatestMock && latest.mockMeta
    ? Math.round(
        Object.values(latest.mockMeta).reduce((a, m) => a + m.standard, 0)
        / Object.keys(latest.mockMeta).length,
      )
    : null
  const bestSub   = SUBJECTS.reduce((a,s) => latest[s] > latest[a] ? s : a)
  const worstSub  = SUBJECTS.reduce((a,s) => latest[s] < latest[a] ? s : a)
  const bestMock  = isLatestMock && latest.mockMeta
    ? Object.entries(latest.mockMeta).reduce((best, [sub, m]) =>
        !best || m.percentile > best.percentile ? { sub, ...m } : best, null)
    : null
  const worstMock = isLatestMock && latest.mockMeta
    ? Object.entries(latest.mockMeta).reduce((worst, [sub, m]) =>
        !worst || m.percentile < worst.percentile ? { sub, ...m } : worst, null)
    : null

    const handleSave = async () => {
      const filled = SUBJECTS.filter(s => scores[s] !== '' && !isNaN(Number(scores[s])))
      if (!examDate || filled.length === 0) {
        setSaveMsg('날짜와 점수를 하나 이상 입력해 주세요')
        return
      }
    
      const d = new Date(examDate)
      const label = `${String(d.getFullYear()).slice(2)}.${String(d.getMonth()+1).padStart(2,'0')}`
      const newEntry = { ...latest, date: label, examType }
    
      if (examType === EXAM_TYPE_MOCK) {
        const rawInput = Object.fromEntries(filled.map(s => [s, scores[s]]))
        const mockMeta = calcMockExamScores(rawInput)
        if (Object.keys(mockMeta).length === 0) {
          setSaveMsg('모의고사 원점수를 확인해 주세요')
          return
        }
        filled.forEach(s => { newEntry[s] = mockMeta[s].raw })
        newEntry.mockMeta = mockMeta
      } else {
        delete newEntry.mockMeta
        filled.forEach(s => { newEntry[s] = Number(scores[s]) })
      }
    
      // ── 실제 API 저장 ──────────────────────────
      try {
        for (const s of filled) {
          await gradesAPI.postGrade({
            studentId: gradeKey,
            subject: s,
            score: examType === EXAM_TYPE_MOCK
              ? Number(scores[s])
              : Number(scores[s]),
            gradeLevel: (() => { const m = (selectedChild?.grade ?? '').match(/(\d+)/); return m ? Number(m[1]) : 1 })(),
            examType: examType === '중간고사' ? '중간'
              : examType === '기말고사' ? '기말'
              : '모의고사',
            examDate: examDate,
          })
        }
      } catch (e) {
        console.error('성적 저장 실패:', e)
        setSaveMsg('❌ 저장 실패: ' + e.message)
        return
      }
    
      setTrendData(prev => {
        const idx = prev.findIndex(d => d.date === label)
        if (idx !== -1) {
          const updated = [...prev]
          updated[idx] = newEntry
          return updated
        }
        return [...prev, newEntry]
      })
    
      setSaveMsg(
        examType === EXAM_TYPE_MOCK
          ? '✓ 모의고사 성적이 산출·반영되었습니다 (표준점수·백분위·9등급)'
          : '✓ 성적이 반영되었습니다!',
      )
      setTimeout(() => setSaveMsg(''), 2500)
      setShowForm(false)
      setScores({ 국어:'', 수학:'', 영어:'', 사회:'', 과학:'' })
      setExamDate('')
    }

  const toggleSub = (s) =>
    setActiveSubs(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s])

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)', padding:'24px 20px', color:'white' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
          <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>{selectedChild?.name ?? user?.name ?? '학생'} · {selectedChild?.grade ?? ''}</p>
            <h2 style={{ fontSize:20, fontWeight:800 }}>성적 관리</h2>
          </div>
          <button onClick={() => setShowForm(p=>!p)} style={{
            padding:'9px 16px', borderRadius:10, border:'none', cursor:'pointer',
            background: showForm ? 'rgba(255,255,255,0.2)' : 'white',
            color: showForm ? 'white' : 'var(--color-primary)',
            fontSize:13, fontWeight:700, fontFamily:'inherit',
          }}>{showForm ? '✕ 닫기' : '+ 성적 입력'}</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:20 }}>
          {(isLatestMock ? [
            ['평균 표준점수', `${mockAvgStandard}점`, '모의고사 기준'],
            ['최고 과목', `${bestMock?.sub} ${bestMock?.percentile}%`, bestMock?.gradeLabel ?? ''],
            ['최저 과목', `${worstMock?.sub} ${worstMock?.percentile}%`, worstMock?.gradeLabel ?? ''],
          ] : [
            ['전체 평균', `${totalAvg}점`, ''],
            ['최고 과목', `${bestSub} ${latest[bestSub]}`, getGrade(latest[bestSub])],
            ['최저 과목', `${worstSub} ${latest[worstSub]}`, getGrade(latest[worstSub])],
          ]).map(([k,v,s]) => (
            <div key={k} style={{ background:'rgba(255,255,255,0.12)', borderRadius:12, padding:'12px 10px', border:'1px solid rgba(255,255,255,0.15)', textAlign:'center' }}>
              <p style={{ fontSize:10, opacity:0.65 }}>{k}</p>
              <p style={{ fontSize:14, fontWeight:800, marginTop:3 }}>{v}</p>
              <p style={{ fontSize:10, opacity:0.7, marginTop:2 }}>{s}</p>
            </div>
          ))}
        </div>

        {saveMsg && (
          <div style={{ marginTop:12, padding:'10px 14px', background:'rgba(0,196,154,0.25)', borderRadius:10, border:'1px solid rgba(0,196,154,0.4)', fontSize:13, fontWeight:600 }}>
            {saveMsg}
          </div>
        )}
      </div>

      {/* 성적 입력 폼 */}
      {showForm && (
        <div style={{ margin:'16px 16px 0', background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--color-border)' }}>
            <p style={{ fontSize:14, fontWeight:700 }}>📝 성적 입력</p>
          </div>
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
            <div>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:8 }}>시험 종류</p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {EXAM_TYPES.map(t => (
                  <button key={t} onClick={() => setExamType(t)} style={{
                    flex:'1 1 30%', minWidth:72, padding:'8px 4px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
                    border:`1.5px solid ${examType===t ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: examType===t ? 'var(--color-primary-light)' : 'transparent',
                    color: examType===t ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontSize:12, fontWeight:600, transition:'all 0.15s',
                  }}>{t}</button>
                ))}
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">시행 일자</label>
              <input type="date" className="input-field" value={examDate}
                onChange={e => setExamDate(e.target.value)} />
            </div>

            {examType === EXAM_TYPE_MOCK && (
              <div style={{
                padding:'12px 14px', borderRadius:10,
                background:'#F0F4FF', border:'1px solid #1A56DB25',
                fontSize:11, color:'var(--color-text-secondary)', lineHeight:1.55,
              }}>
                <p style={{ fontWeight:700, color:'var(--color-primary)', marginBottom:4 }}>모의고사 산출 방식 (평가원 기준)</p>
                <p>① 표준점수 = 50 + 10×(원점수−평균)/표준편차</p>
                <p>② 백분위 = 정규분포 누적확률(표준점수)</p>
                <p>③ 9등급 = 백분위 구간 (1등급 96% 이상 … 9등급 4% 미만)</p>
              </div>
            )}

            <div>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:8 }}>
                {examType === EXAM_TYPE_MOCK ? '과목별 원점수' : '과목별 점수'}
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {SUBJECTS.map(s => {
                  const preview = mockPreview[s]
                  return (
                    <div key={s}>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:SUBJECT_COLORS[s]+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:SUBJECT_COLORS[s] }}>{s}</span>
                        <input
                          type="number" min={0} max={100}
                          className="input-field"
                          placeholder={examType === EXAM_TYPE_MOCK ? '원점수 입력' : `현재 ${latest[s]}점`}
                          value={scores[s]}
                          onChange={e => setScores(p => ({ ...p, [s]: e.target.value }))}
                          style={{ flex:1 }}
                        />
                        {examType !== EXAM_TYPE_MOCK && scores[s] !== '' && !isNaN(Number(scores[s])) && (
                          <span style={{
                            fontSize:11, fontWeight:700, flexShrink:0,
                            color: Number(scores[s]) > latest[s] ? 'var(--color-success)' : Number(scores[s]) < latest[s] ? 'var(--color-danger)' : 'var(--color-text-muted)',
                          }}>
                            {Number(scores[s]) > latest[s] ? `▲${Number(scores[s])-latest[s]}` : Number(scores[s]) < latest[s] ? `▼${latest[s]-Number(scores[s])}` : '-'}
                          </span>
                        )}
                      </div>
                      {preview && (
                        <div style={{
                          marginTop:6, marginLeft:48, padding:'8px 10px', borderRadius:8,
                          background:'var(--color-surface-2)', fontSize:11,
                          display:'flex', flexWrap:'wrap', gap:'6px 12px',
                        }}>
                          <span>표준 <b style={{ color:SUBJECT_COLORS[s] }}>{preview.standard}</b></span>
                          <span>백분위 <b style={{ color:SUBJECT_COLORS[s] }}>{preview.percentile}%</b></span>
                          <span style={{ fontWeight:700, color:SUBJECT_COLORS[s] }}>{preview.gradeLabel}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <button onClick={handleSave} style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none',
              background:'var(--color-primary)', color:'white', fontSize:15, fontWeight:700,
              fontFamily:'inherit', cursor:'pointer', boxShadow:'0 4px 12px rgba(26,86,219,0.3)',
            }}>저장하고 반영하기</button>
          </div>
        </div>
      )}

      {/* 추이 그래프 */}
      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ fontSize:14, fontWeight:700 }}>📈 성적 추이</p>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
              {SUBJECTS.map(s => (
                <button key={s} onClick={() => toggleSub(s)} style={{
                  padding:'3px 9px', borderRadius:20, border:'none', cursor:'pointer',
                  fontFamily:'inherit', fontSize:11, fontWeight:600,
                  background: activeSubs.includes(s) ? SUBJECT_COLORS[s]+'20' : 'var(--color-surface-2)',
                  color: activeSubs.includes(s) ? SUBJECT_COLORS[s] : 'var(--color-text-muted)',
                  outline: activeSubs.includes(s) ? `1.5px solid ${SUBJECT_COLORS[s]}` : 'none',
                }}>{s}</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top:4, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'#94A3B8' }} />
              <YAxis domain={[40,100]} tick={{ fontSize:11, fill:'#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={(v,n) => [`${v}점`, n]} />
              {SUBJECTS.filter(s => activeSubs.includes(s)).map(s => (
                <Line key={s} type="monotone" dataKey={s} stroke={SUBJECT_COLORS[s]} strokeWidth={2.5}
                  dot={{ r:4, fill:SUBJECT_COLORS[s] }} activeDot={{ r:6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 레이더 차트 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>🎯 전체 평균 대비 나의 위치</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:8 }}>최근 시험 기준</p>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:12, fill:'#4A5568' }} />
              <Radar name="나" dataKey="score" stroke="#1A56DB" fill="#1A56DB" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="전체평균" dataKey="avg" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Tooltip formatter={v => `${v}점`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 과목별 리포트 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📋 과목별 분석 리포트</p>
          {isLatestMock && (
            <p style={{ fontSize:11, color:'var(--color-text-muted)', marginBottom:12 }}>
              최근 모의고사 · 평가원 방식 산출 (표준점수·백분위·9등급)
            </p>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {reportData.map(r => {
              const diff = r.score - r.prev
              return (
                <div key={r.subject} style={{ padding:'12px 14px', borderRadius:12, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:32, height:32, borderRadius:8, background:SUBJECT_COLORS[r.subject]+'18', color:SUBJECT_COLORS[r.subject], fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{r.subject}</span>
                      <div>
                        {r.isMock ? (
                          <>
                            <span style={{ fontSize:15, fontWeight:800 }}>원점수 {r.score}점</span>
                            <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:2 }}>표준점수 {r.standard}</p>
                          </>
                        ) : (
                          <span style={{ fontSize:15, fontWeight:800 }}>{r.score}점</span>
                        )}
                        <span style={{ fontSize:12, fontWeight:600, marginLeft:6, color: diff>0 ? 'var(--color-success)' : diff<0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                          {diff>0 ? `▲${diff}` : diff<0 ? `▼${Math.abs(diff)}` : '-'}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20, background:SUBJECT_COLORS[r.subject]+'18', color:SUBJECT_COLORS[r.subject] }}>{r.grade}</span>
                  </div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>백분위</span>
                      <span style={{ fontSize:11, fontWeight:600, color:SUBJECT_COLORS[r.subject] }}>{r.percentile}%</span>
                    </div>
                    <div style={{ height:6, background:'var(--color-border)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${r.percentile}%`, background:SUBJECT_COLORS[r.subject], borderRadius:3 }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 오답 유형 */}
      <div style={{ margin:'12px 16px 16px' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>❌ 주요 오답 유형</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {WRONG_TYPES.map((w,i) => (
              <div key={w.type} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'var(--color-text-muted)', width:16, textAlign:'center' }}>{i+1}</span>
                <span style={{ fontSize:13, fontWeight:600, width:72, flexShrink:0 }}>{w.type}</span>
                <div style={{ flex:1, height:8, background:'var(--color-surface-2)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${(w.count/WRONG_TYPES[0].count)*100}%`, background:w.color, borderRadius:4 }} />
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:w.color, width:28, textAlign:'right' }}>{w.count}건</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}