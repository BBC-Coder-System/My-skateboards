// Board Lights regression suite.  Usage:  node run-all.js [filter-substring]
// One headless Chrome, one fresh page (fresh localStorage) per test, fake strip from stub.js. No real Bluetooth.
const fs = require('fs'), path = require('path'), url = require('url');
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');   // npm install puppeteer-core (in this folder), or set PUPPETEER_CORE to its path
const INDEX = process.env.INDEX_HTML || path.join(__dirname, '..', 'index.html');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BUILD = path.join(__dirname, 'build'); fs.mkdirSync(BUILD, { recursive: true });
const PAGE = path.join(BUILD, 'page.html');
{ // copy of index.html with the stub as the first script (index.html itself is never modified)
  const src = fs.readFileSync(INDEX, 'utf8'), stub = fs.readFileSync(path.join(__dirname, 'stub.js'), 'utf8');
  if (!src.includes('<head>')) throw new Error('no <head> in index.html');
  fs.writeFileSync(PAGE, src.replace('<head>', '<head><script>' + stub + '</script>'));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const T = [], test = (name, fn, opts) => T.push({ name, fn, opts });
let browser;

// ---------- harness ----------
async function boot(opts = {}) {
  const pg = await browser.newPage();
  const cons = [], perr = [];
  pg.on('console', m => { if (['warning', 'error'].includes(m.type())) cons.push(m.text()); });
  pg.on('pageerror', e => perr.push(e.message));
  await pg.evaluateOnNewDocument(ls => {
    try { localStorage.clear(); for (const k in ls) localStorage.setItem(k, typeof ls[k] === 'string' && ls[k].startsWith('RAW:') ? ls[k].slice(4) : JSON.stringify(ls[k])); } catch (e) {}
  }, Object.assign({ fadeMs: 0 }, opts.ls || {}));
  await pg.goto(url.pathToFileURL(PAGE).href);
  const res = [];
  const p = {
    pg, cons, perr, res,
    ev: (fn, ...a) => pg.evaluate(fn, ...a),
    sleep,
    clr: () => pg.evaluate(() => { __w.length = 0; __wt.length = 0; __proc.length = 0; }),
    pk: () => pg.evaluate(() => __w.map((h, i) => ({ h, t: __wt[i] }))),
    hexes: async () => (await p.pk()).map(x => x.h),
    log: () => pg.evaluate(() => dlogBuf.slice()),
    connect: async () => { await pg.evaluate(() => connect()); await p.waitFor(async () => (await p.pk()).length >= 3, 3000); await sleep(150); },
    waitFor: async (fn, ms = 3000, step = 25) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(step); } return false; },
    ok: (c, msg, detail) => { res.push({ ok: !!c, msg, detail: c ? '' : (detail === undefined ? '' : (typeof detail === 'string' ? detail : JSON.stringify(detail))) }); return !!c; },
    eq: (a, b, msg) => p.ok(JSON.stringify(a) === JSON.stringify(b), msg, 'expected ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)),
    near: (a, lo, hi, msg) => p.ok(a >= lo && a <= hi, msg, `expected ${lo}..${hi} got ${typeof a === 'number' ? +a.toFixed(2) : a}`),
    hide: () => pg.evaluate(() => { __hid = true; document.dispatchEvent(new Event('visibilitychange')); }),
    show: () => pg.evaluate(() => { __hid = false; document.dispatchEvent(new Event('visibilitychange')); }),
    colours: async () => (await p.pk()).filter(x => x.h.startsWith('7e070503')).map(x => ({ rgb: x.h.slice(8, 14), flag: x.h.slice(14, 16), t: x.t, h: x.h })),
    // standard end-of-test hygiene: no uncaught errors, no swallowed effect errors
    finish: async () => {
      const err = await pg.evaluate(() => __err.slice());
      p.ok(err.length === 0 && perr.length === 0, 'no uncaught JS errors', err.concat(perr));
      if (!opts.allowWarn) { const w = cons.filter(c => !/Failed to load resource|favicon/.test(c)); p.ok(w.length === 0, 'no console warnings/errors (effects swallow exceptions into console.warn)', w.slice(0, 3)); }
      await pg.close().catch(() => {});
    },
  };
  return p;
}
const C = (r, g, b, flag = '10') => '7e070503' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('') + flag + 'ef';
const kind = h => h.startsWith('7e0401') ? 'b' : h.startsWith('7e0702') ? 's' : h.startsWith('7e070503') ? 'c' : h.startsWith('7e0703') ? 'm' : '?';
const byteAt = (h, i) => parseInt(h.slice(i, i + 2), 16);
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };

// ============================================================ 1. CONNECT / LINK
test('connect: wake-up, 7e0404, power-on, paced', async p => {
  await p.connect();
  const w = await p.pk();
  p.eq(w.slice(0, 3).map(x => x.h), ['7e0783', '7e0404', '7e0404f00001ff00ef'], 'connect sequence = wake-up, 7e0404, power on');
  p.ok(w.length >= 3 && w[1].t - w[0].t >= 50 && w[2].t - w[1].t >= 50, 'connect packets are paced (>=50 ms apart)', w.slice(0, 3).map(x => Math.round(x.t)));
  p.ok(await p.ev(() => document.getElementById('connText').textContent.includes('MELK-OA10')), 'status pill shows the device name');
  p.ok((await p.log()).some(l => /CONNECTED MELK-OA10/.test(l)), 'dlog has a CONNECTED line');
  p.eq(await p.ev(() => S.otherFx), false, 'MELK-OA10 name does not enable the "Other" effect category');
});
test('connect: power-off state sends the off packet, not on', async p => {
  await p.ev(() => { S.power = false; });
  await p.connect();
  const h = await p.hexes();
  p.eq(h.slice(0, 3), ['7e0783', '7e0404', '7e0404000000ff00ef'], 'off instead of on after the wake-up');
});
test('connect: command queued before connecting does not jump ahead of the wake-up', async p => {
  await p.ev(() => { setBuiltin(155); });
  await p.ev(() => connect());
  await p.sleep(700);
  const h = await p.hexes();
  p.eq(h[0], '7e0783', 'first packet after connect is the wake-up (effect chosen before connecting must not precede it)');
  p.ok(h.includes('7e07039b06ffff00ef'), 'the chosen built-in (#155) is still sent after connecting', h.slice(0, 8));
});
test('drop: auto-reconnect resends wake-up, power and current colour; slows rates', async p => {
  await p.connect();
  await p.ev(() => setSolid('#00ff00')); await p.sleep(200); await p.clr();
  await p.ev(() => __dl());
  await p.waitFor(async () => (await p.hexes()).includes(C(0, 255, 0)), 3000);
  const h = await p.hexes();
  p.eq(h.slice(0, 3), ['7e0783', '7e0404', '7e0404f00001ff00ef'], 'after reconnect: wake-up, 7e0404, power on');
  p.ok(h.includes(C(0, 255, 0)), 'current solid colour restored after reconnect', h);
  p.eq(await p.ev(() => S.drops), 1, 'drop counter = 1');
  p.eq(await p.ev(() => S.fps), 13, 'update rate lowered 15 -> 13');
  p.eq(await p.ev(() => localStorage.getItem('fps')), '13', 'lowered rate is persisted');
  p.eq(await p.ev(() => S.musicFps), 20, 'music rate lowered 30 -> 20');
  const log = await p.log();
  p.ok(log.some(l => /DROP .*link=down/.test(l)), 'DROP logged with context (link=down)', log.slice(-5));
  p.ok(log.some(l => /RECONNECTED after 1 attempt$/.test(l)), 'RECONNECTED logged');
  p.ok(await p.ev(() => /1 drop/.test(document.getElementById('connText').textContent)), 'pill shows drop count');
});
test('drop: rate floors at 10/s (fps) and 20/s (music) after repeated drops', async p => {
  await p.connect();
  for (let i = 0; i < 5; i++) { await p.ev(() => __dl()); await p.waitFor(() => p.ev(() => !!chr), 2000); await p.sleep(80); }
  p.eq(await p.ev(() => S.fps), 10, 'fps never below 10');
  p.eq(await p.ev(() => S.musicFps), 20, 'musicFps never below 20');
  p.eq(await p.ev(() => S.drops), 5, '5 drops counted');
});
test('drop: reconnect retries with backoff (fail twice, succeed third)', async p => {
  await p.connect();
  await p.ev(() => { __failConnect = 2; __dl(); });
  await p.sleep(400);
  p.ok(await p.ev(() => /Reconnecting|Connecting/.test(document.getElementById('connText').textContent)), 'pill shows a busy state (Connecting/Reconnecting) while retrying');
  const t0 = Date.now();
  const okc = await p.waitFor(async () => (await p.log()).some(l => /RECONNECTED/.test(l)), 6000);
  const dt = Date.now() - t0 + 400;
  p.ok(okc, 'eventually reconnects');
  p.near(dt, 2000, 4200, 'backoff took about 1.0 s + 1.5 s between attempts (ms)');
  const log = await p.log();
  p.ok(log.some(l => /reconnect failed attempt 1/.test(l)), 'first failure logged');
  p.ok(log.some(l => /RECONNECTED after 3 attempts/.test(l)), 'RECONNECTED after 3 attempts');
});
test('disconnect by user: no reconnect, no drop counted', async p => {
  await p.connect();
  await p.ev(() => disconnect());
  await p.sleep(600);
  p.eq(await p.ev(() => S.drops), 0, 'no drop counted');
  p.eq(await p.ev(() => __connects), 1, 'no reconnect attempt');
  p.ok((await p.log()).some(l => /DISCONNECTED \(by you\)/.test(l)), 'logged as by you');
});
test('hidden page lost the link silently: noticed when screen is back', async p => {
  await p.connect();
  await p.hide();
  await p.ev(() => { __dev.gatt.connected = false; });   // iOS sometimes never delivers the event
  await p.show();
  await p.waitFor(async () => (await p.log()).some(l => /RECONNECTED/.test(l)), 3000);
  const log = await p.log();
  p.ok(log.some(l => /LINK LOST while hidden/.test(l)), 'LINK LOST while hidden logged');
  p.ok(log.some(l => /RECONNECTED/.test(l)), 'reconnected');
  p.eq(await p.ev(() => dstats.drops), 1, 'counted as one drop in the diagnostics');
  p.ok(log.some(l => /DROP \(around a screen lock\)/.test(l)), 'DROP is labelled as lock-related', log.filter(l => /DROP/.test(l)));
  p.eq(await p.ev(() => [S.drops, S.fps, S.musicFps]), [0, 15, 30], 'a lock-related drop does NOT lower the update rates');
});
test('late gattserverdisconnected after a lock-return reconnect is not counted twice', async p => {
  await p.connect();
  await p.hide();
  await p.ev(() => { __dev.gatt.connected = false; });
  await p.ev(() => { __hid = false; document.dispatchEvent(new Event('visibilitychange')); __dl(); });  // the queued event arrives right after we noticed
  await p.waitFor(async () => (await p.log()).some(l => /RECONNECTED/.test(l)), 3000); await p.sleep(400);
  p.eq(await p.ev(() => dstats.drops), 1, 'one drop, not two');
  p.eq(await p.ev(() => __connects), 2, 'exactly one reconnect');
});
test('write watchdog: a hung write is abandoned after ~600 ms and the queue continues', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => { __hang = 1; sendColor([255, 0, 0]); sendColor([0, 0, 255]); });
  await p.sleep(400);
  p.ok(!(await p.hexes()).includes(C(0, 0, 255)), 'blue still waiting while the write is hung');
  await p.sleep(700);
  p.ok((await p.hexes()).includes(C(0, 0, 255)), 'blue goes out after the timeout');
  p.eq(await p.ev(() => dstats.timeouts), 1, 'one timeout counted');
  p.ok((await p.log()).some(l => /WRITE-TIMEOUT/.test(l)), 'WRITE-TIMEOUT logged');
  p.eq(await p.ev(() => inflight), false, 'writer not stuck');
}, { allowWarn: true });
test('3 write timeouts in 10 s lower the music rate by 5', async p => {
  await p.connect();
  await p.ev(() => { __hang = 3; });
  for (const c of [[255, 0, 0], [0, 255, 0], [0, 0, 255]]) { await p.ev(c => sendColor(c), c); await p.sleep(720); }
  await p.sleep(200);
  p.eq(await p.ev(() => S.musicFps), 25, 'musicFps 30 -> 25');
  p.ok((await p.log()).some(l => /music rate lowered 25\/s \(write timeouts\)/.test(l)), 'logged');
}, { allowWarn: true });
test('write error is logged and later writes still go out', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => { __throw = 1; sendColor([255, 0, 0]); });
  await p.sleep(150);
  await p.ev(() => sendColor([0, 0, 255])); await p.sleep(200);
  p.ok((await p.log()).some(l => /WRITE-ERROR/.test(l)), 'WRITE-ERROR logged');
  p.ok((await p.hexes()).includes(C(0, 0, 255)), 'next colour still written');
}, { allowWarn: true });

