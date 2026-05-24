export default function EmptyState({ 
    emoji = '📭', 
    title = '아직 데이터가 없어요...🤖', 
    description = '데이터를 입력하면 분석이 시작됩니다...🤖',
    actionLabel,
    onAction,
  }) {
    return (
      <div style={{
        margin:'16px', padding:'40px 20px',
        background:'var(--color-surface)', border:'1px solid var(--color-border)',
        borderRadius:16, textAlign:'center',
      }}>
        <p style={{ fontSize:44, marginBottom:12 }}>{emoji}</p>
        <p style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{title}</p>
        <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom: actionLabel ? 16 : 0 }}>
          {description}
        </p>
        {actionLabel && onAction && (
          <button onClick={onAction} style={{
            padding:'10px 22px', borderRadius:10, border:'none',
            background:'var(--color-primary)', color:'white',
            fontSize:13, fontWeight:700, fontFamily:'inherit', cursor:'pointer',
            boxShadow:'0 4px 12px rgba(26,86,219,0.25)',
          }}>
            {actionLabel}
          </button>
        )}
      </div>
    )
  }