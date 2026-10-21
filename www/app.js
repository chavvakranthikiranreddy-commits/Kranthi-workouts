/* Kranthi Workouts — personal interval timer + workout calendar */
'use strict';

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
const pad = n => String(n).padStart(2, '0');

function fmt(sec) { // 35:03 or 1:05:20
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function fmtShort(sec) { // :40, 2:00
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}:${pad(s)}` : `:${pad(s)}`;
}
function fmtMins(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + 'm' : ''}`.trim();
}
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/* ---------- icons ---------- */
const I = {
  heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10.2-7.5 10.2z" fill="currentColor" stroke="none"/>',
  run: '<circle cx="14.5" cy="4.5" r="2"/><path d="M8 21l3-6 3 2.5V22M6.5 11.5l2.5-3 4-1 3 3.5 3 1M11 15l1.8-5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none"/>',
  gear: '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.5l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  more: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chevR: '<path d="M9 5l7 7-7 7"/>',
  chevL: '<path d="M15 5l-7 7 7 7"/>',
  chevU: '<path d="M5 15l7-7 7 7"/>',
  chevD: '<path d="M5 9l7 7 7-7"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  pause: '<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" fill="currentColor"/>',
  next: '<path d="M5 5l10 7-10 7z" fill="currentColor"/><path d="M18.5 5v14"/>',
  prev: '<path d="M19 5L9 12l10 7z" fill="currentColor"/><path d="M5.5 5v14"/>',
  sliders: '<path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h12M20 17h0"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="17" r="2"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/>',
  stopwatch: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.5h4M18.5 6.5l1.5-1.5"/>',
  rounds: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4h-4"/>',
  prepare: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6"/><circle cx="12" cy="16.5" r="1.2" fill="currentColor" stroke="none"/>',
  pausebars: '<path d="M7.5 4.5h3v15h-3zM13.5 4.5h3v15h-3z" fill="currentColor" stroke="none"/>',
  snow: '<path d="M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.5 4l2.5 2 2.5-2M9.5 20l2.5-2 2.5 2"/>',
  trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/>',
  edit: '<path d="M4.5 19.5l1-4.5L16 4.5l3.5 3.5L9 18.5z"/><path d="M13.5 7l3.5 3.5"/>',
  flag: '<path d="M5.5 21V4M5.5 4.5h11l-2.5 4 2.5 4h-11"/>',
  addset: '<rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke-dasharray="3 2.5"/><path d="M12 8v8M8 12h8"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor" stroke="none"/>',
  note: '<path d="M6 3.5h9l4 4v13H6z"/><path d="M15 3.5v4h4M9 12h7M9 16h5"/>',
  dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.8" r="1.2" fill="currentColor" stroke="none"/>',
};
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${I[n] || ''}</svg>`;

/* ---------- native bridge (Capacitor) ---------- */
const Cap = window.Capacitor;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const P = {};
if (isNative) {
  for (const n of ['LocalNotifications', 'Haptics', 'App', 'TextToSpeech', 'KeepAwake']) {
    try { if (Cap.isPluginAvailable(n)) P[n] = Cap.registerPlugin(n); } catch (e) { /* plugin missing */ }
  }
}

/* ---------- storage ---------- */
const DB = {
  get(k, d) { try { const v = localStorage.getItem('kw_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kw_' + k, JSON.stringify(v)); } catch (e) { toast('Could not save — storage full?'); } },
};
const DEFAULTS = { beeps: true, voice: true, countdown: true, halfway: true, vibrate: true, flash: true, keepAwake: true, background: true, weekStart: 1, notifAsked: false };
const S = Object.assign({}, DEFAULTS, DB.get('settings', {}));
const saveSettings = () => DB.set('settings', S);

const COLORS = ['#00E5FF', '#22D46A', '#FFD43B', '#FF9F1C', '#FF4057', '#B26BFF', '#FF5FC8', '#4D8DFF'];
const PHASE = { prepare: '#FFD43B', work: '#22D46A', rest: '#FF4057', cyclerest: '#FF9F1C', cooldown: '#4D8DFF', stopwatch: '#00E5FF', done: '#00E5FF' };

const iv = (name, kind, dur) => ({ id: uid(), name, kind, dur });
const mk = (o) => Object.assign({ id: uid(), name: 'New timer', desc: '', color: COLORS[0], prepare: 10, sets: [{ id: uid(), intervals: [iv('Work', 'work', 30), iv('Rest', 'rest', 30)], rounds: 8 }], cycles: 1, cycleRest: 60, cooldown: 0, noLog: false }, o);

function seedTimers() {
  return [
    mk({ name: 'Core and Rotational Power', color: '#22D46A', prepare: 10, sets: [{ id: uid(), intervals: [iv('Work', 'work', 30), iv('Rest', 'rest', 30)], rounds: 4 }], cycles: 8, cycleRest: 59 }),
    mk({ name: 'My Tabata', color: '#00E5FF', prepare: 10, sets: [{ id: uid(), intervals: [iv('Work', 'work', 20), iv('Rest', 'rest', 10)], rounds: 8 }], cycles: 1 }),
  ];
}

const TEMPLATES = [
  { group: 'HIIT & Cardio', items: [
    mk({ id: 't-tabata', name: 'Tabata', desc: 'Classic 20/10 interval timer with 8 rounds.', color: '#4D8DFF', prepare: 10, sets: [{ id: 's', intervals: [iv('Work', 'work', 20), iv('Rest', 'rest', 10)], rounds: 8 }], cycles: 1 }),
    mk({ id: 't-interval', name: 'Interval', desc: '40/20 with 10 rounds and 3 cycles.', color: '#22D46A', prepare: 10, sets: [{ id: 's', intervals: [iv('Work', 'work', 40), iv('Rest', 'rest', 20)], rounds: 10 }], cycles: 3, cycleRest: 120 }),
    mk({ id: 't-hiitb', name: 'HIIT Beginner', desc: '30/30 HIIT with 8 rounds and 2 cycles.', color: '#FFD43B', prepare: 10, sets: [{ id: 's', intervals: [iv('Work', 'work', 30), iv('Rest', 'rest', 30)], rounds: 8 }], cycles: 2, cycleRest: 120 }),
    mk({ id: 't-hiita', name: 'HIIT Advanced', desc: '45/15 HIIT with 10 rounds and 2 cycles.', color: '#FF4057', prepare: 10, sets: [{ id: 's', intervals: [iv('Work', 'work', 45), iv('Rest', 'rest', 15)], rounds: 10 }], cycles: 2, cycleRest: 120 }),
    mk({ id: 't-emom', name: 'EMOM 12', desc: 'Every minute on the minute, 12 minutes.', color: '#B26BFF', prepare: 10, sets: [{ id: 's', intervals: [iv('Minute', 'work', 60)], rounds: 12 }], cycles: 1 }),
    mk({ id: 't-fullbody', name: 'Full Body Circuit', desc: '6 named exercises, 40/20, 3 rounds.', color: '#22D46A', prepare: 10, sets: [{ id: 's', intervals: [
      iv('Jumping jacks', 'work', 40), iv('Rest', 'rest', 20), iv('Squats', 'work', 40), iv('Rest', 'rest', 20), iv('Push-ups', 'work', 40), iv('Rest', 'rest', 20),
      iv('Lunges', 'work', 40), iv('Rest', 'rest', 20), iv('Plank', 'work', 40), iv('Rest', 'rest', 20), iv('Burpees', 'work', 40), iv('Rest', 'rest', 20)], rounds: 1 }], cycles: 3, cycleRest: 90 }),
    mk({ id: 't-core', name: 'Cardio & Core', desc: 'Core blast with mountain climbers.', color: '#4D8DFF', prepare: 10, sets: [{ id: 's', intervals: [
      iv('Mountain climbers', 'work', 30), iv('Rest', 'rest', 15), iv('Russian twists', 'work', 30), iv('Rest', 'rest', 15),
      iv('Bicycle crunch', 'work', 30), iv('Rest', 'rest', 15), iv('Leg raises', 'work', 30), iv('Rest', 'rest', 15), iv('Plank', 'work', 45), iv('Rest', 'rest', 15)], rounds: 1 }], cycles: 3, cycleRest: 60 }),
  ] },
  { group: 'Strength rest timers', items: [
    mk({ id: 't-r60', name: 'Quick Rest', desc: 'A 1-minute rest between sets.', color: '#FF9F1C', prepare: 0, sets: [{ id: 's', intervals: [iv('Rest', 'rest', 60)], rounds: 1 }], cycles: 1, noLog: true }),
    mk({ id: 't-r90', name: 'Standard Rest', desc: '90 seconds between sets.', color: '#FF5FC8', prepare: 0, sets: [{ id: 's', intervals: [iv('Rest', 'rest', 90)], rounds: 1 }], cycles: 1, noLog: true }),
    mk({ id: 't-r180', name: 'Heavy Lift Rest', desc: '3 minutes for heavy compound sets.', color: '#B26BFF', prepare: 0, sets: [{ id: 's', intervals: [iv('Rest', 'rest', 180)], rounds: 1 }], cycles: 1, noLog: true }),
  ] },
];

let timers = DB.get('timers', null);
if (!Array.isArray(timers)) { timers = seedTimers(); DB.set('timers', timers); }
let log = DB.get('log', []);
const saveTimers = () => DB.set('timers', timers);
const saveLog = () => DB.set('log', log);

/* ---------- step builder ---------- */
function buildSteps(t) {
  const steps = [];
  if (t.prepare > 0) steps.push({ kind: 'prepare', label: 'Prepare', dur: t.prepare });
  const C = Math.max(1, t.cycles | 0 || 1);
  const totalSets = t.sets.length;
  for (let c = 1; c <= C; c++) {
    const cyc = [];
    t.sets.forEach((s, si) => {
      const R = Math.max(1, s.rounds | 0 || 1);
      for (let r = 1; r <= R; r++) {
        s.intervals.forEach(v => {
          if (v.dur > 0) cyc.push({ kind: v.kind, label: v.name || (v.kind === 'work' ? 'Work' : 'Rest'), dur: v.dur, set: si + 1, sets: totalSets, round: r, rounds: R, cycle: c, cycles: C });
        });
      }
    });
    // No point resting at the very end of a cycle — the cycle rest / finish follows.
    while (cyc.length > 1 && cyc[cyc.length - 1].kind === 'rest') cyc.pop();
    steps.push(...cyc);
    if (c < C && t.cycleRest > 0) steps.push({ kind: 'cyclerest', label: 'Recover', sub: 'Rest between cycles', dur: t.cycleRest, cycle: c, cycles: C });
  }
  if (t.cooldown > 0) steps.push({ kind: 'cooldown', label: 'Cooldown', dur: t.cooldown });
  return steps;
}
const totalOf = t => buildSteps(t).reduce((a, s) => a + s.dur, 0);

/* ---------- feedback: sound, voice, vibration ---------- */
const Snd = {
  ctx: null,
  unlock() {
    try {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* ignore */ }
  },
  tone(freq, dur, when = 0, vol = 0.9) {
    if (!S.beeps || !this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + dur - 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.02);
  },
  tick() { this.tone(740, 0.13); },
  go() { this.tone(1046, 0.5); },
  finish() { this.tone(784, 0.18, 0); this.tone(988, 0.18, 0.2); this.tone(1318, 0.6, 0.4); },
};
let lastSpeak = 0;
async function say(text) {
  if (!S.voice || !text) return;
  lastSpeak = Date.now();
  if (P.TextToSpeech) {
    try { await P.TextToSpeech.speak({ text, lang: 'en-US', rate: 1.05, pitch: 1.0, volume: 1.0, category: 'playback', queueStrategy: 0 }); return; } catch (e) { /* fall through */ }
  }
  try {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; u.lang = 'en-US';
      speechSynthesis.speak(u);
    }
  } catch (e) { /* ignore */ }
}
function buzz(ms = 300) {
  if (!S.vibrate) return;
  if (P.Haptics) { P.Haptics.vibrate({ duration: ms }).catch(() => {}); return; }
  try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ }
}

/* Keep screen on */
const Awake = {
  lock: null, want: false,
  async on() {
    this.want = true;
    if (!S.keepAwake) return;
    if (P.KeepAwake) { P.KeepAwake.keepAwake().catch(() => {}); return; }
    try { if ('wakeLock' in navigator && !document.hidden) this.lock = await navigator.wakeLock.request('screen'); } catch (e) { /* ignore */ }
  },
  off() {
    this.want = false;
    if (P.KeepAwake) { P.KeepAwake.allowSleep().catch(() => {}); }
    try { this.lock && this.lock.release(); } catch (e) { /* ignore */ }
    this.lock = null;
  },
};

/* ---------- background notifications (Android) ---------- */
const BG = {
  scheduled: false, exact: null,
  async init() {
    if (!P.LocalNotifications) return;
    try {
      await P.LocalNotifications.createChannel({ id: 'kw_phase', name: 'Timer phase alerts', description: 'Sound when a work/rest phase changes while the app is in the background', importance: 5, visibility: 1, vibration: true });
      await P.LocalNotifications.createChannel({ id: 'kw_status', name: 'Workout running', description: 'Shows that a timer is running', importance: 2, visibility: 1, vibration: false });
    } catch (e) { /* ignore */ }
    this.refreshExact();
  },
  async refreshExact() {
    if (!P.LocalNotifications) return;
    try { const r = await P.LocalNotifications.checkExactNotificationSetting(); this.exact = r.exact_alarm === 'granted'; } catch (e) { this.exact = null; }
  },
  async ensurePermission() {
    if (!P.LocalNotifications || !S.background) return;
    try {
      const p = await P.LocalNotifications.checkPermissions();
      if (p.display !== 'granted' && !S.notifAsked) { S.notifAsked = true; saveSettings(); await P.LocalNotifications.requestPermissions(); }
    } catch (e) { /* ignore */ }
  },
  async schedule() {
    const R = Run.cur;
    if (!P.LocalNotifications || !S.background || !R || !R.running || R.mode !== 'timer') return;
    await this.cancel();
    const e = R.elapsed(), now = Date.now();
    const idx = R.locate(e);
    const exact = this.exact !== false;
    const list = [{ id: 1, title: R.timer.name, body: 'Workout running · tap to return', channelId: 'kw_status', ongoing: true, autoCancel: false, smallIcon: 'ic_stat_kw', iconColor: '#00E5FF' }];
    let id = 100;
    for (let i = idx + 1; i < R.steps.length && list.length < 70; i++) {
      const st = R.steps[i];
      const at = now + (R.cum[i] - e);
      const bits = [fmtShort(st.dur)];
      if (st.rounds > 1) bits.push(`Round ${st.round}/${st.rounds}`);
      if (st.cycles > 1) bits.push(`Cycle ${st.cycle}/${st.cycles}`);
      list.push({ id: id++, title: st.label.toUpperCase(), body: bits.join(' · '), channelId: 'kw_phase', schedule: { at: new Date(at), allowWhileIdle: true }, isExactNotification: exact, smallIcon: 'ic_stat_kw', iconColor: PHASE[st.kind] || '#00E5FF', autoCancel: true });
    }
    list.push({ id: 99, title: 'WORKOUT COMPLETE 💪', body: `${R.timer.name} · ${fmt(R.total / 1000)}`, channelId: 'kw_phase', schedule: { at: new Date(now + (R.total - e)), allowWhileIdle: true }, isExactNotification: exact, smallIcon: 'ic_stat_kw', iconColor: '#00E5FF' });
    try { await P.LocalNotifications.schedule({ notifications: list }); this.scheduled = true; } catch (err) { console.warn('schedule failed', err); }
  },
  async cancel() {
    if (!P.LocalNotifications) return;
    try {
      const p = await P.LocalNotifications.getPending();
      if (p.notifications && p.notifications.length) await P.LocalNotifications.cancel({ notifications: p.notifications.map(n => ({ id: n.id })) });
      await P.LocalNotifications.cancel({ notifications: [{ id: 1 }] });
      await P.LocalNotifications.removeAllDeliveredNotifications();
    } catch (e) { /* ignore */ }
    this.scheduled = false;
  },
};

let appVisible = true;
function onBackground() {
  if (!appVisible) return;
  appVisible = false;
  if (Run.cur && Run.cur.running) BG.schedule();
}
function onForeground() {
  if (appVisible) return;
  appVisible = true;
  BG.cancel();
  BG.refreshExact();
  if (Run.cur) { Run.cur.resync = true; Run.tick(); if (Run.cur && Run.cur.running) Awake.on(); }
}
document.addEventListener('visibilitychange', () => (document.hidden ? onBackground() : onForeground()));
if (P.App) {
  P.App.addListener('appStateChange', s => (s.isActive ? onForeground() : onBackground()));
  P.App.addListener('backButton', () => handleBack());
}

/* ---------- UI primitives ---------- */
const layer = $('#layer');
const backStack = []; // functions that close the top-most overlay

function pushBack(fn) { backStack.push(fn); return () => { const i = backStack.lastIndexOf(fn); if (i >= 0) backStack.splice(i, 1); }; }
function handleBack() {
  if (backStack.length) { backStack[backStack.length - 1](); return; }
  if (currentTab !== 'timers') { go('timers'); return; }
  if (P.App) P.App.minimizeApp ? P.App.minimizeApp().catch(() => P.App.exitApp()) : P.App.exitApp();
}

function toast(msg) {
  const t = el(`<div class="toast">${esc(msg)}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function sheet(inner, { center = false, onClose } = {}) {
  const bd = el(`<div class="backdrop ${center ? 'center' : ''}"><div class="sheet">${center ? '' : '<div class="grab"></div>'}</div></div>`);
  const sh = $('.sheet', bd);
  if (typeof inner === 'string') sh.insertAdjacentHTML('beforeend', inner); else sh.appendChild(inner);
  let closed = false;
  const close = () => { if (closed) return; closed = true; unback(); bd.remove(); onClose && onClose(); };
  const unback = pushBack(close);
  bd.addEventListener('click', e => { if (e.target === bd) close(); });
  layer.appendChild(bd);
  return { el: sh, close };
}