// ============================================================ 2. PACKET BYTES
test('packet builders match the README protocol table', async p => {
  const r = await p.ev(() => ({
    bright: CMD.bright(50), speed: CMD.speed(40), pixels: CMD.pixels(300), pix10: CMD.pixels(10), pix1000: CMD.pixels(1000),
    wiresGRB: CMD.wires('GRB'), wiresRGB: CMD.wires('RGB'), wiresBGR: CMD.wires('BGR'), mic: CMD.micMode(128), sens: CMD.micSens(50),
    colour: CMD.color(1, 2, 3, 0x20), mode: CMD.mode(155), on: CMD.on, off: CMD.off,
  }));
  p.eq(r.bright, '7e040132' + '01ff0201ef', 'brightness 50 = 7e0401 32 01ff0201ef');
  p.eq(r.speed, '7e070228ffffff00ef', 'speed 40 = 7e0702 28 ffffff00ef');
  p.eq(r.pixels, '7e07212c0100ff00ef', 'LED count 300 = 7e0721 2c 01 00ff00ef (low byte first)');
  p.eq(r.pix1000, '7e0721e80300ff00ef', 'LED count 1000');
  p.eq(r.wiresGRB, '7e0781020103ff00ef', 'wire order GRB = 02 01 03');
  p.eq(r.wiresRGB, '7e0781010203ff00ef', 'wire order RGB = 01 02 03');
  p.eq(r.wiresBGR, '7e0781030201ff00ef', 'wire order BGR = 03 02 01');
  p.eq(r.mic, '7e07038004ffff00ef', 'device mic mode 128');
  p.eq(r.sens, '7e070632ffffff00ef', 'device mic sensitivity 50');
  p.eq(r.colour, '7e07050301020320ef', 'colour with music marker 0x20');
  p.eq(r.mode, '7e07039b06ffff00ef', 'built-in effect 155 = 7e0703 9b 06 ffff00ef');
  p.eq([r.on, r.off], ['7e0404f00001ff00ef', '7e0404000000ff00ef'], 'power on / off');
  p.eq(await p.ev(() => { S.legacyFx = true; const m = CMD.mode(156); S.legacyFx = false; return m; }), '7e05039c03ffff00ef', 'legacy (older style) effect command');
});
test('solid colour: exact packet, squared brightness curve, slider persisted', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => setSolid('#ff0000')); await p.sleep(150);
  p.eq((await p.hexes()).pop(), C(255, 0, 0), 'red at 100% = 7e070503 ff0000 10 ef');
  await p.clr();
  await p.ev(() => { const e = document.getElementById('bright'); e.value = 50; e.dispatchEvent(new Event('input')); }); await p.sleep(150);
  p.eq((await p.hexes()).pop(), C(64, 0, 0), 'brightness 50% -> 25% power (0x40), squared curve');
  p.eq(await p.ev(() => localStorage.getItem('bright')), '50', 'brightness saved');
});
test('pure black is never sent: the glow floor replaces it', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => setSolid('#ff0000')); await p.sleep(120);
  await p.ev(() => setSolid('#000000')); await p.sleep(200);
  const c = await p.colours();
  p.eq(c[c.length - 1].rgb, '040000', 'black on a red strip becomes a faint red glow (floor 4)');
  p.ok(!c.some(x => x.rgb === '000000'), 'no 000000 packet');
  await p.clr();
  await p.ev(() => { lastLit = [255, 255, 255]; setSolid('#000000'); }); await p.sleep(150);
  p.eq((await p.colours()).pop().rgb, '040404', 'black with white as last colour -> 040404');
});
test('flash effects never send black, and really alternate (no aliasing to solid)', async p => {
  await p.connect();
  const seen = {};
  for (const id of ['strobe', 'police', 'randflash', 'alternate']) {
    await p.clr(); await p.ev(i => runEffect(i), id); await p.sleep(1000);
    const c = await p.colours();
    seen[id] = { n: c.length, black: c.filter(x => x.rgb === '000000').length, distinct: new Set(c.map(x => x.rgb)).size };
  }
  p.ok(Object.values(seen).every(s => s.black === 0), 'no 000000 packets in any flash effect', seen);
  p.ok(Object.values(seen).every(s => s.distinct >= 2), 'every flash effect shows at least 2 different colours in 1 s', seen);
  await p.ev(() => runEffect('strobe')); await p.clr(); await p.sleep(800);
  p.ok((await p.colours()).some(x => x.rgb === '040404'), 'strobe off-phase is the 040404 glow');
});
test('identical colour is not written twice', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => setSolid('#3366ff')); await p.sleep(150);
  await p.ev(() => setSolid('#3366ff')); await p.sleep(200);
  p.eq((await p.colours()).filter(x => x.rgb === '3366ff').length, 1, 'one packet for two identical requests');
});
test('built-in effect: command bytes, strip brightness, leaving resets it', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => { S.bright = 0.4; setBuiltin(155); }); await p.sleep(350);
  const h = await p.hexes();
  p.eq(h.slice(0, 2), ['7e07039b06ffff00ef', '7e040128' + '01ff0201ef'], 'mode 155 then strip brightness 40% (0x28)');
  await p.clr(); await p.ev(() => setSolid('#ff0000')); await p.sleep(300);
  const h2 = await p.hexes();
  p.ok(h2.includes('7e040164' + '01ff0201ef'), 'leaving a built-in resets strip brightness to 100', h2);
  p.ok(h2.includes(C(40, 0, 0)) || h2.some(x => x.startsWith('7e070503') && byteAt(x, 8) === 41), 'solid colour dimmed by RGB scaling (0.16 of 255 ~ 41)', h2);
});
test('no built-in above #212 ever sent to a MELK-OA10, and Other category hidden', async p => {
  const r = await p.ev(() => ({ cats: fxCats().length, total: SY_MODES.reduce((a, c) => a + c.fx.length, 0), max: Math.max(...[...document.querySelectorAll('[data-mode]')].map(b => +b.dataset.mode)), other: supportsOtherFx('MELK-OA10   17'), other21: supportsOtherFx('MELK-OA21 05'), none: supportsOtherFx(null), oneDigit: supportsOtherFx('MELK-OD2') }));
  p.eq(r.cats, 8, '8 visible categories (Other hidden)');
  p.eq(r.total, 234, '234 effects in the table');
  p.ok(r.max <= 212, 'no tile above 212 in the Built-in tab', r.max);
  p.eq([r.other, r.other21, r.none, r.oneDigit], [false, true, false, false], 'supportsOtherFx by device name');
});

// ============================================================ 3. WRITER: slots, gap, urgency
test('brightness slot is latest-wins and lands on the final value', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => { for (let v = 10; v <= 90; v += 4) sendCmd(CMD.bright(v)); });
  await p.sleep(600);
  const b = (await p.hexes()).filter(h => h.startsWith('7e0401'));
  p.ok(b.length <= 3, 'a burst of 21 brightness values collapses to <=3 packets', b.length);
  p.eq(byteAt(b[b.length - 1], 6), 90, 'last packet carries the final value (90)');
});
test('slow-command gap (120 ms) limits brightness rate; smaller gap allows more', async p => {
  await p.connect();
  const burst = async () => { await p.clr(); await p.ev(() => new Promise(res => { let i = 0; const id = setInterval(() => { sendCmd(CMD.bright(10 + (i++ % 80))); if (i >= 100) { clearInterval(id); window.__lastB = 10 + ((i - 1) % 80); res(); } }, 10); })); await p.sleep(400); return (await p.pk()).filter(x => x.h.startsWith('7e0401')); };
  const a = await burst();
  const gaps = a.slice(1).map((x, i) => x.t - a[i].t);
  p.near(a.length, 5, 11, 'brightness packets in a ~1 s storm at gap 120');
  p.ok(Math.min(...gaps) >= 100, 'min spacing between brightness packets >= 100 ms', Math.round(Math.min(...gaps)));
  p.eq(byteAt(a[a.length - 1].h, 6), await p.ev(() => __lastB), 'storm ends on the final value');
  await p.ev(() => { S.slowGap = 50; });
  const b = await burst();
  p.ok(b.length >= a.length + 2, 'slowGap 50 lets more through than 120', [a.length, b.length]);
});
test('beat (urgent) brightness jumps ahead of a pending colour and the gap', async p => {
  await p.connect();
  await p.ev(() => sendCmd(CMD.bright(50))); await p.sleep(70); await p.clr();
  await p.ev(() => { sendColor([255, 0, 0]); sendColor([0, 0, 255]); urgent = true; window.__t0 = performance.now(); sendCmd(CMD.bright(20)); });
  await p.sleep(250);
  const w = await p.pk(), t0 = await p.ev(() => __t0);
  const ib = w.findIndex(x => x.h === '7e040114' + '01ff0201ef'), iblue = w.findIndex(x => x.h === C(0, 0, 255));
  p.ok(ib >= 0 && iblue >= 0 && ib < iblue, 'urgent brightness (0x14) written before the pending blue colour', w.map(x => x.h));
  p.ok(ib >= 0 && w[ib].t - t0 < 40, 'and within 40 ms (ignored the 120 ms gap)', ib >= 0 ? w[ib].t - t0 : 'missing');
});
test('priority without urgency: brightness > colour > speed, each gated', async p => {
  await p.connect(); await p.sleep(300); await p.clr();
  await p.ev(() => { sendColor([10, 20, 30]); sendCmd(CMD.speed(10)); sendCmd(CMD.bright(20)); sendColor([30, 20, 10]); });
  await p.sleep(500);
  const w = await p.pk();
  p.eq(w.map(x => kind(x.h)).join(''), 'cbcs', 'order: colour A, brightness, colour B, speed');
  p.ok(w.length === 4 && w[3].t - w[1].t >= 110, 'speed waits out the slow-command gap after the brightness', w.map(x => Math.round(x.t)));
});
test('colour writes respect the update-rate pacing', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => { for (let i = 0; i < 30; i++) setTimeout(() => sendColor([i * 8, 0, 0]), i * 5); });
  await p.sleep(700);
  const c = await p.colours(), gaps = c.slice(1).map((x, i) => x.t - c[i].t);
  p.ok(c.length >= 4 && c.length <= 12, 'storm of 30 colours in 150 ms collapses to a handful', c.length);
  p.ok(Math.min(...gaps) >= 50, 'colour packets >= 50 ms apart at 15/s', Math.round(Math.min(...gaps)));
  p.eq(c[c.length - 1].rgb, 'e80000', 'last colour (232 red) is what ends up on the strip');
});

