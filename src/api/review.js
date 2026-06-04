import { apiCall } from './client'

export const reviewAPI = {
  getToday: (studentId) =>
    apiCall(`/api/review/today?studentId=${studentId}`),

  dismiss: (reviewId) =>
    apiCall(`/api/review/${reviewId}`, {
      method: 'DELETE',
    }),
}