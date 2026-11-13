import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { boardAPI } from '../api'
import BackButton from '../components/common/BackButton'

export default function BoardManageEdit() {
    const { boardId } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const userId = user?.id ?? user?.userId

    const [form, setForm] = useState({
        name: '',
        description: '',
        academyAddress: '',
    })
    const [isLoading, setIsLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        let ignore = false

        async function fetchBoard() {
            try {
                setIsLoading(true)
                const data = await boardAPI.getBoardDetail(boardId)
                if (!ignore) {
                    setForm({
                        name: data.name ?? '',
                        description: data.description ?? '',
                        academyAddress: data.academyAddress ?? '',
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
    }, [boardId])

    const handleSubmit = async () => {
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
                    academyAddress: form.academyAddress.trim(),
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

                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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

                    <div className="input-group">
                        <label className="input-label">학원 주소</label>
                        <input
                            className="input-field"
                            value={form.academyAddress}
                            onChange={(e) => setForm((prev) => ({ ...prev, academyAddress: e.target.value }))}
                            placeholder="예: 서울특별시 강남구 테헤란로 123"
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
                </div>
            </section>
        </div>
    )
}