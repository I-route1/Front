import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { boardAPI } from '../api'

const FALLBACK_POSTS = [
  {
    id: 'post-001',
    boardId: 1,
    category: '공지',
    title: '5월 등원 차량 운행 시간 안내',
    author: '아이루트 운영팀',
    content: '5월부터 일부 노선의 등원 차량 운행 시간이 조정됩니다. 자세한 내용은 학원별 공지사항을 확인해 주세요.',
    createdAt: '오늘 11:20',
    updatedAt: null,
    views: 32,
    likes: 4,
    comments: 2,
    pinned: true,
    favorite: true,
  },
  {
    id: 'post-002',
    boardId: 2,
    category: '자유',
    title: '오늘 영어학원 하원 시간이 조금 늦어졌나요?',
    author: '홍길동 학부모',
    content: '오늘 영어학원 하원 알림이 평소보다 늦게 온 것 같아서 확인 차 글 남깁니다.',
    createdAt: '오늘 10:05',
    updatedAt: null,
    views: 18,
    likes: 1,
    comments: 3,
    pinned: false,
    favorite: false,
  },
  {
    id: 'post-003',
    boardId: 3,
    category: '질문',
    title: '학습 리포트는 언제 업데이트되나요?',
    author: '김민지 학부모',
    content: '주간 학습 리포트가 아직 보이지 않는데 업데이트 시간이 정해져 있는지 궁금합니다.',
    createdAt: '어제 16:00',
    updatedAt: null,
    views: 24,
    likes: 2,
    comments: 1,
    pinned: false,
    favorite: false,
  },
  {
    id: 'post-004',
    boardId: 4,
    category: '건의',
    title: '지도 화면에서 정류장 이름이 더 크게 보이면 좋겠습니다',
    author: '이서준 학부모',
    content: '실시간 위치를 볼 때 정류장명이 작게 보여서 조금 더 크게 표시되면 좋겠습니다.',
    createdAt: '3일 전',
    updatedAt: null,
    views: 41,
    likes: 7,
    comments: 4,
    pinned: false,
    favorite: false,
  },
]

const FALLBACK_COMMENTS = [
  {
    id: 'comment-001',
    author: '아이루트 운영팀',
    content: '확인 후 반영 여부를 검토하겠습니다.',
    createdAt: '오늘 12:10',
    likes: 0,
  },
  {
    id: 'comment-002',
    author: '홍길동 학부모',
    content: '저도 같은 부분이 궁금했습니다.',
    createdAt: '오늘 12:25',
    likes: 1,
  },
]

function normalizePost(rawPost) {
  return {
    id: rawPost.id ?? rawPost.postId,
    boardId: rawPost.boardId,
    category: rawPost.category ?? rawPost.boardName ?? '게시판',
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
  }
}

function normalizeComment(rawComment) {
  return {
    id: rawComment.id ?? rawComment.commentId,
    author: rawComment.author ?? rawComment.createdBy ?? rawComment.writer ?? rawComment.nickname ?? '작성자',
    content: rawComment.content ?? rawComment.description ?? '',
    createdAt: formatDate(rawComment.createdAt),
    likes: rawComment.likes ?? rawComment.likeCount ?? 0,
  }
}

