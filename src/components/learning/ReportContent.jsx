import { mathLines, mathToHtml, KATEX_CSS_LINK } from '@/components/common/MathText'
import './generatedContent.css'

// Model output and historical reports are plain text. Only fixed markup from this
// renderer enters the HTML; mathToHtml escapes all text outside KaTeX delimiters.
function reportBody(text) {
  const blocks = []
  let list = ''
  const closeList = () => {
    if (list) blocks.push('</' + list + '>')
    list = ''
  }
  for (const raw of mathLines(text)) {
    const line = raw.trim()
    const step = /^(\d{1,3})(단계\s*[—–\-:.]|[.)])\s+([\s\S]+)$/.exec(line)
    const bullet = /^[●•-]\s+([\s\S]+)$/.exec(line)
    const listType = step ? 'ol' : bullet ? 'ul' : ''
    if (list !== listType) {
      closeList()
      if (listType) {
        list = listType
        blocks.push('<' + list + ' role="list">')
      }
    }
    if (!line) continue
    if (step) {
      const marker = step[2].startsWith('단계') ? step[1] + '단계' : step[1] + '.'
      blocks.push('<li value="' + Number(step[1]) + '"><strong class="study-step">' + marker
        + '</strong> ' + mathToHtml(step[3]) + '</li>')
    } else if (bullet) {
      blocks.push('<li>' + mathToHtml(bullet[1]) + '</li>')
    } else {
      // Intervals such as [0, 1] are content, not headings.
      const heading = /^\[([가-힣A-Za-z][^\]\n]{0,99})\]$/.exec(line)
      blocks.push(heading ? '<h4>' + mathToHtml(heading[1]) + '</h4>' : '<p>' + mathToHtml(line) + '</p>')
    }
  }
  closeList()
  return blocks.join('')
}

export default function ReportContent({ title, text }) {
  return (
    <section className="study-report" aria-label={title}>
      <h3>{title}</h3>
      <div className="study-report__body" dangerouslySetInnerHTML={{ __html: reportBody(text) }} />
    </section>
  )
}

export function printTextReport(reportType, result) {
  const win = window.open('', '_blank')
  if (!win) return
  const title = result.title || reportType.title
  const sections = [
    ['분석 결과', result.careerAnalysis || result.summary || result.analysis],
    ['AI 추천 리포트', result.aiRecommendationReport],
    ['학습 가이드', result.learningGuide || result.guide || result.recommend],
  ]
  const date = result._generatedAt || new Date().toLocaleDateString('ko-KR')
  const html = [
    '<!doctype html><html lang="ko"><head><meta charset="utf-8">',
    '<title>' + mathToHtml(title) + '</title>', KATEX_CSS_LINK,
    '<style>body{font:10.5pt/1.65 sans-serif;color:#14263c;max-width:46rem;margin:2rem auto;padding:0 1rem;overflow-wrap:anywhere}h1{font-size:18pt}h2{margin:1.8rem 0 .5rem;padding-bottom:.25rem;border-bottom:1px solid #bbc5d1;font-size:14pt}h3,h4{margin:.8rem 0 .3rem}h1,h2,h4{break-after:avoid}p,li{margin:.35rem 0}ol{list-style:none;padding:0}ul{padding-inline-start:1.2rem}li{break-inside:avoid}.study-step{margin-inline-end:.3rem}</style></head><body>',
    '<h1>' + mathToHtml(title) + '</h1>', '<p>생성일 ' + mathToHtml(date) + '</p>',
  ]
  if (result.targetConcept) html.push('<p>' + mathToHtml(result.targetConcept) + '</p>')
  for (const [label, text] of sections) {
    if (text) html.push('<section><h2>' + label + '</h2>' + reportBody(text) + '</section>')
  }
  html.push('</body></html>')
  win.document.write(html.join(''))
  win.document.close()
  const print = async () => {
    await win.document.fonts.ready
    if (!win.closed) {
      win.focus()
      win.print()
    }
  }
  if (win.document.readyState === 'complete') print()
  else win.addEventListener('load', print, { once: true })
}
