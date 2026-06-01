import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { boardAPI } from '../api'

const CATEGORIES = ['공지', '자유', '질문', '건의']
const DEFAULT_BOARD_ID = 1

export default function BoardWrite() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState({
    category: '자유',
    title: '',
    content: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '', submit: '' }))
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
      const userId = user?.id ?? user?.userId

      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: form.category,
        author: user?.name ?? user?.nickname ?? '나',
        userId,
      }

      const response = await boardAPI.createPost(DEFAULT_BOARD_ID, payload, userId)

      const createdPostId =
          response?.id ??
          response?.postId ??
          response?.post_id ??
          response?.data?.id ??
          response?.data?.postId

      if (createdPostId && /^\d+$/.test(String(createdPostId))) {
        navigate(`/board/${createdPostId}`, { replace: true })
        return
      }

      navigate('/board', { replace: true })
    } catch (error) {
      console.error('게시글 등록 실패:', error)

      setErrors({
        submit: error.message || '게시글 등록에 실패했습니다. 백엔드 API를 확인해 주세요.',
      })
    } finally {
      setLoading(false)
    }
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

        <section className="section">
          <div className="section__header">
            <h1 className="section__title" style={{ fontSize: 22 }}>
              게시글 작성
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
              {loading ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </section>
      </div>
  )
}