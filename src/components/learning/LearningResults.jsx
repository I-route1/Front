import { useState } from 'react'
import { wrongAnswerAPI, ocrResultsAPI } from '@/api'
import useStudentRecords from '@/hooks/useStudentRecords'
import { errorTypeLabel, wrongTypeCounts } from './recordUtils'
import './records.css'

export default function LearningResults({ studentId, showSummary = false }) {
  const wrong = useStudentRecords(studentId, wrongAnswerAPI.getAll)
  const ocr = useStudentRecords(studentId, ocrResultsAPI.getAll)
  const [subject, setSubject] = useState('')
  const [wrongLimit, setWrongLimit] = useState(50)
  const [ocrLimit, setOcrLimit] = useState(20)
  const subjects = [...new Set([...wrong.data, ...ocr.data].map(row => row.subject).filter(Boolean))]
  const wrongRows = wrong.data.filter(row => !subject || row.subject === subject)
  const ocrRows = ocr.data.filter(row => !subject || row.subject === subject)
  const counts = wrongTypeCounts(wrongRows)
  return (
    <section className="learning-records" aria-label="오답 및 OCR 채점 기록">
      {showSummary && !wrong.loading && !ocr.loading && !wrong.error && !ocr.error &&
        <RecordsSummary wrongRows={wrongRows} ocrRows={ocrRows} counts={counts} subject={subject} />}
      <div className="record-toolbar">
        <label>과목 <select aria-label="기록 과목" value={subject} onChange={e => setSubject(e.target.value)}>
          <option value="">전체 과목</option>
          {subjects.map(name => <option key={name}>{name}</option>)}
        </select></label>
        <button type="button" onClick={() => { wrong.reload(); ocr.reload() }}>기록 새로고침</button>
      </div>
      <div className="record-card" aria-label="전체 오답 목록">
        <h3>❌ 주요 오답 유형 · 전체 오답</h3>
        {wrong.loading ? <p role="status">오답을 불러오는 중...</p>
          : wrong.error ? <RecordError message={wrong.error} retry={wrong.reload} />
          : wrongRows.length === 0 ? <p className="record-empty">아직 저장된 오답이 없어요.</p> : <>
            <div className="wrong-summary">
              {counts.map(item => <div key={item.type}>
                <span>{item.label}</span>
                <span className="wrong-bar"><span style={{ width: `${item.count / counts[0].count * 100}%`, background: item.color }} /></span>
                <strong>{item.count}회</strong>
              </div>)}
            </div>
            <p className="record-hint">문항 {wrongRows.length}개 · 유형별 횟수는 반복 오답을 포함합니다.</p>
            <div className="record-scroll">
              {wrongRows.slice(0, wrongLimit).map(row => <article className="record-item" key={row.id}>
                <div className="record-heading"><strong>{row.subject} · {row.questionId}</strong><span>{row.failCount}회 오답</span></div>
                <p>{row.conceptTag} · {errorTypeLabel(row.errorType)}</p>
                <small>{row.createdAt?.replace('T', ' ').slice(0, 16)}</small>
              </article>)}
            </div>
            {wrongRows.length > wrongLimit && <button onClick={() => setWrongLimit(n => n + 50)}>오답 더 보기</button>}
          </>}
      </div>
      <div className="record-card" aria-label="OCR 채점 결과">
        <h3>📝 OCR 채점 결과</h3>
        {ocr.loading ? <p role="status">채점 결과를 불러오는 중...</p>
          : ocr.error ? <RecordError message={ocr.error} retry={ocr.reload} />
          : ocrRows.length === 0 ? <p className="record-empty">아직 저장된 OCR 채점 결과가 없어요. 채점 결과가 전송되면 여기에 표시됩니다.</p>
          : <>{ocrRows.slice(0, ocrLimit).map(row => <OcrResult key={row.id} result={row} />)}
            {ocrRows.length > ocrLimit && <button onClick={() => setOcrLimit(n => n + 20)}>채점 결과 더 보기</button>}</>}
      </div>
    </section>
  )
}

// 오답·채점 '한눈에 보기': 최근 채점 결과와 가장 많은 오답 유형 (선택한 과목 기준)
function RecordsSummary({ wrongRows, ocrRows, counts, subject }) {
  if (wrongRows.length === 0 && ocrRows.length === 0) return null
  const latest = ocrRows.reduce((a, r) => (!a || String(r.gradedAt) > String(a.gradedAt) ? r : a), null)
  const repeated = wrongRows.filter(r => r.failCount >= 2).length
  const top = counts[0]
  const lines = []
  if (latest) lines.push(`최근 ${latest.subject} 채점에서 ${latest.totalQuestions}문항 중 ${latest.correctCount}문항을 맞혔어요.`)
  if (top && top.type !== 'UNKNOWN') lines.push(`'${top.label}' 유형의 오답이 가장 많아요.`)
  const date = latest?.gradedAt ? new Date(latest.gradedAt).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : null
  return (
    <div className="records-summary" aria-label="오답·채점 한눈에 보기">
      <p className="records-summary__label">{subject || '전체 과목'}{date ? ` · 최근 채점 ${date}` : ''}</p>
      <p className="records-summary__headline">{lines.map(line => <span key={line}>{line}</span>)}</p>
      <div className="records-summary__stats">
        <div><span>최근 채점</span><strong>{latest ? `${latest.correctCount} / ${latest.totalQuestions}` : '-'}</strong></div>
        <div><span>오답 문항</span><strong>{wrongRows.length}개</strong></div>
        <div><span>반복 오답</span><strong>{repeated}개</strong></div>
      </div>
    </div>
  )
}

export function RecordError({ message, retry }) {
  return <div className="record-error" role="alert"><p>{message}</p><button type="button" onClick={retry}>다시 불러오기</button></div>
}

function OcrResult({ result }) {
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(50)
  const questions = result.questions || []
  return <details className="record-item" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>
      <strong>{result.subject} · {result.correctCount} / {result.totalQuestions}문항 정답</strong>
      <span>{result.gradedAt ? new Date(result.gradedAt).toLocaleString('ko-KR') : ''}</span>
    </summary>
    {open && <div className="ocr-questions">
      {questions.slice(0, limit).map((question, index) => <div key={question.questionId} className="ocr-question">
        {/* 문항 ID 대신 워크시트 순서대로 번호를 보여주고, ID는 작게 남겨 둔다 */}
        <div className="record-heading"><strong>{index + 1}번 <small className="record-question-id">{question.questionId}</small></strong><span className={question.correct ? 'record-correct' : 'record-incorrect'}>{question.correct ? '정답' : '오답'}</span></div>
        <dl><dt>인식된 글자</dt><dd>{question.recognizedText === '' ? '인식된 글자 없음' : question.recognizedText}</dd>
          <dt>정답</dt><dd>{question.expectedAnswer}</dd></dl>
        <p>{question.conceptTag} · 유사도 {Math.round(question.similarity * 100)}%</p>
      </div>)}
      {questions.length > limit && <button onClick={() => setLimit(n => n + 50)}>문항 더 보기 ({Math.min(limit, questions.length)}/{questions.length})</button>}
    </div>}
  </details>
}
