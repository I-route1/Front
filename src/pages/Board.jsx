import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { boardAPI } from '../api'
import { useAuth } from '@/context/AuthContext'

const ACADEMY_SORT_OPTIONS = [
  { value: 'default', label: '기본 순' },
  { value: 'posts', label: '게시글 많은 순' },
  { value: 'favorites', label: '즐겨찾기 많은 순' },
]

function normalizeBoard(rawBoard) {
  return {
    id: rawBoard.id ?? rawBoard.boardId,
    name: rawBoard.name ?? rawBoard.title ?? '게시판',
    description: rawBoard.description ?? '',
    boardType: rawBoard.boardType ?? 'FREE',
    academyId: rawBoard.academyId,
    academyAddress: (rawBoard.academyAddress ?? '').trim(),
    postCount: rawBoard.postCount ?? 0,
    bookmarkCount: rawBoard.bookmarkCount ?? 0,
  }
}

export default function Board() {
  const { user } = useAuth()
  const userId = user?.id ?? user?.userId ?? 'guest'
  const storageKey = `iroute-favorite-boards-${userId}`

  const [boards, setBoards] = useState([])
  const [favoriteIds, setFavoriteIds] = useState([])
  const [academyFavorites, setAcademyFavorites] = useState(null)
  const [bookmarkPending, setBookmarkPending] = useState(false)
  const [bookmarkError, setBookmarkError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [noticeMessage, setNoticeMessage] = useState('')
  const [academySort, setAcademySort] = useState('default')
  const [sortOpen, setSortOpen] = useState(false)
  const sortButton = useRef(null)
  const sortLabel = ACADEMY_SORT_OPTIONS.find(option => option.value === academySort).label

  // 1. 사용자별 즐겨찾기 게시판 ID 로드
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]')
      setFavoriteIds(Array.isArray(saved) ? saved.map(String) : [])
    } catch {
      setFavoriteIds([])
    }
  }, [storageKey])

  useEffect(() => {
    let active = true
    setAcademyFavorites(null)
    setBookmarkError('')
    boardAPI.getBookmarkedBoardIds()
        .then(ids => { if (active) setAcademyFavorites(ids.map(String)) })
        .catch(() => { if (active) setBookmarkError('학원 즐겨찾기를 불러오지 못했습니다.') })
    return () => { active = false }
  }, [userId])

  const isFavorite = board => (board.boardType === 'ACADEMY'
      ? (academyFavorites ?? [])
      : favoriteIds).includes(String(board.id))

  // 2. 게시판 목록 조회
  useEffect(() => {
    let ignore = false

    async function fetchBoards() {
      try {
        setIsLoading(true)
        setNoticeMessage('')
        const boardsResponse = await boardAPI.getBoards()
        const boardList = Array.isArray(boardsResponse)
            ? boardsResponse.map(normalizeBoard)
            : []

        if (!ignore) {
          setBoards(boardList)
        }
      } catch (error) {
        console.error('게시판 목록 조회 실패:', error)
        if (!ignore) {
          setBoards([])
          setNoticeMessage('게시판 목록을 불러오지 못했습니다.')
        }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    fetchBoards()
    return () => {
      ignore = true
    }
  }, [])

  // 즐겨찾기 토글 핸들러
  const toggleFavorite = async (board) => {

    const idStr = String(board.id)
    if (board.boardType === 'ACADEMY') {
      if (academyFavorites === null || bookmarkPending) return
      const bookmarked = !isFavorite(board)
      setBookmarkPending(true)
      setBookmarkError('')
      try {
        await boardAPI.setBoardBookmark(board.id, bookmarked)
        setBoards(items => items.map(item => String(item.id) === idStr
            ? { ...item, bookmarkCount: Math.max(0, item.bookmarkCount + (bookmarked ? 1 : -1)) }
            : item))
        setAcademyFavorites(ids => bookmarked
            ? [...ids, idStr]
            : ids.filter(id => id !== idStr))
      } catch {
        setBookmarkError('학원 즐겨찾기를 저장하지 못했습니다.')
      } finally {
        setBookmarkPending(false)
      }
      return
    }

    setFavoriteIds((prev) => {
      const next = prev.includes(idStr)
          ? prev.filter((id) => id !== idStr)
          : [...prev, idStr]
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  const lowerKeyword = keyword.trim().toLowerCase()
  const filteredBoards = boards.filter((board) => {
    if (board.boardType === 'ACADEMY' && (board.academyId == null || !board.academyAddress)) {
      return false
    }

    return !lowerKeyword ||
        board.name.toLowerCase().includes(lowerKeyword) ||
        board.academyAddress.toLowerCase().includes(lowerKeyword)
  })

  const favoriteBoards = filteredBoards.filter(isFavorite)
  const commonBoards = filteredBoards.filter(
      (b) => b.boardType === 'NOTICE' || b.boardType === 'FREE',
  )

  const academyBoards = filteredBoards.filter(board => board.boardType === 'ACADEMY')
  if (academySort === 'posts') {
    academyBoards.sort((a, b) => b.postCount - a.postCount)
  } else if (academySort === 'favorites') {
    academyBoards.sort((a, b) => b.bookmarkCount - a.bookmarkCount)
  }

  const otherBoards = filteredBoards.filter(
      (b) =>
          b.boardType !== 'NOTICE' &&
          b.boardType !== 'FREE' &&
          b.boardType !== 'ACADEMY',
  )

  const getBoardIcon = (boardType) => {
    if (boardType === 'NOTICE') return '📢 '
    if (boardType === 'FREE') return '💬 '
    if (boardType === 'ACADEMY') return '🏫 '
    return '📌 '
  }

  // 게시판 행 렌더링 공통 컴포넌트
  const renderBoardRow = (board, isLast) => {
    const isFav = isFavorite(board)

    return (
      <div key={board.id} className="board-list-row"
          style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border)' }}>
        <Link to={'/board/' + board.id} className="board-list-row__link">
          <div className="board-list-row__body">
            <strong>{getBoardIcon(board.boardType)}{board.name}</strong>
            {board.description && <p>{board.description}</p>}
            {board.academyAddress && <p className="board-list-row__address">{board.academyAddress}</p>}
            {board.boardType === 'ACADEMY' && (
              <p className="board-list-row__stats">
                <span>게시글 {board.postCount}</span>
                <span>즐겨찾기 {board.bookmarkCount}</span>
              </p>
            )}
          </div>
        </Link>
        <button type="button" className="board-list-row__favorite"
            onClick={() => toggleFavorite(board)}
            aria-pressed={isFav}
            aria-disabled={board.boardType === 'ACADEMY' && (academyFavorites === null || bookmarkPending)}
            aria-label={board.name + (isFav ? ' 즐겨찾기 해제' : ' 즐겨찾기 추가')}>
          <span aria-hidden="true">{isFav ? '★' : '☆'}</span>
        </button>
        <Link to={'/board/' + board.id} className="board-list-row__arrow" tabIndex={-1} aria-hidden="true">›</Link>
      </div>
    )
  }

  return (
      <div style={{ paddingBottom: 96 }}>
        <section style={{ padding: '20px 20px 16px', background: 'var(--color-surface)' }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
            게시판
          </h1>
          <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
            공지사항, 자유게시판 및 학원별 게시판을 이용할 수 있습니다.
          </p>

          <div style={{ marginTop: 16 }}>
            <input
                className="input-field"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="게시판 이름 또는 학원 주소 검색"
            />
          </div>
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
                }}
            >
              {noticeMessage}
            </div>
        )}

        {isLoading ? (
            <div className="empty-state">
              <span className="empty-state__icon">⏳</span>
              <p className="empty-state__title">게시판 목록을 불러오는 중입니다</p>
              <p className="empty-state__desc">잠시만 기다려 주세요.</p>
            </div>
        ) : (
            <>
              {/* 최상단 섹션: 개인 즐겨찾기 게시판 */}
              <section className="section">
                <div className="section__header">
                  <h2 className="section__title">즐겨찾는 게시판</h2>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {bookmarkError && <p role="alert">{bookmarkError}</p>}
                  {favoriteBoards.length === 0 ? (
                      <div style={{ padding: '18px 16px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                        별표를 누른 게시판이 여기에 표시됩니다.
                      </div>
                  ) : (
                      favoriteBoards.map((board, idx) =>
                          renderBoardRow(board, idx === favoriteBoards.length - 1),
                      )
                  )}
                </div>
              </section>

              {/* 섹션 1: 전체 공통 게시판 */}
              <section className="section" style={{ paddingTop: 0 }}>
                <div className="section__header">
                  <h2 className="section__title">전체 게시판</h2>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {commonBoards.length === 0 ? (
                      <div style={{ padding: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        표시할 공통 게시판이 없습니다.
                      </div>
                  ) : (
                      commonBoards.map((board, idx) =>
                          renderBoardRow(board, idx === commonBoards.length - 1),
                      )
                  )}
                </div>
              </section>

              {/* 섹션 2: 학원별 게시판 */}
              <section className="section" style={{ paddingTop: 0 }}>
                <div
                    className="section__header"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <h2 className="section__title">학원별 게시판</h2>

                  <div className="board-sort"
                      onBlur={event => {
                        if (!event.currentTarget.contains(event.relatedTarget)) setSortOpen(false)
                      }}
                      onKeyDown={event => {
                        if (event.key === 'Escape' && sortOpen) {
                          setSortOpen(false)
                          sortButton.current.focus()
                        }
                      }}
                  >
                    <button ref={sortButton} type="button" className="board-sort__trigger"
                        aria-expanded={sortOpen}
                        aria-label={'학원별 게시판 정렬, ' + sortLabel}
                        onClick={() => setSortOpen(open => !open)}
                    >
                      {sortLabel}
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    {sortOpen && (
                      <div className="board-sort__options" role="group" aria-label="정렬 방식">
                        {ACADEMY_SORT_OPTIONS.map(option => (
                          <button type="button" key={option.value} aria-pressed={academySort === option.value}
                              onClick={() => {
                                setAcademySort(option.value)
                                setSortOpen(false)
                                sortButton.current.focus()
                              }}
                          >
                            {option.label}
                            {academySort === option.value && <span aria-hidden="true">✓</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {academyBoards.length === 0 ? (
                      <div style={{ padding: 20, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        등록된 학원 게시판이 없습니다.
                      </div>
                  ) : (
                      academyBoards.map((board, idx) =>
                          renderBoardRow(board, idx === academyBoards.length - 1),
                      )
                  )}
                </div>
              </section>

              {/* 기타 게시판이 있을 경우 */}
              {otherBoards.length > 0 && (
                  <section className="section" style={{ paddingTop: 0 }}>
                    <div className="section__header">
                      <h2 className="section__title">기타 게시판</h2>
                    </div>
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                      {otherBoards.map((board, idx) =>
                          renderBoardRow(board, idx === otherBoards.length - 1),
                      )}
                    </div>
                  </section>
              )}
            </>
        )}
      </div>
  )
}