function menu(title, items) {
  const s = sheet(`${title ? `<h2>${esc(title)}</h2>` : ''}<div></div>`);
  const box = s.el.lastElementChild;
  items.forEach(it => {
    const b = el(`<button class="menu-item ${it.danger ? 'danger' : ''}">${ic(it.icon)}<span>${esc(it.label)}</span></button>`);
    b.onclick = () => { s.close(); it.run(); };
    box.appendChild(b);
  });
}

function confirmBox(title, msg, buttons) {
  return new Promise(res => {
    const s = sheet(`<h2>${esc(title)}</h2>${msg ? `<p class="sub">${esc(msg)}</p>` : ''}<div class="btns"></div>`, { center: true, onClose: () => res(null) });
    const box = $('.btns', s.el);
    buttons.forEach(b => {
      const x = el(`<button class="btn ${b.cls || ''}">${esc(b.label)}</button>`);
      x.onclick = () => { res(b.value); s.close(); };
      box.appendChild(x);
    });
  });
}

function pickDuration(title, sec, cb, { allowZero = false, presets = [10, 15, 20, 30, 45, 60, 90, 120, 180] } = {}) {
  let m = Math.floor(sec / 60), s = sec % 60;
  const sh = sheet(`<h2>${esc(title)}</h2>
    <div class="picker">
      <div class="pcol"><span class="lbl">MIN</span><button class="pbtn" data-a="m+">${ic('chevU')}</button><input class="pnum" id="pm" inputmode="numeric" maxlength="3"><button class="pbtn" data-a="m-">${ic('chevD')}</button></div>
      <div class="pcolon">:</div>
      <div class="pcol"><span class="lbl">SEC</span><button class="pbtn" data-a="s+">${ic('chevU')}</button><input class="pnum" id="ps" inputmode="numeric" maxlength="2"><button class="pbtn" data-a="s-">${ic('chevD')}</button></div>
    </div>
    <div class="presets">${presets.map(p => `<button class="chip small" data-p="${p}">${fmtShort(p)}</button>`).join('')}</div>
    <div class="btns two"><button class="btn" data-a="cancel">Cancel</button><button class="btn primary" data-a="ok">Set</button></div>`);
  const pm = $('#pm', sh.el), ps = $('#ps', sh.el);
  const paint = () => { pm.value = m; ps.value = pad(s); $$('[data-p]', sh.el).forEach(b => b.classList.toggle('on', +b.dataset.p === m * 60 + s)); };
  const read = () => { m = clamp(parseInt(pm.value, 10) || 0, 0, 999); s = clamp(parseInt(ps.value, 10) || 0, 0, 59); };
  pm.onchange = () => { read(); paint(); }; ps.onchange = () => { read(); paint(); };
  pm.onfocus = () => pm.select(); ps.onfocus = () => ps.select();
  const step = a => {
    read();
    if (a === 'm+') m = Math.min(999, m + 1);
    if (a === 'm-') m = Math.max(0, m - 1);
    if (a === 's+') { s += 5; if (s >= 60) { s -= 60; m++; } }
    if (a === 's-') { if (s >= 5) s -= 5; else if (m > 0) { m--; s = 55 + s; } else s = 0; }
    paint();
  };
  sh.el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.p) { m = Math.floor(b.dataset.p / 60); s = b.dataset.p % 60; paint(); return; }
    const a = b.dataset.a;
    if (a === 'cancel') return sh.close();
    if (a === 'ok') { read(); const v = m * 60 + s; if (!allowZero && v < 1) { toast('Set at least 1 second'); return; } sh.close(); cb(v); return; }
    if (a) step(a);
  });
  paint();
}

