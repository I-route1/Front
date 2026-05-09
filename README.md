# 아이루트 (i-route) — React PWA

자녀의 안전한 학원 통학을 위한 GPS 기반 통합 플랫폼

---

## 🚀 시작하기

```bash
# 1. 패키지 설치
npm install

# 2. 환경변수 설정
cp .env.example .env
# → .env 파일에 카카오 API 키 등 입력

# 3. 개발 서버 실행
npm run dev

# 4. 빌드 (PWA 포함)
npm run build
```

## 📁 프로젝트 구조

```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.jsx     # 앱 셸 (TopBar + BottomNav + Outlet)
│   │   ├── TopBar.jsx        # 상단 헤더
│   │   └── BottomNav.jsx     # 하단 탭 네비게이션
│   └── common/
│       └── ProtectedRoute.jsx
├── context/
│   └── AuthContext.jsx       # 인증 상태 (역할: 학부모/기사/학원/학생)
├── pages/
│   ├── Login.jsx             # 카카오 로그인
│   ├── Home.jsx              # 홈 대시보드
│   ├── Map.jsx               # 실시간 위치 추적 (카카오맵)
│   ├── Learning.jsx          # AI 학습 로드맵
│   ├── Notice.jsx            # 공지 / 메시지
│   └── Profile.jsx           # 마이페이지
├── router/
│   └── index.jsx             # React Router v6 설정
└── styles/
    └── global.css            # 디자인 토큰 + 모바일 레이아웃
```

## 🗺️ 카카오 지도 연동

1. [카카오 개발자 콘솔](https://developers.kakao.com)에서 앱 생성
2. `index.html`에 SDK 스크립트 추가:
```html
<script type="text/javascript"
  src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${VITE_KAKAO_MAP_KEY}&libraries=services,clusterer">
</script>
```
3. `src/pages/Map.jsx`의 TODO 주석 참고하여 구현

## 🔑 카카오 OAuth 연동

`src/context/AuthContext.jsx`의 `loginWithKakao()` 함수에 구현  
→ [카카오 로그인 REST API 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)

## 🔔 FCM 푸시 알림

`vite.config.js`의 Workbox 설정 및 `.env` 파일의 Firebase 변수 참고

## ☁️ Vercel 배포

```bash
# Vercel CLI
npm i -g vercel
vercel

# 또는 GitHub 연동 → Vercel 대시보드에서 자동 배포
# Build Command: npm run build
# Output Directory: dist
```

## 🎨 디자인 토큰

`src/styles/global.css`의 `:root`에 모든 CSS 변수 정의:
- `--color-primary`: #1A56DB (신뢰 블루)
- `--color-accent`: #FF6B35 (알림 오렌지)
- `--color-success`: #00C49A (도착 그린)
- `--app-max-width`: 430px (모바일 최대 너비)

## 👥 사용자 역할

| 역할 | 상수 | 설명 |
|------|------|------|
| 학부모 | `USER_ROLES.PARENT`  | 자녀 위치 추적, 알림 수신 |
| 기사   | `USER_ROLES.DRIVER`  | GPS 위치 송신 |
| 학원   | `USER_ROLES.ACADEMY` | 공지, 메시지 관리 |
| 학생   | `USER_ROLES.STUDENT` | 학습 로드맵 확인 |
