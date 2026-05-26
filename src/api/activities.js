import { apiCall } from './client'

export const activitiesAPI = {
  // 2-1. 학습 기록 입력
  // POST /api/activities
  postActivity: (data) =>
    apiCall('/api/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // 요청 형식:
  // { studentId, subject, studyDate, studyStartTime(선택),
  //   studyDurationMinutes, understandingScore(1~5), concentrationScore(1~5) }

  // 2-2. 학습 기록 조회
  // GET /api/activities/{studentId}
  getActivities: (studentId) =>
    apiCall(`/api/activities/${studentId}`),

  // 2-3. 강사 피드백 입력/수정
  // PATCH /api/activities/{activityId}/feedback
  patchFeedback: (activityId, instructorFeedback) =>
    apiCall(`/api/activities/${activityId}/feedback`, {
      method: 'PATCH',
      body: JSON.stringify({ instructorFeedback }),
    }),
}