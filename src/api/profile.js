import { apiCall } from './client'

export const profileAPI = {
    getMyProfile() {
        return apiCall('/api/users/me')
    },

    updateMyProfile(data, imageFile = null) {
        if (imageFile) {
            const formData = new FormData()
            formData.append(
                'data',
                new Blob([JSON.stringify(data)], { type: 'application/json' })
            )
            formData.append('profileImage', imageFile)

            return apiCall('/api/users/me', {
                method: 'PATCH',
                body: formData,
            })
        }

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