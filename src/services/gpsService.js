import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': '69420',
  },
});

// 인터셉터: sessionStorage 토큰 자동 첨부
api.interceptors.request.use((config) => {
  try {
    const saved = sessionStorage.getItem('i-route-user');
    if (saved) {
      const user = JSON.parse(saved);
      if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
    }
  } catch {}
  return config;
});

const handleError = (label, error) => {
  if (error.response) {
    console.error(`[${label} - 서버 오류] ${error.response.status}`, error.response.data);
  } else if (error.request) {
    console.error(`[${label} - 응답 없음] 네트워크를 확인해주세요.`);
  } else {
    console.error(`[${label} - 설정 오류]`, error.message);
  }
  throw error;
};

/**
 * 기사 앱: GPS 위치 전송
 * POST /api/gps/locations
 * Body: { busId, latitude, longitude, speed, heading }
 */
export const sendGpsLocation = async (locationData) => {
  try {
    const res = await api.post('/api/gps/locations', locationData);
    return res.data;
  } catch (e) { handleError('GPS 전송', e); }
};

/**
 * 학부모 앱: 버스 현재 위치 조회
 * GET /api/gps/buses/{busId}/current-location
 * 응답: { busId, latitude, longitude, speed, heading, updatedAt, busNumber, driverName, driverPhoneNumber }
 */
export const getBusCurrentLocation = async (busId) => {
  try {
    const res = await api.get(`/api/gps/buses/${busId}/current-location`);
    return res.data;
  } catch (e) { handleError('버스 위치 조회', e); }
};

/**
 * 학부모 앱: 버스 노선·정류장 진행 상태·기사 정보 조회
 * GET /api/gps/buses/{busId}/route
 * 응답: { busId, routeId, routeName, busNumber, driverName, driverPhoneNumber,
 *         stops: [{ stopId, stopName, latitude, longitude, stopOrder, status, etaMinutes }] }
 * status: BEFORE_ARRIVAL | ARRIVED | PASSED
 */
export const getBusRoute = async (busId) => {
  try {
    const res = await api.get(`/api/gps/buses/${busId}/route`);
    return res.data;
  } catch (e) { handleError('버스 노선 조회', e); }
};

/**
 * 학부모 앱: 학생별 ETA 목록 조회
 * GET /api/gps/buses/{busId}/etas
 * 응답: [{ studentId, studentName, stopId, stopName, etaMinutes, delayMinutes, lateRisk, delayReason }]
 */
export const getStudentEtas = async (busId) => {
  try {
    const res = await api.get(`/api/gps/buses/${busId}/etas`);
    return res.data;
  } catch (e) { handleError('학생별 ETA 조회', e); }
};

/**
 * 학부모 앱: 학생 현재 탑승 위치 조회
 * GET /api/gps/students/{studentId}/current-location
 * - 탑승 중: 200 + { busId, latitude, longitude, ... }
 * - 하차 후: 204 No Content (null 반환)
 */
export const getStudentCurrentLocation = async (studentId) => {
  try {
    const res = await api.get(`/api/gps/students/${studentId}/current-location`);
    return res.status === 204 ? null : res.data;
  } catch (e) {
    if (e.response?.status === 204) return null;
    handleError('학생 탑승 위치 조회', e);
  }
};
