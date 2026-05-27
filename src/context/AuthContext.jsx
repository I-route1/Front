import { createContext, useContext, useState, useEffect } from 'react'

export const USER_ROLES = {
  PARENT:  'PARENT',
  ACADEMY: 'ACADEMY',
  TEACHER: 'TEACHER',
  ADMIN:   'ADMIN',
  DRIVER:  'DRIVER',
  STUDENT: 'STUDENT',
}

// role 정규화: 소문자/한글/대문자 모두 통일
export const normalizeRole = (role) => {
  if (!role) return USER_ROLES.STUDENT
  
  const koreanMap = {
    '학부모': USER_ROLES.PARENT,
    '학원':   USER_ROLES.ACADEMY,
    '기사':   USER_ROLES.DRIVER,
    '기사님': USER_ROLES.DRIVER,
    '관리자': USER_ROLES.ADMIN,
    '학생':   USER_ROLES.STUDENT,
  }
  if (koreanMap[role]) return koreanMap[role]
  
  return String(role).toUpperCase()
}

// 학원/강사/관리자 권한 체크
export const isAcademy = (role) => {
  const r = normalizeRole(role)
  return [USER_ROLES.ACADEMY, USER_ROLES.TEACHER, USER_ROLES.ADMIN].includes(r)
}
export const isParent  = (role) => normalizeRole(role) === USER_ROLES.PARENT
export const isDriver  = (role) => normalizeRole(role) === USER_ROLES.DRIVER
export const isStudent = (role) => normalizeRole(role) === USER_ROLES.STUDENT
export const isAdmin   = (role) => normalizeRole(role) === USER_ROLES.ADMIN

// role별 기본 페이지
export function getDefaultRoute(role) {
  const r = normalizeRole(role)
  if ([USER_ROLES.ACADEMY, USER_ROLES.TEACHER, USER_ROLES.ADMIN].includes(r)) {
    return '/admin/learning'
  }
  if (r === USER_ROLES.DRIVER) return '/map'
  return '/home'
}

const AuthContext = createContext(null)
const PASSWORD_RULES = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/
const BASE_URL = import.meta.env.VITE_API_URL || 'http://14.56.197.183:9090'

