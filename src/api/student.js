import { apiCall } from './client'

export const studentAPI = {
  getMyChildren() {
    return apiCall('/api/students/my-children')
  },

  getAcademyStudents() {
    return apiCall('/api/students/academy/students')
  },

  getAcademies() {
    return apiCall('/api/academies')
  },

  // 자녀 추가 / 수정
  addChild(data) {
    return apiCall('/api/students', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 자녀 삭제
  deleteChild(studentId) {
    return apiCall(`/api/students/${studentId}`, {
      method: 'DELETE',
    })
  },
}
