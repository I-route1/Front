import { useEffect, useRef, useState } from 'react'

export default function Map() {
  const mapRef    = useRef(null)
  const [status, setStatus] = useState('moving') // 'moving' | 'arrived' | 'alert'

  useEffect(() => {
    /**
     * TODO: 카카오 지도 SDK 초기화
     *
     * 1. index.html에 SDK 스크립트 추가:
     *    <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_APP_KEY&libraries=services,clusterer"></script>
     *
     * 2. 아래 주석 해제 후 사용:
     *
     * const container = mapRef.current
     * const options = {
     *   center: new window.kakao.maps.LatLng(35.8714, 128.6014), // 대구
     *   level: 4,
     * }
     * const map = new window.kakao.maps.Map(container, options)
     *
     * // WebSocket으로 실시간 위치 수신
     * const ws = new WebSocket(import.meta.env.VITE_WS_URL)
     * ws.onmessage = (e) => {
     *   const { lat, lng } = JSON.parse(e.data)
     *   const pos = new window.kakao.maps.LatLng(lat, lng)
     *   marker.setPosition(pos)
     *   map.panTo(pos)
     * }
     *
     * return () => ws.close()
     */
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 상태 바 */}
      <div style={{
        background: STATUS_CONFIG[status].bg,
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'white',
          animation: status === 'moving' ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{STATUS_CONFIG[status].label}</span>
        <span style={{ fontSize: 12, opacity: 0.8, marginLeft: 'auto' }}>
          {STATUS_CONFIG[status].sub}
        </span>
      </div>

      {/* 지도 영역 */}
      <div
        ref={mapRef}
        style={{
          flex: 1,
          minHeight: 360,
          background: 'linear-gradient(135deg, #E8F0FE 0%, #D0E4FF 100%)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* 개발 중 플레이스홀더 */}
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>카카오 지도 영역</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>SDK 연동 후 지도가 표시됩니다</p>
        </div>

        {/* 플로팅 컨트롤 */}
        <div style={{
          position: 'absolute', bottom: 20, right: 16,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {['내 위치', '전체 경로', '새로고침'].map((label) => (
            <button key={label} style={{
              padding: '10px 14px',
              background: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              boxShadow: 'var(--shadow-md)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 하단 정보 패널 */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 경로 정보 */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 10 }}>현재 이동 경로</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RoutePoint color="var(--color-success)" label="집" />
            <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, var(--color-success), var(--color-primary))', borderRadius: 2 }} />
            <RoutePoint color="var(--color-primary)" label="수학학원" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            {[['이동거리', '2.4km'], ['예상도착', '14분'], ['현재속도', '32km/h']].map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{k}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginTop: 2 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 이동 이력 */}
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
          <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>오늘의 이동 이력</p>
          {HISTORY.map((h) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
              <span>{h.icon}</span>
              <span style={{ flex: 1 }}>{h.event}</span>
              <span style={{ color: 'var(--color-text-muted)' }}>{h.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RoutePoint({ color, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

const STATUS_CONFIG = {
  moving:  { bg: 'linear-gradient(90deg, #1A56DB, #2563EB)', label: '이동 중 · 수학학원 방면', sub: '예상 도착 14분' },
  arrived: { bg: 'linear-gradient(90deg, #00C49A, #00A882)', label: '도착 완료',               sub: '수학학원 도착' },
  alert:   { bg: 'linear-gradient(90deg, #FF3B3B, #E00)',    label: '⚠️ 경로 이탈 감지',       sub: '학부모 알림 발송됨' },
}

const HISTORY = [
  { id: 1, icon: '🏠', event: '집에서 출발',   time: '13:55' },
  { id: 2, icon: '📍', event: '경산시 통과',   time: '13:58' },
  { id: 3, icon: '🚦', event: '정차 (신호)',   time: '14:02' },
]
