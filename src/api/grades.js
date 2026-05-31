import { apiCall } from './client'

export const gradesAPI = {
  // 1-1. 성적 입력
  // POST /api/grades
  postGrade: (data) =>
    apiCall('/api/grades', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // 요청 형식:
  // { studentId, subject, score, gradeLevel, examType, examDate }
  // examDate: "yyyy-MM-dd"

  // 1-2. 성적 목록 조회
  // GET /api/grades/{studentId}
  getGrades: (studentId) =>
    apiCall(`/api/grades/${studentId}`),

  // 1-3. 성적 추이 분석
  // GET /api/grades/{studentId}/analysis
  getGradeAnalysis: (studentId) =>
    apiCall(`/api/grades/${studentId}/analysis`),
  // 응답: { gradeHistory, subjectScoreChanges, summaryMessage }

  // 1-4. AI 맞춤 족보 탐색 (비동기 — 즉시 "접수 완료" 응답)
  // POST /api/grades/analyze
  analyzeGrade: (data) =>
    apiCall('/api/grades/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // 요청 형식:
  // { studentId, score, allScores: [], weakConceptTag }

  // 1-5. 성적 수정
  // PATCH /api/grades/{gradeId}
  updateGrade: (gradeId, data) =>
    apiCall(`/api/grades/${gradeId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // 1-6. 성적 삭제
  // DELETE /api/grades/{gradeId}
  deleteGrade: (gradeId) =>
    apiCall(`/api/grades/${gradeId}`, {
      method: 'DELETE',
    }),
}