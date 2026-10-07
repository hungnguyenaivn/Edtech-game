// E2E Giai đoạn 2 Cyber World: sông bơi được. Cần dev server (BASE_URL) + DATABASE_URL.
// Dùng hook window.__vtMap (mở trang với ?e2e=1). Điều khiển thật bằng bàn phím / click canvas / D-pad.
const { chromium } = (() => { try { return require('playwright'); } catch { return require('playwright-core'); } })();
const { Client } = require('pg');
const fs = require('fs');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOT = 'e2e-shots/'; fs.mkdirSync(SHOT, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', '-', name, info); };
const near = (v, target, tol = 0.2) => Math.abs(v - target) <= target * tol;

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const hs01 = (await pg.query(`select id, skin from users where username='hs01'`)).rows[0];
  const origSkin = hs01.skin;
  const skinIds = [...fs.readFileSync('src/lib/skins.ts', 'utf8').matchAll(/^\s*id: "([a-z_-]+)", name:/gm)].map(m => m[1]);
  console.log('skin gốc hs01:', origSkin, '| skins:', skinIds.join(','));

  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errors = [];
  const watch = (page) => {
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push('http ' + r.status() + ' ' + r.url()); });
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const page = await ctx.newPage(); watch(page);

  const openMap = async (pg_, slug) => {
    await pg_.goto(`${BASE}/world/${slug}?e2e=1`);
    await pg_.waitForSelector('.worldmap canvas');
    await pg_.waitForFunction(() => window.__vtMap);
    await pg_.waitForFunction(() => { const c = document.querySelector('.worldmap canvas'); return c && c.width > 0; });
  };
  const st = (p = page) => p.evaluate(() => window.__vtMap.debugState());
  const tp = (x, y, p = page) => p.evaluate(([a, b]) => window.__vtMap.debugTeleport(a, b), [x, y]);
  const frames = (n, p = page) => p.evaluate((k) => new Promise(r => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  // Ghi trạng thái mỗi khung hình trong dur ms (chạy trong trang, không phụ thuộc độ trễ Playwright)
  const sample = (dur, p = page) => p.evaluate((d) => new Promise(res => {
    const out = []; const t0 = performance.now();
    const f = () => { const s = window.__vtMap.debugState(); out.push({ t: performance.now() - t0, ...s }); if (performance.now() - t0 < d) requestAnimationFrame(f); else res(out); };
    requestAnimationFrame(f);
  }), dur);
  const hold = async (key, dur, p = page) => { await p.keyboard.down(key); try { return await sample(dur, p); } finally { await p.keyboard.up(key); } };
  const speedOf = (tr, from = 200) => { const a = tr.find(s => s.t >= from); const b = tr[tr.length - 1]; return Math.hypot(b.x - a.x, b.y - a.y) / ((b.t - a.t) / 1000); };

  // Thoát sông: giữ phím chính; nếu kẹt góc (cây sát bờ) thì đổi sang ↑/↓ rồi thử lại. Trả về số vòng cần.
  const escapeRiver = async (key, side, refX, p = page) => {
    const sideOk = (s) => s.mode === 'walk' && (side === 'tây' ? s.x < refX - 0.5 : s.x > refX + 0.5);
    let swum = false;
    for (let round = 0; round < 8; round++) {
      const tr = await hold(key, 3000, p);
      swum = swum || tr.some(s => s.mode === 'swim');
      if (tr.some(sideOk)) return { ok: true, rounds: round + 1, swum };
      const alt = await hold(round % 2 ? 'ArrowDown' : 'ArrowUp', 900, p);
      if (alt.some(sideOk)) return { ok: true, rounds: round + 1, swum };
    }
    return { ok: false, rounds: 8, swum };
  };
  const extraLevels = [];
  const addLevels = async (slug, n) => {
    const w = (await pg.query('select id from worlds where slug=$1', [slug])).rows[0].id;
    const cur = +(await pg.query('select max(number) m from levels where world_id=$1', [w])).rows[0].m;
    for (let i = 1; i <= n; i++) { const id = 'e2e_lv_' + slug + '_' + i; await pg.query('insert into levels (id, world_id, number, title) values ($1,$2,$3,$4)', [id, w, cur + i, 'E2E tạm ' + i]); extraLevels.push(id); }
  };

  try {
    await page.goto(BASE + '/login');
    await page.fill('input[name=username]', 'hs01');
    await page.fill('input[name=password]', '123456');
    await page.click('button:has-text("Vào chơi")');
    await page.waitForURL('**/home');

    // ---------- AC1: có sông
    await openMap(page, 'cyber-world');
    const water = await page.evaluate(() => window.__vtMap.debugWater());
    const byRow = {}; water.forEach(c => (byRow[c.y] ??= []).push(c.x));
    const widths = Object.values(byRow).map(a => a.length);
    check('cyber-world có ≥100 ô nước', water.length >= 100, String(water.length));
    check('mỗi hàng nước rộng 3–4 ô', widths.every(w => w >= 3 && w <= 4), `hàng=${widths.length} min=${Math.min(...widths)} max=${Math.max(...widths)}`);
    const spawn = await st();
    check('xuất phát ở chế độ walk', spawn.mode === 'walk' && spawn.speed === 3.4, JSON.stringify(spawn));
    await page.screenshot({ path: SHOT + 'swim-01-map.png' });

    // ---------- AC2/3: đi vào nước, đổi mode/speed, đo tốc độ thực
    // Ứng viên băng sông theo hàng y: bắt đầu bờ tây, giữ → ; bờ đông giữ ←
    const crossings = [];
    for (const y of [8, 14, 20, 26, 32]) {
      const xs = byRow[y]; const x0 = Math.min(...xs) - 2;
      await tp(x0, y); await frames(3);
      const base = await st();
      const tr = await hold('ArrowRight', 2500);
      const swimIdx = tr.findIndex(s => s.mode === 'swim');
      const speedOk = tr.every(s => s.speed === (s.mode === 'swim' ? 1.8 : 3.4));
      const swimZ = tr.filter((s, i) => s.mode === 'swim' && i - swimIdx > 15).map(s => s.z);
      // tiếp tục (có đổi hướng nếu kẹt góc) cho tới khi lên bờ đông, kiểm tra mode/speed khi lên bờ
      const esc = await escapeRiver('ArrowRight', 'đông', Math.max(...xs));
      const after = await st();
      crossings.push({ y, entered: swimIdx >= 0, exited: esc.ok && after.mode === 'walk' && after.speed === 3.4, rounds: esc.rounds, speedOk, bankZ: base.z, swimZmax: swimZ.length ? Math.max(...swimZ) : null, after: { x: +after.x.toFixed(2), z: after.z, mode: after.mode } });
    }
    console.log(JSON.stringify(crossings));
    check('đi vào nước → mode "swim" (mọi hàng thử)', crossings.every(c => c.entered), JSON.stringify(crossings.map(c => c.entered)));
    check('ra khỏi nước → mode "walk", speed 3.4 (mọi hàng thử)', crossings.every(c => c.exited), JSON.stringify(crossings.map(c => c.exited)));
    check('debugState.speed luôn khớp mode (swim 1.8 / walk 3.4)', crossings.every(c => c.speedOk));
    check('bơi: z thấp hơn nền bờ', crossings.every(c => c.swimZmax !== null && c.swimZmax < c.bankZ - 0.1), JSON.stringify(crossings.map(c => [c.bankZ, c.swimZmax])));

    // Đo tốc độ thực: bơi dọc sông (↓) giữa dòng, đi bộ trên đất trống
    const swimSpeeds = [];
    for (const x of [30, 29]) {
      await tp(x, 5); await frames(10);
      const tr = await hold('ArrowDown', 1700);
      const allSwim = tr.every(s => s.mode === 'swim');
      swimSpeeds.push({ x, allSwim, v: speedOf(tr) });
    }
    console.log('tốc độ bơi', JSON.stringify(swimSpeeds));
    check('tốc độ bơi thực ≈ 1.8 ô/s (±20%)', swimSpeeds.every(s => s.allSwim && near(s.v, 1.8)), JSON.stringify(swimSpeeds.map(s => +s.v.toFixed(2))));
    // đi bộ: thử nhiều điểm/hướng ở bờ tây, lấy các lần không bị cản (mode luôn walk)
    const walkSpeeds = [];
    for (const [x, y, k] of [[22, 40, 'ArrowUp'], [10, 40, 'ArrowRight'], [12, 33, 'ArrowUp'], [20, 12, 'ArrowDown'], [18, 28, 'ArrowDown'], [4, 30, 'ArrowDown']]) {
      await tp(x, y); await frames(5);
      const tr = await hold(k, 1300);
      walkSpeeds.push({ x, y, k, allWalk: tr.every(s => s.mode === 'walk'), v: speedOf(tr) });
    }
    console.log('tốc độ đi bộ', JSON.stringify(walkSpeeds.map(w => ({ ...w, v: +w.v.toFixed(2) }))));
    const free = walkSpeeds.filter(w => w.allWalk && w.v > 3.4 * 0.5);
    const max = Math.max(...walkSpeeds.map(w => w.v));
    check('tốc độ đi bộ thực ≈ 3.4 ô/s (±20%) và không vượt', near(max, 3.4) && walkSpeeds.every(w => w.v <= 3.4 * 1.2), `max=${max.toFixed(2)} lần_không_cản=${free.length}`);
    const ratio = Math.max(...swimSpeeds.map(s => s.v)) / max;
    check('bơi chậm hơn đi bộ (~0.53)', ratio > 0.4 && ratio < 0.65, ratio.toFixed(2));

    // ---------- AC3b: không kẹt khi ở giữa sông
    const stuck = [];
    for (const y of [4, 9, 14, 19, 24, 29, 34, 38]) {
      const row = byRow[y]; const cx = row[Math.floor(row.length / 2)];
      for (const [key, side] of [['ArrowLeft', 'tây'], ['ArrowRight', 'đông']]) {
        await tp(cx, y); await frames(5);
        const e = await escapeRiver(key, side, cx);
        stuck.push({ y, side, ...e });
      }
    }
    console.log('thoát sông', JSON.stringify(stuck.map(s => `${s.y}${s.side[0]}:${s.ok}/${s.rounds}`)));
    check('từ giữa sông đi ra được cả hai phía (8 điểm × 2)', stuck.every(s => s.swum && s.ok), JSON.stringify(stuck.filter(s => !s.ok)));
    const needAlt = stuck.filter(s => s.rounds > 1);
    console.log('ghi chú: cần đổi hướng (kẹt góc cây/bờ khi giữ 1 phím chéo):', JSON.stringify(needAlt.map(s => `${s.y}${s.side[0]}`)));

    // ---------- AC4: click ô nước giữa sông
    const clickTile = async (tx, ty) => {
      const pos = await page.evaluate(([x, y]) => {
        const m = window.__vtMap; const r = m.canvas.getBoundingClientRect();
        return { x: r.left + (m.projX(x + 0.5, y + 0.5) - m.cam.x) * m.zoom, y: r.top + (m.projY(x + 0.5, y + 0.5, 0) - m.cam.y) * m.zoom };
      }, [tx, ty]);
      await page.mouse.click(pos.x, pos.y);
      return pos;
    };
    const clicks = [];
    for (const ty of [17, 22, 27]) {
      // chọn ô nước trong hàng ty mà điểm giữa ô thực sự "nhặt" ra đúng ô đó (không bị bờ cao che)
      await tp(Math.min(...byRow[ty]) - 3, ty); await frames(8);
      let tx = null;
      for (const cx of byRow[ty]) {
        const okPick = await page.evaluate(([x, y]) => { const m = window.__vtMap; const t = m.pickTile(m.projX(x + 0.5, y + 0.5), m.projY(x + 0.5, y + 0.5, 0)); return !!t && t.x === x && t.y === y; }, [cx, ty]);
        if (okPick) { tx = cx; break; }
      }
      if (tx === null) { clicks.push({ ty, ok: false, note: 'không có ô nhặt được' }); continue; }
      const startS = await st();
      const pos = await clickTile(tx, ty);
      const started = (await st()).paths;
      let ok = true;
      try {
        await page.waitForFunction(() => window.__vtMap.debugState().paths === 0 && window.__vtMap.debugState().mode === 'swim', null, { timeout: 15000, polling: 100 });
      } catch { ok = false; }
      const final = await st();
      clicks.push({ tx, ty, start: [startS.tx, startS.ty], started, ok, final: { tx: final.tx, ty: final.ty, mode: final.mode, paths: final.paths } });
    }
    console.log('click nước', JSON.stringify(clicks));
    check('click ô nước giữa sông → tự đi tới, bơi đúng ô, paths=0', clicks.every(c => c.ok && c.final && c.final.tx === c.tx && c.final.ty === c.ty && c.final.mode === 'swim' && c.final.paths === 0 && c.started > 0), '');
    await page.screenshot({ path: SHOT + 'swim-02-click-water.png' });

    // ---------- AC5: đi bộ tới mọi nhà + kho báu không cần bơi
    const nStops = await page.evaluate(() => window.__vtMap.map.stops.length);
    const routes = [];
    for (let i = 0; i < nStops; i++) {
      await tp(Math.floor(spawn.x), Math.floor(spawn.y)); await frames(5);
      await page.evaluate((k) => window.__vtMap.walkTo(k, false), i);
      const t = await page.evaluate(([k]) => new Promise(res => {
        const m = window.__vtMap; const t0 = performance.now(); let swam = false;
        const f = () => { const s = m.debugState(); if (s.mode === 'swim') swam = true;
          if (s.paths === 0 && performance.now() - t0 > 200) { const st = m.map.stops[k]; res({ swam, done: true, d: Math.hypot(st.bx + 1 - s.x, st.by + 2.5 - s.y) }); return; }
          if (performance.now() - t0 > 25000) { res({ swam, done: false }); return; }
          requestAnimationFrame(f); };
        requestAnimationFrame(f);
      }), [i]);
      routes.push({ stop: i, ...t });
    }
    console.log('đường tới nhà', JSON.stringify(routes));
    check(`đi bộ tới ${nStops} điểm (5 nhà + kho báu) không lần nào bơi và tới nơi`, routes.every(r => r.done && !r.swam && r.d < 2.0), '');
    // click thật vào nhà bị khoá (không điều hướng) + nút "Tới level của em"
    const btn = page.locator('button:has-text("Tới level của em")');
    if (await btn.count()) {
      await tp(Math.floor(spawn.x), Math.floor(spawn.y)); await frames(5);
      await btn.click();
      const t = await page.evaluate(() => new Promise(res => { const m = window.__vtMap; let swam = false; const t0 = performance.now();
        const f = () => { const s = m.debugState(); if (s.mode === 'swim') swam = true; if ((s.paths === 0 && performance.now() - t0 > 300) || performance.now() - t0 > 25000) res({ swam, paths: s.paths }); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
      check('nút "Tới level của em": không bơi, đi tới nơi', !t.swam && t.paths === 0, JSON.stringify(t));
    } else check('nút "Tới level của em" tồn tại', false, 'không thấy nút');
    const lockedClicks = [];
    for (let i = 2; i < 5; i++) {
      await tp(Math.floor(spawn.x), Math.floor(spawn.y)); await frames(5);
      const pos = await page.evaluate((k) => { const m = window.__vtMap; const s = m.map.stops[k]; const r = m.canvas.getBoundingClientRect(); const ax = m.projX(s.bx, s.by), ay = m.projY(s.bx + 1, s.by + 1, s.h);
        return { vis: ax - m.cam.x > 0 && ay - m.cam.y > 0 && (ax - m.cam.x) * m.zoom < r.width && (ay - m.cam.y) * m.zoom < r.height, x: r.left + (ax - m.cam.x) * m.zoom, y: r.top + (ay - m.cam.y - 20) * m.zoom }; }, i);
      if (!pos.vis) { lockedClicks.push({ i, skipped: 'ngoài màn hình' }); continue; }
      await page.mouse.click(pos.x, pos.y);
      const t = await page.evaluate(() => new Promise(res => { const m = window.__vtMap; let swam = false; const t0 = performance.now();
        const f = () => { const s = m.debugState(); if (s.mode === 'swim') swam = true; if ((s.paths === 0 && performance.now() - t0 > 300) || performance.now() - t0 > 25000) res({ swam, paths: s.paths }); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
      lockedClicks.push({ i, ...t, url: page.url().includes('/world/') });
    }
    console.log('click nhà', JSON.stringify(lockedClicks));
    check('click thật vào nhà: đi bộ, không bơi', lockedClicks.filter(c => !c.skipped).every(c => !c.swam && c.paths === 0), JSON.stringify(lockedClicks));

    // ---------- AC6: mọi skin
    for (const id of skinIds) {
      await pg.query('update users set skin=$1 where id=$2', [id, hs01.id]);
      await openMap(page, 'cyber-world');
      await tp(29, 20); await frames(30);
      const s = await st();
      await page.screenshot({ path: `${SHOT}swim-skin-${id}.png` });
      check(`skin ${id}: bơi trong sông, mode swim, render OK`, s.mode === 'swim' && s.z < 0, `mode=${s.mode} z=${s.z.toFixed(2)}`);
    }

    // ---------- AC7: hồi quy các world khác
    // Với 5 level, bản đồ toan-ly-hoa/tieng-anh KHÔNG sinh ao (cũng đúng ở HEAD). Thêm level tạm (xoá ở finally) để có ao thật.
    await addLevels('toan-ly-hoa', 3); // 8 level -> có ao
    await addLevels('tieng-anh', 1); // 6 level -> có ao
    for (const slug of ['toan-ly-hoa', 'tieng-anh', 'ai-cong-nghe']) {
      await openMap(page, slug);
      await frames(40);
      const painted = await page.evaluate(() => { const c = document.querySelector('.worldmap canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 388) if (d[i] > 0 && (d[i - 3] | d[i - 2] | d[i - 1])) n++; return n; });
      const w = await page.evaluate(() => window.__vtMap.debugWater());
      check(`world ${slug} render`, painted > 100, `pixels=${painted} nước=${w.length}`);
      await page.screenshot({ path: `${SHOT}swim-reg-${slug}.png` });
      if (slug === 'toan-ly-hoa' || slug === 'tieng-anh') {
        check(slug + ' có ô nước (ao)', w.length > 0, String(w.length));
        const wset = new Set(w.map(c => c.x + ',' + c.y));
        const dirs = [['ArrowRight', 1, 0], ['ArrowLeft', -1, 0], ['ArrowDown', 0, 1], ['ArrowUp', 0, -1]];
        const att = []; let tried = 0;
        const pick = w.filter((_, i) => i % Math.max(1, Math.floor(w.length / 12)) === 0);
        for (const c of pick) for (const [k, dx, dy] of dirs) {
          const nx = c.x - dx, ny = c.y - dy;
          if (wset.has(nx + ',' + ny)) continue;
          await tp(nx, ny); await frames(3);
          const tr = await hold(k, 700);
          tried++;
          att.push({ swim: tr.some(s => s.mode === 'swim'), inWater: tr.some(s => wset.has(s.tx + ',' + s.ty) && s.tx !== nx), speedBad: tr.some(s => s.speed !== 3.4) });
        }
        check('ao toan-ly-hoa: giữ phím vào nước không bao giờ swim / không lọt vào ô nước', tried > 0 && att.every(a => !a.swim && !a.inWater && !a.speedBad), `thử ${tried} lần; vi phạm=${att.filter(a => a.swim || a.inWater).length}`);
      }
    }

    // ---------- AC8: mobile D-pad
    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const mp = await mctx.newPage(); watch(mp);
    await mp.goto(BASE + '/login');
    await mp.fill('input[name=username]', 'hs01'); await mp.fill('input[name=password]', '123456');
    await mp.click('button:has-text("Vào chơi")'); await mp.waitForURL('**/home');
    await pg.query('update users set skin=$1 where id=$2', [origSkin, hs01.id]);
    await openMap(mp, 'cyber-world');
    const dpadVisible = await mp.locator('.dpad').isVisible();
    check('mobile: D-pad hiển thị', dpadVisible);
    const press = async (cls, dur) => {
      const bb = await mp.locator(`.dpad .${cls}`).boundingBox();
      const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
      const cdp = await mctx.newCDPSession(mp);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
      const tr = await sample(dur, mp);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
      return tr;
    };
    await tp(25, 20, mp); await frames(5, mp);
    const mIn = await press('right', 1800);
    check('mobile: D-pad ▶ vào nước → swim, speed 1.8', mIn.some(s => s.mode === 'swim' && s.speed === 1.8), `modes=${[...new Set(mIn.map(s => s.mode))]}`);
    await mp.screenshot({ path: SHOT + 'swim-mobile-in.png' });
    const mOut = await press('left', 4500);
    const last = mOut[mOut.length - 1];
    check('mobile: D-pad ◀ ra khỏi nước → walk, speed 3.4', mOut.some(s => s.mode === 'walk' && s.speed === 3.4 && mOut.slice(0, mOut.indexOf(s)).some(q => q.mode === 'swim')) && last.x < 26.9, `end=${last.x.toFixed(2)} ${last.mode}`);
    await mp.screenshot({ path: SHOT + 'swim-mobile-out.png' });
    await mctx.close();
  } catch (e) {
    check('script không crash', false, String(e && e.stack || e));
  } finally {
    if (extraLevels.length) await pg.query('delete from levels where id = any($1)', [extraLevels]);
    const left = +(await pg.query(`select count(*) c from levels where id like 'e2e_lv_%'`)).rows[0].c;
    check('đã dọn level tạm', left === 0, String(left));
    await pg.query('update users set skin=$1 where id=$2', [origSkin, hs01.id]);
    const now = (await pg.query('select skin from users where id=$1', [hs01.id])).rows[0].skin;
    check('đã khôi phục skin hs01', now === origSkin, `${origSkin} -> ${now}`);
  }
  check('không có pageerror / console error / http>=400', errors.length === 0, JSON.stringify([...new Set(errors)].slice(0, 8)));
  await browser.close(); await pg.end();
  const bad = results.filter(x => !x).length;
  console.log(bad ? `FAILED ${bad}/${results.length}` : `ALL PASS ${results.length}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
