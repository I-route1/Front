import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const BOARD_STORAGE_KEY = 'i-route-board-posts'

const CATEGORY_OPTIONS = ['공지', '자유', '질문', '건의']

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
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const nextErrors = {}

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

    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const newPost = {
        id: `post-${Date.now()}`,
        category: form.category,
        title: form.title.trim(),
        author: user?.name ?? '나',
        content: form.content.trim(),
        createdAt: '방금 전',
        views: 0,
        likes: 0,
        comments: 0,
        pinned: false,
      }

      const posts = getPosts()
      localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify([newPost, ...posts]))

      navigate(`/board/${newPost.id}`, { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <section style={{ padding: '16px 20px', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
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
            <label className="input-label">게시글 유형</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {CATEGORY_OPTIONS.map((category) => (
                <button
                  key={category}
                  onClick={() => update('category', category)}
                  style={{
                    padding: '9px 4px',
                    borderRadius: 10,
                    border: `1.5px solid ${form.category === category ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: form.category === category ? 'var(--color-primary-light)' : 'var(--color-surface-2)',
                    color: form.category === category ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
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