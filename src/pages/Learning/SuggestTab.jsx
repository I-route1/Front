import { useState, useEffect } from 'react'
import { gradesAPI, recommendationsAPI, analysisAPI, wrongAnswerAPI } from '@/api'
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

// 자료 유형별 이모지/표시명
const MATERIAL_TYPE_ICON = {
  'BOOK': { emoji: '📘', label: '문제집' },
  'WORKBOOK': { emoji: '📝', label: '문제집' },
  'VIDEO': { emoji: '🎬', label: '강의' },
  'LECTURE': { emoji: '🎬', label: '강의' },
  'DOCUMENT': { emoji: '📄', label: '문서' },
  'NOTE': { emoji: '📒', label: '노트' },
  'EXAM': { emoji: '📋', label: '기출문제' },
  'PRACTICE': { emoji: '✍️', label: '연습문제' },
  'DEFAULT': { emoji: '📚', label: '학습자료' },
}

function getMaterialIcon(type) {
  return MATERIAL_TYPE_ICON[type?.toUpperCase()] || MATERIAL_TYPE_ICON.DEFAULT
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
  const [materials, setMaterials] = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(true)  
  const [peerPaths, setPeerPaths] = useState([])
  const [peerPathsLoading, setPeerPathsLoading] = useState(true)
  const PEER_PATH_SUBJECTS = ['수학', '영어']

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

  // 학습 자료 추천 조회
  useEffect(() => {
  if (!user?.id) return
  
  setMaterialsLoading(true)
  recommendationsAPI.getMaterials(user.id)
    .then(data => {
      // 응답이 배열인지 객체 안에 배열인지 대비
      const list = Array.isArray(data) ? data : (data?.materials || [])
      setMaterials(list)
    })
    .catch(e => {
      console.error('학습 자료 추천 조회 실패:', e)
      setMaterials([])
    })
    .finally(() => setMaterialsLoading(false))
}, [user?.id])

  // 선배 학습 경로 조회 (과목별)
  useEffect(() => {
    if (!user?.id) return
    
    const subjects = ['수학', '영어']  // 우선 2개 과목, 필요시 더 추가
    
    setPeerPathsLoading(true)
    Promise.all(
      subjects.map(subject =>
        recommendationsAPI.getPeerPath(user.id, subject)
          .then(data => ({ subject, ...data }))
          .catch(() => null)  // 개별 실패 무시
      )
    )
      .then(results => {
        const valid = results.filter(r => r !== null)
        setPeerPaths(valid)
      })
      .finally(() => setPeerPathsLoading(false))
  }, [user?.id])

  const handleSolve = async () => {
    if (!answer.trim()) {
      alert('답을 입력해 주세요')
      return
    }
    
    setSolving(true)
    
    try {
      // 오답 기록 API 호출 (어떤 답을 입력했든 시도 기록)
      await wrongAnswerAPI.record({
        studentId: user.id,
        subject: '수학',
        questionId: 'Q-FRAC-001',     
        conceptTag: '분수 나눗셈',
        errorType: 'CONCEPT_GAP',           
      })
    } catch (e) {
      console.error('오답 기록 실패:', e)
    }
    
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

      {/* 맞춤 학습 자료 추천 - 실제 API 연동 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📚 맞춤 학습 자료 추천</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>
            AI가 분석한 개인 맞춤 학습 자료
          </p>
          
          {materialsLoading ? (
            <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
              추천 자료 분석 중...
            </div>
          ) : materials.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {materials.map((m, i) => {
                const icon = getMaterialIcon(m.materialType)
                return (
                  <div key={m.materialId || i} style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 14px', borderRadius:12, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                    <span style={{ fontSize:28, flexShrink:0 }}>{icon.emoji}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {m.title}
                      </p>
                      <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:20, background:'var(--color-primary-light)', color:'var(--color-primary)' }}>
                          {icon.label}
                        </span>
                      </div>
                      {m.matchReason && (
                        <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:6, lineHeight:1.5 }}>
                          💡 {m.matchReason}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // 폴백: mock 데이터 (백엔드에 추천 데이터 없을 때)
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ padding:'8px 12px', borderRadius:8, background:'#FFF8E0', border:'1px solid #FFB80030', marginBottom:8 }}>
                <p style={{ fontSize:11, color:'#8A6500' }}>
                  💡 학습 데이터가 더 쌓이면 정확한 추천을 받을 수 있어요
                </p>
              </div>
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
          )}
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

      {/* 선배 성공 학습 경로 - 실제 API 연동 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>🏅 선배 성공 학습 경로</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>
            비슷한 성적대에서 시작해 성공한 선배들의 패턴
          </p>
          
          {peerPathsLoading ? (
            <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
              선배 학습 경로 분석 중...
            </div>
          ) : peerPaths.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {peerPaths.map(p => {
                const color = SUBJECT_COLORS[p.subject] || 'var(--color-primary)'
                return (
                  <div key={p.subject} style={{ padding:'12px 14px', borderRadius:12, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                    {/* 헤더: 과목 + 분석 인원 */}
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <span style={{ fontSize:13, fontWeight:700, color }}>{p.subject}</span>
                      {p.similarStudentsCount != null && (
                        <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>
                          {p.similarStudentsCount}명 분석
                        </span>
                      )}
                    </div>
                    
                    {/* 평균 향상도 */}
                    {p.avgImprovement != null && (
                      <div style={{ padding:'10px 12px', borderRadius:8, background:'#D1FAF015', border:'1px solid #00C49A30', marginBottom:8, textAlign:'center' }}>
                        <p style={{ fontSize:10, color:'var(--color-text-muted)', marginBottom:2 }}>평균 향상</p>
                        <p style={{ fontSize:18, fontWeight:800, color:'var(--color-success)' }}>
                          ▲ {p.avgImprovement}{typeof p.avgImprovement === 'number' ? '점' : ''}
                        </p>
                      </div>
                    )}
                    
                    {/* 학습 전략 패턴 */}
                    {p.studyStrategyPattern && (
                      <div style={{ padding:'8px 10px', borderRadius:8, background:'var(--color-primary-light)', border:'1px solid #1A56DB20', marginBottom:6 }}>
                        <p style={{ fontSize:10, fontWeight:700, color:'var(--color-primary)', marginBottom:2 }}>📌 학습 전략</p>
                        <p style={{ fontSize:11, color:'var(--color-text-primary)', lineHeight:1.5 }}>
                          {p.studyStrategyPattern}
                        </p>
                      </div>
                    )}
                    
                    {/* 핵심 인사이트 */}
                    {p.keyInsights && (
                      <div style={{ padding:'8px 10px', borderRadius:8, background:'#FFF8E0', border:'1px solid #FFB80030' }}>
                        <p style={{ fontSize:10, fontWeight:700, color:'#8A6500', marginBottom:2 }}>💡 핵심 인사이트</p>
                        <p style={{ fontSize:11, color:'var(--color-text-primary)', lineHeight:1.5 }}>
                          {p.keyInsights}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            // 폴백
            <div style={{ padding:'32px 16px', textAlign:'center', background:'var(--color-surface-2)', borderRadius:12, border:'1px dashed var(--color-border)' }}>
              <p style={{ fontSize:32, marginBottom:8 }}>📊</p>
              <p style={{ fontSize:13, color:'var(--color-text-muted)', marginBottom:4 }}>
                아직 분석할 데이터가 부족해요
              </p>
              <p style={{ fontSize:11, color:'var(--color-text-muted)' }}>
                학습 기록이 쌓이면 비슷한 선배들의 성공 경로를 보여드릴게요
              </p>
            </div>
          )}
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