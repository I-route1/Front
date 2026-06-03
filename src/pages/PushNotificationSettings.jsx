import { useState } from 'react'
import BackButton from '../components/common/BackButton'

const NOTIFICATION_OPTIONS = [
  {
    key: 'all',
    title: '전체 푸시 알림',
    description: '아이루트에서 제공하는 모든 푸시 알림을 받습니다.',
    icon: '🔔',
  },
  {
    key: 'arrival',
    title: '자녀 도착 알림',
    description: '자녀가 학원이나 목적지에 도착했을 때 알림을 받습니다.',
    icon: '📍',
  },
  {
    key: 'departure',
    title: '자녀 출발 알림',
    description: '자녀가 차량에 탑승하거나 이동을 시작했을 때 알림을 받습니다.',
    icon: '🚐',
  },
  {
    key: 'notice',
    title: '공지사항 알림',
    description: '학원 공지사항이나 서비스 안내가 등록되면 알림을 받습니다.',
    icon: '📢',
  },
  {
    key: 'learningReport',
    title: '학습 리포트 알림',
    description: '주간 학습 리포트나 학습 분석 결과가 준비되면 알림을 받습니다.',
    icon: '📊',
  },
  {
    key: 'boardComment',
    title: '게시판 댓글 알림',
    description: '내가 작성한 게시글에 댓글이 달리면 알림을 받습니다.',
    icon: '💬',
  },
]

export default function PushNotificationSettings() {
  const [settings, setSettings] = useState({
    all: true,
    arrival: true,
    departure: true,
    notice: true,
    learningReport: true,
    boardComment: true,
  })

  const handleToggle = (key) => {
  if (key === 'all') {
    setSettings((prev) => {
      const nextValue = !prev.all

      return {
        all: nextValue,
        arrival: nextValue,
        departure: nextValue,
        notice: nextValue,
        learningReport: nextValue,
        boardComment: nextValue,
      }
    })

    return
  }

  setSettings((prev) => {
    const nextSettings = {
      ...prev,
      [key]: !prev[key],
    }

    const hasAnyDetailEnabled =
      nextSettings.arrival ||
      nextSettings.departure ||
      nextSettings.notice ||
      nextSettings.learningReport ||
      nextSettings.boardComment

    return {
      ...nextSettings,
      all: hasAnyDetailEnabled,
    }
  })
}

  const handleSave = () => {
    alert('푸시 알림 설정 저장 기능은 추후 제공 예정입니다.')
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
        <BackButton
          label="뒤로가기"
          style={{ color: 'var(--color-primary)' }}
        />
      </section>

      <section className="section">
        <div className="section__header">
          <h1 className="section__title" style={{ fontSize: 22 }}>
            푸시 알림 설정
          </h1>
        </div>

        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div
            style={{
              background: 'var(--color-primary-light)',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: 'var(--color-primary)',
              }}
            >
              알림 수신 설정
            </p>

            <p
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                marginTop: 8,
              }}
            >
              필요한 알림만 선택해서 받을 수 있습니다.
              현재는 화면 설정만 제공되며, 실제 푸시 알림 저장 기능은 추후 연결될 예정입니다.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {NOTIFICATION_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => handleToggle(option.key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 14,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'var(--color-primary-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}
                >
                  {option.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {option.title}
                  </p>

                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.5,
                      marginTop: 4,
                    }}
                  >
                    {option.description}
                  </p>
                </div>

                <div
                  style={{
                    width: 46,
                    height: 26,
                    borderRadius: 999,
                    background: settings[option.key]
                      ? 'var(--color-primary)'
                      : 'var(--color-border)',
                    padding: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: settings[option.key] ? 'flex-end' : 'flex-start',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: 'white',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="btn btn--primary btn--full"
            style={{ padding: 15 }}
          >
            설정 저장
          </button>
        </div>
      </section>
    </div>
  )
}