function pickNumber(title, n, cb, { min = 1, max = 99, presets = [1, 2, 3, 4, 5, 6, 8, 10, 12] } = {}) {
  const sh = sheet(`<h2>${esc(title)}</h2>
    <div class="picker">
      <button class="pbtn" style="width:64px;height:64px" data-a="-">${ic('chevD')}</button>
      <input class="pnum" id="pn" inputmode="numeric" maxlength="3" style="width:140px">
      <button class="pbtn" style="width:64px;height:64px" data-a="+">${ic('chevU')}</button>
    </div>
    <div class="presets">${presets.map(p => `<button class="chip small" data-p="${p}">${p}</button>`).join('')}</div>
    <div class="btns two"><button class="btn" data-a="cancel">Cancel</button><button class="btn primary" data-a="ok">Set</button></div>`);
  const pn = $('#pn', sh.el);
  const paint = () => { pn.value = n; $$('[data-p]', sh.el).forEach(b => b.classList.toggle('on', +b.dataset.p === n)); };
  const read = () => { n = clamp(parseInt(pn.value, 10) || min, min, max); };
  pn.onchange = () => { read(); paint(); }; pn.onfocus = () => pn.select();
  sh.el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.p) { n = +b.dataset.p; paint(); return; }
    const a = b.dataset.a;
    if (a === 'cancel') return sh.close();
    if (a === 'ok') { read(); sh.close(); cb(n); return; }
    read(); n = clamp(n + (a === '+' ? 1 : -1), min, max); paint();
  });
  paint();
}

