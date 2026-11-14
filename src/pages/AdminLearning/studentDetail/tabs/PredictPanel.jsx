import { useState, useEffect } from 'react'
import { activitiesAPI, aiReportAPI, gradesAPI, recommendationsAPI, studyPlanAPI } from '@/api'
import { SUBJECT_COLORS } from '../../data/mockData'
import { normalizeGrades, summarizeGrades, averageDailyStudyHours, withPredictedPoint, GRADE_SUBJECTS } from '@/utils/gradeSummary'
import { normalizeRoadmap, dateAfterWeeks } from '@/utils/roadmap'

// 학부모 학습 탭의 '성장 예측'과 같은 방식으로 예측한다.
// 실제 성적 평균과 하루 평균 공부 시간을 AI 서버(POST /api/ai/predict)에 보내 예상 평균을 받고,
// 과목별 최근 점수에 (예상 평균 - 현재 평균)만큼 더한다.
// (/api/analysis/predict는 성적 등록 화면과 다른 grade_entity 테이블을 읽어서 쓰지 않는다)

export default function PredictPanel({ student }) {
  // { studentId, status: loading | ready | error, summary, prediction, hours }
  const [forecast, setForecast] = useState({ studentId: null, status: 'loading' })
  
  // 로드맵 상태
  const [roadmap, setRoadmap] = useState(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [roadmapError, setRoadmapError] = useState(null)
  const [showRoadmapForm, setShowRoadmapForm] = useState(false)
  
  // 로드맵 생성 폼 상태
  const [targetSubject, setTargetSubject] = useState('수학')
  const [targetWeeks, setTargetWeeks] = useState(4)
  
  // 실제 성적 + 공부 시간 → AI 예상 평균
  useEffect(() => {
    if (student?.id == null) return
    let cancelled = false
    const studentId = String(student.id)
    setForecast({ studentId, status: 'loading' })
    ;(async () => {
      let summary
      try {
        summary = summarizeGrades(normalizeGrades(await gradesAPI.getGrades(studentId)))
      } catch {
        if (!cancelled) setForecast({ studentId, status: 'error' })
        return
      }
      if (summary.average == null) {
        if (!cancelled) setForecast({ studentId, status: 'ready', summary, prediction: null })
        return
      }
      const hours = averageDailyStudyHours(await activitiesAPI.getActivities(studentId).catch(() => []))
      const prediction = await aiReportAPI.predictScore(summary.average, hours ?? 2).catch(() => null)
      if (!cancelled) {
        setForecast({ studentId, status: 'ready', summary, hours,
          prediction: Number.isFinite(prediction?.expected_score) ? prediction : null })
      }
    })()
    return () => { cancelled = true }
  }, [student?.id])
  
  // 기존 로드맵 조회 (페이지 진입 시)
  useEffect(() => {
    if (!student?.id) return
    
    let active = true
    setRoadmap(null)
    setRoadmapError(null)
    setShowRoadmapForm(false)
    recommendationsAPI.getRoadmap(String(student.id))
      .then(data => { if (active) setRoadmap(normalizeRoadmap(data)) })
      .catch(() => {}) // 저장된 로드맵이 없으면 생성 버튼만 보여 준다
    return () => { active = false }
  }, [student?.id])
  
  const current = forecast.studentId === String(student?.id) ? forecast : { status: 'loading' }

  // 로드맵 생성 핸들러
  const handleGenerateRoadmap = async () => {
    setRoadmapLoading(true)
    setRoadmapError(null)
    
    try {
      const data = await studyPlanAPI.generateRoadmap(String(student.id), {
        targetKeyword: targetSubject,
        targetDate: dateAfterWeeks(targetWeeks),
        dailyStudyHours: current.hours != null && current.hours > 0 ? current.hours : 2,
      })
      const next = normalizeRoadmap(data)
      if (!next) throw new Error('로드맵 데이터가 비어 있습니다')
      setRoadmap(next)
      setShowRoadmapForm(false)
    } catch (e) {
      console.error('로드맵 생성 실패:', e)
      setRoadmapError('로드맵을 만들지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setRoadmapLoading(false)
    }
  }
  
  const summary = current.summary
  const predicted = current.prediction ? withPredictedPoint(summary, current.prediction.expected_score).at(-1) : null
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      
      {/* 안내 */}
      <div style={{ 
        padding:'12px 14px', borderRadius:10, 
        background:'linear-gradient(135deg, #E8F0FF, #F0F5FF)',
        border:'1px solid #1A56DB30',
      }}>
        <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', marginBottom:4 }}>
          📈 AI 성적 예측
        </p>
        <p data-testid="admin-predict-summary" style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.5 }}>
          {current.status === 'loading' ? '성적과 공부 시간을 분석하는 중...'
            : current.status === 'error' ? '성적을 불러오지 못했어요.'
            : !summary?.subjects.length ? '아직 등록된 성적이 없어 예측할 수 없어요. 성적이 등록되면 다음 시험 예상 점수를 보여 드려요.'
            : current.prediction ? `현재 평균 ${summary.average}점 → 다음 시험 예상 평균 ${current.prediction.expected_score}점`
            : `현재 평균 ${summary.average}점 · AI 예측 서버에 연결하지 못해 예상 점수는 표시하지 않아요.`}
        </p>
        {current.prediction && (
          <p style={{ fontSize:10, color:'var(--color-text-muted)', marginTop:4 }}>
            하루 평균 공부 {current.hours != null ? `${current.hours}시간` : '기록 없음(2시간으로 계산)'} 기준
            {current.prediction.message ? ` · ${current.prediction.message}` : ''}
          </p>
        )}
      </div>
      
      {/* 과목별 예측 카드 (시험을 본 과목만) */}
      {predicted && (
        <div data-testid="admin-predict-cards" style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {summary.subjects.map(subject => (
            <PredictCard
              key={subject} subject={subject} color={SUBJECT_COLORS[subject] || '#1A56DB'}
              current={summary.current[subject]} predicted={predicted[subject]}
              diff={predicted[subject] - summary.current[subject]}
            />
          ))}
        </div>
      )}
      
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* 학습 로드맵 영역 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      
      <div style={{ 
        marginTop:8, paddingTop:14, 
        borderTop:'1px dashed var(--color-border)',
      }}>
        <p style={{ 
          fontSize:13, fontWeight:800, marginBottom:10,
          color:'var(--color-text-primary)',
        }}>
          🗺️ 맞춤 학습 로드맵
        </p>
        
        {/* 로드맵 결과 */}
        {roadmap && (
          <RoadmapView 
            roadmap={roadmap} 
            onReset={() => { setRoadmap(null); setShowRoadmapForm(false) }}
          />
        )}
        
        {/* 폼 */}
        {roadmapError && !roadmap && (
          <p role="alert" style={{ fontSize:11, color:'var(--color-danger)', marginBottom:8 }}>{roadmapError}</p>
        )}
        {!roadmap && showRoadmapForm && (
          <RoadmapForm
            targetSubject={targetSubject}
            setTargetSubject={setTargetSubject}
            targetWeeks={targetWeeks}
            setTargetWeeks={setTargetWeeks}
            onSubmit={handleGenerateRoadmap}
            onCancel={() => setShowRoadmapForm(false)}
            loading={roadmapLoading}
          />
        )}
        
        {/* 생성 버튼 (초기 상태) */}
        {!roadmap && !showRoadmapForm && (
          <div style={{ 
            padding:'16px', borderRadius:12, 
            background:'var(--color-surface)', 
            border:'1.5px solid var(--color-primary)',
            textAlign:'center',
          }}>
            <p style={{ fontSize:11, color:'var(--color-text-muted)', marginBottom:10, lineHeight:1.5 }}>
              학생의 성적·패턴 분석을 기반으로<br />
              AI가 주차별 학습 계획을 만들어드려요
            </p>
            <button
              onClick={() => setShowRoadmapForm(true)}
              style={{
                width:'100%', padding:'12px', borderRadius:10, border:'none',
                background:'linear-gradient(90deg, #1A56DB, #9C88FF)',
                color:'white', fontSize:13, fontWeight:700, fontFamily:'inherit',
                cursor:'pointer',
              }}
            >
              🗺️ 학습 로드맵 생성하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 로드맵 생성 폼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RoadmapForm({ targetSubject, setTargetSubject, targetWeeks, setTargetWeeks, onSubmit, onCancel, loading }) {
  return (
    <div style={{ 
      padding:'14px', borderRadius:12, 
      background:'var(--color-surface)', 
      border:'1.5px solid var(--color-primary)',
    }}>
      <p style={{ fontSize:12, fontWeight:700, color:'var(--color-primary)', marginBottom:12 }}>
        🎯 로드맵 옵션
      </p>
      
      {/* 목표 과목 */}
      <div style={{ marginBottom:12 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', marginBottom:6 }}>
          목표 과목
        </p>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {GRADE_SUBJECTS.map(subject => {
            const isActive = targetSubject === subject
            return (
              <button
                key={subject}
                onClick={() => setTargetSubject(subject)}
                disabled={loading}
                style={{
                  padding:'5px 12px', borderRadius:20, border:'none',
                  fontSize:11, fontWeight:600, fontFamily:'inherit',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: isActive ? 'white' : 'var(--color-text-muted)',
                  border: isActive ? 'none' : '1px solid var(--color-border)',
                  transition:'all 0.15s',
                }}
              >
                {subject}
              </button>
            )
          })}
        </div>
      </div>
      
      {/* 기간 */}
      <div style={{ marginBottom:14 }}>
        <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', marginBottom:6 }}>
          기간
        </p>
        <div style={{ display:'flex', gap:6 }}>
          {[2, 4].map(weeks => {
            const isActive = targetWeeks === weeks
            return (
              <button
                key={weeks}
                onClick={() => setTargetWeeks(weeks)}
                disabled={loading}
                style={{
                  flex:1, padding:'7px', borderRadius:8, border:'none',
                  fontSize:11, fontWeight:600, fontFamily:'inherit',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  background: isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
                  color: isActive ? 'white' : 'var(--color-text-muted)',
                  border: isActive ? 'none' : '1px solid var(--color-border)',
                  transition:'all 0.15s',
                }}
              >
                {weeks}주
              </button>
            )
          })}
        </div>
      </div>
      
      {/* 액션 버튼 */}
      <div style={{ display:'flex', gap:6 }}>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            flex:1, padding:'10px', borderRadius:8, 
            border:'1px solid var(--color-border)', background:'transparent',
            color:'var(--color-text-muted)', fontSize:12, fontWeight:600,
            fontFamily:'inherit', cursor:'pointer',
          }}
        >
          취소
        </button>
        <button
          onClick={onSubmit}
          disabled={loading}
          style={{
            flex:2, padding:'10px', borderRadius:8, border:'none',
            background: loading ? 'var(--color-text-muted)' : 'linear-gradient(90deg, #1A56DB, #9C88FF)',
            color:'white', fontSize:12, fontWeight:700, fontFamily:'inherit',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '🤖 생성 중...' : '✨ 로드맵 생성'}
        </button>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 로드맵 결과 표시
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function RoadmapView({ roadmap, onReset }) {
  // 응답 구조 대비 (weeks/steps/roadmap 여러 케이스)
  const weeks = roadmap.weeks || roadmap.steps || roadmap.roadmap || []
  const targetSubject = roadmap.targetSubject || roadmap.subject || '학습'
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      
      {/* 헤더 */}
      <div style={{ 
        padding:'14px', borderRadius:12, 
        background:'linear-gradient(135deg, #1A56DB, #9C88FF)',
        color:'white',
      }}>
        <p style={{ fontSize:11, opacity:0.85, marginBottom:4 }}>맞춤 학습 로드맵</p>
        <p style={{ fontSize:16, fontWeight:800 }}>
          {targetSubject} · 총 {weeks.length}주 코스{roadmap.targetDate ? ` · ${roadmap.targetDate}까지` : ''}
        </p>
        {roadmap.summary && (
          <p style={{ fontSize:11, opacity:0.9, marginTop:6, lineHeight:1.5 }}>
            {roadmap.summary}
          </p>
        )}
      </div>
      
      {/* 주차별 카드 */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {weeks.map((week, i) => {
          const num = week.weekNumber ?? week.week ?? (i + 1)
          const title = week.title || week.name || `${num}주차`
          const desc = week.description || week.content || week.detail || ''
          const targetScore = week.targetScore || week.target || null
          
          return (
            <div key={i} style={{
              padding:'12px 14px', borderRadius:10,
              background:'var(--color-surface)', 
              border:'1px solid var(--color-border)',
              display:'flex', gap:12,
            }}>
              {/* 주차 뱃지 */}
              <div style={{
                width:36, height:36, borderRadius:'50%', flexShrink:0,
                background:'var(--color-primary-light)',
                color:'var(--color-primary)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:800,
              }}>
                {num}주
              </div>
              
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <p style={{ fontSize:13, fontWeight:700 }}>{title}</p>
                  {targetScore != null && (
                    <span style={{ 
                      fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20,
                      background:'var(--color-success)15', color:'var(--color-success)',
                    }}>
                      목표 {targetScore}점
                    </span>
                  )}
                </div>
                {desc && (
                  <p style={{ fontSize:11, color:'var(--color-text-muted)', lineHeight:1.5 }}>
                    {desc}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* 재생성 버튼 */}
      <button
        onClick={onReset}
        style={{
          padding:'10px', borderRadius:8, border:'1px solid var(--color-border)',
          background:'transparent', color:'var(--color-text-muted)', 
          fontSize:11, fontWeight:600, fontFamily:'inherit', cursor:'pointer',
          marginTop:4,
        }}
      >
        🔄 로드맵 다시 생성하기
      </button>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 예측 카드 (기존)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function PredictCard({ subject, color, current, predicted, diff }) {
  const isRising = diff > 0
  const isFalling = diff < 0
  
  return (
    <div style={{ 
      padding:'14px', borderRadius:12, 
      background:'var(--color-surface)', 
      border:`1.5px solid ${color}40`,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <span style={{ 
          padding:'4px 10px', borderRadius:20, 
          background:color+'18', color, 
          fontSize:12, fontWeight:700,
        }}>
          {subject}
        </span>
        <span style={{ fontSize:10, color:'var(--color-text-muted)' }}>최근 시험 기준</span>
      </div>
      
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:10 }}>
        <div style={{ 
          flex:1, textAlign:'center', padding:'10px', borderRadius:10, 
          background:'var(--color-surface-2)', border:'1px solid var(--color-border)',
        }}>
          <p style={{ fontSize:10, color:'var(--color-text-muted)' }}>현재</p>
          <p style={{ fontSize:18, fontWeight:800, marginTop:2 }}>{current}점</p>
        </div>
        
        <div style={{ fontSize:20, color:'var(--color-text-muted)' }}>→</div>
        
        <div style={{ 
          flex:1, textAlign:'center', padding:'10px', borderRadius:10, 
          background: isRising ? '#D1FAF015' : isFalling ? '#FFE9E915' : 'var(--color-surface-2)',
          border: `1px solid ${isRising ? '#00C49A30' : isFalling ? '#FF3B3B30' : 'var(--color-border)'}`,
        }}>
          <p style={{ fontSize:10, color:'var(--color-text-muted)' }}>예측</p>
          <p style={{ 
            fontSize:18, fontWeight:800, marginTop:2,
            color: isRising ? 'var(--color-success)' : isFalling ? 'var(--color-danger)' : 'var(--color-text-primary)',
          }}>
            {predicted}점
          </p>
        </div>
      </div>
      
      <div style={{ 
        textAlign:'center', padding:'6px 10px', borderRadius:8, 
        background: isRising ? '#D1FAF015' : isFalling ? '#FFE9E915' : 'transparent',
      }}>
        <p style={{ 
          fontSize:13, fontWeight:700,
          color: isRising ? 'var(--color-success)' : isFalling ? 'var(--color-danger)' : 'var(--color-text-muted)',
        }}>
          {isRising && `▲ ${diff}점 상승 예상`}
          {isFalling && `▼ ${Math.abs(diff)}점 하락 예상`}
          {!isRising && !isFalling && `→ 비슷한 수준 유지`}
        </p>
      </div>
      
    </div>
  )
}