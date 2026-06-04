import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../api/auth'
import { getDefaultRoute, useAuth } from '../context/AuthContext'

function OAuthCallback() {
    const navigate = useNavigate()
    const { loginWithSocialToken } = useAuth()
    const hasRun = useRef(false)

    const [status, setStatus] = useState('processing')
    const [message, setMessage] = useState('카카오 로그인 정보를 확인하고 있습니다.')

    useEffect(() => {
        if (hasRun.current) return
        hasRun.current = true

        const handleOAuth = async () => {
            try {
                const code = new URLSearchParams(window.location.search).get('code')

                if (!code) {
                    throw new Error('카카오 인증 code가 없습니다.')
                }

                const result = await authAPI.getSocialToken('kakao', code)
                const loginData = result.data ?? result

                await loginWithSocialToken(loginData, 'kakao')

                setStatus('success')
                setMessage('로그인이 완료되었습니다.')

                setTimeout(() => {
                    navigate(getDefaultRoute(loginData.role), { replace: true })
                }, 700)
            } catch (error) {
                console.error('OAuth callback error:', error)
                setStatus('error')
                setMessage('카카오 로그인에 실패했습니다.')
            }
        }

        handleOAuth()
    }, [navigate, loginWithSocialToken])

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
                className="card"
                style={{
                    width: '100%',
                    maxWidth: 420,
                    padding: 28,
                    textAlign: 'center',
                }}
            >
                <div style={{ fontSize: 42, marginBottom: 16 }}>
                    {status === 'processing' && '⏳'}
                    {status === 'success' && '✅'}
                    {status === 'error' && '⚠️'}
                </div>

                <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
                    {status === 'processing' && '소셜 로그인 처리 중'}
                    {status === 'success' && '로그인 완료'}
                    {status === 'error' && '로그인 실패'}
                </h1>

                <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                    {message}
                </p>

                {status === 'error' && (
                    <Link className="btn btn--primary btn--full" to="/login">
                        로그인 화면으로 돌아가기
                    </Link>
                )}
            </div>
        </div>
    )
}

export default OAuthCallback