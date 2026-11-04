export const ERROR_TYPES = {
  CONCEPT_GAP: { label: '개념 이해 부족', color: '#1A56DB' },
  CALCULATION_ERROR: { label: '계산 실수', color: '#FFB800' },
  CARELESS_MISTAKE: { label: '부주의 실수', color: '#FF6B6B' },
  MEMORIZATION_GAP: { label: '암기 부족', color: '#00A885' },
}

export function errorTypeLabel(type) {
  return ERROR_TYPES[type]?.label || '미분류'
}

export function wrongTypeCounts(records) {
  const counts = new Map()
  records.forEach(record => {
    const type = ERROR_TYPES[record.errorType] ? record.errorType : 'UNKNOWN'
    counts.set(type, (counts.get(type) || 0) + (record.failCount > 0 ? record.failCount : 1))
  })
  return [...counts].map(([type, count]) => ({
    type, count, label: errorTypeLabel(type), color: ERROR_TYPES[type]?.color || '#64748B',
  })).sort((a, b) => b.count - a.count)
}

export function formatRatio(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? `${Math.round(value * 1000) / 10}%` : '미측정'
}

export function hourlyConcentration(records) {
  const hours = new Map()
  records.forEach(record => {
    if (!record.studyStartTime || !Number.isFinite(record.concentrationScore)
        || record.concentrationScore < 1 || record.concentrationScore > 5) return
    const hour = Number(record.studyStartTime.split(':')[0])
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return
    const group = hours.get(hour) || { total: 0, count: 0 }
    group.total += record.concentrationScore * 20
    group.count += 1
    hours.set(hour, group)
  })
  return [...hours].sort(([a], [b]) => a - b).map(([hour, group]) => ({
    time: `${String(hour).padStart(2, '0')}시`, focus: Math.round(group.total / group.count),
  }))
}

export function localStudyDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
