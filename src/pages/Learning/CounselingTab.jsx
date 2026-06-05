import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { paymentAPI } from '@/api/payment'
import { RecommendRoadmapSection, AnalysisReportSection } from './RecommendRoadmap'
import { counselingAPI, studyPlanAPI, aiReportAPI, gradesAPI } from '@/api'

const SUBJECT_OPTIONS = ['수학', '영어', '국어', '한국사', '사회탐구', '과학탐구']

const REPORT_TYPES = [
  {
    id: 'subjectRecommend',
    title: 'AI 맞춤 문제 추천',
    desc: '오답 기반으로 AI가 취약 개념을 분석하고 문제를 추천합니다',
    emoji: '🤖',
    color: '#0F3460',
    api: 'getSubjectRecommend',
    apiSource: 'aiReport',
    needsSubject: true,
  },
  {
    id: 'reviewPaper',
    title: '맞춤 복습 시험지',
    desc: '내 약점 기반으로 AI가 시험지를 생성합니다',
    emoji: '📝',
    color: '#00C49A',
    api: 'getReviewPaper',
    apiSource: 'studyPlan',
  },
  {
    id: 'math',
    title: '수학 메타인지 분석',
    desc: '자기평가와 실제 성적의 격차를 AI가 분석합니다',
    emoji: '🧠',
    color: '#FF6B35',
    api: 'getMathReport',
    apiSource: 'counseling',
  },
  {
    id: 'writing',
    title: '진로 탐색 리포트',
    desc: '학습 패턴을 기반으로 진로 방향을 제시합니다',
    emoji: '🎯',
    color: '#9B59B6',
    api: 'getWritingReport',
    apiSource: 'counseling',
  },
  {
    id: 'premium',
    title: 'i-Route 프리미엄 리포트',
    desc: '성적·학습·피드백을 종합한 통합 분석 리포트',
    emoji: '⭐',
    color: '#1A56DB',
    api: 'getPremiumReport',
    apiSource: 'counseling',
  },
]

const RETURN_TO = '/learning?tab=counseling'

