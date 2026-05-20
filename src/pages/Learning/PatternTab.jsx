import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  GOLDEN_TIME_DATA, STUDY_TIME_DATA,
  STRENGTH_AREAS, WEAK_AREAS,
} from './data/mockData'

export default function PatternTab() {
  const [selfEval, setSelfEval] = useState({ 이해도:0, 집중도:0 })
  const [feedback, setFeedback] = useState('')
  const [saved, setSaved]       = useState(false)
  const goldenHour = GOLDEN_TIME_DATA.reduce((a,b) => a.focus>b.focus ? a : b)

  return (
    <div>
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

      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>🕐 시간대별 집중도</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>앱 접속 패턴 기반 분석</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={GOLDEN_TIME_DATA} margin={{ top:4, right:8, left:-20, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize:10, fill:'#94A3B8' }} />
              <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#94A3B8' }} />
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} formatter={v => [`${v}점`, '집중도']} />
              <Bar dataKey="focus" radius={[6,6,0,0]}>
                {GOLDEN_TIME_DATA.map((entry,i) => (
                  <Cell key={i} fill={entry.time===goldenHour.time ? '#1A56DB' : entry.focus>=70 ? '#60A5FA' : '#E2E8F0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>⏱️ 과목별 학습 시간 (이번 주)</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {STUDY_TIME_DATA.map(d => (
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

      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🌟 오늘의 자기평가 (메타인지)</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:16 }}>학습 직후 솔직하게 체크해 주세요</p>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {['이해도','집중도'].map(key => (
              <div key={key}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{key}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--color-primary)' }}>{selfEval[key]>0 ? `${selfEval[key]} / 5` : '미입력'}</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setSelfEval(p => ({...p,[key]:n}))} style={{
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
            </div>
          )}
        </div>
      </div>

      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📝 강사 피드백</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>담당 강사가 직접 기록하는 정성적 평가</p>
          <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { teacher:'김수학 선생님', date:'5.8', text:'오늘 분수 단원 집중도 매우 좋았음. 계산 실수가 줄어드는 추세.' },
              { teacher:'이영어 선생님', date:'5.7', text:'발표력이 향상됨. 독해 속도는 아직 개선 필요.' },
            ].map((f,i) => (
              <div key={i} style={{ padding:'11px 13px', borderRadius:10, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--color-primary)' }}>{f.teacher}</span>
                  <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>{f.date}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.5 }}>{f.text}</p>
              </div>
            ))}
          </div>
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
            placeholder="오늘 학생의 태도 및 특이사항을 기록해 주세요..." rows={3}
            style={{ width:'100%', borderRadius:10, border:'1.5px solid var(--color-border)', background:'var(--color-surface-2)', padding:'10px 12px', fontSize:13, fontFamily:'inherit', color:'var(--color-text-primary)', outline:'none', resize:'none', boxSizing:'border-box' }} />
          <button onClick={() => { setSaved(true); setTimeout(()=>setSaved(false),2000) }} style={{
            width:'100%', marginTop:10, padding:'12px', borderRadius:10, border:'none',
            background: saved ? 'var(--color-success)' : 'var(--color-primary)',
            color:'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:'pointer', transition:'background 0.2s',
          }}>{saved ? '✓ 저장됨' : '피드백 저장'}</button>
        </div>
      </div>

      <div style={{ margin:'12px 16px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>💪 안정적인 강점 영역</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {STRENGTH_AREAS.map(s => (
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
            {WEAK_AREAS.map(w => (
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