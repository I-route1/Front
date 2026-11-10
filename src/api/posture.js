import { apiCall } from './client'
import { validatePostureRecords } from './postureValidation'

export const postureAPI = {
  getAll: async (studentId) => {
    if (!['number', 'string'].includes(typeof studentId) || !/^[0-9]+$/.test(String(studentId))
      || !Number.isSafeInteger(Number(studentId)) || Number(studentId) <= 0) {
      throw new Error('학생 정보를 확인해주세요.')
    }
    const id = Number(studentId)
    const rows = await apiCall(`/api/posture-records?studentId=${id}&limit=100`)
    return validatePostureRecords(rows, id)
  },
}
