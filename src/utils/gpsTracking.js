// 기사 앱 GPS 전송과 학부모 지도 속도 표시에 쓰는 계산.
// 백엔드(teature/gps-alerts) 규칙: 기사 앱은 브라우저 GPS 원본 단위인 m/s로 보내고,
// 서버가 ×3.6 해서 km/h로 저장하고 /topic/bus/{busId}로 내려준다
// (GpsLocationRequest.speed 주석, GpsCommandService 저장 부분).

export const MS_TO_KMH = 3.6

// 이보다 빠른 추정 속도(약 216km/h)는 위치가 튄 것으로 보고 버린다.
const MAX_PLAUSIBLE_MS = 60
// 기기가 방향을 주지 않을 때, 이만큼 이상 움직였을 때만 이동 방향을 새로 계산한다.
const MIN_MOVE_FOR_HEADING_M = 5
// 위치 변화로 속도를 추정할 때, 이보다 작은 이동은 측위 오차로 보고 정지로 친다.
const MIN_MOVE_FOR_SPEED_M = 5
// 위치 변화로 속도를 추정할 때 비교할 기준 측정은 최소 이만큼 이전 것이어야 한다.
// 측정은 보통 1초 간격으로 오는데, 1초 사이 이동(10km/h면 약 2.8m)은 측위 오차와 구분되지 않아
// 저속 주행이 0으로 잡힌다. 5초(전송 주기)면 10km/h도 약 14m 이동이라 구분된다.
export const MIN_ESTIMATE_BASELINE_MS = 5000

const EARTH_RADIUS_M = 6371000
const toRad = (deg) => (deg * Math.PI) / 180
const toDeg = (rad) => (rad * 180) / Math.PI

export const isFiniteNumber = (v) => typeof v === 'number' && Number.isFinite(v)

export function msToKmh(ms) {
  return isFiniteNumber(ms) ? ms * MS_TO_KMH : null
}

// 화면 표시용: km/h 값을 정수로 반올림한다. 값이 없으면 '-'.
export function formatKmh(kmh) {
  if (!isFiniteNumber(kmh) || kmh < 0) return '-'
  return `${Math.round(kmh)}km/h`
}

