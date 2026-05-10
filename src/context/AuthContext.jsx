import { createContext, useContext, useState, useEffect } from 'react'

export const USER_ROLES = {
  PARENT:  'parent',
  DRIVER:  'driver',
  ACADEMY: 'academy',
  STUDENT: 'student',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('i-route-user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
    setLoading(false)
  }, [])

  const saveUser = (u) => {
    setUser(u)
    sessionStorage.setItem('i-route-user', JSON.stringify(u))
  }

  /** 일반 로그인 */
  const loginWithCredentials = async (username, password) => {
    // TODO: POST /api/auth/login
    // mock: 아무 아이디/비번이나 허용
    await new Promise(r => setTimeout(r, 800))
    if (!username || !password) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다')
    saveUser({
      id: 'user-001', name: '홍길동', role: USER_ROLES.PARENT,
      username, avatar: null,
      children: [{ id: 'child-001', name: '홍민준', grade: '초6' }],
    })
  }

  /** 카카오 OAuth 로그인 */
  const loginWithKakao = async () => {
    // TODO: Kakao OAuth flow
    await new Promise(r => setTimeout(r, 500))
    saveUser({
      id: 'kakao-001', name: '홍길동', role: USER_ROLES.PARENT,
      avatar: null,
      children: [{ id: 'child-001', name: '홍민준', grade: '초6' }],
    })
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('i-route-user')
  }

  return (
    <AuthContext.Provider value={{
      user, loading,
      isLoggedIn: !!user,
      role: user?.role ?? null,
      loginWithCredentials,
      loginWithKakao,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}