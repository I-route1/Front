// 학습 로드맵 응답(StudyRoadmapDto) → 화면용
// { targetKeyword, targetDate, weeklyMilestones: ["1주차 (14시간): 기초 개념 …", …], overallStrategy }
export function normalizeRoadmap(data) {
  const milestones = Array.isArray(data?.weeklyMilestones) ? data.weeklyMilestones : []
  const weeks = milestones
    .filter(m => typeof m === 'string' && m.trim())
    .map((m, i) => {
      const colon = m.indexOf(':')
      const head = colon >= 0 ? m.slice(0, colon) : ''
      const body = (colon >= 0 ? m.slice(colon + 1) : m).trim()
      const num = Number(head.match(/(\d+)\s*주/)?.[1])
      const note = head.match(/\(([^)]*)\)/)?.[1] ?? ''
      return { weekNumber: Number.isInteger(num) && num > 0 ? num : i + 1, title: body, description: note ? `공부 시간 ${note}` : '' }
    })
  if (!weeks.length) return null
  return {
    targetSubject: typeof data.targetKeyword === 'string' && data.targetKeyword ? data.targetKeyword : '학습',
    targetDate: typeof data.targetDate === 'string' ? data.targetDate.slice(0, 10) : '',
    summary: typeof data.overallStrategy === 'string' ? data.overallStrategy : '',
    weeks,
  }
}

// 오늘부터 weeks주 뒤 날짜 (yyyy-MM-dd, 기기 시간대 기준)
export function dateAfterWeeks(weeks, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weeks * 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
