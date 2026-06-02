import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { boardAPI } from '../api'
import { useAuth } from '@/context/AuthContext'
import BackButton from '../components/common/BackButton'

function normalizePost(rawPost) {
  return {
    id: rawPost.id ?? rawPost.postId,
    boardId: rawPost.boardId,
    category: rawPost.category ?? rawPost.tag ?? rawPost.postCategory ?? '자유',
    title: rawPost.title ?? rawPost.name ?? '제목 없음',
    author: rawPost.author ?? rawPost.createdBy ?? rawPost.writer ?? rawPost.nickname ?? '작성자',
    content: rawPost.content ?? rawPost.description ?? '',
    createdAt: formatDate(rawPost.createdAt),
    updatedAt: rawPost.updatedAt ? formatDate(rawPost.updatedAt) : null,
    views: rawPost.views ?? rawPost.viewCount ?? rawPost.hitCount ?? 0,
    likes: rawPost.likes ?? rawPost.likeCount ?? 0,
    comments: rawPost.comments ?? rawPost.commentCount ?? 0,
    pinned: !!rawPost.pinned,
    favorite: !!(rawPost.favorite ?? rawPost.bookmarked ?? rawPost.isBookmarked),
    liked: !!(rawPost.liked ?? rawPost.likedByMe ?? rawPost.isLiked),
  }
}

