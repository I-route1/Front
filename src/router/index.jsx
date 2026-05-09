import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout      from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/common/ProtectedRoute'

// Pages (lazy 로딩 → 성능 최적화)
import { lazy, Suspense } from 'react'

const Login    = lazy(() => import('@/pages/Login'))
const Home     = lazy(() => import('@/pages/Home'))
const Map      = lazy(() => import('@/pages/Map'))
const Learning = lazy(() => import('@/pages/Learning'))
const Notice   = lazy(() => import('@/pages/Notice'))
const Profile  = lazy(() => import('@/pages/Profile'))

// Fallback
const PageLoader = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh' }}>
    <div style={{
      width: 32, height: 32,
      borderRadius: '50%',
      border: '3px solid var(--color-primary-light)',
      borderTopColor: 'var(--color-primary)',
      animation: 'spin 0.7s linear infinite',
    }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
)

const wrap = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/login',
    element: wrap(Login),
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true,        element: <Navigate to="/home" replace /> },
      { path: 'home',       element: wrap(Home) },
      { path: 'map',        element: wrap(Map) },
      { path: 'learning',   element: wrap(Learning) },
      { path: 'notice',     element: wrap(Notice) },
      { path: 'profile',    element: wrap(Profile) },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/home" replace />,
  },
])
