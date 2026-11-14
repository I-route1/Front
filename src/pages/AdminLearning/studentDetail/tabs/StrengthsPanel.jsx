import { useMemo } from 'react'
import { gradesAPI } from '@/api'
import { SUBJECT_COLORS } from '../../data/mockData'
import useStudentRecords from '@/hooks/useStudentRecords'
import { normalizeGrades, summarizeGrades } from '@/utils/gradeSummary'

// 강점/보완 과목은 실제 성적(GET /api/grades/{studentId})의 과목별 최근 점수로 정한다.
// (/api/analysis/strengths는 성적 등록 화면과 다른 grade_entity 테이블을 읽어서 실제 성적과 맞지 않는다)
const STRONG_SCORE = 80
const WEAK_SCORE = 60

const loadGrades = id => gradesAPI.getGrades(id).then(normalizeGrades)

export default function StrengthsPanel({ student }) {
  const studentId = student?.id == null ? null : String(student.id)
  const grades = useStudentRecords(studentId, loadGrades)
  const summary = useMemo(() => summarizeGrades(grades.data), [grades.data])

  if (grades.loading) {
    return <p style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>성적을 불러오는 중...</p>
  }
  if (grades.error) {
    return (
      <div role="alert" style={emptyBox}>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>성적을 불러오지 못했어요.</p>
        <button type="button" onClick={grades.reload} style={smallButton}>다시 불러오기</button>
      </div>
    )
  }
  if (!summary.subjects.length) {
    return (
      <div data-testid="admin-strengths-empty" style={emptyBox}>
        <p style={{ fontSize: 32, marginBottom: 8 }}>🌱</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: 4 }}>아직 등록된 성적이 없어요</p>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>성적이 등록되면 강점 과목과 보완할 과목을 알려 드려요.</p>
      </div>
    )
  }

  const scored = summary.subjects.map(s => ({ subject: s, score: summary.current[s], previous: summary.previous[s] }))
  const strong = scored.filter(s => s.score >= STRONG_SCORE).sort((a, b) => b.score - a.score)
  const weak = scored.filter(s => s.score < WEAK_SCORE).sort((a, b) => a.score - b.score)
  const headline = strong.length
    ? `${strong.map(s => s.subject).join(', ')} 과목에서 ${STRONG_SCORE}점 이상을 받고 있어요.`
    : `${STRONG_SCORE}점 이상인 과목은 아직 없어요. 지금은 ${summary.best}(${summary.current[summary.best]}점) 점수가 가장 높아요.`

  return (
    <div data-testid="admin-strengths" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ padding: '12px 14px', borderRadius: 10, background: 'linear-gradient(135deg, #E8F0FF, #F0F5FF)', border: '1px solid #1A56DB30' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 6 }}>💪 성적 기반 강점 분석</p>
        <p style={{ fontSize: 12, lineHeight: 1.6 }}>{headline}</p>
        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
          과목별 최근 시험 기준 · 평균 {summary.average}점 · {summary.subjects.length}과목
        </p>
      </div>

      {strong.length > 0 && <SubjectList title={`🏆 강점 과목 (${STRONG_SCORE}점 이상)`} rows={strong} tone="#00C49A" />}
      {weak.length > 0 && <SubjectList title={`📌 보완이 필요한 과목 (${WEAK_SCORE}점 미만)`} rows={weak} tone="#FF3B3B" pillColor="#FF3B3B" />}
      {!strong.length && !weak.length && (
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          모든 과목이 {WEAK_SCORE}~{STRONG_SCORE - 1}점 사이예요.
        </p>
      )}
    </div>
  )
}

function SubjectList({ title, rows, tone, pillColor }) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>{title}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(({ subject, score, previous }) => {
          const diff = previous == null ? null : score - previous
          return (
            <div key={subject} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12,
              background: `${tone}0D`, border: `1px solid ${tone}30`,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 700 }}>{subject}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {diff == null ? '시험 1회 기록' : diff === 0 ? '지난 시험과 같아요' : `지난 시험보다 ${Math.abs(diff)}점 ${diff > 0 ? '올랐어요' : '내려갔어요'}`}
                </p>
              </div>
              <div style={{
                padding: '6px 12px', borderRadius: 20, background: pillColor || SUBJECT_COLORS[subject] || tone, color: 'white',
                fontSize: 13, fontWeight: 800,
              }}>{score}점</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const emptyBox = {
  padding: '32px 16px', textAlign: 'center', background: 'var(--color-surface-2)', borderRadius: 12,
  border: '1px dashed var(--color-border)',
}
const smallButton = {
  border: '1px solid var(--color-border)', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontFamily: 'inherit',
  background: 'var(--color-surface)', color: 'var(--color-text-primary)', cursor: 'pointer',
}
