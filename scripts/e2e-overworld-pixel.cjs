// So pixel canvas overworld giữa 2 server (A = HEAD, B = working tree). Dùng: BASE_A, BASE_B, DATABASE_URL.
// Đóng băng: dừng rAF, time cố định, update(0.05) nhiều lần cho camera ổn định, rồi render() 1 lần và toDataURL.
const { chromium } = (() => { try { return require('playwright'); } catch { return require('playwright-core'); } })();
const { Client } = require('pg');
const fs = require('fs');
const BASES = { head: process.env.BASE_A, wt: process.env.BASE_B };
const OUT = process.env.OUT || '/tmp/pixshots'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const uid = (await pg.query(`select id from users where username='hs01'`)).rows[0].id;
  const backup = (await pg.query(`select * from level_progress where user_id=$1`, [uid])).rows;
  const worlds = (await pg.query(`select w.slug, w.id from worlds w order by w."order"`)).rows;
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const errors = [];
  const shots = {}; // key -> {head,wt}
  const lvOf = async (wid) => (await pg.query(`select id, number from levels where world_id=$1 order by number`, [wid])).rows;
  const setState = async (wid, state) => {
    const lvs = await lvOf(wid);
    await pg.query(`delete from level_progress where user_id=$1 and level_id = any($2)`, [uid, lvs.map(l => l.id)]);
    const nPassed = state === 'start' ? 0 : state === 'mid' ? 2 : lvs.length;
    for (const l of lvs.slice(0, nPassed))
      await pg.query(`insert into level_progress(user_id,level_id,best_correct,best_stars,passed,plays) values($1,$2,9,2,true,1)`, [uid, l.id]);
  };
  try {
    for (const w of worlds) {
      for (const state of ['start', 'mid', 'all']) {
        await setState(w.id, state);
        for (const [env, base] of Object.entries(BASES)) {
          const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
          const page = await ctx.newPage();
          page.on('pageerror', e => errors.push(`${env} ${w.slug}: pageerror ${e.message}`));
          page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`${env} ${w.slug}: console ${m.text()}`); });
          await page.goto(base + '/login');
          await page.fill('input[name=username]', 'hs01'); await page.fill('input[name=password]', '123456');
          await page.click('button:has-text("Vào chơi")'); await page.waitForURL('**/home');
          await page.goto(`${base}/world/${w.slug}?e2e=1`);
          await page.waitForFunction(() => window.__vtMap && document.querySelector('.worldmap canvas')?.width > 0);
          const n = await page.evaluate(() => window.__vtMap.map.stops.length);
          const targets = { l1: 0, l3: 2, finish: n - 1 };
          for (const [name, si] of Object.entries(targets)) {
            const data = await page.evaluate(([si]) => {
              const m = window.__vtMap; cancelAnimationFrame(m.raf); m.paused = false;
              const s = m.map.stops[si];
              // đặt gần nhà: thử vài ô quanh sân để tìm ô đi được
              let placed = false;
              for (const [dx, dy] of [[0,2],[0,3],[2,2],[-2,2],[0,-2],[2,0],[-2,0],[1,1]]) {
                m.debugTeleport(s.bx + dx, s.by + dy);
                const st = m.debugState();
                if (Math.floor(st.x) === s.bx + dx && Math.floor(st.y) === s.by + dy && !m.isBlockedAt?.(0,0)) { placed = true; break; }
              }
              m.time = 3.7;
              for (let i = 0; i < 300; i++) m.update(0.05);
              m.time = 3.7;
              m.render();
              return document.querySelector('.worldmap canvas').toDataURL('image/png');
            }, [si]);
            const key = `${w.slug}_${state}_${name}`;
            (shots[key] ??= {})[env] = data;
            fs.writeFileSync(`${OUT}/${key}_${env}.png`, Buffer.from(data.split(',')[1], 'base64'));
          }
          await ctx.close();
        }
      }
    }
    // So pixel trong trình duyệt
    const cmp = await browser.newPage();
    await cmp.goto('about:blank');
    let total = 0, diffKeys = 0;
    for (const [key, s] of Object.entries(shots)) {
      const r = await cmp.evaluate(async ([a, b]) => {
        const load = (u) => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = u; });
        const [ia, ib] = await Promise.all([load(a), load(b)]);
        if (ia.width !== ib.width || ia.height !== ib.height) return { size: false };
        const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(ia, 0, 0); const da = g.getImageData(0, 0, c.width, c.height).data;
        g.clearRect(0, 0, c.width, c.height); g.drawImage(ib, 0, 0); const db = g.getImageData(0, 0, c.width, c.height).data;
        let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
        for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i+1] !== db[i+1] || da[i+2] !== db[i+2] || da[i+3] !== db[i+3]) {
          n++; const p = i / 4, x = p % c.width, y = (p / c.width) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        return { size: true, w: c.width, h: c.height, n, bbox: n ? [x0, y0, x1, y1] : null };
      }, [s.head, s.wt]);
      total += r.n || 0; if (!r.size || r.n) diffKeys++;
      console.log((r.size && !r.n ? 'SAME ' : 'DIFF '), key, JSON.stringify(r));
    }
    console.log(`SHOTS=${Object.keys(shots).length} DIFF_SHOTS=${diffKeys} TOTAL_DIFF_PIXELS=${total}`);
  } finally {
    await pg.query(`delete from level_progress where user_id=$1`, [uid]);
    for (const r of backup) await pg.query(`insert into level_progress(user_id,level_id,best_correct,best_stars,passed,plays,updated_at) values($1,$2,$3,$4,$5,$6,$7)`, [r.user_id, r.level_id, r.best_correct, r.best_stars, r.passed, r.plays, r.updated_at]);
    console.log('restored level_progress rows:', backup.length);
    await browser.close(); await pg.end();
  }
  console.log('ERRORS:', JSON.stringify(errors));
  process.exit(errors.length ? 1 : 0);
})();