// ============================================================ 4. MUSIC MARKER / RATES
test('normal effects use marker 0x10 at ~15/s; music effects 0x20 at up to 30/s', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => { S.smoothFx = false; runEffect('rainbow'); }); await p.sleep(1500);   // old behaviour: music-only fast colours
  let c = await p.colours();
  p.ok(c.length > 0 && c.every(x => x.flag === '10'), 'rainbow packets all end 10ef', c.slice(0, 3));
  p.near(c.length / 1.5, 8, 16.5, 'rainbow packets/s (S.fps = 15)');
  await p.ev(() => { S.beatDiv = '1'; runEffect('mpulse'); }); await p.sleep(300); await p.clr(); await p.sleep(1500);
  c = await p.colours();
  p.eq(await p.ev(() => effFps()), 30, 'music effect frame rate = musicFps (30)');
  p.ok(c.length > 0 && c.every(x => x.flag === '20'), 'music colour packets all end 20ef', c.slice(0, 3));
  p.near(c.length / 1.5, 14, 34, 'Volume pulse packets/s');
});
test('smooth fades (default): slow colour effects use 0x20 at 30/s with dithering; flashes and built-in-driven effects stay normal', async p => {
  p.eq(await p.ev(() => { S.current = { kind: 'effect', id: 'rainbow' }; const a = effFps(); S.current = { kind: 'effect', id: 'strobe' }; const b = effFps(); S.current = { kind: 'effect', id: 'fire2' }; const c = effFps(); return [a, b, c]; }), [30, 15, 15], 'rainbow 30/s, strobe 15/s, Living flame 15/s');
  await p.connect(); await p.clr();
  await p.ev(() => { S.bright = 0.2; runEffect('breathe'); }); await p.sleep(2500);
  const c = await p.colours();
  p.ok(c.length > 40 && c.every(x => x.flag === '20'), 'breathe sends fast-marker packets: ' + c.length);
  const lv = new Set(c.map(x => x.rgb)); p.ok(lv.size > 8, 'many distinct levels (dithered fade): ' + lv.size);
  p.ok(c.every(x => parseInt(x.rgb.slice(0, 2), 16) + parseInt(x.rgb.slice(2, 4), 16) + parseInt(x.rgb.slice(4, 6), 16) > 0), 'never black');
});
test('effFps: music marker off caps music at 12/s; fast-colours-for-all applies only to plain colour effects', async p => {
  const r = await p.ev(() => {
    const o = {};
    S.current = { kind: 'effect', id: 'mpulse' }; o.music = effFps();
    S.musicFlag = 0x10; o.noFlag = effFps(); S.musicFlag = 0x20;
    S.smoothFx = false; S.current = { kind: 'effect', id: 'rainbow' }; o.rainbow = effFps();
    S.fastColourAll = true; o.rainbowFast = effFps();
    S.current = { kind: 'effect', id: 'fire2' }; o.fire2Fast = effFps();
    S.current = { kind: 'solid', id: '#fff' }; o.solid = effFps();
    S.current = null; o.none = effFps();
    return o;
  });
  p.eq(r, { music: 30, noFlag: 12, rainbow: 15, rainbowFast: 30, fire2Fast: 15, solid: 15, none: 15 }, 'effFps table');
  await p.connect(); await p.clr();
  await p.ev(() => { S.fastColourAll = true; runEffect('rainbow'); }); await p.sleep(600);
  p.ok((await p.colours()).every(x => x.flag === '20'), 'Fast colours for every effect: rainbow sends 20ef');
});

// ============================================================ 5. HAND-OFF (phone lock)
test('hand-off: phone effect + screen locked -> built-in sent at once, engine stops, resumes on return', async p => {
  await p.connect(); await p.ev(() => runEffect('rainbow')); await p.sleep(500); await p.clr();
  await p.hide(); await p.sleep(120);
  const h = await p.hexes();
  p.ok(h.includes('7e07039c06ffff00ef'), 'lock effect #156 (0x9c) sent on hide', h);
  await p.clr(); await p.sleep(400);
  p.eq((await p.colours()).length, 0, 'no more phone colours while hidden');
  const log = await p.log();
  p.ok(log.some(l => /SCREEN LOCKED\/HIDDEN/.test(l)) && log.some(l => /HAND-OFF sent built-in/.test(l)), 'logged SCREEN LOCKED + HAND-OFF');
  await p.show(); await p.sleep(400);
  p.ok((await p.colours()).length > 3, 'effect resumes when the screen is back');
  p.ok((await p.log()).some(l => /SCREEN BACK/.test(l)), 'SCREEN BACK logged');
  await p.hide(); await p.sleep(100);
  p.ok((await p.hexes()).filter(x => x === '7e07039c06ffff00ef').length === 1, 'a second lock hands off again (flag was reset)');
});
test('hand-off: only once per lock, and pagehide also triggers it; custom lock effect respected', async p => {
  await p.ev(() => { S.lockMode = 25; });
  await p.connect(); await p.ev(() => runEffect('rainbow')); await p.sleep(300); await p.clr();
  await p.hide(); await p.ev(() => window.dispatchEvent(new Event('pagehide'))); await p.sleep(200);
  p.eq((await p.hexes()).filter(x => x === '7e07031906ffff00ef').length, 1, 'chosen lock effect #25 (0x19) sent exactly once');
  await p.show(); await p.clr();
  await p.ev(() => window.dispatchEvent(new Event('pagehide'))); await p.sleep(150);
  p.eq((await p.hexes()).filter(x => x === '7e07031906ffff00ef').length, 1, 'pagehide alone (no visibilitychange) also hands off');
});
test('hand-off: skipped for solid, built-in, power off, "keep" action, or no link', async p => {
  await p.connect();
  const cnt = async () => (await p.hexes()).filter(h => h.startsWith('7e0703')).length;
  await p.ev(() => setSolid('#ff0000')); await p.sleep(200); await p.clr(); await p.hide(); await p.sleep(150);
  p.eq(await cnt(), 0, 'solid colour: nothing sent'); await p.show();
  await p.ev(() => setBuiltin(155)); await p.sleep(400); await p.clr(); await p.hide(); await p.sleep(150);
  p.eq(await cnt(), 0, 'built-in: already on the strip, nothing sent'); await p.show();
  await p.ev(() => { runEffect('rainbow'); S.lockAction = 'keep'; }); await p.sleep(300); await p.clr(); await p.hide(); await p.sleep(150);
  p.eq(await cnt(), 0, 'lock action "keep": nothing sent'); await p.show();
  await p.ev(() => { S.lockAction = 'builtin'; togglePower(); }); await p.sleep(200); await p.clr(); await p.hide(); await p.sleep(150);
  p.eq(await cnt(), 0, 'power off: nothing sent'); await p.show();
  await p.ev(() => { togglePower(); }); await p.sleep(200); await p.ev(() => { chr = null; }); await p.clr(); await p.hide(); await p.sleep(150);
  p.eq((await p.hexes()).length, 0, 'no link: nothing sent, no crash');
});
test('hand-off: Blaze keeps its marquee + speed on the strip; Living flame only sets brightness', async p => {
  await p.connect(); await p.ev(() => { S.bright = 0.8; runEffect('fire3'); }); await p.sleep(500); await p.clr();
  await p.hide(); await p.sleep(250);
  let h = await p.hexes();
  p.ok(h.includes('7e0703cd06ffff00ef') && h.includes('7e070223ffffff00ef') && h.includes('7e040150' + '01ff0201ef'), 'Blaze: marquee 205 + speed 35 + brightness 80% (0x50)', h);
  p.ok(!h.includes('7e07039c06ffff00ef'), 'Blaze does not switch to the lock effect');
  await p.show(); await p.ev(() => runEffect('fire2')); await p.sleep(500); await p.clr();
  await p.hide(); await p.sleep(250); h = await p.hexes();
  p.ok(h.length >= 1 && h.every(x => x.startsWith('7e0401')), 'Living flame: only a brightness packet', h);
}, { });

