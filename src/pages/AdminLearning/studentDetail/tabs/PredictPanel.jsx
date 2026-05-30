import { useState, useEffect } from 'react'
import { analysisAPI } from '@/api'
import { SUBJECT_COLORS } from '../../data/mockData'

// 과목명 ↔ subjectId 매핑
const SUBJECT_ID_BY_NAME = {
  '국어': 1,
  '수학': 2,
  '영어': 3,
  '한국사': 4,
  '사회': 5,
  '과학': 6,
}

// mockData의 SUBJECTS와 일치하는 5과목 (사회/과학은 mockData 기준)
const PREDICT_SUBJECTS = ['국어', '수학', '영어', '사회', '과학']

export default function PredictPanel({ student }) {
  const [predictions, setPredictions] = useState({})  // { 수학: {...}, 영어: {...} }
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!student?.id) return
    
    setLoading(true)
    const studentId = String(student.id)
    
    // 5과목 병렬 조회
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
      
      {/* 전체 안내 */}
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
          
          // API 데이터 있으면 그거 사용
          if (apiData) {
            const predicted = apiData.predictedScore ?? apiData.predicted ?? 0
            const current = apiData.currentScore ?? apiData.current ?? currentScore
            const diff = predicted - current
            const confidence = apiData.confidence != null 
              ? Math.round(apiData.confidence * 100) 
              : null
            
            return (
              <PredictCard 
                key={subject}
                subject={subject}
                color={color}
                current={current}
                predicted={predicted}
                diff={diff}
                confidence={confidence}
                summary={apiData.summary}
                source="API"
              />
            )
          }
          
          // 폴백: mock 기반 단순 예측 (학생 추세 활용)
          if (currentScore > 0) {
            // 학생 전체 추세를 과목 점수에 적용
            const predicted = Math.max(0, Math.min(100, 
              currentScore + (student.trendVal || 0)
            ))
            const diff = predicted - currentScore
            
            return (
              <PredictCard 
                key={subject}
                subject={subject}
                color={color}
                current={currentScore}
                predicted={predicted}
                diff={diff}
                source="MOCK"
              />
            )
          }
          
          return null
        })}
      </div>
      
      {/* 데이터 출처 안내 */}
      {!hasApiData && (
        <div style={{ padding:'10px 12px', borderRadius:10, background:'#FFF8E0', border:'1px solid #FFB80030' }}>
          <p style={{ fontSize:11, color:'#8A6500', lineHeight:1.5 }}>
            💡 학습 데이터가 더 쌓이면 정확한 AI 예측이 가능해요. 
            지금은 학생의 최근 성적 추세 기반으로 표시됩니다.
          </p>
        </div>
      )}
    </div>
  )
}

// 예측 카드 컴포넌트
function PredictCard({ subject, color, current, predicted, diff, confidence, summary, source }) {
  const isRising = diff > 0
  const isFalling = diff < 0
  
  return (
    <div style={{ 
      padding:'14px', borderRadius:12, 
      background:'var(--color-surface)', 
      border:`1.5px solid ${color}40`,
    }}>
      {/* 헤더: 과목명 + 신뢰도 */}
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
      
      {/* 현재 → 예측 */}
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
      
      {/* 변동 표시 */}
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
      
      {/* AI 요약 (API 데이터에만) */}
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