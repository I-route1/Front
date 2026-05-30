import { apiCall } from './client'

export const authAPI = {
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