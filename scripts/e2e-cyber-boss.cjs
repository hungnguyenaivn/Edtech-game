// E2E Giai đoạn 4 Cyber World: boss đánh thời gian thực ở level 5.
// Chạy theo phần cho khỏi quá lâu:  PART=a,b,c,d,e node scripts/e2e-cyber-boss.cjs
//   a: AC1 (màn boss / redirect / world khác), AC10 (bảo mật), AC12 (phiên bản)
//   b: AC2 (tất định), AC3 (mảnh mã tự rơi), AC4 (thẻ câu hỏi)
//   c: AC5 (đánh thật bằng phím)
//   d: AC6 (gục + hồi sinh, thời gian thực)
//   e: AC7 (trọn trận 6/4, 7/3, 10/10) + AC8 (nộp bài giữa trận, tạm dừng)
//   f: AC9 (mobile, touch thật qua CDP)
// Cần dev server (BASE_URL) + DATABASE_URL. Tự khôi phục level_progress của hs01 và xoá attempts do script tạo.
const { chromium } = (() => { try { return require('playwright'); } catch { return require('playwright-core'); } })();
const { Client } = require('pg');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOT = 'e2e-shots/';
require('fs').mkdirSync(SHOT, { recursive: true });
const PARTS = (process.env.PART || 'a,b,c,d,e,f').split(',');
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', '-', name, info === '' ? '' : String(info).slice(0, 400)); };
const note = (s) => console.log('NOTE -', s);

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const q = async (s, p) => (await pg.query(s, p)).rows;
  const hs01 = (await q(`select id from users where username='hs01'`))[0].id;
  const lv = {};
  for (const r of await q(`select w.slug, l.number, l.id from levels l join worlds w on w.id=l.world_id where w.slug in ('cyber-world','toan-ly-hoa')`)) (lv[r.slug] ||= {})[r.number] = r.id;
  const attBefore = new Set((await q('select id from attempts where user_id=$1', [hs01])).map((r) => r.id));
  const lpBefore = await q('select * from level_progress where user_id=$1', [hs01]);
  console.log('Trạng thái đầu: attempts', attBefore.size, 'level_progress', lpBefore.length);

  const unlock = async (slug, upTo) => {
    for (let n = 1; n <= upTo; n++)
      await pg.query(`insert into level_progress (user_id, level_id, best_correct, best_stars, passed, plays) values ($1,$2,8,1,true,1)
        on conflict (user_id, level_id) do update set passed=true`, [hs01, lv[slug][n]]);
  };
  const resetLp = async () => { await pg.query('delete from level_progress where user_id=$1', [hs01]); };

  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  // đăng nhập một lần, dùng lại cookie
  const lc = await browser.newContext();
  const lp0 = await lc.newPage();
  await lp0.goto(BASE + '/login');
  await lp0.fill('input[name=username]', 'hs01');
  await lp0.fill('input[name=password]', '123456');
  await lp0.click('button:has-text("Vào chơi")');
  await lp0.waitForURL('**/home');
  const storageState = await lc.storageState();
  await lc.close();

  const allErrors = [];
  async function session(opts = {}, init) {
    const ctx = await browser.newContext({ storageState, viewport: { width: 1280, height: 800 }, ...opts });
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    const s = { ctx, page, errors: [], att: null };
    page.on('pageerror', (e) => s.errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) s.errors.push('console: ' + m.text()); });
    page.on('response', async (r) => {
      const u = r.url();
      if (r.status() >= 400 && !/\/api\/attempts/.test(u) && !/favicon/.test(u)) s.errors.push('http ' + r.status() + ' ' + u);
      if (r.request().method() === 'POST' && /\/api\/attempts$/.test(u) && r.status() === 200) { try { s.att = await r.json(); } catch {} }
    });
    if (init) await page.addInitScript(init);
    return s;
  }
  const closeS = async (s, label) => {
    check(`${label}: không pageerror/console error`, s.errors.length === 0, s.errors.join(' | '));
    allErrors.push(...s.errors);
    await s.ctx.close();
  };
  const openBoss = async (s, qs = 'e2e=1') => {
    await s.page.goto(`${BASE}/play/${lv['cyber-world'][5]}?${qs}`);
    await s.page.waitForFunction(() => window.__vtBoss);
  };
  const snap = (p) => p.evaluate(() => window.__vtBoss.snapshot());
  const steps = (p, n) => p.evaluate((n) => window.__vtBoss.stepTicks(n), n);

  // lấy thẻ câu hỏi: rơi mảnh mã rồi bước vài tick cho nhặt được
  async function getCard(s) {
    await s.page.evaluate(() => window.__vtBoss.dropChip());
    let sn = await steps(s.page, 5);
    let literal = sn.waiting;
    if (!sn.waiting) {
      await s.page.waitForTimeout(150); // closeCard bỏ tạm dừng sau 60ms; trước đó phím bị engine bỏ qua
      await s.page.keyboard.down('ArrowDown');
      sn = await steps(s.page, 8);
      await s.page.keyboard.up('ArrowDown');
    }
    await s.page.waitForSelector('.q-card');
    return { literal, sn };
  }
  async function answerCard(s, correct) {
    const p = s.page;
    const i = (await snap(p)).answered;
    const qu = s.att.questions[i];
    const [row] = await q('select correct_index c from questions where id=$1', [qu.id]);
    const dom = await p.textContent('.q-prompt');
    if (dom !== qu.prompt) throw new Error('prompt DOM khác response: ' + dom);
    const idx = correct ? row.c : (row.c + 1) % qu.options.length;
    if (process.env.DEBUG_Q) console.log('  câu', i + 1, qu.type, qu.options.length, 'tick', (await snap(p)).tick, 'mode', (await snap(p)).boss.mode);
    try { await p.locator('.q-opt').nth(idx).click({ timeout: 8000 }); } catch (e) {
      const boxes = await p.evaluate(() => new Promise((res) => { const o = []; let n = 0; const f = () => { const r = document.querySelector('.q-opt')?.getBoundingClientRect(); const c = document.querySelectorAll('.q-card').length; o.push([c, r && Math.round(r.x * 10) / 10, r && Math.round(r.y * 10) / 10]); if (++n < 12) requestAnimationFrame(f); else res(o); }; f(); }));
      await p.screenshot({ path: SHOT + 'boss-debug-unstable.png' });
      throw new Error('click .q-opt không ổn định (câu ' + (i + 1) + '): ' + JSON.stringify(boxes) + ' ' + e.message.split('\n')[0]);
    }
    await p.click('.q-foot .btn-primary');
    await p.waitForSelector('.q-feedback');
    const cls = await p.getAttribute('.q-feedback', 'class');
    await p.click('.q-foot .btn-primary');
    await p.waitForSelector('.q-card', { state: 'detached' });
    return /\bok\b/.test(cls);
  }

  try {
    // ====================================================================== PART a
    if (PARTS.includes('a')) {
      console.log('--- PART a');
      const s = await session();
      const api = (url, body) => s.page.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { status: r.status, json: await r.json().catch(() => null) }; }, [url, body]);
      await s.page.goto(BASE + '/home');
      // AC10: chưa mở khoá -> 403; chưa đăng nhập -> 401
      await resetLp();
      check('AC10 POST attempts lv5 khi chưa qua lv nào -> 403', (await api('/api/attempts', { levelId: lv['cyber-world'][5] })).status === 403);
      await unlock('cyber-world', 3);
      check('AC10 biên: đã qua lv1-3 nhưng chưa qua lv4 -> lv5 vẫn 403', (await api('/api/attempts', { levelId: lv['cyber-world'][5] })).status === 403);
      await s.page.goto(`${BASE}/play/${lv['cyber-world'][5]}`);
      await s.page.waitForURL('**/world/cyber-world');
      check('AC1 chưa qua lv4: /play/lv5 redirect về /world/cyber-world', /\/world\/cyber-world$/.test(s.page.url()), s.page.url());
      const noAttempt = (await q('select count(*) c from attempts where user_id=$1', [hs01]))[0].c;
      check('AC10 403 không tạo attempt mới', +noAttempt === attBefore.size, noAttempt);
      const anon = await browser.newContext();
      const r401 = await anon.request.post(BASE + '/api/attempts', { data: { levelId: lv['cyber-world'][5] } });
      check('AC10 chưa đăng nhập POST attempts lv5 -> 401', r401.status() === 401, r401.status());
      const r401b = await anon.request.post(BASE + '/api/attempts/abc/answer', { data: { questionId: 'x', chosenIndex: 0 } });
      check('AC10 chưa đăng nhập POST answer -> 401', r401b.status() === 401, r401b.status());
      const anonPage = await anon.newPage();
      await anonPage.goto(`${BASE}/play/${lv['cyber-world'][5]}`);
      check('AC10 chưa đăng nhập vào /play/lv5 -> về login', /login/.test(anonPage.url()), anonPage.url());
      await anon.close();

      // AC1: đã qua lv1-4
      await unlock('cyber-world', 4);
      await s.page.goto(`${BASE}/play/${lv['cyber-world'][5]}?e2e=1&seed=42`);
      await s.page.waitForFunction(() => window.__vtBoss);
      await s.page.waitForSelector('.boss-hearts');
      check('AC1 lv5 hiện canvas', (await s.page.locator('canvas').count()) === 1);
      check('AC1 có .boss-hearts với 5 tim', (await s.page.locator('.boss-hearts i').count()) === 5 && (await s.page.locator('.boss-hearts i.on').count()) === 5);
      check('AC1 10 chấm lõi', (await s.page.locator('.hud-dots i').count()) === 10);
      check('AC1 hiện "Pha 1"', (await s.page.locator('.hud b', { hasText: 'Pha 1' }).count()) === 1);
      check('AC1 không phải bản đồ NPC (.boss-root)', (await s.page.locator('.boss-root').count()) === 1);
      const ver = await s.page.textContent('.version-tag');
      check('AC12 hiển thị v0.5.0', ver.trim() === 'v0.5.0', ver);
      // canvas có pixel vẽ
      await steps(s.page, 100);
      await s.page.screenshot({ path: SHOT + 'boss-01-start.png' });
      const painted = await s.page.evaluate(() => { const c = document.querySelector('canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 53) if (d[i + 1] > 60 || d[i + 2] > 90) n++; return n; });
      check('AC1 canvas đấu trường có pixel vẽ', painted > 200, painted);
      // đòn báo trước: bước tới tick telegraph
      const sn = await snap(s.page);
      note('sau 100 tick: mode=' + sn.boss.mode + ' hazards=' + JSON.stringify(sn.hazards));
      check('AC12 chụp được đòn báo trước (mode telegraph, có hazard)', sn.boss.mode === 'telegraph' && sn.hazards.length > 0, JSON.stringify(sn.boss));
      await s.page.screenshot({ path: SHOT + 'boss-02-telegraph.png' });
      await closeS(s, 'part a (boss)');

      // world khác: level 5 vẫn là NPC thường
      await unlock('toan-ly-hoa', 4);
      const s2 = await session();
      await s2.page.goto(`${BASE}/play/${lv['toan-ly-hoa'][5]}?e2e=1`);
      await s2.page.waitForSelector('canvas.game-canvas');
      await s2.page.waitForSelector('.hud');
      check('AC1 toan-ly-hoa lv5 vẫn là màn NPC (không có .boss-root/.boss-hearts)', (await s2.page.locator('.boss-root, .boss-hearts').count()) === 0);
      check('AC1 toan-ly-hoa lv5: có hud-dots NPC', (await s2.page.locator('.hud-dots i').count()) === 10);
      check('AC1 toan-ly-hoa lv5: không có window.__vtBoss', !(await s2.page.evaluate(() => !!window.__vtBoss)));
      await s2.page.screenshot({ path: SHOT + 'boss-00-other-world-lv5.png' });
      await closeS(s2, 'part a (toan-ly-hoa lv5)');
      await resetLp();
    }

    // ====================================================================== PART b
    if (PARTS.includes('b')) {
      console.log('--- PART b');
      await resetLp();
      await unlock('cyber-world', 4);
      // bẫy: ngay khi engine được gán vào window thì chuyển sang chế độ thủ công (0 tick đã chạy theo thời gian thực)
      const trap = () => { let v; Object.defineProperty(window, '__vtBoss', { configurable: true, get: () => v, set: (e) => { e.stepTicks(0); v = e; } }); };
      const run = async (seed, label) => {
        const s = await session({}, trap);
        await openBoss(s, `e2e=1&seed=${seed}`);
        const first = await snap(s.page);
        const a = await steps(s.page, 600);
        await s.page.keyboard.down('ArrowLeft');
        const b = await steps(s.page, 200);
        await s.page.keyboard.up('ArrowLeft');
        const c = await steps(s.page, 300);
        await closeS(s, label);
        return { first, a, b, c };
      };
      const r1 = await run(42, 'AC2 phiên 1');
      const r2 = await run(42, 'AC2 phiên 2');
      check('AC2 hai phiên seed=42 bắt đầu ở tick 0 (bẫy hook)', r1.first.tick === 0 && r2.first.tick === 0, r1.first.tick + ',' + r2.first.tick);
      check('AC2 stepTicks(600) giống hệt nhau (toàn bộ snapshot, không bỏ trường nào)', JSON.stringify(r1.a) === JSON.stringify(r2.a), JSON.stringify(r1.a).slice(0, 200));
      check('AC2 có phím giữ + 200 tick: giống hệt', JSON.stringify(r1.b) === JSON.stringify(r2.b) && r1.b.player.x < 120, JSON.stringify(r1.b.player));
      check('AC2 thêm 300 tick: giống hệt', JSON.stringify(r1.c) === JSON.stringify(r2.c));
      const r3 = await run(43, 'AC2 seed khác');
      note('seed 42 vs 43 sau 1100 tick khác nhau: ' + (JSON.stringify(r1.c) !== JSON.stringify(r3.c)));
      // không có bẫy: ghi nhận độ lệch do vòng lặp thời gian thực chạy trước khi gọi hook
      const n1 = await session(); await openBoss(n1, 'e2e=1&seed=42'); const na = await steps(n1.page, 600);
      note('AC2 (không bẫy) tick sau stepTicks(600) = ' + na.tick + ' (>600 vì vòng lặp thực chạy trước khi hook được gọi — phụ thuộc thời gian thực)');
      await closeS(n1, 'AC2 không bẫy');

      // AC3: không bấm gì 20s+ -> có mảnh mã (mảnh tự rơi)
      for (const seed of [42, 7, 99]) {
        const s = await session({}, trap);
        await openBoss(s, `e2e=1&seed=${seed}`);
        const sn = await steps(s.page, 20 * 60 + 30);
        check(`AC3 seed ${seed}: không bấm gì, 20s+30 tick -> chips>=1`, sn.chips >= 1 || sn.waiting, JSON.stringify({ tick: sn.tick, chips: sn.chips, waiting: sn.waiting, hp: sn.player.hp, chip: sn.chip }));
        await closeS(s, `AC3 seed ${seed}`);
      }
      const s0 = await session({}, trap);
      await openBoss(s0, 'e2e=1&seed=42');
      const s19 = await steps(s0.page, 19 * 60);
      check('AC3 biên: ở 19s chưa tự rơi mảnh mã', s19.chips === 0, JSON.stringify({ tick: s19.tick, chips: s19.chips }));
      await closeS(s0, 'AC3 biên 19s');

      // AC4: dropChip -> thẻ câu hỏi; đúng/sai
      const s = await session();
      await openBoss(s, 'e2e=1&seed=42');
      await s.page.evaluate(() => window.__vtBoss.setInvincible(true));
      await steps(s.page, 1);
      const before = await snap(s.page);
      check('AC4 trước đó: waiting=false, không có thẻ', !before.waiting && (await s.page.locator('.q-card').count()) === 0);
      await s.page.evaluate(() => window.__vtBoss.dropChip());
      let sn = await steps(s.page, 5);
      note('AC4 literal: sau dropChip()+stepTicks(5): waiting=' + sn.waiting + ' chip=' + JSON.stringify(sn.chip) + ' player=' + JSON.stringify([sn.player.x, sn.player.y]));
      check('AC4 dropChip() rồi stepTicks(5) -> waiting=true (đúng như mô tả hook)', sn.waiting === true, JSON.stringify({ waiting: sn.waiting, chip: sn.chip, player: [sn.player.x, sn.player.y] }));
      if (!sn.waiting) {
        await s.page.keyboard.down('ArrowDown');
        sn = await steps(s.page, 8);
        await s.page.keyboard.up('ArrowDown');
      }
      await s.page.waitForSelector('.q-card');
      check('AC4 sau nhặt: waiting=true và thẻ câu hỏi hiện', sn.waiting && (await s.page.locator('.q-card').count()) === 1);
      const t0 = (await snap(s.page)).tick;
      await s.page.waitForTimeout(700);
      const t1 = (await snap(s.page)).tick;
      check('AC4 tick không tăng khi đang mở thẻ (0.7s thực)', t0 === t1, `${t0} -> ${t1}`);
      await s.page.screenshot({ path: SHOT + 'boss-03-question.png' });
      check('AC4 thẻ có "Câu 1/10" và 4 hoặc 2 đáp án', /Câu 1\/10/.test(await s.page.textContent('.q-tag')) && [2, 4].includes(await s.page.locator('.q-opt').count()));
      const ok1 = await answerCard(s, true);
      let a = await snap(s.page);
      check('AC4 trả lời ĐÚNG -> cores[0]="ok", boss.mode=stunned', ok1 && a.cores[0] === 'ok' && a.boss.mode === 'stunned' && a.answered === 1, JSON.stringify({ cores: a.cores.slice(0, 2), mode: a.boss.mode }));
      check('AC4 HUD có 1 chấm ok', (await s.page.locator('.hud-dots i.ok').count()) === 1);
      await getCard(s);
      const hp0 = (await snap(s.page)).player.hp;
      const ok2 = await answerCard(s, false);
      a = await snap(s.page);
      check('AC4 trả lời SAI -> cores[1]="patched", hp không đổi', !ok2 && a.cores[1] === 'patched' && a.player.hp === hp0 && a.player.hp === 5, JSON.stringify({ cores: a.cores.slice(0, 3), hp: a.player.hp, mode: a.boss.mode }));
      check('AC4 HUD 1 ok + 1 no, 5 tim còn nguyên', (await s.page.locator('.hud-dots i.no').count()) === 1 && (await s.page.locator('.boss-hearts i.on').count()) === 5);
      // thẻ khi đang mở: bấm 2 lần "Trả lời" không tạo 2 câu
      await getCard(s);
      await s.page.locator('.q-opt').nth(0).click();
      await s.page.locator('.q-foot .btn-primary').dblclick();
      await s.page.waitForSelector('.q-feedback');
      const ansCnt = (await q('select count(*) c from attempt_answers where attempt_id=$1', [s.att.attemptId]))[0].c;
      check('AC4 biên: bấm đúp "Trả lời" chỉ ghi 1 đáp án cho câu 3 (tổng 3)', +ansCnt === 3, ansCnt);
      await closeS(s, 'AC4');
      await resetLp();
    }

    // ====================================================================== PART c (AC5)
    if (PARTS.includes('c')) {
      console.log('--- PART c');
      await resetLp();
      await unlock('cyber-world', 4);
      const s = await session();
      await openBoss(s, 'e2e=1&seed=42');
      const p = s.page;
      await p.evaluate(() => {
        const e = window.__vtBoss; e.setInvincible(true);
        window.__ev = { hit: 0, blocked: 0, hitModes: [] };
        const orig = e.tick.bind(e);
        e.tick = function () { orig(); const ev = e.state.events; if (ev.includes('hit')) { window.__ev.hit++; window.__ev.hitModes.push(e.state.boss.mode); } if (ev.includes('blocked')) window.__ev.blocked++; };
      });
      await p.keyboard.down('ArrowUp');
      await p.waitForFunction(() => window.__vtBoss.snapshot().player.y <= 97, null, { polling: 'raf' });
      await p.keyboard.up('ArrowUp');
      const near = await snap(p);
      check('AC5 đi tới sát boss bằng phím (y<=97)', near.player.y <= 97, JSON.stringify(near.player));
      // âm tính: đánh khi boss đang khiên (telegraph)
      await p.waitForFunction(() => window.__vtBoss.snapshot().boss.mode === 'telegraph', null, { polling: 'raf', timeout: 30000 });
      const h0 = (await snap(p)).boss.hits;
      const modes = [];
      for (let i = 0; i < 2; i++) {
        await p.keyboard.press('j');
        modes.push((await snap(p)).boss.mode);
        await p.waitForTimeout(330);
      }
      const h1 = await snap(p);
      const ev1 = await p.evaluate(() => window.__ev);
      note('AC5 âm tính: modes khi đánh=' + modes + ' events=' + JSON.stringify(ev1));
      check('AC5 đánh khi boss không hở: boss.hits không tăng, không có sự kiện "hit"', h1.boss.hits === h0 && ev1.hit === 0 && modes.every((m) => !['exposed', 'stunned'].includes(m)), JSON.stringify({ h0, h1: h1.boss.hits, ev1, modes }));
      check('AC5 đánh khi khiên bật -> có "blocked" (đòn bị chặn)', ev1.blocked >= 1, ev1.blocked);
      // dương tính: chờ exposed, J x3
      await p.waitForFunction(() => window.__vtBoss.snapshot().boss.mode === 'exposed', null, { polling: 'raf', timeout: 30000 });
      await p.screenshot({ path: SHOT + 'boss-02c-exposed.png' });
      // bấm J, đợi sự kiện trúng; đòn bấm trong lúc hồi chiêu (0.3s) bị bỏ nên bấm lại nếu chưa trúng
      let presses = 0;
      while ((await p.evaluate(() => window.__ev.hit)) < 3 && presses < 8 && (await snap(p)).boss.mode === 'exposed') {
        const before = await p.evaluate(() => window.__ev.hit);
        await p.keyboard.press('j');
        presses++;
        await p.waitForFunction((b) => window.__ev.hit > b, before, { timeout: 450 }).catch(() => {});
      }
      note('AC5 số lần bấm J để trúng 3 nhát: ' + presses);
      const ev2 = await p.evaluate(() => window.__ev);
      const h3 = await snap(p);
      check('AC5 J x3 khi hở -> 3 sự kiện hit đều khi boss exposed', ev2.hit === 3 && ev2.hitModes.every((m) => m === 'exposed'), JSON.stringify(ev2));
      check('AC5 sau 3 nhát: mảnh mã rơi (chips=1), hits về 0', h3.chips === 1 && h3.boss.hits === 0, JSON.stringify({ chips: h3.chips, chip: h3.chip, hits: h3.boss.hits, mode: h3.boss.mode }));
      await p.screenshot({ path: SHOT + 'boss-02d-chip-dropped.png' });
      // không rơi mảnh thứ 2 khi đang có mảnh (đánh tiếp trong cùng lần hở nếu còn)
      await closeS(s, 'AC5');
      await resetLp();
    }

    // ====================================================================== PART d (AC6)
    if (PARTS.includes('d')) {
      console.log('--- PART d');
      await resetLp();
      await unlock('cyber-world', 4);
      const s = await session();
      await openBoss(s, 'e2e=1&seed=42');
      const p = s.page;
      await p.evaluate(() => {
        const e = window.__vtBoss; e.setInvincible(false);
        window.__log = [];
        const L = window.__log;
        const orig = e.tick.bind(e);
        let last = null;
        e.tick = function () {
          orig();
          const sn = e.snapshot();
          const k = sn.player.hp + '|' + sn.player.down + '|' + sn.assist;
          if (k !== last) { last = k; L.push({ wall: performance.now(), tick: sn.tick, hp: sn.player.hp, down: sn.player.down, assist: sn.assist, answered: sn.answered, cores: sn.cores.join(), iframes: sn.player.iframes }); }
        };
      });
      const start = Date.now();
      let downSeen = false;
      while (Date.now() - start < 150000) {
        // nếu lỡ nhặt mảnh mã (đứng yên nên hiếm) thì trả lời cho trận chạy tiếp
        if ((await p.locator('.q-card').count()) > 0) { const i = (await snap(p)).answered; await answerCard(s, true); note('AC6: đã nhặt mảnh mã ngoài ý muốn, trả lời câu ' + (i + 1)); }
        const log = await p.evaluate(() => window.__log);
        if (log.some((e) => e.down)) { downSeen = true; break; }
        await p.waitForTimeout(500);
      }
      check('AC6 đứng yên -> hp về 0 và player.down=true (trong 150s)', downSeen, `${Math.round((Date.now() - start) / 1000)}s`);
      if (downSeen) {
        await p.screenshot({ path: SHOT + 'boss-04-down.png' });
        await p.waitForFunction(() => window.__log.some((e, i, a) => !e.down && e.hp === 5 && a.slice(0, i).some((x) => x.down)), null, { timeout: 8000 });
        const log = await p.evaluate(() => window.__log);
        console.log('log hp:', log.map((e) => `${e.tick}:${e.hp}${e.down ? 'D' : ''}/a${e.assist}`).join(' '));
        const di = log.findIndex((e) => e.down);
        const ri = log.findIndex((e, i) => i > di && !e.down && e.hp === 5);
        check('AC6 lúc gục hp=0', log[di].hp === 0, JSON.stringify(log[di]));
        const dTicks = log[ri].tick - log[di].tick;
        const dWall = (log[ri].wall - log[di].wall) / 1000;
        check('AC6 sau <=2.5s hp=5, hết gục', dTicks <= 150 && dTicks >= 100 && dWall <= 2.6, `${dTicks} tick, ${dWall.toFixed(2)}s thực`);
        check('AC6 lõi/answered giữ nguyên', log[ri].answered === log[di].answered && log[ri].cores === log[di].cores, `${log[di].answered}/${log[di].cores}`);
        check('AC6 assist tăng đúng 1 (0 -> 1)', log[di].assist === 1 && log[ri].assist === 1 && log[0].assist === 0, `${log[0].assist}->${log[di].assist}->${log[ri].assist}`);
        // iframes: các lần giảm hp liên tiếp (trước khi gục) cách nhau >= 1.2s = 72 tick
        const drops = [];
        for (let i = 1; i <= di; i++) if (log[i].hp < log[i - 1].hp) drops.push(log[i].tick);
        const gaps = drops.slice(1).map((t, i) => t - drops[i]);
        check('AC6 giữa 2 lần trúng đòn >= 1.2s (72 tick) — mỗi lần chỉ trừ 1 máu', gaps.length >= 3 && gaps.every((g) => g >= 72) && log.slice(1, di + 1).every((e, i) => log[i].hp - e.hp === 1), `drops@${drops} gaps=${gaps}`);
        const first = log.find((e) => e.hp === 4);
        check('AC6 ngay sau trúng đòn, iframes≈1.2s', first && first.iframes >= 1.1, first && first.iframes);
        const after = await snap(p);
        check('AC6 hồi sinh: về điểm xuất phát (120,196) và hp=5', after.player.hp === 5 && Math.abs(after.player.x - 120) < 1 && Math.abs(after.player.y - 196) < 1, JSON.stringify(after.player));
        await p.screenshot({ path: SHOT + 'boss-04b-respawn.png' });
      }
      await closeS(s, 'AC6');
      await resetLp();
    }

    // ====================================================================== PART e (AC7, AC8)
    if (PARTS.includes('e') || PARTS.includes('e10')) {
      console.log('--- PART e');
      const only10 = !PARTS.includes('e');
      await resetLp();
      await unlock('cyber-world', 4);
      async function playMatch(wrongIdx, label, shotName) {
        const s = await session();
        await openBoss(s, 'e2e=1');
        await s.page.evaluate(() => window.__vtBoss.setInvincible(true));
        let correct = 0;
        for (let i = 0; i < 10; i++) {
          const ok = !wrongIdx.includes(i);
          await getCard(s);
          const got = await answerCard(s, ok);
          if (got !== ok) throw new Error('chấm sai ở câu ' + (i + 1));
          if (got) correct++;
          if (i === 6 && shotName === 'boss-05-win') {
            // phase 3: chụp đòn báo trước kiểu khác
            const sn0 = await snap(s.page);
            let kinds = null;
            for (let k = 0; k < 400; k++) { const sn = await steps(s.page, 1); if (sn.boss.mode === 'telegraph') { kinds = sn.hazards; break; } }
            note('phase ' + sn0.phase + ' telegraph hazards: ' + JSON.stringify(kinds && [...new Set(kinds)]));
            await s.page.screenshot({ path: SHOT + 'boss-02b-phase3-telegraph.png' });
          }
        }
        const sn = await snap(s.page);
        check(`${label}: cores ok=${correct}, patched=${10 - correct}, boss done, tim đủ`, sn.cores.filter((c) => c === 'ok').length === correct && sn.cores.filter((c) => c === 'patched').length === 10 - correct && sn.boss.mode === 'done' && sn.player.hp === 5, JSON.stringify(sn.cores));
        await s.page.waitForSelector('.overlay .result-card h1');
        const h1 = await s.page.textContent('.overlay .result-card h1');
        await s.page.waitForTimeout(400); // đợi hiệu ứng fade-in của overlay xong rồi mới chụp
        if (shotName) await s.page.screenshot({ path: SHOT + shotName + '.png' });
        return { s, h1, correct };
      }
      const toResult = async (s) => {
        await s.page.click('.overlay .result-actions button');
        await s.page.waitForURL('**/result/**');
        await s.page.waitForSelector('.result-card h1');
        const id = s.page.url().split('/result/')[1];
        return { id, title: (await s.page.textContent('.result-card h1')).trim(), stars: await s.page.locator('.result-stars .s.on').count(), score: await s.page.textContent('.result-score') };
      };
      const lp5 = async () => (await q('select * from level_progress where user_id=$1 and level_id=$2', [hs01, lv['cyber-world'][5]]))[0];

      let m, r, lp;
      if (!only10) {
      // 6 đúng 4 sai
      m = await playMatch([1, 3, 6, 8], 'AC7 6/4', 'boss-05-lose');
      check('AC7 6/4: overlay "Boss rút lui"', /Boss rút lui/.test(m.h1), m.h1);
      check('AC7 6/4: overlay ghi cần 7 lõi', /ít nhất 7 lõi/.test(await m.s.page.textContent('.overlay .result-card')));
      r = await toResult(m.s);
      const at = (await q('select * from attempts where id=$1', [r.id]))[0];
      check('AC7 6/4: /result 0 sao, "Boss vẫn còn đó!", 6/10', r.stars === 0 && /Boss vẫn còn đó!/.test(r.title) && /6\/10/.test(r.score), JSON.stringify(r));
      check('AC7 6/4: DB attempt correct=6 stars=0 finished', at.correct_count === 6 && at.stars === 0 && !!at.finished_at);
      lp = await lp5();
      check('AC7 6/4: level_progress lv5 passed=false', !lp || lp.passed === false, JSON.stringify(lp));
      await m.s.page.screenshot({ path: SHOT + 'boss-05b-lose-result.png' });
      await closeS(m.s, 'AC7 6/4');

      // 7 đúng 3 sai
      m = await playMatch([2, 5, 8], 'AC7 7/3', 'boss-05-win');
      check('AC7 7/3: overlay "Boss sụp đổ!"', /Boss sụp đổ!/.test(m.h1), m.h1);
      r = await toResult(m.s);
      check('AC7 7/3: /result 1 sao, "Hạ boss rồi! ⚔️", 7/10', r.stars === 1 && /Hạ boss rồi! ⚔️/.test(r.title) && /7\/10/.test(r.score), JSON.stringify(r));
      lp = await lp5();
      check('AC7 7/3: level_progress lv5 passed=true, best_stars=1', lp && lp.passed === true && lp.best_stars === 1 && lp.best_correct === 7, JSON.stringify(lp));
      await m.s.page.screenshot({ path: SHOT + 'boss-05c-win-result.png' });
      await closeS(m.s, 'AC7 7/3');
      }

      // 10/10
      m = await playMatch([], 'AC7 10/10', null);
      check('AC7 10/10: overlay "Boss sụp đổ!"', /Boss sụp đổ!/.test(m.h1), m.h1);
      r = await toResult(m.s);
      check('AC7 10/10: 3 sao, "Hạ boss rồi!"', r.stars === 3 && /Hạ boss rồi! ⚔️/.test(r.title) && /10\/10/.test(r.score), JSON.stringify(r));
      lp = await lp5();
      check('AC7 10/10: level_progress best_stars=3', lp && lp.best_stars === 3 && lp.passed, JSON.stringify(lp));
      await closeS(m.s, 'AC7 10/10');

      // 6/4 sau khi đã qua: tiến độ không bị hạ
      m = await playMatch([0, 1, 2, 3], 'AC7 lại 6/4 sau khi đã qua', null);
      r = await toResult(m.s);
      lp = await lp5();
      check('AC7 chơi lại 6/4: 0 sao nhưng level_progress không bị hạ (passed, best_stars=3)', r.stars === 0 && lp.passed === true && lp.best_stars === 3, JSON.stringify(lp));
      await closeS(m.s, 'AC7 chơi lại');

      // ---- AC8
      await resetLp();
      await unlock('cyber-world', 4);
      const s = await session();
      await openBoss(s, 'e2e=1&seed=5');
      const p = s.page;
      await p.keyboard.press('Escape');
      await p.waitForSelector('.overlay .result-card h1');
      check('AC8 Esc -> menu "Tạm dừng"', /Tạm dừng/.test(await p.textContent('.overlay h1')));
      await p.screenshot({ path: SHOT + 'boss-08-pause.png' });
      const t0 = (await snap(p)).tick;
      await p.waitForTimeout(700);
      const t1 = (await snap(p)).tick;
      check('AC8 đang Tạm dừng: tick đứng yên', t0 === t1, `${t0}->${t1}`);
      await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(300); await p.keyboard.up('ArrowLeft');
      check('AC8 đang Tạm dừng: phím di chuyển bị bỏ qua', (await snap(p)).tick === t1);
      await p.click('button:has-text("Chơi tiếp")');
      await p.waitForFunction((t) => window.__vtBoss.snapshot().tick > t + 20, t1, { timeout: 10000 });
      check('AC8 "Chơi tiếp" -> trận chạy lại, menu đóng', (await p.locator('.overlay').count()) === 0);
      // nộp giữa trận: 2 câu (1 đúng, 1 sai)
      await p.evaluate(() => window.__vtBoss.setInvincible(true));
      await getCard(s); await answerCard(s, true);
      await getCard(s); await answerCard(s, false);
      await p.click('.hud button:has-text("Nộp bài")');
      await p.waitForSelector('.overlay h1:has-text("Nộp bài bây giờ?")');
      check('AC8 Nộp bài -> hộp xác nhận ghi 2/10 câu', /2\/10/.test(await p.textContent('.overlay .muted')));
      await p.screenshot({ path: SHOT + 'boss-08b-confirm.png' });
      await p.click('.overlay button:has-text("Đánh tiếp")');
      await p.waitForSelector('.overlay', { state: 'detached' });
      check('AC8 "Đánh tiếp" -> đóng hộp, chưa nộp (DB chưa finished)', !(await q('select finished_at from attempts where id=$1', [s.att.attemptId]))[0].finished_at);
      await p.click('.hud button:has-text("Nộp bài")');
      await p.waitForSelector('.overlay h1:has-text("Nộp bài bây giờ?")');
      await p.click('.overlay .result-actions button:has-text("Nộp bài")');
      await p.waitForURL('**/result/**');
      await p.waitForSelector('.result-card h1');
      const body = await p.textContent('.result-card');
      check('AC8 /result: đúng 1/10, 8 câu "(chưa trả lời)", 0 sao', /1\/10/.test(await p.textContent('.result-score')) && (body.match(/\(chưa trả lời\)/g) || []).length === 8 && (await p.locator('.result-stars .s.on').count()) === 0, (await p.textContent('.result-score')));
      check('AC8 /result tiêu đề "Boss vẫn còn đó!"', /Boss vẫn còn đó!/.test(await p.textContent('.result-card h1')));
      const at2 = (await q('select correct_count, stars, finished_at from attempts where id=$1', [s.att.attemptId]))[0];
      check('AC8 DB: correct=1, stars=0, finished', at2.correct_count === 1 && at2.stars === 0 && !!at2.finished_at, JSON.stringify(at2));
      await closeS(s, 'AC8');
      // nộp bài ngay từ đầu (0 câu)
      const s2 = await session();
      await openBoss(s2, 'e2e=1');
      await s2.page.click('.hud button:has-text("Nộp bài")');
      await s2.page.click('.overlay .result-actions button:has-text("Nộp bài")');
      await s2.page.waitForURL('**/result/**');
      check('AC8 biên: nộp khi 0 câu -> 0/10, 10 câu chưa trả lời', /0\/10/.test(await s2.page.textContent('.result-score')) && ((await s2.page.textContent('.result-card')).match(/\(chưa trả lời\)/g) || []).length === 10);
      await closeS(s2, 'AC8 nộp 0 câu');
      await resetLp();
    }

    // ====================================================================== PART f (AC9 mobile)
    if (PARTS.includes('f')) {
      console.log('--- PART f');
      await resetLp();
      await unlock('cyber-world', 4);
      const s = await session({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
      const p = s.page;
      await openBoss(s, 'e2e=1&seed=42');
      await p.waitForSelector('.boss-hearts');
      const coarse = await p.evaluate(() => matchMedia('(pointer: coarse)').matches);
      check('AC9 trình duyệt giả lập cảm ứng (pointer: coarse)', coarse);
      const box = async (sel) => p.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom, display: cs.display }; }, sel);
      const stage = await box('.boss-stage');
      const dpad = await box('.dpad');
      const acts = await box('.boss-actions');
      const atk = await box('.act-attack');
      const dash = await box('.act-dash');
      console.log(JSON.stringify({ stage, dpad, acts, atk, dash }));
      check('AC9 D-pad + nút Đánh + nút Né hiển thị', dpad.display !== 'none' && acts.display !== 'none' && atk.w > 0 && dash.w > 0, JSON.stringify({ dpad: dpad.display, acts: acts.display }));
      check('AC9 nút đủ lớn để chạm (>=44px)', atk.w >= 44 && atk.h >= 44 && dash.w >= 44 && dash.h >= 44 && dpad.w >= 140);
      check('AC9 điều khiển không đè lên đấu trường (stage.bottom <= đỉnh d-pad/nút)', stage.b <= dpad.y + 1 && stage.b <= acts.y + 1, `stage.b=${stage.b} dpad.y=${dpad.y} acts.y=${acts.y}`);
      check('AC9 D-pad và nhóm nút không chồng nhau, nằm trong màn hình', dpad.r <= acts.x && acts.r <= 390 && acts.b <= 844 && dpad.x >= 0, JSON.stringify({ dpadR: dpad.r, actsX: acts.x, actsR: acts.r }));
      const hud = await p.evaluate(() => { const h = document.querySelector('.boss-hud'); const pills = [...h.querySelectorAll('.hud-pill')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }); return { sw: h.scrollWidth, cw: h.clientWidth, docSw: document.documentElement.scrollWidth, iw: innerWidth, pills }; });
      console.log('HUD', JSON.stringify(hud));
      check('AC9 HUD không tràn ngang (scrollWidth<=390, mọi pill trong 0..390)', hud.sw <= 390 && hud.docSw <= 390 && hud.pills.every(([l, r]) => l >= 0 && r <= 390), JSON.stringify(hud));
      await p.screenshot({ path: SHOT + 'boss-06-mobile.png' });

      const cdp = await s.ctx.newCDPSession(p);
      const touch = async (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
      const center = (b) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
      await p.evaluate(() => {
        window.__seen = { atk: false, dash: false };
        const f = () => { const sn = window.__vtBoss.snapshot(); if (sn.player.attacking) window.__seen.atk = true; if (sn.player.dashing) window.__seen.dash = true; requestAnimationFrame(f); };
        f();
        window.__vtBoss.setInvincible(true);
      });
      // D-pad phải: x tăng
      const x0 = (await snap(p)).player.x;
      const dr = await box('.dpad .right');
      await touch('touchStart', [{ ...center(dr), id: 1 }]);
      await p.waitForFunction((x) => window.__vtBoss.snapshot().player.x > x + 15, x0, { timeout: 10000 });
      await touch('touchEnd', []);
      const x1 = (await snap(p)).player.x;
      await p.waitForTimeout(300);
      const x2 = (await snap(p)).player.x;
      check('AC9 chạm giữ ▶: nhân vật đi sang phải; thả tay thì dừng', x1 > x0 + 15 && Math.abs(x2 - x1) < 0.5, `${x0} -> ${x1} -> ${x2}`);
      // D-pad lên
      const y0 = (await snap(p)).player.y;
      const du = await box('.dpad .up');
      await touch('touchStart', [{ ...center(du), id: 2 }]);
      await p.waitForFunction((y) => window.__vtBoss.snapshot().player.y < y - 15, y0, { timeout: 10000 });
      await touch('touchEnd', []);
      check('AC9 chạm giữ ▲: nhân vật đi lên', (await snap(p)).player.y < y0 - 15);
      // Đánh
      await touch('touchStart', [{ ...center(atk), id: 3 }]);
      await p.waitForFunction(() => window.__seen.atk, null, { timeout: 5000 }).catch(() => {});
      await touch('touchEnd', []);
      check('AC9 chạm Đánh -> snapshot().player.attacking=true', await p.evaluate(() => window.__seen.atk));
      await p.waitForTimeout(450);
      // Né
      await touch('touchStart', [{ ...center(dash), id: 4 }]);
      await p.waitForFunction(() => window.__seen.dash, null, { timeout: 5000 }).catch(() => {});
      await touch('touchEnd', []);
      check('AC9 chạm Né -> snapshot().player.dashing=true', await p.evaluate(() => window.__seen.dash));
      // đa chạm: giữ ▶ và bấm Đánh cùng lúc
      await p.waitForTimeout(900);
      await p.evaluate(() => { window.__seen = { atk: false, dash: false }; });
      const xm = (await snap(p)).player.x;
      await touch('touchStart', [{ ...center(dr), id: 5 }]);
      await touch('touchStart', [{ ...center(dr), id: 5 }, { ...center(atk), id: 6 }]);
      await p.waitForFunction(() => window.__seen.atk, null, { timeout: 5000 }).catch(() => {});
      await p.waitForFunction((x) => window.__vtBoss.snapshot().player.x > x + 8, xm, { timeout: 5000 }).catch(() => {});
      await touch('touchEnd', []);
      check('AC9 đa chạm: vừa giữ ▶ vừa Đánh đều có tác dụng', (await p.evaluate(() => window.__seen.atk)) && (await snap(p)).player.x > xm + 8);
      await p.screenshot({ path: SHOT + 'boss-06b-mobile-play.png' });
      // thẻ câu hỏi trên mobile
      await p.evaluate(() => window.__vtBoss.dropChip());
      let sn = await steps(p, 5);
      if (!sn.waiting) { await p.keyboard.down('ArrowDown'); await steps(p, 10); await p.keyboard.up('ArrowDown'); }
      await p.waitForSelector('.q-card');
      const qc = await box('.q-card');
      check('AC9 thẻ câu hỏi nằm gọn trong màn hình 390x844', qc.x >= 0 && qc.r <= 390 && qc.y >= 0 && qc.b <= 844, JSON.stringify(qc));
      await p.screenshot({ path: SHOT + 'boss-06c-mobile-card.png' });
      await closeS(s, 'AC9 mobile');
      await resetLp();
    }
    // ====================================================================== PART g (hồi quy level thường)
    if (PARTS.includes('g')) {
      console.log('--- PART g');
      await resetLp();
      const s = await session();
      await s.page.goto(`${BASE}/play/${lv['cyber-world'][1]}?e2e=1`);
      await s.page.waitForSelector('.hud');
      await s.page.waitForFunction(() => window.__vtGame);
      check('HỒI QUY cyber lv1: vẫn là màn NPC (không .boss-root, không __vtBoss)', (await s.page.locator('.boss-root, .boss-hearts').count()) === 0 && !(await s.page.evaluate(() => !!window.__vtBoss)));
      let okCount = 0;
      await s.page.waitForTimeout(800);
      for (let i = 0; i < 3; i++) {
        await s.page.waitForTimeout(250);
        await s.page.evaluate((i) => window.__vtGame.walkToNpc(i), i);
        try { await s.page.waitForSelector('.q-card', { timeout: 20000 }); } catch (e) { await s.page.screenshot({ path: SHOT + 'boss-09-stuck.png' }); console.log(JSON.stringify(await s.page.evaluate(() => { const g = window.__vtGame; return { player: g.player, near: g.near, paused: g.paused, path: g.path.length, npcs: g.npcs.map((n) => [n.tx, n.ty, n.state]) }; }))); throw e; }
        const prompt = (await s.page.textContent('.q-prompt')).trim();
        const { rows } = await pg.query('SELECT correct_index, type FROM questions WHERE prompt=$1 LIMIT 1', [prompt]);
        const choose = i < 2 ? rows[0].correct_index : (rows[0].correct_index + 1) % (rows[0].type === 'MCQ' ? 4 : 2);
        await s.page.locator('.q-opt').nth(choose).click();
        await s.page.click('button:has-text("Trả lời")');
        await s.page.waitForSelector('.q-feedback');
        if (/Chính xác/.test(await s.page.textContent('.q-feedback'))) okCount++;
        await s.page.keyboard.press('Enter');
        await s.page.waitForSelector('.q-card', { state: 'detached' });
      }
      check('HỒI QUY cyber lv1: đi tới NPC, trả lời 3 câu (2 đúng 1 sai) chấm đúng', okCount === 2, okCount);
      await s.page.screenshot({ path: SHOT + 'boss-09-regress-lv1.png' });
      await closeS(s, 'hồi quy lv1');
      await resetLp();
    }

  } finally {
    // dọn dữ liệu: chỉ xoá attempts do script tạo; khôi phục level_progress ban đầu
    const now = await q('select id from attempts where user_id=$1', [hs01]);
    const mine = now.map((r) => r.id).filter((id) => !attBefore.has(id));
    if (mine.length) {
      await pg.query('delete from attempt_answers where attempt_id = any($1)', [mine]);
      await pg.query('delete from attempts where id = any($1)', [mine]);
    }
    await resetLp();
    for (const r of lpBefore)
      await pg.query('insert into level_progress (user_id, level_id, best_correct, best_stars, passed, plays, updated_at) values ($1,$2,$3,$4,$5,$6,$7)', [r.user_id, r.level_id, r.best_correct, r.best_stars, r.passed, r.plays, r.updated_at]);
    const att2 = await q('select id from attempts where user_id=$1', [hs01]);
    const lp2 = await q('select count(*) c from level_progress where user_id=$1', [hs01]);
    console.log(`Dọn xong: xoá ${mine.length} attempts; attempts còn ${att2.length} (đầu ${attBefore.size}); level_progress ${lp2[0].c} (đầu ${lpBefore.length})`);
    await browser.close();
    await pg.end();
  }
  const failed = results.filter((x) => !x).length;
  console.log(`\nTỔNG: ${results.length - failed}/${results.length} PASS` + (allErrors.length ? `, lỗi JS: ${allErrors.length}` : ''));
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('LỖI SCRIPT', e); process.exit(2); });
