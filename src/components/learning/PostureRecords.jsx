import { useEffect, useState } from 'react'
import { postureAPI } from '@/api/posture'
import useStudentRecords from '@/hooks/useStudentRecords'
import { RecordError } from './LearningResults'
import { formatRatio } from './recordUtils'
import './records.css'

const sources = { CAMERA: '카메라', VIDEO: '영상 파일', IMAGE: '사진 파일' }

export default function PostureRecords({ studentId }) {
  const records = useStudentRecords(studentId, postureAPI.getAll)
  const [subject, setSubject] = useState('')
  useEffect(() => setSubject(''), [studentId])
  const subjects = [...new Set(records.data.map(row => row.subject))]
  const rows = records.data.filter(row => !subject || row.subject === subject)
  return <section className="learning-records record-card" aria-label="자세 분석 기록">
    <div className="record-heading"><h3>🧍 자세 분석 기록</h3>
      <button type="button" onClick={records.reload}>자세 기록 새로고침</button></div>
    {records.loading ? <p role="status">자세 기록을 불러오는 중...</p>
      : records.error ? <RecordError message={records.error} retry={records.reload} />
        : records.data.length === 0 ? <p className="record-empty">아직 자세 분석 기록이 없어요. 측정 결과가 전송되면 여기에 표시됩니다.</p>
          : <>
            <label>과목 <select aria-label="자세 기록 과목" value={subject} onChange={event => setSubject(event.target.value)}>
              <option value="">전체 과목</option>{subjects.map(name => <option key={name}>{name}</option>)}
            </select></label>
            <div className="record-scroll">{rows.map(row => <article className="record-item" key={row.id}>
              <div className="record-heading"><strong>{row.subject}</strong>
                <small>{new Date(row.startedAt).toLocaleString('ko-KR')} · 분석 {row.durationSeconds}초</small></div>
              <div className="measurement-details"><span className="record-source">AI HAT · {sources[row.inputSource] || '출처 확인 필요'}</span>
                <span>판정 {row.classifiedSamples} / 전체 {row.totalSamples}표본</span></div>
              {row.classifiedSamples > 0 ? <div className="measurement-details">
                <span>바른 자세 {formatRatio(row.uprightRatio)}</span><span>구부정함 {formatRatio(row.slouchedRatio)}</span>
                <span>고개 숙임 {formatRatio(row.headDownRatio)}</span><span>기울어짐 {formatRatio(row.tiltedRatio)}</span>
              </div> : <p className="record-hint">판정 가능한 자세 표본이 없어요.</p>}
              <p className="record-hint">사람 미검출 {row.noPersonSamples} · 여러 명 검출 {row.multiplePeopleSamples} · 판단불가 {row.unknownSamples}</p>
            </article>)}</div>
            <p className="record-hint">최근 100회까지 표시합니다. 자세 비율은 판정 가능한 표본을 기준으로 집계합니다.</p>
          </>}
  </section>
}
