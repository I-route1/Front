// src/api/board.js
import { apiCall } from './client'

function withUserId(path, userId) {
  if (!userId) return path
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}userId=${encodeURIComponent(userId)}`
}

export const boardAPI = {
  // 게시판 목록
  getBoards() {
    return apiCall('/api/boards', {
      method: 'GET',
    })
  },

  // 게시판 상세
  getBoardDetail(boardId) {
    return apiCall(`/api/boards/${boardId}`, {
      method: 'GET',
    })
  },

  // 게시판 검색
  searchBoards(keyword) {
    return apiCall(`/api/boards/search?keyword=${encodeURIComponent(keyword)}`, {
      method: 'GET',
    })
  },

  // 게시판별 게시글 목록
  getPostsByBoard(boardId, userId) {
    return apiCall(withUserId(`/api/posts`, userId), {
      method: 'GET',
    })
  },

  // 게시글 상세
  getPostDetail(postId, userId) {
    return apiCall(withUserId(`/api/posts/${postId}`, userId), {
      method: 'GET',
    })
  },

  // 호환용
  getPost(postId, userId) {
    return this.getPostDetail(postId, userId)
  },

  // 게시글 검색
  searchPosts(keyword, userId) {
    return apiCall(withUserId(`/api/posts/search?keyword=${encodeURIComponent(keyword)}`, userId), {
      method: 'GET',
    })
  },

  // 게시글 작성
  createPost(payload, userId) {
    return apiCall(withUserId('/api/posts', userId), {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // 게시글 수정
  updatePost(postId, payload, userId) {
    return apiCall(withUserId(`/api/posts/${postId}`, userId), {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  // 게시글 삭제
  deletePost(postId, userId) {
    return apiCall(
        `/api/posts/${postId}?userId=${userId}`,
        {
          method: 'DELETE',
        }
    )
  },

  // 좋아요
  likePost(postId, userId) {
    return apiCall(`/api/posts/${postId}/like?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
    })
  },

  // 북마크
  bookmarkPost(postId, userId) {
    return apiCall(`/api/posts/${postId}/bookmark?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
    })
  },

  // 댓글 목록
  getComments(postId, userId) {
    return apiCall(withUserId(`/api/posts/${postId}/comments`, userId), {
      method: 'GET',
    })
  },

  // 댓글 작성
  createComment(postId, payload, userId) {
    return apiCall(withUserId(`/api/posts/${postId}/comments`, userId), {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  // 댓글 상세
  getCommentDetail(postId, commentId, userId) {
    return apiCall(withUserId(`/api/posts/${postId}/comments/${commentId}`, userId), {
      method: 'GET',
    })
  },

  // 댓글 삭제
  deleteComment(postId, commentId, userId) {
    return apiCall(`/api/posts/${postId}/comments/${commentId}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    })
  },

  // 댓글 좋아요
  likeComment(postId, commentId, userId) {
    return apiCall(`/api/posts/${postId}/comments/${commentId}/like?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
    })
  },
}