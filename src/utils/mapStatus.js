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

const isPoint = (p) => isFiniteNumber(p?.latitude) && isFiniteNumber(p?.longitude)
  && Math.abs(p.latitude) <= 90 && Math.abs(p.longitude) <= 180

const localTimePattern = /^((?:[01]\d|2[0-3]):[0-5]\d)(?::[0-5]\d(?:\.\d{1,9})?)?$/

// GET /api/gps/buses/{busId}/route 응답 → 화면용 노선
// - stations: 정류장 (순서대로, 좌표 없는 정류장은 뺀다)
// - path: 서버가 카카오 모빌리티로 받은 실제 도로 경로 좌표 (첫 정류장 → 마지막 정류장).
//   없거나 2점 미만이면 []이고, 그때는 정류장 사이 직선을 노선으로 쓴다 (routeLine)
export function routeFromResponse(route) {
  const stops = Array.isArray(route?.stops) ? route.stops : []
  const stations = stops
    .filter(isPoint)
    .map((s) => ({
      stopId: s.stopId,
      name: s.stopName ?? '',
      order: s.stopOrder ?? 0,
      latitude: s.latitude,
      longitude: s.longitude,
      status: s.status === 'ARRIVED' || s.status === 'PASSED' ? s.status : 'BEFORE_ARRIVAL',
      scheduledArrivalTime: typeof s.scheduledArrivalTime === 'string'
        ? localTimePattern.exec(s.scheduledArrivalTime)?.[1] ?? null
        : null,
    }))
    .sort((a, b) => a.order - b.order)
  const path = (Array.isArray(route?.path) ? route.path : [])
    .filter(isPoint)
    .map((p) => ({ latitude: p.latitude, longitude: p.longitude }))
  return { routeName: route?.routeName ?? '', stations, path: path.length >= 2 ? path : [] }
}

// 진행·이탈 판정과 지도 선이 따르는 노선 선: 도로 경로가 있으면 도로, 없으면 정류장을 잇는 직선
export function routeLine(stations, path) {
  if (Array.isArray(path) && path.length >= 2) return path
  return (Array.isArray(stations) ? stations : []).map((s) => ({ latitude: s.latitude, longitude: s.longitude }))
}

// 기사 화면 시뮬레이션이 따라 달릴 경로와, 그 경로 위 정류장 위치(출발점에서 잰 거리 m).
// 도로 경로가 있으면 도로를 따라, 없으면 정류장 사이 직선으로 달린다. 정류장이 2개 미만이면 null
export function simulationRouteFromResponse(route) {
  const { stations, path } = routeFromResponse(route)
  if (stations.length < 2) return null
  const line = routeLine(stations, path)
  return { path: line, stopDistances: stopDistancesOnLine(line, stations), onRoad: path.length >= 2 }
}

// 정류장 반경(m). 백엔드 RouteProgressService.ARRIVAL_RADIUS_METER와 같은 값
const ARRIVAL_RADIUS_M = 50
// 노선 이탈 기준(m). 백엔드 RouteProgressService.ROUTE_DEVIATION_METER, RouteDeviationService와 같은 값
export const OFF_ROUTE_M = 100
const EARTH_RADIUS_M = 6371000

// 기준점(origin)에서 본 평면 좌표(m). 구간 하나는 길어야 수백 m라 평면으로 봐도 오차가 작다.
function toLocalXY(origin, p) {
  const rad = Math.PI / 180
  return {
    x: (p.longitude - origin.longitude) * rad * EARTH_RADIUS_M * Math.cos(origin.latitude * rad),
    y: (p.latitude - origin.latitude) * rad * EARTH_RADIUS_M,
  }
}

// 이보다 짧은 구간(m)은 건너뛴다. 백엔드 RoadProjectionService가 길이² < 1e-8인 구간을 건너뛰는 것과 같다
const MIN_SEGMENT_M = 1e-4

