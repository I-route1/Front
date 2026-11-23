import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { getBusRoute, sendGpsLocation } from '../services/gpsService'
import { applyDetour, demoOptions, detourPlan, legWindow } from '../utils/demoScenario'
import {
  buildGpsPayload, createFixTracker, fixAgeMs, formatKmh, isFixStale, msToKmh, pathStopDistances, simulateFix,
  simulationSpeedAt,
} from '../utils/gpsTracking'
import { formatDistance, routeFromResponse, simulationRouteFromResponse } from '../utils/mapStatus'
import { driverStatusBar, driverTripView, stopRowLabel } from '../utils/driverView'

// 백엔드 GpsController: 기사 앱은 5초 주기로 위치를 보낸다.
const SEND_INTERVAL_MS = 5000
const SIMULATION_TICK_MS = 1000
const STOPPED_MESSAGE = "'운행 시작'을 누르면 5초마다 버스 위치를 학부모에게 보내요."

// GPS가 없는 PC에서 시연할 때 서버 노선을 아직 못 받았으면 쓰는 임시 경로 (대구 중구 시청 부근).
const FALLBACK_SIMULATION_PATH = [
  { latitude: 35.8714, longitude: 128.6014 },
  { latitude: 35.8725, longitude: 128.6025 },
  { latitude: 35.8738, longitude: 128.6035 },
  { latitude: 35.8750, longitude: 128.6045 },
  { latitude: 35.8765, longitude: 128.6060 },
]
// 임시 경로는 점마다 정류장으로 보고 서행한다
const FALLBACK_SIMULATION_ROUTE = {
  path: FALLBACK_SIMULATION_PATH,
  stopDistances: pathStopDistances(FALLBACK_SIMULATION_PATH),
  onRoad: false,
}

const SPEED_SOURCE_LABEL = {
  device: 'GPS 기기 측정',
  estimated: '위치 변화로 추정',
  simulated: '시뮬레이션',
}

// 학부모 지도와 같은 톤 (Map.jsx 상단 탑승 상태 바, 카드)
const NAVY_BAR = 'linear-gradient(90deg, #1F2A44, #2B3A5C)'
const CARD = { background: 'white', borderRadius: 16, boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)' }
const ROW_TONE = {
  passed: { dot: '#10B981', text: '#9CA3AF', label: '#10B981' },
  current: { dot: '#2563EB', text: '#111827', label: '#2563EB' },
  next: { dot: '#2563EB', text: '#111827', label: '#2563EB' },
  upcoming: { dot: '#D1D5DB', text: '#374151', label: '#9CA3AF' },
}

function geolocationErrorMessage(err) {
  if (err?.code === 1) return '위치 권한이 꺼져 있어요. 브라우저 설정에서 위치 권한을 허용해 주세요.'
  if (err?.code === 2) return '현재 위치를 확인할 수 없어요. GPS 신호를 확인해 주세요.'
  if (err?.code === 3) return '위치 확인 시간이 초과됐어요. 잠시 후 다시 시도할게요.'
  return '위치 정보를 가져오지 못했어요.'
}

function sendErrorMessage(err) {
  const serverMessage = err?.response?.data?.message
  if (serverMessage) return `전송 실패: ${serverMessage}`
  if (err?.response) return `전송 실패: 서버 오류 (${err.response.status})`
  return '전송 실패: 서버에 연결할 수 없어요.'
}

const timeText = (ms) => new Date(ms).toLocaleTimeString('ko-KR')

