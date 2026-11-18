import ReviewPaper, { printReviewPaper, reviewQuestions } from '@/components/learning/ReviewPaper'
import { useState, useEffect } from 'react'
import useSavedCounselingReports from '@/hooks/useSavedCounselingReports'
import { SavedReportPicker, SavedReportStatus } from '@/components/learning/SavedReportControls'
import { UNCLASSIFIED_REPORT } from '@/utils/savedReports'
import CoachingSummaryCard from '@/components/learning/CoachingSummaryCard'
import { useNavigate } from 'react-router-dom'
import { paymentAPI } from '@/api/payment'
import { RecommendRoadmapSection, AnalysisReportSection } from './RecommendRoadmap'
import { counselingAPI, studyPlanAPI, aiReportAPI, gradesAPI } from '@/api'
import ReportContent, { printTextReport } from '@/components/learning/ReportContent'

import { REPORT_SUBJECTS as SUBJECT_OPTIONS, normalizeReportSubject } from '@/utils/reportSubjects'

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
    desc: '복습할 개념에 맞는 문제를 풀고 정답을 확인합니다',
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
    title: '국어·진로 탐색 리포트',
    desc: '국어 학습 수준과 언어·작문 역량을 바탕으로 진로와 학습 방향을 제시합니다',
    emoji: '🎯',
    color: '#9B59B6',
    api: 'getWritingReport',
    apiSource: 'counseling',
  },
  {
    id: 'english',
    title: '영어 메타인지 리포트',
    desc: '영어 성적과 취약 개념을 분석해 맞춤 학습 전략을 제시합니다',
    emoji: '📖',
    color: '#00A896',
    api: 'getEnglishReport',
    apiSource: 'counseling',
  },
  {
    id: 'science',
    title: '과학 메타인지 리포트',
    desc: '과학 성적과 취약 개념을 분석해 맞춤 학습 전략을 제시합니다',
    emoji: '🔬',
    color: '#0088CC',
    api: 'getScienceReport',
    apiSource: 'counseling',
  },
  {
    id: 'social',
    title: '사회 메타인지 리포트',
    desc: '사회 성적과 취약 개념을 분석해 맞춤 학습 전략을 제시합니다',
    emoji: '🌍',
    color: '#D97706',
    api: 'getSocialReport',
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
  const navigate = useNavigate()
  const effectiveId = propStudentId ?? selectedChild?.studentId ?? selectedChild?.id
  const gradeKey = effectiveId
  const history = useSavedCounselingReports(gradeKey)
  const results = history.results
  const reportTypes = history.groups.unclassified?.length ? [...REPORT_TYPES, UNCLASSIFIED_REPORT] : REPORT_TYPES

  const [loading, setLoading] = useState({})
  const [collapsed, setCollapsed] = useState({})
  const [errors, setErrors] = useState({})
  const [credits, setCredits] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState({})
  const [subjectsWithGrades, setSubjectsWithGrades] = useState([])
  const [gradesLoading, setGradesLoading] = useState(true)

  useEffect(() => {
    setCollapsed({})
    setLoading({})
    setErrors({})
    setSelectedSubject({})
  }, [gradeKey])

  useEffect(() => {
    if (!gradeKey) return
    let active = true
    setSubjectsWithGrades([])
    setGradesLoading(true)
    gradesAPI.getGrades(gradeKey)
      .then(data => {
        if (!active) return
        const list = Array.isArray(data) ? data : []
        const subjects = [...new Set(list.map(g => normalizeReportSubject(g.subject)).filter(s => SUBJECT_OPTIONS.includes(s)))]
        setSubjectsWithGrades(subjects)
      })
      .catch(() => { if (active) setSubjectsWithGrades([]) })
      .finally(() => { if (active) setGradesLoading(false) })
    return () => { active = false }
  }, [gradeKey])

  useEffect(() => {
    paymentAPI.getCredits()
      .then(data => setCredits(data.premiumCredits))
      .catch(() => setCredits(0))
  }, [])

  // 한눈에 보기에서 과목을 누르면 그 리포트 카드를 펼치고 그 위치로 이동한다
  const openReport = (id) => {
    setCollapsed(prev => ({ ...prev, [id]: false }))
    requestAnimationFrame(() => document.querySelector(`[data-testid="saved-report-${id}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const toggleCollapse = (id) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const clearResult = (id) => {
    if (results[id]?._saved) setCollapsed(prev => ({ ...prev, [id]: true }))
    else history.clear(id)
  }

  const handleGenerate = async (reportType) => {
    const { id, api, apiSource } = reportType
    if (!history.enabled) return

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
      if (!history.isCurrent()) return
      history.generated(id, { ...res, _generatedAt: ts }, apiSource === 'counseling')
      setCollapsed(prev => ({ ...prev, [id]: false }))
    } catch (e) {
      if (!history.isCurrent()) return
      setErrors(prev => ({ ...prev, [id]: e.message }))
      if (id === 'premium') setCredits(prev => (prev ?? 0) + 1)
    } finally {
      if (history.isCurrent()) setLoading(prev => ({ ...prev, [id]: false }))
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
        <CoachingSummaryCard history={history} onOpen={openReport} />
        <SavedReportStatus history={history} />
      {reportTypes.map(r => {
          const hasResult = !!results[r.id]
          const isCollapsed = collapsed[r.id] ?? false
          return (
            <div key={r.id} data-testid={`saved-report-${r.id}`} style={{ scrollMarginTop: 72, background: 'var(--color-surface)', borderRadius: 16, border: `1px solid ${hasResult ? r.color + '50' : 'var(--color-border)'}`, overflow: 'hidden' }}>
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
                  <SavedReportPicker history={history} type={r.id} />
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

                  {!r.readOnly && (() => {
                    const currentSubject = selectedSubject[r.id] || '수학'
                    const hasGrade = !r.needsSubject || subjectsWithGrades.includes(currentSubject)
                    const isDisabled = !history.enabled || loading[r.id]
                      || (r.apiSource === 'counseling' && (history.loading || !!history.error))
                      || (r.needsSubject && (gradesLoading || !hasGrade))
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
                    onClick={() => results[r.id]?._saved ? toggleCollapse(r.id) : clearResult(r.id)}
                    style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                  >
                    {results[r.id]?._saved ? '펼치기' : '삭제'}
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
  저장된 리포트는 언제든 조회할 수 있습니다. 새 리포트 생성에는 AI 서버 연결이 필요합니다.
</p>
      </div>
    </div>
  )
}


// 결과 표시 컴포넌트
function ResultBlock({ result, reportType, onClear }) {
  const isReviewPaper      = reportType.id === 'reviewPaper'
  const isSubjectRecommend = reportType.id === 'subjectRecommend'

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

          {result.aiRecommendationReport && <ReportContent title="AI 추천 리포트" text={result.aiRecommendationReport} />}
        </>
      )}

      {isReviewPaper && <ReviewPaper key={result.paperId ?? result._generatedAt} result={result} />}

      {/* 일반 리포트 - careerAnalysis */}
      {!isReviewPaper && !isSubjectRecommend && careerAnalysis && <ReportContent title={title} text={careerAnalysis} />}

      {/* 학습 가이드 */}
      {learningGuide && <ReportContent title="학습 가이드" text={learningGuide} />}

      {/* PDF 저장 + 결과 삭제 버튼 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          disabled={isReviewPaper && !reviewQuestions(result).length}
          onClick={() => isReviewPaper
            ? printReviewPaper(result)
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
            {result._saved ? '결과 닫기' : '삭제'}
          </button>
        )}
      </div>
    </div>
  )
}