const MOCK_PASSWORD = '1234'
const MOCK_USERS = {
  parent: {
    id: 'parent-001', name: '홍길동', role: USER_ROLES.PARENT,
    username: 'parent', email: 'parent@iroute.com', phone: '010-1234-5678',
    avatar: null, children: [{ id: 'child-001', name: '홍민준', grade: '초6' }],
  },
  학부모: {
    id: 'parent-001', name: '홍길동', role: USER_ROLES.PARENT,
    username: '학부모', email: 'parent@iroute.com', phone: '010-1234-5678',
    avatar: null, children: [{ id: 'child-001', name: '홍민준', grade: '초6' }],
  },
  academy: {
    id: 'academy-001', name: '아이루트 학원', role: USER_ROLES.ACADEMY,
    username: 'academy', email: 'academy@iroute.com', phone: '053-000-0000',
    avatar: null, academyName: '아이루트 학원', academyAddress: '대구광역시 달성군 현풍읍',
  },
  학원: {
    id: 'academy-001', name: '아이루트 학원', role: USER_ROLES.ACADEMY,
    username: '학원', email: 'academy@iroute.com', phone: '053-000-0000',
    avatar: null, academyName: '아이루트 학원', academyAddress: '대구광역시 달성군 현풍읍',
  },
  driver: {
    id: 'driver-001', name: '김기사', role: USER_ROLES.DRIVER,
    username: 'driver', email: 'driver@iroute.com', phone: '010-1111-2222',
    avatar: null, vehicleNumber: '대구 12가 3456', academyName: '아이루트 학원',
  },
  기사님: {
    id: 'driver-001', name: '김기사', role: USER_ROLES.DRIVER,
    username: '기사님', email: 'driver@iroute.com', phone: '010-1111-2222',
    avatar: null, vehicleNumber: '대구 12가 3456', academyName: '아이루트 학원',
  },
  admin: {
    id: 'admin-001', name: '관리자', role: USER_ROLES.ADMIN,
    username: 'admin', email: 'admin@iroute.com', phone: '010-0000-0000',
    avatar: null, adminLevel: '서비스 관리자',
  },
  관리자: {
    id: 'admin-001', name: '관리자', role: USER_ROLES.ADMIN,
    username: '관리자', email: 'admin@iroute.com', phone: '010-0000-0000',
    avatar: null, adminLevel: '서비스 관리자',
  },
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = sessionStorage.getItem('i-route-user')
    if (saved) {
      try { setUser(JSON.parse(saved)) } catch { sessionStorage.removeItem('i-route-user') }
    }
    setLoading(false)
  }, [])

  const saveUser = (u) => {
    const normalized = { ...u, role: normalizeRole(u.role) }
    setUser(normalized)
    sessionStorage.setItem('i-route-user', JSON.stringify(normalized))
  }

  const loginWithCredentials = async (username, password) => {
    const normalizedUsername = username.trim()
    if (!normalizedUsername || !password) {
      throw new Error('아이디 또는 비밀번호가 올바르지 않습니다')
    }

    // mock 계정 우선 체크
    if (MOCK_USERS[normalizedUsername] && password === MOCK_PASSWORD) {
      saveUser(MOCK_USERS[normalizedUsername])
      return
    }

    // 실제 백엔드 로그인
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedUsername, password }),
      })
      if (!res.ok) throw new Error('아이디 또는 비밀번호가 올바르지 않습니다')
      const data = await res.json()
      
      saveUser({
        id: data.userId,
        name: data.nickname,
        role: data.role,
        token: data.accessToken,
        refreshToken: data.refreshToken,
        username: normalizedUsername,
        email: normalizedUsername,
      })
    } catch (e) {
      throw new Error(e.message || '로그인에 실패했습니다')
    }
  }

  const loginWithKakao = async () => {
    await new Promise(resolve => setTimeout(resolve, 500))
    saveUser({
      id: 'kakao-001', name: '홍길동', role: USER_ROLES.PARENT,
      username: 'kakao_user', email: 'kakao@iroute.com',
      phone: '010-1234-5678', avatar: null,
      children: [{ id: 'child-001', name: '홍민준', grade: '초6' }],
      token: null,
    })
  }

  const updateUser = async (updatedUser) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    if (!user) throw new Error('로그인 정보가 없습니다')
    const nextUser = { ...user, ...updatedUser }
    saveUser(nextUser)
    return nextUser
  }

  const changePassword = async ({ currentPassword, newPassword, newPasswordConfirm }) => {
    await new Promise(resolve => setTimeout(resolve, 500))
    if (!currentPassword) throw new Error('현재 비밀번호를 입력해 주세요')
    if (!newPassword) throw new Error('새 비밀번호를 입력해 주세요')
    if (!PASSWORD_RULES.test(newPassword))
      throw new Error('새 비밀번호는 영문·숫자·특수문자를 포함하여 8자 이상이어야 합니다')
    if (newPassword !== newPasswordConfirm)
      throw new Error('새 비밀번호가 일치하지 않습니다')
    return true
  }

  const reissueToken = async () => {
    await new Promise(resolve => setTimeout(resolve, 300))
    return {
      accessToken: `mock-access-token-${Date.now()}`,
      refreshToken: `mock-refresh-token-${Date.now()}`,
    }
  }

  const deleteAccount = async () => {
    await new Promise(resolve => setTimeout(resolve, 700))
    if (user) {
      const deleted = JSON.parse(localStorage.getItem('i-route-deleted-users') || '[]')
      localStorage.setItem('i-route-deleted-users', JSON.stringify([
        ...deleted,
        { id: user.id, username: user.username, name: user.name, deletedAt: new Date().toISOString() },
      ]))
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
    <AuthContext.Provider value={{
      user, loading,
      isLoggedIn: !!user,
      role: user?.role ?? null,
      loginWithCredentials,
      loginWithKakao,
      updateUser,
      changePassword,
      reissueToken,
      deleteAccount,
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