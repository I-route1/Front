import katex from 'katex'
import 'katex/dist/katex.min.css'

// AI 리포트 본문은 평문인데, 수학 개념 설명에는 LaTeX 수식이 섞여 온다
// ($\frac{a}{b}$, $$\int_a^b f(x)dx$$, \begin{pmatrix}…). 수식 부분만 KaTeX로 그리고
// 나머지 글은 그대로 둔다. 잘못된 수식은 throwOnError:false라 원문이 빨간 글씨로 보인다.
const MATH = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g

export function splitMath(text) {
  const parts = []
  let last = 0
  for (const m of String(text ?? '').matchAll(MATH)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) })
    const display = m[1] !== undefined || m[2] !== undefined
    parts.push({ tex: (m[1] ?? m[2] ?? m[3] ?? m[4]).trim(), display })
    last = m.index + m[0].length
  }
  if (last < String(text ?? '').length) parts.push({ text: String(text).slice(last) })
  return parts
}

function renderTex(tex, display) {
  // strict:'ignore' — 모델이 display 수식 안에 \\ 줄바꿈을 자주 넣어 콘솔 경고가 쌓인다
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'html' })
}

export default function MathText({ text }) {
  return splitMath(text).map((p, i) =>
    p.tex === undefined
      ? <span key={i}>{p.text}</span>
      : <span key={i} dangerouslySetInnerHTML={{ __html: renderTex(p.tex, p.display) }} />
  )
}

const escapeHtml = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// 인쇄 창(window.open) HTML용. 글은 이스케이프하고 수식은 KaTeX HTML로 바꾼다.
// 인쇄 창에는 앱의 CSS가 없으니 KATEX_CSS_LINK를 <head>에 넣어야 한다.
export function mathToHtml(text) {
  return splitMath(text).map(p => (p.tex === undefined ? escapeHtml(p.text) : renderTex(p.tex, p.display))).join('')
}

export const KATEX_CSS_LINK =
  `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@${katex.version}/dist/katex.min.css">`
