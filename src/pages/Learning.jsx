import { useState } from 'react'

const SUBJECTS = ['수학', '영어', '국어', '과학', '사회']

export default function Learning() {
  const [activeSubject, setActiveSubject] = useState('수학')

  const data = SUBJECT_DATA[activeSubject]

  return (
    <div>
      {/* 헤더 요약 */}
      <div style={{
        background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 60%, #0F3460 100%)',
        padding: '24px 20px',
        color: 'white',
      }}>
        <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>홍민준 · 초등 6학년</p>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>AI 학습 분석 리포트</h2>
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>최근 업데이트: 오늘 09:00</p>

        {/* 전체 점수 */}
        <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
          {[['종합 점수', '82점', '#1A56DB'], ['성장률', '+12%', '#00C49A'], ['완료율', '74%', '#FF6B35']].map(([k, v, c]) => (
            <div key={k} style={{
              flex: 1,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '12px 10px',
              textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <p style={{ fontSize: 11, opacity: 0.7 }}>{k}</p>
              <p style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: c === '#1A56DB' ? 'white' : c }}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 과목 탭 */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        padding: '16px 20px 0',
        gap: 8,
        scrollbarWidth: 'none',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 0,
      }}>
        {SUBJECTS.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              borderRadius: '8px 8px 0 0',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: activeSubject === s ? 700 : 500,
              color: activeSubject === s ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: 'transparent',
              borderBottom: activeSubject === s ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="section">
        {/* 약점 영역 */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--color-text-primary)' }}>
            🎯 집중 보완 영역
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.weakPoints.map((wp) => (
              <div key={wp.topic} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{wp.topic}</span>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: wp.score < 50 ? 'var(--color-danger)' : wp.score < 70 ? 'var(--color-warning)' : 'var(--color-success)',
                  }}>
                    {wp.score}점
                  </span>
                </div>
                {/* 진행 바 */}
                <div style={{ height: 6, background: 'var(--color-surface-2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${wp.score}%`,
                    background: wp.score < 50 ? 'var(--color-danger)' : wp.score < 70 ? 'var(--color-warning)' : 'var(--color-success)',
                    borderRadius: 3,
                    transition: 'width 0.6s ease-out',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 이번 주 학습 계획 */}
        <div>
          <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--color-text-primary)' }}>
            📅 AI 추천 주간 계획
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.weeklyPlan.map((plan, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px',
                background: plan.done ? 'var(--color-surface-2)' : 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                opacity: plan.done ? 0.7 : 1,
              }}>
                <div style={{
                  width: 22, height: 22,
                  borderRadius: '50%',
                  border: `2px solid ${plan.done ? 'var(--color-success)' : 'var(--color-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: plan.done ? 'var(--color-success)' : 'transparent',
                  flexShrink: 0,
                }}>
                  {plan.done && <span style={{ color: 'white', fontSize: 12 }}>✓</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: plan.done ? 'line-through' : 'none' }}>
                    {plan.title}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{plan.duration}</p>
                </div>
                <span className={`badge badge--${plan.priority === '높음' ? 'red' : plan.priority === '중간' ? 'yellow' : 'blue'}`} style={{ fontSize: 10 }}>
                  {plan.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const SUBJECT_DATA = {
  수학: {
    weakPoints: [
      { topic: '분수의 나눗셈',     score: 42 },
      { topic: '도형의 넓이',       score: 61 },
      { topic: '비와 비율',         score: 75 },
    ],
    weeklyPlan: [
      { title: '분수 나눗셈 개념 복습 (교재 p.24-31)', duration: '40분', priority: '높음', done: true },
      { title: '분수 나눗셈 연습 문제 20선',          duration: '30분', priority: '높음', done: false },
      { title: '도형 넓이 공식 정리',                 duration: '25분', priority: '중간', done: false },
      { title: '비와 비율 실전 문제',                 duration: '30분', priority: '낮음', done: false },
    ],
  },
  영어: {
    weakPoints: [
      { topic: '현재완료 시제',  score: 55 },
      { topic: '관계대명사',    score: 48 },
      { topic: '어휘 (중급)',   score: 68 },
    ],
    weeklyPlan: [
      { title: '현재완료 문법 강의 시청', duration: '30분', priority: '높음', done: false },
      { title: '관계대명사 예문 암기 10개', duration: '20분', priority: '높음', done: false },
      { title: '단어 테스트 50개',       duration: '25분', priority: '중간', done: false },
    ],
  },
  국어: {
    weakPoints: [
      { topic: '문학 독해', score: 72 },
      { topic: '맞춤법',   score: 80 },
      { topic: '논설문',   score: 65 },
    ],
    weeklyPlan: [
      { title: '시 감상 및 해설 읽기', duration: '30분', priority: '중간', done: false },
      { title: '논설문 구조 분석',    duration: '35분', priority: '높음', done: false },
    ],
  },
  과학: {
    weakPoints: [
      { topic: '물질의 변화', score: 59 },
      { topic: '생물 분류',  score: 71 },
    ],
    weeklyPlan: [
      { title: '물질 변화 실험 정리', duration: '25분', priority: '높음', done: false },
      { title: '생물 분류 개념 복습', duration: '20분', priority: '낮음', done: false },
    ],
  },
  사회: {
    weakPoints: [
      { topic: '세계 지리',   score: 66 },
      { topic: '경제 기초',  score: 54 },
    ],
    weeklyPlan: [
      { title: '대륙별 주요 나라 암기', duration: '20분', priority: '중간', done: false },
      { title: '경제 용어 10개 정리',  duration: '15분', priority: '높음', done: false },
    ],
  },
}
