import { apiCall } from './client'

export const studyPlanAPI = {
  // 5-1. 취약 개념 기반 복습 문제지 생성
  getReviewPaper: (studentId) =>
    apiCall(`/api/study-plan/review-paper?studentId=${studentId}`, {
      method: 'POST',
    }),
  // 응답: { paperId, questions: [], weakConcepts: [] }

  // 5-2. 목표 기반 학습 로드맵 생성
  generateRoadmap: (studentId, data) =>
    apiCall(`/api/study-plan/progress?studentId=${studentId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // 요청 형식:
  // { targetKeyword, targetDate: "yyyy-MM-dd", dailyStudyHours }
  // 응답: { weeklyMilestones: [], overallStrategy }
}