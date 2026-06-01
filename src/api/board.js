import { apiCall } from './client'

const getUserId = () => {
  try {
    const saved = sessionStorage.getItem('i-route-user')
    if (!saved) return null

    const user = JSON.parse(saved)
    return user?.id ?? user?.userId ?? user?.user_id ?? null
  } catch {
    return null
  }
}

const withUserId = (path) => {
  const userId = getUserId()
  if (!userId) return path

  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}userId=${userId}`
}

export const boardAPI = {
  getBoards: () => {
    return apiCall('/api/boards')
  },

  searchBoards: (keyword) => {
    const query = new URLSearchParams()

    if (keyword) {
      query.append('keyword', keyword)
    }

    const queryString = query.toString()
    return apiCall(`/api/boards/search${queryString ? `?${queryString}` : ''}`)
  },

  createBoard: (payload) => {
    return apiCall('/api/boards', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateBoard: (boardId, payload) => {
    return apiCall(`/api/boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  deleteBoard: (boardId) => {
    return apiCall(`/api/boards/${boardId}`, {
      method: 'DELETE',
    })
  },

  getBoardDetail: (boardId) => {
    return apiCall(`/api/boards/${boardId}`)
  },

  getPostsByBoard: (boardId) => {
    return apiCall(withUserId(`/api/boards/${boardId}/posts`))
  },

  getPostDetail: (postId) => {
    return apiCall(withUserId(`/api/posts/${postId}`))
  },

  searchPosts: (keyword) => {
    const query = new URLSearchParams()

    if (keyword) {
      query.append('keyword', keyword)
    }

    const path = `/api/posts/search${query.toString() ? `?${query.toString()}` : ''}`

    return apiCall(withUserId(path))
  },

  createPost: (boardId, payload) => {
    return apiCall(withUserId(`/api/boards/${boardId}/posts`), {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updatePost: (postId, payload) => {
    return apiCall(withUserId(`/api/posts/${postId}`), {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  deletePost: (postId) => {
    return apiCall(`/api/posts/${postId}`, {
      method: 'DELETE',
    })
  },

  likePost: (postId) => {
    return apiCall(withUserId(`/api/posts/${postId}/like`), {
      method: 'POST',
    })
  },

  bookmarkPost: (postId) => {
    return apiCall(withUserId(`/api/posts/${postId}/bookmark`), {
      method: 'POST',
    })
  },

  getComments: (postId) => {
    return apiCall(withUserId(`/api/posts/${postId}/comments`))
  },

  getCommentDetail: (postId, commentId) => {
    return apiCall(withUserId(`/api/posts/${postId}/comments/${commentId}`))
  },

  createComment: (postId, payload) => {
    return apiCall(withUserId(`/api/posts/${postId}/comments`), {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  deleteComment: (postId, commentId) => {
    return apiCall(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    })
  },

  likeComment: (postId, commentId) => {
    return apiCall(withUserId(`/api/posts/${postId}/comments/${commentId}/like`), {
      method: 'POST',
    })
  },
}