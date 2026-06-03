// 학부모 계정에서 자녀 미등록 시 공통으로 사용하는 빈 화면 컴포넌트
import { useNavigate } from 'react-router-dom'

export default function NoChildScreen({ message = '자녀를 등록하면 이 기능을 사용할 수 있어요' }) {
  const navigate = useNavigate()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '60px 32px', textAlign: 'center',
      minHeight: '60vh',
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: '50%', marginBottom: 24,
        background: 'var(--color-primary-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 40,
      }}>
        👶
      </div>
      <h2 style={{
        fontSize: 18, fontWeight: 800,
        color: 'var(--color-text-primary)', marginBottom: 10,
      }}>
        등록된 자녀가 없어요
      </h2>
      <p style={{
        fontSize: 14, color: 'var(--color-text-muted)',
        lineHeight: 1.6, marginBottom: 32,
      }}>
        {message}
      </p>
      <button
        onClick={() => navigate('/profile')}
        style={{
          padding: '13px 32px', borderRadius: 12, border: 'none',
          background: 'var(--color-primary)', color: 'white',
          fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(26,86,219,0.25)',
        }}
      >
        자녀 등록하러 가기
      </button>
    </div>
  )
}