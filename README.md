# 아이루트 (i-route)

> 자녀의 안전한 학원 통학을 위한 **GPS 기반 통합 플랫폼**
> React + Vite로 구축한 모바일 우선 PWA

<p>
  <img alt="React"        src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" />
  <img alt="Vite"         src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white" />
  <img alt="React Router" src="https://img.shields.io/badge/React%20Router-6.26-CA4245?logo=reactrouter&logoColor=white" />
  <img alt="PWA"          src="https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white" />
  <img alt="Vercel"       src="https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white" />
</p>

---

## 📌 프로젝트 소개

**아이루트(i-route)** 는 학원을 오가는 자녀의 위치를 학부모가 실시간으로 확인하고, 학원·기사·학생이 같은 플랫폼 안에서 소통할 수 있게 하는 모바일 PWA입니다.

- 📍 GPS 기반 실시간 통학 위치 추적
- 🔔 승하차/도착 알림 (FCM 예정)
- 🧭 학원 · 기사 · 학부모 3-역할 통합 UI
- 📊 AI 학습 로드맵 시각화 (Recharts)
- 📱 모바일 우선 + 홈 화면 설치 가능 (PWA)

---

## 🛠 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Core | React 18.3, Vite 5.4 |
| Routing | React Router v6.26 |
| Chart | Recharts 2.15 |
| PWA | vite-plugin-pwa 0.20 |
| Styling | Vanilla CSS + CSS Custom Properties |
| Lint | ESLint (flat config) |
| Deploy | Vercel |

---

## 🚀 시작하기

### 요구 사항

- Node.js **18 이상** 권장
- npm 9+ (또는 pnpm / yarn)

### 설치 & 실행

```bash
# 1. 저장소 클론
git clone https://github.com/I-route1/Front.git
cd Front

# 2. 패키지 설치
npm install

# 3. 환경변수 설정
cp .env.example .env
# → .env 파일을 열어 카카오/Firebase 키 등을 입력

# 4. 개발 서버 실행 (기본 http://localhost:5173)
npm run dev
```

### 사용 가능한 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 (PWA 포함) |
| `npm run preview` | 빌드 결과 로컬 미리보기 |

---

## 📁 프로젝트 구조

```
Front/
├── public/                 # 정적 자산 (아이콘, manifest 등)
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.jsx     # 앱 셸 (TopBar + BottomNav + Outlet)
│   │   │   ├── TopBar.jsx        # 상단 헤더
│   │   │   └── BottomNav.jsx     # 하단 탭 네비게이션
│   │   └── common/
│   │       └── ProtectedRoute.jsx
│   ├── context/
│   │   └── AuthContext.jsx       # 인증 상태 (역할별 분기)
│   ├── pages/
│   │   ├── Login.jsx             # 카카오 로그인
│   │   ├── Home.jsx              # 홈 대시보드
│   │   ├── Map.jsx               # 실시간 위치 추적 (카카오맵)
│   │   ├── Learning.jsx          # AI 학습 로드맵
│   │   ├── Notice.jsx            # 공지 / 메시지
│   │   └── Profile.jsx           # 마이페이지
│   ├── router/
│   │   └── index.jsx             # React Router v6 설정
│   └── styles/
│       └── global.css            # 디자인 토큰 + 모바일 레이아웃
├── index.html
├── vite.config.js
├── vercel.json
└── package.json
```

---

## 👥 사용자 역할

| 역할 | 상수 | 주요 기능 |
| --- | --- | --- |
| 학부모 | `USER_ROLES.PARENT` | 자녀 위치 추적, 알림 수신, 학습 로드맵 확인 |
| 기사 | `USER_ROLES.DRIVER` | GPS 위치 송신, 탑승/하차 처리 |
| 학원 | `USER_ROLES.ACADEMY` | 공지·메시지 관리, 차량 운영 |

`AuthContext`의 현재 역할에 따라 메뉴와 접근 가능한 라우트가 분기됩니다.

---

## 🎨 디자인 시스템

`src/styles/global.css`의 `:root`에 전체 디자인 토큰이 정의돼 있습니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-primary` | `#1A56DB` | 신뢰 블루 (CTA, 강조) |
| `--color-accent` | `#FF6B35` | 알림 오렌지 |
| `--color-success` | `#00C49A` | 도착 그린 |
| `--app-max-width` | `430px` | 모바일 최대 너비 |

---

## 🔌 외부 서비스 연동

### 🗺️ 카카오 지도

1. [카카오 개발자 콘솔](https://developers.kakao.com)에서 앱을 생성합니다.
2. `index.html`에 SDK 스크립트를 추가합니다.

   ```html
   <script
     type="text/javascript"
     src="//dapi.kakao.com/v2/maps/sdk.js?appkey=${VITE_KAKAO_MAP_KEY}&libraries=services,clusterer"
   ></script>
   ```

3. `src/pages/Map.jsx`의 TODO 주석을 참고해 지도/마커/실시간 위치 로직을 구현합니다.

### 🔑 카카오 OAuth

`src/context/AuthContext.jsx`의 `loginWithKakao()` 함수에서 구현합니다.

- 참고: [카카오 로그인 REST API 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)


## ☁️ Vercel 배포

저장소에 포함된 `vercel.json`이 SPA 라우팅을 처리합니다.

```bash
# Vercel CLI
npm i -g vercel
vercel
```

또는 GitHub 저장소를 Vercel에 연결해 자동 배포할 수 있습니다.

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: 위 [환경변수](#-환경변수) 항목을 Vercel 대시보드에 동일하게 등록

---
