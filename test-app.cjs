const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:3000';
const SS_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR);

const ss = (name) => path.join(SS_DIR, `${name}.png`);
const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  try {
    // 1. 로그인
    log('1. 로그인...');
    await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.fill('input[placeholder*="아이디"]', 'frontend@iroute.dev');
    await page.fill('input[placeholder*="비밀번호"]', 'Test1234!');
    await page.screenshot({ path: ss('01_login_filled') });
    await page.click('button:has-text("로그인")');
    await page.waitForTimeout(3000);
    log(`   로그인 후 URL: ${page.url()}`);
    await page.screenshot({ path: ss('02_after_login') });
    const bodyText = (await page.textContent('body')).replace(/\s+/g,' ');
    log(`   화면: ${bodyText.slice(0,120)}`);

    // 2. 네비게이션 탭 파악
    log('2. 하단 탭 파악...');
    const navBtns = await page.$$('nav button, footer button, [role="tab"], a[href]');
    for (const btn of navBtns.slice(0,8)) {
      const t = (await btn.textContent())?.trim();
      if (t) log(`   - "${t}"`);
    }

    // 3. 하단 탭 순서대로 클릭
    const tabs = await page.$$('nav button, footer nav button, [role="tab"]');
    log(`3. 탭 클릭 (${tabs.length}개)...`);
    for (let i = 0; i < Math.min(tabs.length, 6); i++) {
      try {
        const text = (await tabs[i].textContent())?.trim() || `tab${i}`;
        await tabs[i].click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: ss(`03_tab_${i}_${text.slice(0,8).replace(/[^\w가-힣]/g,'_')}`) });
        log(`   ✅ "${text}" → ${page.url()}`);
      } catch(e) { log(`   ⚠️ 탭 ${i}: ${e.message.slice(0,60)}`); }
    }

    // 4. 주요 라우트 직접 탐색
    log('4. 주요 라우트 탐색...');
    const routes = ['/map', '/schedule', '/notice', '/mypage', '/grade', '/report', '/home', '/dashboard'];
    for (const route of routes) {
      try {
        await page.goto(BASE + route, { timeout: 6000 });
        await page.waitForTimeout(1500);
        const h = (await page.$eval('h1,h2,.title,[class*="title"],[class*="header"]', el => el.textContent).catch(() => ''));
        await page.screenshot({ path: ss(`04_${route.replace('/','')}_page`) });
        log(`   ${route} → 제목:"${h.trim().slice(0,25)}" url:${page.url().replace(BASE,'')}`);
      } catch(e) { log(`   ${route}: ${e.message.slice(0,50)}`); }
    }

    // 5. 콘솔 에러 요약
    log('\n=== 콘솔 에러 ===');
    if (errors.length === 0) log('   없음 ✅');
    else [...new Set(errors)].slice(0,8).forEach(e => log(`   ❌ ${e.slice(0,120)}`));

  } catch(e) {
    log(`치명적 오류: ${e.message}`);
    await page.screenshot({ path: ss('error') });
  } finally {
    await browser.close();
    log(`\n스크린샷 저장: ${SS_DIR}`);
  }
})();
