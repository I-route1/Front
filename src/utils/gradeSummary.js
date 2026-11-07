// 성적 API(GET /api/grades/{studentId}) 응답으로 성적 화면에 쓸 값을 계산한다.
// 시험마다 본 과목이 다르므로, 안 본 과목은 0점이 아니라 '기록 없음(null)'으로 다룬다.
import { normalizeReportSubject } from './reportSubjects.js'

export const GRADE_SUBJECTS = ['국어', '수학', '영어', '사회', '과학']

const round = (n) => Math.round(n)

// 받침이 있으면 '이', 없으면 '가'
export function subjectParticle(word) {
  const code = (word ?? '').charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return '이(가)'
  return code % 28 === 0 ? '가' : '이'
}

export function normalizeGrades(data) {
  const list = Array.isArray(data) ? data : (data?.grades ?? [])
  return list
    .map(g => ({
      subject: normalizeReportSubject(g?.subject) || g?.subject,
      score: Number(g?.score),
      date: typeof g?.examDate === 'string' ? g.examDate.slice(0, 10) : '',
      examType: g?.examType ?? '',
    }))
    .filter(g => GRADE_SUBJECTS.includes(g.subject) && Number.isFinite(g.score) && g.score >= 0 && g.score <= 100 && g.date)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

// 'YY.MM' 단위 추이. 그 달에 안 본 과목은 null (그래프에서 선을 이어 그린다)
export function gradeTrend(records) {
  const byMonth = new Map()
  records.forEach(r => {
    const label = `${r.date.slice(2, 4)}.${r.date.slice(5, 7)}`
    if (!byMonth.has(label)) byMonth.set(label, { date: label, ...Object.fromEntries(GRADE_SUBJECTS.map(s => [s, null])) })
    byMonth.get(label)[r.subject] = r.score
  })
  return [...byMonth.values()]
}

export function summarizeGrades(records) {
  const list = records ?? []
  const current = {}
  const previous = {}
  GRADE_SUBJECTS.forEach(s => {
    const scores = list.filter(r => r.subject === s)
    current[s] = scores.at(-1)?.score ?? null
    previous[s] = scores.at(-2)?.score ?? null
  })
  const subjects = GRADE_SUBJECTS.filter(s => current[s] != null)

  const last = list.at(-1)
  const latestExam = last
    ? { date: last.date, examType: last.examType, subjects: list.filter(r => r.date === last.date).map(r => r.subject) }
    : null

  const average = subjects.length ? round(subjects.reduce((a, s) => a + current[s], 0) / subjects.length) : null
  const best = subjects.length ? subjects.reduce((a, s) => (current[s] > current[a] ? s : a)) : null
  const weakest = subjects.length >= 2 ? subjects.reduce((a, s) => (current[s] < current[a] ? s : a)) : null

  const changes = subjects
    .filter(s => previous[s] != null)
    .map(s => ({ subject: s, diff: current[s] - previous[s] }))
    .sort((a, b) => b.diff - a.diff)

  return { current, previous, subjects, latestExam, average, best, weakest: weakest === best ? null : weakest, changes, trend: gradeTrend(list) }
}

// 한눈에 보기 문장 (최대 2줄)
export function gradeHeadline(summary) {
  if (!summary || summary.subjects.length === 0) return []
  const { changes } = summary
  if (changes.length === 0) return ['첫 성적이 등록됐어요. 다음 시험부터 변화를 알려 드릴게요.']
  const up = changes[0].diff > 0 ? changes[0] : null
  const down = changes.at(-1).diff < 0 ? changes.at(-1) : null
  const lines = []
  if (up) lines.push(`${up.subject}${subjectParticle(up.subject)} 지난 시험보다 ${up.diff}점 올랐어요.`)
  if (down) lines.push(`${down.subject}${subjectParticle(down.subject)} ${Math.abs(down.diff)}점 내려갔어요.`)
  if (!lines.length) lines.push('지난 시험과 같은 점수를 유지했어요.')
  return lines
}
