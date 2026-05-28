import React, { useState, useEffect, useRef } from 'react';
import { sendGpsLocation } from '../services/gpsService';

const DriverMapPage = ({ busId = 1 }) => {
  // 상태 관리: API 전송 상태 및 메시지, 최근 전송된 위치 데이터
  const [statusMessage, setStatusMessage] = useState('GPS 연결 대기 중...');
  const [isSending, setIsSending] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);

  // 메모리 누수 방지 및 인터벌 관리를 위해 useRef 사용
  const intervalRef = useRef(null);

  // 더미 데이터 생성 함수 (실제 환경에서는 Geolocation API 등을 연동)
  const getCurrentLocationData = () => {
    return {
      busId: busId,
      latitude: 35.8428 + (Math.random() - 0.5) * 0.001, // 임의의 약간의 위치 변화
      longitude: 128.5586 + (Math.random() - 0.5) * 0.001,
      speed: Math.floor(Math.random() * 60), // 0 ~ 59 km/h 속도 시뮬레이션
      heading: Math.floor(Math.random() * 360) // 0 ~ 359도 방향
    };
  };

  // 서버로 GPS 위치 정보를 전송하는 비동기 함수
  const transmitLocation = async () => {
    setIsSending(true);
    setStatusMessage('위치 전송 중...');

    const locationData = getCurrentLocationData();

    try {
      // 서비스 레이어로 분리된 API 함수 호출
      const response = await sendGpsLocation(locationData);

      if (response && response.success) {
        // 성공 시 화면 업데이트
        setStatusMessage(`전송 성공 (${new Date().toLocaleTimeString()})`);
        setLastLocation(locationData);
      } else {
        setStatusMessage(`전송 실패: ${response?.message || '알 수 없는 오류'}`);
      }
    } catch (error) {
      // 예외 발생 시 에러 메시지 표시
      setStatusMessage('전송 에러: 서버에 연결할 수 없습니다.');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    // 1. 컴포넌트 마운트 시 즉시 첫 위치 전송
    transmitLocation();

    // 2. 5초마다 주기적으로 위치 전송
    intervalRef.current = setInterval(() => {
      transmitLocation();
    }, 5000);

    // 3. 클린업 함수: 컴포넌트 언마운트 시 인터벌 해제하여 메모리 누수 방지
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log('GPS 전송 인터벌 정리 완료');
      }
    };
  }, [busId]); // busId가 변경될 경우 인터벌을 재시작

  // UI 렌더링 (간단한 인라인 스타일 적용)
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ color: '#333' }}>기사 앱 - 실시간 차량 위치 전송</h2>

      {/* 상태 표시 패널 */}
      <div style={{
        padding: '15px',
        borderRadius: '8px',
        backgroundColor: isSending ? '#e3f2fd' : '#f5f5f5',
        marginBottom: '20px',
        border: '1px solid #ddd',
        transition: 'background-color 0.3s'
      }}>
        <p style={{ margin: '5px 0' }}><strong>현재 상태:</strong> {statusMessage}</p>
        <p style={{ margin: '5px 0' }}><strong>차량 번호 (ID):</strong> {busId}</p>
      </div>

      {/* 마지막 전송된 데이터 표시 */}
      {lastLocation && (
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          backgroundColor: '#f9fbe7',
          border: '1px solid #cddc39'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#558b2f' }}>마지막 전송 데이터</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '1.6' }}>
            <li><strong>위도:</strong> {lastLocation.latitude.toFixed(6)}</li>
            <li><strong>경도:</strong> {lastLocation.longitude.toFixed(6)}</li>
            <li><strong>속도:</strong> {lastLocation.speed} km/h</li>
            <li><strong>방향:</strong> {lastLocation.heading}°</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default DriverMapPage;