/* ---------- tabs / views ---------- */
let currentTab = 'timers';
const view = $('#view');
const TABS = [
  { id: 'timers', label: 'My Timers', icon: 'heart' },
  { id: 'templates', label: 'Templates', icon: 'run' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
];
function renderTabs() {
  $('#tabs').innerHTML = TABS.map(t => `<button class="tab ${t.id === currentTab ? 'active' : ''}" data-tab="${t.id}"><span class="pill">${ic(t.icon)}</span>${t.label}</button>`).join('');
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
function go(tab) { currentTab = tab; renderTabs(); render(); view.scrollTop = 0; }
function render() { ({ timers: viewTimers, templates: viewTemplates, calendar: viewCalendar, settings: viewSettings })[currentTab](); }
const topbar = (title, right = '') => `<header class="topbar"><h1>${esc(title)}</h1>${right ? `<div class="tb-right">${right}</div>` : ''}</header>`;

function timerCard(t, { menuBtn = true } = {}) {
  return `<div class="tcard" data-id="${t.id}">
    <span class="bar" style="background:${t.color}"></span>
    <button class="main" data-act="start">
      <span class="row1"><span class="dur" style="color:${t.color}">${fmt(totalOf(t))}</span><span class="name">${esc(t.name)}</span></span>
      ${t.desc ? `<span class="desc">${esc(t.desc)}</span>` : ''}
    </button>
    ${menuBtn ? `<button class="more" data-act="menu" aria-label="Options">${ic('more')}</button>` : ''}
  </div>`;
}

function viewTimers() {
  view.innerHTML = topbar('My Timers') + `<div class="page">
    <div class="sect">Quick rest</div>
    <div class="chips" id="quick">${[30, 45, 60, 90, 120, 180].map(s => `<button class="chip" data-s="${s}">${fmtShort(s)}</button>`).join('')}</div>
    <div class="sect">Timers</div>
    <div class="tcard" data-id="__sw">
      <span class="bar" style="background:${PHASE.prepare}"></span>
      <button class="main" data-act="sw"><span class="row1"><span style="color:${PHASE.prepare}">${ic('stopwatch', 'ico')}</span><span class="name">My Stopwatch</span></span></button>
    </div>
    <div id="list">${timers.map(t => timerCard(t)).join('')}</div>
    ${timers.length ? '' : `<div class="empty"><b>No timers yet</b>Tap + to build one, or grab a ready-made one from Templates.</div>`}
  </div>
  <button class="fab" id="add" aria-label="New timer">${ic('plus')}</button>`;
  $('#add').onclick = () => openEditor(null);
  $('#quick').onclick = e => {
    const b = e.target.closest('[data-s]'); if (!b) return;
    const s = +b.dataset.s;
    startTimer(mk({ id: 'quick', name: `Rest ${fmtShort(s)}`, prepare: 0, color: PHASE.cyclerest, sets: [{ id: 's', intervals: [iv('Rest', 'rest', s)], rounds: 1 }], cycles: 1, noLog: true }));
  };
  view.querySelector('.page').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const card = b.closest('.tcard'); const id = card.dataset.id;
    if (b.dataset.act === 'sw') return startStopwatch();
    const t = timers.find(x => x.id === id); if (!t) return;
    if (b.dataset.act === 'start') return startTimer(t);
    menu(t.name, [
      { icon: 'play', label: 'Start', run: () => startTimer(t) },
      { icon: 'edit', label: 'Edit', run: () => openEditor(t) },
      { icon: 'copy', label: 'Duplicate', run: () => { const c = clone(t); c.id = uid(); c.name = t.name + ' copy'; timers.splice(timers.indexOf(t) + 1, 0, c); saveTimers(); render(); } },
      { icon: 'chevU', label: 'Move up', run: () => { const i = timers.indexOf(t); if (i > 0) { timers.splice(i, 1); timers.splice(i - 1, 0, t); saveTimers(); render(); } } },
      { icon: 'trash', label: 'Delete', danger: true, run: async () => { if (await confirmBox('Delete timer?', `"${t.name}" will be removed.`, [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { timers = timers.filter(x => x !== t); saveTimers(); render(); } } },
    ]);
  });
}

function viewTemplates() {
  view.innerHTML = topbar('Templates') + `<div class="page">${TEMPLATES.map(g => `<div class="sect">${esc(g.group)}</div>${g.items.map(t => timerCard(t)).join('')}`).join('')}</div>`;
  view.querySelector('.page').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const id = b.closest('.tcard').dataset.id;
    const t = TEMPLATES.flatMap(g => g.items).find(x => x.id === id);
    if (b.dataset.act === 'start') return startTimer(t);
    const copy = () => { const c = clone(t); c.id = uid(); c.sets.forEach(s => { s.id = uid(); s.intervals.forEach(v => (v.id = uid())); }); return c; };
    menu(t.name, [
      { icon: 'play', label: 'Start', run: () => startTimer(t) },
      { icon: 'heart', label: 'Save to My Timers', run: () => { timers.push(copy()); saveTimers(); toast('Saved to My Timers'); } },
      { icon: 'edit', label: 'Customize a copy', run: () => openEditor(copy(), { isNew: true }) },
    ]);
  });
}

/* ---------- editor ---------- */
function openEditor(src, { isNew = !src } = {}) {
  const d = src ? clone(src) : mk({ name: '' });
  const scr = el(`<section class="screen">
    <header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Close">${ic('close')}</button></div>
      <h1>${isNew ? 'New Timer' : 'Edit Timer'}</h1>
      <div class="tb-right"><button class="round-btn accent" data-a="save" aria-label="Save">${ic('check')}</button></div></header>
    <div class="scroll"><div class="page" id="ed"></div></div></section>`);
  const ed = $('#ed', scr);
  let dirty = false;
  const close = async (force) => {
    if (!force && dirty) {
      const v = await confirmBox('Discard changes?', '', [{ label: 'Discard', cls: 'danger', value: 1 }, { label: 'Keep editing', cls: 'ghost', value: 0 }]);
      if (!v) return;
    }
    unback(); scr.remove();
  };
  const unback = pushBack(() => close());
  const touch = () => { dirty = true; const tot = $('#tot', ed); if (tot) tot.textContent = fmt(totalOf(d)); };

  const paint = () => {
    ed.innerHTML = `
      <div class="sect" style="margin-top:0"><span>Name</span><span class="total-pill">Total <b id="tot">${fmt(totalOf(d))}</b></span></div>
      <div class="namerow"><input class="field" id="nm" placeholder="TIMER NAME" maxlength="40" value="${esc(d.name)}"><button class="swatch" data-a="color" style="background:${d.color}" aria-label="Color"></button></div>
      <input class="field body" id="ds" placeholder="Short description…" maxlength="80" value="${esc(d.desc)}" style="margin-bottom:12px">
      <div class="block"><button class="row tap" data-a="prepare"><span class="ri" style="color:${PHASE.prepare}">${ic('prepare')}</span><span class="rt"><div class="t">Prepare</div><div class="s">Countdown before you start</div></span><span class="rv">${d.prepare ? fmtShort(d.prepare) : 'OFF'}</span>${ic('chevR', 'chev')}</button></div>
      ${d.sets.map((s, si) => `
        <div class="sethead"><span>SET ${si + 1}</span><button data-a="setmenu" data-si="${si}" aria-label="Set options">${ic('more')}</button></div>
        <div class="block">
          ${s.intervals.map((v, vi) => `<div class="ivrow">
            <button class="dot" data-a="kind" data-si="${si}" data-vi="${vi}" style="color:${PHASE[v.kind]}" aria-label="Toggle work/rest"></button>
            <input class="ivname" data-si="${si}" data-vi="${vi}" value="${esc(v.name)}" maxlength="30" placeholder="${v.kind === 'work' ? 'WORK' : 'REST'}">
            <button class="ivdur" data-a="dur" data-si="${si}" data-vi="${vi}">${fmtShort(v.dur)}</button>
            ${s.intervals.length > 1 ? `<button class="ivdel" data-a="delv" data-si="${si}" data-vi="${vi}" aria-label="Remove">${ic('close')}</button>` : '<span style="width:34px"></span>'}
          </div>`).join('')}
          <button class="addlink" data-a="addv" data-si="${si}">${ic('plus')}<span>Add interval to set</span></button>
          <button class="row tap" data-a="rounds" data-si="${si}" style="border-top:1px solid var(--line)"><span class="ri" style="color:var(--accent)">${ic('rounds')}</span><span class="rt"><div class="t">Rounds</div><div class="s">One round is all intervals in this set</div></span><span class="rv">${s.rounds}</span>${ic('chevR', 'chev')}</button>
        </div>`).join('')}
      <button class="addlink dashed" data-a="addset">${ic('addset')}<span>Add set</span></button>
      <div class="block">
        <button class="row tap" data-a="cycles"><span class="ri" style="color:${PHASE.cyclerest}">${ic('rounds')}</span><span class="rt"><div class="t">Cycles</div><div class="s">Number of repetitions of all sets</div></span><span class="rv">${d.cycles}</span>${ic('chevR', 'chev')}</button>
        ${d.cycles > 1 ? `<button class="row tap" data-a="cyclerest"><span class="ri" style="color:${PHASE.cyclerest}">${ic('pausebars')}</span><span class="rt"><div class="t">Rest between cycles</div><div class="s">Recovery interval</div></span><span class="rv">${d.cycleRest ? fmtShort(d.cycleRest) : 'OFF'}</span>${ic('chevR', 'chev')}</button>` : ''}
      </div>
      ${d.cooldown ? `<div class="block"><button class="row tap" data-a="cooldown"><span class="ri" style="color:${PHASE.cooldown}">${ic('snow')}</span><span class="rt"><div class="t">Cooldown</div><div class="s">Cooldown at the end</div></span><span class="rv">${fmtShort(d.cooldown)}</span>${ic('chevR', 'chev')}</button></div>`
        : `<button class="addlink dashed" data-a="cooldown" style="justify-content:space-between"><span style="display:flex;gap:10px;align-items:center"><span style="color:${PHASE.cooldown}">${ic('snow')}</span>Cooldown</span>${ic('plus')}</button>`}
      <div class="block"><button class="set-row" data-a="nolog"><span class="st"><div class="t">Log to calendar</div><div class="s">Record this timer in your workout calendar when it finishes</div></span><span class="toggle ${d.noLog ? '' : 'on'}"></span></button></div>
    `;
  };

  scr.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'nm') { d.name = t.value; dirty = true; }
    else if (t.id === 'ds') { d.desc = t.value; dirty = true; }
    else if (t.classList.contains('ivname')) { d.sets[t.dataset.si].intervals[t.dataset.vi].name = t.value; dirty = true; }
  });
  scr.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a, si = +b.dataset.si, vi = +b.dataset.vi;
    const set = d.sets[si];
    const upd = () => { touch(); paint(); };
    switch (a) {
      case 'close': return close();
      case 'save': {
        d.name = (d.name || '').trim() || 'My Timer';
        d.sets.forEach(s => s.intervals.forEach(v => { v.name = (v.name || '').trim() || (v.kind === 'work' ? 'Work' : 'Rest'); }));
        if (totalOf(d) < 1) { toast('Add at least one interval'); return; }
        const i = timers.findIndex(x => x.id === d.id);
        if (i >= 0) timers[i] = d; else timers.unshift(d);
        saveTimers(); close(true); if (currentTab !== 'timers') go('timers'); else render(); toast('Timer saved');
        return;
      }
      case 'color': {
        const s = sheet(`<h2>Color</h2><div class="colors">${COLORS.map(c => `<button data-c="${c}" class="${c === d.color ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div>`);
        s.el.addEventListener('click', ev => { const c = ev.target.closest('[data-c]'); if (c) { d.color = c.dataset.c; s.close(); upd(); } });
        return;
      }
      case 'prepare': return pickDuration('Prepare', d.prepare, v => { d.prepare = v; upd(); }, { allowZero: true, presets: [0, 5, 10, 15, 20, 30] });
      case 'dur': return pickDuration(set.intervals[vi].name || 'Interval', set.intervals[vi].dur, v => { set.intervals[vi].dur = v; upd(); });
      case 'kind': { const v = set.intervals[vi]; const wasDefault = !v.name || v.name === 'Work' || v.name === 'Rest'; v.kind = v.kind === 'work' ? 'rest' : 'work'; if (wasDefault) v.name = v.kind === 'work' ? 'Work' : 'Rest'; return upd(); }
      case 'delv': set.intervals.splice(vi, 1); return upd();
      case 'addv': { const last = set.intervals[set.intervals.length - 1]; const k = last && last.kind === 'work' ? 'rest' : 'work'; set.intervals.push(iv(k === 'work' ? 'Work' : 'Rest', k, k === 'work' ? 30 : 15)); return upd(); }
      case 'rounds': return pickNumber('Rounds', set.rounds, v => { set.rounds = v; upd(); });
      case 'addset': d.sets.push({ id: uid(), intervals: [iv('Work', 'work', 30), iv('Rest', 'rest', 30)], rounds: 3 }); upd(); setTimeout(() => { const sc = $('.scroll', scr); sc.scrollTop = sc.scrollHeight; }, 30); return;
      case 'setmenu': return menu(`Set ${si + 1}`, [
        { icon: 'copy', label: 'Duplicate set', run: () => { const c = clone(set); c.id = uid(); c.intervals.forEach(v => (v.id = uid())); d.sets.splice(si + 1, 0, c); upd(); } },
        ...(si > 0 ? [{ icon: 'chevU', label: 'Move up', run: () => { d.sets.splice(si, 1); d.sets.splice(si - 1, 0, set); upd(); } }] : []),
        ...(d.sets.length > 1 ? [{ icon: 'trash', label: 'Delete set', danger: true, run: () => { d.sets.splice(si, 1); upd(); } }] : []),
      ]);
      case 'cycles': return pickNumber('Cycles', d.cycles, v => { d.cycles = v; upd(); });
      case 'cyclerest': return pickDuration('Rest between cycles', d.cycleRest, v => { d.cycleRest = v; upd(); }, { allowZero: true, presets: [0, 30, 45, 60, 90, 120, 180] });
      case 'cooldown': return pickDuration('Cooldown', d.cooldown || 120, v => { d.cooldown = v; upd(); }, { allowZero: true, presets: [0, 60, 120, 180, 300] });
      case 'nolog': d.noLog = !d.noLog; return upd();
    }
  });
  paint();
  layer.appendChild(scr);
  if (isNew && !src) setTimeout(() => $('#nm', scr).focus(), 250);
}