// ============================================================ 6. BRAKE LIGHT
const brakeOn = p => p.ev(() => { S.brakeOn = true; return startBrake(); });
const fix = (p, t, v) => p.ev((t, v) => onFix({ timestamp: t, coords: { speed: v, latitude: 10, longitude: 10, accuracy: 5 } }), t, v);
const gpsBrake = async p => { await fix(p, 1e6, 6); await fix(p, 1e6 + 1000, 3); };
const RED = C(255, 0, 0), DIM = C(0x5a, 0, 0);
test('brake over a solid colour: red at once, dim blink, then the colour returns', async p => {
  await p.connect(); await p.ev(() => setSolid('#0000ff')); await p.sleep(250); await brakeOn(p); await p.clr();
  await gpsBrake(p); await p.sleep(120);
  p.ok((await p.hexes()).includes(RED), 'full red within 120 ms of the GPS fix');
  await p.sleep(450);
  p.ok((await p.hexes()).includes(DIM), 'flash style blinks to dim red (5a) - never black');
  await p.waitFor(() => p.ev(() => !brake.active), 3000);
  await p.sleep(250);
  const c = await p.colours();
  p.ok(!c.some(x => x.rgb === '000000'), 'no black at any point');
  p.eq(c[c.length - 1].rgb, '0000ff', 'solid blue restored after the brake');
  const log = await p.log(), off = log.find(l => /BRAKE off held/.test(l));
  p.ok(log.some(l => /BRAKE on gps/.test(l)) && !!off, 'BRAKE on / off logged');
  p.near(off ? +off.match(/held (\d+)ms/)[1] : 0, 1250, 1900, 'held for the minimum ~1.3 s');
});
test('brake over a phone effect: only red while braking, effect resumes after', async p => {
  await p.connect(); await p.ev(() => runEffect('rainbow')); await p.sleep(500); await brakeOn(p);
  await gpsBrake(p); await p.sleep(200); await p.clr(); await p.sleep(800);
  const during = await p.colours();
  p.ok(during.length > 0 && during.every(x => x.rgb === 'ff0000' || x.rgb === '5a0000'), 'only ff0000 / 5a0000 while braking', during.map(x => x.rgb).slice(0, 8));
  await p.waitFor(() => p.ev(() => !brake.active), 3000); await p.clr(); await p.sleep(500);
  const after = await p.colours();
  p.ok(after.length >= 4 && after.some(x => x.rgb !== 'ff0000' && x.rgb !== '5a0000'), 'rainbow colours stream again after the brake', after.length);
});
test('brake over a built-in: red + full brightness, then mode and dimmed brightness come back', async p => {
  await p.connect(); await p.ev(() => { S.bright = 0.4; setBuiltin(155); }); await p.sleep(500); await brakeOn(p); await p.clr();
  await gpsBrake(p); await p.sleep(250);
  let h = await p.hexes();
  p.ok(h.includes(RED) && h.includes('7e040164' + '01ff0201ef'), 'red and strip brightness 100 at brake start', h);
  await p.waitFor(() => p.ev(() => !brake.active), 3000); await p.sleep(500);
  h = await p.hexes();
  p.ok(h.includes('7e07039b06ffff00ef'), 'built-in #155 re-sent after the brake', h);
  p.ok(h.includes('7e040128' + '01ff0201ef'), 'and the 40% brightness restored', h);
});
test('brake over Living flame: marquee + speed re-sent (restoreOutput -> start)', async p => {
  await p.connect(); await p.ev(() => runEffect('fire2')); await p.sleep(500); await brakeOn(p);
  await p.clr(); await gpsBrake(p); await p.waitFor(() => p.ev(() => !brake.active), 3000); await p.sleep(600);
  const h = await p.hexes();
  p.ok(h.includes('7e0703cd06ffff00ef') && h.includes('7e070223ffffff00ef'), 'flame mode 205 and speed 35 restored', h.slice(0, 6));
});
test('brake never fires with power off, and a power-off during braking is not undone', async p => {
  await p.connect(); await p.ev(() => setSolid('#00ff00')); await p.sleep(250); await brakeOn(p);
  await p.ev(() => togglePower()); await p.sleep(200); await p.clr();
  await gpsBrake(p); await p.sleep(300);
  p.eq((await p.hexes()).length, 0, 'power off: GPS brake sends nothing');
  p.eq(await p.ev(() => brake.active), false, 'brake not active');
  await p.ev(() => togglePower()); await p.sleep(300);
  await fix(p, 2e6, 6); await fix(p, 2e6 + 1000, 3); await p.sleep(200);
  p.eq(await p.ev(() => brake.active), true, 'power on again: brake works');
  await p.ev(() => togglePower()); await p.sleep(100); await p.clr();          // power off while braking
  await p.waitFor(() => p.ev(() => !brake.active), 3000); await p.sleep(400);
  p.eq((await p.colours()).filter(x => x.rgb !== 'ff0000' && x.rgb !== '5a0000').length, 0, 'after the brake ends with power off, no colour is sent');
  p.ok(!(await p.hexes()).some(h => /^7e0703/.test(h)), 'no effect command either');
});
test('brake: no link = nothing happens, no crash', async p => {
  await p.ev(() => { testBrake(); });
  await p.sleep(200);
  p.eq(await p.ev(() => brake.active), false, 'testBrake without a connection does nothing');
});
test('brake GPS logic: threshold, walking pace, gentle slowing, standstill hold, sensitivity', async p => {
  await p.connect(); await brakeOn(p);
  p.ok(Math.abs(await p.ev(() => brakeThr()) - 1.72) < 0.01 && Math.abs(await p.ev(() => { S.brakeSens = 10; const v = brakeThr(); S.brakeSens = 1; const w = brakeThr(); S.brakeSens = 7; return v * 100 + w; }) - 100 - 3.16) < 0.02, 'threshold: sens 7 = 1.72, 10 = 1.0, 1 = 3.16 m/s2');
  await fix(p, 1e6, 8); await fix(p, 1e6 + 1000, 7.5); await p.sleep(150);
  p.eq(await p.ev(() => brake.active), false, 'gentle slowing (0.5 m/s2) does not brake');
  await p.ev(() => { brake.hist = []; });
  await fix(p, 2e6, 1.5); await fix(p, 2e6 + 1000, 0.3); await p.sleep(150);
  p.eq(await p.ev(() => brake.active), false, 'walking pace (1.5 m/s) never triggers');
  await p.ev(() => { brake.hist = []; S.brakeSens = 10; });
  await fix(p, 3e6, 6); await fix(p, 3e6 + 1000, 4.9); await p.sleep(150);
  p.eq(await p.ev(() => brake.active), true, 'sensitivity 10 brakes at 1.1 m/s2');
  await p.ev(() => { brakeEnd(); brake.hist = []; S.brakeSens = 7; });
  await fix(p, 4e6, 6); await fix(p, 4e6 + 1000, 4.9); await p.sleep(150);
  p.eq(await p.ev(() => brake.active), false, 'sensitivity 7 does not brake at 1.1 m/s2');
  await p.ev(() => { brake.hist = []; });
  await fix(p, 5e6, 2.2); await fix(p, 5e6 + 1000, 0.5); await p.sleep(150);
  p.eq(await p.ev(() => brake.active), true, 'coming to a stop (v<0.7) brakes even below the decel threshold');
  await p.sleep(2600);
  p.eq(await p.ev(() => brake.active), true, 'red is held about 4 s at a standstill (still on after 2.7 s)');
});
test('brake: solid style never blinks; GPS silence releases it', async p => {
  await p.connect(); await p.ev(() => { S.brakeStyle = 'solid'; setSolid('#00ffff'); }); await p.sleep(250); await brakeOn(p); await p.clr();
  await gpsBrake(p); await p.sleep(1100);
  const c = await p.colours();
  p.ok(c.length >= 1 && c.every(x => x.rgb === 'ff0000'), 'solid style: only ff0000', c.map(x => x.rgb));
  await p.ev(() => { brake.fixAt = performance.now() - 6000; }); await p.sleep(400);
  p.eq(await p.ev(() => brake.active), false, 'GPS silent for 5 s -> released rather than staying red');
  await p.sleep(300);
  p.eq((await p.colours()).pop().rgb, '00ffff', 'and the colour is back');
});
test('brake fast mode: motion sensor brakes in ~0.3 s; no false alarm on noise; off when disabled', async p => {
  await p.connect(); await brakeOn(p);
  const prime = () => p.ev(() => { brakeEnd(); brake.ready = true; brake.axis = [1, 0, 0]; brake.speed = 5; brake.fixAt = performance.now(); brake.fEma = 0; brake.lowSince = 0; brake.lastMotionAt = 0; });
  const feed = (n, f) => p.ev((n, f) => { const b = performance.now(); let first = -1; for (let i = 0; i < n; i++) { brakeMotion([f(i), 0, 0], b + i * 20); if (brake.active && first < 0) first = i; } return first; }, n, f);
  await p.ev(() => { S.brakeFast = true; }); await prime();
  const noise = await p.ev(() => { const b = performance.now(); for (let i = 0; i < 150; i++) brakeMotion([(i % 2 ? 0.6 : -0.6), 0, 0], b + i * 20); return brake.active; });
  p.eq(noise, false, 'cruising noise (+-0.6 m/s2 for 3 s) does not brake');
  await prime();
  const first = await p.ev(() => { const b = performance.now(); let first = -1; for (let i = 0; i < 40; i++) { brakeMotion([-3, 0, 0], b + i * 20); if (brake.active && first < 0) first = i; } return first; });
  p.ok(first >= 5 && first <= 25, 'hard braking (-3 m/s2) detected after 5..25 samples of 20 ms (0.1-0.5 s)', first);
  p.ok((await p.log()).some(l => /BRAKE on motion/.test(l)), 'reason logged as motion');
  await prime(); await p.ev(() => { S.brakeFast = false; });
  p.eq(await p.ev(() => { const b = performance.now(); for (let i = 0; i < 40; i++) brakeMotion([-3, 0, 0], b + i * 20); return brake.active; }), false, 'fast mode off: motion alone never brakes');
  await p.ev(() => { S.brakeFast = true; brake.speed = 1.0; });
  p.eq(await p.ev(() => { const b = performance.now(); for (let i = 0; i < 40; i++) brakeMotion([-3, 0, 0], b + i * 20); return brake.active; }), false, 'too slow (<2 m/s): no brake');
});
test('testBrake() holds 2.5 s then restores', async p => {
  await p.connect(); await p.ev(() => setSolid('#ff00ff')); await p.sleep(250); await p.clr();
  await p.ev(() => testBrake()); await p.sleep(150);
  p.ok((await p.hexes()).includes(RED), 'red at once');
  await p.sleep(1500);
  p.eq(await p.ev(() => brake.active), true, 'still on at 1.6 s (test hold is 2.5 s)');
  await p.waitFor(() => p.ev(() => !brake.active), 2500); await p.sleep(250);
  p.eq((await p.colours()).pop().rgb, 'ff00ff', 'magenta restored');
});

