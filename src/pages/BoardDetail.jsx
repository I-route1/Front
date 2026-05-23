import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

const BOARD_STORAGE_KEY = 'i-route-board-posts'

const DEFAULT_COMMENTS = [
  {
    id: 'comment-001',
    author: '아이루트 운영팀',
    content: '확인 후 반영 여부를 검토하겠습니다.',
    createdAt: '오늘 12:10',
  },
  {
    id: 'comment-002',
    author: '홍길동 학부모',
    content: '저도 같은 부분이 궁금했습니다.',
    createdAt: '오늘 12:25',
  },
]

function getPosts() {
  const saved = localStorage.getItem(BOARD_STORAGE_KEY)
  if (!saved) return []

  try {
    const parsed = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function BoardDetail() {
  const { postId } = useParams()
  const navigate = useNavigate()

  const [liked, setLiked] = useState(false)
  const [favorite, setFavorite] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState(DEFAULT_COMMENTS)

  const post = useMemo(() => {
    return getPosts().find((item) => item.id === postId)
  }, [postId])

  useEffect(() => {
    if (post) {
      setFavorite(!!post.favorite)
    }
  }, [post])

  const handleAddComment = () => {
    if (!commentText.trim()) return

    const newComment = {
      id: `comment-${Date.now()}`,
      author: '나',
      content: commentText.trim(),
      createdAt: '방금 전',
    }

    setComments((prev) => [newComment, ...prev])
    setCommentText('')
  }

  const handleToggleFavorite = () => {
    const nextFavorite = !favorite

    const nextPosts = getPosts().map((item) => {
      if (item.id !== postId) return item

      return {
        ...item,
        favorite: nextFavorite,
      }
    })

    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(nextPosts))
    setFavorite(nextFavorite)
  }

  const handleDeletePost = () => {
    const confirmed = window.confirm('게시글을 삭제하시겠습니까?')
    if (!confirmed) return

    const nextPosts = getPosts().filter((item) => item.id !== postId)
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(nextPosts))
    navigate('/board', { replace: true })
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
            onClick={() => setLiked((prev) => !prev)}
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
          >
            댓글 등록
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.map((comment) => (
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
            </div>
          ))}
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