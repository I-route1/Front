import { apiCall } from './client'

export const checklistAPI = {
  getByDate: (studentId, date) => {
    const dateParam = date || new Date().toISOString().split('T')[0]
    return apiCall(`/api/checklist?studentId=${studentId}&date=${dateParam}`)
  },

  addItem: (data) =>
    apiCall('/api/checklist', { method: 'POST', body: JSON.stringify(data) }),

  toggleDone: (itemId) =>
    apiCall(`/api/checklist/${itemId}/toggle`, { method: 'PATCH' }),

  deleteItem: (itemId) =>
    apiCall(`/api/checklist/${itemId}`, { method: 'DELETE' }),
}
