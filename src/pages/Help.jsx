import BackButton from '../components/common/BackButton'

const FAQ_ITEMS = [
  {
    question: '아이루트는 어떤 서비스인가요?',
    answer:
      '아이루트는 학생의 이동, 출결, 학습 정보를 한 곳에서 확인할 수 있도록 돕는 서비스입니다. 학부모, 학원, 기사 등 사용자 유형에 따라 필요한 기능을 제공합니다.',
  },
  {
    question: '자녀 정보는 어디에서 수정하나요?',
    answer:
      '마이페이지의 프로필 수정 화면에서 자녀 정보를 추가하거나 수정할 수 있습니다. 자녀 이름과 학년 정보를 입력할 수 있습니다.',
  },
  {
    question: '비밀번호는 어디에서 변경하나요?',
    answer:
      '마이페이지의 비밀번호 변경 메뉴에서 현재 비밀번호와 새 비밀번호를 입력해 변경할 수 있습니다.',
  },
  {
    question: '게시판은 어떻게 사용하나요?',
    answer:
      '게시판 화면에서 글을 확인하거나 새 글을 작성할 수 있습니다. 작성한 게시글은 상세 화면에서 수정 또는 삭제할 수 있습니다.',
  },
]

export default function Help() {
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
            도움말
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
              아이루트 이용 안내
            </p>

            <p
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                marginTop: 8,
              }}
            >
              서비스 이용 중 궁금한 점이 있다면 아래 내용을 먼저 확인해 주세요.
              자세한 문의 기능은 추후 제공될 예정입니다.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {FAQ_ITEMS.map((item) => (
              <div
                key={item.question}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  Q. {item.question}
                </p>

                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.6,
                    marginTop: 8,
                  }}
                >
                  {item.answer}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: '#FFF7E6',
              border: '1px solid #FFE0A3',
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#9A6100',
              }}
            >
              문의 안내
            </p>

            <p
              style={{
                fontSize: 12,
                color: '#7A4B00',
                lineHeight: 1.6,
                marginTop: 6,
              }}
            >
              현재 고객센터 및 1:1 문의 기능은 준비 중입니다.
              서비스 이용 중 문제가 발생하면 관리자에게 문의해 주세요.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}