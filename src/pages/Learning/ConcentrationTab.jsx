import { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { activitiesAPI } from '@/api'
import useStudentRecords from '@/hooks/useStudentRecords'
import { RecordError } from '@/components/learning/LearningResults'
import {
  SCORE_MAX, STATE_COLORS, concentrationLevel, normalizeActivities,
  summarizeConcentration, concentrationInsights,
} from '@/utils/concentration'

const RECENT_LIMIT = 14 // 추이 그래프에 보여줄 최근 기록 수
const CAMERA_LIMIT = 6 // 카메라 세션 막대 수
const PAGE = 10 // 기록 목록 한 번에 보여줄 수

const card = {
  background: 'var(--color-surface)', borderRadius: 16,
  border: '1px solid var(--color-border)', padding: 16,
}
const section = { margin: '12px 16px 0' }
const muted = { fontSize: 12, color: 'var(--color-text-muted)' }
const title = { fontSize: 14, fontWeight: 700 }

const pct = (v) => `${Math.round(v * 100)}%`

function formatDate(date) {
  const [, m, d] = (date || '').split('-')
  return m && d ? `${Number(m)}/${Number(d)}` : date
}

function formatMinutes(min) {
  if (!min) return '0분'
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`
}

function Stars({ score }) {
  return (
    <span aria-label={`집중도 ${score}점`} style={{ letterSpacing: 1, fontSize: 12, flexShrink: 0 }}>
      {Array.from({ length: SCORE_MAX }, (_, i) => (
        <span key={i} style={{ color: i < score ? '#FFB800' : 'var(--color-border)' }}>★</span>
      ))}
    </span>
  )
}

function StatBox({ label, value, sub }) {
  return (
    <div style={{ flex: 1, minWidth: 0, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 10px' }}>
      <p style={{ fontSize: 11, opacity: 0.7 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 800, marginTop: 4, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
      {sub && <p style={{ fontSize: 10, opacity: 0.6, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</p>}
    </div>
  )
}

function SourceBadge({ source }) {
  const camera = source === 'CAMERA'
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px', flexShrink: 0,
      color: camera ? '#0F766E' : 'var(--color-text-muted)',
      background: camera ? '#CCFBF1' : 'var(--color-surface-2)',
    }}>
      {camera ? '📷 카메라' : '✍️ 직접 입력'}
    </span>
  )
}

// 집중 / 집중 안 함 / 졸음 비율 막대
function StateBar({ focused, unfocused, drowsy, height = 10 }) {
  const parts = [
    { key: 'focused', value: focused },
    { key: 'unfocused', value: unfocused },
    { key: 'drowsy', value: drowsy },
  ]
  return (
    <div
      role="img"
      aria-label={`집중 ${pct(focused)}, 집중 안 함 ${pct(unfocused)}, 졸음 ${pct(drowsy)}`}
      style={{ display: 'flex', height, borderRadius: height / 2, overflow: 'hidden', background: 'var(--color-surface-2)' }}
    >
      {parts.map(p => p.value > 0 && (
        <div key={p.key} style={{ width: `${p.value * 100}%`, background: STATE_COLORS[p.key] }} />
      ))}
    </div>
  )
}

function StateLegend({ focused, unfocused, drowsy }) {
  const items = [
    { key: 'focused', label: '집중', value: focused },
    { key: 'unfocused', label: '집중 안 함', value: unfocused },
    { key: 'drowsy', label: '졸음', value: drowsy },
  ]
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      {items.map(i => (
        <div key={i.key} style={{ flex: 1, background: 'var(--color-surface-2)', borderRadius: 10, padding: '8px 10px' }}>
          <p style={{ ...muted, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATE_COLORS[i.key] }} />{i.label}
          </p>
          <p style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{pct(i.value)}</p>
        </div>
      ))}
    </div>
  )
}

function CameraCard({ summary, activities }) {
  const cam = summary.camera
  if (!cam) {
    return (
      <div style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 26 }}>📷</span>
        <div>
          <p style={title}>카메라 집중도 측정</p>
          <p style={{ ...muted, lineHeight: 1.6, marginTop: 4 }}>
            아직 카메라로 측정한 기록이 없어요. 학습 카메라로 공부하면 집중·졸음 비율이 여기에 표시돼요.
          </p>
        </div>
      </div>
    )
  }
  const sessions = activities.filter(a => a.source === 'CAMERA').slice(-CAMERA_LIMIT).reverse()
  return (
    <section aria-label="카메라 측정 결과" style={card}>
      <p style={title}>📷 카메라 측정 결과</p>
      <p style={{ ...muted, marginTop: 2, marginBottom: 14 }}>
        {cam.sessions}번 · {formatMinutes(cam.minutes)} 측정 · 공부 시간 기준 평균
      </p>
      <StateBar focused={cam.focused} unfocused={cam.unfocused} drowsy={cam.drowsy} height={14} />
      <StateLegend focused={cam.focused} unfocused={cam.unfocused} drowsy={cam.drowsy} />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sessions.map((a, i) => (
          <div key={a.id ?? i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{formatDate(a.date)} · {a.subject}</span>
              <span style={{ ...muted, fontSize: 11 }}>집중 {pct(a.focused)} · 졸음 {pct(a.drowsy)}</span>
            </div>
            <StateBar focused={a.focused} unfocused={a.unfocused} drowsy={a.drowsy} height={8} />
          </div>
        ))}
      </div>
    </section>
  )
}

export default function ConcentrationTab({ studentId }) {
  const records = useStudentRecords(studentId, activitiesAPI.getActivities)
  const [limit, setLimit] = useState(PAGE)

  const activities = useMemo(() => normalizeActivities(records.data), [records.data])
  const summary = useMemo(() => summarizeConcentration(activities), [activities])
  const insights = useMemo(() => concentrationInsights(summary), [summary])
  const recent = useMemo(
    () => activities.slice(-RECENT_LIMIT).map(a => ({ ...a, label: formatDate(a.date) })),
    [activities],
  )
  const latestFirst = useMemo(() => [...activities].reverse(), [activities])

  const level = concentrationLevel(summary.average)
  const trendText = summary.trend == null || summary.trend === 0
    ? null
    : `최근 ${summary.trend > 0 ? '▲' : '▼'}${Math.abs(summary.trend)}`

  if (records.loading) {
    return (
      <div role="status" style={{ padding: '60px 0', textAlign: 'center', ...muted }}>
        <div style={{ width: 32, height: 32, margin: '0 auto 12px', borderRadius: '50%', border: '3px solid var(--color-primary-light)', borderTopColor: 'var(--color-primary)', animation: 'spin 0.7s linear infinite' }} />
        <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
        집중도 기록을 불러오는 중이에요
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 헤더 */}
      <div style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #0F3460 100%)', padding: '24px 20px', color: 'white' }}>
        <p style={{ fontSize: 12, opacity: 0.65, marginBottom: 4 }}>최근 학습 기록 {summary.sessions}건 기준</p>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>집중도 리포트</h2>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <StatBox
            label="평균 집중도"
            value={summary.average == null ? '-' : `${summary.average} / ${SCORE_MAX}`}
            sub={summary.average == null ? null : `${level.label}${trendText ? ` · ${trendText}` : ''}`}
          />
          <StatBox label="총 공부 시간" value={formatMinutes(summary.totalMinutes)} sub={`${summary.sessions}회`} />
          {summary.camera ? (
            <StatBox label="카메라 집중 비율" value={pct(summary.camera.focused)} sub={`졸음 ${pct(summary.camera.drowsy)}`} />
          ) : (
            <StatBox
              label="집중 잘되는 시간"
              value={summary.bestHour ? `${summary.bestHour.hour}시~${summary.bestHour.hour + 1}시` : '-'}
              sub={summary.bestHour ? '시작 시각 기준' : null}
            />
          )}
        </div>
      </div>

      {records.error && (
        <div style={section}><RecordError message={records.error} retry={records.reload} /></div>
      )}

      {!records.error && summary.sessions === 0 && (
        <div style={{ margin: '16px 16px 0' }}>
          <div style={{ ...card, padding: '36px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 28, marginBottom: 10 }}>🧘</p>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>아직 집중도 기록이 없어요</p>
            <p style={{ ...muted, lineHeight: 1.6 }}>
              학습 카메라로 공부하거나 학습 패턴 탭에서 자기평가를 남기면<br />집중도 변화를 여기서 볼 수 있어요.
            </p>
          </div>
        </div>
      )}

      {summary.sessions > 0 && (
        <>
          {/* 한눈에 보기 */}
          {insights.length > 0 && (
            <div style={{ margin: '16px 16px 0' }}>
              <div style={{ ...card, background: 'var(--color-primary-light)', borderColor: 'transparent' }}>
                <p style={{ ...title, marginBottom: 10, color: 'var(--color-primary)' }}>💡 한눈에 보기</p>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {insights.map(t => (
                    <li key={t} style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--color-text-primary)' }}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 카메라 측정 */}
          <div style={{ margin: insights.length ? '12px 16px 0' : '16px 16px 0' }}>
            <CameraCard summary={summary} activities={activities} />
          </div>

          {/* 집중도 추이 */}
          {recent.length >= 2 && (
            <div style={section}>
              <div style={card}>
                <p style={{ ...title, marginBottom: 2 }}>📈 집중도 추이</p>
                <p style={{ ...muted, marginBottom: 14 }}>최근 {recent.length}번의 공부 · 이해도와 함께 비교</p>
                <ResponsiveContainer width="100%" height={190}>
                  <LineChart data={recent} margin={{ top: 6, right: 10, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis domain={[0, SCORE_MAX]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
                      labelFormatter={(_, p) => {
                        const a = p?.[0]?.payload
                        return a ? `${a.label} · ${a.subject}${a.startTime ? ` · ${a.startTime}` : ''}` : ''
                      }}
                      formatter={(v, name) => [`${v}점`, name]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="concentration" name="집중도" stroke="#1A56DB" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="understanding" name="이해도" stroke="#00C49A" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 과목별 평균 */}
          <div style={section}>
            <div style={card}>
              <p style={{ ...title, marginBottom: 14 }}>📚 과목별 평균 집중도</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {summary.bySubject.map(s => {
                  const lv = concentrationLevel(s.average)
                  return (
                    <div key={s.subject}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {s.subject}
                          <span style={{ ...muted, fontSize: 11, marginLeft: 6 }}>{s.sessions}회 · {formatMinutes(s.minutes)}</span>
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: lv.color }}>{s.average}</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--color-surface-2)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 4, background: lv.color, width: `${(s.average / SCORE_MAX) * 100}%`, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 시간대별 평균 */}
          {summary.byHour.length >= 2 && (
            <div style={section}>
              <div style={card}>
                <p style={{ ...title, marginBottom: 2 }}>🕐 시작 시간대별 집중도</p>
                <p style={{ ...muted, marginBottom: 14 }}>공부를 시작한 시각 기준 평균</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={summary.byHour} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F3FA" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <YAxis domain={[0, SCORE_MAX]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
                      formatter={(v, _, p) => [`${v}점 (${p.payload.sessions}회)`, '평균 집중도']}
                    />
                    <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={36}>
                      {summary.byHour.map(h => (
                        <Cell key={h.hour} fill={h.hour === summary.bestHour?.hour ? '#1A56DB' : '#BFD3F7'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 공부 기록 */}
          <div style={section}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <p style={title}>🗂️ 공부 기록</p>
                <button
                  type="button"
                  onClick={records.reload}
                  style={{ fontSize: 12, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  새로고침
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {latestFirst.slice(0, limit).map((a, i) => {
                  const lv = concentrationLevel(a.concentration)
                  return (
                    <div key={a.id ?? i} style={{ padding: '12px 0', borderTop: i ? '1px solid var(--color-border)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, background: lv.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 600 }}>{a.subject}</p>
                            <SourceBadge source={a.source} />
                          </div>
                          <p style={{ ...muted, fontSize: 11, marginTop: 3 }}>
                            {formatDate(a.date)}{a.startTime ? ` ${a.startTime}` : ''} · {formatMinutes(a.minutes)}
                            {a.source === 'CAMERA' && ` · 집중 ${pct(a.focused)} · 졸음 ${pct(a.drowsy)}`}
                          </p>
                        </div>
                        <Stars score={a.concentration} />
                      </div>
                      {a.feedback && (
                        <p style={{ marginTop: 8, marginLeft: 16, fontSize: 12, lineHeight: 1.5, color: 'var(--color-text-secondary)', background: 'var(--color-surface-2)', borderRadius: 8, padding: '8px 10px' }}>
                          👩‍🏫 {a.feedback}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              {latestFirst.length > limit && (
                <button
                  type="button"
                  onClick={() => setLimit(n => n + PAGE)}
                  style={{ width: '100%', marginTop: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-light)', border: 'none', borderRadius: 10, cursor: 'pointer' }}
                >
                  더 보기 ({limit}/{latestFirst.length})
                </button>
              )}
            </div>
          </div>

          <p style={{ ...muted, fontSize: 11, textAlign: 'center', margin: '14px 24px 0', lineHeight: 1.5 }}>
            집중도 별점은 카메라 측정 결과 또는 직접 입력한 자기평가(1~5점)예요.
          </p>
        </>
      )}
    </div>
  )
}
