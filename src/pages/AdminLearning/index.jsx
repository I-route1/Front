import { useState } from 'react'
import OverviewTab from './OverviewTab'
import StudentsTab from './StudentsTab'
import FeedbackTab from './FeedbackTab'

const TABS = [
  { id: 'overview', label: '📊 전체현황' },
  { id: 'students', label: '👥 학생관리' },
  { id: 'feedback', label: '📝 피드백' },
]

export default function AdminLearning() {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div>
      <div style={{
        display: 'flex', overflowX: 'auto', scrollbarWidth: 'none',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flexShrink: 0, padding: '14px 20px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
            fontWeight: activeTab === t.id ? 700 : 500,
            color: activeTab === t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
            borderBottom: `2.5px solid ${activeTab === t.id ? 'var(--color-primary)' : 'transparent'}`,
            transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{t.label}</button>
        ))}
      </div>
      {activeTab === 'overview' && <OverviewTab />}
      {activeTab === 'students' && <StudentsTab />}
      {activeTab === 'feedback' && <FeedbackTab />}
    </div>
  )
}