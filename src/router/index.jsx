import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import RoleHomeRedirect from '@/components/common/RoleHomeRedirect'
import { USER_ROLES } from '@/context/AuthContext'

// 로그인 화면만 바로 불러오고, 나머지 화면은 그 화면에 들어갈 때 불러온다 (첫 로딩 파일 크기 감소)
import Login from '@/pages/Login'

// 배포하면 예전 화면 파일이 지워진다(S3 sync --delete). 앱을 켜 둔 채 새 배포가 나면
// 아직 안 연 화면 파일을 못 받을 수 있으므로, 그때 한 번만 새로고침해서 새 파일을 받는다.
const RELOAD_KEY = 'i-route-chunk-reload'
const lazyPage = (load) => lazy(() => load()
  .then(mod => { try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* 저장소 사용 불가 */ } return mod })
  .catch(err => {
    let reloaded = true
    try { reloaded = sessionStorage.getItem(RELOAD_KEY) === '1'; sessionStorage.setItem(RELOAD_KEY, '1') } catch { /* 저장소 사용 불가 */ }
    if (!reloaded) { window.location.reload(); return new Promise(() => {}) }
    throw err
  }))

const Register = lazyPage(() => import('@/pages/Register'))
const FindId = lazyPage(() => import('@/pages/FindId'))
const FindPassword = lazyPage(() => import('@/pages/FindPassword'))
const ResetPassword = lazyPage(() => import('@/pages/ResetPassword'))
const EmailVerify = lazyPage(() => import('@/pages/EmailVerify'))
const OAuthCallback = lazyPage(() => import('@/pages/OAuthCallback'))
const Home = lazyPage(() => import('@/pages/Home'))
const Map = lazyPage(() => import('@/pages/Map'))
const Learning = lazyPage(() => import('@/pages/Learning'))
const Notice = lazyPage(() => import('@/pages/Notice'))
const Profile = lazyPage(() => import('@/pages/Profile'))
const EditProfile = lazyPage(() => import('@/pages/EditProfile'))
const ChangePassword = lazyPage(() => import('@/pages/ChangePassword'))
const DeleteAccount = lazyPage(() => import('@/pages/DeleteAccount'))
const DriverBoardingList = lazyPage(() => import('@/pages/DriverBoardingList'))
const DriverMapPage = lazyPage(() => import('@/pages/DriverMapPage'))
const AdminLearning = lazyPage(() => import('@/pages/AdminLearning'))
const Board = lazyPage(() => import('@/pages/Board'))
const BoardPostList = lazyPage(() => import('@/pages/BoardPostList'))
const BoardDetail = lazyPage(() => import('@/pages/BoardDetail'))
const BoardWrite = lazyPage(() => import('@/pages/BoardWrite'))
const BoardEdit = lazyPage(() => import('@/pages/BoardEdit'))
const BoardManageEdit = lazyPage(() => import('@/pages/BoardManageEdit'))
const Payment = lazyPage(() => import('@/pages/Payment'))
const PaymentSuccess = lazyPage(() => import('@/pages/PaymentSuccess'))
const PaymentBillingSuccess = lazyPage(() => import('@/pages/PaymentBillingSuccess'))
const PaymentFail = lazyPage(() => import('@/pages/PaymentFail'))
const PaymentHistory = lazyPage(() => import('@/pages/PaymentHistory'))
const Notifications = lazyPage(() => import('@/pages/Notifications'))
const Attendance = lazyPage(() => import('@/pages/Attendance'))
const Help = lazyPage(() => import('@/pages/Help'))
const Terms = lazyPage(() => import('@/pages/Terms'))
const PushNotificationSettings = lazyPage(() => import('@/pages/PushNotificationSettings'))

function PageLoading() {
  return (
    <div role="status" aria-label="화면을 불러오는 중" style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--color-primary-light, #E8EFFF)', borderTopColor: 'var(--color-primary, #1A56DB)', animation: 'page-spin 0.7s linear infinite' }} />
      <style>{'@keyframes page-spin { to { transform: rotate(360deg) } }'}</style>
    </div>
  )
}

// 화면을 불러오는 동안 로딩 표시
const page = (Component) => (
  <Suspense fallback={<PageLoading />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter([
  // 비로그인 인증/계정 관련
  { path: '/login', element: <Login /> },
  { path: '/register', element: page(Register) },
  { path: '/find-id', element: page(FindId) },
  { path: '/find-password', element: page(FindPassword) },
  { path: '/reset-password', element: page(ResetPassword) },
  { path: '/email/verify', element: page(EmailVerify) },

  // OAuth 소셜 로그인 콜백
  { path: '/oauth/callback', element: page(OAuthCallback) },
  { path: '/oauth/callback/:provider', element: page(OAuthCallback) },
  { path: '/oauth/:provider/callback', element: page(OAuthCallback) },

  // 로그인 필요 서비스 전체 라우트 (AppLayout 공통 적용)
  {
    path: '/',
    element: (
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RoleHomeRedirect /> },
      // 자녀 수에 상관없이 누구나 접근 가능
      { path: 'home', element: page(Home) },
      { path: 'map', element: page(Map)},
      { path: 'learning', element: page(Learning) },
      { path: 'notice', element: page(Notice) },

      // 커뮤니티 / 게시판 (에브리타임식 2단계 구조)
      { path: 'board', element: page(Board) },
      { path: 'board/:boardId', element: page(BoardPostList) },
      { path: 'board/:boardId/write', element: page(BoardWrite) },
      { path: 'board/:boardId/manage', element: page(BoardManageEdit) },
      { path: 'posts/:postId', element: page(BoardDetail) },
      { path: 'posts/:postId/edit', element: page(BoardEdit) },

      // 프로필 및 설정
      { path: 'profile', element: page(Profile) },
      { path: 'profile/edit', element: page(EditProfile) },
      { path: 'profile/password', element: page(ChangePassword) },
      { path: 'profile/delete', element: page(DeleteAccount) },
      { path: 'help', element: page(Help) },
      { path: 'terms', element: page(Terms) },
      { path: 'notification-settings', element: page(PushNotificationSettings) },

      // 결제 및 알림
      { path: 'payment', element: page(Payment) },
      { path: 'payment/success', element: page(PaymentSuccess) },
      { path: 'payment/billing/success', element: page(PaymentBillingSuccess) },
      { path: 'payment/fail', element: page(PaymentFail) },
      { path: 'payment/history', element: page(PaymentHistory) },
      { path: 'notifications', element: page(Notifications) },

      // 기사 권한 라우트
      { path: 'driver/boarding', element: page(DriverBoardingList) },
      { path: 'driver/map', element: page(DriverMapPage) },

      // 역할 제한 페이지
      {
        path: 'admin/learning',
        element: (
            <ProtectedRoute allowedRoles={[USER_ROLES.ACADEMY, USER_ROLES.TEACHER, USER_ROLES.ADMIN]}>
              {page(AdminLearning)}
            </ProtectedRoute>
        ),
      },
      {
        path: 'attendance',
        element: (
            <ProtectedRoute allowedRoles={[USER_ROLES.PARENT, USER_ROLES.ACADEMY, USER_ROLES.ADMIN, USER_ROLES.DRIVER]}>
              {page(Attendance)}
            </ProtectedRoute>
        ),
      },
    ],
  },

  // 정의되지 않은 모든 주소는 로그인 페이지로 리다이렉트
  { path: '*', element: <Navigate to="/login" replace /> },
])