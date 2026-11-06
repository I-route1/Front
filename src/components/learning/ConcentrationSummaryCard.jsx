import { useMemo } from 'react'
import { SCORE_MAX, concentrationLevel, normalizeActivities, summarizeConcentration } from '@/utils/concentration'

// 학습 패턴 탭에 들어가는 집중도 요약. 자세한 내용은 집중도 탭에서 본다.
export default function ConcentrationSummaryCard({ records, onOpen }) {
  const summary = useMemo(
    () => summarizeConcentration(normalizeActivities(records.data)),
    [records.data],
  )
  const level = concentrationLevel(summary.average)

  let detail
  if (records.loading) detail = '학습 기록을 불러오는 중...'
  else if (records.error) detail = '학습 기록을 불러오지 못했어요.'
  else if (summary.sessions === 0) detail = '아직 집중도 기록이 없어요.'
  else if (summary.camera) detail = `카메라 측정 ${summary.camera.sessions}회 · 집중 ${Math.round(summary.camera.focused * 100)}% · 졸음 ${Math.round(summary.camera.drowsy * 100)}%`
  else detail = `최근 ${summary.sessions}회 · 카메라 측정 기록 없음`

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left',
        background: 'var(--color-surface)', borderRadius: 16, border: '1px solid var(--color-border)',
        padding: 16, cursor: 'pointer', font: 'inherit', color: 'inherit',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: `${level.color}1A`, color: level.color,
      }}>
        <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{summary.average ?? '-'}</span>
        <span style={{ fontSize: 9, marginTop: 3, opacity: 0.8 }}>/ {SCORE_MAX}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700 }}>🧘 집중도 리포트</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>{detail}</p>
      </div>
      <span aria-hidden="true" style={{ fontSize: 18, color: 'var(--color-text-muted)' }}>›</span>
    </button>
  )
}
