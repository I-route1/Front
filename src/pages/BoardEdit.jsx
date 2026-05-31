import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

function normalizePost(rawPost) {
  return {
    id: rawPost.id ?? rawPost.postId,
    boardId: rawPost.boardId,
    category: rawPost.category ?? rawPost.boardName ?? '게시판',
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

function normalizeBoard(rawBoard) {
  return {
    id: rawBoard.id ?? rawBoard.boardId,
    name: rawBoard.name ?? rawBoard.title ?? '게시판',
    description: rawBoard.description ?? '',
  }
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

function findBoardIdByCategory(category) {
  const matchedBoard = FALLBACK_BOARDS.find((board) => board.name === category)
  return matchedBoard ? String(matchedBoard.id) : String(FALLBACK_BOARDS[1].id)
}

export default function BoardEdit() {
  const { postId } = useParams()
  const navigate = useNavigate()

  const [post, setPost] = useState(null)
  const [boards, setBoards] = useState(FALLBACK_BOARDS)
  const [form, setForm] = useState({
    boardId: '',
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

        let boardList = FALLBACK_BOARDS

        try {
          const boardsResponse = await boardAPI.getBoards()

          if (Array.isArray(boardsResponse) && boardsResponse.length > 0) {
            boardList = boardsResponse.map(normalizeBoard)
          }
        } catch {
          boardList = FALLBACK_BOARDS
        }

        const postResponse = await boardAPI.getPostDetail(postId)
        const normalizedPost = normalizePost(postResponse)

        if (!ignore) {
          setBoards(boardList)
          setPost(normalizedPost)
          setForm({
            boardId: normalizedPost.boardId
              ? String(normalizedPost.boardId)
              : findBoardIdByCategory(normalizedPost.category),
            title: normalizedPost.title,
            content: normalizedPost.content,
          })
        }
      } catch {
        const fallbackPost = findFallbackPost(postId)

        if (!ignore) {
          if (fallbackPost) {
            setBoards(FALLBACK_BOARDS)
            setPost(fallbackPost)
            setForm({
              boardId: fallbackPost.boardId
                ? String(fallbackPost.boardId)
                : findBoardIdByCategory(fallbackPost.category),
              title: fallbackPost.title,
              content: fallbackPost.content,
            })
            setNoticeMessage('백엔드 API 연결 전이라 임시 게시글 수정 화면으로 표시 중입니다.')
          } else {
            setPost(null)
            setNoticeMessage('')
          }
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
  }, [postId])

  const update = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))

    setErrors((prev) => ({
      ...prev,
      [key]: '',
    }))
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
        boardId: form.boardId,
        category: selectedBoard?.name ?? post?.category ?? '게시판',
        title: form.title.trim(),
        content: form.content.trim(),
      }

      await boardAPI.updatePost(postId, payload)

      alert('게시글이 수정되었습니다.')
      navigate(`/board/${postId}`, { replace: true })
    } catch {
      const temporaryUpdatedPost = {
        ...(post ?? {}),
        id: postId,
        boardId: form.boardId,
        category:
          boards.find((board) => String(board.id) === String(form.boardId))?.name ??
          post?.category ??
          '게시판',
        title: form.title.trim(),
        content: form.content.trim(),
        updatedAt: '방금 수정됨',
      }

      sessionStorage.setItem('i-route-temp-board-post', JSON.stringify(temporaryUpdatedPost))

      alert('백엔드 API 연결 전이라 실제 수정은 되지 않고 화면에서만 임시 반영됩니다.')
      navigate(`/board/${postId}`, { replace: true })
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
        <p className="empty-state__desc">삭제되었거나 존재하지 않는 게시글입니다.</p>
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
            <label className="input-label">게시판 선택</label>
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