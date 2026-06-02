// src/pages/Learning/RecommendRoadmap.jsx
// CounselingTab 또는 SuggestTab 하단에 import해서 사용하는 섹션 컴포넌트
import { useState, useEffect } from 'react'
import { recommendationsAPI, analysisAPI } from '@/api'
import { useAuth } from '@/context/AuthContext'

// mock 폴백
const MOCK_ROADMAP = {
  roadmapTitle: '수학 집중 공략 4주 로드맵',
  weeks: [
    { weekNumber: 1, theme: '기초 개념 다지기',   tasks: ['분수 나눗셈 개념 정리', '기출 문제 20개 풀기'], targetScore: 75 },
    { weekNumber: 2, theme: '오답 패턴 분석',      tasks: ['오답 노트 작성', '유형별 반복 학습'],         targetScore: 78 },
    { weekNumber: 3, theme: '심화 문제 도전',       tasks: ['난이도 상 문제 도전', '시간 단축 훈련'],      targetScore: 83 },
    { weekNumber: 4, theme: '실전 모의고사 대비',   tasks: ['실전 모의고사 2회', '최종 약점 보완'],        targetScore: 88 },
  ],
  overallTip: '꾸준한 복습이 핵심입니다. 매일 30분씩 오답 노트를 확인하세요.',
}

const MOCK_REPORT = {
  title: '학습 종합 리포트',
  summary: '현재 수학과 영어에서 고르게 성장하고 있으며, 국어 비문학 부분의 보강이 필요합니다.',
  strengths: ['수학 계산 능력 우수', '영어 문법 이해도 높음', '꾸준한 학습 습관'],
  weaknesses: ['국어 비문학 독해 속도', '사회 암기 과목 취약', '시간 관리 필요'],
  recommendation: '국어 비문학 독해 훈련을 매일 15분씩 추가하고, 사회는 단원별 요약 노트 작성을 권장합니다.',
}

export function RecommendRoadmapSection() {
  const { user } = useAuth()
  const [roadmap, setRoadmap]           = useState(null)
  const [roadmapLoading, setRoadmapLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    setRoadmapLoading(true)
    recommendationsAPI.getRoadmap(String(user.id))
      .then(data => {
        // 응답 구조 유연하게 처리
        const weeks = data.weeks || data.weeklyPlan || data.milestones || []
        setRoadmap({
          roadmapTitle: data.roadmapTitle || data.title || '맞춤 학습 로드맵',
          weeks: weeks.map((w, i) => ({
            weekNumber: w.weekNumber || w.week || i + 1,
            theme:      w.theme || w.title || w.focus || w.content || '',
            tasks:      w.tasks || w.activities || [],
            targetScore: w.targetScore || w.target || null,
          })),
          overallTip: data.overallTip || data.tip || data.advice || '',
        })
      })
      .catch(() => setRoadmap(MOCK_ROADMAP))
      .finally(() => setRoadmapLoading(false))
  }, [user?.id])

  if (roadmapLoading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
        로드맵 분석 중...
      </div>
    )
  }

  if (!roadmap) return null

  return (
    <div>
      {roadmap.roadmapTitle && (
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 12 }}>
          🗺️ {roadmap.roadmapTitle}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {roadmap.weeks.map((w, i) => (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 12,
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'var(--color-primary)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800,
            }}>
              {w.weekNumber}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {w.theme}
              </p>
              {w.tasks.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {w.tasks.map((t, j) => (
                    <p key={j} style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                      • {t}
                    </p>
                  ))}
                </div>
              )}
              {w.targetScore && (
                <p style={{ fontSize: 11, color: 'var(--color-success)', marginTop: 6, fontWeight: 600 }}>
                  🎯 목표 점수: {w.targetScore}점
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {roadmap.overallTip && (
        <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--color-primary-light)', border: '1px solid #1A56DB20' }}>
          <p style={{ fontSize: 12, color: 'var(--color-primary)', lineHeight: 1.6, fontWeight: 600 }}>
            💡 {roadmap.overallTip}
          </p>
        </div>
      )}
    </div>
  )
}

export function AnalysisReportSection() {
  const { user } = useAuth()
  const [report, setReport]           = useState(null)
  const [reportLoading, setReportLoading] = useState(true)
  const [subject, setSubject]         = useState('수학')

  const SUBJECTS = ['수학', '영어', '국어', '한국사', '사회탐구', '과학탐구']

  const fetchReport = (sub) => {
    if (!user?.id) return
    setReportLoading(true)
    analysisAPI.getReport(String(user.id), sub)
      .then(data => {
        setReport({
          title:          data.title          || `${sub} 종합 리포트`,
          summary:        data.summary        || data.analysis   || '',
          strengths:      data.strengths      || data.strongPoints || [],
          weaknesses:     data.weaknesses     || data.weakPoints  || [],
          recommendation: data.recommendation || data.advice      || '',
        })
      })
      .catch(() => setReport(MOCK_REPORT))
      .finally(() => setReportLoading(false))
  }

  useEffect(() => { fetchReport(subject) }, [user?.id, subject])

  return (
    <div>
      {/* 과목 선택 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {SUBJECTS.map(s => (
          <button
            key={s}
            onClick={() => setSubject(s)}
            style={{
              padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
              background: subject === s ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: subject === s ? 'white' : 'var(--color-text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {reportLoading ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
          리포트 분석 중...
        </div>
      ) : report ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 요약 */}
          {report.summary && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-primary-light)', border: '1px solid #1A56DB20' }}>
              <p style={{ fontSize: 12, color: 'var(--color-primary)', lineHeight: 1.6 }}>
                📋 {report.summary}
              </p>
            </div>
          )}

          {/* 강점 */}
          {report.strengths.length > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#D1FAF015', border: '1px solid #00C49A30' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-success)', marginBottom: 8 }}>💪 강점</p>
              {report.strengths.map((s, i) => (
                <p key={i} style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>• {s}</p>
              ))}
            </div>
          )}

          {/* 약점 */}
          {report.weaknesses.length > 0 && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FFE9E915', border: '1px solid #FF3B3B20' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8 }}>🎯 보완 필요</p>
              {report.weaknesses.map((w, i) => (
                <p key={i} style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>• {w}</p>
              ))}
            </div>
          )}

          {/* 추천 */}
          {report.recommendation && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#FFF8E0', border: '1px solid #FFB80030' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#8A6500', marginBottom: 4 }}>💡 추천 학습법</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-primary)', lineHeight: 1.6 }}>{report.recommendation}</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}