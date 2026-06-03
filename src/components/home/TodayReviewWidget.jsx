import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { reviewAPI, recommendationsAPI } from '@/api'

const SUBJECT_COLORS = {
  국어:'#1A56DB', 수학:'#FF6B35', 영어:'#00C49A', 
  사회:'#9B59B6', 과학:'#FFB800', 한국사:'#E11D48',
}

const TABS = [
  { id: 'daily',   label: '데일리 학습', emoji: '🎯', desc: 'AI 추천 오늘의 학습' },
  { id: 'review',  label: '복습',     emoji: '📚', desc: '에빙하우스 망각곡선 기반 복습' },
]

export default function TodayReviewWidget({ studentId }) {
  const [activeTab, setActiveTab] = useState('daily')
  
  // 복습 탭 상태
  const [reviewItems, setReviewItems] = useState([])
  const [reviewLoading, setReviewLoading] = useState(true)
  
  // 데일리 학습 탭 상태
  const [dailyItems, setDailyItems] = useState([])
  const [dailyLoading, setDailyLoading] = useState(true)
  
  const navigate = useNavigate()
  
  // 복습 데이터 조회
  useEffect(() => {
    if (!studentId) return
    
    setReviewLoading(true)
    reviewAPI.getToday(String(studentId))
      .then(data => {
        const items = Array.isArray(data) 
          ? data 
          : (data?.reviewItems || data?.items || data?.data || [])
        setReviewItems(items)
      })
      .catch(e => {
        console.log('오늘의 복습 조회 실패:', e)
        setReviewItems([])
      })
      .finally(() => setReviewLoading(false))
  }, [studentId])
  
  // 데일리 학습 데이터 조회
  useEffect(() => {
    if (!studentId) return
    
    setDailyLoading(true)
    recommendationsAPI.getMaterials(String(studentId))
      .then(data => {
        const items = Array.isArray(data) 
          ? data 
          : (data?.recommendations || data?.items || data?.data || [])
        setDailyItems(items)
      })
      .catch(e => {
        console.log('데일리 학습 추천 조회 실패:', e)
        setDailyItems([])
      })
      .finally(() => setDailyLoading(false))
  }, [studentId])
  
  const currentTab = TABS.find(t => t.id === activeTab)
  const items = activeTab === 'review' ? reviewItems : dailyItems
  const loading = activeTab === 'review' ? reviewLoading : dailyLoading
  
  // 두 탭 다 비어있으면 위젯 자체를 깔끔하게 표시
  const bothEmpty = !reviewLoading && !dailyLoading 
    && reviewItems.length === 0 && dailyItems.length === 0
  
  if (bothEmpty) {
    return (
      <section className="section">
        <div className="section__header">
          <h3 className="section__title">📚 오늘의 학습</h3>
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
        <h3 className="section__title">📚 오늘의 학습</h3>
        {!loading && items.length > 0 && (
          <span style={{ 
            fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:20,
            background:'var(--color-primary-light)', color:'var(--color-primary)',
          }}>
            {items.length}개 항목
          </span>
        )}
      </div>
      
      {/* 🆕 탭 헤더 */}
      <div style={{ 
        display:'flex', gap:6, marginBottom:10,
        borderBottom:'1px solid var(--color-border)',
        paddingBottom:0,
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding:'8px 14px', border:'none', background:'transparent',
                cursor:'pointer', fontFamily:'inherit',
                fontSize: 12,
                fontWeight: isActive ? 700 : 600,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                transition:'all 0.15s',
              }}
            >
              <span style={{ marginRight:4 }}>{tab.emoji}</span>
              {tab.label}
            </button>
          )
        })}
      </div>
      
      {/* 탭 설명 */}
      <p style={{ fontSize:11, color:'var(--color-text-muted)', marginBottom:10, lineHeight:1.5 }}>
        💡 {currentTab.desc}
      </p>
      
      {/* 탭 내용 */}
      {loading ? (
        <div style={{ padding:'20px', textAlign:'center', color:'var(--color-text-muted)', fontSize:12 }}>
          {currentTab.label} 항목 분석 중...
        </div>
      ) : items.length === 0 ? (
        <div style={{ 
          padding:'24px 16px', textAlign:'center', 
          background:'var(--color-surface-2)', borderRadius:10, 
          border:'1px dashed var(--color-border)',
        }}>
          <p style={{ fontSize:24, marginBottom:6 }}>
            {activeTab === 'review' ? '🎉' : '✨'}
          </p>
          <p style={{ fontSize:11, color:'var(--color-text-muted)' }}>
            {activeTab === 'review' 
              ? '오늘은 복습할 항목이 없어요!' 
              : '데일리 추천 학습이 준비 중이에요'}
          </p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {items.slice(0, 4).map((item, i) => (
            <LearningCard 
              key={i} 
              item={item} 
              tabType={activeTab}
              onClick={() => navigate('/learning')}
            />
          ))}
        </div>
      )}
      
      {/* 더보기 */}
      {!loading && items.length > 4 && (
        <button
          onClick={() => navigate('/learning')}
          style={{
            width:'100%', marginTop:8, padding:'10px', borderRadius:10,
            border:'1px dashed var(--color-border)', background:'transparent',
            color:'var(--color-text-muted)', fontSize:11, fontWeight:600,
            fontFamily:'inherit', cursor:'pointer',
          }}
        >
          + {items.length - 4}개 더 보기
        </button>
      )}
    </section>
  )
}

