# 아이루트 (i-route) — React PWA

자녀의 안전한 학원 통학을 위한 GPS 기반, AI를 활용한 학습 로드맵 통합 플랫폼

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


## 👥 사용자 역할

| 역할 | 상수 | 설명 |
|------|------|------|
| 학부모 | `USER_ROLES.PARENT`  | 자녀 위치 추적, 알림 수신, 학습 로드맵 확인 |
| 기사   | `USER_ROLES.DRIVER`  | GPS 위치 송신 |
| 학원   | `USER_ROLES.ACADEMY` | 공지, 메시지 관리 |
