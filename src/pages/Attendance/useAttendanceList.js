import { useEffect, useState } from 'react'

const REFRESH_MS = 2000

export function useAttendanceList(load, { live = true, reloadKey = 0, errorMessage }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let timer
    let pending = false
    setRows([])
    setError(null)
    setLoading(Boolean(load))
    if (!load) return

    async function refresh() {
      clearTimeout(timer)
      if (pending || controller.signal.aborted || document.hidden) return
      pending = true
      try {
        const data = await load(controller.signal)
        if (controller.signal.aborted) return
        setRows(Array.isArray(data) ? data : [])
        setError(null)
      } catch (e) {
        if (controller.signal.aborted) return
        if (e.status === 401 || e.status === 403) setRows([])
        setError(errorMessage)
      } finally {
        pending = false
        if (!controller.signal.aborted) {
          setLoading(false)
          if (live && !document.hidden) timer = setTimeout(refresh, REFRESH_MS)
        }
      }
    }

    refresh()
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      controller.abort()
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
    }
  }, [load, live, reloadKey, errorMessage])

  return { rows, loading, error }
}
