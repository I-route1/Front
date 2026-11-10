import { apiCall } from './client'

export const postureAPI = {
  getAll: async (studentId) => {
    if (!['number', 'string'].includes(typeof studentId) || !/^[0-9]+$/.test(String(studentId))
      || !Number.isSafeInteger(Number(studentId)) || Number(studentId) <= 0) {
      throw new Error('학생 정보를 확인해주세요.')
    }
    const id = Number(studentId)
    const rows = await apiCall(`/api/posture-records?studentId=${id}&limit=100`)
    if (!Array.isArray(rows) || rows.some(row => !row || row.studentId !== id)) {
      throw new Error('학생의 자세 기록 응답을 확인할 수 없습니다.')
    }
    return rows
  },
}
