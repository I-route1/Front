// 동일한 학습 내용은 응답 유실·새로고침·다른 탭에서도 같은 저장 키를 사용한다.
export async function evaluationSubmissionId(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

export function manualEvaluationPayload({ studentId, subject, studyDate, startTime, duration, understanding, concentration }) {
  const date = new Date(`${studyDate}T00:00:00`)
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(studyDate)
    && !Number.isNaN(date.getTime()) && date.getFullYear() >= 1000 && date.getFullYear() <= 9999
    && date.getFullYear() === Number(studyDate.slice(0, 4))
    && date.getMonth() + 1 === Number(studyDate.slice(5, 7))
    && date.getDate() === Number(studyDate.slice(8, 10))
  if (!Number.isSafeInteger(Number(studentId)) || Number(studentId) < 1 || !subject?.trim()
      || !validDate || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)
      || !Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 1440
      || !Number.isInteger(understanding) || understanding < 1 || understanding > 5
      || !Number.isInteger(concentration) || concentration < 1 || concentration > 5) {
    throw new Error('학습일, 시작 시각, 학습 시간(1~1440분), 이해도와 집중도(1~5점)를 입력해 주세요.')
  }
  return {
    studentId: Number(studentId), subject, studyDate, studyStartTime: `${startTime}:00`,
    studyDurationMinutes: Number(duration), understandingScore: understanding,
    concentrationScore: concentration, measurementSource: 'MANUAL',
  }
}
