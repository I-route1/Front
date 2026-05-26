import { apiCall } from './client'

export const reviewAPI = {
  // 6-1. 오늘의 복습 항목 조회 (에빙하우스 기반)
  // 1일/3일/7일/14일/30일 후 복습 대상 반환
  getToday: (studentId) =>
    apiCall(`/api/review/today?studentId=${studentId}`),
  // 응답: { hasReview, reviews: [{ title, dayLabel, originalDate, message }] }
}