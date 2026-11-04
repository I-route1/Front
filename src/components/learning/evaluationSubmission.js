// 동일한 학습 내용은 응답 유실·새로고침·다른 탭에서도 같은 저장 키를 사용한다.
export async function evaluationSubmissionId(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
