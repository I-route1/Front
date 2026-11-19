export function connectBoardNotifications(apiBase, token, setNotifications) {
  const controller = new AbortController()
  const { signal } = controller
  const headers = { Authorization: 'Bearer ' + token }
  const url = apiBase + '/api/board-notifications'

  async function refresh() {
    const response = await fetch(url, { headers, signal })
    if (!response.ok) throw new Error('알림 조회 실패 (' + response.status + ')')
    const notifications = await response.json()
    if (!signal.aborted) setNotifications(notifications)
  }

  async function readEvents(body) {
    const reader = body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    let eventName = ''

    try {
      while (!signal.aborted) {
        const { value, done } = await reader.read()
        if (done) return

        buffer += value
        let newline = buffer.indexOf('\n')
        while (newline !== -1) {
          const line = buffer.slice(0, newline).replace(/\r$/, '')
          buffer = buffer.slice(newline + 1)

          if (line.startsWith('event:')) {
            eventName = line.slice(6).trim()
          } else if (line === '') {
            if (eventName === 'ready' || eventName === 'board-notice') {
              await refresh()
            }
            eventName = ''
          }

          newline = buffer.indexOf('\n')
        }
      }
    } finally {
      reader.cancel().catch(() => {})
      reader.releaseLock()
    }
  }

  async function listen() {
    while (!signal.aborted) {
      try {
        const response = await fetch(url + '/stream', {
          headers: { ...headers, Accept: 'text/event-stream' },
          signal,
        })

        if (response.status === 401 || response.status === 403) return
        if (!response.ok || !response.body) {
          throw new Error('알림 연결 실패 (' + response.status + ')')
        }
        await readEvents(response.body)
      } catch (error) {
        if (signal.aborted) return
        console.warn('공지 알림 연결을 다시 시도합니다.', error)
      }

      if (!signal.aborted) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  }

  void listen()
  return () => controller.abort()
}
