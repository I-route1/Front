import test from 'node:test'
import assert from 'node:assert/strict'
import {
  todayString, timeOfDay, updatedAgo, latestRecord, rideState, describeRide, attendanceToast,
  findChildEta, delayNotice, locationErrorMessage, routeFromResponse, progressStatuses, routePaths,
  simulationRouteFromResponse, routeLine, progressAlongRoute, offRouteMeters, OFF_ROUTE_M, formatDistance,
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

test('예정 시각은 유효한 정류장에만 분 단위로 표시된다', () => {
  const { stations, path } = routeFromResponse({
    ...routeResponse,
    stops: [
      { ...routeResponse.stops[0], scheduledArrivalTime: '18:02:00' },
      routeResponse.stops[1],
      { ...routeResponse.stops[2], scheduledArrivalTime: '25:10' },
    ],
  })
  assert.deepEqual(progressStatuses(stations, null, path).map((stop) => stop.scheduledArrivalTime), [null, '18:02', null])
})

test('시뮬레이션 경로: 도로 경로가 없으면 정류장 순서대로 직선, 정류장이 2개 미만이면 null', () => {
  // 운영 서버 1번 버스 테스트 노선(test-route)과 같은 모양
  const testRoute = {
    routeName: 'test-route',
    stops: [
      { stopId: 2, stopName: 'stop-B', stopOrder: 2, latitude: 35.85, longitude: 128.62, status: 'BEFORE_ARRIVAL' },
      { stopId: 1, stopName: 'stop-A', stopOrder: 1, latitude: 35.8468, longitude: 128.6132, status: 'PASSED' },
    ],
  }
  const sim = simulationRouteFromResponse(testRoute)
  assert.deepEqual(sim.path, [
    { latitude: 35.8468, longitude: 128.6132 },
    { latitude: 35.85, longitude: 128.62 },
  ])
  assert.equal(sim.onRoad, false)
  assert.equal(sim.stopDistances[0], 0)
  near(sim.stopDistances[1], 709, 2)
  assert.equal(simulationRouteFromResponse({ stops: [testRoute.stops[0]] }), null)
  assert.equal(simulationRouteFromResponse(null), null)
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
  assert.equal(formatDistance(996), '1.0km', '10m 단위로 올려 1000m가 되면 km로')
  assert.equal(formatDistance(994), '990m')
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

// ---- 도로 경로(path) ----

// 운영 서버 1번 버스 노선의 실제 도로 경로 (GET /api/gps/buses/1/route의 path, 2026-11-19).
// 도로 길이 약 1,005m, 정류장 사이 직선 709m. 도로가 직선에서 최대 약 167m 벗어난다
const ROAD = [
  [35.8468026, 128.6131608], [35.8468206, 128.613172], [35.8468476, 128.6131722],
  [35.8469827, 128.6131843], [35.8469632, 128.6134831], [35.8469254, 128.613826],
  [35.8468753, 128.6148109], [35.8468462, 128.6152092], [35.8467391, 128.6167693],
  [35.8470816, 128.6167719], [35.8474061, 128.6167634], [35.8481452, 128.616758],
  [35.8488212, 128.6167632], [35.8494611, 128.6167682], [35.8494308, 128.617399],
  [35.8494109, 128.6177642], [35.8497354, 128.6177667], [35.8500057, 128.6177799],
  [35.8500237, 128.6177911], [35.8500594, 128.6178578], [35.850068, 128.6179243],
  [35.8500393, 128.6182451], [35.8499419, 128.6196725], [35.8499132, 128.6199822],
].map(([latitude, longitude]) => ({ latitude, longitude }))
const roadRoute = routeFromResponse({
  stops: [
    { stopId: 1, stopName: 'stop-A', stopOrder: 1, ...STOP_A, status: 'BEFORE_ARRIVAL' },
    { stopId: 2, stopName: 'stop-B', stopOrder: 2, ...STOP_B, status: 'BEFORE_ARRIVAL' },
  ],
  path: ROAD,
})
// 도로를 따라 meters만큼 간 지점
const onRoad = (meters) => {
  let left = meters
  for (let i = 0; i < ROAD.length - 1; i++) {
    const len = distanceMeters(ROAD[i], ROAD[i + 1])
    if (left <= len) {
      const t = len > 0 ? left / len : 0
      return {
        latitude: ROAD[i].latitude + (ROAD[i + 1].latitude - ROAD[i].latitude) * t,
        longitude: ROAD[i].longitude + (ROAD[i + 1].longitude - ROAD[i].longitude) * t,
      }
    }
    left -= len
  }
  return ROAD[ROAD.length - 1]
}
const ROAD_LENGTH = ROAD.slice(1).reduce((sum, p, i) => sum + distanceMeters(ROAD[i], p), 0)

test('노선 응답의 도로 경로: 좌표가 이상한 점은 빼고, 2점 미만이면 없는 것으로 본다', () => {
  assert.equal(roadRoute.path.length, 24)
  near(ROAD_LENGTH, 1005, 3)
  const mixed = routeFromResponse({ stops: [], path: [ROAD[0], { latitude: null, longitude: 1 }, { latitude: 200, longitude: 1 }, ROAD[1]] })
  assert.deepEqual(mixed.path, [ROAD[0], ROAD[1]])
  assert.deepEqual(routeFromResponse({ stops: [], path: [ROAD[0]] }).path, [])
  assert.deepEqual(routeFromResponse({ stops: [] }).path, [], '예전 서버처럼 path가 없어도 된다')
  assert.equal(routeLine(roadRoute.stations, roadRoute.path), roadRoute.path)
  assert.deepEqual(routeLine(roadRoute.stations, []), [STOP_A, STOP_B], '도로 경로가 없으면 정류장 사이 직선')
})

test('도로를 따라 달리면 어디서도 노선 이탈이 아니다 (직선 기준이면 일부 구간이 이탈로 잡혔다)', () => {
  let straightOff = 0
  let lastAlong = -Infinity
  for (let m = 0; m <= ROAD_LENGTH; m += 10) {
    const bus = onRoad(m)
    const p = progressAlongRoute(roadRoute.stations, bus, roadRoute.path)
    assert.ok(p.offRoute < 1, `${m}m 지점이 도로에서 ${p.offRoute}m`)
    assert.ok(p.along >= lastAlong - 0.5, `${m}m 지점에서 진행 거리가 줄었다`)
    lastAlong = p.along
    if (offRouteMeters(progressAlongRoute(roadRoute.stations, bus)) !== null) straightOff++
  }
  assert.ok(straightOff > 10, `직선 기준으로는 ${straightOff}개 지점이 이탈로 잡힌다`)
})

test('도로 기준 정류장 상태와 남은 거리', () => {
  const statuses = (m) => progressStatuses(roadRoute.stations, onRoad(m), roadRoute.path).map((s) => s.status)
  const describe = (m) => describeNextStop(
    progressStatuses(roadRoute.stations, onRoad(m), roadRoute.path),
    progressAlongRoute(roadRoute.stations, onRoad(m), roadRoute.path),
  )
  assert.deepEqual(statuses(0), ['ARRIVED', 'BEFORE_ARRIVAL'])
  assert.deepEqual(statuses(100), ['PASSED', 'BEFORE_ARRIVAL'])
  // 도로가 직선에서 가장 멀리(약 167m) 벗어난 꺾이는 곳. 직선 기준이었다면 여기서 '노선 이탈'이었다
  assert.deepEqual(statuses(345), ['PASSED', 'BEFORE_ARRIVAL'])
  assert.ok(offRouteMeters(progressAlongRoute(roadRoute.stations, onRoad(345))) > 150)
  assert.deepEqual(statuses(ROAD_LENGTH - 20), ['PASSED', 'ARRIVED'])
  // 남은 거리는 직선이 아니라 도로를 따라 잰다: 100m 지점이면 도로로 약 900m 남았다 (직선이면 약 610m)
  const p = progressAlongRoute(roadRoute.stations, onRoad(100), roadRoute.path)
  near(p.stopDistances[1] - p.along, ROAD_LENGTH - 100, 15)
  assert.equal(describe(100), `다음 정류장 stop-B · 약 ${formatDistance(p.stopDistances[1] - p.along)}`)
  assert.match(describe(100), /약 (8|9)\d0m/)
})

test('도로 기준 노선 이탈: 정류장 사이 직선 위라도 도로에서 100m 넘게 떨어져 있으면 이탈', () => {
  const mid = busAt(250) // 정류장 사이 직선 위, 도로에서 약 105m (직선 위에서 도로와 가장 먼 곳)
  const road = progressAlongRoute(roadRoute.stations, mid, roadRoute.path)
  assert.ok(road.offRoute > OFF_ROUTE_M, `도로에서 ${road.offRoute}m`)
  assert.deepEqual(progressStatuses(roadRoute.stations, mid, roadRoute.path).map((s) => s.status), ['BEFORE_ARRIVAL', 'BEFORE_ARRIVAL'])
  assert.equal(offRouteMeters(progressAlongRoute(roadRoute.stations, mid)), null, '직선 기준으로는 노선 위')
})

test('지도 선: 도로 경로를 따라 그리고, 도로 위 지점에서 나눈다', () => {
  const bus = onRoad(500)
  const stations = progressStatuses(roadRoute.stations, bus, roadRoute.path)
  const { passed, remaining } = routePaths(stations, bus, roadRoute.path)
  assert.ok(passed.length > 5 && remaining.length > 5, '꺾이는 점들을 그대로 따라간다')
  assert.equal(passed.length + remaining.length, ROAD.length + 2, '나누는 지점이 양쪽에 한 번씩 들어간다')
  assert.deepEqual(passed[0], ROAD[0])
  assert.deepEqual(remaining[remaining.length - 1], ROAD[ROAD.length - 1])
  assert.deepEqual(passed[passed.length - 1], remaining[0])
  assert.ok(distanceMeters(remaining[0], bus) < 1)

  // 버스 위치를 모르면(운행 전) 도로 전체가 남은 구간
  const idle = routePaths(roadRoute.stations, null, roadRoute.path)
  assert.deepEqual(idle, { passed: [], remaining: roadRoute.path })
  // 도로에서 멀리 벗어나 있으면 지나온 구간 없이 도로 전체를 남은 구간으로
  const far = { latitude: 35.8745, longitude: 128.6041 }
  const off = routePaths(progressStatuses(roadRoute.stations, far, roadRoute.path), far, roadRoute.path)
  assert.deepEqual(off, { passed: [], remaining: roadRoute.path })
})

test('시뮬레이션 경로: 도로 경로가 있으면 도로를 따라, 정류장 위치는 도로 위에서 잰다', () => {
  const sim = simulationRouteFromResponse({
    stops: [
      { stopId: 2, stopName: 'stop-B', stopOrder: 2, ...STOP_B },
      { stopId: 1, stopName: 'stop-A', stopOrder: 1, ...STOP_A },
    ],
    path: ROAD,
  })
  assert.equal(sim.onRoad, true)
  assert.equal(sim.path.length, 24)
  assert.equal(sim.stopDistances.length, 2, '도로의 꺾이는 점은 정류장이 아니다')
  near(sim.stopDistances[0], 0, 5)
  near(sim.stopDistances[1], ROAD_LENGTH, 15)
})
