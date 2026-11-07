import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  SUBJECTS,
} from './data/mockData'
import { activitiesAPI, analysisAPI, gradesAPI } from '@/api'
import { useAuth, isAcademy } from '@/context/AuthContext'
import useStudentRecords from '@/hooks/useStudentRecords'
import ConcentrationSummaryCard from '@/components/learning/ConcentrationSummaryCard'
import BottomSheet, { RecordLauncher } from '@/components/common/BottomSheet'
import { hourlyConcentration, localStudyDate, metaCognitionPresentation } from '@/components/learning/recordUtils'
import { evaluationSubmissionId } from '@/components/learning/evaluationSubmission'

// subjectId → 과목명 매핑 (백엔드 확인 후 보정 필요)
// 4(한국사)는 더 이상 선택할 수 없지만, 예전에 저장된 기록의 이름을 보여주기 위해 남겨 둔다.
const SUBJECT_NAME_BY_ID = {
  1: '국어',
  2: '수학',
  3: '영어',
  4: '한국사',
  5: '사회탐구',
  6: '과학탐구',
}

// 과목별 색상
const SUBJECT_BADGE_COLOR = {
  '국어': '#FF6B6B',
  '수학': '#1A56DB',
  '영어': '#00C49A',
  '사회탐구': '#9C88FF',
  '과학탐구': '#4ECDC4',
}