// 선(line) 위에서 점 p와 가장 가까운 곳. 백엔드 RoadProjectionService.project와 같은 방식으로,
// 구간마다 수직으로 투영해 가장 가까운 구간을 고른다.
// - along: 선 출발점에서 그 지점까지 선을 따라 잰 거리(m). 단, 가장 가까운 곳이 선의 맨 처음·맨 끝이면
//   연장선으로 재서, 출발점 앞이면 음수, 종점을 지났으면 전체 길이보다 크다
// - offset: 선(구간)까지의 거리(m). 연장선이 아니라 실제 구간까지 잰다
// - point, index, t: 선 위 가장 가까운 지점과, 그 지점이 있는 구간(line[index] → line[index + 1]) 안의 위치(0~1)
function projectOntoLine(line, p) {
  if (!Array.isArray(line) || line.length < 2 || !isPoint(p)) return null
  let start = 0
  let best = null
  let first = -1
  let last = -1
  for (let i = 0; i < line.length - 1; i++) {
    const end = toLocalXY(line[i], line[i + 1])
    const len = Math.hypot(end.x, end.y)
    if (len < MIN_SEGMENT_M) continue
    if (first === -1) first = i
    last = i
    const pos = toLocalXY(line[i], p)
    const rawT = (pos.x * end.x + pos.y * end.y) / (len * len)
    const t = Math.min(1, Math.max(0, rawT))
    const offset = Math.hypot(pos.x - end.x * t, pos.y - end.y * t)
    if (!best || offset < best.offset) best = { i, rawT, t, len, start, offset }
    start += len
  }
  if (!best) return null
  let along = best.start + best.t * best.len
  if (best.i === first && best.rawT < 0) along = best.rawT * best.len
  if (best.i === last && best.rawT > 1) along = best.start + best.rawT * best.len
  const from = line[best.i]
  const to = line[best.i + 1]
  return {
    along,
    offset: best.offset,
    point: {
      latitude: from.latitude + (to.latitude - from.latitude) * best.t,
      longitude: from.longitude + (to.longitude - from.longitude) * best.t,
    },
    index: best.i,
    t: best.t,
  }
}

// 정류장마다 노선 선 위 위치(선 출발점에서 잰 거리 m). 백엔드도 정류장을 도로에 투영해 순서를 비교한다
function stopDistancesOnLine(line, stations) {
  return stations.map((s) => projectOntoLine(line, s)?.along ?? 0)
}

// 노선 위 진행 거리: 버스 위치를 노선 선(도로 경로, 없으면 정류장 사이 직선)에 투영해 출발점에서 몇 m 왔는지 구한다.
// - along: 음수면 출발점 앞, 노선 전체 길이보다 크면 종점을 지난 것
// - stopDistances: 정류장마다 같은 선 위 위치. along과 비교해 지나온 정류장을 가린다
// - offRoute: 노선 선까지의 거리(m)
// - point, index, t: 노선 위에서 버스와 가장 가까운 지점 (지도 선을 나누는 곳)
export function progressAlongRoute(stations, bus, path = null) {
  if (!Array.isArray(stations) || stations.length < 2 || !isPoint(bus)) return null
  const line = routeLine(stations, path)
  const projected = projectOntoLine(line, bus)
  if (!projected) return null
  return {
    along: projected.along,
    stopDistances: stopDistancesOnLine(line, stations),
    offRoute: projected.offset,
    point: projected.point,
    index: projected.index,
    t: projected.t,
  }
}

// 버스가 노선에서 OFF_ROUTE_M보다 멀리 떨어져 있으면 그 거리(m), 아니면 null
export function offRouteMeters(progress) {
  return progress && progress.offRoute > OFF_ROUTE_M ? progress.offRoute : null
}

// 버스 위치가 바뀔 때마다 서버에 다시 묻지 않고 정류장 상태를 갱신한다. (백엔드 RouteProgressService와 같은 규칙)
// - 노선(도로 경로)에서 100m 넘게 벗어나 있으면 진행 거리를 믿을 수 없으므로 어떤 정류장도 통과로 보지 않는다
// - 50m 이내 → ARRIVED, 노선 위 진행 거리로 이미 지나온 정류장 → PASSED, 나머지 → BEFORE_ARRIVAL
// 백엔드와 다른 점 하나: 버스가 노선 끝을 지나 있으면 마지막 정류장도 통과로 본다 (백엔드는 끝에서 멈춰 '도착 전'으로 남는다)
export function progressStatuses(stations, bus, path = null) {
  if (!Array.isArray(stations) || stations.length === 0) return []
  if (!isPoint(bus)) return stations
  const progress = progressAlongRoute(stations, bus, path)
  const offRoute = offRouteMeters(progress) !== null
  return stations.map((s, i) => {
    if (offRoute) return { ...s, status: 'BEFORE_ARRIVAL' }
    if (distanceMeters(bus, s) <= ARRIVAL_RADIUS_M) return { ...s, status: 'ARRIVED' }
    if (progress && progress.stopDistances[i] < progress.along) return { ...s, status: 'PASSED' }
    return { ...s, status: 'BEFORE_ARRIVAL' }
  })
}

