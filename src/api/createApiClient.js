export function createApiClient({ baseUrl, storage = sessionStorage, fetcher = fetch,
  onExpired = () => { window.location.href = '/login' } }) {
  let refreshing = null
  function user() {
    try { return JSON.parse(storage.getItem('i-route-user') || 'null') } catch { return null }
  }
  const tokenOf = value => value?.token || value?.accessToken || null
  function expire(refreshToken) {
    if (user()?.refreshToken === refreshToken) {
      storage.removeItem('i-route-user')
      onExpired()
    }
    throw new Error('로그인이 만료되었습니다. 다시 로그인해 주세요.')
  }
  async function refresh(refreshToken) {
    if (!refreshToken) return expire(refreshToken)
    if (refreshing?.refreshToken === refreshToken) return refreshing.promise
    const promise = (async () => {
      // 통신 오류나 일시적인 서버 장애는 로그인 정보를 지우지 않는다.
      const res = await fetcher(`${baseUrl}/api/auth/token/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (res.status === 401 || res.status === 403) return expire(refreshToken)
      if (!res.ok) throw new Error('로그인 갱신에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      const data = await res.json()
      const current = user()
      if (current?.refreshToken !== refreshToken) throw new Error('로그인 정보가 변경되었습니다. 다시 시도해 주세요.')
      if (!data.accessToken) throw new Error('로그인 갱신 응답이 올바르지 않습니다.')
      storage.setItem('i-route-user', JSON.stringify({ ...current, token: data.accessToken,
        accessToken: data.accessToken, refreshToken: data.refreshToken || refreshToken }))
      return data.accessToken
    })()
    refreshing = { refreshToken, promise }
    try { return await promise } finally {
      if (refreshing?.promise === promise) refreshing = null
    }
  }

  return async function apiCall(path, options = {}) {
    const initialUser = user(), token = tokenOf(initialUser)
    const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420',
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
    let res = await fetcher(`${baseUrl}${path}`, { ...options, headers })
    if (res.status === 401 && !['/api/auth/login', '/api/auth/token/refresh'].includes(path)) {
      const current = user()
      if (current?.refreshToken !== initialUser?.refreshToken) throw new Error('로그인 정보가 변경되었습니다. 다시 시도해 주세요.')
      const newToken = tokenOf(current) && tokenOf(current) !== token
        ? tokenOf(current) : await refresh(initialUser?.refreshToken)
      res = await fetcher(`${baseUrl}${path}`, { ...options, headers: { ...headers, Authorization: `Bearer ${newToken}` } })
      if (res.status === 401) return expire(initialUser?.refreshToken)
    }
    if (!res.ok) {
      const message = await res.text().catch(() => '')
      let error
      try { error = JSON.parse(message) } catch { throw new Error(message || '요청 처리에 실패했습니다.') }
      throw new Error(error.message || error.error || error.detail || Object.values(error).find(v => typeof v === 'string') || '요청 처리에 실패했습니다.')
    }
    if (res.status === 204) return null
    const text = await res.text()
    if (!text) return null
    try { return JSON.parse(text) } catch { return text }
  }
}
