import { apiCall } from './client'

export const ocrResultsAPI = {
  getAll: (studentId, subject) => {
    const params = new URLSearchParams({ studentId, ...(subject && { subject }) })
    return apiCall(`/api/ocr-results?${params}`)
  },
  getById: (id, studentId) =>
    apiCall(`/api/ocr-results/${encodeURIComponent(id)}?${new URLSearchParams({ studentId })}`),
}
