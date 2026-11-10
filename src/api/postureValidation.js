const counts = ['uprightSamples', 'slouchedSamples', 'headDownSamples', 'tiltedSamples',
  'unknownSamples', 'noPersonSamples', 'multiplePeopleSamples']
const ratios = ['uprightRatio', 'slouchedRatio', 'headDownRatio', 'tiltedRatio']
const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max
const instant = value => {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match || !Number.isFinite(Date.parse(value))) return false
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number)
  return year >= 1000 && month >= 1 && month <= 12 && day >= 1
    && day <= new Date(Date.UTC(year, month, 0)).getUTCDate() && hour < 24 && minute < 60 && second < 60
}

export function validatePostureRecords(rows, studentId) {
  const ids = new Set()
  const valid = row => {
    if (!row || !integer(row.id, 1, Number.MAX_SAFE_INTEGER) || ids.has(row.id) || row.studentId !== studentId
      || typeof row.subject !== 'string' || row.subject.length > 255 || !row.subject.replace(/[\s\p{Cf}\p{Cc}]/gu, '')
      || typeof row.modelName !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(row.modelName)
      || typeof row.submissionId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(row.submissionId)
      || !instant(row.startedAt) || !instant(row.createdAt) || !integer(row.durationSeconds, 1, 86400)
      || row.measurementSource !== 'AI_HAT' || !['CAMERA', 'IMAGE', 'VIDEO'].includes(row.inputSource)
      || !integer(row.totalSamples, 1, 86400) || counts.some(key => !integer(row[key], 0, 86400))
      || counts.reduce((sum, key) => sum + row[key], 0) !== row.totalSamples) return false
    const classified = counts.slice(0, 4).reduce((sum, key) => sum + row[key], 0)
    if (row.classifiedSamples !== classified || ratios.some((key, index) => classified === 0
      ? row[key] !== null
      : typeof row[key] !== 'number' || !Number.isFinite(row[key]) || row[key] < 0 || row[key] > 1
        || Math.abs(row[key] - row[counts[index]] / classified) > 1e-9)) return false
    ids.add(row.id)
    return true
  }
  if (!Array.isArray(rows) || rows.length > 100 || !rows.every(valid)) {
    throw new Error('학생의 자세 기록 응답을 확인할 수 없습니다.')
  }
  return rows
}
