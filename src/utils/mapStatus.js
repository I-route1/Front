// 학부모 지도 화면(Map.jsx)에서 서버 응답을 화면 상태로 바꾸는 계산.
// 화면 컴포넌트와 분리해 단위 테스트한다 (tests/map-status.test.mjs).
import { distanceMeters, isFiniteNumber } from './gpsTracking.js'

// ---- 날짜·시간 ----

// 서버 날짜 파라미터(YYYY-MM-DD). 브라우저 현지 시각 기준 (서비스는 한국 시간)
export function todayString(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`
}

// 서버 LocalDateTime 문자열("2026-11-16T08:12:33.123")에서 "08:12"만 꺼낸다.
// 시간대 표시가 없는 값이라 Date로 바꾸지 않고 글자 그대로 읽는다.
export function timeOfDay(localDateTime) {
  const m = /T(\d{2}):(\d{2})/.exec(String(localDateTime ?? ''))
  return m ? `${m[1]}:${m[2]}` : null
}

// 마지막 위치 수신이 얼마나 지났는지
export function updatedAgo(updatedAt, now = Date.now()) {
  if (!updatedAt) return '-'
  const t = new Date(updatedAt).getTime()
  if (!Number.isFinite(t)) return '-'
  const sec = Math.max(0, Math.round((now - t) / 1000))
  if (sec < 10) return '방금 전'
  if (sec < 60) return `${sec}초 전`
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`
  return `${Math.floor(sec / 3600)}시간 전`
}

// ---- ① 아이 탑승 상태 ----

// 오늘 출결 기록 중 이 학생의 가장 최근 기록 (서버 정렬 순서와 상관없이 시각으로 판단)
export function latestRecord(records, studentId) {
  let latest = null
  for (const r of records ?? []) {
    if (String(r?.studentId) !== String(studentId)) continue
    if (!latest || String(r.timestamp) >= String(latest.timestamp)) latest = r
  }
  return latest
}

// 탑승 상태: 'waiting'(탑승 전) | 'onboard'(탑승 중) | 'dropped'(하차 완료) | 'unknown'(확인 불가)
// - records: 오늘 출결 기록 배열. 조회하지 못했으면 null
// - onBoard: GET /api/gps/students/{id}/current-location 결과 (200 → true, 204 → false, 모름 → null)
// 204는 '탑승 전'과 '하차 후'를 구분하지 못하므로, 하차 완료는 출결 기록이 있을 때만 판단한다.
export function rideState({ records = null, studentId, onBoard = null }) {
  if (Array.isArray(records)) {
    const latest = latestRecord(records, studentId)
    if (latest?.eventType === 'BOARD') return { state: 'onboard', at: latest.timestamp }
    if (latest?.eventType === 'EXIT') return { state: 'dropped', at: latest.timestamp }
    return onBoard === true ? { state: 'onboard', at: null } : { state: 'waiting', at: null }
  }
  return onBoard === true ? { state: 'onboard', at: null } : { state: 'unknown', at: null }
}

export function describeRide({ state, at }, childName) {
  const name = childName || '우리 아이'
  const time = timeOfDay(at)
  switch (state) {
    case 'onboard':
      return { tone: 'info', text: `${name} 탑승 중${time ? ` (${time} 탑승)` : ''}` }
    case 'dropped':
      return { tone: 'success', text: `${name} 하차 완료${time ? ` (${time})` : ''}` }
    case 'waiting':
      return { tone: 'neutral', text: `${name} 아직 탑승 전이에요` }
    default:
      return { tone: 'neutral', text: '탑승 정보를 확인할 수 없어요' }
  }
}

// /topic/attendance/{parentId} 메시지 → 짧은 안내 문구
export function attendanceToast(event) {
  if (!event?.eventType) return null
  const name = event.studentName || '우리 아이'
  const time = timeOfDay(event.timestamp)
  const action = event.eventType === 'BOARD' ? '탑승했어요' : event.eventType === 'EXIT' ? '하차했어요' : null
  if (!action) return null
  return `${name} ${action}${time ? ` (${time})` : ''}`
}

// ---- ③ 지연·지각 위험 ----

export function findChildEta(etas, studentId) {
  if (!Array.isArray(etas)) return null
  return etas.find((e) => String(e?.studentId) === String(studentId)) ?? null
}

// 서버 ETA(EtaService): lateRisk는 지연 5분 이상, delayReason은 서버가 정한 문구
export function delayNotice(eta) {
  if (!eta) return null
  const minutes = isFiniteNumber(eta.delayMinutes) ? eta.delayMinutes : 0
  const reason = eta.delayReason && eta.delayReason !== '정상 운행' ? ` (${eta.delayReason})` : ''
  if (eta.lateRisk) return { level: 'danger', text: `도착이 약 ${minutes}분 늦어질 것 같아요${reason}` }
  if (minutes > 0) return { level: 'warn', text: `도착이 ${minutes}분 정도 늦어지고 있어요` }
  return null
}

// ---- ④ 오류 안내 ----

// gpsService(axios) 오류 → 안내 문구. 서버 오류 형식: { success: false, code, message }
export function locationErrorMessage(err) {
  const code = err?.response?.data?.code
  if (code === 'BUS_002') return '지금은 운행 시간이 아니에요'
  if (code === 'GPS_001') return '버스 위치를 아직 받지 못했어요'
  if (code === 'BUS_001') return '배정된 버스 정보를 찾을 수 없어요'
  if (err && !err.response) return '서버에 연결할 수 없어요. 잠시 후 다시 시도할게요'
  return '버스 정보를 불러오지 못했어요'
}

