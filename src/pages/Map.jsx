import { useEffect, useRef, useState } from 'react'

// 정류장 데이터 고도화 (이름과 ID 추가)
const MOCK_ROUTE = [
  { id: 1, name: '유치원', lat: 35.8714, lng: 128.6014 },
  { id: 2, name: '푸르지오', lat: 35.8725, lng: 128.6025 },
  { id: 3, name: '계양네거리', lat: 35.8738, lng: 128.6035 },
  { id: 4, name: '영남대역', lat: 35.8750, lng: 128.6045 },
  { id: 5, name: '압량우미린', lat: 35.8765, lng: 128.6060 },
]

// 기사님 모킹 데이터
const mockVehicleInfo = {
  vehicleNumber: '경산 71자 1234',
  driverName: '김태균',
  agency: '경산 해바라기 유치원',
  contact: '010-1234-5678',
  photo: 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'
};

export default function Map() {
  const mapRef = useRef(null)
  const [status, setStatus] = useState('moving')
  const [speed, setSpeed] = useState(32)
  const [eta, setEta] = useState(14)

  // 현재 정류장 위치를 추적하는 State 추가
  const [currentStopIndex, setCurrentStopIndex] = useState(0)

  // 기사 정보 바텀 시트 상태
  const [driverInfo, setDriverInfo] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    setDriverInfo(mockVehicleInfo)
  }, [])

  useEffect(() => {
    let mapInterval = null;
    // 🚀 1. 수정: 중복 실행을 막기 위한 안전장치(플래그) 추가
    let isMounted = true;

    const initMap = () => {
      window.kakao.maps.load(() => {
        // 🚀 2. 수정: 컴포넌트가 두 번 렌더링되면서 생긴 '유령 타이머' 실행 차단
        if (!isMounted) return;

        const container = mapRef.current;
        if (!container) return;

        container.style.width = '100%';
        container.style.height = '100%';

        const options = {
          center: new window.kakao.maps.LatLng(MOCK_ROUTE[0].lat, MOCK_ROUTE[0].lng),
          level: 4,
        };

        const map = new window.kakao.maps.Map(container, options);

        // 다중 Polyline 사용 (지나온 경로 gray, 남은 경로 blue)
        const passedPolyline = new window.kakao.maps.Polyline({
          path: [new window.kakao.maps.LatLng(MOCK_ROUTE[0].lat, MOCK_ROUTE[0].lng)],
          strokeWeight: 5,
          strokeColor: '#9CA3AF', // 회색 (지나온 구간)
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        });
        passedPolyline.setMap(map);

        const remainingPolyline = new window.kakao.maps.Polyline({
          path: MOCK_ROUTE.map(pos => new window.kakao.maps.LatLng(pos.lat, pos.lng)),
          strokeWeight: 5,
          strokeColor: '#2563EB', // 파란색 (남은 구간)
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        });
        remainingPolyline.setMap(map);

        // 정류장 마커 표시
        MOCK_ROUTE.forEach((pos, index) => {
          new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(pos.lat, pos.lng),
            map: map,
            title: pos.name
          });
        });

        // 셔틀버스 커스텀 마커
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
        busContent.style.transition = 'all 0.5s ease';
        busContent.innerHTML = '🚌';

        const busMarker = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(MOCK_ROUTE[0].lat, MOCK_ROUTE[0].lng),
          content: busContent,
          map: map,
          yAnchor: 0.5,
        });

        // 5초 주기 실시간 GPS 수신 모사 (setInterval)
        let localIndex = 0;
        mapInterval = setInterval(() => {
          localIndex = (localIndex + 1) % MOCK_ROUTE.length;
          const nextPos = new window.kakao.maps.LatLng(MOCK_ROUTE[localIndex].lat, MOCK_ROUTE[localIndex].lng);

          busMarker.setPosition(nextPos);
          map.panTo(nextPos);

          // React UI 업데이트를 위한 State 갱신
          setCurrentStopIndex(localIndex);
          setSpeed(Math.floor(Math.random() * 20 + 20));
          setEta(Math.max(15 - localIndex * 3, 0));

          // 실시간 선 갱신 로직
          const passedRoute = MOCK_ROUTE.slice(0, localIndex + 1);
          const passedPath = passedRoute.map(pos => new window.kakao.maps.LatLng(pos.lat, pos.lng));
          passedPolyline.setPath(passedPath);

          const remainingRoute = MOCK_ROUTE.slice(localIndex);
          const remainingPath = remainingRoute.map(pos => new window.kakao.maps.LatLng(pos.lat, pos.lng));
          remainingPolyline.setPath(remainingPath);

          if (localIndex === MOCK_ROUTE.length - 1) {
            setStatus('arrived');
            setSpeed(0);
          } else {
            setStatus('moving');
          }
        }, 5000);
      });
    };

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
      // 🚀 3. 수정: 컴포넌트가 꺼질 때 안전장치를 끄고 기존 타이머를 확실히 폐기합니다.
      isMounted = false;
      if (mapInterval) clearInterval(mapInterval);
      if (script) script.removeEventListener('load', initMap);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {/* 상태 바 */}
      <div style={{ background: STATUS_CONFIG[status].bg, color: 'white', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 5 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', animation: status === 'moving' ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {status === 'moving' ? `이동 중 · ${MOCK_ROUTE[currentStopIndex]?.name} 부근` : STATUS_CONFIG[status].label}
        </span>
        <span style={{ fontSize: 12, opacity: 0.8, marginLeft: 'auto' }}>
          {status === 'moving' ? `종점 도착 ${eta}분 전` : STATUS_CONFIG[status].sub}
        </span>
      </div>

      {/* 지도 영역 */}
      <div style={{ flex: 1, minHeight: 400, background: '#E8F0FE', position: 'relative' }}>
        <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />

        {/* 우측 컨트롤 버튼 */}
        <div style={{ position: 'absolute', bottom: 20, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
          <button onClick={() => setIsSheetOpen(true)} style={{ padding: '10px 14px', background: '#1A56DB', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', cursor: 'pointer' }}>
            기사 정보 🚍
          </button>
          {['내 위치', '전체 경로', '새로고침'].map((label) => (
            <button key={label} style={{ padding: '10px 14px', background: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 하단 정보 패널 */}
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 5 }}>

        {/* 실시간 노선 진행 상태 UI */}
        <div style={{ padding: '16px', background: 'white', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16, fontWeight: 600 }}>실시간 노선 진행 상태</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', paddingBottom: '12px' }}>
            <div style={{ position: 'absolute', top: '7px', left: '10%', right: '10%', height: '3px', background: '#E5E7EB', zIndex: 0 }} />

            {MOCK_ROUTE.map((stop, index) => {
              const isPassed = index < currentStopIndex;
              const isCurrent = index === currentStopIndex;

              const dotColor = isPassed ? '#10B981' : isCurrent ? '#3B82F6' : '#D1D5DB';

              return (
                <div key={stop.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 1, width: '20%' }}>
                  <div style={{
                    width: isCurrent ? 16 : 12,
                    height: isCurrent ? 16 : 12,
                    borderRadius: '50%',
                    background: isCurrent ? 'white' : dotColor,
                    border: isCurrent ? `4px solid #3B82F6` : `none`,
                    boxShadow: isCurrent ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none',
                    transition: 'all 0.3s ease'
                  }} />
                  <span style={{
                    fontSize: 11,
                    color: isCurrent ? '#111' : '#6B7280',
                    fontWeight: isCurrent ? 800 : 500,
                    textAlign: 'center',
                    wordBreak: 'keep-all',
                    letterSpacing: '-0.5px'
                  }}>
                    {stop.name}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
            {[['이동거리', `${(currentStopIndex * 1.2).toFixed(1)}km`], ['종점 도착', `${eta}분`], ['현재속도', `${speed}km/h`]].map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#666' }}>{k}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111', marginTop: 4 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 이동 이력 */}
        <div style={{ fontSize: 13, color: '#666' }}>
          <p style={{ fontWeight: 600, color: '#333', marginBottom: 8 }}>오늘의 운행 알림</p>
          {HISTORY.map((h) => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span>{h.icon}</span>
              <span style={{ flex: 1 }}>{h.event}</span>
              <span style={{ color: '#999' }}>{h.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 기사 정보 바텀 시트 */}
      <div style={{
        position: 'absolute',
        bottom: isSheetOpen ? '0' : '-100%',
        left: '0',
        width: '100%',
        background: 'white',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
        transition: 'bottom 0.3s ease-in-out',
        zIndex: 100,
        padding: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111' }}>🚍 안심 통학 차량 정보</h3>
          <button onClick={() => setIsSheetOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}>✕</button>
        </div>

        {driverInfo && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
            <img src={driverInfo.photo} alt="기사님" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #E5E7EB' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', color: '#2563EB', fontWeight: '700', marginBottom: '2px' }}>{driverInfo.vehicleNumber}</div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#111', marginBottom: '2px' }}>{driverInfo.driverName} 기사님</div>
              <div style={{ fontSize: '13px', color: '#6B7280' }}>{driverInfo.agency}</div>
            </div>
          </div>
        )}

        <a href={`tel:${driverInfo?.contact}`} style={{ display: 'block', width: '100%', padding: '14px', background: '#10B981', color: 'white', textAlign: 'center', borderRadius: '12px', fontSize: '16px', fontWeight: '700', textDecoration: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', transition: 'opacity 0.15s' }}>
          📞 기사님께 바로 전화걸기
        </a>
      </div>
    </div>
  )
}

const STATUS_CONFIG = {
  moving: { bg: 'linear-gradient(90deg, #1A56DB, #2563EB)', label: '이동 중', sub: '' },
  arrived: { bg: 'linear-gradient(90deg, #00C49A, #00A882)', label: '도착 완료', sub: '종점 도착' },
  alert: { bg: 'linear-gradient(90deg, #FF3B3B, #E00)', label: '⚠️ 경로 이탈 감지', sub: '학부모 알림 발송됨' },
}

const HISTORY = [
  { id: 1, icon: '🏠', event: '유치원에서 출발', time: '13:55' },
  { id: 2, icon: '📍', event: '사동 푸르지오 통과', time: '13:58' },
  { id: 3, icon: '🚦', event: '정차 대기', time: '14:02' },
]