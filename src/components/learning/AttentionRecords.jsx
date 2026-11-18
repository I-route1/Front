import { useCallback } from 'react'
import { activitiesAPI } from '@/api/activities'
import useStudentRecords from '@/hooks/useStudentRecords'
import { cameraActivityMetrics, formatElapsedSeconds, formatRatio } from './recordUtils'
import { RecordError } from './LearningResults'
import './records.css'

export function CameraPostureDetails({ metrics }) {
  return <>
    {metrics.uprightRatio !== null && <>
      <span>바른 자세 {formatRatio(metrics.uprightRatio)}</span>
      <span>자세 표본 {metrics.postureSampleCount}개</span>
    </>}
    {metrics.forwardHeadCount !== null && <span>거북목 주의 {metrics.forwardHeadCount}회</span>}
  </>
}

export function MeasurementDetails({ activity, showScores = true }) {
  const camera = activity.measurementSource === 'CAMERA'
  return <div className="measurement-details">
    <span className="record-source">{camera ? '카메라 측정' : '직접 입력'}</span>
    {showScores && <span>집중도 {activity.concentrationScore} / 5</span>}
    {showScores && activity.understandingScore != null && <span>이해도 {activity.understandingScore} / 5</span>}
    {camera && <>
      <span>집중 {formatRatio(activity.focusedRatio)}</span>
      <span>졸음 {formatRatio(activity.drowsyRatio)}</span>
      <CameraPostureDetails metrics={cameraActivityMetrics(activity)} />
    </>}
  </div>
}

export function ActivityRecordCard({ activity }) {
  const duration = formatElapsedSeconds(cameraActivityMetrics(activity).elapsedSeconds) ?? `${activity.studyDurationMinutes}분`
  return <article className="record-item">
    <div className="record-heading">
      <strong>{activity.subject}</strong>
      <small>{activity.studyDate} {activity.studyStartTime?.slice(0, 5)} · {duration}</small>
    </div>
    <MeasurementDetails activity={activity} />
  </article>
}

function positiveId(value) {
  const id = Number(value)
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(id) ? id : null
}

export function ScopedActivityRecord({ studentId, activityId, onBack, backLabel }) {
  const student = positiveId(studentId)
  const id = positiveId(activityId)
  const load = useCallback(async (selectedStudentId) => {
    try {
      const record = await activitiesAPI.getActivity(selectedStudentId, id)
      if (record === null) return []
      if (record?.id !== id) throw new Error('학습 기록 응답을 확인할 수 없습니다.')
      return [record]
    } catch (error) {
      if (error.status === 404) return []
      throw error
    }
  }, [id])
  const records = useStudentRecords(id === null ? null : student, load)
  const record = records.data[0]

  return <section className="learning-records record-card" aria-label="집중도 기록 상세">
    <div className="record-heading">
      <h3>집중도 기록 상세</h3>
      <button type="button" onClick={onBack}>{backLabel}</button>
    </div>
    {id === null ? <p className="record-empty">학습 기록 번호를 확인해 주세요.</p>
      : student === null ? <p className="record-empty">조회할 학생을 확인해 주세요.</p>
      : records.loading ? <p role="status">학습 기록을 불러오는 중...</p>
      : records.error ? <RecordError message={records.error} retry={records.reload} />
      : record ? <ActivityRecordCard activity={record} />
      : <p className="record-empty">선택한 학생의 해당 학습 기록을 찾을 수 없어요.</p>}
  </section>
}

export default function AttentionRecords({ records }) {
  const hasCamera = records.data.some(row => row.measurementSource === 'CAMERA')
  return <section className="learning-records record-card" aria-label="집중도 측정 기록">
    <div className="record-heading"><h3>📷 집중도 측정 기록</h3><button type="button" onClick={records.reload}>측정 기록 새로고침</button></div>
    {records.loading ? <p role="status">학습 기록을 불러오는 중...</p>
      : records.error ? <RecordError message={records.error} retry={records.reload} /> : <>
        {!hasCamera && <p className="record-empty">아직 카메라 측정 기록이 없어요. 측정 결과가 전송되면 집중·졸음 비율이 표시됩니다.</p>}
        {records.data.length === 0 && <p className="record-hint">자기평가를 저장하면 직접 입력한 학습 기록을 확인할 수 있어요.</p>}
        <div className="record-scroll">{records.data.map(row => <ActivityRecordCard key={row.id} activity={row} />)}</div>
      </>}
  </section>
}
