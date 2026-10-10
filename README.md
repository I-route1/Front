# 아이루트 (i-route)

> 자녀의 안전한 학원 통학과 맞춤 학습을 돕는 **GPS + AI 학습 통합 플랫폼**
> React + Vite로 만든 모바일 우선 PWA

<p>
  <img alt="React"        src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white" />
  <img alt="Vite"         src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white" />
  <img alt="React Router" src="https://img.shields.io/badge/React%20Router-6.26-CA4245?logo=reactrouter&logoColor=white" />
  <img alt="PWA"          src="https://img.shields.io/badge/PWA-ready-5A0FC8?logo=pwa&logoColor=white" />
  <img alt="AWS"          src="https://img.shields.io/badge/Deploy-S3%20%2B%20CloudFront-FF9900?logo=amazonaws&logoColor=white" />
</p>

- 운영 사이트: https://d2nos5u98g310z.cloudfront.net
- 관련 저장소: [Backend](https://github.com/I-route1/Backend) (`develop` 브랜치가 최신) · [AI](https://github.com/I-route1/AI)

---

## 📌 프로젝트 소개

**아이루트(i-route)** 는 학원을 오가는 자녀의 위치를 학부모가 실시간으로 확인하고, 학원·기사·학부모가 한 플랫폼에서 소통하며, AI가 학생별 학습 리포트를 만들어 주는 모바일 PWA입니다.

- 📍 GPS 기반 실시간 통학 위치 추적 (카카오맵 + WebSocket)
- 🚌 NFC 승하차 출결 (학부모 / 학원 / 기사 화면)
- 📊 성적·학습 패턴 분석, 성장 예측
- 🤖 AI 과목별 리포트(수학·국어·영어·과학·사회·프리미엄), 개념 추천, AI 질문
- 📝 학원 게시판, 🔔 알림(FCM), 💳 프리미엄 결제(토스페이먼츠)
- 📱 모바일 우선 + 홈 화면 설치 가능 (PWA)

---

## 🛠 기술 스택

| 영역 | 사용 기술 |
| --- | --- |
| Core | React 18.3, Vite 5.4 |
| Routing | React Router 6.26 |
| Chart / 수식 | Recharts 2.15, KaTeX |
| 실시간 | @stomp/stompjs (WebSocket) |
| 푸시 | Firebase Cloud Messaging |
| 지도 | Kakao Maps JavaScript SDK |
| 결제 | 토스페이먼츠 |
| PWA | vite-plugin-pwa 0.20 |
| Styling | Vanilla CSS + CSS Custom Properties |
| Deploy | GitHub Actions → AWS S3 + CloudFront |

---

## 🚀 시작하기

### 요구 사항

- **Node.js 20 (LTS)**: 배포 서버와 같은 버전입니다. 다른 버전에서는 설치 경고가 나거나 `esbuild` 설치 스크립트가 막힐 수 있습니다.
- Git

```bash
node -v   # v20.x.x 확인
```

### 설치 & 실행

```bash
# 1. 저장소 클론
git clone https://github.com/I-route1/Front.git
cd Front

# 2. 패키지 설치 (package-lock.json 그대로 설치)
npm ci

# 3. 환경변수 파일 만들기
cp .env.example .env
# → .env를 열어 비어 있는 키를 채웁니다 (아래 '환경변수' 참고)

# 4. 개발 서버 실행
npm run dev
```

브라우저에서 **http://localhost:3000** 을 엽니다. 포트는 `vite.config.js`에서 3000으로 고정되어 있습니다.

> 백엔드를 로컬에 띄울 필요는 없습니다. `.env`의 `VITE_API_URL`이 배포된 백엔드를 가리키고, 백엔드 CORS가 `localhost:3000`을 허용합니다.

### 사용 가능한 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 (http://localhost:3000) |
| `npm run build` | 프로덕션 빌드 (PWA 포함, `dist/`) |
| `npm run preview` | 빌드 결과 로컬 미리보기 |

---

## 🔑 환경변수

`.env`는 `.gitignore`에 포함되어 있어 커밋되지 않습니다. 비어 있는 키 값은 팀원에게 받습니다. 운영 배포에서는 같은 값이 GitHub Secrets에 등록되어 있습니다.

| 변수 | 설명 | 없으면 |
| --- | --- | --- |
| `VITE_API_URL` | 백엔드 API 주소 | 앱 전체가 동작하지 않음 |
| `VITE_WS_URL` | 실시간 위치 WebSocket 주소 (`/ws`) | 지도 실시간 위치 X |
| `VITE_KAKAO_MAP_KEY` | 카카오맵 JavaScript 키 | 지도 X |
| `VITE_KAKAO_CLIENT_ID` | 카카오 로그인 REST API 키 | 카카오 로그인 X |
| `VITE_KAKAO_REDIRECT_URI` | 카카오 로그인 콜백 주소 | 카카오 로그인 X |
| `VITE_TOSS_CLIENT_KEY` | 토스페이먼츠 클라이언트 키 | 결제 X |
| `VITE_FIREBASE_*` (7개) | FCM 푸시 알림 설정 | 푸시 알림 X |

카카오 로그인을 로컬에서 쓰려면 카카오 개발자 콘솔의 Redirect URI에 `http://localhost:3000/oauth/kakao/callback`이 등록되어 있어야 합니다.

---

## 👥 사용자 역할

| 역할 | 값 | 로그인 후 첫 화면 | 주요 기능 |
| --- | --- | --- | --- |
| 학부모 | `PARENT` | `/home` | 자녀 위치·출결 확인, 성적·AI 리포트, 알림 |
| 학원 / 강사 / 관리자 | `ACADEMY` / `TEACHER` / `ADMIN` | `/admin/learning` | 학생 성적 등록·분석, 피드백, 출결 관리, 게시판 |
| 기사 | `DRIVER` | `/map` | GPS 위치 송신, 승하차 명단·수동 처리 |

역할 판별과 첫 화면은 `src/context/AuthContext.jsx`(`normalizeRole`, `getDefaultRoute`)에 있고, 역할별 접근 제한은 `ProtectedRoute`의 `allowedRoles`로 합니다.

테스트 계정은 팀 내부에서 공유합니다. 이 저장소는 공개 저장소이므로 비밀번호를 커밋하지 않습니다.

---

## 📁 프로젝트 구조

```
Front/
├── .github/workflows/deploy.yml   # main push → S3 업로드 + CloudFront 캐시 무효화
├── public/                        # 정적 자산, FCM 서비스 워커
├── src/
│   ├── api/                       # 백엔드 API 모듈 (도메인별 파일)
│   │   └── client.js              # 공통 fetch: 토큰 첨부, 401 시 토큰 재발급 후 재시도
│   ├── components/
│   │   ├── common/                # ProtectedRoute, MathText(KaTeX), 로딩/에러/빈 화면 등
│   │   ├── home/                  # 홈 위젯
│   │   └── layout/                # AppLayout, TopBar, BottomNav
│   ├── context/AuthContext.jsx    # 로그인 상태, 역할 처리 (sessionStorage 'i-route-user')
│   ├── pages/
│   │   ├── Learning/              # 학습 탭: 성적·패턴·추천·예측·AI 리포트·AI 질문
│   │   ├── AdminLearning/         # 학원용 학습 관리, 학생 상세
│   │   ├── Attendance/            # 출결 (학부모 / 학원 / 기사)
│   │   ├── Map.jsx, DriverMapPage.jsx
│   │   ├── Board*.jsx             # 게시판
│   │   ├── Payment*.jsx           # 결제
│   │   └── ...                    # 로그인·회원가입·프로필·알림 등
│   ├── router/index.jsx           # 라우트 정의
│   ├── services/gpsService.js     # 기사 GPS 송신
│   ├── styles/global.css          # 디자인 토큰 + 모바일 레이아웃
│   └── utils/                     # FCM, 리포트 과목 등
├── index.html                     # 카카오맵 SDK 로드
├── vite.config.js                 # PWA, '@' → src 별칭, 포트 3000
└── package.json
```

---

## 🔌 서버 구성

```
[Front (이 저장소)] ──HTTPS──▶ [Backend (Spring Boot, AWS EC2)] ──▶ [AI 서버 (FastAPI)]
```

- 프론트는 **백엔드만** 호출합니다. AI 서버를 직접 부르지 않습니다.
- 백엔드는 항상 켜져 있습니다. 상태 확인: `{VITE_API_URL}/health`
- API 명세(Swagger): `{VITE_API_URL}/swagger-ui.html`
- AI 서버는 팀원 PC에서 따로 실행합니다. 꺼져 있으면 **AI 리포트·AI 질문·개념 추천**만 동작하지 않습니다. AI 리포트 탭에는 "AI 서버가 실행 중이지 않습니다" 안내가 표시되고, 나머지 AI 기능은 다른 에러 문구가 나오거나 로딩이 길어질 수 있습니다.
- AI 리포트 지원 과목은 수학·국어·영어·과학·사회입니다. 한국사는 지원하지 않습니다.

---

## 🌿 작업 방식

```bash
git checkout main && git pull
git checkout -b feat/작업이름        # 버그 수정은 fix/, 문서는 docs/
# 작업 후
npm run build                         # 빌드가 통과하는지 꼭 확인
git add . && git commit -m "feat: 무엇을 했는지"
git push -u origin feat/작업이름     # GitHub에서 main으로 PR
```

- **`main`에 합쳐지면 바로 운영 사이트에 배포됩니다.** `main`에 직접 push하지 말고 PR로 합칩니다.
- 커밋 메시지 접두어: `feat` 기능 · `fix` 버그 · `chore` 설정 · `ci` 배포 · `docs` 문서 · `refactor` 정리

---

## ☁️ 배포

`.github/workflows/deploy.yml`

1. `main`에 push되거나 Actions 탭에서 수동 실행하면
2. Node 20으로 `npm ci` → `npm run build` (환경변수는 GitHub Secrets)
3. `dist/`를 S3에 업로드 (`--delete`)
4. CloudFront 캐시 무효화

배포 직후 예전 화면이 보이면 PWA 캐시 때문일 수 있습니다. 시크릿 창으로 열거나 새로고침을 몇 번 해 봅니다.

---

## 🎨 디자인 시스템

`src/styles/global.css`의 `:root`에 디자인 토큰이 정의되어 있습니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--color-primary` | `#1A56DB` | 신뢰 블루 (CTA, 강조) |
| `--color-accent` | `#FF6B35` | 알림 오렌지 |
| `--color-success` | `#00C49A` | 도착 그린 |
| `--app-max-width` | `430px` | 모바일 최대 너비 |
