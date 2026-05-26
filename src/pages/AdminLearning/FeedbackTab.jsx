import { useState, useEffect } from 'react'
import { activitiesAPI } from '@/api'
import { STUDENTS, INIT_FEEDBACKS } from './data/mockData'

export default function FeedbackTab() {
  const [selectedStudent, setSelectedStudent] = useState('')
  const [activities, setActivities] = useState([])      // 🆕 학습 기록 목록
  const [loadingActivities, setLoadingActivities] = useState(false)
  
  // 피드백 작성 중인 activityId (인라인 폼)
  const [editingId, setEditingId] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [savedId, setSavedId] = useState(null)
  
  const [filterStudent, setFilterStudent] = useState('전체')
  
  // 🆕 학생 선택 시 학습 기록 조회
  useEffect(() => {
    if (!selectedStudent) {
      setActivities([])
      return
    }
    
    setLoadingActivities(true)
    activitiesAPI.getActivities(String(selectedStudent))
      .then(data => {
        // 응답이 배열 또는 { activities: [...] } 형태일 수 있음
        const list = Array.isArray(data) ? data : (data?.activities || [])
        // 최신순 정렬
        list.sort((a, b) => new Date(b.studyDate) - new Date(a.studyDate))
        setActivities(list)
      })
      .catch(e => {
        console.error('학습 기록 조회 실패:', e)
        setActivities([])
      })
      .finally(() => setLoadingActivities(false))
  }, [selectedStudent])
  
  // 🆕 피드백 작성 시작
  const startEdit = (activity) => {
    setEditingId(activity.id || activity.activityId)
    setFeedbackText(activity.instructorFeedback || '')
  }
  
  const cancelEdit = () => {
    setEditingId(null)
    setFeedbackText('')
  }
  
  // 🆕 피드백 저장 (PATCH)
  const handleSaveFeedback = async (activityId) => {
    if (!feedbackText.trim()) {
      alert('피드백 내용을 입력해 주세요')
      return
    }
    
    setSavingId(activityId)
    try {
      await activitiesAPI.patchFeedback(activityId, feedbackText.trim())
      
      // 로컬 상태 업데이트 (재조회 없이)
      setActivities(prev => prev.map(a => {
        const id = a.id || a.activityId
        return id === activityId
          ? { ...a, instructorFeedback: feedbackText.trim() }
          : a
      }))
      
      setSavedId(activityId)
      setEditingId(null)
      setFeedbackText('')
      setTimeout(() => setSavedId(null), 2000)
    } catch (e) {
      console.error('피드백 저장 실패:', e)
      alert('피드백 저장에 실패했어요. 다시 시도해 주세요.')
    } finally {
      setSavingId(null)
    }
  }
  
  const selectedStudentInfo = STUDENTS.find(s => s.id === Number(selectedStudent))
  
  // 필터된 학습 기록 (피드백 유무 기준)
  const withFeedback = activities.filter(a => a.instructorFeedback)
  const withoutFeedback = activities.filter(a => !a.instructorFeedback)
  
  // 과목별 색상
  const subjectColor = {
    국어: '#FF6B6B', 영어: '#4ECDC4', 수학: '#1A56DB',
    한국사: '#FFB800', 사회탐구: '#9C88FF', 과학탐구: '#00C49A',
  }
  
  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>강사 전용</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>피드백 작성 / 조회</h2>
        <p style={{ fontSize:13, opacity:0.7, marginTop:6 }}>학생의 학습 기록을 보고 피드백을 남겨주세요</p>
      </div>
      
      {/* 학생 선택 */}
      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:8 }}>학생 선택</p>
          <select
            value={selectedStudent}
            onChange={e => { setSelectedStudent(e.target.value); setEditingId(null) }}
            style={{
              width:'100%', padding:'10px 12px', borderRadius:10,
              border:'1.5px solid var(--color-border)', background:'var(--color-surface)',
              fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box',
            }}
          >
            <option value="">학생을 선택해 주세요</option>
            {STUDENTS.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
            ))}
          </select>
        </div>
      </div>
      
      {/* 학생 미선택 안내 */}
      {!selectedStudent && (
        <div style={{ margin:'40px 16px', textAlign:'center' }}>
          <p style={{ fontSize:32, marginBottom:8 }}>👆</p>
          <p style={{ fontSize:13, color:'var(--color-text-muted)' }}>
            학생을 선택하면 학습 기록이 표시됩니다
          </p>
        </div>
      )}
      
      {/* 로딩 */}
      {selectedStudent && loadingActivities && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--color-text-muted)', fontSize:13 }}>
          학습 기록을 불러오는 중...
        </div>
      )}
      
      {/* 학습 기록 없음 */}
      {selectedStudent && !loadingActivities && activities.length === 0 && (
        <div style={{ margin:'24px 16px', padding:'32px 16px', textAlign:'center', background:'var(--color-surface)', borderRadius:14, border:'1px dashed var(--color-border)' }}>
          <p style={{ fontSize:32, marginBottom:8 }}>📭</p>
          <p style={{ fontSize:13, color:'var(--color-text-muted)' }}>
            {selectedStudentInfo?.name} 학생의 학습 기록이 없어요
          </p>
        </div>
      )}
      
      {/* 학습 기록 + 피드백 */}
      {selectedStudent && !loadingActivities && activities.length > 0 && (
        <>
          {/* 요약 통계 */}
          <div style={{ margin:'12px 16px 0' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div style={{ padding:'12px', borderRadius:12, background:'var(--color-primary-light)', textAlign:'center' }}>
                <p style={{ fontSize:11, color:'var(--color-text-muted)' }}>전체 기록</p>
                <p style={{ fontSize:20, fontWeight:800, color:'var(--color-primary)' }}>{activities.length}건</p>
              </div>
              <div style={{ padding:'12px', borderRadius:12, background:'#FFE9E915', border:'1px solid #FF3B3B30', textAlign:'center' }}>
                <p style={{ fontSize:11, color:'var(--color-text-muted)' }}>피드백 미작성</p>
                <p style={{ fontSize:20, fontWeight:800, color:'var(--color-danger)' }}>{withoutFeedback.length}건</p>
              </div>
            </div>
          </div>
          
          {/* 피드백 필요 (미작성) */}
          {withoutFeedback.length > 0 && (
            <div style={{ margin:'16px 16px 0' }}>
              <p style={{ fontSize:13, fontWeight:700, marginBottom:8, color:'var(--color-danger)' }}>
                📌 피드백 작성 필요 ({withoutFeedback.length})
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {withoutFeedback.map(a => (
                  <ActivityCard
                    key={a.id || a.activityId}
                    activity={a}
                    subjectColor={subjectColor}
                    editingId={editingId}
                    feedbackText={feedbackText}
                    setFeedbackText={setFeedbackText}
                    startEdit={startEdit}
                    cancelEdit={cancelEdit}
                    handleSave={handleSaveFeedback}
                    savingId={savingId}
                    savedId={savedId}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* 피드백 작성 완료 */}
          {withFeedback.length > 0 && (
            <div style={{ margin:'16px 16px 0' }}>
              <p style={{ fontSize:13, fontWeight:700, marginBottom:8, color:'var(--color-success)' }}>
                ✅ 피드백 작성 완료 ({withFeedback.length})
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {withFeedback.map(a => (
                  <ActivityCard
                    key={a.id || a.activityId}
                    activity={a}
                    subjectColor={subjectColor}
                    editingId={editingId}
                    feedbackText={feedbackText}
                    setFeedbackText={setFeedbackText}
                    startEdit={startEdit}
                    cancelEdit={cancelEdit}
                    handleSave={handleSaveFeedback}
                    savingId={savingId}
                    savedId={savedId}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
      
      <div style={{ height:24 }} />
    </div>
  )
}

// 🆕 학습 기록 카드 (피드백 작성/조회/수정 통합)
function ActivityCard({ activity, subjectColor, editingId, feedbackText, setFeedbackText, startEdit, cancelEdit, handleSave, savingId, savedId }) {
  const activityId = activity.id || activity.activityId
  const isEditing = editingId === activityId
  const isSaving = savingId === activityId
  const isSaved = savedId === activityId
  
  const color = subjectColor[activity.subject] || 'var(--color-primary)'
  
  return (
    <div style={{ padding:'14px', borderRadius:12, background:'var(--color-surface)', border:`1px solid ${isEditing ? 'var(--color-primary)' : 'var(--color-border)'}`, transition:'all 0.15s' }}>
      {/* 헤더: 과목 + 날짜 */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ padding:'3px 9px', borderRadius:20, background:color+'18', color, fontSize:11, fontWeight:700 }}>
            {activity.subject}
          </span>
          <span style={{ fontSize:12, color:'var(--color-text-muted)' }}>
            {activity.studyDate}
          </span>
        </div>
        {activity.studyDurationMinutes && (
          <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>
            ⏱ {activity.studyDurationMinutes}분
          </span>
        )}
      </div>
      
      {/* 점수 */}
      {(activity.understandingScore || activity.concentrationScore) && (
        <div style={{ display:'flex', gap:12, marginBottom:10, padding:'8px 10px', borderRadius:8, background:'var(--color-surface-2)' }}>
          {activity.understandingScore && (
            <div style={{ flex:1 }}>
              <p style={{ fontSize:10, color:'var(--color-text-muted)', marginBottom:2 }}>이해도</p>
              <p style={{ fontSize:13, fontWeight:700 }}>
                {'⭐'.repeat(activity.understandingScore)}
                <span style={{ fontSize:11, color:'var(--color-text-muted)', marginLeft:4 }}>
                  ({activity.understandingScore}/5)
                </span>
              </p>
            </div>
          )}
          {activity.concentrationScore && (
            <div style={{ flex:1 }}>
              <p style={{ fontSize:10, color:'var(--color-text-muted)', marginBottom:2 }}>집중도</p>
              <p style={{ fontSize:13, fontWeight:700 }}>
                {'⭐'.repeat(activity.concentrationScore)}
                <span style={{ fontSize:11, color:'var(--color-text-muted)', marginLeft:4 }}>
                  ({activity.concentrationScore}/5)
                </span>
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* 피드백 영역 */}
      {isEditing ? (
        <div>
          <textarea
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            placeholder="수업 태도, 이해도, 특이사항 등을 기록해 주세요..."
            rows={3}
            autoFocus
            style={{
              width:'100%', borderRadius:8, border:'1.5px solid var(--color-primary)',
              background:'var(--color-surface-2)', padding:'8px 10px',
              fontSize:12, fontFamily:'inherit', color:'var(--color-text-primary)',
              outline:'none', resize:'none', boxSizing:'border-box', marginBottom:8,
            }}
          />
          <div style={{ display:'flex', gap:6 }}>
            <button
              onClick={cancelEdit}
              disabled={isSaving}
              style={{
                flex:1, padding:'8px', borderRadius:8, border:'1px solid var(--color-border)',
                background:'transparent', color:'var(--color-text-muted)', fontSize:12,
                fontWeight:600, fontFamily:'inherit', cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              취소
            </button>
            <button
              onClick={() => handleSave(activityId)}
              disabled={isSaving}
              style={{
                flex:2, padding:'8px', borderRadius:8, border:'none',
                background: isSaving ? 'var(--color-text-muted)' : 'var(--color-primary)',
                color:'white', fontSize:12, fontWeight:700, fontFamily:'inherit',
                cursor: isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ) : activity.instructorFeedback ? (
        <div style={{ padding:'10px 12px', borderRadius:8, background:'#D1FAF015', border:`1px solid ${isSaved ? 'var(--color-success)' : '#00C49A30'}`, transition:'border 0.3s' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--color-success)' }}>💬 강사 피드백</p>
            <button
              onClick={() => startEdit(activity)}
              style={{ padding:'2px 8px', borderRadius:6, border:'1px solid var(--color-border)', background:'transparent', fontSize:10, color:'var(--color-text-muted)', fontFamily:'inherit', cursor:'pointer' }}
            >
              수정
            </button>
          </div>
          <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>
            {activity.instructorFeedback}
          </p>
          {isSaved && (
            <p style={{ fontSize:10, color:'var(--color-success)', marginTop:4, fontWeight:600 }}>
              ✓ 저장되었습니다
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => startEdit(activity)}
          style={{
            width:'100%', padding:'10px', borderRadius:8,
            border:'1.5px dashed var(--color-border)', background:'transparent',
            color:'var(--color-text-muted)', fontSize:12, fontWeight:600,
            fontFamily:'inherit', cursor:'pointer',
          }}
        >
          ✏️ 피드백 작성하기
        </button>
      )}
    </div>
  )
}