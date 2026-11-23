import test from 'node:test'
import assert from 'node:assert/strict'
import { driverStatusBar, driverTripView, stopRowLabel } from '../src/utils/driverView.js'
import { routeFromResponse } from '../src/utils/mapStatus.js'
import { distanceMeters } from '../src/utils/gpsTracking.js'

// 시연 노선 모양: 범어역 → 수성구청역 → 만촌역 → 담티역 (정류장 사이 직선으로 계산)
const route = routeFromResponse({
  routeName: 'I-Route 수성 1호선',
  stops: [
    { stopId: 3, stopName: '범어역', stopOrder: 1, latitude: 35.8590259, longitude: 128.6238385, scheduledArrivalTime: '16:40:00' },
    { stopId: 4, stopName: '수성구청역', stopOrder: 2, latitude: 35.8585726, longitude: 128.6360776, scheduledArrivalTime: '16:50:00' },
    { stopId: 5, stopName: '만촌역', stopOrder: 3, latitude: 35.8580984, longitude: 128.6429934, scheduledArrivalTime: '17:00:00' },
    { stopId: 6, stopName: '담티역', stopOrder: 4, latitude: 35.854827, longitude: 128.653931, scheduledArrivalTime: '17:10:00' },
  ],
})
const [A, B] = route.stations
// A에서 B 쪽으로 meters만큼 간 지점 (직선 위)
const between = (from, to, meters) => {
  const t = meters / distanceMeters(from, to)
  return { latitude: from.latitude + (to.latitude - from.latitude) * t, longitude: from.longitude + (to.longitude - from.longitude) * t }
}

test('상단 상태 바: 운행 전·운행 중·신호 대기·전송 실패·종점 도착·운행 종료', () => {
  assert.equal(driverStatusBar({ running: false, sendStatus: 'stopped' }).text, '운행 전')
  assert.equal(driverStatusBar({ running: true, sendStatus: 'ok' }).text, '운행 중 · 위치 전송 중')
  assert.equal(driverStatusBar({ running: true, sendStatus: 'ok' }).pulse, true)
  assert.equal(driverStatusBar({ running: true, sendStatus: 'waiting' }).text, '위치 신호를 기다리는 중')
  assert.match(driverStatusBar({ running: true, sendStatus: 'error' }).text, /전송 실패/)
  assert.match(driverStatusBar({ running: true, sendStatus: 'arrived' }).text, /종점 도착/)
  assert.equal(driverStatusBar({ running: false, sendStatus: 'done' }).text, '운행 종료')
})

test('노선 목록 문구: 통과·도착·다음·예정 시각', () => {
  assert.deepEqual(stopRowLabel({ status: 'PASSED' }, false), { text: '통과', tone: 'passed' })
  assert.deepEqual(stopRowLabel({ status: 'ARRIVED' }, false), { text: '도착', tone: 'current' })
  assert.deepEqual(stopRowLabel({ status: 'BEFORE_ARRIVAL', scheduledArrivalTime: '17:00' }, true), { text: '다음', tone: 'next' })
  assert.deepEqual(stopRowLabel({ status: 'BEFORE_ARRIVAL', scheduledArrivalTime: '17:00' }, false), { text: '17:00 예정', tone: 'upcoming' })
  assert.deepEqual(stopRowLabel({ status: 'BEFORE_ARRIVAL' }, false), { text: '대기', tone: 'upcoming' })
})

test('운행 전에는 출발 정류장을 크게 보여준다', () => {
  const view = driverTripView({ stations: route.stations, running: false })
  assert.equal(view.headline.label, '출발 정류장')
  assert.equal(view.headline.title, '범어역')
  assert.equal(view.nextIndex, -1)
  assert.equal(driverTripView({ stations: [] }).headline.title, '노선 정보를 불러오는 중이에요')
})

test('운행 중: 정류장 도착, 다음 정류장과 남은 거리', () => {
  const atStart = driverTripView({ stations: route.stations, running: true, fix: { ...A, speed: 3.33 } })
  assert.equal(atStart.headline.label, '정류장 도착')
  assert.equal(atStart.headline.title, '범어역')
  assert.equal(atStart.headline.detail, '12km/h')

  const onTheWay = driverTripView({ stations: route.stations, running: true, fix: { ...between(A, B, 400), speed: 8.9 } })
  assert.equal(onTheWay.headline.label, '다음 정류장')
  assert.equal(onTheWay.headline.title, '수성구청역')
  assert.match(onTheWay.headline.detail, /^약 \d+m · 32km\/h$/)
  assert.equal(onTheWay.nextIndex, 1)
  assert.equal(onTheWay.stations[0].status, 'PASSED')
  assert.equal(onTheWay.offRoute, null)
})

test('노선을 벗어나도 지나온 정류장과 다음 정류장은 그대로, 경고를 띄운다', () => {
  const p = between(A, B, 500)
  const off = { latitude: p.latitude + 0.0018, longitude: p.longitude, speed: 8 } // 북쪽으로 약 200m
  const view = driverTripView({ stations: route.stations, running: true, fix: off })
  assert.ok(view.offRoute > 100)
  assert.equal(view.headline.title, '수성구청역')
  assert.equal(view.stations[0].status, 'PASSED')
})

test('운행 종료를 누른 뒤에는 운행을 마쳤다고 보여준다 (출발 정류장으로 돌아가지 않음)', () => {
  const view = driverTripView({ stations: route.stations, running: false, ended: true })
  assert.equal(view.headline.label, '운행 종료')
  assert.equal(view.headline.title, '오늘 운행을 마쳤어요')
})

test('종점에 도착하면 운행 종료를 누르라고 안내한다', () => {
  const last = route.stations.at(-1)
  const view = driverTripView({ stations: route.stations, running: true, fix: { ...last, speed: 0, finished: true } })
  assert.equal(view.headline.label, '종점 도착')
  assert.equal(view.headline.title, '담티역')
  assert.match(view.headline.detail, /운행 종료/)
})
