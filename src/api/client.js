const BASE_URL = import.meta.env.VITE_API_URL

function getToken() {
  try {
    const saved = sessionStorage.getItem('i-route-user')
    if (!saved) return null
    const user = JSON.parse(saved)
    return user?.token ?? null
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
  if (res.status === 401) {
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
      // 갱신 실패 시 로그아웃
      sessionStorage.removeItem('i-route-user')
      window.location.href = '/login'
      return
    }
  }

  if (!res.ok) {
  const err = await res.json().catch(() => ({}))
  throw new Error(err.message || err.error || `HTTP ${res.status}`)
}

  const text = await res.text()
  return text ? JSON.parse(text) : null
}