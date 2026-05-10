import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, Cell,
} from 'recharts'

/* ============================================
   탭 정의
   ============================================ */
const TABS = [
  { id: 'grade',   label: '📊 성적' },
  { id: 'pattern', label: '🧠 학습패턴' },
  { id: 'suggest', label: '📚 맞춤추천' },
  { id: 'predict', label: '🎯 성장예측' },
]

const SUBJECTS = ['국어', '수학', '영어', '사회', '과학']
const EXAM_TYPES = ['중간고사', '기말고사', '모의고사']
const SUBJECT_COLORS = {
  국어:'#1A56DB', 수학:'#FF6B35', 영어:'#00C49A', 사회:'#9B59B6', 과학:'#FFB800',
}

/* ============================================
   공통 Mock 데이터
   ============================================ */
const TREND_DATA = [
  { date:'24.03', 국어:78, 수학:62, 영어:85, 사회:70, 과학:74 },
  { date:'24.06', 국어:82, 수학:58, 영어:88, 사회:75, 과학:71 },
  { date:'24.09', 국어:80, 수학:67, 영어:84, 사회:78, 과학:76 },
  { date:'24.12', 국어:85, 수학:72, 영어:90, 사회:80, 과학:79 },
  { date:'25.03', 국어:83, 수학:76, 영어:91, 사회:82, 과학:83 },
]
const RADAR_DATA = SUBJECTS.map(s => ({
  subject: s, score: TREND_DATA[TREND_DATA.length-1][s], avg: 72,
}))
const REPORT_DATA = [
  { subject:'국어', score:83, prev:85, percentile:78, grade:'3등급' },
  { subject:'수학', score:76, prev:72, percentile:65, grade:'4등급' },
  { subject:'영어', score:91, prev:90, percentile:92, grade:'1등급' },
  { subject:'사회', score:82, prev:80, percentile:74, grade:'3등급' },
  { subject:'과학', score:83, prev:79, percentile:76, grade:'3등급' },
]
const WRONG_TYPES = [
  { type:'개념 부족', count:12, color:'#FF3B3B' },
  { type:'계산 실수', count:8,  color:'#FF6B35' },
  { type:'문제 이해', count:5,  color:'#FFB800' },
  { type:'시간 부족', count:3,  color:'#94A3B8' },
]
const GOLDEN_TIME_DATA = [
  { time:'06시', focus:20 }, { time:'08시', focus:45 }, { time:'10시', focus:72 },
  { time:'12시', focus:38 }, { time:'14시', focus:55 }, { time:'16시', focus:88 },
  { time:'18시', focus:95 }, { time:'20시', focus:82 }, { time:'22시', focus:60 },
]
const STUDY_TIME_DATA = [
  { subject:'수학', minutes:85, color:'#FF6B35' },
  { subject:'영어', minutes:70, color:'#00C49A' },
  { subject:'국어', minutes:50, color:'#1A56DB' },
  { subject:'과학', minutes:40, color:'#FFB800' },
  { subject:'사회', minutes:30, color:'#9B59B6' },
]
const STRENGTH_AREAS = [
  { unit:'영어 독해', subject:'영어', accuracy:94, trend:'▲' },
  { unit:'문학 감상', subject:'국어', accuracy:89, trend:'▲' },
  { unit:'생물 분류', subject:'과학', accuracy:86, trend:'→' },
]
const WEAK_AREAS = [
  { unit:'분수 나눗셈', subject:'수학', accuracy:42, trend:'▼' },
  { unit:'관계대명사',  subject:'영어', accuracy:55, trend:'▲' },
]
const REVIEW_CARDS = [
  { subject:'수학', unit:'분수 나눗셈', due:'오늘', urgency:'high', emoji:'🔴' },
  { subject:'영어', unit:'관계대명사',  due:'내일', urgency:'mid',  emoji:'🟡' },
  { subject:'국어', unit:'비문학 독해', due:'3일 후', urgency:'low', emoji:'🟢' },
]
const RECOMMEND_BOOKS = [
  { title:'개념 원리 수학 6-1', type:'문제집', match:96, subject:'수학', emoji:'📘' },
  { title:'EBS 영어 기초 인강', type:'인강',   match:91, subject:'영어', emoji:'🎬' },
  { title:'국어 비문학 100제',  type:'문제집', match:87, subject:'국어', emoji:'📗' },
]
const PREDICT_DATA = [
  ...TREND_DATA,
  { date:'25.06', 국어:87, 수학:81, 영어:93, 사회:85, 과학:86, predicted:true },
]
const DAILY_PLAN = [
  { subject:'수학', task:'분수 나눗셈 개념', time:40, done:true  },
  { subject:'영어', task:'관계대명사 예문 10개', time:25, done:true  },
  { subject:'수학', task:'연습문제 20선', time:30, done:false },
  { subject:'국어', task:'비문학 지문 2편', time:25, done:false },
  { subject:'과학', task:'물질 변화 정리', time:20, done:false },
]

