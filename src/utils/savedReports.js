import { normalizeReportSubject } from './reportSubjects.js'

const TYPES = { 수학: 'math', 국어: 'writing', 영어: 'english', 과학: 'science', 사회: 'social', 통합: 'premium' }
export const UNCLASSIFIED_REPORT = { id: 'unclassified', title: '과목 미분류 리포트',
  desc: '과목 정보가 없는 저장된 리포트입니다', description: '과목 정보가 없는 저장된 리포트입니다',
  emoji: '📄', color: '#64748B', readOnly: true }

export function reportDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
    ? value.slice(0, 16).replace('T', ' ') : '생성일 미상'
}

export function normalizeSavedReports(data) {
  if (!Array.isArray(data)) throw new Error('리포트 응답 형식을 확인할 수 없습니다.')
  const ids = new Set()
  const rows = data.map(row => {
    if (!row || !Number.isSafeInteger(row.id) || row.id <= 0 || ids.has(row.id)
        || ['title', 'subject', 'careerAnalysis', 'learningGuide', 'createdAt'].some(key => row[key] != null && typeof row[key] !== 'string')) {
      throw new Error('리포트 응답 형식을 확인할 수 없습니다.')
    }
    ids.add(row.id)
    const subject = normalizeReportSubject(row.subject)
    return { ...row, _saved: true, _type: TYPES[subject] || 'unclassified',
      _subjectLabel: subject || '과목 미분류', _generatedAt: reportDate(row.createdAt) }
  })
  const time = row => Number.isFinite(Date.parse(row.createdAt)) ? Date.parse(row.createdAt) : -Infinity
  return rows.sort((a, b) => time(b) - time(a) || b.id - a.id)
}

export function groupSavedReports(rows) {
  return rows.reduce((groups, row) => {
    ;(groups[row._type] ||= []).push(row)
    return groups
  }, {})
}

// ── AI 코칭 한눈에 보기 ──────────────────────────────────────────
// 저장된 리포트 본문은 AI 서버 템플릿 형식이다.
//   careerAnalysis: "[제목]\n\n● 현재 학업 수준: 중위권 (…)\n● 학습 강도: 학습량 보강 필요 (일 1.0시간)\n…"
//   learningGuide : "[제목]\n\n1단계 — 오답 유형 분류: …\n2단계 — …"
// 형식이 달라도 화면이 깨지지 않도록, 못 찾은 값은 null로 둔다.
export const SUMMARY_TYPES = [
  { type: 'math', label: '수학', emoji: '🧠' },
  { type: 'writing', label: '국어', emoji: '🎯' },
  { type: 'english', label: '영어', emoji: '📖' },
  { type: 'science', label: '과학', emoji: '🔬' },
  { type: 'social', label: '사회', emoji: '🌍' },
  { type: 'premium', label: '통합', emoji: '⭐' },
]
export const STALE_REPORT_DAYS = 14

const lines = text => (typeof text === 'string' ? text.split('\n') : [])
const stripBullet = line => line.trim().replace(/^[●•▪◦\-*#>\s]+/, '').trim()

function statusValue(text, label) {
  for (const line of lines(text)) {
    const body = stripBullet(line)
    if (!body.includes(label)) continue
    const value = body.slice(body.indexOf(':') + 1).trim()
    if (body.indexOf(':') >= 0 && value) return value
  }
  return null
}

// 리포트에서 바로 실천할 첫 문장 (제목·구분선·'…:'로 끝나는 소제목은 건너뛴다)
export function reportKeyLine(row) {
  for (const text of [row?.learningGuide, row?.careerAnalysis]) {
    for (const line of lines(text)) {
      const body = stripBullet(line)
      if (!body || /^\[.*\]$/.test(body) || body.includes('━━') || /[:：]$/.test(body)) continue
      return body
    }
  }
  return null
}

function daysSince(createdAt, now) {
  const time = Date.parse(createdAt)
  return Number.isFinite(time) ? Math.max(0, Math.floor((now - time) / 86400000)) : null
}

// rows: normalizeSavedReports 결과(최신순)
export function summarizeSavedReports(rows, now = Date.now()) {
  const list = Array.isArray(rows) ? rows : []
  if (!list.length) return null
  const latest = list[0]
  const groups = groupSavedReports(list)
  const subjects = SUMMARY_TYPES.filter(t => groups[t.type]?.length)
    .map(t => ({ ...t, row: groups[t.type][0], count: groups[t.type].length }))
  const days = daysSince(latest.createdAt, now)
  const level = statusValue(latest.careerAnalysis, '학업 수준')
  return {
    latest,
    level: level ? level.replace(/\s*\(.*\)\s*$/, '') : null,
    intensity: statusValue(latest.careerAnalysis, '학습 강도'),
    keyLine: reportKeyLine(latest),
    subjects,
    missing: SUMMARY_TYPES.filter(t => t.type !== 'premium' && !groups[t.type]?.length).map(t => t.label),
    days,
    stale: days != null && days >= STALE_REPORT_DAYS,
  }
}
