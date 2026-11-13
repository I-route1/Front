import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/common/ProtectedRoute'
import RoleHomeRedirect from '@/components/common/RoleHomeRedirect'
import { USER_ROLES } from '@/context/AuthContext'

import Login from '@/pages/Login'
import Register from '@/pages/Register'
import FindId from '@/pages/FindId'
import FindPassword from '@/pages/FindPassword'
import ResetPassword from '@/pages/ResetPassword'
import EmailVerify from '@/pages/EmailVerify'
import OAuthCallback from '@/pages/OAuthCallback'

import Home from '@/pages/Home'
import Map from '@/pages/Map'
import Learning from '@/pages/Learning'
import Notice from '@/pages/Notice'
import Profile from '@/pages/Profile'
import EditProfile from '@/pages/EditProfile'
import ChangePassword from '@/pages/ChangePassword'
import DeleteAccount from '@/pages/DeleteAccount'

import DriverBoardingList from '@/pages/DriverBoardingList'
import DriverMapPage from '@/pages/DriverMapPage'
import AdminLearning from '@/pages/AdminLearning'

import Board from '@/pages/Board'
import BoardPostList from '@/pages/BoardPostList'
import BoardDetail from '@/pages/BoardDetail'
import BoardWrite from '@/pages/BoardWrite'
import BoardEdit from '@/pages/BoardEdit'
import BoardManageEdit from '@/pages/BoardManageEdit'

import Payment from '@/pages/Payment'
import PaymentSuccess from '@/pages/PaymentSuccess'
import PaymentBillingSuccess from '@/pages/PaymentBillingSuccess'
import PaymentFail from '@/pages/PaymentFail'
import PaymentHistory from '@/pages/PaymentHistory'

import Notifications from '@/pages/Notifications'
import Attendance from '@/pages/Attendance'
import Help from '@/pages/Help'
import Terms from '@/pages/Terms'
import PushNotificationSettings from '@/pages/PushNotificationSettings'

export const router = createBrowserRouter([
  // 비로그인 인증/계정 관련
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/find-id', element: <FindId /> },
  { path: '/find-password', element: <FindPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/email/verify', element: <EmailVerify /> },

  // OAuth 소셜 로그인 콜백
  { path: '/oauth/callback', element: <OAuthCallback /> },
  { path: '/oauth/callback/:provider', element: <OAuthCallback /> },
  { path: '/oauth/:provider/callback', element: <OAuthCallback /> },

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
      { path: 'home', element: <Home /> },
      { path: 'map', element:  <Map />},
      { path: 'learning', element: <Learning /> },
      { path: 'notice', element: <Notice /> },

      // 커뮤니티 / 게시판 (에브리타임식 2단계 구조)
      { path: 'board', element: <Board /> },
      { path: 'board/:boardId', element: <BoardPostList /> },
      { path: 'board/:boardId/write', element: <BoardWrite /> },
      { path: 'board/:boardId/manage', element: <BoardManageEdit /> },
      { path: 'posts/:postId', element: <BoardDetail /> },
      { path: 'posts/:postId/edit', element: <BoardEdit /> },

      // 프로필 및 설정
      { path: 'profile', element: <Profile /> },
      { path: 'profile/edit', element: <EditProfile /> },
      { path: 'profile/password', element: <ChangePassword /> },
      { path: 'profile/delete', element: <DeleteAccount /> },
      { path: 'help', element: <Help /> },
      { path: 'terms', element: <Terms /> },
      { path: 'notification-settings', element: <PushNotificationSettings /> },

      // 결제 및 알림
      { path: 'payment', element: <Payment /> },
      { path: 'payment/success', element: <PaymentSuccess /> },
      { path: 'payment/billing/success', element: <PaymentBillingSuccess /> },
      { path: 'payment/fail', element: <PaymentFail /> },
      { path: 'payment/history', element: <PaymentHistory /> },
      { path: 'notifications', element: <Notifications /> },

      // 기사 권한 라우트
      { path: 'driver/boarding', element: <DriverBoardingList /> },
      { path: 'driver/map', element: <DriverMapPage /> },

      // 역할 제한 페이지
      {
        path: 'admin/learning',
        element: (
            <ProtectedRoute allowedRoles={[USER_ROLES.ACADEMY, USER_ROLES.TEACHER, USER_ROLES.ADMIN]}>
              <AdminLearning />
            </ProtectedRoute>
        ),
      },
      {
        path: 'attendance',
        element: (
            <ProtectedRoute allowedRoles={[USER_ROLES.PARENT, USER_ROLES.ACADEMY, USER_ROLES.ADMIN, USER_ROLES.DRIVER]}>
              <Attendance />
            </ProtectedRoute>
        ),
      },
    ],
  },

  // 정의되지 않은 모든 주소는 로그인 페이지로 리다이렉트
  { path: '*', element: <Navigate to="/login" replace /> },
])