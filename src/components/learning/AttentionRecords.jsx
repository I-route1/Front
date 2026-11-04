import { formatRatio } from './recordUtils'
import { RecordError } from './LearningResults'
import './records.css'

export function MeasurementDetails({ activity }) {
  const camera = activity.measurementSource === 'CAMERA'
  return <div className="measurement-details">
    <span className="record-source">{camera ? '카메라 측정' : '직접 입력'}</span>
    <span>집중도 {activity.concentrationScore} / 5</span>
    {camera && <><span>집중 {formatRatio(activity.focusedRatio)}</span><span>졸음 {formatRatio(activity.drowsyRatio)}</span></>}
  </div>
}

export default function AttentionRecords({ records }) {
  const hasCamera = records.data.some(row => row.measurementSource === 'CAMERA')
  return <section className="learning-records record-card" aria-label="집중도 측정 기록">
    <div className="record-heading"><h3>📷 집중도 측정 기록</h3><button type="button" onClick={records.reload}>측정 기록 새로고침</button></div>
    {records.loading ? <p role="status">학습 기록을 불러오는 중...</p>
      : records.error ? <RecordError message={records.error} retry={records.reload} /> : <>
        {!hasCamera && <p className="record-empty">아직 카메라 측정 기록이 없어요. 측정 결과가 전송되면 집중·졸음 비율이 표시됩니다.</p>}
        {records.data.length === 0 && <p className="record-hint">자기평가를 저장하면 직접 입력한 학습 기록을 확인할 수 있어요.</p>}
        <div className="record-scroll">{records.data.map(row => <article className="record-item" key={row.id}>
          <div className="record-heading"><strong>{row.subject}</strong><small>{row.studyDate} {row.studyStartTime?.slice(0, 5)} · {row.studyDurationMinutes}분</small></div>
          <MeasurementDetails activity={row} />
        </article>)}</div>
      </>}
  </section>
}
