import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiCall } from '@/api/client'
import { DEFAULT_PROFILE_IMAGE, resolveProfileImageUrl } from '@/utils/profileImage'

export function AuthorName({ author, onSelect }) {
    if (author.userId == null) return <span>{author.author}</span>

    return (
        <button
            type="button"
            aria-haspopup="dialog"
            aria-label={author.author + ' 프로필 보기'}
            onClick={() => onSelect(author)}
            style={{ color: 'var(--color-primary)', fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}
        >
            {author.author}
        </button>
    )
}

export function AuthorProfileDialog({ author, currentUserId, onClose }) {
    const dialog = useRef(null)
    const [profile, setProfile] = useState(null)
    const [loadError, setLoadError] = useState(false)
    const isMine = String(author.userId) === String(currentUserId)

    useEffect(() => {
        const element = dialog.current
        element.showModal()
        return () => element.close()
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        apiCall('/api/users/' + encodeURIComponent(author.userId) + '/profile-card', {
            signal: controller.signal,
        }).then(result => {
            if (!controller.signal.aborted) setProfile(result)
        }).catch(() => {
            if (!controller.signal.aborted) setLoadError(true)
        })
        return () => controller.abort()
    }, [author.userId])

    return (
        <dialog
            ref={dialog}
            aria-labelledby="board-author-profile-name"
            onCancel={event => {
                event.preventDefault()
                onClose()
            }}
            onClick={event => {
                if (event.target === event.currentTarget) onClose()
            }}
            style={{
                width: 'min(320px, calc(100% - 32px))', margin: 'auto', padding: 0,
                border: '1px solid var(--color-border)', borderRadius: 20,
                background: 'var(--color-surface)', color: 'var(--color-text-primary)',
            }}
        >
            <div style={{ display: 'grid', justifyItems: 'center', gap: 12, padding: 20, textAlign: 'center' }}>
                <img
                    src={resolveProfileImageUrl(profile?.profileImageUrl)}
                    alt=""
                    onError={event => {
                        if (event.currentTarget.src !== DEFAULT_PROFILE_IMAGE) {
                            event.currentTarget.src = DEFAULT_PROFILE_IMAGE
                        }
                    }}
                    style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
                />
                <h2 id="board-author-profile-name" style={{ overflowWrap: 'anywhere', maxWidth: '100%' }}>
                    {profile?.nickname ?? author.author}
                </h2>
                {profile?.email && <p style={{ overflowWrap: 'anywhere', maxWidth: '100%' }}>{profile.email}</p>}
                {loadError && <p role="alert">프로필을 불러오지 못했습니다.</p>}
                {!profile && !loadError && <p role="status">프로필을 불러오는 중입니다.</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                    <button type="button" className="btn btn--secondary" onClick={onClose}>닫기</button>
                    {profile && !isMine && (
                        <Link className="btn btn--primary" to={'/messages/' + author.userId}>메시지 보내기</Link>
                    )}
                </div>
            </div>
        </dialog>
    )
}
