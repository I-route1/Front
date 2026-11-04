import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRatio, wrongTypeCounts, hourlyConcentration, localStudyDate } from '../src/components/learning/recordUtils.js'

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
