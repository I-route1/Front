import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MS_TO_KMH, msToKmh, formatKmh, distanceMeters, bearingDegrees, normalizeHeading,
  estimateSpeedMs, fixFromPosition, createFixTracker, MIN_ESTIMATE_BASELINE_MS,
  buildGpsPayload, simulatedSpeedMs, simulateFix, pathStopDistances, simulationSpeedAt,
  SIMULATION_STOP_ZONE_M, SIMULATION_STOP_ZONE_SPEED_MS, isFixStale, fixAgeMs, STALE_FIX_MS,
} from '../src/utils/gpsTracking.js'

test('GPS 신호가 끊긴 뒤의 오래된 위치는 다시 보내지 않는다', () => {
  const now = 1_000_000
  const fix = { ...A, speed: 8, timestamp: now - 5_000 }
  assert.equal(fixAgeMs(fix, now), 5_000)
  assert.equal(isFixStale(fix, now), false, '5초 전 위치는 정상')
  assert.equal(STALE_FIX_MS, 30_000)
  assert.equal(isFixStale({ ...fix, timestamp: now - 20_000 }, now), false, '정차 중 갱신이 뜸해도 30초까지는 보낸다')
  assert.equal(isFixStale({ ...fix, timestamp: now - 31_000 }, now), true, '30초 넘게 새 위치가 없으면 멈춘다')
  assert.equal(isFixStale(fix, now, { errorAt: now - 1_000 }), true, '마지막 위치 뒤에 GPS 오류가 났으면 바로 멈춘다')
  assert.equal(isFixStale(fix, now, { errorAt: now - 9_000 }), false, '오류 뒤에 새 위치가 들어왔으면 정상')
  assert.equal(isFixStale(null, now, { errorAt: now }), false)
})

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} expected ${expected}±${tol}, got ${actual}`)

// 기사 화면 임시 시뮬레이션 경로와 같은 좌표 (대구 중구 시청 부근)
const A = { latitude: 35.8714, longitude: 128.6014 }
const B = { latitude: 35.8725, longitude: 128.6025 }

const position = (coords, timestamp) => ({
  coords: { accuracy: 10, speed: null, heading: null, ...coords },
  timestamp,
})

test('속도 단위: m/s × 3.6 = km/h', () => {
  assert.equal(MS_TO_KMH, 3.6)
  assert.equal(msToKmh(10), 36)
  assert.equal(msToKmh(null), null)
  assert.equal(msToKmh(Number.NaN), null)
})

test('km/h 표시는 정수로 반올림하고, 값이 없으면 "-"', () => {
  assert.equal(formatKmh(8.33 * 3.6), '30km/h') // 서버가 ×3.6 한 소수 값
  assert.equal(formatKmh(32.400000000000006), '32km/h')
  assert.equal(formatKmh(59.5), '60km/h')
  assert.equal(formatKmh(0), '0km/h')
  for (const v of [null, undefined, Number.NaN, -1, '32']) assert.equal(formatKmh(v), '-')
})

test('전송 본문은 백엔드 GpsLocationRequest 필드 5개만, 속도는 m/s 그대로', () => {
  const payload = buildGpsPayload('1', { ...A, speed: 8.333, heading: 45 })
  assert.deepEqual(Object.keys(payload).sort(), ['busId', 'heading', 'latitude', 'longitude', 'speed'])
  assert.equal(payload.busId, 1)
  assert.equal(payload.speed, 8.33) // km/h로 바꾸지 않는다 (변환은 서버가 한다)
  assert.equal(payload.heading, 45)
})

test('전송 본문은 백엔드 검증(@NotNull, speed ≥ 0, heading 0~360)을 항상 통과한다', () => {
  const noSpeed = buildGpsPayload(1, { ...A, speed: null, heading: null })
  assert.equal(noSpeed.speed, 0)
  assert.equal(noSpeed.heading, 0)
  assert.equal(buildGpsPayload(1, { ...A, speed: -3, heading: 360 }).speed, 0)
  assert.equal(buildGpsPayload(1, { ...A, speed: 1, heading: 360 }).heading, 0)
  assert.equal(buildGpsPayload(1, { ...A, speed: 1, heading: -90 }).heading, 270)
})

test('보낼 수 없는 값이면 null (전송하지 않음)', () => {
  assert.equal(buildGpsPayload(1, null), null)
  assert.equal(buildGpsPayload(1, { latitude: 35.8, longitude: null }), null)
  assert.equal(buildGpsPayload(1, { latitude: 91, longitude: 128 }), null)
  assert.equal(buildGpsPayload(0, A), null)
  assert.equal(buildGpsPayload('abc', A), null)
})

test('거리와 방향 계산', () => {
  near(distanceMeters({ latitude: 35, longitude: 128 }, { latitude: 36, longitude: 128 }), 111195, 50, '위도 1도')
  near(distanceMeters(A, B), 157, 3, '예시 노선 1구간')
  near(bearingDegrees({ latitude: 35, longitude: 128 }, { latitude: 35, longitude: 128.01 }), 90, 0.1, '동쪽')
  near(bearingDegrees({ latitude: 35.01, longitude: 128 }, { latitude: 35, longitude: 128 }), 180, 0.1, '남쪽')
  assert.equal(normalizeHeading(Number.NaN), null)
})

test('기기 속도가 없으면 위치 변화로 추정하고, 측위 오차 수준의 이동은 정지로 본다', () => {
  const t0 = 1_000_000
  near(estimateSpeedMs({ ...A, timestamp: t0 }, { ...B, timestamp: t0 + 15_700 }), 10, 0.3, '157m / 15.7초')
  assert.equal(estimateSpeedMs({ ...A, timestamp: t0 }, { latitude: 35.87141, longitude: 128.6014, timestamp: t0 + 5000 }), 0)
  assert.equal(estimateSpeedMs({ ...A, timestamp: t0 }, { ...B, timestamp: t0 + 1000 }), null, '157m/1초는 위치 튐')
  assert.equal(estimateSpeedMs({ ...A, timestamp: t0 }, { ...B, timestamp: t0 }), null)
  assert.equal(estimateSpeedMs(null, { ...B, timestamp: t0 }), null)
})

test('GeolocationPosition → 측정값: 기기 값 우선, 없으면 추정과 이동 방향', () => {
  const first = fixFromPosition(position({ ...A, speed: 7.5, heading: 30 }, 1000))
  assert.equal(first.speed, 7.5)
  assert.equal(first.speedSource, 'device')
  assert.equal(first.heading, 30)

  const noData = fixFromPosition(position(A, 1000))
  assert.equal(noData.speed, null)
  assert.equal(noData.speedSource, null)
  assert.equal(noData.heading, null)

  const baseline = { ...A, timestamp: 1000 }
  const moved = fixFromPosition(position(B, 1000 + 15_700), { baseline })
  assert.equal(moved.speedSource, 'estimated')
  near(moved.speed, 10, 0.3)
  near(moved.heading, bearingDegrees(A, B), 0.01)

  const stayed = fixFromPosition(position(A, 6000), { baseline, previous: { heading: 120 } })
  assert.equal(stayed.speed, 0)
  assert.equal(stayed.heading, 120, '거의 안 움직였으면 직전 방향 유지')

  // 기준 측정과 간격이 짧으면 추정하지 않고 직전 추정값을 이어 쓴다
  const soon = fixFromPosition(position(B, 2000), { baseline, previous: { speed: 3, speedSource: 'estimated', heading: 10 } })
  assert.equal(soon.speed, 3)
  assert.equal(soon.speedSource, 'estimated')

  assert.equal(fixFromPosition({ coords: { latitude: null, longitude: 1 } }), null)
})

test('측정기: 1초 간격 측정에서도 저속(10km/h) 주행이 0으로 잡히지 않는다', () => {
  const track = createFixTracker()
  const metersPerDegLat = 111_195
  const speedMs = 10 / 3.6
  let fix
  const results = []
  for (let s = 0; s <= 9; s++) {
    fix = track(position({ latitude: A.latitude + (speedMs * s) / metersPerDegLat, longitude: A.longitude }, 1000 + s * 1000))
    results.push(fix.speed)
  }
  assert.equal(results[0], null, '첫 측정은 비교 대상이 없다')
  assert.ok(MIN_ESTIMATE_BASELINE_MS <= 5000)
  near(results[5], speedMs, 0.05, '5초 뒤 추정')
  for (const v of results.slice(5)) near(v, speedMs, 0.05, '이후에도 유지')
  near(fix.heading, 0, 0.5, '북쪽으로 이동')
})

test('측정기: 제자리 측위 오차(±1.5m)는 정지로 본다', () => {
  const track = createFixTracker()
  let fix
  for (let s = 0; s <= 6; s++) {
    const jitter = (s % 2 ? 1.5 : -1.5) / 111_195
    fix = track(position({ latitude: A.latitude + jitter, longitude: A.longitude }, 1000 + s * 1000))
  }
  assert.equal(fix.speed, 0)
})

test('측정기: 기기 속도가 있으면 그대로 쓴다', () => {
  const track = createFixTracker()
  track(position({ ...A, speed: 5 }, 1000))
  const fix = track(position({ ...B, speed: 6.2 }, 2000))
  assert.equal(fix.speed, 6.2)
  assert.equal(fix.speedSource, 'device')
})

test('시뮬레이션: 편도 운행이라 종점에 닿으면 그 자리에 멈춘다 (되돌아가거나 순간이동하지 않음)', () => {
  const C = { latitude: 35.8738, longitude: 128.6035 }
  const path = [A, B, C]
  const start = simulateFix(path, 0, 8, 1)
  near(start.latitude, A.latitude, 1e-9)
  assert.equal(start.speed, 8)
  assert.equal(start.speedSource, 'simulated')
  assert.equal(start.finished, false)

  const legLen = distanceMeters(A, B)
  const mid = simulateFix(path, legLen / 2, 8, 1)
  near(mid.latitude, (A.latitude + B.latitude) / 2, 1e-6)
  near(mid.heading, bearingDegrees(A, B), 0.01, '진행 방향')

  const total = pathStopDistances(path)[2]
  near(total, legLen + distanceMeters(B, C), 1e-6)
  for (const over of [0, 1, 500]) {
    const end = simulateFix(path, total + over, 8, 1)
    assert.ok(distanceMeters(end, C) < 0.5, `종점을 ${over}m 넘겨도 종점에 있다`)
    assert.equal(end.finished, true)
    assert.equal(end.speed, 0, '종점에서는 정지')
  }

  // 이어지는 두 지점 사이가 항상 짧다 = 어디서도 순간이동하지 않는다
  let prev = simulateFix(path, 0, 8, 1)
  for (let d = 5; d <= total + 50; d += 5) {
    const cur = simulateFix(path, d, 8, 1)
    assert.ok(distanceMeters(prev, cur) <= 5.01, `${d}m 지점에서 ${distanceMeters(prev, cur)}m 튐`)
    prev = cur
  }

  const payload = buildGpsPayload(1, simulateFix(path, total, 8, 1))
  assert.equal(payload.speed, 0)
  assert.ok(payload.heading >= 0 && payload.heading < 360)
  assert.equal(simulateFix([A], 10, 8), null)
})

test('시뮬레이션: 정류장 반경 안에서는 12km/h로 서행 (백엔드 정차 판정 3.0m/s보다 빠름)', () => {
  const path = [A, B] // 약 157m
  const total = pathStopDistances(path)[1]
  assert.equal(SIMULATION_STOP_ZONE_M, 50)
  assert.ok(SIMULATION_STOP_ZONE_SPEED_MS > 3.0, '정류장 서행이 비정상 정차로 잡히면 안 된다')
  assert.equal(simulationSpeedAt(path, 0, 0), SIMULATION_STOP_ZONE_SPEED_MS, '출발 정류장')
  assert.equal(simulationSpeedAt(path, 49, 0), SIMULATION_STOP_ZONE_SPEED_MS)
  assert.equal(simulationSpeedAt(path, total - 10, 0), SIMULATION_STOP_ZONE_SPEED_MS, '도착 정류장 앞')
  assert.equal(simulationSpeedAt(path, total / 2, 30), simulatedSpeedMs(30), '정류장 사이에서는 보통 속도')
  // 서행 구간(50m)을 지나는 동안 5초 간격 전송이 여러 번 들어간다
  assert.ok(SIMULATION_STOP_ZONE_M / SIMULATION_STOP_ZONE_SPEED_MS >= 15)
})

test('시뮬레이션 속도는 20~40km/h 사이', () => {
  for (let s = 0; s < 200; s += 7) {
    const kmh = msToKmh(simulatedSpeedMs(s))
    assert.ok(kmh >= 19.9 && kmh <= 40.1, `${s}s → ${kmh}`)
  }
})
