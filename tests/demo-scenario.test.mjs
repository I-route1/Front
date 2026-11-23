import test from 'node:test'
import assert from 'node:assert/strict'
import { applyDetour, demoOptions, detourPlan, legWindow } from '../src/utils/demoScenario.js'
import { distanceToLine, OFF_ROUTE_M } from '../src/utils/mapStatus.js'
import { distanceMeters, pathStopDistances, simulateFix } from '../src/utils/gpsTracking.js'

// 운영 서버 1번 버스 노선의 실제 도로 경로 (map-status.test.mjs와 같은 값, 약 1,005m)
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
const TOTAL = pathStopDistances(ROAD).at(-1)
const at = (plan, d) => applyDetour(simulateFix(ROAD, d, 8, 0), d, plan)

test('시연 옵션은 ?demo=1, ?demo=detour일 때만 켜진다', () => {
  assert.deepEqual(demoOptions(''), { demo: false, detour: false, leg: null })
  assert.deepEqual(demoOptions('?demo=1'), { demo: true, detour: false, leg: null })
  assert.deepEqual(demoOptions('?demo=detour'), { demo: true, detour: true, leg: null })
  assert.deepEqual(demoOptions('?demo=detour&leg=2'), { demo: true, detour: true, leg: 2 })
  assert.deepEqual(demoOptions('?demo=detour&leg=0'), { demo: true, detour: true, leg: null })
  assert.deepEqual(demoOptions('?demo=yes'), { demo: false, detour: false, leg: null })
  assert.deepEqual(demoOptions(undefined), { demo: false, detour: false, leg: null })
})

test('정류장 사이 구간 지정: 정류장 반경을 피해 그 구간 안에서만 우회한다', () => {
  // 내일 시연 노선과 같은 정류장 위치 (범어역 0, 수성구청역 1108, 만촌역 1815, 담티역 3727m)
  const stops = [0, 1108, 1815, 3727]
  assert.deepEqual(legWindow(stops, 2), { from: 1228, to: 1695 })
  assert.equal(legWindow(stops, 4), null, '마지막 정류장 뒤에는 구간이 없다')
  assert.equal(legWindow([0, 300], 1), null, '너무 짧은 구간은 우회하지 않는다')
  assert.equal(legWindow(stops, null), null)
  // 실제 도로(약 1,005m)를 한 구간으로 보고 지정하면 그 안에서만 벗어난다
  const plan = detourPlan(ROAD, { window: legWindow([0, TOTAL], 1) })
  assert.ok(plan.from >= 120 && plan.to <= TOTAL - 120)
  assert.ok(distanceToLine(ROAD, at(plan, 60)) < 1, '출발 정류장 근처는 도로 위')
  assert.ok(distanceToLine(ROAD, at(plan, TOTAL - 60)) < 1, '도착 정류장 근처는 도로 위')
  assert.ok(distanceToLine(ROAD, at(plan, (plan.from + plan.to) / 2)) > OFF_ROUTE_M)
})

test('우회 시연: 구간 밖은 도로 그대로, 가운데는 노선 이탈 기준(100m)보다 멀리 벗어난다', () => {
  const plan = detourPlan(ROAD)
  assert.ok(plan)
  assert.ok(distanceToLine(ROAD, at(plan, plan.from - 10)) < 1, '우회 전')
  assert.ok(distanceToLine(ROAD, at(plan, plan.to + 10)) < 1, '우회 뒤 다시 도로 위')
  const mid = distanceToLine(ROAD, at(plan, (plan.from + plan.to) / 2))
  assert.ok(mid > OFF_ROUTE_M + 20, `가운데가 도로에서 ${Math.round(mid)}m`)
  // 노선 이탈로 잡히는 구간이 5초 간격 전송 여러 번(8m/s 기준 3번 이상)에 걸친다
  let offMeters = 0
  for (let d = 0; d <= TOTAL; d += 5) if (distanceToLine(ROAD, at(plan, d)) > OFF_ROUTE_M) offMeters += 5
  assert.ok(offMeters >= 8 * 5 * 3, `이탈 구간 ${offMeters}m`)
})

test('우회 시연: 순간이동 없이 부드럽게 움직인다 (5m 진행할 때 위치가 15m 넘게 튀지 않음)', () => {
  const plan = detourPlan(ROAD)
  let prev = at(plan, 0)
  for (let d = 5; d <= TOTAL; d += 5) {
    const cur = at(plan, d)
    assert.ok(distanceMeters(prev, cur) <= 15, `${d}m 지점에서 ${distanceMeters(prev, cur).toFixed(1)}m`)
    prev = cur
  }
})

test('우회 계획이 없으면 측정값을 그대로 둔다', () => {
  const fix = simulateFix(ROAD, 300, 8, 0)
  assert.equal(applyDetour(fix, 300, null), fix)
  assert.equal(detourPlan([ROAD[0]]), null)
})
