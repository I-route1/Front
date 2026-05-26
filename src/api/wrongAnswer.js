import { apiCall } from './client'

export const wrongAnswerAPI = {
  // 4-1. 오답 기록
  record: ({ studentId, subject, questionId, conceptTag, errorType }) => {
    const params = new URLSearchParams({
      studentId,
      subject,
      questionId,
      conceptTag,
      ...(errorType && { errorType }),
    })
    return apiCall(`/api/wrong-answer/record?${params}`, {
      method: 'POST',
    })
  },
  // errorType: CONCEPT_GAP / CALCULATION_ERROR / CARELESS_MISTAKE / MEMORIZATION_GAP
}