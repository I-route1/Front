import { useState, useEffect } from 'react'
import { counselingAPI, studyPlanAPI, aiReportAPI, gradesAPI } from '@/api'

const SUBJECT_OPTIONS = ['수학', '영어', '국어', '한국사', '사회탐구', '과학탐구']

const REPORT_TYPES = [
  {
    id: 'subjectRecommend',
    title: 'AI 맞춤 문제 추천',
    description: '오답 기반으로 AI가 취약 개념을 분석하고 문제를 추천합니다',
    emoji: '🤖',
    color: '#0F3460',
    api: 'getSubjectRecommend',
    apiSource: 'aiReport',
    needsSubject: true,
  },
  {
    id: 'reviewPaper',
    title: '맞춤 복습 시험지',
    description: '학생 약점 기반으로 시험지를 생성',
    emoji: '📝',
    color: '#00C49A',
    api: 'getReviewPaper',
    apiSource: 'studyPlan',
    primary: true,
  },
  {
    id: 'math',
    title: '수학 메타인지 리포트',
    description: '자기평가와 실제 성적의 격차를 AI가 분석',
    emoji: '🧮',
    color: '#1A56DB',
    api: 'getMathReport',
    apiSource: 'counseling',
  },
  {
    id: 'writing',
    title: '진로 탐색 리포트',
    description: '학생의 학습 성향 기반 진로 추천',
    emoji: '🎯',
    color: '#9C88FF',
    api: 'getWritingReport',
    apiSource: 'counseling',
  },
  {
    id: 'premium',
    title: '프리미엄 통합 리포트',
    description: '학업·진로·학습 가이드 종합 분석',
    emoji: '👑',
    color: '#FFB800',
    api: 'getPremiumReport',
    apiSource: 'counseling',
  },
]