/* ---------- run engine ---------- */
const Run = {
  cur: null, timerId: null,
  tick() {
    const R = Run.cur; if (!R) return;
    if (R.mode === 'sw') return renderSW();
    const e = R.elapsed();
    if (e >= R.total) return finishRun();
    const idx = R.locate(e);
    const quiet = R.resync || !appVisible;
    if (idx !== R.idx) { R.idx = idx; R.lastSec = null; R.halfDone = false; onPhase(idx, !quiet); }
    R.resync = false;
    const st = R.steps[idx];
    const rem = R.cum[idx + 1] - e;
    const sec = Math.ceil(rem / 1000);
    if (sec !== R.lastSec) {
      if (R.lastSec !== null && R.running && !quiet) {
        if (S.countdown && sec <= 3 && sec >= 1 && st.dur >= 5) Snd.tick();
        if (S.halfway && st.kind === 'work' && st.dur >= 20 && !R.halfDone && sec === Math.ceil(st.dur / 2) && Date.now() - lastSpeak > 1500) { R.halfDone = true; say('Halfway'); }
      }
      R.lastSec = sec;
    }
    paintRun(e, idx, rem);
  },
};

function makeRun(timer, mode) {
  const steps = mode === 'timer' ? buildSteps(timer) : [];
  const cum = [0]; steps.forEach(s => cum.push(cum[cum.length - 1] + s.dur * 1000));
  const R = {
    mode, timer, steps, cum, total: cum[cum.length - 1], base: 0, since: 0, running: false, idx: -1, lastSec: null, laps: [], wallStart: Date.now(), resync: false,
    elapsed() { return this.base + (this.running ? Date.now() - this.since : 0); },
    locate(e) { let i = 0; while (i < this.steps.length - 1 && e >= this.cum[i + 1]) i++; return i; },
    seek(ms) { this.base = clamp(ms, 0, this.total || ms); if (this.running) this.since = Date.now(); this.idx = -1; this.resync = !this.running; },
  };
  return R;
}

function startTimer(t) {
  if (totalOf(t) < 1) { toast('This timer has no intervals'); return; }
  openRun(makeRun(clone(t), 'timer'));
}
function startStopwatch() { openRun(makeRun({ id: '__sw', name: 'My Stopwatch', color: PHASE.stopwatch }, 'sw')); }

let runEl = null, unbackRun = null;
function openRun(R) {
  closeRunUI();
  Run.cur = R;
  const sw = R.mode === 'sw';
  runEl = el(`<section class="run">
    <div class="run-top">
      <button class="run-close" data-a="x" aria-label="Close">${ic('close')}</button>
      <div class="run-meta"><div class="tot" id="rtot"></div><div class="nm">${esc(R.timer.name)}</div></div>
    </div>
    <div class="run-main" id="rmain">
      <div class="run-flash" id="rflash"></div>
      <div class="run-tools">
        ${sw ? `<button data-a="swreset">${ic('reset')}<span>RESET</span></button>` : `<button data-a="edit">${ic('sliders')}<span>EDIT TIMER</span></button>`}
        <button data-a="sound"><span>${S.beeps || S.voice ? 'SOUND ON' : 'MUTED'}</span>${ic(S.beeps || S.voice ? 'sound' : 'mute')}</button>
      </div>
      <div class="run-center">
        <div class="run-label" id="rlabel"></div>
        <div class="run-sub" id="rsub"></div>
        <div class="run-digits" id="rdig">00:00</div>
        ${sw ? '<div class="laps" id="rlaps"></div>' : '<div class="run-prog"><i id="rprog"></i></div>'}
      </div>
      <div class="run-foot">
        ${sw ? '<span></span>' : `<button data-a="prev">${ic('prev')}</button><button data-a="inspect"><span>INSPECT INTERVALS</span>${ic('list')}</button><button data-a="next">${ic('next')}</button>`}
      </div>
    </div>
    <div class="run-next" id="rnext"><span class="k" id="rnk">UP NEXT</span><span class="v" id="rnv"></span></div>
    <div class="run-bottom">
      <div class="run-stat"><div class="k" id="rlk">${sw ? 'LAPS' : 'ROUNDS LEFT'}</div><div class="v" id="rl" style="color:var(--accent)">0</div></div>
      <button class="run-play" data-a="play" id="rplay" aria-label="Play">${ic('play')}</button>
      <div class="run-stat"><div class="k" id="rck">${sw ? 'LAP' : 'CYCLES LEFT'}</div><div class="v" id="rc" style="color:${PHASE.cyclerest}">0</div></div>
    </div>
  </section>`);
  if (sw) { $('#rnk', runEl).textContent = 'TAP'; $('#rnv', runEl).textContent = 'LAP'; $('#rnext', runEl).style.cursor = 'pointer'; $('#rnext', runEl).dataset.a = 'lap'; }
  runEl.addEventListener('click', onRunClick);
  layer.appendChild(runEl);
  unbackRun = pushBack(() => askClose());
  Run.timerId = setInterval(Run.tick, 100);
  if (!sw) { R.idx = -1; Run.tick(); } else renderSW();
  BG.ensurePermission();
}

function closeRunUI() {
  clearInterval(Run.timerId); Run.timerId = null;
  if (runEl) { runEl.remove(); runEl = null; }
  if (unbackRun) { unbackRun(); unbackRun = null; }
  Awake.off(); BG.cancel();
  Run.cur = null;
}

function setPlayIcon(running) { const b = $('#rplay', runEl); if (b) { b.innerHTML = ic(running ? 'pause' : 'play'); b.setAttribute('aria-label', running ? 'Pause' : 'Play'); } }

function togglePlay() {
  const R = Run.cur; if (!R) return;
  Snd.unlock();
  if (R.running) { R.base = R.elapsed(); R.running = false; Awake.off(); }
  else {
    R.since = Date.now(); R.running = true; Awake.on();
    if (R.mode === 'timer' && R.base === 0) onPhase(R.locate(0), true); // announce first phase
  }
  setPlayIcon(R.running);
  Run.tick();
}