function normalizeComment(rawComment) {
  return {
    id: rawComment.id ?? rawComment.commentId,
    author: rawComment.author ?? rawComment.createdBy ?? rawComment.writer ?? rawComment.nickname ?? '작성자',
    content: rawComment.content ?? rawComment.description ?? '',
    createdAt: formatDate(rawComment.createdAt),
    likes: rawComment.likes ?? rawComment.likeCount ?? 0,
    liked: !!(rawComment.liked ?? rawComment.likedByMe ?? rawComment.isLiked),
  }
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return '방금 전'
  if (diffMinutes < 60) return `${diffMinutes}분 전`
  if (diffHours < 24) return `${diffHours}시간 전`
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}.${month}.${day}`
}

export default function BoardDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const userId = user?.id ?? user?.userId

  const [post, setPost] = useState(null)
  const [liked, setLiked] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [noticeMessage, setNoticeMessage] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

  useEffect(() => {
    let ignore = false

    async function fetchPostDetail() {
      try {
        setIsLoading(true)
        setNoticeMessage('')

        if (!/^\d+$/.test(String(postId))) {
          throw new Error('잘못된 게시글 ID입니다.')
        }

        const postResponse = await boardAPI.getPostDetail(postId, userId)
        const normalizedPost = normalizePost(postResponse)

        let normalizedComments = []

        try {
          const commentsResponse = await boardAPI.getComments(postId, userId)
          if (Array.isArray(commentsResponse)) {
            normalizedComments = commentsResponse.map(normalizeComment)
          }
        } catch (error) {
          console.warn('댓글 조회 실패:', error)
        }

        if (!ignore) {
          setPost(normalizedPost)
          setLiked(normalizedPost.liked)
          setFavorite(normalizedPost.favorite)
          setComments(normalizedComments)
        }
      } catch (error) {
        console.error('게시글 상세 조회 실패:', error)

        if (!ignore) {
          setPost(null)
          setComments([])
          setNoticeMessage(error.message || '게시글을 불러오지 못했습니다.')
        }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    fetchPostDetail()

    return () => {
      ignore = true
    }
  }, [postId, userId])

  const handleAddComment = async () => {
    const trimmedComment = commentText.trim()
    if (!trimmedComment || isSubmittingComment) return

    try {
      setIsSubmittingComment(true)
      setNoticeMessage('')

      const response = await boardAPI.createComment(
          postId,
          { content: trimmedComment },
          userId,
      )

      setComments((prev) => [normalizeComment(response), ...prev])
      setCommentText('')
    } catch (error) {
      console.error('댓글 등록 실패:', error)
      setNoticeMessage(error.message || '댓글 등록에 실패했습니다.')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleToggleLike = async () => {
    const nextLiked = !liked
    const prevLiked = liked
    const prevPost = post

    setLiked(nextLiked)
    setPost((prev) =>
        prev
            ? {
              ...prev,
              liked: nextLiked,
              likes: Math.max(0, prev.likes + (nextLiked ? 1 : -1)),
            }
            : prev,
    )

    try {
      await boardAPI.likePost(postId, userId)
    } catch (error) {
      console.error('게시글 공감 실패:', error)
      setLiked(prevLiked)
      setPost(prevPost)
      setNoticeMessage(error.message || '공감 처리에 실패했습니다.')
    }
  }

  const handleToggleFavorite = async () => {
    const nextFavorite = !favorite
    const prevFavorite = favorite
    const prevPost = post

    setFavorite(nextFavorite)
    setPost((prev) =>
        prev
            ? {
              ...prev,
              favorite: nextFavorite,
            }
            : prev,
    )

    try {
      await boardAPI.bookmarkPost(postId, userId)
    } catch (error) {
      console.error('게시글 즐겨찾기 실패:', error)
      setFavorite(prevFavorite)
      setPost(prevPost)
      setNoticeMessage(error.message || '즐겨찾기 처리에 실패했습니다.')
    }
  }
  const handleDeletePost = async () => {
    const confirmed = window.confirm('게시글을 삭제하시겠습니까?')
    if (!confirmed) return

    try {
      await boardAPI.deletePost(postId)
      navigate('/board', { replace: true })
    } catch (error) {
      console.error('게시글 삭제 실패:', error)
      alert(error.message || '게시글 삭제에 실패했습니다.')
    }
  }

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm('댓글을 삭제하시겠습니까?')
    if (!confirmed) return

    try {
      await boardAPI.deleteComment(postId, commentId)
      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
    } catch (error) {
      console.error('댓글 삭제 실패:', error)
      setNoticeMessage(error.message || '댓글 삭제에 실패했습니다.')
    }
  }

  const handleLikeComment = async (commentId) => {
    try {
      const response = await boardAPI.likeComment(postId, commentId, userId)
      const updatedComment = normalizeComment(response)

      setComments((prev) =>
          prev.map((comment) =>
              String(comment.id) === String(commentId) ? updatedComment : comment,
          ),
      )
    } catch (error) {
      console.error('댓글 공감 실패:', error)
      setNoticeMessage(error.message || '댓글 공감 처리에 실패했습니다.')
    }
  }

  if (isLoading) {
    return (
        <div className="empty-state">
          <span className="empty-state__icon">⏳</span>
          <p className="empty-state__title">게시글을 불러오는 중입니다</p>
          <p className="empty-state__desc">잠시만 기다려 주세요.</p>
        </div>
    )
  }

  if (!post) {
    return (
        <div className="empty-state">
          <span className="empty-state__icon">📭</span>
          <p className="empty-state__title">게시글을 찾을 수 없습니다</p>
          <p className="empty-state__desc">
            {noticeMessage || '삭제되었거나 존재하지 않는 게시글입니다.'}
          </p>
          <Link className="btn btn--primary" to="/board" style={{ marginTop: 12 }}>
            게시판으로 돌아가기
          </Link>
        </div>
    )
  }

  return (
      <div>
        <section
    style={{
      padding: '16px 20px',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
    }}
>
  <BackButton
      label="뒤로가기"
      style={{ color: 'var(--color-primary)' }}
  />
</section>

        {noticeMessage && (
            <div
                style={{
                  margin: '12px 16px 0',
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: '#fff7ed',
                  color: '#c2410c',
                  fontSize: 12,
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
            >
              {noticeMessage}
            </div>
        )}

        <article className="section" style={{ background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            {post.pinned && <span className="badge badge--orange">고정</span>}
            {favorite && <span className="badge badge--yellow">★ 즐겨찾기</span>}

            <span className={`badge ${getCategoryBadgeClass(post.category)}`}>
            {post.category}
          </span>
          </div>

          <h1
              style={{
                fontSize: 21,
                fontWeight: 800,
                lineHeight: 1.35,
                color: 'var(--color-text-primary)',
              }}
          >
            {post.title}
          </h1>

          <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 12,
                fontSize: 12,
                color: 'var(--color-text-muted)',
                flexWrap: 'wrap',
              }}
          >
            <span>{post.author}</span>
            <span>·</span>
            <span>{post.updatedAt ?? post.createdAt}</span>
            <span>·</span>
            <span>조회 {post.views}</span>
          </div>

          <div
              style={{
                marginTop: 20,
                padding: '18px 0',
                borderTop: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
                fontSize: 15,
                lineHeight: 1.75,
                color: 'var(--color-text-secondary)',
                whiteSpace: 'pre-line',
              }}
          >
            {post.content}
          </div>

          <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginTop: 16,
              }}
          >
            <button
                onClick={handleToggleLike}
                className={liked ? 'btn btn--primary' : 'btn btn--secondary'}
            >
              {liked ? '💙 공감 완료' : '🤍 공감'} {post.likes}
            </button>

            <button
                onClick={handleToggleFavorite}
                className={favorite ? 'btn btn--primary' : 'btn btn--secondary'}
            >
              {favorite ? '★ 즐겨찾기 완료' : '☆ 즐겨찾기'}
            </button>

            <button
                onClick={() => navigate(`/board/${postId}/edit`)}
                className="btn btn--secondary"
            >
              수정
            </button>

            <button onClick={handleDeletePost} className="btn btn--danger">
              삭제
            </button>
          </div>
        </article>

        <div className="divider" />

        <section className="section">
          <div className="section__header">
            <h2 className="section__title">댓글 {comments.length}</h2>
          </div>

          <div className="card" style={{ padding: 14, marginBottom: 14 }}>
          <textarea
              className="input-field"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 입력해 주세요"
              rows={3}
              style={{ resize: 'none' }}
          />
            <button
                onClick={handleAddComment}
                className="btn btn--primary btn--full"
                style={{ marginTop: 10 }}
                disabled={isSubmittingComment}
            >
              {isSubmittingComment ? '등록 중...' : '댓글 등록'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comments.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <span className="empty-state__icon">💬</span>
                  <p className="empty-state__title">댓글이 없습니다</p>
                  <p className="empty-state__desc">첫 댓글을 남겨보세요.</p>
                </div>
            ) : (
                comments.map((comment) => (
                    <div key={comment.id} className="card" style={{ padding: 14 }}>
                      <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: 8,
                            marginBottom: 6,
                          }}
                      >
                        <strong style={{ fontSize: 13 }}>{comment.author}</strong>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    {comment.createdAt}
                  </span>
                      </div>

                      <p
                          style={{
                            fontSize: 14,
                            color: 'var(--color-text-secondary)',
                            lineHeight: 1.5,
                          }}
                      >
                        {comment.content}
                      </p>

                      <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 8,
                            marginTop: 10,
                          }}
                      >
                        <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={comment.liked ? 'btn btn--primary' : 'btn btn--secondary'}
                            style={{
                              width: 'auto',
                              minHeight: 32,
                              padding: '6px 10px',
                              fontSize: 12,
                            }}
                        >
                          공감 {comment.likes}
                        </button>

                        <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="btn btn--danger"
                            style={{
                              width: 'auto',
                              minHeight: 32,
                              padding: '6px 10px',
                              fontSize: 12,
                            }}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                ))
            )}
          </div>
        </section>
      </div>
  )
}

function getCategoryBadgeClass(category) {
  if (category === '공지') return 'badge--blue'
  if (category === '자유') return 'badge--green'
  if (category === '질문') return 'badge--yellow'
  if (category === '건의') return 'badge--orange'
  return 'badge--green'
}