export default function PatternTab({ studentId: propStudentId }) {
  const { user } = useAuth()
  const effectiveId = propStudentId ?? user?.id
  const gradeKey = effectiveId
  const activityRecords = useStudentRecords(effectiveId, activitiesAPI.getActivities)
  const [searchParams, setSearchParams] = useSearchParams()
  // '오늘 공부 기록하기' 창은 주소(?sheet=record)로 열고 닫아서 뒤로 가기·새로고침에도 상태가 맞게 한다.
  const sheetOpen = searchParams.get('sheet') === 'record'
  const openSheet = () => setSearchParams({ tab: 'pattern', sheet: 'record' }, { replace: true })
  const closeSheet = useCallback(() => setSearchParams({ tab: 'pattern' }, { replace: true }), [setSearchParams])
  const hourlyData = useMemo(() => hourlyConcentration(activityRecords.data), [activityRecords.data])
  const [activitySubject, setActivitySubject] = useState('수학')
  const [duration, setDuration] = useState(60)
  const [studyDate, setStudyDate] = useState(localStudyDate)
  const [startTime, setStartTime] = useState(() => new Date().toTimeString().slice(0, 5))
  const [evaluationSaving, setEvaluationSaving] = useState(false)
  const [evaluationMessage, setEvaluationMessage] = useState('')
  const [metaError, setMetaError] = useState('')
  const savedEvaluation = useRef(null)

  const [selfEval, setSelfEval]         = useState({ 이해도:0, 집중도:0 })

  const [feedback, setFeedback]         = useState('')
  const [saved, setSaved]               = useState(false)
  const [metaResult, setMetaResult]     = useState(null)
  const [metaLoading, setMetaLoading]   = useState(false)
  const metaPresentation = metaCognitionPresentation(metaResult)

  useEffect(() => {
    setSelfEval({ 이해도:0, 집중도:0 })
    setFeedback('')
    setSaved(false)
    setMetaResult(null)
    savedEvaluation.current = null
  }, [effectiveId])

  useEffect(() => {
    setEvaluationMessage('')
    setMetaResult(null)
    setMetaError('')
  }, [activitySubject, duration, studyDate, startTime, selfEval.이해도, selfEval.집중도])

  // 강점 분석
  const [strengths, setStrengths] = useState(null)
  const [strengthsLoading, setStrengthsLoading] = useState(true)

  // 학습 패턴 (실데이터)
  const [studyPatternData, setStudyPatternData] = useState(null)

  // 교사 피드백 (실데이터)
  const feedbackList = activityRecords.data.filter(a => a.instructorFeedback).slice(0, 5)

  // 성적 데이터 (약점 계산용)
  const [gradesData, setGradesData] = useState([])

  useEffect(() => {
    if (!effectiveId) return
    setStrengthsLoading(true)
    analysisAPI.getStrengths(effectiveId)
      .then(data => setStrengths(data))
      .catch(() => setStrengths(null))
      .finally(() => setStrengthsLoading(false))
  }, [effectiveId])

  useEffect(() => {
    if (!effectiveId) return
    analysisAPI.getStudyPatternV2(effectiveId)
      .then(data => setStudyPatternData(data))
      .catch(() => setStudyPatternData(null))
  }, [effectiveId, activityRecords.data])

  useEffect(() => {
    if (!gradeKey) return
    gradesAPI.getGrades(gradeKey)
      .then(data => setGradesData(Array.isArray(data) ? data : []))
      .catch(() => setGradesData([]))
  }, [gradeKey])

  // 실데이터 기반 골든타임 / 과목별 학습시간
  const goldenHour = hourlyData.length ? hourlyData.reduce((a,b) => a.focus>b.focus ? a : b) : null
  const displayGoldenHour = goldenHour?.time || '데이터 없음'

  const displayStudyTimeData = useMemo(() => {
    if (studyPatternData?.subjectStudyMinutes && Object.keys(studyPatternData.subjectStudyMinutes).length > 0) {
      return Object.entries(studyPatternData.subjectStudyMinutes)
        .map(([subject, minutes]) => ({ subject, minutes, color: SUBJECT_BADGE_COLOR[subject] || '#1A56DB' }))
        .sort((a, b) => b.minutes - a.minutes)
    }
    return null // null이면 API 데이터 없음
  }, [studyPatternData])

  // 성적 기반 약점 과목 계산
  const weakSubjects = useMemo(() => {
    if (gradesData.length === 0) return []
    const avgBySubject = {}
    SUBJECTS.forEach(s => {
      const scores = gradesData.filter(g => g.subject === s).map(g => g.score)
      if (scores.length > 0)
        avgBySubject[s] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    })
    const sorted = Object.entries(avgBySubject).sort((a, b) => a[1] - b[1])
    return sorted.slice(0, 3).map(([subject, avg]) => ({
      unit: subject, subject, accuracy: avg, trend: '▼',
    }))
  }, [gradesData, strengths])

  const saveEvaluation = async () => {
    if (!effectiveId || !selfEval.이해도 || !selfEval.집중도 || !studyDate || !startTime
        || !Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 1440) {
      throw new Error('학습일, 학습 시간(1분 이상), 이해도와 집중도를 입력해 주세요.')
    }
    const payload = {
      studentId: effectiveId, subject: activitySubject, studyDate,
      studyStartTime: `${startTime}:00`,
      studyDurationMinutes: Number(duration), understandingScore: selfEval.이해도,
      concentrationScore: selfEval.집중도, measurementSource: 'MANUAL',
    }
    const signature = JSON.stringify(payload)
    if (savedEvaluation.current?.signature === signature) return savedEvaluation.current.activity
    const submissionId = await evaluationSubmissionId(payload)
    const activity = await activitiesAPI.postActivity({ ...payload, submissionId })
    if (!activity?.id) throw new Error('학습 기록을 저장하지 못했습니다.')
    savedEvaluation.current = { signature, activity }
    activityRecords.reload()
    return activity
  }

  const handleEvaluationSave = async () => {
    setEvaluationSaving(true)
    setEvaluationMessage('')
    try {
      await saveEvaluation()
      setEvaluationMessage('자기평가가 직접 입력 기록으로 저장되었습니다.')
    } catch (error) {
      setEvaluationMessage(error.message)
    } finally {
      setEvaluationSaving(false)
    }
  }

  const handleMetaAnalysis = async () => {
    setMetaLoading(true)
    setMetaResult(null)
    setMetaError('')
    try {
      await saveEvaluation()
      const res = await analysisAPI.getMetaCognition(effectiveId, activitySubject)
      setMetaResult(res)
    } catch (e) {
      console.error('메타인지 분석 실패:', e)
      setMetaError(e.message || '메타인지 분석을 불러오지 못했습니다.')
    } finally {
      setMetaLoading(false)
    }
  }

  const handleFeedbackSave = async () => {
    if (!feedback.trim()) {
      alert('피드백 내용을 입력해주세요')
      return
    }
    try {
      const activity = await saveEvaluation()
      await activitiesAPI.patchFeedback(activity.id, feedback)
      activityRecords.reload()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('피드백 저장 실패:', e)
      alert('저장에 실패했습니다')
    }
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #1A1A2E 0%, #0F3460 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>이번 주 분석 결과</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>학습 패턴 분석</h2>
        <div style={{ marginTop:16, background:'rgba(255,255,255,0.1)', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, border:'1px solid rgba(255,255,255,0.15)' }}>
          <span style={{ fontSize:32 }}>⚡</span>
          <div>
            <p style={{ fontSize:12, opacity:0.7 }}>골든타임 (집중력 최고조)</p>
            <p style={{ fontSize:20, fontWeight:800, marginTop:2 }}>{displayGoldenHour}</p>
            <p style={{ fontSize:11, opacity:0.65, marginTop:2 }}>이 시간대에 중요한 과목을 배치하세요</p>
          </div>
        </div>
      </div>

      {/* 집중도 요약 → 집중도 탭 */}
      <div style={{ margin:'16px 16px 0' }}>
        <ConcentrationSummaryCard records={activityRecords} onOpen={() => setSearchParams({ tab: 'focus' }, { replace: true })} />
      </div>

      {/* 과목별 학습 시간 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>⏱️ 과목별 학습 시간 (이번 주)</p>
          {displayStudyTimeData ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {displayStudyTimeData.map((d, idx) => (
                <div key={d.subject} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ width:32, height:32, borderRadius:8, flexShrink:0, background:d.color+'18', color:d.color, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>{d.subject}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, fontWeight:600 }}>{d.subject}</span>
                      <span style={{ fontSize:12, color:d.color, fontWeight:700 }}>{d.minutes}분</span>
                    </div>
                    <div style={{ height:7, background:'var(--color-surface-2)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:4, background:d.color, width:`${(d.minutes / (displayStudyTimeData[0]?.minutes || 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding:'24px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
              <p style={{ fontSize:20, marginBottom:8 }}>📚</p>
              <p>아직 학습 기록이 없어요</p>
              <p style={{ fontSize:11, marginTop:4 }}>학습 활동을 기록하면 과목별 통계가 나타납니다</p>
            </div>
          )}
        </div>
      </div>

      {/* 자기평가 + AI 메타인지 분석: '오늘 공부 기록하기' 버튼으로 여는 창 */}
      <BottomSheet open={sheetOpen} onClose={closeSheet} title="오늘 공부 기록하기" description="공부가 끝난 뒤 솔직하게 남겨 주세요">
        <div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {['이해도','집중도'].map(key => (
              <div key={key}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{key}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:'var(--color-primary)' }}>{selfEval[key]>0 ? `${selfEval[key]} / 5` : '미입력'}</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} aria-label={`${key} ${n}점`} onClick={() => setSelfEval(p => ({...p,[key]:n}))} style={{
                      flex:1, aspectRatio:'1', borderRadius:10, border:'none', cursor:'pointer',
                      fontFamily:'inherit', fontSize:18, transition:'all 0.15s',
                      background: selfEval[key]>=n ? '#FEE500' : 'var(--color-surface-2)',
                      transform: selfEval[key]===n ? 'scale(1.15)' : 'scale(1)',
                    }}>⭐</button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selfEval.이해도>0 && (
            <div style={{ marginTop:14, padding:'12px 14px', borderRadius:12, background: selfEval.이해도>=4 ? '#FFF8E0' : 'var(--color-primary-light)', border:`1px solid ${selfEval.이해도>=4 ? '#FFB800' : 'var(--color-primary)'}` }}>
              <p style={{ fontSize:12, fontWeight:700, color: selfEval.이해도>=4 ? '#8A6500' : 'var(--color-primary)' }}>
                {selfEval.이해도>=4 ? '⚠️ 자신감이 높지만 실제 성적과 비교해 보세요' : '💡 이해도가 낮은 부분은 오늘 복습 추천!'}
              </p>
            </div>
          )}

          <div className="manual-evaluation">
            <label>학습 과목<select value={activitySubject} onChange={e => setActivitySubject(e.target.value)}>{SUBJECTS.map(s => <option key={s}>{s}</option>)}</select></label>
            <label>학습일<input type="date" value={studyDate} onChange={e => setStudyDate(e.target.value)} /></label>
            <label>학습 시작 시각<input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></label>
            <label>학습 시간 (분)<input type="number" min="1" max="1440" step="1" value={duration} onChange={e => setDuration(e.target.value)} /></label>
          </div>
          <button type="button" disabled={evaluationSaving || metaLoading} onClick={handleEvaluationSave}
            style={{ width:'100%', marginTop:14, padding:12, borderRadius:10, border:'none', background:'var(--color-primary)', color:'white', fontWeight:700, cursor:'pointer' }}>
            {evaluationSaving ? '저장 중...' : '자기평가 저장'}
          </button>
          {evaluationMessage && <p role="status" style={{ marginTop:10, fontSize:12 }}>{evaluationMessage}</p>}
          {metaError && <p role="alert" style={{ marginTop:10, fontSize:12, color:'var(--color-danger)' }}>{metaError}</p>}

          {/* 현재 자기평가를 저장한 뒤 실제 분석을 조회한다. */}
          {selfEval.이해도 > 0 && selfEval.집중도 > 0 && (
            <button
              onClick={handleMetaAnalysis}
              disabled={metaLoading || evaluationSaving}
              style={{
                width:'100%', marginTop:14, padding:'11px', borderRadius:10,
                border:'none', fontFamily:'inherit', fontSize:13, fontWeight:700,
                background: metaLoading ? 'var(--color-text-muted)' : 'var(--color-primary)',
                color:'white', cursor: metaLoading ? 'not-allowed' : 'pointer',
                transition:'all 0.2s',
              }}
            >
              {metaLoading ? '🧠 메타인지 분석 중...' : '🧠 AI 메타인지 분석'}
            </button>
          )}

          {/* 메타인지 분석 결과 */}
          {metaResult && (
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{
                padding:'12px 14px', borderRadius:10,
                background: metaResult.gapLevel === 'HIGH' ? '#FFF8E0' : '#D1FAF015',
                border: `1px solid ${metaResult.gapLevel === 'HIGH' ? '#FFB80040' : '#00C49A30'}`,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                  <p style={{ fontSize:12, fontWeight:700, color: metaResult.gapLevel === 'HIGH' ? '#8A6500' : 'var(--color-success)' }}>
                    {metaPresentation.title}
                  </p>
                  {metaPresentation.hasData && <span style={{
                    fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20,
                    background: metaResult.gapLevel === 'HIGH' ? '#FFB80020' : '#00C49A20',
                    color: metaResult.gapLevel === 'HIGH' ? '#8A6500' : 'var(--color-success)',
                  }}>
                    갭 {metaResult.gapScore}점
                  </span>}
                </div>
                <p style={{ fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.5 }}>
                  {metaResult.gapSummary}
                </p>
              </div>
              <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--color-primary-light)', border:'1px solid #1A56DB20' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', marginBottom:4 }}>💡 AI 조언</p>
                <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.5 }}>{metaResult.advice}</p>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* 강사 피드백 */}
      <div style={{ margin:'12px 16px 0' }}>
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>📝 강사 피드백</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:14 }}>담당 강사가 직접 기록하는 정성적 평가</p>
          <div style={{ marginBottom:12, display:'flex', flexDirection:'column', gap:8 }}>
            {feedbackList.length > 0 ? feedbackList.map((a, i) => {
              const dateStr = a.studyDate
                ? new Date(a.studyDate).toLocaleDateString('ko-KR', { month:'numeric', day:'numeric' })
                : ''
              return (
                <div key={i} style={{ padding:'11px 13px', borderRadius:10, background:'var(--color-surface-2)', border:'1px solid var(--color-border)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--color-primary)' }}>
                      {a.instructorName || a.teacherName || '강사'}
                    </span>
                    <span style={{ fontSize:11, color:'var(--color-text-muted)' }}>{dateStr}</span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.5 }}>{a.instructorFeedback}</p>
                </div>
              )
            }) : (
              <div style={{ padding:'20px 16px', textAlign:'center', background:'var(--color-surface-2)', borderRadius:10, border:'1px dashed var(--color-border)' }}>
                <p style={{ fontSize:13, color:'var(--color-text-muted)' }}>아직 강사 피드백이 없어요</p>
              </div>
            )}
          </div>

          {isAcademy(user?.role) && (
            <>    
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                placeholder="오늘 학생의 태도 및 특이사항을 기록해 주세요..." rows={3}
                style={{ width:'100%', borderRadius:10, border:'1.5px solid var(--color-border)', background:'var(--color-surface-2)', padding:'10px 12px', fontSize:13, fontFamily:'inherit', color:'var(--color-text-primary)', outline:'none', resize:'none', boxSizing:'border-box' }} />
              <button onClick={handleFeedbackSave} style={{
                width:'100%', marginTop:10, padding:'12px', borderRadius:10, border:'none',
                background: saved ? 'var(--color-success)' : 'var(--color-primary)',
                color:'white', fontSize:14, fontWeight:700, fontFamily:'inherit', cursor:'pointer', transition:'background 0.2s',
              }}>{saved ? '✓ 저장됨' : '피드백 저장'}</button>
            </>
          )}
        </div>
      </div>

      {/* 강점/약점 영역 */}
      <div style={{ margin:'12px 16px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* 안정적인 강점 영역 - API 연동 */}
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>💪 안정적인 강점 영역</p>

          {strengthsLoading ? (
            <div style={{ padding:'24px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
              강점 분석 중...
            </div>
          ) : strengths && strengths.strongSubjectIds && strengths.strongSubjectIds.length > 0 ? (
            <>
              {/* 강점 과목 카드 */}
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                {strengths.strongSubjectIds.map(subjectId => {
                  const subjectName = strengths.strongSubjectNames?.[subjectId]
                    || SUBJECT_NAME_BY_ID[subjectId]
                    || `과목 ${subjectId}`
                  const color = SUBJECT_BADGE_COLOR[subjectName] || '#00C49A'

                  return (
                    <div key={subjectId} style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'12px 14px', borderRadius:10,
                      background:'#D1FAF015', border:'1px solid #00C49A30',
                    }}>
                      <span style={{ fontSize:24 }}>🏆</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:14, fontWeight:700 }}>{subjectName}</p>
                        <p style={{ fontSize:11, color:'var(--color-success)', marginTop:2 }}>
                          강점 과목으로 분석되었어요
                        </p>
                      </div>
                      <div style={{
                        padding:'6px 12px', borderRadius:20,
                        background:color, color:'white',
                        fontSize:11, fontWeight:700,
                      }}>강점</div>
                    </div>
                  )
                })}
              </div>

              {/* AI 요약 */}
              {strengths.strengthSummary && (
                <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--color-primary-light)', border:'1px solid #1A56DB20' }}>
                  <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', marginBottom:4 }}>💡 AI 분석</p>
                  <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.5 }}>
                    {strengths.strengthSummary}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ padding:'20px 16px', textAlign:'center', background:'var(--color-surface-2)', borderRadius:10, border:'1px dashed var(--color-border)' }}>
                <p style={{ fontSize:24, marginBottom:8 }}>🌱</p>
                <p style={{ fontSize:13, color:'var(--color-text-secondary)', fontWeight:600, marginBottom:4 }}>
                  아직 두드러진 강점 과목이 없어요
                </p>
                <p style={{ fontSize:11, color:'var(--color-text-muted)', lineHeight:1.5 }}>
                  {strengths?.strengthSummary || '꾸준한 학습으로 강점 과목을 만들어보세요'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 집중 보완 필요 영역 - 성적 기반 실데이터 */}
        <div style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', padding:16 }}>
          <p style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>🎯 집중 보완 필요 영역</p>
          {weakSubjects.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {weakSubjects.map(w => (
                <div key={w.unit} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'#FFE9E915', border:'1px solid #FF3B3B30', borderRadius:10 }}>
                  <span style={{ fontSize:18 }}>📌</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:700 }}>{w.unit}</p>
                    <p style={{ fontSize:11, color:'var(--color-danger)', marginTop:2 }}>평균 {w.accuracy}점 {w.trend}</p>
                  </div>
                  <div style={{ width:42, height:42, borderRadius:10, background:'var(--color-danger)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:12, fontWeight:800 }}>{w.accuracy}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding:'20px 16px', textAlign:'center', background:'var(--color-surface-2)', borderRadius:10, border:'1px dashed var(--color-border)' }}>
              <p style={{ fontSize:13, color:'var(--color-text-muted)' }}>성적 데이터가 쌓이면 약점 과목을 분석해드릴게요</p>
            </div>
          )}
        </div>

      </div>

      <RecordLauncher onClick={openSheet} />
    </div>
  )
}
