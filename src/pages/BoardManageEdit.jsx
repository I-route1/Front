import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { boardAPI } from '../api'
import { apiCall } from '@/api/client'
import BackButton from '../components/common/BackButton'

export default function BoardManageEdit() {
    const { boardId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const isAdmin = ['ADMIN', 'ROLE_ADMIN'].includes(user?.role)
    const userId = user?.id ?? user?.userId

    const [form, setForm] = useState({
        name: '',
        description: '',
    })
    const [boardLoaded, setBoardLoaded] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isManager, setIsManager] = useState(false)
    const [inviteCode, setInviteCode] = useState('')
    const [inviteFeedback, setInviteFeedback] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        let ignore = false

        async function fetchBoard() {
            try {
                setIsLoading(true)
                setBoardLoaded(false)
                setErrorMsg('')
                setIsManager(false)
                setInviteCode('')
                setInviteFeedback('')
                const data = await boardAPI.getBoardDetail(boardId)
                if (!ignore) {
                    const ownsBoard = data.boardType === 'ACADEMY' && userId != null &&
                        String(data.managerUserId) === String(userId)
                    setIsManager(ownsBoard)
                    setBoardLoaded(true)
                    setForm({
                        name: data.name ?? '',
                        description: data.description ?? '',
                    })
                }
            } catch (error) {
                if (!ignore) setErrorMsg(error.message || '게시판 정보를 불러오지 못했습니다.')
            } finally {
                if (!ignore) setIsLoading(false)
            }
        }

        fetchBoard()
        return () => {
            ignore = true
        }
    }, [boardId, userId])

    useEffect(() => {
        if (!isManager) return

        const controller = new AbortController()
        apiCall('/api/academies/me/invite-code', { method: 'POST', signal: controller.signal })
            .then(data => {
                if (!controller.signal.aborted) setInviteCode(data.inviteCode)
            })
            .catch(() => {
                if (!controller.signal.aborted) setInviteFeedback('초대코드를 불러오지 못했습니다.')
            })
        return () => controller.abort()
    }, [isManager, boardId, userId])

    async function copyInviteCode() {
        try {
            await navigator.clipboard.writeText(inviteCode)
            setInviteFeedback('초대코드를 복사했습니다.')
        } catch {
            setInviteFeedback('코드를 선택해 직접 복사해 주세요.')
        }
    }

    const handleSubmit = async () => {
        if (!isAdmin || !boardLoaded || saving) return
        if (!form.name.trim()) {
            setErrorMsg('게시판 이름을 입력해 주세요.')
            return
        }

        setSaving(true)
        setErrorMsg('')

        try {
            await boardAPI.updateBoard(
                boardId,
                {
                    name: form.name.trim(),
                    description: form.description.trim(),
                },
                userId,
            )
            alert('게시판 정보가 수정되었습니다.')
            navigate(`/board/${boardId}`, { replace: true })
        } catch (error) {
            setErrorMsg(error.message || '게시판 수정 권한이 없거나 요청에 실패했습니다.')
        } finally {
            setSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="empty-state">
                <span className="empty-state__icon">⏳</span>
                <p className="empty-state__title">게시판 정보를 불러오는 중입니다</p>
            </div>
        )
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
                <BackButton label="뒤로가기" style={{ color: 'var(--color-primary)' }} />
            </section>

            <section className="section">
                <div className="section__header">
                    <h1 className="section__title" style={{ fontSize: 22 }}>
                        학원 게시판 관리
                    </h1>
                </div>

                {isManager && (
                    <div className="card" style={{ marginBottom: 16, display: 'grid', gap: 8 }}>
                        <h2 style={{ fontSize: 16 }}>학원 초대코드</h2>
                        {inviteCode ? (
                            <>
                                <input
                                    className="input-field"
                                    aria-label="학원 코드"
                                    value={inviteCode}
                                    readOnly
                                    onFocus={event => event.currentTarget.select()}
                                    style={{ minWidth: 0, fontWeight: 600 }}
                                />
                                <button type="button" className="btn btn--secondary" onClick={copyInviteCode}
                                    style={{ justifySelf: 'end' }}>
                                    코드 복사
                                </button>
                            </>
                        ) : !inviteFeedback && <p role="status">초대코드를 불러오는 중입니다.</p>}
                        {inviteFeedback && <p role="status">{inviteFeedback}</p>}
                    </div>
                )}
                {!(isAdmin && boardLoaded) && errorMsg && <p role="alert">{errorMsg}</p>}
                {isAdmin && boardLoaded && <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div className="input-group">
                        <label className="input-label">게시판 이름</label>
                        <input
                            className="input-field"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="예: 아이루트 학원 게시판"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">게시판 한 줄 소개</label>
                        <input
                            className="input-field"
                            value={form.description}
                            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder="학부모 및 학생 안내 문구를 입력해 주세요"
                        />
                    </div>

                    {errorMsg && (
                        <div
                            style={{
                                padding: '12px 14px',
                                borderRadius: 12,
                                background: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: 13,
                                fontWeight: 700,
                            }}
                        >
                            {errorMsg}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="btn btn--primary btn--full"
                        style={{ padding: '15px', opacity: saving ? 0.65 : 1 }}
                    >
                        {saving ? '저장 중...' : '변경사항 저장'}
                    </button>
                </div>}
            </section>
        </div>
    )
}