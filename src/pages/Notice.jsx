import { useState } from 'react'

const TABS = ['전체', '공지사항', '메시지', '알림']

export default function Notice() {
  const [activeTab, setActiveTab] = useState('전체')

  const items = activeTab === '전체'
    ? NOTICE_ITEMS
    : NOTICE_ITEMS.filter(i => i.type === activeTab)

  return (
    <div>
      {/* 탭 */}
      <div style={{
        display: 'flex',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '0 4px',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '14px 4px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--color-primary)' : 'transparent'}`,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div style={{ background: 'var(--color-surface)' }}>
        {items.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">📭</span>
            <p className="empty-state__title">새로운 소식이 없습니다</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="list-item">
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: TYPE_COLOR[item.type] + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {TYPE_ICON[item.type]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span className={`badge badge--${TYPE_BADGE[item.type]}`} style={{ fontSize: 10 }}>
                    {item.type}
                  </span>
                  {!item.read && (
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'var(--color-accent)',
                    }} />
                  )}
                </div>
                <p style={{
                  fontSize: 14, fontWeight: item.read ? 500 : 700,
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {item.title}
                </p>
                <p style={{
                  fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {item.from} · {item.time}
                </p>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))
        )}
      </div>

      {/* 메시지 작성 버튼 */}
      <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 50 }}>
        <button
          aria-label="메시지 작성"
          style={{
            width: 52, height: 52,
            borderRadius: '50%',
            background: 'var(--color-primary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(26,86,219,0.4)',
            color: 'white',
            fontSize: 22,
          }}
        >
          ✏️
        </button>
      </div>
    </div>
  )
}

const TYPE_ICON  = { '공지사항': '📢', '메시지': '💬', '알림': '🔔' }
const TYPE_COLOR = { '공지사항': '#FF6B35', '메시지': '#1A56DB', '알림': '#00C49A' }
const TYPE_BADGE = { '공지사항': 'orange', '메시지': 'blue', '알림': 'green' }

const NOTICE_ITEMS = [
  { id: 1, type: '공지사항', title: '5월 중간고사 대비 특강 일정 안내',       from: '수학학원',   time: '오늘 11:20', read: false },
  { id: 2, type: '메시지',  title: '선생님: 오늘 민준이 수업 태도가 매우 좋았어요!', from: '영어학원',   time: '오늘 10:05', read: false },
  { id: 3, type: '알림',   title: '홍민준이 수학학원에 도착했습니다',          from: '아이루트',   time: '오늘 09:55', read: true  },
  { id: 4, type: '공지사항', title: '이번 주 토요일 수업 일정 변경 안내',       from: '수학학원',   time: '어제 16:00', read: true  },
  { id: 5, type: '알림',   title: '이번 주 학습 리포트가 준비됐습니다',        from: '아이루트 AI', time: '어제 09:00', read: true  },
  { id: 6, type: '메시지',  title: '6월 수강료 납부 안내드립니다',             from: '미술학원',   time: '3일 전',     read: true  },
]
