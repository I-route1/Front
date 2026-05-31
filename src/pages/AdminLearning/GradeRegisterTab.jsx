import { useState } from 'react'
import { gradesAPI } from '@/api'
import { STUDENTS, SUBJECTS, SUBJECT_COLORS } from './data/mockData'

const EXAM_TYPES = [
  { id: 'MIDTERM',   label: '중간고사' },
  { id: 'FINAL',     label: '기말고사' },
  { id: 'MOCK',      label: '모의고사' },
  { id: 'WEEKLY',    label: '주간평가' },
  { id: 'ASSIGN',    label: '과제' },
]

function getTodayString() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// 로컬 임시 ID 생성 (백엔드가 id 안 줄 때)
let _localIdSeed = 1
const genLocalId = () => `local-${Date.now()}-${_localIdSeed++}`

export default function GradeRegisterTab() {
  // 폼 상태
  const [selectedStudent, setSelectedStudent] = useState('')
  const [subject, setSubject] = useState('수학')
  const [score, setScore] = useState('')
  const [examDate, setExamDate] = useState(getTodayString())
  const [examType, setExamType] = useState('MIDTERM')
  
  // 수정 모드
  const [editingId, setEditingId] = useState(null)  // null = 등록 / id = 수정
  
  // 제출 상태
  const [submitting, setSubmitting] = useState(false)
  const [recentRegistrations, setRecentRegistrations] = useState([])
  const [toast, setToast] = useState(null)
  
  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }
  
  const validate = () => {
    if (!selectedStudent) return '학생을 선택해주세요'
    if (!score) return '점수를 입력해주세요'
    
    const scoreNum = Number(score)
    if (Number.isNaN(scoreNum)) return '점수는 숫자로 입력해주세요'
    if (scoreNum < 0 || scoreNum > 100) return '점수는 0~100 사이여야 해요'
    
    if (!examDate) return '시험일을 선택해주세요'
    
    return null
  }
  
  // 폼 초기화
  const resetForm = (keepStudent = true) => {
    if (!keepStudent) setSelectedStudent('')
    setSubject('수학')
    setScore('')
    setExamDate(getTodayString())
    setExamType('MIDTERM')
    setEditingId(null)
  }
  
  // 등록/수정 처리
  const handleSubmit = async () => {
    const error = validate()
    if (error) {
      showToast('error', error)
      return
    }
    
    setSubmitting(true)
    
    const studentInfo = STUDENTS.find(s => String(s.id) === String(selectedStudent))
    
    const payload = {
      studentId: String(selectedStudent),
      subject,
      score: Number(score),
      examDate,
      examType,
      testName: EXAM_TYPES.find(t => t.id === examType)?.label,
    }
    
    try {
      // 수정 모드 vs 등록 모드
      if (editingId) {
        // 수정
        try {
          await gradesAPI.updateGrade(editingId, payload)
          showToast('success', `✅ ${studentInfo?.name ?? '학생'} 성적이 수정되었어요`)
        } catch (e) {
          // 백엔드에 PATCH가 없거나 실패 → 로컬만 수정
          console.warn('백엔드 수정 실패, 로컬만 반영:', e)
          showToast('success', `✏️ 로컬에서 수정됨 (백엔드 API 미지원)`)
        }
        
        // 로컬 이력 수정
        setRecentRegistrations(prev => prev.map(r => 
          r.gradeId === editingId 
            ? { ...r, ...payload, studentName: studentInfo?.name ?? '학생' }
            : r
        ))
      } else {
        // 신규 등록
        const response = await gradesAPI.postGrade(payload)
        
        // 응답에서 id 추출 시도 (백엔드 응답 형식에 따라)
        const gradeId = response?.id ?? response?.gradeId ?? response?.data?.id ?? genLocalId()
        
        showToast('success', `✅ ${studentInfo?.name ?? '학생'} 성적이 등록되었어요`)
        
        setRecentRegistrations(prev => [
          {
            ...payload,
            gradeId,
            studentName: studentInfo?.name ?? '학생',
            timestamp: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 10))
      }
      
      resetForm()
    } catch (e) {
      console.error('성적 등록 실패:', e)
      showToast('error', '❌ 등록 실패 - 백엔드 응답을 확인해주세요')
    } finally {
      setSubmitting(false)
    }
  }
  
  // 수정 시작
  const handleEdit = (record) => {
    setEditingId(record.gradeId)
    setSelectedStudent(record.studentId)
    setSubject(record.subject)
    setScore(String(record.score))
    setExamDate(record.examDate)
    setExamType(record.examType)
    // 폼 위로 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  // 수정 취소
  const handleCancelEdit = () => {
    resetForm(false)
  }
  
  // 삭제
  const handleDelete = async (record) => {
    const confirmed = window.confirm(
      `정말 삭제하시겠어요?\n\n${record.studentName} · ${record.subject} · ${record.score}점`
    )
    if (!confirmed) return
    
    try {
      await gradesAPI.deleteGrade(record.gradeId)
      showToast('success', `🗑️ 삭제되었어요`)
    } catch (e) {
      console.warn('백엔드 삭제 실패, 로컬만 반영:', e)
      showToast('success', `🗑️ 로컬에서 삭제됨 (백엔드 API 미지원)`)
    }
    
    // 로컬 이력에서 제거
    setRecentRegistrations(prev => prev.filter(r => r.gradeId !== record.gradeId))
    
    // 수정 중이던 거 지워졌으면 폼도 초기화
    if (editingId === record.gradeId) {
      resetForm(false)
    }
  }
  
  return (
    <div style={{ padding: '0 0 24px' }}>
      
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)', padding: '24px 20px', color: 'white' }}>
        <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>학생 성적 데이터 추가/수정/삭제</p>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>🎯 성적 등록</h2>
      </div>
      
      {/* 토스트 */}
      {toast && (
        <div style={{
          margin: '16px 16px 0',
          padding: '12px 16px',
          borderRadius: 10,
          background: toast.type === 'success' ? '#D1FAF0' : '#FFE9E9',
          border: `1px solid ${toast.type === 'success' ? '#00C49A' : '#FF3B3B'}40`,
          color: toast.type === 'success' ? '#006B5A' : '#A82424',
          fontSize: 13, fontWeight: 600,
        }}>
          {toast.message}
        </div>
      )}
      
      {/* 수정 모드 알림 */}
      {editingId && (
        <div style={{
          margin: '16px 16px 0',
          padding: '10px 14px',
          borderRadius: 10,
          background: '#FFF8E0',
          border: '1px solid #FFB80040',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: 12, color: '#8A6500', fontWeight: 600 }}>
            ✏️ 수정 모드입니다
          </p>
          <button
            onClick={handleCancelEdit}
            style={{
              padding: '4px 10px', borderRadius: 6, border: '1px solid #8A6500',
              background: 'transparent', color: '#8A6500', 
              fontSize: 11, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            취소
          </button>
        </div>
      )}
      
      {/* 폼 영역 */}
      <div style={{ margin: '16px 16px 0', padding: '16px', background: 'var(--color-surface)', borderRadius: 14, border: '1.5px solid var(--color-border)' }}>
        
        {/* 학생 선택 */}
        <FormField label="학생">
          <select
            value={selectedStudent}
            onChange={e => setSelectedStudent(e.target.value)}
            disabled={!!editingId}  
            style={{
              ...selectStyle,
              opacity: editingId ? 0.6 : 1,
              cursor: editingId ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">학생을 선택하세요</option>
            {STUDENTS.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.grade} {s.class})
              </option>
            ))}
          </select>
        </FormField>
        
        {/* 과목 */}
        <FormField label="과목">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SUBJECTS.map(sub => {
              const isActive = subject === sub
              const color = SUBJECT_COLORS[sub] || '#1A56DB'
              return (
                <button
                  key={sub}
                  onClick={() => setSubject(sub)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                    background: isActive ? color : 'var(--color-surface-2)',
                    color: isActive ? 'white' : 'var(--color-text-muted)',
                    border: isActive ? 'none' : '1px solid var(--color-border)',
                    transition: 'all 0.15s',
                  }}
                >
                  {sub}
                </button>
              )
            })}
          </div>
        </FormField>
        
        {/* 점수 */}
        <FormField label="점수">
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={e => setScore(e.target.value)}
              placeholder="0 ~ 100"
              style={{
                ...inputStyle,
                paddingRight: 40,
                fontSize: 16, fontWeight: 700,
              }}
            />
            <span style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600,
            }}>점</span>
          </div>
        </FormField>
        
        {/* 시험일 */}
        <FormField label="시험일">
          <input
            type="date"
            value={examDate}
            onChange={e => setExamDate(e.target.value)}
            style={inputStyle}
          />
        </FormField>
        
        {/* 시험 종류 */}
        <FormField label="시험 종류">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EXAM_TYPES.map(t => {
              const isActive = examType === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setExamType(t.id)}
                  style={{
                    padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                    background: isActive ? 'var(--color-primary)' : 'var(--color-surface-2)',
                    color: isActive ? 'white' : 'var(--color-text-muted)',
                    border: isActive ? 'none' : '1px solid var(--color-border)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </FormField>
        
        {/* 등록/수정 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: '100%', padding: '13px', borderRadius: 12, border: 'none',
            background: submitting 
              ? 'var(--color-text-muted)' 
              : editingId
                ? 'linear-gradient(90deg, #FFB800, #FF6B35)'
                : 'linear-gradient(90deg, #1A56DB, #00C49A)',
            color: 'white', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
            cursor: submitting ? 'not-allowed' : 'pointer',
            marginTop: 8,
          }}
        >
          {submitting 
            ? '⏳ 처리 중...' 
            : editingId 
              ? '✏️ 수정하기' 
              : '📝 성적 등록하기'
          }
        </button>
      </div>
      
      {/* 등록 이력 */}
      {recentRegistrations.length > 0 && (
        <div style={{ margin: '16px 16px 0' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            📋 등록 내역 ({recentRegistrations.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentRegistrations.map(r => {
              const color = SUBJECT_COLORS[r.subject] || '#1A56DB'
              const isEditing = editingId === r.gradeId
              
              return (
                <div key={r.gradeId} style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: isEditing ? '#FFF8E0' : 'var(--color-surface)',
                  border: `1px solid ${isEditing ? '#FFB80060' : 'var(--color-border)'}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.15s',
                }}>
                  <span style={{
                    padding: '3px 8px', borderRadius: 6,
                    background: color + '18', color, fontSize: 11, fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {r.subject}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>
                      {r.studentName} · <span style={{ color }}>{r.score}점</span>
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 1 }}>
                      {r.examDate} · {EXAM_TYPES.find(t => t.id === r.examType)?.label}
                    </p>
                  </div>
                  
                  {/* 수정/삭제 버튼 */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={() => handleEdit(r)}
                      disabled={submitting}
                      title="수정"
                      style={iconButtonStyle}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      disabled={submitting}
                      title="삭제"
                      style={iconButtonStyle}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ 
        fontSize: 11, fontWeight: 700, 
        color: 'var(--color-text-secondary)', 
        marginBottom: 6,
      }}>
        {label}
      </p>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-surface-2)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  color: 'var(--color-text-primary)',
}

const selectStyle = {
  ...inputStyle,
  appearance: 'menulist',
}

const iconButtonStyle = {
  width: 32, height: 32, borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface-2)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14,
  transition: 'all 0.15s',
}