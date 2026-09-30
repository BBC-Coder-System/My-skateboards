// QA fake strip. Injected as the first script in <head> of a COPY of index.html. Never touches real Bluetooth.
// window.__w / __wt  every written packet (hex) and its performance.now() time
// window.__hang=N    the next N writes never answer (write watchdog test)
// window.__throw=N   the next N writes reject
// window.__failConnect=N  the next N gatt.connect() calls fail
// window.__dl()      simulate an unexpected drop (gatt.connected=false + gattserverdisconnected)
// window.__slow=true strip digests brightness/speed slowly (like stub5.js); window.__proc has {h,sent,done}
window.__w = []; window.__wt = []; window.__err = []; window.__proc = [];
window.__hang = 0; window.__throw = 0; window.__failConnect = 0; window.__slow = false; window.__connects = 0;
window.addEventListener('error', e => __err.push(String(e.message)));
window.addEventListener('unhandledrejection', e => __err.push('unhandledrejection: ' + String(e.reason && e.reason.message || e.reason)));
let __free = 0, __listener = null;
const __cost = h => h.startsWith('7e0401') || h.startsWith('7e0702') ? 100 : h.startsWith('7e0703') ? 150 : 4;
const __c = { uuid: '0000fff3-0000-1000-8000-00805f9b34fb', properties: { writeWithoutResponse: true, write: false },
  writeValueWithoutResponse: b => {
    const now = performance.now(), h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    __w.push(h); __wt.push(now);
    if (__slow) { __free = Math.max(__free, now) + __cost(h); __proc.push({ h, sent: now, done: __free }); }
    if (__hang > 0) { __hang--; return new Promise(() => {}); }
    if (__throw > 0) { __throw--; return Promise.reject(new Error('gatt boom')); }
    return new Promise(r => setTimeout(r, 5));
  } };
const __d = { name: 'MELK-OA10   17',
  addEventListener(n, f) { if (n === 'gattserverdisconnected') __listener = f; },
  gatt: { connected: false,
    connect: async () => { if (__failConnect > 0) { __failConnect--; throw new Error('fake connect failure'); } __d.gatt.connected = true; __connects++; return { getPrimaryService: async () => ({ getCharacteristic: async () => __c }) }; },
    disconnect() { __d.gatt.connected = false; if (__listener) __listener(); } } };
window.__dev = __d;
window.__dl = () => { __d.gatt.connected = false; if (__listener) __listener(); };
Object.defineProperty(navigator, 'bluetooth', { value: { requestDevice: async () => __d } });
window.__gps = null;
Object.defineProperty(navigator, 'geolocation', { value: { watchPosition: cb => { window.__gps = cb; return 1; }, clearWatch() {} } });
window.prompt = () => null; window.confirm = () => false;
window.__hid = false;
Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hid });
