// 서버/학생 데이터는 이 프로세스 안의 fixtures만 사용한다. 운영 서버에는 요청하지 않는다.
import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'

const BASE = 'http://127.0.0.1:4178'
let server, browser
let serverOutput = ''
const children = [{ studentId: 14, id: 914, name: '연결검증학생', grade: '중1' },
  { studentId: 15, id: 915, name: '다른학생', grade: '중2' }]
const wrong = [{ id: 1, studentId: 14, subject: '국어', questionId: '국어-1', conceptTag: '받침', errorType: 'MEMORIZATION_GAP', failCount: 2, createdAt: '2026-11-04T10:00:00' },
  { id: 2, studentId: 14, subject: '수학', questionId: '수학-1', conceptTag: '함수', errorType: 'CONCEPT_GAP', failCount: 1 }]
const ocr = [{ id: 1, studentId: 14, subject: '국어', totalQuestions: 2, correctCount: 1, gradedAt: '2026-11-04T01:00:00Z', questions: [
  { questionId: '국어-1', expectedAnswer: '돼지', recognizedText: '되지', correct: false, similarity: 0.5, conceptTag: '받침' },
  { questionId: '국어-2', expectedAnswer: '수박', recognizedText: '수박', correct: true, similarity: 1, conceptTag: '명사' },
] }]
const camera = { id: 1, subject: '국어', studyDate: '2026-11-04', studyStartTime: '10:00:00', studyDurationMinutes: 30,
  concentrationScore: 5, understandingScore: 4, measurementSource: 'CAMERA', focusedRatio: 1, drowsyRatio: 0 }

before(async () => {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4178', '--strictPort'], {
    cwd: process.cwd(), env: { ...process.env, VITE_API_URL: BASE }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout.on('data', chunk => { serverOutput += chunk })
  server.stderr.on('data', chunk => { serverOutput += chunk })
  const deadline = Date.now() + 30_000
  while (true) {
    try { if ((await fetch(BASE)).ok) break } catch {}
    if (Date.now() > deadline) throw new Error(`Vite startup failed: ${serverOutput}`)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined })
  await mkdir('test-results', { recursive: true })
})
after(async () => { await browser?.close(); server?.kill() })

async function openPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  // 지도 SDK·외부 폰트가 테스트 시작을 막거나 외부 서버로 요청하지 않게 한다.
  await context.route('**/*', route => new URL(route.request().url()).origin === BASE
    ? route.continue()
    : route.fulfill({ status: 200, contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'application/javascript', body: '' }))
  const page = await context.newPage()
  page.setDefaultTimeout(10_000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const state = { requests: [], activities: options.camera ? [camera] : [], fail: false, ...options }
  await context.addInitScript(role => {
    sessionStorage.setItem('i-route-user', JSON.stringify({ id: 700, name: '테스트 계정', role, token: 'test-token', refreshToken: 'test-refresh', children: [] }))
  }, options.role || 'PARENT')
  await page.route(`${BASE}/api/**`, async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname
    state.requests.push({ path, query: url.search, method: req.method(), body: req.postDataJSON(), auth: req.headers().authorization })
    const respond = (json, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(json) })
    if (path === '/api/auth/token/refresh') return respond({ accessToken: 'renewed' })
    if (path === '/api/students/my-children' || path === '/api/students/academy/students') return respond(children)
    if (path.startsWith('/api/wrong-answer/')) {
      if (state.delay && path.endsWith('/14')) await state.delay
      if (state.fail) return respond({ error: '오답 서버 응답 실패' }, 503)
      return respond(path.endsWith('/14') && !state.empty ? (state.wrong || wrong) : [])
    }
    if (path.startsWith('/api/gps/attendance/students/')) {
      if (state.expiredAttendance && req.headers().authorization === 'Bearer test-token') return respond({}, 401)
      if (state.attendanceStatus) return respond({ error: '접근 권한이 없습니다.' }, state.attendanceStatus)
      if (state.attendanceFail) return respond({ error: '출결 서버 오류' }, 500)
      return respond((state.attendance || {})[path.split('/').pop()] || [])
    }
    if (path === '/api/ai/predict') {
      if (!state.predict) return respond({ error: 'AI 서버 꺼짐' }, 503)
      return respond(state.predict)
    }
    if (path === '/api/ocr-results') {
      if (state.delay && url.searchParams.get('studentId') === '14') await state.delay
      return respond(url.searchParams.get('studentId') === '14' && !state.empty ? (state.ocr || ocr) : [])
    }
    if (path === '/api/activities' && req.method() === 'POST') {
      if (state.expiredSave && req.headers().authorization === 'Bearer test-token') return respond({}, 401)
      if (state.saveDelay) await state.saveDelay
      if (state.failSave) return respond({ error: '일시적인 저장 오류입니다.' }, 503)
      if (state.saveStatus) return respond({ error: '학생 기록에 접근할 수 없습니다.' }, state.saveStatus)
      if ('saveResponse' in state) return respond(state.saveResponse)
      const body = req.postDataJSON()
      const existing = state.activities.find(a => a.submissionId === body.submissionId)
      if (existing) return respond(existing)
      const saved = { ...body, id: state.activities.length + 10 }
      state.activities.push(saved)
      if (state.loseSaveResponse) { state.loseSaveResponse = false; return route.abort('connectionreset') }
      return respond(saved)
    }
    if (path.startsWith('/api/activities/') && state.failActivities) return respond({ error: '학습 기록 서버 응답 실패' }, 503)
    if (path.startsWith('/api/activities/')) return respond(state.activities.filter(a => Number(a.studentId ?? 14) === Number(path.split('/').at(-1))))
    if (path === '/api/analysis/meta-cognition') return state.metaResponse
      ? respond(state.metaResponse) : respond({ error: '분석 데이터가 부족합니다.' }, 400)
    if (path.includes('study-pattern')) return respond({ goldenTime: '데이터 없음', subjectStudyMinutes: {} })
    if (path.includes('strengths')) return respond({ strongSubjectIds: [] })
    if (path.includes('risk')) return respond({ atRisk: false })
    if (path.startsWith('/api/grades/')) return respond(path.endsWith('/14') ? (state.grades || []) : [])
    return respond([])
  })
  return { page, context, state, errors }
}

