import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MS_TO_KMH, msToKmh, formatKmh, distanceMeters, bearingDegrees, normalizeHeading,
  estimateSpeedMs, fixFromPosition, createFixTracker, MIN_ESTIMATE_BASELINE_MS,
  buildGpsPayload, simulatedSpeedMs, simulateFix,
} from '../src/utils/gpsTracking.js'

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ''} expected ${expected}±${tol}, got ${actual}`)

// 지도 예시 노선과 같은 좌표 (경산)
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

test('시뮬레이션: 경로를 따라 움직이고 끝나면 처음부터 다시 돈다', () => {
  const path = [A, B, { latitude: 35.8738, longitude: 128.6035 }]
  const start = simulateFix(path, 0, 8, 1)
  near(start.latitude, A.latitude, 1e-9)
  assert.equal(start.speed, 8)
  assert.equal(start.speedSource, 'simulated')

  const legLen = distanceMeters(A, B)
  const mid = simulateFix(path, legLen / 2, 8, 1)
  near(mid.latitude, (A.latitude + B.latitude) / 2, 1e-6)

  const total = legLen + distanceMeters(B, path[2])
  near(simulateFix(path, total + 1, 8, 1).latitude, A.latitude, 1e-4, '한 바퀴 뒤')

  const payload = buildGpsPayload(1, mid)
  assert.ok(payload.heading >= 0 && payload.heading < 360)
  assert.equal(simulateFix([A], 10, 8), null)
})

test('시뮬레이션 속도는 20~40km/h 사이', () => {
  for (let s = 0; s < 200; s += 7) {
    const kmh = msToKmh(simulatedSpeedMs(s))
    assert.ok(kmh >= 19.9 && kmh <= 40.1, `${s}s → ${kmh}`)
  }
})
