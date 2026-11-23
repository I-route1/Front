import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useOutletContext } from 'react-router-dom'
import { Client } from '@stomp/stompjs'
import { getBusCurrentLocation, getBusRoute, getStudentEtas, getStudentCurrentLocation } from '../services/gpsService'
import { getAttendanceByStudent } from '../api/attendance'
import { useAuth, USER_ROLES, normalizeRole } from '@/context/AuthContext'
import BackButton from '../components/common/BackButton'
import { formatKmh } from '../utils/gpsTracking'
import {
  attendanceToast, delayNotice, describeNextStop, describeRide, describeSignalLoss, findChildEta,
  formatDistance, locationErrorMessage, offRouteMeters, progressAlongRoute, progressStatuses, rideState,
  routeFromResponse, routePaths, signalLostSeconds, timeOfDay, todayString, updatedAgo,
} from '../utils/mapStatus'

// 노선을 받기 전 지도 중심 (대구 중구 시청 부근)
const DEFAULT_CENTER = { latitude: 35.8714, longitude: 128.6014 }
// ETA는 서버가 카카오 길찾기로 계산하므로 위치 메시지(5초)마다가 아니라 1분마다 다시 받는다
const ETA_REFRESH_MS = 60_000
const TOAST_MS = 5000
const CLOCK_TICK_MS = 10_000
const KAKAO_SDK_ID = 'kakao-map-sdk-script'
const EMPTY_ROUTE = { routeName: '', stations: [], path: [] }

// 서버에 없는 기사 정보(사진·소속)는 예시 값. 차량 번호·이름·연락처는 서버 값으로 덮어쓴다.
const mockVehicleInfo = {
  vehicleNumber: '경산 71자 1234',
  driverName: '김태균',
  agency: '경산 해바라기 유치원',
  contact: '010-1234-5678',
  photo: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
}

const RIDE_TONE_BG = {
  info: 'linear-gradient(90deg, #1A56DB, #2563EB)',
  success: 'linear-gradient(90deg, #10B981, #059669)',
  neutral: 'linear-gradient(90deg, #4B5563, #374151)',
}

const BANNER_STYLE = {
  danger: { bg: '#FEF2F2', border: '#FCA5A5', fg: '#DC2626', icon: '⚠️' },
  warn: { bg: '#FFFBEB', border: '#FCD34D', fg: '#B45309', icon: '⏱️' },
  info: { bg: '#EFF6FF', border: '#BFDBFE', fg: '#1D4ED8', icon: '🚌' },
  muted: { bg: '#F3F4F6', border: '#D1D5DB', fg: '#374151', icon: 'ℹ️' },
}

