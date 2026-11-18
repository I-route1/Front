import { useEffect, useRef, useState } from 'react'
import { aiReportAPI } from '@/api'
import MathText, { mathLines } from '@/components/common/MathText'
import '@/components/learning/generatedContent.css'
import { REPORT_SUBJECTS } from '@/utils/reportSubjects'
import { SUBJECT_COLORS } from './data/mockData'

const MAX_LENGTH = 300
const AUTO = ''

const EXAMPLES = [
  '이차방정식에서 판별식이 음수면 근이 어떻게 돼요?',
  '관계대명사 what이랑 that 차이가 뭐예요?',
  '빅뱅 우주론의 증거를 알려주세요',
]

function AnswerCard({ item, answerRef }) {
  const [lead, ...body] = mathLines(item.answer).filter(line => line.trim())
  const isSource = line => line.startsWith('교과 자료 · ')
  const details = body.filter(line => !isSource(line))
  const sources = body.filter(isSource)
  return (
    <article className="study-answer" ref={answerRef} tabIndex={-1} aria-labelledby={'question-' + item.id}>
      <div className="study-answer__meta">
        {item.subject && <span className="study-answer__subject">{item.subject}</span>}
        <span>{item.grounded ? '교과 자료 기반' : 'AI 풀이'}</span>
      </div>
      <h3 className="study-answer__question" id={'question-' + item.id}>Q. {item.question}</h3>
      <p className="study-answer__lead"><MathText text={lead} /></p>
      {details.length > 0 && (
        <div className="study-answer__details">
          <h4>풀이와 근거</h4>
          {details.map((line, i) => <p key={i}><MathText text={line} /></p>)}
        </div>
      )}
      {sources.map((line, i) => (
        <blockquote className="study-answer__source" key={i}>
          <strong>교과 자료</strong>
          <MathText text={line.slice('교과 자료 · '.length)} />
        </blockquote>
      ))}
    </article>
  )
}

// 학생이 직접 쓴 학습 질문에 AI가 답한다. 답은 AI 서버가 교과 자료(ConceptMap)를 찾아 근거로 붙여
// 만든다. 생성이 한 번에 하나씩이라 여러 명이 동시에 물으면 늦어질 수 있다(Backend 한도 50초).
export default function AskTab() {
  const [subject, setSubject]   = useState(AUTO)
  const [question, setQuestion] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [guidance, setGuidance] = useState(null)
  const [history, setHistory]   = useState([])          // 최신이 앞
  const latestAnswer = useRef(null)

  useEffect(() => {
    const card = latestAnswer.current
    if (card) {
      card.focus({ preventScroll: true })
      card.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
  }, [history])

  const trimmed = question.trim()
  const canSubmit = !loading && trimmed.length >= 2 && trimmed.length <= MAX_LENGTH

  const submit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    setGuidance(null)
    try {
      const res = await aiReportAPI.askQuestion(trimmed, subject || undefined)
      if (res?.needSubject) {
        setGuidance('어떤 과목 질문인지 알 수 없어요. 위에서 과목을 고른 뒤 다시 질문해 주세요.')
        return
      }
      if (res?.answerKind === 'clarification' || res?.answerKind === 'out_of_scope') {
        const fallback = res.answerKind === 'clarification'
          ? '문제의 지문과 조건, 보기가 있으면 질문에 함께 적어 주세요.'
          : '이곳에서는 수학·영어·국어·사회·과학 학습 질문에 답해 드려요.'
        setGuidance(res.answer?.trim() || fallback)
        return
      }
      if (typeof res?.answer !== 'string' || !res.answer.trim()) {
        setError('답변을 읽지 못했어요. 같은 질문으로 다시 시도해 주세요.')
        return
      }
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
                aria-pressed={selected}
                onClick={() => { setSubject(s); setGuidance(null) }}
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

        {guidance && (
          <div role="status" id="ask-guidance" style={{ padding: '8px 12px', borderRadius: 8, background: '#FFF8E0', border: '1px solid #FFB80040' }}>
            <p style={{ fontSize: 12, color: '#8A6500' }}>
              {guidance}
            </p>
          </div>
        )}

        <textarea
          aria-label="학습 질문"
          aria-describedby={guidance ? 'ask-guidance' : undefined}
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
          <p role="status" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            보통 5~30초 걸려요. 다른 학생이 먼저 물어보고 있으면 더 걸릴 수 있어요.
          </p>
        )}

        {error && (
          <div role="alert" style={{ padding: '8px 12px', borderRadius: 8, background: '#FFF0F0', border: '1px solid #FF6B6B40' }}>
            <p style={{ fontSize: 12, color: '#C0392B' }}>⚠️ {error}</p>
          </div>
        )}

        {history.length === 0 && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>이런 질문을 해 보세요</p>
            {EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => { setQuestion(ex); setGuidance(null) }}
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

      {history.map((item, index) => <AnswerCard key={item.id} item={item} answerRef={index === 0 ? latestAnswer : undefined} />)}
    </div>
  )
}
