import { apiCall } from './client'

export const paymentAPI = {
  createOrder: (planType) =>
    apiCall('/api/payments/order', {
      method: 'POST',
      body: JSON.stringify({ planType }),
    }),

  confirmPayment: (paymentKey, orderId, amount) =>
    apiCall('/api/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentKey, orderId, amount: Number(amount) }),
    }),

  issueBilling: (authKey, planType) =>
    apiCall('/api/payments/billing/issue', {
      method: 'POST',
      body: JSON.stringify({ authKey, planType }),
    }),

  cancelSubscription: () =>
    apiCall('/api/payments/billing', { method: 'DELETE' }),

  getHistory: () =>
    apiCall('/api/payments/history'),

  getCredits: () =>
    apiCall('/api/users/me/credits'),

  useCredit: () =>
    apiCall('/api/users/me/credits/use', { method: 'POST' }),
}
