import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePostureRecords } from '../src/api/postureValidation.js'

const record = { id: 1, studentId: 2, subject: '수학', submissionId: 'pose-test-1', modelName: 'yolov8s_pose_h8',
  startedAt: '2026-11-11T01:00:00Z', createdAt: '2026-11-11T01:01:00Z', durationSeconds: 1,
  inputSource: 'VIDEO', measurementSource: 'AI_HAT', totalSamples: 10, classifiedSamples: 8,
  uprightSamples: 4, slouchedSamples: 2, headDownSamples: 1, tiltedSamples: 1, unknownSamples: 1,
  noPersonSamples: 1, multiplePeopleSamples: 0, uprightRatio: 0.5, slouchedRatio: 0.25, headDownRatio: 0.125, tiltedRatio: 0.125 }

test('유효한 자세 결과와 빈 목록을 보존한다', () => {
  const rows = [record]
  assert.equal(validatePostureRecords(rows, 2), rows)
  assert.deepEqual(validatePostureRecords([], 2), [])
})

test('형식·날짜·출처·학생·중복 ID가 잘못되면 결과 전체를 거부한다', () => {
  const changes = [{ subject: {} }, { subject: '\u200b\u00a0' }, { subject: '수'.repeat(256) }, { id: null },
    { studentId: 3 }, { startedAt: '2026-02-31T01:00:00Z' }, { createdAt: '2026-11-11' },
    { startedAt: '2026-11-11T24:00:00Z' }, { startedAt: 123 }, { modelName: 123 }, { submissionId: null },
    { measurementSource: 'MANUAL' }, { inputSource: 'other' }, { durationSeconds: 0 }, { durationSeconds: 86401 }]
  for (const change of changes) assert.throws(() => validatePostureRecords([{ ...record, ...change }], 2), /응답/)
  for (const rows of [null, {}, [null], [record, record], Array.from({ length: 101 }, (_, i) => ({ ...record, id: i + 1 }))]) {
    assert.throws(() => validatePostureRecords(rows, 2), /응답/)
  }
})

test('합계와 분모·비율이 불일치하거나 숫자가 아니면 잘못된 비율을 표시하지 않는다', () => {
  const changes = [{ totalSamples: 11 }, { uprightSamples: -1 }, { classifiedSamples: 10 }, { uprightRatio: null },
    { uprightRatio: NaN }, { uprightRatio: Infinity }, { uprightRatio: '0.5' }, { uprightRatio: 1 }, { tiltedSamples: true }]
  for (const change of changes) assert.throws(() => validatePostureRecords([{ ...record, ...change }], 2), /응답/)
  const unknown = { ...record, uprightSamples: 0, slouchedSamples: 0, headDownSamples: 0, tiltedSamples: 0,
    classifiedSamples: 0, unknownSamples: 10, noPersonSamples: 0, uprightRatio: null, slouchedRatio: null,
    headDownRatio: null, tiltedRatio: null }
  assert.equal(validatePostureRecords([unknown], 2)[0], unknown)
  assert.throws(() => validatePostureRecords([{ ...unknown, uprightRatio: 0 }], 2), /응답/)
})

test('24시간·86400표본·255자 과목·100개 결과의 경계값을 처리한다', () => {
  const maximum = { ...record, subject: '수'.repeat(255), durationSeconds: 86400, totalSamples: 86400,
    classifiedSamples: 86400, uprightSamples: 86400, slouchedSamples: 0, headDownSamples: 0, tiltedSamples: 0,
    unknownSamples: 0, noPersonSamples: 0, multiplePeopleSamples: 0, uprightRatio: 1, slouchedRatio: 0, headDownRatio: 0, tiltedRatio: 0 }
  const rows = Array.from({ length: 100 }, (_, index) => ({ ...maximum, id: index + 1 }))
  assert.equal(validatePostureRecords(rows, 2).length, 100)
})
