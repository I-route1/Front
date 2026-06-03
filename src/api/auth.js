import { apiCall } from './client'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://14.56.197.183:9090'

const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI

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

  findUsernameAndEmailByPhone(phoneNumber) {
    return apiCall('/api/auth/find/username-email', {
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

  verifyEmail(token) {
    return apiCall(`/api/auth/email/verify?token=${encodeURIComponent(token)}`, {
      method: 'GET',
    })
  },

  checkDuplicate(type, value) {
    return apiCall('/api/auth/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

  getSocialLoginUrl(provider) {
    if (provider !== 'kakao') {
      return `${BASE_URL}/api/oauth/social/${provider}`
    }

    if (!KAKAO_CLIENT_ID) {
      throw new Error('VITE_KAKAO_CLIENT_ID가 설정되지 않았습니다.')
    }

    if (!KAKAO_REDIRECT_URI) {
  throw new Error('VITE_KAKAO_REDIRECT_URI가 설정되지 않았습니다.')
}

    return (
        'https://kauth.kakao.com/oauth/authorize' +
        `?client_id=${encodeURIComponent(KAKAO_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}` +
        '&response_type=code'
    )
  },

  getSocialToken(provider, code) {
    return apiCall(`/api/oauth/social/${provider}/token?code=${encodeURIComponent(code)}`, {
      method: 'GET',
    })
  },

  registerSocialUser(provider, payload) {
    return apiCall(`/api/oauth/social/${provider}/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  linkSocialAccount(provider, payload) {
    return apiCall(`/api/oauth/social/${provider}/link`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  checkEmailVerified(email) {
    return apiCall(`/api/auth/email/status?email=${encodeURIComponent(email)}`, {
      method: 'GET',
    })
  },

  changePassword(payload) {
    return apiCall('/api/auth/password/change', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  },
}