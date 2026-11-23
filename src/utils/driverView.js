// 기사 화면(DriverMapPage)에 보여줄 내용 계산. 화면과 분리해 단위 테스트한다 (tests/driver-view.test.mjs)
import { formatKmh, isFiniteNumber, msToKmh } from './gpsTracking.js'
import { formatDistance, offRouteMeters, progressAlongRoute, progressStatuses } from './mapStatus.js'

const isPoint = (p) => p && isFiniteNumber(p.latitude) && isFiniteNumber(p.longitude)

// 상단 상태 바: 운행 상태와 점 색
// sendStatus: DriverMapPage의 전송 상태 (stopped | waiting | ok | error | arrived | done)
export function driverStatusBar({ running, sendStatus }) {
  if (!running) {
    return sendStatus === 'done'
      ? { text: '운행 종료', dot: '#9CA3AF', pulse: false }
      : { text: '운행 전', dot: '#9CA3AF', pulse: false }
  }
  if (sendStatus === 'arrived') return { text: '종점 도착 · 운행 종료를 눌러 주세요', dot: '#60A5FA', pulse: false }
  if (sendStatus === 'error') return { text: '위치 전송 실패 · 다시 시도하는 중', dot: '#F87171', pulse: false }
  if (sendStatus === 'waiting') return { text: '위치 신호를 기다리는 중', dot: '#FBBF24', pulse: true }
  return { text: '운행 중 · 위치 전송 중', dot: '#34D399', pulse: true }
}

// 노선 진행 목록의 오른쪽 문구: 통과 / 도착 / 다음 / 17:00 예정 / 대기
export function stopRowLabel(station, isNext) {
  if (station.status === 'PASSED') return { text: '통과', tone: 'passed' }
  if (station.status === 'ARRIVED') return { text: '도착', tone: 'current' }
  if (isNext) return { text: '다음', tone: 'next' }
  if (station.scheduledArrivalTime) return { text: `${station.scheduledArrivalTime} 예정`, tone: 'upcoming' }
  return { text: '대기', tone: 'upcoming' }
}

// 가운데 큰 카드와 노선 진행 목록.
// - stations / path: 서버 노선 (routeFromResponse 결과)
// - fix: 기사 기기의 최근 측정값 (위치·속도 m/s, 시뮬레이션이면 finished)
// - running: 운행 중인지 / ended: 기사가 '운행 종료'를 눌러 운행을 마쳤는지
export function driverTripView({ stations = [], path = [], fix = null, running = false, ended = false }) {
  const list = Array.isArray(stations) ? stations : []
  if (list.length === 0) {
    return { headline: { label: '노선', title: '노선 정보를 불러오는 중이에요', detail: '' }, stations: [], nextIndex: -1, offRoute: null }
  }
  if (!running && ended) {
    return {
      headline: { label: '운행 종료', title: '오늘 운행을 마쳤어요', detail: "다시 운행하려면 '운행 시작'을 눌러 주세요" },
      stations: list.map((s) => ({ ...s, status: 'BEFORE_ARRIVAL' })),
      nextIndex: -1,
      offRoute: null,
    }
  }
  const speed = formatKmh(msToKmh(fix?.speed))
  if (!running || !isPoint(fix)) {
    return {
      headline: { label: '출발 정류장', title: list[0].name, detail: running ? '위치를 받는 중이에요' : "'운행 시작'을 누르면 위치 전송을 시작해요" },
      stations: list.map((s) => ({ ...s, status: 'BEFORE_ARRIVAL' })),
      nextIndex: running ? 0 : -1,
      offRoute: null,
    }
  }
  const progress = progressAlongRoute(list, fix, path)
  const offRoute = offRouteMeters(progress)
  // 학부모 화면(서버와 같은 규칙)은 노선을 벗어나면 정류장을 모두 '도착 전'으로 돌리지만,
  // 기사 화면은 지나온 정류장을 그대로 두고 다음 정류장을 계속 보여준다
  const statuses = offRoute !== null && progress
    ? list.map((s, i) => ({ ...s, status: progress.stopDistances[i] < progress.along ? 'PASSED' : 'BEFORE_ARRIVAL' }))
    : progressStatuses(list, fix, path)
  const last = statuses[statuses.length - 1]
  const nextIndex = statuses.findIndex((s) => s.status === 'BEFORE_ARRIVAL')
  let headline
  if (fix.finished || (last.status === 'ARRIVED' && nextIndex === -1)) {
    headline = { label: '종점 도착', title: last.name, detail: "운행을 마치려면 '운행 종료'를 눌러 주세요" }
  } else if (offRoute !== null) {
    const next = nextIndex >= 0 ? statuses[nextIndex].name : last.name
    headline = { label: '다음 정류장', title: next, detail: speed }
  } else {
    const arrived = statuses.find((s) => s.status === 'ARRIVED')
    if (arrived) {
      headline = { label: '정류장 도착', title: arrived.name, detail: speed }
    } else if (nextIndex >= 0) {
      const remaining = Math.max(0, progress.stopDistances[nextIndex] - progress.along)
      headline = { label: '다음 정류장', title: statuses[nextIndex].name, detail: `약 ${formatDistance(remaining)} · ${speed}` }
    } else {
      headline = { label: '마지막 정류장 통과', title: last.name, detail: speed }
    }
  }
  return { headline, stations: statuses, nextIndex, offRoute }
}
