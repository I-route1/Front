import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const API  = 'http://localhost:8080'

const fetchToken = async (username, password) => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  return res.json()
}

const injectAndLoad = async (page, tokenData, role, path, waitMs = 3000) => {
  // 부모 계정일 경우 자녀 정보 로드
  let children = []
  if (role === 'PARENT') {
    try {
      const childRes = await fetch(`${API}/api/students/my-children`, {
        headers: { Authorization: `Bearer ${tokenData.accessToken}` }
      })
      if (childRes.ok) {
        const childData = await childRes.json()
        children = (Array.isArray(childData) ? childData : []).map(c => ({
          id: c.studentId,
          name: c.name,
          gradeStudentId: c.gradeStudentId,
          grade: c.grade ?? '',
        }))
      }
    } catch {}
  }

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(({ d, r, kids }) => {
    sessionStorage.setItem('i-route-user', JSON.stringify({
      id: d.userId, name: d.nickname, nickname: d.nickname,
      role: r, token: d.accessToken, refreshToken: d.refreshToken, username: r,
      children: kids,
    }))
  }, { d: tokenData, r: role, kids: children })
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(waitMs)
}

;(async () => {
  console.log('🚀 AI 기능 통합 테스트 시작\n')

  const [parentToken, academyToken] = await Promise.all([
    fetchToken('frontdev', 'Test1234!'),
    fetchToken('teacher', 'Teacher1234!'),
  ])

  console.log('✅ 로그인 토큰 획득')
  console.log(`  부모 userId: ${parentToken.userId}`)
  console.log(`  학원 userId: ${academyToken.userId}`)

  const browser = await chromium.launch({ headless: true })

  // ════════ [1] 부모 - Learning 페이지 탭 접근성 ════════
  console.log('\n════════ [1] 부모 계정 - Learning 페이지 ════════')
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })

    await injectAndLoad(page, parentToken, 'PARENT', '/learning?tab=counseling')

    const pageText = await page.locator('body').innerText()
    const hasContent = pageText.length > 100

    console.log(`  📄 페이지 로드: ${hasContent ? '✅' : '❌'}`)
    console.log(`  📏 콘텐츠 길이: ${pageText.length}자`)

    // 탭 버튼들 확인
    const tabs = await page.locator('button').allInnerTexts()
    const tabNames = ['성적', '패턴', '추천', '예측', 'AI']
    const foundTabs = tabNames.filter(t => tabs.some(b => b.includes(t)))
    console.log(`  🔘 탭 ${foundTabs.length}/${tabNames.length}개 감지 (${foundTabs.join(', ')})`)

    // AI 리포트 카드들 확인
    const hasReportCards = pageText.includes('AI 맞춤') || pageText.includes('복습') || pageText.includes('리포트')
    console.log(`  🎯 AI 리포트 카드: ${hasReportCards ? '✅' : '❌'}`)

    // 자녀 정보 확인 (김철수)
    const hasChildName = pageText.includes('김') || pageText.includes('철수')
    console.log(`  👶 자녀 정보: ${hasChildName ? '✅ 표시됨' : '⚠️ 미표시'}`)

    if (errs.length) {
      console.log(`  ❌ 콘솔 에러 ${errs.length}건:`)
      errs.slice(0, 3).forEach(e => console.log(`     ${e.split('\n')[0]}`))
    } else {
      console.log(`  ✅ 콘솔 에러 없음`)
    }

    await ctx.close()
  }

  // ════════ [2] 학원 계정 - Admin Learning ════════
  console.log('\n════════ [2] 학원 계정 - Admin Learning ════════')
  {
    const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } })
    const page = await ctx.newPage()

    await injectAndLoad(page, academyToken, 'ACADEMY', '/admin/learning?tab=overview')

    const pageText = await page.locator('body').innerText()
    const hasContent = pageText.length > 100

    console.log(`  📄 페이지 로드: ${hasContent ? '✅' : '❌'}`)
    console.log(`  📏 콘텐츠 길이: ${pageText.length}자`)

    // 학원 계정 기능들 확인
    const hasTabs = pageText.includes('성적') || pageText.includes('패턴')
    const hasRisk = pageText.includes('위험') || pageText.includes('분석')
    console.log(`  📊 탭 표시: ${hasTabs ? '✅' : '❌'}`)
    console.log(`  ⚠️ 위험도 분석: ${hasRisk ? '✅' : '⚠️'}`)

    await ctx.close()
  }

  // ════════ [3] API 직접 테스트 ════════
  console.log('\n════════ [3] AI API 응답 검증 ════════')
  {
    // 성적 데이터 확인 (S-0001 = 김철수)
    const grades = await fetch('http://localhost:8080/api/grades/S-0001', {
      headers: { Authorization: 'Bearer ' + parentToken.accessToken }
    }).then(r => r.json())

    console.log(`  📚 성적 데이터:`)
    console.log(`     건수: ${Array.isArray(grades) ? grades.length : 0}건`)
    if (Array.isArray(grades) && grades.length > 0) {
      const subjects = [...new Set(grades.map(g => g.subject))]
      console.log(`     과목: ${subjects.join(', ')}`)
    }

    // 예측 점수
    const predict = await fetch('http://localhost:8080/api/analysis/predict?studentId=1&subjectId=1', {
      headers: { Authorization: 'Bearer ' + academyToken.accessToken }
    }).then(r => r.json()).catch(e => null)

    console.log(`  🎯 AI 예측:`)
    if (predict) {
      console.log(`     범위: ${predict.expectedScoreMin}~${predict.expectedScoreMax}점`)
      console.log(`     달성확률: ${predict.achievementProbability}%`)
    } else {
      console.log(`     ⚠️ 데이터 없음`)
    }

    // 과목별 추천
    const recommend = await fetch('http://localhost:8080/api/ai/report/subject-recommend?studentId=1&subject=수학', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + parentToken.accessToken }
    }).then(r => r.json()).catch(e => null)

    console.log(`  🤖 AI 추천:`)
    if (recommend?.aiRecommendationReport) {
      const lines = recommend.aiRecommendationReport.split('\n').slice(0, 3)
      console.log(`     개념: ${recommend.targetConcept}`)
      console.log(`     요약: ${lines[0]?.slice(0, 50)}...`)
    } else {
      console.log(`     ⚠️ 데이터 없음`)
    }
  }

  await browser.close()
  console.log('\n✅ AI 기능 테스트 완료')
})()