export default function CounselingTab({ studentId: propStudentId, selectedChild }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const effectiveId = propStudentId ?? user?.id
  const gradeKey = selectedChild?.id ?? selectedChild?.studentId ?? effectiveId
  const storageKey = `counseling-results-${gradeKey}`

  const collapsedKey = `counseling-collapsed-${gradeKey}`

  const [loading, setLoading] = useState({})
  const [results, setResults] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey)) ?? {} } catch { return {} }
  })
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(collapsedKey)) ?? {} } catch { return {} }
  })
  const [errors, setErrors] = useState({})
  const [credits, setCredits] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState({})
  const [subjectsWithGrades, setSubjectsWithGrades] = useState([])
  const [gradesLoading, setGradesLoading] = useState(true)

  useEffect(() => {
    try { setResults(JSON.parse(sessionStorage.getItem(storageKey)) ?? {}) } catch { setResults({}) }
    try { setCollapsed(JSON.parse(sessionStorage.getItem(collapsedKey)) ?? {}) } catch { setCollapsed({}) }
    setErrors({})
    setSelectedSubject({})
  }, [gradeKey])

  // results 변경 시 sessionStorage 동기화
  useEffect(() => {
    if (Object.keys(results).length > 0)
      sessionStorage.setItem(storageKey, JSON.stringify(results))
  }, [results, storageKey])

  // collapsed 변경 시 sessionStorage 동기화
  useEffect(() => {
    sessionStorage.setItem(collapsedKey, JSON.stringify(collapsed))
  }, [collapsed, collapsedKey])

  useEffect(() => {
    if (!gradeKey) return
    setGradesLoading(true)
    gradesAPI.getGrades(gradeKey)
      .then(data => {
        const list = Array.isArray(data) ? data : []
        const subjects = [...new Set(list.map(g => g.subject).filter(Boolean))]
        setSubjectsWithGrades(subjects)
      })
      .catch(() => setSubjectsWithGrades([]))
      .finally(() => setGradesLoading(false))
  }, [gradeKey])

  useEffect(() => {
    paymentAPI.getCredits()
      .then(data => setCredits(data.premiumCredits))
      .catch(() => setCredits(0))
  }, [])

  const toggleCollapse = (id) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const clearResult = (id) => {
    setResults(prev => {
      const next = { ...prev }
      delete next[id]
      sessionStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  const handleGenerate = async (reportType) => {
    const { id, api, apiSource } = reportType

    // 프리미엄 리포트는 크레딧 필요
    if (id === 'premium') {
      if (credits === null) return
      if (credits <= 0) {
        sessionStorage.setItem('payment-return-to', RETURN_TO)
        navigate('/payment')
        return
      }
      try {
        const updated = await paymentAPI.useCredit()
        setCredits(updated.premiumCredits)
      } catch {
        setErrors(prev => ({ ...prev, [id]: '크레딧 사용 중 오류가 발생했습니다.' }))
        return
      }
    }

    setLoading(prev => ({ ...prev, [id]: true }))
    setErrors(prev => ({ ...prev, [id]: null }))

    try {
      let res
      if (apiSource === 'aiReport') {
        const subject = selectedSubject[id] || '수학'
        res = await aiReportAPI[api](gradeKey, subject)
      } else if (apiSource === 'studyPlan') {
        res = await studyPlanAPI[api](String(effectiveId))
      } else {
        res = await counselingAPI[api](gradeKey)
      }
      const now = new Date()
      const ts = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      setResults(prev => ({ ...prev, [id]: { ...res, _generatedAt: ts } }))
      setCollapsed(prev => ({ ...prev, [id]: false }))
    } catch (e) {
      setErrors(prev => ({ ...prev, [id]: e.message }))
      if (id === 'premium') setCredits(prev => (prev ?? 0) + 1)
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #533483 100%)', padding: '24px 20px', color: 'white' }}>
        <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>Python AI 서버 연동</p>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>AI 상담 리포트</h2>
        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 6, lineHeight: 1.5 }}>
          학습 데이터를 AI가 분석해 맞춤형 리포트를 생성합니다
        </p>
      </div>

      {/* 리포트 카드들 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '16px 16px' }}>
        {REPORT_TYPES.map(r => {
          const hasResult = !!results[r.id]
          const isCollapsed = collapsed[r.id] ?? false
          return (
            <div key={r.id} style={{ background: 'var(--color-surface)', borderRadius: 16, border: `1px solid ${hasResult ? r.color + '50' : 'var(--color-border)'}`, overflow: 'hidden' }}>
              {/* 카드 헤더 */}
              <div
                style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 14, cursor: hasResult ? 'pointer' : 'default' }}
                onClick={() => hasResult && toggleCollapse(r.id)}
              >
                <div style={{ width: 48, height: 48, borderRadius: 14, background: r.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {r.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{r.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.desc}</p>
                  {hasResult && results[r.id]._generatedAt && (
                    <p style={{ fontSize: 10, color: r.color, marginTop: 3, fontWeight: 600 }}>
                      ✓ {results[r.id]._generatedAt} 생성
                    </p>
                  )}
                </div>
                {hasResult && (
                  <span style={{ fontSize: 18, color: 'var(--color-text-muted)', flexShrink: 0, transition: 'transform 0.2s', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                    ▾
                  </span>
                )}
              </div>

              {/* 본문 — 결과 없거나 펼쳐진 경우만 */}
              {!isCollapsed && (
                <div style={{ padding: '0 16px 16px' }}>
                  {/* 프리미엄 크레딧 표시 */}
                  {r.id === 'premium' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>보유 크레딧</span>
                      <span style={{
                        fontSize: 13, fontWeight: 700,
                        color: credits > 0 ? '#1A56DB' : 'var(--color-danger)',
                        background: credits > 0 ? '#1A56DB18' : '#FF3B3B12',
                        padding: '2px 10px', borderRadius: 20,
                      }}>
                        {credits === null ? '...' : `${credits}개`}
                      </span>
                    </div>
                  )}

                  {/* 과목 선택 드롭다운 */}
                  {r.needsSubject && (
                    <select
                      value={selectedSubject[r.id] || '수학'}
                      onChange={e => setSelectedSubject(prev => ({ ...prev, [r.id]: e.target.value }))}
                      disabled={loading[r.id]}
                      style={{
                        width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 8,
                        border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
                        fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text-primary)',
                        cursor: loading[r.id] ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}

                  {(() => {
                    const currentSubject = selectedSubject[r.id] || '수학'
                    const hasGrade = !r.needsSubject || subjectsWithGrades.includes(currentSubject)
                    const isDisabled = loading[r.id] || (r.needsSubject && (gradesLoading || !hasGrade))
                    return (
                      <>
                        {r.needsSubject && !gradesLoading && !hasGrade && (
                          <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: '#FFF8E0', border: '1px solid #FFB80030' }}>
                            <p style={{ fontSize: 11, color: '#8A6500' }}>⚠️ {currentSubject} 성적 데이터가 없어요. 성적을 먼저 입력해주세요.</p>
                          </div>
                        )}
                        <button
                          onClick={() => !isDisabled && handleGenerate(r)}
                          disabled={isDisabled}
                          style={{
                            width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                            background: isDisabled ? 'var(--color-text-muted)' : r.color,
                            color: 'white', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s', opacity: isDisabled ? 0.6 : 1,
                          }}
                        >
                          {loading[r.id] ? '🤖 AI 분석 중...' : `${r.emoji} ${hasResult ? '다시 생성' : '리포트 생성'}`}
                        </button>
                      </>
                    )
                  })()}

                  {/* 에러 */}
                  {errors[r.id] && (
                    <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#FFE9E9', border: '1px solid #FF3B3B30' }}>
                      <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                        ❌ {errors[r.id] === 'HTTP 503' ? 'Python AI 서버가 실행 중이지 않습니다' : errors[r.id]}
                      </p>
                    </div>
                  )}

                  {/* 결과 */}
                  {hasResult && (
                    <ResultBlock
                      result={results[r.id]}
                      reportType={r}
                      onClear={() => clearResult(r.id)}
                    />
                  )}
                </div>
              )}

              {/* 접힌 상태 요약바 */}
              {isCollapsed && hasResult && (
                <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: r.color, fontWeight: 600 }}>결과 저장됨</span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>— 헤더를 눌러 펼치세요</span>
                  <button
                    onClick={() => clearResult(r.id)}
                    style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 안내 */}
      <div style={{ margin: '0 16px 24px', padding: '12px 14px', borderRadius: 12, background: '#FFF8E0', border: '1px solid #FFB80040' }}>
        <p style={{ fontSize: 12, color: '#8A6500', lineHeight: 1.5 }}>
  ⚠️ AI 상담 리포트는 Python AI 서버가 실행 중일 때만 사용 가능합니다. 서버 오류 시 백엔드팀에 문의하세요.
</p>
      </div>
    </div>
  )
}

// "질문: ...\n답변: ..." 형식 문자열을 파싱
function parseQuestion(raw) {
  if (typeof raw === 'object' && raw !== null) return raw
  const str = String(raw)
  const qMatch = str.match(/질문[:：]\s*([\s\S]+?)(?=\n답변[:：]|$)/i)
  const aMatch = str.match(/답변[:：]\s*([\s\S]+)/i)
  return {
    question: qMatch?.[1]?.trim() || str,
    answer: aMatch?.[1]?.trim() || '',
  }
}

function printReviewPaper(questions, weakConcepts) {
  const parsed = questions.map(parseQuestion)
  const html = `
    <html><head><meta charset="utf-8">
    <style>
      body { font-family: 'Malgun Gothic', sans-serif; padding: 32px; color: #111; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
      .weak { background: #FFF8E0; border: 1px solid #FFB800; border-radius: 6px; padding: 8px 12px; font-size: 12px; margin-bottom: 20px; }
      .q-block { margin-bottom: 18px; padding: 14px; border: 1px solid #ddd; border-radius: 8px; page-break-inside: avoid; }
      .q-num { display: inline-block; background: #00C49A; color: white; border-radius: 50%; width: 22px; height: 22px; text-align: center; line-height: 22px; font-size: 11px; font-weight: 700; margin-right: 8px; }
      .q-text { font-size: 14px; font-weight: 600; margin-bottom: 10px; }
      .a-label { font-size: 11px; color: #00C49A; font-weight: 700; margin-bottom: 4px; }
      .a-text { font-size: 13px; color: #333; line-height: 1.6; }
      @media print { body { padding: 16px; } }
    </style></head><body>
    <h1>📝 맞춤 복습 시험지</h1>
    <div class="meta">생성일: ${new Date().toLocaleDateString('ko-KR')} &nbsp;|&nbsp; 총 ${parsed.length}문제</div>
    ${weakConcepts?.length ? `<div class="weak"><strong>⚠️ 취약 개념</strong><ul style="margin:6px 0 0 16px;padding:0">${weakConcepts.map(c => `<li>${c}</li>`).join('')}</ul></div>` : ''}
    ${parsed.map((q, i) => `
      <div class="q-block">
        <div class="q-text"><span class="q-num">${i + 1}</span>${q.question}</div>
        ${q.answer ? `<div class="a-label">정답</div><div class="a-text">${q.answer}</div>` : ''}
      </div>`).join('')}
    </body></html>`
  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}

function printTextReport(reportType, result) {
  const title = result.title || reportType.title
  const content = result.careerAnalysis || result.summary || result.analysis || ''
  const guide = result.learningGuide || result.guide || result.recommend || ''
  const recommendation = result.aiRecommendationReport || ''
  const concept = result.targetConcept || ''
  const ts = result._generatedAt || new Date().toLocaleDateString('ko-KR')

  const html = `
    <html><head><meta charset="utf-8">
    <style>
      body { font-family: 'Malgun Gothic', sans-serif; padding: 32px; color: #111; max-width: 720px; margin: 0 auto; }
      h1 { font-size: 20px; margin-bottom: 4px; color: ${reportType.color}; }
      .meta { font-size: 12px; color: #666; margin-bottom: 20px; }
      .section { margin-bottom: 20px; padding: 14px; border: 1px solid #ddd; border-radius: 8px; }
      .section-title { font-size: 12px; font-weight: 700; color: ${reportType.color}; margin-bottom: 8px; }
      .section-body { font-size: 13px; color: #333; line-height: 1.8; white-space: pre-wrap; }
      .concept { background: ${reportType.color}15; border: 1px solid ${reportType.color}40; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 14px; font-weight: 700; color: ${reportType.color}; }
      @media print { body { padding: 16px; } }
    </style></head><body>
    <h1>${reportType.emoji} ${title}</h1>
    <div class="meta">생성일: ${ts}</div>
    ${concept ? `<div class="concept">🎯 ${concept}</div>` : ''}
    ${content ? `<div class="section"><div class="section-title">📋 분석 결과</div><div class="section-body">${content}</div></div>` : ''}
    ${recommendation ? `<div class="section"><div class="section-title">🤖 AI 추천 리포트</div><div class="section-body">${recommendation}</div></div>` : ''}
    ${guide ? `<div class="section"><div class="section-title">💡 학습 가이드</div><div class="section-body">${guide}</div></div>` : ''}
    </body></html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}

// 결과 표시 컴포넌트
function ResultBlock({ result, reportType, onClear }) {
  const isReviewPaper      = reportType.id === 'reviewPaper'
  const isSubjectRecommend = reportType.id === 'subjectRecommend'

  // 시험지 전용 — questions는 문자열 배열 또는 객체 배열 모두 대응
  const rawQuestions = result.questions || result.problems || []
  const parsedQuestions = rawQuestions.map(parseQuestion)
  const weakConcepts = result.weakConcepts || []

  // 일반 리포트
  const title          = result.title || reportType.title
  const careerAnalysis = result.careerAnalysis || result.summary || result.analysis || ''
  const learningGuide  = result.learningGuide || result.guide || result.recommend || ''

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* ── AI 맞춤 문제 추천 결과 ── */}
      {isSubjectRecommend && (
        <>
          {result.targetConcept && (
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: '#0F346015', border: '1px solid #0F346030',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <div>
                <p style={{ fontSize: 11, color: '#0F3460', fontWeight: 600 }}>분석된 취약 개념</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#0F3460', marginTop: 2 }}>
                  {result.targetConcept}
                </p>
              </div>
            </div>
          )}

          {result.aiRecommendationReport && (
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#0F3460', marginBottom: 8 }}>
                🤖 AI 추천 리포트
              </p>
              <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {result.aiRecommendationReport}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── 시험지 전용 ── */}
      {isReviewPaper && (
        <>
          {/* 헤더 + PDF 버튼 */}
          <div style={{
            padding: '14px', borderRadius: 10,
            background: `${reportType.color}15`, border: `1px solid ${reportType.color}30`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>📄</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: reportType.color }}>시험지 생성 완료</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  총 {parsedQuestions.length}문제
                  {weakConcepts.length > 0 && ` · 취약 개념 ${weakConcepts.length}개`}
                </p>
              </div>
            </div>
            {weakConcepts.length > 0 && (
              <div style={{ marginBottom: 10, padding: '8px 10px', borderRadius: 8, background: '#FFF8E0', border: '1px solid #FFB80040' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#8A6500', marginBottom: 4 }}>⚠️ 취약 개념</p>
                <ul style={{ margin: 0, paddingLeft: 14 }}>
                  {weakConcepts.map((c, i) => (
                    <li key={i} style={{ fontSize: 11, color: '#8A6500', lineHeight: 1.6 }}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={() => printReviewPaper(rawQuestions, weakConcepts)}
              style={{
                display: 'block', width: '100%', padding: '10px', borderRadius: 8,
                background: reportType.color, color: 'white', textAlign: 'center',
                fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              📥 PDF로 저장 (인쇄)
            </button>
          </div>

          {/* 문제 미리보기 */}
          {parsedQuestions.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                📋 문제 미리보기
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {parsedQuestions.map((q, i) => (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{
                        width: 22, height: 22, flexShrink: 0, borderRadius: '50%',
                        background: reportType.color, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, fontWeight: 700,
                      }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.5, fontWeight: 600 }}>
                          {q.question}
                        </p>
                        {q.answer && (
                          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5, marginTop: 4, borderTop: '1px solid var(--color-border)', paddingTop: 4 }}>
                            💡 {q.answer}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 일반 리포트 - careerAnalysis */}
      {!isReviewPaper && !isSubjectRecommend && careerAnalysis && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: reportType.color + '10', border: `1px solid ${reportType.color}30` }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: reportType.color, marginBottom: 6 }}>
            📋 {title}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {careerAnalysis}
          </p>
        </div>
      )}

      {/* 학습 가이드 */}
      {learningGuide && (
        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-primary-light)', border: '1px solid #1A56DB20' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>💡 학습 가이드</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
            {learningGuide}
          </p>
        </div>
      )}

      {/* PDF 저장 + 결과 삭제 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => isReviewPaper
            ? printReviewPaper(rawQuestions, weakConcepts)
            : printTextReport(reportType, result)
          }
          style={{
            flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${reportType.color}`,
            background: 'transparent', color: reportType.color,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          📥 PDF로 저장
        </button>
        {onClear && (
          <button
            onClick={onClear}
            style={{
              padding: '9px 14px', borderRadius: 8, border: '1px solid var(--color-border)',
              background: 'transparent', color: 'var(--color-text-muted)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            삭제
          </button>
        )}
      </div>
    </div>
  )
}
