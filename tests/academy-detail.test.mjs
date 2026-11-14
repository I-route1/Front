import test from 'node:test'
import assert from 'node:assert/strict'
import { subjectReportFacts } from '../src/utils/gradeSummary.js'
import { normalizeRoadmap, dateAfterWeeks } from '../src/utils/roadmap.js'
import { mapLimited } from '../src/utils/mapLimited.js'

test('과목 종합 분석: 평균 0.0은 없음으로, null 개념 문장은 빼고 오류 유형만 남긴다', () => {
  const f = subjectReportFacts({ averageScore: 64.7, weakPointSummary: "현재 중간 시험에서 'null' 개념의 오답률이 높아 취약 단원으로 식별되었습니다. 오류 유형: 계산 실수 1건." }, [70, 90])
  assert.deepEqual(f, { latest: 90, average: 64.7, gap: 25.3, change: 20, weak: '오류 유형: 계산 실수 1건.' })
  const g = subjectReportFacts({ averageScore: 0, weakPointSummary: "현재 중간 시험에서 'null' 개념의 오답률이 높아 취약 단원으로 식별되었습니다." }, [99])
  assert.deepEqual(g, { latest: 99, average: null, gap: null, change: null, weak: '' })
  assert.equal(subjectReportFacts({ weakPointSummary: "현재 기말 시험에서 '비문학' 개념의 오답률이 높아요." }, [1]).weak, "현재 기말 시험에서 '비문학' 개념의 오답률이 높아요.")
})

test('로드맵: 주차 문자열을 나누고 비어 있으면 null', () => {
  const r = normalizeRoadmap({ targetKeyword: '영어', targetDate: '2026-12-12', overallStrategy: '전략',
    weeklyMilestones: ['1주차 (14시간): 기초 개념', '2주차: 문제 풀이', '자유 형식'] })
  assert.deepEqual(r.weeks, [
    { weekNumber: 1, title: '기초 개념', description: '공부 시간 14시간' },
    { weekNumber: 2, title: '문제 풀이', description: '' },
    { weekNumber: 3, title: '자유 형식', description: '' },
  ])
  assert.equal(r.targetSubject, '영어')
  assert.equal(normalizeRoadmap({ weeklyMilestones: [] }), null)
  assert.equal(normalizeRoadmap(null), null)
  assert.equal(dateAfterWeeks(4, new Date(2026, 10, 14)), '2026-12-12')
})

test('mapLimited: 동시에 limit개까지만 실행하고 실패는 null', async () => {
  let running = 0, peak = 0
  const out = await mapLimited([1, 2, 3, 4, 5, 6, 7], async n => {
    running++; peak = Math.max(peak, running)
    await new Promise(r => setTimeout(r, 5))
    running--
    if (n === 3) throw new Error('x')
    return n * 2
  }, { limit: 3 })
  assert.deepEqual(out, [2, 4, null, 8, 10, 12, 14])
  assert.equal(peak, 3)
})
