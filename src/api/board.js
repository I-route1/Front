import { apiCall } from './client'

export const boardAPI = {
  // =========================
  // 게시판 API
  // =========================

  /**
   * 모든 게시판 조회
   * GET /api/boards
   */
  getBoards: () => {
    return apiCall('/api/boards')
  },

  /**
   * 게시판 검색
   * GET /api/boards/search?keyword=검색어
   */
  searchBoards: (keyword) => {
    const query = new URLSearchParams()

    if (keyword) {
      query.append('keyword', keyword)
    }

    const queryString = query.toString()

    return apiCall(`/api/boards/search${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * 게시판 등록
   * POST /api/boards
   */
  createBoard: (payload) => {
    return apiCall('/api/boards', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * 게시판 수정
   * PUT /api/boards/{boardId}
   */
  updateBoard: (boardId, payload) => {
    return apiCall(`/api/boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  /**
   * 게시판 삭제
   * DELETE /api/boards/{boardId}
   */
  deleteBoard: (boardId) => {
    return apiCall(`/api/boards/${boardId}`, {
      method: 'DELETE',
    })
  },

  /**
   * 게시판 상세 조회
   * GET /api/boards/{boardId}
   */
  getBoardDetail: (boardId) => {
    return apiCall(`/api/boards/${boardId}`)
  },

  /**
   * 게시판 즐겨찾기
   * POST /api/boards/{boardId}/bookmark
   */
  bookmarkBoard: (boardId) => {
    return apiCall(`/api/boards/${boardId}/bookmark`, {
      method: 'POST',
    })
  },

  /**
   * 사용자가 즐겨찾기한 게시판 목록
   * GET /api/boards/{boardId}/me
   *
   * 주의:
   * 현재 명세상 boardId가 필요한 형태로 되어 있음.
   */
  getMyBookmarkedBoards: (boardId) => {
    return apiCall(`/api/boards/${boardId}/me`)
  },

  // =========================
  // 게시글 API
  // =========================

  /**
   * 특정 게시판의 게시글 목록 조회
   * GET /api/boards/{boardId}/posts
   */
  getPostsByBoard: (boardId) => {
    return apiCall(`/api/boards/${boardId}/posts`)
  },

  /**
   * 게시글 상세 조회
   * GET /api/posts/{postId}
   */
  getPostDetail: (postId) => {
    return apiCall(`/api/posts/${postId}`)
  },

  /**
   * 게시글 검색
   * GET /api/posts/search?keyword=검색어
   */
  searchPosts: (keyword) => {
    const query = new URLSearchParams()

    if (keyword) {
      query.append('keyword', keyword)
    }

    const queryString = query.toString()

    return apiCall(`/api/posts/search${queryString ? `?${queryString}` : ''}`)
  },

  /**
   * 게시글 작성
   * POST /api/boards/{boardId}/posts
   *
   * 주의:
   * 스크린샷 명세에는 /boards/{boardId}/posts 로 보였지만,
   * 다른 API들과 맞춰 /api/boards/{boardId}/posts 로 작성함.
   */
  createPost: (boardId, payload) => {
    return apiCall(`/api/boards/${boardId}/posts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * 게시글 수정
   * PUT /api/posts/{postId}
   */
  updatePost: (postId, payload) => {
    return apiCall(`/api/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  /**
   * 게시글 삭제
   * DELETE /api/posts/{postId}
   */
  deletePost: (postId) => {
    return apiCall(`/api/posts/${postId}`, {
      method: 'DELETE',
    })
  },

  /**
   * 게시글 좋아요
   * POST /api/posts/{postId}/like
   */
  likePost: (postId) => {
    return apiCall(`/api/posts/${postId}/like`, {
      method: 'POST',
    })
  },

  /**
   * 게시글 즐겨찾기
   * POST /api/posts/{postId}/bookmark
   */
  bookmarkPost: (postId) => {
    return apiCall(`/api/posts/${postId}/bookmark`, {
      method: 'POST',
    })
  },

  /**
   * 내가 즐겨찾기한 게시글 목록
   * GET /api/me/bookmark
   */
  getMyBookmarkedPosts: () => {
    return apiCall('/api/me/bookmark')
  },

  // =========================
  // 댓글 API
  // =========================

  /**
   * 댓글 목록 조회
   * GET /api/posts/{postId}/comments
   *
   * 주의:
   * 스크린샷에는 기능명이 댓글 작성으로 보였지만,
   * HTTP 메서드가 GET이라 목록 조회로 처리함.
   */
  getComments: (postId) => {
    return apiCall(`/api/posts/${postId}/comments`)
  },

  /**
   * 댓글 상세 조회
   * GET /api/posts/{postId}/comments/{commentId}
   *
   * 주의:
   * 스크린샷에는 기능명이 댓글 삭제로 보였지만,
   * HTTP 메서드가 GET이라 상세 조회로 처리함.
   */
  getCommentDetail: (postId, commentId) => {
    return apiCall(`/api/posts/${postId}/comments/${commentId}`)
  },

  /**
   * 댓글 작성
   * POST /api/posts/{postId}/comments
   *
   * 주의:
   * 현재 스크린샷 명세에는 명확히 보이지 않아 일반적인 REST 방식으로 작성함.
   */
  createComment: (postId, payload) => {
    return apiCall(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  /**
   * 댓글 삭제
   * DELETE /api/posts/{postId}/comments/{commentId}
   *
   * 주의:
   * 현재 스크린샷 명세에는 GET으로 보였지만, 삭제 기능이므로 DELETE로 작성함.
   */
  deleteComment: (postId, commentId) => {
    return apiCall(`/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
    })
  },

  /**
   * 댓글 좋아요
   * POST /api/posts/{postId}/comments/{commentId}/like
   */
  likeComment: (postId, commentId) => {
    return apiCall(`/api/posts/${postId}/comments/${commentId}/like`, {
      method: 'POST',
    })
  },
}