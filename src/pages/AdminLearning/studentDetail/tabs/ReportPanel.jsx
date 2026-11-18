import ReviewPaper, { printReviewPaper, reviewQuestions } from '@/components/learning/ReviewPaper'
import { useState, useEffect } from 'react'
import useSavedCounselingReports from '@/hooks/useSavedCounselingReports'
import { SavedReportPicker, SavedReportStatus } from '@/components/learning/SavedReportControls'
import { UNCLASSIFIED_REPORT } from '@/utils/savedReports'
import { counselingAPI, studyPlanAPI, aiReportAPI, gradesAPI } from '@/api'
import ReportContent, { printTextReport } from '@/components/learning/ReportContent'

import { REPORT_SUBJECTS as SUBJECT_OPTIONS, normalizeReportSubject } from '@/utils/reportSubjects'

const REPORT_TYPES = [
  {
    id: 'subjectRecommend',
    title: 'AI 맞춤 복습 가이드',
    description: '과목별로 복습할 개념과 학습 방법을 안내합니다',
    emoji: '🤖',
    color: '#0F3460',
    api: 'getSubjectRecommend',
    apiSource: 'aiReport',
    needsSubject: true,
  },
  {
    id: 'reviewPaper',
    title: '맞춤 복습 시험지',
    description: '학생이 복습할 개념에 맞는 문제를 모읍니다',
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
    title: '국어·진로 탐색 리포트',
    description: '국어 학습 수준과 언어·작문 역량을 바탕으로 진로와 학습 방향을 제시합니다',
    emoji: '🎯',
    color: '#9C88FF',
    api: 'getWritingReport',
    apiSource: 'counseling',
  },
  {
    id: 'english',
    title: '영어 메타인지 리포트',
    description: '영어 성적과 취약 개념을 분석해 맞춤 학습 전략을 제시합니다',
    emoji: '📖',
    color: '#00A896',
    api: 'getEnglishReport',
    apiSource: 'counseling',
  },
  {
    id: 'science',
    title: '과학 메타인지 리포트',
    description: '과학 성적과 취약 개념을 분석해 맞춤 학습 전략을 제시합니다',
    emoji: '🔬',
    color: '#0088CC',
    api: 'getScienceReport',
    apiSource: 'counseling',
  },
  {
    id: 'social',
    title: '사회 메타인지 리포트',
    description: '사회 성적과 취약 개념을 분석해 맞춤 학습 전략을 제시합니다',
    emoji: '🌍',
    color: '#D97706',
    api: 'getSocialReport',
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
  const studentId = student ? String(student.studentId ?? student.id) : null
  const history = useSavedCounselingReports(studentId)
  const reports = history.results
  const reportTypes = history.groups.unclassified?.length ? [...REPORT_TYPES, UNCLASSIFIED_REPORT] : REPORT_TYPES

  const [loading, setLoading] = useState({})
  const [collapsed, setCollapsed] = useState({})
  const [errors, setErrors] = useState({})
  const [selectedSubject, setSelectedSubject] = useState({})
  const [subjectsWithGrades, setSubjectsWithGrades] = useState([])
  const [gradesLoading, setGradesLoading] = useState(true)

  // 학생이 바뀌면 상태 초기화
  useEffect(() => {
    if (!studentId) return
    setCollapsed({})
    setLoading({})
    setErrors({})
    setSelectedSubject({})
  }, [studentId])

  useEffect(() => {
    if (!studentId) return
    let active = true
    setSubjectsWithGrades([])
    setGradesLoading(true)
    gradesAPI.getGrades(studentId)
      .then(data => {
        if (!active) return
        const list = Array.isArray(data) ? data : []
        setSubjectsWithGrades([...new Set(list.map(g => normalizeReportSubject(g.subject)).filter(s => SUBJECT_OPTIONS.includes(s)))])
      })
      .catch(() => { if (active) setSubjectsWithGrades([]) })
      .finally(() => { if (active) setGradesLoading(false) })
    return () => { active = false }
  }, [studentId])

  if (!student) return null

  const toggleCollapse = (id) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }))

  const clearResult = (id) => {
    if (reports[id]?._saved) setCollapsed(prev => ({ ...prev, [id]: true }))
    else history.clear(id)
  }

  const generateReport = async (reportType) => {
    const { id, api, apiSource } = reportType
    if (!history.enabled) return

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
      if (!history.isCurrent()) return
      history.generated(id, { ...res, _generatedAt: ts }, apiSource === 'counseling')
      setCollapsed(prev => ({ ...prev, [id]: false }))
    } catch (e) {
      if (!history.isCurrent()) return
      setErrors(prev => ({
        ...prev,
        [id]: e.message === 'HTTP 503' ? 'Python AI 서버가 실행 중이지 않습니다' : e.message,
      }))
    } finally {
      if (history.isCurrent()) setLoading(prev => ({ ...prev, [id]: false }))
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
          과목과 대기 요청 수에 따라 생성에 시간이 걸릴 수 있습니다.
        </p>
      </div>

      {/* 리포트 카드들 */}
      <SavedReportStatus history={history} />
      {reportTypes.map(type => {
        const hasResult  = !!reports[type.id]
        const isCollapsed = collapsed[type.id] ?? false

        return (
          <div
            key={type.id}
            data-testid={`saved-report-${type.id}`}
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
                <SavedReportPicker history={history} type={type.id} />

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

                {!type.readOnly && (() => {
                  const currentSubject = selectedSubject[type.id] || '수학'
                  const hasGrade = !type.needsSubject || subjectsWithGrades.includes(currentSubject)
                  const isDisabled = !history.enabled || loading[type.id]
                      || (type.apiSource === 'counseling' && (history.loading || !!history.error))
                      || (type.needsSubject && (gradesLoading || !hasGrade))
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
                  onClick={() => reports[type.id]?._saved ? toggleCollapse(type.id) : clearResult(type.id)}
                  style={{
                    marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-muted)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                  }}
                >
                  {reports[type.id]?._saved ? '펼치기' : '삭제'}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}


function ResultBlock({ result, reportType, onClear }) {
  const isReviewPaper      = reportType.id === 'reviewPaper'
  const isSubjectRecommend = reportType.id === 'subjectRecommend'

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
                <p style={{ fontSize: 11, color: '#0F3460', fontWeight: 600 }}>복습할 개념</p>
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

      {/* 일반 리포트 */}
      {!isReviewPaper && !isSubjectRecommend && careerAnalysis && <ReportContent title={title} text={careerAnalysis} />}

      {learningGuide && <ReportContent title="학습 가이드" text={learningGuide} />}

      {/* PDF 저장 + 결과 삭제 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          disabled={isReviewPaper && !reviewQuestions(result).length}
          onClick={() => isReviewPaper
            ? printReviewPaper(result)
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
            {result._saved ? '결과 닫기' : '삭제'}
          </button>
        )}
      </div>
    </div>
  )
}
