import { useState } from 'react'
import { STUDENTS, INIT_FEEDBACKS } from './data/mockData'

export default function FeedbackTab() {
  const [selectedStudent, setSelectedStudent] = useState('')
  const [text, setText] = useState('')
  const [teacher, setTeacher] = useState('')
  const [feedbacks, setFeedbacks] = useState(INIT_FEEDBACKS)
  const [saved, setSaved] = useState(false)
  const [filterStudent, setFilterStudent] = useState('전체')

  const handleSave = () => {
    if (!selectedStudent || !text.trim() || !teacher.trim()) {
      alert('학생, 선생님 이름, 피드백 내용을 모두 입력해 주세요')
      return
    }
    const student = STUDENTS.find(s => s.id === Number(selectedStudent))
    const newFeedback = {
      id: Date.now(),
      studentId: student.id,
      studentName: student.name,
      teacher: teacher.trim(),
      date: new Date().toLocaleDateString('ko-KR', { month:'numeric', day:'numeric' }),
      text: text.trim(),
    }
    setFeedbacks(prev => [newFeedback, ...prev])
    // TODO: 백엔드 연결 시 API 호출
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setText('')
    setSelectedStudent('')
  }

  const filteredFeedbacks = filterStudent === '전체'
    ? feedbacks
    : feedbacks.filter(f => f.studentName === filterStudent)

  const uniqueStudents = [...new Set(feedbacks.map(f => f.studentName))]

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #0A1628 0%, #1A3A5C 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>강사 전용</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>피드백 작성 / 조회</h2>
        <p style={{ fontSize:13, opacity:0.7, marginTop:6 }}>학생별 정성 평가를 기록하고 공유하세요</p>
      </div>

      {/* 피드백 작성 */}
      <div style={{ margin:'16px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', overflow:'hidden' }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>✏️</span>
            <p style={{ fontSize:14, fontWeight:700 }}>새 피드백 작성</p>
          </div>
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>

            {/* 학생 선택 */}
            <div>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:6 }}>학생 선택</p>
              <select
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
                style={{
                  width:'100%', padding:'10px 12px', borderRadius:10,
                  border:'1.5px solid var(--color-border)', background:'var(--color-surface)',
                  fontSize:13, fontFamily:'inherit', outline:'none',
                }}
              >
                <option value="">학생을 선택해 주세요</option>
                {STUDENTS.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
                ))}
              </select>
            </div>

            {/* 선생님 이름 */}
            <div>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:6 }}>작성 강사</p>
              <input
                value={teacher}
                onChange={e => setTeacher(e.target.value)}
                placeholder="예: 김수학 선생님"
                style={{
                  width:'100%', padding:'10px 12px', borderRadius:10,
                  border:'1.5px solid var(--color-border)', background:'var(--color-surface)',
                  fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box',
                }}
              />
            </div>

            {/* 내용 */}
            <div>
              <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text-secondary)', marginBottom:6 }}>피드백 내용</p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="오늘 학생의 수업 태도, 이해도, 특이사항 등을 기록해 주세요..."
                rows={4}
                style={{
                  width:'100%', borderRadius:10, border:'1.5px solid var(--color-border)',
                  background:'var(--color-surface-2)', padding:'10px 12px',
                  fontSize:13, fontFamily:'inherit', color:'var(--color-text-primary)',
                  outline:'none', resize:'none', boxSizing:'border-box',
                }}
              />
            </div>

            <button
              onClick={handleSave}
              style={{
                width:'100%', padding:'13px', borderRadius:12, border:'none',
                background: saved ? 'var(--color-success)' : 'var(--color-primary)',
                color:'white', fontSize:14, fontWeight:700, fontFamily:'inherit',
                cursor:'pointer', transition:'background 0.2s',
              }}
            >
              {saved ? '✓ 저장 완료!' : '피드백 저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 피드백 조회 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <p style={{ fontSize:14, fontWeight:700 }}>📋 피드백 목록</p>
            <span style={{ fontSize:12, color:'var(--color-text-muted)' }}>총 {filteredFeedbacks.length}건</span>
          </div>

          {/* 학생 필터 */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
            {['전체', ...uniqueStudents].map(name => (
              <button key={name} onClick={() => setFilterStudent(name)} style={{
                padding:'4px 12px', borderRadius:20, border:'none', cursor:'pointer',
                fontFamily:'inherit', fontSize:11, fontWeight:600,
                background: filterStudent===name ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: filterStudent===name ? 'white' : 'var(--color-text-muted)',
              }}>{name}</button>
            ))}
          </div>

          {/* 피드백 리스트 */}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filteredFeedbacks.length === 0 && (
              <p style={{ textAlign:'center', padding:'24px 0', fontSize:13, color:'var(--color-text-muted)' }}>
                피드백이 없어요
              </p>
            )}
            {filteredFeedbacks.map(f => (
              <div key={f.id} style={{ padding:'12px 14px', borderRadius:12, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'var(--color-primary-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800, color:'var(--color-primary)', flexShrink:0 }}>
                      {f.studentName[0]}
                    </div>
                    <div>
                      <span style={{ fontSize:13, fontWeight:700 }}>{f.studentName}</span>
                      <span style={{ fontSize:11, color:'var(--color-text-muted)', marginLeft:6 }}>{f.teacher}</span>
                    </div>
                  </div>
                  <span style={{ fontSize:11, color:'var(--color-text-muted)', flexShrink:0 }}>{f.date}</span>
                </div>
                <p style={{ fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.6 }}>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ height:24 }} />
    </div>
  )
}