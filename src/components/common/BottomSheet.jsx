import { useEffect, useRef } from 'react'

// 아래에서 올라오는 입력 창.
// 닫혀 있어도 내용은 그대로 두어(display: none) 입력하던 값이 사라지지 않게 한다.
export default function BottomSheet({ open, onClose, title, description, children }) {
  const panelRef = useRef(null)
  const lastFocus = useRef(null)

  useEffect(() => {
    if (!open) return
    lastFocus.current = document.activeElement
    panelRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      lastFocus.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <div style={{ display: open ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 200 }}>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(17,24,39,0.45)' }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 'var(--app-max-width, 430px)', maxHeight: '88%',
          display: 'flex', flexDirection: 'column', outline: 'none',
          background: 'var(--color-surface)', borderRadius: '22px 22px 0 0',
          boxShadow: '0 -8px 24px rgba(17,24,39,0.15)',
          animation: open ? 'sheet-up 0.22s ease-out' : 'none',
        }}
      >
        <style>{'@keyframes sheet-up { from { transform: translate(-50%, 24px); opacity: 0.6 } to { transform: translate(-50%, 0); opacity: 1 } }'}</style>
        <div style={{ padding: '10px 20px 0', flexShrink: 0 }}>
          <span aria-hidden="true" style={{ display: 'block', width: 40, height: 5, borderRadius: 3, background: 'var(--color-border)', margin: '0 auto 8px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>{title}</h2>
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              style={{ width: 44, height: 44, marginRight: -10, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--color-text-muted)' }}>
                <line x1="4" y1="4" x2="14" y2="14" /><line x1="14" y1="4" x2="4" y2="14" />
              </svg>
            </button>
          </div>
          {description && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</p>}
        </div>
        <div style={{ overflowY: 'auto', padding: '16px 20px 28px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// 화면 아래쪽(하단 메뉴 바로 위)에 떠 있는 '오늘 공부 기록하기' 버튼.
// 하단 메뉴(.bottom-nav)와 같은 방식으로 고정하고, 내용이 버튼에 가리지 않게 같은 높이의 빈 공간을 둔다.
export function RecordLauncher({ onClick }) {
  return (
    <>
      <div aria-hidden="true" style={{ height: 84 }} />
      <div style={{
        position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 90,
        bottom: 'calc(var(--bottomnav-height, 64px) + var(--safe-bottom, 0px))',
        width: '100%', maxWidth: 'var(--app-max-width, 430px)', boxSizing: 'border-box',
        padding: '12px 16px', pointerEvents: 'none',
      }}>
        <button
          type="button"
          onClick={onClick}
          style={{
            pointerEvents: 'auto',
            width: '100%', height: 52, borderRadius: 14, border: 'none', cursor: 'pointer',
            background: 'var(--color-primary)', color: 'white', fontFamily: 'inherit', fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 6px 16px rgba(26,86,219,0.3)',
          }}
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
            <line x1="9" y1="3" x2="9" y2="15" /><line x1="3" y1="9" x2="15" y2="9" />
          </svg>
          오늘 공부 기록하기
        </button>
      </div>
    </>
  )
}