function Banner({ kind, children }) {
  const s = BANNER_STYLE[kind]
  return (
    <div role={kind === 'danger' ? 'alert' : 'status'} style={{ background: s.bg, borderBottom: `1px solid ${s.border}`, color: s.fg, padding: '10px 20px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, zIndex: 6 }}>
      <span aria-hidden="true">{s.icon}</span>
      <span style={{ wordBreak: 'keep-all' }}>{children}</span>
    </div>
  )
}

// 지각 위험·경로 이탈 푸시 알림 켜기. 권한은 버튼을 눌렀을 때만 묻는다 (아이폰은 버튼을 눌러야만 권한 창이 뜬다)
function PushPermissionBanner({ push }) {
  const { permission, enabling, error, enable } = push
  if (error) return <Banner kind="danger">{error}</Banner>
  if (permission === 'denied') {
    return <Banner kind="muted">알림이 차단돼 있어요. 브라우저 주소창 왼쪽의 사이트 설정에서 알림을 허용해 주세요</Banner>
  }
  if (permission !== 'default') return null
  const s = BANNER_STYLE.info
  return (
    <div role="status" style={{ background: s.bg, borderBottom: `1px solid ${s.border}`, color: s.fg, padding: '8px 20px', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, zIndex: 6 }}>
      <span aria-hidden="true">🔔</span>
      <span style={{ wordBreak: 'keep-all', flex: 1 }}>지각 위험·경로 이탈을 알림으로 받아 보세요</span>
      <button type="button" onClick={enable} disabled={enabling} style={{ border: 'none', borderRadius: 8, background: '#1A56DB', color: 'white', fontSize: 12, fontWeight: 700, padding: '6px 10px', cursor: enabling ? 'wait' : 'pointer', opacity: enabling ? 0.7 : 1, whiteSpace: 'nowrap' }}>
        {enabling ? '켜는 중…' : '알림 켜기'}
      </button>
    </div>
  )
}

// 자녀 정류장 표시 (카카오 CustomOverlay 내용). 이름은 서버 값이라 innerHTML 대신 textContent로 넣는다.
function childStopElement(label) {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;transform:translateY(-8px)'
  const tag = document.createElement('div')
  tag.style.cssText = 'background:#FEF08A;color:#A16207;font-size:11px;font-weight:800;padding:2px 6px;border-radius:6px;white-space:nowrap;margin-bottom:2px;box-shadow:0 1px 2px rgba(0,0,0,0.15)'
  tag.textContent = label
  const dot = document.createElement('div')
  dot.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#FBBF24;border:3px solid #F59E0B'
  wrap.append(tag, dot)
  return wrap
}

export default function Map() {
  const { user } = useAuth()
  const location = useLocation()
  // 지도에 보여줄 자녀: 홈에서 고른 자녀(state.studentId), 없으면 첫째 자녀
  const children = user?.children ?? []
  const selectedChild = children.find(c => String(c.studentId ?? c.id) === String(location.state?.studentId)) ?? children[0]
  // 볼 버스: 이동할 때 넘겨받은 busId(알림 클릭 등) → 자녀 조회 응답(/api/students/my-children)의 busId
  // → 둘 다 없으면(목업 계정 등) 테스트 버스 1번
  const busId = location.state?.busId ?? selectedChild?.busId ?? 1
  let childStudentId = selectedChild?.studentId || selectedChild?.id || 1
  if (typeof childStudentId === 'string' && childStudentId.startsWith('child-')) {
    childStudentId = 1
  }
  const childName = selectedChild?.name ?? null
  // 출결 조회는 로그인 토큰이 있고 실제 학생 ID일 때만 한다.
  // 토큰 없이 401을 받으면 공용 API 클라이언트(createApiClient)가 로그인 화면으로 보내기 때문
  const canReadAttendance = Boolean(user?.token) && Number.isInteger(Number(selectedChild?.studentId))
  // 학부모 계정은 로그인 ID가 학생의 parentId다 (백엔드 GpsDummyDataInitializer: 테스트 학부모 userId 14 = parentId)
  const parentId = normalizeRole(user?.role) === USER_ROLES.PARENT && Number.isInteger(Number(user?.id)) ? Number(user.id) : null
  // 푸시 알림(지각 위험·경로 이탈)은 학부모에게 가므로 학부모에게만 '알림 켜기'를 보여준다 (AppLayout의 usePushNotifications)
  const push = useOutletContext()?.push ?? null
  const isParentAccount = normalizeRole(user?.role) === USER_ROLES.PARENT

  const mapRef = useRef(null)
  const busOverlayRef = useRef(null)
  const fittedRouteRef = useRef(null)
  const routeLoadingRef = useRef(false)
  const childIdRef = useRef(childStudentId)
  childIdRef.current = childStudentId

  const [mapInstance, setMapInstance] = useState(null)
  const [speed, setSpeed] = useState(null) // 서버 km/h (백엔드가 m/s × 3.6). 받기 전 null → '-'
  const [updatedAt, setUpdatedAt] = useState(null)
  const [busLocation, setBusLocation] = useState(null) // { latitude, longitude }
  const [locationError, setLocationError] = useState(null)
  const [wsState, setWsState] = useState('connecting')
  const [route, setRoute] = useState(EMPTY_ROUTE) // { routeName, stations, path(도로 경로, 없으면 []) }
  const [etas, setEtas] = useState([])
  const [attendance, setAttendance] = useState(null) // 오늘 출결 기록. 조회 못 하면 null
  const [onBoard, setOnBoard] = useState(null)
  const [toast, setToast] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [driverInfo, setDriverInfo] = useState(mockVehicleInfo)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isRouteSheetOpen, setIsRouteSheetOpen] = useState(false)
  const [portalContainer, setPortalContainer] = useState(null)

  const isRunning = busLocation !== null
  // 진행·이탈은 서버와 같이 도로 경로 기준 (도로 경로가 없으면 정류장 사이 직선)
  const stations = useMemo(() => progressStatuses(route.stations, busLocation, route.path), [route.stations, route.path, busLocation])
  const progress = useMemo(() => progressAlongRoute(route.stations, busLocation, route.path), [route.stations, route.path, busLocation])
  const offRoute = offRouteMeters(progress) // 노선에서 100m 넘게 벗어나 있으면 그 거리(m)
  const signalLoss = isRunning ? describeSignalLoss(signalLostSeconds(updatedAt, now)) : null
  const childEta = findChildEta(etas, childStudentId)
  const childStopId = selectedChild?.routeStopId ?? childEta?.stopId ?? null
  const childStop = stations.find(s => String(s.stopId) === String(childStopId)) ?? null
  const ride = describeRide(rideState({ records: attendance, studentId: childStudentId, onBoard }), childName)
  const notice = delayNotice(childEta)
  const statusRight = !isRunning
    ? '운행 전'
    : childEta
      ? `우리 아이 정류장까지 ${childEta.etaMinutes}분`
      : offRoute !== null ? '노선 이탈' : (describeNextStop(stations, progress) ?? '운행 중')

  // 상단 바에 뒤로가기 버튼
  useEffect(() => {
    const topbar = document.querySelector('.topbar')
    const titleEl = document.querySelector('.topbar__title')
    let btnContainer = null
    if (topbar) {
      btnContainer = document.createElement('div')
      btnContainer.className = 'topbar__back-container'
      btnContainer.style.display = 'flex'
      btnContainer.style.alignItems = 'center'
      btnContainer.style.marginRight = '8px'
      topbar.insertBefore(btnContainer, topbar.firstChild)
      setPortalContainer(btnContainer)
    }
    if (titleEl) titleEl.style.marginRight = 'auto'
    return () => {
      if (topbar && btnContainer && topbar.contains(btnContainer)) topbar.removeChild(btnContainer)
      if (titleEl) titleEl.style.marginRight = ''
    }
  }, [])

  // 위치 메시지(REST current-location, WS /topic/bus/{busId}) 반영
  const applyLocation = useCallback((data) => {
    if (!data?.latitude || !data?.longitude) return
    setBusLocation({ latitude: data.latitude, longitude: data.longitude })
    if (data.speed !== undefined && data.speed !== null) setSpeed(data.speed)
    if (data.updatedAt) setUpdatedAt(data.updatedAt)
    setDriverInfo(prev => ({
      ...prev,
      vehicleNumber: data.busNumber || prev.vehicleNumber,
      driverName: data.driverName || prev.driverName,
      contact: data.driverPhoneNumber || prev.contact,
    }))
    setLocationError(null)
  }, [])

  // 노선은 현재 위치와 별도로 요청한다.
  const loadRoute = useCallback(async () => {
    if (routeLoadingRef.current) return
    routeLoadingRef.current = true
    try {
      const res = await getBusRoute(busId)
      const next = routeFromResponse(res)
      if (next.stations.length > 0) setRoute(next)
      setDriverInfo(prev => ({
        ...prev,
        vehicleNumber: res?.busNumber || prev.vehicleNumber,
        driverName: res?.driverName || prev.driverName,
        contact: res?.driverPhoneNumber || prev.contact,
      }))
    } catch {
      // 노선을 받지 못했으면 운행 시작 후 다시 시도한다.
    } finally {
      routeLoadingRef.current = false
    }
  }, [busId])

  // 실시간 연결이 끊겼다 다시 붙었을 때: 끊긴 동안의 위치는 다시 오지 않으므로 현재 위치를 한 번 조회한다
  const refreshLocation = useCallback(() => {
    getBusCurrentLocation(busId)
      .then(data => { if (data?.latitude) applyLocation(data) })
      .catch(err => setLocationError(locationErrorMessage(err)))
  }, [busId, applyLocation])

  // 버스가 바뀌면 처음부터 다시 받는다
  useEffect(() => {
    let cancelled = false
    setRoute(EMPTY_ROUTE)
    setBusLocation(null)
    setSpeed(null)
    setUpdatedAt(null)
    setEtas([])
    fittedRouteRef.current = null
    getBusCurrentLocation(busId)
      .then(data => {
        if (cancelled) return
        if (data?.latitude) applyLocation(data)
        else setLocationError('버스 위치를 아직 받지 못했어요')
      })
      .catch(err => { if (!cancelled) setLocationError(locationErrorMessage(err)) })
    loadRoute()
    return () => { cancelled = true }
  }, [busId, applyLocation, loadRoute])

  // 페이지를 연 뒤에 운행이 시작되면 노선을 받는다
  useEffect(() => {
    if (isRunning && route.stations.length === 0) loadRoute()
  }, [isRunning, route.stations.length, loadRoute])

  // 내 아이 ETA·지연 (운행 중일 때만 1분마다)
  useEffect(() => {
    if (!isRunning) return undefined
    let cancelled = false
    const load = () => getStudentEtas(busId)
      .then(list => { if (!cancelled && Array.isArray(list)) setEtas(list) })
      .catch(() => {})
    load()
    const timer = setInterval(load, ETA_REFRESH_MS)
    return () => { cancelled = true; clearInterval(timer) }
  }, [busId, isRunning])

  // 아이 탑승 상태: 오늘 출결 기록 + 지금 탑승 중인지
  useEffect(() => {
    let cancelled = false
    setAttendance(null)
    setOnBoard(null)
    if (canReadAttendance) {
      getAttendanceByStudent(childStudentId, todayString())
        .then(list => { if (!cancelled) setAttendance(Array.isArray(list) ? list : []) })
        .catch(() => { if (!cancelled) setAttendance(null) })
    }
    getStudentCurrentLocation(childStudentId)
      .then(loc => { if (!cancelled) setOnBoard(loc !== null && loc !== undefined) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [childStudentId, canReadAttendance])

  // 실시간: 버스 위치 + (학부모 계정이면) 자녀 승하차
  useEffect(() => {
    let active = true // 화면을 떠나며 끊는 건 '재연결 중'으로 보이지 않게
    let connectedBefore = false
    const client = new Client({
      brokerURL: import.meta.env.VITE_WS_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setWsState('connected')
        if (connectedBefore) refreshLocation()
        connectedBefore = true
        client.subscribe(`/topic/bus/${busId}`, (message) => {
          try {
            applyLocation(JSON.parse(message.body))
          } catch (error) {
            console.error('버스 위치 메시지 처리 실패:', error)
          }
        })
        if (parentId) {
          client.subscribe(`/topic/attendance/${parentId}`, (message) => {
            try {
              const event = JSON.parse(message.body)
              const text = attendanceToast(event)
              if (text) setToast(text)
              if (String(event.studentId) === String(childIdRef.current)) {
                setAttendance(prev => [...(prev ?? []), event])
                setOnBoard(event.eventType === 'BOARD')
              }
            } catch (error) {
              console.error('승하차 메시지 처리 실패:', error)
            }
          })
        }
      },
      onWebSocketClose: () => { if (active) setWsState('reconnecting') },
      onStompError: () => { if (active) setWsState('reconnecting') },
    })
    client.activate()
    return () => {
      active = false
      client.deactivate()
    }
  }, [busId, parentId, applyLocation, refreshLocation])

  // 승하차 안내는 잠깐만 보여준다
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), TOAST_MS)
    return () => clearTimeout(timer)
  }, [toast])

  // '마지막 수신 N초 전' 갱신
  useEffect(() => {
    if (!isRunning) return undefined
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => clearInterval(timer)
  }, [isRunning])

  // 카카오 지도 (SDK는 이 화면에서만 불러온다)
  useEffect(() => {
    let isMounted = true
    const initMap = () => {
      window.kakao.maps.load(() => {
        if (!isMounted || !mapRef.current) return
        const kakao = window.kakao
        const center = new kakao.maps.LatLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude)
        const map = new kakao.maps.Map(mapRef.current, { center, level: 4 })
        const busContent = document.createElement('div')
        busContent.style.cssText = 'width:32px;height:32px;background:#FF3B3B;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:16px;box-shadow:0 2px 4px rgba(0,0,0,0.3);border:2px solid white;'
        busContent.textContent = '🚌'
        busOverlayRef.current = new kakao.maps.CustomOverlay({ position: center, content: busContent, yAnchor: 0.5, zIndex: 3 })
        setMapInstance(map)
      })
    }
    let script = document.getElementById(KAKAO_SDK_ID)
    if (!script) {
      script = document.createElement('script')
      script.id = KAKAO_SDK_ID
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer`
      script.onload = initMap
      document.head.appendChild(script)
    } else if (window.kakao && window.kakao.maps) {
      initMap()
    } else {
      script.addEventListener('load', initMap)
    }
    return () => {
      isMounted = false
      script.removeEventListener('load', initMap)
    }
  }, [])

  // 버스 마커: 위치가 있을 때만 보이고, 버스를 따라간다
  useEffect(() => {
    const overlay = busOverlayRef.current
    if (!mapInstance || !overlay) return
    if (!busLocation) {
      overlay.setMap(null)
      return
    }
    const pos = new window.kakao.maps.LatLng(busLocation.latitude, busLocation.longitude)
    overlay.setPosition(pos)
    overlay.setMap(mapInstance)
    mapInstance.panTo(pos)
  }, [mapInstance, busLocation])

  // 노선: 지나온 구간(회색)·남은 구간(파랑), 정류장 마커, 내 아이 정류장
  useEffect(() => {
    const kakao = window.kakao
    if (!mapInstance || !kakao?.maps || stations.length === 0) return undefined
    const toLatLng = p => new kakao.maps.LatLng(p.latitude, p.longitude)
    const shapes = []
    const { passed, remaining } = routePaths(stations, busLocation, route.path)
    if (passed.length > 1) {
      shapes.push(new kakao.maps.Polyline({ map: mapInstance, path: passed.map(toLatLng), strokeWeight: 5, strokeColor: '#9CA3AF', strokeOpacity: 0.8, strokeStyle: 'solid' }))
    }
    if (remaining.length > 1) {
      shapes.push(new kakao.maps.Polyline({ map: mapInstance, path: remaining.map(toLatLng), strokeWeight: 5, strokeColor: '#2563EB', strokeOpacity: 0.8, strokeStyle: 'solid' }))
    }
    stations.forEach(s => {
      if (String(s.stopId) === String(childStopId)) {
        shapes.push(new kakao.maps.CustomOverlay({ map: mapInstance, position: toLatLng(s), content: childStopElement(`${childName ?? '우리 아이'} 정류장`), yAnchor: 1, zIndex: 2 }))
      } else {
        shapes.push(new kakao.maps.Marker({ map: mapInstance, position: toLatLng(s), title: s.name }))
      }
    })
    // 노선을 처음 받았을 때 한 번 노선 전체(도로가 정류장 밖으로 돌아가는 부분 포함)가 보이게 맞춘다
    const routeKey = `${stations.map(s => s.stopId).join(',')}:${route.path.length}`
    if (fittedRouteRef.current !== routeKey) {
      const bounds = new kakao.maps.LatLngBounds()
      stations.forEach(s => bounds.extend(toLatLng(s)))
      route.path.forEach(p => bounds.extend(toLatLng(p)))
      if (busLocation) bounds.extend(toLatLng(busLocation))
      mapInstance.setBounds(bounds)
      fittedRouteRef.current = routeKey
    }
    return () => shapes.forEach(shape => shape.setMap(null))
  }, [mapInstance, stations, route.path, busLocation, childStopId, childName])

  const stats = [
    ['우리 아이 정류장까지', childEta ? `${childEta.etaMinutes}분` : '-'],
    ['마지막 수신', isRunning ? updatedAgo(updatedAt, now) : '-'],
    ['현재속도', formatKmh(speed)],
  ]
  const emptyRouteText = isRunning ? '노선 정보를 불러오지 못했어요' : '운행이 시작되면 노선이 표시돼요'

  return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
        {portalContainer && createPortal(
            <BackButton
                to="/home"
                label=""
                style={{ color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center' }}
            />,
            portalContainer
        )}

        <div style={{ background: RIDE_TONE_BG[ride.tone], color: 'white', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 5, transition: 'background 0.3s ease' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', flexShrink: 0, animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
          <span style={{ fontSize: 14, fontWeight: 600, wordBreak: 'keep-all' }}>{ride.text}</span>
          <span style={{ fontSize: 12, opacity: 0.85, marginLeft: 'auto', whiteSpace: 'nowrap' }}>{statusRight}</span>
        </div>

        {toast && <Banner kind="info">{toast}</Banner>}
        {notice && <Banner kind={notice.level}>{notice.text}</Banner>}
        {offRoute !== null && <Banner kind="warn">버스가 노선에서 약 {formatDistance(offRoute)} 벗어나 있어요</Banner>}
        {signalLoss && <Banner kind="muted">{signalLoss}</Banner>}
        {wsState === 'reconnecting' && <Banner kind="muted">실시간 연결이 끊겨 다시 연결하고 있어요</Banner>}
        {!isRunning && locationError && <Banner kind="muted">{locationError}</Banner>}
        {isParentAccount && push && <PushPermissionBanner push={push} />}

        <div style={{ flex: 1, minHeight: 400, background: '#E8F0FE', position: 'relative' }}>
          <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />
          {stations.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, pointerEvents: 'none' }}>
                <div style={{ background: 'rgba(255,255,255,0.94)', padding: '14px 18px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', textAlign: 'center', maxWidth: '80%' }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111', wordBreak: 'keep-all' }}>{emptyRouteText}</p>
                </div>
              </div>
          )}
          <div style={{ position: 'absolute', bottom: 20, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
            <button type="button" onClick={() => { setIsSheetOpen(true); setIsRouteSheetOpen(false); }} style={{ padding: '10px 14px', background: '#1A56DB', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', cursor: 'pointer' }}>기사 정보 🚍</button>
            <button type="button" onClick={() => { setIsRouteSheetOpen(true); setIsSheetOpen(false); }} style={{ padding: '10px 14px', background: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', cursor: 'pointer' }}>전체 경로 🗺️</button>
          </div>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 5 }}>
          <div style={{ padding: '16px', background: 'white', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: '16px' }}>
              <p style={{ fontSize: 13, color: '#666', margin: 0, fontWeight: 600 }}>
                실시간 노선 진행 상태
                {updatedAt && <span style={{ marginLeft: 6, fontSize: 11, color: '#9CA3AF', fontWeight: 'normal' }}>({timeOfDay(updatedAt)})</span>}
              </p>
              {childStop && (
                  <span style={{ background: '#FEF08A', color: '#A16207', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                    {childName ?? '자녀'} 하차 · {childStop.name}
                  </span>
              )}
            </div>

            {stations.length === 0 ? (
                <p style={{ margin: 0, padding: '12px 0', fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>{emptyRouteText}</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', position: 'relative', paddingBottom: '12px', minWidth: `${stations.length * 72}px` }}>
                    <div style={{ position: 'absolute', top: '7px', left: 36, right: 36, height: '3px', background: '#E5E7EB', zIndex: 0 }} />
                    {stations.map((stop) => {
                      const isPassed = stop.status === 'PASSED'
                      const isCurrent = stop.status === 'ARRIVED'
                      const isMyChildStop = String(stop.stopId) === String(childStopId)
                      const dotColor = isPassed ? '#10B981' : isCurrent ? '#3B82F6' : '#D1D5DB'
                      let etaText = ''
                      let etaColor = '#9CA3AF'
                      if (isPassed) etaText = '통과'
                      else if (isCurrent) { etaText = '도착'; etaColor = '#3B82F6' }
                      else if (isMyChildStop && childEta) {
                        etaText = `${childEta.etaMinutes}분 후${childEta.lateRisk ? ' 🚨' : ''}`
                        etaColor = childEta.lateRisk ? '#DC2626' : '#10B981'
                      }
                      else if (stop.scheduledArrivalTime) etaText = `${stop.scheduledArrivalTime} 예정`
                      return (
                          <div key={stop.stopId} style={{ flex: 1, minWidth: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
                            <div style={{ width: isCurrent || isMyChildStop ? 16 : 12, height: isCurrent || isMyChildStop ? 16 : 12, borderRadius: '50%', background: isMyChildStop && !isPassed && !isCurrent ? '#FBBF24' : (isCurrent ? 'white' : dotColor), border: isCurrent ? '4px solid #3B82F6' : (isMyChildStop && !isPassed ? '4px solid #F59E0B' : 'none'), boxShadow: isCurrent ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none', transition: 'all 0.3s ease' }} />
                            <span style={{ fontSize: 11, color: isMyChildStop ? '#B45309' : (isCurrent ? '#111' : '#6B7280'), fontWeight: isCurrent || isMyChildStop ? 800 : 500, textAlign: 'center', wordBreak: 'keep-all', letterSpacing: '-0.5px' }}>{stop.name}</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: etaColor, minHeight: 14 }}>{etaText}</span>
                          </div>
                      )
                    })}
                  </div>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
              {stats.map(([k, v]) => (
                  <div key={k} style={{ textAlign: 'center', flex: 1 }}>
                    <p style={{ fontSize: 11, color: '#666', margin: 0, wordBreak: 'keep-all' }}>{k}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#111', marginTop: 4, marginBottom: 0 }}>{v}</p>
                  </div>
              ))}
            </div>
          </div>
        </div>

        {/* 기사 정보 바텀 시트 */}
        <div style={{ position: 'absolute', bottom: isSheetOpen ? '0' : '-100%', left: '0', width: '100%', background: 'white', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', boxShadow: '0 -4px 16px rgba(0,0,0,0.15)', transition: 'bottom 0.3s ease-in-out', zIndex: 100, padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111' }}>안심 통학 차량 정보</h3>
            <button type="button" onClick={() => setIsSheetOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <img src={driverInfo.photo} alt="기사님" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #E5E7EB' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: '#2563EB', fontWeight: '700', marginBottom: '2px' }}>{driverInfo.vehicleNumber}</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#111', marginBottom: '2px' }}>{driverInfo.driverName} 기사님</div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>{driverInfo.agency}</div>
            </div>
          </div>
          <a href={`tel:${driverInfo.contact}`} style={{ display: 'block', width: '100%', padding: '14px', background: '#10B981', color: 'white', textAlign: 'center', borderRadius: '12px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)' }}>
            📞 기사님께 바로 전화걸기
          </a>
        </div>

        {/* 전체 경로 노선도 바텀 시트 */}
        <div style={{ position: 'absolute', bottom: isRouteSheetOpen ? '0' : '-100%', left: '0', width: '100%', background: 'white', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', boxShadow: '0 -4px 16px rgba(0,0,0,0.15)', transition: 'bottom 0.3s ease-in-out', zIndex: 100, padding: '24px', maxHeight: '60%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111' }}>{route.routeName || '전체 운행 노선'}</h3>
            <button type="button" onClick={() => setIsRouteSheetOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}>✕</button>
          </div>
          {stations.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>{emptyRouteText}</p>
          ) : (
              <div style={{ flex: 1, overflowY: 'auto', paddingLeft: '8px', position: 'relative', paddingBottom: '20px' }}>
                <div style={{ position: 'absolute', top: '12px', bottom: '32px', left: '19px', width: '4px', background: '#E5E7EB', zIndex: 0 }} />
                {stations.map((stop) => {
                  const isPassed = stop.status === 'PASSED'
                  const isCurrent = stop.status === 'ARRIVED'
                  const isMyChildStop = String(stop.stopId) === String(childStopId)
                  return (
                      <div key={stop.stopId} style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', marginRight: '16px' }}>
                          {isCurrent ? <span style={{ fontSize: '18px' }}>🚌</span> : (
                              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: isPassed ? '#9CA3AF' : '#2563EB', border: isMyChildStop ? '2px solid #F59E0B' : 'none', boxShadow: isMyChildStop ? '0 0 0 2px #FEF08A' : 'none' }} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '15px', fontWeight: isCurrent || isMyChildStop ? '800' : '500', color: isPassed ? '#9CA3AF' : (isCurrent ? '#3B82F6' : '#111') }}>{stop.name}</span>
                          {isMyChildStop && (
                              <span style={{ marginLeft: '8px', background: '#FEF08A', color: '#A16207', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                                {childName ?? '우리 아이'} 하차 정류장
                              </span>
                          )}
                          {stop.scheduledArrivalTime && (
                              <div style={{ marginTop: 3, color: '#6B7280', fontSize: 12 }}>
                                <time dateTime={stop.scheduledArrivalTime}>{stop.scheduledArrivalTime}</time> 예정
                              </div>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: isCurrent ? '#FF3B3B' : (isPassed ? '#9CA3AF' : '#2563EB') }}>
                          {isCurrent ? '도착' : (isPassed ? '통과' : '대기')}
                        </div>
                      </div>
                  )
                })}
              </div>
          )}
        </div>
      </div>
  )
}