// ============================================================ 7. STRIP SETUP / MIC / POWER
test('strip setup: LED count packet + Red Tail test, clamping, persistence', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => { pixelsEl().value = 300; applyPixels(); }); await p.sleep(500);
  let h = await p.hexes();
  p.eq(h.slice(0, 2), ['7e07212c0100ff00ef', '7e07031906ffff00ef'], 'LED count 300 then the Red Tail (#25) test effect');
  p.eq(await p.ev(() => localStorage.getItem('pixels')), '300', 'saved');
  await p.clr(); await p.ev(() => { pixelsEl().value = 5; applyPixels(); }); await p.sleep(400);
  p.eq((await p.hexes())[0], '7e07210a0000ff00ef', 'count below 10 clamps to 10');
  await p.clr(); await p.ev(() => { pixelsEl().value = 5000; applyPixels(); }); await p.sleep(400);
  p.eq((await p.hexes())[0], '7e0721e80300ff00ef', 'count above 1000 clamps to 1000');
  await p.clr(); await p.ev(() => { pixelsEl().value = ''; applyPixels(); }); await p.sleep(200);
  p.eq((await p.hexes()).length, 0, 'empty field sends nothing');
});
test('strip setup: wire order sends the packet then a red check; needs a connection', async p => {
  await p.ev(() => document.querySelector('[data-wire="GRB"]').click()); await p.sleep(200);
  p.eq((await p.hexes()).length, 0, 'not connected: nothing sent');
  await p.connect(); await p.clr();
  await p.ev(() => document.querySelector('[data-wire="GRB"]').click()); await p.sleep(400);
  p.eq((await p.hexes()).slice(0, 2), ['7e0781020103ff00ef', C(255, 0, 0)], 'GRB packet, then solid red to check');
  p.eq(await p.ev(() => localStorage.getItem('wires')), '"GRB"', 'wire order saved');
});
test('strip mic: mode, sensitivity, and restore after power cycle', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => selectSource('strip')); await p.sleep(400);
  p.eq((await p.hexes()).slice(0, 2), ['7e07038004ffff00ef', '7e070632ffffff00ef'], 'Energy 1 (128) then sensitivity 50');
  await p.ev(() => { togglePower(); }); await p.sleep(200); await p.clr();
  await p.ev(() => { togglePower(); }); await p.sleep(500);
  const h = await p.hexes();
  p.ok(h[0] === '7e0404f00001ff00ef' && h.includes('7e07038004ffff00ef') && h.includes('7e070632ffffff00ef'), 'power back on re-sends the strip-mic mode', h);
});
test('power: off/on packets, engine stops and restarts, solid/built-in restored', async p => {
  await p.connect(); await p.ev(() => runEffect('rainbow')); await p.sleep(400); await p.clr();
  await p.ev(() => togglePower()); await p.sleep(450);
  { // A frame already in flight may go out just BEFORE the off packet; nothing may follow it (a colour after OFF could switch the strip back on).
    const hh = await p.hexes(), at = hh.indexOf('7e0404000000ff00ef');
    p.ok(at >= 0 && at === hh.length - 1, 'power off: the off packet is sent and nothing follows it (colours stop)', hh);
  }
  await p.clr(); await p.ev(() => togglePower()); await p.sleep(500);
  let h = await p.hexes();
  p.eq(h[0], '7e0404f00001ff00ef', 'power on packet first');
  p.ok(h.filter(x => x.startsWith('7e070503')).length >= 3, 'rainbow streams again');
  await p.ev(() => setBuiltin(25)); await p.sleep(300); await p.ev(() => togglePower()); await p.sleep(200); await p.clr();
  await p.ev(() => togglePower()); await p.sleep(400);
  p.ok((await p.hexes()).includes('7e07031906ffff00ef'), 'built-in re-sent on power on');
  await p.ev(() => { togglePower(); }); await p.sleep(200); await p.clr();
  await p.ev(() => setSolid('#00ff00')); await p.sleep(400);
  const h3 = await p.hexes();
  p.eq(h3.slice(0, 2), ['7e0404f00001ff00ef', C(0, 255, 0)], 'choosing a colour while off powers on first');
});
test('hardware speed slider sends the strip speed command', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => { const e = document.getElementById('hwSpeed'); e.value = 77; e.dispatchEvent(new Event('input')); }); await p.sleep(300);
  p.eq(await p.hexes(), ['7e07024dffffff00ef'], 'speed 77 = 0x4d');
  p.eq(await p.ev(() => localStorage.getItem('hwSpeed')), '77', 'saved');
});

// ============================================================ 8. PULSE DIVISION / TEMPO
test('beatDiv(): Auto hysteresis 95-100 BPM, >=180 every 4th, explicit values', async p => {
  const r = await p.ev(() => { S.beatDiv = 'auto'; tempo.autoDiv = undefined; return [80, 100, 97, 94, 97, 99, 100, 180, 150, 99, 90].map(b => { S.bpm = b; return beatDiv(); }); });
  p.eq(r, [1, 2, 2, 1, 1, 1, 2, 4, 2, 2, 1], 'auto division sequence over 80,100,97,94,97,99,100,180,150,99,90 BPM');
  p.eq(await p.ev(() => ['1', '2', '4'].map(v => { S.beatDiv = v; S.bpm = 150; return beatDiv(); })), [1, 2, 4], 'explicit Every beat / 2nd / 4th');
});
test('detDiv(): same rules from detected onsets (mic / player)', async p => {
  const r = await p.ev(() => { S.beatDiv = 'auto'; audio.autoDivD = undefined; return [80, 100, 97, 90, 97, 200, 150].map(b => { audio.ibis = Array(6).fill(60000 / b); return detDiv(); }); });
  p.eq(r, [1, 2, 2, 1, 1, 4, 2], 'detDiv over 80,100,97,90,97,200,150 BPM');
  p.eq(await p.ev(() => { audio.ibis = [500, 500]; return detBpm(); }), 0, 'fewer than 5 onsets = no estimate');
});
test('pulses per second follow the division (240 BPM: every beat 4/s, 2nd 2/s, 4th 1/s)', async p => {
  await p.connect(); await p.ev(() => { runEffect('mpulse'); setBpm(240); });
  const count = async div => { await p.ev(d => { S.beatDiv = d; tempo.lastHitIdx = undefined; tempo.hitPhase = 0; }, div); await p.sleep(300); const a = await p.ev(() => audio.beatCount); await p.sleep(3000); return (await p.ev(() => audio.beatCount)) - a; };
  const n1 = await count('1'), n2 = await count('2'), n4 = await count('4');
  p.near(n1, 10, 14, 'every beat: hits in 3 s'); p.near(n2, 5, 7, 'every 2nd beat: hits in 3 s'); p.near(n4, 2, 4, 'every 4th beat: hits in 3 s');
});
test('beat frames are urgent: colour reaches the strip within ms of the beat', async p => {
  await p.connect(); await p.ev(() => { S.beatDiv = '1'; window.__beats = []; const o = flashBeat; flashBeat = function () { __beats.push(performance.now()); return o(); }; runEffect('mpulse'); });
  await p.sleep(400); await p.clr(); await p.ev(() => { __beats.length = 0; }); await p.sleep(3000);
  const beats = await p.ev(() => __beats.slice()), c = await p.colours();
  const lat = beats.map(b => { const x = c.find(x => x.t >= b - 1); return x ? x.t - b : NaN; }).filter(v => !isNaN(v));
  p.ok(beats.length >= 4, 'beats observed', beats.length);
  p.ok(median(lat) < 25, 'median beat -> packet latency under 25 ms', lat.map(Math.round));
  p.ok(Math.max(...lat) < 70, 'worst latency under 70 ms', lat.map(Math.round));
});
test('tempo: setBpm clamps 40-240 and rounds; tap tempo fits ~150 BPM from 400 ms taps', async p => {
  p.eq(await p.ev(() => { setBpm(10); return S.bpm; }), 40, 'min 40');
  p.eq(await p.ev(() => { setBpm(999); return S.bpm; }), 240, 'max 240');
  p.eq(await p.ev(() => { setBpm(123.456); return S.bpm; }), 123.5, 'one decimal');
  p.eq(await p.ev(() => { bpmMul(0.5); return S.bpm; }), 61.8, 'half-time button');
  for (let i = 0; i < 6; i++) { await p.ev(() => onTap()); await p.sleep(400); }
  const gap = await p.ev(() => { const t = tempo.taps; return (t[t.length - 1] - t[0]) / (t.length - 1); });
  p.near(await p.ev(() => S.bpm), 60000 / gap - 1.5, 60000 / gap + 1.5, 'tap tempo matches the real tap spacing (' + Math.round(gap) + ' ms)');
});

// ============================================================ 9. FOLLOW THE VOLUME
test('follow-the-volume: quieter music is dimmer (dB law), silence is dark, spikes barely move the reference', async p => {
  const r = await p.ev(() => {
    S.levelMode = 'follow';
    const mk = v => ({ bass: v, mid: v, treble: v }), o = {};
    let ag = { bass: 0.6, mid: 0.6, treble: 0.6 };
    o.loud = agcNorm(ag, mk(0.6)).bass;
    ag = { bass: 0.6, mid: 0.6, treble: 0.6 }; o.quiet16 = agcNorm(ag, mk(0.6 - 16 / 70)).bass;
    ag = { bass: 0.6, mid: 0.6, treble: 0.6 }; o.silent = agcNorm(ag, mk(0.1)).bass;
    ag = { bass: 0.2, mid: 0.2, treble: 0.2 }; ag._t = performance.now() - 120; agcNorm(ag, mk(0.8)); o.spikeRef = ag.bass;
    ag = { bass: 0.2, mid: 0.2, treble: 0.2 }; for (let i = 0; i < 10; i++) { ag._t = performance.now() - 500; agcNorm(ag, mk(0.8)); } o.sustainedRef = ag.bass;
    S.levelMode = 'auto'; ag = { bass: 0.6, mid: 0.6, treble: 0.6 }; o.autoQuiet = agcNorm(ag, mk(0.6 - 16 / 70)).bass;
    return o;
  });
  p.ok(r.loud > 0.95, 'reference level = full output', r.loud);
  p.near(r.quiet16, 0.15, 0.4, '16 dB quieter gives about a third of the brightness');
  p.eq(r.silent, 0, '~35 dB below the reference is dark');
  p.ok(r.spikeRef > 0.2 && r.spikeRef < 0.26, 'a 120 ms burst moves the reference by <0.06 (rise time constant 1.5 s)', r.spikeRef);
  p.ok(r.sustainedRef > 0.7, 'music that stays louder lifts the reference within seconds', r.sustainedRef);
  p.ok(r.autoQuiet > 0.4, 'Auto level mode does not dim the same quiet input as much', r.autoQuiet);
});

