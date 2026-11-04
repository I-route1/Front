import { useEffect, useState, useCallback } from 'react'

const EMPTY_RECORDS = []

// 학생 전환/새로고침 이전의 응답이 새 학생의 기록을 덮어쓰지 않게 한다.
export default function useStudentRecords(studentId, load) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState({ studentId: null, data: [], loading: true, error: '' })
  const reload = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    let active = true
    if (!studentId) {
      setState({ studentId, data: [], loading: false, error: '' })
      return
    }
    setState({ studentId, data: [], loading: true, error: '' })
    load(studentId)
      .then(data => {
        if (!Array.isArray(data)) throw new Error('기록 응답 형식을 확인할 수 없습니다.')
        if (active) setState({ studentId, data, loading: false, error: '' })
      })
      .catch(error => {
        if (active) setState({ studentId, data: [], loading: false, error: error.message || '기록을 불러오지 못했습니다.' })
      })
    return () => { active = false }
  }, [studentId, load, revision])
  const current = state.studentId === studentId ? state : { data: EMPTY_RECORDS, loading: !!studentId, error: '' }
  return { ...current, reload }
}