async function askClose() {
  const R = Run.cur; if (!R) return;
  const e = R.elapsed();
  const loggable = !R.timer.noLog && e >= 60000;
  if (!loggable) { if (e > 3000 && R.running) { const ok = await confirmBox('Stop timer?', '', [{ label: 'Stop', cls: 'danger', value: 1 }, { label: 'Keep going', cls: 'ghost', value: 0 }]); if (!ok) return; } closeRunUI(); return; }
  const wasRunning = R.running;
  const v = await confirmBox('End workout?', `You've done ${fmt(e / 1000)}. Save it to your calendar?`, [
    { label: 'Save & end', cls: 'primary', value: 'save' }, { label: 'End without saving', cls: 'danger', value: 'discard' }, { label: 'Keep going', cls: 'ghost', value: 'keep' }]);
  if (v === 'save') { const entry = logRun(R, e, R.mode === 'timer'); showFinish(R, entry, e); }
  else if (v === 'discard') closeRunUI();
  else if (wasRunning && !R.running) togglePlay();
}

function onRunClick(ev) {
  const b = ev.target.closest('[data-a]'); if (!b) return;
  const R = Run.cur; if (!R) return;
  switch (b.dataset.a) {
    case 'x': return askClose();
    case 'play': return togglePlay();
    case 'next': { const i = R.locate(R.elapsed()); if (i < R.steps.length - 1) { R.seek(R.cum[i + 1]); Run.tick(); } return; }
    case 'prev': { const e = R.elapsed(); const i = R.locate(e); R.seek(e - R.cum[i] > 2500 || i === 0 ? R.cum[i] : R.cum[i - 1]); Run.tick(); return; }
    case 'inspect': return inspectSteps();
    case 'edit': {
      const src = timers.find(t => t.id === R.timer.id);
      if (!src) { toast('Save this timer to My Timers to edit it'); return; }
      closeRunUI(); openEditor(src); return;
    }
    case 'sound': {
      const on = !(S.beeps || S.voice);
      S.beeps = on; S.voice = on; saveSettings();
      b.innerHTML = `<span>${on ? 'SOUND ON' : 'MUTED'}</span>${ic(on ? 'sound' : 'mute')}`; return;
    }
    case 'lap': if (R.running) { R.laps.unshift(R.elapsed()); buzz(60); renderSW(); } return;
    case 'swreset': if (!R.running) { R.base = 0; R.laps = []; renderSW(); } else toast('Pause first to reset'); return;
  }
}

function inspectSteps() {
  const R = Run.cur;
  const e = R.elapsed(), cur = R.locate(e);
  const s = sheet(`<h2>Intervals</h2><p class="sub">${R.steps.length} intervals · ${fmt(R.total / 1000)} · tap to jump</p><div class="steps-list">${R.steps.map((st, i) => `
    <button class="srow ${i === cur ? 'cur' : i < cur ? 'done' : ''}" data-i="${i}"><span class="sw" style="background:${PHASE[st.kind]}"></span>
      <span style="flex:1;min-width:0"><div class="sn">${esc(st.label)}</div><div class="sm">${[st.sets > 1 ? `Set ${st.set}` : '', st.rounds > 1 ? `Round ${st.round}/${st.rounds}` : '', st.cycles > 1 && st.kind !== 'prepare' && st.kind !== 'cooldown' ? `Cycle ${st.cycle}/${st.cycles}` : ''].filter(Boolean).join(' · ')}</div></span>
      <span class="sd">${fmtShort(st.dur)}</span></button>`).join('')}</div>`);
  s.el.addEventListener('click', ev => { const r = ev.target.closest('[data-i]'); if (!r) return; R.seek(R.cum[+r.dataset.i]); s.close(); Run.tick(); });
  setTimeout(() => { const c = $('.srow.cur', s.el); c && c.scrollIntoView({ block: 'center' }); }, 50);
}

function onPhase(idx, cue) {
  const R = Run.cur, st = R.steps[idx];
  if (!cue || !R.running) return;
  Snd.go();
  buzz(st.kind === 'work' ? 450 : 250);
  if (S.flash) { const f = $('#rflash', runEl); if (f) { f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); } }
  let words = st.label;
  const lastWork = st.kind === 'work' && !R.steps.slice(idx + 1).some(x => x.kind === 'work');
  if (lastWork && R.steps.filter(x => x.kind === 'work').length > 2) words += '. Last one!';
  else if (st.kind === 'cyclerest') words = `Recover. ${st.cycles - st.cycle} ${st.cycles - st.cycle === 1 ? 'cycle' : 'cycles'} to go`;
  else if (st.kind === 'prepare') words = 'Get ready';
  say(words);
}

function paintRun(e, idx, rem) {
  if (!runEl) return;
  const R = Run.cur, st = R.steps[idx], nx = R.steps[idx + 1];
  const main = $('#rmain', runEl);
  const col = PHASE[st.kind];
  if (main.dataset.k !== st.kind) { main.style.background = col; main.dataset.k = st.kind; }
  $('#rlabel', runEl).textContent = st.label.toUpperCase();
  const sub = [];
  if (st.kind === 'cyclerest') sub.push(st.sub);
  else if (st.kind === 'work' || st.kind === 'rest') { if (st.sets > 1) sub.push(`Set ${st.set} of ${st.sets}`); if (st.rounds > 1) sub.push(`Round ${st.round} of ${st.rounds}`); }
  $('#rsub', runEl).textContent = sub.join(' · ');
  const txt = fmt(Math.ceil(rem / 1000));
  const dig = $('#rdig', runEl);
  if (dig.textContent !== txt) { dig.textContent = txt; dig.classList.toggle('long', txt.length > 5); }
  $('#rprog', runEl).style.width = (100 * (1 - rem / (st.dur * 1000))).toFixed(2) + '%';
  $('#rtot', runEl).textContent = fmt(Math.ceil((R.total - e) / 1000));
  const next = $('#rnext', runEl);
  if (nx) { next.style.background = PHASE[nx.kind]; $('#rnk', runEl).textContent = 'UP NEXT'; $('#rnv', runEl).textContent = nx.label.toUpperCase(); }
  else { next.style.background = PHASE.done; $('#rnk', runEl).textContent = 'UP NEXT'; $('#rnv', runEl).textContent = 'FINISH'; }
  // rounds/cycles left (counting the current one)
  const ref = st.rounds ? st : (nx && nx.rounds ? nx : null);
  $('#rl', runEl).textContent = ref ? ref.rounds - ref.round + 1 : 0;
  const cref = st.cycles ? st : nx;
  let cyclesLeft = 0;
  if (cref) cyclesLeft = st.kind === 'cyclerest' ? st.cycles - st.cycle : cref.cycles - cref.cycle + 1;
  $('#rc', runEl).textContent = cyclesLeft;
  setPlayIcon(R.running);
}

function renderSW() {
  const R = Run.cur; if (!runEl || !R) return;
  const e = R.elapsed();
  const main = $('#rmain', runEl);
  const k = R.running ? 'stopwatch' : 'prepare';
  if (main.dataset.k !== k) { main.style.background = PHASE[k]; main.dataset.k = k; }
  $('#rlabel', runEl).textContent = R.running ? 'STOPWATCH' : (e ? 'PAUSED' : 'READY');
  const s = Math.floor(e / 1000), tenths = Math.floor(e % 1000 / 100);
  const dig = $('#rdig', runEl);
  const txt = `${fmt(s)}<span class="ms">.${tenths}</span>`;
  if (dig.innerHTML !== txt) { dig.innerHTML = txt; dig.classList.toggle('long', fmt(s).length > 5); }
  $('#rtot', runEl).textContent = fmt(s);
  $('#rl', runEl).textContent = R.laps.length;
  const lastLap = R.laps.length ? e - R.laps[0] : e;
  $('#rc', runEl).textContent = fmt(lastLap / 1000);
  $('#rc', runEl).style.fontSize = '40px';
  const lapsEl = $('#rlaps', runEl);
  const html = R.laps.map((t, i) => { const prev = R.laps[i + 1] || 0; return `<div class="lap"><span>LAP ${R.laps.length - i}</span><span>+${fmt((t - prev) / 1000)}</span><span>${fmt(t / 1000)}</span></div>`; }).join('');
  if (lapsEl.dataset.n !== String(R.laps.length)) { lapsEl.innerHTML = html; lapsEl.dataset.n = R.laps.length; }
  $('#rnext', runEl).style.background = PHASE.work;
  setPlayIcon(R.running);
}