// 학습 항목 카드 (복습/데일리 공용)
function LearningCard({ item, tabType, onClick }) {
  const subject = item.subject || item.subjectName || '학습'
  const topic = item.topic || item.concept || item.title || item.contentName || ''
  const questionsCount = item.questionsCount ?? item.questions ?? null
  const lastStudied = item.lastStudied || item.lastDate || ''
  const difficulty = item.difficulty || item.level || ''
  const estimatedTime = item.estimatedTime || item.duration || null
  const color = SUBJECT_COLORS[subject] || '#1A56DB'
  
  // 며칠 전 표시 (복습 탭에서만)
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
  
  // 액션 텍스트 (탭에 따라)
  const actionText = tabType === 'review' ? '복습 →' : '학습 →'
  
  return (
    <div className="card" style={{
      padding:'12px 14px', display:'flex', alignItems:'center', gap:12,
      borderLeft:`4px solid ${color}`,
    }}>
      <div style={{
        padding:'4px 10px', borderRadius:8, flexShrink:0,
        background: color+'18', color,
        fontSize:11, fontWeight:700,
      }}>
        {subject}
      </div>
      
      <div style={{ flex:1, minWidth:0 }}>
        {topic && (
          <p style={{ fontSize:13, fontWeight:700, color:'var(--color-text-primary)' }}>
            {topic}
          </p>
        )}
        <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:2 }}>
          {tabType === 'review' && daysAgo && <span>{daysAgo} 학습</span>}
          {tabType === 'review' && daysAgo && questionsCount && <span> · </span>}
          {tabType === 'daily' && difficulty && <span>난이도 {difficulty}</span>}
          {tabType === 'daily' && difficulty && estimatedTime && <span> · </span>}
          {tabType === 'daily' && estimatedTime && <span>약 {estimatedTime}분</span>}
          {questionsCount && (
            <span>{(tabType === 'review' && daysAgo) || (tabType === 'daily' && (difficulty || estimatedTime)) ? ' · ' : ''}{questionsCount}문제</span>
          )}
        </p>
      </div>
      
      <button
        onClick={onClick}
        style={{
          padding:'6px 12px', borderRadius:8, border:'none',
          background:color, color:'white',
          fontSize:11, fontWeight:700, fontFamily:'inherit', cursor:'pointer',
          flexShrink:0,
        }}
      >
        {actionText}
      </button>
    </div>
  )
}