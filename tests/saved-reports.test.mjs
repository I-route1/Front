import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSavedReports, groupSavedReports, reportDate, reportKeyLine, summarizeSavedReports } from '../src/utils/savedReports.js'

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

test('한눈에 보기: 가장 최근 리포트에서 학업 수준·학습 강도·실천 문장을 뽑는다', () => {
  const rows = normalizeSavedReports([
    { id: 1, subject: '국어', createdAt: '2026-11-01T09:00:00', careerAnalysis: '● 국어 학업 수준: 상위권', learningGuide: null },
    { id: 2, subject: '수학', createdAt: '2026-11-08T10:00:00',
      careerAnalysis: '[수학 사고력 및 오답 패턴 분석]\n\n● 현재 학업 수준: 중위권 (국어 백분위 50%)\n● 학습 강도: 학습량 보강 필요 (일 1.0시간)\n',
      learningGuide: '[수학 맞춤 학습 전략]\n\n1단계 — 오답 유형 분류: 계산 실수 / 개념 미이해\n2단계 — 취약 개념 집중' },
    { id: 3, subject: '수학', createdAt: '2026-11-02T10:00:00', careerAnalysis: '', learningGuide: '' },
  ])
  const s = summarizeSavedReports(rows, Date.parse('2026-11-10T10:00:00'))
  assert.equal(s.latest.id, 2)
  assert.equal(s.level, '중위권')
  assert.equal(s.intensity, '학습량 보강 필요 (일 1.0시간)')
  assert.equal(s.keyLine, '1단계 — 오답 유형 분류: 계산 실수 / 개념 미이해')
  assert.deepEqual(s.subjects.map(x => [x.label, x.row.id, x.count]), [['수학', 2, 2], ['국어', 1, 1]])
  assert.deepEqual(s.missing, ['영어', '과학', '사회'])
  assert.equal(s.days, 2)
  assert.equal(s.stale, false)
})

test('한눈에 보기: 소제목·구분선은 건너뛰고, 형식이 다르면 null, 오래되면 stale', () => {
  assert.equal(reportKeyLine({ learningGuide: '[프리미엄]\n\n━━ 로드맵 ━━\n주간 학습 계획:\n  - 월: 수학 오답 정리' }), '월: 수학 오답 정리')
  assert.equal(reportKeyLine({ learningGuide: '', careerAnalysis: '[제목]\n자유 형식 분석' }), '자유 형식 분석')
  assert.equal(reportKeyLine({}), null)
  const s = summarizeSavedReports(normalizeSavedReports([{ id: 5, subject: null, careerAnalysis: '자유 형식', createdAt: '2026-06-05T01:58:52.25684' }]),
    Date.parse('2026-11-14T00:00:00'))
  assert.equal(s.level, null)
  assert.equal(s.intensity, null)
  assert.deepEqual(s.subjects, [])
  assert.equal(s.stale, true)
  assert.equal(summarizeSavedReports([]), null)
  assert.equal(summarizeSavedReports(normalizeSavedReports([{ id: 6, subject: '영어', createdAt: null }])).days, null)
})
