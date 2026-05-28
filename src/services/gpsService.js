import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 기사 앱에서 현재 차량의 GPS 위치(위도, 경도, 속도, 방향 등)를 서버로 전송
 * @param {Object} locationData GPS 데이터 객체
 * @param {number} locationData.busId 차량 ID (Long 타입에 대응)
 * @param {number} locationData.latitude 현재 위도 (Double)
 * @param {number} locationData.longitude 현재 경도 (Double)
 * @param {number} locationData.speed 차량 속도 (Integer)
 * @param {number} locationData.heading 차량 이동 방향 각도 (Integer)
 * @returns {Promise<Object>} 서버 응답 데이터 (success, code, message 등)
 */
export const sendGpsLocation = async (locationData) => {
  try {
    const response = await api.post('/api/gps/locations', locationData);
    return response.data; // 성공 시 data(실제 응답 본문) 반환
  } catch (error) {
    if (error.response) {
      // 서버가 2xx 범위를 벗어나는 상태 코드로 응답한 경우 (예: 400, 500)
      console.error(
        `[GPS 전송 에러 - 서버 응답 오류] 상태 코드: ${error.response.status}`,
        error.response.data
      );
    } else if (error.request) {
      // 요청이 전송되었으나 응답을 받지 못한 경우 (네트워크 오류, 서버 다운 등)
      console.error('[GPS 전송 에러 - 응답 없음] 네트워크 상태를 확인해주세요.', error.request);
    } else {
      // 요청 설정 중에 문제가 발생한 경우
      console.error('[GPS 전송 에러 - 설정 오류]', error.message);
    }

    // 호출부(컴포넌트)에서 UI 에러 처리를 할 수 있도록 에러를 다시 던짐
    throw error;
  }
};

/**
 * 학부모 앱에서 특정 차량의 최신 위치를 단발성으로 조회
 * @param {number} busId 차량 ID
 * @returns {Promise<Object>} 서버 응답 데이터
 */
export const getBusCurrentLocation = async (busId) => {
  try {
    const response = await api.get(`/api/gps/buses/${busId}/current-location`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(
        `[GPS 조회 에러 - 서버 응답 오류] 상태 코드: ${error.response.status}`,
        error.response.data
      );
    } else if (error.request) {
      console.error('[GPS 조회 에러 - 응답 없음] 네트워크 상태를 확인해주세요.', error.request);
    } else {
      console.error('[GPS 조회 에러 - 설정 오류]', error.message);
    }
    throw error;
  }
};