function formatDate(value) {
  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

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

function findFallbackPost(postId) {
  const matchedFallbackPost = FALLBACK_POSTS.find((item) => String(item.id) === String(postId))

  if (matchedFallbackPost) {
    return matchedFallbackPost
  }

  try {
    const savedTemporaryPost = sessionStorage.getItem('i-route-temp-board-post')

    if (!savedTemporaryPost) {
      return null
    }

    const parsedTemporaryPost = JSON.parse(savedTemporaryPost)

    if (String(parsedTemporaryPost.id) !== String(postId)) {
      return null
    }

    return parsedTemporaryPost
  } catch {
    return null
  }
}

export default function BoardDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()

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

        const postResponse = await boardAPI.getPostDetail(postId)
        const normalizedPost = normalizePost(postResponse)

        let normalizedComments = []

        try {
          const commentsResponse = await boardAPI.getComments(postId)

          if (Array.isArray(commentsResponse)) {
            normalizedComments = commentsResponse.map(normalizeComment)
          }
        } catch {
          normalizedComments = []
        }

        if (!ignore) {
          setPost(normalizedPost)
          setFavorite(!!normalizedPost.favorite)
          setComments(normalizedComments)
        }
      } catch {
        const fallbackPost = findFallbackPost(postId)

        if (!ignore) {
          if (fallbackPost) {
            setPost(fallbackPost)
            setFavorite(!!fallbackPost.favorite)
            setComments(FALLBACK_COMMENTS)
            setNoticeMessage('백엔드 API 연결 전이라 임시 게시글 상세로 표시 중입니다.')
          } else {
            setPost(null)
            setComments([])
            setNoticeMessage('')
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    fetchPostDetail()

    return () => {
      ignore = true
    }
  }, [postId])

  const handleAddComment = async () => {
    const trimmedComment = commentText.trim()

    if (!trimmedComment) return

    try {
      setIsSubmittingComment(true)

      const response = await boardAPI.createComment(postId, {
        content: trimmedComment,
      })

      const newComment = response
        ? normalizeComment(response)
        : {
            id: `comment-${Date.now()}`,
            author: '나',
            content: trimmedComment,
            createdAt: '방금 전',
            likes: 0,
          }

      setComments((prev) => [newComment, ...prev])
      setCommentText('')
    } catch {
      const newComment = {
        id: `comment-${Date.now()}`,
        author: '나',
        content: trimmedComment,
        createdAt: '방금 전',
        likes: 0,
      }

      setComments((prev) => [newComment, ...prev])
      setCommentText('')
      setNoticeMessage('백엔드 API 연결 전이라 댓글이 임시로만 추가되었습니다.')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleToggleLike = async () => {
    const nextLiked = !liked

    setLiked(nextLiked)

    try {
      await boardAPI.likePost(postId)
    } catch {
      setNoticeMessage('백엔드 API 연결 전이라 공감 상태가 화면에서만 변경되었습니다.')
    }
  }

  const handleToggleFavorite = async () => {
    const nextFavorite = !favorite

    setFavorite(nextFavorite)

    try {
      await boardAPI.bookmarkPost(postId)
    } catch {
      setNoticeMessage('백엔드 API 연결 전이라 즐겨찾기 상태가 화면에서만 변경되었습니다.')
    }
  }

  const handleDeletePost = async () => {
    const confirmed = window.confirm('게시글을 삭제하시겠습니까?')
    if (!confirmed) return

    try {
      await boardAPI.deletePost(postId)
      navigate('/board', { replace: true })
    } catch {
      const fallbackPost = findFallbackPost(postId)

      if (fallbackPost) {
        alert('백엔드 API 연결 전이라 실제 삭제는 되지 않고 게시판으로 이동합니다.')
        navigate('/board', { replace: true })
        return
      }

      alert('게시글 삭제에 실패했습니다.')
    }
  }

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm('댓글을 삭제하시겠습니까?')
    if (!confirmed) return

    try {
      await boardAPI.deleteComment(postId, commentId)
      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
    } catch {
      setComments((prev) => prev.filter((comment) => comment.id !== commentId))
      setNoticeMessage('백엔드 API 연결 전이라 댓글이 화면에서만 삭제되었습니다.')
    }
  }

  const handleLikeComment = async (commentId) => {
    setComments((prev) =>
      prev.map((comment) => {
        if (comment.id !== commentId) return comment

        return {
          ...comment,
          likes: comment.likes + 1,
        }
      }),
    )

    try {
      await boardAPI.likeComment(postId, commentId)
    } catch {
      setNoticeMessage('백엔드 API 연결 전이라 댓글 공감이 화면에서만 반영되었습니다.')
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
        <p className="empty-state__desc">삭제되었거나 존재하지 않는 게시글입니다.</p>
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
        <button
          onClick={() => navigate(-1)}
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--color-primary)',
          }}
        >
          ← 뒤로가기
        </button>
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
            {liked ? '💙 공감 완료' : '🤍 공감'} {post.likes + (liked ? 1 : 0)}
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

          <button
            onClick={handleDeletePost}
            className="btn btn--danger"
          >
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
                    className="btn btn--secondary"
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
  return 'badge--blue'
}