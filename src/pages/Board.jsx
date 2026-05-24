import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const BOARD_STORAGE_KEY = 'i-route-board-posts'

const DEFAULT_POSTS = [
  {
    id: 'post-001',
    category: '공지',
    title: '5월 등원 차량 운행 시간 안내',
    author: '아이루트 운영팀',
    content: '5월부터 일부 노선의 등원 차량 운행 시간이 조정됩니다. 자세한 내용은 학원별 공지사항을 확인해 주세요.',
    createdAt: '오늘 11:20',
    views: 32,
    likes: 4,
    comments: 2,
    pinned: true,
    favorite: true,
  },
  {
    id: 'post-002',
    category: '자유',
    title: '오늘 영어학원 하원 시간이 조금 늦어졌나요?',
    author: '홍길동 학부모',
    content: '오늘 영어학원 하원 알림이 평소보다 늦게 온 것 같아서 확인 차 글 남깁니다.',
    createdAt: '오늘 10:05',
    views: 18,
    likes: 1,
    comments: 3,
    pinned: false,
    favorite: false,
  },
  {
    id: 'post-003',
    category: '질문',
    title: '학습 리포트는 언제 업데이트되나요?',
    author: '김민지 학부모',
    content: '주간 학습 리포트가 아직 보이지 않는데 업데이트 시간이 정해져 있는지 궁금합니다.',
    createdAt: '어제 16:00',
    views: 24,
    likes: 2,
    comments: 1,
    pinned: false,
    favorite: false,
  },
  {
    id: 'post-004',
    category: '건의',
    title: '지도 화면에서 정류장 이름이 더 크게 보이면 좋겠습니다',
    author: '이서준 학부모',
    content: '실시간 위치를 볼 때 정류장명이 작게 보여서 조금 더 크게 표시되면 좋겠습니다.',
    createdAt: '3일 전',
    views: 41,
    likes: 7,
    comments: 4,
    pinned: false,
    favorite: false,
  },
]

const TABS = ['전체', '즐겨찾기', '공지', '자유', '질문', '건의']

function normalizePosts(posts) {
  return posts.map((post) => ({
    ...post,
    favorite: !!post.favorite,
  }))
}

function getStoredPosts() {
  const saved = localStorage.getItem(BOARD_STORAGE_KEY)

  if (!saved) {
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(DEFAULT_POSTS))
    return DEFAULT_POSTS
  }

  try {
    const parsed = JSON.parse(saved)

    if (!Array.isArray(parsed)) {
      localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(DEFAULT_POSTS))
      return DEFAULT_POSTS
    }

    const normalizedPosts = normalizePosts(parsed)
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(normalizedPosts))

    return normalizedPosts
  } catch {
    localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(DEFAULT_POSTS))
    return DEFAULT_POSTS
  }
}

export default function Board() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('전체')
  const [keyword, setKeyword] = useState('')
  const [posts] = useState(getStoredPosts)

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchedTab =
        activeTab === '전체' ||
        (activeTab === '즐겨찾기' && post.favorite) ||
        post.category === activeTab

      const matchedKeyword =
        post.title.toLowerCase().includes(keyword.toLowerCase()) ||
        post.content.toLowerCase().includes(keyword.toLowerCase()) ||
        post.author.toLowerCase().includes(keyword.toLowerCase())

      return matchedTab && matchedKeyword
    })
  }, [posts, activeTab, keyword])

  return (
    <div>
      <section style={{ padding: '20px 20px 14px', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)' }}>
              게시판
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: 'var(--color-text-muted)' }}>
              학원 공지와 학부모 소통 글을 확인할 수 있습니다.
            </p>
          </div>

          <button
            onClick={() => navigate('/board/write')}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: 13,
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(26,86,219,0.25)',
              flexShrink: 0,
            }}
          >
            글쓰기
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <input
            className="input-field"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="제목, 내용, 작성자 검색"
          />
        </div>
      </section>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          overflowX: 'auto',
          background: 'var(--color-surface)',
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: activeTab === tab ? 'var(--color-primary)' : 'var(--color-surface-2)',
              color: activeTab === tab ? 'white' : 'var(--color-text-secondary)',
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <section
        className="section"
        style={{
          minHeight: 'calc(100vh - 360px)',
          paddingBottom: 96,
        }}
      >
        {filteredPosts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📭</span>
            <p className="empty-state__title">게시글이 없습니다</p>
            <p className="empty-state__desc">
              {activeTab === '즐겨찾기'
                ? '즐겨찾기한 게시글이 없습니다.'
                : '검색어를 변경하거나 새 글을 작성해 보세요.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                to={`/board/${post.id}`}
                className="card card--clickable"
                style={{ display: 'block', padding: 16 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {post.pinned && (
                    <span className="badge badge--orange" style={{ fontSize: 10 }}>
                      고정
                    </span>
                  )}

                  {post.favorite && (
                    <span className="badge badge--yellow" style={{ fontSize: 10 }}>
                      ★ 즐겨찾기
                    </span>
                  )}

                  <span className={`badge ${getCategoryBadgeClass(post.category)}`} style={{ fontSize: 10 }}>
                    {post.category}
                  </span>

                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {post.updatedAt ?? post.createdAt}
                  </span>
                </div>

                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  {post.title}
                </h2>

                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {post.content}
                </p>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 12,
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    flexWrap: 'wrap',
                  }}
                >
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

function getCategoryBadgeClass(category) {
  if (category === '공지') return 'badge--blue'
  if (category === '자유') return 'badge--green'
  if (category === '질문') return 'badge--yellow'
  if (category === '건의') return 'badge--orange'
  return 'badge--blue'
}