test('학부모 성적 화면에서 학생별 오답·OCR 인식 글자·과목 필터를 사용한다', async () => {
  const { page, context, state, errors } = await openPage()
  try {
    await page.goto(`${BASE}/learning?tab=records`)
    const records = page.getByRole('region', { name: '오답 및 OCR 채점 기록' })
    await records.getByText('국어 · 국어-1', { exact: true }).waitFor()
    await records.getByText('국어 · 1 / 2문항 정답', { exact: true }).click()
    await records.getByText('되지', { exact: true }).waitFor()
    await records.getByText('돼지', { exact: true }).waitFor()
    await records.getByText('1번', { exact: false }).first().waitFor()
    const summary = records.getByLabel('오답·채점 한눈에 보기')
    await summary.getByText('최근 국어 채점에서 2문항 중 1문항을 맞혔어요.', { exact: true }).waitFor()
    await summary.getByText("'암기 부족' 유형의 오답이 가장 많아요.", { exact: true }).waitFor()
    await page.getByLabel('기록 과목').selectOption('수학')
    assert.equal(await records.getByText('국어 · 국어-1', { exact: true }).count(), 0)
    await records.getByText('수학 · 수학-1', { exact: true }).waitFor()
    assert(state.requests.some(r => r.path === '/api/wrong-answer/14' && r.auth === 'Bearer test-token'))
    assert(state.requests.some(r => r.path === '/api/ocr-results' && r.query === '?studentId=14'))
    assert(!state.requests.some(r => /914|700/.test(r.path)))
    assert.deepEqual(errors, [])
    await page.screenshot({ path: 'test-results/learning-records.png', fullPage: true })
  } finally { await context.close() }
})

test('직접 입력 자기평가 저장·재조회·메타인지 분석 실패를 처리한다', async () => {
  const { page, context, state, errors } = await openPage({ empty: true })
  try {
    await page.goto(`${BASE}/learning?tab=pattern`)
    await page.getByText('아직 집중도 기록이 없어요.', { exact: true }).waitFor()
    assert.equal(await page.getByRole('dialog', { name: '오늘 공부 기록하기' }).count(), 0)
    await page.getByRole('button', { name: '오늘 공부 기록하기', exact: true }).click()
    await page.waitForURL(/sheet=record/)
    await page.getByRole('dialog', { name: '오늘 공부 기록하기' }).waitFor()
    await page.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await page.getByText('학습일, 학습 시간(1분 이상), 이해도와 집중도를 입력해 주세요.', { exact: true }).waitFor()
    assert.equal(state.requests.filter(r => r.method === 'POST').length, 0)
    await page.getByRole('button', { name: '이해도 4점', exact: true }).click()
    await page.getByRole('button', { name: '집중도 3점', exact: true }).click()
    await page.getByLabel('학습 과목').selectOption('국어')
    await page.getByLabel('학습 시간 (분)').fill('25')
    await page.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await page.getByText('자기평가가 직접 입력 기록으로 저장되었습니다.', { exact: true }).waitFor()
    await page.getByText('최근 1회 · 카메라 측정 기록 없음', { exact: true }).waitFor()
    const post = state.requests.find(r => r.path === '/api/activities' && r.method === 'POST')
    assert.equal(post.body.studentId, 14)
    assert.equal(post.body.subject, '국어')
    assert.equal(post.body.studyDurationMinutes, 25)
    assert.equal(post.body.measurementSource, 'MANUAL')
    assert.equal(post.body.concentrationScore, 3)
    assert.equal(post.body.focusedRatio, undefined)
    await page.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await page.getByRole('button', { name: '🧠 AI 메타인지 분석', exact: true }).click()
    await page.getByRole('alert').getByText('분석 데이터가 부족합니다.', { exact: true }).waitFor()
    assert.equal(state.requests.filter(r => r.path === '/api/activities' && r.method === 'POST').length, 1)
    assert.deepEqual(errors, [])
    await page.screenshot({ path: 'test-results/attention-manual.png', fullPage: true })
  } finally { await context.close() }
})

