export default function LoadingSpinner({ message = 'AI가 분석 중이에요... 잠시만 기다려주세요...🤖' }) {
    return (
      <div style={{
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'48px 20px', gap:14,
      }}>
        <div style={{
          width:44, height:44, borderRadius:'50%',
          border:'3.5px solid var(--color-border)',
          borderTopColor:'var(--color-primary)',
          animation:'spin 0.8s linear infinite',
        }} />
        <p style={{ fontSize:13, color:'var(--color-text-muted)', fontWeight:600 }}>
          🤖 {message}
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }