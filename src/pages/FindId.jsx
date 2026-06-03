import { useState } from 'react'
import { Link } from 'react-router-dom'
import BackButton from '../components/common/BackButton'
import { authAPI } from '@/api'

export default function FindId() {
    const [form, setForm] = useState({
        phoneNumber: '',
    })

    const [errors, setErrors] = useState({})
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const update = (key, value) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }))

        setErrors((prev) => ({
            ...prev,
            [key]: '',
            submit: '',
        }))

        setResult(null)
    }

    const validate = () => {
        const nextErrors = {}
        const onlyNumbers = form.phoneNumber.replace(/\D/g, '')

        if (!onlyNumbers) {
            nextErrors.phoneNumber = '휴대폰 번호를 입력해 주세요'
        } else if (onlyNumbers.length < 10) {
            nextErrors.phoneNumber = '올바른 휴대폰 번호를 입력해 주세요'
        }

        return nextErrors
    }

    const handleSubmit = async () => {
        const nextErrors = validate()

        if (Object.keys(nextErrors).length > 0) {
            setErrors(nextErrors)
            return
        }

        setLoading(true)

        try {
            const phoneNumber = form.phoneNumber.replace(/\D/g, '')
            const data = await authAPI.findUsernameAndEmailByPhone(phoneNumber)

            setResult({
                username: data?.username || '',
                email: data?.email || '',
            })
        } catch (error) {
            setErrors({
                submit: error.message || '가입 정보를 찾을 수 없습니다.',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
            <div
                style={{
                    background: 'linear-gradient(135deg, #0A1628 0%, #1A56DB 100%)',
                    padding: '48px 24px 32px',
                    color: 'white',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                <BackButton
                    label="뒤로가기"
                    className="absolute left-5 top-4"
                    style={{ color: 'white' }}
                />

                <h1 style={{ fontSize: 24, fontWeight: 800 }}>아이디 찾기</h1>

                <p style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
                    가입 시 입력한 휴대폰 번호로 아이디를 확인합니다.
                </p>
            </div>

            <div
                style={{
                    padding: '28px 20px',
                    maxWidth: 480,
                    width: '100%',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                }}
            >
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div
                        style={{
                            background: 'var(--color-primary-light)',
                            borderRadius: 12,
                            padding: 14,
                        }}
                    >
                        <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700 }}>
                            가입 아이디 조회 안내
                        </p>

                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, lineHeight: 1.6 }}>
                            가입 시 등록한 휴대폰 번호를 입력하면 연결된 아이디를 확인할 수 있습니다.
                        </p>
                    </div>

                    <div className="input-group">
                        <label className="input-label">휴대폰 번호</label>

                        <input
                            className="input-field"
                            type="tel"
                            value={form.phoneNumber}
                            onChange={(event) => update('phoneNumber', formatPhone(event.target.value))}
                            placeholder="010-0000-0000"
                            style={{ borderColor: errors.phoneNumber ? 'var(--color-danger)' : '' }}
                        />

                        {errors.phoneNumber && (
                            <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>
                                {errors.phoneNumber}
                            </p>
                        )}
                    </div>

                    {errors.submit && (
                        <div
                            style={{
                                background: '#FFE9E9',
                                border: '1px solid #FFBCBC',
                                borderRadius: 10,
                                padding: '12px 14px',
                            }}
                        >
                            <p style={{ fontSize: 13, color: 'var(--color-danger)', fontWeight: 600 }}>
                                {errors.submit}
                            </p>
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="btn btn--primary btn--full"
                        style={{
                            padding: 15,
                            opacity: loading ? 0.65 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {loading ? '확인 중...' : '아이디 찾기'}
                    </button>
                </div>

                {result && (
                    <div
                        className="card"
                        style={{
                            borderColor: 'var(--color-primary)',
                            background: 'var(--color-primary-light)',
                        }}
                    >
                        <p
                            style={{
                                fontSize: 13,
                                color: 'var(--color-text-secondary)',
                                marginBottom: 16,
                            }}
                        >
                            입력하신 휴대폰 번호와 연결된 가입 정보입니다.
                        </p>

                        <div style={{ marginBottom: 16 }}>
                            <p
                                style={{
                                    fontSize: 12,
                                    color: 'var(--color-text-muted)',
                                    marginBottom: 4,
                                }}
                            >
                                아이디
                            </p>

                            <h2
                                style={{
                                    fontSize: 22,
                                    fontWeight: 800,
                                    color: 'var(--color-primary)',
                                }}
                            >
                                {result.username || '정보 없음'}
                            </h2>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <p
                                style={{
                                    fontSize: 12,
                                    color: 'var(--color-text-muted)',
                                    marginBottom: 4,
                                }}
                            >
                                이메일
                            </p>

                            <h3
                                style={{
                                    fontSize: 18,
                                    fontWeight: 600,
                                    color: 'var(--color-text)',
                                }}
                            >
                                {result.email || '정보 없음'}
                            </h3>
                        </div>

                        <Link
                            to="/login"
                            className="btn btn--primary btn--full"
                            style={{ marginTop: 8 }}
                        >
                            로그인하러 가기
                        </Link>

                        <Link
                            to="/find-password"
                            className="btn btn--secondary btn--full"
                            style={{ marginTop: 10 }}
                        >
                            비밀번호 찾기
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

function formatPhone(value = '') {
    const raw = String(value).replace(/\D/g, '').slice(0, 11)

    if (raw.length <= 3) return raw
    if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`
    return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`
}