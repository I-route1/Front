import { useState, useMemo, useEffect, useCallback } from 'react'
import { gradesAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from 'recharts'
import {
  SUBJECTS, EXAM_TYPES, EXAM_TYPE_MOCK, SUBJECT_COLORS,
  getGrade,
} from './data/mockData'
import { calcMockExamScores } from './utils/mockExamScoring'
import { normalizeGrades, summarizeGrades, gradeHeadline } from '@/utils/gradeSummary'

export default function GradeTab({ studentId: propStudentId, selectedChild }) {
  const { user } = useAuth()
  const gradeKey = propStudentId ?? selectedChild?.studentId ?? selectedChild?.id ?? user?.id
  const [records, setRecords] = useState([])
  const [loadState, setLoadState] = useState('loading') // loading | ready | error
  const [showForm, setShowForm]   = useState(false)
  const [examType, setExamType]   = useState('중간고사')
  const [examDate, setExamDate]   = useState('')
  const [scores, setScores]       = useState({ 국어:'', 수학:'', 영어:'', 사회:'', 과학:'' })
  const [activeSubs, setActiveSubs] = useState(['국어','수학','영어'])
  const [saveMsg, setSaveMsg]     = useState('')
  const [saving, setSaving]       = useState(false)

  // 성적이 없는 학생에게 예시 점수를 보여주지 않는다: 실제 기록만 쓴다.
  const loadGrades = useCallback(() => {
    if (!gradeKey) { setRecords([]); setLoadState('ready'); return () => {} }
    let cancelled = false
    setLoadState('loading')
    gradesAPI.getGrades(gradeKey)
      .then(data => { if (!cancelled) { setRecords(normalizeGrades(data)); setLoadState('ready') } })
      .catch(e => { console.error('성적 조회 실패:', e); if (!cancelled) setLoadState('error') })
    return () => { cancelled = true }
  }, [gradeKey])

  useEffect(() => {
    setShowForm(false)
    setScores({ 국어:'', 수학:'', 영어:'', 사회:'', 과학:'' })
    setExamDate('')
    setSaveMsg('')
    return loadGrades()
  }, [loadGrades])

  const summary  = useMemo(() => summarizeGrades(records), [records])
  const headline = useMemo(() => gradeHeadline(summary), [summary])
  const { current, previous, subjects: takenSubjects, trend: trendData } = summary
  const hasGrades = takenSubjects.length > 0

  // 그래프 과목 버튼: 기록이 있는 과목만, 처음에는 모두 켠다
  useEffect(() => { setActiveSubs(takenSubjects) }, [takenSubjects.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  const mockPreview = useMemo(() => {
    if (examType !== EXAM_TYPE_MOCK) return {}
    const raw = {}
    SUBJECTS.forEach(s => {
      if (scores[s] !== '' && !Number.isNaN(Number(scores[s]))) raw[s] = scores[s]
    })
    return calcMockExamScores(raw)
  }, [examType, scores])

  // 과목별 리포트: 각 과목의 가장 최근 점수와 그 직전 점수를 비교한다
  const reportData = useMemo(() => takenSubjects.map(s => ({
    subject: s,
    score: current[s],
    prev: previous[s],
    grade: getGrade(current[s]),
  })), [takenSubjects, current, previous])

  // 과목별 균형: 최근 점수와 지금까지의 내 평균
  const radarData = useMemo(() => takenSubjects.map(s => {
    const vals = records.filter(r => r.subject === s).map(r => r.score)
    return { subject: s, score: current[s], avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) }
  }), [takenSubjects, current, records])

  const latestExamText = summary.latestExam
    ? `최근 시험 · ${summary.latestExam.date.replaceAll('-', '.')} ${summary.latestExam.examType}`.trim()
    : ''

    const handleSave = async () => {
      const filled = SUBJECTS.filter(s => scores[s] !== '' && !isNaN(Number(scores[s])))
      if (!examDate || filled.length === 0) {
        setSaveMsg('날짜와 점수를 하나 이상 입력해 주세요')
        return
      }
      const outOfRange = filled.find(s => Number(scores[s]) < 0 || Number(scores[s]) > 100)
      if (outOfRange) {
        setSaveMsg(`${outOfRange} 점수는 0~100 사이로 입력해 주세요`)
        return
      }
      if (examType === EXAM_TYPE_MOCK && Object.keys(mockPreview).length === 0) {
        setSaveMsg('모의고사 원점수를 확인해 주세요')
        return
      }

      // ── 실제 API 저장 ──────────────────────────
      setSaving(true)
      try {
        for (const s of filled) {
          await gradesAPI.postGrade({
            studentId: gradeKey,
            subject: s,
            score: Number(scores[s]),
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
        setSaving(false)
        return
      }
      setSaving(false)

      // 저장한 내용은 서버에서 다시 불러와서 화면을 맞춘다
      loadGrades()
      setSaveMsg('✓ 성적이 반영되었습니다!')
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

        {loadState === 'loading' && <p role="status" style={{ marginTop:18, fontSize:13, opacity:0.8 }}>성적을 불러오는 중...</p>}
        {loadState === 'error' && (
          <div role="alert" style={{ marginTop:18, fontSize:13 }}>
            성적을 불러오지 못했어요.{' '}
            <button type="button" onClick={loadGrades} style={{ border:'none', background:'rgba(255,255,255,0.2)', color:'white', borderRadius:8, padding:'4px 10px', fontFamily:'inherit', fontSize:12, fontWeight:700, cursor:'pointer' }}>다시 불러오기</button>
          </div>
        )}
        {loadState === 'ready' && !hasGrades && (
          <p style={{ marginTop:18, fontSize:15, fontWeight:700, lineHeight:1.5 }}>아직 등록된 성적이 없어요.<br /><span style={{ fontSize:13, fontWeight:500, opacity:0.8 }}>'+ 성적 입력'으로 첫 시험 점수를 넣어 보세요.</span></p>
        )}
        {loadState === 'ready' && hasGrades && (
          <section aria-label="성적 한눈에 보기">
            <p style={{ marginTop:14, fontSize:12, opacity:0.75 }}>{latestExamText}</p>
            <p style={{ marginTop:4, fontSize:17, fontWeight:800, lineHeight:1.45 }}>
              {headline.map((line, i) => <span key={line} style={{ display:'block' }}>{line}</span>)}
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:16 }}>
              {[
                ['과목별 최근 평균', `${summary.average}점`, `${takenSubjects.length}과목`],
                ['가장 잘한 과목', summary.best, `${current[summary.best]}점`],
                ['보완할 과목', summary.weakest ?? '-', summary.weakest ? `${current[summary.weakest]}점` : '과목이 더 필요해요'],
              ].map(([k,v,sub]) => (
                <div key={k} style={{ background:'rgba(255,255,255,0.12)', borderRadius:12, padding:'12px 10px', border:'1px solid rgba(255,255,255,0.15)', textAlign:'center' }}>
                  <p style={{ fontSize:10, opacity:0.75 }}>{k}</p>
                  <p style={{ fontSize:15, fontWeight:800, marginTop:3 }}>{v}</p>
                  <p style={{ fontSize:10, opacity:0.75, marginTop:2 }}>{sub}</p>
                </div>
              ))}
            </div>
          </section>
        )}

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
                          placeholder={examType === EXAM_TYPE_MOCK ? '원점수 입력' : current[s] != null ? `최근 ${current[s]}점` : '점수 입력'}
                          value={scores[s]}
                          onChange={e => setScores(p => ({ ...p, [s]: e.target.value }))}
                          style={{ flex:1 }}
                        />
                        {examType !== EXAM_TYPE_MOCK && current[s] != null && scores[s] !== '' && !isNaN(Number(scores[s])) && (
                          <span style={{
                            fontSize:11, fontWeight:700, flexShrink:0,
                            color: Number(scores[s]) > current[s] ? 'var(--color-success)' : Number(scores[s]) < current[s] ? 'var(--color-danger)' : 'var(--color-text-muted)',
                          }}>
                            {Number(scores[s]) > current[s] ? `▲${Number(scores[s])-current[s]}` : Number(scores[s]) < current[s] ? `▼${current[s]-Number(scores[s])}` : '-'}
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

            <button onClick={handleSave} disabled={saving} style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none',
              background:'var(--color-primary)', color:'white', fontSize:15, fontWeight:700,
              fontFamily:'inherit', cursor:'pointer', boxShadow:'0 4px 12px rgba(26,86,219,0.3)',
            }}>{saving ? '저장 중...' : '저장하고 반영하기'}</button>
          </div>
        </div>
      )}

      {hasGrades && <>
      {/* 추이 그래프 */}
      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ fontSize:14, fontWeight:700 }}>📈 성적 추이</p>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
              {takenSubjects.map(s => (
                <button key={s} type="button" aria-pressed={activeSubs.includes(s)} onClick={() => toggleSub(s)} style={{
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
              <YAxis domain={[0,100]} tick={{ fontSize:11, fill:'#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={(v,n) => [v == null ? '응시 안 함' : `${v}점`, n]} />
              {takenSubjects.filter(s => activeSubs.includes(s)).map(s => (
                <Line key={s} type="monotone" dataKey={s} stroke={SUBJECT_COLORS[s]} strokeWidth={2.5}
                  dot={{ r:4, fill:SUBJECT_COLORS[s] }} activeDot={{ r:6 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 레이더 차트 */}
      {radarData.length >= 3 && (
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>🎯 과목별 균형</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:8 }}>과목별 최근 점수와 지금까지의 내 평균</p>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:12, fill:'#4A5568' }} />
              <Radar name="최근 점수" dataKey="score" stroke="#1A56DB" fill="#1A56DB" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="내 평균" dataKey="avg" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Tooltip formatter={v => `${v}점`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      )}

      {/* 과목별 리포트 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📋 과목별 분석 리포트</p>
          <p style={{ fontSize:11, color:'var(--color-text-muted)', marginBottom:12 }}>과목마다 가장 최근 점수와 그 직전 점수를 비교해요</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {reportData.map(r => {
              const diff = r.prev == null ? null : r.score - r.prev
              return (
                <div key={r.subject} style={{ padding:'12px 14px', borderRadius:12, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:32, height:32, borderRadius:8, background:SUBJECT_COLORS[r.subject]+'18', color:SUBJECT_COLORS[r.subject], fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{r.subject}</span>
                      <div>
                        <span style={{ fontSize:15, fontWeight:800 }}>{r.score}점</span>
                        <span style={{ fontSize:12, fontWeight:600, marginLeft:6, color: diff>0 ? 'var(--color-success)' : diff<0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                          {diff == null ? '첫 기록' : diff>0 ? `▲${diff}` : diff<0 ? `▼${Math.abs(diff)}` : '변동 없음'}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20, background:SUBJECT_COLORS[r.subject]+'18', color:SUBJECT_COLORS[r.subject] }}>{r.grade}</span>
                  </div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>점수</span>
                      <span style={{ fontSize:11, fontWeight:600, color:SUBJECT_COLORS[r.subject] }}>{r.score} / 100</span>
                    </div>
                    <div style={{ height:6, background:'var(--color-border)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${r.score}%`, background:SUBJECT_COLORS[r.subject], borderRadius:3 }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      </>}

      {/* 오답과 OCR 채점 결과는 '오답 · 채점' 화면에서 본다 */}
      <div style={{ height: 16 }} />
    </div>
  )
}