export function distanceMeters(a, b) {
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

// a에서 b로 가는 방향 (북쪽 0°, 시계 방향, 0 이상 360 미만)
export function bearingDegrees(a, b) {
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return normalizeHeading(toDeg(Math.atan2(y, x)))
}

export function normalizeHeading(h) {
  if (!isFiniteNumber(h)) return null
  return ((h % 360) + 360) % 360
}

// 기기가 speed를 주지 않을 때(PC, Wi-Fi 측위 등) 두 측정 사이의 거리와 시간으로 추정한다.
export function estimateSpeedMs(prev, curr) {
  if (!prev || !curr) return null
  const dt = (curr.timestamp - prev.timestamp) / 1000
  if (!isFiniteNumber(dt) || dt <= 0) return null
  const d = distanceMeters(prev, curr)
  if (d < MIN_MOVE_FOR_SPEED_M) return 0
  const v = d / dt
  return v <= MAX_PLAUSIBLE_MS ? v : null
}

// GeolocationPosition을 화면·전송에 쓰는 측정값으로 바꾼다.
// - baseline: 속도·방향 추정에 비교할 기준 측정 (createFixTracker가 관리)
// - previous: 바로 직전 결과. 기준과의 간격이 짧을 때 추정값을 이어 쓴다.
// speed: 기기 값(m/s)이 있으면 그대로, 없으면 기준 측정과 비교해 추정
// heading: 기기 값이 없으면 기준 측정에서의 이동 방향, 거의 안 움직였으면 직전 방향을 유지
export function fixFromPosition(position, { baseline = null, previous = null } = {}) {
  const c = position?.coords
  if (!c || !isFiniteNumber(c.latitude) || !isFiniteNumber(c.longitude)) return null
  const fix = {
    latitude: c.latitude,
    longitude: c.longitude,
    accuracy: isFiniteNumber(c.accuracy) ? c.accuracy : null,
    timestamp: isFiniteNumber(position.timestamp) ? position.timestamp : Date.now(),
  }

  if (isFiniteNumber(c.speed) && c.speed >= 0) {
    fix.speed = c.speed
    fix.speedSource = 'device'
  } else if (baseline && fix.timestamp - baseline.timestamp >= MIN_ESTIMATE_BASELINE_MS) {
    fix.speed = estimateSpeedMs(baseline, fix)
    fix.speedSource = fix.speed === null ? null : 'estimated'
  } else if (previous?.speedSource === 'estimated') {
    fix.speed = previous.speed
    fix.speedSource = 'estimated'
  } else {
    fix.speed = null
    fix.speedSource = null
  }

  const deviceHeading = normalizeHeading(c.heading)
  if (deviceHeading !== null) {
    fix.heading = deviceHeading
  } else if (baseline && distanceMeters(baseline, fix) >= MIN_MOVE_FOR_HEADING_M) {
    fix.heading = bearingDegrees(baseline, fix)
  } else {
    fix.heading = previous?.heading ?? null
  }
  return fix
}

// watchPosition 콜백마다 부르는 측정기. 기준 측정을 MIN_ESTIMATE_BASELINE_MS마다 갱신한다.
export function createFixTracker() {
  let baseline = null
  let previous = null
  return (position) => {
    const fix = fixFromPosition(position, { baseline, previous })
    if (!fix) return previous
    if (!baseline || fix.timestamp - baseline.timestamp >= MIN_ESTIMATE_BASELINE_MS) baseline = fix
    previous = fix
    return fix
  }
}

// 측정값이 오래됐는지 (GPS 신호가 끊기면 새 측정이 오지 않는다).
// 오래된 위치를 계속 보내면 서버에는 버스가 같은 자리에서 마지막 속도로 계속 달리는 것처럼 들어간다.
// - 마지막 측정 뒤에 GPS 오류(신호 없음·시간 초과)가 났으면 바로 오래된 것으로 본다
// - 오류가 없어도 STALE_FIX_MS 동안 새 측정이 없으면 오래된 것으로 본다.
//   정차 중에는 위치 갱신을 드물게 주는 기기가 있어서 짧게 잡지 않는다 (신호등 대기 중 전송이 멈추지 않게)
export const STALE_FIX_MS = 30_000

export function fixAgeMs(fix, now = Date.now()) {
  return fix && isFiniteNumber(fix.timestamp) ? now - fix.timestamp : null
}

export function isFixStale(fix, now = Date.now(), { maxAgeMs = STALE_FIX_MS, errorAt = null } = {}) {
  const age = fixAgeMs(fix, now)
  if (age === null) return false
  if (isFiniteNumber(errorAt) && errorAt >= fix.timestamp) return true
  return age > maxAgeMs
}

// 측정값 → POST /api/gps/locations 요청 본문.
// 백엔드 검증(모두 @NotNull, 위도 ±90, 경도 ±180, speed ≥ 0, heading 0~360)을 항상 통과하도록 맞춘다.
export function buildGpsPayload(busId, fix) {
  const id = Number(busId)
  if (!Number.isInteger(id) || id <= 0) return null
  if (!fix || !isFiniteNumber(fix.latitude) || !isFiniteNumber(fix.longitude)) return null
  if (Math.abs(fix.latitude) > 90 || Math.abs(fix.longitude) > 180) return null
  const speed = isFiniteNumber(fix.speed) && fix.speed >= 0 ? fix.speed : 0
  return {
    busId: id,
    latitude: fix.latitude,
    longitude: fix.longitude,
    speed: Math.round(speed * 100) / 100,
    heading: normalizeHeading(fix.heading) ?? 0,
  }
}

// ---- 시뮬레이션 (GPS가 없는 PC에서 시연·테스트할 때) ----

// 20~40km/h 사이를 천천히 오르내리는 속도 (m/s)
export function simulatedSpeedMs(elapsedSec) {
  return 8.33 + 2.78 * Math.sin(elapsedSec / 15)
}

// 경로 점(정류장)마다 출발점에서 경로를 따라 잰 거리
export function pathStopDistances(path) {
  const distances = [0]
  for (let i = 0; i < (path?.length ?? 0) - 1; i++) {
    distances.push(distances[i] + distanceMeters(path[i], path[i + 1]))
  }
  return distances
}

// 경로(path)를 따라 distanceM만큼 간 지점의 측정값. 편도 운행이라 종점에 닿으면 그 자리에 멈추고
// finished: true, speed: 0 이 된다. (되돌아가거나 출발점으로 순간이동하면 학부모 지도에서
// 버스가 거꾸로 가거나 튀어 보이기 때문)
export function simulateFix(path, distanceM, speedMs, timestamp = Date.now()) {
  if (!Array.isArray(path) || path.length < 2) return null
  const stops = pathStopDistances(path)
  const total = stops[stops.length - 1]
  if (total <= 0) return null
  const finished = distanceM >= total
  const d = Math.min(Math.max(distanceM, 0), total)
  let i = stops.findIndex((s, k) => k < stops.length - 1 && d < stops[k + 1])
  if (i === -1) i = path.length - 2
  const len = stops[i + 1] - stops[i]
  const t = len > 0 ? Math.min(1, (d - stops[i]) / len) : 0
  const from = path[i]
  const to = path[i + 1]
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * t,
    longitude: from.longitude + (to.longitude - from.longitude) * t,
    accuracy: null,
    timestamp,
    speed: finished ? 0 : speedMs,
    speedSource: 'simulated',
    heading: bearingDegrees(from, to),
    finished,
  }
}

// 정류장 반경 안에서는 서행해서, 5초 간격 전송으로도 학부모 지도에 '도착'이 여러 번 찍히게 한다.
// 반경은 지도 화면의 도착 판정(50m)과 같다. 12km/h(초속 3.33m)는 백엔드 비정상 정차 판정
// (초속 3.0m 이하가 연속 두 번)보다 빨라서 정류장 서행이 정차로 잡히지 않는다.
export const SIMULATION_STOP_ZONE_M = 50
export const SIMULATION_STOP_ZONE_SPEED_MS = 12 / 3.6

// stopDistances: 경로 출발점에서 잰 정류장 위치(m). 도로 경로는 꺾이는 점마다 좌표가 있어서
// 경로 점을 정류장으로 볼 수 없으므로, 정류장 위치를 따로 받는다 (mapStatus.simulationRouteFromResponse)
export function simulationSpeedAt(stopDistances, distanceM, elapsedSec) {
  const nearStop = (stopDistances ?? []).some((s) => Math.abs(distanceM - s) < SIMULATION_STOP_ZONE_M)
  return nearStop ? SIMULATION_STOP_ZONE_SPEED_MS : simulatedSpeedMs(elapsedSec)
}
