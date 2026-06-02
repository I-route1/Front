import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { paymentAPI } from '@/api/payment'
import { RecommendRoadmapSection, AnalysisReportSection } from './RecommendRoadmap'
import { counselingAPI, studyPlanAPI, aiReportAPI } from '@/api'

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

export default function CounselingTab() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState({})
  const [results, setResults] = useState({})
  const [errors, setErrors] = useState({})
  const [credits, setCredits] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState({})

  useEffect(() => {
    paymentAPI.getCredits()
      .then(data => setCredits(data.premiumCredits))
      .catch(() => setCredits(0))
  }, [])

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
      // 크레딧 차감
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
        res = await aiReportAPI[api](String(user.id), subject)
      } else if (apiSource === 'studyPlan') {
        res = await studyPlanAPI[api](String(user.id))
      } else {
        res = await counselingAPI[api](String(user.id))
      }
      setResults(prev => ({ ...prev, [id]: res }))
    } catch (e) {
      setErrors(prev => ({ ...prev, [id]: e.message }))
      // 실패 시 크레딧 복구
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
        {REPORT_TYPES.map(r => (
          <div key={r.id} style={{ background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {/* 카드 헤더 */}
            <div style={{ padding: '16px 16px 12px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: r.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                {r.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{r.title}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{r.desc}</p>
              </div>
            </div>

            {/* 생성 버튼 영역 */}
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

              {/* 과목 선택 드롭다운 (AI 추천만) */}
              {r.needsSubject && (
                <select
                  value={selectedSubject[r.id] || '수학'}
                  onChange={e => setSelectedSubject(prev => ({ ...prev, [r.id]: e.target.value }))}
                  disabled={loading[r.id]}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8, marginBottom: 8,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-2)',
                    fontSize: 13, fontFamily: 'inherit',
                    color: 'var(--color-text-primary)',
                    cursor: loading[r.id] ? 'not-allowed' : 'pointer',
                  }}
                >
                  {SUBJECT_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => handleGenerate(r)}
                disabled={loading[r.id] || (r.id === 'premium' && credits === null)}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                  background: loading[r.id] ? 'var(--color-text-muted)'
                    : (r.id === 'premium' && credits === 0) ? '#FF6B35'
                    : r.color,
                  color: 'white', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                  cursor: loading[r.id] ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {loading[r.id] ? '🤖 AI 분석 중...'
                  : (r.id === 'premium' && credits === 0) ? '💳 크레딧 충전하기'
                  : `${r.emoji} 리포트 생성`}
              </button>

              {/* 에러 */}
              {errors[r.id] && (
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#FFE9E9', border: '1px solid #FF3B3B30' }}>
                  <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                    ❌ {errors[r.id] === 'HTTP 503'
                      ? 'Python AI 서버가 실행 중이지 않습니다'
                      : errors[r.id]}
                  </p>
                </div>
              )}

              {/* 결과 */}
              {results[r.id] && (
                <ResultBlock result={results[r.id]} reportType={r} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 안내 */}
      <div style={{ margin: '0 16px 24px', padding: '12px 14px', borderRadius: 12, background: '#FFF8E0', border: '1px solid #FFB80040' }}>
        <p style={{ fontSize: 12, color: '#8A6500', lineHeight: 1.6 }}>
          ⚠️ AI 상담 리포트는 Python AI 서버가 실행 중일 때만 사용 가능합니다. 서버 오류 시 백엔드팀에 문의하세요.
        </p>
      </div>
    </div>
  )
}

// 결과 표시 컴포넌트
function ResultBlock({ result, reportType }) {
  const isReviewPaper       = reportType.id === 'reviewPaper'
  const isSubjectRecommend  = reportType.id === 'subjectRecommend'

  // 시험지 전용
  const paperUrl  = result.paperUrl || result.url || result.downloadUrl || ''
  const questions = result.questions || result.problems || []

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
        <div style={{
          padding: '14px', borderRadius: 10,
          background: `${reportType.color}15`, border: `1px solid ${reportType.color}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: reportType.color }}>시험지 생성 완료</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {questions?.length ? `총 ${questions.length}문제` : '약점 기반 맞춤 문제'}
              </p>
            </div>
          </div>

          {paperUrl ? (
            <a
              href={paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', width: '100%', padding: '10px', borderRadius: 8,
                background: reportType.color, color: 'white', textAlign: 'center',
                fontSize: 12, fontWeight: 700, textDecoration: 'none', boxSizing: 'border-box',
              }}
            >
              📥 시험지 다운로드
            </a>
          ) : (
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px' }}>
              다운로드 링크가 없어요 (응답 확인 필요)
            </p>
          )}
        </div>
      )}

      {/* 시험지 문제 미리보기 */}
      {isReviewPaper && questions.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            📋 문제 미리보기
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {questions.slice(0, 3).map((q, i) => (
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
                    {q.subject && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: reportType.color,
                        padding: '2px 6px', borderRadius: 6, background: reportType.color + '18',
                        marginBottom: 4, display: 'inline-block',
                      }}>
                        {q.subject}
                      </span>
                    )}
                    <p style={{ fontSize: 11, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
                      {q.question || q.text || q.content || '(문제 내용)'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {questions.length > 3 && (
              <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 4 }}>
                +{questions.length - 3}개 문제 더 있음
              </p>
            )}
          </div>
        </div>
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
    </div>
  )
}
