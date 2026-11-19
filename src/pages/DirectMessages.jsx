import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiCall } from '@/api/client'
import { useAuth } from '@/context/AuthContext'
import { DEFAULT_PROFILE_IMAGE, resolveProfileImageUrl } from '@/utils/profileImage'
import './DirectMessages.css'

const API = '/api/direct-messages'
const REFRESH_INTERVAL = 3000

function formatTime(value) {
  return new Date(value).toLocaleString('ko-KR', {
    month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

const messageDate = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full' })
const messageTime = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' })

function mergeMessages(existing, incoming) {
  return [...new Map([...existing, ...incoming].map(message => [message.id, message])).values()]
    .sort((a, b) => a.id - b.id)
}

function PeerAvatar({ imageUrl }) {
  return (
    <img
      className="dm-peer__avatar"
      src={resolveProfileImageUrl(imageUrl)}
      alt=""
      onError={event => {
        const image = event.currentTarget
        if (image.getAttribute('src') !== DEFAULT_PROFILE_IMAGE) image.src = DEFAULT_PROFILE_IMAGE
      }}
    />
  )
}

function Inbox() {
  const [keyword, setKeyword] = useState('')
  const [conversations, setConversations] = useState(null)
  const [listError, setListError] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const query = keyword.trim()
  const result = searchResult?.query === query ? searchResult : null

  useEffect(() => {
    const controller = new AbortController()
    let timer
    async function refresh() {
      try {
        const rows = await apiCall(API, { signal: controller.signal })
        if (controller.signal.aborted) return
        setConversations(rows)
        setListError('')
      } catch {
        if (!controller.signal.aborted) setListError('대화 목록을 불러오지 못했습니다.')
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, REFRESH_INTERVAL)
      }
    }
    void refresh()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!query) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const contacts = await apiCall(API + '/users?nickname=' + encodeURIComponent(query), {
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setSearchResult({ query, contacts })
      } catch {
        if (!controller.signal.aborted) setSearchResult({ query, failed: true })
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return (
    <section className="dm-page" aria-label="대화 목록">
      <input type="search" className="input-field" aria-label="상대의 닉네임" placeholder="상대의 닉네임"
        maxLength={100} value={keyword} onChange={event => {
          if (event.target.value.trim() !== query) setSearchResult(null)
          setKeyword(event.target.value)
        }} />
      {query && (
        <div className="dm-search-results" aria-label="닉네임 검색 결과">
          {!result && <p className="dm-muted" role="status">사용자를 찾는 중입니다.</p>}
          {result?.failed && <p className="dm-error" role="alert">검색 결과를 불러오지 못했습니다.</p>}
          {result?.contacts?.length === 0 && <p className="dm-muted" role="status">일치하는 닉네임이 없습니다.</p>}
          {result?.contacts?.map(contact => (
            <Link className="dm-conversation" key={contact.id} to={'/messages/' + contact.id}>
              <div className="dm-peer">
                <PeerAvatar imageUrl={contact.profileImageUrl} />
                <strong>{contact.nickname}</strong>
              </div>
              <span className="dm-muted">메시지 보내기 ›</span>
            </Link>
          ))}
        </div>
      )}
      {listError && <p role="alert" className="dm-error">{listError}</p>}
      {conversations === null && !listError && <p role="status">대화를 불러오는 중입니다.</p>}
      {conversations?.length === 0 && <p className="dm-muted">아직 대화가 없습니다.</p>}
      {conversations?.map(({ peer, latest, unreadCount }) => (
        <Link className="dm-conversation" to={'/messages/' + peer.id} key={peer.id}>
          <div className="dm-peer">
            <PeerAvatar imageUrl={peer.profileImageUrl} />
            <div className="dm-preview">
              <strong>{peer.nickname}</strong>
              <p>{latest.content}</p>
            </div>
          </div>
          <div className="dm-summary">
            <time dateTime={latest.createdAt}>{formatTime(latest.createdAt)}</time>
            {unreadCount > 0 && <span aria-label={'읽지 않은 메시지 ' + unreadCount + '개'}>{unreadCount}</span>}
          </div>
        </Link>
      ))}
    </section>
  )
}

function Conversation({ peerId, userId }) {
  const path = API + '/' + encodeURIComponent(peerId)
  const [peer, setPeer] = useState(null)
  const [messages, setMessages] = useState([])
  const [before, setBefore] = useState(null)
  const [draft, setDraft] = useState('')
  const [listError, setListError] = useState('')
  const [actionError, setActionError] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const lastRead = useRef(0)
  const initialPage = useRef(true)
  const history = useRef(null)
  const composer = useRef(null)
  const scrollToLatest = useRef(true)
  const latestId = messages.at(-1)?.id

  useEffect(() => {
    const controller = new AbortController()
    let timer
    async function refresh() {
      try {
        const result = await apiCall(path, { signal: controller.signal })
        if (controller.signal.aborted) return
        setPeer(result.peer)
        setMessages(existing => mergeMessages(existing, result.messages))
        if (initialPage.current) {
          initialPage.current = false
          setBefore(result.nextBefore)
        }
        setListError('')

        const newestUnread = result.messages.find(message =>
          String(message.senderId) === peerId && !message.readAt)
        if (!document.hidden && newestUnread && newestUnread.id > lastRead.current) {
          await apiCall(path + '/read', {
            method: 'PATCH', body: JSON.stringify({ through: newestUnread.id }), signal: controller.signal,
          })
          if (!controller.signal.aborted) lastRead.current = newestUnread.id
        }
      } catch {
        if (!controller.signal.aborted) setListError('대화를 불러오지 못했습니다. 연결을 다시 시도합니다.')
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, REFRESH_INTERVAL)
      }
    }
    void refresh()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [path, peerId])

  useLayoutEffect(() => {
    const input = composer.current
    if (!input) return

    function resizeComposer() {
      input.style.height = 'auto'
      const borderHeight = input.offsetHeight - input.clientHeight
      input.style.height = input.scrollHeight + borderHeight + 'px'
      const panel = history.current
      if (panel && scrollToLatest.current) panel.scrollTop = panel.scrollHeight
    }

    resizeComposer()
    window.addEventListener('resize', resizeComposer)
    return () => window.removeEventListener('resize', resizeComposer)
  }, [draft, peer?.id])

  useLayoutEffect(() => {
    const panel = history.current
    if (panel && scrollToLatest.current) panel.scrollTop = panel.scrollHeight
  }, [latestId])

  function handleComposerKeyDown(event) {
    if (event.key !== 'Enter' || event.shiftKey) return
    if (event.nativeEvent.isComposing || event.keyCode === 229) return

    event.preventDefault()
    if (!event.repeat) event.currentTarget.form?.requestSubmit()
  }

  async function loadOlder() {
    setLoadingOlder(true)
    setActionError('')
    try {
      const result = await apiCall(path + '?before=' + before)
      setMessages(existing => mergeMessages(existing, result.messages))
      setBefore(result.nextBefore)
    } catch {
      setActionError('이전 메시지를 불러오지 못했습니다.')
    } finally {
      setLoadingOlder(false)
    }
  }

  async function send(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setActionError('')
    try {
      const message = await apiCall(path, { method: 'POST', body: JSON.stringify({ content }) })
      scrollToLatest.current = true
      setMessages(existing => mergeMessages(existing, [message]))
      setDraft(current => current.trim() === content ? '' : current)
    } catch {
      setActionError('메시지를 보내지 못했습니다. 다시 시도해 주세요.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="dm-page dm-page--conversation" aria-label="다이렉트 메시지">
      <header className="dm-header">
        <Link to="/messages">‹ 대화 목록</Link>
        {peer && (
          <div className="dm-peer">
            <PeerAvatar imageUrl={peer.profileImageUrl} />
            <strong>{peer.nickname}</strong>
          </div>
        )}
      </header>
      {listError && <p className="dm-error" role="alert">{listError}</p>}
      {peer && (
        <>
          <div ref={history} className="dm-history" role="log" onScroll={event => {
            const panel = event.currentTarget
            scrollToLatest.current = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 60
          }}>
            {before && <button type="button" className="btn btn--secondary" disabled={loadingOlder}
              onClick={loadOlder}>이전 메시지</button>}
            {!messages.length && <p className="dm-muted">첫 메시지를 보내 보세요.</p>}
            {messages.map((message, index) => {
              const date = new Date(message.createdAt)
              const startsDay = index === 0 ||
                date.toDateString() !== new Date(messages[index - 1].createdAt).toDateString()
              const mine = String(message.senderId) === String(userId)

              return (
                <Fragment key={message.id}>
                  {startsDay && <h2 className="dm-date-divider"><span>{messageDate.format(date)}</span></h2>}
                  <div className={'dm-message' + (mine ? ' dm-message--mine' : '')}>
                    <p>{message.content}</p>
                    <div className="dm-message__meta">
                      {mine && <span>{message.readAt ? '읽음' : '안 읽음'}</span>}
                      <time dateTime={message.createdAt}>{messageTime.format(date)}</time>
                    </div>
                  </div>
                </Fragment>
              )
            })}
          </div>
          {actionError && <p className="dm-error" role="alert">{actionError}</p>}
          <form className="dm-form dm-composer" onSubmit={send}>
            <textarea ref={composer} className="input-field" aria-label="메시지" placeholder="메시지 입력"
              maxLength={2000} rows={1} enterKeyHint="send" value={draft}
              onChange={event => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} />
            <button className="btn btn--primary" disabled={!draft.trim() || sending}>보내기</button>
          </form>
        </>
      )}
    </section>
  )
}

export default function DirectMessages() {
  const { peerId } = useParams()
  const { user } = useAuth()
  const userId = user?.id ?? user?.userId
  return peerId ? <Conversation key={userId + ':' + peerId} peerId={peerId} userId={userId} /> : <Inbox key={userId} />
}
