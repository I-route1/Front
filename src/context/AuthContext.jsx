import { createContext, useContext, useState, useEffect } from 'react'

export const USER_ROLES = {
  PARENT: 'parent',
  ACADEMY: 'academy',
  ADMIN: 'admin',

  // 기존 코드 호환을 위해 일단 유지
  DRIVER: 'driver',
  STUDENT: 'student',
}

/** 역할별 로그인·루트(/) 진입 시 기본 화면 */
export function getDefaultRoute(role) {
  return '/home'
}

const AuthContext = createContext(null)

const PASSWORD_RULES = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/

const MOCK_PASSWORD = '1234'

const MOCK_USERS = {
  parent: {
    id: 'parent-001',
    name: '홍길동',
    role: USER_ROLES.PARENT,
    username: 'parent',
    email: 'parent@iroute.com',
    phone: '010-1234-5678',
    avatar: null,
    children: [{ id: 'child-001', name: '홍민준', grade: '초6' }],
  },
  학부모: {
    id: 'parent-001',
    name: '홍길동',
    role: USER_ROLES.PARENT,
    username: '학부모',
    email: 'parent@iroute.com',
    phone: '010-1234-5678',
    avatar: null,
    children: [{ id: 'child-001', name: '홍민준', grade: '초6' }],
  },
  academy: {
    id: 'academy-001',
    name: '아이루트 학원',
    role: USER_ROLES.ACADEMY,
    username: 'academy',
    email: 'academy@iroute.com',
    phone: '053-000-0000',
    avatar: null,
    academyName: '아이루트 학원',
    academyAddress: '대구광역시 달성군 현풍읍',
  },
  학원: {
    id: 'academy-001',
    name: '아이루트 학원',
    role: USER_ROLES.ACADEMY,
    username: '학원',
    email: 'academy@iroute.com',
    phone: '053-000-0000',
    avatar: null,
    academyName: '아이루트 학원',
    academyAddress: '대구광역시 달성군 현풍읍',
  },
  driver: {
    id: 'driver-001',
    name: '김기사',
    role: USER_ROLES.DRIVER,
    username: 'driver',
    email: 'driver@iroute.com',
    phone: '010-1111-2222',
    avatar: null,
    vehicleNumber: '대구 12가 3456',
    academyName: '아이루트 학원',
  },
  기사님: {
    id: 'driver-001',
    name: '김기사',
    role: USER_ROLES.DRIVER,
    username: '기사님',
    email: 'driver@iroute.com',
    phone: '010-1111-2222',
    avatar: null,
    vehicleNumber: '대구 12가 3456',
    academyName: '아이루트 학원',
  },
  admin: {
    id: 'admin-001',
    name: '관리자',
    role: USER_ROLES.ADMIN,
    username: 'admin',
    email: 'admin@iroute.com',
    phone: '010-0000-0000',
    avatar: null,
    adminLevel: '서비스 관리자',
  },
  관리자: {
    id: 'admin-001',
    name: '관리자',
    role: USER_ROLES.ADMIN,
    username: '관리자',
    email: 'admin@iroute.com',
    phone: '010-0000-0000',
    avatar: null,
    adminLevel: '서비스 관리자',
  },
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('i-route-user')
    if (saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {
        sessionStorage.removeItem('i-route-user')
      }
    }
    setLoading(false)
  }, [])

  const saveUser = (u) => {
    setUser(u)
    sessionStorage.setItem('i-route-user', JSON.stringify(u))
  }

  const loginWithCredentials = async (username, password) => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const normalizedUsername = username.trim()

    if (!normalizedUsername || !password) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다')
    }

    const mockUser = MOCK_USERS[normalizedUsername]

    if (!mockUser) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다')
    }

    if (password !== MOCK_PASSWORD) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.')
    }

    saveUser({
      ...mockUser,
      username: normalizedUsername,
    })
  }

  /** 카카오 OAuth 로그인 */
  const loginWithKakao = async () => {
    // TODO: Kakao OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 500))

    saveUser({
      id: 'kakao-001',
      name: '홍길동',
      role: USER_ROLES.PARENT,
      username: 'kakao_user',
      email: 'kakao@iroute.com',
      phone: '010-1234-5678',
      avatar: null,
      children: [{ id: 'child-001', name: '홍민준', grade: '초6' }],
    })
  }

  const updateUser = async (updatedUser) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (!user) {
      throw new Error('로그인 정보가 없습니다')
    }

    const nextUser = {
      ...user,
      ...updatedUser,
    }

    saveUser(nextUser)
    return nextUser
  }

  const changePassword = async ({ currentPassword, newPassword, newPasswordConfirm }) => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    if (!currentPassword) {
      throw new Error('현재 비밀번호를 입력해 주세요')
    }

    if (!newPassword) {
      throw new Error('새 비밀번호를 입력해 주세요')
    }

    if (!PASSWORD_RULES.test(newPassword)) {
      throw new Error('새 비밀번호는 영문·숫자·특수문자를 포함하여 8자 이상이어야 합니다')
    }

    if (newPassword !== newPasswordConfirm) {
      throw new Error('새 비밀번호가 일치하지 않습니다')
    }

    return true
  }

  const reissueToken = async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))

    return {
      accessToken: `mock-access-token-${Date.now()}`,
      refreshToken: `mock-refresh-token-${Date.now()}`,
    }
  }

  const deleteAccount = async () => {
    await new Promise((resolve) => setTimeout(resolve, 700))

    if (user) {
      const deletedUsers = JSON.parse(localStorage.getItem('i-route-deleted-users') || '[]')
      localStorage.setItem(
        'i-route-deleted-users',
        JSON.stringify([
          ...deletedUsers,
          {
            id: user.id,
            username: user.username,
            name: user.name,
            deletedAt: new Date().toISOString(),
          },
        ])
      )
    }

    setUser(null)
    sessionStorage.removeItem('i-route-user')
    return true
  }

  const logout = () => {
    setUser(null)
    sessionStorage.removeItem('i-route-user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoggedIn: !!user,
        role: user?.role ?? null,
        loginWithCredentials,
        loginWithKakao,
        updateUser,
        changePassword,
        reissueToken,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}