export default function ReportPanel({ student }) {
  const studentId = student ? String(student.id) : null
  const storageKey   = `admin-report-results-${studentId}`
  const collapsedKey = `admin-report-collapsed-${studentId}`

  const [loading, setLoading] = useState({})
  const [reports, setReports] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey)) ?? {} } catch { return {} }
  })
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(collapsedKey)) ?? {} } catch { return {} }
  })
  const [errors, setErrors] = useState({})
  const [selectedSubject, setSelectedSubject] = useState({})
  const [subjectsWithGrades, setSubjectsWithGrades] = useState([])
  const [gradesLoading, setGradesLoading] = useState(true)

  // 학생이 바뀌면 상태 초기화
  useEffect(() => {
    if (!studentId) return
    try { setReports(JSON.parse(sessionStorage.getItem(storageKey)) ?? {}) } catch { setReports({}) }
    try { setCollapsed(JSON.parse(sessionStorage.getItem(collapsedKey)) ?? {}) } catch { setCollapsed({}) }
    setErrors({})
    setSelectedSubject({})
  }, [studentId])

  useEffect(() => {
    if (Object.keys(reports).length > 0)
      sessionStorage.setItem(storageKey, JSON.stringify(reports))
  }, [reports, storageKey])

  useEffect(() => {
    sessionStorage.setItem(collapsedKey, JSON.stringify(collapsed))
  }, [collapsed, collapsedKey])

  useEffect(() => {
    if (!studentId) return
    setGradesLoading(true)
    gradesAPI.getGrades(studentId)
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setSubjectsWithGrades([...new Set(list.map(g => g.subject).filter(Boolean))])
      })
      .catch(() => setSubjectsWithGrades([]))
      .finally(() => setGradesLoading(false))
  }, [studentId])

  if (!student) return null

  const toggleCollapse = (id) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const clearResult = (id) => {
    setReports(prev => {
      const next = { ...prev }
      delete next[id]
      sessionStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  const generateReport = async (reportType) => {
    const { id, api, apiSource } = reportType

    setLoading(prev => ({ ...prev, [id]: true }))
    setErrors(prev => ({ ...prev, [id]: null }))

    try {
      let res
      if (apiSource === 'aiReport') {
        const subject = selectedSubject[id] || '수학'
        res = await aiReportAPI[api](studentId, subject)
      } else if (apiSource === 'studyPlan') {
        res = await studyPlanAPI[api](studentId)
      } else {
        res = await counselingAPI[api](studentId)
      }
      const now = new Date()
      const ts = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      setReports(prev => ({ ...prev, [id]: { ...res, _generatedAt: ts } }))
      setCollapsed(prev => ({ ...prev, [id]: false }))
    } catch (e) {
      setErrors(prev => ({
        ...prev,
        [id]: e.message === 'HTTP 503' ? 'Python AI 서버가 실행 중이지 않습니다' : e.message,
      }))
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* 헤더 안내 */}
      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: 'linear-gradient(135deg, #FFF8E0, #FFE9D6)',
        border: '1px solid #FFB80040',
      }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#8A6500', marginBottom: 4 }}>
          🤖 AI 상담 리포트
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
          학생의 학습 데이터를 분석해 맞춤 리포트를 생성합니다.
          생성에 약 5~10초 소요됩니다.
        </p>
      </div>

      {/* 리포트 카드들 */}
      {REPORT_TYPES.map(type => {
        const hasResult  = !!reports[type.id]
        const isCollapsed = collapsed[type.id] ?? false

        return (
          <div
            key={type.id}
            style={{
              borderRadius: 12,
              background: 'var(--color-surface)',
              border: hasResult
                ? `1.5px solid ${type.color}50`
                : `1.5px solid ${type.color}30`,
              overflow: 'hidden',
            }}
          >
            {/* 카드 헤더 */}
            <div
              style={{
                padding: '14px 14px 10px', display: 'flex',
                alignItems: 'center', gap: 12,
                cursor: hasResult ? 'pointer' : 'default',
              }}
              onClick={() => hasResult && toggleCollapse(type.id)}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: type.color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>
                {type.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: type.color }}>
                  {type.title}
                  {type.primary && (
                    <span style={{
                      marginLeft: 6, fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 20,
                      background: type.color, color: 'white',
                    }}>
                      추천
                    </span>
                  )}
                </p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {type.description}
                </p>
                {hasResult && reports[type.id]._generatedAt && (
                  <p style={{ fontSize: 10, color: type.color, marginTop: 3, fontWeight: 600 }}>
                    ✓ {reports[type.id]._generatedAt} 생성
                  </p>
                )}
              </div>
              {hasResult && (
                <span style={{
                  fontSize: 18, color: 'var(--color-text-muted)', flexShrink: 0,
                  transition: 'transform 0.2s',
                  transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                }}>
                  ▾
                </span>
              )}
            </div>

            {/* 본문 — 결과 없거나 펼쳐진 경우만 */}
            {!isCollapsed && (
              <div style={{ padding: '0 14px 14px' }}>

                {/* 과목 선택 드롭다운 */}
                {type.needsSubject && (
                  <select
                    value={selectedSubject[type.id] || '수학'}
                    onChange={e => setSelectedSubject(prev => ({ ...prev, [type.id]: e.target.value }))}
                    disabled={loading[type.id]}
                    style={{
                      width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 8,
                      border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
                      fontSize: 13, fontFamily: 'inherit', color: 'var(--color-text-primary)',
                      cursor: loading[type.id] ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}

                {(() => {
                  const currentSubject = selectedSubject[type.id] || '수학'
                  const hasGrade = !type.needsSubject || subjectsWithGrades.includes(currentSubject)
                  const isDisabled = loading[type.id] || (type.needsSubject && (gradesLoading || !hasGrade))
                  return (
                    <>
                      {type.needsSubject && !gradesLoading && !hasGrade && (
                        <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: '#FFF8E0', border: '1px solid #FFB80030' }}>
                          <p style={{ fontSize: 11, color: '#8A6500' }}>
                            ⚠️ {currentSubject} 성적 데이터가 없어요. 성적을 먼저 입력해주세요.
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => !isDisabled && generateReport(type)}
                        disabled={isDisabled}
                        style={{
                          width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                          background: isDisabled
                            ? 'var(--color-text-muted)'
                            : `linear-gradient(90deg, ${type.color}, ${type.color}CC)`,
                          color: 'white', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.6 : 1,
                        }}
                      >
                        {loading[type.id]
                          ? '🤖 AI 분석 중...'
                          : `${type.emoji} ${hasResult ? '다시 생성' : '리포트 생성'}`}
                      </button>
                    </>
                  )
                })()}

                {/* 에러 */}
                {errors[type.id] && (
                  <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#FFE9E9', border: '1px solid #FF3B3B30' }}>
                    <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                      ❌ {errors[type.id]}
                    </p>
                  </div>
                )}

                {/* 결과 */}
                {hasResult && (
                  <ResultBlock
                    result={reports[type.id]}
                    reportType={type}
                    onClear={() => clearResult(type.id)}
                  />
                )}
              </div>
            )}

            {/* 접힌 상태 요약바 */}
            {isCollapsed && hasResult && (
              <div style={{ padding: '8px 14px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: type.color, fontWeight: 600 }}>결과 저장됨</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>— 헤더를 눌러 펼치세요</span>
                <button
                  onClick={() => clearResult(type.id)}
                  style={{
                    marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                  }}
                >
                  삭제
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

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
  const title          = result.title || reportType.title
  const content        = result.careerAnalysis || result.summary || result.analysis || ''
  const guide          = result.learningGuide || result.guide || result.recommend || ''
  const recommendation = result.aiRecommendationReport || ''
  const concept        = result.targetConcept || ''
  const ts             = result._generatedAt || new Date().toLocaleDateString('ko-KR')

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
    ${concept        ? `<div class="concept">🎯 ${concept}</div>` : ''}
    ${content        ? `<div class="section"><div class="section-title">📋 분석 결과</div><div class="section-body">${content}</div></div>` : ''}
    ${recommendation ? `<div class="section"><div class="section-title">🤖 AI 추천 리포트</div><div class="section-body">${recommendation}</div></div>` : ''}
    ${guide          ? `<div class="section"><div class="section-title">💡 학습 가이드</div><div class="section-body">${guide}</div></div>` : ''}
    </body></html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 500)
}

function ResultBlock({ result, reportType, onClear }) {
  const isReviewPaper      = reportType.id === 'reviewPaper'
  const isSubjectRecommend = reportType.id === 'subjectRecommend'

  const rawQuestions   = result.questions || result.problems || []
  const parsedQuestions = rawQuestions.map(parseQuestion)
  const weakConcepts   = result.weakConcepts || []

  const title          = result.title || reportType.title
  const careerAnalysis = result.careerAnalysis || result.summary || result.analysis || ''
  const learningGuide  = result.learningGuide || result.guide || result.recommend || ''

  return (
    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* AI 맞춤 문제 추천 결과 */}
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

      {/* 시험지 전용 */}
      {isReviewPaper && (
        <>
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
                fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              📥 PDF로 저장 (인쇄)
            </button>
          </div>

          {parsedQuestions.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                📋 문제 미리보기
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {parsedQuestions.map((q, i) => (
                  <div key={i} style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  }}>
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

      {/* 일반 리포트 */}
      {!isReviewPaper && !isSubjectRecommend && careerAnalysis && (
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: reportType.color + '10', border: `1px solid ${reportType.color}30`,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: reportType.color, marginBottom: 6 }}>
            📋 {title}
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
            {careerAnalysis}
          </p>
        </div>
      )}

      {learningGuide && (
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: 'var(--color-primary-light)', border: '1px solid #1A56DB20',
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 4 }}>
            💡 학습 가이드
          </p>
          <p style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>
            {learningGuide}
          </p>
        </div>
      )}

      {/* PDF 저장 + 결과 삭제 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => isReviewPaper
            ? printReviewPaper(rawQuestions, weakConcepts)
            : printTextReport(reportType, result)
          }
          style={{
            flex: 1, padding: '9px', borderRadius: 8,
            border: `1px solid ${reportType.color}`, background: 'transparent',
            color: reportType.color, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          📥 PDF로 저장
        </button>
        {onClear && (
          <button
            onClick={onClear}
            style={{
              padding: '9px 14px', borderRadius: 8,
              border: '1px solid var(--color-border)', background: 'transparent',
              color: 'var(--color-text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            삭제
          </button>
        )}
      </div>
    </div>
  )
}