// ---- ② 노선 ----

// GET /api/gps/buses/{busId}/route 응답 → 화면용 노선
export function routeFromResponse(route) {
  const stops = Array.isArray(route?.stops) ? route.stops : []
  const stations = stops
    .filter((s) => isFiniteNumber(s?.latitude) && isFiniteNumber(s?.longitude))
    .map((s) => ({
      stopId: s.stopId,
      name: s.stopName ?? '',
      order: s.stopOrder ?? 0,
      latitude: s.latitude,
      longitude: s.longitude,
      status: s.status === 'ARRIVED' || s.status === 'PASSED' ? s.status : 'BEFORE_ARRIVAL',
    }))
    .sort((a, b) => a.order - b.order)
  return { routeName: route?.routeName ?? '', stations }
}

// 기사 화면 시뮬레이션이 따라 달릴 경로: 서버 노선의 정류장 좌표 순서대로. 정류장이 2개 미만이면 null
export function simulationPathFromRoute(route) {
  const { stations } = routeFromResponse(route)
  if (stations.length < 2) return null
  return stations.map((s) => ({ latitude: s.latitude, longitude: s.longitude }))
}

// 정류장 반경(m). 백엔드 RouteProgressService.ARRIVAL_RADIUS_METER와 같은 값
const ARRIVAL_RADIUS_M = 50
const EARTH_RADIUS_M = 6371000

// 기준점(origin)에서 본 평면 좌표(m). 정류장 사이 수백 m 범위라 평면으로 봐도 오차가 작다.
function toLocalXY(origin, p) {
  const rad = Math.PI / 180
  return {
    x: (p.longitude - origin.longitude) * rad * EARTH_RADIUS_M * Math.cos(origin.latitude * rad),
    y: (p.latitude - origin.latitude) * rad * EARTH_RADIUS_M,
  }
}

// 노선 위 진행 거리: 버스 위치를 정류장을 잇는 선에 투영해 출발 정류장에서 몇 m 왔는지 구한다.
// along이 음수면 출발 정류장 앞, 마지막 정류장까지 거리보다 크면 종점을 지난 것.
export function progressAlongRoute(stations, bus) {
  if (!Array.isArray(stations) || stations.length < 2) return null
  if (!bus || !isFiniteNumber(bus.latitude) || !isFiniteNumber(bus.longitude)) return null
  const stopDistances = [0]
  let start = 0
  let best = null
  for (let i = 0; i < stations.length - 1; i++) {
    const end = toLocalXY(stations[i], stations[i + 1])
    const pos = toLocalXY(stations[i], bus)
    const len = Math.hypot(end.x, end.y)
    const rawT = len > 0 ? (pos.x * end.x + pos.y * end.y) / (len * len) : 0
    const t = Math.min(1, Math.max(0, rawT))
    const offRoute = Math.hypot(pos.x - end.x * t, pos.y - end.y * t)
    if (!best || offRoute < best.offRoute) best = { i, rawT, t, len, start, offRoute }
    start += len
    stopDistances.push(start)
  }
  const lastLeg = stations.length - 2
  let along = best.start + best.t * best.len
  if (best.i === 0 && best.rawT < 0) along = best.rawT * best.len
  if (best.i === lastLeg && best.rawT > 1) along = best.start + best.rawT * best.len
  return { along, stopDistances, offRoute: best.offRoute }
}

// 버스 위치가 바뀔 때마다 서버에 다시 묻지 않고 정류장 상태를 갱신한다.
// 50m 이내 → ARRIVED, 버스가 이미 지나온 정류장 → PASSED, 나머지 → BEFORE_ARRIVAL
// '지나온 정류장'은 노선 위 진행 거리로 판단한다. 백엔드 RouteProgressService는
// '가장 가까운 정류장보다 앞 순서'로 판단해서, 정류장을 떠난 뒤 다음 정류장과의 중간을 넘을 때까지
// 방금 지난 정류장을 통과로 표시하지 못한다.
export function progressStatuses(stations, bus) {
  if (!Array.isArray(stations) || stations.length === 0) return []
  if (!bus || !isFiniteNumber(bus.latitude) || !isFiniteNumber(bus.longitude)) return stations
  const progress = progressAlongRoute(stations, bus)
  return stations.map((s, i) => {
    if (distanceMeters(bus, s) <= ARRIVAL_RADIUS_M) return { ...s, status: 'ARRIVED' }
    if (progress && progress.stopDistances[i] < progress.along) return { ...s, status: 'PASSED' }
    return { ...s, status: 'BEFORE_ARRIVAL' }
  })
}

// 지도에 그릴 선: 지나온 구간(회색)과 남은 구간(파랑). 버스 위치가 있으면 두 선이 버스에서 만난다.
export function routePaths(stations, bus) {
  const point = (s) => ({ latitude: s.latitude, longitude: s.longitude })
  const list = Array.isArray(stations) ? stations : []
  const passed = list.filter((s) => s.status === 'PASSED').map(point)
  const rest = list.filter((s) => s.status !== 'PASSED').map(point)
  const hasBus = bus && isFiniteNumber(bus.latitude) && isFiniteNumber(bus.longitude)
  if (!hasBus) {
    return { passed, remaining: passed.length ? [passed[passed.length - 1], ...rest] : rest }
  }
  const busPoint = point(bus)
  return {
    passed: passed.length ? [...passed, busPoint] : [],
    remaining: [busPoint, ...rest],
  }
}
