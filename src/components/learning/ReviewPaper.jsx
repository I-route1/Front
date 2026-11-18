import MathText, { KATEX_CSS_LINK, mathToHtml } from '@/components/common/MathText'
import './ReviewPaper.css'

function parseQuestion(raw) {
  if (raw && typeof raw === 'object') {
    return { question: String(raw.question ?? ''), answer: String(raw.answer ?? '') }
  }
  const text = String(raw ?? '').trim().replace(/^질문\s*[:：]\s*/, '')
  const label = /(?:^|\r?\n)\s*(?:답변|정답)\s*[:：]\s*/.exec(text)
  if (!label) return { question: text, answer: '' }
  return { question: text.slice(0, label.index).trim(), answer: text.slice(label.index + label[0].length).trim() }
}

export function reviewQuestions(result) {
  const rows = result.questions || result.problems
  return Array.isArray(rows) ? rows.map(parseQuestion).filter(row => row.question.trim()) : []
}

export function printReviewPaper(result) {
  const rows = reviewQuestions(result)
  if (!rows.length) return
  const popup = window.open('', '_blank')
  if (!popup) {
    window.alert('인쇄 창을 열려면 브라우저에서 팝업을 허용해 주세요.')
    return
  }
  const topics = (result.weakConcepts || []).filter(Boolean).map(mathToHtml).join(' · ')
  const answers = rows.map(({ answer }, index) => answer
    ? `<li value="${index + 1}">${mathToHtml(answer)}</li>` : '').join('')
  const questionList = rows.map(({ question }) =>
    `<li>${mathToHtml(question)}<div class="writing-space"></div></li>`).join('')
  popup.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>맞춤 복습 시험지</title>
    ${KATEX_CSS_LINK}<style>
    @page { size: auto; margin: 18mm; }
    body { max-width: 180mm; margin: auto; font: 11pt/1.65 "Malgun Gothic", sans-serif; color: #182332; }
    h1, h2 { font-size: 19pt; margin: 0 0 4mm; } .meta { color: #44536a; }
    ol { padding-left: 2em; } li { padding: 2mm 0 3mm 2mm; white-space: pre-wrap; overflow-wrap: anywhere; break-inside: avoid; }
    li::marker { font-weight: bold; } .writing-space { height: 16mm; border-bottom: 1px solid #9eaaba; }
    .answer-key { break-before: page; page-break-before: always; }
    </style></head><body><h1>맞춤 복습 시험지</h1>
    <p class="meta">총 ${rows.length}문제${topics ? ' · ' + topics : ''}</p>
    <ol>${questionList}</ol>${answers ? '<section class="answer-key"><h2>정답지</h2><ol>' + answers + '</ol></section>' : ''}
    </body></html>`)
  popup.document.close()
  const print = () => popup.document.fonts.ready.then(() => { if (!popup.closed) { popup.focus(); popup.print() } })
  if (popup.document.readyState === 'complete') print()
  else popup.addEventListener('load', print, { once: true })
}

export default function ReviewPaper({ result }) {
  const rows = reviewQuestions(result)
  const topics = (result.weakConcepts || []).filter(Boolean)
  if (!rows.length) return <p className="review-paper-empty">이 단원에 준비된 복습 문제가 없습니다.</p>
  return (
    <section className="review-paper" aria-label="복습 문제">
      <header><strong>복습 문제</strong><span>총 {rows.length}문제</span></header>
      {topics.length > 0 && <p className="review-paper-topics">복습 개념 · {topics.join(' · ')}</p>}
      <ol>
        {rows.map(({ question, answer }, index) => (
          <li key={index}>
            <div className="review-paper-question"><MathText text={question} /></div>
            {answer && <details><summary aria-label={`${index + 1}번 정답 확인`}>정답 확인</summary>
              <div className="review-paper-answer"><MathText text={answer} /></div>
            </details>}
          </li>
        ))}
      </ol>
    </section>
  )
}
