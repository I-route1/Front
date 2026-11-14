import { useMemo } from 'react'
import MathText from '@/components/common/MathText'
import { summarizeSavedReports } from '@/utils/savedReports'

const shortDate = row => (row?._generatedAt && row._generatedAt !== '생성일 미상' ? row._generatedAt.slice(5, 10).replace('-', '.') : '날짜 미상')

// AI 코칭 > 리포트 맨 위. 저장된 리포트를 모아 지금 상태와 할 일을 한 장으로 보여 준다.
export default function CoachingSummaryCard({ history, onOpen }) {
  const summary = useMemo(() => summarizeSavedReports(history.data), [history.data])
  if (!history.enabled || history.loading || history.error || !summary) return null
  const { latest, level, intensity, keyLine, subjects, missing, days, stale } = summary

  return (
    <section aria-label="AI 코칭 한눈에 보기" data-testid="coaching-summary" style={{
      background: 'var(--color-surface)', borderRadius: 16, border: '1px solid #53348333', padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <p style={{ fontSize: 14, fontWeight: 800 }}>🔎 한눈에 보기</p>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flexShrink: 0 }}>
          최근 {latest._subjectLabel} 리포트 · {shortDate(latest)}
        </span>
      </div>

      {(level || intensity) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {level && <Chip label="학업 수준" value={level} />}
          {intensity && <Chip label="학습 강도" value={intensity} />}
        </div>
      )}

      {keyLine && (
        <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#5334830D' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#533483', marginBottom: 4 }}>지금 해 볼 것</p>
          <p data-testid="coaching-key-line" style={{
            fontSize: 13, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}><MathText text={keyLine} /></p>
        </div>
      )}

      {subjects.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>과목별 최신 리포트 (눌러서 보기)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {subjects.map(s => (
              <button key={s.type} type="button" onClick={() => onOpen?.(s.type)} style={{
                border: '1px solid var(--color-border)', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit',
                background: 'var(--color-surface-2)', color: 'var(--color-text-primary)', cursor: 'pointer',
              }}>
                {s.emoji} {s.label} <span style={{ color: 'var(--color-text-muted)' }}>{shortDate(s.row)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10 }}>
          아직 리포트가 없는 과목: {missing.join(' · ')}
        </p>
      )}
      {stale && (
        <p role="note" style={{ fontSize: 12, color: '#B45309', marginTop: 8, lineHeight: 1.5 }}>
          마지막 리포트가 {days}일 전이에요. 최근 성적을 반영하려면 아래에서 다시 생성해 보세요.
        </p>
      )}
    </section>
  )
}

function Chip({ label, value }) {
  return (
    <span style={{ fontSize: 12, padding: '5px 9px', borderRadius: 8, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span> <b style={{ fontWeight: 700 }}>{value}</b>
    </span>
  )
}
