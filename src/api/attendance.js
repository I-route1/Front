// src/api/attendance.js
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

function getAuthHeader() {
  const saved = sessionStorage.getItem('i-route-user')
  const user = saved ? JSON.parse(saved) : null
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {}
}

/**
 * 1. NFC 태그 — 승/하차 처리 (라즈베리파이에서 호출, 프론트 직접 사용 X)
 * POST /api/gps/attendance
 */
export async function tagNfc({ busId, nfcCardId }) {
  const res = await fetch(`${BASE_URL}/api/gps/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ busId, nfcCardId }),
  })
  if (!res.ok) {
    if (res.status === 404) throw new Error('등록되지 않은 NFC 카드입니다.')
    throw new Error('승/하차 처리 실패')
  }
  return res.json()
}

/**
 * 2. 자녀 목록 조회
 * GET /api/gps/parents/{parentId}/children
 */
export async function getChildren(parentId) {
  const res = await fetch(`${BASE_URL}/api/gps/parents/${parentId}/children`)
  if (!res.ok) throw new Error('자녀 목록 조회 실패')
  return res.json()
}

/**
 * 3. 자녀 출결 이력 조회 (parentId 기반)
 * GET /api/gps/attendance/parents/{parentId}?date=YYYY-MM-DD
 */
export async function getAttendanceByParent(parentId, date) {
  const params = date ? `?date=${date}` : ''
  const res = await fetch(`${BASE_URL}/api/gps/attendance/parents/${parentId}${params}`)
  if (!res.ok) throw new Error('출결 이력 조회 실패')
  return res.json()
}

/**
 * 4. 자녀 출결 이력 조회 (studentId 기반)
 * GET /api/gps/attendance/students/{studentId}?date=YYYY-MM-DD
 */
export async function getAttendanceByStudent(studentId, date) {
  const params = date ? `?date=${date}` : ''
  const res = await fetch(`${BASE_URL}/api/gps/attendance/students/${studentId}${params}`)
  if (!res.ok) throw new Error('출결 이력 조회 실패')
  return res.json()
}

/**
 * 5. 버스 전체 출결 조회 (관리자/교사용)
 * GET /api/gps/attendance/buses/{busId}
 */
export async function getAttendanceByBus(busId) {
  const res = await fetch(`${BASE_URL}/api/gps/attendance/buses/${busId}`, {
    headers: { ...getAuthHeader() },
  })
  if (!res.ok) throw new Error('버스 출결 조회 실패')
  return res.json()
}

/**
 * 6. NFC 카드 등록 (관리자용)
 * PATCH /api/gps/students/{studentId}/nfc
 */
export async function registerNfcCard(studentId, nfcCardId) {
  const res = await fetch(`${BASE_URL}/api/gps/students/${studentId}/nfc`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: JSON.stringify({ nfcCardId }),
  })
  if (res.status === 404) throw new Error('학생을 찾을 수 없습니다.')
  if (res.status === 409) throw new Error('이미 다른 학생에게 등록된 카드입니다.')
  if (!res.ok) throw new Error('NFC 카드 등록 실패')
}

// ─── Mock 데이터 (백엔드 연동 전 fallback) ───────────────────────────────────

export const MOCK_ATTENDANCE = [
  {
    attendanceId: 6,
    studentId: 1,
    studentName: '홍민준',
    busId: 1,
    eventType: 'EXIT',
    timestamp: new Date().toISOString().replace('Z', '').slice(0, 23),
  },
  {
    attendanceId: 5,
    studentId: 1,
    studentName: '홍민준',
    busId: 1,
    eventType: 'BOARD',
    timestamp: new Date(Date.now() - 8 * 60000).toISOString().replace('Z', '').slice(0, 23),
  },
]

export const MOCK_CHILDREN = [
  { gpsStudentId: 1, gradeStudentId: 'S-0155', name: '홍민준', busId: 1 },
]