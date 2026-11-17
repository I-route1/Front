const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '')

export const DEFAULT_PROFILE_IMAGE =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
      <rect width="100" height="100" fill="#DBEAFE"/>
      <circle cx="50" cy="41" r="14" fill="#60A5FA"/>
      <path d="M27 81C27 68.2975 37.2975 58 50 58C62.7025 58 73 68.2975 73 81" fill="#60A5FA"/>
    </svg>
  `)

export function resolveProfileImageUrl(url) {
    if (!url) return DEFAULT_PROFILE_IMAGE
    if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('blob:') ||
        url.startsWith('data:')
    ) {
        return url
    }
    if (!url.startsWith('/uploads/')) {
        return DEFAULT_PROFILE_IMAGE
    }
    return `${BASE_URL}${url}`
}