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
   * AI에게 질문하기 (학습 탭 '💬 AI 질문')
   * POST /api/ai/ask
   * 요청: { question, subject? }  — subject를 비우면 서버가 질문에서 과목을 감지
   * 응답: { subject, question, answer, grounded, needSubject }
   *   needSubject=true면 과목을 알 수 없어 답하지 않은 것 → 과목을 골라 다시 요청
   * 예전 ragSearch(/api/rag/search)는 Backend에 그 경로가 없어 404였고 어디서도 쓰지 않아 대체했다.
   */
  askQuestion: (question, subject) =>
    apiCall('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify(subject ? { question, subject } : { question }),
    }),
}