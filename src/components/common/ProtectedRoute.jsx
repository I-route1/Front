import { Navigate } from 'react-router-dom'
import { useAuth, getDefaultRoute } from '@/context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isLoggedIn, loading, role } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--color-bg)',
      }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: '50%',
          border: '3px solid var(--color-primary-light)',
          borderTopColor: 'var(--color-primary)',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getDefaultRoute(role)} replace />
  }

  return children
}