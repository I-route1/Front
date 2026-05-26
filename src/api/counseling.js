import { apiCall } from './client'

// ⚠️ Python AI 서버(localhost:8082) 연동 필요
// 서버 다운 시 503 에러 발생

export const counselingAPI = {
  // 3-1. 수학 메타인지 분석 리포트
  getMathReport: (studentId) =>
    apiCall(`/api/counseling/math?studentId=${studentId}`, {
      method: 'POST',
    }),

  // 3-2. 진로 탐색 리포트
  getWritingReport: (studentId) =>
    apiCall(`/api/counseling/writing?studentId=${studentId}`, {
      method: 'POST',
    }),

  // 3-3. 프리미엄 통합 리포트
  getPremiumReport: (studentId) =>
    apiCall(`/api/counseling/premium?studentId=${studentId}`, {
      method: 'POST',
    }),
  // 응답: { studentId, title, careerAnalysis, learningGuide }
}