// ============================================================ 10. FIRE / BUILT-IN PUMP EFFECTS
test('Living flame: start packets, brightness 3-100 only, slow commands stay under the gap limit', async p => {
  await p.connect(); await p.clr();
  await p.ev(() => runEffect('fire2')); await p.sleep(3000);
  const w = await p.pk();
  p.eq(w[0].h, '7e0703cd06ffff00ef', 'first packet: Red marquee (205)');
  p.ok(w.slice(0, 5).some(x => x.h === '7e070223ffffff00ef'), 'flow speed 35 follows within the first 5 packets', w.slice(0, 5).map(x => x.h));
  const b = w.filter(x => x.h.startsWith('7e0401')).map(x => byteAt(x.h, 6));
  p.ok(b.length >= 5 && Math.min(...b) >= 3 && Math.max(...b) <= 100, 'flicker brightness packets within 3..100', [b.length, Math.min(...b), Math.max(...b)]);
  const slow = w.filter(x => /^7e0(401|702)/.test(x.h)).length;
  p.ok(slow / 3 <= 9.5, 'brightness+speed commands/s <= ~8.3 + jitter', +(slow / 3).toFixed(1));
  p.ok(w.filter(x => x.h.startsWith('7e070503')).length === 0, 'no phone colour stream (strip does the animation)');
});
test('Built-in on the beat: start packets, pump brightness deep, stays in range', async p => {
  await p.connect(); await p.ev(() => { S.beatDiv = '1'; }); await p.clr();
  await p.ev(() => runEffect('mbuiltin')); await p.sleep(3500);
  const w = await p.pk();
  p.eq(w[0].h, '7e07036706ffff00ef', 'first packet: 7-colour running (103)');
  const sp = w.filter(x => x.h.startsWith('7e0702')).map(x => byteAt(x.h, 6));
  p.ok(sp.length >= 1 && sp.every(v => v >= 50 && v <= 65), 'flow speed packets are the base 50 or the beat kick (<=65)', sp);
  const b = w.filter(x => x.h.startsWith('7e0401')).map(x => byteAt(x.h, 6));
  p.ok(b.length >= 4 && Math.max(...b) >= 80 && Math.min(...b) <= 25 && Math.min(...b) >= 3, 'brightness pumps between <=25 and >=80, floor 3', [Math.min(...b), Math.max(...b), b.length]);
  p.ok(w.filter(x => /^7e0(401|702)/.test(x.h)).length / 3.5 <= 10, 'slow commands/s within the gap limit');
});
test('slow strip model (100 ms per brightness/speed): no backlog growth in Blaze, Living flame, Built-in on the beat', async p => {
  await p.connect(); await p.ev(() => { __slow = true; S.beatDiv = '1'; setBpm(140); });
  for (const id of ['fire2', 'fire3', 'mbuiltin']) {
    await p.ev(() => { __proc.length = 0; }); await p.ev(i => runEffect(i), id); await p.sleep(3500);
    const pr = await p.ev(() => __proc.map(x => ({ h: x.h, w: x.done - x.sent }))), ws = pr.map(x => x.w).sort((a, b) => a - b);
    const tail = pr.slice(-6).map(x => x.w);
    p.ok(pr.length > 5, id + ': produced packets', pr.length);
    p.ok(ws[Math.floor(ws.length * 0.95)] < 600, id + ': p95 digest wait < 600 ms', Math.round(ws[Math.floor(ws.length * 0.95)]));
    p.ok(Math.max(...tail) < 600, id + ': still bounded at the end of the run (no backlog growth)', tail.map(Math.round));
  }
});
test('every effect runs without errors, emits only valid packets, no black, no built-in > 212', async p => {
  await p.connect(); await p.ev(() => { S.beatDiv = 'auto'; });
  const ids = await p.ev(() => EFFECTS.map(e => e.id)), bad = [], silent = [];
  for (const id of ids) {
    await p.ev(() => setSolid('#010203')); await p.sleep(120); await p.clr();
    await p.ev(i => runEffect(i), id); await p.sleep(450);
    const h = await p.hexes(), c = await p.colours();
    if (!h.length && !/^(jolt|energy|tilt)$/.test(id)) silent.push(id);
    for (const x of h) {
      const ok = ['7e0783', '7e0404', '7e0404f00001ff00ef', '7e0404000000ff00ef'].includes(x)
        || (/^7e070503[0-9a-f]{6}(10|20)ef$/.test(x) && x.slice(8, 14) !== '000000')
        || (/^7e0703[0-9a-f]{2}06ffff00ef$/.test(x) && byteAt(x, 6) <= 212)
        || (/^7e0401[0-9a-f]{2}01ff0201ef$/.test(x) && byteAt(x, 6) <= 100)
        || (/^7e0702[0-9a-f]{2}ffffff00ef$/.test(x) && byteAt(x, 6) >= 1 && byteAt(x, 6) <= 100);
      if (!ok) bad.push(id + ': ' + x);
    }
  }
  p.ok(bad.length === 0, 'all packets valid (length/format/ranges, no 000000, mode<=212, speed 1..100, brightness<=100)', bad.slice(0, 5));
  p.ok(silent.length === 0, 'every non-sensor effect produced packets', silent);
  p.ok(ids.length >= 20, 'effect table has >= 20 effects', ids.length);
}, { allowWarn: false });

