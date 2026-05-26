import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { counselingAPI } from '@/api'

const REPORT_TYPES = [
  {
    id: 'math',
    title: '수학 메타인지 분석',
    desc: '자기평가와 실제 성적의 격차를 AI가 분석합니다',
    emoji: '🧠',
    color: '#FF6B35',
  },
  {
    id: 'writing',
    title: '진로 탐색 리포트',
    desc: '학습 패턴을 기반으로 진로 방향을 제시합니다',
    emoji: '🎯',
    color: '#9B59B6',
  },
  {
    id: 'premium',
    title: 'i-Route 프리미엄 리포트',
    desc: '성적·학습·피드백을 종합한 통합 분석 리포트',
    emoji: '⭐',
    color: '#1A56DB',
  },
]

export default function CounselingTab() {
  const { user } = useAuth()
  const [loading, setLoading]   = useState({})
  const [results, setResults]   = useState({})
  const [errors, setErrors]     = useState({})

  const handleGenerate = async (type) => {
    setLoading(prev => ({ ...prev, [type]: true }))
    setErrors(prev => ({ ...prev, [type]: null }))
    try {
      let res
      if (type === 'math')    res = await counselingAPI.getMathReport(user.id)
      if (type === 'writing') res = await counselingAPI.getWritingReport(user.id)
      if (type === 'premium') res = await counselingAPI.getPremiumReport(user.id)
      setResults(prev => ({ ...prev, [type]: res }))
    } catch (e) {
      setErrors(prev => ({ ...prev, [type]: e.message }))
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }))
    }
  }

  return (
    <div>
      {/* 헤더 */}
      <div style={{ background:'linear-gradient(135deg, #1A1A2E 0%, #533483 100%)', padding:'24px 20px', color:'white' }}>
        <p style={{ fontSize:12, opacity:0.65, marginBottom:4 }}>Python AI 서버 연동</p>
        <h2 style={{ fontSize:20, fontWeight:800 }}>AI 상담 리포트</h2>
        <p style={{ fontSize:13, opacity:0.7, marginTop:6, lineHeight:1.5 }}>
          학습 데이터를 AI가 분석해 맞춤형 리포트를 생성합니다
        </p>
      </div>

      {/* 리포트 카드들 */}
      <div style={{ display:'flex', flexDirection:'column', gap:12, margin:'16px 16px' }}>
        {REPORT_TYPES.map(r => (
          <div key={r.id} style={{ background:'var(--color-surface)', borderRadius:16, border:'1px solid var(--color-border)', overflow:'hidden' }}>
            {/* 카드 헤더 */}
            <div style={{ padding:'16px 16px 12px', display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:48, height:48, borderRadius:14, background:r.color+'18', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, flexShrink:0 }}>
                {r.emoji}
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700 }}>{r.title}</p>
                <p style={{ fontSize:12, color:'var(--color-text-muted)', marginTop:2 }}>{r.desc}</p>
              </div>
            </div>

            {/* 생성 버튼 */}
            <div style={{ padding:'0 16px 16px' }}>
              <button
                onClick={() => handleGenerate(r.id)}
                disabled={loading[r.id]}
                style={{
                  width:'100%', padding:'11px', borderRadius:10, border:'none',
                  background: loading[r.id] ? 'var(--color-text-muted)' : r.color,
                  color:'white', fontSize:13, fontWeight:700, fontFamily:'inherit',
                  cursor: loading[r.id] ? 'not-allowed' : 'pointer',
                  transition:'all 0.2s',
                }}
              >
                {loading[r.id] ? '🤖 AI 분석 중...' : `${r.emoji} 리포트 생성`}
              </button>

              {/* 에러 */}
              {errors[r.id] && (
                <div style={{ marginTop:10, padding:'10px 12px', borderRadius:10, background:'#FFE9E9', border:'1px solid #FF3B3B30' }}>
                  <p style={{ fontSize:12, color:'var(--color-danger)' }}>
                    ❌ {errors[r.id] === 'HTTP 503'
                      ? 'Python AI 서버가 실행 중이지 않습니다'
                      : errors[r.id]}
                  </p>
                </div>
              )}

              {/* 결과 */}
              {results[r.id] && (
                <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ padding:'12px 14px', borderRadius:10, background:r.color+'10', border:`1px solid ${r.color}30` }}>
                    <p style={{ fontSize:12, fontWeight:700, color:r.color, marginBottom:6 }}>
                      📋 {results[r.id].title}
                    </p>
                    <p style={{ fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.6 }}>
                      {results[r.id].careerAnalysis}
                    </p>
                  </div>
                  <div style={{ padding:'12px 14px', borderRadius:10, background:'var(--color-primary-light)', border:'1px solid #1A56DB20' }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', marginBottom:4 }}>💡 학습 가이드</p>
                    <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>
                      {results[r.id].learningGuide}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 안내 */}
      <div style={{ margin:'0 16px 24px', padding:'12px 14px', borderRadius:12, background:'#FFF8E0', border:'1px solid #FFB80040' }}>
        <p style={{ fontSize:12, color:'#8A6500', lineHeight:1.6 }}>
          ⚠️ AI 상담 리포트는 Python AI 서버가 실행 중일 때만 사용 가능합니다. 서버 오류 시 백엔드팀에 문의하세요.
        </p>
      </div>
    </div>
  )
}