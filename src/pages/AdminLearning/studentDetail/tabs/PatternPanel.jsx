import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { analysisAPI } from '@/api'
import { SUBJECTS } from '../../data/mockData'

export default function PatternPanel({ student }) {
  const [studyPattern, setStudyPattern] = useState(null)
  const [metaCognition, setMetaCognition] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState('수학')
  
  // 학습 패턴 + 메타인지 일괄 조회
  useEffect(() => {
    if (!student?.id) return
    
    setLoading(true)
    const studentId = String(student.id)
    
    Promise.all([
      analysisAPI.getStudyPattern(studentId).catch(e => { 
        console.error('학습 패턴 조회 실패:', e); return null 
      }),
      analysisAPI.getMetaCognition(studentId, selectedSubject).catch(e => { 
        console.error('메타인지 조회 실패:', e); return null 
      }),
    ])
      .then(([patternData, metaData]) => {
        setStudyPattern(patternData)
        setMetaCognition(metaData)
      })
      .finally(() => setLoading(false))
  }, [student?.id, selectedSubject])
  
  if (loading) {
    return (
      <div style={{ padding:'40px 0', textAlign:'center', color:'var(--color-text-muted)', fontSize:13 }}>
        학습 패턴 분석 중...
      </div>
    )
  }
  
  // 시간대별 데이터 가공
  // 응답 형식 불확실해서 여러 케이스 대비
  const hourlyData = (() => {
    if (!studyPattern) return []
    
    // 케이스 1: { hourlyFocus: [{hour, focus}, ...] }
    if (Array.isArray(studyPattern.hourlyFocus)) return studyPattern.hourlyFocus
    
    // 케이스 2: { focusByHour: { "8": 60, "9": 75, ... } }
    if (studyPattern.focusByHour) {
      return Object.entries(studyPattern.focusByHour).map(([hour, focus]) => ({
        time: `${hour}시`,
        focus: Number(focus),
      }))
    }
    
    // 케이스 3: 그냥 배열
    if (Array.isArray(studyPattern)) return studyPattern
    
    return []
  })()
  
  const goldenHour = hourlyData.length > 0
    ? hourlyData.reduce((a, b) => (a.focus > b.focus ? a : b), hourlyData[0])
    : null
  
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      
      {/* 1. 골든타임 강조 */}
      {goldenHour && (
        <div style={{ 
          padding:'14px 16px', borderRadius:12, 
          background:'linear-gradient(135deg, #1A1A2E 0%, #0F3460 100%)',
          color:'white',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:28 }}>⚡</span>
            <div>
              <p style={{ fontSize:11, opacity:0.7 }}>골든타임 (집중력 최고조)</p>
              <p style={{ fontSize:18, fontWeight:800, marginTop:2 }}>
                {goldenHour.time || `${goldenHour.hour}시`} 대
              </p>
              <p style={{ fontSize:10, opacity:0.65, marginTop:2 }}>
                이 시간대에 중요한 과목을 배치하세요
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 2. 시간대별 집중도 차트 */}
      {hourlyData.length > 0 ? (
        <div>
          <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
            🕐 시간대별 집중도
          </p>
          <div style={{ background:'var(--color-surface)', borderRadius:10, padding:12, border:'1px solid var(--color-border)' }}>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={hourlyData} margin={{ top:8, right:8, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
                <XAxis 
                  dataKey={d => d.time || `${d.hour}시`} 
                  tick={{ fontSize:10, fill:'#94A3B8' }} 
                />
                <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#94A3B8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius:10, border:'1px solid #E2E8F0', fontSize:12 }} 
                  formatter={v => [`${v}점`, '집중도']} 
                />
                <Bar dataKey="focus" radius={[6,6,0,0]}>
                  {hourlyData.map((entry, i) => {
                    const isGolden = goldenHour && 
                      (entry.time === goldenHour.time || entry.hour === goldenHour.hour)
                    return (
                      <Cell 
                        key={i} 
                        fill={isGolden ? '#1A56DB' : entry.focus >= 70 ? '#60A5FA' : '#E2E8F0'} 
                      />
                    )
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div style={{ padding:'24px 16px', textAlign:'center', background:'var(--color-surface-2)', borderRadius:10, border:'1px dashed var(--color-border)' }}>
          <p style={{ fontSize:24, marginBottom:6 }}>📊</p>
          <p style={{ fontSize:12, color:'var(--color-text-muted)' }}>
            학습 패턴 데이터가 충분히 쌓이지 않았어요
          </p>
        </div>
      )}
      
      {/* 3. 메타인지 분석 - 과목 선택 + 결과 */}
      <div>
        <p style={{ fontSize:12, fontWeight:700, color:'var(--color-text-secondary)', marginBottom:8 }}>
          🧠 메타인지 분석
        </p>
        
        {/* 과목 선택 탭 */}
        <div style={{ display:'flex', gap:6, marginBottom:10, flexWrap:'wrap' }}>
          {SUBJECTS.map(subject => (
            <button
              key={subject}
              onClick={() => setSelectedSubject(subject)}
              style={{
                padding:'5px 12px', borderRadius:20, border:'none',
                fontSize:11, fontWeight:600, fontFamily:'inherit',
                cursor:'pointer',
                background: selectedSubject === subject ? 'var(--color-primary)' : 'var(--color-surface)',
                color: selectedSubject === subject ? 'white' : 'var(--color-text-muted)',
                border: selectedSubject === subject ? 'none' : '1px solid var(--color-border)',
                transition:'all 0.15s',
              }}
            >
              {subject}
            </button>
          ))}
        </div>
        
        {/* 메타인지 결과 */}
        {metaCognition ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <div style={{
              padding:'12px 14px', borderRadius:10,
              background: metaCognition.gapLevel === 'HIGH' ? '#FFF8E0' : '#D1FAF015',
              border: `1px solid ${metaCognition.gapLevel === 'HIGH' ? '#FFB80040' : '#00C49A30'}`,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <p style={{ fontSize:12, fontWeight:700, color: metaCognition.gapLevel === 'HIGH' ? '#8A6500' : 'var(--color-success)' }}>
                  {metaCognition.gapLevel === 'HIGH' ? '⚠️ 메타인지 과대평가' : '✅ 메타인지 적정'}
                </p>
                {metaCognition.gapScore != null && (
                  <span style={{
                    fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20,
                    background: metaCognition.gapLevel === 'HIGH' ? '#FFB80020' : '#00C49A20',
                    color: metaCognition.gapLevel === 'HIGH' ? '#8A6500' : 'var(--color-success)',
                  }}>
                    갭 {metaCognition.gapScore}점
                  </span>
                )}
              </div>
              {metaCognition.gapSummary && (
                <p style={{ fontSize:12, color:'var(--color-text-secondary)', lineHeight:1.5 }}>
                  {metaCognition.gapSummary}
                </p>
              )}
            </div>
            
            {metaCognition.advice && (
              <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--color-primary-light)', border:'1px solid #1A56DB20' }}>
                <p style={{ fontSize:11, fontWeight:700, color:'var(--color-primary)', marginBottom:4 }}>💡 AI 조언</p>
                <p style={{ fontSize:12, color:'var(--color-text-primary)', lineHeight:1.5 }}>
                  {metaCognition.advice}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding:'20px 16px', textAlign:'center', background:'var(--color-surface-2)', borderRadius:10, border:'1px dashed var(--color-border)' }}>
            <p style={{ fontSize:12, color:'var(--color-text-muted)' }}>
              {selectedSubject} 메타인지 데이터가 없어요
            </p>
          </div>
        )}
      </div>
    </div>
  )
}