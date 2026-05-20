import { useState } from 'react'
import { SUBJECT_COLORS, RECOMMEND_BOOKS } from './data/mockData'

export default function SuggestTab() {
  const [solving, setSolving] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [answer, setAnswer] = useState('')

  const handleSolve = async () => {
    if (!answer.trim()) {
      alert('답을 입력해 주세요')
      return
    }
    setSolving(true)
    // TODO: 백엔드 연결 시 정답 채점 API 호출
    await new Promise(r => setTimeout(r, 1200))
    setSolving(false)
    setShowAnswer(true)
  }

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg, #0F3460 0%, #533483 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>AI 분석 기반</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>맞춤 학습 솔루션</h2>
        <p style={{ fontSize:13, opacity:0.7, marginTop:6, lineHeight:1.5 }}>약점을 보완하고 강점을 극대화하는 개인 맞춤형 추천</p>
      </div>

      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📚 맞춤 학습 자료 추천</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>유사 성적대 학생들이 가장 선호하는 고효율 콘텐츠</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {RECOMMEND_BOOKS.map((b,i) => (
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

      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🔬 오답 분석 & 변형 문제</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>자주 틀리는 개념 태그 추출 · 유사 문제 자동 생성</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
            {[['분수 나눗셈','#FF3B3B'],['관계대명사','#FF6B35'],['물질 변화','#FFB800'],['비와 비율','#9B59B6'],['논설문 구조','#1A56DB']].map(([tag,color]) => (
              <span key={tag} style={{ padding:'6px 12px', borderRadius:20, fontSize:12, fontWeight:600, background:color+'15', color, border:`1px solid ${color}30` }}>#{tag}</span>
            ))}
          </div>
          <div style={{ background:'var(--color-primary-light)', borderRadius:12, padding:'14px 16px', border:'1px solid #1A56DB30' }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--color-primary)', marginBottom:8 }}>🤖 AI 생성 쌍둥이 문제 (수학 · 분수 나눗셈)</p>
            <p style={{ fontSize:13, color:'var(--color-text-primary)', lineHeight:1.7 }}>
              3과 4분의 1을 1과 3분의 2로 나누면 얼마인가요?<br/>
              <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>난이도: 중 · 오답 빈도 1위 유형</span>
            </p>

            <input
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="답을 입력하세요 (예: 39/22)"
              disabled={showAnswer}
              style={{
                width:'100%', marginTop:10, padding:'10px 12px',
                borderRadius:8, border:'1.5px solid var(--color-border)',
                background:'white', fontSize:13, fontFamily:'inherit', outline:'none',
                boxSizing:'border-box',
              }}
            />

            {!showAnswer ? (
              <button
                onClick={handleSolve}
                disabled={solving}
                style={{
                  marginTop:10, width:'100%', padding:'10px', borderRadius:10,
                  border:'none', background:'var(--color-primary)', color:'white',
                  fontSize:13, fontWeight:700, fontFamily:'inherit',
                  cursor: solving ? 'not-allowed' : 'pointer',
                  opacity: solving ? 0.6 : 1,
                }}
              >
                {solving ? '⏳ 채점 중...' : '문제 풀기'}
              </button>
            ) : (
              <div style={{ marginTop:10, padding:'12px', borderRadius:10, background:'#D1FAF0', border:'1px solid #00C49A50' }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#007A5E' }}>
                  ✓ 정답: 39/22 (1과 17/22)
                </p>
                <p style={{ fontSize:11, color:'#007A5E', marginTop:4, opacity:0.85 }}>
                  풀이: 13/4 ÷ 5/3 = 13/4 × 3/5 = 39/20
                </p>
                <button
                  onClick={() => { setShowAnswer(false); setAnswer('') }}
                  style={{
                    marginTop:8, padding:'6px 12px', borderRadius:8, border:'none',
                    background:'transparent', color:'#007A5E', fontSize:12, fontWeight:600,
                    fontFamily:'inherit', cursor:'pointer',
                  }}
                >
                  다시 풀기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ margin:'12px 16px 16px' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🧭 맞춤 공부 방식 제안</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>학습 성향 분석 결과 기반</p>
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            {[['시각형','72%','#1A56DB'],['청각형','18%','#9B59B6'],['행동형','10%','#FF6B35']].map(([type,pct,color]) => (
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
            ].map(g => (
              <div key={g.subject} style={{ display:'flex', gap:12, padding:'11px 13px', borderRadius:10, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{g.emoji}</span>
                <div>
                  <p style={{ fontSize:12, fontWeight:700, color:SUBJECT_COLORS[g.subject] }}>{g.subject}</p>
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