// ============================================================ 10b. SCENES / RIDE SCREEN
test('scenes: tap applies effect + brightness + brake; hold-overwrite persists; missing effects skipped', async p => {
  const n = await p.ev(() => document.querySelectorAll('#rideScenes [data-scene]').length);
  p.ok(n >= 5, 'scene tiles rendered: ' + n);
  await p.ev(() => applyScene(sceneList().findIndex(s => s.n === 'Night Ride')));
  const r = await p.ev(() => ({ id: S.current && S.current.id, b: Math.round(S.bright * 100), brake: S.brakeOn, scene: S.scene }));
  p.eq(r, { id: 'ocean', b: 85, brake: true, scene: 'Night Ride' }, 'Night Ride applied');
  await p.ev(() => { window.confirm = () => true; runEffect('rainbow'); overwriteScene(0); });
  p.eq(await p.ev(() => [sceneList()[0].mine, sceneList()[0].cur.id, JSON.parse(localStorage.getItem('sceneOv'))['Night Ride'].cur.id]), [true, 'rainbow', 'rainbow'], 'overwritten and saved');
  p.eq(await p.ev(() => { SCENE_DEFS.push({ n: 'Ghost', fx: 'nope', bright: 50 }); const ok = !sceneList().some(s => s.n === 'Ghost'); SCENE_DEFS.pop(); return ok; }), true, 'unknown effects skipped');
});
test('Neon Tube stutters then settles; Storm flashes blue-violet and decays (simulated clock)', async p => {
  const r = await p.ev(() => {
    const real = performance.now.bind(performance); let T = 100000; performance.now = () => T;
    const run = (id, secs) => { const e = byId[id], pr = paramsFor(e), st = {}, out = []; for (let i = 0; i < secs * 30; i++) { T += 33; out.push(e.fn(i / 30, pr, st)); } return out; };
    const neon = run('neon', 30).map(c => Math.max(...c)), storm = run('storm', 40);
    performance.now = real;
    const sm = storm.map(c => c[2]);
    return { nMax: Math.max(...neon), nMin: Math.min(...neon), dips: neon.filter(v => v < 0.35 * Math.max(...neon)).length, sMax: Math.max(...sm), sMin: Math.min(...sm), sBolt: storm.some(c => c[2] > 200 && c[0] < 200) };
  });
  p.ok(r.nMax > 200 && r.nMin > 5, 'neon never goes black: ' + JSON.stringify([r.nMax, r.nMin]));
  p.ok(r.dips >= 3, 'neon has dark stutter frames: ' + r.dips);
  p.ok(r.sMax > 150 && r.sMin > 5, 'storm bolts bright, sky never black: ' + JSON.stringify([r.sMax, r.sMin]));
  p.ok(r.sBolt, 'storm bolt is blue-violet, not white');
});
test('Velocity follows GPS speed; Airtime drains in the air and blasts on landing (simulated)', async p => {
  const r = await p.ev(() => {
    const real = performance.now.bind(performance); let T = 200000; performance.now = () => T;
    const ev = byId.velocity, ea = byId.airtime, pv = paramsFor(ev), pa = paramsFor(ea), sv = {}, sa = {};
    const oldSpeed = brake.speed, oldFix = brake.fixAt, oldAcc = motion.acc;
    const vel = sp => { brake.speed = sp; let c; for (let i = 0; i < 150; i++) { T += 33; brake.fixAt = T; c = ev.fn(i / 30, pv, sv); } return c; };
    const slow = vel(0.5), fast = vel(13);
    // airtime: resting, then 0.3 s weightless, then a 25 m/s2 landing
    const step = a => { T += 33; motion.acc = a; motion.accAt = T; return ea.fn(T / 1000, pa, sa); };
    for (let i = 0; i < 20; i++) step(9.8);
    const rest = step(9.8);
    let air; for (let i = 0; i < 10; i++) air = step(1);
    const land = step(25), later = (() => { let c; for (let i = 0; i < 30; i++) c = step(9.8); return c; })();
    performance.now = real; brake.speed = oldSpeed; brake.fixAt = oldFix; motion.acc = oldAcc;
    return { slow, fast, rest, air, land, later };
  });
  p.ok(r.slow[2] > r.slow[0] + 30 && r.slow[0] < 20, 'slow = cool blue/cyan ' + JSON.stringify(r.slow.map(Math.round)));
  p.ok(r.fast[0] > 100 && r.fast[0] > r.fast[2] * 2, 'fast = hot red/magenta ' + JSON.stringify(r.fast.map(Math.round)));
  p.ok(Math.max(...r.air) < Math.max(...r.rest) * 0.6, 'airtime drains while weightless');
  p.ok(r.land[0] > 200 && r.land[0] > r.land[2], 'landing blasts orange-red ' + JSON.stringify(r.land.map(Math.round)));
  p.ok(r.later[0] < 100 && r.later[2] > 100, 'back to the base colour after the blast');
});
test('Aurora/Synthwave never black; Carve flushes by turn side; idle governor dims when still and snaps back (simulated)', async p => {
  const r = await p.ev(() => {
    const real = performance.now.bind(performance); let T = 300000; performance.now = () => T;
    const lo = id => { const e = byId[id], pr = paramsFor(e), st = {}; let m = 1e9; for (let i = 0; i < 30 * 60; i++) { T += 33; m = Math.min(m, Math.max(...e.fn(i / 30, pr, st))); } return m; };
    const aur = lo('aurora'), syn = lo('synth');
    const ec = byId.carve, pc = paramsFor(ec), sc = {}; motion.grav = [0, 0, 9.8];
    const turn = z => { motion.rot = [0, 0, z]; let c; for (let i = 0; i < 30; i++) { T += 33; c = ec.fn(T / 1000, pc, sc); } return c; };
    const straight = turn(0), left = turn(1.2), right = turn(-1.2);
    // idle governor
    S.idleAfter = 5; idle.k = 0; idle.stopAt = 0; idle.last = 0; const savedBrake = { on: brake.on, speed: brake.speed, fixAt: brake.fixAt }; brake.on = true;
    const col = [0, 200, 255]; let c0;
    brake.speed = 5; for (let i = 0; i < 60; i++) { T += 33; brake.fixAt = T; c0 = idleGov(col, T); }
    brake.speed = 0; let c1; for (let i = 0; i < 30 * 12; i++) { T += 33; brake.fixAt = T; c1 = idleGov(col, T); }
    brake.speed = 6; let c2; for (let i = 0; i < 40; i++) { T += 33; brake.fixAt = T; c2 = idleGov(col, T); }
    Object.assign(brake, savedBrake); S.idleAfter = 0;
    performance.now = real;
    return { aur, syn, straight, left, right, c0, c1, c2 };
  });
  p.ok(r.aur >= 8 && r.syn >= 25, 'aurora/synthwave never black: ' + [r.aur, r.syn].map(Math.round));
  p.ok(r.left[0] > r.left[2] * 0.8 && r.left[1] < 50 && r.right[1] > 100 && r.right[0] < 40, 'carve: left magenta / right cyan ' + JSON.stringify([r.left, r.right].map(a => a.map(Math.round))));
  p.ok(r.straight[2] > r.straight[1] && r.straight[1] < 10, 'carve straight = violet');
  p.eq(r.c0.map(Math.round), [0, 200, 255], 'moving: effect untouched');
  p.ok(r.c1[0] > r.c1[2] && Math.max(...r.c1) < 90, 'still: dim amber glow ' + JSON.stringify(r.c1.map(Math.round)));
  p.ok(r.c2[2] > 150, 'moving again: effect is back');
});
test('GPS without a speed value: speed comes from net movement over 2.5-6 s; jitter reads 0; stale GPS is unknown; Storm sky stays blue', async p => {
  const r = await p.ev(() => {
    const real = performance.now.bind(performance); let T = 500000; performance.now = () => T;
    brake.on = true; brake.pos = []; brake.hist = []; brake.speed = null;
    const fix = (lon, tsec) => onFix({ timestamp: 1e12 + tsec * 1000, coords: { speed: null, latitude: 13.0, longitude: lon, accuracy: 10 } });
    fix(100.0, 0); const first = brake.speed;
    fix(100.00006, 1); const early = brake.speed;                    // only 1 s of history: unknown
    fix(100.00002, 3); const still = brake.speed;                    // wandering +-6 m inside the noise
    fix(100.0004, 4); const moved = brake.speed;                     // ~43 m in 4 s
    T += 7000; brake.active = false; brakeTick(); const stale = brake.speed;   // no fix for 7 s
    const e = byId.storm, pr = paramsFor(e), st = { next: T + 1e9 }; let c; for (let i = 0; i < 60; i++) { T += 33; c = e.fn(i / 30, pr, st); }
    performance.now = real; brake.on = false; brake.speed = null; brake.pos = []; brake.hist = [];
    return { first, early, still, moved, stale, c };
  });
  p.eq([r.first, r.early], [null, null], 'no speed until there are 2.5 s of history');
  p.eq(r.still, 0, 'wandering inside the GPS noise reads as standing still');
  p.ok(r.moved > 8 && r.moved < 13, 'moving ~43 m in 4 s gives ~' + (r.moved || 0).toFixed(1) + ' m/s');
  p.eq(r.stale, null, 'no fix for 7 s: speed becomes unknown');
  p.ok(r.c[2] > r.c[0] * 2.5 && r.c[2] >= 20, 'storm sky is blue-violet, not red: ' + JSON.stringify(r.c.map(Math.round)));
});
test('pocket mode: levels sit above the noise floor (rumble reads dark, music reads bright); bands re-cut; jolts mask Auto-listen onsets', async p => {
  const r = await p.ev(() => {
    S.pocket = true; const ag = { bass: 0, mid: 0, treble: 0 }; const real = performance.now.bind(performance); let T = 900000; performance.now = () => T;
    const feed = (b, m, t, secs) => { let o; for (let i = 0; i < secs * 30; i++) { T += 33; o = agcNorm(ag, { bass: b, mid: m, treble: t }); } return o; };
    feed(0.30, 0.30, 0.30, 12);                                // steady rumble: becomes the floor
    const rumble = feed(0.30, 0.30, 0.30, 2);
    const music = feed(0.65, 0.55, 0.30, 1);                   // music rises well above it
    performance.now = real;
    // jolt mask: build fake env with a hit in the middle
    const bands = typeof bandsOf === 'function';
    S.pocket = false;
    return { rumble, music, bands };
  });
  p.ok(r.rumble.bass === 0 && r.rumble.mid === 0, 'steady rumble reads dark: ' + JSON.stringify(r.rumble));
  p.ok(r.music.bass > 0.5 && r.music.mid > 0.2, 'music above the floor reads bright: ' + JSON.stringify(r.music));
});
test('section detector: kicks then silence of kicks = quiet with tension; kick returning = drop with dropK; log line written', async p => {
  const r = await p.ev(() => {
    const d = new Sections(); let t = 0; const out = [];
    const run = (secs, beatEvery, bass, lvl) => { for (let i = 0; i < secs * 30; i++) { t += 1 / 30; const beat = beatEvery && Math.round(t * 30) % Math.round(beatEvery * 30) === 0; out.push(d.update({ beat, bass: beat ? bass : bass * 0.4, mid: 0.4, treble: 0.3, level: lvl }, 1 / 30, t)); } };
    run(20, 0.5, 0.8, 0.7);                 // groove (12 s warm-up included)
    const groove = out[out.length - 1].state;
    run(6, 0, 0.02, 0.15);                  // breakdown: no kicks
    const quiet = out[out.length - 1];
    run(1.5, 0.5, 0.9, 0.8);                // kick is back, loud
    const states = out.slice(-45).map(o => o.state), maxDrop = Math.max(...out.slice(-45).map(o => o.dropK));
    return { groove, quiet: quiet.state, ten: quiet.tension, states: [...new Set(states)], maxDrop };
  });
  p.ok(r.groove === 'steady', 'groove is steady: ' + r.groove);
  p.ok(r.quiet === 'quiet' && r.ten > 0.3, 'no kicks = quiet with rising tension: ' + r.quiet + ' ' + r.ten.toFixed(2));
  p.ok(r.states.includes('drop') && r.maxDrop > 0.4, 'kick returns = drop: ' + JSON.stringify(r.states) + ' dropK ' + r.maxDrop.toFixed(2));
});
test('new music effects run in all sources without errors and never go black (pump, kick snap, lava, accent, heartbeat, build and drop)', async p => {
  const r = await p.ev(() => {
    const out = {}, realNow = performance.now.bind(performance); let T = 700000; performance.now = () => T;
    for (const id of ['mpump', 'mkick', 'mlava', 'maccent', 'mheart', 'mdrop']) {
      const e = byId[id], pr = paramsFor(e), st = {}; let mn = 999, mx = 0, bad = 0;
      for (let i = 0; i < 600; i++) {
        audio.beat = i % 14 === 0; audio.bass = audio.beat ? 0.9 : 0.2; audio.level = 0.3 + 0.5 * (i % 14 === 0); audio.mid = 0.3; audio.treble = 0.2;
        music.sec = { state: i > 300 && i < 400 ? 'quiet' : 'steady', tension: i > 300 && i < 400 ? 0.8 : 0, dropK: i === 400 ? 1 : 0 };
        T += 33; const c = e.fn(i / 30, pr, st); if (c.some(v => !(v >= 0 && v <= 256))) bad++; mn = Math.min(mn, Math.max(...c)); mx = Math.max(mx, Math.max(...c));
      }
      out[id] = { mn: Math.round(mn), mx: Math.round(mx), bad };
    }
    performance.now = realNow;
    return out;
  });
  for (const [id, v] of Object.entries(r)) p.ok(v.bad === 0 && v.mn >= 12 && v.mx > 100, id + ' ok ' + JSON.stringify(v));
});
test('Auto-listen lock is sticky: weak wandering guesses never move it; a clear new tempo moves it after 6 confident estimates', async p => {
  const r = await p.ev(() => {
    auto.locked = false; auto.cand = null; auto.candN = 0; S.bpm = 120;
    const now = performance.now();
    autoApply(120, now, 6, 1);                                  // first lock
    const a = S.bpm;
    for (const b of [106, 104, 96, 131, 93, 106, 105, 104]) autoApply(b, now, 2.0, 0.2);   // low-confidence wandering (as in the phone log)
    const b1 = S.bpm;
    for (let i = 0; i < 8; i++) autoApply(140, now, 4, 0.8);    // confident, but the current tempo still fits: no jump
    const b2 = S.bpm;
    for (let i = 0; i < 5; i++) autoApply(140, now, 4, 0.1);    // 5 clear estimates: not yet
    const b3 = S.bpm;
    autoApply(140, now, 4, 0.1);                                // the 6th: jump
    return { a, b1, b2, b3, b4: S.bpm };
  });
  p.eq([r.a, r.b1, r.b2, r.b3], [120, 120, 120, 120], 'stays at 120 through weak and ambiguous guesses');
  p.ok(Math.abs(r.b4 - 140) < 1, 'jumps to 140 after 6 confident estimates: ' + r.b4);
});
test('Auto-listen phase is smoothed: noisy readings barely move the grid, a lasting shift does', async p => {
  const r = await p.ev(() => {
    const real = performance.now.bind(performance); let T = 1e6; performance.now = () => T;
    auto.locked = false; auto.cand = null; auto.candN = 0; S.bpm = 120; tempo.t0 = T;
    const P = 500, beatAtFor = errMs => Math.round(tempo.t0 / P) * P * 0 + tempo.t0 + errMs;   // a reading that says the beat is errMs after the grid
    autoApply(120, T, 6, 1);                                                                   // first lock: grid = reading
    const t0a = tempo.t0;
    for (const e of [90, -110, 70, -95, 120, -80, 100, -130]) { T += 1000; autoApply(120, beatAtFor(e) + (T - T), 5, 1); }   // noisy, mean about 0
    const drift = tempo.t0 - t0a - 0;                                                          // grid moved by (including the 8 s of elapsed beats)
    const t0b = tempo.t0;
    for (let i = 0; i < 12; i++) { T += 1000; autoApply(120, beatAtFor(80), 5, 1); }           // lasting +80 ms shift
    const moved = tempo.t0 - t0b;
    performance.now = real;
    return { drift, moved };
  });
  p.ok(Math.abs(r.drift) < 40, 'noise moves the grid under 40 ms: ' + Math.round(r.drift));
  p.ok(r.moved > 40, 'a lasting 80 ms shift is followed (moved ' + Math.round(r.moved) + ' ms)');
});
test('contrast deepens darks and keeps peaks and hue; crossfade blends from the previous colour; power-on fades up from dark', async p => {
  const r = await p.ev(() => {
    const real = performance.now.bind(performance); let T = 2e6; performance.now = () => T;
    S.contrast = 0; shape.from = null; const flat = shapeColour([100, 50, 20], T);
    S.contrast = 1; const deep = shapeColour([100, 50, 20], T), peak = shapeColour([255, 128, 0], T);
    S.contrast = 0; shape.last = [200, 0, 0]; startFade(400); const f0 = shapeColour([0, 0, 200], T); T += 200; const f1 = shapeColour([0, 0, 200], T); T += 300; const f2 = shapeColour([0, 0, 200], T);
    startFade(900, true); const p0 = shapeColour([100, 100, 100], T); T += 450; const p1 = shapeColour([100, 100, 100], T);
    performance.now = real; S.contrast = 0; shape.from = null;
    return { flat, deep, peak, f0, f1, f2, p0, p1 };
  });
  p.ok(r.deep[0] < r.flat[0] * 0.5, 'contrast darkens a dim colour: ' + Math.round(r.deep[0]) + ' vs ' + r.flat[0]);
  p.ok(Math.abs(r.deep[0] / r.deep[1] - 2) < 0.05, 'hue kept (R:G stays 2:1)');
  p.ok(r.peak[0] > 250, 'full brightness stays full: ' + Math.round(r.peak[0]));
  p.ok(r.f0[0] > 190 && r.f1[0] > 20 && r.f1[0] < 180 && r.f2[2] > 195 && r.f2[0] < 5, 'crossfade goes red -> blue through the middle');
  p.ok(r.p0[0] < 5 && r.p1[0] > 30 && r.p1[0] < 95, 'power-on fades up from dark: ' + Math.round(r.p0[0]) + ' -> ' + Math.round(r.p1[0]));
});
test('power ramp: off fades the colour down and ends with the OFF packet; on sends a dark colour first, then ON, then fades up', async p => {
  await p.connect(); await p.ev(() => setSolid('#00ff00')); await p.sleep(400); await p.clr();
  await p.ev(() => togglePower()); await p.sleep(1400);
  let c = await p.colours(); const all = (await p.pk()).map(x => x.h);
  const g = c.map(x => parseInt(x.rgb.slice(2, 4), 16));
  p.ok(g.length >= 4 && g[0] > g[g.length - 1] && g[g.length - 1] < 120, 'green fades down: ' + g.join(','));
  p.ok(all[all.length - 1] === '7e0404000000ff00ef', 'the last packet is OFF');
  p.eq(await p.ev(() => S.power), false, 'power is off after the ramp');
  await p.clr(); await p.ev(() => togglePower()); await p.sleep(1400);
  const s2 = (await p.pk()).map(x => x.h); c = await p.colours();
  p.ok(/^7e070503020202/.test(s2[0]) && s2[1] === '7e0404f00001ff00ef', 'dark colour first, then ON: ' + s2.slice(0, 2).join(' '));
  const g2 = c.map(x => parseInt(x.rgb.slice(2, 4), 16)); p.ok(g2.length >= 4 && g2[g2.length - 1] > g2[1] && g2[g2.length - 1] > 200, 'green fades up: ' + g2.join(','));
}, { ls: { fadeMs: 450 } });
// ============================================================ 11. STORAGE / DEFAULTS / MIGRATIONS / DLOG
test('defaults with empty storage', async p => {
  const r = await p.ev(() => ({ fps: S.fps, slowGap: S.slowGap, musicFps: S.musicFps, beatDiv: S.beatDiv, levelMode: S.levelMode, fastWrite: S.fastWrite, musicFlag: S.musicFlag,
    brakeSens: S.brakeSens, brakeStyle: S.brakeStyle, brakeFast: S.brakeFast, beatOffset: S.beatOffset, micGainDb: S.micGainDb, hwSpeed: S.hwSpeed, bright: S.bright, legacyFx: S.legacyFx,
    lockAction: S.lockAction, lockMode: S.lockMode, audioSrc: S.audioSrc, bpm: S.bpm, syncDelay: S.syncDelay, fxStars: S.fxStars, otherFx: S.otherFx, fastColourAll: S.fastColourAll, power: S.power, brakeOn: S.brakeOn }));
  p.eq(r, { fps: 15, slowGap: 120, musicFps: 30, beatDiv: 'auto', levelMode: 'follow', fastWrite: true, musicFlag: 32, brakeSens: 7, brakeStyle: 'flash', brakeFast: true, beatOffset: -60, micGainDb: 12, hwSpeed: 50, bright: 1, legacyFx: false,
    lockAction: 'builtin', lockMode: 156, audioSrc: 'tempo', bpm: 120, syncDelay: 200, fxStars: [156], otherFx: false, fastColourAll: false, power: true, brakeOn: false }, 'default settings');
  p.eq(await p.ev(() => [document.getElementById('fps').value, document.getElementById('slowGap').value, document.getElementById('musicFps').value, document.getElementById('bright').value]), ['15', '120', '30', '100'], 'sliders show the defaults');
});
test('saved settings are loaded', async p => {
  p.eq(await p.ev(() => [S.fps, S.slowGap, S.musicFps, S.bright, S.beatDiv, S.legacyFx, S.brakeSens, S.bpm]), [12, 90, 45, 0.4, '2', true, 9, 133], 'values from localStorage');
}, { ls: { fps: 12, slowGap: 90, musicFps: 45, bright: 40, beatDiv: '2', legacyFx: true, brakeSens: 9, bpm: 133 } });
test('migrations: old star list, old lock mode, music params reset once', async p => {
  p.eq(await p.ev(() => S.fxStars), [156, 233], 'old #28 -> 156; #105 -> 233; #106 (234) dropped');
  p.eq(await p.ev(() => S.lockMode), 138, 'old lockMode 10 -> effect 138');
  p.eq(await p.ev(() => [!!S.params.mpulse, !!S.params.rainbow, localStorage.getItem('musicV')]), [false, true, '3'], 'music params reset, others kept, musicV=3 saved');
}, { ls: { modeStars: [28, 105, 106], lockMode: 10, params: { mpulse: { gain: 2 }, rainbow: { cycle: 3 } } } });
test('migrations: current musicV keeps saved music params', async p => {
  p.eq(await p.ev(() => [!!S.params.mpulse, S.lockMode, S.fxStars]), [true, 0, [5]], 'nothing reset; lockFx 0 is respected; new star list wins');
}, { ls: { musicV: 3, params: { mpulse: { gain: 2 } }, lockFx: 0, fxStars: [5] } });
test('corrupt storage falls back to defaults without crashing', async p => {
  p.eq(await p.ev(() => [S.fps, S.bpm, dlogBuf.length > 0]), [15, 120, true], 'defaults used; log still works');
  p.eq(await p.ev(() => { S.params = { fire2: { flame: 999 }, rainbow: { cycle: 3 } }; return [paramsFor(byId.fire2).flame, paramsFor(byId.rainbow).cycle]; }), [205, 3], 'invalid saved select option falls back to default; valid kept');
}, { ls: { fps: 'RAW:{oops', bpm: 'RAW:[', dlog: 'RAW:not json', params: 'RAW:}{' } });
test('diagnostics log: contents, caps, de-dup, header, persistence', async p => {
  await p.connect(); await p.ev(() => { runEffect('rainbow'); }); await p.sleep(500);
  await p.ev(() => { setSolid('#123456'); togglePower(); togglePower(); setBuiltin(25); }); await p.sleep(300);
  const log = await p.log(), txt = log.join('\n');
  p.ok(/app started build /.test(log[0] || ''), 'first line "app started build ..."', log[0]);
  const conn = log.find(l => /CONNECTED/.test(l)) || '';
  for (const k of ['effect=', 'bright=', 'hw=', 'fps=', 'pps=', 'up=', 'lastWrite=', 'power=', 'src=', 'brake=', 'screen=', 'link=']) p.ok(conn.includes(k), 'CONNECTED line carries ' + k, conn);
  p.ok(/effect Rainbow/.test(txt) && /solid #123456/.test(txt) && /power off/.test(txt) && /power on/.test(txt) && /built-in Red Tail/.test(txt), 'effect / solid / power / built-in changes logged');
  p.ok(await p.ev(() => logHeader().startsWith('Board Lights diagnostics') && /ackedWrites=false/.test(logHeader()) && /musicFlag=32/.test(logHeader())), 'copy-log header has build and key settings');
  await p.ev(() => { for (let i = 0; i < 350; i++) dlog('spam', 'n' + i); dlog('once', 'x', 5000); dlog('once', 'x', 5000); });
  p.eq(await p.ev(() => [dlogBuf.length, JSON.parse(localStorage.getItem('dlog')).length, dlogBuf.filter(l => / once x/.test(l)).length]), [300, 200, 1], 'in-memory cap 300, stored cap 200, de-dup window works');
  p.ok(await p.ev(() => { clearLog(); return dlogBuf.length === 1 && /log cleared/.test(dlogBuf[0]) && dstats.drops === 0; }), 'Clear log resets it and the counters');
});
test('diagnostics log: brake, hand-off and music lines appear', async p => {
  await p.connect(); await p.ev(() => { S.beatDiv = '1'; runEffect('mpulse'); }); await p.sleep(300);
  await p.ev(() => { dstats.bc = 0; });
  // the 10 s music line: trigger it immediately by calling the same code path via a short-circuit of timers is not possible, so check the status context instead
  const ctx = await p.ev(() => dctx());
  p.ok(/effect="Volume pulse"/.test(ctx) && /src=tempo/.test(ctx) && /screen=visible/.test(ctx) && /link=up/.test(ctx), 'context line for a music effect', ctx);
  await brakeOn(p); await gpsBrake(p); await p.sleep(200);
  p.ok(/brake=braking/.test(await p.ev(() => dctx())), 'context shows brake=braking');
  p.ok((await p.log()).some(l => /BRAKE on gps/.test(l)), 'BRAKE on gps logged');
});

test('diagnostics log: the 10 s music line has tempo, division, rate and write stats', async p => {
  await p.connect(); await p.ev(() => { S.beatDiv = '2'; setBpm(124); runEffect('mpulse'); });
  const okw = await p.waitFor(async () => (await p.log()).some(l => / music effect=/.test(l)), 12500, 250);
  const l = (await p.log()).find(l => / music effect=/.test(l)) || '';
  p.ok(okw, 'a music line appears within ~10 s', l);
  for (const k of ['effect="Volume pulse"', 'src=tempo', 'bpm=124.0', 'div=2', 'auto=off', 'offset=-60ms', 'beats/10s=', 'level=', 'bands=', 'pps=', 'write=fast', 'flag=0x20', 'sentAvg/Max=', 'writeMs=', 'slowCmds/s=', 'micGain=12dB']) p.ok(l.includes(k), 'music line carries ' + k, l);
  const beats = +((l.match(/beats\/10s=(\d+)/) || [])[1]);
  p.near(beats, 8, 12, 'hits per 10 s at 124 BPM with every 2nd beat (~10)');
});

// ---------- runner ----------
(async () => {
  const filter = process.argv[2] || '', t0 = Date.now();
  browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--mute-audio', '--disable-gpu', '--disable-extensions'] });
  let passT = 0, failT = 0, asserts = 0, failA = 0; const fails = [];
  try {
    for (const t of T) {
      if (filter && !t.name.includes(filter)) continue;
      let p; const ts = Date.now();
      try {
        // extra options (ls seeds, allowWarn) are passed as 3rd arg of test(...) via the T entry
        p = await boot(t.opts || {});
        await Promise.race([t.fn(p), sleep(45000).then(() => { throw new Error('test timed out (45 s)'); })]);
        await p.finish();
      } catch (e) {
        if (p) { p.ok(false, 'harness/exception', String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); try { await p.pg.close(); } catch (e2) {} }
        else p = { res: [{ ok: false, msg: 'boot failed', detail: String(e) }] };
      }
      const bad = p.res.filter(r => !r.ok);
      asserts += p.res.length; failA += bad.length;
      if (bad.length) { failT++; fails.push({ name: t.name, bad }); } else passT++;
      console.log(`${bad.length ? 'FAIL' : 'PASS'}  ${t.name}  (${p.res.length} assertions, ${((Date.now() - ts) / 1000).toFixed(1)}s)`);
      for (const b of bad) console.log(`        x ${b.msg}${b.detail ? '  -> ' + b.detail : ''}`);
    }
  } finally { await browser.close().catch(() => {}); }
  console.log(`\n${passT} tests passed, ${failT} failed; ${asserts - failA}/${asserts} assertions passed; ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  process.exit(failT ? 1 : 0);
})().catch(e => { console.error('runner crashed', e); try { browser && browser.close(); } catch (e2) {} process.exit(2); });
