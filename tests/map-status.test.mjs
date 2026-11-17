import test from 'node:test'
import assert from 'node:assert/strict'
import {
  todayString, timeOfDay, updatedAgo, latestRecord, rideState, describeRide, attendanceToast,
  findChildEta, delayNotice, locationErrorMessage, routeFromResponse, progressStatuses, routePaths,
  simulationPathFromRoute, progressAlongRoute, offRouteMeters, OFF_ROUTE_M, formatDistance,
  describeNextStop, signalLostSeconds, describeSignalLoss,
} from '../src/utils/mapStatus.js'
import { distanceMeters } from '../src/utils/gpsTracking.js'

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} expected ${expected}±${tol}, got ${actual}`)

const board = (studentId, timestamp) => ({ studentId, eventType: 'BOARD', timestamp, studentName: '테스트학생' })
const exit = (studentId, timestamp) => ({ studentId, eventType: 'EXIT', timestamp, studentName: '테스트학생' })

test('날짜·시각 표시', () => {
  assert.equal(todayString(new Date(2026, 10, 6)), '2026-11-06')
  assert.equal(timeOfDay('2026-11-16T08:12:33.123456'), '08:12')
  assert.equal(timeOfDay(null), null)
  const now = new Date('2026-11-16T15:30:00').getTime()
  assert.equal(updatedAgo('2026-11-16T15:29:55', now), '방금 전')
  assert.equal(updatedAgo('2026-11-16T15:29:30', now), '30초 전')
  assert.equal(updatedAgo('2026-11-16T15:27:00', now), '3분 전')
  assert.equal(updatedAgo(null, now), '-')
  assert.equal(updatedAgo('잘못된 값', now), '-')
})

test('가장 최근 출결은 순서가 아니라 시각으로 고른다', () => {
  const records = [exit(1, '2026-11-16T08:31:00'), board(1, '2026-11-16T08:12:00'), board(2, '2026-11-16T09:00:00')]
  assert.equal(latestRecord(records, 1).eventType, 'EXIT')
  assert.equal(latestRecord(records, '2').eventType, 'BOARD')
  assert.equal(latestRecord(records, 3), null)
})

test('탑승 상태: 204(탑승 중 아님)만으로는 하차 완료라고 하지 않는다', () => {
  assert.deepEqual(rideState({ records: null, studentId: 1, onBoard: false }), { state: 'unknown', at: null })
  assert.deepEqual(rideState({ records: [], studentId: 1, onBoard: false }), { state: 'waiting', at: null })
  assert.deepEqual(rideState({ records: [], studentId: 1, onBoard: null }), { state: 'waiting', at: null })
})

test('탑승 상태: 출결 기록이 있으면 기록대로', () => {
  assert.deepEqual(rideState({ records: [board(1, '2026-11-16T08:12:00')], studentId: 1 }),
    { state: 'onboard', at: '2026-11-16T08:12:00' })
  assert.deepEqual(rideState({ records: [board(1, '2026-11-16T08:12:00'), exit(1, '2026-11-16T08:31:00')], studentId: 1 }),
    { state: 'dropped', at: '2026-11-16T08:31:00' })
  // 다른 자녀 기록은 무시
  assert.equal(rideState({ records: [exit(2, '2026-11-16T08:31:00')], studentId: 1 }).state, 'waiting')
  // 출결 조회 실패여도 탑승 위치가 잡히면 탑승 중
  assert.equal(rideState({ records: null, studentId: 1, onBoard: true }).state, 'onboard')
})

test('탑승 상태 문구', () => {
  assert.deepEqual(describeRide({ state: 'onboard', at: '2026-11-16T08:12:00' }, '민준'), { tone: 'info', text: '민준 탑승 중 (08:12 탑승)' })
  assert.deepEqual(describeRide({ state: 'dropped', at: '2026-11-16T08:31:00' }, '민준'), { tone: 'success', text: '민준 하차 완료 (08:31)' })
  assert.equal(describeRide({ state: 'waiting' }, null).text, '우리 아이 아직 탑승 전이에요')
  assert.equal(describeRide({ state: 'unknown' }, '민준').text, '탑승 정보를 확인할 수 없어요')
})

test('실시간 승하차 안내 문구', () => {
  assert.equal(attendanceToast(board(1, '2026-11-16T08:12:00')), '테스트학생 탑승했어요 (08:12)')
  assert.equal(attendanceToast(exit(1, '2026-11-16T08:31:00')), '테스트학생 하차했어요 (08:31)')
  assert.equal(attendanceToast({ eventType: 'OTHER' }), null)
  assert.equal(attendanceToast(null), null)
})

test('지연 안내는 내 아이 ETA 기준', () => {
  const etas = [
    { studentId: 2, stopId: 9, etaMinutes: 3, delayMinutes: 9, lateRisk: true, delayReason: '교통 혼잡 또는 정차 지연' },
    { studentId: 1, stopId: 4, etaMinutes: 7, delayMinutes: 0, lateRisk: false, delayReason: '정상 운행' },
  ]
  const mine = findChildEta(etas, '1')
  assert.equal(mine.stopId, 4)
  assert.equal(delayNotice(mine), null)
  assert.deepEqual(delayNotice(findChildEta(etas, 2)), { level: 'danger', text: '도착이 약 9분 늦어질 것 같아요 (교통 혼잡 또는 정차 지연)' })
  assert.deepEqual(delayNotice({ delayMinutes: 3, lateRisk: false, delayReason: '약간 지연' }), { level: 'warn', text: '도착이 3분 정도 늦어지고 있어요' })
  assert.equal(findChildEta(null, 1), null)
  assert.equal(delayNotice(null), null)
})

test('오류 안내는 서버 오류 코드별로', () => {
  const res = (code, status) => ({ response: { status, data: { success: false, code } } })
  assert.equal(locationErrorMessage(res('BUS_002', 400)), '지금은 운행 시간이 아니에요')
  assert.equal(locationErrorMessage(res('GPS_001', 404)), '버스 위치를 아직 받지 못했어요')
  assert.equal(locationErrorMessage(res('BUS_001', 404)), '배정된 버스 정보를 찾을 수 없어요')
  assert.equal(locationErrorMessage({ request: {} }), '서버에 연결할 수 없어요. 잠시 후 다시 시도할게요')
  assert.equal(locationErrorMessage(res(undefined, 500)), '버스 정보를 불러오지 못했어요')
})

// 대구 중구(시청 부근) 좌표로 만든 예시 노선 (정류장 간격 약 150m)
const routeResponse = {
  routeName: '1호차',
  stops: [
    { stopId: 12, stopName: '푸르지오', stopOrder: 2, latitude: 35.8725, longitude: 128.6025, status: 'BEFORE_ARRIVAL' },
    { stopId: 11, stopName: '유치원', stopOrder: 1, latitude: 35.8714, longitude: 128.6014, status: 'PASSED' },
    { stopId: 13, stopName: '계양네거리', stopOrder: 3, latitude: 35.8738, longitude: 128.6035, status: 'BEFORE_ARRIVAL' },
    { stopId: 99, stopName: '좌표 없음', stopOrder: 4, latitude: null, longitude: 128.6, status: 'BEFORE_ARRIVAL' },
  ],
}

test('노선 응답은 순서대로 정렬하고 좌표 없는 정류장은 뺀다', () => {
  const { routeName, stations } = routeFromResponse(routeResponse)
  assert.equal(routeName, '1호차')
  assert.deepEqual(stations.map((s) => s.stopId), [11, 12, 13])
  assert.equal(stations[0].status, 'PASSED')
  assert.deepEqual(routeFromResponse(null).stations, [])
})

test('시뮬레이션 경로는 서버 노선 정류장 순서대로, 정류장이 2개 미만이면 null', () => {
  // 운영 서버 1번 버스 테스트 노선(test-route)과 같은 모양
  const testRoute = {
    routeName: 'test-route',
    stops: [
      { stopId: 2, stopName: 'stop-B', stopOrder: 2, latitude: 35.85, longitude: 128.62, status: 'BEFORE_ARRIVAL' },
      { stopId: 1, stopName: 'stop-A', stopOrder: 1, latitude: 35.8468, longitude: 128.6132, status: 'PASSED' },
    ],
  }
  assert.deepEqual(simulationPathFromRoute(testRoute), [
    { latitude: 35.8468, longitude: 128.6132 },
    { latitude: 35.85, longitude: 128.62 },
  ])
  assert.equal(simulationPathFromRoute({ stops: [testRoute.stops[0]] }), null)
  assert.equal(simulationPathFromRoute(null), null)
})

// 운영 서버 1번 버스 테스트 노선 (stop-A → stop-B, 약 709m)
const STOP_A = { latitude: 35.8468, longitude: 128.6132 }
const STOP_B = { latitude: 35.85, longitude: 128.62 }
const testRouteStations = routeFromResponse({
  stops: [
    { stopId: 1, stopName: 'stop-A', stopOrder: 1, ...STOP_A, status: 'BEFORE_ARRIVAL' },
    { stopId: 2, stopName: 'stop-B', stopOrder: 2, ...STOP_B, status: 'BEFORE_ARRIVAL' },
  ],
}).stations
// stop-A에서 stop-B 쪽으로 meters만큼 간 지점 (직선 위)
const busAt = (meters) => {
  const t = Math.min(1, meters / distanceMeters(STOP_A, STOP_B))
  return {
    latitude: STOP_A.latitude + (STOP_B.latitude - STOP_A.latitude) * t,
    longitude: STOP_A.longitude + (STOP_B.longitude - STOP_A.longitude) * t,
  }
}

test('정류장을 떠나 반경 50m를 벗어나면 바로 통과로 바뀐다 (중간 지점까지 기다리지 않음)', () => {
  const statuses = (m) => progressStatuses(testRouteStations, busAt(m)).map((s) => s.status)
  assert.deepEqual(statuses(0), ['ARRIVED', 'BEFORE_ARRIVAL'])
  assert.deepEqual(statuses(44), ['ARRIVED', 'BEFORE_ARRIVAL'])
  // 화면 캡처 상황: A에서 약 1/3 지점. 예전 규칙(가장 가까운 정류장)에서는 A가 '대기'로 돌아갔다
  assert.deepEqual(statuses(93), ['PASSED', 'BEFORE_ARRIVAL'])
  assert.deepEqual(statuses(240), ['PASSED', 'BEFORE_ARRIVAL'])
  assert.deepEqual(statuses(650), ['PASSED', 'BEFORE_ARRIVAL']) // B까지 약 59m
  assert.deepEqual(statuses(660), ['PASSED', 'ARRIVED']) // B까지 약 49m (반경 50m 안)
  assert.deepEqual(statuses(709), ['PASSED', 'ARRIVED'])
})

test('노선 위 진행 거리: 출발 전, 노선 위, 종점 너머', () => {
  const total = progressAlongRoute(testRouteStations, STOP_B).stopDistances[1]
  near(total, 709, 2)
  near(progressAlongRoute(testRouteStations, busAt(300)).along, 300, 2)
  // 노선에서 옆으로 비켜나 있어도 진행 거리는 선 위로 투영해서 잰다
  const beside = { latitude: busAt(300).latitude + 0.0003, longitude: busAt(300).longitude - 0.0003 }
  const p = progressAlongRoute(testRouteStations, beside)
  assert.ok(p.offRoute > 30)
  // 출발 정류장 반대쪽으로 80m 떨어져 있으면 A는 아직 대기, 종점 너머 80m면 B는 통과
  const before = { latitude: STOP_A.latitude - 0.00072 * 0.45, longitude: STOP_A.longitude - 0.00072 * 0.95 }
  assert.ok(progressAlongRoute(testRouteStations, before).along < 0)
  assert.deepEqual(progressStatuses(testRouteStations, before).map((s) => s.status), ['BEFORE_ARRIVAL', 'BEFORE_ARRIVAL'])
  const beyond = { latitude: STOP_B.latitude + 0.00072 * 0.45, longitude: STOP_B.longitude + 0.00072 * 0.95 }
  assert.deepEqual(progressStatuses(testRouteStations, beyond).map((s) => s.status), ['PASSED', 'PASSED'])
  // 정류장이 하나뿐이면 진행 거리 없이 도착 여부만
  assert.equal(progressAlongRoute(testRouteStations.slice(0, 1), STOP_A), null)
  assert.deepEqual(progressStatuses(testRouteStations.slice(0, 1), STOP_A).map((s) => s.status), ['ARRIVED'])
})

test('노선에서 100m 넘게 벗어나면 어떤 정류장도 통과로 보지 않는다 (백엔드와 같은 규칙)', () => {
  assert.equal(OFF_ROUTE_M, 100)
  const mid = busAt(300)
  // 노선 방향에 수직으로 비켜난 지점 (stop-A→B 방향을 90° 돌린 방향)
  const beside = (meters) => {
    const dLat = STOP_B.latitude - STOP_A.latitude, dLng = STOP_B.longitude - STOP_A.longitude
    const len = distanceMeters(STOP_A, STOP_B)
    return { latitude: mid.latitude + (dLng * Math.cos(STOP_A.latitude * Math.PI / 180)) * meters / len,
      longitude: mid.longitude - (dLat / Math.cos(STOP_A.latitude * Math.PI / 180)) * meters / len }
  }
  const status = (bus) => progressStatuses(testRouteStations, bus).map((s) => s.status)
  near(progressAlongRoute(testRouteStations, beside(90)).offRoute, 90, 3)
  assert.deepEqual(status(beside(90)), ['PASSED', 'BEFORE_ARRIVAL'], '90m 옆은 노선 위로 본다')
  assert.equal(offRouteMeters(progressAlongRoute(testRouteStations, beside(90))), null)
  assert.deepEqual(status(beside(150)), ['BEFORE_ARRIVAL', 'BEFORE_ARRIVAL'], '150m 옆은 이탈')
  near(offRouteMeters(progressAlongRoute(testRouteStations, beside(150))), 150, 3)
  // 어제 화면 캡처 상황: 노선에서 약 3km 떨어진 버스 → 예전에는 둘 다 '통과'였다
  const far = { latitude: 35.8745, longitude: 128.6041 }
  assert.deepEqual(status(far), ['BEFORE_ARRIVAL', 'BEFORE_ARRIVAL'])
  assert.ok(offRouteMeters(progressAlongRoute(testRouteStations, far)) > 3000)
})

test('상단 바 문구: 정류장 도착 또는 다음 정류장까지 노선 위 남은 거리', () => {
  const describe = (bus) => describeNextStop(progressStatuses(testRouteStations, bus), progressAlongRoute(testRouteStations, bus))
  assert.equal(describe(busAt(0)), 'stop-A 도착')
  assert.equal(describe(busAt(93)), '다음 정류장 stop-B · 약 620m') // 709 - 93 = 616m
  assert.equal(describe(busAt(680)), 'stop-B 도착')
  assert.equal(describe({ latitude: 35.8745, longitude: 128.6041 }), null, '노선 이탈 중에는 다음 정류장을 말하지 않는다')
  const beyond = { latitude: STOP_B.latitude + 0.00072 * 0.45, longitude: STOP_B.longitude + 0.00072 * 0.95 }
  assert.equal(describe(beyond), '마지막 정류장 통과')
  assert.equal(describeNextStop([], null), null)
})

test('거리 표시', () => {
  assert.equal(formatDistance(616), '620m')
  assert.equal(formatDistance(3), '10m')
  assert.equal(formatDistance(1234), '1.2km')
  assert.equal(formatDistance(3081), '3.1km')
  assert.equal(formatDistance(null), '-')
})

test('위치 신호 끊김: 30초 넘게 수신이 없으면 안내, 10분이 넘으면 운행 종료 가능성', () => {
  const now = new Date('2026-11-17T12:00:00').getTime()
  assert.equal(signalLostSeconds('2026-11-17T11:59:35', now), null, '25초는 정상 (5초 주기 + 여유)')
  assert.equal(signalLostSeconds('2026-11-17T11:59:15', now), 45)
  assert.equal(signalLostSeconds(null, now), null)
  assert.equal(describeSignalLoss(45), '위치 신호가 45초째 없어요. 마지막 위치를 보여드려요')
  assert.equal(describeSignalLoss(125), '위치 신호가 2분째 없어요. 마지막 위치를 보여드려요')
  assert.equal(describeSignalLoss(700), '10분 넘게 위치 신호가 없어요. 운행이 끝났을 수 있어요')
  assert.equal(describeSignalLoss(null), null)
})

test('정류장 상태 갱신: 정류장 근처는 도착, 지나온 정류장은 통과', () => {
  const { stations } = routeFromResponse(routeResponse)
  // 두 번째 정류장(푸르지오) 바로 옆 (약 10m)
  const atSecond = progressStatuses(stations, { latitude: 35.87259, longitude: 128.6025 })
  assert.deepEqual(atSecond.map((s) => s.status), ['PASSED', 'ARRIVED', 'BEFORE_ARRIVAL'])
  // 두 번째와 세 번째 사이, 세 번째에 더 가까움 (어느 정류장과도 50m 넘게 떨어짐)
  const between = progressStatuses(stations, { latitude: 35.8734, longitude: 128.6032 })
  assert.deepEqual(between.map((s) => s.status), ['PASSED', 'PASSED', 'BEFORE_ARRIVAL'])
  // 버스 위치가 없으면 서버가 준 상태 그대로
  assert.equal(progressStatuses(stations, null), stations)
  assert.deepEqual(progressStatuses([], { latitude: 1, longitude: 1 }), [])
})

test('지도 선: 노선 위 지점에서 나뉘고, 버스 쪽으로 선을 잇지 않는다', () => {
  const raw = routeFromResponse(routeResponse).stations
  const bus = { latitude: 35.8734, longitude: 128.6032 }
  const stations = progressStatuses(raw, bus)
  const { passed, remaining } = routePaths(stations, bus)
  assert.equal(passed.length, 3) // 유치원, 푸르지오, 나뉘는 지점
  assert.equal(remaining.length, 2) // 나뉘는 지점, 계양네거리
  const split = passed[passed.length - 1]
  assert.deepEqual(remaining[0], split)
  // 나뉘는 지점은 버스가 아니라 노선(푸르지오~계양네거리 선) 위에 있다
  const p = progressAlongRoute(raw, bus)
  near(distanceMeters(split, bus), p.offRoute, 1)
  near(distanceMeters(raw[1], split) + distanceMeters(split, raw[2]), distanceMeters(raw[1], raw[2]), 0.5)

  // 노선에서 멀리 벗어나 있으면 지나온 구간 없이 노선 전체를 남은 구간으로 그린다
  const far = { latitude: 35.8745 + 0.02, longitude: 128.6041 }
  const offPaths = routePaths(progressStatuses(raw, far), far)
  assert.deepEqual(offPaths.passed, [])
  assert.equal(offPaths.remaining.length, 3)

  const before = routePaths(routeFromResponse(routeResponse).stations, null)
  assert.equal(before.passed.length, 1)
  assert.deepEqual(before.remaining[0], before.passed[0], '버스 위치가 없으면 마지막으로 지난 정류장에서 이어진다')
  assert.deepEqual(routePaths([], null), { passed: [], remaining: [] })
})
