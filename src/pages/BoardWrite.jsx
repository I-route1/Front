import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { boardAPI } from '../api'

const FALLBACK_BOARDS = [
  {
    id: 1,
    name: '공지',
    description: '공지사항 게시판',
  },
  {
    id: 2,
    name: '자유',
    description: '자유게시판',
  },
  {
    id: 3,
    name: '질문',
    description: '질문 게시판',
  },
  {
    id: 4,
    name: '건의',
    description: '건의 게시판',
  },
]

function normalizeBoard(rawBoard) {
  return {
    id: rawBoard.id ?? rawBoard.boardId,
    name: rawBoard.name ?? rawBoard.title ?? '게시판',
    description: rawBoard.description ?? '',
  }
}

export default function BoardWrite() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [boards, setBoards] = useState([])
  const [form, setForm] = useState({
    boardId: '',
    title: '',
    content: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [noticeMessage, setNoticeMessage] = useState('')

  useEffect(() => {
    let ignore = false

    async function fetchBoards() {
      try {
        setIsLoadingBoards(true)
        setNoticeMessage('')

        const response = await boardAPI.getBoards()
        const boardList = Array.isArray(response)
          ? response.map(normalizeBoard)
          : []

        if (!ignore) {
          if (boardList.length > 0) {
            setBoards(boardList)
            setForm((prev) => ({
              ...prev,
              boardId: String(boardList[0].id),
            }))
          } else {
            setBoards(FALLBACK_BOARDS)
            setForm((prev) => ({
              ...prev,
              boardId: String(FALLBACK_BOARDS[1].id),
            }))
            setNoticeMessage('등록 가능한 게시판이 없어 임시 게시판을 표시 중입니다.')
          }
        }
      } catch {
        if (!ignore) {
          setBoards(FALLBACK_BOARDS)
          setForm((prev) => ({
            ...prev,
            boardId: String(FALLBACK_BOARDS[1].id),
          }))
          setNoticeMessage('백엔드 API 연결 전이라 임시 게시판으로 표시 중입니다.')
        }
      } finally {
        if (!ignore) {
          setIsLoadingBoards(false)
        }
      }
    }

    fetchBoards()

    return () => {
      ignore = true
    }
  }, [])

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.boardId) {
      nextErrors.boardId = '게시판을 선택해 주세요'
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

    try {
      const selectedBoard = boards.find((board) => String(board.id) === String(form.boardId))

      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        category: selectedBoard?.name ?? '게시판',
        author: user?.name ?? user?.nickname ?? '나',
      }

      const response = await boardAPI.createPost(form.boardId, payload)

      const createdPostId =
        response?.id ??
        response?.postId ??
        response?.post_id

      if (createdPostId) {
        navigate(`/board/${createdPostId}`, { replace: true })
        return
      }

      navigate('/board', { replace: true })
        } catch {
      const temporaryPostId = `post-${Date.now()}`
      const selectedBoard = boards.find((board) => String(board.id) === String(form.boardId))

      const temporaryPost = {
        id: temporaryPostId,
        boardId: form.boardId,
        category: selectedBoard?.name ?? '게시판',
        title: form.title.trim(),
        author: user?.name ?? user?.nickname ?? '나',
        content: form.content.trim(),
        createdAt: '방금 전',
        updatedAt: null,
        views: 0,
        likes: 0,
        comments: 0,
        pinned: false,
        favorite: false,
      }

      sessionStorage.setItem('i-route-temp-board-post', JSON.stringify(temporaryPost))

      alert('백엔드 API 연결 전이라 실제 등록은 되지 않고 임시 상세 페이지로 이동합니다.')
      navigate(`/board/${temporaryPostId}`, { replace: true })
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
            게시글 작성
          </h1>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="input-group">
            <label className="input-label">게시판 선택</label>

            {isLoadingBoards ? (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 12,
                  background: 'var(--color-surface-2)',
                  color: 'var(--color-text-muted)',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                게시판 목록을 불러오는 중입니다.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {boards.map((board) => (
                  <button
                    key={board.id}
                    onClick={() => update('boardId', String(board.id))}
                    style={{
                      padding: '9px 4px',
                      borderRadius: 10,
                      border: `1.5px solid ${
                        String(form.boardId) === String(board.id)
                          ? 'var(--color-primary)'
                          : 'var(--color-border)'
                      }`,
                      background:
                        String(form.boardId) === String(board.id)
                          ? 'var(--color-primary-light)'
                          : 'var(--color-surface-2)',
                      color:
                        String(form.boardId) === String(board.id)
                          ? 'var(--color-primary)'
                          : 'var(--color-text-secondary)',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {board.name}
                  </button>
                ))}
              </div>
            )}

            {errors.boardId && (
              <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                {errors.boardId}
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

          <button
            onClick={handleSubmit}
            disabled={loading || isLoadingBoards}
            className="btn btn--primary btn--full"
            style={{
              padding: '15px',
              opacity: loading || isLoadingBoards ? 0.65 : 1,
              cursor: loading || isLoadingBoards ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '등록 중...' : '등록하기'}
          </button>
        </div>
      </section>
    </div>
  )
}