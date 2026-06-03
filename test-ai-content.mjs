import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const API  = 'http://localhost:8080'
const SS   = './screenshots/ai-content'
if (!fs.existsSync(SS)) fs.mkdirSync(SS, { recursive: true })

const shot = async (page, name) => page.screenshot({ path: `${SS}/${name}.png`, fullPage: true })

const fetchToken = async (u, p) => {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: u, password: p }),
  })
  return r.json()
}

const inject = async (page, tok, role, path) => {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ d, r }) => {
    sessionStorage.setItem('i-route-user', JSON.stringify({
      id: d.userId, name: d.nickname, nickname: d.nickname,
      role: r, token: d.accessToken, refreshToken: d.refreshToken, username: r,
    }))
  }, { d: tok, r: role })
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2500)
}

const section = (title) => console.log(`\n${'─'.repeat(50)}\n  ${title}\n${'─'.repeat(50)}`)

;(async () => {
  const [pt, at] = await Promise.all([
    fetchToken('frontdev', 'Test1234!'),
    fetchToken('teacher', 'Teacher1234!'),
  ])
  const browser = await chromium.launch({ headless: true })

  // ══════════════════════════════════════
  // [A] 백엔드 API 응답 품질 직접 검증
  // ══════════════════════════════════════
  section('A. 백엔드 API 응답 내용 직접 검증')

  // A-1. /api/ai/predict — 다양한 입력값으로 결과 확인
  console.log('\n  [A-1] /api/ai/predict 입력별 결과')
  for (const [avg, hours] of [[50,1],[70,2],[83,2],[90,3],[95,1]]) {
    const r = await fetch(`${API}/api/ai/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pt.accessToken}` },
      body: JSON.stringify({ past_score_avg: avg, study_hours_per_day: hours }),
    })
    const d = await r.json()
    console.log(`  평균 ${avg}점 + ${hours}h/일 → 예측 ${d.expected_score}점 | ${d.message}`)
  }

  // A-2. /api/analysis/predict — 학생별/과목별 예측
  console.log('\n  [A-2] /api/analysis/predict (DB 기반, 학생 ID · 과목 ID)')
  for (const [sid, subid] of [[1,1],[1,2],[2,1]]) {
    const r = await fetch(`${API}/api/analysis/predict?studentId=${sid}&subjectId=${subid}`, {
      headers: { Authorization: `Bearer ${at.accessToken}` },
    })
    if (r.ok) {
      const d = await r.json()
      console.log(`  학생 ${sid} / 과목 ${subid} → ${d.expectedScoreMin}~${d.expectedScoreMax}점 (달성확률 ${d.achievementProbability}%)`)
    } else {
      console.log(`  학생 ${sid} / 과목 ${subid} → ${r.status} (데이터 없음)`)
    }
  }

  // A-3. /api/ai/report/subject-recommend — 과목별 결과 품질
  console.log('\n  [A-3] /api/ai/report/subject-recommend 과목별 결과')
  for (const subject of ['수학', '영어', '국어']) {
    const r = await fetch(`${API}/api/ai/report/subject-recommend?studentId=14&subject=${encodeURIComponent(subject)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${pt.accessToken}` },
    })
    const d = await r.json()
    console.log(`\n  [${subject}]`)
    console.log(`  targetConcept: ${d.targetConcept}`)
    console.log(`  리포트:\n${d.aiRecommendationReport?.split('\n').map(l=>'    '+l).join('\n')}`)
  }

  // A-4. /api/analysis/risk — 실제 학생 데이터 기반
  console.log('\n  [A-4] /api/analysis/risk 학생별 위험도')
  for (const sid of ['1','2','3','S-0001']) {
    const r = await fetch(`${API}/api/analysis/risk?studentId=${sid}`, {
      headers: { Authorization: `Bearer ${at.accessToken}` },
    })
    const d = await r.json()
    console.log(`  학생 ${sid}: atRisk=${d.atRisk}, level=${d.riskLevel}, ${d.riskSummary}`)
  }

  // A-5. /api/analysis/study-pattern-v2 — 골든타임 분석
  console.log('\n  [A-5] /api/analysis/study-pattern-v2')
  for (const sid of ['1','14']) {
    const r = await fetch(`${API}/api/analysis/study-pattern-v2?studentId=${sid}`, {
      headers: { Authorization: `Bearer ${at.accessToken}` },
    })
    if (r.ok) {
      const d = await r.json()
      console.log(`  학생 ${sid}: 골든타임 ${d.goldenHour ?? '-'}시, 주 학습과목 ${d.primarySubject ?? '-'}`)
    } else {
      console.log(`  학생 ${sid}: ${r.status}`)
    }
  }

  // A-6. /api/recommendations/materials — 자료 추천 품질
  console.log('\n  [A-6] /api/recommendations/materials (학생 Long ID)')
  for (const sid of [1,2]) {
    const r = await fetch(`${API}/api/recommendations/materials?studentId=${sid}`, {
      headers: { Authorization: `Bearer ${at.accessToken}` },
    })
    if (r.ok) {
      const data = await r.json()
      console.log(`  학생 ${sid}: ${data.length}건 추천`)
      data.slice(0,2).forEach(m => console.log(`    - ${m.title} (${m.materialType}) | ${m.matchReason}`))
    } else {
      const t = await r.text()
      console.log(`  학생 ${sid}: ${r.status} — ${t.slice(0,80)}`)
    }
  }

  // ══════════════════════════════════════
  // [B] 프론트 화면 AI 탭 내용 캡처
  // ══════════════════════════════════════
  section('B. 프론트 화면 AI 탭 내용 품질')
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()

    await inject(page, pt, 'PARENT', '/learning')

    for (const [label, key] of [
      ['성적', 'grade'], ['학습 패턴', 'pattern'],
      ['맞춤 추천', 'suggest'], ['성장 예측', 'predict'], ['AI 리포트', 'report'],
    ]) {
      const btn = page.locator('button').filter({ hasText: new RegExp(label) }).first()
      if (await btn.count()) {
        await btn.click()
        await page.waitForTimeout(2500)
        await shot(page, `B_${key}`)

        const raw = await page.locator('body').innerText()
        // 의미 있는 텍스트만 추출
        const lines = raw.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 3 && !l.match(/^[📊🧠📚🎯🌱➡️←]+$/))
          .slice(0, 20)

        console.log(`\n  [${label} 탭]`)
        lines.forEach(l => console.log(`    ${l}`))

        // 기능 적합성 체크
        const checks = {
          '성적':      ['점', '과목', '등급'],
          '학습 패턴': ['시간', '학습', '집중'],
          '맞춤 추천': ['추천', '자료', '학습'],
          '성장 예측': ['예측', '점', '목표'],
          'AI 리포트': ['AI', '추천', '리포트'],
        }
        const keywords = checks[label] || []
        const passed = keywords.filter(k => raw.includes(k))
        console.log(`  적합성: ${passed.length}/${keywords.length} 키워드 포함 (${passed.join(', ')})`)
      }
    }
    await ctx.close()
  }

  await browser.close()
  console.log('\n\n✅ AI 기능 내용 검증 완료')
})()