// 거리 표시: 1km 미만은 10m 단위, 그 이상은 0.1km 단위
export function formatDistance(meters) {
  if (!isFiniteNumber(meters) || meters < 0) return '-'
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

// 상단 바 오른쪽 문구: 정류장에 있으면 'stop-B 도착', 아니면 다음 정류장과 노선 위 남은 거리.
// stations는 progressStatuses 결과, progress는 같은 정류장 순서로 구한 progressAlongRoute 결과
export function describeNextStop(stations, progress) {
  if (!Array.isArray(stations) || stations.length === 0) return null
  const arrived = stations.find((s) => s.status === 'ARRIVED')
  if (arrived) return `${arrived.name} 도착`
  if (!progress || offRouteMeters(progress) !== null) return null
  const nextIndex = stations.findIndex((s) => s.status === 'BEFORE_ARRIVAL')
  if (nextIndex === -1) return '마지막 정류장 통과'
  const remaining = progress.stopDistances[nextIndex] - progress.along
  return `다음 정류장 ${stations[nextIndex].name} · 약 ${formatDistance(Math.max(0, remaining))}`
}

// 위치 신호 끊김 안내 문구. 서버가 마지막 위치를 10분 보관하므로 그 뒤에는 운행 종료 가능성을 알린다
export function describeSignalLoss(seconds) {
  if (!isFiniteNumber(seconds)) return null
  if (seconds >= 600) return '10분 넘게 위치 신호가 없어요. 운행이 끝났을 수 있어요'
  const elapsed = seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분`
  return `위치 신호가 ${elapsed}째 없어요. 마지막 위치를 보여드려요`
}

// 위치 신호 끊김: 마지막 수신이 thresholdMs보다 오래됐으면 지난 초, 아니면 null
export function signalLostSeconds(updatedAt, now = Date.now(), thresholdMs = 30_000) {
  if (!updatedAt) return null
  const t = new Date(updatedAt).getTime()
  if (!Number.isFinite(t)) return null
  const elapsed = now - t
  return elapsed > thresholdMs ? Math.floor(elapsed / 1000) : null
}

// 노선 선을 at(projectOntoLine 결과) 지점에서 둘로 나눈다. 두 선은 나누는 지점을 함께 가진다
function splitLine(line, { index, t, point }) {
  return {
    passed: t > 0 ? [...line.slice(0, index + 1), point] : line.slice(0, index + 1),
    remaining: t < 1 ? [point, ...line.slice(index + 1)] : line.slice(index + 1),
  }
}

// 지도에 그릴 선: 지나온 구간(회색)과 남은 구간(파랑). 선은 항상 노선(도로 경로, 없으면 정류장 사이 직선) 위에만 그리고,
// 버스와 가장 가까운 노선 위 지점에서 나눈다. 버스가 노선을 벗어나 있으면 버스 쪽으로 선을 잇지 않는다.
// 버스 위치를 모르거나 노선을 벗어나 있으면 마지막으로 지난 정류장에서 나눈다 (없으면 전체가 남은 구간)
export function routePaths(stations, bus, path = null) {
  const list = Array.isArray(stations) ? stations : []
  const line = routeLine(list, path)
  if (line.length < 2) return { passed: [], remaining: line }
  const progress = isPoint(bus) ? progressAlongRoute(list, bus, path) : null
  let at = progress && offRouteMeters(progress) === null ? progress : null
  if (!at) {
    const lastPassed = list.filter((s) => s.status === 'PASSED').pop()
    at = lastPassed ? projectOntoLine(line, lastPassed) : null
  }
  return at ? splitLine(line, at) : { passed: [], remaining: line }
}
