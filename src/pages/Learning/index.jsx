import { useState } from 'react'
import GradeTab from './GradeTab'
import PatternTab from './PatternTab'
import SuggestTab from './SuggestTab'
import PredictTab from './PredictTab'

const TABS = [
  { id: 'grade',   label: '📊 성적' },
  { id: 'pattern', label: '🧠 학습패턴' },
  { id: 'suggest', label: '📚 맞춤추천' },
  { id: 'predict', label: '🎯 성장예측' },
]

export default function Learning() {
  const [activeTab, setActiveTab] = useState('grade')
  return (
    <div>
      <div style={{
        display:'flex', overflowX:'auto', scrollbarWidth:'none',
        background:'var(--color-surface)',
        borderBottom:'1px solid var(--color-border)',
        position:'sticky', top:0, zIndex:10,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flexShrink:0, padding:'14px 16px', border:'none', background:'transparent',
            cursor:'pointer', fontFamily:'inherit', fontSize:13,
            fontWeight: activeTab===t.id ? 700 : 500,
            color: activeTab===t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom:`2.5px solid ${activeTab===t.id ? 'var(--color-primary)' : 'transparent'}`,
            transition:'all 0.15s', whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
      </div>
      {activeTab === 'grade'   && <GradeTab />}
      {activeTab === 'pattern' && <PatternTab />}
      {activeTab === 'suggest' && <SuggestTab />}
      {activeTab === 'predict' && <PredictTab />}
    </div>
  )
}