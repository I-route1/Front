const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

function getToken() {
  try {
    const saved = sessionStorage.getItem('i-route-user')
    if (!saved) return null
    const user = JSON.parse(saved)
    return user?.token || user?.accessToken || null
  } catch {
    return null
  }
}

function getRefreshToken() {
  try {
    const saved = sessionStorage.getItem('i-route-user')
    if (!saved) return null
    const user = JSON.parse(saved)
    return user?.refreshToken ?? null
  } catch {
    return null
  }
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')

  const res = await fetch(`${BASE_URL}/api/auth/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })

  if (!res.ok) throw new Error('Token refresh failed')

  const data = await res.json()

  const saved = sessionStorage.getItem('i-route-user')
  if (saved) {
    const user = JSON.parse(saved)

    user.token = data.accessToken

    if (data.refreshToken) {
      user.refreshToken = data.refreshToken
    }

    sessionStorage.setItem('i-route-user', JSON.stringify(user))
  }

  return data.accessToken
}

export async function apiCall(path, options = {}) {
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  // 401이면 토큰 갱신 후 재시도
  if (res.status === 401 && path !== '/api/auth/login') {
    try {
      const newToken = await refreshAccessToken()
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
      })
      res = retryRes
    } catch {
      sessionStorage.removeItem('i-route-user')
      window.location.href = '/login'
      return
    }
  }

  // 1. 에러 응답 처리
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    let err = {}
    try {
      err = JSON.parse(errText)
    } catch {
      // 에러 메시지가 일반 문자열일 경우 그대로 사용
      throw new Error(errText || '요청 처리에 실패했습니다.')
    }

    throw new Error(
        err.message ||
        err.error ||
        err.detail ||
        '요청 처리에 실패했습니다.'
    )
  }

  // 2. 204 No Content (내용 없음) 인 경우 바로 null 반환
  if (res.status === 204) {
    return null
  }

  // 3. 응답 텍스트 읽기
  const text = await res.text()
  if (!text) return null

  // 4. 💡 JSON 파싱 예외 처리 (핵심 수정 구간)
  try {
    return JSON.parse(text)
  } catch {
    // 백엔드가 JSON이 아닌 일반 한글/문자열("자녀 정보가 정상적으로 삭제되었습니다.")을 반환할 경우
    return text
  }
}
