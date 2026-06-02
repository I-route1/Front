import BackButton from '../components/common/BackButton'

const TERMS_SECTIONS = [
  {
    title: '제1조 목적',
    content:
      '본 약관은 아이루트 서비스의 이용 조건과 절차, 이용자와 서비스 제공자 간의 권리, 의무 및 책임 사항을 정하는 것을 목적으로 합니다.',
  },
  {
    title: '제2조 서비스의 내용',
    content:
      '아이루트는 사용자 유형에 따라 학생 이동 정보, 출결 정보, 학습 관련 정보, 게시판 기능 등을 제공할 수 있습니다. 제공되는 기능은 서비스 운영 상황에 따라 변경될 수 있습니다.',
  },
  {
    title: '제3조 회원 정보 관리',
    content:
      '회원은 가입 및 서비스 이용 시 정확한 정보를 입력해야 하며, 입력한 정보가 변경된 경우 가능한 한 최신 상태로 유지해야 합니다.',
  },
  {
    title: '제4조 개인정보 보호',
    content:
      '아이루트는 서비스 제공에 필요한 범위 내에서 개인정보를 수집 및 이용하며, 관련 법령과 개인정보 처리방침에 따라 개인정보를 보호하기 위해 노력합니다.',
  },
  {
    title: '제5조 이용자의 의무',
    content:
      '이용자는 타인의 정보를 무단으로 사용하거나 서비스 운영을 방해하는 행위를 해서는 안 됩니다. 또한 게시판 등 서비스 내 기능을 사용할 때 타인에게 피해를 주는 내용을 작성해서는 안 됩니다.',
  },
  {
    title: '제6조 서비스 변경 및 중단',
    content:
      '서비스 제공자는 운영상 또는 기술상 필요한 경우 서비스의 전부 또는 일부를 변경하거나 일시적으로 중단할 수 있습니다.',
  },
]

export default function Terms() {
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
            이용약관
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
              아이루트 이용약관
            </p>

            <p
              style={{
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                marginTop: 8,
              }}
            >
              아래 내용은 서비스 이용을 위한 기본 약관 안내입니다.
              정식 운영 시 세부 조항은 서비스 정책에 따라 수정될 수 있습니다.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {TERMS_SECTIONS.map((section) => (
              <div
                key={section.title}
                style={{
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {section.title}
                </h2>

                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.7,
                    marginTop: 8,
                  }}
                >
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          <div
            style={{
              padding: 16,
              borderRadius: 14,
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                lineHeight: 1.6,
              }}
            >
              시행일: 2026년 6월 2일
              <br />
              본 약관은 프로젝트 진행 상황에 따라 추후 보완될 수 있습니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}