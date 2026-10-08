// E2E Giai đoạn 3 Cyber World: nhà trên cây leo được. Cần dev server (BASE_URL) + DATABASE_URL.
// Dùng hook window.__vtMap (mở trang với ?e2e=1). Điều khiển thật bằng bàn phím / click chuột lên canvas / D-pad cảm ứng.
// Không ghi gì vào DB (chỉ đọc hs01 để xác nhận tài khoản tồn tại).
const { chromium } = (() => { try { return require('playwright'); } catch { return require('playwright-core'); } })();
const { Client } = require('pg');
const fs = require('fs');
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SHOT = 'e2e-shots/'; fs.mkdirSync(SHOT, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', '-', name, info); };
const near = (v, target, tol = 0.25) => Math.abs(v - target) <= Math.abs(target) * tol;
const r2 = (v) => +(+v).toFixed(2);
// PART=a,b,c,d chọn phần chạy (mặc định chạy hết). a: AC2/3/5 leo bàn phím; b: AC4 đi trên sàn; c: AC6/7 click + nút; d: AC8 walkTo + phiên bản + AC9 mobile.
const want = (k) => !process.env.PART || process.env.PART.split(',').includes(k);

(async () => {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const hs01 = (await pg.query(`select id from users where username='hs01'`)).rows[0];
  check('tài khoản hs01 tồn tại', !!hs01);

  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const errors = [];
  const watch = (page) => {
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    page.on('response', r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push('http ' + r.status() + ' ' + r.url()); });
  };
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 860 } });
  const page = await ctx.newPage(); watch(page);

  const login = async (p) => {
    await p.goto(BASE + '/login');
    await p.fill('input[name=username]', 'hs01'); await p.fill('input[name=password]', '123456');
    await p.click('button:has-text("Vào chơi")'); await p.waitForURL('**/home');
  };
  const openMap = async (p, slug) => {
    await p.goto(`${BASE}/world/${slug}?e2e=1`);
    await p.waitForSelector('.worldmap canvas');
    await p.waitForFunction(() => window.__vtMap);
    await p.waitForFunction(() => { const c = document.querySelector('.worldmap canvas'); return c && c.width > 0; });
  };
  const st = (p = page) => p.evaluate(() => window.__vtMap.debugState());
  const tp = (x, y, p = page) => p.evaluate(([a, b]) => window.__vtMap.debugTeleport(a, b), [x, y]);
  const frames = (n, p = page) => p.evaluate((k) => new Promise(r => { let i = 0; const f = () => (++i >= k ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  // Ghi trạng thái mỗi khung hình tối đa maxMs, dừng sớm khi biểu thức `until` (theo s = mẫu hiện tại, out = các mẫu trước) đúng.
  const sampleUntil = (until, maxMs, p = page) => p.evaluate(([src, d]) => new Promise(res => {
    const stop = src ? new Function('s', 'out', 'return (' + src + ')') : () => false;
    const out = []; const t0 = performance.now();
    const f = () => {
      const s = window.__vtMap.debugState(); out.push({ t: performance.now() - t0, ...s });
      if (stop(s, out) || performance.now() - t0 >= d) res(out); else requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }), [until, maxMs]);
  const hold = async (key, until, maxMs, p = page) => { await p.keyboard.down(key); try { return await sampleUntil(until, maxMs, p); } finally { await p.keyboard.up(key); } };
  const seq = (tr) => tr.map(s => s.mode).filter((m, i, a) => i === 0 || m !== a[i - 1]);
  const maxJump = (tr, f) => tr.slice(1).reduce((m, s, i) => Math.max(m, Math.abs(f(s) - f(tr[i]))), 0);
  const maxXY = (tr) => tr.slice(1).reduce((m, s, i) => Math.max(m, Math.hypot(s.x - tr[i].x, s.y - tr[i].y)), 0);
  const maxGap = (tr) => tr.slice(1).reduce((m, s, i) => Math.max(m, s.t - tr[i].t), 0);
  const monotone = (tr, f, dir) => tr.slice(1).every((s, i) => dir * (f(s) - f(tr[i])) >= -1e-6);
  const settle = async (p = page) => { await p.waitForFunction(() => { const s = window.__vtMap.debugState(); return s.paths === 0 && s.mode !== 'climb'; }, null, { polling: 'raf', timeout: 4000 }); };

  // Vị trí màn hình (toạ độ trang) của giữa ô (tx,ty) ở độ cao mặt đứng của ô
  const tilePos = (tx, ty, p = page) => p.evaluate(([x, y]) => {
    const m = window.__vtMap; const r = m.canvas.getBoundingClientRect(); const z = m.tileH(x, y);
    const sx = r.left + (m.projX(x + 0.5, y + 0.5) - m.cam.x) * m.zoom;
    const sy = r.top + (m.projY(x + 0.5, y + 0.5, z) - m.cam.y) * m.zoom;
    const t = m.pickTile(m.projX(x + 0.5, y + 0.5), m.projY(x + 0.5, y + 0.5, z));
    return { sx, sy, picked: t && t.x === x && t.y === y, visible: sx > r.left + 5 && sx < r.right - 5 && sy > r.top + 5 && sy < r.bottom - 5 };
  }, [tx, ty]);
  const clickTile = async (tx, ty, p = page) => { const pos = await tilePos(tx, ty, p); await p.mouse.click(pos.sx, pos.sy); return pos; };
  // Chờ tới nơi: không còn đường đi, không còn leo
  const arrived = async (p = page, timeout = 20000) => {
    const saw = { climb: false };
    // ghi nhận có mode climb trong lúc đi (rAF trong trang)
    await p.evaluate(() => { window.__sawClimb = false; const m = window.__vtMap; const f = () => { if (m.debugState().mode === 'climb') window.__sawClimb = true; window.__sawLoop = requestAnimationFrame(f); }; window.__sawLoop = requestAnimationFrame(f); });
    let ok = true;
    try { await p.waitForFunction(() => { const s = window.__vtMap.debugState(); return s.paths === 0 && s.mode !== 'climb' && s.climbT === null; }, null, { polling: 'raf', timeout }); } catch { ok = false; }
    await p.evaluate(() => cancelAnimationFrame(window.__sawLoop));
    saw.climb = await p.evaluate(() => window.__sawClimb);
    return { ok, saw: saw.climb };
  };

  try {
    await login(page);

    // ============ AC1: có nhà cây ở cyber-world, không có ở 3 world cũ
    await openMap(page, 'cyber-world');
    const th = await page.evaluate(() => window.__vtMap.debugTreeHouse());
    console.log('treehouse', JSON.stringify({ ...th, deck: undefined }));
    check('cyber-world: debugTreeHouse() khác null, z=7', !!th && th.z === 7, th ? `x=${th.x} y=${th.y} z=${th.z} g=${th.g}` : 'null');
    const deckSet = new Set(th.deck.map(c => c.x + ',' + c.y));
    const deckOk = th.deck.length === 9 && [0, 1, 2].every(dy => [0, 1, 2].every(dx => deckSet.has((th.x + dx) + ',' + (th.y + dy))));
    check('sàn 3×3 đúng vị trí; foot=(x+1,y+3), top=(x+1,y+2); g trong [0..3]', deckOk && th.foot.x === th.x + 1 && th.foot.y === th.y + 3 && th.top.x === th.x + 1 && th.top.y === th.y + 2 && th.g >= 0 && th.g <= 3, '');
    const GZ = th.g;
    const spawn = await st();
    for (const slug of ['toan-ly-hoa', 'tieng-anh', 'ai-cong-nghe']) {
      await openMap(page, slug);
      const t0 = await page.evaluate(() => window.__vtMap.debugTreeHouse());
      const s0 = await st();
      check(`world ${slug}: debugTreeHouse() = null, không có mode climb`, t0 === null && s0.onDeck === false && s0.climbT === null, JSON.stringify(t0));
    }
    await openMap(page, 'cyber-world');

    const front = { x: th.foot.x, y: th.foot.y + 2 };
    // Ảnh: đứng trước cây
    await tp(front.x, front.y); await frames(70);
    await page.screenshot({ path: SHOT + 'tree-01-front.png' });
    // Ảnh: đứng sau cây (phía -y của sàn, tán lá che nhà)
    await tp(th.x + 1, th.y - 2); await frames(90);
    const sBehind = await st();
    await page.screenshot({ path: SHOT + 'tree-02-behind.png' });
    check('đứng sau cây: ô đi được (walk, z mặt đất)', sBehind.mode === 'walk' && !sBehind.onDeck, JSON.stringify({ x: r2(sBehind.x), y: r2(sBehind.y), z: r2(sBehind.z) }));
    // Ảnh: trên sàn
    await tp(th.top.x, th.top.y - 1); await frames(90);
    const sDeck = await st();
    await page.screenshot({ path: SHOT + 'tree-03-deck.png' });
    check('đứng trên sàn: onDeck, z=7', sDeck.onDeck && Math.abs(sDeck.z - 7) < 0.05, JSON.stringify({ z: r2(sDeck.z) }));
    // Ảnh: đang leo giữa thang
    await tp(th.foot.x, th.foot.y); await frames(30);
    {
      const tr = await hold('ArrowUp', 's.mode === "climb" && s.climbT >= 0.5', 6000);
      await frames(40);
      const mid = await st();
      await page.screenshot({ path: SHOT + 'tree-04-climbing.png' });
      check('ảnh đang leo giữa thang chụp được ở mode climb', mid.mode === 'climb' && mid.climbT > 0.4 && mid.climbT < 0.8, JSON.stringify({ climbT: r2(mid.climbT), z: r2(mid.z) }));
    }

if (want('a')) {
    // ============ AC2: leo lên bằng ↑ / W / →
    const upRuns = [];
    for (const key of ['ArrowUp', 'w', 'ArrowRight']) {
      await tp(th.foot.x, th.foot.y); await frames(10);
      const s0 = await st();
      const tr = await hold(key, 's.onDeck && s.mode === "walk" && s.z > 6.95', 8000);
      const end = tr[tr.length - 1];
      const climb = tr.filter(s => s.mode === 'climb');
      const dur = climb.length ? (climb[climb.length - 1].t - climb[0].t) / 1000 : 0;
      const expect = (7 - GZ) / 2.2;
      const run = { key, startMode: s0.mode, seq: seq(tr).join('>'), dz: r2(maxJump(tr, s => s.z)), dxy: r2(maxXY(tr)), gap: Math.round(maxGap(tr)), mono: monotone(tr, s => s.z, 1), dur: r2(dur), expect: r2(expect), end: { onDeck: end.onDeck, z: r2(end.z), mode: end.mode } };
      upRuns.push(run);
      console.log('leo lên', JSON.stringify(run));
    }
    const upReq = upRuns.filter(r => r.key !== 'ArrowRight'); const upRight = upRuns.find(r => r.key === 'ArrowRight');
    // Ghi chú đặc tả: → có leo lên không (đặc tả cũ ghi ↑/→). Chỉ ghi nhận, không tính vào PASS/FAIL của AC2 (AC2 chỉ yêu cầu ↑).
    console.log('NOTE - phím → tại chân thang:', upRight.seq === 'walk>climb>walk' ? 'có leo (đúng đặc tả ↑/→)' : 'KHÔNG leo (đi ngang xuống đất) — lệch đặc tả ↑/→', JSON.stringify(upRight));
    check('leo lên: mode walk→climb→walk (↑, W)', upReq.every(r => r.seq === 'walk>climb>walk'), JSON.stringify(upReq.map(r => r.seq)));
    check('leo lên: z tăng đơn điệu, bước nhảy z ≤ 0.3', upReq.every(r => r.mono && r.dz <= 0.3), JSON.stringify(upReq.map(r => [r.dz, r.mono])));
    check('leo lên: không nhảy vị trí x/y > 0.3 ô giữa hai mẫu', upReq.every(r => r.dxy <= 0.3), JSON.stringify(upReq.map(r => r.dxy)));
    check('leo lên: kết thúc onDeck=true, z=7', upReq.every(r => r.end.onDeck && Math.abs(r.end.z - 7) < 0.05), JSON.stringify(upReq.map(r => r.end)));
    check(`leo lên: thời gian ≈ (7-g)/2.2 = ${r2((7 - GZ) / 2.2)}s ±25%`, upReq.every(r => near(r.dur, r.expect, 0.25)), JSON.stringify(upReq.map(r => r.dur)));

    // ============ AC5: xuống bằng ↓ / S / ← từ đầu thang
    const downRuns = [];
    for (const key of ['ArrowDown', 's', 'ArrowLeft']) {
      await tp(th.top.x, th.top.y); await frames(10);
      const s0 = await st();
      const tr = await hold(key, 's.mode === "walk" && s.tx === ' + th.foot.x + ' && s.ty === ' + th.foot.y + ' && out.some(q => q.mode === "climb")', 8000);
      const end = tr[tr.length - 1];
      const climb = tr.filter(s => s.mode === 'climb');
      const dur = climb.length ? (climb[climb.length - 1].t - climb[0].t) / 1000 : 0;
      const run = { key, start: { onDeck: s0.onDeck, z: r2(s0.z) }, seq: seq(tr).join('>'), dz: r2(maxJump(tr, s => s.z)), dxy: r2(maxXY(tr)), mono: monotone(tr, s => s.z, -1), dur: r2(dur), end: { tx: end.tx, ty: end.ty, z: r2(end.z), mode: end.mode } };
      downRuns.push(run);
      console.log('leo xuống', JSON.stringify(run));
    }
    const dReq = downRuns.filter(r => r.key !== 'ArrowLeft'); const dLeft = downRuns.find(r => r.key === 'ArrowLeft');
    console.log('NOTE - phím ← tại đầu thang:', dLeft.seq === 'walk>climb>walk' ? 'có leo xuống (đúng đặc tả ↓/←)' : 'KHÔNG leo (đi ngang trên sàn) — lệch đặc tả ↓/←', JSON.stringify(dLeft));
    check('đứng ở đầu thang giữ ↓/S : leo xuống tới chân thang, mode walk, z=g', dReq.every(r => r.seq === 'walk>climb>walk' && r.end.tx === th.foot.x && r.end.ty === th.foot.y && Math.abs(r.end.z - GZ) < 0.1), JSON.stringify(dReq.map(r => [r.seq, r.end])));
    check('leo xuống: z giảm đơn điệu, không nhảy z/xy > 0.3, thời gian ≈ (7-g)/2.2', dReq.every(r => r.mono && r.dz <= 0.3 && r.dxy <= 0.3 && near(r.dur, (7 - GZ) / 2.2, 0.25)), JSON.stringify(dReq.map(r => [r.dz, r.dxy, r.dur])));

    // ============ AC3: leo giữa chừng rồi thả phím
    {
      await tp(th.foot.x, th.foot.y); await frames(10);
      await hold('ArrowUp', 's.mode === "climb" && s.climbT >= 0.45', 6000);
      const still = await sampleUntil(null, 500);
      const cts = still.map(s => s.climbT);
      const spread = Math.max(...cts) - Math.min(...cts);
      check('thả phím giữa thang: climbT đứng yên 500ms, vẫn mode climb', spread < 1e-9 && still.every(s => s.mode === 'climb') && cts[0] > 0.3 && cts[0] < 0.9, `climbT=${r2(cts[0])} spread=${spread} n=${still.length}`);
      const tr = await hold('ArrowDown', 's.mode === "walk" && out.some(q => q.mode === "climb")', 8000);
      const end = tr[tr.length - 1];
      const cl = tr.filter(s => s.mode === 'climb').map(s => s.climbT);
      const nonInc = cl.slice(1).every((v, i) => v <= cl[i] + 1e-9);
      check('bấm ↓ giữa thang: climbT giảm đơn điệu, về foot, mode walk, z=g', nonInc && cl[cl.length - 1] < cl[0] && end.mode === 'walk' && end.tx === th.foot.x && end.ty === th.foot.y && Math.abs(end.z - GZ) < 0.1, JSON.stringify({ from: r2(cl[0]), to: r2(cl[cl.length - 1]), end: { tx: end.tx, ty: end.ty, z: r2(end.z), mode: end.mode } }));
      // thả phím gần đỉnh (sau khi qua t=0.9 vẫn đứng yên rồi leo tiếp được)
      await tp(th.foot.x, th.foot.y); await frames(10);
      await hold('ArrowUp', 's.mode === "climb" && s.climbT >= 0.2', 6000);
      const s1 = await sampleUntil(null, 300);
      const tr2 = await hold('ArrowUp', 's.onDeck && s.mode === "walk" && s.z > 6.95', 8000);
      check('thả phím rồi giữ ↑ lại: leo tiếp lên tới sàn', s1.every(s => s.mode === 'climb') && tr2[tr2.length - 1].onDeck, '');
    }

}

    if (want('b')) {
    // ============ AC4: đi trên sàn 4 hướng, không rơi
    {
      const starts = [[7, 38], [6, 37], [8, 37], [6, 38], [8, 38]].map(([dx, dy]) => [th.x + (dx - 6), th.y + (dy - 37)]);
      const keyCombos = [['ArrowUp'], ['ArrowDown'], ['ArrowLeft'], ['ArrowRight']];
      const bad = []; let climbs = 0; let n = 0;
      const runDeck = async (keys, sx, sy) => {
        await tp(sx, sy); await frames(5);
        for (const k of keys) await page.keyboard.down(k);
        const tr = await sampleUntil(null, 1500);
        for (const k of keys) await page.keyboard.up(k);
        n++;
        const ci = tr.findIndex(s => s.mode === 'climb');
        const upto = ci < 0 ? tr : tr.slice(0, ci);
        if (ci >= 0) {
          climbs++;
          const prev = tr[ci - 1] || tr[0];
          if (!(prev.tx === th.top.x && prev.ty === th.top.y)) bad.push({ keys, sx, sy, why: 'vào thang không ở đầu thang', at: [prev.tx, prev.ty] });
        }
        const off = upto.filter(s => !(s.mode === 'walk' && s.onDeck && Math.abs(s.z - 7) < 0.05));
        if (off.length) bad.push({ keys, sx, sy, why: 'rơi/khác z', sample: { x: r2(off[0].x), y: r2(off[0].y), z: r2(off[0].z), mode: off[0].mode } });
        const out = upto.filter(s => s.x < th.x || s.x >= th.x + 3 || s.y < th.y || s.y >= th.y + 3);
        if (out.length) bad.push({ keys, sx, sy, why: 'ra khỏi sàn', sample: { x: r2(out[0].x), y: r2(out[0].y) } });
      };
      for (const keys of keyCombos) await runDeck(keys, th.x + 1, th.y + 1);
      for (const [sx, sy] of starts.filter((_, i) => i > 0)) for (const keys of keyCombos) await runDeck(keys, sx, sy);
      for (const keys of [['ArrowUp', 'ArrowLeft'], ['ArrowUp', 'ArrowRight'], ['ArrowDown', 'ArrowLeft'], ['ArrowDown', 'ArrowRight']]) await runDeck(keys, th.x + 1, th.y + 1);
      console.log('sàn: số lần thử', n, 'vào thang', climbs, 'vi phạm', JSON.stringify(bad));
      check(`trên sàn 4 hướng × nhiều điểm xuất phát + 4 hướng chéo (${n} lần × 1.5s): z luôn 7, không rơi, chỉ vào thang ở đầu thang`, bad.length === 0 && n >= 20, JSON.stringify(bad.slice(0, 4)));
      check('trên sàn giữ ↓/← có vào thang ở đầu thang (đúng thiết kế)', climbs > 0, `climbs=${climbs}`);
      // không leo được từ ô sàn không phải đầu thang bằng phím lên/xuống khi đứng xa
      await tp(th.x + 1, th.y); await frames(5);
      const tr = await hold('ArrowUp', null, 800);
      check('trên sàn giữ ↑ ở mép sau: không leo, không rơi', tr.every(s => s.mode === 'walk' && s.onDeck && Math.abs(s.z - 7) < 0.05), '');
      // ở dưới đất không đi xuyên lên sàn từ phía khác (hướng +x/-x/-y của sàn): giữ phím vào sàn bị chặn
      const blocked = [];
      for (const [px, py, k, label] of [[th.x - 1, th.y + 1, 'ArrowRight', 'đông-hướng: từ tây (x-1)'], [th.x + 1, th.y - 1, 'ArrowDown', 'từ phía sau (y-1)'], [th.x + 3, th.y + 1, 'ArrowLeft', 'từ phía +x']]) {
        await tp(px, py); await frames(5);
        const tr = await hold(k, null, 1200);
        blocked.push({ label, climb: tr.some(s => s.mode === 'climb'), onDeck: tr.some(s => s.onDeck), zMax: r2(Math.max(...tr.map(s => s.z))) });
      }
      console.log('chặn từ các phía', JSON.stringify(blocked));
      check('từ mặt đất các phía khác (không phải chân thang) không leo/đi lên sàn được', blocked.every(b => !b.climb && !b.onDeck && b.zMax < 4), JSON.stringify(blocked));
    }

}

    if (want('c')) {
    // ============ AC6: click chuột thật
    const gtile = async (from) => {
      // chọn ô đất đi được cách foot 3–6 ô, nhặt đúng ô, nhìn thấy, có đường đi bộ từ chân thang
      const cands = await page.evaluate(([fx, fy]) => {
        const m = window.__vtMap; const out = [];
        for (let y = fy - 6; y <= fy + 6; y++) for (let x = fx - 6; x <= fx + 6; x++) {
          const d = Math.max(Math.abs(x - fx), Math.abs(y - fy)); if (d < 3) continue;
          const c = m.map.cells[y]?.[x]; if (!c || c.obj || c.ground === 'water' || c.ground === 'wall' || m.solidTile(x, y)) continue;
          const route = m.bfs({ x: fx, y: fy }, [{ x, y }], false);
          if (route && route.length >= 3) out.push({ x, y, len: route.length });
        }
        return out;
      }, [th.foot.x, th.foot.y]);
      return cands;
    };
    const pickVisible = async (list, p = page) => { for (const c of list) { const pos = await tilePos(c.x, c.y, p); if (pos.picked && pos.visible) return c; } return null; };
    const deckCands = th.deck.map(c => ({ ...c })).filter(c => !(c.x === th.top.x && c.y === th.top.y));
    {
      // 6a: từ mặt đất cách ~8 ô click một ô sàn
      const results6 = [];
      for (const target of [{ x: th.x + 1, y: th.y }, { x: th.x, y: th.y + 1 }, { x: th.x + 2, y: th.y + 2 }]) {
        await tp(spawn.tx, spawn.ty); await frames(40);
        const pos = await tilePos(target.x, target.y);
        const s0 = await st();
        if (!pos.picked || !pos.visible) { results6.push({ target, ok: false, note: `nhặt sai ô / ngoài màn hình picked=${pos.picked} visible=${pos.visible}` }); continue; }
        await page.mouse.click(pos.sx, pos.sy);
        const started = (await st()).paths;
        const a = await arrived();
        const f = await st();
        results6.push({ target, from: [s0.tx, s0.ty], dist: Math.max(Math.abs(s0.tx - th.foot.x), Math.abs(s0.ty - th.foot.y)), started, climbed: a.saw, ok: a.ok && f.tx === target.x && f.ty === target.y && f.paths === 0 && f.mode === 'walk' && f.onDeck && Math.abs(f.z - 7) < 0.05, final: { tx: f.tx, ty: f.ty, z: r2(f.z), mode: f.mode, paths: f.paths } });
      }
      console.log('click sàn từ đất', JSON.stringify(results6));
      await page.screenshot({ path: SHOT + 'tree-05-click-up-arrived.png' });
      check('click ô sàn từ đất cách ~8 ô: tự đi tới thang, leo, tới đúng ô, paths=0 (3 ô)', results6.length === 3 && results6.every(r => r.ok && r.climbed && r.started > 0), JSON.stringify(results6));

      // 6b: từ trên sàn click ô đất
      const gl = await gtile();
      const res6b = [];
      for (let i = 0, got = 0; i < gl.length && got < 3; i++) {
        await tp(th.x + 1, th.y + 1); await frames(30);
        const pick = await pickVisible([gl[i]]);
        if (!pick) continue;
        got++;
        const pos = await tilePos(pick.x, pick.y);
        await page.mouse.click(pos.sx, pos.sy);
        const started = (await st()).paths;
        const a = await arrived();
        const f = await st();
        res6b.push({ target: [pick.x, pick.y], started, climbed: a.saw, ok: a.ok && f.tx === pick.x && f.ty === pick.y && f.paths === 0 && f.mode === 'walk' && !f.onDeck && Math.abs(f.z - f.surface) < 0.15, final: { tx: f.tx, ty: f.ty, z: r2(f.z), mode: f.mode, paths: f.paths } });
      }
      console.log('click đất từ sàn', JSON.stringify(res6b));
      check('click ô đất từ trên sàn: tự leo xuống, tới nơi, paths=0 (3 ô)', res6b.length === 3 && res6b.every(r => r.ok && r.climbed && r.started > 0), JSON.stringify(res6b));
    }

    // ============ AC7: click khi đang leo dở; nút "Tới level của em" khi đang trên sàn
    {
      const gl = await gtile();
      const midClimb = async () => { await tp(th.foot.x, th.foot.y); await frames(10); await hold('ArrowUp', 's.mode === "climb" && s.climbT >= 0.45', 6000); await frames(3); };
      const r7 = [];
      // 7a: giữa thang click ô đất
      { await midClimb(); const g = await pickVisible(gl); if (!g) r7.push({ what: 'đất', ok: false, note: 'không có ô nhặt được' }); else {
        const pos = await tilePos(g.x, g.y); await page.mouse.click(pos.sx, pos.sy);
        const a = await arrived(); const f = await st();
        r7.push({ what: 'giữa thang→đất', target: [g.x, g.y], ok: a.ok && f.tx === g.x && f.ty === g.y && f.paths === 0 && f.mode === 'walk', final: { tx: f.tx, ty: f.ty, z: r2(f.z), mode: f.mode, paths: f.paths } }); } }
      // 7b: giữa thang click ô sàn
      { await midClimb(); const d = await pickVisible(deckCands); if (!d) r7.push({ what: 'sàn', ok: false, note: 'không có ô nhặt được' }); else {
        const pos = await tilePos(d.x, d.y); await page.mouse.click(pos.sx, pos.sy);
        const a = await arrived(); const f = await st();
        r7.push({ what: 'giữa thang→sàn', target: [d.x, d.y], ok: a.ok && f.tx === d.x && f.ty === d.y && f.paths === 0 && f.mode === 'walk' && f.onDeck && Math.abs(f.z - 7) < 0.05, final: { tx: f.tx, ty: f.ty, z: r2(f.z), mode: f.mode, paths: f.paths } }); } }
      // 7c: leo xuống giữa chừng (đang hướng xuống) rồi click ô sàn (đổi chiều đi lên)
      { await tp(th.top.x, th.top.y); await frames(10); await hold('ArrowDown', 's.mode === "climb" && s.climbT <= 0.55', 6000); const d = await pickVisible(deckCands);
        if (!d) r7.push({ what: 'xuống-rồi-sàn', ok: false, note: 'không nhặt được' }); else {
          const pos = await tilePos(d.x, d.y); await page.mouse.click(pos.sx, pos.sy);
          const a = await arrived(); const f = await st();
          r7.push({ what: 'giữa thang(xuống)→sàn', target: [d.x, d.y], ok: a.ok && f.tx === d.x && f.ty === d.y && f.paths === 0 && f.mode === 'walk' && f.onDeck, final: { tx: f.tx, ty: f.ty, z: r2(f.z), mode: f.mode, paths: f.paths } }); } }
      // 7d: giữa thang click chính ô chân thang (biên: đường đi rỗng)
      { await midClimb(); const pos = await tilePos(th.foot.x, th.foot.y); await page.mouse.click(pos.sx, pos.sy);
        const a = await arrived(); const f = await st();
        r7.push({ what: 'giữa thang→chân thang', ok: a.ok && f.mode === 'walk' && f.paths === 0 && f.tx === th.foot.x && f.ty === th.foot.y, final: { tx: f.tx, ty: f.ty, z: r2(f.z), mode: f.mode, paths: f.paths } }); }
      console.log('click khi đang leo', JSON.stringify(r7));
      check('click ô đất / ô sàn khi đang leo dở (4 kịch bản): tới nơi, paths=0, không kẹt mode climb', r7.length === 4 && r7.every(r => r.ok), JSON.stringify(r7));

      // 7e: nút "Tới level của em" khi đang trên sàn
      const btn = page.locator('button:has-text("Tới level của em")');
      const nStops = await page.evaluate(() => window.__vtMap.map.stops.length);
      if (await btn.count()) {
        const out = [];
        for (const [sx, sy, label] of [[th.x + 1, th.y + 1, 'giữa sàn'], [th.top.x, th.top.y, 'đầu thang'], [th.x, th.y, 'góc sau']]) {
          await tp(sx, sy); await frames(10);
          await btn.click();
          const a = await arrived(); const f = await st();
          const d = await page.evaluate(([x, y]) => Math.min(...window.__vtMap.map.stops.map(s => Math.hypot(s.bx + 1 - x, s.by + 2.5 - y))), [f.x, f.y]);
          out.push({ label, climbed: a.saw, ok: a.ok && f.paths === 0 && f.mode === 'walk' && !f.onDeck && d < 2.2, d: r2(d), mode: f.mode, paths: f.paths });
        }
        console.log('nút Tới level của em từ sàn', JSON.stringify(out));
        check('nút "Tới level của em" khi đang trên sàn (3 vị trí): leo xuống, tới nhà, paths=0, không kẹt', out.every(o => o.ok && o.climbed), JSON.stringify(out));
        // nút khi đang giữa thang
        await midClimb(); await btn.click(); const a = await arrived(); const f = await st();
        const d = await page.evaluate(([x, y]) => Math.min(...window.__vtMap.map.stops.map(s => Math.hypot(s.bx + 1 - x, s.by + 2.5 - y))), [f.x, f.y]);
        check('nút "Tới level của em" khi đang leo dở: tới nhà, paths=0, không kẹt mode climb', a.ok && f.paths === 0 && f.mode === 'walk' && d < 2.2, `d=${r2(d)} mode=${f.mode}`);
      } else check('nút "Tới level của em" tồn tại', false, 'không thấy nút');
      void nStops;
    }

}

    if (want('d')) {
    // ============ AC8: walkTo(i) từ spawn tới mọi nhà + kho báu không leo/bơi
    {
      const nStops = await page.evaluate(() => window.__vtMap.map.stops.length);
      const routes = [];
      for (let i = 0; i < nStops; i++) {
        await tp(spawn.tx, spawn.ty); await frames(5);
        await page.evaluate((k) => window.__vtMap.walkTo(k, false), i);
        const t = await page.evaluate((k) => new Promise(res => {
          const m = window.__vtMap; const t0 = performance.now(); let climb = false; let swim = false;
          const f = () => { const s = m.debugState(); if (s.mode === 'climb') climb = true; if (s.mode === 'swim') swim = true;
            if (s.paths === 0 && performance.now() - t0 > 200) { const st = m.map.stops[k]; res({ climb, swim, done: true, d: Math.hypot(st.bx + 1 - s.x, st.by + 2.5 - s.y) }); return; }
            if (performance.now() - t0 > 25000) { res({ climb, swim, done: false }); return; }
            requestAnimationFrame(f); };
          requestAnimationFrame(f);
        }), i);
        routes.push({ stop: i, ...t, d: t.d === undefined ? undefined : r2(t.d) });
      }
      console.log('đường tới nhà', JSON.stringify(routes));
      check(`walkTo từ spawn tới ${nStops} điểm (nhà level + kho báu): tới nơi, không lần nào climb/swim`, routes.every(r => r.done && !r.climb && !r.swim && r.d < 2.0), '');
      // mỗi nhà: khi đi từ trên sàn xuống cũng tới nơi
      const fromDeck = [];
      for (let i = 0; i < nStops; i++) {
        await tp(th.x + 1, th.y + 1); await frames(5);
        await page.evaluate((k) => window.__vtMap.walkTo(k, false), i);
        const a = await arrived(page, 40000); const f = await st();
        fromDeck.push({ stop: i, ok: a.ok && f.paths === 0 && f.mode === 'walk' && !f.onDeck });
      }
      check(`walkTo từ trên sàn tới ${nStops} điểm: tới nơi, không kẹt`, fromDeck.every(r => r.ok), JSON.stringify(fromDeck.filter(r => !r.ok)));
    }

    // ============ AC11 (một phần): hiển thị phiên bản
    {
      await page.goto(BASE + '/home');
      const txt = await page.evaluate(() => document.body.innerText);
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
      check('phiên bản hiển thị v0.4.0 (khớp package.json)', pkg === '0.4.0' && txt.includes('v0.4.0'), `package.json=${pkg}`);
    }

}

        // ============ AC9: mobile D-pad
    if (want('d')) {
      const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const mp = await mctx.newPage(); watch(mp);
      await login(mp);
      await openMap(mp, 'cyber-world');
      check('mobile: D-pad hiển thị', await mp.locator('.dpad').isVisible());
      const press = async (cls, until, maxMs) => {
        const bb = await mp.locator(`.dpad .${cls}`).boundingBox();
        const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
        const cdp = await mctx.newCDPSession(mp);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy, id: 1 }] });
        const tr = await sampleUntil(until, maxMs, mp);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
        return tr;
      };
      await tp(th.foot.x, th.foot.y, mp); await frames(30, mp);
      const up = await press('up', 's.onDeck && s.mode === "walk" && s.z > 6.95', 8000);
      const e1 = up[up.length - 1];
      await frames(60, mp);
      await mp.screenshot({ path: SHOT + 'tree-06-mobile-deck.png' });
      check('mobile: D-pad ▲ tại chân thang leo lên tới sàn (walk>climb>walk, onDeck, z=7)', seq(up).join('>') === 'walk>climb>walk' && e1.onDeck && Math.abs(e1.z - 7) < 0.05 && monotone(up, s => s.z, 1) && maxJump(up, s => s.z) <= 0.3, `seq=${seq(up)} end=${JSON.stringify({ onDeck: e1.onDeck, z: r2(e1.z) })} dz=${r2(maxJump(up, s => s.z))}`);
      const down = await press('down', 's.mode === "walk" && s.tx === ' + th.foot.x + ' && s.ty === ' + th.foot.y + ' && out.some(q => q.mode === "climb")', 8000);
      const e2 = down[down.length - 1];
      await mp.screenshot({ path: SHOT + 'tree-07-mobile-foot.png' });
      check('mobile: D-pad ▼ tại đầu thang leo xuống tới chân thang (walk>climb>walk, z=g)', seq(down).join('>') === 'walk>climb>walk' && e2.tx === th.foot.x && e2.ty === th.foot.y && Math.abs(e2.z - GZ) < 0.1 && monotone(down, s => s.z, -1), `seq=${seq(down)} end=${JSON.stringify({ tx: e2.tx, ty: e2.ty, z: r2(e2.z) })}`);
      // thả giữa thang trên mobile: đứng yên
      await tp(th.foot.x, th.foot.y, mp); await frames(10, mp);
      await press('up', 's.mode === "climb" && s.climbT >= 0.4', 6000);
      const still = await sampleUntil(null, 400, mp);
      check('mobile: thả ▲ giữa thang: climbT đứng yên', still.every(s => s.mode === 'climb' && s.climbT === still[0].climbT), `climbT=${r2(still[0].climbT)}`);
      await mctx.close();
    }
  } catch (e) {
    check('script không crash', false, String(e && e.stack || e));
  }
  check('không có pageerror / console error / http>=400', errors.length === 0, JSON.stringify([...new Set(errors)].slice(0, 8)));
  await pg.end();
  await browser.close();
  const bad = results.filter(x => !x).length;
  console.log(bad ? `FAILED ${bad}/${results.length}` : `ALL PASS ${results.length}`);
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
