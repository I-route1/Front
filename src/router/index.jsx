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
import BoardDetail from '@/pages/BoardDetail'
import BoardWrite from '@/pages/BoardWrite'
import BoardEdit from '@/pages/BoardEdit'
import Notifications from '@/pages/Notifications'
import OAuthCallback from '@/pages/OAuthCallback'

export const router = createBrowserRouter([
  // 비로그인 페이지
  { path: '/login', element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/find-id', element: <FindId /> },
  { path: '/find-password', element: <FindPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
    { path: '/oauth/callback', element: <OAuthCallback /> },
  { path: '/oauth/callback/:provider', element: <OAuthCallback /> },
  { path: '/driver/boarding', element: <DriverBoardingList /> },
  { path: '/driver/map', element: <DriverMapPage /> },


  // 로그인 필요 페이지
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RoleHomeRedirect /> },
      { path: 'home', element: <Home /> },
      { path: 'map', element: <Map /> },
      { path: 'learning', element: <Learning /> },
      { path: 'notice', element: <Notice /> },
      { path: 'board', element: <Board /> },
      { path: 'board/write', element: <BoardWrite /> },
      { path: 'board/:postId/edit', element: <BoardEdit /> },
      { path: 'board/:postId', element: <BoardDetail /> },
      { path: 'profile', element: <Profile /> },
      { path: 'profile/edit', element: <EditProfile /> },
      { path: 'profile/password', element: <ChangePassword /> },
      { path: 'profile/delete', element: <DeleteAccount /> },
      {
        path: 'admin/learning',
        element: (
          <ProtectedRoute allowedRoles={[USER_ROLES.ACADEMY, USER_ROLES.TEACHER, USER_ROLES.ADMIN]}>
            <AdminLearning />
          </ProtectedRoute>
        ),
      },
      { path: 'notifications', element: <Notifications /> },
    ],
  },

  // 그 외 → 홈으로
  { path: '*', element: <Navigate to="/" replace /> },
])