export default function DriverMapPage({ busId = 1 }) {
  const geolocationSupported = typeof navigator !== 'undefined' && !!navigator.geolocation
  // 시연 영상 촬영용 (?demo=1, ?demo=detour). 평소에는 둘 다 false
  const demo = demoOptions(useLocation().search)
  const [mode, setMode] = useState(demo.demo || !geolocationSupported ? 'simulation' : 'gps')
  // 전송은 기사가 '운행 시작'을 눌렀을 때만 한다. 측정(속도 표시)은 화면에 들어오면 바로 시작한다.
  const [running, setRunning] = useState(false)
  const [fix, setFix] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const [sendState, setSendState] = useState({ status: 'stopped', message: STOPPED_MESSAGE })
  const [lastSent, setLastSent] = useState(null)
  const [confirmingEnd, setConfirmingEnd] = useState(false)
  // 시뮬레이션은 '운행 시작'을 누를 때마다 출발점부터 다시 달린다 (실제 GPS에는 영향 없음)
  const [simulationRun, setSimulationRun] = useState(0)
  const simulationKey = mode === 'simulation' ? simulationRun : 0
  // 서버 노선: 화면용(정류장·예정 시각·차량 정보)과 시뮬레이션용(도로 경로·정류장 위치)
  const [routeInfo, setRouteInfo] = useState(null)
  const [serverRoute, setServerRoute] = useState(null)
  const simulationRoute = serverRoute ?? FALLBACK_SIMULATION_ROUTE
  // ?demo=detour: 운행 중간에 노선 옆으로 벗어났다가 돌아온다 (경로 이탈 알림 장면).
  // &leg=N 이면 N번째 → N+1번째 정류장 사이에서만 벗어나서 정류장을 건너뛰지 않는다. 없으면 전체 길이의 30~65%
  const detour = useMemo(() => {
    if (!demo.detour) return null
    const window = legWindow(simulationRoute.stopDistances, demo.leg)
    return detourPlan(simulationRoute.path, window ? { window } : {})
  }, [demo.detour, demo.leg, simulationRoute])
  const [starting, setStarting] = useState(false)

  const latestFixRef = useRef(null)

  const loadServerRoute = useCallback(async () => {
    try {
      const res = await getBusRoute(busId)
      const view = routeFromResponse(res)
      if (view.stations.length > 0) {
        setRouteInfo({ ...view, busNumber: res?.busNumber ?? null, driverName: res?.driverName ?? null })
      }
      const next = simulationRouteFromResponse(res)
      if (next) setServerRoute(next)
      return next
    } catch {
      return null // 노선을 못 받으면 운행 시작 때 다시 시도한다
    }
  }, [busId])

  // 화면에 들어오면 노선부터 받아 둔다 (출발 정류장·노선 목록 표시)
  useEffect(() => {
    setServerRoute(null)
    setRouteInfo(null)
    loadServerRoute()
  }, [busId, loadServerRoute])
  const sendingRef = useRef(false)
  const gpsErrorAtRef = useRef(null) // 마지막 측정 뒤 GPS 오류가 난 시각 (정상 측정이 오면 지운다)

  const updateFix = (next) => {
    if (!next) return
    latestFixRef.current = next
    setFix(next)
  }

  // 1) 위치 측정: 실제 GPS(watchPosition) 또는 시뮬레이션
  useEffect(() => {
    latestFixRef.current = null
    gpsErrorAtRef.current = null
    setFix(null)
    setGpsError(null)

    if (mode === 'gps') {
      if (!geolocationSupported) {
        setGpsError('이 브라우저는 위치 정보를 지원하지 않아요.')
        return undefined
      }
      const track = createFixTracker()
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          updateFix(track(position))
          gpsErrorAtRef.current = null
          setGpsError(null)
        },
        (err) => {
          gpsErrorAtRef.current = Date.now()
          setGpsError(geolocationErrorMessage(err))
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      )
      return () => navigator.geolocation.clearWatch(watchId)
    }

    const startedAt = Date.now()
    let lastTick = startedAt
    let distance = 0
    const tick = () => {
      const now = Date.now()
      const speed = simulationSpeedAt(simulationRoute.stopDistances, distance, (now - startedAt) / 1000)
      distance += speed * ((now - lastTick) / 1000)
      lastTick = now
      updateFix(applyDetour(simulateFix(simulationRoute.path, distance, speed, now), distance, detour))
    }
    tick()
    const timer = setInterval(tick, SIMULATION_TICK_MS)
    return () => clearInterval(timer)
  }, [mode, geolocationSupported, simulationKey, simulationRoute, detour])

  // 임시 경로로 첫 전송을 한 뒤에는 서버가 노선을 주므로, 받는 즉시 노선 출발점으로 옮겨 간다
  useEffect(() => {
    if (mode === 'simulation' && running && !serverRoute && lastSent) loadServerRoute()
  }, [mode, running, serverRoute, lastSent, loadServerRoute])

  // 2) 전송: 5초마다 가장 최근 측정값을 m/s 그대로 보낸다 (km/h 변환은 서버가 한다)
  useEffect(() => {
    if (!running) {
      // 운행을 종료한 경우에는 그 안내를 남겨 둔다
      setSendState((prev) => (prev.status === 'done' ? prev : { status: 'stopped', message: STOPPED_MESSAGE }))
      return undefined
    }
    const transmit = async () => {
      if (sendingRef.current) return
      const fix = latestFixRef.current
      const payload = buildGpsPayload(busId, fix)
      if (!payload) {
        setSendState({ status: 'waiting', message: '위치를 받는 중이에요...' })
        return
      }
      // GPS 신호가 끊겨 새 위치가 안 오면 마지막 위치를 다시 보내지 않고 기다린다
      if (isFixStale(fix, Date.now(), { errorAt: gpsErrorAtRef.current })) {
        const seconds = Math.round(fixAgeMs(fix) / 1000)
        setSendState({ status: 'waiting', message: `GPS 신호를 기다리는 중이에요 (마지막 위치 ${seconds}초 전)` })
        return
      }
      sendingRef.current = true
      try {
        await sendGpsLocation(payload) // 성공 시 본문 없는 200 (GpsController)
        const sentAt = Date.now()
        setLastSent({ payload, sentAt })
        if (fix?.finished) {
          // 시뮬레이션이 종점에 닿으면 그 자리에 멈춰 있고(되돌아가지 않음), 운행은 기사가 '운행 종료'를 눌러야 끝난다.
          // 실제 운행처럼 종점에서도 정차 위치를 계속 보낸다
          setSendState({ status: 'arrived', message: `종점에 도착했어요 (${timeText(sentAt)}) · 운행을 마치려면 '운행 종료'를 눌러 주세요` })
          return
        }
        setSendState({ status: 'ok', message: `위치 전송 중 · 마지막 전송 ${timeText(sentAt)}` })
      } catch (err) {
        setSendState({ status: 'error', message: sendErrorMessage(err) })
      } finally {
        sendingRef.current = false
      }
    }
    transmit()
    const timer = setInterval(transmit, SEND_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [busId, running])

  const startTrip = async () => {
    // 노선을 아직 못 받았으면 한 번 더 받아서 노선 출발점에서 시작한다 (못 받으면 임시 경로로 시작)
    if (!serverRoute) {
      setStarting(true)
      await loadServerRoute()
      setStarting(false)
    }
    setSimulationRun((n) => n + 1)
    setRunning(true)
  }

  const endTrip = () => {
    setConfirmingEnd(false)
    setRunning(false)
    setSendState({ status: 'done', message: `운행을 종료했어요 (${timeText(Date.now())})` })
  }

  const bar = driverStatusBar({ running, sendStatus: sendState.status })
  const trip = driverTripView({ stations: routeInfo?.stations, path: routeInfo?.path, fix, running, ended: sendState.status === 'done' })
  const speedText = formatKmh(msToKmh(fix?.speed))
  const messageTone = {
    error: { bg: '#FEF2F2', fg: '#B91C1C' },
    waiting: { bg: '#FFFBEB', fg: '#B45309' },
    arrived: { bg: '#EFF6FF', fg: '#1D4ED8' },
    done: { bg: '#ECFDF5', fg: '#047857' },
  }[sendState.status] ?? { bg: '#F3F4F6', fg: '#4B5563' }

  const segment = (value, label, disabled = false) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      disabled={disabled || running}
      aria-pressed={mode === value}
      style={{
        flex: 1, padding: '8px 10px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
        cursor: disabled || running ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        background: mode === value ? '#1A56DB' : 'transparent', color: mode === value ? 'white' : '#374151',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#F5F7FA' }}>
      {/* 상단 운행 상태 바 */}
      <div style={{ background: NAVY_BAR, color: 'white', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: bar.dot, flexShrink: 0, animation: bar.pulse ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 14, fontWeight: 700, wordBreak: 'keep-all' }}>{bar.text}</span>
        {lastSent && running && (
          <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8, whiteSpace: 'nowrap' }}>{timeText(lastSent.sentAt)} 전송</span>
        )}
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 600, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* 노선·차량 */}
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{routeInfo?.routeName || '배정된 노선'}</div>
          <div style={{ marginTop: 2, fontSize: 13, color: '#6B7280' }}>
            {[routeInfo?.busNumber, routeInfo?.driverName && `${routeInfo.driverName} 기사님`].filter(Boolean).join(' · ') || `차량 ${busId}번`}
          </div>
        </div>

        {/* 다음 정류장 (가장 크게) */}
        <div style={{ ...CARD, padding: '18px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#6B7280' }}>{trip.headline.label}</div>
          <div style={{ marginTop: 4, fontSize: 30, fontWeight: 800, color: '#1A56DB', lineHeight: 1.2, wordBreak: 'keep-all' }}>{trip.headline.title}</div>
          {trip.headline.detail && (
            <p style={{ margin: '8px 0 0', fontSize: 16, fontWeight: 700, color: '#374151', fontVariantNumeric: 'tabular-nums' }}>{trip.headline.detail}</p>
          )}
          {trip.offRoute !== null && (
            <div role="alert" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FCD34D', color: '#B45309', fontSize: 14, fontWeight: 700 }}>
              ⚠️ 노선에서 약 {formatDistance(trip.offRoute)} 벗어났어요
            </div>
          )}
        </div>

        {gpsError && (
          <div role="alert" style={{ padding: '10px 12px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', fontSize: 13 }}>
            {gpsError}
          </div>
        )}

        {/* 노선 진행 목록 */}
        {trip.stations.length > 0 && (
          <div style={{ ...CARD, padding: '6px 16px' }}>
            {trip.stations.map((stop, i) => {
              const label = stopRowLabel(stop, i === trip.nextIndex)
              const tone = ROW_TONE[label.tone]
              const strong = label.tone === 'next' || label.tone === 'current'
              return (
                <div key={stop.stopId ?? i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid #F3F4F6' }}>
                  <span style={{
                    width: strong ? 14 : 10, height: strong ? 14 : 10, borderRadius: '50%', flexShrink: 0, marginLeft: strong ? 0 : 2,
                    background: strong ? 'white' : tone.dot, border: strong ? `4px solid ${tone.dot}` : 'none', boxSizing: 'border-box',
                  }} />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: strong ? 800 : 600, color: tone.text }}>{stop.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: tone.label, whiteSpace: 'nowrap' }}>{label.text}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* 전송 상태 + 운행 버튼 */}
        <div role="status" style={{ padding: '10px 12px', borderRadius: 10, background: messageTone.bg, color: messageTone.fg, fontSize: 13, fontWeight: 600 }}>
          {sendState.message}
        </div>
        <button
          type="button"
          disabled={starting}
          onClick={() => (running ? setConfirmingEnd(true) : startTrip())}
          style={{
            height: 56, borderRadius: 14, border: 'none', fontSize: 17, fontWeight: 800,
            cursor: starting ? 'wait' : 'pointer', opacity: starting ? 0.7 : 1,
            background: running ? '#EF4444' : '#10B981', color: 'white', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
          }}
        >
          {starting ? '노선을 불러오는 중…' : running ? '운행 종료' : '운행 시작'}
        </button>

        {/* 상세 정보 (평소에는 접어 둔다. 시연 촬영 모드에서는 숨긴다) */}
        {!demo.demo && (
          <details style={{ ...CARD, padding: '12px 16px' }}>
            <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#374151' }}>상세 정보</summary>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>위치 측정 방식 {running && '(운행 중에는 바꿀 수 없어요)'}</div>
                <div style={{ display: 'flex', gap: 4, padding: 4, background: '#F3F4F6', borderRadius: 10 }}>
                  {segment('gps', '실제 GPS', !geolocationSupported)}
                  {segment('simulation', '시뮬레이션')}
                </div>
              </div>
              <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
                <dt style={{ color: '#6B7280' }}>차량 ID</dt>
                <dd style={{ margin: 0 }}>{busId} · {SEND_INTERVAL_MS / 1000}초마다 전송</dd>
                <dt style={{ color: '#6B7280' }}>현재 속도</dt>
                <dd style={{ margin: 0 }}>{speedText}{fix?.speedSource ? ` (${SPEED_SOURCE_LABEL[fix.speedSource]})` : ''}</dd>
                {fix?.accuracy != null && (<><dt style={{ color: '#6B7280' }}>위치 오차</dt><dd style={{ margin: 0 }}>약 {Math.round(fix.accuracy)}m</dd></>)}
                {lastSent && (
                  <>
                    <dt style={{ color: '#6B7280' }}>마지막 전송</dt>
                    <dd style={{ margin: 0 }}>{timeText(lastSent.sentAt)}</dd>
                    <dt style={{ color: '#6B7280' }}>위도·경도</dt>
                    <dd style={{ margin: 0 }}>{lastSent.payload.latitude.toFixed(6)}, {lastSent.payload.longitude.toFixed(6)}</dd>
                    <dt style={{ color: '#6B7280' }}>보낸 속도</dt>
                    <dd style={{ margin: 0 }}>{lastSent.payload.speed} m/s</dd>
                    <dt style={{ color: '#6B7280' }}>방향</dt>
                    <dd style={{ margin: 0 }}>{Math.round(lastSent.payload.heading)}°</dd>
                  </>
                )}
              </dl>
            </div>
          </details>
        )}
      </div>

      {/* 운행 종료 확인 */}
      {confirmingEnd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 1000 }}>
          <div role="dialog" aria-modal="true" aria-labelledby="end-trip-title" style={{ ...CARD, width: '100%', maxWidth: 340, padding: 22 }}>
            <h3 id="end-trip-title" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111827' }}>운행을 종료할까요?</h3>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#4B5563', lineHeight: 1.5, wordBreak: 'keep-all' }}>
              위치 전송이 멈추고 학부모 화면에 더 이상 버스 위치가 나오지 않아요.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
              <button type="button" onClick={() => setConfirmingEnd(false)} style={{ flex: 1, height: 46, borderRadius: 12, border: 'none', background: '#F3F4F6', color: '#374151', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                계속 운행
              </button>
              <button type="button" onClick={endTrip} style={{ flex: 1, height: 46, borderRadius: 12, border: 'none', background: '#EF4444', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                운행 종료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
