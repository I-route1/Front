import { apiCall } from './client'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://14.56.197.183:9090'

export const authAPI = {
    login({ username, password }) {
    return apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
      }),
    })
  },

  logout(refreshToken) {
    return apiCall('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken,
      }),
    })
  },

  refreshToken(refreshToken) {
    return apiCall('/api/auth/token/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken,
      }),
    })
  },

  sendPasswordResetEmail(email) {
    return apiCall('/api/auth/password/reset/send', {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    })
  },

  resetPassword({ token, newPassword }) {
    return apiCall('/api/auth/password/reset', {
      method: 'PATCH',
      body: JSON.stringify({
        token,
        newPassword,
      }),
    })
  },

  findEmailByPhone(phoneNumber) {
    return apiCall('/api/auth/find/email', {
      method: 'POST',
      body: JSON.stringify({
        phoneNumber,
      }),
    })
  },

  sendEmailVerification(email) {
    return apiCall('/api/auth/email/send', {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    })
  },

  resendEmailVerification(email) {
    return apiCall('/api/auth/email/resend', {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    })
  },

    checkDuplicate(type, value) {
    return apiCall('/api/auth/check', {
      method: 'POST',
      body: JSON.stringify({
        type,
        value,
      }),
    })
  },

  registerParent(payload) {
    return apiCall('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  registerAcademy(payload) {
    return apiCall('/api/auth/academy/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  sendWelcomeEmail(email) {
    return apiCall('/api/auth/email/welcome', {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    })
  },

  /**
   * 소셜 로그인 인증 페이지 URL 생성
   * GET /api/oauth/social/{provider}
   *
   * provider 예시:
   * - kakao
   */
  getSocialLoginUrl(provider) {
    return `${BASE_URL}/api/oauth/social/${provider}`
  },

  /**
   * 소셜 로그인 인증 완료 후 JWT 발급
   * POST /api/oauth/social/{provider}/token
   *
   * 요청:
   * {
   *   code: string
   * }
   */
  getSocialToken(provider, code) {
    return apiCall(`/api/oauth/social/${provider}/token`, {
      method: 'POST',
      body: JSON.stringify({
        code,
      }),
    })
  },

  /**
   * 소셜 회원 자동가입
   * POST /api/oauth/social/{provider}/register
   *
   * 요청:
   * {
   *   providerId: string,
   *   email: string,
   *   nickname: string,
   *   profileImage: string
   * }
   */
  registerSocialUser(provider, payload) {
    return apiCall(`/api/oauth/social/${provider}/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * 기존 일반 계정에 소셜 계정 연동
   * POST /api/oauth/social/{provider}/link
   *
   * 요청:
   * {
   *   userId: string,
   *   providerId: string
   * }
   */
  linkSocialAccount(provider, payload) {
    return apiCall(`/api/oauth/social/${provider}/link`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}