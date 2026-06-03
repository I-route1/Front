import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { boardAPI } from '../api'
import { useAuth, USER_ROLES } from '@/context/AuthContext'
import NoChildScreen from '@/components/common/NoChildScreen'

const TABS = ['전체', '즐겨찾기', '공지', '자유', '질문', '건의']

const SORT_OPTIONS = [
  { key: 'latest', label: '등록순' },
  { key: 'views',  label: '조회순' },
  { key: 'likes',  label: '공감순' },
]

const TEMP_ACADEMIES = [
  { id: 'academy-001', name: '아이루트 학원' },
  { id: 'academy-002', name: '수학나라 학원' },
  { id: 'academy-003', name: '영어마을 학원' },
]

function normalizeBoard(rawBoard) {
  return {
    id: rawBoard.id ?? rawBoard.boardId,
    name: rawBoard.name ?? rawBoard.title ?? '게시판',
    description: rawBoard.description ?? '',
    postCount: rawBoard.postCount ?? 0,
    createdAt: rawBoard.createdAt ?? '',
    createdBy: rawBoard.createdBy ?? '',
  }
}

function normalizePost(rawPost, board) {
  const id = rawPost.id ?? rawPost.postId
  const category = rawPost.category ?? rawPost.tag ?? rawPost.postCategory ?? '자유'
  const createdAtRaw = rawPost.createdAt ?? ''
  const updatedAtRaw = rawPost.updatedAt ?? ''
  return {
    id,
    boardId: rawPost.boardId ?? board?.id,
    category,
    title: rawPost.title ?? rawPost.name ?? '제목 없음',
    author: rawPost.author ?? rawPost.createdBy ?? rawPost.writer ?? rawPost.nickname ?? '작성자',
    content: rawPost.content ?? rawPost.description ?? '',
    createdAtRaw,
    updatedAtRaw,
    createdAt: formatDate(createdAtRaw),
    updatedAt: updatedAtRaw ? formatDate(updatedAtRaw) : null,
    views: Number(rawPost.views ?? rawPost.viewCount ?? rawPost.hitCount ?? 0),
    likes: Number(rawPost.likes ?? rawPost.likeCount ?? 0),
    comments: Number(rawPost.comments ?? rawPost.commentCount ?? 0),
    pinned: !!rawPost.pinned,
    favorite: !!(rawPost.favorite ?? rawPost.bookmarked ?? rawPost.isBookmarked),
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

function getTimeValue(value) {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function sortPosts(posts, sortType) {
  return [...posts].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (sortType === 'views') {
      const viewDiff = b.views - a.views
      return viewDiff !== 0 ? viewDiff : getTimeValue(b.createdAtRaw) - getTimeValue(a.createdAtRaw)
    }
    if (sortType === 'likes') {
      const likeDiff = b.likes - a.likes
      return likeDiff !== 0 ? likeDiff : getTimeValue(b.createdAtRaw) - getTimeValue(a.createdAtRaw)
    }
    return getTimeValue(b.createdAtRaw) - getTimeValue(a.createdAtRaw)
  })
}

function getCategoryBadgeClass(category) {
  if (category === '공지') return 'badge--blue'
  if (category === '자유') return 'badge--green'
  if (category === '질문') return 'badge--yellow'
  if (category === '건의') return 'badge--orange'
  return 'badge--green'
}

export default function Board() {
  const { user, role } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('전체')
  const [sortType, setSortType] = useState('latest')
  const [selectedAcademyId, setSelectedAcademyId] = useState(TEMP_ACADEMIES[0]?.id ?? '')
  const [keyword, setKeyword] = useState('')
  const [boards, setBoards] = useState([])
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [noticeMessage, setNoticeMessage] = useState('')

  // 학부모인데 자녀 없으면 빈 화면
  if (role === USER_ROLES.PARENT && (!user?.children || user.children.length === 0)) {
    return <NoChildScreen message={'자녀를 등록하면\n학원 게시판을 이용할 수 있어요'} />
  }

  const selectedAcademy = TEMP_ACADEMIES.find(a => a.id === selectedAcademyId)

  useEffect(() => {
    let ignore = false
    async function fetchBoardData() {
      try {
        setIsLoading(true)
        setNoticeMessage('')
        const boardsResponse = await boardAPI.getBoards()
        const boardList = Array.isArray(boardsResponse) ? boardsResponse.map(normalizeBoard) : []
        const postResults = await Promise.allSettled(
          boardList.map(async (board) => {
            const user = JSON.parse(sessionStorage.getItem('i-route-user') || '{}')
            const userId = user.id ?? user.userId
            const postsResponse = await boardAPI.getPostsByBoard(board.id, userId)
            if (!Array.isArray(postsResponse)) return []
            return postsResponse
              .map(post => normalizePost(post, board))
              .filter(post => post.id !== undefined && post.id !== null && /^\d+$/.test(String(post.id)))
          }),
        )
        const mergedPosts = postResults.flatMap(result => result.status !== 'fulfilled' ? [] : result.value)
        if (!ignore) { setBoards(boardList); setPosts(mergedPosts) }
      } catch (error) {
        console.error('게시판 목록 조회 실패:', error)
        if (!ignore) { setBoards([]); setPosts([]); setNoticeMessage('게시판 API 연결에 실패했습니다.') }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }
    fetchBoardData()
    return () => { ignore = true }
  }, [])

  const filteredPosts = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase()
    const matched = posts.filter(post => {
      const matchedTab = activeTab === '전체' || (activeTab === '즐겨찾기' && post.favorite) || post.category === activeTab
      const matchedKeyword = !lowerKeyword || post.title.toLowerCase().includes(lowerKeyword) || post.content.toLowerCase().includes(lowerKeyword) || post.author.toLowerCase().includes(lowerKeyword)
      return matchedTab && matchedKeyword
    })
    return sortPosts(matched, sortType)
  }, [posts, activeTab, keyword, sortType])

  return (
    <div>
      <section style={{ padding: '20px 20px 14px', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>게시판</h1>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>학원 공지와 학부모 소통 글을 확인할 수 있습니다.</p>
          </div>
          <button onClick={() => navigate('/board/write')} style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--color-primary)', color: 'white', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 12px rgba(26,86,219,0.25)', flexShrink: 0 }}>
            글쓰기
          </button>
        </div>
        <div style={{ marginTop: 16 }}>
          <input className="input-field" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="제목, 내용, 작성자 검색" />
        </div>

        {/* 학원 선택 */}
        <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--color-primary-light)', border: '1px solid var(--color-border)' }}>
          <label htmlFor="academy-select" style={{ display: 'block', fontSize: 12, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 8 }}>학원 선택</label>
          <select id="academy-select" value={selectedAcademyId} onChange={e => setSelectedAcademyId(e.target.value)}
            style={{ width: '100%', height: 44, padding: '0 12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
            {TEMP_ACADEMIES.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>현재는 UI 확인용 임시 학원 목록입니다. 추후 백엔드 API 연동 후 변경됩니다.</p>
        </div>
      </section>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '8px 14px', borderRadius: 999, background: activeTab === tab ? 'var(--color-primary)' : 'var(--color-surface-2)', color: activeTab === tab ? 'white' : 'var(--color-text-secondary)', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {tab}
          </button>
        ))}
      </div>

      {/* 정렬 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: 'var(--color-bg)' }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text-primary)' }}>{selectedAcademy?.name ?? '선택된 학원'}</p>
          <p style={{ marginTop: 2, fontSize: 11, color: 'var(--color-text-muted)' }}>선택한 학원의 게시글입니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setSortType(opt.key)}
              style={{ padding: '7px 12px', borderRadius: 999, border: sortType === opt.key ? '1px solid var(--color-primary)' : '1px solid var(--color-border)', background: sortType === opt.key ? 'var(--color-primary)' : 'var(--color-surface)', color: sortType === opt.key ? 'white' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {noticeMessage && (
        <div style={{ margin: '12px 16px 0', padding: '10px 12px', borderRadius: 12, background: '#fff7ed', color: '#c2410c', fontSize: 12, fontWeight: 700, lineHeight: 1.5 }}>{noticeMessage}</div>
      )}

      <section className="section" style={{ minHeight: 'calc(100vh - 360px)', paddingBottom: 96 }}>
        {isLoading ? (
          <div className="empty-state">
            <span className="empty-state__icon">⏳</span>
            <p className="empty-state__title">게시글을 불러오는 중입니다</p>
            <p className="empty-state__desc">잠시만 기다려 주세요.</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📭</span>
            <p className="empty-state__title">게시글이 없습니다</p>
            <p className="empty-state__desc">{activeTab === '즐겨찾기' ? '즐겨찾기한 게시글이 없습니다.' : '검색어를 변경하거나 새 글을 작성해 보세요.'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredPosts.map(post => (
              <Link key={post.id} to={`/board/${post.id}`} className="card card--clickable" style={{ display: 'block', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {post.pinned && <span className="badge badge--orange" style={{ fontSize: 10 }}>고정</span>}
                  {post.favorite && <span className="badge badge--yellow" style={{ fontSize: 10 }}>★ 즐겨찾기</span>}
                  <span className={`badge ${getCategoryBadgeClass(post.category)}`} style={{ fontSize: 10 }}>{post.category}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>{post.updatedAt ?? post.createdAt}</span>
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1.4, marginBottom: 6 }}>{post.title}</h2>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.content}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, fontSize: 12, color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                  <span>작성자 {post.author}</span>
                  <span>조회 {post.views}</span>
                  <span>공감 {post.likes}</span>
                  <span>댓글 {post.comments}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}