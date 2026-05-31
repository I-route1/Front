import { useState, useEffect } from 'react'
import { gradesAPI, recommendationsAPI, analysisAPI, wrongAnswerAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { SUBJECT_COLORS, RECOMMEND_BOOKS } from './data/mockData'

const TENDENCY_INFO = {
  'VISUAL': { 
    emoji: '👁️', 
    label: '시각형', 
    color: '#1A56DB',
    description: '이미지, 도표, 마인드맵 활용에 강해요',
  },
  'AUDITORY': { 
    emoji: '🎧', 
    label: '청각형', 
    color: '#9B59B6',
    description: '소리내어 읽기, 토론, 강의 듣기에 강해요',
  },
  'KINESTHETIC': { 
    emoji: '🤸', 
    label: '행동형', 
    color: '#FF6B35',
    description: '직접 손으로 쓰고 움직이며 학습할 때 효과적이에요',
  },
}

// subjectName → subjectId 매핑
const SUBJECT_ID_BY_NAME = {
  '국어': 1,
  '수학': 2,
  '영어': 3,
  '한국사': 4,
  '사회탐구': 5,
  '과학탐구': 6,
}

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
  const [studyMethods, setStudyMethods] = useState({})  
  const [studyMethodsLoading, setStudyMethodsLoading] = useState(false)
  
  // 학습 패턴 v2
  const [studyPattern, setStudyPattern]       = useState(null)
  const [patternLoading, setPatternLoading]   = useState(true)
  
  // 학습 자료 추천
  const [materials, setMaterials]             = useState([])
  const [materialsLoading, setMaterialsLoading] = useState(true)
  
  // 선배 학습 경로
  const [peerPaths, setPeerPaths]             = useState([])
  const [peerPathsLoading, setPeerPathsLoading] = useState(true)

  // 학습 성향 표시 정보
  const [peerContent, setPeerContent] = useState(null)
  const [peerContentLoading, setPeerContentLoading] = useState(true)

  // 🆕 또래 콘텐츠 조회
  useEffect(() => {
    if (!user?.id) return
    
    setPeerContentLoading(true)
    recommendationsAPI.getPeerContent(String(user.id))
      .then(data => setPeerContent(data))
      .catch(e => {
        console.error('또래 콘텐츠 조회 실패:', e)
        setPeerContent(null)
      })
      .finally(() => setPeerContentLoading(false))
  }, [user?.id])

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

  // 학습 패턴 받은 후 → 각 과목별 학습 방법 조회
  useEffect(() => {
    if (!user?.id || !studyPattern?.subjectStudyMinutes) return
    
    const subjects = Object.keys(studyPattern.subjectStudyMinutes)
    if (subjects.length === 0) return
    
    setStudyMethodsLoading(true)
    
    Promise.all(
      subjects.map(subject => {
        const subjectId = SUBJECT_ID_BY_NAME[subject]
        if (!subjectId) return Promise.resolve([subject, null])
        
        return recommendationsAPI.getStudyMethod(user.id, subjectId)
          .then(data => [subject, data])
          .catch(() => [subject, null])
      })
    ).then(entries => {
      const map = {}
      entries.forEach(([subject, data]) => {
        if (data) map[subject] = data
      })
      setStudyMethods(map)
    })
    .finally(() => setStudyMethodsLoading(false))
  }, [user?.id, studyPattern])

  // 학습 자료 추천 조회
  useEffect(() => {
    if (!user?.id) return
    
    setMaterialsLoading(true)
    recommendationsAPI.getMaterials(user.id)
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.materials || [])
        setMaterials(list)
      })
      .catch(e => {
        console.error('학습 자료 추천 조회 실패:', e)
        setMaterials([])
      })
      .finally(() => setMaterialsLoading(false))
  }, [user?.id])
  {/* 🆕 또래 콘텐츠 섹션 */}
  <section style={{ margin: '0 16px 16px', padding: '16px', background: 'var(--color-surface)', borderRadius: 14, border: '1.5px solid var(--color-border)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)' }}>
        👥 또래가 푸는 콘텐츠
      </h3>
      {peerContent?.peerLevel && (
        <span style={{ 
          padding: '3px 10px', borderRadius: 20,
          background: 'var(--color-primary-light)', color: 'var(--color-primary)',
          fontSize: 10, fontWeight: 700,
        }}>
          {peerContent.peerLevel}
        </span>
      )}
    </div>
    
    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
      💡 비슷한 성적대 학생들이 함께 풀고 점수가 향상된 콘텐츠예요
    </p>
    
    {peerContentLoading ? (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
        또래 콘텐츠 분석 중...
      </div>
    ) : (peerContent?.contents?.length > 0 || peerContent?.items?.length > 0) ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(peerContent.contents || peerContent.items || []).slice(0, 5).map((item, i) => (
          <PeerContentCard key={i} item={item} />
        ))}
      </div>
    ) : (
      // 폴백: mock 데이터로 보여주기
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PeerContentCard item={{
          title: '수능 기출 모의고사 - 수학', 
          subject: '수학',
          peerCount: 142,
          avgImprovement: 4.8,
          type: 'MOCK_EXAM',
        }} />
        <PeerContentCard item={{
          title: '주간 단어 챌린지', 
          subject: '영어',
          peerCount: 89,
          avgImprovement: 3.2,
          type: 'CHALLENGE',
        }} />
        <PeerContentCard item={{
          title: '국어 비문학 독해 훈련', 
          subject: '국어',
          peerCount: 67,
          avgImprovement: 2.5,
          type: 'PRACTICE',
        }} />
      </div>
    )}
  </section>

  // 선배 학습 경로 조회 (과목별)
  useEffect(() => {
    if (!user?.id) return
    
    const subjects = ['수학', '영어']
    
    setPeerPathsLoading(true)
    Promise.all(
      subjects.map(subject =>
        recommendationsAPI.getPeerPath(user.id, subject)
          .then(data => ({ subject, ...data }))
          .catch(() => null)
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
      // 오답 기록 API 호출
      await wrongAnswerAPI.record({
        studentId: user.id,
        subject: '수학',
        questionId: 'Q-FRAC-001',
        conceptTag: '분수 나눗셈',
        errorType: 'CONCEPT_GAP',
      })
    } catch (e) {
      console.error('오답 기록 실패:', e)
      // 실패해도 UX 진행
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

      {/* 맞춤 학습 자료 추천 - API 연동 */}
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
            // 폴백: mock 데이터
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

      {/* 선배 성공 학습 경로 - API 연동 */}
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
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                      <span style={{ fontSize:13, fontWeight:700, color }}>{p.subject}</span>
                      {p.similarStudentsCount != null && (
                        <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>
                          {p.similarStudentsCount}명 분석
                        </span>
                      )}
                    </div>
                    
                    {p.avgImprovement != null && (
                      <div style={{ padding:'10px 12px', borderRadius:8, background:'#D1FAF015', border:'1px solid #00C49A30', marginBottom:8, textAlign:'center' }}>
                        <p style={{ fontSize:10, color:'var(--color-text-muted)', marginBottom:2 }}>평균 향상</p>
                        <p style={{ fontSize:18, fontWeight:800, color:'var(--color-success)' }}>
                          ▲ {p.avgImprovement}{typeof p.avgImprovement === 'number' ? '점' : ''}
                        </p>
                      </div>
                    )}
                    
                    {p.studyStrategyPattern && (
                      <div style={{ padding:'8px 10px', borderRadius:8, background:'var(--color-primary-light)', border:'1px solid #1A56DB20', marginBottom:6 }}>
                        <p style={{ fontSize:10, fontWeight:700, color:'var(--color-primary)', marginBottom:2 }}>📌 학습 전략</p>
                        <p style={{ fontSize:11, color:'var(--color-text-primary)', lineHeight:1.5 }}>
                          {p.studyStrategyPattern}
                        </p>
                      </div>
                    )}
                    
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

      {/* 맞춤 공부 방식 - 학습 패턴 v2 기반 */}
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

              {/* 나의 학습 성향 (대표 과목 기준) */}
              {(() => {
                const subjects = Object.keys(studyMethods)
                if (subjects.length === 0) return null
                
                // 가장 많이 공부한 과목 = 대표 과목
                const topSubject = Object.entries(studyPattern.subjectStudyMinutes)
                  .sort((a, b) => b[1] - a[1])[0]?.[0]
                
                const mainMethod = studyMethods[topSubject]
                if (!mainMethod?.tendency) return null
                
                const info = TENDENCY_INFO[mainMethod.tendency] || TENDENCY_INFO.VISUAL
                
                return (
                  <div style={{ 
                    padding:'16px', borderRadius:14, 
                    background:`linear-gradient(135deg, ${info.color}15, ${info.color}08)`,
                    border:`1.5px solid ${info.color}40`,
                    marginBottom:14,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                      <span style={{ fontSize:36 }}>{info.emoji}</span>
                      <div>
                        <p style={{ fontSize:11, fontWeight:600, color:info.color, marginBottom:2 }}>
                          나의 학습 성향 ({topSubject} 기준)
                        </p>
                        <p style={{ fontSize:20, fontWeight:800, color:info.color }}>
                          {info.label}
                        </p>
                        <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:2 }}>
                          {info.description}
                        </p>
                      </div>
                    </div>
                    
                    {mainMethod.studyGuide && (
                      <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.6)', marginBottom:6 }}>
                        <p style={{ fontSize:11, fontWeight:700, color:info.color, marginBottom:4 }}>📖 학습 가이드</p>
                        <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>
                          {mainMethod.studyGuide}
                        </p>
                      </div>
                    )}
                    
                    {mainMethod.recommendedApproach && (
                      <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.6)' }}>
                        <p style={{ fontSize:11, fontWeight:700, color:info.color, marginBottom:4 }}>🎯 추천 접근법</p>
                        <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>
                          {mainMethod.recommendedApproach}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })()}
              
              {/* 과목별 학습 가이드 (API 기반) */}
              <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
                📚 과목별 학습 가이드
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {Object.keys(studyPattern.subjectStudyMinutes).map(subject => {
                  const apiData = studyMethods[subject]
                  const fallback = SUBJECT_TIPS[subject] || { tip: '꾸준한 학습이 가장 중요해요', emoji: '✏️' }
                  
                  // API 데이터 있으면 그거 사용, 없으면 mock 폴백
                  if (apiData?.studyGuide) {
                    const info = TENDENCY_INFO[apiData.tendency] || TENDENCY_INFO.VISUAL
                    return (
                      <div key={subject} style={{ 
                        padding:'12px 14px', borderRadius:10, 
                        background:'var(--color-surface-2)', 
                        border:`1px solid ${info.color}30`,
                      }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <span style={{ fontSize:18 }}>{info.emoji}</span>
                          <span style={{ fontSize:13, fontWeight:700, color:SUBJECT_COLORS[subject] || 'var(--color-primary)' }}>
                            {subject}
                          </span>
                          <span style={{ 
                            fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:20, 
                            background:info.color+'18', color:info.color,
                          }}>
                            {info.label}
                          </span>
                        </div>
                        <p style={{ fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.5, marginBottom:4 }}>
                          {apiData.studyGuide}
                        </p>
                        {apiData.recommendedApproach && (
                          <p style={{ fontSize:11, color:'var(--color-text-muted)', lineHeight:1.5, marginTop:6, paddingTop:6, borderTop:'1px dashed var(--color-border)' }}>
                            💡 {apiData.recommendedApproach}
                          </p>
                        )}
                      </div>
                    )
                  }
                  
                  // 폴백: 기존 mock 팁
                  return (
                    <div key={subject} style={{ display:'flex', gap:12, padding:'11px 13px', borderRadius:10, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                      <span style={{ fontSize:20, flexShrink:0 }}>{fallback.emoji}</span>
                      <div>
                        <p style={{ fontSize:12, fontWeight:700, color:SUBJECT_COLORS[subject] || 'var(--color-primary)' }}>{subject}</p>
                        <p style={{ fontSize:12, color:'var(--color-text-secondary)', marginTop:2, lineHeight:1.5 }}>{fallback.tip}</p>
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
}function PeerContentCard({ item }) {
  const SUBJECT_COLORS_LOCAL = {
    국어:'#1A56DB', 수학:'#FF6B35', 영어:'#00C49A', 
    사회:'#9B59B6', 과학:'#FFB800',
  }
  
  const subject = item.subject || item.subjectName || ''
  const title = item.title || item.name || item.contentName || '추천 콘텐츠'
  const type = item.type || item.contentType || ''
  const peerCount = item.peerCount ?? item.userCount ?? item.studentCount ?? null
  const avgImprovement = item.avgImprovement ?? item.improvement ?? null
  const avgScore = item.avgScore ?? item.averageScore ?? null
  
  const color = SUBJECT_COLORS_LOCAL[subject] || '#1A56DB'
  
  // 콘텐츠 타입 아이콘
  const getTypeIcon = (t) => {
    const upper = String(t).toUpperCase()
    if (upper.includes('MOCK') || upper.includes('EXAM')) return '📝'
    if (upper.includes('CHALLENGE')) return '🏆'
    if (upper.includes('PRACTICE')) return '✏️'
    if (upper.includes('VIDEO')) return '🎥'
    return '📚'
  }
  
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: 'var(--color-surface-2)', border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', gap: 12,
      cursor: 'pointer', transition: 'all 0.15s',
    }}>
      <span style={{ fontSize: 24, flexShrink: 0 }}>
        {getTypeIcon(type)}
      </span>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          {subject && (
            <span style={{
              padding: '2px 7px', borderRadius: 6,
              background: color + '18', color, 
              fontSize: 9, fontWeight: 700,
            }}>
              {subject}
            </span>
          )}
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {title}
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10, color: 'var(--color-text-muted)' }}>
          {peerCount != null && (
            <span>👥 {peerCount}명이 푸는 중</span>
          )}
          {avgImprovement != null && (
            <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>
              ▲ 평균 {avgImprovement}점 상승
            </span>
          )}
          {avgScore != null && !avgImprovement && (
            <span>평균 {avgScore}점</span>
          )}
        </div>
      </div>
      
      <span style={{ 
        fontSize: 16, color: 'var(--color-text-muted)', flexShrink: 0,
      }}>
        →
      </span>
    </div>
  )
}