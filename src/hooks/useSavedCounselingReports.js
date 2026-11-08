import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { counselingAPI } from '@/api/counseling'
import { useAuth } from '@/context/AuthContext'
import useStudentRecords from './useStudentRecords'
import { normalizeSavedReports, groupSavedReports } from '@/utils/savedReports'

export default function useSavedCounselingReports(studentId) {
  const { user } = useAuth()
  const id = studentId == null ? '' : String(studentId)
  const enabled = /^[1-9]\d*$/.test(id) && !!user?.id
  const key = enabled ? `${user.id}:${user.role}:${id}` : null
  const currentKey = useRef(key)
  const mounted = useRef(false)
  currentKey.current = key
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const isCurrent = () => enabled && mounted.current && currentKey.current === key
  const load = useCallback(() => counselingAPI.getReports(id).then(normalizeSavedReports), [id])
  const history = useStudentRecords(key, load)
  const groups = useMemo(() => groupSavedReports(history.data), [history.data])
  const [local, setLocal] = useState({ key: null, generated: {}, selected: {}, hidden: {} })
  const active = local.key === key ? local : { generated: {}, selected: {}, hidden: {} }
  const update = change => {
    if (!isCurrent()) return
    setLocal(previous => change(previous.key === key ? previous : { key, generated: {}, selected: {}, hidden: {} }))
  }
  const results = { ...active.generated }
  for (const [type, rows] of Object.entries(groups)) {
    if (!active.hidden[type]) results[type] = rows.find(row => String(row.id) === active.selected[type]) || rows[0]
  }
  return { ...history, enabled, groups, results, isCurrent,
    reload: () => { update(previous => ({ ...previous, selected: {}, hidden: {} })); history.reload() },
    generated: (type, result, persisted) => {
      if (!isCurrent()) return
      update(previous => ({ ...previous, generated: persisted ? previous.generated : { ...previous.generated, [type]: result },
        selected: { ...previous.selected, [type]: undefined }, hidden: { ...previous.hidden, [type]: false } }))
      if (persisted) history.reload()
    },
    select: (type, selected) => update(previous => ({ ...previous, selected: { ...previous.selected, [type]: selected },
      hidden: { ...previous.hidden, [type]: false } })),
    clear: type => update(previous => { const generated = { ...previous.generated }; delete generated[type]
      return { ...previous, generated, hidden: { ...previous.hidden, [type]: true } } }),
  }
}
