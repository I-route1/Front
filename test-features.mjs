import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3000'
const API  = 'http://localhost:8080'
const SS_DIR = './screenshots'
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR)

const shot = async (page, name) => {
  await page.screenshot({ path: `${SS_DIR}/${name}.png`, fullPage: true })
  console.log(`  📸 ${name}`)
}

// 백엔드에서 실제 토큰 발급
const fetchToken = async (username, password) => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(`로그인 실패: ${res.status}`)
  return res.json()
}

// 실제 토큰을 sessionStorage에 주입하고 해당 페이지로 이동
const loginAndGo = async (page, tokenData, username, role, path = '/home') => {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ data, uname, r }) => {
    sessionStorage.setItem('i-route-user', JSON.stringify({
      id: data.userId,
      name: data.nickname,
      nickname: data.nickname,
      role: r,
      token: data.accessToken,
      refreshToken: data.refreshToken,
      username: uname,
    }))
  }, { data: tokenData, uname: username, r: role })
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  console.log(`  이동 후 URL: ${page.url()}`)
}

;(async () => {
  // ── 토큰 발급 ──
  console.log('토큰 발급 중...')
  const [academyToken, parentToken, adminToken] = await Promise.all([
    fetchToken('teacher', 'Teacher1234!'),
    fetchToken('frontdev', 'Test1234!'),
    fetchToken('admin', 'Admin1234!'),
  ])
  console.log(`  ✅ teacher  role=${academyToken.role}`)
  console.log(`  ✅ frontdev role=${parentToken.role}`)
  console.log(`  ✅ admin    role=${adminToken.role}`)

  const browser = await chromium.launch({ headless: true })
  const allErrors = []

  // ══════════════════════════════════════════
  // [1] ACADEMY (teacher)
  // ══════════════════════════════════════════
  console.log('\n════════ [1] ACADEMY (teacher) ════════')
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    page.on('pageerror', e => errs.push(e.message))

    await loginAndGo(page, academyToken, 'teacher', 'ACADEMY', '/admin/learning')
    await shot(page, 'A01_admin_learning')

    const tabBtns = await page.locator('button').allInnerTexts()
    console.log(`  탭: ${tabBtns.filter(t => t.trim()).join(' | ')}`)

    // 각 탭 순회
    for (const [label, key] of [
      ['개요', 'A02_overview'], ['학생', 'A03_students'],
      ['성적 등록', 'A04_grade_register'], ['피드백', 'A05_feedback'],
    ]) {
      const btn = page.locator('button').filter({ hasText: new RegExp(`^${label}`) }).first()
      if (await btn.count()) {
        await btn.click(); await page.waitForTimeout(2000)
        await shot(page, key)
        const bodyText = await page.locator('body').innerText()
        console.log(`  ${bodyText.length > 200 ? '✅' : '⚠️'} ${label} 탭 (${bodyText.length}자)`)
      } else {
        console.log(`  ⚠️ ${label} 탭 없음`)
      }
    }

    // 학생 상세 — 서브탭
    console.log('\n  [학생 상세 AI 서브탭]')
    const studBtn = page.locator('button').filter({ hasText: /^학생/ }).first()
    if (await studBtn.count()) {
      await studBtn.click(); await page.waitForTimeout(2000)
      // 테이블 행 또는 카드 클릭
      const row = page.locator('tr:not(:first-child), [class*="student"], [class*="row"]').first()
      if (await row.count()) {
        await row.click().catch(() => {})
        await page.waitForTimeout(2000)
        await shot(page, 'A06_student_detail')
        console.log('  ✅ 학생 상세 진입')
        const subBtns = await page.locator('button').allInnerTexts()
        console.log(`  서브탭: ${subBtns.filter(t => t.trim()).join(' | ')}`)

        for (const [label, key] of [
          ['성적', 'A07_grade'], ['예측', 'A08_predict'],
          ['패턴', 'A09_pattern'], ['강점', 'A10_strength'], ['리포트', 'A11_report'],
        ]) {
          const sub = page.locator('button').filter({ hasText: new RegExp(label) }).first()
          if (await sub.count()) {
            await sub.click(); await page.waitForTimeout(2000)
            await shot(page, key)
            const txt = await page.locator('body').innerText()
            console.log(`  ${txt.length > 200 ? '✅' : '⚠️'} 학생 ${label} 탭`)
          }
        }
      } else {
        await shot(page, 'A06_students_list')
        console.log('  ⚠️ 학생 행 없음 — 데이터 없거나 셀렉터 미매칭')
      }
    }

    // 출결
    console.log('\n  [출결 — 학원]')
    await loginAndGo(page, academyToken, 'teacher', 'ACADEMY', '/attendance')
    await shot(page, 'A12_attendance')
    const attText = await page.locator('body').innerText()
    console.log(`  출결 내용: ${attText.includes('출결') || attText.includes('NFC') ? '✅' : '❌'}`)

    // 결제
    console.log('\n  [결제]')
    await loginAndGo(page, academyToken, 'teacher', 'ACADEMY', '/payment')
    await shot(page, 'A13_payment')
    const payText = await page.locator('body').innerText()
    console.log(`  요금제 노출: ${payText.includes('요금제') || payText.includes('베이직') || payText.includes('프리미엄') ? '✅' : '⚠️ ' + payText.slice(0, 80)}`)

    await loginAndGo(page, academyToken, 'teacher', 'ACADEMY', '/payment/history')
    await shot(page, 'A14_payment_history')
    const histText = await page.locator('body').innerText()
    console.log(`  결제 내역: ${histText.includes('결제') ? '✅' : '⚠️'}`)

    allErrors.push(...errs.map(e => `[ACADEMY] ${e}`))
    await ctx.close()
  }

  // ══════════════════════════════════════════
  // [2] PARENT (frontdev)
  // ══════════════════════════════════════════
  console.log('\n════════ [2] PARENT (frontdev) ════════')
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
    page.on('pageerror', e => errs.push(e.message))

    await loginAndGo(page, parentToken, 'frontdev', 'PARENT', '/home')
    await shot(page, 'P01_home')

    // 학습/AI
    console.log('\n  [학습/AI]')
    await loginAndGo(page, parentToken, 'frontdev', 'PARENT', '/learning')
    await shot(page, 'P02_learning')
    const learningBtns = await page.locator('button').allInnerTexts()
    console.log(`  탭: ${learningBtns.filter(t => t.trim()).join(' | ')}`)

    for (const [label, key] of [
      ['예측', 'P03_predict'], ['패턴', 'P04_pattern'],
      ['추천', 'P05_suggest'], ['상담', 'P06_counsel'], ['로드맵', 'P07_roadmap'],
    ]) {
      const btn = page.locator('button').filter({ hasText: new RegExp(label) }).first()
      if (await btn.count()) {
        await btn.click(); await page.waitForTimeout(2000)
        await shot(page, key)
        const txt = await page.locator('body').innerText()
        console.log(`  ${txt.length > 200 ? '✅' : '⚠️'} ${label} 탭 (${txt.length}자)`)
      } else {
        console.log(`  ⚠️ ${label} 탭 없음`)
      }
    }

    // 출결
    console.log('\n  [출결 — 학부모]')
    await loginAndGo(page, parentToken, 'frontdev', 'PARENT', '/attendance')
    await shot(page, 'P08_attendance')
    const attText = await page.locator('body').innerText()
    console.log(`  출결 내용: ${attText.includes('출결') || attText.includes('출석') ? '✅' : '❌'}`)

    // 결제
    console.log('\n  [결제]')
    await loginAndGo(page, parentToken, 'frontdev', 'PARENT', '/payment')
    await shot(page, 'P09_payment')
    const payText = await page.locator('body').innerText()
    console.log(`  요금제: ${payText.includes('요금제') || payText.includes('베이직') ? '✅' : '⚠️'}`)

    await loginAndGo(page, parentToken, 'frontdev', 'PARENT', '/payment/history')
    await shot(page, 'P10_payment_history')
    const histText = await page.locator('body').innerText()
    console.log(`  결제 내역: ${histText.includes('결제') ? '✅' : '⚠️'}`)

    allErrors.push(...errs.map(e => `[PARENT] ${e}`))
    await ctx.close()
  }

  // ══════════════════════════════════════════
  // [3] ADMIN
  // ══════════════════════════════════════════
  console.log('\n════════ [3] ADMIN ════════')
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })

    await loginAndGo(page, adminToken, 'admin', 'ADMIN', '/admin/learning')
    await shot(page, 'AD01_admin_learning')
    console.log(`  URL: ${page.url()}`)

    await loginAndGo(page, adminToken, 'admin', 'ADMIN', '/attendance')
    await shot(page, 'AD02_attendance')
    console.log(`  출결 URL: ${page.url()}`)

    allErrors.push(...errs.map(e => `[ADMIN] ${e}`))
    await ctx.close()
  }

  // ══════════════════════════════════════════
  // 에러 요약
  // ══════════════════════════════════════════
  console.log('\n════════ 에러 요약 ════════')
  const filtered = allErrors.filter(e =>
    !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('400')
  )
  if (filtered.length === 0) {
    console.log('  ✅ 주요 에러 없음')
  } else {
    filtered.slice(0, 20).forEach(e => console.log(`  ❌ ${e}`))
  }

  await browser.close()
  console.log('\n✅ 전체 테스트 완료 — 스크린샷: ./screenshots/')
})()
