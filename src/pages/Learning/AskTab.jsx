import { useState, useEffect } from 'react'
import { aiReportAPI } from '@/api'
import MathText from '@/components/common/MathText'
import { REPORT_SUBJECTS } from '@/utils/reportSubjects'
import { SUBJECT_COLORS } from './data/mockData'

const MAX_LENGTH = 300
const AUTO = ''

const EXAMPLES = [
  '이차방정식에서 판별식이 음수면 근이 어떻게 돼요?',
  '관계대명사 what이랑 that 차이가 뭐예요?',
  '빅뱅 우주론의 증거를 알려주세요',
]

// 학생이 직접 쓴 학습 질문에 AI가 답한다. 답은 AI 서버가 교과 자료(ConceptMap)를 찾아 근거로 붙여
// 만든다. 생성이 한 번에 하나씩이라 여러 명이 동시에 물으면 늦어질 수 있다(Backend 한도 50초).
export default function AskTab({ studentId }) {
  const [subject, setSubject]   = useState(AUTO)
  const [question, setQuestion] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [askSubject, setAskSubject] = useState(false)   // 과목을 알 수 없다는 응답을 받음
  const [history, setHistory]   = useState([])          // 최신이 앞

  // 학부모가 자녀를 바꾸면 이전 자녀의 질문 기록은 지운다
  useEffect(() => { setHistory([]); setError(null); setAskSubject(false) }, [studentId])

  const trimmed = question.trim()
  const canSubmit = !loading && trimmed.length >= 2 && trimmed.length <= MAX_LENGTH

  const submit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const res = await aiReportAPI.askQuestion(trimmed, subject || undefined)
      if (res?.needSubject) {
        setAskSubject(true)
        return
      }
      setAskSubject(false)
      setHistory(prev => [{ ...res, id: Date.now() }, ...prev])
      setQuestion('')
    } catch (e) {
      setError(e.message || '답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit()
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{
        padding: '12px 14px', borderRadius: 12,
        background: 'linear-gradient(135deg, var(--color-primary-light), #EEF4FF)',
        border: '1px solid #1A56DB20',
      }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 4 }}>💬 AI에게 질문하기</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          모르는 개념을 물어보면 교과 자료를 찾아 설명해 줘요. AI 답변은 틀릴 수 있으니 중요한 내용은 교과서로 확인하세요.
        </p>
      </div>

      <div style={{
        padding: 14, borderRadius: 12, background: 'var(--color-surface)',
        border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[AUTO, ...REPORT_SUBJECTS].map(s => {
            const selected = subject === s
            const color = s ? (SUBJECT_COLORS?.[s] ?? 'var(--color-primary)') : 'var(--color-primary)'
            return (
              <button
                key={s || 'auto'}
                onClick={() => { setSubject(s); if (s) setAskSubject(false) }}
                disabled={loading}
                style={{
                  padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  border: `1px solid ${selected ? color : 'var(--color-border)'}`,
                  background: selected ? color : 'var(--color-surface-2)',
                  color: selected ? 'white' : 'var(--color-text-secondary)',
                }}
              >
                {s || '자동'}
              </button>
            )
          })}
        </div>

        {askSubject && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FFF8E0', border: '1px solid #FFB80040' }}>
            <p style={{ fontSize: 12, color: '#8A6500' }}>
              어떤 과목 질문인지 알 수 없어요. 위에서 과목을 고른 뒤 다시 질문해 주세요.
            </p>
          </div>
        )}

        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={onKeyDown}
          disabled={loading}
          rows={3}
          placeholder="예: 이차방정식에서 판별식이 음수면 근이 어떻게 돼요?"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, resize: 'vertical',
            border: '1px solid var(--color-border)', background: 'var(--color-surface-2)',
            fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text-primary)', lineHeight: 1.6,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', flex: 1 }}>
            {question.length}/{MAX_LENGTH}
          </span>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              padding: '10px 18px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit', color: 'white',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              background: canSubmit ? 'var(--color-primary)' : 'var(--color-text-muted)',
              opacity: canSubmit ? 1 : 0.6,
            }}
          >
            {loading ? '🤖 답변 만드는 중...' : '질문하기'}
          </button>
        </div>

        {loading && (
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            보통 5~30초 걸려요. 다른 학생이 먼저 물어보고 있으면 더 걸릴 수 있어요.
          </p>
        )}

        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 8, background: '#FFF0F0', border: '1px solid #FF6B6B40' }}>
            <p style={{ fontSize: 12, color: '#C0392B' }}>⚠️ {error}</p>
          </div>
        )}

        {history.length === 0 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>이런 질문을 해 보세요</p>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setQuestion(ex)}
                style={{
                  textAlign: 'left', padding: '8px 10px', borderRadius: 8, fontSize: 12, fontFamily: 'inherit',
                  border: '1px dashed var(--color-border)', background: 'transparent',
                  color: 'var(--color-text-secondary)', cursor: 'pointer',
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {history.map(item => (
        <div key={item.id} style={{
          padding: 14, borderRadius: 12, background: 'var(--color-surface)',
          border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {item.subject && (
              <span style={{
                padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: 'white',
                background: SUBJECT_COLORS?.[item.subject] ?? 'var(--color-primary)',
              }}>
                {item.subject}
              </span>
            )}
            <span style={{ fontSize: 11, color: item.grounded ? '#00875A' : '#8A6500' }}>
              {item.grounded ? '📚 교과 자료 기반' : '⚠️ 맞는 교과 자료 없이 생성됨 — 교과서로 확인하세요'}
            </span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
            Q. {item.question}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            <MathText text={item.answer} />
          </p>
        </div>
      ))}
    </div>
  )
}
