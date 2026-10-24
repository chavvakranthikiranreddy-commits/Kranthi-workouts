/* Muscle & Money: workouts (timers, gym log, programs, yoga, steps) and money tracking */
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
  return `${Math.floor(m / 60)}h${m % 60 ? ' ' + (m % 60) + 'm' : ''}`;
}
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WDL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const shortDate = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

/* ---------- icons ---------- */
const I = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L20.5 20.5"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.6" r="1.2" fill="currentColor" stroke="none"/>',
  share: '<circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="M8.7 10.8l6.6-4M8.7 13.2l6.6 4"/>',
  swap: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
  repeat: '<path d="M4 11V9a3 3 0 0 1 3-3h12l-3-3M20 13v2a3 3 0 0 1-3 3H5l3 3"/>',
  home: '<path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.9c0 5.6-7.5 10.2-7.5 10.2z" fill="currentColor" stroke="none"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 2.5h4M18.5 6.5l1.5-1.5"/>',
  run: '<circle cx="14.5" cy="4.5" r="2"/><path d="M8 21l3-6 3 2.5V22M6.5 11.5l2.5-3 4-1 3 3.5 3 1M11 15l1.8-5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none"/>',
  feet: '<path d="M8.5 3.5c1.8 0 2.8 1.9 2.8 4.3S10 12 8.4 12 5.7 10.5 5.7 8.1 6.7 3.5 8.5 3.5zM6 14.5h5v1.7a2.5 2.5 0 0 1-5 0z"/><path d="M15.5 7.5c1.8 0 2.8 1.9 2.8 4.3S17 16 15.4 16s-2.7-1.5-2.7-3.9 1-4.6 2.8-4.6zM13 18.5h5v.5a2.5 2.5 0 0 1-5 0z"/>',
  chart: '<path d="M4 20h16"/><path d="M6 16l4-5 3.5 3L19 7"/><circle cx="19" cy="7" r="1.4" fill="currentColor" stroke="none"/>',
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
  addset: '<rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke-dasharray="3 2.5"/><path d="M12 8v8M8 12h8"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor" stroke="none"/>',
  dumbbell: '<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 7.6-1.7"/>',
  scale: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9.5a5 5 0 0 1 7 0L13 12"/>',
  trophy: '<path d="M7.5 4.5h9v4a4.5 4.5 0 0 1-9 0z"/><path d="M7.5 6.5H4.5a3 3 0 0 0 3 4M16.5 6.5h3a3 3 0 0 1-3 4M12 13v3.5M8.5 20h7M9.5 16.5h5V20h-5z"/>',
  upload: '<path d="M12 15.5V4M7.5 8.5L12 4l4.5 4.5M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  download: '<path d="M12 4v11.5M7.5 11L12 15.5 16.5 11M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  note: '<path d="M6 3.5h9l4 4v13H6z"/><path d="M15 3.5v4h4M9 12h7M9 16h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  lotus: '<path d="M12 19c-3.5 0-6.5-2.2-7.5-5.5 2.6-.3 5 .6 7.5 3 2.5-2.4 4.9-3.3 7.5-3-1 3.3-4 5.5-7.5 5.5z"/><path d="M12 16.5c-1.8-1.8-2.6-4.2-2-7 .7-1.8 1.4-3 2-4 .6 1 1.3 2.2 2 4 .6 2.8-.2 5.2-2 7z"/>',
  wallet: '<rect x="3.5" y="6" width="17" height="13.5" rx="3"/><path d="M3.5 9.5h17M16 14.5h1.5"/><path d="M6 6l9-2.5 1 2.5"/>',
  list2: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  pie: '<path d="M12 3.5v8.5h8.5A8.5 8.5 0 1 1 12 3.5z"/><path d="M15 3.8a8.5 8.5 0 0 1 5.2 5.2H15z"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M8 12h8"/>',
  flame: '<path d="M12 21.5c-4 0-6.5-2.7-6.5-6.2 0-3.6 2.8-5.6 3.8-9.3 2 1.3 3 3 3 4.8 1-.6 1.7-1.7 1.9-3 2.4 1.9 4.3 4.7 4.3 7.6 0 3.5-2.5 6.1-6.5 6.1z"/>',
};
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${I[n] || ''}</svg>`;

/* ---------- native bridge (Capacitor) ---------- */
const Cap = window.Capacitor;
const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const P = {};
if (isNative) {
  for (const n of ['LocalNotifications', 'Haptics', 'App', 'TextToSpeech', 'KeepAwake', 'Filesystem', 'Share', 'AudioDuck', 'Steps', 'Ocr', 'AppLock', 'Widget']) {
    try { if (Cap.isPluginAvailable(n)) P[n] = Cap.registerPlugin(n); } catch (e) { /* plugin missing */ }
  }
}

/* ---------- storage ---------- */
const DB = {
  get(k, d) { try { const v = localStorage.getItem('kw_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kw_' + k, JSON.stringify(v)); } catch (e) { toast('Could not save. Phone storage may be full.'); } if (k !== 'gymdraft') pushWidget(); },
  del(k) { try { localStorage.removeItem('kw_' + k); } catch (e) { /* ignore */ } },
};
const DEFAULTS = {
  beeps: true, voice: true, countdown: true, voiceCount: false, halfway: true, vibrate: true, flash: true, keepAwake: true,
  background: true, weekStart: 1, notifAsked: false, stepGoal: 8000, height: null, sound: 'classic', duck: true, theme: 'dark', accent: '#00E5FF', unit: 'kg', lastBackup: 0,
};
const S = Object.assign({}, DEFAULTS, DB.get('settings', {}));
const saveSettings = () => DB.set('settings', S);

const COLORS = ['#00E5FF', '#22D46A', '#FFD43B', '#FF9F1C', '#FF4057', '#B26BFF', '#FF5FC8', '#4D8DFF'];
const ACCENTS = [['Cyan', '#00E5FF'], ['Lime', '#7CFF2B'], ['Green', '#22D46A'], ['Yellow', '#FFD43B'], ['Orange', '#FF8A1F'], ['Red', '#FF4057'], ['Pink', '#FF4FA3'], ['Purple', '#A06BFF'], ['Blue', '#3D8BFF']];
const PHASE = { prepare: '#FFD43B', work: '#22D46A', rest: '#FF4057', cyclerest: '#FF9F1C', cooldown: '#4D8DFF', stopwatch: '#00E5FF', done: '#00E5FF', flow: '#9D8CFF', ease: '#C9D2DC' };

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
const allTemplates = () => TEMPLATES.flatMap(g => g.items);

const EXERCISES = {
  Chest: ['Bench Press', 'Incline Bench Press', 'Dumbbell Bench Press', 'Incline Dumbbell Press', 'Chest Fly', 'Cable Crossover', 'Pec Deck', 'Push-ups', 'Dips'],
  Back: ['Deadlift', 'Pull-ups', 'Chin-ups', 'Lat Pulldown', 'Barbell Row', 'Dumbbell Row', 'Seated Cable Row', 'T-Bar Row', 'Face Pull'],
  Legs: ['Squat', 'Front Squat', 'Leg Press', 'Romanian Deadlift', 'Lunges', 'Bulgarian Split Squat', 'Leg Extension', 'Leg Curl', 'Hip Thrust', 'Calf Raise'],
  Shoulders: ['Overhead Press', 'Dumbbell Shoulder Press', 'Arnold Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Shrugs', 'Upright Row'],
  Arms: ['Barbell Curl', 'Dumbbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl', 'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension', 'Close-Grip Bench Press'],
  Core: ['Plank', 'Crunches', 'Hanging Leg Raise', 'Russian Twist', 'Cable Crunch', 'Ab Wheel Rollout', 'Side Plank'],
};

let timers = DB.get('timers', null);
if (!Array.isArray(timers)) { timers = seedTimers(); DB.set('timers', timers); }
let log = DB.get('log', []);
let body = DB.get('body', []);
let plan = DB.get('plan', null);
let customEx = DB.get('customEx', []);
const saveTimers = () => DB.set('timers', timers);
const saveLog = () => DB.set('log', log);
const saveBody = () => DB.set('body', body);
const savePlan = () => DB.set('plan', plan);
const emptyPlan = () => { const p = {}; for (let d = 0; d < 7; d++) p[d] = { rest: false, items: [], remind: false, time: '06:00' }; return p; };
const hasPlan = () => plan && Object.values(plan).some(d => d.rest || d.items.length);

/* ---------- units ---------- */
const KG_LB = 2.20462;
const wUnit = () => S.unit === 'lb' ? 'lb' : 'kg';
const lUnit = () => S.unit === 'lb' ? 'in' : 'cm';
const trim1 = v => { const r = Math.round(v * 10) / 10; return String(r).replace(/\.0$/, ''); };
const wOut = kg => kg == null || kg === '' ? '' : trim1(S.unit === 'lb' ? kg * KG_LB : kg);
const wIn = v => { const n = parseFloat(v); if (isNaN(n)) return null; return S.unit === 'lb' ? n / KG_LB : n; };
const lOut = cm => cm == null || cm === '' ? '' : trim1(S.unit === 'lb' ? cm / 2.54 : cm);
const lIn = v => { const n = parseFloat(v); if (isNaN(n)) return null; return S.unit === 'lb' ? n * 2.54 : n; };

/* ---------- theme ---------- */
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function lum([r, g, b]) { const f = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); }
function applyTheme() {
  const root = document.documentElement;
  root.dataset.theme = S.theme === 'light' ? 'light' : 'dark';
  const rgb = hexRgb(S.accent); const [r, g, b] = rgb;
  const light = S.theme === 'light';
  const ink = lum(rgb) > 0.4 ? '#071114' : '#FFFFFF';
  // On a light background, bright accents need darkening to stay readable as text.
  let text = S.accent;
  if (light) { let k = 1, c = rgb; while (lum(c) > 0.16 && k > 0.3) { k -= 0.05; c = rgb.map(v => Math.round(v * k)); } text = `rgb(${c.join(',')})`; }
  root.style.setProperty('--accent', S.accent);
  root.style.setProperty('--accent-ink', ink);
  root.style.setProperty('--accent-text', text);
  root.style.setProperty('--accent-soft', `rgba(${r},${g},${b},${light ? .14 : .14})`);
  root.style.setProperty('--accent-line', `rgba(${r},${g},${b},.35)`);
  root.style.setProperty('--accent-glow', `rgba(${r},${g},${b},.3)`);
  PHASE.stopwatch = S.accent; PHASE.done = S.accent;
  const meta = $('meta[name="theme-color"]'); if (meta) meta.content = light ? '#F2F4F6' : '#0D0F12';
  try { const SB = Cap && Cap.Plugins && Cap.Plugins.SystemBars; if (isNative && SB) SB.setStyle({ style: light ? 'LIGHT' : 'DARK' }).catch(() => {}); } catch (e) { /* ignore */ }
}
applyTheme();

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
          if (v.dur > 0) cyc.push({ kind: v.kind, label: v.name || (v.kind === 'work' ? 'Work' : 'Rest'), dur: v.dur, set: si + 1, sets: totalSets, round: r, rounds: R, cycle: c, cycles: C, pose: v.pose });
        });
      }
    });
    // No point resting at the very end of a cycle: the cycle rest or the finish follows.
    while (cyc.length > 1 && (cyc[cyc.length - 1].kind === 'rest' || cyc[cyc.length - 1].kind === 'ease')) cyc.pop();
    steps.push(...cyc);
    if (c < C && t.cycleRest > 0) steps.push({ kind: 'cyclerest', label: 'Recover', sub: 'Rest between cycles', dur: t.cycleRest, cycle: c, cycles: C });
  }
  if (t.cooldown > 0) steps.push({ kind: 'cooldown', label: 'Cooldown', dur: t.cooldown });
  return steps;
}
const totalOf = t => buildSteps(t).reduce((a, s) => a + s.dur, 0);

/* ---------- feedback: sound, voice, vibration ---------- */
const SOUNDS = {
  classic: { name: 'Classic', tick: [[740, .13, 0, 'triangle']], go: [[1046, .5, 0, 'triangle']] },
  bell: { name: 'Bell', tick: [[1320, .25, 0, 'sine', 0, true]], go: [[880, 1.2, 0, 'sine', 0, true], [1760, 1.0, 0, 'sine', 0, true, .35]] },
  boxing: { name: 'Boxing bell', tick: [[520, .1, 0, 'square', 0, false, .4]], go: [[1200, .5, 0, 'sine', 0, true], [1200, .5, .18, 'sine', 0, true], [1200, .8, .36, 'sine', 0, true]] },
  whistle: { name: 'Whistle', tick: [[1600, .1, 0, 'sine']], go: [[1900, .55, 0, 'sine', 2300]] },
  digital: { name: 'Digital', tick: [[1000, .07, 0, 'square', 0, false, .35]], go: [[1500, .09, 0, 'square', 0, false, .35], [1500, .09, .14, 'square', 0, false, .35], [1500, .25, .28, 'square', 0, false, .35]] },
};
const Snd = {
  ctx: null,
  unlock() {
    try {
      if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) this.ctx = new AC(); }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { /* ignore */ }
  },
  tone(freq, dur, when = 0, type = 'triangle', sweep = 0, ring = false, vol = .9) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    if (ring) g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    else { g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.04)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  },
  play(kind, force) {
    if (!S.beeps && !force) return;
    duck(1200);
    (SOUNDS[S.sound] || SOUNDS.classic)[kind].forEach(a => this.tone(a[0], a[1], a[2], a[3], a[4], a[5], a[6]));
  },
  tick() { this.play('tick'); },
  go() { this.play('go'); },
  finish() { if (!S.beeps) return; duck(2000); this.tone(784, .18, 0); this.tone(988, .18, .2); this.tone(1318, .6, .4); },
};
let duckTimer = null;
function duck(ms) {
  if (!P.AudioDuck || !S.duck) return;
  if (!duckTimer) P.AudioDuck.duck().catch(() => {});
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => { duckTimer = null; P.AudioDuck.release().catch(() => {}); }, ms);
}
let lastSpeak = 0;
async function say(text, force) {
  if ((!S.voice && !force) || !text) return;
  lastSpeak = Date.now();
  duck(2200);
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

/* ---------- notifications: background phase alerts + plan reminders ---------- */
const PHASE_IDS = [1, 99]; for (let i = 100; i < 175; i++) PHASE_IDS.push(i);
const BG = {
  exact: null,
  async init() {
    if (!P.LocalNotifications) return;
    try {
      await P.LocalNotifications.createChannel({ id: 'kw_phase', name: 'Timer phase alerts', description: 'Sound when a work/rest phase changes while the app is in the background', importance: 5, visibility: 1, vibration: true });
      await P.LocalNotifications.createChannel({ id: 'kw_status', name: 'Workout running', description: 'Shows that a timer is running', importance: 2, visibility: 1, vibration: false });
      await P.LocalNotifications.createChannel({ id: 'kw_remind', name: 'Workout reminders', description: 'Daily reminders from your weekly plan', importance: 4, visibility: 1, vibration: true });
      P.LocalNotifications.addListener('localNotificationActionPerformed', a => { if (a && a.notification && a.notification.id >= 500) go('today'); });
    } catch (e) { /* ignore */ }
    this.refreshExact();
  },
  async refreshExact() {
    if (!P.LocalNotifications) return;
    try { const r = await P.LocalNotifications.checkExactNotificationSetting(); this.exact = r.exact_alarm === 'granted'; } catch (e) { this.exact = null; }
  },
  async ensurePermission(force) {
    if (!P.LocalNotifications) return false;
    try {
      const p = await P.LocalNotifications.checkPermissions();
      if (p.display === 'granted') return true;
      if (force || !S.notifAsked) { S.notifAsked = true; saveSettings(); const r = await P.LocalNotifications.requestPermissions(); return r.display === 'granted'; }
    } catch (e) { /* ignore */ }
    return false;
  },
  async schedule() {
    const R = Run.cur;
    if (!P.LocalNotifications || !S.background || !R || !R.running || R.mode !== 'timer') return;
    await this.cancel();
    const e = R.elapsed(), now = Date.now();
    const idx = R.locate(e);
    const exact = this.exact !== false;
    const list = [{ id: 1, title: R.timer.name, body: 'Workout running · tap to return', channelId: 'kw_status', ongoing: true, autoCancel: false, smallIcon: 'ic_stat_kw', iconColor: S.accent }];
    let id = 100;
    for (let i = idx + 1; i < R.steps.length && id < 170; i++) {
      const st = R.steps[i];
      const bits = [fmtShort(st.dur)];
      if (st.rounds > 1) bits.push(`Round ${st.round}/${st.rounds}`);
      if (st.cycles > 1) bits.push(`Cycle ${st.cycle}/${st.cycles}`);
      list.push({ id: id++, title: st.label.toUpperCase(), body: bits.join(' · '), channelId: 'kw_phase', schedule: { at: new Date(now + (R.cum[i] - e)), allowWhileIdle: true }, isExactNotification: exact, smallIcon: 'ic_stat_kw', iconColor: PHASE[st.kind] || S.accent, autoCancel: true });
    }
    list.push({ id: 99, title: 'WORKOUT COMPLETE 💪', body: `${R.timer.name} · ${fmt(R.total / 1000)}`, channelId: 'kw_phase', schedule: { at: new Date(now + (R.total - e)), allowWhileIdle: true }, isExactNotification: exact, smallIcon: 'ic_stat_kw', iconColor: S.accent });
    try { await P.LocalNotifications.schedule({ notifications: list }); } catch (err) { console.warn('schedule failed', err); }
  },
  async cancel() {
    if (!P.LocalNotifications) return;
    // Only timer notifications: plan reminders (ids 500+) must stay scheduled.
    try { await P.LocalNotifications.cancel({ notifications: PHASE_IDS.map(id => ({ id })) }); } catch (e) { /* ignore */ }
  },
};
async function scheduleReminders(silent) {
  if (!P.LocalNotifications) return;
  try { await P.LocalNotifications.cancel({ notifications: [0, 1, 2, 3, 4, 5, 6].map(d => ({ id: 500 + d })) }); } catch (e) { /* ignore */ }
  if (!plan) return;
  const list = [];
  for (let d = 0; d < 7; d++) {
    const day = plan[d]; if (!day || !day.remind || day.rest || !day.items.length) continue;
    const [hh, mm] = (day.time || '06:00').split(':').map(Number);
    list.push({ id: 500 + d, title: `${WDL[d]}: time to train 💪`, body: day.items.map(i => i.name).join(' · '), channelId: 'kw_remind', schedule: { on: { weekday: d + 1, hour: hh, minute: mm }, allowWhileIdle: true }, isExactNotification: false, smallIcon: 'ic_stat_kw', iconColor: S.accent });
  }
  if (!list.length) return;
  const ok = silent ? (await P.LocalNotifications.checkPermissions().catch(() => ({}))).display === 'granted' : await BG.ensurePermission(true);
  if (!ok) { if (!silent) toast('Allow notifications to get workout reminders'); return; }
  try { await P.LocalNotifications.schedule({ notifications: list }); } catch (e) { console.warn('reminders failed', e); }
}

/* ---------- home-screen widget ---------- */
var widgetTimer = 0;
function pushWidget(now) {
  if (!P.Widget) return;
  clearTimeout(widgetTimer);
  widgetTimer = setTimeout(async () => {
    try {
      const m = Money.widgetData(); const st = computeStats();
      const k = dkey(new Date()); const day = plan && plan[new Date().getDay()];
      const todays = log.filter(x => x.date === k);
      const workout = todays.length ? todays[todays.length - 1].title || 'Workout done' : !hasPlan() ? 'No weekly plan yet' : !day || day.rest ? 'Rest day' : day.items.map(i => i.name).join(' + ') || 'Nothing planned';
      await P.Widget.update({ steps: STP.today || 0, stepGoal: S.stepGoal, stepsOn: !!STP.enabled, money: !!m.money, locked: !!m.locked, left: m.left || 0, safe: m.safe || 0, workout, done: todays.length > 0, streak: st.cur, accent: S.accent });
    } catch (e) { /* widget not added or plugin missing */ }
  }, now ? 50 : 1500);
}

let appVisible = true;
let yogaClock = 0;
function onBackground() {
  if (!appVisible) return;
  appVisible = false;
  Money.onHide();
  pushWidget(true);
  if (Run.cur && Run.cur.running) BG.schedule();
}
function onForeground() {
  if (appVisible) return;
  appVisible = true;
  BG.cancel();
  BG.refreshExact();
  if (Run.cur) { Run.cur.resync = true; Run.tick(); if (Run.cur && Run.cur.running) Awake.on(); }
  if (Gym.cur) Gym.tickClock();
  stepsRefresh();
  Money.onShow();
  if (!Run.cur && !$('#layer > .screen') && currentTab === 'today') render();
}
document.addEventListener('visibilitychange', () => (document.hidden ? onBackground() : onForeground()));
if (P.App) {
  P.App.addListener('appStateChange', s => (s.isActive ? onForeground() : onBackground()));
  P.App.addListener('backButton', () => handleBack());
}


/* ---------- step counter ---------- */
const STP = { avail: false, granted: false, enabled: false, today: 0, days: DB.get('steps', {}), updated: 0 };
const fmtN = n => Math.round(n || 0).toLocaleString('en-IN');
const strideM = () => (S.height ? S.height * 0.415 / 100 : 0.75);
const stepsKm = n => (n || 0) * strideM() / 1000;
const stepsKcal = n => { const lb = latestBody(); return stepsKm(n) * (lb ? lb.kg : 70) * 0.78; };
const distStr = n => S.unit === 'lb' ? `${trim1(stepsKm(n) / 1.609)} mi` : `${trim1(stepsKm(n))} km`;
const stepsOn = (k) => STP.days[k] || 0;

async function stepsInit() {
  if (!P.Steps) return;
  try {
    const st = await P.Steps.status();
    STP.avail = !!st.available; STP.granted = !!st.granted; STP.enabled = !!st.enabled && !!st.granted;
    P.Steps.setGoal({ goal: S.stepGoal }).catch(() => {});
    if (STP.enabled) {
      await stepsRefresh();
      // One-time repair: an earlier version could count the phone's whole since-restart total as today's steps.
      if (!DB.get('stepfix1', false)) {
        DB.set('stepfix1', true);
        if (STP.today > 25000 && new Date().getHours() < 12) { await resetTodaySteps(true); toast('Fixed a step-count glitch. Today\'s steps start again from now.'); }
      }
    } else if (currentTab === 'today' && !Run.cur) rerenderKeepScroll();
  } catch (e) { /* ignore */ }
}
async function stepsRefresh() {
  if (!P.Steps || !STP.enabled) return;
  try { mergeSteps(await P.Steps.refresh()); } catch (e) { /* ignore */ }
}
function mergeSteps(r) {
  if (!r) return;
  const k = dkey(new Date());
  const before = STP.days[k] || 0;
  // The phone's own record wins for every day it has; older days from a restored backup stay as they are.
  Object.entries(r.days || {}).forEach(([d, v]) => { STP.days[d] = v || 0; });
  STP.today = r.today || 0; STP.days[k] = STP.today;
  STP.updated = Date.now();
  DB.set('steps', STP.days);
  if (before < S.stepGoal && STP.today >= S.stepGoal && before > 0) toast(`🎉 Step goal reached: ${fmtN(STP.today)} steps`);
  paintStepsCard();
}
async function enableSteps() {
  if (!P.Steps) { toast('Step counting works in the installed app'); return; }
  if (!STP.avail) { toast('This phone has no step sensor, so steps can\'t be counted'); return; }
  try {
    const p = await P.Steps.requestPermission();
    if (!p.granted) { toast('Allow "Physical activity" for Muscle & Money in phone settings to count steps'); return; }
    await BG.ensurePermission(true);
    if (!S.height) await askHeight();
    STP.granted = true; STP.enabled = true;
    P.Steps.setGoal({ goal: S.stepGoal }).catch(() => {});
    mergeSteps(await P.Steps.start());
    toast('Step counting is on. It counts from now on.');
    rerenderKeepScroll();
  } catch (e) { toast('Could not start step counting'); }
}
async function resetTodaySteps(silent) {
  if (!P.Steps) return;
  try { const r = await P.Steps.resetToday(); STP.days[dkey(new Date())] = 0; DB.set('steps', STP.days); mergeSteps(r); } catch (e) { /* ignore */ }
  if (!silent) { toast('Today\'s steps reset. Counting from now.'); rerenderKeepScroll(); }
}
async function disableSteps() {
  if (P.Steps) { try { await P.Steps.stop(); } catch (e) { /* ignore */ } }
  STP.enabled = false; rerenderKeepScroll();
}
function askHeight() {
  return new Promise(res => {
    let done = false;
    const s = sheet(`<h2>Your height</h2><p class="sub">Used to work out distance from your steps.</p>
      <div class="unit-in"><input class="field" id="hgt" inputmode="decimal" placeholder="${S.unit === 'lb' ? '68' : '172'}" value="${S.height ? esc(lOut(S.height)) : ''}" style="font-size:40px;text-align:center"><span>${lUnit()}</span></div>
      <div class="btns two"><button class="btn" data-a="skip">Skip</button><button class="btn primary" data-a="ok">Save</button></div>`, { onClose: () => { if (!done) res(); } });
    setTimeout(() => { const i = $('#hgt', s.el); i && i.focus(); }, 250);
    s.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'ok') {
        const v = lIn($('#hgt', s.el).value);
        if (!v || v < 100 || v > 230) { toast(`Enter your height in ${lUnit()}`); return; }
        S.height = v; saveSettings();
      }
      done = true; s.close(); res();
    });
  });
}
function pickStepGoal() {
  const s = sheet(`<h2>Daily step goal</h2>
    <div class="picker"><button class="pbtn" style="width:64px;height:64px" data-a="-">${ic('chevD')}</button><input class="pnum" id="sg" inputmode="numeric" style="width:170px;font-size:52px" value="${S.stepGoal}"><button class="pbtn" style="width:64px;height:64px" data-a="+">${ic('chevU')}</button></div>
    <div class="presets">${[5000, 6000, 7500, 8000, 10000, 12000, 15000].map(g => `<button class="chip small" data-g="${g}">${fmtN(g)}</button>`).join('')}</div>
    <div class="btns two"><button class="btn" data-a="c">Cancel</button><button class="btn primary" data-a="ok">Set</button></div>`);
  const inp = $('#sg', s.el);
  s.el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.g) { inp.value = b.dataset.g; return; }
    const v = clamp(parseInt(inp.value, 10) || 8000, 1000, 50000);
    if (b.dataset.a === '+' || b.dataset.a === '-') { inp.value = clamp(v + (b.dataset.a === '+' ? 500 : -500), 1000, 50000); return; }
    if (b.dataset.a === 'c') return s.close();
    if (b.dataset.a === 'ok') { S.stepGoal = v; saveSettings(); if (P.Steps) P.Steps.setGoal({ goal: v }).catch(() => {}); s.close(); rerenderKeepScroll(); toast(`Goal set to ${fmtN(v)} steps`); }
  });
}
const SRING = 2 * Math.PI * 44;
function stepsCardHtml() {
  if (!STP.enabled) {
    return `<div class="steps-card off"><span class="qi">${ic('feet')}</span><div style="flex:1;min-width:0"><b>Count your steps</b><span>${isNative ? (STP.avail || !P.Steps ? 'Counts in the background all day with almost no battery use.' : 'This phone has no step sensor.') : 'Step counting works in the installed app.'}</span></div><button class="go" data-a="steps-on">Turn on</button></div>`;
  }
  return `<button class="steps-card" data-a="steps-go" id="stepsCard">
    <div class="sring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="44"/><circle class="bar" id="stRing" cx="50" cy="50" r="44" stroke-dasharray="${SRING}" stroke-dashoffset="${SRING}"/></svg>
      <div class="sc">${ic('feet')}<b id="stN">0</b><span>of ${fmtN(S.stepGoal)}</span></div></div>
    <div class="sinfo"><div><b id="stKm">0</b><span>${S.unit === 'lb' ? 'miles' : 'km'}</span></div><div><b id="stKc">0</b><span>kcal</span></div><div><b id="stPc">0%</b><span>of goal</span></div><small id="stUp"></small></div>
  </button>`;
}
function paintStepsCard() {
  const c = $('#stepsCard'); if (!c) return;
  const n = STP.today || stepsOn(dkey(new Date()));
  const pct = S.stepGoal ? n / S.stepGoal : 0;
  $('#stN', c).textContent = fmtN(n);
  $('#stRing', c).style.strokeDashoffset = (SRING * (1 - Math.min(1, pct))).toFixed(1);
  $('#stKm', c).textContent = trim1(S.unit === 'lb' ? stepsKm(n) / 1.609 : stepsKm(n));
  $('#stKc', c).textContent = fmtN(stepsKcal(n));
  $('#stPc', c).textContent = Math.round(pct * 100) + '%';
  c.classList.toggle('done', pct >= 1);
  const ago = STP.updated ? Math.round((Date.now() - STP.updated) / 60000) : null;
  $('#stUp', c).textContent = pct >= 1 ? 'Goal reached 🎉' : ago === null ? '' : ago < 1 ? 'Updated just now' : `Updated ${ago} min ago`;
}
setInterval(() => { if (appVisible && STP.enabled && currentTab === 'today' && !Run.cur) stepsRefresh(); }, 15000);

function stepStats(nDays) {
  const t = today0(); const arr = [];
  for (let i = nDays - 1; i >= 0; i--) { const d = addDays(t, -i); arr.push({ d, k: dkey(d), v: stepsOn(dkey(d)) }); }
  const withData = arr.filter(x => x.v > 0);
  const total = arr.reduce((a, x) => a + x.v, 0);
  const best = arr.reduce((a, x) => (x.v > a.v ? x : a), { v: 0 });
  let streak = 0; let d = new Date(t); if (stepsOn(dkey(d)) < S.stepGoal) d = addDays(d, -1);
  while (stepsOn(dkey(d)) >= S.stepGoal) { streak++; d = addDays(d, -1); }
  return { arr, total, avg: withData.length ? total / withData.length : 0, best, goalDays: arr.filter(x => x.v >= S.stepGoal).length, streak };
}
function stepBars(arr) {
  const W = 320, H = 150, L = 6, R = 6, T = 16, B = 18;
  const max = Math.max(S.stepGoal * 1.15, ...arr.map(x => x.v));
  const bw = (W - L - R) / arr.length;
  const Y = v => T + (1 - v / max) * (H - T - B);
  const gy = Y(S.stepGoal);
  const week = arr.length <= 7;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Steps per day">
    <line x1="${L}" x2="${W - R}" y1="${gy.toFixed(1)}" y2="${gy.toFixed(1)}" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="4 4" opacity=".8"/>
    ${arr.map((x, i) => {
      const h = Math.max(2, (H - T - B) - (Y(x.v) - T)); const x0 = L + i * bw + bw * 0.18; const w = bw * 0.64;
      const lbl = week ? WD[x.d.getDay()][0] : ((arr.length - 1 - i) % 5 === 0 ? `${x.d.getDate()}${x.d.getDate() <= 5 || i === 0 ? ' ' + MONTHS[x.d.getMonth()].slice(0, 3) : ''}` : '');
      return `<rect x="${x0.toFixed(1)}" y="${(H - B - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(4, w / 2).toFixed(1)}" fill="var(--accent)" opacity="${x.v >= S.stepGoal ? 1 : x.v ? .45 : .15}"/>
        ${lbl !== '' ? `<text class="lbl" x="${(x0 + w / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle">${lbl}</text>` : ''}
        ${week && x.v ? `<text class="lbl" x="${(x0 + w / 2).toFixed(1)}" y="${(H - B - h - 4).toFixed(1)}" text-anchor="middle">${x.v >= 1000 ? trim1(x.v / 1000) + 'k' : x.v}</text>` : ''}`;
    }).join('')}
  </svg>`;
}
let stepsRange = 'week';