/* ============================================
   메인 컴포넌트
   ============================================ */
export default function Learning() {
  const [activeTab, setActiveTab] = useState('grade')
  return (
    <div>
      {/* 탭 바 */}
      <div style={{
        display:'flex', overflowX:'auto', scrollbarWidth:'none',
        background:'var(--color-surface)',
        borderBottom:'1px solid var(--color-border)',
        position:'sticky', top:0, zIndex:10,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flexShrink:0, padding:'14px 16px',
            border:'none', background:'transparent', cursor:'pointer',
            fontFamily:'inherit', fontSize:13,
            fontWeight: activeTab===t.id ? 700 : 500,
            color: activeTab===t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom:`2.5px solid ${activeTab===t.id ? 'var(--color-primary)' : 'transparent'}`,
            transition:'all 0.15s', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>

      {activeTab === 'grade'   && <GradeTab />}
      {activeTab === 'pattern' && <PatternTab />}
      {activeTab === 'suggest' && <SuggestTab />}
      {activeTab === 'predict' && <PredictTab />}
    </div>
  )
}

/* ============================================
   1. 성적 탭
   ============================================ */
function GradeTab() {
  const [showForm, setShowForm] = useState(false)
  const [examType, setExamType] = useState('중간고사')
  const [examDate, setExamDate] = useState('')
  const [scores, setScores]     = useState({ 국어:'', 수학:'', 영어:'', 사회:'', 과학:'' })
  const [activeSubs, setActiveSubs] = useState(['국어','수학','영어'])

  const toggleSub = (s) =>
    setActiveSubs(p => p.includes(s) ? p.filter(x=>x!==s) : [...p, s])

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)', padding:'24px 20px', color:'white' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>홍민준 · 초등 6학년</p>
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
          {[['전체 평균','83점','+4↑'],['최고 과목','영어 91','1등급'],['최저 과목','수학 76','4등급']].map(([k,v,s])=>(
            <div key={k} style={{ background:'rgba(255,255,255,0.12)', borderRadius:12, padding:'12px 10px', border:'1px solid rgba(255,255,255,0.15)', textAlign:'center' }}>
              <p style={{ fontSize:10, opacity:0.65 }}>{k}</p>
              <p style={{ fontSize:15, fontWeight:800, marginTop:3 }}>{v}</p>
              <p style={{ fontSize:10, opacity:0.7, marginTop:2 }}>{s}</p>
            </div>
          ))}
        </div>
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
              <div style={{ display:'flex', gap:8 }}>
                {EXAM_TYPES.map(t=>(
                  <button key={t} onClick={()=>setExamType(t)} style={{
                    flex:1, padding:'8px 4px', borderRadius:8, cursor:'pointer', fontFamily:'inherit',
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
              <input type="date" className="input-field" value={examDate} onChange={e=>setExamDate(e.target.value)} />
            </div>
            <div>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:8 }}>과목별 점수</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {SUBJECTS.map(s=>(
                  <div key={s} style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <span style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:SUBJECT_COLORS[s]+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:SUBJECT_COLORS[s] }}>{s}</span>
                    <input type="number" min={0} max={100} className="input-field" placeholder="점수 (0~100)"
                      value={scores[s]} onChange={e=>setScores(p=>({...p,[s]:e.target.value}))} style={{ flex:1 }} />
                    <span style={{ fontSize:12, color:'var(--color-text-muted)', width:24 }}>점</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={()=>setShowForm(false)} style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none',
              background:'var(--color-primary)', color:'white', fontSize:15, fontWeight:700,
              fontFamily:'inherit', cursor:'pointer', boxShadow:'0 4px 12px rgba(26,86,219,0.3)',
            }}>저장하기</button>
          </div>
        </div>
      )}

      {/* 추이 그래프 */}
      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ fontSize:14, fontWeight:700 }}>📈 성적 추이</p>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', justifyContent:'flex-end' }}>
              {SUBJECTS.map(s=>(
                <button key={s} onClick={()=>toggleSub(s)} style={{
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
            <LineChart data={TREND_DATA} margin={{ top:4, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'#94A3B8' }} />
              <YAxis domain={[40,100]} tick={{ fontSize:11, fill:'#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={(v,n)=>[`${v}점`,n]} />
              {SUBJECTS.filter(s=>activeSubs.includes(s)).map(s=>(
                <Line key={s} type="monotone" dataKey={s} stroke={SUBJECT_COLORS[s]} strokeWidth={2.5} dot={{ r:4, fill:SUBJECT_COLORS[s] }} activeDot={{ r:6 }} />
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
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:12, fill:'#4A5568' }} />
              <Radar name="나" dataKey="score" stroke="#1A56DB" fill="#1A56DB" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="전체평균" dataKey="avg" stroke="#94A3B8" fill="#94A3B8" fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="4 4" />
              <Legend wrapperStyle={{ fontSize:12 }} />
              <Tooltip formatter={v=>`${v}점`} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 과목별 리포트 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>📋 과목별 분석 리포트</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {REPORT_DATA.map(r=>{
              const diff = r.score - r.prev
              return (
                <div key={r.subject} style={{ padding:'12px 14px', borderRadius:12, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ width:32, height:32, borderRadius:8, background:SUBJECT_COLORS[r.subject]+'18', color:SUBJECT_COLORS[r.subject], fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{r.subject}</span>
                      <div>
                        <span style={{ fontSize:15, fontWeight:800 }}>{r.score}점</span>
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
            {WRONG_TYPES.map((w,i)=>(
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

/* ============================================
   2. 학습패턴 탭
   ============================================ */
function PatternTab() {
  const [selfEval, setSelfEval] = useState({ 이해도:0, 집중도:0 })
  const [feedback, setFeedback] = useState('')
  const [saved, setSaved]       = useState(false)
  const goldenHour = GOLDEN_TIME_DATA.reduce((a,b)=>a.focus>b.focus?a:b)

  const handleSave = () => {
    setSaved(true)
    setTimeout(()=>setSaved(false), 2000)
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #1A1A2E 0%, #0F3460 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>이번 주 분석 결과</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>학습 패턴 분석</h2>
        <div style={{ marginTop:16, background:'rgba(255,255,255,0.1)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, border:'1px solid rgba(255,255,255,0.15)' }}>
          <span style={{ fontSize:32 }}>⚡</span>
          <div>
            <p style={{ fontSize:12, opacity:0.7 }}>골든타임 (집중력 최고조)</p>
            <p style={{ fontSize:20, fontWeight:800, marginTop:2 }}>{goldenHour.time} 대</p>
            <p style={{ fontSize:11, opacity:0.65, marginTop:2 }}>이 시간대에 중요한 과목을 배치하세요</p>
          </div>
        </div>
      </div>

      {/* 시간대별 집중도 */}
      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>🕐 시간대별 집중도</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>앱 접속 패턴 기반 분석</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={GOLDEN_TIME_DATA} margin={{ top:4, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize:10, fill:'#94A3B8' }} />
              <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={v=>[`${v}점`,'집중도']} />
              <Bar dataKey="focus" radius={[6,6,0,0]}>
                {GOLDEN_TIME_DATA.map((entry,i)=>(
                  <Cell key={i} fill={entry.time===goldenHour.time ? '#1A56DB' : entry.focus>=70 ? '#60A5FA' : '#E2E8F0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 과목별 학습시간 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>⏱️ 과목별 학습 시간 (이번 주)</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {STUDY_TIME_DATA.map(d=>(
              <div key={d.subject} style={{ display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:d.color+'18', color:d.color, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{d.subject}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:600 }}>{d.subject}</span>
                    <span style={{ fontSize:12, color:d.color, fontWeight:700 }}>{d.minutes}분</span>
                  </div>
                  <div style={{ height:7, background:'var(--color-surface-2)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:d.color, width:`${(d.minutes/STUDY_TIME_DATA[0].minutes)*100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 자기평가 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🌟 오늘의 자기평가 (메타인지)</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:16 }}>학습 직후 솔직하게 체크해 주세요</p>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {['이해도','집중도'].map(key=>(
              <div key={key}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{key}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--color-primary)' }}>{selfEval[key]>0 ? `${selfEval[key]} / 5` : '미입력'}</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setSelfEval(p=>({...p,[key]:n}))} style={{
                      flex:1, aspectRatio:'1', borderRadius:10, border:'none', cursor:'pointer',
                      fontFamily:'inherit', fontSize:18, transition:'all 0.15s',
                      background: selfEval[key]>=n ? '#FEE500' : 'var(--color-surface-2)',
                      transform: selfEval[key]===n ? 'scale(1.15)' : 'scale(1)',
                    }}>⭐</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {selfEval.이해도>0 && (
            <div style={{ marginTop:14, padding:'12px 14px', borderRadius:12, background: selfEval.이해도>=4 ? '#FFF8E0' : 'var(--color-primary-light)', border:`1px solid ${selfEval.이해도>=4 ? '#FFB800' : 'var(--color-primary)'}` }}>
              <p style={{ fontSize:12, fontWeight:700, color: selfEval.이해도>=4 ? '#8A6500' : 'var(--color-primary)' }}>
                {selfEval.이해도>=4 ? '⚠️ 자신감이 높지만 실제 성적과 비교해 보세요' : '💡 이해도가 낮은 부분은 오늘 복습 추천!'}
              </p>
              <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:4 }}>주관적 이해도 {selfEval.이해도}/5 · 최근 실제 성적 평균 83점</p>
            </div>
          )}
        </div>
      </div>

      {/* 강사 피드백 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📝 강사 피드백</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>담당 강사가 직접 기록하는 정성적 평가</p>
          <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { teacher:'김수학 선생님', date:'5.8', text:'오늘 분수 단원 집중도 매우 좋았음. 계산 실수가 줄어드는 추세.' },
              { teacher:'이영어 선생님', date:'5.7', text:'발표력이 향상됨. 독해 속도는 아직 개선 필요.' },
            ].map((f,i)=>(
              <div key={i} style={{ padding:'11px 13px', borderRadius:10, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--color-primary)' }}>{f.teacher}</span>
                  <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>{f.date}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.5 }}>{f.text}</p>
              </div>
            ))}
          </div>
          <textarea value={feedback} onChange={e=>setFeedback(e.target.value)}
            placeholder="오늘 학생의 태도 및 특이사항을 기록해 주세요..." rows={3}
            style={{ width:'100%', borderRadius:10, border:'1.5px solid var(--color-border)', background:'var(--color-surface-2)', padding:'10px 12px', fontSize:13, fontFamily:'inherit', color:'var(--color-text-primary)', outline:'none', resize:'none' }} />
          <button onClick={handleSave} style={{
            width:'100%', marginTop:10, padding:'12px', borderRadius:10, border:'none',
            background: saved ? 'var(--color-success)' : 'var(--color-primary)',
            color:'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:'pointer', transition:'background 0.2s',
          }}>{saved ? '✓ 저장됨' : '피드백 저장'}</button>
        </div>
      </div>

      {/* 강점/약점 */}
      <div style={{ margin:'12px 16px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>💪 안정적인 강점 영역</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {STRENGTH_AREAS.map(s=>(
              <div key={s.unit} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'#D1FAF015', border:'1px solid #00C49A30', borderRadius:10 }}>
                <span style={{ fontSize:18 }}>🏆</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700 }}>{s.unit} <span style={{ fontSize:11, color:'var(--color-text-muted)', fontWeight:500 }}>{s.subject}</span></p>
                  <p style={{ fontSize:11, color:'var(--color-success)', marginTop:2 }}>정답률 {s.accuracy}% {s.trend}</p>
                </div>
                <div style={{ width:42, height:42, borderRadius:10, background:'var(--color-success)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:800 }}>{s.accuracy}%</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🎯 집중 보완 필요 영역</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {WEAK_AREAS.map(w=>(
              <div key={w.unit} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'#FFE9E915', border:'1px solid #FF3B3B30', borderRadius:10 }}>
                <span style={{ fontSize:18 }}>📌</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700 }}>{w.unit} <span style={{ fontSize:11, color:'var(--color-text-muted)', fontWeight:500 }}>{w.subject}</span></p>
                  <p style={{ fontSize:11, color:'var(--color-danger)', marginTop:2 }}>정답률 {w.accuracy}% {w.trend}</p>
                </div>
                <div style={{ width:42, height:42, borderRadius:10, background:'var(--color-danger)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:800 }}>{w.accuracy}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================
   3. 맞춤추천 탭
   ============================================ */
function SuggestTab() {
  const [flipped, setFlipped] = useState(null)

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0F3460 0%, #533483 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>AI 분석 기반</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>맞춤 학습 솔루션</h2>
        <p style={{ fontSize:13, opacity:0.7, marginTop:6, lineHeight:1.5 }}>약점을 보완하고 강점을 극대화하는 개인 맞춤형 추천</p>
      </div>

      {/* 복습 카드 (에빙하우스) */}
      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🔁 오늘의 복습 카드</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>에빙하우스 망각곡선 기반 · 카드를 눌러 내용 확인</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {REVIEW_CARDS.map((card,i)=>(
              <div key={i} onClick={()=>setFlipped(flipped===i ? null : i)} style={{
                padding:'14px 16px', borderRadius:12, cursor:'pointer',
                background: flipped===i ? 'var(--color-primary)' : 'var(--color-surface-2)',
                border:`1.5px solid ${flipped===i ? 'var(--color-primary)' : 'var(--color-border)'}`,
                transition:'all 0.2s',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18 }}>{card.emoji}</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700, color: flipped===i ? 'white' : 'var(--color-text-primary)' }}>{card.unit}</p>
                    <p style={{ fontSize:11, color: flipped===i ? 'rgba(255,255,255,0.7)' : 'var(--color-text-muted)', marginTop:2 }}>{card.subject} · 복습 기한: {card.due}</p>
                  </div>
                  <span style={{ fontSize:11, color: flipped===i ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)' }}>
                    {flipped===i ? '접기 ▲' : '펼치기 ▼'}
                  </span>
                </div>
                {flipped===i && (
                  <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,0.2)' }}>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.9)', lineHeight:1.6 }}>
                      💡 핵심 개념을 다시 정리하고, 유사 문제 3문항을 풀어보세요.<br/>
                      오늘 복습하지 않으면 기억 보존율이 40% 이하로 떨어집니다.
                    </p>
                    <button style={{
                      marginTop:10, padding:'8px 14px', borderRadius:8, border:'none',
                      background:'rgba(255,255,255,0.2)', color:'white', fontSize:12, fontWeight:700,
                      fontFamily:'inherit', cursor:'pointer',
                    }}>복습 문제 풀기 →</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 추천 자료 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📚 맞춤 학습 자료 추천</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>유사 성적대 학생들이 가장 선호하는 고효율 콘텐츠</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {RECOMMEND_BOOKS.map((b,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 14px', borderRadius:12, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                <span style={{ fontSize:28, flexShrink:0 }}>{b.emoji}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.title}</p>
                  <div style={{ display:'flex', gap:6, marginTop:4 }}>
                    <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20, background:SUBJECT_COLORS[b.subject]+'18', color:SUBJECT_COLORS[b.subject] }}>{b.subject}</span>
                    <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20, background:'var(--color-surface)', color:'var(--color-text-muted)', border:'1px solid var(--color-border)' }}>{b.type}</span>
                  </div>
                </div>
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <p style={{ fontSize:16, fontWeight:800, color:'var(--color-primary)' }}>{b.match}%</p>
                  <p style={{ fontSize:10, color:'var(--color-text-muted)' }}>매칭률</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 오답 태그 & 쌍둥이 문제 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🔬 오답 분석 & 변형 문제</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>자주 틀리는 개념 태그 추출 · 유사 문제 자동 생성</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
            {[['분수 나눗셈','#FF3B3B'],['관계대명사','#FF6B35'],['물질 변화','#FFB800'],['비와 비율','#9B59B6'],['논설문 구조','#1A56DB']].map(([tag,color])=>(
              <span key={tag} style={{ padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600, background:color+'15', color:color, border:`1px solid ${color}30` }}>#{tag}</span>
            ))}
          </div>
          <div style={{ background:'var(--color-primary-light)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--color-primary)30' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--color-primary)', marginBottom:8 }}>🤖 AI 생성 쌍둥이 문제 (수학 · 분수 나눗셈)</p>
            <p style={{ fontSize:13, color:'var(--color-text-primary)', lineHeight:1.7 }}>
              3과 4분의 1을 1과 3분의 2로 나누면 얼마인가요?<br/>
              <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>난이도: 중 · 오답 빈도 1위 유형</span>
            </p>
            <button style={{
              marginTop:10, width:'100%', padding:'10px', borderRadius:10, border:'none',
              background:'var(--color-primary)', color:'white', fontSize:13, fontWeight:700,
              fontFamily:'inherit', cursor:'pointer',
            }}>문제 풀기</button>
          </div>
        </div>
      </div>

      {/* 학습 성향 & 공부법 */}
      <div style={{ margin:'12px 16px 16px' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🧭 맞춤 공부 방식 제안</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>학습 성향 분석 결과 기반</p>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[['시각형','72%','#1A56DB'],['청각형','18%','#9B59B6'],['행동형','10%','#FF6B35']].map(([type,pct,color])=>(
              <div key={type} style={{ flex:1, textAlign:'center', padding:'12px 8px', borderRadius:12, background:type==='시각형' ? color+'18' : 'var(--color-surface-2)', border:`1.5px solid ${type==='시각형' ? color : 'var(--color-border)'}` }}>
                <p style={{ fontSize:14, fontWeight:800, color:type==='시각형' ? color : 'var(--color-text-muted)' }}>{pct}</p>
                <p style={{ fontSize:11, color:type==='시각형' ? color : 'var(--color-text-muted)', marginTop:2, fontWeight:600 }}>{type}</p>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { subject:'수학', tip:'개념 중심 — 도식화 및 색깔 펜으로 단계별 풀이 정리', emoji:'📐' },
              { subject:'영어', tip:'문제 풀이 위주 — 오답 노트 시각화, 마인드맵 활용', emoji:'🔤' },
              { subject:'국어', tip:'개념+문제 혼합 — 지문에 직접 표시하며 능동적 읽기', emoji:'📖' },
            ].map(g=>(
              <div key={g.subject} style={{ display:'flex', gap:12, padding:'11px 13px', borderRadius:10, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{g.emoji}</span>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color: SUBJECT_COLORS[g.subject] }}>{g.subject}</p>
                  <p style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2, lineHeight:1.5 }}>{g.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================
   4. 성장예측 탭
   ============================================ */
function PredictTab() {
  const [goal, setGoal] = useState('')
  const [targetScore, setTargetScore] = useState('')

  const latestReal = PREDICT_DATA[PREDICT_DATA.length-2]
  const predicted  = PREDICT_DATA[PREDICT_DATA.length-1]
  const avgPredicted = Math.round(SUBJECTS.reduce((a,s)=>a+predicted[s],0)/SUBJECTS.length)
  const avgReal      = Math.round(SUBJECTS.reduce((a,s)=>a+latestReal[s],0)/SUBJECTS.length)

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A56DB 80%, #00C49A 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>머신러닝 기반 예측</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>성장 예측 · 목표 설계</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginTop:18 }}>
          <div style={{ background:'rgba(255,255,255,0.12)', borderRadius:12, padding:'13px', border:'1px solid rgba(255,255,255,0.15)' }}>
            <p style={{ fontSize:11, opacity:0.7 }}>현재 평균</p>
            <p style={{ fontSize:22, fontWeight:800, marginTop:2 }}>{avgReal}점</p>
          </div>
          <div style={{ background:'rgba(0,196,154,0.2)', borderRadius:12, padding:'13px', border:'1px solid rgba(0,196,154,0.4)' }}>
            <p style={{ fontSize:11, opacity:0.7 }}>다음 시험 예상</p>
            <p style={{ fontSize:22, fontWeight:800, marginTop:2, color:'#7FFFD4' }}>{avgPredicted}점</p>
            <p style={{ fontSize:10, opacity:0.7, marginTop:1 }}>▲{avgPredicted-avgReal}점 상승 예측</p>
          </div>
        </div>
      </div>

      {/* 예측 그래프 */}
      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📈 성적 예측 그래프</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:12 }}>점선 구간이 AI 예측 구간입니다</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={PREDICT_DATA} margin={{ top:4, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" />
              <XAxis dataKey="date" tick={{ fontSize:11, fill:'#94A3B8' }} />
              <YAxis domain={[40,100]} tick={{ fontSize:11, fill:'#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={(v,n)=>[`${v}점`,n]} />
              {['수학','영어'].map(s=>(
                <Line key={s} type="monotone" dataKey={s} stroke={SUBJECT_COLORS[s]} strokeWidth={2.5}
                  dot={(props)=>{
                    const { cx,cy,index } = props
                    return index===PREDICT_DATA.length-1
                      ? <circle key={index} cx={cx} cy={cy} r={6} fill={SUBJECT_COLORS[s]} stroke="white" strokeWidth={2} strokeDasharray="4 2" />
                      : <circle key={index} cx={cx} cy={cy} r={4} fill={SUBJECT_COLORS[s]} />
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, justifyContent:'center' }}>
            <div style={{ width:20, height:2, borderTop:'2px dashed #94A3B8' }} />
            <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>예측 구간 (25.06)</span>
          </div>
        </div>
      </div>

      {/* 일일 학습 계획 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ fontSize:14, fontWeight:700 }}>📅 오늘의 학습 계획</p>
            <span style={{ fontSize:12, color:'var(--color-primary)', fontWeight:600 }}>
              {DAILY_PLAN.filter(p=>p.done).length}/{DAILY_PLAN.length} 완료
            </span>
          </div>
          {/* 진도 바 */}
          <div style={{ height:6, background:'var(--color-surface-2)', borderRadius:3, overflow:'hidden', marginBottom:14 }}>
            <div style={{ height:'100%', width:`${(DAILY_PLAN.filter(p=>p.done).length/DAILY_PLAN.length)*100}%`, background:'var(--color-success)', borderRadius:3, transition:'width 0.6s' }} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {DAILY_PLAN.map((p,i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 13px', borderRadius:10, background: p.done ? 'var(--color-surface-2)' : 'var(--color-surface)', border:'1px solid var(--color-border)', opacity: p.done ? 0.6 : 1 }}>
                <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, border:`2px solid ${p.done ? 'var(--color-success)' : 'var(--color-border)'}`, background: p.done ? 'var(--color-success)' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {p.done && <span style={{ color:'white', fontSize:12 }}>✓</span>}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, textDecoration: p.done ? 'line-through' : 'none' }}>{p.task}</p>
                  <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:2 }}>{p.subject} · {p.time}분</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 목표 설정 */}
      <div style={{ margin:'12px 16px 0' }}>
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
            <button style={{
              width:'100%', padding:'13px', borderRadius:12, border:'none',
              background:'linear-gradient(90deg, #1A56DB, #00C49A)',
              color:'white', fontSize:15, fontWeight:700, fontFamily:'inherit', cursor:'pointer',
              boxShadow:'0 4px 16px rgba(26,86,219,0.3)',
            }}>AI 로드맵 생성</button>
          </div>
        </div>
      </div>

      {/* 성공 경로 */}
      <div style={{ margin:'12px 16px 16px' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🏆 유사 목표 달성 선배 경로</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>같은 목표를 달성한 선배 학생들의 학습 데이터</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { step:'1단계', period:'1~2개월', task:'기초 개념 완성 (수학·영어 취약 단원)', icon:'📖' },
              { step:'2단계', period:'3~4개월', task:'심화 문제풀이 + 오답 반복 학습', icon:'✍️' },
              { step:'3단계', period:'5~6개월', task:'실전 모의고사 주 2회 + 시간 관리 훈련', icon:'⏱️' },
              { step:'달성',  period:'목표',    task:'목표 점수 도달', icon:'🎉' },
            ].map((s,i,arr)=>(
              <div key={i} style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background: i===arr.length-1 ? 'var(--color-success)' : 'var(--color-primary-light)', border:`2px solid ${i===arr.length-1 ? 'var(--color-success)' : 'var(--color-primary)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>{s.icon}</div>
                  {i<arr.length-1 && <div style={{ width:2, height:24, background:'var(--color-border)', marginTop:4 }} />}
                </div>
                <div style={{ paddingTop:6 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--color-primary)' }}>{s.step} <span style={{ color:'var(--color-text-muted)', fontWeight:500 }}>({s.period})</span></p>
                  <p style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2 }}>{s.task}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}