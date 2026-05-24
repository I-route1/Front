import { Navigate } from 'react-router-dom'
import { useAuth, getDefaultRoute } from '@/context/AuthContext'

export default function RoleHomeRedirect() {
  const { role } = useAuth()
  return <Navigate to={getDefaultRoute(role)} replace />
}
