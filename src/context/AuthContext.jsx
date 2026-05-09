import { createContext, useContext, useState, useEffect } from 'react'

/** 사용자 역할 상수 */
export const USER_ROLES = {
  PARENT:  'parent',   // 학부모
  DRIVER:  'driver',   // 기사
  ACADEMY: 'academy',  // 학원 관리자
  STUDENT: 'student',  // 학생
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)    // 로그인 사용자 정보
  const [loading, setLoading] = useState(true)    // 초기 로딩

  useEffect(() => {
    // TODO: 로컬 스토리지 또는 서버에서 세션 복원
    const savedUser = sessionStorage.getItem('i-route-user')
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)) } catch {}
    }
    setLoading(false)
  }, [])

  /** 카카오 OAuth 로그인 (추후 구현) */
  const loginWithKakao = async () => {
    // TODO: Kakao OAuth flow
    // 임시: 개발용 mock 로그인
    const mockUser = {
      id:       'mock-001',
      name:     '홍길동',
      role:     USER_ROLES.PARENT,
      avatar:   null,
      children: [{ id: 'child-001', name: '홍민준', grade: '초6' }],
    }
    setUser(mockUser)
    sessionStorage.setItem('i-route-user', JSON.stringify(mockUser))
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('i-route-user')
  }

  const value = {
    user,
    loading,
    isLoggedIn: !!user,
    role: user?.role ?? null,
    loginWithKakao,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
