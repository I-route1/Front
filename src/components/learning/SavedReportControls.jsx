export function SavedReportStatus({ history }) {
  return <div role={history.error ? 'alert' : 'status'} aria-label="저장된 AI 리포트 조회" style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <span>{!history.enabled ? '학생을 선택해 주세요.' : history.loading ? '저장된 리포트를 불러오는 중...'
        : history.error ? '저장된 AI 리포트를 불러오지 못했습니다.'
        : history.data.length ? `저장된 리포트 ${history.data.length}개 · 과목별 최신순` : '아직 저장된 상담 리포트가 없습니다.'}</span>
      <button onClick={history.reload} disabled={!history.enabled || history.loading} style={{ flexShrink: 0, border: '1px solid var(--color-border)',
        borderRadius: 8, padding: '6px 9px', fontSize: 11, fontFamily: 'inherit', background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer' }}>
        저장된 리포트 새로고침
      </button>
    </div>
    {history.error && <p style={{ color: 'var(--color-danger)', marginTop: 4 }}>{history.error}</p>}
  </div>
}

export function SavedReportPicker({ history, type }) {
  const rows = history.groups[type] || []
  if (!rows.length) return null
  const selected = history.results[type] || rows[0]
  return <div style={{ marginBottom: 10 }}>
    <label style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
      저장된 {type === 'unclassified' ? '미분류' : selected._subjectLabel} 리포트
      <select aria-label={`저장된 ${type === 'unclassified' ? '미분류' : selected._subjectLabel} 리포트`} value={String(selected.id)}
        onChange={event => history.select(type, event.target.value)} disabled={history.loading}
        style={{ display: 'block', width: '100%', padding: '9px 12px', marginTop: 4, borderRadius: 8, border: '1px solid var(--color-border)',
          background: 'var(--color-surface-2)', fontSize: 12, fontFamily: 'inherit', color: 'var(--color-text-primary)' }}>
        {rows.map(row => <option key={row.id} value={String(row.id)}>{row._generatedAt} · {row.title || '제목 없는 리포트'} · #{row.id}</option>)}
      </select>
    </label>
    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>과목: {selected._subjectLabel} · 리포트 #{selected.id}</p>
    {!selected.careerAnalysis && !selected.learningGuide && <p style={{ fontSize: 12, marginTop: 4 }}>저장된 본문이 없습니다.</p>}
  </div>
}
