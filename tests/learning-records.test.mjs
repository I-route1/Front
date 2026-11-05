import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRatio, wrongTypeCounts, hourlyConcentration, localStudyDate, metaCognitionPresentation } from '../src/components/learning/recordUtils.js'
import { evaluationSubmissionId, manualEvaluationPayload } from '../src/components/learning/evaluationSubmission.js'

test('학원 자기평가는 실제 학생 ID와 날짜·시각·별점·분 단위를 검증하고 재시도 키를 유지한다', async () => {
  const input = { studentId: 14, subject: '영어', studyDate: '2026-11-05', startTime: '00:00', duration: '1440', understanding: 1, concentration: 5 }
  const payload = manualEvaluationPayload(input)
  assert.equal(payload.studentId, 14)
  assert.equal(payload.studyStartTime, '00:00:00')
  assert.equal(payload.studyDurationMinutes, 1440)
  assert.equal(payload.measurementSource, 'MANUAL')
  assert.equal(await evaluationSubmissionId(payload), await evaluationSubmissionId(manualEvaluationPayload(input)))
  assert.notEqual(await evaluationSubmissionId(payload), await evaluationSubmissionId(manualEvaluationPayload({ ...input, studentId: 15 })))
  for (const invalid of [
    { studentId: 0 }, { studentId: 'S-001' }, { subject: '' }, { studyDate: '2026-02-30' },
    { studyDate: '' }, { startTime: '24:00' }, { startTime: '' },
    { duration: 0 }, { duration: -1 }, { duration: 1.5 }, { duration: 1441 }, { duration: '' },
    { understanding: 0 }, { understanding: 6 }, { concentration: 1.5 }, { concentration: 6 },
  ]) assert.throws(() => manualEvaluationPayload({ ...input, ...invalid }), /입력해 주세요/)
})

test('저장 가능한 연도·윤년·자정·마지막 분 경계를 확인한다', () => {
  const input = { studentId: 14, subject: '영어', studyDate: '1000-01-01', startTime: '00:00', duration: 1, understanding: 1, concentration: 5 }
  for (const studyDate of ['1000-01-01', '2000-02-29', '2024-02-29', '9999-12-31']) {
    assert.equal(manualEvaluationPayload({ ...input, studyDate, startTime: '23:59' }).studyStartTime, '23:59:00')
  }
  for (const studyDate of ['0001-01-01', '0999-12-31', '10000-01-01', '1900-02-29', '2026-02-29']) {
    assert.throws(() => manualEvaluationPayload({ ...input, studyDate }))
  }
})

test('메타인지 데이터 부족·과소평가·중간 차이를 적정이나 과대평가로 표시하지 않는다', () => {
  assert.equal(metaCognitionPresentation({ gapLevel: '데이터 없음', gapScore: 0 }).hasData, false)
  assert.match(metaCognitionPresentation(null).title, /부족/)
  assert.match(metaCognitionPresentation({ gapLevel: 'HIGH', gapScore: 30, scaledUnderstandingScore: 40, avgActualScore: 70 }).title, /과소/)
  assert.match(metaCognitionPresentation({ gapLevel: 'HIGH', gapScore: 30, scaledUnderstandingScore: 100, avgActualScore: 70 }).title, /과대/)
  assert.match(metaCognitionPresentation({ gapLevel: 'MEDIUM', gapScore: 15 }).title, /차이/)
  assert.match(metaCognitionPresentation({ gapLevel: 'LOW', gapScore: 5 }).title, /적정/)
})

test('집중도 비율의 0, 1, 미측정 값을 구분한다', () => {
  assert.equal(formatRatio(0), '0%')
  assert.equal(formatRatio(1), '100%')
  assert.equal(formatRatio(0.625), '62.5%')
  for (const value of [null, undefined, NaN, Infinity, -0.1, 1.1]) assert.equal(formatRatio(value), '미측정')
})

test('유형별 반복 오답을 누적하고 미분류 오답도 포함한다', () => {
  assert.deepEqual(wrongTypeCounts([]), [])
  const counts = wrongTypeCounts([{ errorType: 'CONCEPT_GAP', failCount: 2 },
    { errorType: 'CONCEPT_GAP', failCount: 3 }, { errorType: null, failCount: 1 }])
  assert.equal(counts[0].count, 5)
  assert.equal(counts[1].label, '미분류')
})

test('유효한 집중도 별점만 시간별로 평균내며 예시값은 만들지 않는다', () => {
  assert.deepEqual(hourlyConcentration([]), [])
  const result = hourlyConcentration([
    { studyStartTime: '10:00:00', concentrationScore: 5 },
    { studyStartTime: '10:30:00', concentrationScore: 3 },
    { studyStartTime: '08:00:00', concentrationScore: 1 },
    { studyStartTime: '11:00:00' }, { concentrationScore: 4 },
    { studyStartTime: '12:00:00', concentrationScore: 100 },
  ])
  assert.deepEqual(result, [{ time: '08시', focus: 20 }, { time: '10시', focus: 80 }])
})

test('학습일은 UTC 변환 없이 사용자의 달력 날짜를 사용한다', () => {
  assert.equal(localStudyDate(new Date(2026, 10, 4, 0, 5)), '2026-11-04')
})
