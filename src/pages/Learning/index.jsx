import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import GradeTab from './GradeTab'
import PatternTab from './PatternTab'
import SuggestTab from './SuggestTab'
import PredictTab from './PredictTab'
import CounselingTab from './CounselingTab'

const TABS = [
  { id: 'grade',   label: '📊 성적' },
  { id: 'pattern', label: '🧠 학습 패턴' },
  { id: 'suggest', label: '📚 맞춤 추천' },
  { id: 'predict', label: '🎯 성장 예측' },
  { id:'counseling', label:'🌱 AI 리포트' },
]

const VALID_TABS = TABS.map(t => t.id)

export default function Learning() {
  const [searchParams] = useSearchParams()
  const initialTab = VALID_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'grade'
  const [active, setActive] = useState(initialTab)

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* 탭 바 */}
      <div style={{ display:'flex', background:'var(--color-surface)', borderBottom:'1px solid var(--color-border)', flexShrink:0 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              flex:1, padding:'13px 4px', border:'none', cursor:'pointer',
              fontFamily:'inherit', fontSize:13, fontWeight: active===t.id ? 700 : 500,
              background:'transparent',
              color: active===t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: active===t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              transition:'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {active === 'grade'      && <GradeTab />}
        {active === 'pattern'    && <PatternTab />}
        {active === 'suggest'    && <SuggestTab />}
        {active === 'predict'    && <PredictTab />}
        {active === 'counseling' && <CounselingTab />}
      </div>
    </div>
  )
}