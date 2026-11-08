import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSavedReports, groupSavedReports, reportDate } from '../src/utils/savedReports.js'

test('저장된 과목 필드로 분류하고 같은 시각은 ID 내림차순, 날짜 없음은 마지막이다', () => {
  const rows = normalizeSavedReports([
    { id: 1, subject: '수학', createdAt: null },
    { id: 2, subject: '수학', createdAt: '2026-11-08T10:00:00' },
    { id: 3, subject: '수학', createdAt: '2026-11-08T10:00:00' },
    { id: 4, subject: '영어', createdAt: '2026-11-08T09:00:00' },
  ])
  assert.deepEqual(rows.map(row => row.id), [3, 2, 4, 1])
  assert.deepEqual(groupSavedReports(rows).math.map(row => row.id), [3, 2, 1])
  assert.equal(groupSavedReports(rows).english[0]._subjectLabel, '영어')
  assert.equal(reportDate(null), '생성일 미상')
  assert.equal(reportDate('2026-11-08T10:00:00'), '2026-11-08 10:00')
})

test('통합·탐구 과목과 제목을 구분하고 없는 과목을 제목으로 추측하지 않는다', () => {
  const groups = groupSavedReports(normalizeSavedReports([
    { id: 1, subject: '통합' }, { id: 2, subject: '사회탐구' }, { id: 3, subject: '과학탐구' },
    { id: 4, title: '수학 메타인지 분석 리포트', subject: null }, { id: 5, subject: '기타 과목' },
  ]))
  assert.equal(groups.premium[0].id, 1)
  assert.equal(groups.social[0].id, 2)
  assert.equal(groups.science[0].id, 3)
  assert.deepEqual(groups.unclassified.map(row => row.id), [5, 4])
  assert.equal(groups.unclassified[1]._subjectLabel, '과목 미분류')
})

test('본문과 null 필드를 보존하며 입력 배열을 바꾸지 않는다', () => {
  const input = [{ id: 1, title: null, subject: null, careerAnalysis: '한글🙂\n<태그> & 수식 x²', learningGuide: null, createdAt: null }]
  const before = JSON.stringify(input)
  const [row] = normalizeSavedReports(input)
  assert.equal(row.careerAnalysis, input[0].careerAnalysis)
  assert.equal(row.learningGuide, null)
  assert.equal(JSON.stringify(input), before)
  assert.deepEqual(normalizeSavedReports([]), [])
})

test('잘못된 응답이나 중복·안전하지 않은 ID는 정상 이력으로 표시하지 않는다', () => {
  for (const input of [null, {}, [null], [{ id: 0 }], [{ id: 1.5 }], [{ id: Number.MAX_SAFE_INTEGER + 1 }],
    [{ id: 1 }, { id: 1 }], [{ id: 1, careerAnalysis: {} }]]) {
    assert.throws(() => normalizeSavedReports(input), /응답 형식/)
  }
})
