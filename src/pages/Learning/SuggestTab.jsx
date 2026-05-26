import { useState, useEffect } from 'react'
import { gradesAPI, recommendationsAPI, analysisAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { SUBJECT_COLORS, RECOMMEND_BOOKS } from './data/mockData'

// 과목별 학습 팁
const SUBJECT_TIPS = {
  '수학': { tip: '개념 중심 — 도식화 및 색깔 펜으로 단계별 풀이 정리', emoji: '📐' },
  '영어': { tip: '문제 풀이 위주 — 오답 노트 시각화, 마인드맵 활용', emoji: '🔤' },
  '국어': { tip: '개념+문제 혼합 — 지문에 직접 표시하며 능동적 읽기', emoji: '📖' },
  '한국사': { tip: '시간 순 정리 — 연표와 사건 흐름을 도식화', emoji: '📜' },
  '사회탐구': { tip: '개념 비교표 — 유사 개념을 표로 정리해 차이점 부각', emoji: '🌍' },
  '과학탐구': { tip: '실험 시각화 — 그림과 다이어그램으로 원리 이해', emoji: '🔬' },
}

export default function SuggestTab() {
  const { user } = useAuth()
  const [solving, setSolving]                 = useState(false)
  const [showAnswer, setShowAnswer]           = useState(false)
  const [answer, setAnswer]                   = useState('')
  const [ancestorLoading, setAncestorLoading] = useState(false)
  const [ancestorDone, setAncestorDone]       = useState(false)
  const [studyPattern, setStudyPattern]       = useState(null)
  const [patternLoading, setPatternLoading]   = useState(true)

  // 학습 패턴 v2 조회
  useEffect(() => {
    if (!user?.id) return
    
    setPatternLoading(true)
    analysisAPI.getStudyPatternV2(user.id)
      .then(data => setStudyPattern(data))
      .catch(e => {
        console.error('학습 패턴 조회 실패:', e)
        setStudyPattern(null)
      })
      .finally(() => setPatternLoading(false))
  }, [user?.id])

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

  const handleAncestorSearch = async () => {
    setAncestorLoading(true)
    try {
      await gradesAPI.analyzeGrade({
        studentId: user.id,
        score: 72,
        allScores: [55, 60, 72, 80, 91, 88, 45],
        weakConceptTag: '분수 나눗셈',
      })
      setAncestorDone(true)
    } catch (e) {
      console.error('족보 탐색 실패:', e)
      setAncestorDone(true)
    } finally {
      setAncestorLoading(false)
    }
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0F3460 0%, #533483 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>AI 분석 기반</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>맞춤 학습 솔루션</h2>
        <p style={{ fontSize:13, opacity:0.7, marginTop:6, lineHeight:1.5 }}>약점을 보완하고 강점을 극대화하는 개인 맞춤형 추천</p>
      </div>

      {/* 맞춤 학습 자료 추천 */}
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

      {/* 오답 분석 & 쌍둥이 문제 */}
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

      {/* AI 맞춤 족보 탐색 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🔍 AI 맞춤 족보 탐색</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>취약 개념 기반으로 유사 문제를 자동으로 찾아드려요</p>
          <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--color-surface-2)', border:'1px solid var(--color-border)', marginBottom:12 }}>
            <p style={{ fontSize:12, fontWeight:600, marginBottom:6 }}>분석 대상 취약 개념</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {['분수 나눗셈', '관계대명사', '물질 변화'].map(tag => (
                <span key={tag} style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:'var(--color-primary-light)', color:'var(--color-primary)', border:'1px solid #1A56DB30' }}>#{tag}</span>
              ))}
            </div>
          </div>
          {!ancestorDone ? (
            <button
              onClick={handleAncestorSearch}
              disabled={ancestorLoading}
              style={{
                width:'100%', padding:'12px', borderRadius:10, border:'none',
                background: ancestorLoading ? 'var(--color-text-muted)' : 'linear-gradient(90deg, #1A56DB, #9B59B6)',
                color:'white', fontSize:13, fontWeight:700, fontFamily:'inherit',
                cursor: ancestorLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {ancestorLoading ? '🔍 족보 탐색 중...' : '🔍 AI 맞춤 족보 탐색 시작'}
            </button>
          ) : (
            <div style={{ padding:'12px 14px', borderRadius:10, background:'#D1FAF0', border:'1px solid #00C49A50' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#007A5E' }}>✓ 족보 탐색 요청 완료!</p>
              <p style={{ fontSize:12, color:'#007A5E', marginTop:4, opacity:0.85 }}>AI가 백그라운드에서 분석 중이에요. 결과는 알림으로 안내드릴게요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 선배 성공 학습 경로 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🏅 선배 성공 학습 경로</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>비슷한 성적대에서 시작해 성공한 선배들의 패턴</p>
          {/* TODO: 실제 연동 시 recommendationsAPI.getPeerPath(user.id, subject) */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { subject:'수학', count:15, initial:62, final:88, strategy:'기출 중심 반복 학습 + 오답 노트', color:'#FF6B35' },
              { subject:'영어', count:23, initial:70, final:91, strategy:'독해 매일 1지문 + 단어 암기', color:'#00C49A' },
            ].map(p => (
              <div key={p.subject} style={{ padding:'12px 14px', borderRadius:12, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:p.color }}>{p.subject}</span>
                  <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>{p.count}명 분석</span>
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                  <div style={{ flex:1, textAlign:'center', padding:'6px', borderRadius:8, background:'#FFE9E915', border:'1px solid #FF3B3B20' }}>
                    <p style={{ fontSize:10, color:'var(--color-text-muted)' }}>시작 평균</p>
                    <p style={{ fontSize:14, fontWeight:800, color:'var(--color-danger)' }}>{p.initial}점</p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', fontSize:16, color:'var(--color-text-muted)' }}>→</div>
                  <div style={{ flex:1, textAlign:'center', padding:'6px', borderRadius:8, background:'#D1FAF015', border:'1px solid #00C49A20' }}>
                    <p style={{ fontSize:10, color:'var(--color-text-muted)' }}>달성 평균</p>
                    <p style={{ fontSize:14, fontWeight:800, color:'var(--color-success)' }}>{p.final}점</p>
                  </div>
                </div>
                <div style={{ padding:'8px 10px', borderRadius:8, background:'var(--color-primary-light)', border:'1px solid #1A56DB20' }}>
                  <p style={{ fontSize:11, color:'var(--color-primary)', fontWeight:600 }}>📌 {p.strategy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 맞춤 공부 방식 - 실제 학습 패턴 기반 */}
      <div style={{ margin:'12px 16px 16px' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🧭 맞춤 공부 방식 제안</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>
            실제 학습 기록 분석 기반
          </p>
          
          {patternLoading ? (
            <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
              학습 패턴 분석 중...
            </div>
          ) : studyPattern && studyPattern.subjectStudyMinutes && Object.keys(studyPattern.subjectStudyMinutes).length > 0 ? (
            <>
              {/* 골든타임 */}
              {studyPattern.goldenTime && (
                <div style={{ padding:'12px 14px', borderRadius:12, background:'linear-gradient(90deg, #FFF8E0, #FFE9D6)', border:'1px solid #FFB80040', marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:20 }}>⏰</span>
                    <div>
                      <p style={{ fontSize:11, fontWeight:600, color:'#8A6500' }}>나의 집중 골든타임</p>
                      <p style={{ fontSize:16, fontWeight:800, color:'#8A6500', marginTop:2 }}>
                        {studyPattern.goldenTime}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 과목별 학습 비중 */}
              <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
                📊 과목별 학습 비중
              </p>
              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                {(() => {
                  const subjects = studyPattern.subjectStudyMinutes
                  const total = Object.values(subjects).reduce((a, b) => a + b, 0)
                  const entries = Object.entries(subjects).sort((a, b) => b[1] - a[1])
                  const topSubject = entries[0]?.[0]
                  
                  return entries.map(([subject, minutes]) => {
                    const pct = total > 0 ? Math.round((minutes / total) * 100) : 0
                    const isTop = subject === topSubject
                    const color = SUBJECT_COLORS[subject] || '#1A56DB'
                    return (
                      <div key={subject} style={{
                        flex:'1 1 30%', minWidth:90, textAlign:'center',
                        padding:'12px 8px', borderRadius:12,
                        background: isTop ? color+'18' : 'var(--color-surface-2)',
                        border: `1.5px solid ${isTop ? color : 'var(--color-border)'}`,
                      }}>
                        <p style={{ fontSize:14, fontWeight:800, color: isTop ? color : 'var(--color-text-muted)' }}>{pct}%</p>
                        <p style={{ fontSize:11, color: isTop ? color : 'var(--color-text-muted)', marginTop:2, fontWeight:600 }}>{subject}</p>
                        <p style={{ fontSize:9, color:'var(--color-text-muted)', marginTop:1 }}>{minutes}분</p>
                      </div>
                    )
                  })
                })()}
              </div>
              
              {/* 요약 */}
              {studyPattern.studyBalanceSummary && (
                <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--color-primary-light)', border:'1px solid #1A56DB20', marginBottom:14 }}>
                  <p style={{ fontSize:11, color:'var(--color-primary)', lineHeight:1.6, fontWeight:600 }}>
                    💡 {studyPattern.studyBalanceSummary}
                  </p>
                </div>
              )}
              
              {/* 과목별 학습 팁 */}
              <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
                📚 과목별 학습 팁
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {Object.keys(studyPattern.subjectStudyMinutes).map(subject => {
                  const tip = SUBJECT_TIPS[subject] || { tip: '꾸준한 학습이 가장 중요해요', emoji: '✏️' }
                  return (
                    <div key={subject} style={{ display:'flex', gap:12, padding:'11px 13px', borderRadius:10, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                      <span style={{ fontSize:20, flexShrink:0 }}>{tip.emoji}</span>
                      <div>
                        <p style={{ fontSize:12, fontWeight:700, color:SUBJECT_COLORS[subject] || 'var(--color-primary)' }}>{subject}</p>
                        <p style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2, lineHeight:1.5 }}>{tip.tip}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div style={{ padding:'32px 16px', textAlign:'center', background:'var(--color-surface-2)', borderRadius:12, border:'1px dashed var(--color-border)' }}>
              <p style={{ fontSize:32, marginBottom:8 }}>📭</p>
              <p style={{ fontSize:13, color:'var(--color-text-muted)', marginBottom:4 }}>
                아직 분석할 학습 기록이 없어요
              </p>
              <p style={{ fontSize:11, color:'var(--color-text-muted)' }}>
                학습을 시작하면 맞춤 분석을 받을 수 있어요
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}