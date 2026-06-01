import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authAPI } from '@/api'

const VERIFY_STATUS = {
    LOADING: 'loading',
    SUCCESS: 'success',
    ERROR: 'error',
}

export default function EmailVerify() {
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    const [status, setStatus] = useState(VERIFY_STATUS.LOADING)
    const [message, setMessage] = useState('이메일 인증을 확인하고 있습니다.')

    useEffect(() => {
        const verifyEmailToken = async () => {
            if (!token) {
                setStatus(VERIFY_STATUS.ERROR)
                setMessage('이메일 인증 토큰이 없습니다. 링크를 다시 확인해 주세요.')
                return
            }

            try {
                const res = await authAPI.verifyEmail(token)

                console.log('이메일 인증 응답:', res)

                const success =
                    res?.data?.success ??
                    res?.success ??
                    true

                if (!success) {
                    throw new Error(res?.data?.message || res?.message || '인증 실패')
                }

                setStatus(VERIFY_STATUS.SUCCESS)
                setMessage(
                    '이메일 인증이 완료되었습니다. 기존 회원가입 화면으로 돌아가 “인증 완료 확인” 버튼을 눌러주세요.'
                )
            } catch (error) {
                setStatus(VERIFY_STATUS.ERROR)
                setMessage(
                    error?.message || '이메일 인증에 실패했습니다. 다시 시도해 주세요.'
                )
            }
        }

        verifyEmailToken()
    }, [token])

    const isLoading = status === VERIFY_STATUS.LOADING
    const isSuccess = status === VERIFY_STATUS.SUCCESS
    const isError = status === VERIFY_STATUS.ERROR

    const handleClose = () => {
        window.close()

        // 브라우저가 window.close()를 막는 경우 대비
        setTimeout(() => {
            setMessage(
                '창이 자동으로 닫히지 않으면 이 탭을 직접 닫고 기존 회원가입 화면으로 돌아가 주세요.'
            )
        }, 300)
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--color-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
            }}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: 420,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 20,
                    padding: '36px 28px',
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: 56, marginBottom: 18 }}>
                    {isLoading && '⏳'}
                    {isSuccess && '✅'}
                    {isError && '⚠️'}
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 800 }}>
                    {isLoading && '이메일 인증 확인 중'}
                    {isSuccess && '이메일 인증 완료'}
                    {isError && '이메일 인증 실패'}
                </h1>

                <p
                    style={{
                        fontSize: 14,
                        color: 'var(--color-text-secondary)',
                        marginBottom: 24,
                        lineHeight: 1.6,
                    }}
                >
                    {message}
                </p>

                {isSuccess && (
                    <button
                        onClick={handleClose}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: 14,
                            background: 'var(--color-primary)',
                            color: 'white',
                            fontSize: 15,
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        창 닫고 회원가입 화면으로 돌아가기
                    </button>
                )}

                {isError && (
                    <Link
                        to="/register"
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '14px',
                            borderRadius: 14,
                            background: 'var(--color-primary)',
                            color: 'white',
                            fontSize: 15,
                            fontWeight: 700,
                            textDecoration: 'none',
                            boxSizing: 'border-box',
                        }}
                    >
                        회원가입으로 돌아가기
                    </Link>
                )}
            </div>
        </div>
    )
}