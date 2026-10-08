// E2E Giai đoạn 1 Cyber World. Cần dev server (BASE_URL) + DATABASE_URL.
const { chromium } = (() => { try { return require('playwright'); } catch { return require('playwright-core'); } })();
const { Client } = require('pg');
const { execSync } = require('child_process');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOT = 'e2e-shots/'; require('fs').mkdirSync(SHOT, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', '-', name, info); };

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const q = async (s, p) => (await pg.query(s, p)).rows;
  const counts = async () => ({
    worlds: +(await q('select count(*) c from worlds'))[0].c,
    levels: +(await q('select count(*) c from levels'))[0].c,
    questions: +(await q('select count(*) c from questions'))[0].c,
    lp: +(await q('select count(*) c from level_progress'))[0].c,
    att: +(await q('select count(*) c from attempts'))[0].c,
  });

  // AC1: ensure-worlds idempotent
  const before = await counts();
  for (let i = 0; i < 3; i++) execSync('npx tsx --env-file=.env db/ensure-worlds.ts', { stdio: 'pipe' });
  const after = await counts();
  check('ensure-worlds x3: số dòng không đổi', JSON.stringify(before) === JSON.stringify(after), JSON.stringify({ before, after }));
  check('đúng 4 world', after.worlds === 4);
  const cw = await q(`select l.number, (select count(*) from questions qq where qq.level_id=l.id) n from levels l join worlds w on w.id=l.world_id where w.slug='cyber-world' order by l.number`);
  check('cyber-world 5 level x 15 câu', cw.length === 5 && cw.every(r => +r.n === 15), JSON.stringify(cw));
  const lvs = await q(`select l.id, l.number from levels l join worlds w on w.id=l.world_id where w.slug='cyber-world' order by l.number`);

  const hs01 = (await q(`select id from users where username='hs01'`))[0].id;
  // AC1b: dữ liệu tiến độ thật ở world cũ không bị đổi khi chạy lại ensure-worlds
  const seedIds = { lp: null, att: null };
  const oldLv = (await q(`select l.id from levels l join worlds w on w.id=l.world_id where w.slug='ai-cong-nghe' order by l.number limit 1`))[0].id;
  const hadLp = (await q('select 1 from level_progress where user_id=$1 and level_id=$2', [hs01, oldLv])).length > 0;
  try {
    if (!hadLp) { await pg.query('insert into level_progress (user_id, level_id, best_correct, best_stars, passed, plays) values ($1,$2,8,1,true,1)', [hs01, oldLv]); seedIds.lp = oldLv; }
    const qs = await q('select id, correct_index c from questions where level_id=$1 limit 3', [oldLv]);
    const [a] = await q(`insert into attempts (id, user_id, level_id, question_ids, correct_count, stars, finished_at) values ('e2e_' || substr(md5(random()::text),1,12), $1,$2,$3,3,1,now()) returning id`, [hs01, oldLv, JSON.stringify(qs.map(x => x.id))]);
    seedIds.att = a.id;
    for (const x of qs) await pg.query(`insert into attempt_answers (id, attempt_id, question_id, chosen_index, is_correct) values ('e2e_' || substr(md5(random()::text),1,12), $1,$2,$3,true)`, [a.id, x.id, x.c]);
    const snap = async () => ({ ...(await counts()), ans: +(await q('select count(*) c from attempt_answers'))[0].c, lpRows: JSON.stringify(await q('select * from level_progress order by user_id, level_id')) });
    const s1 = await snap();
    execSync('npx tsx --env-file=.env db/ensure-worlds.ts', { stdio: 'pipe' });
    const s2 = await snap();
    check('ensure-worlds giữ nguyên level_progress/attempts/attempt_answers (có dữ liệu thật)', JSON.stringify(s1) === JSON.stringify(s2) && s1.lp >= 1 && s1.att >= 1 && s1.ans >= 3, JSON.stringify({ lp: s1.lp, att: s1.att, ans: s1.ans }));
  } finally {
    if (seedIds.att) { await pg.query('delete from attempt_answers where attempt_id=$1', [seedIds.att]); await pg.query('delete from attempts where id=$1', [seedIds.att]); }
    if (seedIds.lp) await pg.query('delete from level_progress where user_id=$1 and level_id=$2', [hs01, seedIds.lp]);
  }

  const attBefore = new Set((await q('select id from attempts where user_id=$1', [hs01])).map(r => r.id));
  const lpBefore = await q('select * from level_progress where user_id=$1 and level_id=any($2)', [hs01, lvs.map(l => l.id)]);

  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  // "Failed to load resource" do chính các lệnh gọi API cố ý sai (403/404/400) -> bỏ qua dòng console đó,
  // nhưng mọi response >=400 ở URL khác /api/attempts vẫn tính là lỗi.
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\/api\/attempts/.test(r.url()) && !/favicon/.test(r.url())) errors.push('http ' + r.status() + ' ' + r.url()); });
  try {
    // Chưa đăng nhập -> redirect
    await page.goto(BASE + '/world/cyber-world');
    check('chưa đăng nhập bị chuyển về login', /login/.test(page.url()), page.url());
    await page.fill('input[name=username]', 'hs01');
    await page.fill('input[name=password]', '123456');
    await page.click('button:has-text("Vào chơi")');
    await page.waitForURL('**/home');
    const card = page.locator('a[href="/world/cyber-world"]');
    await card.waitFor();
    check('home có thẻ Cyber World', /Cyber World/.test(await card.textContent()));
    check('thẻ có hành tinh svg riêng', await card.locator('svg').count() > 0);
    await page.screenshot({ path: SHOT + 'cyber-01-home.png' });
    const stale = await page.locator('a.world-card').count();
    check('home có 4 thẻ thế giới', stale === 4, String(stale));
    await card.click();
    await page.waitForURL('**/world/cyber-world');
    await page.waitForSelector('.worldmap canvas');
    await page.waitForFunction(() => { const c = document.querySelector('.worldmap canvas'); return c && c.width > 0 && c.height > 0; });
    const painted = await page.evaluate(() => { const c = document.querySelector('.worldmap canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0 && (d[i-3]|d[i-2]|d[i-1])) n++; return n; });
    check('canvas overworld có pixel vẽ', painted > 100, String(painted));
    await page.screenshot({ path: SHOT + 'cyber-02-map.png' });

    // AC3: khoá/mở
    const api = (url, body) => page.evaluate(async ([u, b]) => { const r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return { status: r.status, json: await r.json().catch(() => null) }; }, [url, body]);
    const prog = lpBefore.filter(r => r.passed).length;
    for (const n of [2, 3, 4, 5]) {
      const r = await api('/api/attempts', { levelId: lvs[n - 1].id });
      check(`POST attempts level ${n} cyber -> 403`, r.status === 403 && prog === 0 ? true : r.status === 403, String(r.status));
    }
    // Case biên: levelId rác, body rỗng
    check('levelId không tồn tại -> 404', (await api('/api/attempts', { levelId: 'nope' })).status === 404);
    check('body sai kiểu -> 400', (await api('/api/attempts', { levelId: 5 })).status === 400);

    // AC4: chơi level 1 với 8/10 đúng, rồi 10/10, 7/10, 6/10 (biên)
    async function play(correctN) {
      const s = await api('/api/attempts', { levelId: lvs[0].id });
      if (s.status !== 200) return { err: s.status };
      const { attemptId, questions } = s.json;
      let i = 0;
      for (const qu of questions) {
        const [row] = await q('select correct_index c from questions where id=$1', [qu.id]);
        const n = qu.options.length;
        const ch = i < correctN ? row.c : (row.c + 1) % n;
        const a = await api(`/api/attempts/${attemptId}/answer`, { questionId: qu.id, chosenIndex: ch });
        if (a.json.correct !== (i < correctN)) return { err: 'chấm sai câu ' + i };
        i++;
      }
      const f = await api(`/api/attempts/${attemptId}/finish`, {});
      const f2 = await api(`/api/attempts/${attemptId}/finish`, {});
      return { total: questions.length, ...f.json, again: f2.json };
    }
    const expect = { 6: 0, 7: 1, 8: 1, 9: 2, 10: 3 };
    // 6/10 trước: chưa qua -> level 2 vẫn khoá
    let r = await play(6);
    check('6/10 -> 0 sao', r.total === 10 && r.correct === 6 && r.stars === 0, JSON.stringify(r));
    check('finish gọi 2 lần an toàn', JSON.stringify(r.again) === JSON.stringify({ correct: r.correct, total: r.total, stars: r.stars }));
    check('sau 6/10 level 2 vẫn khoá', (await api('/api/attempts', { levelId: lvs[1].id })).status === 403);
    for (const n of [7, 9, 10]) {
      r = await play(n);
      check(`${n}/10 -> ${expect[n]} sao`, r.correct === n && r.stars === expect[n], JSON.stringify(r));
    }
    const lp = (await q('select * from level_progress where user_id=$1 and level_id=$2', [hs01, lvs[0].id]))[0];
    check('level_progress giữ kết quả cao nhất (3 sao, passed)', lp && lp.best_stars === 3 && lp.passed && lp.best_correct === 10, JSON.stringify(lp));
    const s2 = await api('/api/attempts', { levelId: lvs[1].id });
    check('sau khi qua level 1, level 2 mở', s2.status === 200, String(s2.status));

    // UI: map hiển thị sau khi qua
    await page.goto(BASE + '/world/cyber-world');
    await page.waitForSelector('.worldmap canvas');
    await page.screenshot({ path: SHOT + 'cyber-03-map-after.png' });

    // Thế giới cũ không ảnh hưởng
    for (const slug of ['ai-cong-nghe', 'toan-ly-hoa', 'tieng-anh']) {
      const resp = await page.goto(BASE + '/world/' + slug);
      await page.waitForSelector('.worldmap canvas');
      const n = (await q(`select count(*) c from levels l join worlds w on w.id=l.world_id where w.slug=$1`, [slug]))[0].c;
      check(`world cũ ${slug} render OK`, resp.status() === 200 && +n > 0, 'levels=' + n);
    }
  } finally {
    // Dọn: xoá attempts do test tạo, khôi phục level_progress cyber của hs01
    const mine = (await q('select id from attempts where user_id=$1', [hs01])).map(r => r.id).filter(id => !attBefore.has(id));
    if (mine.length) {
      await pg.query('delete from attempt_answers where attempt_id=any($1)', [mine]);
      await pg.query('delete from attempts where id=any($1)', [mine]);
    }
    await pg.query('delete from level_progress where user_id=$1 and level_id=any($2)', [hs01, lvs.map(l => l.id)]);
    for (const r of lpBefore) await pg.query('insert into level_progress (user_id, level_id, best_correct, best_stars, passed, plays) values ($1,$2,$3,$4,$5,$6)', [r.user_id, r.level_id, r.best_correct, r.best_stars, r.passed, r.plays]);
  }
  const filtered = errors.filter(e => !/favicon/.test(e));
  check('không có lỗi pageerror/console', filtered.length === 0, JSON.stringify(filtered));
  await browser.close(); await pg.end();
  const bad = results.filter(x => !x).length;
  console.log(bad ? `FAILED ${bad}/${results.length}` : `ALL PASS ${results.length}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
