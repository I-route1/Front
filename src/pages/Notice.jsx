import { useState } from 'react'

const TABS = ['전체', '공지사항', '알림']

export default function Notice() {
  const [activeTab, setActiveTab] = useState('전체')
  const [selectedItem, setSelectedItem] = useState(null)

  const items =
    activeTab === '전체'
      ? NOTICE_ITEMS
      : NOTICE_ITEMS.filter((item) => item.type === activeTab)

  const handleTabClick = (tab) => {
    setActiveTab(tab)
    setSelectedItem(null)
  }

  if (selectedItem) {
    return (
      <div
        style={{
          minHeight: 'calc(100vh - 120px)',
          background: 'var(--color-bg)',
        }}
      >
        <section
          style={{
            padding: '16px 20px',
            background: 'var(--color-surface)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--color-primary)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ← 목록으로
          </button>
        </section>

        <section className="section">
          <div
            className="card"
            style={{
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: TYPE_COLOR[selectedItem.type] + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {TYPE_ICON[selectedItem.type]}
              </div>

              <div>
                <span
                  className={`badge badge--${TYPE_BADGE[selectedItem.type]}`}
                  style={{ fontSize: 10 }}
                >
                  {selectedItem.type}
                </span>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    marginTop: 5,
                  }}
                >
                  {selectedItem.from} · {selectedItem.time}
                </p>
              </div>
            </div>

            <div>
              <h2
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: 'var(--color-text-primary)',
                  lineHeight: 1.4,
                }}
              >
                {selectedItem.title}
              </h2>

              <p
                style={{
                  fontSize: 14,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.7,
                  marginTop: 14,
                  whiteSpace: 'pre-line',
                }}
              >
                {selectedItem.content}
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 120px)',
        background: 'var(--color-bg)',
      }}
    >
      {/* 탭 */}
      <div
        style={{
          display: 'flex',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 4px',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabClick(tab)}
            style={{
              flex: 1,
              padding: '14px 4px',
              border: 'none',
              background: 'transparent',
              fontSize: 13,
              fontWeight: activeTab === tab ? 700 : 500,
              color:
                activeTab === tab
                  ? 'var(--color-primary)'
                  : 'var(--color-text-muted)',
              borderBottom: `2px solid ${
                activeTab === tab ? 'var(--color-primary)' : 'transparent'
              }`,
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
      <div
        style={{
          minHeight: 'calc(100vh - 220px)',
          background: 'var(--color-surface)',
        }}
      >
        {items.length === 0 ? (
          <div
            className="empty-state"
            style={{
              minHeight: 240,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="empty-state__icon">📭</span>
            <p className="empty-state__title">새로운 소식이 없습니다</p>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="list-item"
              onClick={() => setSelectedItem(item)}
              style={{
                width: '100%',
                background: 'var(--color-surface)',
                border: 'none',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: TYPE_COLOR[item.type] + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {TYPE_ICON[item.type]}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 3,
                  }}
                >
                  <span
                    className={`badge badge--${TYPE_BADGE[item.type]}`}
                    style={{ fontSize: 10 }}
                  >
                    {item.type}
                  </span>

                  {!item.read && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--color-accent)',
                      }}
                    />
                  )}
                </div>

                <p
                  style={{
                    fontSize: 14,
                    fontWeight: item.read ? 500 : 700,
                    color: 'var(--color-text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.title}
                </p>

                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    marginTop: 2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.from} · {item.time}
                </p>
              </div>

              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-muted)"
                strokeWidth="2"
                style={{ flexShrink: 0 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

const TYPE_ICON = {
  공지사항: '📢',
  알림: '🔔',
}

const TYPE_COLOR = {
  공지사항: '#FF6B35',
  알림: '#00C49A',
}

const TYPE_BADGE = {
  공지사항: 'orange',
  알림: 'green',
}

const NOTICE_ITEMS = []