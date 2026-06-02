import { useState, useEffect } from 'react'
import { analysisAPI } from '@/api'
import { SUBJECT_COLORS } from '../../data/mockData'

// subjectId → 과목명 매핑 (백엔드 확인 후 보정)
const SUBJECT_NAME_BY_ID = {
  1: '국어',
  2: '수학',
  3: '영어',
  4: '한국사',
  5: '사회',
  6: '과학',
}

export default function StrengthsPanel({ student }) {
  const [strengths, setStrengths] = useState(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (!student?.id) return
    
    setLoading(true)
    analysisAPI.getStrengths(String(student.id))
      .then(data => setStrengths(data))
      .catch(e => {
        console.error('강점 분석 조회 실패:', e)
        setStrengths(null)
      })
      .finally(() => setLoading(false))
  }, [student?.id])
  
  if (loading) {
    return (
      <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
        강점 분석 중...
      </div>
    )
  }
  
  // API 데이터 있고 강점 과목도 있을 때
  const hasApiStrengths = strengths?.strongSubjectIds?.length > 0
  
  // 폴백: mock scores에서 80점 이상 자동 추출
  const mockStrengths = student.scores 
    ? Object.entries(student.scores)
        .filter(([_, score]) => score >= 80)
        .sort((a, b) => b[1] - a[1])
    : []
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      
      {/* 1. AI 강점 분석 요약 (있을 때만) */}
      {strengths?.strengthSummary && (
        <div style={{ 
          padding:'12px 14px', borderRadius:10, 
          background:'linear-gradient(135deg, #E8F0FF, #F0F5FF)',
          border:'1px solid #1A56DB30',
        }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', marginBottom:6 }}>
            🤖 AI 강점 분석
          </p>
          <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>
            {strengths.strengthSummary}
          </p>
        </div>
      )}
      
      {/* 2. 강점 과목 카드 (API 데이터) */}
      {hasApiStrengths ? (
        <div>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
            🏆 강점 과목
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {strengths.strongSubjectIds.map(subjectId => {
              const subjectName = strengths.strongSubjectNames?.[subjectId]
                || SUBJECT_NAME_BY_ID[subjectId]
                || `과목 ${subjectId}`
              const color = SUBJECT_COLORS[subjectName] || '#00C49A'
              
              return (
                <div key={subjectId} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'14px', borderRadius:12,
                  background:'#D1FAF015', border:'1px solid #00C49A30',
                }}>
                  <span style={{ fontSize:28 }}>🏆</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:15, fontWeight:700 }}>{subjectName}</p>
                    <p style={{ fontSize:11, color:'var(--color-success)', marginTop:2 }}>
                      AI가 분석한 강점 과목
                    </p>
                  </div>
                  <div style={{ 
                    padding:'6px 12px', borderRadius:20, 
                    background:color, color:'white',
                    fontSize:11, fontWeight:700,
                  }}>
                    강점
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : mockStrengths.length > 0 ? (
        // 3. 폴백: mock scores 기반 강점 (80점 이상)
        <div>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
            🏆 우수 과목 (점수 기반)
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {mockStrengths.map(([subject, score]) => {
              const color = SUBJECT_COLORS[subject] || '#00C49A'
              return (
                <div key={subject} style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'14px', borderRadius:12,
                  background:'#D1FAF015', border:'1px solid #00C49A30',
                }}>
                  <span style={{ fontSize:28 }}>🏆</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:15, fontWeight:700 }}>{subject}</p>
                    <p style={{ fontSize:11, color:'var(--color-success)', marginTop:2 }}>
                      80점 이상 우수 성적 유지
                    </p>
                  </div>
                  <div style={{ 
                    padding:'6px 12px', borderRadius:20, 
                    background:color, color:'white',
                    fontSize:13, fontWeight:800,
                  }}>
                    {score}점
                  </div>
                </div>
              )
            })}
          </div>
          
          <p style={{ fontSize:10, color:'var(--color-text-muted)', marginTop:8, textAlign:'right' }}>
            💡 AI 강점 분석이 쌓이면 더 정확한 결과를 보여드려요
          </p>
        </div>
      ) : (
        // 4. 강점 과목 없을 때
        <div style={{ 
          padding:'32px 16px', textAlign:'center', 
          background:'var(--color-surface-2)', borderRadius:12, 
          border:'1px dashed var(--color-border)',
        }}>
          <p style={{ fontSize:32, marginBottom:8 }}>🌱</p>
          <p style={{ fontSize:13, color:'var(--color-text-secondary)', fontWeight:600, marginBottom:4 }}>
            아직 두드러진 강점 과목이 없어요
          </p>
          <p style={{ fontSize:11, color:'var(--color-text-muted)', lineHeight:1.5 }}>
            {strengths?.strengthSummary || '꾸준한 학습으로 강점 과목을 만들어보세요'}
          </p>
        </div>
      )}
      
      {/* 5. 학생 평균 정보 (참고용) */}
      {student.scores && (
        <div style={{ 
          padding:'10px 12px', borderRadius:10, 
          background:'var(--color-surface)', border:'1px solid var(--color-border)',
        }}>
          <p style={{ fontSize:11, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:6 }}>
            📊 참고: 학생 전체 평균
          </p>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <p style={{ fontSize:20, fontWeight:800, color:'var(--color-primary)' }}>
              {student.avgScore}점
            </p>
            {student.trendVal !== 0 && (
              <p style={{ 
                fontSize:12, fontWeight:700, 
                color: student.trendVal > 0 ? 'var(--color-success)' : 'var(--color-danger)' 
              }}>
                {student.trendVal > 0 ? `▲ ${student.trendVal}` : `▼ ${Math.abs(student.trendVal)}`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}