import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { authAPI } from '@/api/auth'
import BackButton from '../components/common/BackButton'

export default function DeleteAccount() {
  const navigate = useNavigate()
  const { user, deleteAccount } = useAuth()

  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (confirmText !== '탈퇴합니다') {
      setError('탈퇴합니다를 정확히 입력해주세요.')
      return
    }

    setLoading(true)

    try {
      await deleteAccount()

      alert('회원 탈퇴가 완료되었습니다.')
      navigate('/login')
    } catch (err) {
      setError(err.message || '회원 탈퇴에 실패했습니다.')
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
  <BackButton
    label="뒤로가기"
    style={{ color: 'var(--color-primary)' }}
  />
</section>

      <section className="section">
        <div className="section__header">
          <h1 className="section__title" style={{ fontSize: 22, color: 'var(--color-danger)' }}>
            계정 탈퇴
          </h1>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              background: '#FFE9E9',
              border: '1px solid #FFBCBC',
              borderRadius: 14,
              padding: 16,
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-danger)' }}>
              탈퇴 전 꼭 확인해 주세요.
            </p>
            <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
              <li>탈퇴 후 현재 계정으로 로그인할 수 없습니다.</li>
              <li>저장된 사용자 정보는 소프트 삭제 상태로 전환됩니다.</li>
              <li>서비스 이용 기록은 정책에 따라 일정 기간 보관될 수 있습니다.</li>
            </ul>
          </div>

          <div style={{ background: 'var(--color-surface-2)', borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              탈퇴 계정
            </p>
            <p style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
              {user?.name ?? '사용자'} ({user?.username ?? 'unknown'})
            </p>
          </div>

          <div className="input-group">
            <label className="input-label">
              탈퇴를 진행하려면 아래에 <strong>탈퇴합니다</strong>를 입력해 주세요.
            </label>
            <input
              className="input-field"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value)
                setError('')
              }}
              placeholder="탈퇴합니다"
              style={{ borderColor: error ? 'var(--color-danger)' : '' }}
            />
            {error && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{error}</p>}
          </div>

          <button
            onClick={handleDelete}
            disabled={loading}
            className="btn btn--danger btn--full"
            style={{ padding: 15, opacity: loading ? 0.65 : 1 }}
          >
            {loading ? '탈퇴 처리 중...' : '계정 탈퇴'}
          </button>
        </div>
      </section>
    </div>
  )
}