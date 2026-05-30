import { apiCall } from './client'

export const authAPI = {
  login({ email, password }) {
    return apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
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
    const payload = {}

    if (type === 'email') {
      payload.email = value
    }

    if (type === 'nickname') {
      payload.nickname = value
    }

    if (type === 'phone') {
      payload.phone = value
    }

    return apiCall('/api/auth/check', {
      method: 'POST',
      body: JSON.stringify(payload),
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
}