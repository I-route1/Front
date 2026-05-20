import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  SUBJECTS, SUBJECT_COLORS,
  INIT_TREND, INIT_DAILY_PLAN,
} from './data/mockData'

export default function PredictTab() {
  const [goal, setGoal]               = useState('')
  const [targetScore, setTargetScore] = useState('')
  const [plan, setPlan]               = useState(INIT_DAILY_PLAN)
  const [newTask, setNewTask]         = useState({ subject:'수학', task:'', time:30 })
  const [showAdd, setShowAdd]         = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [roadmap, setRoadmap]         = useState(null)

  const handleGenerateRoadmap = async () => {
    if (!goal.trim() || !targetScore) {
      alert('목표와 목표 점수를 입력해 주세요')
      return
    }
    setGenerating(true)
    // TODO: 백엔드 연결 시 AI 로드맵 API 호출
    await new Promise(r => setTimeout(r, 2000))
    setRoadmap({
      weeks: [
        { week:'1~2주차', focus:'수학 분수 영역 집중 보완', target:'정답률 70%' },
        { week:'3~4주차', focus:'영어 문법 패턴 학습', target:'관계대명사 마스터' },
        { week:'5~6주차', focus:'전 과목 모의고사 풀이', target:'평균 85점' },
        { week:'7~8주차', focus:'약점 단원 재점검', target:'목표 점수 도달' },
      ],
      tip: `${goal} 달성을 위해 평일 2시간, 주말 4시간 학습을 추천합니다.`,
    })
    setGenerating(false)
  }

  const toggleDone = (id) =>
    setPlan(prev => prev.map(p => p.id===id ? {...p, done:!p.done} : p))

  const addTask = () => {
    if (!newTask.task.trim()) return
    setPlan(prev => [...prev, { ...newTask, id: Date.now(), done:false, time: Number(newTask.time)||30 }])
    setNewTask({ subject:'수학', task:'', time:30 })
    setShowAdd(false)
  }

  const removeTask = (id) =>
    setPlan(prev => prev.filter(p => p.id !== id))

  const doneCount = plan.filter(p=>p.done).length

  const PREDICT_DATA = [
    ...INIT_TREND,
    { date:'25.06', 국어:87, 수학:81, 영어:93, 사회:85, 과학:86, predicted:true },
  ]
  const latest    = PREDICT_DATA[PREDICT_DATA.length-2]
  const predicted = PREDICT_DATA[PREDICT_DATA.length-1]
  const avgNow  = Math.round(SUBJECTS.reduce((a,s)=>a+latest[s],0)/SUBJECTS.length)
  const avgPred = Math.round(SUBJECTS.reduce((a,s)=>a+predicted[s],0)/SUBJECTS.length)

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A56DB 80%, #00C49A 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>머신러닝 기반 예측</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>성장 예측 · 목표 설계</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginTop:18 }}>
          <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:12, padding:'13px', border:'1px solid rgba(255,255,255,0.15)' }}>
            <p style={{ fontSize:11, opacity:0.7 }}>현재 평균</p>
            <p style={{ fontSize:22, fontWeight:800, marginTop:2 }}>{avgNow}점</p>
          </div>
          <div style={{ background:'rgba(0,196,154,0.2)', borderRadius:12, padding:'13px', border:'1px solid rgba(0,196,154,0.4)' }}>
            <p style={{ fontSize:11, opacity:0.7 }}>다음 시험 예상</p>
            <p style={{ fontSize:22, fontWeight:800, marginTop:2, color:'#7FFFD4' }}>{avgPred}점</p>
            <p style={{ fontSize:10, opacity:0.7, marginTop:1 }}>▲{avgPred-avgNow}점 상승 예측</p>
          </div>
        </div>
      </div>

      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📈 성적 예측 그래프</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:12 }}>마지막 데이터가 AI 예측 값입니다</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PREDICT_DATA} margin={{ top:4, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'#94A3B8' }} />
              <YAxis domain={[40,100]} tick={{ fontSize:11, fill:'#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={(v,n) => [`${v}점`,n]} />
              {['수학','영어'].map(s => (
                <Line key={s} type="monotone" dataKey={s} stroke={SUBJECT_COLORS[s]} strokeWidth={2.5}
                  dot={{ r:4, fill:SUBJECT_COLORS[s] }} activeDot={{ r:6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ fontSize:14, fontWeight:700 }}>📅 오늘의 학습 계획</p>
            <span style={{ fontSize:12, color:'var(--color-primary)', fontWeight:600 }}>{doneCount}/{plan.length} 완료</span>
          </div>
          <div style={{ height:6, background:'var(--color-surface-2)', borderRadius:3, overflow:'hidden', marginBottom:14 }}>
            <div style={{ height:'100%', width:`${plan.length ? (doneCount/plan.length)*100 : 0}%`, background:'var(--color-success)', borderRadius:3 }} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {plan.map((p) => (
              <div key={p.id} onClick={() => toggleDone(p.id)} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', borderRadius:10, background: p.done ? 'var(--color-surface-2)' : 'var(--color-surface)', border:`1px solid ${p.done ? 'var(--color-success)30' : 'var(--color-border)'}`, opacity: p.done ? 0.65 : 1, cursor:'pointer', transition:'all 0.15s' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, border:`2px solid ${p.done ? 'var(--color-success)' : 'var(--color-border)'}`, background: p.done ? 'var(--color-success)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                  {p.done && <span style={{ color:'white', fontSize:13, lineHeight:1 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, textDecoration: p.done ? 'line-through' : 'none', color: p.done ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>{p.task}</p>
                  <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:2 }}>{p.subject} · {p.time}분</p>
                </div>
                <button onClick={e => { e.stopPropagation(); removeTask(p.id) }} style={{ padding:'4px 8px', borderRadius:6, border:'none', background:'transparent', color:'var(--color-text-muted)', fontSize:16, cursor:'pointer', lineHeight:1 }}>×</button>
              </div>
            ))}

            {showAdd ? (
              <div style={{ padding:'12px 14px', borderRadius:10, border:'1.5px solid var(--color-primary)', background:'var(--color-primary-light)', display:'flex', flexDirection:'column', gap:10 }}>
                <div style={{ display:'flex', gap:8 }}>
                  <select value={newTask.subject} onChange={e => setNewTask(p=>({...p, subject:e.target.value}))}
                    style={{ flex:1, padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--color-border)', background:'var(--color-surface)', fontSize:13, fontFamily:'inherit', outline:'none' }}>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input type="number" min={5} max={180} value={newTask.time}
                    onChange={e => setNewTask(p=>({...p, time:e.target.value}))}
                    style={{ width:64, padding:'8px 10px', borderRadius:8, border:'1.5px solid var(--color-border)', background:'var(--color-surface)', fontSize:13, fontFamily:'inherit', outline:'none', textAlign:'center' }}
                    placeholder="분" />
                </div>
                <input value={newTask.task} onChange={e => setNewTask(p=>({...p, task:e.target.value}))}
                  onKeyDown={e => e.key==='Enter' && addTask()}
                  placeholder="할 일을 입력하세요"
                  style={{ width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid var(--color-border)', background:'var(--color-surface)', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setShowAdd(false)} style={{ flex:1, padding:'9px', borderRadius:8, border:'1.5px solid var(--color-border)', background:'transparent', fontSize:13, fontWeight:600, fontFamily:'inherit', cursor:'pointer', color:'var(--color-text-secondary)' }}>취소</button>
                  <button onClick={addTask} style={{ flex:2, padding:'9px', borderRadius:8, border:'none', background:'var(--color-primary)', color:'white', fontSize:13, fontWeight:700, fontFamily:'inherit', cursor:'pointer' }}>추가</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAdd(true)} style={{ width:'100%', padding:'11px', borderRadius:10, border:'1.5px dashed var(--color-border)', background:'transparent', fontSize:13, fontWeight:600, color:'var(--color-text-muted)', fontFamily:'inherit', cursor:'pointer', transition:'all 0.15s' }}>+ 할 일 추가</button>
            )}

            {plan.length > 0 && doneCount === plan.length && (
              <div style={{ padding:'14px', borderRadius:12, background:'#D1FAF0', border:'1px solid #00C49A50', textAlign:'center' }}>
                <p style={{ fontSize:14, fontWeight:800, color:'#007A5E' }}>🎉 오늘 계획을 모두 완료했어요!</p>
                <p style={{ fontSize:12, color:'#007A5E', marginTop:4, opacity:0.8 }}>내일도 화이팅!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ margin:'12px 16px 16px' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🎯 목표 기반 로드맵</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>목표를 입력하면 AI가 최적 경로를 설계합니다</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="input-group">
              <label className="input-label">희망 학교/목표</label>
              <input className="input-field" placeholder="예: 대원외고, 전국 상위 10%" value={goal} onChange={e=>setGoal(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">목표 평균 점수</label>
              <input className="input-field" type="number" placeholder="예: 90" value={targetScore} onChange={e=>setTargetScore(e.target.value)} />
            </div>
            <button
              onClick={handleGenerateRoadmap}
              disabled={generating}
              style={{
                width:'100%', padding:'13px', borderRadius:12, border:'none',
                background: generating
                  ? 'var(--color-text-muted)'
                  : 'linear-gradient(90deg, #1A56DB, #00C49A)',
                color:'white', fontSize:15, fontWeight:700, fontFamily:'inherit',
                cursor: generating ? 'not-allowed' : 'pointer',
                boxShadow:'0 4px 16px rgba(26,86,219,0.3)',
                transition:'all 0.2s',
              }}
            >
              {generating ? '🤖 AI가 로드맵을 설계 중...' : 'AI 로드맵 생성'}
            </button>

            {roadmap && (
              <div style={{ marginTop:4, paddingTop:16, borderTop:'1px solid var(--color-border)' }}>
                <p style={{ fontSize:13, fontWeight:700, marginBottom:12, color:'var(--color-primary)' }}>
                  ✨ 맞춤 로드맵이 완성되었어요!
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {roadmap.weeks.map((w, i) => (
                    <div key={i} style={{
                      display:'flex', gap:12, padding:'12px 14px', borderRadius:10,
                      background:'var(--color-surface-2)', border:'1px solid var(--color-border)',
                    }}>
                      <div style={{
                        width:36, height:36, borderRadius:10, flexShrink:0,
                        background:'var(--color-primary)', color:'white',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:13, fontWeight:800,
                      }}>{i+1}</div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:12, fontWeight:700, color:'var(--color-primary)' }}>
                          {w.week}
                        </p>
                        <p style={{ fontSize:13, fontWeight:600, marginTop:3 }}>{w.focus}</p>
                        <p style={{ fontSize:11, color:'var(--color-success)', marginTop:3, fontWeight:600 }}>
                          🎯 {w.target}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{
                  marginTop:12, padding:'12px 14px', borderRadius:10,
                  background:'var(--color-primary-light)', border:'1px solid #1A56DB30',
                }}>
                  <p style={{ fontSize:12, color:'var(--color-primary)', lineHeight:1.6, fontWeight:600 }}>
                    💡 {roadmap.tip}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}