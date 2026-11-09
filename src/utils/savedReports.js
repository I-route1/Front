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
