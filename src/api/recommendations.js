import { apiCall } from './client'

export const recommendationsAPI = {
  // 7-1. 학습 자료 추천
  getMaterials: (studentId) =>
    apiCall(`/api/recommendations/materials?studentId=${studentId}`),
  // 응답: [{ materialId, title, materialType, matchReason }]

  // 7-2. 목표 기반 로드맵 추천
  getRoadmap: (studentId) =>
    apiCall(`/api/recommendations/roadmap?studentId=${studentId}`),

  // 7-3. 에빙하우스 기준 당일 복습 대상
  getDailyReview: (studentId) =>
    apiCall(`/api/recommendations/daily-review?studentId=${studentId}`),

  // 7-4. 학습 성향 기반 공부법 추천
  getStudyMethod: (studentId, subjectId) =>
    apiCall(`/api/recommendations/study-method?studentId=${studentId}&subjectId=${subjectId}`),
  // 응답: { tendency, studyGuide, recommendedApproach }
  // tendency: VISUAL / AUDITORY / KINESTHETIC

  // 7-5. 유사 성적대 콘텐츠 추천
  getPeerContent: (studentId) =>
    apiCall(`/api/recommendations/peer-content?studentId=${studentId}`),

  // 7-6. 선배 성공 학습 경로 추천
  getPeerPath: (studentId, subject) =>
    apiCall(`/api/recommendations/peer-path?studentId=${studentId}&subject=${subject}`),
  // 응답: { similarStudentsCount, avgImprovement, studyStrategyPattern, keyInsights }
}