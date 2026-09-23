const { chromium } = require('playwright');
const { Client } = require('pg');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOT = process.env.SHOT_DIR || 'e2e-shots/'; require('fs').mkdirSync(SHOT, { recursive: true });
const log = (...a) => console.log('•', ...a);

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // 1. Đăng nhập sai rồi đúng
  await page.goto(BASE + '/home');
  log('redirect to', page.url());
  await page.fill('input[name=username]', 'hs01');
  await page.fill('input[name=password]', 'sai');
  await page.click('button:has-text("Vào chơi")');
  await page.waitForSelector('.form-error');
  log('login error shown:', await page.textContent('.form-error'));
  await page.screenshot({ path: SHOT + '01-login.png' });
  await page.fill('input[name=password]', '123456');
  await page.click('button:has-text("Vào chơi")');
  await page.waitForURL('**/home', { waitUntil: 'commit' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: SHOT + '02-home.png' });

  // 2. Học sinh không vào được admin
  await page.goto(BASE + '/admin');
  log('student /admin ->', page.url());

  // 3. Chọn thế giới AI
  await page.goto(BASE + '/home');
  await page.click('a[href="/world/ai-cong-nghe"]');
  await page.waitForURL('**/world/ai-cong-nghe', { waitUntil: 'commit' });
  await page.screenshot({ path: SHOT + '03-levels.png', fullPage: true });
  const lockedCount = await page.locator('.level-row.locked').count();
  log('locked levels:', lockedCount);

  // Level 2 khoá → API từ chối
  const { rows: lv } = await pg.query(`SELECT l.id, l.number FROM levels l JOIN worlds w ON w.id=l.world_id WHERE w.slug='ai-cong-nghe' ORDER BY number`);
  const res403 = await page.evaluate(async (id) => (await fetch('/api/attempts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ levelId: id }) })).status, lv[1].id);
  log('start locked level status:', res403);

  // 4. Vào Level 1
  await page.goto(BASE + `/play/${lv[0].id}?e2e=1`);
  await page.waitForSelector('.hud');
  await page.waitForTimeout(800);
  await page.screenshot({ path: SHOT + '04-map.png' });

  // Đi bằng bàn phím một đoạn
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(700); await page.keyboard.up('ArrowRight');
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp');

  // 5. Trả lời 10 câu: 8 đúng, 2 sai
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(250);
    await page.evaluate((i) => window.__vtGame.walkToNpc(i), i);
    try { await page.waitForSelector('.q-card', { timeout: 15000 }); } catch (e) {
      const st = await page.evaluate(() => { const g = window.__vtGame; return { i: null, player: g.player, near: g.near, paused: g.paused, path: g.path.length, npcs: g.npcs.map(n => [n.tx, n.ty, n.state]) }; });
      console.log('STUCK at', i, JSON.stringify(st)); await page.screenshot({ path: SHOT + 'stuck.png' }); throw e; }
    const prompt = (await page.textContent('.q-prompt')).trim();
    const { rows } = await pg.query('SELECT correct_index, type FROM questions WHERE prompt=$1 LIMIT 1', [prompt]);
    const correct = rows[0].correct_index;
    const nOpts = rows[0].type === 'MCQ' ? 4 : 2;
    const choose = i < 8 ? correct : (correct + 1) % nOpts;
    if (i === 0) await page.screenshot({ path: SHOT + '05-question.png' });
    await page.locator('.q-opt').nth(choose).click();
    await page.click('button:has-text("Trả lời")');
    await page.waitForSelector('.q-feedback');
    if (i === 8) await page.screenshot({ path: SHOT + '06-wrong-feedback.png' });
    await page.keyboard.press('Enter');
    await page.waitForSelector('.q-card', { state: 'detached' });
    log(`câu ${i + 1}: ${i < 8 ? 'đúng' : 'sai'} ✓`);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT + '07-map-done.png' });
  await page.click('.overlay button:has-text("Xem kết quả")');
  await page.waitForURL('**/result/**', { waitUntil: 'commit' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: SHOT + '08-result.png' });
  log('result:', (await page.textContent('.result-score')).trim(), '| unlock banner:', await page.locator('.banner-unlock').count());

  await page.goto(BASE + '/world/ai-cong-nghe');
  log('locked levels after pass:', await page.locator('.level-row.locked').count());
  await page.screenshot({ path: SHOT + '09-levels-after.png', fullPage: true });

  // Level 2: nộp sớm (0 câu) → chưa qua
  await page.goto(BASE + `/play/${lv[1].id}?e2e=1`);
  await page.waitForSelector('.hud');
  await page.click('button:has-text("Nộp bài")');
  await page.click('.result-card button:has-text("Nộp bài")');
  await page.waitForURL('**/result/**', { waitUntil: 'commit' });
  log('early submit result:', (await page.textContent('.result-score')).trim());

  await page.goto(BASE + '/leaderboard');
  await page.screenshot({ path: SHOT + '10-leaderboard.png' });

  // 6. Giáo viên
  const t = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  t.on('pageerror', e => errors.push('teacher pageerror: ' + e.message));
  await t.goto(BASE + '/login');
  await t.fill('input[name=username]', 'giaovien');
  await t.fill('input[name=password]', 'gv123456');
  await t.click('button:has-text("Vào chơi")');
  await t.waitForURL('**/admin', { waitUntil: 'commit' });
  await t.screenshot({ path: SHOT + '11-admin.png', fullPage: true });
  await t.goto(BASE + '/admin/students');
  await t.fill('input[name=displayName]', 'Vũ Thảo');
  await t.fill('input[name=username]', 'hs06');
  await t.fill('input[name=password]', 'abc123');
  await t.click('button:has-text("Tạo tài khoản")');
  await t.waitForSelector('.form-ok');
  log('create student:', await t.textContent('.form-ok'));
  await t.screenshot({ path: SHOT + '12-students.png', fullPage: true });
  await t.goto(BASE + '/admin/questions');
  await t.screenshot({ path: SHOT + '13-questions.png', fullPage: true });
  await t.click('a:has-text("+ Thêm câu hỏi")');
  await t.waitForSelector('textarea[name=prompt]');
  await t.fill('textarea[name=prompt]', 'Máy tính bảng là thiết bị di động?');
  await t.selectOption('select[name=type]', 'TRUE_FALSE');
  await t.fill('textarea[name=explanation]', 'Máy tính bảng nhỏ gọn, mang theo được.');
  await t.screenshot({ path: SHOT + '14-question-form.png', fullPage: true });
  await t.click('button:has-text("Lưu câu hỏi")');
  await t.waitForURL('**saved=1**', { waitUntil: 'commit' });
  log('question saved; rows:', await t.locator('.tbl tbody tr').count());
  const hs01 = (await pg.query(`SELECT id FROM users WHERE username='hs01'`)).rows[0].id;
  await t.goto(BASE + `/admin/students/${hs01}`);
  await t.screenshot({ path: SHOT + '15-student-detail.png', fullPage: true });

  // hs06 đăng nhập được
  const s6 = await browser.newPage();
  await s6.goto(BASE + '/login');
  await s6.fill('input[name=username]', 'hs06');
  await s6.fill('input[name=password]', 'abc123');
  await s6.click('button:has-text("Vào chơi")');
  await s6.waitForURL('**/home', { waitUntil: 'commit' });
  log('hs06 login ok');

  // Các thế giới khác: chụp bản đồ
  for (const slug of ['toan-ly-hoa', 'tieng-anh']) {
    const id = (await pg.query(`SELECT l.id FROM levels l JOIN worlds w ON w.id=l.world_id WHERE w.slug=$1 AND number=1`, [slug])).rows[0].id;
    await s6.setViewportSize({ width: 1440, height: 860 });
    await s6.goto(BASE + `/play/${id}`);
    await s6.waitForSelector('.hud');
    await s6.waitForTimeout(700);
    await s6.screenshot({ path: SHOT + `16-map-${slug}.png` });
  }

  console.log('ERRORS:', errors.length ? errors : 'none');
  await browser.close();
  await pg.end();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