function finishRun() {
  const R = Run.cur; if (!R || R.finished) return;
  R.finished = true; R.running = false;
  clearInterval(Run.timerId); Run.timerId = null;
  Awake.off(); BG.cancel();
  if (appVisible) { Snd.finish(); buzz(700); say('Workout complete. Great job!'); }
  const entry = R.timer.noLog ? null : logRun(R, R.total, true);
  showFinish(R, entry, R.total);
}

function logRun(R, ms, complete) {
  const now = new Date();
  const entry = { id: uid(), date: dkey(now), at: now.getTime(), title: R.timer.name, kind: R.mode === 'sw' ? 'stopwatch' : 'timer', dur: Math.round(ms / 1000), planned: R.mode === 'timer' ? Math.round(R.total / 1000) : null, partial: R.mode === 'timer' && !(complete && ms >= R.total), notes: '', feel: 0, color: R.timer.color, auto: true };
  if (R.mode === 'sw' && R.laps.length) entry.notes = `${R.laps.length} laps`;
  log.push(entry); saveLog();
  return entry;
}

function showFinish(R, entry, ms) {
  clearInterval(Run.timerId); Run.timerId = null;
  if (R) { R.running = false; R.finished = true; }
  Awake.off(); BG.cancel();
  if (!runEl) return;
  const f = el(`<div class="finish"><div class="inner">
    <div class="big">${entry ? (entry.partial ? 'WORKOUT SAVED' : 'WORKOUT COMPLETE') : 'TIME’S UP'}</div>
    <div class="tt">${esc(R.timer.name)}</div>
    <div class="meta">${fmt(ms / 1000)}${entry ? ` · added to ${new Date().toLocaleDateString(undefined, { weekday: 'long' })} in your calendar` : ''}</div>
    ${entry ? `<div class="sect" style="justify-content:center">How did it feel?</div>
      <div class="feel">${FEEL.map((f, i) => `<button data-f="${i + 1}" aria-label="${f.t}">${f.e}</button>`).join('')}</div>
      <textarea class="field body" id="fnote" placeholder="Notes (optional) — weights, PRs, how you felt…">${esc(entry.notes)}</textarea>` : ''}
    <div class="btns">${entry ? '' : `<button class="btn" data-a="again">Again</button>`}<button class="btn primary" data-a="done">Done</button></div>
  </div></div>`);
  f.addEventListener('click', e => {
    const fb = e.target.closest('[data-f]');
    if (fb && entry) { entry.feel = +fb.dataset.f; $$('[data-f]', f).forEach(x => x.classList.toggle('on', x === fb)); saveLog(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'again') { const t = R.timer; closeRunUI(); startTimer(t); return; }
    if (entry) { entry.notes = $('#fnote', f).value.trim(); saveLog(); }
    closeRunUI(); if (currentTab === 'calendar') render();
  });
  f.addEventListener('click', e => e.stopPropagation());
  runEl.appendChild(f);
}

/* ---------- calendar ---------- */
const FEEL = [{ e: '😫', t: 'Rough' }, { e: '😕', t: 'Meh' }, { e: '😐', t: 'OK' }, { e: '🙂', t: 'Good' }, { e: '💪', t: 'Strong' }];
const CATS = ['Strength', 'HIIT', 'Cardio', 'Running', 'Yoga', 'Sports', 'Mobility', 'Other'];
let calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let calSel = dkey(new Date());

function computeStats() {
  const days = new Set(log.map(x => x.date));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // current streak: consecutive days ending today (or yesterday if today not done yet)
  let cur = 0; let d = new Date(today);
  if (!days.has(dkey(d))) d = addDays(d, -1);
  while (days.has(dkey(d))) { cur++; d = addDays(d, -1); }
  // best streak
  let best = 0, run = 0, prev = null;
  [...days].sort().forEach(k => { const dt = parseKey(k); run = prev && Math.round((dt - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = dt; });
  const ws = S.weekStart; const offset = (today.getDay() - ws + 7) % 7;
  const weekStart = addDays(today, -offset);
  const inRange = (from, to) => log.filter(x => { const dt = parseKey(x.date); return dt >= from && dt < to; });
  const wk = inRange(weekStart, addDays(weekStart, 7));
  const mStart = new Date(today.getFullYear(), today.getMonth(), 1), mEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const mo = inRange(mStart, mEnd);
  const sum = a => a.reduce((s, x) => s + (x.dur || 0), 0);
  const bars = []; for (let i = 0; i < 7; i++) { const dt = addDays(weekStart, i); const k = dkey(dt); bars.push({ k, label: WD[dt.getDay()][0], mins: Math.round(sum(log.filter(x => x.date === k)) / 60), today: k === dkey(today), future: dt > today }); }
  return { cur, best, wkCount: new Set(wk.map(x => x.date)).size, wkSessions: wk.length, wkMin: sum(wk), moCount: mo.length, moDays: new Set(mo.map(x => x.date)).size, moMin: sum(mo), bars, doneToday: days.has(dkey(today)) };
}

function viewCalendar() {
  const st = computeStats();
  const maxBar = Math.max(30, ...st.bars.map(b => b.mins));
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1);
  const lead = (first.getDay() - S.weekStart + 7) % 7;
  const start = addDays(first, -lead);
  const byDay = {}; log.forEach(x => { (byDay[x.date] = byDay[x.date] || []).push(x); });
  const todayK = dkey(new Date());
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const dt = addDays(start, i); const k = dkey(dt); const n = (byDay[k] || []).length;
    if (i >= 35 && dt.getMonth() !== m) break;
    cells.push(`<button class="d ${dt.getMonth() !== m ? 'out' : ''} ${k === todayK ? 'today' : ''} ${n ? 'has' : ''} ${k === calSel ? 'sel' : ''}" data-k="${k}">${dt.getDate()}<span class="dots">${'<i></i>'.repeat(Math.min(n, 3))}</span></button>`);
  }
  const dayEntries = (byDay[calSel] || []).slice().sort((a, b) => a.at - b.at);
  const selDate = parseKey(calSel);
  const selLabel = calSel === todayK ? 'Today' : selDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });

  view.innerHTML = topbar('Calendar') + `<div class="page">
    <div class="stats">
      <div class="stat hero"><span class="flame">🔥</span><div><div class="k">Current streak</div><div class="v">${st.cur}<small>${st.cur === 1 ? 'day' : 'days'}</small></div><div class="s">${st.doneToday ? 'Today is done. Keep it going tomorrow!' : st.cur ? 'Work out today to keep your streak alive.' : 'Finish a workout today to start a streak.'}</div></div></div>
      <div class="stat"><div class="k">This week</div><div class="v">${st.wkCount}<small>days</small></div><div class="s">${st.wkSessions} sessions · ${fmtMins(st.wkMin)}</div></div>
      <div class="stat"><div class="k">This month</div><div class="v">${st.moDays}<small>days</small></div><div class="s">${st.moCount} sessions · ${fmtMins(st.moMin)}</div></div>
      <div class="stat" style="grid-column:span 2;padding:14px 0 12px"><div class="k" style="padding:0 16px">Minutes this week</div>
        <div class="bars">${st.bars.map(b => `<div class="b"><em>${b.mins || ''}</em><i class="${b.mins ? 'on' : ''}" style="height:${Math.max(4, b.mins / maxBar * 70)}px"></i><span style="${b.today ? 'color:var(--accent)' : ''}">${b.label}</span></div>`).join('')}</div>
        <div class="s" style="padding:6px 16px 0">Best streak: <b style="color:var(--text)">${st.best} ${st.best === 1 ? 'day' : 'days'}</b></div></div>
    </div>
    <div class="sect">Workout calendar</div>
    <div class="cal">
      <div class="cal-head"><button data-a="pm" aria-label="Previous month">${ic('chevL')}</button><span class="m">${MONTHS[m]} ${y}</span><button data-a="nm" aria-label="Next month">${ic('chevR')}</button></div>
      <div class="cal-grid">${[0, 1, 2, 3, 4, 5, 6].map(i => `<div class="wd">${WD[(i + S.weekStart) % 7]}</div>`).join('')}${cells.join('')}</div>
    </div>
    <div class="sect"><span>${esc(selLabel)}</span><span style="text-transform:none;letter-spacing:0">${dayEntries.length ? `${dayEntries.length} · ${fmtMins(dayEntries.reduce((s, x) => s + x.dur, 0))}` : ''}</span></div>
    <div id="entries">${dayEntries.map(entryCard).join('') || `<div class="empty" style="padding:16px 20px 20px">No workouts on this day.</div>`}</div>
    <button class="addday" data-a="add">${ic('plus')}Add workout for ${calSel === todayK ? 'today' : esc(selDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))}</button>
  </div>`;
  view.querySelector('.page').addEventListener('click', e => {
    const b = e.target.closest('[data-a],[data-k],[data-eid]'); if (!b) return;
    if (b.dataset.k) { calSel = b.dataset.k; const dt = parseKey(calSel); if (dt.getMonth() !== m) calMonth = new Date(dt.getFullYear(), dt.getMonth(), 1); return viewCalendarKeepScroll(); }
    if (b.dataset.eid) return openEntry(log.find(x => x.id === b.dataset.eid));
    if (b.dataset.a === 'pm') { calMonth = new Date(y, m - 1, 1); return viewCalendarKeepScroll(); }
    if (b.dataset.a === 'nm') { calMonth = new Date(y, m + 1, 1); return viewCalendarKeepScroll(); }
    if (b.dataset.a === 'add') return openEntry(null);
  });
}
function viewCalendarKeepScroll() { const t = view.scrollTop; viewCalendar(); view.scrollTop = t; }

