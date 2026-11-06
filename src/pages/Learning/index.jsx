import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import GradeTab from './GradeTab'
import PatternTab from './PatternTab'
import SuggestTab from './SuggestTab'
import PredictTab from './PredictTab'
import CounselingTab from './CounselingTab'
import AskTab from './AskTab'
import ConcentrationTab from './ConcentrationTab'
import { studentAPI } from '@/api/student'

const TABS = [
    { id: 'grade',      label: '📊 성적' },
    { id: 'pattern',    label: '🧠 학습 패턴' },
  { id: 'focus',      label: '🧘 집중도' },
    { id: 'suggest',    label: '📚 맞춤 추천' },
    { id: 'predict',    label: '🎯 성장 예측' },
    { id: 'counseling', label: '🌱 AI 리포트' },
    { id: 'ask',        label: '💬 AI 질문' },
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
            <button onClick={() => navigate('/profile/edit')} style={{ padding: '13px 32px', borderRadius: 12, border: 'none', background: 'var(--color-primary)', color: 'white', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 4px 16px rgba(26,86,219,0.25)' }}>
                자녀 등록하러 가기
            </button>
        </div>
    )
}

// 자녀 선택 슬라이더/칩 컴포넌트
function ChildSelector({ children, selectedIndex, onSelect }) {
    if (!children || children.length <= 1) return null

    const isFirst = selectedIndex === 0
    const isLast = selectedIndex === children.length - 1

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
                aria-label="이전 자녀"
                disabled={isFirst}
                style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                    background: isFirst ? 'var(--color-surface-2)' : 'var(--color-primary)',
                    color: isFirst ? 'var(--color-text-muted)' : 'white',
                    fontSize: 16, cursor: isFirst ? 'not-allowed' : 'pointer',
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
                aria-label="다음 자녀"
                disabled={isLast}
                style={{
                    width: 32, height: 32, borderRadius: '50%', border: 'none',
                    background: isLast ? 'var(--color-surface-2)' : 'var(--color-primary)',
                    color: isLast ? 'var(--color-text-muted)' : 'white',
                    fontSize: 16, cursor: isLast ? 'not-allowed' : 'pointer',
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
    const [searchParams, setSearchParams] = useSearchParams()
    const active = VALID_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'grade'
    const setActive = (id) => setSearchParams({ tab: id }, { replace: true })

    // 💡 백엔드에서 받아온 자녀 데이터 직접 관리
    const [childrenList, setChildrenList] = useState(user?.children ?? [])
    const [selectedChildIndex, setSelectedChildIndex] = useState(0)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        setSelectedChildIndex(index => Math.max(0, Math.min(index, childrenList.length - 1)))
    }, [childrenList.length])

    const isParent = user?.role === 'PARENT' || user?.role === '학부모'

    // 💡 백엔드 API를 통해 최신 자녀 목록 수신
    useEffect(() => {
        if (!isParent) {
            setIsLoading(false)
            return
        }

        studentAPI
            .getMyChildren()
            .then((res) => {
                const list = Array.isArray(res) ? res : res?.data ?? []
                setChildrenList(list)
            })
            .catch((err) => {
                console.error('자녀 정보 불러오기 실패:', err)
                setChildrenList(user?.children ?? [])
            })
            .finally(() => setIsLoading(false))
    }, [isParent, user?.children])

    useEffect(() => {
        document.querySelector(`[data-tab="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }, [active])

    // 선택된 자녀 정보
    const selectedChild = isParent
        ? (childrenList?.[selectedChildIndex] ?? null)
        : user
    const studentId = selectedChild?.studentId ?? selectedChild?.id

    const hasNoChildren = isParent && !isLoading && childrenList.length === 0

    if (hasNoChildren) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0, overflowX: 'auto', opacity: 0.4, pointerEvents: 'none' }}>
                    {TABS.map(t => (
                        <button key={t.id} style={{ flex: '1 0 auto', padding: '13px 10px', whiteSpace: 'nowrap', border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, background: 'transparent', color: 'var(--color-text-muted)', borderBottom: '2px solid transparent' }}>
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
            <div style={{ display: 'flex', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0, overflowX: 'auto' }}>
                {TABS.map(t => (
                    <button
                        key={t.id}
                        data-tab={t.id}
                        onClick={() => setActive(t.id)}
                        style={{
                            flex: '1 0 auto', padding: '13px 10px', whiteSpace: 'nowrap', border: 'none', cursor: 'pointer',
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

            {/* 자녀 슬라이더 (자녀 2명 이상일 때 표시) */}
            {isParent && childrenList.length > 1 && (
                <ChildSelector
                    children={childrenList}
                    selectedIndex={selectedChildIndex}
                    onSelect={setSelectedChildIndex}
                />
            )}

            {/* 탭 콘텐츠 */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {isLoading && isParent ? <p role="status" style={{ padding:24 }}>자녀 정보를 불러오는 중...</p> : <>
                {active === 'grade'      && <GradeTab key={studentId} studentId={studentId} selectedChild={selectedChild} />}
                {active === 'pattern'    && <PatternTab key={studentId} studentId={studentId} selectedChild={selectedChild} />}
                {active === 'focus'      && <ConcentrationTab key={studentId} studentId={studentId} />}
                {active === 'suggest'    && <SuggestTab    studentId={studentId} selectedChild={selectedChild} />}
                {active === 'predict'    && <PredictTab    studentId={studentId} selectedChild={selectedChild} />}
                {active === 'counseling' && <CounselingTab studentId={studentId} selectedChild={selectedChild} />}
                {active === 'ask'        && <AskTab        studentId={studentId} />}
                </>}
            </div>
        </div>
    )
}
