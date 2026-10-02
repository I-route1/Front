// AI 리포트는 한국사를 제외한 다섯 과목을 지원한다.
export const REPORT_SUBJECTS = ['수학', '영어', '국어', '사회', '과학']

// 기존 성적의 탐구 과목명도 AI 서버의 과목명으로 맞춘다.
export function normalizeReportSubject(subject) {
  const value = typeof subject === 'string' ? subject.trim() : ''
  if (value === '사회탐구') return '사회'
  if (value === '과학탐구') return '과학'
  return value
}
