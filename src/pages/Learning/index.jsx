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
import LearningResults from '@/components/learning/LearningResults'
import { studentAPI } from '@/api/student'

// 위쪽 탭 3개(그룹)와 그 안의 세그먼트.
// URL의 ?tab= 값은 세그먼트 id를 그대로 써서 예전 주소(?tab=pattern 등)도 계속 동작한다.
const GROUPS = [
    { id: 'grades', label: '성적', segments: [
        { id: 'grade',   label: '성적' },
        { id: 'records', label: '오답 · 채점' },
    ] },
    { id: 'habit', label: '공부 습관', segments: [
        { id: 'focus',   label: '집중도' },
        { id: 'pattern', label: '학습 패턴' },
    ] },
    { id: 'coach', label: 'AI 코칭', segments: [
        { id: 'counseling', label: '리포트' },
        { id: 'suggest',    label: '추천' },
        { id: 'predict',    label: '성장 예측' },
        { id: 'ask',        label: '질문' },
    ] },
]
const SEGMENT_IDS = GROUPS.flatMap(g => g.segments.map(s => s.id))

// ?tab= 값을 세그먼트 id로 바꾼다. 그룹 id(?tab=habit)는 그 그룹의 첫 세그먼트로 연결한다.
function resolveSegment(tab) {
    if (SEGMENT_IDS.includes(tab)) return tab
    return GROUPS.find(g => g.id === tab)?.segments[0].id ?? 'grade'
}

function GroupTabs({ activeGroup, onSelect, disabled = false }) {
    return (
        <nav aria-label="학습 메뉴" style={{
            display: 'grid', gridTemplateColumns: `repeat(${GROUPS.length}, minmax(0, 1fr))`,
            background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
            opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto',
        }}>
            {GROUPS.map(g => {
                const on = g.id === activeGroup?.id
                return (
                    <button
                        key={g.id}
                        type="button"
                        aria-current={on ? 'page' : undefined}
                        onClick={() => onSelect(g)}
                        style={{
                            padding: '13px 0', border: 'none', background: 'transparent', cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: 15, fontWeight: on ? 700 : 500,
                            color: on ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            borderBottom: `2px solid ${on ? 'var(--color-primary)' : 'transparent'}`,
                            transition: 'color 0.15s, border-color 0.15s',
                        }}
                    >
                        {g.label}
                    </button>
                )
            })}
        </nav>
    )
}

function SegmentControl({ group, active, onSelect }) {
    return (
        <div role="tablist" aria-label={`${group.label} 보기`} style={{
            margin: '12px 16px 0', padding: 4, borderRadius: 12, background: 'var(--color-surface-2)',
            display: 'grid', gridTemplateColumns: `repeat(${group.segments.length}, minmax(0, 1fr))`, gap: 4,
        }}>
            {group.segments.map(s => {
                const on = s.id === active
                return (
                    <button
                        key={s.id}
                        type="button"
                        role="tab"
                        aria-selected={on}
                        onClick={() => onSelect(s.id)}
                        style={{
                            height: 36, border: 'none', borderRadius: 9, cursor: 'pointer', whiteSpace: 'nowrap',
                            fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 700 : 500,
                            background: on ? 'var(--color-surface)' : 'transparent',
                            color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                            boxShadow: on ? '0 1px 3px rgba(17,24,39,0.12)' : 'none',
                        }}
                    >
                        {s.label}
                    </button>
                )
            })}
        </div>
    )
}

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

// 자녀 선택: 이름 버튼을 한 줄로 보여준다 (많으면 가로 스크롤)
function ChildSelector({ children, selectedIndex, onSelect }) {
    if (!children || children.length <= 1) return null
    return (
        <div role="group" aria-label="자녀 선택" style={{
            display: 'flex', gap: 8, padding: '10px 16px 12px', overflowX: 'auto',
            background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        }}>
            {children.map((child, i) => {
                const on = i === selectedIndex
                const label = [child?.name ?? `자녀 ${i + 1}`, child?.grade].filter(Boolean).join(' · ')
                return (
                    <button
                        key={child?.studentId ?? child?.id ?? i}
                        type="button"
                        aria-pressed={on}
                        onClick={() => onSelect(i)}
                        style={{
                            flexShrink: 0, height: 36, padding: '0 14px', borderRadius: 18, cursor: 'pointer',
                            fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 700 : 500, whiteSpace: 'nowrap',
                            border: on ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                            background: on ? 'var(--color-primary)' : 'var(--color-surface)',
                            color: on ? 'white' : 'var(--color-text-secondary)',
                        }}
                    >
                        {label}
                    </button>
                )
            })}
        </div>
    )
}

export default function Learning() {
    const { user } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const active = resolveSegment(searchParams.get('tab'))
    const activeGroup = GROUPS.find(g => g.segments.some(s => s.id === active))
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

    // 선택된 자녀 정보
    const selectedChild = isParent
        ? (childrenList?.[selectedChildIndex] ?? null)
        : user
    const studentId = selectedChild?.studentId ?? selectedChild?.id

    const hasNoChildren = isParent && !isLoading && childrenList.length === 0

    if (hasNoChildren) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <GroupTabs activeGroup={activeGroup} onSelect={() => {}} disabled />
                <div style={{ flex: 1, overflowY: 'auto' }}><NoChildrenScreen /></div>
            </div>
        )
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 위쪽 탭 3개 */}
            <GroupTabs activeGroup={activeGroup} onSelect={g => setActive(g.segments[0].id)} />

            {/* 자녀 선택 (자녀 2명 이상일 때 표시) */}
            {isParent && childrenList.length > 1 && (
                <ChildSelector
                    children={childrenList}
                    selectedIndex={selectedChildIndex}
                    onSelect={setSelectedChildIndex}
                />
            )}

            {/* 탭 콘텐츠 */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <SegmentControl group={activeGroup} active={active} onSelect={setActive} />
                {isLoading && isParent ? <p role="status" style={{ padding:24 }}>자녀 정보를 불러오는 중...</p> : <div style={{ paddingTop: 12 }}>
                {active === 'grade'      && <GradeTab key={studentId} studentId={studentId} selectedChild={selectedChild} />}
                {active === 'records'    && <div style={{ margin: '0 16px 16px' }}><LearningResults key={studentId} studentId={studentId} /></div>}
                {active === 'pattern'    && <PatternTab key={studentId} studentId={studentId} selectedChild={selectedChild} />}
                {active === 'focus'      && <ConcentrationTab key={studentId} studentId={studentId} />}
                {active === 'suggest'    && <SuggestTab    studentId={studentId} selectedChild={selectedChild} />}
                {active === 'predict'    && <PredictTab    studentId={studentId} selectedChild={selectedChild} />}
                {active === 'counseling' && <CounselingTab studentId={studentId} selectedChild={selectedChild} />}
                {active === 'ask'        && <AskTab        studentId={studentId} />}
                </div>}
            </div>
        </div>
    )
}
