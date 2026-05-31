import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { reviewAPI } from '@/api'

const SUBJECT_COLORS = {
  국어:'#1A56DB', 수학:'#FF6B35', 영어:'#00C49A', 
  사회:'#9B59B6', 과학:'#FFB800', 한국사:'#E11D48',
}

export default function TodayReviewWidget({ studentId }) {
  const [reviewItems, setReviewItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  
  useEffect(() => {
    if (!studentId) return
    
    reviewAPI.getToday(String(studentId))
      .then(data => {
        // 응답 구조 대비
        const items = Array.isArray(data) 
          ? data 
          : (data?.reviewItems || data?.items || data?.data || [])
        setReviewItems(items)
      })
      .catch(e => {
        console.log('오늘의 복습 조회 실패 (정상일 수 있음):', e)
        setReviewItems([])
      })
      .finally(() => setLoading(false))
  }, [studentId])
  
  // 로딩 중
  if (loading) {
    return (
      <section className="section">
        <div className="section__header">
          <h3 className="section__title">📚 오늘의 복습</h3>
        </div>
        <div style={{ padding:'20px', textAlign:'center', color:'var(--color-text-muted)', fontSize:12 }}>
          복습 항목을 불러오는 중...
        </div>
      </section>
    )
  }
  
  // 복습할 게 없을 때 → 위젯 자체를 안 보여줘서 화면 깔끔하게
  if (reviewItems.length === 0) {
    return (
      <section className="section">
        <div className="section__header">
          <h3 className="section__title">📚 오늘의 복습</h3>
        </div>
        <div style={{ 
          padding:'20px 16px', textAlign:'center',
          background:'#D1FAF015', borderRadius:14, border:'1px solid #00C49A30',
        }}>
          <p style={{ fontSize:24, marginBottom:6 }}>🎉</p>
          <p style={{ fontSize:12, color:'var(--color-success)', fontWeight:600 }}>
            오늘은 복습할 항목이 없어요!
          </p>
          <p style={{ fontSize:10, color:'var(--color-text-muted)', marginTop:4 }}>
            새로운 학습 활동을 시작해보세요
          </p>
        </div>
      </section>
    )
  }
  
  return (
    <section className="section">
      <div className="section__header">
        <h3 className="section__title">📚 오늘의 복습</h3>
        <span style={{ 
          fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20,
          background:'var(--color-primary-light)', color:'var(--color-primary)',
        }}>
          {reviewItems.length}개 항목
        </span>
      </div>
      
      <p style={{ fontSize:11, color:'var(--color-text-muted)', marginBottom:10, lineHeight:1.5 }}>
        💡 에빙하우스 망각곡선 기반으로 AI가 오늘 복습할 내용을 추천했어요
      </p>
      
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {reviewItems.slice(0, 4).map((item, i) => {
          const subject = item.subject || item.subjectName || '학습'
          const topic = item.topic || item.concept || item.title || ''
          const questionsCount = item.questionsCount ?? item.questions ?? null
          const lastStudied = item.lastStudied || item.lastDate || ''
          const color = SUBJECT_COLORS[subject] || '#1A56DB'
          
          // 며칠 전 표시
          const daysAgo = (() => {
            if (!lastStudied) return null
            try {
              const past = new Date(lastStudied)
              const now = new Date()
              const days = Math.floor((now - past) / (1000 * 60 * 60 * 24))
              if (days === 0) return '오늘'
              if (days === 1) return '어제'
              return `${days}일 전`
            } catch {
              return null
            }
          })()
          
          return (
            <div key={i} className="card" style={{
              padding:'12px 14px', display:'flex', alignItems:'center', gap:12,
              borderLeft:`4px solid ${color}`,
            }}>
              {/* 과목 배지 */}
              <div style={{
                padding:'4px 10px', borderRadius:8, flexShrink:0,
                background: color+'18', color,
                fontSize:11, fontWeight:700,
              }}>
                {subject}
              </div>
              
              {/* 내용 */}
              <div style={{ flex:1, minWidth:0 }}>
                {topic && (
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--color-text-primary)' }}>
                    {topic}
                  </p>
                )}
                <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:2 }}>
                  {daysAgo && <span>{daysAgo} 학습</span>}
                  {daysAgo && questionsCount && <span> · </span>}
                  {questionsCount && <span>{questionsCount}문제</span>}
                </p>
              </div>
              
              {/* 복습하기 버튼 */}
              <button
                onClick={() => navigate('/learning')}
                style={{
                  padding:'6px 12px', borderRadius:8, border:'none',
                  background:color, color:'white',
                  fontSize:11, fontWeight:700, fontFamily:'inherit', cursor:'pointer',
                  flexShrink:0,
                }}
              >
                복습 →
              </button>
            </div>
          )
        })}
      </div>
      
      {/* 더보기 (5개 이상일 때) */}
      {reviewItems.length > 4 && (
        <button
          onClick={() => navigate('/learning')}
          style={{
            width:'100%', marginTop:8, padding:'10px', borderRadius:10,
            border:'1px dashed var(--color-border)', background:'transparent',
            color:'var(--color-text-muted)', fontSize:11, fontWeight:600,
            fontFamily:'inherit', cursor:'pointer',
          }}
        >
          + {reviewItems.length - 4}개 더 보기
        </button>
      )}
    </section>
  )
}