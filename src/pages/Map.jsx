import { useEffect, useRef, useState } from 'react'

const MOCK_ROUTE = [
  { lat: 35.8714, lng: 128.6014 },
  { lat: 35.8725, lng: 128.6025 },
  { lat: 35.8738, lng: 128.6035 },
  { lat: 35.8750, lng: 128.6045 },
  { lat: 35.8765, lng: 128.6060 },
]

export default function Map() {
  const mapRef = useRef(null)
  const [status, setStatus] = useState('moving')
  const [speed, setSpeed] = useState(32)
  const [eta, setEta] = useState(14)

  useEffect(() => {
    let mapInterval = null;

    const initMap = () => {
      window.kakao.maps.load(() => {
        const container = mapRef.current;
        if (!container) return;

        // 0px 버그 방지를 위한 명시적 크기 할당
        container.style.width = '100%';
        container.style.height = '100%';

        const options = {
          center: new window.kakao.maps.LatLng(MOCK_ROUTE[0].lat, MOCK_ROUTE[0].lng),
          level: 4,
        };

        const map = new window.kakao.maps.Map(container, options);

        // 경로 선 그리기
        const linePath = MOCK_ROUTE.map(pos => new window.kakao.maps.LatLng(pos.lat, pos.lng));
        const polyline = new window.kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 5,
          strokeColor: '#2563EB',
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        });
        polyline.setMap(map);

        // 정류장 마커 표시
        MOCK_ROUTE.forEach(pos => {
          new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(pos.lat, pos.lng),
            map: map,
          });
        });

        // 셔틀버스 마커 커스텀 생성
        const busContent = document.createElement('div');
        busContent.style.width = '32px';
        busContent.style.height = '32px';
        busContent.style.background = '#FF3B3B';
        busContent.style.borderRadius = '50%';
        busContent.style.display = 'flex';
        busContent.style.alignItems = 'center';
        busContent.style.justifyContent = 'center';
        busContent.style.color = 'white';
        busContent.style.fontSize = '16px';
        busContent.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        busContent.style.border = '2px solid white';
        busContent.innerHTML = '🚌';

        const busMarker = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(MOCK_ROUTE[0].lat, MOCK_ROUTE[0].lng),
          content: busContent,
          map: map,
          yAnchor: 0.5,
        });

        // 차량 이동 시뮬레이션 (3초마다)
        let currentIndex = 0;
        mapInterval = setInterval(() => {
          currentIndex = (currentIndex + 1) % MOCK_ROUTE.length;
          const nextPos = new window.kakao.maps.LatLng(MOCK_ROUTE[currentIndex].lat, MOCK_ROUTE[currentIndex].lng);

          busMarker.setPosition(nextPos);
          map.panTo(nextPos);

          setSpeed(Math.floor(Math.random() * 20 + 20));
          setEta(Math.max(14 - currentIndex * 3, 0));

          if (currentIndex === MOCK_ROUTE.length - 1) {
            setStatus('arrived');
            setSpeed(0);
          } else {
            setStatus('moving');
          }
        }, 3000);
      });
    };

    // 보안을 위해 환경변수(.env)에서 키를 안전하게 불러옴
    const scriptId = 'kakao-map-sdk-script';
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${import.meta.env.VITE_KAKAO_MAP_KEY}&autoload=false&libraries=services,clusterer`;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      if (window.kakao && window.kakao.maps) {
        initMap();
      } else {
        script.addEventListener('load', initMap);
      }
    }

    return () => {
      if (mapInterval) clearInterval(mapInterval);
      if (script) script.removeEventListener('load', initMap);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 상태 바 */}
      <div style={{ background: STATUS_CONFIG[status].bg, color: 'white', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', animation: status === 'moving' ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>{STATUS_CONFIG[status].label}</span>
        <span style={{ fontSize: 12, opacity: 0.8, marginLeft: 'auto' }}>{STATUS_CONFIG[status].sub}</span>
      </div>

      {/* 지도 영역 */}
      <div style={{ flex: 1, minHeight: 400, background: '#E8F0FE', position: 'relative' }}>
        <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />

        <div style={{ position: 'absolute', bottom: 20, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
          {['내 위치', '전체 경로', '새로고침'].map((label) => (
            <button key={label} style={{ padding: '10px 14px', background: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 하단 정보 패널 */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ padding: '14px 16px', background: 'white', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>현재 이동 경로</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RoutePoint color="#10B981" label="집" />
            <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg, #10B981, #3B82F6)', borderRadius: 2 }} />
            <RoutePoint color="#3B82F6" label="수학학원" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            {[['이동거리', '2.4km'], ['예상도착', `${eta}분`], ['현재속도', `${speed}km/h`]].map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#666' }}>{k}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111', marginTop: 2 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 이동 이력 */}
        <div style={{ fontSize: 13, color: '#666' }}>
          <p style={{ fontWeight: 600, color: '#333', marginBottom: 8 }}>오늘의 이동 이력</p>
          {HISTORY.map((h) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span>{h.icon}</span>
              <span style={{ flex: 1 }}>{h.event}</span>
              <span style={{ color: '#999' }}>{h.time}</span>
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
      <span style={{ fontSize: 11, color: '#666', fontWeight: 600 }}>{label}</span>
    </div>
  )
}

const STATUS_CONFIG = {
  moving: { bg: 'linear-gradient(90deg, #1A56DB, #2563EB)', label: '이동 중 · 수학학원 방면', sub: '예상 도착 14분' },
  arrived: { bg: 'linear-gradient(90deg, #00C49A, #00A882)', label: '도착 완료', sub: '수학학원 도착' },
  alert: { bg: 'linear-gradient(90deg, #FF3B3B, #E00)', label: '⚠️ 경로 이탈 감지', sub: '학부모 알림 발송됨' },
}

const HISTORY = [
  { id: 1, icon: '🏠', event: '집에서 출발', time: '13:55' },
  { id: 2, icon: '📍', event: '경산시 통과', time: '13:58' },
  { id: 3, icon: '🚦', event: '정차 (신호)', time: '14:02' },
]