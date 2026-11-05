import { useEffect, useRef, useState } from 'react'
import { activitiesAPI } from '@/api'
import { evaluationSubmissionId, manualEvaluationPayload } from './evaluationSubmission'
import { localStudyDate } from './recordUtils'
import './records.css'

// 학생별로 key를 부여해 다른 학생에게 입력값과 저장 결과가 넘어가지 않게 한다.
export default function ManualEvaluationForm({ studentId, studentName, subjects, onSaved }) {
  const [subject, setSubject] = useState('수학')
  const [studyDate, setStudyDate] = useState(localStudyDate)
  const [startTime, setStartTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [duration, setDuration] = useState(60)
  const [scores, setScores] = useState({ 이해도: 0, 집중도: 0 })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const pending = useRef(false)
  const saved = useRef(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useEffect(() => { setMessage(''); setError('') }, [subject, studyDate, startTime, duration, scores])

  const save = async event => {
    event.preventDefault()
    if (pending.current) return
    pending.current = true
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const payload = manualEvaluationPayload({ studentId, subject, studyDate, startTime, duration,
        understanding: scores.이해도, concentration: scores.집중도 })
      const signature = JSON.stringify(payload)
      if (saved.current?.signature !== signature) {
        const submissionId = await evaluationSubmissionId(payload)
        const activity = await activitiesAPI.postActivity({ ...payload, submissionId })
        if (!activity?.id) throw new Error('학습 기록을 저장하지 못했습니다. 다시 시도해 주세요.')
        saved.current = { signature, activity }
      }
      if (mounted.current) {
        setMessage('자기평가가 직접 입력 기록으로 저장되었습니다.')
        onSaved(saved.current.activity)
      }
    } catch (cause) {
      if (mounted.current) setError(cause.message || '저장하지 못했습니다. 다시 시도해 주세요.')
    } finally {
      pending.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return <form aria-label="학생 자기평가 입력" noValidate onSubmit={save}
    style={{ background:'var(--color-surface)', borderRadius:12, border:'1px solid var(--color-border)', padding:14 }}>
    <h3 style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>🌟 학생 자기평가</h3>
    <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>
      {studentName} 학생의 자기평가를 확인하고 입력해 주세요
    </p>
    <fieldset disabled={saving} style={{ border:0, padding:0, margin:0, minWidth:0 }}>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {['이해도', '집중도'].map(label => <div key={label}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>{label}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--color-primary)' }}>
              {scores[label] ? `${scores[label]} / 5` : '미입력'}
            </span>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {[1,2,3,4,5].map(score => <button key={score} type="button"
              aria-label={`${label} ${score}점`} aria-pressed={scores[label] === score}
              onClick={() => setScores(value => ({ ...value, [label]: score }))}
              style={{ flex:1, minWidth:0, padding:'10px 0', borderRadius:10, border:0,
                fontSize:18, cursor:'pointer', background:scores[label] >= score ? '#FEE500' : 'var(--color-surface-2)' }}>
              ⭐
            </button>)}
          </div>
        </div>)}
      </div>
      <div className="manual-evaluation">
        <label>학습 과목<select value={subject} onChange={event => setSubject(event.target.value)}>
          {subjects.map(value => <option key={value}>{value}</option>)}
        </select></label>
        <label>학습일<input type="date" value={studyDate} onChange={event => setStudyDate(event.target.value)} /></label>
        <label>학습 시작 시각<input type="time" value={startTime} onChange={event => setStartTime(event.target.value)} /></label>
        <label>학습 시간 (분)<input type="number" min="1" max="1440" step="1" value={duration}
          onChange={event => setDuration(event.target.value)} /></label>
      </div>
      <button type="submit" disabled={saving || !studentId}
        style={{ width:'100%', marginTop:14, padding:12, borderRadius:10, border:0,
          background:'var(--color-primary)', color:'white', fontWeight:700, cursor:saving ? 'wait' : 'pointer' }}>
        {saving ? '저장 중...' : '자기평가 저장'}
      </button>
    </fieldset>
    {message && <p role="status" style={{ marginTop:10, fontSize:12 }}>{message}</p>}
    {error && <p role="alert" style={{ marginTop:10, fontSize:12, color:'var(--color-danger)' }}>{error}</p>}
  </form>
}
