import { useEffect, useRef, useState } from 'react'
import { Client } from '@stomp/stompjs';
import { requestAndGetFCMToken, initForegroundMessageListener } from '../utils/fcm';
import { getBusCurrentLocation, getBusRoute, getStudentEtas, getStudentCurrentLocation } from '../services/gpsService';

const MOCK_ROUTE = [
  { id: 1, name: '유치원', lat: 35.8714, lng: 128.6014 },
  { id: 2, name: '푸르지오', lat: 35.8725, lng: 128.6025 },
  { id: 3, name: '계양네거리', lat: 35.8738, lng: 128.6035 },
  { id: 4, name: '영남대역', lat: 35.8750, lng: 128.6045 },
  { id: 5, name: '압량우미린', lat: 35.8765, lng: 128.6060 },
]

const MY_CHILD_STOP_ID = 4;

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

  const [currentStopIndex, setCurrentStopIndex] = useState(0)
  const [driverInfo, setDriverInfo] = useState(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isRouteSheetOpen, setIsRouteSheetOpen] = useState(false)

  const [isDelayed, setIsDelayed] = useState(false)

  const [errorMessage, setErrorMessage] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [busLocation, setBusLocation] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)
  const [busMarker, setBusMarker] = useState(null)
  const [routeData, setRouteData] = useState({ stations: [], currentStationId: null, routeName: '' });
  const [studentEtas, setStudentEtas] = useState([]);
  const [isChildOnBoard, setIsChildOnBoard] = useState(null); // null=미확인, true=탑승중, false=하차완료

  const displayStations = routeData.stations.length > 0
    ? routeData.stations
    : MOCK_ROUTE.map((stop, i) => ({
      stationId: stop.id,
      stationName: stop.name,
      sequence: i + 1,
      status: i < currentStopIndex ? 'PASSED' : (i === currentStopIndex ? 'ARRIVING' : 'NOT_YET')
    }));

  const activeStationIndex = displayStations.findIndex(s => s.status === 'ARRIVING');
  const activeIndex = activeStationIndex !== -1 ? activeStationIndex : currentStopIndex;
  const globalEta = Math.max(12 - activeIndex * 3, 0) + (isDelayed ? 5 : 0);

  useEffect(() => {
    setDriverInfo(mockVehicleInfo)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locRes, routeRes, etaRes] = await Promise.allSettled([
          getBusCurrentLocation(1),
          getBusRoute(1),
          getStudentEtas(1)
        ]);

        // 버스 현재 위치 — 백엔드가 직접 반환 (래퍼 없음)
        if (locRes.status === 'fulfilled' && locRes.value?.latitude) {
          const { latitude, longitude, updatedAt: updatedTime, speed: currentSpeed } = locRes.value;
          setBusLocation({ lat: latitude, lng: longitude });
          setUpdatedAt(updatedTime);
          if (currentSpeed !== undefined) setSpeed(currentSpeed);
          setErrorMessage(null);
        } else if (locRes.status === 'rejected' || !locRes.value) {
          setErrorMessage("현재 운행 중인 셔틀버스가 없습니다");
        }

        // 버스 노선 — stops 배열을 stations 형식으로 변환
        // StopStatus: BEFORE_ARRIVAL | ARRIVED | PASSED
        if (routeRes.status === 'fulfilled' && routeRes.value) {
          const route = routeRes.value;
          const stops = route.stops || [];
          const stations = stops.map(s => ({
            stationId: s.stopId,
            stationName: s.stopName,
            sequence: s.stopOrder,
            status: s.status === 'ARRIVED'        ? 'ARRIVING'
                  : s.status === 'PASSED'          ? 'PASSED'
                  : /* BEFORE_ARRIVAL */             'NOT_YET',
            etaMinutes: s.etaMinutes,
          }));
          const currentStop = stops.find(s => s.status === 'ARRIVED');
          setRouteData({
            stations,
            currentStationId: currentStop?.stopId ?? null,
            routeName: route.routeName,
          });
          // 기사 정보는 노선 응답에서 가져옴
          setDriverInfo(prev => ({
            ...(prev || mockVehicleInfo),
            vehicleNumber: route.busNumber    || mockVehicleInfo.vehicleNumber,
            driverName:    route.driverName   || mockVehicleInfo.driverName,
            contact:       route.driverPhoneNumber || mockVehicleInfo.contact,
          }));
        }

        // 학생별 ETA — 배열 직접 반환
        if (etaRes.status === 'fulfilled' && Array.isArray(etaRes.value)) {
          setStudentEtas(etaRes.value);
        }

        // 학생 탑승 여부 (user.id를 studentId로 사용, 없으면 skip)
        try {
          const childStudentId = 1; // TODO: 실제 서비스에서는 user.children[0].id 사용
          const studentLoc = await getStudentCurrentLocation(childStudentId);
          if (studentLoc === null) {
            // 204 → 하차 완료
            setIsChildOnBoard(false);
            setStatus('child_arrived');
          } else {
            setIsChildOnBoard(true);
          }
        } catch {}

      } catch (err) {
        setErrorMessage("데이터를 불러오는 중 오류가 발생했습니다.");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    requestAndGetFCMToken();
    initForegroundMessageListener();
  }, []);

  useEffect(() => {
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('Connected to STOMP WebSocket');
        client.subscribe('/topic/bus/1', (message) => {
          if (message.body) {
            try {
              const data = JSON.parse(message.body);

              if (data.latitude && data.longitude) {
                setBusLocation({ lat: data.latitude, lng: data.longitude });
              }
              if (data.speed !== undefined) {
                setSpeed(data.speed);
              }
              if (data.updatedAt) {
                setUpdatedAt(data.updatedAt);
              }

              setDriverInfo(prev => ({
                ...(prev || mockVehicleInfo),
                vehicleNumber: data.busNumber || prev?.vehicleNumber || mockVehicleInfo.vehicleNumber,
                driverName: data.driverName || prev?.driverName || mockVehicleInfo.driverName,
                contact: data.driverPhoneNumber || prev?.contact || mockVehicleInfo.contact
              }));

              setErrorMessage(null);
            } catch (error) {
              console.error('Error parsing WebSocket message:', error);
            }
          }
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        setErrorMessage('실시간 데이터 서버에서 오류가 발생했습니다.');
      },
      onWebSocketError: (event) => {
        console.error('WebSocket connection error:', event);
        setErrorMessage('실시간 데이터 서버와 연결이 끊어졌습니다. 재연결을 시도합니다.');
      },
      onWebSocketClose: () => {
        console.log('WebSocket connection closed');
      }
    });

    client.activate();

    return () => {
      client.deactivate();
      console.log('STOMP Client deactivated on cleanup');
    };
  }, []);

  useEffect(() => {
    if (mapInstance && busMarker && busLocation) {
      const loc = new window.kakao.maps.LatLng(busLocation.lat, busLocation.lng);
      busMarker.setPosition(loc);
      mapInstance.panTo(loc);
    }
  }, [mapInstance, busMarker, busLocation]);

  useEffect(() => {
    let isMounted = true;

    const initMap = () => {
      window.kakao.maps.load(() => {
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
        setMapInstance(map);

        const passedPolyline = new window.kakao.maps.Polyline({
          path: [new window.kakao.maps.LatLng(MOCK_ROUTE[0].lat, MOCK_ROUTE[0].lng)],
          strokeWeight: 5,
          strokeColor: '#9CA3AF',
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        });
        passedPolyline.setMap(map);

        const remainingPolyline = new window.kakao.maps.Polyline({
          path: MOCK_ROUTE.map(pos => new window.kakao.maps.LatLng(pos.lat, pos.lng)),
          strokeWeight: 5,
          strokeColor: '#2563EB',
          strokeOpacity: 0.8,
          strokeStyle: 'solid'
        });
        remainingPolyline.setMap(map);

        MOCK_ROUTE.forEach((pos) => {
          new window.kakao.maps.Marker({
            position: new window.kakao.maps.LatLng(pos.lat, pos.lng),
            map: map,
            title: pos.name
          });
        });

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

        const marker = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(MOCK_ROUTE[0].lat, MOCK_ROUTE[0].lng),
          content: busContent,
          map: map,
          yAnchor: 0.5,
        });
        setBusMarker(marker);
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
      isMounted = false;
      if (script) script.removeEventListener('load', initMap);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>

      {errorMessage && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <style>
            {`
              @keyframes spinner-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '80%' }}>
            {errorMessage.includes('재연결') ? (
              <div style={{
                width: '36px',
                height: '36px',
                border: '4px solid #DBEAFE',
                borderTop: '4px solid #2563EB',
                borderRadius: '50%',
                animation: 'spinner-spin 1s linear infinite',
                marginBottom: '16px'
              }} />
            ) : (
              <span style={{ fontSize: '32px', display: 'block', marginBottom: '16px' }}>🚫</span>
            )}
            <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#111', lineHeight: '1.4', wordBreak: 'keep-all' }}>
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      {studentEtas.length > 0 && (() => {
        const myChildEta = studentEtas[0];
        return (
          <div style={{
            background: myChildEta.lateRisk ? '#FEF2F2' : '#EFF6FF',
            borderBottom: `1px solid ${myChildEta.lateRisk ? '#FCA5A5' : '#BFDBFE'}`,
            color: myChildEta.lateRisk ? '#DC2626' : '#1E3A8A',
            padding: '10px 20px',
            fontSize: '13px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 6
          }}>
            <span>{myChildEta.lateRisk ? '🚨' : 'ℹ️'}</span>
            {myChildEta.studentName} 어린이의 {myChildEta.stopName} 하차까지 {myChildEta.etaMinutes}분 남았습니다.
            {myChildEta.lateRisk && ' (지각 위험)'}
          </div>
        );
      })()}

      {isDelayed && (
        <div style={{ background: '#FEF2F2', borderBottom: '1px solid #FCA5A5', color: '#DC2626', padding: '10px 20px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 6 }}>
          <span>⚠️</span> 교통 혼잡으로 인해 예상 도착 시간이 5분 지연되고 있습니다.
        </div>
      )}

      {(status === 'child_arrived' || isChildOnBoard === false) && (
        <div style={{ background: '#ECFDF5', borderBottom: '1px solid #A7F3D0', color: '#047857', padding: '10px 20px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 6 }}>
          <span>✅</span> 우리 아이 하차가 완료되었습니다.
        </div>
      )}

      {status === 'ended' && (
        <div style={{ background: '#F3F4F6', borderBottom: '1px solid #D1D5DB', color: '#374151', padding: '10px 20px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 6 }}>
          <span></span> 차량 운행이 종료되었습니다.
        </div>
      )}

      <div style={{ background: isDelayed ? '#EF4444' : STATUS_CONFIG[status].bg, color: 'white', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 5, transition: 'background 0.3s ease' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', animation: status === 'moving' ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {status === 'moving' ? `이동 중 · ${displayStations[activeIndex]?.stationName || ''} 부근` : STATUS_CONFIG[status].label}
        </span>
        <span style={{ fontSize: 12, opacity: 0.8, marginLeft: 'auto' }}>
          {status === 'moving' ? `종점 도착 ${globalEta}분 전` : STATUS_CONFIG[status].sub}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 400, background: '#E8F0FE', position: 'relative' }}>
        <div ref={mapRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }} />

        <div style={{ position: 'absolute', bottom: 20, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
          <button onClick={() => { setIsSheetOpen(true); setIsRouteSheetOpen(false); }} style={{ padding: '10px 14px', background: '#1A56DB', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', cursor: 'pointer' }}>
            기사 정보 🚍
          </button>
          <button onClick={() => { setIsRouteSheetOpen(true); setIsSheetOpen(false); }} style={{ padding: '10px 14px', background: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#333', boxShadow: '0 2px 4px rgba(0,0,0,0.15)', cursor: 'pointer' }}>
            전체 경로 🗺️
          </button>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, zIndex: 5 }}>

        <div style={{ padding: '16px', background: 'white', borderRadius: 12, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: 13, color: '#666', margin: 0, fontWeight: 600 }}>
              실시간 노선 진행 상태
              {updatedAt && <span style={{ marginLeft: 6, fontSize: 11, color: '#9CA3AF', fontWeight: 'normal' }}>({new Date(updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})</span>}
            </p>
            <span style={{ background: '#FEF08A', color: '#A16207', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '800' }}>
              영남대역 하차 예정
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', paddingBottom: '12px' }}>
            <div style={{ position: 'absolute', top: '7px', left: '10%', right: '10%', height: '3px', background: '#E5E7EB', zIndex: 0 }} />

            {displayStations.map((stop, index) => {
              const isPassed = stop.status === 'PASSED';
              const isCurrent = stop.status === 'ARRIVING';
              const isMyChildStop = stop.stationId === MY_CHILD_STOP_ID;

              const dotColor = isPassed ? '#10B981' : isCurrent ? '#3B82F6' : '#D1D5DB';

              let etaText = '';
              let etaColor = '#9CA3AF';

              if (isPassed) {
                etaText = '통과';
              } else if (isCurrent) {
                etaText = '도착예정';
                etaColor = '#3B82F6';
              } else {
                let mins = Math.max((index - activeIndex) * 3, 3);
                if (isDelayed) mins += 5;
                etaText = `${mins}분 후`;
                etaColor = isDelayed ? '#DC2626' : '#10B981';

                const matchedEta = studentEtas.find(eta => eta.stopId === stop.stationId);
                if (matchedEta) {
                  etaText = `${matchedEta.etaMinutes}분 후`;
                  if (matchedEta.lateRisk) {
                    etaColor = '#DC2626';
                    etaText += ' 🚨';
                  }
                }
              }

              return (
                <div key={stop.stationId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1, width: '20%' }}>
                  <div style={{
                    width: isCurrent || isMyChildStop ? 16 : 12,
                    height: isCurrent || isMyChildStop ? 16 : 12,
                    borderRadius: '50%',
                    background: isMyChildStop && !isPassed && !isCurrent ? '#FBBF24' : (isCurrent ? 'white' : dotColor),
                    border: isCurrent ? `4px solid #3B82F6` : (isMyChildStop && !isPassed ? `4px solid #F59E0B` : `none`),
                    boxShadow: isCurrent ? '0 0 0 4px rgba(59, 130, 246, 0.2)' : 'none',
                    transition: 'all 0.3s ease'
                  }} />

                  <span style={{
                    fontSize: 11,
                    color: isMyChildStop ? '#B45309' : (isCurrent ? '#111' : '#6B7280'),
                    fontWeight: isCurrent || isMyChildStop ? 800 : 500,
                    textAlign: 'center',
                    wordBreak: 'keep-all',
                    letterSpacing: '-0.5px'
                  }}>
                    {stop.stationName}
                  </span>

                  <span style={{ fontSize: '10px', fontWeight: '700', color: etaColor }}>
                    {etaText}
                  </span>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid #F3F4F6' }}>
            {[['이동거리', `${(activeIndex * 1.2).toFixed(1)}km`], ['종점 도착', `${globalEta}분`], ['현재속도', `${speed}km/h`]].map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#666' }}>{k}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111', marginTop: 4 }}>{v}</p>
              </div>
            ))}
          </div>
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
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111' }}>안심 통학 차량 정보</h3>
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

      {/* 전체 경로 노선도 바텀 시트 */}
      <div style={{
        position: 'absolute',
        bottom: isRouteSheetOpen ? '0' : '-100%',
        left: '0',
        width: '100%',
        background: 'white',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
        transition: 'bottom 0.3s ease-in-out',
        zIndex: 100,
        padding: '24px',
        maxHeight: '60%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#111' }}>전체 운행 노선</h3>
          <button onClick={() => setIsRouteSheetOpen(false)} style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingLeft: '8px', position: 'relative', paddingBottom: '20px' }}>
          <div style={{ position: 'absolute', top: '12px', bottom: '32px', left: '19px', width: '4px', background: '#E5E7EB', zIndex: 0 }} />

          {displayStations.map((stop, index) => {
            const isPassed = stop.status === 'PASSED';
            const isCurrent = stop.status === 'ARRIVING';
            const isMyChildStop = stop.stationId === MY_CHILD_STOP_ID;

            return (
              <div key={stop.stationId} style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', marginRight: '16px' }}>
                  {isCurrent ? (
                    <span style={{ fontSize: '18px' }}>🚌</span>
                  ) : (
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: isPassed ? '#9CA3AF' : '#2563EB',
                      border: isMyChildStop ? '2px solid #F59E0B' : 'none',
                      boxShadow: isMyChildStop ? '0 0 0 2px #FEF08A' : 'none'
                    }} />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: isCurrent || isMyChildStop ? '800' : '500',
                    color: isPassed ? '#9CA3AF' : (isCurrent ? '#3B82F6' : '#111')
                  }}>
                    {stop.stationName}
                  </span>
                  {isMyChildStop && (
                    <span style={{ marginLeft: '8px', background: '#FEF08A', color: '#A16207', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '700' }}>
                      우리 아이 하차 정류장
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '12px', fontWeight: '700', color: isCurrent ? '#FF3B3B' : (isPassed ? '#9CA3AF' : '#2563EB') }}>
                  {isCurrent ? '도착예정' : (isPassed ? '통과' : '대기')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  )
}

const STATUS_CONFIG = {
  moving: { bg: 'linear-gradient(90deg, #1A56DB, #2563EB)', label: '이동 중', sub: '' },
  child_arrived: { bg: 'linear-gradient(90deg, #10B981, #059669)', label: '영남대역 도착 완료', sub: '자녀 하차 완료' },
  ended: { bg: 'linear-gradient(90deg, #4B5563, #374151)', label: '운행 종료', sub: '운행 완료' },
}