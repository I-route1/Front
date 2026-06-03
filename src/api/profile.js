import { apiCall } from './client'

export const profileAPI = {
    getMyProfile() {
        return apiCall('/api/users/me')
    },

    updateMyProfile(data) {
        return apiCall('/api/users/me', {
            method: 'PUT',
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
}