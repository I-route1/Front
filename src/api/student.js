import { apiCall } from './client'

export const studentAPI = {
  getMyChildren() {
    return apiCall('/api/students/my-children')
  },
}
