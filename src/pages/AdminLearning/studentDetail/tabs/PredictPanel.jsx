import { useState, useEffect } from 'react'
import { analysisAPI, recommendationsAPI, studyPlanAPI } from '@/api'
import { SUBJECT_COLORS } from '../../data/mockData'

const SUBJECT_ID_BY_NAME = {
  '국어': 1, '수학': 2, '영어': 3, '한국사': 4, '사회': 5, '과학': 6,
}

const PREDICT_SUBJECTS = ['국어', '수학', '영어', '사회', '과학']

export default function PredictPanel({ student }) {
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(true)
  
  // 로드맵 상태
  const [roadmap, setRoadmap] = useState(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)
  const [roadmapError, setRoadmapError] = useState(null)
  const [showRoadmapForm, setShowRoadmapForm] = useState(false)
  
  // 로드맵 생성 폼 상태
  const [targetSubject, setTargetSubject] = useState('수학')
  const [targetWeeks, setTargetWeeks] = useState(4)
  
  // 예측 점수 조회 (기존)
  useEffect(() => {
    if (!student?.id) return
    
    setLoading(true)
    const studentId = String(student.id)
    
    Promise.all(
      PREDICT_SUBJECTS.map(subject => {
        const subjectId = SUBJECT_ID_BY_NAME[subject]
        if (!subjectId) return Promise.resolve([subject, null])
        
        return analysisAPI.getPredictedScore(studentId, subjectId)
          .then(data => [subject, data])
          .catch(() => [subject, null])
      })
    ).then(entries => {
      const map = {}
      entries.forEach(([subject, data]) => {
        if (data) map[subject] = data
      })
      setPredictions(map)
    })
    .finally(() => setLoading(false))
  }, [student?.id])
  
  // 기존 로드맵 조회 (페이지 진입 시)
  useEffect(() => {
    if (!student?.id) return
    
    recommendationsAPI.getRoadmap(String(student.id))
      .then(data => {
        // 빈 응답이 아닐 때만 set
        if (data && (data.weeks?.length > 0 || data.steps?.length > 0 || data.roadmap)) {
          setRoadmap(data)
        }
      })
      .catch(e => {
        console.log('기존 로드맵 없음 (정상)')
      })
  }, [student?.id])
  
  // 로드맵 생성 핸들러
  const handleGenerateRoadmap = async () => {
    setRoadmapLoading(true)
    setRoadmapError(null)
    
    try {
      const data = await studyPlanAPI.generateRoadmap(String(student.id), {
        targetSubject,
        weeks: targetWeeks,
        // 백엔드가 받는 필드명 확정되면 조정
      })
      
      setRoadmap(data)
      setShowRoadmapForm(false)
    } catch (e) {
      console.error('로드맵 생성 실패:', e)
      
      // 폴백: mock 로드맵
      const currentScore = student.scores?.[targetSubject] ?? 60
      const targetScore = Math.min(95, currentScore + 15)
      
      setRoadmap({
        targetSubject,
        currentScore,
        targetScore,
        weeks: [
          {
            weekNumber: 1,
            title: '기초 개념 점검',
            description: `${targetSubject} 기본 단원 복습 및 약점 파악`,
            targetScore: currentScore + 3,
          },
          {
            weekNumber: 2,
            title: '핵심 유형 정리',
            description: '자주 출제되는 유형별 문제 풀이 훈련',
            targetScore: currentScore + 7,
          },
          {
            weekNumber: 3,
            title: '심화 응용',
            description: '응용 문제 + 실전 모의고사 풀이',
            targetScore: currentScore + 11,
          },
          {
            weekNumber: 4,
            title: '실전 마무리',
            description: '오답 노트 점검 + 시험 전 최종 점검',
            targetScore: targetScore,
          },
        ].slice(0, targetWeeks),
        summary: 'AI 서버 연결 실패 - 추세 기반 추천 로드맵을 보여드려요',
        source: 'MOCK',
      })
      setShowRoadmapForm(false)
    } finally {
      setRoadmapLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
        예측 점수 분석 중...
      </div>
    )
  }
  
  const hasApiData = Object.keys(predictions).length > 0
  
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
        <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.5 }}>
          학습 패턴과 최근 성적을 분석해 다음 시험 예상 점수를 보여드립니다
        </p>
      </div>
      
      {/* 과목별 예측 카드 */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {PREDICT_SUBJECTS.map(subject => {
          const apiData = predictions[subject]
          const currentScore = student.scores?.[subject] ?? 0
          const color = SUBJECT_COLORS[subject] || '#1A56DB'
          
          if (apiData) {
            const predicted = apiData.predictedScore ?? apiData.predicted ?? 0
            const current = apiData.currentScore ?? apiData.current ?? currentScore
            const diff = predicted - current
            const confidence = apiData.confidence != null 
              ? Math.round(apiData.confidence * 100) 
              : null
            
            return (
              <PredictCard 
                key={subject} subject={subject} color={color}
                current={current} predicted={predicted} diff={diff}
                confidence={confidence} summary={apiData.summary} source="API"
              />
            )
          }
          
          if (currentScore > 0) {
            const predicted = Math.max(0, Math.min(100, 
              currentScore + (student.trendVal || 0)
            ))
            const diff = predicted - currentScore
            
            return (
              <PredictCard 
                key={subject} subject={subject} color={color}
                current={currentScore} predicted={predicted} diff={diff}
                source="MOCK"
              />
            )
          }
          
          return null
        })}
      </div>
      
      {!hasApiData && (
        <div style={{ padding:'10px 12px', borderRadius:10, background:'#FFF8E0', border:'1px solid #FFB80030' }}>
          <p style={{ fontSize:11, color:'#8A6500', lineHeight:1.5 }}>
            💡 학습 데이터가 더 쌓이면 정확한 AI 예측이 가능해요
          </p>
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
          {PREDICT_SUBJECTS.map(subject => {
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
          {[2, 4, 8].map(weeks => {
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
  const isMock = roadmap.source === 'MOCK'
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      
      {/* mock 경고 */}
      {isMock && (
        <div style={{ 
          padding:'8px 12px', borderRadius:8, 
          background:'#FFF8E0', border:'1px solid #FFB80040',
        }}>
          <p style={{ fontSize:10, color:'#8A6500' }}>
            ⚠️ AI 서버 연결 실패 - 추세 기반 추천 로드맵
          </p>
        </div>
      )}
      
      {/* 헤더 */}
      <div style={{ 
        padding:'14px', borderRadius:12, 
        background:'linear-gradient(135deg, #1A56DB, #9C88FF)',
        color:'white',
      }}>
        <p style={{ fontSize:11, opacity:0.85, marginBottom:4 }}>맞춤 학습 로드맵</p>
        <p style={{ fontSize:16, fontWeight:800 }}>
          {targetSubject} · 총 {weeks.length}주 코스
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
function PredictCard({ subject, color, current, predicted, diff, confidence, summary, source }) {
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
        {source === 'API' && confidence != null && (
          <span style={{ fontSize:10, color:'var(--color-text-muted)' }}>
            신뢰도 {confidence}%
          </span>
        )}
        {source === 'MOCK' && (
          <span style={{ fontSize:10, color:'var(--color-text-muted)' }}>
            추세 기반
          </span>
        )}
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
      
      {summary && (
        <div style={{ 
          marginTop:10, padding:'8px 10px', borderRadius:8, 
          background:'var(--color-primary-light)', border:'1px solid #1A56DB20',
        }}>
          <p style={{ fontSize:11, color:'var(--color-primary)', lineHeight:1.5 }}>
            💡 {summary}
          </p>
        </div>
      )}
    </div>
  )
}