test('학습 탭은 위쪽 탭 3개와 세그먼트로 이동하고 예전 주소도 새 위치로 연결한다', async () => {
  const { page, context, errors } = await openPage({ empty: true })
  try {
    const current = () => page.getByRole('navigation', { name: '학습 메뉴' }).locator('[aria-current="page"]')
    const selected = () => page.getByRole('tab', { selected: true })
    // 예전 주소: AI 리포트 탭 → AI 코칭 › 리포트
    await page.goto(`${BASE}/learning?tab=counseling`)
    assert.equal(await current().textContent(), 'AI 코칭')
    assert.equal(await selected().textContent(), '리포트')
    // 그룹 주소와 잘못된 주소
    await page.goto(`${BASE}/learning?tab=habit`)
    assert.equal(await current().textContent(), '공부 습관')
    assert.equal(await selected().textContent(), '집중도')
    await page.goto(`${BASE}/learning?tab=nope`)
    assert.equal(await current().textContent(), '성적')
    // 위쪽 탭은 3개만, 세그먼트로 화면 전환
    assert.equal(await page.getByRole('navigation', { name: '학습 메뉴' }).getByRole('button').count(), 3)
    await page.getByRole('button', { name: 'AI 코칭', exact: true }).click()
    await page.getByRole('tab', { name: '질문', exact: true }).click()
    await page.waitForURL(/tab=ask/)
    await page.getByRole('button', { name: '성적', exact: true }).click()
    await page.getByRole('tab', { name: '오답 · 채점', exact: true }).click()
    await page.waitForURL(/tab=records/)
    await page.getByRole('region', { name: '오답 및 OCR 채점 기록' }).waitFor()
    // 자녀는 이름 버튼으로 선택한다
    assert.equal(await page.getByRole('button', { name: '연결검증학생 · 중1', exact: true }).getAttribute('aria-pressed'), 'true')
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth > window.innerWidth), false)
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('성적 화면은 안 본 과목을 0점으로 계산하지 않고, 성적이 없으면 예시 점수 대신 안내를 보인다', async () => {
  const grades = [
    { subject: '수학', score: 66, examDate: '2025-09-11', examType: '9월모의고사' },
    { subject: '수학', score: 67, examDate: '2025-07-08', examType: '기말고사' },
    { subject: '국어', score: 70, examDate: '2025-07-08', examType: '기말고사' },
    { subject: '영어', score: 72, examDate: '2025-07-08', examType: '기말고사' },
    { subject: '국어', score: 68, examDate: '2025-05-10', examType: '중간고사' },
    { subject: '영어', score: 70, examDate: '2025-05-10', examType: '중간고사' },
  ]
  const { page, context, errors } = await openPage({ grades })
  try {
    await page.goto(`${BASE}/learning?tab=grade`)
    const summary = page.getByRole('region', { name: '성적 한눈에 보기' })
    await summary.getByText('국어가 지난 시험보다 2점 올랐어요.', { exact: true }).waitFor()
    await summary.getByText('수학이 1점 내려갔어요.', { exact: true }).waitFor()
    await summary.getByText('69점', { exact: true }).waitFor()
    await summary.getByText('최근 시험 · 2025.09.11 9월모의고사', { exact: true }).waitFor()
    assert.equal(await page.getByText('0점', { exact: true }).count(), 0)
    assert.equal(await page.getByRole('button', { name: '사회', exact: true }).count(), 0)
    // 성적이 없는 자녀에게는 예시 점수를 보여주지 않는다
    await page.getByRole('button', { name: '다른학생 · 중2', exact: true }).click()
    await page.getByText('아직 등록된 성적이 없어요.', { exact: false }).waitFor()
    assert.equal(await page.getByRole('region', { name: '성적 한눈에 보기' }).count(), 0)
    assert.equal(await page.getByText('📈 성적 추이', { exact: true }).count(), 0)
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('학부모 출결은 실제 자녀 목록과 인증 헤더로 조회하고, 실패해도 예시 자녀를 보여주지 않는다', async () => {
  const { page, context, state, errors } = await openPage({ attendance: {
    14: [{ attendanceId: 2, studentId: 14, studentName: '연결검증학생', busId: 1, eventType: 'BOARD', timestamp: '2026-11-07T08:10:00' }],
  } })
  try {
    await page.goto(`${BASE}/attendance`)
    await page.getByText('승차 — 버스 탑승 중', { exact: false }).waitFor()
    assert.equal(await page.getByText('홍민준', { exact: false }).count(), 0)
    const req = state.requests.find(r => r.path === '/api/gps/attendance/students/14')
    assert.equal(req.auth, 'Bearer test-token')
    // 오늘 날짜는 기기 시간대 기준
    const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })
    assert.equal(new URLSearchParams(req.query).get('date'), today)
    assert.equal(state.requests.some(r => r.path.startsWith('/api/gps/parents/')), false)
    // 다른 자녀로 바꾸면 그 자녀의 기록을 조회한다
    await page.getByRole('button', { name: '다른학생', exact: true }).click()
    await page.getByText('이날 출결 기록이 없습니다', { exact: true }).waitFor()
    await page.getByText('기록 없음', { exact: true }).waitFor()
    // 조회 실패 → 안내와 다시 불러오기
    state.attendanceFail = true
    await page.getByRole('button', { name: '연결검증학생', exact: true }).click()
    await page.getByRole('alert').getByText('출결 이력을 불러오지 못했습니다.', { exact: false }).waitFor()
    state.attendanceFail = false
    await page.getByRole('button', { name: '다시 불러오기', exact: true }).click()
    await page.getByText('승차 — 버스 탑승 중', { exact: false }).waitFor()
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('출결 조회 토큰 만료는 갱신하고 권한 거부 후 이전 자녀 기록은 표시하지 않는다', async () => {
  const { page, context, state, errors } = await openPage({ expiredAttendance: true, attendance: {
    14: [{ attendanceId: 2, studentId: 14, studentName: '연결검증학생', busId: 1, eventType: 'BOARD', timestamp: '2026-11-07T08:10:00' }],
  } })
  try {
    await page.goto(`${BASE}/attendance`)
    await page.getByText('승차 — 버스 탑승 중', { exact: false }).waitFor()
    const requests = state.requests.filter(r => r.path === '/api/gps/attendance/students/14')
    assert.equal(requests.length, 2)
    assert.deepEqual(requests.map(r => r.auth), ['Bearer test-token', 'Bearer renewed'])
    assert.equal(requests[0].query, requests[1].query)
    assert.equal(state.requests.filter(r => r.path === '/api/auth/token/refresh').length, 1)
    state.attendanceStatus = 403
    await page.getByRole('button', { name: '다른학생', exact: true }).click()
    await page.getByRole('alert').getByText('출결 이력을 불러오지 못했습니다.', { exact: false }).waitFor()
    assert.equal(await page.getByText('승차 — 버스 탑승 중', { exact: false }).count(), 0)
    assert.equal(await page.getByText('🚌 승차', { exact: true }).count(), 0)
    state.attendanceStatus = 0
    await page.getByRole('button', { name: '연결검증학생', exact: true }).click()
    await page.getByText('승차 — 버스 탑승 중', { exact: false }).waitFor()
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('성장 예측은 실제 성적으로만 예측하고, 성적이 없거나 AI 서버가 꺼지면 예시 점수를 보여주지 않는다', async () => {
  const grades = [
    { subject: '수학', score: 60, examDate: '2026-05-10', examType: '중간고사' },
    { subject: '수학', score: 70, examDate: '2026-07-08', examType: '기말고사' },
    { subject: '국어', score: 80, examDate: '2026-07-08', examType: '기말고사' },
  ]
  const { page, context, state, errors } = await openPage({ grades, predict: { expected_score: 78, message: '📈 성적 향상이 기대됩니다.' }, activities: [
    { id: 1, subject: '수학', studyDate: '2026-11-01', studyStartTime: '19:00:00', studyDurationMinutes: 90, concentrationScore: 4, measurementSource: 'MANUAL' },
  ] })
  try {
    await page.goto(`${BASE}/learning?tab=predict`)
    await page.getByText('78점', { exact: true }).waitFor()
    await page.getByText('75점', { exact: true }).waitFor() // 과목별 최근 평균 (70 + 80) / 2
    await page.getByText('▲3점 상승 예측', { exact: true }).waitFor()
    await page.getByText('하루 평균 공부 1.5시간 기준', { exact: true }).waitFor()
    const body = state.requests.find(r => r.path === '/api/ai/predict').body
    assert.deepEqual([body.past_score_avg, body.study_hours_per_day], [75, 1.5])
    // 성적이 없는 자녀: 예측 요청도, 그래프도 없다
    const before = state.requests.filter(r => r.path === '/api/ai/predict').length
    await page.getByRole('button', { name: '다른학생 · 중2', exact: true }).click()
    await page.getByText('성적이 등록되면 예측해 드려요', { exact: true }).waitFor()
    assert.equal(await page.getByText('📈 성적 예측 그래프', { exact: true }).count(), 0)
    assert.equal(state.requests.filter(r => r.path === '/api/ai/predict').length, before)
    // AI 서버가 꺼져 있으면 숫자를 지어내지 않는다
    state.predict = null
    await page.getByRole('button', { name: '연결검증학생 · 중1', exact: true }).click()
    await page.getByText('지금은 예측할 수 없어요 (AI 서버 확인 필요)', { exact: true }).waitFor()
    assert.equal(await page.getByText('▲', { exact: false }).count(), 0)
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('카메라 집중 100%·졸음 0%와 출처를 표시한다', async () => {
  const { page, context, errors } = await openPage({ camera: true })
  try {
    // 학습 패턴 탭에는 요약 카드만 있고, 누르면 집중도 탭으로 이동한다
    await page.goto(`${BASE}/learning?tab=pattern`)
    await page.getByText('카메라 측정 1회 · 집중 100% · 졸음 0%', { exact: true }).click()
    await page.waitForURL(/tab=focus/)
    const cameraCard = page.getByRole('region', { name: '카메라 측정 결과' })
    await cameraCard.getByText('집중 100% · 졸음 0%', { exact: true }).waitFor()
    await cameraCard.getByRole('img', { name: '집중 100%, 집중 안 함 0%, 졸음 0%' }).first().waitFor()
    await page.getByText('📷 카메라', { exact: true }).waitFor()
    assert.equal(await page.getByText('아직 카메라로 측정한 기록이 없어요.', { exact: false }).count(), 0)
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth > window.innerWidth), false)
    assert.deepEqual(errors, [])
    await page.screenshot({ path: 'test-results/concentration-camera.png', fullPage: true })
  } finally { await context.close() }
})

test('집중도 탭은 직접 입력 기록만 있으면 카메라 안내를 보이고, 조회 실패 시 다시 불러올 수 있다', async () => {
  const { page, context, state, errors } = await openPage({ activities: [
    { id: 11, subject: '수학', studyDate: '2026-11-03', studyStartTime: '19:00:00', studyDurationMinutes: 40, concentrationScore: 2, understandingScore: 3, measurementSource: 'MANUAL' },
    { id: 12, subject: '국어', studyDate: '2026-11-04', studyStartTime: '20:00:00', studyDurationMinutes: 30, concentrationScore: 4, understandingScore: 4, measurementSource: 'MANUAL' },
  ] })
  try {
    await page.goto(`${BASE}/learning?tab=focus`)
    await page.getByText('아직 카메라로 측정한 기록이 없어요.', { exact: false }).waitFor()
    await page.getByText('3 / 5', { exact: true }).waitFor()
    assert.equal(await page.getByText('✍️ 직접 입력', { exact: true }).count(), 2)
    state.failActivities = true
    await page.getByRole('button', { name: '새로고침', exact: true }).click()
    await page.getByRole('alert').waitFor()
    state.failActivities = false
    await page.getByRole('button', { name: '다시 불러오기', exact: true }).click()
    await page.getByText('국어 시간에 가장 집중을 잘하고, 수학 시간에는 집중이 떨어지는 편이에요.', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('저장 응답 유실·재시도·새로고침에도 동일 자기평가가 하나만 남고 입력 시각을 보존한다', async () => {
  const { page, context, state } = await openPage({ loseSaveResponse: true })
  const fill = async () => {
    await page.getByRole('button', { name: '이해도 5점', exact: true }).click()
    await page.getByRole('button', { name: '집중도 1점', exact: true }).click()
    await page.getByLabel('학습일', { exact: true }).fill('2026-11-05')
    await page.getByLabel('학습 시작 시각').fill('10:17')
    await page.getByLabel('학습 시간 (분)').fill('8')
  }
  try {
    await page.goto(`${BASE}/learning?tab=pattern&sheet=record`)
    await fill()
    await page.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await page.getByText('Failed to fetch', { exact: true }).waitFor()
    await page.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await page.getByText('자기평가가 직접 입력 기록으로 저장되었습니다.', { exact: true }).waitFor()
    assert.equal(state.activities.length, 1)
    assert.equal(state.activities[0].studyStartTime, '10:17:00')
    await page.reload()
    await fill()
    await page.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await page.getByText('자기평가가 직접 입력 기록으로 저장되었습니다.', { exact: true }).waitFor()
    assert.equal(state.activities.length, 1)
    const posts = state.requests.filter(r => r.path === '/api/activities' && r.method === 'POST')
    assert.equal(posts.length, 3)
    assert.equal(new Set(posts.map(p => p.body.submissionId)).size, 1)
  } finally { await context.close() }
})

test('비정상 학습 시간은 전송하지 않고 허용 최대값은 저장한다', async () => {
  const { page, context, state } = await openPage()
  try {
    await page.goto(`${BASE}/learning?tab=pattern&sheet=record`)
    await page.getByRole('button', { name: '이해도 1점', exact: true }).click()
    await page.getByRole('button', { name: '집중도 5점', exact: true }).click()
    for (const duration of ['0', '-1', '1.5', '1441', '']) {
      await page.getByLabel('학습 시간 (분)').fill(duration)
      await page.getByRole('button', { name: '자기평가 저장', exact: true }).click()
      await page.getByText('학습일, 학습 시간(1분 이상), 이해도와 집중도를 입력해 주세요.', { exact: true }).waitFor()
    }
    assert.equal(state.activities.length, 0)
    await page.getByLabel('학습 시간 (분)').fill('1440')
    await page.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await page.getByText('자기평가가 직접 입력 기록으로 저장되었습니다.', { exact: true }).waitFor()
    assert.equal(state.activities[0].studyDurationMinutes, 1440)
  } finally { await context.close() }
})

test('자녀 전환 뒤 이전 학생의 늦은 응답이 화면을 덮어쓰지 않는다', async () => {
  let release
  const delay = new Promise(resolve => { release = resolve })
  const { page, context, state, errors } = await openPage({ delay })
  try {
    await page.goto(`${BASE}/learning?tab=records`)
    await page.getByRole('button', { name: '다른학생 · 중2', exact: true }).click()
    const records = page.getByRole('region', { name: '오답 및 OCR 채점 기록' })
    await records.getByText('아직 저장된 오답이 없어요.', { exact: true }).waitFor()
    const oldResponse = page.waitForResponse(r => r.url().includes('/api/ocr-results?studentId=14'))
    release()
    await oldResponse
    assert.equal(await records.getByText('국어 · 국어-1', { exact: true }).count(), 0)
    assert(state.requests.some(r => r.path === '/api/wrong-answer/15'))
    assert.deepEqual(errors, [])
  } finally { release(); await context.close() }
})

test('조회 오류는 빈 기록과 구분하고 다시 불러올 수 있다', async () => {
  const { page, context, state } = await openPage({ fail: true })
  try {
    await page.goto(`${BASE}/learning?tab=records`)
    await page.getByRole('alert').getByText('오답 서버 응답 실패', { exact: true }).waitFor()
    state.fail = false
    await page.getByRole('button', { name: '다시 불러오기', exact: true }).click()
    await page.getByText('국어 · 국어-1', { exact: true }).waitFor()
  } finally { await context.close() }
})

test('많은 기록·1000문항·긴 인식 글자를 나누어 표시하며 HTML은 문자로 표시한다', async () => {
  const text = '<img src=x onerror="window.bad=true">' + '긴글'.repeat(3000)
  const questions = Array.from({ length: 1000 }, (_, i) => ({ questionId: `Q${i}`, expectedAnswer: '정답',
    recognizedText: i === 0 ? text : '', correct: false, similarity: 0, conceptTag: '검증' }))
  const { page, context, errors } = await openPage({
    wrong: Array.from({ length: 150 }, (_, i) => ({ ...wrong[0], id: i + 1, questionId: `W${i}` })),
    ocr: Array.from({ length: 30 }, (_, i) => ({ ...ocr[0], id: i + 1, questions, correctCount: 0, totalQuestions: 1000 })),
  })
  try {
    await page.goto(`${BASE}/learning?tab=records`)
    const records = page.getByRole('region', { name: '오답 및 OCR 채점 기록' })
    await records.getByText('국어 · W0', { exact: true }).waitFor()
    assert.equal(await records.locator('details').count(), 20)
    assert.equal(await records.locator('.ocr-question').count(), 0)
    await records.getByRole('button', { name: '채점 결과 더 보기', exact: true }).click()
    assert.equal(await records.locator('details').count(), 30)
    const details = records.locator('details').first()
    await details.locator('summary').click()
    await details.getByText(text, { exact: true }).waitFor()
    assert.equal(await details.locator('.ocr-question').count(), 50)
    assert.equal(await details.locator('img').count(), 0)
    await details.getByRole('button', { name: /문항 더 보기/ }).click()
    assert.equal(await details.locator('.ocr-question').count(), 100)
    await records.getByRole('button', { name: '오답 더 보기', exact: true }).click()
    await records.getByText('국어 · W99', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('학원 학생 상세와 피드백에서도 같은 학생의 실데이터를 확인한다', async () => {
  const { page, context, state, errors } = await openPage({ role: 'ACADEMY', camera: true })
  try {
    await page.goto(`${BASE}/admin/learning`)
    await page.getByRole('button', { name: '👥 학생관리', exact: true }).click()
    await page.getByText('연결검증학생', { exact: true }).click()
    await page.getByText('국어 · 국어-1', { exact: true }).waitFor()
    await page.getByRole('button', { name: /^🧠\s*패턴$/ }).click()
    await page.getByText('카메라 측정', { exact: true }).waitFor()
    await page.getByRole('button', { name: '📝 피드백', exact: true }).click()
    await page.locator('select').selectOption('14')
    await page.getByText('졸음 0%', { exact: true }).waitFor()
    assert(state.requests.some(r => r.path === '/api/activities/14'))
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

async function openAcademyPattern(page, name = '연결검증학생') {
  await page.goto(`${BASE}/admin/learning`)
  await page.getByRole('button', { name: '👥 학생관리', exact: true }).click()
  await page.getByText(name, { exact: true }).click()
  await page.getByRole('button', { name: /^🧠\s*패턴$/ }).click()
  await page.getByRole('form', { name: '학생 자기평가 입력', exact: true }).waitFor()
}

async function fillAcademyEvaluation(page, duration = '27') {
  const form = page.getByRole('form', { name: '학생 자기평가 입력', exact: true })
  await form.getByRole('button', { name: '이해도 4점', exact: true }).click()
  await form.getByRole('button', { name: '집중도 2점', exact: true }).click()
  await form.getByLabel('학습 과목').selectOption('영어')
  await form.getByLabel('학습일', { exact: true }).fill('2026-11-05')
  await form.getByLabel('학습 시작 시각').fill('13:47')
  await form.getByLabel('학습 시간 (분)').fill(duration)
  return form
}

test('학원 키보드 저장 중 토큰이 만료되어도 갱신 후 같은 내용을 한 번만 저장한다', async () => {
  const { page, context, state, errors } = await openPage({ role: 'ACADEMY', expiredSave: true })
  try {
    await openAcademyPattern(page)
    const form = await fillAcademyEvaluation(page)
    await form.getByLabel('학습 시간 (분)').press('Enter')
    await form.getByRole('status').waitFor()
    const posts = state.requests.filter(r => r.path === '/api/activities' && r.method === 'POST')
    assert.equal(posts.length, 2)
    assert.deepEqual(posts[0].body, posts[1].body)
    assert.equal(posts[1].auth, 'Bearer renewed')
    assert.equal(state.requests.filter(r => r.path === '/api/auth/token/refresh').length, 1)
    assert.equal(state.activities.length, 1)
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('학원은 학생별 자기평가를 검증·저장하고 재조회하며 기존 오답·OCR 화면을 유지한다', async () => {
  const { page, context, state, errors } = await openPage({ role: 'ACADEMY' })
  try {
    await openAcademyPattern(page)
    const form = page.getByRole('form', { name: '학생 자기평가 입력' })
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await form.getByRole('alert').waitFor()
    assert.equal(state.requests.filter(r => r.method === 'POST').length, 0)
    await fillAcademyEvaluation(page)
    for (const duration of ['0', '-1', '1.5', '1441', '']) {
      await form.getByLabel('학습 시간 (분)').fill(duration)
      await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
      await form.getByRole('alert').waitFor()
    }
    assert.equal(state.activities.length, 0)
    await form.getByLabel('학습 시간 (분)').fill('27')
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await form.getByRole('status').getByText('자기평가가 직접 입력 기록으로 저장되었습니다.').waitFor()
    const records = page.getByRole('region', { name: '집중도 측정 기록' })
    await records.getByText('2026-11-05 13:47 · 27분', { exact: true }).waitFor()
    await records.getByText('집중도 2 / 5', { exact: true }).waitFor()
    const post = state.requests.find(r => r.path === '/api/activities' && r.method === 'POST')
    assert.equal(post.body.studentId, 14)
    assert.equal(post.auth, 'Bearer test-token')
    assert.equal(post.body.subject, '영어')
    assert.equal(post.body.understandingScore, 4)
    assert.equal(post.body.measurementSource, 'MANUAL')
    assert.equal(post.body.submissionId.length, 64)
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await form.getByRole('status').waitFor()
    assert.equal(state.requests.filter(r => r.path === '/api/activities' && r.method === 'POST').length, 2)
    assert.equal(state.activities.length, 1)
    assert(state.requests.some(r => r.path === '/api/analysis/meta-cognition' && new URL(BASE + r.path + r.query).searchParams.get('subject') === '영어'))
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth > window.innerWidth), false)
    await page.screenshot({ path: 'test-results/academy-self-evaluation.png', fullPage: true })
    await page.getByRole('button', { name: /^📊\s*성적$/ }).click()
    await page.getByText('국어 · 국어-1', { exact: true }).waitFor()
    await page.getByText('국어 · 1 / 2문항 정답', { exact: true }).click()
    await page.getByText('되지', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('학원 자기평가 저장 오류·응답 유실·새로고침 후 재시도에도 하나의 기록만 남는다', async () => {
  const { page, context, state, errors } = await openPage({ role: 'ACADEMY', failSave: true })
  try {
    await openAcademyPattern(page)
    let form = await fillAcademyEvaluation(page, '1440')
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await form.getByRole('alert').getByText('일시적인 저장 오류입니다.').waitFor()
    assert.equal(state.activities.length, 0)
    state.failSave = false
    state.loseSaveResponse = true
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await form.getByRole('alert').getByText('서버에 연결하지 못했습니다. 입력값을 유지한 채 다시 저장해 주세요.').waitFor()
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await form.getByRole('status').waitFor()
    await page.reload()
    await page.getByRole('button', { name: '👥 학생관리', exact: true }).click()
    await page.getByText('연결검증학생', { exact: true }).click()
    await page.getByRole('button', { name: /^🧠\s*패턴$/ }).click()
    const records = page.getByRole('region', { name: '집중도 측정 기록' })
    await records.getByText('2026-11-05 13:47 · 1440분', { exact: true }).waitFor()
    form = await fillAcademyEvaluation(page, '1440')
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await form.getByRole('status').waitFor()
    assert.equal(state.activities.length, 1)
    const posts = state.requests.filter(r => r.path === '/api/activities' && r.method === 'POST')
    assert.equal(posts.length, 4)
    assert.equal(new Set(posts.map(post => post.body.submissionId)).size, 1)
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('학원 재저장은 변경된 권한과 잘못된 응답을 확인하고 이전 성공 안내를 재사용하지 않는다', async () => {
  const { page, context, state } = await openPage({ role: 'ACADEMY' })
  try {
    await openAcademyPattern(page)
    const form = await fillAcademyEvaluation(page)
    const save = () => form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await save()
    await form.getByRole('status').waitFor()
    state.saveStatus = 403
    await save()
    await form.getByRole('alert').getByText('학생 기록에 접근할 수 없습니다.').waitFor()
    assert.equal(await form.getByRole('status').count(), 0)
    state.saveStatus = 0
    state.saveResponse = { id: 'invalid' }
    await save()
    await form.getByRole('alert').getByText('학습 기록을 저장하지 못했습니다. 다시 시도해 주세요.').waitFor()
    assert.equal(state.activities.length, 1)
    assert.equal(state.requests.filter(r => r.path === '/api/activities' && r.method === 'POST').length, 3)
    delete state.saveResponse
    await save()
    await form.getByRole('status').waitFor()
    assert.equal(state.activities.length, 1)
  } finally { await context.close() }
})

test('저장 키 준비 중 학생을 바꾸면 아직 보내지 않은 이전 학생 요청을 전송하지 않는다', async () => {
  const { page, context, state } = await openPage({ role: 'ACADEMY' })
  try {
    await page.addInitScript(() => {
      const original = crypto.subtle.digest.bind(crypto.subtle)
      crypto.subtle.digest = (...args) => new Promise(resolve => {
        window.releaseEvaluationDigest = async () => { resolve(await original(...args)) }
        window.evaluationDigestStarted = true
      })
    })
    await openAcademyPattern(page)
    const form = await fillAcademyEvaluation(page)
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await page.waitForFunction(() => window.evaluationDigestStarted)
    await page.getByText('다른학생', { exact: true }).click()
    await page.getByRole('button', { name: /^🧠\s*패턴$/ }).click()
    await page.getByRole('form', { name: '학생 자기평가 입력' }).getByText('다른학생 학생의 자기평가를 확인하고 입력해 주세요').waitFor()
    await page.evaluate(() => window.releaseEvaluationDigest())
    assert.equal(state.requests.filter(r => r.path === '/api/activities' && r.method === 'POST').length, 0)
    assert.equal(state.activities.length, 0)
  } finally { await context.close() }
})

test('학원 두 탭의 같은 입력은 한 건이며 내용이나 학생이 다르면 구분한다', async () => {
  const activities = []
  const first = await openPage({ role: 'ACADEMY', activities })
  const second = await openPage({ role: 'ACADEMY', activities })
  try {
    await Promise.all([openAcademyPattern(first.page), openAcademyPattern(second.page)])
    const forms = await Promise.all([fillAcademyEvaluation(first.page), fillAcademyEvaluation(second.page)])
    await Promise.all(forms.map(form => form.getByRole('button', { name: '자기평가 저장', exact: true }).click()))
    await Promise.all(forms.map(form => form.getByRole('status').waitFor()))
    assert.equal(activities.length, 1)
    await forms[1].getByLabel('학습 시간 (분)').fill('28')
    await forms[1].getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await forms[1].getByRole('status').waitFor()
    assert.equal(activities.length, 2)
    await second.page.getByText('다른학생', { exact: true }).click()
    await second.page.getByRole('button', { name: /^🧠\s*패턴$/ }).click()
    const other = await fillAcademyEvaluation(second.page)
    await other.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await other.getByRole('status').waitFor()
    assert.deepEqual(activities.map(row => row.studentId), [14, 14, 15])
    assert.equal(new Set(activities.map(row => row.submissionId)).size, 3)
  } finally { await first.context.close(); await second.context.close() }
})

test('학원 분석 데이터 부족과 과소평가를 구별하고 좁은 화면에서도 입력할 수 있다', async () => {
  const { page, context, state, errors } = await openPage({ role: 'ACADEMY', metaResponse: { gapLevel: '데이터 없음', gapScore: 0, gapSummary: '성적이 부족합니다.' } })
  try {
    await page.setViewportSize({ width: 320, height: 700 })
    await openAcademyPattern(page)
    await page.getByText('ℹ️ 분석 데이터 부족', { exact: true }).waitFor()
    assert.equal(await page.getByText('✅ 메타인지 적정', { exact: true }).count(), 0)
    assert.equal(await page.getByText('갭 0점', { exact: true }).count(), 0)
    state.metaResponse = { gapLevel: 'HIGH', gapScore: 30, scaledUnderstandingScore: 40, avgActualScore: 70 }
    await page.getByRole('button', { name: '국어', exact: true }).click()
    await page.getByText('⚠️ 메타인지 과소평가', { exact: true }).waitFor()
    const form = await fillAcademyEvaluation(page, '1')
    await form.getByLabel('학습일', { exact: true }).fill('0001-01-01')
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await form.getByRole('alert').waitFor()
    assert.equal(state.activities.length, 0)
    await form.getByLabel('학습일', { exact: true }).fill('2024-02-29')
    await form.getByLabel('학습 시작 시각').fill('23:59')
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).click()
    await form.getByRole('status').waitFor()
    assert.equal(state.activities[0].studyStartTime, '23:59:00')
    assert.equal(await page.locator('body').evaluate(el => el.scrollWidth > innerWidth), false)
    assert.deepEqual(errors, [])
  } finally { await context.close() }
})

test('학원에서 저장 중 학생을 바꾸면 이전 입력·성공 메시지·기록이 새 학생에게 섞이지 않는다', async () => {
  let release
  const saveDelay = new Promise(resolve => { release = resolve })
  const { page, context, state, errors } = await openPage({ role: 'ACADEMY', saveDelay })
  try {
    await openAcademyPattern(page)
    let form = await fillAcademyEvaluation(page)
    const saveRequest = page.waitForRequest(r => r.url().endsWith('/api/activities') && r.method() === 'POST')
    await form.getByRole('button', { name: '자기평가 저장', exact: true }).dblclick()
    await saveRequest
    assert.equal(await form.getByLabel('학습 시간 (분)').isDisabled(), true)
    await page.getByText('다른학생', { exact: true }).click()
    await page.getByRole('button', { name: /^🧠\s*패턴$/ }).click()
    form = page.getByRole('form', { name: '학생 자기평가 입력' })
    await form.getByText('다른학생 학생의 자기평가를 확인하고 입력해 주세요').waitFor()
    assert.equal(await form.getByLabel('학습 시간 (분)').inputValue(), '60')
    const savedResponse = page.waitForResponse(r => r.url().endsWith('/api/activities') && r.request().method() === 'POST')
    release()
    await savedResponse
    assert.equal(await form.getByRole('status').count(), 0)
    assert.equal(await form.getByRole('button', { name: '이해도 4점' }).getAttribute('aria-pressed'), 'false')
    assert.equal(state.activities.length, 1)
    assert.equal(state.activities[0].studentId, 14)
    assert.equal(state.requests.filter(r => r.path === '/api/activities' && r.method === 'POST').length, 1)
    await page.getByRole('region', { name: '집중도 측정 기록' }).getByText('자기평가를 저장하면 직접 입력한 학습 기록을 확인할 수 있어요.').waitFor()
    assert.deepEqual(errors, [])
  } finally { release(); await context.close() }
})