function entryCard(x) {
  const icon = x.kind === 'stopwatch' ? 'stopwatch' : x.kind === 'timer' ? 'bolt' : 'dumbbell';
  const time = new Date(x.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const meta = [x.kind === 'timer' || x.kind === 'stopwatch' ? fmt(x.dur) : fmtMins(x.dur), x.cat || (x.kind === 'stopwatch' ? 'Stopwatch' : 'Timer'), x.partial ? 'Stopped early' : '', x.auto ? time : ''].filter(Boolean).join(' · ');
  return `<button class="entry" data-eid="${x.id}"><span class="ei" style="color:${x.color || 'var(--accent)'}">${ic(icon)}</span>
    <span class="eb"><div class="et">${esc(x.title)}</div><div class="em">${esc(meta)}</div>${x.notes ? `<div class="en">${esc(x.notes)}</div>` : ''}</span>
    ${x.feel ? `<span class="ef">${FEEL[x.feel - 1].e}</span>` : ''}</button>`;
}

function openEntry(x) {
  const isNew = !x;
  const d = x ? clone(x) : { id: uid(), date: calSel, at: Date.now(), title: '', kind: 'manual', cat: 'Strength', dur: 45 * 60, notes: '', feel: 0, color: '#00E5FF', auto: false };
  const s = sheet(`<h2>${isNew ? 'Add workout' : (d.auto ? 'Workout' : 'Edit workout')}</h2>
    <p class="sub">${parseKey(d.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    ${d.auto ? `<div class="field" style="margin-bottom:12px">${esc(d.title)}</div>` : `<input class="field" id="et" placeholder="WHAT DID YOU DO?" maxlength="40" value="${esc(d.title)}" style="margin-bottom:12px">
    <div class="chips" id="ecat" style="flex-wrap:wrap;margin-bottom:12px">${CATS.map(c => `<button class="chip small ${c === d.cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
    <div class="block"><button class="row tap" data-a="dur"><span class="ri" style="color:var(--accent)">${ic('stopwatch')}</span><span class="rt"><div class="t">Duration</div></span><span class="rv" id="edur" style="font-size:36px">${fmtMins(d.dur)}</span>${ic('chevR', 'chev')}</button></div>`}
    <div class="sect" style="justify-content:center;margin-top:8px">How did it feel?</div>
    <div class="feel" id="efeel">${FEEL.map((f, i) => `<button data-f="${i + 1}" class="${d.feel === i + 1 ? 'on' : ''}" aria-label="${f.t}">${f.e}</button>`).join('')}</div>
    <textarea class="field body" id="en" placeholder="Notes — exercises, weights, reps, PRs…">${esc(d.notes)}</textarea>
    <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="save">Save</button></div>`);
  s.el.addEventListener('click', async e => {
    const c = e.target.closest('[data-c]');
    if (c) { d.cat = c.dataset.c; $$('[data-c]', s.el).forEach(b => b.classList.toggle('on', b === c)); return; }
    const f = e.target.closest('[data-f]');
    if (f) { d.feel = d.feel === +f.dataset.f ? 0 : +f.dataset.f; $$('[data-f]', s.el).forEach(b => b.classList.toggle('on', +b.dataset.f === d.feel)); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'dur') return pickDuration('Duration', d.dur, v => { d.dur = v; $('#edur', s.el).textContent = fmtMins(v); }, { presets: [900, 1200, 1800, 2700, 3600, 5400] });
    if (b.dataset.a === 'del') {
      const ok = await confirmBox('Delete this workout?', '', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }]);
      if (ok) { log = log.filter(y => y.id !== d.id); saveLog(); s.close(); viewCalendarKeepScroll(); }
      return;
    }
    if (b.dataset.a === 'save') {
      if (!d.auto) { d.title = ($('#et', s.el).value || '').trim() || d.cat; }
      d.notes = $('#en', s.el).value.trim();
      if (isNew) {
        const now = new Date(); const base = parseKey(d.date); base.setHours(now.getHours(), now.getMinutes()); d.at = base.getTime();
        log.push(d);
      } else { const i = log.findIndex(y => y.id === d.id); if (i >= 0) log[i] = d; }
      saveLog(); s.close(); viewCalendarKeepScroll();
    }
  });
}

/* ---------- settings ---------- */
function viewSettings() {
  const row = (k, t, sub) => `<button class="set-row" data-k="${k}"><span class="st"><div class="t">${t}</div>${sub ? `<div class="s">${sub}</div>` : ''}</span><span class="toggle ${S[k] ? 'on' : ''}"></span></button>`;
  view.innerHTML = topbar('Settings') + `<div class="page">
    <div class="sect">Sound & alerts</div>
    <div class="block">
      ${row('beeps', 'Beeps', 'Tone at the start of every interval')}
      ${row('countdown', 'Countdown beeps', '3 · 2 · 1 before each interval ends')}
      ${row('voice', 'Voice cues', 'Speaks "Work", "Rest", exercise names and "Last one"')}
      ${row('halfway', 'Halfway call', 'Says "Halfway" in work intervals of 20s or longer')}
      ${row('vibrate', 'Vibration', 'Buzz when the interval changes')}
      <button class="set-row" data-a="test"><span class="st"><div class="t">Test sound</div><div class="s">Check your volume before a workout</div></span>${ic('sound')}</button>
    </div>
    <div class="sect">Screen</div>
    <div class="block">
      ${row('flash', 'Screen flash', 'Flash the screen on every interval change')}
      ${row('keepAwake', 'Keep screen on', 'Screen stays awake while a timer is running')}
    </div>
    <div class="sect">Background</div>
    <div class="block">
      ${row('background', 'Alerts in background', 'Notification sound for each interval when you switch apps or lock the phone')}
      ${isNative ? `<button class="set-row" data-a="exact"><span class="st"><div class="t">On-time alerts</div><div class="s">Allow "Alarms & reminders" so background alerts fire to the second</div></span><span class="val" id="exv">${BG.exact === true ? 'ON' : BG.exact === false ? 'ALLOW' : '—'}</span></button>` : ''}
    </div>
    <div class="sect">Calendar</div>
    <div class="block">
      <button class="set-row" data-a="week"><span class="st"><div class="t">Week starts on</div></span><span class="val">${S.weekStart === 1 ? 'MONDAY' : 'SUNDAY'}</span>${ic('chevR', 'chev')}</button>
    </div>
    <div class="about"><b>KRANTHI WORKOUTS</b><br>Version 1.0 · Personal edition<br>${timers.length} timers · ${log.length} workouts logged</div>
  </div>`;
  view.querySelector('.page').addEventListener('click', async e => {
    const b = e.target.closest('[data-k],[data-a]'); if (!b) return;
    if (b.dataset.k) {
      const k = b.dataset.k; S[k] = !S[k]; saveSettings(); $('.toggle', b).classList.toggle('on', S[k]);
      if (k === 'background' && S[k]) { S.notifAsked = false; BG.ensurePermission(); }
      return;
    }
    if (b.dataset.a === 'test') { Snd.unlock(); const was = S.beeps; S.beeps = true; Snd.tick(); setTimeout(() => Snd.tick(), 1000); setTimeout(() => { Snd.go(); S.beeps = was; }, 2000); setTimeout(() => say('Work'), 2200); buzz(300); return; }
    if (b.dataset.a === 'week') { S.weekStart = S.weekStart === 1 ? 0 : 1; saveSettings(); return viewSettings(); }
    if (b.dataset.a === 'exact' && P.LocalNotifications) {
      try { const r = await P.LocalNotifications.changeExactNotificationSetting(); BG.exact = r.exact_alarm === 'granted'; } catch (err) { /* ignore */ }
      const v = $('#exv'); if (v) v.textContent = BG.exact ? 'ON' : 'ALLOW';
    }
  });
}

/* ---------- boot ---------- */
document.addEventListener('visibilitychange', () => { if (!document.hidden && Awake.want) Awake.on(); });
renderTabs();
render();
BG.init();
if (!isNative && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
