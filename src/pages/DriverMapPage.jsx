import { useCallback, useEffect, useRef, useState } from 'react'
import { getBusRoute, sendGpsLocation } from '../services/gpsService'
import {
  buildGpsPayload, createFixTracker, fixAgeMs, formatKmh, isFixStale, msToKmh, pathStopDistances, simulateFix,
  simulationSpeedAt,
} from '../utils/gpsTracking'
import { simulationRouteFromResponse } from '../utils/mapStatus'

// 백엔드 GpsController: 기사 앱은 5초 주기로 위치를 보낸다.
const SEND_INTERVAL_MS = 5000
const SIMULATION_TICK_MS = 1000
const STOPPED_MESSAGE = '운행 시작을 누르면 5초마다 위치를 서버로 보냅니다.'

// GPS가 없는 PC에서 시연할 때 서버 노선을 아직 못 받았으면 쓰는 임시 경로 (대구 중구 시청 부근).
// 서버는 버스 위치가 하나라도 있어야 노선을 주므로(없으면 404), 첫 전송 뒤 노선으로 갈아탄다.
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

function geolocationErrorMessage(err) {
  if (err?.code === 1) return '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.'
  if (err?.code === 2) return '현재 위치를 확인할 수 없습니다. GPS 신호를 확인해 주세요.'
  if (err?.code === 3) return '위치 확인 시간이 초과되었습니다. 잠시 후 다시 시도합니다.'
  return '위치 정보를 가져오지 못했습니다.'
}

function sendErrorMessage(err) {
  const serverMessage = err?.response?.data?.message
  if (serverMessage) return `전송 실패: ${serverMessage}`
  if (err?.response) return `전송 실패: 서버 오류 (${err.response.status})`
  return '전송 실패: 서버에 연결할 수 없습니다.'
}

const timeText = (ms) => new Date(ms).toLocaleTimeString('ko-KR')

