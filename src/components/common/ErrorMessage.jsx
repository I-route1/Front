export default function ErrorMessage({ 
    message = '문제가 발생했어요...🤖', 
    onRetry 
  }) {
    return (
      <div style={{
        margin:'16px', padding:'24px 20px',
        background:'#FFE9E915', border:'1px solid #FF3B3B30',
        borderRadius:14, textAlign:'center',
      }}>
        <p style={{ fontSize:32, marginBottom:8 }}>😢</p>
        <p style={{ fontSize:14, fontWeight:700, color:'var(--color-danger)', marginBottom:4 }}>
          {message}
        </p>
        <p style={{ fontSize:12, color:'var(--color-text-muted)', marginBottom:16 }}>
          잠시 후 다시 시도해 주세요...🤖
        </p>
        {onRetry && (
          <button onClick={onRetry} style={{
            padding:'9px 20px', borderRadius:10, border:'none',
            background:'var(--color-danger)', color:'white',
            fontSize:13, fontWeight:700, fontFamily:'inherit', cursor:'pointer',
          }}>
            🔄 다시 시도
          </button>
        )}
      </div>
    )
  }