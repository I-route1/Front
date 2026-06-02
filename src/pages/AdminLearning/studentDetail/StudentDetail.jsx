import { useState } from 'react'
import GradePanel from './tabs/GradePanel'
import PatternPanel from './tabs/PatternPanel'
import StrengthsPanel from './tabs/StrengthsPanel'
import PredictPanel from './tabs/PredictPanel'
import ReportPanel from './tabs/ReportPanel' 

const TABS = [
  { id: 'grade',     label: '성적',   emoji: '📊' },
  { id: 'pattern',   label: '패턴',   emoji: '🧠' },
  { id: 'strengths', label: '강점',   emoji: '💪' },
  { id: 'predict',   label: '예측',   emoji: '📈' },
  { id: 'report',    label: '리포트', emoji: '📋' }, 
]

export default function StudentDetail({ student }) {
  const [activeTab, setActiveTab] = useState('grade')
  
  if (!student) return null
  
  const renderPanel = () => {
    switch (activeTab) {
      case 'grade':     return <GradePanel student={student} />
      case 'pattern':   return <PatternPanel student={student} />
      case 'strengths': return <StrengthsPanel student={student} />
      case 'predict':   return <PredictPanel student={student} />
      case 'report':    return <ReportPanel student={student} />  
      default:          return null
    }
  }
  
  return (
    <div>
      {/* 탭 헤더 */}
      <div style={{
        display:'flex', gap:4, overflowX:'auto', marginBottom:14,
        borderBottom:'1px solid var(--color-border)',
      }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding:'10px 14px', border:'none', background:'transparent',
                cursor:'pointer', fontSize:12,
                fontWeight: isActive ? 700 : 600,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                whiteSpace:'nowrap', fontFamily:'inherit', transition:'all 0.15s',
              }}
            >
              <span style={{ marginRight:4 }}>{tab.emoji}</span>
              {tab.label}
            </button>
          )
        })}
      </div>
      
      <div>{renderPanel()}</div>
    </div>
  )
}

// ComingSoon 함수는 이제 안 쓰니까 제거해도 됨