export default function DriverMapPage({ busId = 1 }) {
  const geolocationSupported = typeof navigator !== 'undefined' && !!navigator.geolocation
  const [mode, setMode] = useState(geolocationSupported ? 'gps' : 'simulation')
  // 전송은 기사가 '운행 시작'을 눌렀을 때만 한다. 측정(속도 표시)은 화면에 들어오면 바로 시작한다.
  const [running, setRunning] = useState(false)
  const [fix, setFix] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const [sendState, setSendState] = useState({ status: 'stopped', message: STOPPED_MESSAGE })
  const [lastSent, setLastSent] = useState(null)
  // 시뮬레이션은 '운행 시작'을 누를 때마다 출발점부터 다시 달린다 (실제 GPS에는 영향 없음)
  const [simulationRun, setSimulationRun] = useState(0)
  const simulationKey = mode === 'simulation' ? simulationRun : 0
  // 시뮬레이션이 따라 달릴 서버 노선(도로 경로, 없으면 정류장 사이 직선). 못 받았으면 임시 경로
  const [serverRoute, setServerRoute] = useState(null)
  const simulationRoute = serverRoute ?? FALLBACK_SIMULATION_ROUTE
  const [starting, setStarting] = useState(false)

  const latestFixRef = useRef(null)

  const loadServerRoute = useCallback(async () => {
    try {
      const next = simulationRouteFromResponse(await getBusRoute(busId))
      if (next) setServerRoute(next)
      return next
    } catch {
      return null // 버스 위치가 아직 없으면 404
    }
  }, [busId])

  useEffect(() => { setServerRoute(null) }, [busId])
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
        setGpsError('이 브라우저는 위치 정보를 지원하지 않습니다.')
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
      updateFix(simulateFix(simulationRoute.path, distance, speed, now))
    }
    tick()
    const timer = setInterval(tick, SIMULATION_TICK_MS)
    return () => clearInterval(timer)
  }, [mode, geolocationSupported, simulationKey, simulationRoute])

  // 임시 경로로 첫 전송을 한 뒤에는 서버가 노선을 주므로, 받는 즉시 노선 출발점으로 옮겨 간다
  useEffect(() => {
    if (mode === 'simulation' && running && !serverRoute && lastSent) loadServerRoute()
  }, [mode, running, serverRoute, lastSent, loadServerRoute])

  // 2) 전송: 5초마다 가장 최근 측정값을 m/s 그대로 보낸다 (km/h 변환은 서버가 한다)
  useEffect(() => {
    if (!running) {
      // 종점 도착으로 끝난 경우에는 그 안내를 남겨 둔다
      setSendState((prev) => (prev.status === 'done' ? prev : { status: 'stopped', message: STOPPED_MESSAGE }))
      return undefined
    }
    const transmit = async () => {
      if (sendingRef.current) return
      const fix = latestFixRef.current
      const payload = buildGpsPayload(busId, fix)
      if (!payload) {
        setSendState({ status: 'waiting', message: '위치를 받는 중입니다...' })
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
          // 시뮬레이션이 종점에 닿으면 종점 위치를 한 번 보낸 뒤 운행을 마친다 (되돌아가지 않음)
          setSendState({ status: 'done', message: `종점에 도착해 운행을 마쳤어요 (${timeText(sentAt)})` })
          setRunning(false)
          return
        }
        setSendState({ status: 'ok', message: `전송 성공 (${timeText(sentAt)})` })
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

  const currentKmh = msToKmh(fix?.speed)
  const statusColor = {
    ok: { bg: '#ECFDF5', border: '#A7F3D0', fg: '#047857' },
    done: { bg: '#ECFDF5', border: '#A7F3D0', fg: '#047857' },
    error: { bg: '#FEF2F2', border: '#FCA5A5', fg: '#B91C1C' },
    waiting: { bg: '#EFF6FF', border: '#BFDBFE', fg: '#1D4ED8' },
    stopped: { bg: '#F3F4F6', border: '#D1D5DB', fg: '#374151' },
  }[sendState.status]

  const segment = (value, label, disabled = false) => (
    <button
      type="button"
      onClick={() => setMode(value)}
      disabled={disabled}
      aria-pressed={mode === value}
      style={{
        flex: 1, padding: '10px 12px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
        background: mode === value ? '#1A56DB' : 'transparent', color: mode === value ? 'white' : '#374151',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111' }}>운행 위치 전송</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280' }}>차량 ID {busId} · {SEND_INTERVAL_MS / 1000}초마다 서버로 전송</p>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: 4, background: '#F3F4F6', borderRadius: 10 }}>
        {segment('gps', '실제 GPS', !geolocationSupported)}
        {segment('simulation', '시뮬레이션')}
      </div>

      <div style={{ padding: 20, borderRadius: 16, background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: '#6B7280', fontWeight: 600 }}>현재 속도</p>
        <p style={{ margin: '6px 0 4px', fontSize: 44, fontWeight: 800, color: '#111', fontVariantNumeric: 'tabular-nums' }}>
          {formatKmh(currentKmh)}
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>
          {fix?.speedSource ? SPEED_SOURCE_LABEL[fix.speedSource] : '속도 정보 없음'}
          {fix?.speedSource === 'simulated' && (
            !serverRoute ? ' · 임시 경로 (노선을 받으면 노선으로 이동)'
              : serverRoute.onRoad ? ' · 도로 따라 종점까지' : ' · 정류장 사이 직선으로 종점까지'
          )}
          {fix?.accuracy != null && ` · 위치 오차 약 ${Math.round(fix.accuracy)}m`}
        </p>
      </div>

      {gpsError && (
        <div role="alert" style={{ padding: '12px 14px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA', color: '#9A3412', fontSize: 13 }}>
          {gpsError}
        </div>
      )}

      <div role="status" style={{ padding: '12px 14px', borderRadius: 10, background: statusColor.bg, border: `1px solid ${statusColor.border}`, color: statusColor.fg, fontSize: 14, fontWeight: 600 }}>
        {sendState.message}
      </div>

      <button
        type="button"
        disabled={starting}
        onClick={async () => {
          if (running) {
            setRunning(false)
            return
          }
          // 시뮬레이션이면 서버 노선을 먼저 받아 노선 출발점에서 시작한다 (버스 위치가 없으면 임시 경로로 시작)
          if (mode === 'simulation' && !serverRoute) {
            setStarting(true)
            await loadServerRoute()
            setStarting(false)
          }
          setSimulationRun((n) => n + 1)
          setRunning(true)
        }}
        style={{
          padding: 14, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700,
          cursor: starting ? 'wait' : 'pointer', opacity: starting ? 0.7 : 1,
          background: running ? '#EF4444' : '#10B981', color: 'white',
        }}
      >
        {running ? '위치 전송 중지' : '운행 시작 (위치 전송)'}
      </button>

      {lastSent && (
        <div style={{ padding: 16, borderRadius: 12, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#374151' }}>마지막 전송 ({timeText(lastSent.sentAt)})</h3>
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
            <dt style={{ color: '#6B7280' }}>위도·경도</dt>
            <dd style={{ margin: 0 }}>{lastSent.payload.latitude.toFixed(6)}, {lastSent.payload.longitude.toFixed(6)}</dd>
            <dt style={{ color: '#6B7280' }}>속도</dt>
            <dd style={{ margin: 0 }}>{lastSent.payload.speed} m/s ({formatKmh(msToKmh(lastSent.payload.speed))})</dd>
            <dt style={{ color: '#6B7280' }}>방향</dt>
            <dd style={{ margin: 0 }}>{Math.round(lastSent.payload.heading)}°</dd>
          </dl>
        </div>
      )}
    </div>
  )
}
