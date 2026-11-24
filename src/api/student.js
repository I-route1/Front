import { apiCall } from './client'

export const studentAPI = {
  getMyChildren() {
    return apiCall('/api/students/my-children')
  },

  getAcademyStudents() {
    return apiCall('/api/students/academy/students')
  },

  getAdminStudents() {
    return apiCall('/api/students/admin/students')
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

  updateChildAcademies(studentId, addCodes, removeAcademyIds) {
    return apiCall('/api/students/' + studentId + '/academy', {
      method: 'PATCH',
      body: JSON.stringify({ addCodes, removeAcademyIds }),
    })
  },

  // 자녀 삭제
  deleteChild(studentId) {
    return apiCall(`/api/students/${studentId}`, {
      method: 'DELETE',
    })
  },
}
