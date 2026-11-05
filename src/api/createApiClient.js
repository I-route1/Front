async function withDeadline(action, timeoutMs, message, externalSignal) {
  if (!(timeoutMs > 0)) return action(externalSignal)
  const controller = new AbortController()
  const abort = () => controller.abort(externalSignal.reason)
  if (externalSignal) {
    if (externalSignal.aborted) abort()
    else externalSignal.addEventListener('abort', abort, { once: true })
  }
  let timer
  try {
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const error = new Error(message)
        reject(error)
        controller.abort(error)
      }, timeoutMs)
    })
    return await Promise.race([action(controller.signal), deadline])
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', abort)
  }
}

export function createApiClient({ baseUrl, storage = sessionStorage, fetcher = fetch,
  refreshTimeoutMs = 30000, onExpired = () => { window.location.href = '/login' } }) {
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
    const promise = withDeadline(async signal => {
      // 갱신이 멈춰도 다음 시도를 막지 않으며, 통신 장애로 로그인 정보를 지우지 않는다.
      signal?.throwIfAborted()
      const res = await fetcher(baseUrl + '/api/auth/token/refresh', {
        method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      signal?.throwIfAborted()
      if (res.status === 401 || res.status === 403) return expire(refreshToken)
      if (!res.ok) throw new Error('로그인 갱신에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      const data = await res.json()
      signal?.throwIfAborted()
      const current = user()
      if (current?.refreshToken !== refreshToken) throw new Error('로그인 정보가 변경되었습니다. 다시 시도해 주세요.')
      if (typeof data?.accessToken !== 'string' || !data.accessToken) throw new Error('로그인 갱신 응답이 올바르지 않습니다.')
      storage.setItem('i-route-user', JSON.stringify({ ...current, token: data.accessToken,
        accessToken: data.accessToken, refreshToken: data.refreshToken || refreshToken }))
      return data.accessToken
    }, refreshTimeoutMs, '로그인 갱신 시간이 초과되었습니다. 잠시 후 다시 저장해 주세요.')
    refreshing = { refreshToken, promise }
    try { return await promise } finally {
      if (refreshing?.promise === promise) refreshing = null
    }
  }

  return async function apiCall(path, options = {}) {
    const initialUser = user(), token = tokenOf(initialUser)
    const { timeoutMs, ...requestOptions } = options
    const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '69420',
      ...(token ? { Authorization: 'Bearer ' + token } : {}), ...requestOptions.headers }
    return withDeadline(async signal => {
      const checkCurrent = () => {
        signal?.throwIfAborted()
        if (user()?.id !== initialUser?.id) throw new Error('로그인 정보가 변경되었습니다. 다시 시도해 주세요.')
      }
      checkCurrent()
      let res = await fetcher(baseUrl + path, { ...requestOptions, headers, signal })
      checkCurrent()
      if (res.status === 401 && !['/api/auth/login', '/api/auth/token/refresh'].includes(path)) {
        const current = user()
        if (current?.refreshToken !== initialUser?.refreshToken) throw new Error('로그인 정보가 변경되었습니다. 다시 시도해 주세요.')
        const newToken = tokenOf(current) && tokenOf(current) !== token
          ? tokenOf(current) : await refresh(initialUser?.refreshToken)
        checkCurrent()
        res = await fetcher(baseUrl + path, { ...requestOptions, signal, headers: { ...headers, Authorization: 'Bearer ' + newToken } })
        checkCurrent()
        if (res.status === 401) return expire(initialUser?.refreshToken)
      }
      if (!res.ok) {
        const message = await res.text().catch(() => '')
        checkCurrent()
        let error
        try { error = JSON.parse(message) } catch { throw new Error(message || '요청 처리에 실패했습니다.') }
        throw new Error((typeof error === 'string' ? error : error?.message || error?.error || error?.detail
          || Object.values(error || {}).find(value => typeof value === 'string')) || '요청 처리에 실패했습니다.')
      }
      if (res.status === 204) return null
      const text = await res.text()
      checkCurrent()
      if (!text) return null
      try { return JSON.parse(text) } catch { return text }
    }, timeoutMs, '저장 요청 시간이 초과되었습니다. 같은 내용으로 다시 저장해 주세요.', requestOptions.signal)
  }
}
