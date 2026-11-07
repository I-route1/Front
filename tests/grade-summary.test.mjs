import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeGrades, summarizeGrades, gradeHeadline, gradeTrend, subjectParticle } from '../src/utils/gradeSummary.js'

// 운영 테스트학생과 같은 모양: 최근 시험(9월 모의고사)은 수학만 봤다
const rows = [
  { subject: '수학', score: 66, examDate: '2025-09-11', examType: '9월모의고사' },
  { subject: '수학', score: 67, examDate: '2025-07-08', examType: '기말고사' },
  { subject: '영어', score: 72, examDate: '2025-07-08', examType: '기말고사' },
  { subject: '국어', score: 70, examDate: '2025-07-08', examType: '기말고사' },
  { subject: '수학', score: 65, examDate: '2025-05-10', examType: '중간고사' },
  { subject: '영어', score: 70, examDate: '2025-05-10', examType: '중간고사' },
  { subject: '국어', score: 68, examDate: '2025-05-10', examType: '중간고사' },
]

test('안 본 과목은 0점이 아니라 기록 없음으로 다룬다', () => {
  const s = summarizeGrades(normalizeGrades(rows))
  assert.deepEqual(s.subjects, ['국어', '수학', '영어'])
  assert.equal(s.current.사회, null)
  assert.equal(s.current.국어, 70) // 국어는 9월에 안 봤으므로 7월 점수
  assert.equal(s.current.수학, 66)
  assert.equal(s.average, 69) // (70 + 66 + 72) / 3
  assert.equal(s.best, '영어')
  assert.equal(s.weakest, '수학')
  assert.deepEqual(s.latestExam, { date: '2025-09-11', examType: '9월모의고사', subjects: ['수학'] })
  const sept = s.trend.find(t => t.date === '25.09')
  assert.equal(sept.국어, null)
  assert.equal(sept.수학, 66)
})

test('한눈에 보기 문장은 과목마다 직전 점수와 비교한다', () => {
  const s = summarizeGrades(normalizeGrades(rows))
  assert.deepEqual(s.changes.map(c => [c.subject, c.diff]), [['국어', 2], ['영어', 2], ['수학', -1]])
  assert.deepEqual(gradeHeadline(s), ['국어가 지난 시험보다 2점 올랐어요.', '수학이 1점 내려갔어요.'])
})

test('성적이 없거나 한 번뿐이면 지어내지 않는다', () => {
  const empty = summarizeGrades(normalizeGrades([]))
  assert.equal(empty.average, null)
  assert.equal(empty.best, null)
  assert.deepEqual(gradeHeadline(empty), [])
  const once = summarizeGrades(normalizeGrades([{ subject: '수학', score: 89, examDate: '2026-05-20', examType: '모의고사' }]))
  assert.equal(once.weakest, null)
  assert.deepEqual(gradeHeadline(once), ['첫 성적이 등록됐어요. 다음 시험부터 변화를 알려 드릴게요.'])
  const same = summarizeGrades(normalizeGrades([
    { subject: '수학', score: 80, examDate: '2026-05-01' }, { subject: '수학', score: 80, examDate: '2026-06-01' }]))
  assert.deepEqual(gradeHeadline(same), ['지난 시험과 같은 점수를 유지했어요.'])
})

test('잘못된 값은 버리고 탐구 과목명을 맞춘다', () => {
  const list = normalizeGrades([
    { subject: '사회탐구', score: 90, examDate: '2026-05-01T00:00:00' },
    { subject: '한국사', score: 90, examDate: '2026-05-01' },
    { subject: '수학', score: 120, examDate: '2026-05-01' },
    { subject: '수학', score: '80', examDate: '' },
    null,
  ])
  assert.deepEqual(list, [{ subject: '사회', score: 90, date: '2026-05-01', examType: '' }])
  assert.equal(gradeTrend(list)[0].date, '26.05')
})

test('과목 이름 뒤 조사', () => {
  assert.equal(subjectParticle('수학'), '이')
  assert.equal(subjectParticle('국어'), '가')
  assert.equal(subjectParticle('과학'), '이')
  assert.equal(subjectParticle('사회'), '가')
})
