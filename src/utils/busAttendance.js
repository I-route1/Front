// 학원 학생 정보의 busId로 버스 목록을 만든다 (버스 목록 API가 따로 없다)
export function busesFromStudents(students) {
  const counts = new Map()
  ;(students ?? []).forEach(s => {
    const id = Number(s?.busId)
    if (Number.isInteger(id) && id > 0) counts.set(id, (counts.get(id) ?? 0) + 1)
  })
  return [...counts].sort((a, b) => a[0] - b[0]).map(([busId, count]) => ({ busId, label: `${busId}호차`, count }))
}

// 학생별 가장 최근 승하차 (서버 정렬 순서와 상관없이 시각으로 판단)
export function latestStatusByStudent(records) {
  const latest = new Map()
  ;(records ?? []).forEach(r => {
    const prev = latest.get(r.studentId)
    if (!prev || String(r.timestamp) >= String(prev.timestamp)) latest.set(r.studentId, r)
  })
  return Object.fromEntries([...latest].map(([id, r]) => [id, r.eventType]))
}