/* ---------- UI primitives ---------- */
const layer = $('#layer');
const backStack = []; // functions that close the top-most overlay

function pushBack(fn) { backStack.push(fn); return () => { const i = backStack.lastIndexOf(fn); if (i >= 0) backStack.splice(i, 1); }; }
function handleBack() {
  if (backStack.length) { backStack[backStack.length - 1](); return; }
  if (currentTab.startsWith('m-') && currentTab !== 'm-home') { go('m-home'); return; }
  if (currentTab !== 'today' && !currentTab.startsWith('m-')) { go('today'); return; }
  if (P.App) P.App.minimizeApp ? P.App.minimizeApp().catch(() => P.App.exitApp()) : P.App.exitApp();
}

function toast(msg) {
  $$('.toast').forEach(t => t.remove());
  const t = el(`<div class="toast">${esc(msg)}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
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

function promptText(title, { value = '', placeholder = '', suggestions = [], ok = 'Add' } = {}) {
  return new Promise(res => {
    let done = false;
    const s = sheet(`<h2>${esc(title)}</h2>
      <input class="field" id="ptx" maxlength="40" placeholder="${esc(placeholder)}" value="${esc(value)}" style="margin:8px 0 12px">
      ${suggestions.length ? `<div class="presets" style="justify-content:flex-start">${suggestions.map(x => `<button class="chip small" data-s="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
      <div class="btns two"><button class="btn" data-a="c">Cancel</button><button class="btn primary" data-a="ok">${esc(ok)}</button></div>`, { onClose: () => { if (!done) res(null); } });
    const inp = $('#ptx', s.el);
    const finish = () => { const v = inp.value.trim(); if (!v) { toast('Type a name first'); return; } done = true; s.close(); res(v); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') finish(); });
    s.el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.s) { inp.value = b.dataset.s; return; }
      if (b.dataset.a === 'c') return s.close();
      if (b.dataset.a === 'ok') finish();
    });
    setTimeout(() => inp.focus(), 250);
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
    <div class="presets">${presets.map(p => `<button class="chip small" data-p="${p}">${p >= 600 ? fmtMins(p) : fmtShort(p)}</button>`).join('')}</div>
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

function quickRestSheet() {
  const s = sheet(`<h2>Rest timer</h2><p class="sub">Starts right away. The screen closes by itself when rest is over.</p>
    <div class="presets">${[30, 45, 60, 90, 120, 150, 180, 240].map(x => `<button class="chip" data-s="${x}">${fmtShort(x)}</button>`).join('')}</div>`);
  s.el.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; s.close(); startRest(+b.dataset.s); });
}
function startRest(sec) {
  startTimer(mk({ id: 'quick', name: `Rest ${fmtShort(sec)}`, prepare: 0, color: PHASE.cyclerest, sets: [{ id: 's', intervals: [iv('Rest', 'rest', sec)], rounds: 1 }], cycles: 1, noLog: true }), { autostart: true });
}

/* ---------- illustrations & quotes ---------- */
const QUOTES = {
  train: [
    'Strong is built one rep at a time.',
    'Show up. Even on the days you don’t feel like it.',
    'The only bad workout is the one you skipped.',
    'Small steps every day add up to big changes.',
    'Discipline is choosing what you want most over what you want now.',
    'Be stronger than your excuses.',
    'Today’s effort is tomorrow’s strength.',
    'One more rep. One more round. One more day.',
    'Consistency beats intensity.',
    'Sweat now, shine later.',
    'You don’t have to be extreme, just consistent.',
    'Your only competition is who you were yesterday.',
    'Make your body the strongest thing you own.',
    'Start where you are. Use what you have. Do what you can.',
  ],
  rest: [
    'Rest is part of the plan.',
    'Muscles grow while you recover.',
    'Recharge today, return stronger tomorrow.',
    'Sleep, eat well, come back hungry.',
    'Slow down today so you can speed up tomorrow.',
  ],
  progress: [
    'Progress, not perfection.',
    'Fall in love with the process.',
    'The summit is reached one step at a time.',
    'Look how far you’ve come.',
    'Every session is a vote for the person you want to be.',
  ],
  done: [
    'Done. That’s how strong people are made.',
    'Another one in the bank.',
    'You showed up. That’s the win.',
    'Proud of that one. Recover well.',
    'Future you says thank you.',
  ],
};
const dayIndex = (n, salt = 0) => { const d = today0(); const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5); return (doy + salt) % n; };
const pickQuote = (set, salt) => QUOTES[set][dayIndex(QUOTES[set].length, salt)];

// Original vector scenes drawn in code. They use the accent colour, so they follow the theme picker.
const ART = {
  summit: g => `<defs><linearGradient id="s${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A1622"/><stop offset="1" stop-color="#1B3446"/></linearGradient></defs>
    <rect width="400" height="180" fill="url(#s${g})"/>
    <circle cx="318" cy="64" r="30" fill="var(--accent)" opacity=".9"/><circle cx="318" cy="64" r="46" fill="var(--accent)" opacity=".12"/>
    ${[[40, 30], [120, 18], [210, 40], [372, 22], [262, 14], [160, 52]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff" opacity=".7"/>`).join('')}
    <path d="M150 180 L260 70 L300 108 L335 82 L400 140 L400 180 Z" fill="#15222E"/>
    <path d="M248 82 L260 70 L272 82 L264 80 L258 86 Z" fill="#E9F1F6" opacity=".9"/>
    <path d="M260 70 L260 44" stroke="#E9F1F6" stroke-width="2"/><path d="M260 44 L278 50 L260 56 Z" fill="var(--accent)"/>
    <path d="M0 180 L0 120 L60 92 L118 128 L170 104 L240 150 L300 132 L400 170 L400 180 Z" fill="#0C141C"/>`,
  runner: g => `<defs><linearGradient id="r${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#170E2A"/><stop offset=".75" stop-color="#3A1C3D"/><stop offset="1" stop-color="#4A2440"/></linearGradient></defs>
    <rect width="400" height="180" fill="url(#r${g})"/>
    <circle cx="300" cy="132" r="58" fill="var(--accent)" opacity=".9"/><circle cx="300" cy="132" r="80" fill="var(--accent)" opacity=".1"/>
    <rect y="132" width="400" height="48" fill="#120A1C"/>
    <path d="M230 180 L292 132 L308 132 L370 180 Z" fill="#1E1229"/><path d="M299 180 L300 136" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 7" opacity=".7"/>
    <g stroke="#0B0612" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <circle cx="290" cy="76" r="8" fill="#0B0612" stroke="none"/>
      <path d="M287 87 L281 108"/><path d="M286 92 L298 100 L306 94"/><path d="M286 92 L274 98 L268 108"/>
      <path d="M281 108 L294 118 L292 132"/><path d="M281 108 L270 120 L258 118"/></g>`,
  barbell: g => `<defs><radialGradient id="b${g}" cx=".75" cy=".3" r=".9"><stop offset="0" stop-color="var(--accent)" stop-opacity=".45"/><stop offset=".55" stop-color="#121821" stop-opacity="1"/><stop offset="1" stop-color="#0B0E13"/></radialGradient></defs>
    <rect width="400" height="180" fill="url(#b${g})"/>
    ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${200 + i * 40} 0 L${120 + i * 40} 180" stroke="#fff" stroke-opacity=".035" stroke-width="16"/>`).join('')}
    <g transform="rotate(-8 290 100)">
      <rect x="170" y="96" width="240" height="7" rx="3.5" fill="#C9D2DB"/>
      <rect x="208" y="58" width="16" height="84" rx="4" fill="var(--accent)"/><rect x="226" y="68" width="12" height="64" rx="4" fill="#E9EEF2"/><rect x="198" y="90" width="10" height="20" rx="2" fill="#9AA6B2"/>
      <rect x="352" y="58" width="16" height="84" rx="4" fill="var(--accent)"/><rect x="338" y="68" width="12" height="64" rx="4" fill="#E9EEF2"/><rect x="368" y="90" width="10" height="20" rx="2" fill="#9AA6B2"/>
    </g>`,
  rings: g => `<defs><linearGradient id="g${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B1118"/><stop offset="1" stop-color="#16202B"/></linearGradient></defs>
    <rect width="400" height="180" fill="url(#g${g})"/>
    ${[78, 60, 44, 30, 18].map((r, i) => `<circle cx="310" cy="90" r="${r}" fill="none" stroke="var(--accent)" stroke-width="${i === 0 ? 3 : 2}" opacity="${0.25 + i * 0.17}" ${i % 2 ? '' : `stroke-dasharray="${r * 4.2} ${r * 2}"`} transform="rotate(${i * 50 - 90} 310 90)"/>`).join('')}
    <circle cx="310" cy="90" r="7" fill="var(--accent)"/>
    ${[[214, 36], [380, 160], [236, 150], [390, 28], [180, 96]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="var(--accent)" opacity=".55"/>`).join('')}`,
  stairs: g => `<defs><linearGradient id="t${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D1A1F"/><stop offset="1" stop-color="#173039"/></linearGradient></defs>
    <rect width="400" height="180" fill="url(#t${g})"/>
    <circle cx="352" cy="52" r="40" fill="var(--accent)" opacity=".12"/>
    ${[0, 1, 2, 3, 4].map(i => `<rect x="${196 + i * 38}" y="${150 - i * 20}" width="${210 - i * 38}" height="${40 + i * 20}" fill="#0A1418" opacity="${1 - i * .1}"/><rect x="${196 + i * 38}" y="${150 - i * 20}" width="38" height="3" fill="var(--accent)" opacity="${.35 + i * .15}"/>`).join('')}
    <path d="M384 70 L384 34" stroke="#E9F1F6" stroke-width="2.5"/><path d="M384 34 L398 40 L384 46 Z" fill="var(--accent)"/>
    <g stroke="#E9F1F6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="356" cy="40" r="5.5" fill="#E9F1F6" stroke="none"/><path d="M355 48 L352 60 L346 70"/><path d="M352 60 L360 70"/><path d="M354 52 L366 44"/><path d="M354 52 L344 56"/></g>`,
  night: g => `<defs><linearGradient id="n${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060A16"/><stop offset="1" stop-color="#18213F"/></linearGradient></defs>
    <rect width="400" height="180" fill="url(#n${g})"/>
    ${[[30, 20], [90, 50], [150, 18], [200, 70], [250, 30], [370, 60], [330, 14], [120, 90], [60, 110], [390, 110]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.2 : 1.8}" fill="#fff" opacity="${i % 2 ? .5 : .85}"/>`).join('')}
    <circle cx="306" cy="66" r="30" fill="#F4F1E6"/><circle cx="320" cy="56" r="27" fill="#0B1022"/>
    <circle cx="306" cy="66" r="52" fill="var(--accent)" opacity=".08"/>
    <path d="M0 180 L0 140 C70 116 120 150 200 132 C270 116 330 140 400 124 L400 180 Z" fill="#0A1020"/>
    <path d="M0 180 L0 160 C90 146 170 170 260 156 C320 148 360 160 400 152 L400 180 Z" fill="#070B17"/>`,
};
let artSeq = 0;
function artCard(scene, quote, { small = false, tag = '' } = {}) {
  const g = 'a' + (++artSeq);
  return `<figure class="art ${small ? 'small' : ''}"><svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${ART[scene](g)}</svg>
    <figcaption>${tag ? `<span class="tag">${esc(tag)}</span>` : ''}<q>${esc(quote)}</q></figcaption></figure>`;
}
const TRAIN_SCENES = ['summit', 'runner', 'barbell', 'rings', 'stairs'];

/* ---------- tabs / views ---------- */
let currentTab = 'today';
let timersSeg = 'wk';
const view = $('#view');
const TABS = [
  { id: 'today', label: 'Today', icon: 'home' },
  { id: 'timers', label: 'Train', icon: 'dumbbell' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar' },
  { id: 'progress', label: 'Progress', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
];
const MTABS = [
  { id: 'm-home', label: 'Overview', icon: 'wallet' },
  { id: 'm-txns', label: 'Entries', icon: 'list2' },
  { id: 'm-budget', label: 'Budget', icon: 'target' },
  { id: 'm-insights', label: 'Insights', icon: 'pie' },
  { id: 'm-settings', label: 'Settings', icon: 'gear' },
];
const moneyMode = () => S.mode === 'money';
// Bottom bar: two tabs, the big Start (or Add in Money) button, two tabs. Settings and search live at the top.
function renderTabs() {
  const list = (moneyMode() ? MTABS : TABS).filter(t => t.id !== 'settings' && t.id !== 'm-settings');
  const btn = t => `<button class="tab ${t.id === currentTab ? 'active' : ''}" data-tab="${t.id}"><span class="pill">${ic(t.icon)}</span>${t.label}</button>`;
  const mid = `<button class="tab tstart" data-start aria-label="${moneyMode() ? 'Add expense' : 'Start a workout'}"><span class="sbtn">${ic(moneyMode() ? 'plus' : 'play')}</span>${moneyMode() ? 'Add' : 'Start'}</button>`;
  $('#tabs').innerHTML = list.slice(0, 2).map(btn).join('') + mid + list.slice(2).map(btn).join('');
  try { $$('[data-mb="settings"]', modebar).forEach(b => b.classList.toggle('on', currentTab === 'settings' || currentTab === 'm-settings')); } catch (e) { /* modebar not built yet */ }
}
$('#tabs').addEventListener('click', e => {
  if (e.target.closest('[data-start]')) { tap(); return moneyMode() ? Money.quickAdd() : openStartSheet(); }
  const b = e.target.closest('[data-tab]'); if (b) { tap(); go(b.dataset.tab); }
});
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.btn.primary, .nu-go, .cplay, .qopt, .tring, .sgrid button')) tap(); }, true);
function tap(style = 'LIGHT') { if (!S.vibrate) return; try { if (P.Haptics) P.Haptics.impact({ style }); } catch (e) { /* ignore */ } }
function go(tab) { currentTab = tab; renderTabs(); render(); view.scrollTop = 0; view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
function render() {
  if (currentTab.startsWith('m-')) return Money.renderTab(currentTab.slice(2));
  ({ today: viewToday, timers: viewTimers, calendar: viewCalendar, progress: viewProgress, settings: viewSettings })[currentTab]();
}
// The Muscle | Money switch at the top of every main screen.
const modebar = el(`<div id="modebar"><button class="mbtn" data-mb="settings" aria-label="Settings">${ic('gear')}</button><div class="modeseg" role="tablist" aria-label="App section"><button data-mode="muscle" role="tab">${ic('dumbbell')}Muscle</button><button data-mode="money" role="tab"><span class="rs">₹</span>Money</button></div><button class="mbtn" data-mb="search" aria-label="Search">${ic('search')}</button></div>`);
$('#app').insertBefore(modebar, $('#view'));
function paintModebar() { $$('[data-mode]', modebar).forEach(b => { const on = b.dataset.mode === (S.mode || 'muscle'); b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); }
async function setMode(mode, quiet) {
  if (mode === 'money') return Money.openMoney();
  S.mode = 'muscle'; saveSettings();
  currentTab = 'today'; renderTabs(); paintModebar();
  if (!quiet) { render(); view.scrollTop = 0; }
}
modebar.addEventListener('click', e => {
  const mb = e.target.closest('[data-mb]');
  if (mb) { tap(); if (mb.dataset.mb === 'search') return openSearch(); return go(moneyMode() ? 'm-settings' : 'settings'); }
  const b = e.target.closest('[data-mode]'); if (b && b.dataset.mode !== (S.mode || 'muscle')) { tap(); setMode(b.dataset.mode); }
});

/* ---------- Start sheet (centre button) ---------- */
function openStartSheet() {
  const st = computeStats(); const day = plan && plan[new Date().getDay()]; const draft = DB.get('gymdraft', null);
  const nu = nextUp(st, day, draft);
  const recent = []; log.slice().sort((a, b) => b.at - a.at).forEach(x => { if (x.wk && !recent.includes(x.wk) && Coach.byId(x.wk)) recent.push(x.wk); });
  const s = sheet(`<h2>Start</h2>
    ${nu.act === 'pi' || nu.act === 'resume' ? `<button class="nextup sm" data-s="nu"><div class="nu-t"><span class="nu-tag">${esc(nu.tag)}</span><b>${esc(nu.title)}</b><span>${esc(nu.sub)}</span></div><span class="nu-go">${ic(nu.icon)}<span>${esc(nu.btn)}</span></span></button>` : ''}
    ${recent.length ? `<div class="sect">Do again</div><div class="block" style="padding:0">${recent.slice(0, 3).map(id => { const w = Coach.byId(id); return `<button class="wksrow" data-s="wk" data-id="${id}"><span class="wkth">${Moves.svgFor(w.blocks[0].items[0].name, { cls: 'th' })}</span><span class="wkt"><b>${esc(w.name)}</b><span>${w.blocks.reduce((a, b) => a + b.items.length, 0)} moves</span></span>${ic('play')}</button>`; }).join('')}</div>` : ''}
    <div class="sect">Quick start</div>
    <div class="sgrid">
      <button data-s="workouts">${ic('play')}<b>Guided workout</b></button><button data-s="gym">${ic('dumbbell')}<b>Gym log</b></button><button data-s="yoga">${ic('lotus')}<b>Yoga</b></button>
      <button data-s="rest">${ic('pausebars')}<b>Rest timer</b></button><button data-s="sw">${ic('stopwatch')}<b>Stopwatch</b></button><button data-s="timers">${ic('timer')}<b>My timers</b></button>
    </div>`);
  s.el.addEventListener('click', e => {
    const b = e.target.closest('[data-s]'); if (!b) return; s.close(); tap();
    setTimeout(() => {
      switch (b.dataset.s) {
        case 'nu': if (nu.act === 'resume') return openGym({}); return startPlanItem(day.items[nu.idx]);
        case 'wk': return Coach.openDetail(Coach.byId(b.dataset.id));
        case 'workouts': timersSeg = 'wk'; if (moneyMode()) setMode('muscle', true); return go('timers');
        case 'timers': timersSeg = 'mine'; return go('timers');
        case 'gym': return openGym({});
        case 'yoga': return Yoga.openPicker();
        case 'rest': return quickRestSheet();
        case 'sw': return startStopwatch();
      }
    }, 120);
  });
}

/* ---------- search everything ---------- */
const SETTINGS_INDEX = [
  ['Step goal', 'settings', 'goal'], ['Height', 'settings', 'height'], ['Units (kg / lb)', 'settings'], ['Theme & accent colour', 'settings'], ['Sounds & voice', 'settings'],
  ['Back up data', 'backup'], ['Restore backup', 'settings'], ['Customise Today screen', 'customise'], ['Weekly plan & reminders', 'plan'], ['My program', 'prog'],
  ['Salary day', 'm-settings'], ['Monthly budget', 'm-settings'], ['Money lock', 'm-settings'], ['Accounts', 'm-settings'], ['Savings goals', 'm-settings'], ['Friends & splits', 'm-settings'], ['Import PhonePe statement', 'm-settings'], ['Export spreadsheet', 'm-settings'],
];
function openSearch() {
  const scr = el(`<section class="screen srchscr"><header class="topbar srch"><button class="round-btn" data-a="close" aria-label="Back">${ic('chevL')}</button><input class="field body" id="sq" placeholder="Search exercises, workouts, payments…" autocomplete="off" enterkeyhint="search"></header><div class="scroll"><div class="page" id="sres"></div></div></section>`);
  layer.appendChild(scr);
  const close = () => { unback(); scr.remove(); };
  const unback = pushBack(close);
  const inp = $('#sq', scr); setTimeout(() => inp.focus(), 80);
  const row = (key, title, sub, right, icon) => `<button class="srow" data-k="${esc(key)}">${icon}<span class="wkt"><b>${esc(title)}</b><span>${esc(sub || '')}</span></span>${right ? `<span class="sr">${esc(right)}</span>` : ''}</button>`;
  const paint = () => {
    const q = inp.value.trim(); const k = q.toLowerCase(); const box = $('#sres', scr);
    if (!q) { box.innerHTML = `<div class="empty" style="padding-top:40px"><b>Search everything</b>Exercises and how-tos, workouts, timers, yoga routines, payments and settings.</div>`; return; }
    const ex = Moves.search(q, 6);
    const wks = [...Coach.mine, ...Coach.templates()].filter(w => w.name.toLowerCase().includes(k) || w.blocks.some(b => b.items.some(i => i.name.toLowerCase().includes(k)))).slice(0, 6);
    const tms = [...timers, ...allTemplates()].filter(t => t.name.toLowerCase().includes(k)).slice(0, 6);
    const tx = Money.searchTx(q);
    const sets = SETTINGS_INDEX.filter(x => x[0].toLowerCase().includes(k));
    const sec = (title, html) => html ? `<div class="sect">${title}</div><div class="block" style="padding:0">${html}</div>` : '';
    box.innerHTML = sec('Exercises', ex.map(n => row('ex:' + n, n, (Moves.get(n).muscles.map(m => Moves.MNAME[m]).filter(Boolean).slice(0, 3).join(', ')), '', `<span class="wkth">${Moves.svgFor(n, { cls: 'th' })}</span>`)).join(''))
      + sec('Workouts', wks.map(w => row('wk:' + w.id, w.name, w.tpl ? 'Template' : 'My workout', '', `<span class="sico">${ic('play')}</span>`)).join(''))
      + sec('Timers & yoga', tms.map(t => row('tm:' + t.id, t.name, t.yoga ? 'Yoga & mobility' : fmt(totalOf(t)), '', `<span class="sico">${ic(t.yoga ? 'lotus' : 'timer')}</span>`)).join(''))
      + (tx === null ? sec('Payments', `<div class="empty" style="padding:14px">Unlock Money to search payments.</div>`) : sec('Payments', (tx || []).map(t => row('tx:' + t.id, t.title, t.sub, t.amt, `<span class="sico rs">₹</span>`)).join('')))
      + sec('Settings', sets.map(x => row('st:' + x[1] + ':' + (x[2] || ''), x[0], x[1].startsWith('m-') ? 'Money settings' : 'Settings', '', `<span class="sico">${ic('gear')}</span>`)).join(''))
      || `<div class="empty" style="padding-top:40px">Nothing found for "${esc(q)}".</div>`;
    Moves.mount(box);
  };
  paint(); inp.addEventListener('input', paint);
  scr.addEventListener('click', e => {
    if (e.target.closest('[data-a="close"]')) return close();
    const r = e.target.closest('[data-k]'); if (!r) return;
    const [type, ...rest] = r.dataset.k.split(':'); const v = rest.join(':');
    if (type === 'ex') return Moves.howTo(v);
    if (type === 'wk') { close(); return Coach.openDetail(Coach.byId(v)); }
    if (type === 'tm') { close(); const t = findTimer(v); if (t && t.yoga) return Yoga.showRoutine(t.id); return t && startTimer(t); }
    if (type === 'tx') return Money.editTx(v);
    if (type === 'st') {
      close();
      const [where] = v.split(':');
      if (where === 'backup') return exportBackup();
      if (where === 'customise') { if (moneyMode()) setMode('muscle', true); go('today'); return customiseToday(); }
      if (where === 'plan') return openPlanEditor();
      if (where === 'prog') { timersSeg = 'prog'; if (moneyMode()) setMode('muscle', true); return go('timers'); }
      if (where === 'm-settings') return Money.openMoney('settings');
      if (moneyMode()) setMode('muscle', true);
      return go('settings');
    }
  });
}

/* ---------- welcome / first run ---------- */
function maybeOnboard() {
  if (S.onboarded) return;
  if (log.length || body.length || Money.data.setup || Coach.mine.length || timers.length > 3) { S.onboarded = true; saveSettings(); return; }
  openOnboarding();
}
function openOnboarding() {
  const a = { name: S.name || '', kg: '', cm: S.height || '', unit: S.unit || 'kg', goal: 'fit', stepGoal: S.stepGoal || 8000, money: true, cycleDay: 1, budget: '' };
  let step = 0; const N = 4;
  const scr = el(`<section class="screen onb"><div class="onb-top"><div class="qprog"><i id="obar"></i></div><button class="linkbtn" data-a="skip">Skip</button></div><div class="scroll"><div class="page" id="ob"></div></div>
    <div class="gym-bar"><button class="btn" data-a="back">Back</button><button class="btn primary" data-a="next" id="onext">Next</button></div></section>`);
  layer.appendChild(scr);
  const close = () => { unback(); scr.remove(); S.onboarded = true; saveSettings(); render(); };
  const unback = pushBack(() => {});
  const chip = (k, v, label, sub) => `<button class="qopt ${a[k] === v ? 'on' : ''}" data-k="${k}" data-v="${v}"><span class="qt"><b>${label}</b>${sub ? `<span>${sub}</span>` : ''}</span><span class="qc">${ic('check')}</span></button>`;
  const paint = () => {
    $('#obar', scr).style.width = ((step + 1) / N * 100) + '%';
    $('[data-a="back"]', scr).style.visibility = step ? 'visible' : 'hidden';
    $('#onext', scr).textContent = step === N - 1 ? 'Start using the app' : 'Next';
    const ob = $('#ob', scr);
    if (step === 0) ob.innerHTML = `<div class="onb-hero">${Moves.svgFor('Jumping Jacks', { cls: 'big' })}</div><h1 class="onb-h">Welcome to Muscle &amp; Money</h1><p class="sub" style="text-align:left">Workouts, steps, sleep and food on one side. Your spending on the other. Everything stays on this phone.</p>
      <div class="sect">What should we call you?</div><input class="field body" id="on" placeholder="Your first name" maxlength="20" value="${esc(a.name)}">`;
    if (step === 1) ob.innerHTML = `<h1 class="onb-h">About you</h1><p class="sub" style="text-align:left">Used for protein and water targets, step distance and calories.</p>
      <div class="seg" style="background:var(--surface-2)"><button class="${a.unit === 'kg' ? 'on' : ''}" data-u="kg">kg · cm</button><button class="${a.unit === 'lb' ? 'on' : ''}" data-u="lb">lb · in</button></div>
      <div class="sect">Weight</div><div class="unit-in"><input class="field body" id="okg" inputmode="decimal" placeholder="${a.unit === 'lb' ? '160' : '72'}" value="${esc(String(a.kg))}"><span>${a.unit}</span></div>
      <div class="sect">Height</div><div class="unit-in"><input class="field body" id="ocm" inputmode="decimal" placeholder="${a.unit === 'lb' ? '68' : '172'}" value="${a.cm ? esc(String(a.unit === 'lb' ? Math.round(a.cm / 2.54) : a.cm)) : ''}"><span>${a.unit === 'lb' ? 'in' : 'cm'}</span></div>`;
    if (step === 2) ob.innerHTML = `<h1 class="onb-h">Your main goal</h1>
      ${chip('goal', 'muscle', 'Build muscle', 'Strength workouts and progress tracking')}${chip('goal', 'fat', 'Lose fat', 'Conditioning, steps and protein')}${chip('goal', 'fit', 'Get fit & healthy', 'A bit of everything')}${chip('goal', 'mobility', 'Move better', 'Yoga and mobility first')}
      <div class="sect">Daily step goal</div><div class="presets" style="justify-content:flex-start">${[5000, 8000, 10000, 12000].map(v => `<button class="chip small ${a.stepGoal === v ? 'on' : ''}" data-sg="${v}">${v.toLocaleString('en-IN')}</button>`).join('')}</div>`;
    if (step === 3) ob.innerHTML = `<h1 class="onb-h">Money (optional)</h1><p class="sub" style="text-align:left">Track spending from your salary day to the next. You can set this up later too.</p>
      ${chip('money', true, 'Set it up now', 'Salary day and monthly budget')}${chip('money', false, 'Maybe later', 'Only the fitness side for now')}
      <div id="omoney" ${a.money ? '' : 'hidden'}><div class="sect">Salary day</div><div class="daygrid">${Array.from({ length: 31 }, (_, i) => `<button class="${a.cycleDay === i + 1 ? 'on' : ''}" data-cd="${i + 1}">${i + 1}</button>`).join('')}</div>
      <div class="sect">Monthly budget</div><div class="amt"><span>₹</span><input id="obud" inputmode="numeric" placeholder="40000" value="${esc(String(a.budget))}"></div></div>`;
    Moves.mount(ob);
  };
  const read = () => {
    if (step === 0) a.name = ($('#on', scr) || {}).value ? $('#on', scr).value.trim() : a.name;
    if (step === 1) { const kg = parseFloat($('#okg', scr).value), cm = parseFloat($('#ocm', scr).value); a.kg = isNaN(kg) ? '' : kg; a.cm = isNaN(cm) ? '' : (a.unit === 'lb' ? cm * 2.54 : cm); }
    if (step === 3 && a.money) { const b = parseFloat($('#obud', scr).value); a.budget = isNaN(b) ? '' : b; }
  };
  const finish = () => {
    S.name = a.name; S.unit = a.unit; S.goal = a.goal; S.stepGoal = a.stepGoal;
    if (a.cm) S.height = Math.round(a.cm);
    if (a.kg) { const kg = a.unit === 'lb' ? a.kg / KG_LB : a.kg; body.push({ id: uid(), at: Date.now(), date: dkey(new Date()), kg: Math.round(kg * 10) / 10 }); saveBody(); }
    if (a.money && a.budget >= 100) { const m = Money.data; m.setup = true; m.cycleDay = a.cycleDay; m.budget = Math.round(a.budget); Money.data = m; }
    saveSettings(); close();
    toast(a.name ? `All set, ${a.name}! 💪` : 'All set! 💪');
  };
  paint();
  scr.addEventListener('click', e => {
    const o = e.target.closest('[data-k]'); if (o) { a[o.dataset.k] = o.dataset.v === 'true' ? true : o.dataset.v === 'false' ? false : o.dataset.v; return paint(); }
    const u = e.target.closest('[data-u]'); if (u) { read(); a.unit = u.dataset.u; return paint(); }
    const sg = e.target.closest('[data-sg]'); if (sg) { a.stepGoal = +sg.dataset.sg; return paint(); }
    const cd = e.target.closest('[data-cd]'); if (cd) { read(); a.cycleDay = +cd.dataset.cd; return paint(); }
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'skip') return close();
    if (b.dataset.a === 'back') { read(); step = Math.max(0, step - 1); return paint(); }
    if (b.dataset.a === 'next') { read(); tap(); if (step === N - 1) return finish(); step++; paint(); }
  });
}
view.addEventListener('click', e => { if (currentTab.startsWith('m-')) Money.handleClick(e); });
function rerenderKeepScroll() { const t = view.scrollTop; render(); view.scrollTop = t; }
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
const findTimer = id => timers.find(t => t.id === id) || allTemplates().find(t => t.id === id);

/* ---------- Today ---------- */
function computeStats() {
  const days = new Set(log.map(x => x.date));
  const today = today0();
  let cur = 0; let d = new Date(today);
  if (!days.has(dkey(d))) d = addDays(d, -1);
  while (days.has(dkey(d))) { cur++; d = addDays(d, -1); }
  let best = 0, run = 0, prev = null;
  [...days].sort().forEach(k => { const dt = parseKey(k); run = prev && Math.round((dt - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = dt; });
  const offset = (today.getDay() - S.weekStart + 7) % 7;
  const weekStart = addDays(today, -offset);
  const inRange = (from, to) => log.filter(x => { const dt = parseKey(x.date); return dt >= from && dt < to; });
  const wk = inRange(weekStart, addDays(weekStart, 7));
  const mStart = new Date(today.getFullYear(), today.getMonth(), 1), mEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const mo = inRange(mStart, mEnd);
  const sum = a => a.reduce((s, x) => s + (x.dur || 0), 0);
  const bars = []; for (let i = 0; i < 7; i++) { const dt = addDays(weekStart, i); const k = dkey(dt); bars.push({ k, dt, label: WD[dt.getDay()][0], mins: Math.round(sum(log.filter(x => x.date === k)) / 60), today: k === dkey(today), future: dt > today }); }
  return { days, cur, best, weekStart, wkCount: new Set(wk.map(x => x.date)).size, wkSessions: wk.length, wkMin: sum(wk), moCount: mo.length, moDays: new Set(mo.map(x => x.date)).size, moMin: sum(mo), bars, doneToday: days.has(dkey(today)) };
}

function itemDoneToday(it) {
  const k = dkey(new Date());
  const todays = log.filter(x => x.date === k);
  if (it.type === 'gym') return todays.some(x => x.kind === 'gym');
  if (it.type === 'prog') return todays.some(x => x.prog && x.prog.key === it.key);
  return todays.some(x => x.title === it.name);
}
const itemIcon = t => t === 'timer' ? 'timer' : t === 'gym' || t === 'prog' ? 'dumbbell' : 'run';

/* Today: greeting, Next up, rings, then cards in your own order. */
const TODAY_CARDS = [
  ['money', 'Money left & safe to spend'], ['ready', 'Sleep & readiness'], ['plan', "Today's plan"], ['checkin', 'Daily check-in'],
  ['fuel', 'Protein & water buttons'], ['program', 'My program'], ['steps', 'Steps details'], ['quick', 'Quick start'], ['quote', 'Quote of the day'], ['last', 'Last workout'],
];
function todayOrder() {
  const saved = Array.isArray(S.todayOrder) ? S.todayOrder.filter(id => TODAY_CARDS.some(c => c[0] === id)) : [];
  return [...saved, ...TODAY_CARDS.map(c => c[0]).filter(id => !saved.includes(id))];
}
const RING_R = 24, RING_L = 2 * Math.PI * RING_R;
function miniRing(id, label, val, sub, pct, color, off) {
  return `<button class="tring ${off ? 'off' : ''}" data-ring="${id}" aria-label="${esc(label)}: ${esc(val)}"><span class="trw"><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="${RING_R}" class="trk"/><circle cx="30" cy="30" r="${RING_R}" class="bar" style="stroke:${color};stroke-dasharray:${RING_L.toFixed(1)};stroke-dashoffset:${(RING_L * (1 - Math.min(1, pct))).toFixed(1)}"/></svg>
    <b>${esc(val)}</b></span><span class="trl">${esc(label)}</span><small>${esc(sub)}</small></button>`;
}
function paintRings() { const r = $('.trings', view); if (r) r.outerHTML = ringsHtml(); }
function ringsHtml() {
  const h = Health.today();
  const steps = STP.today || stepsOn(dkey(new Date()));
  const k = n => n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(n));
  return `<div class="trings">
    ${miniRing('steps', 'Steps', STP.enabled || steps ? k(steps) : 'Off', STP.enabled || steps ? `of ${k(S.stepGoal)}` : 'Tap to turn on', S.stepGoal ? steps / S.stepGoal : 0, 'var(--accent)', !STP.enabled && !steps)}
    ${miniRing('protein', 'Protein', Math.round(h.p) + 'g', `of ${h.tp} g`, h.tp ? h.p / h.tp : 0, '#FF9F1C')}
    ${miniRing('water', 'Water', String(Math.round(h.w / 100) / 10).replace(/\.0$/, '') + 'L', `of ${String(h.tw / 1000).replace(/\.0+$/, '')} L`, h.tw ? h.w / h.tw : 0, '#4D8DFF')}
    ${miniRing('sleep', 'Sleep', h.slept ? `${Math.floor(h.sleepH)}h${pad(Math.round((h.sleepH % 1) * 60))}` : 'Log', h.ready ? `ready ${h.ready.score}` : 'last night', h.sleepH / 8, '#9D8CFF', !h.slept)}
  </div>`;
}
function nextUp(st, day, draft) {
  const dow = new Date().getDay();
  if (draft) return { tag: 'In progress', title: draft.title || 'Gym workout', sub: `${draft.exercises.length} exercises logged so far`, btn: 'Resume', act: 'resume', icon: 'dumbbell' };
  if (hasPlan() && day && !day.rest && day.items.length) {
    const i = day.items.findIndex(it => !itemDoneToday(it));
    if (i >= 0) {
      const it = day.items[i]; const t = it.type === 'timer' ? findTimer(it.ref) : null; const pi = it.type === 'prog' ? Program.sessionInfo(it.key) : null;
      const sub = it.type === 'timer' ? (t ? `${Yoga.timers.some(y => y.id === it.ref) ? 'Yoga' : 'Timer'} · ${Math.round(totalOf(t) / 60)} min` : '') : it.type === 'prog' && pi ? `Week ${pi.week} of ${pi.weeks} · ${pi.n} exercises · ~${pi.min} min` : it.type === 'gym' ? 'Gym session' : 'From your weekly plan';
      return { tag: `Today · ${WDL[dow]}`, title: it.name, sub, btn: 'Start', act: 'pi', idx: i, icon: it.type === 'timer' ? 'timer' : 'play', more: day.items.length > 1 ? `${day.items.length - i - 1} more after this` : '' };
    }
    return { tag: 'All done', title: 'Today’s plan is complete', sub: `${st.cur}-day streak. Rest well or add a short stretch.`, btn: 'Stretch', act: 'yoga', icon: 'lotus', done: true };
  }
  if (hasPlan() && (!day || day.rest)) return { tag: 'Rest day', title: 'Recover and recharge', sub: 'A gentle yoga flow helps you bounce back faster.', btn: 'Yoga', act: 'yoga', icon: 'lotus', calm: true };
  return { tag: 'Ready when you are', title: 'Pick a guided workout', sub: 'Dumbbells, barbell or no equipment. The voice counts every rep.', btn: 'Browse', act: 'workouts', icon: 'play', alt: 'Plan my week', altAct: 'plan' };
}
function viewToday() {
  const st = computeStats();
  const now = new Date();
  const h = now.getHours();
  const hi = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const dow = now.getDay();
  const day = plan && plan[dow];
  const draft = DB.get('gymdraft', null);
  const last = log.slice().sort((a, b) => b.at - a.at)[0];
  const daysSinceBackup = S.lastBackup ? Math.floor((Date.now() - S.lastBackup) / 864e5) : null;
  const needBackup = log.length >= 5 && (daysSinceBackup === null || daysSinceBackup >= 14);
  const nu = nextUp(st, day, draft);
  let planHtml;
  if (!hasPlan()) {
    planHtml = `<div class="rest-day"><b>No weekly plan yet.</b> Pick what you train on each day and get a reminder at your chosen time.</div>
      <div style="padding:0 16px 16px"><button class="btn primary" data-a="plan">Plan my week</button></div>`;
  } else if (!day || day.rest) {
    const nextIdx = [1, 2, 3, 4, 5, 6].map(i => (dow + i) % 7).find(d => plan[d] && !plan[d].rest && plan[d].items.length);
    planHtml = `<div class="rest-day"><b>Rest day.</b> Recovery is part of training.${nextIdx != null ? ` Next up on ${WDL[nextIdx]}: ${esc(plan[nextIdx].items.map(i => i.name).join(', '))}.` : ''}</div>`;
  } else if (!day.items.length) {
    planHtml = `<div class="rest-day">Nothing planned for today. Tap <b>Edit plan</b> to add something.</div>`;
  } else {
    planHtml = day.items.map((it, i) => {
      const done = itemDoneToday(it);
      const t = it.type === 'timer' ? findTimer(it.ref) : null;
      const pi = it.type === 'prog' ? Program.sessionInfo(it.key) : null;
      const sub = it.type === 'timer' ? (t ? `Timer · ${fmt(totalOf(t))}` : 'Timer not found') : it.type === 'gym' ? 'Gym session · sets & reps' : it.type === 'prog' ? (pi ? `Week ${pi.week}/${pi.weeks}${pi.deload ? ' · Deload' : ''} · ${pi.n} exercises · ~${pi.min} min` : 'Program ended') : 'Activity';
      return `<div class="pitem ${done ? 'done' : ''}"><span class="pi">${ic(it.type === 'timer' && Yoga.timers.some(t => t.id === it.ref) ? 'lotus' : itemIcon(it.type))}</span><span class="pt"><b>${esc(it.name)}</b><span>${done ? 'Done today ✓' : sub}</span></span>
        <button class="go" data-pi="${i}">${done ? 'Again' : it.type === 'note' ? 'Log' : 'Start'}</button></div>`;
    }).join('');
  }
  const rest = hasPlan() && (!day || day.rest);
  const CARD = {
    money: () => Money.todayChip(),
    ready: () => Health.sleepCardHtml(),
    plan: () => `<div><div class="sect">Today's plan</div><div class="plan-card"><div class="ph"><span class="t">${WDL[dow].toUpperCase()}</span>${hasPlan() ? '<button data-a="plan">Edit plan</button>' : ''}</div>${planHtml}</div></div>`,
    checkin: () => Health.checkinHtml(),
    fuel: () => Health.fuelHtml(),
    program: () => (Program.programCardHtml() || Program.levelNudge() ? `<div>${Program.programCardHtml()}${Program.levelNudge()}</div>` : ''),
    steps: () => stepsCardHtml(),
    quick: () => `<div><div class="sect">Quick start</div><div class="quick">
      <button class="qa" data-a="workouts"><span class="qi">${ic('play')}</span><b>Guided workouts</b><span>Templates or build your own</span></button>
      <button class="qa" data-a="gym"><span class="qi">${ic('dumbbell')}</span><b>Gym log</b><span>Sets, reps &amp; weight</span></button>
      <button class="qa" data-a="yoga"><span class="qi">${ic('lotus')}</span><b>Yoga &amp; mobility</b><span>Follow-along flows</span></button>
      <button class="qa" data-a="rest"><span class="qi">${ic('pausebars')}</span><b>Rest timer</b><span>:30 to 4:00</span></button>
      <button class="qa" data-a="sw"><span class="qi">${ic('stopwatch')}</span><b>Stopwatch</b><span>Count up with laps</span></button>
      <button class="qa" data-a="weight"><span class="qi">${ic('scale')}</span><b>Log weight</b><span>${body.length ? `Last: ${wOut(latestBody().kg)} ${wUnit()}` : 'Track your body weight'}</span></button>
    </div></div>`,
    quote: () => artCard(rest ? 'night' : TRAIN_SCENES[dayIndex(TRAIN_SCENES.length, 3)], rest ? pickQuote('rest') : pickQuote('train'), { tag: rest ? 'Rest day' : 'Today’s push', small: true }),
    last: () => (last ? `<div><div class="sect">Last workout</div>${entryCard(last)}</div>` : ''),
  };
  const hidden = new Set(S.todayHidden || []);
  const cards = todayOrder().filter(id => !hidden.has(id)).map(id => CARD[id]()).filter(Boolean).map(x => `<div class="tcardw">${x}</div>`).join('');
  view.innerHTML = `<div class="page today" style="padding-top:12px">
    <div class="hello2"><div><div class="hi">${hi}${S.name ? ', ' + esc(S.name) : ''}</div><div class="dt">${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
      <button class="streak2" data-a="cal" aria-label="${st.cur} day streak"><span>🔥</span><b>${st.cur}</b></button></div>
    <div class="week">${st.bars.map(b => {
      const planned = plan && plan[b.dt.getDay()] && !plan[b.dt.getDay()].rest && plan[b.dt.getDay()].items.length;
      const done = st.days.has(b.k);
      return `<div class="w ${done ? 'done' : ''} ${b.today ? 'today' : ''} ${planned && !done ? 'plan' : ''}">${WD[b.dt.getDay()].slice(0, 2)}<i>${done ? ic('check') : b.dt.getDate()}</i></div>`;
    }).join('')}</div>
    <div class="nextup ${nu.done ? 'done' : ''} ${nu.calm ? 'calm' : ''}">
      <div class="nu-t"><span class="nu-tag">${esc(nu.tag)}</span><b>${esc(nu.title)}</b><span>${esc(nu.sub)}${nu.more ? ' · ' + esc(nu.more) : ''}</span>
        ${nu.alt ? `<button class="nu-alt" data-a="${nu.altAct}">${esc(nu.alt)} →</button>` : ''}</div>
      <button class="nu-go" data-a="nu">${ic(nu.icon)}<span>${esc(nu.btn)}</span></button>
    </div>
    ${ringsHtml()}
    ${draft && nu.act !== 'resume' ? `<button class="nudge" data-a="resume" style="border-color:var(--accent-line)">${ic('dumbbell')}<span><b>Gym workout in progress.</b> ${esc(draft.title || 'Gym workout')} · ${draft.exercises.length} exercises. Tap to continue.</span></button>` : ''}
    ${cards}
    ${needBackup ? `<button class="nudge" data-a="backup">${ic('upload')}<span><b>Back up your data.</b> ${daysSinceBackup === null ? 'You haven\'t made a backup yet.' : `Last backup was ${daysSinceBackup} days ago.`} Takes 5 seconds.</span></button>` : ''}
    <button class="tcustom" data-a="customise">${ic('sliders')}Customise this screen</button>
  </div>`;
  view.querySelector('.page').addEventListener('click', e => {
    const hh = e.target.closest('[data-h]'); if (hh) return Health.handle(hh);
    const rg = e.target.closest('[data-ring]');
    if (rg) { const r = rg.dataset.ring; if (r === 'steps') return STP.enabled ? go('progress') : enableSteps(); if (r === 'sleep') return Health.handle({ dataset: { h: 'sleep' } }); return Health.handle({ dataset: { h: 'nut' } }); }
    const pi = e.target.closest('[data-pi]');
    if (pi) return startPlanItem(day.items[+pi.dataset.pi]);
    const eid = e.target.closest('[data-eid]');
    if (eid) return openEntry(log.find(x => x.id === eid.dataset.eid));
    const b = e.target.closest('[data-a]'); if (!b) return;
    switch (b.dataset.a) {
      case 'nu':
        if (nu.act === 'pi') return startPlanItem(day.items[nu.idx]);
        if (nu.act === 'resume') return openGym({});
        if (nu.act === 'yoga') return Yoga.openPicker();
        if (nu.act === 'workouts') { timersSeg = 'wk'; return go('timers'); }
        return;
      case 'cal': return go('calendar');
      case 'customise': return customiseToday();
      case 'plan': return openPlanEditor();
      case 'gym': return openGym({});
      case 'resume': return openGym({});
      case 'sw': return startStopwatch();
      case 'rest': return quickRestSheet();
      case 'weight': return openBodyEntry(null);
      case 'yoga': return Yoga.openPicker();
      case 'myprog': timersSeg = 'prog'; return go('timers');
      case 'workouts': timersSeg = 'wk'; return go('timers');
      case 'money': return Money.openMoney('home');
      case 'backup': return exportBackup();
      case 'steps-on': return enableSteps();
      case 'prog-new': case 'prog-next': case 'prog-level': return Program.handleAction(b.dataset.a, b);
      case 'steps-go': return go('progress');
    }
  });
  paintStepsCard();
}
function customiseToday() {
  let order = todayOrder(); const hidden = new Set(S.todayHidden || []);
  const s = sheet(`<h2>Customise Today</h2><p class="sub">Show, hide and reorder the cards. Next up and the rings always stay on top.</p><div class="block" style="padding:0" id="tcl"></div>
    <div class="btns two"><button class="btn" data-a="reset">Reset</button><button class="btn primary" data-a="ok">Done</button></div>`);
  const paint = () => { $('#tcl', s.el).innerHTML = order.map((id, i) => { const c = TODAY_CARDS.find(x => x[0] === id); return `<div class="tcrow ${hidden.has(id) ? 'off' : ''}"><button class="tctog" data-tg="${id}" aria-label="Show or hide"><span class="toggle sm ${hidden.has(id) ? '' : 'on'}"></span></button><span class="tcn">${esc(c[1])}</span><button class="round-btn sm" data-up="${i}" aria-label="Move up" ${i ? '' : 'disabled'}>${ic('chevU')}</button><button class="round-btn sm" data-dn="${i}" aria-label="Move down" ${i < order.length - 1 ? '' : 'disabled'}>${ic('chevD')}</button></div>`; }).join(''); };
  paint();
  s.el.addEventListener('click', e => {
    const tg = e.target.closest('[data-tg]'); if (tg) { const id = tg.dataset.tg; hidden.has(id) ? hidden.delete(id) : hidden.add(id); return paint(); }
    const up = e.target.closest('[data-up]'); if (up) { const i = +up.dataset.up; [order[i - 1], order[i]] = [order[i], order[i - 1]]; return paint(); }
    const dn = e.target.closest('[data-dn]'); if (dn) { const i = +dn.dataset.dn; [order[i + 1], order[i]] = [order[i], order[i + 1]]; return paint(); }
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'reset') { order = TODAY_CARDS.map(c => c[0]); hidden.clear(); return paint(); }
    S.todayOrder = order; S.todayHidden = [...hidden]; saveSettings(); s.close(); rerenderKeepScroll(); toast('Today screen updated');
  });
}

function startPlanItem(it) {
  if (!it) return;
  if (it.type === 'timer') { const t = findTimer(it.ref); if (!t) { toast('That timer was deleted. Edit your plan.'); return; } return startTimer(t); }
  if (it.type === 'gym') return openGym({ title: it.name });
  if (it.type === 'prog') { if (!Program.sessionInfo(it.key)) { toast('This program has ended. Edit your plan.'); return; } return openGym({ progKey: it.key }); }
  openEntry(null, { title: it.name, cat: 'Other', date: dkey(new Date()) });
}

/* ---------- Timers ---------- */
const trainSeg = cur => `<div class="seg seg4">${[['wk', 'Workouts'], ['mine', 'Timers'], ['prog', 'Program'], ['tpl', 'Templates']].map(([k, n]) => `<button class="${cur === k ? 'on' : ''}" data-seg="${k}">${n}</button>`).join('')}</div>`;
function viewWorkouts() {
  view.innerHTML = topbar('Train') + `<div class="page">${trainSeg('wk')}${Coach.listHtml()}</div>`;
  view.querySelector('.page').addEventListener('click', e => {
    const sg = e.target.closest('[data-seg]'); if (sg) { timersSeg = sg.dataset.seg; return render(); }
    Coach.handleList(e);
  });
}
function viewTimers() {
  if (timersSeg === 'prog') return viewProgramTab();
  if (timersSeg === 'wk') return viewWorkouts();
  const mine = timersSeg === 'mine';
  view.innerHTML = topbar('Train') + `<div class="page">
    ${trainSeg(timersSeg)}
    ${mine ? `
    <div class="sect">Quick rest</div>
    <div class="chips" id="quick">${[30, 45, 60, 90, 120, 180].map(s => `<button class="chip" data-s="${s}">${fmtShort(s)}</button>`).join('')}</div>
    <div class="sect">Timers</div>
    <div class="tcard" data-id="__sw">
      <span class="bar" style="background:${PHASE.prepare}"></span>
      <button class="main" data-act="sw"><span class="row1"><span style="color:${PHASE.prepare}">${ic('stopwatch', 'ico')}</span><span class="name">My Stopwatch</span></span></button>
    </div>
    <div id="list">${timers.map(t => timerCard(t)).join('')}</div>
    ${timers.length ? '' : `<div class="empty"><b>No timers yet</b>Tap + to build one, or save one from Templates.</div>`}`
    : TEMPLATES.map(g => `<div class="sect">${esc(g.group)}</div>${g.items.map(t => timerCard(t)).join('')}`).join('')}
  </div>
  ${mine ? `<button class="fab" id="add" aria-label="New timer">${ic('plus')}</button>` : ''}`;
  if (mine) $('#add').onclick = () => openEditor(null);
  view.querySelector('.page').addEventListener('click', e => {
    const sg = e.target.closest('[data-seg]');
    if (sg) { timersSeg = sg.dataset.seg; return render(); }
    const q = e.target.closest('[data-s]');
    if (q) return startRest(+q.dataset.s);
    const b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'sw') return startStopwatch();
    const id = b.closest('.tcard').dataset.id;
    if (mine) {
      const t = timers.find(x => x.id === id); if (!t) return;
      if (b.dataset.act === 'start') return startTimer(t);
      menu(t.name, [
        { icon: 'play', label: 'Start', run: () => startTimer(t) },
        { icon: 'edit', label: 'Edit', run: () => openEditor(t) },
        { icon: 'copy', label: 'Duplicate', run: () => { const c = clone(t); c.id = uid(); c.name = t.name + ' copy'; timers.splice(timers.indexOf(t) + 1, 0, c); saveTimers(); render(); } },
        { icon: 'chevU', label: 'Move up', run: () => { const i = timers.indexOf(t); if (i > 0) { timers.splice(i, 1); timers.splice(i - 1, 0, t); saveTimers(); render(); } } },
        { icon: 'trash', label: 'Delete', danger: true, run: async () => { if (await confirmBox('Delete timer?', `"${t.name}" will be removed.`, [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { timers = timers.filter(x => x !== t); saveTimers(); render(); } } },
      ]);
    } else {
      const t = allTemplates().find(x => x.id === id);
      if (b.dataset.act === 'start') return startTimer(t);
      const copy = () => { const c = clone(t); c.id = uid(); c.sets.forEach(s => { s.id = uid(); s.intervals.forEach(v => (v.id = uid())); }); return c; };
      menu(t.name, [
        { icon: 'play', label: 'Start', run: () => startTimer(t) },
        { icon: 'heart', label: 'Save to My Timers', run: () => { timers.push(copy()); saveTimers(); toast('Saved to My Timers'); } },
        { icon: 'edit', label: 'Customize a copy', run: () => openEditor(copy(), { isNew: true }) },
      ]);
    }
  });
}

function viewProgramTab() {
  view.innerHTML = topbar('Train') + `<div class="page">${trainSeg('prog')}<div id="progbox"></div></div>`;
  Program.viewTab($('#progbox'));
  view.querySelector('.page').addEventListener('click', e => {
    const sg = e.target.closest('[data-seg]'); if (sg) { timersSeg = sg.dataset.seg; return render(); }
    const g = e.target.closest('[data-guide]'); if (g) return Program.guide(g.dataset.guide);
    const yr = e.target.closest('[data-yr]'); if (yr) return Yoga.showRoutine(yr.dataset.yr);
    const b = e.target.closest('[data-a]'); if (b) Program.handleAction(b.dataset.a, b);
  });
}

/* ---------- timer editor ---------- */
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
          <button class="row tap" data-a="rounds" data-si="${si}" style="border-top:1px solid var(--line)"><span class="ri" style="color:var(--accent-text)">${ic('rounds')}</span><span class="rt"><div class="t">Rounds</div><div class="s">One round is all intervals in this set</div></span><span class="rv">${s.rounds}</span>${ic('chevR', 'chev')}</button>
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
        saveTimers(); close(true);
        if (currentTab !== 'timers') { timersSeg = 'mine'; go('timers'); } else { timersSeg = 'mine'; render(); }
        toast('Timer saved');
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
const RING_C = 2 * Math.PI * 47;
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
        if (S.countdown && sec <= 3 && sec >= 1 && st.dur >= 5 && st.kind !== 'ease') {
          if (S.voiceCount && S.voice) say(String(sec)); else Snd.tick();
        }
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
  return {
    mode, timer, steps, cum, total: cum[cum.length - 1], base: 0, since: 0, running: false, idx: -1, lastSec: null, laps: [], resync: false, locked: false,
    elapsed() { return this.base + (this.running ? Date.now() - this.since : 0); },
    locate(e) { let i = 0; while (i < this.steps.length - 1 && e >= this.cum[i + 1]) i++; return i; },
    seek(ms) { this.base = clamp(ms, 0, this.total || ms); if (this.running) this.since = Date.now(); this.idx = -1; this.resync = !this.running; },
  };
}

function startTimer(t, { autostart = false } = {}) {
  if (totalOf(t) < 1) { toast('This timer has no intervals'); return; }
  openRun(makeRun(clone(t), 'timer'));
  if (autostart) togglePlay();
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
        ${sw ? `<button data-a="swreset">${ic('reset')}<span>RESET</span></button>` : `<button data-a="edit">${ic('sliders')}<span>EDIT</span></button>`}
        <button data-a="lock" class="lockbtn" aria-label="Lock screen">${ic('unlock')}<span>LOCK</span></button>
        <button data-a="sound"><span>${S.beeps || S.voice ? 'SOUND' : 'MUTED'}</span>${ic(S.beeps || S.voice ? 'sound' : 'mute')}</button>
      </div>
      <div class="run-center">
        <div class="ring-wrap ${R.timer.yoga ? 'has-fig' : ''}">
          <svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" r="47"/><circle class="bar" id="rring" cx="50" cy="50" r="47" stroke-dasharray="${RING_C}" stroke-dashoffset="${RING_C}"/></svg>
          ${R.timer.yoga ? '<div class="run-fig" id="rfig"></div><div class="breath" id="rbreath"></div>' : ''}
          <div class="run-label" id="rlabel"></div>
          <div class="run-digits" id="rdig">00:00</div>
          <div class="run-sub" id="rsub"></div>
        </div>
        ${sw ? '<div class="laps" id="rlaps"></div>' : ''}
        <div class="run-hint" id="rhint">Tap anywhere to start</div>
      </div>
      <div class="run-foot">
        ${sw ? '<span></span>' : `<button data-a="prev" aria-label="Previous interval">${ic('prev')}</button><button data-a="inspect"><span>INSPECT INTERVALS</span>${ic('list')}</button><button data-a="next" aria-label="Next interval">${ic('next')}</button>`}
      </div>
    </div>
    <div class="run-next" id="rnext"><span class="k" id="rnk">UP NEXT</span><span class="v" id="rnv"></span></div>
    <div class="run-bottom">
      <div class="run-stat"><div class="k" id="rlk">${sw ? 'LAPS' : R.timer.yoga ? 'POSES LEFT' : 'ROUNDS LEFT'}</div><div class="v" id="rl" style="color:${S.accent}">0</div></div>
      <button class="run-play" data-a="play" id="rplay" aria-label="Play">${ic('play')}</button>
      <div class="run-stat"><div class="k" id="rck">${sw ? 'LAP' : R.timer.yoga ? 'MIN LEFT' : 'CYCLES LEFT'}</div><div class="v" id="rc" style="color:${PHASE.cyclerest}">0</div></div>
    </div>
  </section>`);
  if (sw) { $('#rnk', runEl).textContent = 'TAP'; $('#rnv', runEl).textContent = 'LAP'; $('#rnext', runEl).dataset.a = 'lap'; }
  runEl.addEventListener('click', onRunClick);
  layer.appendChild(runEl);
  unbackRun = pushBack(() => { if (Run.cur && Run.cur.locked) return showLockMsg(); askClose(); });
  Run.timerId = setInterval(Run.tick, 100);
  if (!sw) { R.idx = -1; Run.tick(); } else renderSW();
  if (S.background) BG.ensurePermission();
}

function closeRunUI() {
  clearInterval(Run.timerId); Run.timerId = null;
  clearTimeout(autoCloseT);
  if (runEl) { runEl.remove(); runEl = null; }
  if (unbackRun) { unbackRun(); unbackRun = null; }
  Awake.off(); BG.cancel();
  Run.cur = null;
}

function setPlayIcon(running) {
  const b = $('#rplay', runEl); if (!b) return;
  const want = running ? 'pause' : 'play';
  if (b.dataset.i !== want) { b.dataset.i = want; b.innerHTML = ic(want); b.setAttribute('aria-label', running ? 'Pause' : 'Play'); }
  const hint = $('#rhint', runEl);
  if (hint) hint.textContent = Run.cur && Run.cur.locked ? 'Locked' : running ? 'Tap anywhere to pause' : (Run.cur && Run.cur.elapsed() ? 'Paused · tap to resume' : 'Tap anywhere to start');
}

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

let lockMsgT = null;
function showLockMsg() {
  if (!runEl) return;
  $$('.lock-msg', runEl).forEach(x => x.remove());
  const m = el(`<div class="lock-msg">${ic('lock')}Screen locked. Tap LOCK to unlock.</div>`);
  $('#rmain', runEl).appendChild(m);
  clearTimeout(lockMsgT); lockMsgT = setTimeout(() => m.remove(), 1600);
}
function setLocked(on) {
  const R = Run.cur; if (!R) return;
  R.locked = on;
  runEl.classList.toggle('locked', on);
  const b = $('[data-a="lock"]', runEl);
  b.innerHTML = `${ic(on ? 'lock' : 'unlock')}<span>${on ? 'LOCKED' : 'LOCK'}</span>`;
  setPlayIcon(R.running);
  buzz(60);
}

async function askClose() {
  const R = Run.cur; if (!R) return;
  const e = R.elapsed();
  const loggable = !R.timer.noLog && e >= 60000;
  if (!loggable) { if (e > 3000 && R.running && !R.timer.noLog) { const ok = await confirmBox('Stop timer?', '', [{ label: 'Stop', cls: 'danger', value: 1 }, { label: 'Keep going', cls: 'ghost', value: 0 }]); if (!ok) return; } closeRunUI(); return; }
  const wasRunning = R.running;
  const v = await confirmBox('End workout?', `You've done ${fmt(e / 1000)}. Save it to your calendar?`, [
    { label: 'Save & end', cls: 'primary', value: 'save' }, { label: 'End without saving', cls: 'danger', value: 'discard' }, { label: 'Keep going', cls: 'ghost', value: 'keep' }]);
  if (v === 'save') { const entry = logRun(R, e, false); showFinish(R, entry, e); }
  else if (v === 'discard') closeRunUI();
  else if (wasRunning && !R.running) togglePlay();
}

function onRunClick(ev) {
  const R = Run.cur; if (!R) return;
  const b = ev.target.closest('[data-a]');
  if (R.locked) { if (b && b.dataset.a === 'lock') return setLocked(false); if (!ev.target.closest('.finish')) showLockMsg(); return; }
  if (!b) {
    // Tap anywhere on the big coloured area toggles start/pause.
    if (ev.target.closest('#rmain') && !R.finished) togglePlay();
    return;
  }
  switch (b.dataset.a) {
    case 'x': return askClose();
    case 'play': return togglePlay();
    case 'lock': return setLocked(true);
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
      b.innerHTML = `<span>${on ? 'SOUND' : 'MUTED'}</span>${ic(on ? 'sound' : 'mute')}`; return;
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
  else if (st.kind === 'flow') { words = st.label.replace(' · Left', ', left side').replace(' · Right', ', right side'); if (st.dur >= 20 && st.pose && !/right side/.test(words)) words += '. ' + Yoga.cueFor(st.pose); }
  else if (st.kind === 'ease') words = st.label.replace('Next: ', 'Next, ');
  say(words);
}

function paintRun(e, idx, rem) {
  if (!runEl) return;
  const R = Run.cur, st = R.steps[idx], nx = R.steps[idx + 1];
  const main = $('#rmain', runEl);
  if (main.dataset.k !== st.kind) { main.style.background = PHASE[st.kind]; main.dataset.k = st.kind; }
  $('#rlabel', runEl).textContent = st.label.toUpperCase();
  const sub = [];
  if (st.kind === 'cyclerest') sub.push(st.sub);
  else if (st.kind === 'work' || st.kind === 'rest') { if (st.sets > 1) sub.push(`Set ${st.set}/${st.sets}`); if (st.rounds > 1) sub.push(`Round ${st.round}/${st.rounds}`); }
  $('#rsub', runEl).textContent = sub.join(' · ');
  const txt = fmt(Math.ceil(rem / 1000));
  const dig = $('#rdig', runEl);
  if (dig.textContent !== txt) { dig.textContent = txt; dig.classList.toggle('long', txt.length > 5); }
  const frac = clamp(1 - rem / (st.dur * 1000), 0, 1);
  $('#rring', runEl).style.strokeDashoffset = (RING_C * (1 - frac)).toFixed(2);
  $('#rtot', runEl).textContent = fmt(Math.ceil((R.total - e) / 1000));
  const next = $('#rnext', runEl);
  if (nx) { next.style.background = PHASE[nx.kind]; $('#rnv', runEl).textContent = nx.label.toUpperCase(); }
  else { next.style.background = PHASE.done; $('#rnv', runEl).textContent = 'FINISH'; }
  if (R.timer.yoga) {
    const fig = $('#rfig', runEl);
    const stepMs = st.dur * 1000 - rem;
    yogaClock = st.kind === 'flow' ? stepMs : 0;
    if (fig && fig.dataset.p !== (st.pose || '') + st.kind) {
      fig.dataset.p = (st.pose || '') + st.kind; fig.innerHTML = st.pose ? Yoga.figure(st.pose) : '';
      const svg = fig.querySelector('svg[data-mv]'); if (svg && typeof Moves !== 'undefined') Moves.animate(svg, { dur: 8000, clock: () => (st.kind === 'flow' ? yogaClock : null) });
      R.breathHalf = -1;
    }
    // Breathing guide: 4 s in, 4 s out, in step with the figure.
    const br = $('#rbreath', runEl);
    if (br) {
      if (st.kind === 'flow' && st.dur >= 8) {
        const half = Math.floor(stepMs / 4000), inhale = half % 2 === 0, k = (stepMs % 4000) / 4000;
        br.textContent = inhale ? 'Breathe in' : 'Breathe out'; br.style.opacity = 1;
        fig.style.transform = `scale(${(1 + 0.06 * (inhale ? k : 1 - k)).toFixed(3)})`;
        if (R.running && half !== R.breathHalf) { R.breathHalf = half; if ((half === 2 || half === 3) && st.dur >= 20) say(inhale ? 'Breathe in' : 'And breathe out'); }
      } else { br.style.opacity = 0; if (fig) fig.style.transform = ''; }
    }
    $('#rl', runEl).textContent = R.steps.slice(idx).filter(x => x.kind === 'flow').length;
    $('#rc', runEl).textContent = Math.ceil((R.total - e) / 60000);
  } else {
    const ref = st.rounds ? st : (nx && nx.rounds ? nx : null);
    $('#rl', runEl).textContent = ref ? ref.rounds - ref.round + 1 : 0;
    let cyclesLeft = 0; const cref = st.cycles ? st : nx;
    if (cref) cyclesLeft = st.kind === 'cyclerest' ? st.cycles - st.cycle : cref.cycles - cref.cycle + 1;
    $('#rc', runEl).textContent = cyclesLeft;
  }
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
  $('#rring', runEl).style.strokeDashoffset = (RING_C * (1 - (e % 60000) / 60000)).toFixed(2);
  $('#rtot', runEl).textContent = fmt(s);
  $('#rl', runEl).textContent = R.laps.length;
  const lastLap = R.laps.length ? e - R.laps[0] : e;
  $('#rc', runEl).textContent = fmt(lastLap / 1000);
  $('#rc', runEl).style.fontSize = '40px';
  const lapsEl = $('#rlaps', runEl);
  if (lapsEl.dataset.n !== String(R.laps.length)) {
    lapsEl.innerHTML = R.laps.map((t, i) => { const prev = R.laps[i + 1] || 0; return `<div class="lap"><span>LAP ${R.laps.length - i}</span><span>+${fmt((t - prev) / 1000)}</span><span>${fmt(t / 1000)}</span></div>`; }).join('');
    lapsEl.dataset.n = R.laps.length;
  }
  $('#rsub', runEl).textContent = R.laps.length ? `Lap ${R.laps.length + 1}` : '';
  $('#rnext', runEl).style.background = PHASE.work;
  setPlayIcon(R.running);
}

let autoCloseT = null;
function finishRun() {
  const R = Run.cur; if (!R || R.finished) return;
  R.finished = true; R.running = false;
  clearInterval(Run.timerId); Run.timerId = null;
  Awake.off(); BG.cancel();
  if (appVisible) { Snd.finish(); buzz(700); say(R.timer.noLog ? 'Rest over. Back to work!' : 'Workout complete. Great job!'); }
  const entry = R.timer.noLog ? null : logRun(R, R.total, true);
  showFinish(R, entry, R.total);
  if (R.timer.noLog) autoCloseT = setTimeout(() => { if (Run.cur === R) closeRunUI(); }, 2200);
}

function logRun(R, ms, complete) {
  const now = new Date();
  const entry = { id: uid(), date: dkey(now), at: now.getTime(), title: R.timer.name, kind: R.mode === 'sw' ? 'stopwatch' : 'timer', dur: Math.round(ms / 1000), planned: R.mode === 'timer' ? Math.round(R.total / 1000) : null, partial: R.mode === 'timer' && !(complete && ms >= R.total), notes: '', feel: 0, color: R.timer.color, auto: true, cat: R.timer.cat || undefined };
  if (R.mode === 'sw' && R.laps.length) entry.notes = `${R.laps.length} laps`;
  log.push(entry); saveLog();
  return entry;
}

function showFinish(R, entry, ms) {
  clearInterval(Run.timerId); Run.timerId = null;
  if (R) { R.running = false; R.finished = true; R.locked = false; }
  if (runEl) runEl.classList.remove('locked');
  Awake.off(); BG.cancel();
  if (!runEl) return;
  const f = el(`<div class="finish"><div class="inner">
    <div class="big">${entry ? (entry.partial ? 'WORKOUT SAVED' : 'WORKOUT COMPLETE') : (R.timer.noLog ? 'REST OVER' : 'TIME’S UP')}</div>
    <div class="tt">${esc(R.timer.name)}</div>
    <div class="meta">${fmt(ms / 1000)}${entry ? ` · added to ${new Date().toLocaleDateString(undefined, { weekday: 'long' })} in your calendar` : ''}</div>
    ${entry ? artCard('summit', QUOTES.done[Math.floor(Math.random() * QUOTES.done.length)], { small: true }) : `<p class="quote-line">${esc(R.timer.noLog ? 'Breathe. Reset. Go again.' : pickQuote('train'))}</p>`}
    ${entry ? `<div class="sect" style="justify-content:center">How did it feel?</div>
      <div class="feel">${FEEL.map((x, i) => `<button data-f="${i + 1}" aria-label="${x.t}">${x.e}</button>`).join('')}</div>
      <textarea class="field body" id="fnote" placeholder="Notes (optional): weights, PRs, how you felt…">${esc(entry.notes)}</textarea>` : ''}
    <div class="btns">${entry ? '' : `<button class="btn" data-a="again">Again</button>`}<button class="btn primary" data-a="done">Done</button></div>
  </div></div>`);
  f.addEventListener('click', e => {
    e.stopPropagation();
    clearTimeout(autoCloseT);
    const fb = e.target.closest('[data-f]');
    if (fb && entry) { entry.feel = +fb.dataset.f; $$('[data-f]', f).forEach(x => x.classList.toggle('on', x === fb)); saveLog(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'again') { const t = R.timer; closeRunUI(); startTimer(t, { autostart: !!t.noLog }); return; }
    if (entry) { entry.notes = $('#fnote', f).value.trim(); saveLog(); }
    closeRunUI(); if (!$('#layer > .screen')) render();
  });
  runEl.appendChild(f);
}

/* ---------- gym log ---------- */
const Gym = { cur: null, clockT: null, tickClock() {} };

function gymHistory(excludeId) {
  return log.filter(x => x.kind === 'gym' && x.id !== excludeId && Array.isArray(x.exercises)).sort((a, b) => a.at - b.at);
}
const e1rm = (w, r) => r > 1 ? w * (1 + r / 30) : w;
function bestOf(sets) { // best set: heaviest weight, ties by reps; bodyweight sets by reps
  let b = null;
  sets.forEach(s => { if (!(s.r > 0)) return; if (!b || (s.w || 0) > (b.w || 0) || ((s.w || 0) === (b.w || 0) && s.r > b.r)) b = s; });
  return b;
}
function exerciseStats(name, excludeId) {
  const sessions = [];
  gymHistory(excludeId).forEach(x => x.exercises.forEach(ex => { if (ex.name === name) { const sets = ex.sets.filter(s => s.r > 0); if (sets.length) sessions.push({ at: x.at, date: x.date, sets, id: x.id }); } }));
  let maxW = 0, maxR = 0, maxE = 0, bestSet = null;
  sessions.forEach(s => s.sets.forEach(st => { const w = st.w || 0; if (w > maxW || (w === maxW && st.r > (bestSet ? bestSet.r : 0))) { maxW = w; bestSet = st; } maxR = Math.max(maxR, st.r); maxE = Math.max(maxE, e1rm(w, st.r)); }));
  return { sessions, last: sessions[sessions.length - 1] || null, maxW, maxR, maxE, bestSet };
}
const setStr = s => (s.w ? `${wOut(s.w)} ${wUnit()} × ${s.r}` : `${s.r} reps`);
function summarizeSets(sets) {
  const done = sets.filter(s => s.r > 0); if (!done.length) return '';
  const same = done.every(s => s.r === done[0].r && (s.w || 0) === (done[0].w || 0));
  if (same) return `${done.length}×${done[0].r}${done[0].w ? ` @ ${wOut(done[0].w)} ${wUnit()}` : ''}`;
  return done.map(s => (s.w ? `${wOut(s.w)}×${s.r}` : `${s.r}`)).join(', ') + (done.some(s => s.w) ? ` ${wUnit()}` : ' reps');
}
function allExerciseNames() {
  const seen = new Set();
  gymHistory().slice().reverse().forEach(x => x.exercises.forEach(e => seen.add(e.name)));
  return seen;
}

function openGym({ title, entry, date, progKey } = {}) {
  const editing = !!entry;
  let d, resumed = false;
  if (editing) d = clone(entry);
  else {
    const draft = DB.get('gymdraft', null);
    const pd = progKey ? Program.sessionDraft(progKey) : null;
    if (draft && (!pd || (draft.prog && draft.prog.key === progKey) || draft.exercises.some(ex => ex.sets.some(st => st.r > 0)))) {
      d = draft; resumed = true; if (title && !d.exercises.length) d.title = title;
      if (pd && !(draft.prog && draft.prog.key === progKey)) toast('Finish or discard the workout in progress first');
    } else if (pd) d = Object.assign({ id: uid(), date: dkey(new Date()), start: Date.now() }, pd);
    else d = { id: uid(), title: title || 'Gym workout', date: date || dkey(new Date()), start: Date.now(), exercises: [] };
  }
  if (!d.exercises) d.exercises = [];
  const live = !editing && d.date === dkey(new Date());
  const persist = () => { if (!editing) DB.set('gymdraft', d); };
  if (!editing) persist();

  const scr = el(`<section class="screen">
    <header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Close">${ic('close')}</button></div>
      <h1>${editing ? 'Edit Workout' : d.prog ? 'Program Session' : 'Gym Workout'}</h1>
      <div class="tb-right"><button class="round-btn" data-a="menu" aria-label="More">${ic('more')}</button></div></header>
    <div class="scroll"><div class="page" id="gy" style="padding-bottom:30px"></div></div>
    <div class="gym-bar"><button class="btn" data-a="rest">${ic('pausebars')}Rest</button><button class="btn primary" data-a="finish">${editing ? 'Save changes' : 'Finish workout'}</button></div>
  </section>`);
  const gy = $('#gy', scr);
  Gym.cur = d;

  const clock = () => { const b = $('#gclock', scr); if (b && live) b.textContent = fmt((Date.now() - d.start) / 1000); };
  Gym.tickClock = clock;
  clearInterval(Gym.clockT); if (live) Gym.clockT = setInterval(clock, 1000);

  const paint = () => {
    const stats = {}; d.exercises.forEach(ex => { stats[ex.name] = exerciseStats(ex.name, d.id); });
    gy.innerHTML = `
      <div class="gym-head"><input class="field" id="gt" maxlength="40" value="${esc(d.title)}" placeholder="WORKOUT NAME">
        ${live ? `<div class="gym-clock"><b id="gclock">${fmt((Date.now() - d.start) / 1000)}</b><span>ELAPSED</span></div>` : `<button class="gym-clock" data-a="gdur"><b>${fmtMins(d.dur || 0)}</b><span>DURATION</span></button>`}</div>
      ${d.prog ? `<div class="progchip">${ic('sliders')}<span>Week ${d.prog.week}${d.prog.deload ? ' · Deload week: lighter, fewer sets' : ''} · warm up 5 min, then 1–2 light sets of the first exercise</span></div>` : ''}
      ${editing || !live ? `<p class="sub" style="text-align:left;color:var(--muted);margin:-4px 2px 12px">${parseKey(d.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>` : ''}
      ${d.exercises.map((ex, xi) => {
        const st = stats[ex.name];
        const lastSets = st.last ? st.last.sets : [];
        return `<div class="ex" data-xi="${xi}">
          <div class="ex-h"><span class="n">${esc(ex.name)}</span><button data-a="guide" data-n="${esc(ex.name)}" aria-label="How to do it">${ic('info')}</button><button data-a="exmenu" data-xi="${xi}" aria-label="Exercise options">${ic('more')}</button></div>
          ${ex.t ? Program.targetHtml(ex.t) : `<div class="ex-last">${st.last ? `Last time: <b>${esc(summarizeSets(st.last.sets))}</b> · Best ${st.bestSet ? esc(setStr(st.bestSet)) : '—'}` : 'First time logging this. Nice!'}</div>`}
          <div class="sets-head"><span style="text-align:center">SET</span><span>${wUnit().toUpperCase()}</span><span>${ex.t && ex.t.timed ? 'SEC' : 'REPS'}</span><span></span><span></span></div>
          ${ex.sets.map((s, si) => {
            const ph0 = lastSets[si] || lastSets[lastSets.length - 1] || null;
            const ph = ex.t ? { w: ex.t.sw != null ? ex.t.sw : (ph0 ? ph0.w : null), r: ph0 ? ph0.r : ex.t.lo } : ph0;
            return `<div class="setrow ${s.done ? 'done' : ''}">
              <span class="sn">${si + 1}</span>
              <input inputmode="decimal" data-xi="${xi}" data-si="${si}" data-f="w" value="${s.w != null ? esc(wOut(s.w)) : ''}" placeholder="${ph && ph.w ? esc(wOut(ph.w)) : ''}" aria-label="Weight">
              <input inputmode="numeric" data-xi="${xi}" data-si="${si}" data-f="r" value="${s.r ? s.r : ''}" placeholder="${ph ? ph.r : ''}" aria-label="Reps">
              <button class="ck" data-a="ck" data-xi="${xi}" data-si="${si}" aria-label="Set done">${ic('check')}</button>
              ${ex.sets.length > 1 ? `<button class="rm" data-a="rmset" data-xi="${xi}" data-si="${si}" aria-label="Remove set">${ic('close')}</button>` : '<span></span>'}
            </div>`;
          }).join('')}
          <div class="ex-add"><button data-a="addset" data-xi="${xi}">${ic('plus')}Add set</button>${ex.t ? `<button data-a="exrest" data-s="${ex.t.rest}">${ic('pausebars')}Rest ${fmtShort(ex.t.rest)}</button>` : ''}</div>
        </div>`;
      }).join('')}
      <button class="addlink dashed" data-a="addex">${ic('plus')}<span>Add exercise</span></button>
      ${d.prog ? `<button class="nudge" data-a="cool">${ic('lotus')}<span><b>Finish with a 5-minute cooldown.</b> Gentle stretches for hips, hamstrings and chest. Tap to start after your last set.</span></button>` : ''}
      ${!d.exercises.length ? `${artCard('barbell', pickQuote('train', 5), { small: true })}<div class="empty" style="padding:10px 20px">Add your first exercise. The app remembers your last weights and reps and marks new personal records.</div>` : ''}
    `;
  };

  const close = async (force) => {
    if (!force && !editing) {
      const hasData = d.exercises.some(ex => ex.sets.some(s => s.r > 0));
      if (hasData) {
        const v = await confirmBox('Leave workout?', 'Your sets are saved. You can continue later from the Today screen.', [
          { label: 'Keep for later', cls: 'primary', value: 'keep' }, { label: 'Discard workout', cls: 'danger', value: 'discard' }, { label: 'Stay', cls: 'ghost', value: null }]);
        if (!v) return;
        if (v === 'discard') DB.del('gymdraft');
      } else DB.del('gymdraft');
    }
    clearInterval(Gym.clockT); Gym.cur = null; Gym.tickClock = () => {};
    unback(); scr.remove(); render();
  };
  const unback = pushBack(() => close());

  scr.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'gt') { d.title = t.value; persist(); return; }
    if (t.dataset.f) {
      const s = d.exercises[+t.dataset.xi].sets[+t.dataset.si];
      if (t.dataset.f === 'w') s.w = t.value === '' ? null : wIn(t.value);
      else s.r = parseInt(t.value, 10) || 0;
      persist();
    }
  });
  scr.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const xi = +b.dataset.xi, si = +b.dataset.si;
    const ex = d.exercises[xi];
    switch (b.dataset.a) {
      case 'close': return close();
      case 'rest': return quickRestSheet();
      case 'exrest': return startRest(+b.dataset.s);
      case 'cool': { const t = Yoga.timers.find(x => x.id === 'y-cool'); return startTimer(t); }
      case 'guide': return Program.guide(b.dataset.n);
      case 'gdur': return pickDuration('Duration', d.dur || 3600, v => { d.dur = v; paint(); }, { presets: [1800, 2700, 3600, 4500, 5400] });
      case 'menu': return menu(d.title || 'Workout', [
        ...(editing ? [{ icon: 'trash', label: 'Delete this workout', danger: true, run: async () => {
          if (await confirmBox('Delete workout?', '', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { log = log.filter(x => x.id !== d.id); saveLog(); close(true); }
        } }] : [{ icon: 'trash', label: 'Discard workout', danger: true, run: async () => {
          if (await confirmBox('Discard workout?', 'All sets in this workout will be removed.', [{ label: 'Discard', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { DB.del('gymdraft'); close(true); }
        } }]),
      ]);
      case 'addex': return pickExercise(name => {
        const st = exerciseStats(name, d.id);
        const n = st.last ? st.last.sets.length : 3;
        d.exercises.push({ name, sets: Array.from({ length: clamp(n, 1, 10) }, () => ({ w: null, r: 0, done: false })) });
        persist(); paint();
        setTimeout(() => { const sc = $('.scroll', scr); sc.scrollTop = sc.scrollHeight; }, 30);
      });
      case 'exmenu': return menu(ex.name, [
        ...(xi > 0 ? [{ icon: 'chevU', label: 'Move up', run: () => { d.exercises.splice(xi, 1); d.exercises.splice(xi - 1, 0, ex); persist(); paint(); } }] : []),
        { icon: 'edit', label: 'Swap exercise', run: () => pickExercise(name => { ex.name = name; persist(); paint(); }) },
        { icon: 'trash', label: 'Remove exercise', danger: true, run: () => { d.exercises.splice(xi, 1); persist(); paint(); } },
      ]);
      case 'addset': { const last = ex.sets[ex.sets.length - 1]; ex.sets.push({ w: last ? last.w : null, r: last ? last.r : 0, done: false }); persist(); paint(); return; }
      case 'rmset': ex.sets.splice(si, 1); persist(); paint(); return;
      case 'ck': {
        const s = ex.sets[si];
        if (!s.done) {
          // Fill empty boxes from the grey hints (last session) when ticking.
          const row = b.closest('.setrow'); const [wi, ri] = $$('input', row);
          if (s.w == null && wi.placeholder) s.w = wIn(wi.placeholder);
          if (!s.r && ri.placeholder) s.r = parseInt(ri.placeholder, 10) || 0;
          if (!s.r) { toast('Enter reps for this set'); ri.focus(); return; }
        }
        s.done = !s.done; buzz(40); persist(); paint(); return;
      }
      case 'finish': return finishGym(d, { editing, live, close });
    }
  });
  paint();
  layer.appendChild(scr);
  if (!editing && resumed && d.exercises.length) toast('Continuing your workout');
}

function pickExercise(cb) {
  const recent = [...allExerciseNames()].slice(0, 8);
  const groups = Object.assign({}, customEx.length ? { 'My exercises': customEx } : {}, EXERCISES);
  const s = sheet(`<h2>Add exercise</h2>
    <input class="search" id="exq" placeholder="Search or type a new exercise" autocomplete="off">
    <div class="exlist" id="exl"></div>`);
  const q = $('#exq', s.el), list = $('#exl', s.el);
  const paint = () => {
    const t = q.value.trim().toLowerCase();
    let html = '';
    if (t) {
      const all = [...new Set([...recent, ...customEx, ...Object.values(EXERCISES).flat()])];
      const hits = all.filter(n => n.toLowerCase().includes(t));
      html += hits.map(n => `<button data-n="${esc(n)}"><span>${esc(n)}</span></button>`).join('');
      if (!all.some(n => n.toLowerCase() === t)) html += `<button data-new="1"><span>+ Add "${esc(q.value.trim())}"</span><small>New exercise</small></button>`;
    } else {
      if (recent.length) html += `<div class="grp">RECENT</div>` + recent.map(n => `<button data-n="${esc(n)}"><span>${esc(n)}</span>${ic('chevR', 'chev')}</button>`).join('');
      Object.entries(groups).forEach(([g, arr]) => { html += `<div class="grp">${esc(g.toUpperCase())}</div>` + arr.map(n => `<button data-n="${esc(n)}"><span>${esc(n)}</span></button>`).join(''); });
    }
    list.innerHTML = html;
  };
  q.addEventListener('input', paint);
  list.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    let name = b.dataset.n;
    if (b.dataset.new) {
      name = q.value.trim().replace(/\s+/g, ' ');
      name = name.charAt(0).toUpperCase() + name.slice(1);
      if (!customEx.includes(name)) { customEx.push(name); DB.set('customEx', customEx); }
    }
    s.close(); cb(name);
  });
  paint();
}

async function finishGym(d, { editing, live, close }) {
  const exercises = d.exercises.map(ex => ({ name: ex.name, sets: ex.sets.filter(s => s.r > 0).map(s => ({ w: s.w || 0, r: s.r })) })).filter(ex => ex.sets.length);
  if (!exercises.length) { toast('Log at least one set (reps) first'); return; }
  // Personal records compared with every earlier workout.
  const prs = [];
  exercises.forEach(ex => {
    const st = exerciseStats(ex.name, d.id);
    if (!st.sessions.length) return;
    const b = bestOf(ex.sets);
    if (!b) return;
    if ((b.w || 0) > st.maxW && b.w > 0) prs.push(`${ex.name}: ${setStr(b)} (heaviest)`);
    else if (!(b.w > 0) && st.maxW === 0 && b.r > st.maxR) prs.push(`${ex.name}: ${b.r} reps (most reps)`);
    else { const e = Math.max(...ex.sets.map(s => e1rm(s.w || 0, s.r))); if (e > st.maxE + 0.01 && b.w > 0) prs.push(`${ex.name}: est. 1RM ${wOut(e)} ${wUnit()}`); }
  });
  let dur = live ? Math.round((Date.now() - d.start) / 1000) : (d.dur || 3600);
  const existing = log.find(x => x.id === d.id);
  const entry = { id: d.id, date: d.date, at: existing ? existing.at : (live ? d.start : parseKey(d.date).getTime() + 12 * 3600e3), title: (d.title || '').trim() || 'Gym workout', kind: 'gym', cat: 'Strength', dur, exercises, notes: existing ? existing.notes : (d.notes || ''), feel: existing ? existing.feel : 0, color: S.accent, auto: false, prs, prog: d.prog || (existing && existing.prog) || undefined };
  const totalSets = exercises.reduce((a, x) => a + x.sets.length, 0);
  const volume = exercises.reduce((a, x) => a + x.sets.reduce((b, s) => b + (s.w || 0) * s.r, 0), 0);
  const s = sheet(`<h2>${editing ? 'Save workout' : 'Workout done 💪'}</h2>
    <p class="sub">${exercises.length} exercises · ${totalSets} sets${volume ? ` · ${Math.round(S.unit === 'lb' ? volume * KG_LB : volume).toLocaleString()} ${wUnit()} lifted` : ''}</p>
    <p class="quote-line" style="margin-top:-8px">${esc(QUOTES.done[Math.floor(Math.random() * QUOTES.done.length)])}</p>
    ${prs.length ? `<div class="prs">🏆 <b>New personal record${prs.length > 1 ? 's' : ''}</b><br>${prs.map(esc).join('<br>')}</div>` : ''}
    <div class="block"><button class="row tap" data-a="dur"><span class="ri" style="color:var(--accent-text)">${ic('stopwatch')}</span><span class="rt"><div class="t">Duration</div></span><span class="rv" id="fdur" style="font-size:34px">${fmtMins(dur)}</span>${ic('chevR', 'chev')}</button></div>
    <div class="sect" style="justify-content:center;margin-top:8px">How did it feel?</div>
    <div class="feel">${FEEL.map((f, i) => `<button data-f="${i + 1}" class="${entry.feel === i + 1 ? 'on' : ''}" aria-label="${f.t}">${f.e}</button>`).join('')}</div>
    <textarea class="field body" id="fn" placeholder="Notes (optional)">${esc(entry.notes)}</textarea>
    <div class="btns ${d.prog ? '' : 'two'}">${d.prog ? '<button class="btn primary" data-a="save" data-cool="1">' + ic('lotus') + 'Save &amp; start 5-min cooldown</button>' : ''}<button class="btn ${d.prog ? '' : 'primary'}" data-a="save">Save workout</button>${d.prog ? '' : '<button class="btn" data-a="back">Back</button>'}</div>`);
  s.el.addEventListener('click', e => {
    const f = e.target.closest('[data-f]');
    if (f) { entry.feel = entry.feel === +f.dataset.f ? 0 : +f.dataset.f; $$('[data-f]', s.el).forEach(x => x.classList.toggle('on', +x.dataset.f === entry.feel)); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'back') return s.close();
    if (b.dataset.a === 'dur') return pickDuration('Duration', dur, v => { dur = v; $('#fdur', s.el).textContent = fmtMins(v); }, { presets: [1800, 2700, 3600, 4500, 5400] });
    if (b.dataset.a === 'save') {
      entry.dur = dur; entry.notes = $('#fn', s.el).value.trim();
      const i = log.findIndex(x => x.id === entry.id);
      if (i >= 0) log[i] = entry; else log.push(entry);
      saveLog(); if (!editing) DB.del('gymdraft');
      s.close(); close(true);
      toast(prs.length ? `Saved · ${prs.length} new PR${prs.length > 1 ? 's' : ''} 🏆` : 'Workout saved');
      if (b.dataset.cool) setTimeout(() => startTimer(Yoga.timers.find(x => x.id === 'y-cool')), 400);
    }
  });
}

/* ---------- calendar ---------- */
const FEEL = [{ e: '😫', t: 'Rough' }, { e: '😕', t: 'Meh' }, { e: '😐', t: 'OK' }, { e: '🙂', t: 'Good' }, { e: '💪', t: 'Strong' }];
const CATS = ['Strength', 'HIIT', 'Cardio', 'Running', 'Yoga', 'Sports', 'Mobility', 'Other'];
let calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
let calSel = dkey(new Date());

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
    cells.push(`<button class="d ${dt.getMonth() !== m ? 'out' : ''} ${k === todayK ? 'today' : ''} ${n ? 'has' : ''} ${k === calSel ? 'sel' : ''} ${stepsOn(k) >= S.stepGoal ? 'goal' : ''}" data-k="${k}">${dt.getDate()}<span class="dots">${'<i></i>'.repeat(Math.min(n, 3))}</span></button>`);
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
        <div class="bars">${st.bars.map(b => `<div class="b"><em>${b.mins || ''}</em><i class="${b.mins ? 'on' : ''}" style="height:${Math.max(4, b.mins / maxBar * 70)}px"></i><span style="${b.today ? 'color:var(--accent-text)' : ''}">${b.label}</span></div>`).join('')}</div>
        <div class="s" style="padding:6px 16px 0">Best streak: <b style="color:var(--text)">${st.best} ${st.best === 1 ? 'day' : 'days'}</b></div></div>
    </div>
    <div class="sect">Workout calendar</div>
    <div class="cal">
      <div class="cal-head"><button data-a="pm" aria-label="Previous month">${ic('chevL')}</button><span class="m">${MONTHS[m]} ${y}</span><button data-a="nm" aria-label="Next month">${ic('chevR')}</button></div>
      <div class="cal-grid">${[0, 1, 2, 3, 4, 5, 6].map(i => `<div class="wd">${WD[(i + S.weekStart) % 7]}</div>`).join('')}${cells.join('')}</div>
      ${Object.keys(STP.days).length ? `<div class="cal-key"><span><i class="k1"></i>Workout</span><span><i class="k2"></i>Step goal reached</span></div>` : ''}
    </div>
    <div class="sect"><span>${esc(selLabel)}</span><span style="text-transform:none;letter-spacing:0">${dayEntries.length ? `${dayEntries.length} · ${fmtMins(dayEntries.reduce((s, x) => s + x.dur, 0))}` : ''}</span></div>
    ${stepsOn(calSel) ? `<div class="daysteps">${ic('feet')}<b>${fmtN(stepsOn(calSel))} steps</b><span>${distStr(stepsOn(calSel))} · ${fmtN(stepsKcal(stepsOn(calSel)))} kcal${stepsOn(calSel) >= S.stepGoal ? ' · goal reached ✓' : ` · ${Math.round(stepsOn(calSel) / S.stepGoal * 100)}% of goal`}</span></div>` : ''}
    <div id="entries">${dayEntries.map(entryCard).join('') || (calSel === todayK ? `<div style="margin-bottom:12px">${artCard('runner', pickQuote('train', 7), { small: true })}</div>` : `<div class="empty" style="padding:16px 20px 20px">No workouts on this day.</div>`)}</div>
    <button class="addday" data-a="add">${ic('plus')}Add workout for ${calSel === todayK ? 'today' : esc(selDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))}</button>
  </div>`;
  view.querySelector('.page').addEventListener('click', e => {
    const b = e.target.closest('[data-a],[data-k],[data-eid]'); if (!b) return;
    if (b.dataset.k) { calSel = b.dataset.k; const dt = parseKey(calSel); if (dt.getMonth() !== m) calMonth = new Date(dt.getFullYear(), dt.getMonth(), 1); return rerenderKeepScroll(); }
    if (b.dataset.eid) return openEntry(log.find(x => x.id === b.dataset.eid));
    if (b.dataset.a === 'pm') { calMonth = new Date(y, m - 1, 1); return rerenderKeepScroll(); }
    if (b.dataset.a === 'nm') { calMonth = new Date(y, m + 1, 1); return rerenderKeepScroll(); }
    if (b.dataset.a === 'add') return menu('Add workout', [
      { icon: 'dumbbell', label: 'Gym workout (sets, reps & weight)', run: () => openGym({ entry: { id: uid(), title: 'Gym workout', date: calSel, dur: 3600, exercises: [] } }) },
      { icon: 'run', label: 'Other workout (run, yoga, sports…)', run: () => openEntry(null) },
    ]);
  });
}

function entryCard(x) {
  const icon = x.cat === 'Yoga' || x.cat === 'Mobility' ? 'lotus' : x.kind === 'stopwatch' ? 'stopwatch' : x.kind === 'timer' ? 'bolt' : 'dumbbell';
  const time = new Date(x.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const label = x.kind === 'gym' ? 'Gym' : x.cat || (x.kind === 'stopwatch' ? 'Stopwatch' : 'Timer');
  const meta = [x.kind === 'timer' || x.kind === 'stopwatch' ? fmt(x.dur) : fmtMins(x.dur), label, x.partial ? 'Stopped early' : '', x.auto || x.kind === 'gym' ? time : ''].filter(Boolean).join(' · ');
  let extra = '';
  if (x.kind === 'gym' && x.exercises) extra = x.exercises.map(e => `${e.name} ${summarizeSets(e.sets)}`).join('\n');
  const notes = [extra, x.notes].filter(Boolean).join('\n');
  return `<button class="entry" data-eid="${x.id}"><span class="ei" style="color:${x.color || 'var(--accent-text)'}">${ic(icon)}</span>
    <span class="eb"><div class="et">${esc(x.title)}${x.prs && x.prs.length ? ' 🏆' : ''}</div><div class="em">${esc(meta)}</div>${notes ? `<div class="en">${esc(notes)}</div>` : ''}</span>
    ${x.feel ? `<span class="ef">${FEEL[x.feel - 1].e}</span>` : ''}</button>`;
}

function openEntry(x, preset = {}) {
  if (x && x.kind === 'gym') return openGym({ entry: x });
  const isNew = !x;
  const d = x ? clone(x) : Object.assign({ id: uid(), date: calSel, at: Date.now(), title: '', kind: 'manual', cat: 'Strength', dur: 45 * 60, notes: '', feel: 0, color: S.accent, auto: false }, preset);
  const s = sheet(`<h2>${isNew ? 'Add workout' : (d.auto ? 'Workout' : 'Edit workout')}</h2>
    <p class="sub">${parseKey(d.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
    ${d.auto ? `<div class="field" style="margin-bottom:12px">${esc(d.title)}</div>` : `<input class="field" id="et" placeholder="WHAT DID YOU DO?" maxlength="40" value="${esc(d.title)}" style="margin-bottom:12px">
    <div class="chips" id="ecat" style="flex-wrap:wrap;margin-bottom:12px">${CATS.map(c => `<button class="chip small ${c === d.cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('')}</div>
    <div class="block"><button class="row tap" data-a="dur"><span class="ri" style="color:var(--accent-text)">${ic('stopwatch')}</span><span class="rt"><div class="t">Duration</div></span><span class="rv" id="edur" style="font-size:36px">${fmtMins(d.dur)}</span>${ic('chevR', 'chev')}</button></div>`}
    <div class="sect" style="justify-content:center;margin-top:8px">How did it feel?</div>
    <div class="feel" id="efeel">${FEEL.map((f, i) => `<button data-f="${i + 1}" class="${d.feel === i + 1 ? 'on' : ''}" aria-label="${f.t}">${f.e}</button>`).join('')}</div>
    <textarea class="field body" id="en" placeholder="Notes: distance, pace, how it went…">${esc(d.notes)}</textarea>
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
      if (ok) { log = log.filter(y => y.id !== d.id); saveLog(); s.close(); rerenderKeepScroll(); }
      return;
    }
    if (b.dataset.a === 'save') {
      if (!d.auto) { d.title = ($('#et', s.el).value || '').trim() || d.cat; }
      d.notes = $('#en', s.el).value.trim();
      if (isNew) {
        const now = new Date(); const base = parseKey(d.date); base.setHours(now.getHours(), now.getMinutes()); d.at = base.getTime();
        log.push(d);
      } else { const i = log.findIndex(y => y.id === d.id); if (i >= 0) log[i] = d; }
      saveLog(); s.close(); rerenderKeepScroll(); toast('Workout saved');
    }
  });
}

/* ---------- progress: heatmap, body weight, records ---------- */
function lineChart(pts, { fmtY = v => trim1(v), h = 150 } = {}) {
  const W = 320, H = h, L = 34, R = 8, T = 12, B = 20;
  if (!pts.length) return '';
  const xs = pts.map(p => p.t), ys = pts.map(p => p.v);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x0 === x1) { x0 -= 864e5; x1 += 864e5; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys); const padY = (y1 - y0) * 0.15 || Math.max(1, y1 * 0.05); y0 -= padY; y1 += padY;
  const X = t => L + (t - x0) / (x1 - x0) * (W - L - R), Y = v => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
  const ticks = [y0 + padY, (y0 + y1) / 2, y1 - padY];
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L${X(pts[pts.length - 1].t).toFixed(1)},${H - B} L${X(pts[0].t).toFixed(1)},${H - B} Z`;
  const lp = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img">
    ${ticks.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="lbl" x="${L - 6}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${esc(fmtY(v))}</text>`).join('')}
    <text class="lbl" x="${L}" y="${H - 4}">${esc(shortDate(pts[0].t))}</text>
    ${pts.length > 1 ? `<text class="lbl" x="${W - R}" y="${H - 4}" text-anchor="end">${esc(shortDate(lp.t))}</text>` : ''}
    ${pts.length > 1 ? `<path class="area" d="${area}"/><path class="line" d="${line}"/>` : ''}
    ${pts.length <= 20 ? pts.map(p => `<circle class="pt" cx="${X(p.t).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.2"/>`).join('') : `<circle class="pt" cx="${X(lp.t).toFixed(1)}" cy="${Y(lp.v).toFixed(1)}" r="4"/>`}
  </svg>`;
}

const latestBody = () => body.slice().sort((a, b) => a.at - b.at).filter(x => x.kg != null).pop();

function viewProgress() {
  const today = today0();
  // Year heatmap: 53 weeks ending this week.
  const mins = {}; log.forEach(x => { mins[x.date] = (mins[x.date] || 0) + (x.dur || 0) / 60; });
  const offset = (today.getDay() - S.weekStart + 7) % 7;
  const start = addDays(today, -offset - 52 * 7);
  let heat = ''; let lastMonth = -1;
  for (let w = 0; w < 53; w++) {
    const wk0 = addDays(start, w * 7);
    const mo = wk0.getMonth();
    heat += `<span class="ml">${mo !== lastMonth && wk0.getDate() <= 7 ? MONTHS[mo].slice(0, 3) : ''}</span>`;
    if (mo !== lastMonth && wk0.getDate() <= 7) lastMonth = mo;
    for (let d = 0; d < 7; d++) {
      const dt = addDays(wk0, d); const k = dkey(dt); const m = mins[k] || 0;
      const lv = dt > today ? 'fut' : !m ? '' : m < 20 ? 'l1' : m < 40 ? 'l2' : m < 60 ? 'l3' : 'l4';
      heat += `<i class="${lv} ${k === dkey(today) ? 'td' : ''}" title="${k}${m ? ` · ${Math.round(m)} min` : ''}"></i>`;
    }
  }
  const yStart = new Date(today.getFullYear(), 0, 1);
  const yr = log.filter(x => parseKey(x.date) >= yStart);
  const yrDays = new Set(yr.map(x => x.date)).size;
  const yrHours = yr.reduce((a, x) => a + (x.dur || 0), 0) / 3600;

  // Body weight
  const bw = body.filter(x => x.kg != null).sort((a, b) => a.at - b.at);
  const lb = bw[bw.length - 1];
  let chg = '';
  if (lb) {
    const ref = bw.filter(x => x.at <= lb.at - 25 * 864e5).pop() || bw[0];
    if (ref && ref !== lb) { const dlt = lb.kg - ref.kg; const dd = Math.round((lb.at - ref.at) / 864e5); chg = `<b class="${dlt > 0 ? 'up' : 'down'}">${dlt > 0 ? '▲' : dlt < 0 ? '▼' : ''} ${wOut(Math.abs(dlt))} ${wUnit()}</b> in ${dd} days`; }
  }
  const bwPts = bw.filter(x => x.at >= Date.now() - 180 * 864e5).map(x => ({ t: x.at, v: S.unit === 'lb' ? x.kg * KG_LB : x.kg }));

  // Records
  const names = [...allExerciseNames()];
  const recs = names.map(n => ({ n, st: exerciseStats(n) })).filter(r => r.st.sessions.length);

  view.innerHTML = topbar('Progress') + `<div class="page">
    ${artCard('stairs', pickQuote('progress'), { small: true })}
    <div class="sect"><span>Steps</span>${STP.enabled ? `<span style="text-transform:none;letter-spacing:0">Goal ${fmtN(S.stepGoal)}</span>` : ''}</div>
    ${(() => {
      if (!STP.enabled && !Object.keys(STP.days).length) return stepsCardHtml();
      const st = stepStats(stepsRange === 'week' ? 7 : 30);
      return `<div class="chart-card">
        <div class="seg" style="background:var(--surface-2);margin:0 0 6px"><button class="${stepsRange === 'week' ? 'on' : ''}" data-srange="week">7 days</button><button class="${stepsRange === 'month' ? 'on' : ''}" data-srange="month">30 days</button></div>
        ${stepBars(st.arr)}
        <div class="sstats"><div><b>${fmtN(st.avg)}</b><span>Daily average</span></div><div><b>${fmtN(st.best.v)}</b><span>Best${st.best.d ? ' · ' + esc(shortDate(st.best.d)) : ''}</span></div><div><b>${st.goalDays}/${st.arr.length}</b><span>Goal days</span></div><div><b>${st.streak}</b><span>Goal streak</span></div></div>
        <div class="s" style="color:var(--muted);font-size:13px;margin-top:10px">${fmtN(st.total)} steps · ${distStr(st.total)} · ${fmtN(stepsKcal(st.total))} kcal in ${st.arr.length} days</div>
        ${STP.enabled ? '' : `<div style="margin-top:10px">${stepsCardHtml()}</div>`}
      </div>`;
    })()}
    <div class="sect"><span>Muscles trained</span><span style="text-transform:none;letter-spacing:0">Last 7 days</span></div>
    ${Health.muscleMapHtml()}
    <button class="nudge" data-h="score" style="margin-top:12px">${ic('chart')}<span><b>Weekly scorecard.</b> Workouts, steps, protein, water, sleep and money, day by day.</span></button>
    <div class="sect"><span>Progress photos</span></div>
    ${Health.photosHtml()}
    <div class="sect">${today.getFullYear()} so far</div>
    <div class="yr">
      <div class="stat"><div class="k">Workouts</div><div class="v">${yr.length}</div></div>
      <div class="stat"><div class="k">Active days</div><div class="v">${yrDays}</div></div>
      <div class="stat"><div class="k">Hours</div><div class="v">${trim1(yrHours)}</div></div>
    </div>
    <div class="sect">Last 12 months</div>
    <div class="heat-wrap"><div class="heat-scroll" id="heatsc"><div class="heat">${heat}</div></div>
      <div class="heat-legend"><span>Each square is a day</span><span class="lv">Less <i style="background:var(--surface-2)"></i><i style="background:var(--accent);opacity:.3"></i><i style="background:var(--accent);opacity:.55"></i><i style="background:var(--accent);opacity:.8"></i><i style="background:var(--accent)"></i> More</span></div></div>
    <div class="sect"><span>Body weight</span><button class="btn sm" data-a="bw" style="background:var(--accent);color:var(--accent-ink)">${ic('plus')}Log</button></div>
    <div class="chart-card">
      ${lb ? `<div class="top"><div><div class="k">Latest · ${esc(shortDate(lb.at))}</div><div class="big">${wOut(lb.kg)}<small>${wUnit()}</small></div>${chg ? `<div class="chg">${chg}</div>` : ''}</div>
</div>
        ${bwPts.length > 1 ? lineChart(bwPts) : '<div class="s" style="color:var(--muted);font-size:13px;margin-top:10px">Log your weight again on another day to see the trend line.</div>'}
        <button class="btn ghost" data-a="bwhist" style="height:40px;margin-top:6px">Full body log (${body.length})</button>`
        : `<div class="empty" style="padding:10px 6px"><b>No weigh-ins yet</b>Log your weight once a week, same time of day, for a clean trend.</div>`}
    </div>
    <div class="sect"><span>Measurements</span><span style="text-transform:none;letter-spacing:0">${lUnit()} · tap for chart</span></div>
    <div class="meas-grid">${MEAS.map(([k, n]) => {
      const rows = body.filter(x => x[k]).sort((a, b) => a.at - b.at);
      const last = rows[rows.length - 1], first = rows[0];
      const dl = last && first && last !== first ? last[k] - first[k] : null;
      return `<button class="meas" data-meas="${k}" data-n="${n}"><span class="k">${n}</span><b>${last ? lOut(last[k]) : '—'}</b><span class="dl">${dl == null ? (last ? esc(shortDate(last.at)) : 'Not measured yet') : `${dl > 0 ? '▲' : dl < 0 ? '▼' : ''} ${lOut(Math.abs(dl))} since ${esc(shortDate(first.at))}`}</span></button>`;
    }).join('')}</div>
    <div class="sect">Personal records</div>
    <div class="block" style="padding:0">${recs.length ? recs.map(r => `<button class="pr-row" data-ex="${esc(r.n)}"><span class="pn"><b>${esc(r.n)}</b><span>${r.st.sessions.length} session${r.st.sessions.length > 1 ? 's' : ''} · last ${esc(shortDate(r.st.last.at))}</span></span>
      <span class="pv"><b>${r.st.maxW ? `${wOut(r.st.maxW)}` : r.st.maxR}</b><span>${r.st.maxW ? `${wUnit()} × ${r.st.bestSet.r}` : 'reps'}</span></span></button>`).join('')
      : `<div class="empty" style="padding:22px 20px"><b>No records yet</b>Log a gym workout and your best lifts show up here.</div>`}</div>
  </div>`;
  const hs = $('#heatsc'); if (hs) hs.scrollLeft = hs.scrollWidth;
  Health.hydrate(view);
  view.querySelector('.page').addEventListener('click', e => {
    const hh = e.target.closest('[data-h]'); if (hh) return Health.handle(hh);
    const ex = e.target.closest('[data-ex]'); if (ex) return showExercise(ex.dataset.ex);
    const sr = e.target.closest('[data-srange]'); if (sr) { stepsRange = sr.dataset.srange; return rerenderKeepScroll(); }
    const so = e.target.closest('[data-a="steps-on"]'); if (so) return enableSteps();
    const ms = e.target.closest('[data-meas]'); if (ms) { const has = body.some(x => x[ms.dataset.meas]); return has ? showMeasure(ms.dataset.meas, ms.dataset.n) : openBodyEntry(null); }
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'bw') return openBodyEntry(null);
    if (b.dataset.a === 'bwhist') return bodyHistory();
  });
}

function showExercise(name) {
  const st = exerciseStats(name);
  const pts = st.sessions.map(s => { const b = bestOf(s.sets); return { t: s.at, v: b.w ? (S.unit === 'lb' ? b.w * KG_LB : b.w) : b.r }; });
  const useW = st.maxW > 0;
  sheet(`<h2>${esc(name)}</h2>
    <p class="sub">Best: ${st.bestSet ? esc(setStr(st.bestSet)) : '—'}${useW ? ` · est. 1RM ${wOut(st.maxE)} ${wUnit()}` : ''}</p>
    <div class="chart-card" style="padding:12px 10px 8px;background:var(--surface-2)"><div class="k" style="padding-left:6px">${useW ? `Heaviest set per session (${wUnit()})` : 'Most reps per session'}</div>${pts.length > 1 ? lineChart(pts, { h: 140 }) : '<div style="color:var(--muted);font-size:13px;padding:10px 6px">Do this exercise again to see a progress chart.</div>'}</div>
    <div class="sect">Sessions</div>
    <div class="mini-list">${st.sessions.slice().reverse().slice(0, 15).map(s => `<div class="mrow"><span>${esc(parseKey(s.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }))}</span><b>${esc(summarizeSets(s.sets))}</b></div>`).join('')}</div>`);
}

const MEAS = [['chest', 'Chest'], ['arms', 'Arms'], ['waist', 'Waist'], ['thigh', 'Thigh']];
const latestMeas = k => body.slice().sort((a, b) => a.at - b.at).filter(x => x[k]).pop();

function openBodyEntry(x) {
  const isNew = !x;
  const d = x ? clone(x) : { id: uid(), date: dkey(new Date()), at: Date.now(), kg: latestBody() ? latestBody().kg : null };
  const s = sheet(`<h2>${isNew ? 'Log weight' : 'Edit weigh-in'}</h2>
    <p class="sub">${esc(parseKey(d.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
    <div class="unit-in" style="margin-bottom:10px"><input class="field" id="bkg" inputmode="decimal" placeholder="WEIGHT" value="${d.kg != null ? esc(wOut(d.kg)) : ''}" style="font-size:40px;text-align:center"><span>${wUnit()}</span></div>
    <div class="sect" style="margin-top:6px"><span>Measurements (optional)</span><span style="text-transform:none;letter-spacing:0">${lUnit()}</span></div>
    <div class="meas-in">${MEAS.map(([k, n]) => { const last = latestMeas(k); return `<label><span>${n}</span><input class="field body" data-m="${k}" inputmode="decimal" placeholder="${last && isNew ? esc(lOut(last[k])) : '—'}" value="${d[k] ? esc(lOut(d[k])) : ''}"></label>`; }).join('')}</div>
    <p class="hint">Grey numbers are your last measurements. Measure arms and thigh at the widest point, waist at the belly button.</p>
    <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="save">Save</button></div>`);
  setTimeout(() => { const i = $('#bkg', s.el); i && i.select(); }, 250);
  s.el.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'del') { body = body.filter(y => y.id !== d.id); saveBody(); s.close(); rerenderKeepScroll(); return; }
    d.kg = wIn($('#bkg', s.el).value);
    MEAS.forEach(([k]) => { d[k] = lIn($(`[data-m="${k}"]`, s.el).value); });
    if (d.kg == null && !MEAS.some(([k]) => d[k])) { toast('Enter your weight or a measurement'); return; }
    if (d.kg != null && (d.kg < 20 || d.kg > 400)) { toast(`That weight looks off. Check the unit (${wUnit()}).`); return; }
    if (MEAS.some(([k]) => d[k] != null && (d[k] < 10 || d[k] > 250))) { toast(`A measurement looks off. Check the unit (${lUnit()}).`); return; }
    if (isNew) { d.at = Date.now(); body.push(d); } else { const i = body.findIndex(y => y.id === d.id); if (i >= 0) body[i] = d; }
    saveBody(); s.close(); rerenderKeepScroll(); toast('Saved');
  });
}

function bodyHistory() {
  const rows = body.slice().sort((a, b) => b.at - a.at);
  const s = sheet(`<h2>Body log</h2><div class="mini-list">${rows.map(x => {
    const m = MEAS.filter(([k]) => x[k]).map(([k, n]) => `${n.toLowerCase()} ${lOut(x[k])}`).join(' · ');
    return `<button class="mrow" data-id="${x.id}"><span>${esc(parseKey(x.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}${m ? `<br><small style="color:var(--muted)">${esc(m)} ${lUnit()}</small>` : ''}</span><b>${x.kg != null ? `${wOut(x.kg)} ${wUnit()}` : '—'}</b></button>`;
  }).join('')}</div>`);
  s.el.addEventListener('click', e => { const r = e.target.closest('[data-id]'); if (!r) return; s.close(); openBodyEntry(body.find(x => x.id === r.dataset.id)); });
}

function showMeasure(k, name) {
  const rows = body.filter(x => x[k]).sort((a, b) => a.at - b.at);
  const pts = rows.map(x => ({ t: x.at, v: S.unit === 'lb' ? x[k] / 2.54 : x[k] }));
  sheet(`<h2>${esc(name)}</h2><p class="sub">${rows.length} measurement${rows.length === 1 ? '' : 's'} · ${lUnit()}</p>
    <div class="chart-card" style="padding:12px 10px 8px;background:var(--surface-2)">${pts.length > 1 ? lineChart(pts, { h: 140 }) : '<div style="color:var(--muted);font-size:13px;padding:10px 6px">Measure again on another day to see the trend.</div>'}</div>
    <div class="sect">History</div>
    <div class="mini-list">${rows.slice().reverse().map(x => `<div class="mrow"><span>${esc(parseKey(x.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }))}</span><b>${lOut(x[k])} ${lUnit()}</b></div>`).join('')}</div>`);
}

/* ---------- weekly plan editor ---------- */
function openPlanEditor() {
  const p = plan ? clone(plan) : emptyPlan();
  const scr = el(`<section class="screen">
    <header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Close">${ic('close')}</button></div>
      <h1>Weekly Plan</h1>
      <div class="tb-right"><button class="round-btn accent" data-a="save" aria-label="Save">${ic('check')}</button></div></header>
    <div class="scroll"><div class="page" id="pl"></div></div></section>`);
  const pl = $('#pl', scr);
  const order = [0, 1, 2, 3, 4, 5, 6].map(i => (i + S.weekStart) % 7);
  const paint = () => {
    pl.innerHTML = artCard('rings', 'Plan the week. Then just follow the plan.', { small: true }) + `<p style="color:var(--muted);font-size:14px;line-height:1.5;margin:0 4px 14px">Add what you train each day. Turn on the bell to get a reminder at that time. ${isNative ? '' : '<br><b style="color:var(--text)">Reminders work in the installed app.</b>'}</p>` + order.map(dw => {
      const day = p[dw];
      return `<div class="dayblock">
        <div class="dayhead"><span class="d">${WDL[dw].toUpperCase()}</span><button class="restlbl" data-a="rest" data-d="${dw}">Rest day <span class="toggle sm ${day.rest ? 'on' : ''}"></span></button></div>
        ${day.rest ? '' : day.items.map((it, i) => `<div class="dayitem"><span class="ii">${ic(itemIcon(it.type))}</span><span>${esc(it.name)}</span><button data-a="rm" data-d="${dw}" data-i="${i}" aria-label="Remove">${ic('close')}</button></div>`).join('')}
        ${day.rest ? '' : `<div class="dayfoot"><button class="addit" data-a="add" data-d="${dw}">${ic('plus')}Add</button>
          <span class="remind">${ic('bell')}<input type="time" data-d="${dw}" value="${esc(day.time || '06:00')}" ${day.remind ? '' : 'disabled'}><button data-a="remind" data-d="${dw}" aria-label="Reminder"><span class="toggle sm ${day.remind ? 'on' : ''}"></span></button></span></div>`}
      </div>`;
    }).join('');
  };
  let dirty = false;
  const close = async force => {
    if (!force && dirty && !(await confirmBox('Discard plan changes?', '', [{ label: 'Discard', cls: 'danger', value: 1 }, { label: 'Keep editing', cls: 'ghost', value: 0 }]))) return;
    unback(); scr.remove(); render();
  };
  const unback = pushBack(() => close());
  scr.addEventListener('change', e => { const t = e.target; if (t.type === 'time') { p[t.dataset.d].time = t.value || '06:00'; dirty = true; } });
  scr.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const dw = +b.dataset.d; const day = p[dw];
    switch (b.dataset.a) {
      case 'close': return close();
      case 'save': plan = p; savePlan(); await scheduleReminders(); close(true); toast('Plan saved'); return;
      case 'rest': day.rest = !day.rest; dirty = true; return paint();
      case 'remind': day.remind = !day.remind; dirty = true; return paint();
      case 'rm': day.items.splice(+b.dataset.i, 1); dirty = true; return paint();
      case 'add': return menu(`Add to ${WDL[dw]}`, [
        { icon: 'timer', label: 'Timer workout', run: () => pickTimerFor(t => { day.items.push({ type: 'timer', ref: t.id, name: t.name }); dirty = true; paint(); }) },
        { icon: 'dumbbell', label: 'Gym session', run: async () => { const n = await promptText('Gym session', { placeholder: 'E.G. LEG DAY', suggestions: ['Push', 'Pull', 'Legs', 'Upper body', 'Lower body', 'Full body', 'Chest & triceps', 'Back & biceps', 'Shoulders & arms'] }); if (n) { day.items.push({ type: 'gym', name: n }); dirty = true; paint(); } } },
        { icon: 'run', label: 'Other activity', run: async () => { const n = await promptText('Activity', { placeholder: 'E.G. 5 KM RUN', suggestions: ['Running', 'Walk', 'Cycling', 'Swimming', 'Yoga', 'Stretching', 'Badminton', 'Football', 'Cricket'] }); if (n) { day.items.push({ type: 'note', name: n }); dirty = true; paint(); } } },
      ]);
    }
  });
  paint();
  layer.appendChild(scr);
}

function pickTimerFor(cb) {
  const s = sheet(`<h2>Choose a timer</h2>
    <div class="sect" style="margin-top:6px">My timers</div>${timers.map(t => timerCard(t, { menuBtn: false })).join('') || '<div class="empty" style="padding:10px">No timers yet.</div>'}
    <div class="sect">Templates</div>${allTemplates().filter(t => !t.noLog).map(t => timerCard(t, { menuBtn: false })).join('')}`);
  s.el.addEventListener('click', e => { const c = e.target.closest('.tcard'); if (!c) return; const t = findTimer(c.dataset.id); s.close(); cb(t); });
}

/* ---------- backup & restore ---------- */
function backupData() {
  return { app: 'muscle-money', version: 4, exportedAt: new Date().toISOString(), timers, log, body, plan, customEx, steps: STP.days, program: Program.current, money: Money.data, health: Object.assign(Health.data, { photos: [] }), workouts: Coach.mine, settings: S };
}
async function exportBackup() {
  const json = JSON.stringify(backupData());
  const fname = `muscle-money-backup-${dkey(new Date())}.json`;
  try {
    if (P.Filesystem && P.Share) {
      const r = await P.Filesystem.writeFile({ path: fname, data: json, directory: 'CACHE', encoding: 'utf8' });
      await P.Share.share({ title: 'Muscle & Money backup', text: `Muscle & Money backup · ${log.length} workouts · ${Money.data.txns.length} money entries`, files: [r.uri], dialogTitle: 'Save backup to Drive, WhatsApp, Files…' });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = fname; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    S.lastBackup = Date.now(); saveSettings();
    toast('Backup ready. Keep it somewhere safe like Google Drive.');
    if (currentTab === 'settings' || currentTab === 'today') rerenderKeepScroll();
  } catch (e) {
    if (String(e && e.message || e).toLowerCase().includes('cancel')) return;
    toast('Backup failed: ' + (e && e.message ? e.message : 'unknown error'));
  }
}
function importBackup() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '*/*';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = async () => {
      let data;
      try { data = JSON.parse(rd.result); } catch (e) { toast('That file is not a Muscle & Money backup'); return; }
      if (!data || !['kranthi-workouts', 'muscle-money'].includes(data.app)) { toast('That file is not a Muscle & Money backup'); return; }
      const when = data.exportedAt ? new Date(data.exportedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'unknown date';
      const v = await confirmBox('Restore backup?', `From ${when}: ${(data.timers || []).length} timers, ${(data.log || []).length} workouts, ${(data.body || []).length} weigh-ins.`, [
        { label: 'Merge with what\'s on this phone', cls: 'primary', value: 'merge' }, { label: 'Replace everything', cls: 'danger', value: 'replace' }, { label: 'Cancel', cls: 'ghost', value: null }]);
      if (!v) return;
      const byId = (a, b) => { const m = new Map(); (a || []).forEach(x => m.set(x.id, x)); (b || []).forEach(x => { if (!m.has(x.id)) m.set(x.id, x); }); return [...m.values()]; };
      if (v === 'replace') {
        timers = data.timers || []; log = data.log || []; body = data.body || []; plan = data.plan || null; customEx = data.customEx || [];
        Program.current = data.program || null; if (data.program) DB.set('program', data.program); else DB.del('program');
        if (data.money) Money.data = data.money;
        if (data.health) Health.data = data.health;
        if (data.workouts) Coach.mine = data.workouts;
        if (data.settings) { const keep = { notifAsked: S.notifAsked }; Object.assign(S, DEFAULTS, data.settings, keep); }
      } else {
        timers = byId(timers, data.timers); log = byId(log, data.log); body = byId(body, data.body);
        customEx = [...new Set([...customEx, ...(data.customEx || [])])];
        if (!hasPlan() && data.plan) plan = data.plan;
        if (!Program.current && data.program) { Program.current = data.program; DB.set('program', data.program); }
        if (data.money) { const cur = Money.data; const inc = data.money; Money.data = Object.assign({}, inc, cur, { setup: cur.setup || inc.setup, txns: byId(cur.txns, inc.txns), bills: byId(cur.bills, inc.bills), rules: Object.assign({}, inc.rules, cur.rules), cats: byId(cur.cats, inc.cats), accounts: byId(cur.accounts, inc.accounts), goals: byId(cur.goals, inc.goals), people: byId(cur.people, inc.people), transfers: byId(cur.transfers, inc.transfers), settles: byId(cur.settles, inc.settles), limits: Object.assign({}, inc.limits, cur.limits) }); }
        if (data.health) Health.merge(data.health);
        if (data.workouts) Coach.mine = byId(Coach.mine, data.workouts);
      }
      Object.entries(data.steps || {}).forEach(([d, v]) => { STP.days[d] = Math.max(STP.days[d] || 0, v || 0); }); DB.set('steps', STP.days);
      saveTimers(); saveLog(); saveBody(); savePlan(); DB.set('customEx', customEx); saveSettings();
      applyTheme(); scheduleReminders(true); render();
      toast(v === 'replace' ? 'Backup restored' : 'Backup merged');
    };
    rd.readAsText(f);
  };
  document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
}

/* ---------- settings ---------- */
function viewSettings() {
  const row = (k, t, sub) => `<button class="set-row" data-k="${k}"><span class="st"><div class="t">${t}</div>${sub ? `<div class="s">${sub}</div>` : ''}</span><span class="toggle ${S[k] ? 'on' : ''}"></span></button>`;
  const since = S.lastBackup ? Math.floor((Date.now() - S.lastBackup) / 864e5) : null;
  view.innerHTML = topbar('Settings') + `<div class="page">
    <div class="sect">Appearance</div>
    <div class="block">
      <div class="set-row" style="padding-bottom:10px"><span class="st"><div class="t">Theme</div></span></div>
      <div style="padding:0 16px 12px"><div class="seg" style="background:var(--surface-2);margin:0"><button class="${S.theme !== 'light' ? 'on' : ''}" data-theme="dark">Dark</button><button class="${S.theme === 'light' ? 'on' : ''}" data-theme="light">Light</button></div></div>
      <div class="set-row" style="padding:6px 16px 10px;border-top:1px solid var(--line)"><span class="st"><div class="t">Accent colour</div></span></div>
      <div class="swatches">${ACCENTS.map(([n, c]) => `<button data-acc="${c}" class="${c.toLowerCase() === S.accent.toLowerCase() ? 'on' : ''}" style="background:${c}" aria-label="${n}"></button>`).join('')}</div>
    </div>
    <div class="sect">Sound & alerts</div>
    <div class="block">
      ${row('beeps', 'Beeps', 'Sound at the start of every interval')}
      <div class="opt-row">${Object.entries(SOUNDS).map(([k, v]) => `<button class="chip small ${S.sound === k ? 'on' : ''}" data-snd="${k}">${v.name}</button>`).join('')}</div>
      ${row('countdown', 'Countdown', '3 · 2 · 1 before each interval ends')}
      ${row('voiceCount', 'Spoken countdown', 'Says "3, 2, 1" out loud instead of beeping')}
      ${row('voice', 'Voice cues', 'Speaks "Work", "Rest", exercise names and "Last one"')}
      ${row('halfway', 'Halfway call', 'Says "Halfway" in work intervals of 20s or longer')}
      ${isNative ? row('duck', 'Lower music while speaking', 'Spotify or YouTube Music dips briefly for each cue') : ''}
      ${row('vibrate', 'Vibration', 'Buzz when the interval changes')}
      <button class="set-row" data-a="test"><span class="st"><div class="t">Test sound</div><div class="s">Check your volume before a workout</div></span>${ic('sound')}</button>
    </div>
    <div class="sect">Screen</div>
    <div class="block">
      ${row('flash', 'Screen flash', 'Flash the screen on every interval change')}
      ${row('keepAwake', 'Keep screen on', 'Screen stays awake while a timer is running')}
    </div>
    <div class="sect">Background & reminders</div>
    <div class="block">
      ${row('background', 'Alerts in background', 'Notification sound for each interval when you switch apps or lock the phone')}
      ${isNative ? `<button class="set-row" data-a="exact"><span class="st"><div class="t">On-time alerts</div><div class="s">Allow "Alarms & reminders" so background alerts fire to the second</div></span><span class="val" id="exv">${BG.exact === true ? 'ON' : BG.exact === false ? 'ALLOW' : '—'}</span></button>` : ''}
      <button class="set-row" data-a="plan"><span class="st"><div class="t">Weekly plan</div><div class="s">${hasPlan() ? 'Edit your days and reminder times' : 'Plan your week and get reminders'}</div></span>${ic('chevR', 'chev')}</button>
    </div>
    <div class="sect">Steps</div>
    <div class="block">
      <button class="set-row" data-a="steps"><span class="st"><div class="t">Step counting</div><div class="s">${isNative ? (STP.enabled ? 'On. Saves your steps about every 15 minutes, even when the app is closed.' : 'Off. Uses the phone\'s step sensor with almost no battery.') : 'Works in the installed app'}</div></span><span class="toggle ${STP.enabled ? 'on' : ''}"></span></button>
      <button class="set-row" data-a="goal"><span class="st"><div class="t">Daily step goal</div><div class="s">You get a notification when you reach it</div></span><span class="val">${fmtN(S.stepGoal)}</span>${ic('chevR', 'chev')}</button>
      ${STP.enabled ? `<button class="set-row" data-a="stepreset"><span class="st"><div class="t">Reset today's steps</div><div class="s">Use this if today's number looks wrong. Counting restarts from now.</div></span>${ic('reset')}</button>` : ''}
      <button class="set-row" data-a="height"><span class="st"><div class="t">Height</div><div class="s">For distance and calories</div></span><span class="val">${S.height ? `${lOut(S.height)} ${lUnit().toUpperCase()}` : 'SET'}</span>${ic('chevR', 'chev')}</button>
    </div>
    <div class="sect">Units & calendar</div>
    <div class="block">
      <div class="set-row"><span class="st"><div class="t">Units</div><div class="s">Weight and measurements</div></span>
        <div class="seg" style="background:var(--surface-2);margin:0;width:150px"><button class="${S.unit !== 'lb' ? 'on' : ''}" data-unit="kg">kg · cm</button><button class="${S.unit === 'lb' ? 'on' : ''}" data-unit="lb">lb · in</button></div></div>
      <button class="set-row" data-a="week"><span class="st"><div class="t">Week starts on</div></span><span class="val">${S.weekStart === 1 ? 'MONDAY' : 'SUNDAY'}</span>${ic('chevR', 'chev')}</button>
    </div>
    <div class="sect">Your data</div>
    <div class="block">
      <button class="set-row" data-a="backup"><span class="st"><div class="t">Back up now</div><div class="s">${since === null ? 'No backup yet. Save one to Google Drive or WhatsApp.' : `Last backup ${since === 0 ? 'today' : since === 1 ? 'yesterday' : since + ' days ago'}`}</div></span>${ic('upload')}</button>
      <button class="set-row" data-a="restore"><span class="st"><div class="t">Restore from backup</div><div class="s">Pick a backup file. You can merge or replace.</div></span>${ic('download')}</button>
    </div>
    <div class="about"><b>MUSCLE &amp; MONEY</b><br>Version 4.5 · Personal edition<br>${timers.length} timers · ${log.length} workouts · ${body.length} weigh-ins</div>
  </div>`;
  view.querySelector('.page').addEventListener('click', async e => {
    const b = e.target.closest('[data-k],[data-a],[data-acc],[data-theme],[data-snd],[data-unit]'); if (!b) return;
    if (b.dataset.k) {
      const k = b.dataset.k; S[k] = !S[k]; saveSettings(); $('.toggle', b).classList.toggle('on', S[k]);
      if (k === 'background' && S[k]) BG.ensurePermission(true);
      return;
    }
    if (b.dataset.acc) { S.accent = b.dataset.acc; saveSettings(); applyTheme(); return rerenderKeepScroll(); }
    if (b.dataset.theme) { S.theme = b.dataset.theme; saveSettings(); applyTheme(); return rerenderKeepScroll(); }
    if (b.dataset.unit) { S.unit = b.dataset.unit; saveSettings(); return rerenderKeepScroll(); }
    if (b.dataset.snd) { S.sound = b.dataset.snd; saveSettings(); Snd.unlock(); Snd.play('tick', true); setTimeout(() => Snd.play('go', true), 600); $$('[data-snd]').forEach(x => x.classList.toggle('on', x === b)); return; }
    switch (b.dataset.a) {
      case 'test': {
        Snd.unlock();
        const cnt = n => (S.voiceCount ? say(String(n), true) : Snd.play('tick', true));
        cnt(3); setTimeout(() => cnt(2), 1000); setTimeout(() => cnt(1), 2000);
        setTimeout(() => { Snd.play('go', true); say('Work', true); buzz(300); }, 3000);
        return;
      }
      case 'week': S.weekStart = S.weekStart === 1 ? 0 : 1; saveSettings(); return rerenderKeepScroll();
      case 'plan': return openPlanEditor();
      case 'backup': return exportBackup();
      case 'restore': return importBackup();
      case 'steps': return STP.enabled ? (await confirmBox('Turn off step counting?', 'Steps already saved stay in your history.', [{ label: 'Turn off', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) && disableSteps() : enableSteps();
      case 'goal': return pickStepGoal();
      case 'stepreset': if (await confirmBox('Reset today\'s steps?', `Today shows ${fmtN(STP.today)} steps. This sets today to 0 and counts from now.`, [{ label: 'Reset', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) await resetTodaySteps(); return;
      case 'height': await askHeight(); return rerenderKeepScroll();
      case 'exact':
        if (P.LocalNotifications) {
          try { const r = await P.LocalNotifications.changeExactNotificationSetting(); BG.exact = r.exact_alarm === 'granted'; } catch (err) { /* ignore */ }
          const v = $('#exv'); if (v) v.textContent = BG.exact ? 'ON' : 'ALLOW';
        }
    }
  });
}

/* ---------- boot ---------- */
document.addEventListener('visibilitychange', () => { if (!document.hidden && Awake.want) Awake.on(); });
// program.js loads after this file, so draw the first screen once every script has run.
window.addEventListener('DOMContentLoaded', () => {
  const wantMoney = S.mode === 'money';
  S.mode = 'muscle'; currentTab = 'today';
  renderTabs(); paintModebar(); render();
  if (wantMoney) Money.openMoney();
  Money.boot();
  Health.scheduleScorecard();
  setTimeout(maybeOnboard, 300);
  pushWidget();
});
BG.init().then(() => { if (hasPlan()) scheduleReminders(true); });
stepsInit();
if (!isNative && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
