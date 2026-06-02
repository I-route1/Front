// src/api/aiReport.js
import { apiCall } from './client'

export const aiReportAPI = {
  /**
   * AI 맞춤 문제 추천
   * POST /api/ai/report/subject-recommend?studentId={studentId}&subject={subject}
   * 응답: { studentId, subject, targetConcept, aiRecommendationReport }
   */
  getSubjectRecommend: (studentId, subject) =>
    apiCall(
      `/api/ai/report/subject-recommend?studentId=${studentId}&subject=${encodeURIComponent(subject)}`,
      { method: 'POST' }
    ),

  /**
   * AI 성적 예측
   * POST /api/ai/predict
   * 요청: { past_score_avg, study_hours_per_day }
   * 응답: { expected_score, message }
   */
  predictScore: (pastScoreAvg, studyHoursPerDay) =>
    apiCall('/api/ai/predict', {
      method: 'POST',
      body: JSON.stringify({
        past_score_avg: pastScoreAvg,
        study_hours_per_day: studyHoursPerDay,
      }),
    }),

  /**
   * RAG 검색
   * POST /api/rag/search
   * 요청: { question }
   * 응답: { context }
   */
  ragSearch: (question) =>
    apiCall('/api/rag/search', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
}