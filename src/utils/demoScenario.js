// 시연 영상 촬영용 기사 화면 시나리오 (tests/demo-scenario.test.mjs)
// - /driver/map?demo=1      : 시뮬레이션으로 고정하고 모드 전환·'시뮬레이션' 표시를 숨긴다
// - /driver/map?demo=detour : 위와 같고, 운행 중간에 노선을 벗어났다가 돌아와 경로 이탈 장면을 만든다
// - &leg=N                   : 우회할 구간을 N번째 정류장 → N+1번째 정류장 사이로 정한다 (정류장을 건너뛰지 않게)
// 평소 화면(쿼리 없음)에는 아무 영향이 없다.
import { pathStopDistances, simulateFix } from './gpsTracking.js'
import { distanceToLine } from './mapStatus.js'

const RAD = Math.PI / 180
const METERS_PER_DEG_LAT = 6371000 * RAD

export function demoOptions(search) {
  const params = new URLSearchParams(search ?? '')
  const value = params.get('demo')
  const leg = Number(params.get('leg'))
  return {
    demo: value === '1' || value === 'detour',
    detour: value === 'detour',
    leg: Number.isInteger(leg) && leg >= 1 ? leg : null,
  }
}

// 정류장 사이 구간(leg번째 정류장 → 다음 정류장) 안에서만 우회하도록 시작·끝 거리(m)를 정한다.
// 정류장 반경(50m)과 서행 구간을 피하려고 양 끝에서 120m(또는 구간의 15%)씩 띄운다. 구간이 너무 짧으면 null
export function legWindow(stopDistances, leg) {
  if (!Array.isArray(stopDistances) || !Number.isInteger(leg) || leg < 1 || leg >= stopDistances.length) return null
  const start = stopDistances[leg - 1]
  const end = stopDistances[leg]
  const margin = Math.max(120, (end - start) * 0.15)
  return end - start - margin * 2 >= 200 ? { from: start + margin, to: end - margin } : null
}

// 위·경도 점을 동쪽 east m, 북쪽 north m만큼 옮긴다
function shift(p, east, north) {
  return {
    latitude: p.latitude + north / METERS_PER_DEG_LAT,
    longitude: p.longitude + east / (METERS_PER_DEG_LAT * Math.cos(p.latitude * RAD)),
  }
}

// 우회 계획: 경로 전체 길이의 fromRatio~toRatio 구간에서 옆으로 최대 offsetM까지 벗어났다가 돌아온다.
// 옆 방향은 그 구간 시작점→끝점 방향에 수직이고, 가운데에서 도로와 더 멀어지는 쪽을 고른다
// (도로가 휘어 있어서 한쪽은 도로와 가까울 수 있다).
// window({ from, to }, m)를 주면 그 구간에서, 없으면 전체 길이의 fromRatio~toRatio 구간에서 우회한다.
// 옆으로 벗어나는 거리는 구간이 짧으면 줄인다 (구간 길이의 45%까지, 순간이동처럼 보이지 않게)
export function detourPlan(path, { fromRatio = 0.3, toRatio = 0.65, offsetM = 180, window = null } = {}) {
  if (!Array.isArray(path) || path.length < 2) return null
  const stops = pathStopDistances(path)
  const total = stops[stops.length - 1]
  if (!(total > 0)) return null
  const from = window ? window.from : total * fromRatio
  const to = window ? window.to : total * toRatio
  if (!(to > from)) return null
  offsetM = Math.min(offsetM, (to - from) * 0.45)
  const a = simulateFix(path, from, 0)
  const b = simulateFix(path, to, 0)
  const east = (b.longitude - a.longitude) * METERS_PER_DEG_LAT * Math.cos(a.latitude * RAD)
  const north = (b.latitude - a.latitude) * METERS_PER_DEG_LAT
  const len = Math.hypot(east, north)
  if (!(len > 0)) return null
  const mid = simulateFix(path, (from + to) / 2, 0)
  const sides = [{ east: -north / len, north: east / len }, { east: north / len, north: -east / len }]
  const clearance = (n) => distanceToLine(path, shift(mid, n.east * offsetM, n.north * offsetM)) ?? 0
  const normal = clearance(sides[0]) >= clearance(sides[1]) ? sides[0] : sides[1]
  return { from, to, offsetM, normal }
}

// 시뮬레이션 측정값에 우회를 입힌다. 구간 밖이면 그대로, 구간 안이면 사인 곡선으로 부드럽게 벗어났다 돌아온다
export function applyDetour(fix, distanceM, plan) {
  if (!fix || !plan || !(distanceM > plan.from && distanceM < plan.to)) return fix
  const k = Math.sin(Math.PI * (distanceM - plan.from) / (plan.to - plan.from))
  return { ...fix, ...shift(fix, plan.normal.east * plan.offsetM * k, plan.normal.north * plan.offsetM * k) }
}
