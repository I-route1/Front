import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { boardAPI } from '../api'

const CATEGORIES = ['공지', '자유', '질문', '건의']

function normalizePost(rawPost) {
  return {
    id: rawPost.id ?? rawPost.postId,
    boardId: rawPost.boardId,
    category: rawPost.category ?? rawPost.tag ?? rawPost.postCategory ?? '자유',
    title: rawPost.title ?? rawPost.name ?? '',
    author: rawPost.author ?? rawPost.createdBy ?? rawPost.writer ?? rawPost.nickname ?? '작성자',
    content: rawPost.content ?? rawPost.description ?? '',
    createdAt: rawPost.createdAt ?? '',
    updatedAt: rawPost.updatedAt ?? null,
    views: rawPost.views ?? rawPost.viewCount ?? rawPost.hitCount ?? 0,
    likes: rawPost.likes ?? rawPost.likeCount ?? 0,
    comments: rawPost.comments ?? rawPost.commentCount ?? 0,
    pinned: !!rawPost.pinned,
    favorite: !!(rawPost.favorite ?? rawPost.bookmarked ?? rawPost.isBookmarked),
  }
}

export default function BoardEdit() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [post, setPost] = useState(null)
  const [form, setForm] = useState({
    category: '자유',
    title: '',
    content: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [isLoadingPost, setIsLoadingPost] = useState(true)
  const [noticeMessage, setNoticeMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function fetchEditData() {
      try {
        setIsLoadingPost(true)
        setNoticeMessage('')

        if (!/^\d+$/.test(String(postId))) {
          throw new Error('잘못된 게시글 ID입니다.')
        }

        const postResponse = await boardAPI.getPostDetail(postId, user?.id ?? user?.userId)
        const normalizedPost = normalizePost(postResponse)

        if (!ignore) {
          setPost(normalizedPost)
          setForm({
            category: normalizedPost.category || '자유',
            title: normalizedPost.title,
            content: normalizedPost.content,
          })
        }
      } catch (error) {
        console.error('게시글 수정 데이터 조회 실패:', error)

        if (!ignore) {
          setPost(null)
          setNoticeMessage(error.message || '게시글을 불러오지 못했습니다.')
        }
      } finally {
        if (!ignore) {
          setIsLoadingPost(false)
        }
      }
    }

    fetchEditData()

    return () => {
      ignore = true
    }
  }, [postId, user?.id, user?.userId])

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

    setErrors((prev) => ({
      ...prev,
      [key]: '',
      submit: '',
    }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.category) {
      nextErrors.category = '태그를 선택해 주세요'
    }

    if (!form.title.trim()) {
      nextErrors.title = '제목을 입력해 주세요'
    } else if (form.title.trim().length < 2) {
      nextErrors.title = '제목은 2자 이상 입력해 주세요'
    }

    if (!form.content.trim()) {
      nextErrors.content = '내용을 입력해 주세요'
    } else if (form.content.trim().length < 5) {
      nextErrors.content = '내용은 5자 이상 입력해 주세요'
    }

    return nextErrors
  }

  const handleSubmit = async () => {
    const nextErrors = validate()

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const payload = {
        category: form.category,
        title: form.title.trim(),
        content: form.content.trim(),
      }

      await boardAPI.updatePost(postId, payload, user?.id ?? user?.userId)

      alert('게시글이 수정되었습니다.')
      navigate(`/board/${postId}`, { replace: true })
    } catch (error) {
      console.error('게시글 수정 실패:', error)

      setErrors({
        submit: error.message || '게시글 수정에 실패했습니다. 백엔드 API를 확인해 주세요.',
      })
    } finally {
      setLoading(false)
    }
  }

  if (isLoadingPost) {
    return (
        <div className="empty-state">
          <span className="empty-state__icon">⏳</span>
          <p className="empty-state__title">수정할 게시글을 불러오는 중입니다</p>
          <p className="empty-state__desc">잠시만 기다려 주세요.</p>
        </div>
    )
  }

  if (!post) {
    return (
        <div className="empty-state">
          <span className="empty-state__icon">📭</span>
          <p className="empty-state__title">수정할 게시글을 찾을 수 없습니다</p>
          <p className="empty-state__desc">
            {noticeMessage || '삭제되었거나 존재하지 않는 게시글입니다.'}
          </p>
          <button
              onClick={() => navigate('/board')}
              className="btn btn--primary"
              style={{ marginTop: 12 }}
          >
            게시판으로 돌아가기
          </button>
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

        <section className="section">
          <div className="section__header">
            <h1 className="section__title" style={{ fontSize: 22 }}>
              게시글 수정
            </h1>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="input-group">
              <label className="input-label">태그 선택</label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {CATEGORIES.map((category) => (
                    <button
                        key={category}
                        type="button"
                        onClick={() => update('category', category)}
                        style={{
                          padding: '9px 4px',
                          borderRadius: 10,
                          border: `1.5px solid ${
                              form.category === category
                                  ? 'var(--color-primary)'
                                  : 'var(--color-border)'
                          }`,
                          background:
                              form.category === category
                                  ? 'var(--color-primary-light)'
                                  : 'var(--color-surface-2)',
                          color:
                              form.category === category
                                  ? 'var(--color-primary)'
                                  : 'var(--color-text-secondary)',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                    >
                      {category}
                    </button>
                ))}
              </div>

              {errors.category && (
                  <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                    {errors.category}
                  </p>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">제목</label>
              <input
                  className="input-field"
                  value={form.title}
                  onChange={(e) => update('title', e.target.value)}
                  placeholder="제목을 입력해 주세요"
                  style={{ borderColor: errors.title ? 'var(--color-danger)' : '' }}
              />
              {errors.title && (
                  <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                    {errors.title}
                  </p>
              )}
            </div>

            <div className="input-group">
              <label className="input-label">내용</label>
              <textarea
                  className="input-field"
                  value={form.content}
                  onChange={(e) => update('content', e.target.value)}
                  placeholder="내용을 입력해 주세요"
                  rows={8}
                  style={{
                    resize: 'none',
                    lineHeight: 1.6,
                    borderColor: errors.content ? 'var(--color-danger)' : '',
                  }}
              />
              {errors.content && (
                  <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                    {errors.content}
                  </p>
              )}
            </div>

            {errors.submit && (
                <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: 13,
                      fontWeight: 700,
                      lineHeight: 1.5,
                    }}
                >
                  {errors.submit}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn--primary btn--full"
                style={{
                  padding: '15px',
                  opacity: loading ? 0.65 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
            >
              {loading ? '수정 중...' : '수정 완료'}
            </button>
          </div>
        </section>
      </div>
  )
}