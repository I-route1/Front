import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import GradeTab from './GradeTab'
import PatternTab from './PatternTab'
import SuggestTab from './SuggestTab'
import PredictTab from './PredictTab'
import CounselingTab from './CounselingTab'

const TABS = [
  { id: 'grade',      label: '📊 성적' },
  { id: 'pattern',    label: '🧠 학습 패턴' },
  { id: 'suggest',    label: '📚 맞춤 추천' },
  { id: 'predict',    label: '🎯 성장 예측' },
  { id: 'counseling', label: '🌱 AI 리포트' },
]
const VALID_TABS = TABS.map(t => t.id)

function NoChildrenScreen() {
  const navigate = useNavigate()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px', textAlign: 'center', minHeight: '60vh' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', marginBottom: 24, background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>👶</div>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 10 }}>등록된 자녀가 없어요</h2>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 32 }}>
        자녀를 등록하면 성적, 학습 패턴,<br />AI 맞춤 추천 등을 확인할 수 있어요
      </p>
      <button onClick={() => navigate('/profile')} style={{ padding: '13px 32px', borderRadius: 12, border: 'none', background: 'var(--color-primary)', color: 'white', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,86,219,0.25)' }}>
        자녀 등록하러 가기
      </button>
    </div>
  )
}

// 자녀 슬라이더 컴포넌트
function ChildSelector({ children, selectedIndex, onSelect }) {
  if (!children || children.length <= 1) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '10px 16px',
      background: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      {/* 이전 버튼 */}
      <button
        onClick={() => onSelect(selectedIndex - 1)}
        disabled={selectedIndex === 0}
        style={{
          width: 32, height: 32, borderRadius: '50%', border: 'none',
          background: selectedIndex === 0 ? 'var(--color-surface-2)' : 'var(--color-primary)',
          color: selectedIndex === 0 ? 'var(--color-text-muted)' : 'white',
          fontSize: 16, cursor: selectedIndex === 0 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.15s',
        }}
      >
        ‹
      </button>

      {/* 자녀 정보 */}
      <div style={{ textAlign: 'center', minWidth: 120 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 2 }}>
          {children[selectedIndex]?.name ?? '자녀'}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {children[selectedIndex]?.grade ?? ''}
        </p>
        {/* 인디케이터 점 */}
        {children.length > 1 && (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 6 }}>
            {children.map((_, i) => (
              <button
                key={i}
                onClick={() => onSelect(i)}
                style={{
                  width: i === selectedIndex ? 16 : 6,
                  height: 6, borderRadius: 3, border: 'none',
                  background: i === selectedIndex ? 'var(--color-primary)' : 'var(--color-border)',
                  cursor: 'pointer', padding: 0, transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 다음 버튼 */}
      <button
        onClick={() => onSelect(selectedIndex + 1)}
        disabled={selectedIndex === children.length - 1}
        style={{
          width: 32, height: 32, borderRadius: '50%', border: 'none',
          background: selectedIndex === children.length - 1 ? 'var(--color-surface-2)' : 'var(--color-primary)',
          color: selectedIndex === children.length - 1 ? 'var(--color-text-muted)' : 'white',
          fontSize: 16, cursor: selectedIndex === children.length - 1 ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all 0.15s',
        }}
      >
        ›
      </button>
    </div>
  )
}

export default function Learning() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const initialTab = VALID_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'grade'
  const [active, setActive] = useState(initialTab)
  const [selectedChildIndex, setSelectedChildIndex] = useState(0)

  const isParent = user?.role === 'PARENT' || user?.role === '학부모'
  const hasNoChildren = isParent && (!user?.children || user.children.length === 0)

  // 선택된 자녀 (학부모면 자녀 기준, 아니면 본인)
  const selectedChild = isParent
    ? (user?.children?.[selectedChildIndex] ?? null)
    : user
  const studentId = selectedChild?.id ?? user?.id

  if (hasNoChildren) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0, opacity: 0.4, pointerEvents: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} style={{ flex: 1, padding: '13px 4px', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--color-text-muted)', borderBottom: '2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}><NoChildrenScreen /></div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 탭 바 */}
      <div style={{ display: 'flex', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              flex: 1, padding: '13px 4px', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13,
              fontWeight: active === t.id ? 700 : 500,
              background: 'transparent',
              color: active === t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: active === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 자녀 슬라이더 (자녀 2명 이상일 때만 표시) */}
      {isParent && user?.children?.length > 1 && (
        <ChildSelector
          children={user.children}
          selectedIndex={selectedChildIndex}
          onSelect={setSelectedChildIndex}
        />
      )}

      {/* 탭 콘텐츠 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {active === 'grade'      && <GradeTab      studentId={studentId} selectedChild={selectedChild} />}
        {active === 'pattern'    && <PatternTab    studentId={studentId} selectedChild={selectedChild} />}
        {active === 'suggest'    && <SuggestTab    studentId={studentId} selectedChild={selectedChild} />}
        {active === 'predict'    && <PredictTab    studentId={studentId} selectedChild={selectedChild} />}
        {active === 'counseling' && <CounselingTab studentId={studentId} selectedChild={selectedChild} />}
      </div>
    </div>
  )
}