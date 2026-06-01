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
  const [status, setStatus] = useState(VERIFY_STATUS.LOADING)
  const [message, setMessage] = useState('이메일 인증을 확인하고 있습니다.')

  useEffect(() => {
    const verifyEmailToken = async () => {
      const token = searchParams.get('token')

      if (!token) {
        setStatus(VERIFY_STATUS.ERROR)
        setMessage('이메일 인증 토큰이 없습니다. 인증 메일의 링크를 다시 확인해 주세요.')
        return
      }

      try {
        await authAPI.verifyEmail(token)

        setStatus(VERIFY_STATUS.SUCCESS)
        setMessage('이메일 인증이 완료되었습니다. 이제 로그인할 수 있습니다.')
      } catch (error) {
        setStatus(VERIFY_STATUS.ERROR)
        setMessage(error.message || '이메일 인증에 실패했습니다. 인증 링크를 다시 확인해 주세요.')
      }
    }

    verifyEmailToken()
  }, [searchParams])

  const isLoading = status === VERIFY_STATUS.LOADING
  const isSuccess = status === VERIFY_STATUS.SUCCESS
  const isError = status === VERIFY_STATUS.ERROR

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
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        }}
      >
        <div
          style={{
            fontSize: 56,
            marginBottom: 18,
          }}
        >
          {isLoading && '⏳'}
          {isSuccess && '✅'}
          {isError && '⚠️'}
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--color-text-primary)',
            marginBottom: 12,
          }}
        >
          {isLoading && '이메일 인증 확인 중'}
          {isSuccess && '이메일 인증 완료'}
          {isError && '이메일 인증 실패'}
        </h1>

        <p
          style={{
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {message}
        </p>

        {isSuccess && (
          <Link
            to="/login"
            style={{
              display: 'block',
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            로그인하러 가기
          </Link>
        )}

        {isError && (
          <Link
            to="/register"
            style={{
              display: 'block',
              width: '100%',
              padding: '14px 16px',
              borderRadius: 14,
              background: 'var(--color-primary)',
              color: 'white',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            회원가입으로 돌아가기
          </Link>
        )}
      </div>
    </div>
  )
}