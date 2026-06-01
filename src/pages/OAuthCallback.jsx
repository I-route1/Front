import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { authAPI } from '@/api'
import { getDefaultRoute, useAuth, USER_ROLES } from '@/context/AuthContext'

export default function OAuthCallback() {
    const navigate = useNavigate()
    const { provider: routeProvider } = useParams()
    const [searchParams] = useSearchParams()
    const { loginWithSocialToken } = useAuth()
    const requestedRef = useRef(false)

    const [status, setStatus] = useState('processing')
    const [message, setMessage] = useState('소셜 로그인 정보를 확인하는 중입니다.')

    useEffect(() => {
        let ignore = false

        async function handleOAuthCallback() {
            if (requestedRef.current) return
            requestedRef.current = true

            try {
                const provider = routeProvider || searchParams.get('provider') || 'kakao'
                const code = searchParams.get('code')

                if (!code) {
                    throw new Error('소셜 로그인 인증 code가 없습니다.')
                }

                const data = await authAPI.getSocialToken(provider, code)

                if (!data?.accessToken) {
                    throw new Error('소셜 로그인 토큰 발급에 실패했습니다.')
                }

                const loginData = {
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken,
                    userId: data.userId,
                    role: data.role || USER_ROLES.PARENT,
                    nickname: data.nickname,
                    email: data.email,
                    isNewUser: data.isNewUser === true,
                }

                await loginWithSocialToken(loginData, provider)

                if (!ignore) {
                    setStatus('success')
                    setMessage('소셜 로그인이 완료되었습니다.')
                }

                navigate(getDefaultRoute(loginData.role), { replace: true })
            } catch (error) {
                console.error('OAuth callback error:', error)

                requestedRef.current = false

                if (!ignore) {
                    setStatus('error')
                    setMessage(error.message || '소셜 로그인 처리 중 오류가 발생했습니다.')
                }
            }
        }

        handleOAuthCallback()

        return () => {
            ignore = true
        }
    }, [routeProvider, searchParams, loginWithSocialToken, navigate])

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

                <h1
                    style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: 'var(--color-text-primary)',
                        marginBottom: 10,
                    }}
                >
                    {status === 'processing' && '소셜 로그인 처리 중'}
                    {status === 'success' && '로그인 완료'}
                    {status === 'error' && '로그인 실패'}
                </h1>

                <p
                    style={{
                        fontSize: 14,
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.6,
                        marginBottom: status === 'error' ? 18 : 0,
                    }}
                >
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