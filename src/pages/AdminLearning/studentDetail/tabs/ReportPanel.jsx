import { useState } from 'react'
import { counselingAPI } from '@/api'
import { AI_REPORTS } from '../../data/mockData'

// 리포트 종류 정의
const REPORT_TYPES = [
  {
    id: 'math',
    title: '수학 메타인지 리포트',
    description: '자기평가와 실제 성적의 격차를 AI가 분석',
    emoji: '🧮',
    color: '#1A56DB',
    api: 'getMathReport',
  },
  {
    id: 'writing',
    title: '진로 탐색 리포트',
    description: '학생의 학습 성향 기반 진로 추천',
    emoji: '🎯',
    color: '#9C88FF',
    api: 'getWritingReport',
  },
  {
    id: 'premium',
    title: '프리미엄 통합 리포트',
    description: '학업·진로·학습 가이드 종합 분석',
    emoji: '👑',
    color: '#FFB800',
    api: 'getPremiumReport',
    primary: true,
  },
]

export default function ReportPanel({ student }) {
  const [reports, setReports] = useState({})  // { math: {...}, writing: {...}, premium: {...} }
  const [loading, setLoading] = useState({})  // { math: true, ... }
  const [errors, setErrors] = useState({})    // { math: "...", ... }
  
  if (!student) return null
  
  const generateReport = async (reportType) => {
    const { id, api } = reportType
    
    setLoading(prev => ({ ...prev, [id]: true }))
    setErrors(prev => ({ ...prev, [id]: null }))
    
    try {
      const data = await counselingAPI[api](String(student.id))
      setReports(prev => ({ ...prev, [id]: { data, source: 'API' } }))
    } catch (e) {
      console.error(`${id} 리포트 생성 실패:`, e)
      
      // 폴백: mock 데이터
      const fallback = AI_REPORTS[student.id]
      if (fallback) {
        // mock 응답을 API 응답 형식과 비슷하게 가공
        setReports(prev => ({ 
          ...prev, 
          [id]: { 
            data: {
              title: `${reportType.title} (오프라인 모드)`,
              careerAnalysis: fallback.summary,
              learningGuide: fallback.recommend,
              strong: fallback.strong,
              weak: fallback.weak,
            }, 
            source: 'MOCK',
          } 
        }))
      } else {
        setErrors(prev => ({ 
          ...prev, 
          [id]: 'AI 서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.' 
        }))
      }
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }))
    }
  }
  
  const closeReport = (id) => {
    setReports(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setErrors(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      
      {/* 헤더 안내 */}
      <div style={{ 
        padding:'12px 14px', borderRadius:10, 
        background:'linear-gradient(135deg, #FFF8E0, #FFE9D6)',
        border:'1px solid #FFB80040',
      }}>
        <p style={{ fontSize:11, fontWeight:700, color:'#8A6500', marginBottom:4 }}>
          🤖 AI 상담 리포트
        </p>
        <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.5 }}>
          학생의 학습 데이터를 분석해 맞춤 리포트를 생성합니다. 
          생성에 약 5~10초 소요됩니다.
        </p>
      </div>
      
      {/* 리포트 카드 3개 */}
      {REPORT_TYPES.map(type => {
        const reportData = reports[type.id]
        const isLoading = loading[type.id]
        const errorMsg = errors[type.id]
        
        return (
          <div 
            key={type.id} 
            style={{ 
              padding:'14px', borderRadius:12, 
              background:'var(--color-surface)', 
              border: type.primary 
                ? `2px solid ${type.color}` 
                : `1.5px solid ${type.color}40`,
            }}
          >
            {/* 카드 헤더 */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <span style={{ fontSize:28 }}>{type.emoji}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:14, fontWeight:700, color: type.color }}>
                  {type.title}
                  {type.primary && (
                    <span style={{ 
                      marginLeft:6, fontSize:10, fontWeight:700, 
                      padding:'2px 8px', borderRadius:20, 
                      background:type.color, color:'white',
                    }}>
                      추천
                    </span>
                  )}
                </p>
                <p style={{ fontSize:11, color:'var(--color-text-muted)', marginTop:2 }}>
                  {type.description}
                </p>
              </div>
            </div>
            
            {/* 결과 영역 */}
            {reportData ? (
              <ReportContent 
                report={reportData} 
                type={type}
                onClose={() => closeReport(type.id)}
              />
            ) : errorMsg ? (
              <div style={{ 
                padding:'12px', borderRadius:10, 
                background:'#FFE9E915', border:'1px solid #FF3B3B30',
              }}>
                <p style={{ fontSize:12, color:'var(--color-danger)', marginBottom:8 }}>
                  ⚠️ {errorMsg}
                </p>
                <button
                  onClick={() => generateReport(type)}
                  style={{
                    padding:'6px 12px', borderRadius:8, border:'1px solid var(--color-border)',
                    background:'transparent', color:'var(--color-text-muted)', 
                    fontSize:11, fontWeight:600, fontFamily:'inherit', cursor:'pointer',
                  }}
                >
                  다시 시도
                </button>
              </div>
            ) : (
              <button
                onClick={() => generateReport(type)}
                disabled={isLoading}
                style={{
                  width:'100%', padding:'12px', borderRadius:10, border:'none',
                  background: isLoading 
                    ? 'var(--color-text-muted)' 
                    : `linear-gradient(90deg, ${type.color}, ${type.color}CC)`,
                  color:'white', fontSize:13, fontWeight:700, fontFamily:'inherit',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? '🤖 AI 분석 중...' : `${type.emoji} 리포트 생성`}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// 리포트 결과 컴포넌트
function ReportContent({ report, type, onClose }) {
  const { data, source } = report
  
  // 가능한 필드 모두 시도
  const title    = data.title || type.title
  const summary  = data.careerAnalysis || data.summary || data.message || ''
  const guide    = data.learningGuide || data.guide || data.recommend || ''
  const strong   = data.strong || data.strengths || ''
  const weak     = data.weak || data.weaknesses || ''
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {/* 출처 뱃지 */}
      {source === 'MOCK' && (
        <div style={{ 
          padding:'6px 10px', borderRadius:8, 
          background:'#FFF8E0', border:'1px solid #FFB80040',
        }}>
          <p style={{ fontSize:10, color:'#8A6500' }}>
            ⚠️ AI 서버 연결 실패 - 저장된 분석 결과를 보여드려요
          </p>
        </div>
      )}
      
      {/* 요약 */}
      {summary && (
        <div style={{ 
          padding:'12px', borderRadius:10, 
          background:`${type.color}15`, border:`1px solid ${type.color}30`,
        }}>
          <p style={{ fontSize:11, fontWeight:700, color:type.color, marginBottom:6 }}>
            📌 {title}
          </p>
          <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.6 }}>
            {summary}
          </p>
        </div>
      )}
      
      {/* 강점/약점 (있을 때) */}
      {(strong || weak) && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {strong && (
            <div style={{ 
              padding:'10px', borderRadius:8, 
              background:'#D1FAF015', border:'1px solid #00C49A30',
            }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--color-success)', marginBottom:4 }}>
                💪 강점
              </p>
              <p style={{ fontSize:11, color:'var(--color-text-primary)' }}>{strong}</p>
            </div>
          )}
          {weak && (
            <div style={{ 
              padding:'10px', borderRadius:8, 
              background:'#FFE9E915', border:'1px solid #FF3B3B30',
            }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--color-danger)', marginBottom:4 }}>
                📌 보완
              </p>
              <p style={{ fontSize:11, color:'var(--color-text-primary)' }}>{weak}</p>
            </div>
          )}
        </div>
      )}
      
      {/* 학습 가이드/추천 조치 */}
      {guide && (
        <div style={{ 
          padding:'10px 12px', borderRadius:8, 
          background:'#FFF8E0', border:'1px solid #FFB80030',
        }}>
          <p style={{ fontSize:10, fontWeight:700, color:'#8A6500', marginBottom:4 }}>
            📋 학습 가이드
          </p>
          <p style={{ fontSize:11, color:'var(--color-text-primary)', lineHeight:1.5 }}>
            {guide}
          </p>
        </div>
      )}
      
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        style={{
          width:'100%', padding:'8px', borderRadius:8, 
          border:'1px solid var(--color-border)', background:'transparent', 
          color:'var(--color-text-muted)', fontSize:11, fontWeight:600, 
          fontFamily:'inherit', cursor:'pointer',
        }}
      >
        리포트 닫기
      </button>
    </div>
  )
}