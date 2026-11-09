import { apiCall } from './client'

export const profileAPI = {
    getMyProfile() {
        return apiCall('/api/users/me')
    },

    updateMyProfile(data) {
        return apiCall('/api/users/me', {
            method: 'PATCH',
            body: JSON.stringify(data),
        })
    },

    getMyChildren() {
        return apiCall('/api/children/me')
    },

    addChild(data) {
        return apiCall('/api/children', {
            method: 'POST',
            body: JSON.stringify(data),
        })
    },

    checkDuplicate(type, value) {
        return apiCall(`/api/users/check-duplicate?type=${type}&value=${encodeURIComponent(value)}`)
    },
}