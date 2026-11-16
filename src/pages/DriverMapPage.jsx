import { useEffect, useRef, useState } from 'react'
import { sendGpsLocation } from '../services/gpsService'
import {
  buildGpsPayload, createFixTracker, formatKmh, msToKmh, simulateFix, simulatedSpeedMs,
} from '../utils/gpsTracking'

// 백엔드 GpsController: 기사 앱은 5초 주기로 위치를 보낸다.
const SEND_INTERVAL_MS = 5000
const SIMULATION_TICK_MS = 1000
const STOPPED_MESSAGE = '운행 시작을 누르면 5초마다 위치를 서버로 보냅니다.'

// GPS가 없는 PC에서 시연할 때 따라 움직일 경로 (지도 화면 예시 노선과 같은 좌표)
const SIMULATION_PATH = [
  { latitude: 35.8714, longitude: 128.6014 },
  { latitude: 35.8725, longitude: 128.6025 },
  { latitude: 35.8738, longitude: 128.6035 },
  { latitude: 35.8750, longitude: 128.6045 },
  { latitude: 35.8765, longitude: 128.6060 },
]

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

  const latestFixRef = useRef(null)
  const sendingRef = useRef(false)

  const updateFix = (next) => {
    if (!next) return
    latestFixRef.current = next
    setFix(next)
  }

  // 1) 위치 측정: 실제 GPS(watchPosition) 또는 시뮬레이션
  useEffect(() => {
    latestFixRef.current = null
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
          setGpsError(null)
        },
        (err) => setGpsError(geolocationErrorMessage(err)),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      )
      return () => navigator.geolocation.clearWatch(watchId)
    }

    const startedAt = Date.now()
    let lastTick = startedAt
    let distance = 0
    const tick = () => {
      const now = Date.now()
      const speed = simulatedSpeedMs((now - startedAt) / 1000)
      distance += speed * ((now - lastTick) / 1000)
      lastTick = now
      updateFix(simulateFix(SIMULATION_PATH, distance, speed, now))
    }
    tick()
    const timer = setInterval(tick, SIMULATION_TICK_MS)
    return () => clearInterval(timer)
  }, [mode, geolocationSupported])

  // 2) 전송: 5초마다 가장 최근 측정값을 m/s 그대로 보낸다 (km/h 변환은 서버가 한다)
  useEffect(() => {
    if (!running) {
      setSendState({ status: 'stopped', message: STOPPED_MESSAGE })
      return undefined
    }
    const transmit = async () => {
      if (sendingRef.current) return
      const payload = buildGpsPayload(busId, latestFixRef.current)
      if (!payload) {
        setSendState({ status: 'waiting', message: '위치를 받는 중입니다...' })
        return
      }
      sendingRef.current = true
      try {
        await sendGpsLocation(payload) // 성공 시 본문 없는 200 (GpsController)
        const sentAt = Date.now()
        setLastSent({ payload, sentAt })
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
        onClick={() => setRunning((r) => !r)}
        style={{
          padding: 14, borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
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
