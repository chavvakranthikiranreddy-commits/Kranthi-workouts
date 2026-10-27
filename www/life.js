/* Vyora: the Life side.
   Home (today's agenda, weather, quote, tools), Notes, Tasks (to-do, reminders, habits, shopping lists),
   Clock (alarms with your own ringtones, world clock, bedtime & smart wake) and tools:
   journal, focus timer, medicine & water reminders, birthdays & countdowns, weather, calculator & converter.
   Uses helpers from app.js ($, $$, el, esc, ic, sheet, menu, toast, confirmBox, DB, S, P, uid, dkey, parseKey, addDays, today0, pad ...). */
'use strict';

const Life = (() => {
  const fresh = () => ({ notes: [], reminders: [], tasks: [], habits: [], lists: [], journal: [], events: [], meds: [], medLog: {}, water: { on: false, from: '08:00', to: '21:00', every: 2 },
    focus: { work: 25, brk: 5, long: 15, sessions: [] }, cities: ['Asia/Kolkata', 'America/New_York', 'Europe/London'], weather: null, alarms: [], tones: [], bed: { on: false, bed: '23:00', wake: '06:30', days: [1, 1, 1, 1, 1, 1, 1], remind: 30 }, journalLock: false, nid: 10000, calcHist: [], docs: [] });
  let L = Object.assign(fresh(), DB.get('life', {}));
  /* Journal entries and document numbers/notes are kept encrypted (Android Keystore key via the Vault plugin).
     The plain copy holds everything else, so reminders, widgets and the home screen work without decrypting. */
  let secSealed = !!(DB.get('lifesec', null) || {}).blob;
  let secFailed = false;
  let secSaving = Promise.resolve();
  const secretsOf = () => ({ journal: L.journal, docs: Object.fromEntries((L.docs || []).map(d => [d.id, { number: d.number || '', note: d.note || '' }])) });
  const save = () => {
    if (!(P.Vault && L.secure)) return DB.set('life', L);
    const plain = clone(L); plain.journal = []; plain.docs = (plain.docs || []).map(d => { const c = Object.assign({}, d); delete c.number; delete c.note; return c; });
    const ok = DB.set('life', plain);
    if (!secSealed) { const snap = JSON.stringify(secretsOf()); secSaving = secSaving.then(async () => { try { const r = await P.Vault.encrypt({ text: snap }); if (DB.set('lifesec', { enc: 1, blob: r.data, at: Date.now() }) === false) logProblem('Could not save journal securely', 'life'); } catch (e) { logProblem('Could not encrypt journal', 'life'); toast('Could not save your journal securely. Try again.'); } }); }
    return ok;
  };
  async function unsealLife() {
    if (!P.Vault) return;
    if (!secSealed) { if (!L.secure) { L.secure = true; save(); } return; }
    try {
      const r = await P.Vault.decrypt({ data: DB.get('lifesec', {}).blob }); const sec = JSON.parse(r.text);
      L.journal = sec.journal || []; (L.docs || []).forEach(d => { const x = (sec.docs || {})[d.id]; if (x) { d.number = x.number; d.note = x.note; } });
      secSealed = false; L.secure = true;
    } catch (e) { secFailed = true; logProblem('Could not decrypt journal', 'life'); }
  }
  const lifeLockedMsg = () => toast('Your journal and document details can\'t be opened on this phone. Restore them from a Vyora backup.');
  let tab = 'home', taskSeg = 'todo', clockSeg = 'alarms', noteQuery = '';
  const nextNid = () => { L.nid = (L.nid || 10000) + 10; return L.nid; };
  const WDS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const t12 = hm => { const [h, m] = String(hm || '0:0').split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`; };
  const hmNow = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const dayName = k => { const d = parseKey(k), t = today0(); const diff = Math.round((d - t) / 864e5); return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : diff === -1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };
  const checkBtn = (on, attr) => `<button class="lchk ${on ? 'on' : ''}" ${attr} aria-label="${on ? 'Mark not done' : 'Mark done'}">${ic('check')}</button>`;

  /* ---------- notifications for the Life side ---------- */
  let schedTimer = 0;
  function reschedule() { clearTimeout(schedTimer); schedTimer = setTimeout(doSchedule, 400); }
  async function doSchedule() {
    if (!P.LocalNotifications) return;
    try {
      const pend = await P.LocalNotifications.getPending();
      const old = (pend.notifications || []).filter(n => n.id >= 10000).map(n => ({ id: n.id }));
      if (old.length) await P.LocalNotifications.cancel({ notifications: old });
      const perm = await P.LocalNotifications.checkPermissions(); if (perm.display !== 'granted') { L.sched = { at: Date.now(), denied: true }; return; }
      const list = [], now = new Date();
      const N = (id, title, body, schedule, ch) => list.push({ id, title, body, channelId: ch || 'kw_remind', schedule: Object.assign({ allowWhileIdle: true }, schedule), isExactNotification: false, smallIcon: 'ic_stat_kw', iconColor: S.accent });
      const atNext = (hm, fromDate) => { const [h, m] = hm.split(':').map(Number); const d = new Date(fromDate || now); d.setHours(h, m, 0, 0); return d; };
      L.reminders.filter(r => r.on).forEach(r => {
        const [h, m] = r.time.split(':').map(Number);
        if (r.repeat === 'daily') N(r.nid, '🔔 ' + r.title, r.note || 'Reminder', { on: { hour: h, minute: m } });
        else if (r.repeat === 'weekly') r.days.forEach((on, d) => { if (on) N(r.nid + d, '🔔 ' + r.title, r.note || 'Reminder', { on: { weekday: d + 1, hour: h, minute: m } }); });
        else { const at = nextOccur(r); if (at && at > now) N(r.nid, '🔔 ' + r.title, r.note || 'Reminder', { at }); }
      });
      L.tasks.filter(t => !t.done && t.due && t.time).forEach(t => { const at = atNext(t.time, parseKey(t.due)); if (at > now) N(t.nid, '✅ ' + t.title, 'Task due', { at }); });
      L.habits.filter(h => h.time).forEach(h => { const [hh, mm] = h.time.split(':').map(Number); N(h.nid, `${h.icon} ${h.name}`, 'Keep your streak going', { on: { hour: hh, minute: mm } }); });
      L.meds.filter(md => md.on !== false).forEach(md => md.times.forEach((tm, i) => { const [hh, mm] = tm.split(':').map(Number); N(md.nid + i, S.notifDetails ? `💊 ${md.name}` : '💊 Medicine reminder', S.notifDetails ? (md.dose ? `Take ${md.dose}` : 'Time for your medicine') : 'Open Vyora to see which one', { on: { hour: hh, minute: mm } }, 'kw_private'); }));
      if (L.water.on) waterTimes().forEach((tm, i) => { const [hh, mm] = tm.split(':').map(Number); N(90000 + i, '💧 Drink water', 'A glass now keeps you on track', { on: { hour: hh, minute: mm } }); });
      L.events.forEach(ev => { const nx = nextEvent(ev); if (!nx) return; [0, ev.before || 0].filter((v, i, a) => a.indexOf(v) === i).forEach((b, i) => { const at = addDays(nx, -b); at.setHours(9, 0, 0, 0); if (at > now) N(ev.nid + i, `${ev.type === 'birthday' ? '🎂' : ev.type === 'anniversary' ? '💍' : '📅'} ${ev.name}`, b ? `In ${b} day${b > 1 ? 's' : ''}` : ev.type === 'birthday' ? 'Birthday today. Send your wishes!' : 'Today', { at }); }); });
      if (L.bed.on && L.bed.remind) L.bed.days.forEach((on, d) => { if (!on) return; const [hh, mm] = L.bed.bed.split(':').map(Number); const t = (hh * 60 + mm - L.bed.remind + 1440) % 1440; N(91000 + d, '🌙 Bedtime soon', `Wind down for ${t12(L.bed.bed)}. Phone away, lights low.`, { on: { weekday: ((d - (hh * 60 + mm < L.bed.remind ? 1 : 0) + 7) % 7) + 1, hour: Math.floor(t / 60), minute: t % 60 } }); });
      (L.docs || []).filter(d => d.exp).forEach(d => { const ex = parseKey(d.exp); [[d.before || 30, 0], [0, 1]].forEach(([b, j]) => { const at = addDays(ex, -b); at.setHours(9, 0, 0, 0); if (at > now) N(d.nid + j, S.notifDetails ? `📄 ${d.name} ${b ? 'expires in ' + b + ' days' : 'expires today'}` : `📄 A document ${b ? 'expires in ' + b + ' days' : 'expires today'}`, 'Renew it in time. Open Documents in Vyora.', { at }, 'kw_private'); }); });
      // Android allows a limited number of pending notifications: keep the soonest ones and say if some were left out.
      const nextAt = n => { const sc = n.schedule; if (sc.at) return +new Date(sc.at); const o = sc.on || {}; const d = new Date(); d.setSeconds(0, 0); d.setHours(o.hour || 0, o.minute || 0); for (let i = 0; i < 8; i++) { if (d > now && (o.weekday == null || d.getDay() + 1 === o.weekday)) return +d; d.setDate(d.getDate() + 1); } return +d; };
      list.sort((a, b) => nextAt(a) - nextAt(b));
      const MAX = 300;
      if (list.length) await P.LocalNotifications.schedule({ notifications: list.slice(0, MAX) });
      L.sched = { at: Date.now(), total: list.length, scheduled: Math.min(list.length, MAX), error: null };
    } catch (e) { L.sched = { at: Date.now(), error: String(e && e.message || e) }; logProblem('Reminders could not be scheduled', 'life'); }
  }
  // Permission and scheduling status, so a reminder never silently fails.
  function notifStatusHtml() {
    const st = L.sched || {};
    if (!isNative) return `<div class="mwarn">${ic('info')}<span>Reminders pop up in the installed app.</span></div>`;
    if (st.denied) return `<button class="mwarn bad" data-a="notifperm">${ic('bell')}<span><b>Notifications are off for Vyora.</b> Reminders won't appear. Tap to allow them.</span></button>`;
    if (st.error) return `<div class="mwarn bad">${ic('info')}<span>Reminders couldn't be scheduled (${esc(st.error)}). Try again, or restart the phone.</span></div>`;
    return `<div class="nstatus">${ic('check')}<span>${st.total ? `${st.scheduled} reminder alerts scheduled${st.total > st.scheduled ? ` · <b class="badt">${st.total - st.scheduled} later ones will be added as the soonest ones pass</b>` : ''}` : 'Notifications allowed'} · Battery saver can delay alerts on some phones.</span><button class="btn sm" data-a="notiftest">Test</button></div>`;
  }
  async function askNotif() { try { if (typeof BG !== 'undefined') await BG.ensurePermission(true); } catch (e) { /* ignore */ } }
  function nextOccur(r) {
    const [h, m] = r.time.split(':').map(Number); const now = new Date();
    const base = parseKey(r.date || dkey(now)); base.setHours(h, m, 0, 0);
    if (r.repeat === 'once' || !r.repeat) return base;
    let d = new Date(base);
    for (let i = 0; i < 400 && d <= now; i++) {
      if (r.repeat === 'monthly') d = new Date(d.getFullYear(), d.getMonth() + 1, Math.min(base.getDate(), new Date(d.getFullYear(), d.getMonth() + 2, 0).getDate()), h, m);
      else if (r.repeat === 'yearly') d = new Date(d.getFullYear() + 1, base.getMonth(), base.getDate(), h, m);
      else d = addDays(d, 1);
    }
    return d;
  }
  function nextEvent(ev) {
    const [y, mo, da] = ev.date.split('-').map(Number); const t0 = today0();
    if (!ev.yearly) { const d = new Date(y, mo - 1, da); return d >= t0 ? d : null; }
    let d = new Date(t0.getFullYear(), mo - 1, da); if (d < t0) d = new Date(t0.getFullYear() + 1, mo - 1, da); return d;
  }
  function waterTimes() {
    const [fh, fm] = L.water.from.split(':').map(Number), [th, tm] = L.water.to.split(':').map(Number);
    const out = []; for (let x = fh * 60 + fm; x <= th * 60 + tm && out.length < 16; x += Math.round(L.water.every * 60)) out.push(`${pad(Math.floor(x / 60))}:${pad(x % 60)}`);
    return out;
  }

  /* ---------- Home ---------- */
  const WX = { 0: ['☀️', 'Clear'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Cloudy'], 45: ['🌫️', 'Fog'], 48: ['🌫️', 'Fog'], 51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'], 61: ['🌦️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'], 66: ['🌧️', 'Freezing rain'], 67: ['🌧️', 'Freezing rain'], 71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 77: ['🌨️', 'Snow grains'], 80: ['🌦️', 'Showers'], 81: ['🌧️', 'Showers'], 82: ['⛈️', 'Heavy showers'], 85: ['🌨️', 'Snow showers'], 86: ['🌨️', 'Snow showers'], 95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Storm with hail'], 99: ['⛈️', 'Storm with hail'] };
  const wx = c => WX[c] || ['🌡️', 'Weather'];
  function agenda() {
    const k = dkey(new Date()), now = new Date(), items = [];
    L.reminders.filter(r => r.on).forEach(r => {
      const due = r.repeat === 'daily' || (r.repeat === 'weekly' && r.days[now.getDay()]) || (dkey(nextOccur(r)) === k);
      if (due) items.push({ t: r.time, html: `<div class="agi"><span class="agt">${t12(r.time)}</span><span class="agx">🔔 ${esc(r.title)}</span></div>` });
    });
    L.tasks.filter(t => !t.done && t.due && t.due <= k).forEach(t => items.push({ t: t.time || '23:59', html: `<div class="agi">${checkBtn(false, `data-tdone="${t.id}"`)}<span class="agx">${esc(t.title)}${t.due < k ? ' <em class="badt">overdue</em>' : ''}</span>${t.time ? `<span class="agt">${t12(t.time)}</span>` : ''}</div>` }));
    L.meds.filter(md => md.on !== false).forEach(md => md.times.forEach((tm, i) => { const st = ((L.medLog[k] || {})[md.id] || {})[i]; items.push({ t: tm, html: `<div class="agi"><span class="agt">${t12(tm)}</span><span class="agx">💊 ${esc(md.name)}${md.dose ? ` · ${esc(md.dose)}` : ''}</span>${st ? `<span class="agok ${st}">${st === 'taken' ? 'Taken ✓' : 'Skipped'}</span>` : `<button class="btn sm" data-med="${md.id}:${i}">Taken</button>`}</div>` }); }));
    (billsSafe(0) || []).forEach(b => items.push({ t: '00:00', html: billRow(b) }));
    return items.sort((a, b) => a.t.localeCompare(b.t)).map(x => x.html).join('');
  }
  // Money bills on the Life side (hidden while Money is locked).
  function billsSafe(days) { try { return typeof Money !== 'undefined' && Money.billsDue ? Money.billsDue(days) : null; } catch (e) { return null; } }
  function billRow(b) {
    const days = Math.round((b.due - today0()) / 864e5);
    const when = b.overdue ? '<em class="badt">overdue</em>' : days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `in ${days} days`;
    return `<div class="agi"><span class="agt">₹${Math.round(b.amount || 0).toLocaleString('en-IN')}</span><span class="agx">🧾 ${esc(b.name)} · ${when}</span><button class="btn sm" data-paybill="${b.id}|${dkey(b.due)}">Paid</button></div>`;
  }
  function habitsMini() {
    if (!L.habits.length) return '';
    const k = dkey(new Date());
    return `<div class="sect"><span>Habits</span><button class="linkbtn" data-go="tasks:habits">All</button></div><div class="habrow">${L.habits.map(h => `<button class="habchip ${(h.log || {})[k] ? 'on' : ''}" data-hab="${h.id}"><span>${h.icon}</span><b>${esc(h.name)}</b><small>${streak(h)}🔥</small></button>`).join('')}</div>`;
  }
  function upcomingEvents(days = 30) {
    return L.events.map(ev => ({ ev, d: nextEvent(ev) })).filter(x => x.d && (x.d - today0()) / 864e5 <= days).sort((a, b) => a.d - b.d);
  }
  const TOOLS = [['journal', 'book', 'Journal'], ['focus', 'target', 'Focus'], ['weather', 'sun', 'Weather'], ['meds', 'pill', 'Medicine'], ['water', 'drop', 'Water'], ['events', 'cake', 'Birthdays'], ['calc', 'calc', 'Calculator'], ['convert', 'swap', 'Converter'], ['lists', 'cart', 'Shopping'], ['docs', 'lock', 'Documents'], ['world', 'globe', 'World clock'], ['voice', 'mic', 'Voice add'], ['brief', 'sun', 'Briefing'], ['bills', 'wallet', 'Bills'], ['alarm', 'clock', 'Alarms']];
  const favTools = () => (Array.isArray(L.favTools) && L.favTools.length ? L.favTools : ['journal', 'meds', 'docs', 'lists', 'focus', 'weather', 'calc', 'events', 'brief']);
  // All tools, with a star to pin your favourites to Today.
  function allTools() {
    const s = sheet(`<h2>All tools</h2><p class="sub">Tap a tool to open it. Tap ☆ to pin it to Today.</p><div class="block" style="padding:0" id="atl"></div>`);
    const paint = () => { const f = favTools(); $('#atl', s.el).innerHTML = TOOLS.map(([k, icn, n]) => `<div class="lrow"><button class="lrm atrow" data-open="${k}"><span class="atico">${ic(icn)}</span><b>${n}</b></button><button class="round-btn sm fav ${f.includes(k) ? 'on' : ''}" data-fav="${k}" aria-label="${f.includes(k) ? 'Remove from favourites' : 'Add to favourites'}">${f.includes(k) ? '★' : '☆'}</button></div>`).join(''); };
    paint();
    s.el.addEventListener('click', e => {
      const fv = e.target.closest('[data-fav]'); if (fv) { const f = favTools().slice(); const k = fv.dataset.fav; const i = f.indexOf(k); if (i >= 0) f.splice(i, 1); else f.push(k); L.favTools = f.length ? f : ['journal']; save(); paint(); refresh(); return; }
      const o = e.target.closest('[data-open]'); if (o) { s.close(); setTimeout(() => openTool(o.dataset.open), 150); }
    });
  }
  function homeView() {
    const now = new Date(); const h = now.getHours();
    const nextA = nextAlarm();
    const ev = upcomingEvents(14).slice(0, 3);
    const w = L.weather && L.weather.data;
    view.innerHTML = `<div class="page life" style="padding-top:12px">
      <div class="hello2"><div><div class="hi">${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}${S.name ? ', ' + esc(S.name) : ''}</div><div class="dt">${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>
        <button class="lclock" data-go="clock">${ic('clock')}<b>${nextA ? t12(nextA.hm) : 'No alarm'}</b></button></div>
      <div class="lhero"><button class="lvoice" data-a="voice">${ic('mic')}<span><b>Speak to add</b><small>“Remind me to pay rent on the 5th”</small></span></button><button class="lbrief" data-a="brief">${ic('sun')}<span><b>${h < 12 ? 'Morning' : 'Day'} briefing</b><small>Hear your day</small></span></button></div>
      ${w ? `<button class="wxcard" data-tool="weather"><span class="wxi">${wx(w.current.weather_code)[0]}</span><span class="wxt"><b>${Math.round(w.current.temperature_2m)}°</b><span>${esc(wx(w.current.weather_code)[1])} · ${esc(L.weather.name)}</span><small>H ${Math.round(w.daily.temperature_2m_max[0])}° · L ${Math.round(w.daily.temperature_2m_min[0])}°${w.daily.precipitation_probability_max ? ` · ${w.daily.precipitation_probability_max[0]}% rain` : ''}</small></span>${ic('chevR', 'chev')}</button>`
        : `<button class="nudge" data-tool="weather">${ic('sun')}<span><b>Add your city</b> for today's weather and the 7-day forecast.</span></button>`}
      ${artCard('summit', pickQuote('life'), { small: true, tag: 'Thought for today' })}
      <div class="sect"><span>Today</span><button class="linkbtn" data-add="reminder">+ Reminder</button></div>
      <div class="block agenda">${agenda() || '<div class="empty" style="padding:16px">Nothing scheduled. Add a reminder, task or medicine and it shows up here.</div>'}</div>
      ${habitsMini()}
      ${(() => { const bl = (billsSafe(7) || []).filter(b => !b.overdue && Math.round((b.due - today0()) / 864e5) > 0); return ev.length || bl.length ? `<div class="sect"><span>Coming up</span><button class="linkbtn" data-tool="events">All</button></div><div class="block" style="padding:0">${ev.map(x => evRow(x.ev, x.d)).join('')}${bl.length ? `<div class="agenda">${bl.map(billRow).join('')}</div>` : ''}</div>` : ''; })()}
      ${docsSoon().length ? `<button class="nudge warn" data-tool="docs">${ic('doc')}<span><b>${esc(docsSoon()[0].name)}</b> ${docExpTxt(docsSoon()[0])}. Tap to see your documents.</span></button>` : ''}
      <div class="sect"><span>Favourite tools</span><button class="linkbtn" data-a="alltools">See all tools</button></div>
      <div class="tools">${favTools().map(k => TOOLS.find(t => t[0] === k)).filter(Boolean).map(([k, icn, n]) => `<button data-tool="${k}"><span>${ic(icn)}</span><b>${n}</b></button>`).join('')}<button data-a="alltools" aria-label="See all tools"><span>${ic('more')}</span><b>All tools</b></button></div>
    </div>`;
    if (L.weather && (!L.weather.at || Date.now() - L.weather.at > 30 * 60000)) refreshWeather(true);
  }

  /* ---------- Notes ---------- */
  const NOTE_COLORS = ['', '#FFD43B', '#22D46A', '#4D8DFF', '#FF9F1C', '#B26BFF', '#FF4057'];
  function notesView() {
    const q = noteQuery.toLowerCase();
    const list = L.notes.filter(n => !q || (n.title + ' ' + n.body + ' ' + (n.items || []).map(i => i.t).join(' ')).toLowerCase().includes(q)).sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || b.at - a.at);
    view.innerHTML = topbar('Notes') + `<div class="page">
      <input class="search" id="nq" placeholder="Search notes" value="${esc(noteQuery)}">
      <div class="ngrid">${list.map(n => { const items = n.items || []; const done = items.filter(i => i.d).length; return `<button class="ncard" data-note="${n.id}" style="${n.color ? `--nc:${n.color}` : ''}">${n.pin ? `<span class="npin">${ic('pin')}</span>` : ''}${n.title ? `<b>${esc(n.title)}</b>` : ''}
        ${n.type === 'list' ? `<span class="nitems">${items.slice(0, 5).map(i => `<span class="${i.d ? 'd' : ''}">${i.d ? '☑' : '☐'} ${esc(i.t)}</span>`).join('')}</span><small>${done}/${items.length} done</small>` : `<span class="nbody">${esc((n.body || '').slice(0, 160))}</span>`}
        ${n.remind ? `<small class="nrem">🔔 ${esc(dayName(n.remind.date))} ${t12(n.remind.time)}</small>` : ''}</button>`; }).join('') || `<div class="empty" style="grid-column:1/-1"><b>${q ? 'No matching notes' : 'No notes yet'}</b>${q ? '' : 'Tap + to write a note or a checklist.'}</div>`}</div>
    </div><button class="fab" data-add="note" aria-label="New note">${ic('plus')}</button>`;
    const nq = $('#nq', view); nq.addEventListener('input', () => { noteQuery = nq.value; const p = nq.selectionStart; notesView(); const n2 = $('#nq', view); n2.focus(); n2.setSelectionRange(p, p); });
  }
  function noteEditor(note, type) {
    const isNew = !note; let painting = false;
    const n = note ? clone(note) : { id: uid(), type: type || 'text', title: '', body: '', items: [], color: '', pin: false, at: Date.now() };
    const scr = el(`<section class="screen noteed" style="${n.color ? `--nc:${n.color}` : ''}"><header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Save and close">${ic('chevL')}</button></div><h1>${n.type === 'list' ? 'Checklist' : 'Note'}</h1><div class="tb-right"><button class="round-btn" data-a="more" aria-label="More">${ic('more')}</button></div></header>
      <div class="scroll"><div class="page"><input class="field body ntitle" id="nt" placeholder="Title" value="${esc(n.title)}" maxlength="80">
        <div id="nbody"></div>
        <div class="ncolors">${NOTE_COLORS.map(c => `<button class="${n.color === c ? 'on' : ''}" data-col="${c}" style="background:${c || 'var(--surface-2)'}" aria-label="Colour"></button>`).join('')}<button class="nopt ${n.pin ? 'on' : ''}" data-a="pin">${ic('pin')}${n.pin ? 'Pinned' : 'Pin'}</button><button class="nopt ${n.remind ? 'on' : ''}" data-a="remind">${ic('bell')}${n.remind ? `${esc(dayName(n.remind.date))} ${t12(n.remind.time)}` : 'Remind'}</button></div>
      </div></div></section>`);
    const paint = () => {
      const box = $('#nbody', scr);
      if (n.type === 'list') {
        box.innerHTML = `<div class="nlist">${n.items.map((it, i) => `<div class="nli ${it.d ? 'd' : ''}">${checkBtn(it.d, `data-ck="${i}"`)}<input class="nlt" data-it="${i}" value="${esc(it.t)}" placeholder="Item"><button class="round-btn sm" data-rm="${i}" aria-label="Remove">${ic('close')}</button></div>`).join('')}
          <div class="nli add"><span class="lchk ghost">${ic('plus')}</span><input class="nlt" id="nadd" placeholder="Add item" enterkeyhint="next"></div></div>`;
        const add = $('#nadd', scr);
        const take = refocus => { const v = add.value.trim(); if (!v || painting) return; add.value = ''; read(); n.items.push({ t: v, d: false }); painting = true; setTimeout(() => { paint(); painting = false; if (refocus) $('#nadd', scr).focus(); }, 0); };
        add.addEventListener('keydown', e => { if (e.key === 'Enter') take(true); });
        add.addEventListener('blur', () => take(false));
      } else box.innerHTML = `<textarea class="field body nta" id="nb" placeholder="Start writing…">${esc(n.body)}</textarea>`;
    };
    paint();
    layer.appendChild(scr);
    if (isNew) setTimeout(() => $(n.type === 'list' ? '#nadd' : '#nt', scr).focus(), 250);
    const read = () => { n.title = $('#nt', scr).value.trim(); if (n.type === 'list') $$('[data-it]', scr).forEach(i => { n.items[+i.dataset.it].t = i.value; }); else n.body = $('#nb', scr).value; };
    const persist = () => {
      read();
      if (!n.title && !n.body.trim() && !n.items.length) { if (!isNew) { L.notes = L.notes.filter(x => x.id !== n.id); save(); } return; }
      n.at = Date.now(); const i = L.notes.findIndex(x => x.id === n.id); if (i >= 0) L.notes[i] = n; else L.notes.unshift(n);
      // A note reminder is a normal one-off reminder linked to the note.
      L.reminders = L.reminders.filter(r => r.note_id !== n.id);
      if (n.remind) L.reminders.push({ id: uid(), nid: nextNid(), note_id: n.id, title: n.title || 'Note', note: (n.body || '').slice(0, 80), time: n.remind.time, date: n.remind.date, repeat: 'once', days: [0, 0, 0, 0, 0, 0, 0], on: true });
      save(); reschedule();
    };
    const close = () => { persist(); unback(); scr.remove(); refresh(); };
    const unback = pushBack(close);
    scr.addEventListener('click', async e => {
      const ck = e.target.closest('[data-ck]'); if (ck) { read(); const it = n.items[+ck.dataset.ck]; it.d = !it.d; return paint(); }
      const rm = e.target.closest('[data-rm]'); if (rm) { read(); n.items.splice(+rm.dataset.rm, 1); return paint(); }
      const col = e.target.closest('[data-col]'); if (col) { n.color = col.dataset.col; $$('[data-col]', scr).forEach(x => x.classList.toggle('on', x === col)); scr.style.setProperty('--nc', n.color || 'transparent'); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') return close();
      if (b.dataset.a === 'pin') { n.pin = !n.pin; b.classList.toggle('on', n.pin); b.innerHTML = ic('pin') + (n.pin ? 'Pinned' : 'Pin'); return; }
      if (b.dataset.a === 'remind') return whenSheet(n.remind, v => { n.remind = v; b.classList.toggle('on', !!v); b.innerHTML = ic('bell') + (v ? `${esc(dayName(v.date))} ${t12(v.time)}` : 'Remind'); if (v) askNotif(); }, true);
      if (b.dataset.a === 'more') return menu(n.title || 'Note', [
        { icon: 'list', label: n.type === 'list' ? 'Turn into a text note' : 'Turn into a checklist', run: () => { read(); if (n.type === 'list') { n.body = n.items.map(i => (i.d ? '✓ ' : '• ') + i.t).join('\n'); n.type = 'text'; } else { n.items = n.body.split('\n').map(x => x.replace(/^[•\-✓*]\s*/, '').trim()).filter(Boolean).map(t => ({ t, d: false })); n.type = 'list'; } $('h1', scr).textContent = n.type === 'list' ? 'Checklist' : 'Note'; paint(); } },
        { icon: 'share', label: 'Share', run: async () => { read(); const text = (n.title ? n.title + '\n' : '') + (n.type === 'list' ? n.items.map(i => (i.d ? '✓ ' : '• ') + i.t).join('\n') : n.body); try { if (P.Share) await P.Share.share({ text }); else if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Copied'); } } catch (err) { /* cancelled */ } } },
        { icon: 'copy', label: 'Duplicate', run: () => { read(); const c = clone(n); c.id = uid(); c.title = (n.title || 'Note') + ' copy'; c.remind = null; L.notes.unshift(c); save(); toast('Duplicated'); } },
        { icon: 'trash', label: 'Delete', danger: true, run: async () => { if (await confirmBox('Delete this note?', '', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { L.notes = L.notes.filter(x => x.id !== n.id); L.reminders = L.reminders.filter(r => r.note_id !== n.id); save(); reschedule(); unback(); scr.remove(); refresh(); } } },
      ]);
    });
  }
  // Date + time picker sheet. cb(null) clears.
  function whenSheet(cur, cb, allowClear) {
    const v = cur || { date: dkey(new Date()), time: (() => { const d = new Date(Date.now() + 3600e3); return `${pad(d.getHours())}:00`; })() };
    const s = sheet(`<h2>Remind me</h2>
      <div class="presets" style="justify-content:flex-start">${[['Later today', 0, null], ['Tomorrow 9 AM', 1, '09:00'], ['This weekend', ((6 - new Date().getDay()) + 7) % 7 || 7, '10:00'], ['Next week', 7, '09:00']].map(([n, dd, tm], i) => `<button class="chip small" data-p="${i}" data-dd="${dd}" data-tm="${tm || ''}">${n}</button>`).join('')}</div>
      <div class="mrow2 eq"><input class="field body" type="date" id="wd" value="${v.date}"><input class="field body" type="time" id="wt" value="${v.time}"></div>
      <div class="btns ${allowClear && cur ? 'two' : ''}">${allowClear && cur ? '<button class="btn" data-a="clr">Remove</button>' : ''}<button class="btn primary" data-a="ok">Set</button></div>`);
    s.el.addEventListener('click', e => {
      const p = e.target.closest('[data-p]'); if (p) { $('#wd', s.el).value = dkey(addDays(today0(), +p.dataset.dd)); $('#wt', s.el).value = p.dataset.tm || (() => { const d = new Date(Date.now() + 3 * 3600e3); return `${pad(d.getHours())}:00`; })(); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'clr') { s.close(); return cb(null); }
      s.close(); cb({ date: $('#wd', s.el).value || dkey(new Date()), time: $('#wt', s.el).value || '09:00' });
    });
  }

  /* ---------- Tasks tab: to-do, reminders, habits, lists ---------- */
  function streak(h) { const lg = h.log || {}; let n = 0, d = today0(); if (!lg[dkey(d)]) d = addDays(d, -1); while (lg[dkey(d)]) { n++; d = addDays(d, -1); } return n; }
  function tasksView() {
    const segs = [['todo', 'To-do'], ['rem', 'Reminders'], ['habits', 'Habits'], ['lists', 'Lists']];
    let body = '';
    const k = dkey(new Date());
    if (taskSeg === 'todo') {
      const open = L.tasks.filter(t => !t.done), done = L.tasks.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 20);
      const grp = (title, list) => list.length ? `<div class="sect">${title}</div><div class="block" style="padding:0">${list.map(taskRow).join('')}</div>` : '';
      body = `<div class="qadd"><input class="field body" id="tq" placeholder="Add a task…" enterkeyhint="done"><button class="round-btn" data-a="tdate" aria-label="Due date">${ic('calendar')}</button><button class="round-btn accent" data-a="tadd" aria-label="Add">${ic('plus')}</button></div><p class="hint" id="tdue"></p>
        ${grp('Overdue', open.filter(t => t.due && t.due < k))}${grp('Today', open.filter(t => t.due === k))}${grp('Upcoming', open.filter(t => t.due && t.due > k).sort((a, b) => a.due.localeCompare(b.due)))}${grp('Any time', open.filter(t => !t.due))}
        ${!open.length ? '<div class="empty"><b>All clear</b>Type a task above and press enter.</div>' : ''}${done.length ? `<div class="sect">Done</div><div class="block" style="padding:0">${done.map(taskRow).join('')}</div>` : ''}`;
    } else if (taskSeg === 'rem') {
      body = `${notifStatusHtml()}<button class="btn primary" data-add="reminder" style="margin-top:4px">${ic('plus')}New reminder</button>
        <div class="block" style="padding:0;margin-top:12px">${L.reminders.filter(r => !r.note_id || true).sort((a, b) => a.time.localeCompare(b.time)).map(r => `<div class="lrow"><button class="lrm" data-rem="${r.id}"><b>${esc(r.title)}</b><span>${t12(r.time)} · ${remRepeatTxt(r)}${r.note_id ? ' · from a note' : ''}</span></button><button class="toggle ${r.on ? 'on' : ''}" data-remtog="${r.id}" aria-label="On or off"></button></div>`).join('') || '<div class="empty" style="padding:18px">No reminders yet. Bills, calls, pills, anything.</div>'}</div>`;
    } else if (taskSeg === 'habits') {
      const days = []; for (let i = 6; i >= 0; i--) days.push(addDays(today0(), -i));
      body = `<button class="btn primary" data-a="habadd" style="margin-top:4px">${ic('plus')}New habit</button>
        ${L.habits.length ? `<div class="block" style="padding:0;margin-top:12px">${L.habits.map(h => `<div class="habit"><button class="hbm" data-habed="${h.id}"><span class="hico">${h.icon}</span><span class="wkt"><b>${esc(h.name)}</b><span>${streak(h)} day streak${h.time ? ' · 🔔 ' + t12(h.time) : ''}</span></span></button>
          <span class="hdots">${days.map(d => `<i class="${(h.log || {})[dkey(d)] ? 'on' : ''}" title="${dkey(d)}"></i>`).join('')}</span>${checkBtn(!!(h.log || {})[k], `data-hab="${h.id}"`)}</div>`).join('')}</div>` : '<div class="empty"><b>Build a habit</b>Read 10 pages, meditate, no sugar, call parents… tick it off each day and watch the streak grow.</div>'}`;
    } else {
      body = `<button class="btn primary" data-a="listadd" style="margin-top:4px">${ic('plus')}New list</button>
        ${L.lists.map(l => { const left = l.items.filter(i => !i.d).length; return `<button class="lcard" data-list="${l.id}"><span class="lico">${l.icon || '🛒'}</span><span class="wkt"><b>${esc(l.name)}</b><span>${left} to buy · ${l.items.length - left} done</span></span>${ic('chevR', 'chev')}</button>`; }).join('') || '<div class="empty"><b>Shopping lists</b>Groceries, Amazon cart, things for the trip. Tick items as you buy them and add the total to Money.</div>'}`;
    }
    view.innerHTML = topbar('Tasks') + `<div class="page"><div class="seg seg4">${segs.map(([k2, n]) => `<button class="${taskSeg === k2 ? 'on' : ''}" data-tseg="${k2}">${n}</button>`).join('')}</div>${body}</div>`;
    if (taskSeg === 'todo') {
      const q = $('#tq', view); let due = null, time = null;
      const paintDue = () => { $('#tdue', view).textContent = due ? `Due ${dayName(due)}${time ? ' at ' + t12(time) : ''}` : ''; };
      const addTask = () => { const v = q.value.trim(); if (!v) return; const parsed = smartDate(v); L.tasks.unshift({ id: uid(), nid: nextNid(), title: parsed.title, due: due || parsed.due, time: time || parsed.time, done: false, at: Date.now() }); save(); reschedule(); due = time = null; tasksView(); setTimeout(() => $('#tq', view) && $('#tq', view).focus(), 0); };
      q.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
      $('[data-a="tadd"]', view).onclick = addTask;
      $('[data-a="tdate"]', view).onclick = () => whenSheet(due ? { date: due, time: time || '09:00' } : null, v => { due = v ? v.date : null; time = v ? v.time : null; paintDue(); }, true);
    }
  }
  // "Call mom tomorrow 6pm" -> title "Call mom", due tomorrow at 18:00
  function smartDate(text) {
    let t = text, due = null, time = null;
    const tm = t.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
    if (tm) { let h = +tm[1] % 12; if (/pm/i.test(tm[3])) h += 12; time = `${pad(h)}:${tm[2] || '00'}`; t = t.replace(tm[0], ''); }
    if (/\btoday\b/i.test(t)) { due = dkey(new Date()); t = t.replace(/\btoday\b/i, ''); }
    else if (/\btomorrow\b/i.test(t)) { due = dkey(addDays(today0(), 1)); t = t.replace(/\btomorrow\b/i, ''); }
    else { const wd = t.match(/\b(?:on\s+)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/i); if (wd) { const target = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(wd[1].toLowerCase()); due = dkey(addDays(today0(), ((target - new Date().getDay()) + 7) % 7 || 7)); t = t.replace(wd[0], ''); } }
    if (time && !due) due = dkey(new Date());
    return { title: t.replace(/\s{2,}/g, ' ').trim() || text, due, time };
  }
  function taskRow(t) {
    const k = dkey(new Date());
    return `<div class="trow ${t.done ? 'done' : ''}">${checkBtn(t.done, `data-tdone="${t.id}"`)}<button class="ttx" data-task="${t.id}"><b>${esc(t.title)}</b>${t.due ? `<span class="${!t.done && t.due < k ? 'badt' : ''}">${esc(dayName(t.due))}${t.time ? ' · ' + t12(t.time) : ''}</span>` : ''}</button>${t.star ? '<span class="tstar">★</span>' : ''}</div>`;
  }
  const remRepeatTxt = r => r.repeat === 'daily' ? 'Every day' : r.repeat === 'weekly' ? r.days.map((on, i) => on ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i] : '').filter(Boolean).join(', ') : r.repeat === 'monthly' ? `Monthly on day ${parseKey(r.date).getDate()}` : r.repeat === 'yearly' ? `Yearly on ${parseKey(r.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : dayName(r.date);
  function taskSheet(t) {
    const s = sheet(`<h2>Task</h2><input class="field body" id="tt" value="${esc(t.title)}" maxlength="120">
      <div class="mrow2 eq" style="margin-top:10px"><input class="field body" type="date" id="td" value="${t.due || ''}"><input class="field body" type="time" id="tm" value="${t.time || ''}"></div>
      <label class="mremember" data-a="star"><span class="toggle sm ${t.star ? 'on' : ''}"></span><span>Important ★</span></label>
      <div class="btns two"><button class="btn danger" data-a="del">Delete</button><button class="btn primary" data-a="ok">Save</button></div>`);
    s.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'star') { t.star = !t.star; $('.toggle', b).classList.toggle('on', t.star); return; }
      if (b.dataset.a === 'del') L.tasks = L.tasks.filter(x => x.id !== t.id);
      else { t.title = $('#tt', s.el).value.trim() || t.title; t.due = $('#td', s.el).value || null; t.time = $('#tm', s.el).value || null; }
      save(); reschedule(); s.close(); refresh();
    });
  }
  function reminderSheet(r0, preset = {}) {
    const isNew = !r0;
    const r = r0 ? clone(r0) : Object.assign({ id: uid(), nid: nextNid(), title: '', note: '', time: (() => { const d = new Date(Date.now() + 3600e3); return `${pad(d.getHours())}:00`; })(), date: dkey(new Date()), repeat: 'once', days: [0, 1, 1, 1, 1, 1, 0], on: true }, preset);
    const s = sheet(`<h2>${isNew ? 'New reminder' : 'Edit reminder'}</h2>
      <input class="field body" id="rt" placeholder="What? (e.g. Pay credit card)" value="${esc(r.title)}" maxlength="80">
      <div class="mrow2 eq" style="margin-top:10px"><input class="field body" type="time" id="rtm" value="${r.time}"><input class="field body" type="date" id="rd" value="${r.date}" style="visibility:${['daily', 'weekly'].includes(r.repeat) ? 'hidden' : 'visible'}"></div>
      <div class="sect">Repeat</div>
      <div class="presets" style="justify-content:flex-start">${[['once', 'Once'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly'], ['yearly', 'Yearly']].map(([k, n]) => `<button class="chip small ${r.repeat === k ? 'on' : ''}" data-rp="${k}">${n}</button>`).join('')}</div>
      <div class="wdays" id="rwd" ${r.repeat === 'weekly' ? '' : 'hidden'}>${WDS.map((d, i) => `<button class="${r.days[i] ? 'on' : ''}" data-wd="${i}">${d}</button>`).join('')}</div>
      <input class="field body" id="rn" placeholder="Note (optional)" value="${esc(r.note || '')}" maxlength="120" style="margin-top:10px">
      <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="ok">Save</button></div>`);
    if (isNew && !r.title) setTimeout(() => $('#rt', s.el).focus(), 250);
    s.el.addEventListener('click', async e => {
      const rp = e.target.closest('[data-rp]'); if (rp) { r.repeat = rp.dataset.rp; $$('[data-rp]', s.el).forEach(x => x.classList.toggle('on', x === rp)); $('#rwd', s.el).hidden = r.repeat !== 'weekly'; $('#rd', s.el).style.visibility = ['daily', 'weekly'].includes(r.repeat) ? 'hidden' : 'visible'; return; }
      const wd = e.target.closest('[data-wd]'); if (wd) { r.days[+wd.dataset.wd] = r.days[+wd.dataset.wd] ? 0 : 1; wd.classList.toggle('on'); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'del') { L.reminders = L.reminders.filter(x => x.id !== r.id); save(); reschedule(); s.close(); return refresh(); }
      r.title = $('#rt', s.el).value.trim(); if (!r.title) { toast('What should I remind you about?'); return; }
      r.time = $('#rtm', s.el).value || '09:00'; r.date = $('#rd', s.el).value || dkey(new Date()); r.note = $('#rn', s.el).value.trim(); r.on = true;
      if (r.repeat === 'weekly' && !r.days.some(Boolean)) { toast('Pick at least one day'); return; }
      const i = L.reminders.findIndex(x => x.id === r.id); if (i >= 0) L.reminders[i] = r; else L.reminders.push(r);
      save(); s.close(); refresh(); await askNotif(); reschedule();
      const at = r.repeat === 'daily' || r.repeat === 'weekly' ? null : nextOccur(r);
      toast(at && at < new Date() ? 'That time has passed, so it will not ring' : `Reminder set · ${t12(r.time)}`);
    });
  }
  const HAB_ICONS = ['💧', '📚', '🧘', '🏃', '🥗', '😴', '🚭', '🙏', '📞', '✍️', '🎸', '🧹', '💊', '🚶', '📵', '🍎'];
  function habitSheet(h0) {
    const isNew = !h0; const h = h0 ? clone(h0) : { id: uid(), nid: nextNid(), name: '', icon: '📚', time: '', log: {} };
    const s = sheet(`<h2>${isNew ? 'New habit' : 'Edit habit'}</h2><input class="field body" id="hn" placeholder="e.g. Read 10 pages" value="${esc(h.name)}" maxlength="40">
      <div class="emojis" style="margin-top:10px">${HAB_ICONS.map(x => `<button class="${h.icon === x ? 'on' : ''}" data-em="${x}">${x}</button>`).join('')}</div>
      <div class="sect">Daily reminder (optional)</div><input class="field body" type="time" id="ht" value="${h.time || ''}">
      <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="ok">Save</button></div>`);
    s.el.addEventListener('click', async e => {
      const em = e.target.closest('[data-em]'); if (em) { h.icon = em.dataset.em; $$('[data-em]', s.el).forEach(x => x.classList.toggle('on', x === em)); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'del') L.habits = L.habits.filter(x => x.id !== h.id);
      else { h.name = $('#hn', s.el).value.trim(); if (!h.name) { toast('Name your habit'); return; } h.time = $('#ht', s.el).value || ''; const i = L.habits.findIndex(x => x.id === h.id); if (i >= 0) L.habits[i] = h; else L.habits.push(h); if (h.time) await askNotif(); }
      save(); reschedule(); s.close(); refresh();
    });
  }
  function toggleHabit(id) {
    const h = L.habits.find(x => x.id === id); if (!h) return; const k = dkey(new Date()); h.log = h.log || {};
    if (h.log[k]) delete h.log[k]; else { h.log[k] = 1; tap(); const n = streak(h); if (n && n % 7 === 0) toast(`🔥 ${n}-day streak on ${h.name}!`); }
    save(); refresh();
  }
  function listScreen(id) {
    const l = L.lists.find(x => x.id === id); if (!l) return;
    const scr = el(`<section class="screen"><header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Back">${ic('chevL')}</button></div><h1>${esc(l.name)}</h1><div class="tb-right"><button class="round-btn" data-a="more" aria-label="More">${ic('more')}</button></div></header>
      <div class="scroll"><div class="page"><div class="qadd"><input class="field body" id="li" placeholder="Add item (e.g. Milk 2)" enterkeyhint="done"><button class="round-btn accent" data-a="add" aria-label="Add">${ic('plus')}</button></div><div id="lit"></div></div></div>
      <div class="gym-bar"><button class="btn" data-a="clear">Clear bought</button><button class="btn primary" data-a="money">${ic('plus')}Add to Money</button></div></section>`);
    const paint = () => {
      const open = l.items.filter(i => !i.d), got = l.items.filter(i => i.d);
      $('#lit', scr).innerHTML = `<div class="block" style="padding:0;margin-top:12px">${open.map(i => `<div class="trow">${checkBtn(false, `data-li="${l.items.indexOf(i)}"`)}<span class="ttx"><b>${esc(i.t)}</b>${i.q ? `<span>× ${esc(i.q)}</span>` : ''}</span><button class="round-btn sm" data-ldel="${l.items.indexOf(i)}" aria-label="Remove">${ic('close')}</button></div>`).join('') || '<div class="empty" style="padding:16px">List is empty.</div>'}</div>
        ${got.length ? `<div class="sect">In the cart · ${got.length}</div><div class="block" style="padding:0">${got.map(i => `<div class="trow done">${checkBtn(true, `data-li="${l.items.indexOf(i)}"`)}<span class="ttx"><b>${esc(i.t)}</b></span></div>`).join('')}</div>` : ''}`;
    };
    paint(); layer.appendChild(scr);
    const close = () => { unback(); scr.remove(); refresh(); };
    const unback = pushBack(close);
    const inp = $('#li', scr);
    const add = () => { const v = inp.value.trim(); if (!v) return; const m = v.match(/^(.*?)(?:\s+[x×]?\s*(\d+(?:\.\d+)?\s*(?:kg|g|l|ml|pcs|pc|dozen)?))?$/i); l.items.unshift({ t: (m && m[1]) || v, q: m && m[2] ? m[2] : '', d: false }); save(); inp.value = ''; paint(); inp.focus(); };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
    scr.addEventListener('click', async e => {
      const li = e.target.closest('[data-li]'); if (li) { const it = l.items[+li.dataset.li]; it.d = !it.d; tap(); save(); return paint(); }
      const ld = e.target.closest('[data-ldel]'); if (ld) { l.items.splice(+ld.dataset.ldel, 1); save(); return paint(); }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') return close();
      if (b.dataset.a === 'add') return add();
      if (b.dataset.a === 'clear') { l.items = l.items.filter(i => !i.d); save(); return paint(); }
      if (b.dataset.a === 'money') { close(); return Money.quickAddPre({ catId: 'groceries', payee: l.name, note: l.items.filter(i => i.d).map(i => i.t).join(', ').slice(0, 80) }); }
      if (b.dataset.a === 'more') return menu(l.name, [
        { icon: 'edit', label: 'Rename', run: async () => { const n = await promptText('Rename list', { value: l.name, ok: 'Save' }); if (n) { l.name = n; save(); $('h1', scr).textContent = n; } } },
        { icon: 'share', label: 'Share list', run: async () => { const text = `${l.name}\n` + l.items.filter(i => !i.d).map(i => `• ${i.t}${i.q ? ' × ' + i.q : ''}`).join('\n'); try { if (P.Share) await P.Share.share({ text }); else await navigator.clipboard.writeText(text); } catch (err) { /* cancelled */ } } },
        { icon: 'trash', label: 'Delete list', danger: true, run: async () => { if (await confirmBox('Delete this list?', '', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { L.lists = L.lists.filter(x => x.id !== l.id); save(); close(); } } },
      ]);
    });
  }

  /* ---------- Clock: alarms, world clock, bedtime ---------- */
  const BUILTIN_TONES = [['', 'Phone default'], ['b:rise', 'Gentle rise'], ['b:chime', 'Morning chimes'], ['b:beep', 'Classic beep'], ['b:digital', 'Digital'], ['b:bell', 'Temple bell']];
  function nextAlarm() {
    const now = new Date(); let best = null;
    L.alarms.filter(a => a.on).forEach(a => {
      const [h, m] = a.hm.split(':').map(Number);
      for (let i = 0; i < 8; i++) { const d = addDays(today0(), i); d.setHours(h, m, 0, 0); if (d <= now) continue; if (a.days.some(Boolean) && !a.days[d.getDay()]) continue; if (!best || d < best.at) best = { at: d, hm: a.hm, a }; break; }
    });
    return best;
  }
  const untilTxt = d => { const mins = Math.round((d - new Date()) / 60000); const h = Math.floor(mins / 60), m = mins % 60; return h ? `${h} h ${m} min` : `${m} min`; };
  function clockView() {
    const segs = [['alarms', 'Alarms'], ['world', 'World'], ['bed', 'Bedtime']];
    let body = '';
    if (clockSeg === 'alarms') {
      const nx = nextAlarm();
      body = `<div class="bigclock"><b id="lcnow">${t12(hmNow()).replace(/ (AM|PM)/, '<small> $1</small>')}</b><span>${nx ? `Next alarm in ${untilTxt(nx.at)}` : 'No alarms on'}</span></div>
        ${!P.Alarm && isNative ? '<div class="mwarn">' + ic('info') + '<span>This build is missing the alarm part. Upload the <b>android</b> folder from the update.</span></div>' : ''}
        ${!isNative ? `<div class="mwarn">${ic('info')}<span>Alarms ring in the installed app, even when it is closed.</span></div>` : ''}
        <div id="alperm"></div>
        ${L.alarms.map(a => `<div class="alarm ${a.on ? '' : 'off'}"><button class="alm" data-alarm="${a.id}"><b>${t12(a.hm).replace(/ (AM|PM)/, '<small> $1</small>')}</b><span>${esc(a.label || 'Alarm')} · ${a.days.some(Boolean) ? (a.days.every(Boolean) ? 'Every day' : a.days.map((on, i) => on ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][i] : '').filter(Boolean).join(' ')) : 'Once'}${a.smart ? ' · logs sleep' : ''}</span></button><button class="toggle ${a.on ? 'on' : ''}" data-altog="${a.id}" aria-label="On or off"></button></div>`).join('') || '<div class="empty"><b>No alarms</b>Tap + to add one. Pick your own ringtone from your phone too.</div>'}
        <button class="fab" data-add="alarm" aria-label="New alarm">${ic('plus')}</button>`;
    } else if (clockSeg === 'world') {
      body = `<div class="block" style="padding:0">${L.cities.map(z => { const t = new Date().toLocaleTimeString(undefined, { timeZone: z, hour: 'numeric', minute: '2-digit' }); const dd = new Date().toLocaleDateString(undefined, { timeZone: z, weekday: 'short' }); return `<div class="lrow"><span class="lrm"><b>${esc(cityName(z))}</b><span>${dd} · ${offsetTxt(z)}</span></span><span class="wctime">${t}</span><button class="round-btn sm" data-czdel="${esc(z)}" aria-label="Remove">${ic('close')}</button></div>`; }).join('')}</div>
        <button class="btn" data-a="cityadd" style="margin-top:10px">${ic('plus')}Add city</button>`;
    } else {
      const b = L.bed; const [bh, bm] = b.bed.split(':').map(Number), [wh, wm] = b.wake.split(':').map(Number);
      const mins = ((wh * 60 + wm) - (bh * 60 + bm) + 1440) % 1440;
      body = `<div class="bedcard"><div><span>🌙 Bedtime</span><input type="time" id="bbed" value="${b.bed}" class="field body"></div><div><span>⏰ Wake up</span><input type="time" id="bwake" value="${b.wake}" class="field body"></div></div>
        <p class="hint" style="text-align:center">${Math.floor(mins / 60)} h ${mins % 60} min of sleep · ${mins >= 420 && mins <= 540 ? 'a healthy amount' : mins < 420 ? 'try for 7–9 hours' : 'more than 9 hours'}</p>
        <div class="sect">Days</div><div class="wdays">${WDS.map((d, i) => `<button class="${b.days[i] ? 'on' : ''}" data-bd="${i}">${d}</button>`).join('')}</div>
        <div class="block" style="margin-top:12px">
          <button class="set-row" data-a="bedon"><span class="st"><div class="t">Bedtime schedule</div><div class="s">Reminder before bed and a smart wake-up alarm</div></span><span class="toggle ${b.on ? 'on' : ''}"></span></button>
          <div class="set-row"><span class="st"><div class="t">Wind-down reminder</div><div class="s">Minutes before bedtime</div></span><select id="brem" class="timein">${[0, 15, 30, 45, 60].map(v => `<option value="${v}" ${b.remind === v ? 'selected' : ''}>${v ? v + ' min' : 'Off'}</option>`).join('')}</select></div>
        </div>
        <div class="sect">Sleep cycles</div><div class="block" style="padding:12px 16px"><p class="hint" style="margin:0 0 8px">Sleep cycles last roughly 90 minutes (it varies from person to person), and waking near the end of one can feel easier. To wake at ${t12(b.wake)}, you could aim to fall asleep around:</p><div class="presets" style="justify-content:flex-start;margin:0">${[6, 5, 4].map(c => { const x = ((wh * 60 + wm) - c * 90 - 15 + 1440) % 1440; const hm = `${pad(Math.floor(x / 60))}:${pad(x % 60)}`; return `<button class="chip small" data-cyc="${hm}">${t12(hm)} · ${c * 1.5} h</button>`; }).join('')}</div></div>
        <p class="hint">With the schedule on, the wake alarm logs your sleep when you turn it off, so your readiness score fills in by itself.</p>`;
    }
    view.innerHTML = topbar('Clock') + `<div class="page"><div class="seg">${segs.map(([k, n]) => `<button class="${clockSeg === k ? 'on' : ''}" data-cseg="${k}">${n}</button>`).join('')}</div>${body}</div>`;
    if (clockSeg === 'alarms') checkAlarmPerms();
    if (clockSeg === 'bed') {
      const upd = () => { L.bed.bed = $('#bbed', view).value || L.bed.bed; L.bed.wake = $('#bwake', view).value || L.bed.wake; L.bed.remind = +$('#brem', view).value; save(); syncBedAlarm(); reschedule(); clockView(); };
      ['#bbed', '#bwake', '#brem'].forEach(s2 => $(s2, view).addEventListener('change', upd));
    }
  }
  async function checkAlarmPerms() {
    if (!P.Alarm) return;
    try {
      const st = await P.Alarm.permissions(); const box = $('#alperm', view); if (!box) return;
      box.innerHTML = (!st.exact ? `<button class="mwarn" data-a="exact">${ic('info')}<span>Allow <b>Alarms &amp; reminders</b> so alarms ring on time. Tap to open settings.</span></button>` : '') + (!st.fullScreen ? `<button class="mwarn" data-a="fullscreen">${ic('info')}<span>Allow <b>full-screen alerts</b> so the alarm shows over the lock screen. Tap to open settings.</span></button>` : '');
    } catch (e) { /* ignore */ }
  }
  const CITIES = [['Asia/Kolkata', 'India'], ['America/New_York', 'New York'], ['America/Chicago', 'Chicago'], ['America/Denver', 'Denver'], ['America/Los_Angeles', 'Los Angeles'], ['America/Phoenix', 'Phoenix'], ['America/Toronto', 'Toronto'], ['America/Sao_Paulo', 'São Paulo'], ['America/Mexico_City', 'Mexico City'],
    ['Europe/London', 'London'], ['Europe/Paris', 'Paris'], ['Europe/Berlin', 'Berlin'], ['Europe/Amsterdam', 'Amsterdam'], ['Europe/Madrid', 'Madrid'], ['Europe/Rome', 'Rome'], ['Europe/Moscow', 'Moscow'], ['Europe/Istanbul', 'Istanbul'],
    ['Asia/Dubai', 'Dubai'], ['Asia/Riyadh', 'Riyadh'], ['Asia/Qatar', 'Doha'], ['Asia/Karachi', 'Karachi'], ['Asia/Dhaka', 'Dhaka'], ['Asia/Kathmandu', 'Kathmandu'], ['Asia/Colombo', 'Colombo'], ['Asia/Bangkok', 'Bangkok'], ['Asia/Singapore', 'Singapore'], ['Asia/Kuala_Lumpur', 'Kuala Lumpur'],
    ['Asia/Hong_Kong', 'Hong Kong'], ['Asia/Shanghai', 'Shanghai'], ['Asia/Tokyo', 'Tokyo'], ['Asia/Seoul', 'Seoul'], ['Australia/Sydney', 'Sydney'], ['Australia/Melbourne', 'Melbourne'], ['Australia/Perth', 'Perth'], ['Pacific/Auckland', 'Auckland'],
    ['Africa/Cairo', 'Cairo'], ['Africa/Johannesburg', 'Johannesburg'], ['Africa/Lagos', 'Lagos'], ['Africa/Nairobi', 'Nairobi'], ['Pacific/Honolulu', 'Honolulu'], ['America/Anchorage', 'Anchorage'], ['Asia/Jakarta', 'Jakarta'], ['Asia/Manila', 'Manila']];
  const cityName = z => (CITIES.find(c => c[0] === z) || [z, z.split('/').pop().replace(/_/g, ' ')])[1];
  function offsetTxt(z) {
    try {
      const now = new Date(); const a = new Date(now.toLocaleString('en-US', { timeZone: z })), b = new Date(now.toLocaleString('en-US'));
      const diff = Math.round((a - b) / 60000); if (!diff) return 'Same time'; const h = Math.floor(Math.abs(diff) / 60), m = Math.abs(diff) % 60;
      return `${h ? h + ' h' : ''}${m ? ' ' + m + ' min' : ''} ${diff > 0 ? 'ahead' : 'behind'}`.trim();
    } catch (e) { return ''; }
  }
  function citySheet() {
    const s = sheet(`<h2>Add city</h2><input class="field body" id="cq" placeholder="Search city"><div class="block" style="padding:0;margin-top:10px;max-height:50vh;overflow:auto" id="cl"></div>`);
    const paint = () => { const q = $('#cq', s.el).value.toLowerCase(); $('#cl', s.el).innerHTML = CITIES.filter(c => !L.cities.includes(c[0]) && (c[1].toLowerCase().includes(q) || c[0].toLowerCase().includes(q))).map(c => `<button class="srow" data-cz="${c[0]}"><span class="wkt"><b>${esc(c[1])}</b><span>${offsetTxt(c[0])}</span></span><span class="sr">${new Date().toLocaleTimeString(undefined, { timeZone: c[0], hour: 'numeric', minute: '2-digit' })}</span></button>`).join(''); };
    paint(); $('#cq', s.el).addEventListener('input', paint);
    s.el.addEventListener('click', e => { const c = e.target.closest('[data-cz]'); if (c) { L.cities.push(c.dataset.cz); save(); s.close(); refresh(); } });
  }
  function alarmSheet(a0) {
    const isNew = !a0;
    const a = a0 ? clone(a0) : { id: Date.now() % 1e9, hm: '06:30', days: [0, 1, 1, 1, 1, 1, 0], label: '', tone: 'b:rise', vibrate: true, snooze: 10, on: true, smart: false };
    const toneName = id => (BUILTIN_TONES.find(t => t[0] === id) || (L.tones.find(t => t.id === id) ? [id, L.tones.find(t => t.id === id).name] : ['', 'Phone default']))[1];
    const s = sheet(`<h2>${isNew ? 'New alarm' : 'Edit alarm'}</h2>
      <input type="time" id="ahm" class="field bigtime" value="${a.hm}">
      <div class="wdays" style="margin-top:12px">${WDS.map((d, i) => `<button class="${a.days[i] ? 'on' : ''}" data-ad="${i}">${d}</button>`).join('')}</div>
      <p class="hint" id="arep"></p>
      <input class="field body" id="alb" placeholder="Label (e.g. Gym)" value="${esc(a.label)}" maxlength="30">
      <div class="block" style="margin-top:12px">
        <button class="set-row" data-a="tone"><span class="st"><div class="t">Ringtone</div><div class="s" id="atn">${esc(toneName(a.tone))}</div></span>${ic('chevR', 'chev')}</button>
        <div class="set-row"><span class="st"><div class="t">Snooze</div></span><select id="asn" class="timein">${[0, 5, 10, 15].map(v => `<option value="${v}" ${a.snooze === v ? 'selected' : ''}>${v ? v + ' min' : 'Off'}</option>`).join('')}</select></div>
        <button class="set-row" data-a="vib"><span class="st"><div class="t">Vibrate</div></span><span class="toggle ${a.vibrate ? 'on' : ''}" id="avb"></span></button>
        <button class="set-row" data-a="brief"><span class="st"><div class="t">Morning briefing</div><div class="s">When you turn it off, read out weather, plan, bills and birthdays</div></span><span class="toggle ${a.brief ? 'on' : ''}" id="abr"></span></button>
        <button class="set-row" data-a="smart"><span class="st"><div class="t">Log my sleep</div><div class="s">When you turn it off, ask how you slept</div></span><span class="toggle ${a.smart ? 'on' : ''}" id="asm"></span></button>
      </div>
      <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="ok">Save</button></div>`);
    const paintRep = () => { $('#arep', s.el).textContent = a.days.some(Boolean) ? (a.days.every(Boolean) ? 'Every day' : 'Repeats on the highlighted days') : 'Rings once'; };
    paintRep();
    s.el.addEventListener('click', async e => {
      const d = e.target.closest('[data-ad]'); if (d) { a.days[+d.dataset.ad] = a.days[+d.dataset.ad] ? 0 : 1; d.classList.toggle('on'); return paintRep(); }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'tone') return toneSheet(a.tone, id => { a.tone = id; $('#atn', s.el).textContent = toneName(id); });
      if (b.dataset.a === 'vib') { a.vibrate = !a.vibrate; $('#avb', s.el).classList.toggle('on', a.vibrate); return; }
      if (b.dataset.a === 'smart') { a.smart = !a.smart; $('#asm', s.el).classList.toggle('on', a.smart); return; }
      if (b.dataset.a === 'brief') { a.brief = !a.brief; $('#abr', s.el).classList.toggle('on', a.brief); return; }
      if (b.dataset.a === 'del') { L.alarms = L.alarms.filter(x => x.id !== a.id); save(); s.close(); await syncAlarms(); return refresh(); }
      a.hm = $('#ahm', s.el).value || a.hm; a.label = $('#alb', s.el).value.trim(); a.snooze = +$('#asn', s.el).value; a.on = true;
      const i = L.alarms.findIndex(x => x.id === a.id); if (i >= 0) L.alarms[i] = a; else L.alarms.push(a);
      L.alarms.sort((x, y) => x.hm.localeCompare(y.hm));
      save(); s.close(); const ok = await syncAlarms(); refresh();
      if (ok || !P.Alarm) alarmToast(a); else toast('Alarm saved, but the phone refused to schedule it. Check Settings → Phone features.');
    });
  }
  let previewAudio = null;
  function stopPreview() { try { if (previewAudio) { previewAudio.pause(); previewAudio = null; } } catch (e) { /* ignore */ } }
  async function toneSrc(id) {
    if (!id) return null;
    if (id.startsWith('b:')) return URL.createObjectURL(new Blob([synthTone(id.slice(2))], { type: 'audio/wav' }));
    const t = L.tones.find(x => x.id === id); if (!t) return null;
    if (P.Filesystem) { try { const r = await P.Filesystem.getUri({ path: t.path, directory: 'DATA' }); return Cap.convertFileSrc(r.uri); } catch (e) { return null; } }
    return t.data || null;
  }
  function toneSheet(cur, cb) {
    let sel = cur;
    const s = sheet(`<h2>Ringtone</h2><div class="block" style="padding:0" id="tl"></div>
      <div class="btns"><button class="btn" data-a="upload">${ic('upload')}Add a ringtone from your phone</button></div>
      <p class="hint">Any audio file works: MP3, M4A, WAV, OGG. Download songs or tones in your browser first, then pick them here. They are copied into the app.</p>`, { onClose: stopPreview });
    const paint = () => { $('#tl', s.el).innerHTML = [...BUILTIN_TONES.map(t => ({ id: t[0], name: t[1], b: true })), ...L.tones.map(t => ({ id: t.id, name: t.name }))].map(t => `<div class="lrow"><button class="lrm" data-tn="${t.id}"><b>${esc(t.name)}</b><span>${t.b ? (t.id ? 'Built in' : 'Your phone’s alarm sound') : 'From your phone'}</span></button>${t.id ? `<button class="round-btn sm" data-play="${t.id}" aria-label="Play">${ic('play')}</button>` : ''}${!t.b ? `<button class="round-btn sm" data-tdel="${t.id}" aria-label="Remove">${ic('trash')}</button>` : ''}<span class="tsel ${sel === t.id ? 'on' : ''}">${ic('check')}</span></div>`).join(''); };
    paint();
    s.el.addEventListener('click', async e => {
      const tn = e.target.closest('[data-tn]'); if (tn) { sel = tn.dataset.tn; paint(); stopPreview(); s.close(); return cb(sel); }
      const pl = e.target.closest('[data-play]'); if (pl) { stopPreview(); const src = await toneSrc(pl.dataset.play); if (!src) { toast('Could not play this tone'); return; } previewAudio = new Audio(src); previewAudio.play().catch(() => toast('Could not play this tone')); setTimeout(stopPreview, 8000); return; }
      const td = e.target.closest('[data-tdel]'); if (td) { const t = L.tones.find(x => x.id === td.dataset.tdel); L.tones = L.tones.filter(x => x !== t); try { if (P.Filesystem && t.path) await P.Filesystem.deleteFile({ path: t.path, directory: 'DATA' }); } catch (err) { /* ignore */ } L.alarms.forEach(a => { if (a.tone === t.id) a.tone = ''; }); save(); syncAlarms(); return paint(); }
      if (e.target.closest('[data-a="upload"]')) {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'audio/*';
        inp.onchange = async () => {
          const f = inp.files && inp.files[0]; if (!f) return;
          if (f.size > 15 * 1024 * 1024) { toast('Please pick a file under 15 MB'); return; }
          const data = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.onerror = () => r(null); rd.readAsDataURL(f); });
          if (!data) { toast('Could not read that file'); return; }
          const id = 'u' + uid(); const ext = (f.name.match(/\.(\w{2,4})$/) || [, 'mp3'])[1].toLowerCase();
          const t = { id, name: f.name.replace(/\.\w+$/, '').slice(0, 40), path: `tones/${id}.${ext}` };
          try { if (P.Filesystem) await P.Filesystem.writeFile({ path: t.path, data: data.split(',')[1], directory: 'DATA', recursive: true }); else t.data = data; }
          catch (err) { toast('Could not save that tone'); return; }
          L.tones.push(t); save(); sel = id; paint(); toast(`${t.name} added`);
        };
        document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
      }
    });
  }
  // Small built-in tones made on the phone as WAV files, so no audio needs to be bundled.
  function synthTone(kind) {
    const rate = 22050, secs = kind === 'bell' ? 6 : 4, n = rate * secs, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s2) => { for (let i = 0; i < s2.length; i++) v.setUint8(o + i, s2.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) {
      const t = i / rate; let x = 0;
      if (kind === 'beep') { const on = (t % 1) < 0.5 && (t % 0.25) < 0.17; x = on ? Math.sin(2 * Math.PI * 1760 * t) * 0.6 : 0; }
      else if (kind === 'digital') { const on = (t % 0.8) < 0.08 || ((t % 0.8) > 0.16 && (t % 0.8) < 0.24); x = on ? (Math.sin(2 * Math.PI * 2093 * t) > 0 ? 0.35 : -0.35) : 0; }
      else if (kind === 'chime') { [523.25, 659.25, 783.99, 1046.5].forEach((f, j) => { const st = j * 0.45 + Math.floor(t / 2) * 2; const dt = t - st; if (dt >= 0 && dt < 2) x += Math.sin(2 * Math.PI * f * dt) * Math.exp(-dt * 2.5) * 0.3; }); }
      else if (kind === 'bell') { const dt = t % 3; x = (Math.sin(2 * Math.PI * 440 * dt) + 0.6 * Math.sin(2 * Math.PI * 880 * 1.01 * dt) + 0.3 * Math.sin(2 * Math.PI * 1320 * dt)) * Math.exp(-dt * 1.2) * 0.3; }
      else { const f = 440 + 220 * Math.sin(2 * Math.PI * 0.25 * t); x = Math.sin(2 * Math.PI * f * t) * Math.min(1, t / secs + 0.15) * 0.5 * (0.6 + 0.4 * Math.sin(2 * Math.PI * 2 * t)); }
      v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x)) * 32000, true);
    }
    return buf;
  }
  async function tonePath(id) {
    if (!id || !P.Filesystem) return '';
    try {
      let path = id;
      if (id.startsWith('b:')) {
        path = `tones/builtin_${id.slice(2)}.wav`;
        try { await P.Filesystem.stat({ path, directory: 'DATA' }); }
        catch (e) { const bytes = new Uint8Array(synthTone(id.slice(2))); let bin = ''; for (let i = 0; i < bytes.length; i += 32768) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); await P.Filesystem.writeFile({ path, data: btoa(bin), directory: 'DATA', recursive: true }); }
      } else { const t = L.tones.find(x => x.id === id); if (!t) return ''; path = t.path; }
      const r = await P.Filesystem.getUri({ path, directory: 'DATA' });
      return String(r.uri || '').replace(/^file:\/\//, '');
    } catch (e) { return ''; }
  }
  // Returns true only when the phone accepted the alarms, so the app never claims an alarm is set when it isn't.
  async function syncAlarms() {
    if (!P.Alarm) return false;
    try {
      const list = [];
      for (const a of L.alarms) { const [h, m] = a.hm.split(':').map(Number); list.push({ id: a.id, hour: h, minute: m, days: a.days.reduce((acc, on, i) => acc | (on ? 1 << i : 0), 0), enabled: !!a.on, label: a.label || 'Alarm', sound: await tonePath(a.tone), vibrate: a.vibrate !== false, snooze: a.snooze || 0, smart: !!a.smart }); }
      await P.Alarm.setAll({ alarms: list });
      return true;
    } catch (e) { logProblem('Alarms could not be scheduled: ' + (e && e.message || e), 'alarm'); return false; }
  }
  async function alarmToast(a) {
    if (!P.Alarm) { toast(isNative ? 'Alarm saved, but this build can\'t ring alarms. Install the latest Vyora APK.' : 'Alarm saved. Alarms ring in the installed app.'); return; }
    try { const p = await P.Alarm.permissions(); if (!p.exact) { toast('Alarm saved, but "Alarms & reminders" permission is off, so it may ring late. Open the Clock tab to allow it.'); return; } } catch (e) { /* ignore */ }
    const nx = nextAlarm(); if (nx && nx.a.id === a.id) toast(`Alarm set for ${untilTxt(nx.at)} from now`);
  }
  // After an alarm rings: one-off alarms switch themselves off, and a smart alarm asks how you slept.
  async function onResume() {
    checkWidgetAction();
    if (!P.Alarm) return;
    try {
      const st = await P.Alarm.state();
      (st.disabled || []).forEach(id => { const a = L.alarms.find(x => x.id === id); if (a) a.on = false; });
      save();
      const ld = st.lastDismiss;
      if (ld && ld.at && ld.at !== L.lastDismissSeen) {
        L.lastDismissSeen = ld.at; save();
        const a = L.alarms.find(x => x.id === ld.id);
        const fresh2 = Date.now() - ld.at < 6 * 3600e3;
        const sleepAsk = () => { if (a && a.smart && fresh2) { const w = new Date(ld.at); setTimeout(() => Health.openSleep({ bed: L.bed.on ? L.bed.bed : null, wake: `${pad(w.getHours())}:${pad(w.getMinutes())}` }), 300); } };
        if (a && a.brief && Date.now() - ld.at < 30 * 60000) setTimeout(() => openBriefing(true, sleepAsk), 500); else sleepAsk();
      }
      if (tab === 'clock') refresh();
    } catch (e) { /* ignore */ }
  }
  function syncBedAlarm() {
    let a = L.alarms.find(x => x.bed);
    if (!L.bed.on) { if (a) { a.on = false; save(); syncAlarms(); } return; }
    if (!a) { a = { id: 777000 + Math.floor(Math.random() * 999), hm: L.bed.wake, days: L.bed.days.slice(), label: 'Wake up', tone: 'b:rise', vibrate: true, snooze: 10, on: true, smart: true, brief: true, bed: true }; L.alarms.push(a); }
    Object.assign(a, { hm: L.bed.wake, days: L.bed.days.slice(), on: true, smart: true });
    L.alarms.sort((x, y) => x.hm.localeCompare(y.hm)); save(); syncAlarms();
  }

  /* ---------- tools ---------- */
  function toolScreen(title, inner, onMount, { secure = title === 'Journal' || title === 'Documents' } = {}) {
    const scr = el(`<section class="screen ltool ${secure ? 'secure-screen' : ''}"><header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Back">${ic('chevL')}</button></div><h1>${esc(title)}</h1></header><div class="scroll"><div class="page" id="tbody">${inner}</div></div></section>`);
    layer.appendChild(scr);
    const close = () => { unback(); scr.remove(); if (scr._cleanup) scr._cleanup(); updateSecure(); refresh(); };
    const unback = pushBack(close);
    scr.addEventListener('click', e => { if (e.target.closest('[data-a="close"]')) close(); });
    updateSecure();
    if (onMount) onMount(scr, $('#tbody', scr), close);
    return scr;
  }
  // Weather from Open-Meteo (free, no account).
  async function refreshWeather(quiet) {
    if (!L.weather) return;
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${L.weather.lat}&longitude=${L.weather.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,precipitation_probability&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max&timezone=auto&forecast_days=7`;
      const r = await fetch(u); if (!r.ok) throw new Error('http');
      L.weather.data = await r.json(); L.weather.at = Date.now(); save();
      if (tab === 'home') refresh();
      const ws = $('#wxbox'); if (ws) ws.innerHTML = weatherHtml();
      L.weather.offline = false;
    } catch (e) { if (L.weather) { L.weather.offline = true; save(); const ws = $('#wxbox'); if (ws && L.weather.data) ws.innerHTML = weatherHtml(); } if (!quiet) toast('Could not load weather. Check your internet.'); }
  }
  function weatherHtml() {
    const w = L.weather && L.weather.data; if (!w) return '<div class="empty">Loading…</div>';
    const c = w.current; const hrs = [];
    const ago = L.weather.at ? Math.round((Date.now() - L.weather.at) / 60000) : null;
    const stale = L.weather.offline || (ago != null && ago > 180);
    const agoTxt = ago == null ? '' : ago < 2 ? 'just now' : ago < 60 ? `${ago} min ago` : ago < 1440 ? `${Math.round(ago / 60)} h ago` : `${Math.round(ago / 1440)} days ago`;
    const nowH = new Date().toISOString().slice(0, 13);
    const start = Math.max(0, w.hourly.time.findIndex(t => t.slice(0, 13) >= nowH));
    for (let i = start; i < start + 24 && i < w.hourly.time.length; i += 2) hrs.push(i);
    return `${stale ? `<div class="mwarn">${ic('info')}<span>${L.weather.offline ? 'You seem to be offline. ' : ''}Showing weather from ${agoTxt}. Pull down or reopen to refresh when you're online.</span></div>` : ''}<div class="wxhero"><span class="wxbig">${wx(c.weather_code)[0]}</span><b>${Math.round(c.temperature_2m)}°</b><span>${esc(wx(c.weather_code)[1])}</span><small>Feels like ${Math.round(c.apparent_temperature)}° · Humidity ${c.relative_humidity_2m}% · Wind ${Math.round(c.wind_speed_10m)} km/h</small></div>
      <div class="wxhours">${hrs.map(i => `<div><small>${new Date(w.hourly.time[i]).toLocaleTimeString(undefined, { hour: 'numeric' })}</small><span>${wx(w.hourly.weather_code[i])[0]}</span><b>${Math.round(w.hourly.temperature_2m[i])}°</b><small>${w.hourly.precipitation_probability[i] || 0}%</small></div>`).join('')}</div>
      <div class="sect">7 days</div><div class="block" style="padding:0">${w.daily.time.map((d, i) => `<div class="wxday"><span>${i ? new Date(d).toLocaleDateString(undefined, { weekday: 'short' }) : 'Today'}</span><span>${wx(w.daily.weather_code[i])[0]}</span><small>${w.daily.precipitation_probability_max[i] || 0}%</small><span class="wxr"><em>${Math.round(w.daily.temperature_2m_min[i])}°</em><i></i><b>${Math.round(w.daily.temperature_2m_max[i])}°</b></span></div>`).join('')}</div>
      <p class="hint">Sunrise ${new Date(w.daily.sunrise[0]).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · Sunset ${new Date(w.daily.sunset[0]).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · UV ${Math.round(w.daily.uv_index_max[0] || 0)}${w.daily.uv_index_max[0] >= 8 ? ' (very high, use sunscreen)' : ''}. Data from Open-Meteo.</p>`;
  }
  function weatherTool() {
    toolScreen('Weather', `<div class="qadd"><input class="field body" id="wq" placeholder="Search your city" value="${esc(L.weather ? L.weather.name : '')}"><button class="round-btn accent" data-a="wsearch" aria-label="Search">${ic('search')}</button></div><div id="wres"></div><div id="wxbox">${L.weather ? weatherHtml() : '<div class="empty"><b>Pick your city</b>Type a city name above, like Bengaluru or Guntur.</div>'}</div>`, (scr) => {
      if (L.weather && (!L.weather.data || Date.now() - L.weather.at > 15 * 60000)) refreshWeather();
      const search = async () => {
        const q = $('#wq', scr).value.trim(); if (!q) return;
        try { const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en`); const j = await r.json();
          $('#wres', scr).innerHTML = (j.results || []).map((c, i) => `<button class="srow" data-wc="${i}"><span class="wkt"><b>${esc(c.name)}</b><span>${esc([c.admin1, c.country].filter(Boolean).join(', '))}</span></span></button>`).join('') || '<p class="hint">No city found.</p>';
          scr._res = j.results || [];
        } catch (e) { toast('Could not search. Check your internet.'); }
      };
      $('#wq', scr).addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
      scr.addEventListener('click', e => { if (e.target.closest('[data-a="wsearch"]')) return search(); const c = e.target.closest('[data-wc]'); if (c) { const x = scr._res[+c.dataset.wc]; L.weather = { name: x.name, lat: x.latitude, lon: x.longitude }; save(); $('#wres', scr).innerHTML = ''; $('#wq', scr).value = x.name; $('#wxbox', scr).innerHTML = '<div class="empty">Loading…</div>'; refreshWeather(); } });
    });
  }
  // Journal
  const MOODS = ['😫', '😕', '😐', '🙂', '😄'];
  async function unlockJournal() {
    if (secFailed) { lifeLockedMsg(); return false; }
    if (!L.journalLock) return true;
    // Fail closed: a locked journal never opens without a successful check.
    if (!P.AppLock) { toast('The journal is locked and this device can\'t check your fingerprint or screen lock'); return false; }
    try { const a = await P.AppLock.available(); if (!a.available) { await confirmBox('Journal stays locked', 'Your phone\'s screen lock is turned off, so Vyora can\'t confirm it\'s you. Turn it back on in phone Settings → Security to open the journal.', [{ label: 'OK', cls: 'primary', value: 1 }]); return false; } } catch (e) { return false; }
    try { const r = await P.AppLock.authenticate({ title: 'Open journal' }); return !!r.ok; } catch (e) { return false; }
  }
  async function journalTool() {
    if (!(await unlockJournal())) return false;
    toolScreen('Journal', '', (scr, body) => {
      const paint = () => {
        const list = L.journal.slice().sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
        body.innerHTML = `<button class="btn primary" data-a="jnew">${ic('edit')}Write today's entry</button>
          <div class="lockstate ${L.journalLock ? 'on' : ''}">${ic(L.journalLock ? 'lock' : 'unlock')}<span><b>${L.journalLock ? 'Locked' : 'Not locked'}</b>${L.journalLock ? 'Needs your fingerprint or screen lock to open' : 'Anyone holding your unlocked phone can read it'}${P.Vault && L.secure ? ' · encrypted on this phone' : ''}</span>${P.AppLock ? `<button class="btn sm" data-a="jlock">${L.journalLock ? 'Unlock' : 'Lock'}</button>` : ''}</div>
          <p class="hint">${S.lastBackup ? `Last backup ${Math.floor((Date.now() - S.lastBackup) / 864e5) || 'today'}${Math.floor((Date.now() - S.lastBackup) / 864e5) ? ' days ago' : ''}. ` : 'Not backed up yet. '}<button class="linkbtn" data-a="jbackup">Back up now</button></p>
          <div class="block" style="padding:0;margin-top:12px">${list.map(j => `<button class="jrow" data-j="${j.id}"><span class="jm">${MOODS[(j.mood || 3) - 1]}</span><span class="wkt"><b>${esc(dayName(j.date))}</b><span>${esc((j.text || '').slice(0, 90))}</span></span>${j.photos && j.photos.length ? ic('camera') : ''}</button>`).join('') || '<div class="empty" style="padding:18px">Your private diary. Write a few lines a day: what went well, what you learned, what you are grateful for.</div>'}</div>`;
      };
      paint();
      body.addEventListener('click', e => {
        if (e.target.closest('[data-a="jnew"]')) return journalEditor(null, paint);
        if (e.target.closest('[data-a="jbackup"]')) return exportBackup();
        if (e.target.closest('[data-a="jlock"]')) { (async () => { if (L.journalLock) { const r = await P.AppLock.authenticate({ title: 'Turn off journal lock' }).catch(() => ({ ok: false })); if (!r.ok) return; } else { const a = await P.AppLock.available().catch(() => ({ available: false })); if (!a.available) { toast('Set a phone screen lock first'); return; } } L.journalLock = !L.journalLock; save(); paint(); })(); return; }
        const j = e.target.closest('[data-j]'); if (j) journalEditor(L.journal.find(x => x.id === j.dataset.j), paint);
      });
    });
  }
  function journalEditor(j0, after) {
    const j = j0 ? clone(j0) : { id: uid(), date: dkey(new Date()), mood: 0, text: '', photos: [], at: Date.now() };
    const removed = [];
    const prompts = ['What went well today?', 'What am I grateful for?', 'What did I learn?', 'What would make tomorrow great?'];
    const s = sheet(`<h2>${esc(dayName(j.date))}</h2><input type="date" class="field body" id="jd" value="${j.date}" style="margin-bottom:10px">
      <div class="faces">${MOODS.map((m, i) => `<button class="${j.mood === i + 1 ? 'on' : ''}" data-mood="${i + 1}">${m}</button>`).join('')}</div>
      <div class="presets" style="justify-content:flex-start;margin-top:10px">${prompts.map(p => `<button class="chip small" data-pr="${esc(p)}">${esc(p)}</button>`).join('')}</div>
      <textarea class="field body" id="jt" rows="8" placeholder="Write freely…" style="margin-top:8px">${esc(j.text)}</textarea>
      <div class="jph" id="jph"></div>
      <div class="btns ${j0 ? 'two' : 'two'}">${j0 ? '<button class="btn danger" data-a="del">Delete</button>' : `<button class="btn" data-a="photo">${ic('camera')}Photo</button>`}<button class="btn primary" data-a="ok">Save</button></div>`);
    const paintPh = async () => { const box = $('#jph', s.el); box.innerHTML = j.photos.map((p, i) => `<span><img data-jp="${i}" alt="Journal photo"><button data-jpd="${i}" aria-label="Remove">${ic('close')}</button></span>`).join(''); for (let i = 0; i < j.photos.length; i++) { const im = $(`[data-jp="${i}"]`, box); const src = await photoSrc(j.photos[i]); if (src && im) im.src = src; } };
    paintPh();
    s.el.addEventListener('click', async e => {
      const m = e.target.closest('[data-mood]'); if (m) { j.mood = +m.dataset.mood; $$('[data-mood]', s.el).forEach(x => x.classList.toggle('on', x === m)); return; }
      const pr = e.target.closest('[data-pr]'); if (pr) { const t = $('#jt', s.el); t.value += (t.value ? '\n\n' : '') + pr.dataset.pr + '\n'; t.focus(); return; }
      const pd = e.target.closest('[data-jpd]'); if (pd) { removed.push(...j.photos.splice(+pd.dataset.jpd, 1)); return paintPh(); }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'photo') { const p = await pickPhoto(); if (p) { j.photos.push(p); paintPh(); } return; }
      if (b.dataset.a === 'del') { if (await confirmBox('Delete this entry?', 'Its photos are deleted from the app too.', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { L.journal = L.journal.filter(x => x.id !== j.id); save(); dropFiles([...(j0 ? j0.photos || [] : []), ...removed, ...j.photos]); s.close(); after(); } return; }
      j.text = $('#jt', s.el).value.trim(); j.date = $('#jd', s.el).value || j.date;
      if (!j.text && !j.photos.length && !j.mood) { s.close(); return; }
      const i = L.journal.findIndex(x => x.id === j.id); if (i >= 0) L.journal[i] = j; else L.journal.push(j);
      if (save() === false) return; dropFiles(removed); s.close(); after(); toast('Saved to your journal');
    });
  }
  async function pickPhoto(folder = 'journal', max = 1200) {
    return new Promise(res => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = async () => {
        const f = inp.files && inp.files[0]; if (!f) return res(null);
        const raw = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); });
        const small = await new Promise(r => { const im = new Image(); im.onload = () => { const sc = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = im.width * sc; c.height = im.height * sc; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); r(c.toDataURL('image/jpeg', 0.8)); }; im.onerror = () => r(null); im.src = raw; });
        if (!small) return res(null);
        const id = uid();
        try {
          if (P.Filesystem && P.Vault && L.secure) { const r2 = await P.Vault.encrypt({ text: small.split(',')[1] }); const path = `${folder}/${id}.enc`; await P.Filesystem.writeFile({ path, data: r2.data, directory: 'DATA', encoding: 'utf8', recursive: true }); return res({ path, enc: true }); }
          if (P.Filesystem) { const path = `${folder}/${id}.jpg`; await P.Filesystem.writeFile({ path, data: small.split(',')[1], directory: 'DATA', recursive: true }); return res({ path }); }
        } catch (e) { toast('Could not save that photo'); return res(null); }
        res({ data: small });
      };
      document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
    });
  }
  // Remove photo files nobody points to any more (deleted documents, journal entries or removed photos).
  async function dropFiles(photos) {
    if (!P.Filesystem) return;
    const inUse = new Set([...L.journal.flatMap(j => (j.photos || []).map(p => p.path)), ...(L.docs || []).flatMap(d => (d.photos || []).map(p => p.path))].filter(Boolean));
    for (const p of photos || []) { if (p && p.path && !inUse.has(p.path)) { try { await P.Filesystem.deleteFile({ path: p.path, directory: 'DATA' }); } catch (e) { logProblem('Could not delete a photo file', 'life'); } } }
  }
  async function photoB64(p) {
    if (p.data) return p.data.split(',')[1];
    if (p.enc && P.Vault) { try { const r = await P.Filesystem.readFile({ path: p.path, directory: 'DATA', encoding: 'utf8' }); const d = await P.Vault.decrypt({ data: r.data }); return d.text; } catch (e) { /* restored from a backup as a plain photo */ } }
    try { const r = await P.Filesystem.readFile({ path: p.path, directory: 'DATA' }); return r.data; } catch (e) { return null; }
  }
  async function photoSrc(p) { const b = await photoB64(p); return b ? 'data:image/jpeg;base64,' + b : null; }
  // Focus (Pomodoro)
  let FT = null;
  function focusTool() {
    toolScreen('Focus', '', (scr, body, close) => {
      const st = FT || { mode: 'work', left: L.focus.work * 60000, running: false, count: 0, endAt: 0, task: '' };
      FT = st;
      const totalFor = m => (m === 'work' ? L.focus.work : m === 'long' ? L.focus.long : L.focus.brk) * 60000;
      const todayMin = () => L.focus.sessions.filter(x => x.date === dkey(new Date())).reduce((a, x) => a + x.min, 0);
      const paint = () => {
        const left = st.running ? Math.max(0, st.endAt - Date.now()) : st.left; const tot = totalFor(st.mode);
        const C = 2 * Math.PI * 92;
        body.innerHTML = `<input class="field body" id="ftask" placeholder="What are you working on?" value="${esc(st.task)}">
          <div class="fring ${st.mode}"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="92" class="trk"/><circle cx="100" cy="100" r="92" class="bar" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C * (1 - left / tot)).toFixed(1)}"/></svg><div><small>${st.mode === 'work' ? 'Focus' : st.mode === 'long' ? 'Long break' : 'Break'}</small><b id="ftime">${fmt(Math.ceil(left / 1000))}</b><span>Session ${st.count % 4 + 1} of 4</span></div></div>
          <div class="cbtns"><button class="btn" data-f="reset">Reset</button><button class="btn primary" data-f="go">${st.running ? 'Pause' : 'Start'}</button><button class="btn" data-f="skip">Skip</button></div>
          <div class="stats" style="margin-top:16px"><div class="stat"><div class="k">Today</div><div class="v sm">${todayMin()} min</div><div class="s">${L.focus.sessions.filter(x => x.date === dkey(new Date())).length} sessions</div></div><div class="stat"><div class="k">This week</div><div class="v sm">${Math.round(L.focus.sessions.filter(x => parseKey(x.date) >= addDays(today0(), -6)).reduce((a, x) => a + x.min, 0) / 6) / 10} h</div><div class="s">focused</div></div></div>
          <div class="block" style="margin-top:12px;padding:4px 14px">${[['work', 'Focus'], ['brk', 'Short break'], ['long', 'Long break']].map(([k, n]) => `<div class="stp"><span>${n}</span><div class="stpc"><button data-fs="${k}" data-d="-5">−</button><b>${L.focus[k]} min</b><button data-fs="${k}" data-d="5">+</button></div></div>`).join('')}</div>`;
        $('#ftask', body).addEventListener('input', e => { st.task = e.target.value; });
      };
      const finishPhase = () => {
        Snd.finish(); buzz(600);
        if (st.mode === 'work') { st.count++; L.focus.sessions.push({ date: dkey(new Date()), min: L.focus.work, task: st.task }); save(); say('Focus session done. Take a break.'); st.mode = st.count % 4 === 0 ? 'long' : 'brk'; }
        else { say('Break over. Back to focus.'); st.mode = 'work'; }
        st.left = totalFor(st.mode); st.running = false; cancelFocusNotif(); paint();
      };
      const tickF = setInterval(() => { if (!st.running) return; const left = st.endAt - Date.now(); const t = $('#ftime', body); if (t) t.textContent = fmt(Math.ceil(Math.max(0, left) / 1000)); if (left <= 0) finishPhase(); else if (Math.round(left / 1000) % 5 === 0) { const bar = $('.fring .bar', body); if (bar) { const C = 2 * Math.PI * 92; bar.style.strokeDashoffset = (C * (1 - left / totalFor(st.mode))).toFixed(1); } } }, 500);
      scr._cleanup = () => clearInterval(tickF);
      paint();
      body.addEventListener('click', async e => {
        const fs = e.target.closest('[data-fs]'); if (fs) { const k = fs.dataset.fs; L.focus[k] = Math.max(5, Math.min(90, L.focus[k] + +fs.dataset.d)); save(); if (!st.running) st.left = totalFor(st.mode); return paint(); }
        const f = e.target.closest('[data-f]'); if (!f) return;
        if (f.dataset.f === 'go') { if (st.running) { st.left = Math.max(0, st.endAt - Date.now()); st.running = false; cancelFocusNotif(); Awake.off(); } else { Snd.unlock(); st.endAt = Date.now() + st.left; st.running = true; scheduleFocusNotif(st.endAt, st.mode); Awake.on(); } return paint(); }
        if (f.dataset.f === 'reset') { st.running = false; st.left = totalFor(st.mode); cancelFocusNotif(); return paint(); }
        if (f.dataset.f === 'skip') return finishPhase();
      });
    });
  }
  async function scheduleFocusNotif(at, mode) { if (!P.LocalNotifications) return; try { await P.LocalNotifications.schedule({ notifications: [{ id: 4500, title: mode === 'work' ? '✅ Focus session done' : '⏰ Break over', body: mode === 'work' ? 'Time for a short break' : 'Back to focus', channelId: 'kw_phase', schedule: { at: new Date(at), allowWhileIdle: true }, smallIcon: 'ic_stat_kw', iconColor: S.accent }] }); } catch (e) { /* ignore */ } }
  async function cancelFocusNotif() { if (!P.LocalNotifications) return; try { await P.LocalNotifications.cancel({ notifications: [{ id: 4500 }] }); } catch (e) { /* ignore */ } }
  // Medicine & water
  function medsTool() {
    toolScreen('Medicine & water', '', (scr, body) => {
      const paint = () => {
        const k = dkey(new Date()); const logs = L.medLog[k] || {};
        const days = []; for (let i = 6; i >= 0; i--) days.push(dkey(addDays(today0(), -i)));
        const adh = (() => { let due = 0, ok = 0; days.forEach(d => L.meds.forEach(md => md.times.forEach((t, i) => { if (d === k && t > hmNow()) return; due++; if ((((L.medLog[d] || {})[md.id] || {})[i]) === 'taken') ok++; }))); return due ? Math.round(ok / due * 100) : null; })();
        body.innerHTML = `<div class="sect" style="margin-top:4px"><span>Medicines</span><button class="linkbtn" data-a="madd">+ Add</button></div>
          <div class="block" style="padding:0">${L.meds.map(md => `<div class="medrow"><button class="lrm" data-medit="${md.id}"><b>💊 ${esc(md.name)}${md.dose ? ` <small>${esc(md.dose)}</small>` : ''}</b><span>${md.times.map(t12).join(' · ')}${md.note ? ' · ' + esc(md.note) : ''}</span></button>
            <div class="medtimes">${md.times.map((t, i) => { const s2 = (logs[md.id] || {})[i]; return `<button class="medt ${s2 || ''}" data-med="${md.id}:${i}">${t12(t)}<b>${s2 === 'taken' ? '✓' : s2 === 'skip' ? '–' : ''}</b></button>`; }).join('')}</div></div>`).join('') || '<div class="empty" style="padding:18px">Add your tablets, vitamins or supplements and get a reminder at each time.</div>'}</div>
          ${adh != null ? `<p class="hint">Taken on time this week: <b>${adh}%</b></p>` : ''}
          <div class="sect">Water reminders</div>
          <div class="block"><button class="set-row" data-a="won"><span class="st"><div class="t">Remind me to drink water</div><div class="s">${L.water.on ? `${waterTimes().length} reminders a day` : 'Off'}</div></span><span class="toggle ${L.water.on ? 'on' : ''}"></span></button>
            <div class="set-row"><span class="st"><div class="t">From</div></span><input type="time" id="wf" class="timein" value="${L.water.from}"></div>
            <div class="set-row"><span class="st"><div class="t">Until</div></span><input type="time" id="wt" class="timein" value="${L.water.to}"></div>
            <div class="set-row"><span class="st"><div class="t">Every</div></span><select id="we" class="timein">${[1, 1.5, 2, 3].map(v => `<option value="${v}" ${L.water.every === v ? 'selected' : ''}>${v} h</option>`).join('')}</select></div></div>
          <p class="hint">Your water goal and glasses are tracked on the Muscle side under Protein &amp; water.</p>`;
        ['#wf', '#wt', '#we'].forEach(s2 => $(s2, body).addEventListener('change', () => { L.water.from = $('#wf', body).value || '08:00'; L.water.to = $('#wt', body).value || '21:00'; L.water.every = +$('#we', body).value; save(); reschedule(); paint(); }));
      };
      paint();
      body.addEventListener('click', async e => {
        const m = e.target.closest('[data-med]'); if (m) { markMed(m.dataset.med); return paint(); }
        const me = e.target.closest('[data-medit]'); if (me) return medSheet(L.meds.find(x => x.id === me.dataset.medit), paint);
        const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'madd') return medSheet(null, paint);
        if (b.dataset.a === 'won') { L.water.on = !L.water.on; save(); if (L.water.on) await askNotif(); reschedule(); return paint(); }
      });
    });
  }
  function markMed(key) {
    const [id, i] = key.split(':'); const k = dkey(new Date()); L.medLog[k] = L.medLog[k] || {}; L.medLog[k][id] = L.medLog[k][id] || {};
    const cur = L.medLog[k][id][i]; L.medLog[k][id][i] = !cur ? 'taken' : cur === 'taken' ? 'skip' : undefined; if (!L.medLog[k][id][i]) delete L.medLog[k][id][i];
    if (L.medLog[k][id][i] === 'taken') tap(); save(); if (tab === 'home') refresh();
  }
  function medSheet(m0, after) {
    const isNew = !m0; const md = m0 ? clone(m0) : { id: uid(), nid: nextNid(), name: '', dose: '', times: ['09:00'], note: '', on: true };
    const s = sheet(`<h2>${isNew ? 'Add medicine' : 'Edit medicine'}</h2><input class="field body" id="mn" placeholder="Name (e.g. Vitamin D)" value="${esc(md.name)}" maxlength="40">
      <input class="field body" id="md" placeholder="Dose (e.g. 1 tablet, 500 mg)" value="${esc(md.dose)}" maxlength="30" style="margin-top:8px">
      <div class="sect">Times each day</div><div id="mts"></div>
      <div class="presets" style="justify-content:flex-start">${[['Morning', '08:00'], ['Afternoon', '14:00'], ['Night', '21:00']].map(([n, t]) => `<button class="chip small" data-mt="${t}">+ ${n}</button>`).join('')}</div>
      <input class="field body" id="mo" placeholder="Note (e.g. after food)" value="${esc(md.note)}" maxlength="40" style="margin-top:8px">
      <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="ok">Save</button></div>`);
    const paint = () => { $('#mts', s.el).innerHTML = md.times.map((t, i) => `<div class="qadd" style="margin-bottom:6px"><input type="time" class="field body" data-mtime="${i}" value="${t}"><button class="round-btn" data-mrm="${i}" aria-label="Remove">${ic('close')}</button></div>`).join(''); };
    paint();
    const read = () => $$('[data-mtime]', s.el).forEach(x => { md.times[+x.dataset.mtime] = x.value || md.times[+x.dataset.mtime]; });
    s.el.addEventListener('click', async e => {
      const mt = e.target.closest('[data-mt]'); if (mt) { read(); md.times.push(mt.dataset.mt); md.times.sort(); return paint(); }
      const rm = e.target.closest('[data-mrm]'); if (rm) { read(); if (md.times.length > 1) md.times.splice(+rm.dataset.mrm, 1); return paint(); }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'del') L.meds = L.meds.filter(x => x.id !== md.id);
      else { read(); md.name = $('#mn', s.el).value.trim(); if (!md.name) { toast('Add the medicine name'); return; } md.dose = $('#md', s.el).value.trim(); md.note = $('#mo', s.el).value.trim(); md.times = [...new Set(md.times)].sort(); const i = L.meds.findIndex(x => x.id === md.id); if (i >= 0) L.meds[i] = md; else L.meds.push(md); await askNotif(); }
      save(); reschedule(); s.close(); after();
    });
  }
  // Birthdays & countdowns
  function evRow(ev, d) {
    const days = Math.round((d - today0()) / 864e5); const age = ev.type === 'birthday' && ev.year ? d.getFullYear() - ev.year : null;
    return `<button class="srow" data-ev="${ev.id}"><span class="sico">${ev.type === 'birthday' ? '🎂' : ev.type === 'anniversary' ? '💍' : '📅'}</span><span class="wkt"><b>${esc(ev.name)}</b><span>${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}${age ? ` · turns ${age}` : ''}</span></span><span class="evd ${days <= 1 ? 'soon' : ''}">${days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}</span></button>`;
  }
  function eventsTool() {
    toolScreen('Birthdays & countdowns', '', (scr, body) => {
      const paint = () => {
        const list = L.events.map(ev => ({ ev, d: nextEvent(ev) })).filter(x => x.d).sort((a, b) => a.d - b.d);
        body.innerHTML = `<button class="btn primary" data-a="eadd">${ic('plus')}Add birthday or event</button><div class="block" style="padding:0;margin-top:12px">${list.map(x => evRow(x.ev, x.d)).join('') || '<div class="empty" style="padding:18px">Never forget a birthday, anniversary or exam date. You get a reminder on the day and before.</div>'}</div>`;
      };
      paint();
      body.addEventListener('click', e => { if (e.target.closest('[data-a="eadd"]')) return eventSheet(null, paint); const r = e.target.closest('[data-ev]'); if (r) eventSheet(L.events.find(x => x.id === r.dataset.ev), paint); });
    });
  }
  function eventSheet(e0, after) {
    const isNew = !e0; const ev = e0 ? clone(e0) : { id: uid(), nid: nextNid(), name: '', type: 'birthday', date: dkey(new Date()), yearly: true, before: 1, year: null };
    const s = sheet(`<h2>${isNew ? 'New date' : 'Edit date'}</h2>
      <div class="seg" style="background:var(--surface-2)">${[['birthday', '🎂 Birthday'], ['anniversary', '💍 Anniversary'], ['event', '📅 Event']].map(([k, n]) => `<button class="${ev.type === k ? 'on' : ''}" data-et="${k}">${n}</button>`).join('')}</div>
      <input class="field body" id="en" placeholder="Name (e.g. Amma)" value="${esc(ev.name)}" maxlength="40" style="margin-top:10px">
      <div class="sect">Date</div><input type="date" class="field body" id="ed" value="${ev.year ? `${ev.year}${ev.date.slice(4)}` : ev.date}">
      <label class="mremember" data-a="yr"><span class="toggle sm ${ev.yearly ? 'on' : ''}"></span><span>Every year</span></label>
      <div class="sect">Remind me</div><div class="presets" style="justify-content:flex-start">${[[0, 'On the day'], [1, '1 day before'], [3, '3 days before'], [7, '1 week before']].map(([v, n]) => `<button class="chip small ${ev.before === v ? 'on' : ''}" data-eb="${v}">${n}</button>`).join('')}</div>
      <p class="hint">For birthdays, enter the real birth year to see the age they turn.</p>
      <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="ok">Save</button></div>`);
    s.el.addEventListener('click', async e => {
      const et = e.target.closest('[data-et]'); if (et) { ev.type = et.dataset.et; if (ev.type !== 'event') ev.yearly = true; $$('[data-et]', s.el).forEach(x => x.classList.toggle('on', x === et)); $('[data-a="yr"] .toggle', s.el).classList.toggle('on', ev.yearly); return; }
      const eb = e.target.closest('[data-eb]'); if (eb) { ev.before = +eb.dataset.eb; $$('[data-eb]', s.el).forEach(x => x.classList.toggle('on', x === eb)); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'yr') { ev.yearly = !ev.yearly; $('.toggle', b).classList.toggle('on', ev.yearly); return; }
      if (b.dataset.a === 'del') L.events = L.events.filter(x => x.id !== ev.id);
      else { ev.name = $('#en', s.el).value.trim(); if (!ev.name) { toast('Add a name'); return; } const dv = $('#ed', s.el).value || dkey(new Date()); ev.year = ev.type === 'birthday' && +dv.slice(0, 4) < new Date().getFullYear() ? +dv.slice(0, 4) : null; ev.date = dv; const i = L.events.findIndex(x => x.id === ev.id); if (i >= 0) L.events[i] = ev; else L.events.push(ev); await askNotif(); }
      save(); reschedule(); s.close(); after();
    });
  }
  // Calculator
  function calcEval(expr) {
    const s = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/%/g, '/100');
    if (!/^[\d+\-*/().\s]+$/.test(s)) throw new Error('bad');
    let i = 0; const peek = () => s[i], eat = () => s[i++];
    const ws = () => { while (s[i] === ' ') i++; };
    const num = () => { ws(); if (peek() === '(') { eat(); const v = expr2(); ws(); eat(); return v; } if (peek() === '-') { eat(); return -num(); } const st = i; while (/[\d.]/.test(peek() || '')) eat(); const v = parseFloat(s.slice(st, i)); if (isNaN(v)) throw new Error('bad'); return v; };
    const term = () => { let v = num(); for (;;) { ws(); const c = peek(); if (c === '*') { eat(); v *= num(); } else if (c === '/') { eat(); const d = num(); v /= d; } else return v; } };
    const expr2 = () => { let v = term(); for (;;) { ws(); const c = peek(); if (c === '+') { eat(); v += term(); } else if (c === '-') { eat(); v -= term(); } else return v; } };
    const v = expr2(); if (!isFinite(v)) throw new Error('bad'); return Math.round(v * 1e10) / 1e10;
  }
  function calcTool() {
    toolScreen('Calculator', '', (scr, body) => {
      let ex = '', res = '';
      const keys = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '%', '0', '.', '='];
      const paint = () => { body.innerHTML = `<div class="calcd"><small>${esc(L.calcHist.slice(-3).join('   '))}</small><span>${esc(ex || '0')}</span><b>${esc(res)}</b></div><div class="calck">${keys.map(k => `<button data-k="${esc(k)}" class="${/[÷×−+=]/.test(k) ? 'op' : k === 'C' ? 'cl' : ''}">${k}</button>`).join('')}<button data-k="⌫" class="wide">⌫</button></div>`; };
      paint();
      body.addEventListener('click', e => {
        const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k; tap();
        if (k === 'C') { ex = ''; res = ''; }
        else if (k === '⌫') ex = ex.slice(0, -1);
        else if (k === '=') { try { const v = calcEval(ex); L.calcHist.push(`${ex} = ${v.toLocaleString('en-IN')}`); L.calcHist = L.calcHist.slice(-20); save(); ex = String(v); res = ''; } catch (err) { res = 'Error'; } }
        else ex += k;
        if (k !== '=' && k !== 'C') { try { res = ex ? '= ' + calcEval(ex).toLocaleString('en-IN', { maximumFractionDigits: 8 }) : ''; } catch (err) { res = ''; } }
        paint();
      });
    });
  }
  // Converter, percentage, EMI and GST
  const UNITS = {
    Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
    Weight: { kg: 1, g: 0.001, lb: 0.45359237, oz: 0.0283495, ton: 1000 },
    Volume: { l: 1, ml: 0.001, 'US gal': 3.78541, cup: 0.24, 'fl oz': 0.0295735 },
    Area: { 'sq m': 1, 'sq ft': 0.092903, acre: 4046.86, hectare: 10000, 'sq yd': 0.836127, cent: 40.4686 },
    Speed: { 'km/h': 1, 'mph': 1.609344, 'm/s': 3.6, knot: 1.852 },
    Data: { MB: 1, GB: 1024, TB: 1048576, KB: 1 / 1024 },
    Temperature: { '°C': 'c', '°F': 'f', K: 'k' },
  };
  function convertTool() {
    toolScreen('Converter', '', (scr, body) => {
      let seg = 'units', cat = 'Length';
      const paint = () => {
        const segs = [['units', 'Units'], ['pct', '%'], ['emi', 'EMI'], ['gst', 'GST']];
        let inner = '';
        if (seg === 'units') { const u = Object.keys(UNITS[cat]); inner = `<div class="presets" style="justify-content:flex-start">${Object.keys(UNITS).map(c => `<button class="chip small ${cat === c ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
          <div class="conv"><input class="field body" id="cv" inputmode="decimal" value="1"><select id="cf" class="field body">${u.map((x, i) => `<option ${i === 0 ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          <div class="block" style="padding:0;margin-top:10px" id="cout"></div>`; }
        if (seg === 'pct') inner = `<div class="block" style="padding:12px 14px"><div class="convr">What is <input class="field body sm" id="p1" inputmode="decimal" value="18"> % of <input class="field body sm" id="p2" inputmode="decimal" value="1000"></div><b class="cres" id="pr1"></b></div>
          <div class="block" style="padding:12px 14px"><div class="convr"><input class="field body sm" id="p3" inputmode="decimal" value="250"> is what % of <input class="field body sm" id="p4" inputmode="decimal" value="1000"></div><b class="cres" id="pr2"></b></div>
          <div class="block" style="padding:12px 14px"><div class="convr">From <input class="field body sm" id="p5" inputmode="decimal" value="40000"> to <input class="field body sm" id="p6" inputmode="decimal" value="46000"></div><b class="cres" id="pr3"></b></div>`;
        if (seg === 'emi') inner = `<div class="block" style="padding:4px 14px"><div class="stp"><span>Loan amount (₹)</span><input class="field body sm" id="e1" inputmode="numeric" value="500000"></div><div class="stp"><span>Interest % a year</span><input class="field body sm" id="e2" inputmode="decimal" value="10.5"></div><div class="stp"><span>Months</span><input class="field body sm" id="e3" inputmode="numeric" value="36"></div></div><div class="rephero" id="eres"></div>`;
        if (seg === 'gst') inner = `<div class="block" style="padding:4px 14px"><div class="stp"><span>Amount (₹)</span><input class="field body sm" id="g1" inputmode="decimal" value="1000"></div></div><div class="presets" style="justify-content:flex-start">${[5, 12, 18, 28].map(r => `<button class="chip small ${r === 18 ? 'on' : ''}" data-gr="${r}">${r}%</button>`).join('')}</div><div class="block" style="padding:0" id="gres"></div>`;
        body.innerHTML = `<div class="seg">${segs.map(([k, n]) => `<button class="${seg === k ? 'on' : ''}" data-cs="${k}">${n}</button>`).join('')}</div>${inner}`;
        calc();
      };
      let gst = 18;
      const n = id => parseFloat(($('#' + id, body) || {}).value) || 0;
      const fmtN2 = v => (Math.round(v * 1e6) / 1e6).toLocaleString('en-IN', { maximumFractionDigits: 6 });
      const rs2 = v => (Math.round(v * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });
      function calc() {
        if (seg === 'units') {
          const v = n('cv'), from = $('#cf', body).value, U = UNITS[cat];
          let rows;
          if (cat === 'Temperature') { const c = from === '°C' ? v : from === '°F' ? (v - 32) * 5 / 9 : v - 273.15; rows = [['°C', c], ['°F', c * 9 / 5 + 32], ['K', c + 273.15]]; }
          else rows = Object.keys(U).map(u => [u, v * U[from] / U[u]]);
          $('#cout', body).innerHTML = rows.filter(r => r[0] !== from).map(([u, x]) => `<div class="mini-row"><span>${u}</span><b>${fmtN2(x)}</b></div>`).join('');
        }
        if (seg === 'pct') { $('#pr1', body).textContent = '= ' + fmtN2(n('p1') * n('p2') / 100); $('#pr2', body).textContent = n('p4') ? '= ' + fmtN2(n('p3') / n('p4') * 100) + '%' : ''; const ch = n('p5') ? (n('p6') - n('p5')) / n('p5') * 100 : 0; $('#pr3', body).textContent = `${ch >= 0 ? '▲' : '▼'} ${fmtN2(Math.abs(ch))}% ${ch >= 0 ? 'increase' : 'decrease'}`; }
        if (seg === 'emi') { const P0 = n('e1'), r = n('e2') / 1200, m = n('e3'); const emi = r ? P0 * r * Math.pow(1 + r, m) / (Math.pow(1 + r, m) - 1) : P0 / (m || 1); $('#eres', body).innerHTML = `<b>₹${Math.round(emi).toLocaleString('en-IN')}</b><span>per month for ${m} months</span><em>Total interest ₹${Math.round(emi * m - P0).toLocaleString('en-IN')} · Total paid ₹${Math.round(emi * m).toLocaleString('en-IN')}</em>`; }
        if (seg === 'gst') { const a = n('g1'); const add = a * gst / 100, incl = a - a / (1 + gst / 100); $('#gres', body).innerHTML = `<div class="mini-row"><span>Add ${gst}% GST<small>CGST ${gst / 2}% + SGST ${gst / 2}%: ₹${rs2(add / 2)} each</small></span><b>₹${rs2(a + add)}</b></div><div class="mini-row"><span>GST inside ₹${rs2(a)}<small>Price before GST ₹${rs2(a - incl)}</small></span><b>₹${rs2(incl)}</b></div>`; }
      }
      paint();
      body.addEventListener('input', calc); body.addEventListener('change', calc);
      body.addEventListener('click', e => {
        const cs = e.target.closest('[data-cs]'); if (cs) { seg = cs.dataset.cs; return paint(); }
        const c = e.target.closest('[data-cat]'); if (c) { cat = c.dataset.cat; return paint(); }
        const g = e.target.closest('[data-gr]'); if (g) { gst = +g.dataset.gr; $$('[data-gr]', body).forEach(x => x.classList.toggle('on', x === g)); calc(); }
      });
    });
  }
  function openTool(k) {
    ({ journal: journalTool, focus: focusTool, weather: weatherTool, meds: medsTool, water: medsTool, events: eventsTool, calc: calcTool, convert: convertTool,
      lists: () => { taskSeg = 'lists'; go('l-tasks'); }, world: () => { clockSeg = 'world'; go('l-clock'); }, alarm: () => { clockSeg = 'alarms'; go('l-clock'); },
      docs: docsTool, voice: voiceAdd, brief: () => openBriefing(false), bills: () => Money.openMoney('budget') })[k]();
  }

  /* ---------- morning briefing ---------- */
  function briefing() {
    const now = new Date(), h = now.getHours(), k = dkey(now), out = [];
    const add2 = (icon, text) => out.push({ icon, text });
    add2('👋', `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}${S.name ? ', ' + S.name : ''}. It's ${now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.`);
    const w = L.weather && L.weather.data;
    if (w) add2(wx(w.current.weather_code)[0], `In ${L.weather.name} it's ${Math.round(w.current.temperature_2m)} degrees and ${wx(w.current.weather_code)[1].toLowerCase()}, with a high of ${Math.round(w.daily.temperature_2m_max[0])}${w.daily.precipitation_probability_max && w.daily.precipitation_probability_max[0] >= 40 ? `, and a ${w.daily.precipitation_probability_max[0]} percent chance of rain. Carry an umbrella` : ''}.`);
    try {
      const day = typeof plan !== 'undefined' && plan && plan[now.getDay()];
      const doneToday = typeof log !== 'undefined' && log.some(x => x.date === k);
      if (doneToday) add2('✅', 'Your workout is already done today. Nice.');
      else if (day && day.rest) add2('🧘', 'Today is a rest day. A walk or some stretching will help you recover.');
      else if (day && day.items && day.items.length) add2('🏋️', `Today's workout: ${day.items.map(i => i.name).join(', ')}.`);
    } catch (e) { /* no plan */ }
    const rem = L.reminders.filter(r => r.on && (r.repeat === 'daily' || (r.repeat === 'weekly' && r.days[now.getDay()]) || dkey(nextOccur(r)) === k)).sort((a, b) => a.time.localeCompare(b.time));
    if (rem.length) add2('🔔', `${rem.length === 1 ? 'One reminder' : rem.length + ' reminders'}: ${rem.slice(0, 3).map(r => `${r.title} at ${t12(r.time)}`).join('; ')}.`);
    const tasks = L.tasks.filter(t => !t.done && t.due && t.due <= k);
    if (tasks.length) add2('✅', `${tasks.length === 1 ? 'One task' : tasks.length + ' tasks'} due: ${tasks.slice(0, 3).map(t => t.title).join(', ')}${tasks.some(t => t.due < k) ? ', some overdue' : ''}.`);
    const meds = L.meds.filter(m => m.on !== false);
    if (meds.length) add2('💊', `Medicines today: ${meds.map(m => `${m.name} at ${m.times.map(t12).join(' and ')}`).join('; ')}.`);
    const bills = billsSafe(3) || [];
    if (bills.length) add2('🧾', `Bills: ${bills.map(b => `${b.name}, ${Math.round(b.amount || 0)} rupees, ${b.overdue ? 'overdue' : Math.round((b.due - today0()) / 864e5) === 0 ? 'due today' : 'due ' + dayName(dkey(b.due)).toLowerCase()}`).join('; ')}.`);
    try { const m = Money.widgetData(); if (m.money && !m.locked) add2('💰', `You can safely spend about ${Math.round(m.safe).toLocaleString('en-IN')} rupees today.`); } catch (e) { /* money off */ }
    const ev = upcomingEvents(1);
    ev.forEach(x => { const d = Math.round((x.d - today0()) / 864e5); add2(x.ev.type === 'birthday' ? '🎂' : '📅', `${x.ev.type === 'birthday' ? `${x.ev.name}'s birthday` : x.ev.name} is ${d === 0 ? 'today' : 'tomorrow'}.`); });
    docsSoon(14).forEach(d => add2('📄', `${d.name} ${docExpTxt(d)}.`));
    const q = pickQuote('life'); add2('✨', `Thought for today: ${q}`);
    return out;
  }
  let speaking = false;
  async function stopSpeak() { speaking = false; try { if (P.TextToSpeech) await P.TextToSpeech.stop(); } catch (e) { /* ignore */ } try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  async function speakAll(lines, onLine) {
    speaking = true;
    for (let i = 0; i < lines.length && speaking; i++) {
      onLine && onLine(i);
      const text = lines[i].text;
      if (P.TextToSpeech) { try { await P.TextToSpeech.speak({ text, lang: 'en-IN', rate: 1.0, pitch: 1.0, volume: 1.0, category: 'playback' }); continue; } catch (e) { /* fall back */ } }
      if ('speechSynthesis' in window) await new Promise(r => { const u = new SpeechSynthesisUtterance(text); u.rate = 1; u.onend = r; u.onerror = r; speechSynthesis.speak(u); setTimeout(r, 15000); });
    }
    speaking = false; onLine && onLine(-1);
  }
  async function openBriefing(auto, after) {
    if (L.weather && (!L.weather.at || Date.now() - L.weather.at > 30 * 60000)) { try { await refreshWeather(true); } catch (e) { /* offline */ } }
    const lines = briefing();
    const s = sheet(`<h2>${new Date().getHours() < 12 ? 'Morning briefing' : 'Your day'}</h2>
      <div class="brief">${lines.map((l, i) => `<div class="bline" data-bl="${i}"><span>${l.icon}</span><p>${esc(l.text)}</p></div>`).join('')}</div>
      <div class="btns two"><button class="btn" data-a="close">Close</button><button class="btn primary" data-a="play">${ic('play')}Read it to me</button></div>`, { onClose: () => { stopSpeak(); if (after) after(); } });
    const mark = i => { $$('[data-bl]', s.el).forEach(x => x.classList.toggle('on', +x.dataset.bl === i)); const pl = $('[data-a="play"]', s.el); if (pl) pl.innerHTML = i >= 0 ? ic('pause') + 'Stop' : ic('play') + 'Read it to me'; };
    s.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') return s.close();
      if (b.dataset.a === 'play') { if (speaking) { stopSpeak(); mark(-1); } else speakAll(lines, mark); }
    });
    if (auto) setTimeout(() => speakAll(lines, mark), 400);
  }

  /* ---------- documents vault ---------- */
  const DOC_TYPES = [['aadhaar', '🪪', 'Aadhaar'], ['pan', '💳', 'PAN card'], ['licence', '🚗', 'Driving licence'], ['passport', '🛂', 'Passport'], ['rc', '🏍️', 'Vehicle RC'], ['insurance', '🛡️', 'Insurance'], ['health', '🏥', 'Health card'], ['other', '📄', 'Other']];
  const docType = t => DOC_TYPES.find(x => x[0] === t) || DOC_TYPES[DOC_TYPES.length - 1];
  const docDays = d => d.exp ? Math.round((parseKey(d.exp) - today0()) / 864e5) : null;
  const docExpTxt = d => { const n = docDays(d); return n == null ? '' : n < 0 ? `expired ${-n} day${n === -1 ? '' : 's'} ago` : n === 0 ? 'expires today' : `expires in ${n} day${n === 1 ? '' : 's'}`; };
  const docsSoon = (days = 30) => (L.docs || []).filter(d => { const n = docDays(d); return n != null && n <= days; }).sort((a, b) => docDays(a) - docDays(b));
  async function unlockDocs() {
    if (secFailed) { lifeLockedMsg(); return false; }
    if (L.docsLock === false) return true;
    if (!P.AppLock) { if (!isNative) return true; toast('Documents are locked and this device can\'t check your screen lock'); return false; }
    let avail = false; try { avail = !!(await P.AppLock.available()).available; } catch (e) { avail = false; }
    if (!avail) {
      const v = await confirmBox('Documents stay locked', 'Documents are protected by your phone\'s screen lock, which is turned off. Turn it back on in phone Settings → Security. Or, if you accept that anyone holding this phone could see them, turn protection off.', [{ label: 'OK', cls: 'primary', value: 0 }, { label: 'Turn protection off', cls: 'danger', value: 1 }]);
      if (v === 1) { L.docsLock = false; save(); return true; }
      return false;
    }
    try { const r = await P.AppLock.authenticate({ title: 'Open documents' }); if (r && r.ok) return true; } catch (e) { /* fall through */ }
    toast('Documents stay locked'); return false;
  }
  async function docsTool() {
    if (!(await unlockDocs())) return;
    toolScreen('Documents', '', (scr, body) => {
      body.addEventListener('click', e => { if (e.target.closest('[data-a="dlockon"]')) { L.docsLock = true; save(); toast('Documents protected again'); scr.querySelector('[data-a="close"]').click(); } });
      const paint = () => {
        const list = (L.docs || []).slice().sort((a, b) => (docDays(a) ?? 9e9) - (docDays(b) ?? 9e9));
        body.innerHTML = `<button class="btn primary" data-a="dadd">${ic('plus')}Add a document</button>
          <div class="lockstate ${L.docsLock !== false ? 'on' : ''}">${ic(L.docsLock !== false ? 'lock' : 'unlock')}<span><b>${L.docsLock !== false ? 'Protected' : 'Not protected'}</b>${L.docsLock !== false ? 'Opens only with your fingerprint or screen lock' : 'Anyone holding this phone can open Documents'}${P.Vault && L.secure ? ' · numbers and photos encrypted' : ''}</span>${L.docsLock === false ? '<button class="btn sm" data-a="dlockon">Protect</button>' : ''}</div>
          <p class="hint">Photos stay on this phone only. You get a reminder before anything expires.</p>
          <div class="docgrid">${list.map(d => { const t = docType(d.type), n = docDays(d); return `<button class="doccard ${n != null && n < 0 ? 'bad' : n != null && n <= 30 ? 'soon' : ''}" data-doc="${d.id}"><span class="dico">${t[1]}</span><b>${esc(d.name)}</b><small>${d.exp ? esc(docExpTxt(d)) : esc(t[2])}</small>${d.photos && d.photos.length ? `<em>${d.photos.length} photo${d.photos.length > 1 ? 's' : ''}</em>` : ''}</button>`; }).join('') || '<div class="empty" style="grid-column:1/-1"><b>Your documents, in one safe place</b>Aadhaar, PAN, licence, insurance, RC… keep a photo handy and never miss a renewal.</div>'}</div>`;
      };
      paint();
      body.addEventListener('click', e => {
        if (e.target.closest('[data-a="dadd"]')) return docSheet(null, paint);
        const d = e.target.closest('[data-doc]'); if (d) docView(L.docs.find(x => x.id === d.dataset.doc), paint);
      });
    });
  }
  function docSheet(d0, after) {
    const removedD = [];
    const isNew = !d0; const d = d0 ? clone(d0) : { id: uid(), nid: nextNid(), type: 'aadhaar', name: 'Aadhaar', number: '', exp: '', before: 30, photos: [], note: '' };
    const s = sheet(`<h2>${isNew ? 'Add document' : 'Edit document'}</h2>
      <div class="presets" style="justify-content:flex-start">${DOC_TYPES.map(([k, e, n]) => `<button class="chip small ${d.type === k ? 'on' : ''}" data-dt="${k}">${e} ${n}</button>`).join('')}</div>
      <input class="field body" id="dn" placeholder="Name (e.g. Bike insurance)" value="${esc(d.name)}" maxlength="40" style="margin-top:10px">
      <div class="qadd" style="margin-top:8px"><input class="field body" id="dnum" type="password" placeholder="Number (optional)" value="${esc(d.number || '')}" maxlength="40" autocomplete="off"><button class="round-btn" data-a="shownum" aria-label="Show or hide number">${ic('info')}</button></div>
      <div class="sect">Expiry date (optional)</div><input type="date" class="field body" id="dexp" value="${d.exp || ''}">
      <div class="presets" style="justify-content:flex-start;margin-top:8px">${[[7, '1 week before'], [30, '1 month before'], [60, '2 months before']].map(([v, n]) => `<button class="chip small ${d.before === v ? 'on' : ''}" data-db="${v}">${n}</button>`).join('')}</div>
      <div class="jph" id="dph"></div>
      <div class="btns two"><button class="btn" data-a="photo">${ic('camera')}Add photo</button><button class="btn primary" data-a="ok">Save</button></div>
      ${isNew ? '' : '<button class="linkbtn danger" data-a="del" style="margin-top:12px">Delete this document</button>'}`);
    const paintPh = async () => { const box = $('#dph', s.el); box.innerHTML = d.photos.map((p, i) => `<span><img data-dp="${i}" alt="Document photo"><button data-dpd="${i}" aria-label="Remove">${ic('close')}</button></span>`).join(''); for (let i = 0; i < d.photos.length; i++) { const im = $(`[data-dp="${i}"]`, box); const src = await photoSrc(d.photos[i]); if (src && im) im.src = src; } };
    paintPh();
    s.el.addEventListener('click', async e => {
      const dt = e.target.closest('[data-dt]'); if (dt) { const prev = docType(d.type)[2]; d.type = dt.dataset.dt; $$('[data-dt]', s.el).forEach(x => x.classList.toggle('on', x === dt)); const nm = $('#dn', s.el); if (!nm.value || nm.value === prev) nm.value = docType(d.type)[2]; return; }
      const db = e.target.closest('[data-db]'); if (db) { d.before = +db.dataset.db; $$('[data-db]', s.el).forEach(x => x.classList.toggle('on', x === db)); return; }
      const pd = e.target.closest('[data-dpd]'); if (pd) { removedD.push(...d.photos.splice(+pd.dataset.dpd, 1)); return paintPh(); }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'shownum') { const n = $('#dnum', s.el); n.type = n.type === 'password' ? 'text' : 'password'; return; }
      if (b.dataset.a === 'photo') { const p = await pickPhoto('docs', 1800); if (p) { d.photos.push(p); paintPh(); } return; }
      if (b.dataset.a === 'del') { if (await confirmBox('Delete this document?', 'Its photos are deleted from the phone too. This can\'t be undone.', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { L.docs = L.docs.filter(x => x.id !== d.id); save(); dropFiles([...(d0 ? d0.photos || [] : []), ...removedD, ...d.photos]); reschedule(); s.close(); after && after(); } return; }
      d.name = $('#dn', s.el).value.trim() || docType(d.type)[2]; d.number = $('#dnum', s.el).value.trim(); d.exp = $('#dexp', s.el).value || '';
      L.docs = L.docs || []; const i = L.docs.findIndex(x => x.id === d.id); if (i >= 0) L.docs[i] = d; else L.docs.push(d);
      if (save() === false) return; dropFiles(removedD); if (d.exp) await askNotif(); reschedule(); s.close(); after && after(); toast(d.exp ? `Saved · ${docExpTxt(d)}` : 'Saved');
    });
  }
  function docView(d, after) {
    const t = docType(d.type);
    const scr = el(`<section class="screen secure-screen"><header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Back">${ic('chevL')}</button></div><h1>${esc(d.name)}</h1><div class="tb-right"><button class="round-btn" data-a="edit" aria-label="Edit">${ic('edit')}</button></div></header>
      <div class="scroll"><div class="page"><div class="docinfo"><span class="dico">${t[1]}</span><div><b>${esc(t[2])}</b>${d.number ? `<span class="docnum" data-a="num">${esc(d.number.replace(/.(?=.{4})/g, '•'))}</span><small>Tap the number to show or copy it</small>` : ''}${d.exp ? `<span class="${docDays(d) < 0 ? 'badt' : ''}">${esc(docExpTxt(d))} · ${parseKey(d.exp).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>` : ''}</div></div>
      <div class="docphotos" id="dvp">${d.photos.length ? '' : '<div class="empty">No photos yet. Tap the pencil to add the front and back.</div>'}</div></div></div></section>`);
    layer.appendChild(scr);
    (async () => { const box = $('#dvp', scr); for (let i = 0; i < d.photos.length; i++) { const src = await photoSrc(d.photos[i]); if (src) box.insertAdjacentHTML('beforeend', `<button class="docph" data-full="${i}"><img src="${src}" alt="${esc(d.name)} photo ${i + 1}"></button>`); } })();
    const close = () => { unback(); scr.remove(); updateSecure(); after && after(); };
    const unback = pushBack(close);
    updateSecure();
    let shown = false;
    scr.addEventListener('click', async e => {
      const f = e.target.closest('[data-full]'); if (f) { const img = $('img', f); const v = el(`<div class="imgview"><img src="${img.src}" alt=""><button class="round-btn" aria-label="Close">${ic('close')}</button></div>`); document.body.appendChild(v); v.addEventListener('click', () => v.remove()); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') return close();
      if (b.dataset.a === 'edit') { close(); return docSheet(d, () => docsTool()); }
      if (b.dataset.a === 'num') { if (!shown) { shown = true; b.textContent = d.number; } else { try { await navigator.clipboard.writeText(d.number); toast('Number copied'); } catch (err) { /* ignore */ } } }
    });
  }

  /* ---------- voice add ---------- */
  const WD = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const NUMW = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, half: 30 };
  // Pulls the date, time and repeat out of a sentence and returns what is left as the title.
  function parseWhen(text) {
    let t = ' ' + text.replace(/[.!?]+$/, '') + ' ';
    const out = { date: null, time: null, repeat: 'once', days: [0, 0, 0, 0, 0, 0, 0] };
    const cut = re => { const m = t.match(re); if (m) t = t.replace(m[0], ' '); return m; };
    Object.entries(NUMW).forEach(([w, n]) => { t = t.replace(new RegExp(`\\b(in|at|for|after) ${w}\\b`, 'gi'), `$1 ${n}`); });
    let m;
    if ((m = cut(/\bin (\d+) (minutes?|mins?|hours?|hrs?)\b/i))) { const d = new Date(Date.now() + (+m[1]) * (/h/i.test(m[2]) ? 3600e3 : 60e3)); out.date = dkey(d); out.time = `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
    if ((m = cut(/\b(?:at |by )?(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?\s?m\.?|p\.?\s?m\.?)/i))) { let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; out.time = `${pad(h)}:${m[2] || '00'}`; }
    else if ((m = cut(/\b(?:at|by) (\d{1,2})(?:[:.](\d{2}))?\b/i))) { let h = +m[1]; if (h <= 6 && !/morning/i.test(t)) h += 12; out.time = `${pad(h % 24)}:${m[2] || '00'}`; }
    if ((m = cut(/\b(?:in the |this |every )?(morning|afternoon|evening|tonight|night)\b/i)) && !out.time) out.time = { morning: '09:00', afternoon: '14:00', evening: '18:00', tonight: '21:00', night: '21:00' }[m[1].toLowerCase()];
    if ((m = cut(/\b(?:every ?day|daily|each day)\b/i))) out.repeat = 'daily';
    else if ((m = cut(/\b(?:on )?weekdays\b/i))) { out.repeat = 'weekly'; out.days = [0, 1, 1, 1, 1, 1, 0]; }
    else if ((m = cut(/\bevery ((?:(?:sun|mon|tues|wednes|thurs|fri|satur)day(?:s)?(?:,? (?:and )?)?)+)/i))) { out.repeat = 'weekly'; WD.forEach((d, i) => { if (m[1].toLowerCase().includes(d)) out.days[i] = 1; }); }
    else if ((m = cut(/\b(?:on )?(?:the )?(\d{1,2})(?:st|nd|rd|th)? (?:of )?every month\b|\bevery month on the (\d{1,2})(?:st|nd|rd|th)?\b|\bmonthly on the (\d{1,2})(?:st|nd|rd|th)?\b/i))) { out.repeat = 'monthly'; const day = +(m[1] || m[2] || m[3]); const t0 = today0(); let d = new Date(t0.getFullYear(), t0.getMonth(), day); if (d < t0) d = new Date(t0.getFullYear(), t0.getMonth() + 1, day); out.date = dkey(d); }
    else if ((m = cut(/\b(?:every month|monthly)\b/i))) out.repeat = 'monthly';
    else if ((m = cut(/\b(?:every year|yearly|annually)\b/i))) out.repeat = 'yearly';
    if (!out.date) {
      if (cut(/\btoday\b/i)) out.date = dkey(new Date());
      else if (cut(/\b(?:day after tomorrow)\b/i)) out.date = dkey(addDays(today0(), 2));
      else if (cut(/\btomorrow\b/i)) out.date = dkey(addDays(today0(), 1));
      else if ((m = cut(/\b(?:on |this |next )?(sun|mon|tues|wednes|thurs|fri|satur)day\b/i))) { const ti = WD.findIndex(d => d.startsWith(m[1].toLowerCase())); out.date = dkey(addDays(today0(), ((ti - new Date().getDay()) + 7) % 7 || 7)); }
      else if ((m = cut(/\b(?:on )?(?:the )?(\d{1,2})(?:st|nd|rd|th)?(?: of)? (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i))) { const mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[2].toLowerCase()); const t0 = today0(); let d = new Date(t0.getFullYear(), mo, +m[1]); if (d < t0) d = new Date(t0.getFullYear() + 1, mo, +m[1]); out.date = dkey(d); }
      else if ((m = cut(/\b(?:on )?the (\d{1,2})(?:st|nd|rd|th)\b|\bon (\d{1,2})(?:st|nd|rd|th)\b/i))) { const day = +(m[1] || m[2]); const t0 = today0(); let d = new Date(t0.getFullYear(), t0.getMonth(), day); if (d < t0) d = new Date(t0.getFullYear(), t0.getMonth() + 1, day); out.date = dkey(d); }
    }
    out.title = t.replace(/\s+(on|at|by|for|in|the|every)\s*$/i, ' ').replace(/^\s*(to|that|about)\s+/i, ' ').replace(/\s{2,}/g, ' ').trim();
    out.title = out.title.charAt(0).toUpperCase() + out.title.slice(1);
    return out;
  }
  function parseVoice(raw) {
    const t = String(raw || '').trim(); let m;
    if (!t) return null;
    if ((m = t.match(/^(?:please )?(?:set (?:an |the |my )?alarm|wake me(?: up)?)(?:\s+(?:for|at))?\s*(.*)$/i))) { let rest = m[1].replace(/^(at|for)\s+/i, ''); if (!/\d\s*[ap]\.?\s?m/i.test(rest)) rest = rest.replace(/(\d{1,2}(?:[:.]\d{2})?)/, '$1 am'); const w = parseWhen('at ' + rest); return { kind: 'alarm', time: w.time || '06:30', days: w.repeat === 'daily' ? [1, 1, 1, 1, 1, 1, 1] : w.repeat === 'weekly' ? w.days : [0, 0, 0, 0, 0, 0, 0], label: '' }; }
    if ((m = t.match(/^(?:add|put)\s+(.+?)\s+(?:to|on|in)(?: my| the)?\s+(.*?)\s*(?:shopping )?list$/i)) || (m = t.match(/^(?:add|put)\s+(.+?)\s+(?:to|on|in)(?: my| the)?\s+(shopping|groceries|grocery)$/i))) {
      const items = m[1].split(/,|\band\b/i).map(x => x.trim()).filter(Boolean); const lname = /shopping|grocer/i.test(m[2]) || !m[2] ? 'Groceries' : m[2].replace(/\b\w/g, c => c.toUpperCase());
      return { kind: 'shop', items, list: lname };
    }
    if ((m = t.match(/\b(?:spent|paid|spend|pay)\s+(?:rs\.?\s*|₹\s*|rupees\s*)?(\d+(?:[.,]\d+)?)\s*(?:rupees|rs|bucks)?\s*(?:on|for|at|to)?\s*(.*)$/i))) return { kind: 'expense', amount: parseFloat(m[1].replace(',', '')), payee: m[2].replace(/^(the|my)\s+/i, '').trim() };
    if ((m = t.match(/^(?:take a note|make a note|note down|note|write down|save a note)[:,]?\s*(?:that\s+)?(.+)$/i))) return { kind: 'note', text: m[1].charAt(0).toUpperCase() + m[1].slice(1) };
    if ((m = t.match(/^(?:remind me|reminder|set a reminder|create a reminder)(?: to| about| that)?\s+(.+)$/i))) { const w = parseWhen(m[1]); if (!w.time) w.time = '09:00'; if (!w.date) { w.date = dkey(new Date()); if (w.repeat === 'once' && w.time < hmNow()) w.date = dkey(addDays(today0(), 1)); } return Object.assign({ kind: 'reminder' }, w); }
    const w = parseWhen(t.replace(/^(?:add a task|add task|task|to ?do)[:,]?\s*(?:to\s+)?/i, ''));
    return Object.assign({ kind: 'task' }, w);
  }
  async function listen() {
    if (P.Speech) { try { const r = await P.Speech.listen({ lang: 'en-IN' }); return r && r.text; } catch (e) { if (!/cancel|nothing/i.test(String(e && e.message || e))) toast(String(e && e.message || 'Voice is not available')); return null; } }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) return new Promise(res => { const r = new SR(); r.lang = 'en-IN'; r.onresult = e => res(e.results[0][0].transcript); r.onerror = () => res(null); r.onend = () => setTimeout(() => res(null), 50); try { r.start(); toast('Listening…'); } catch (e) { res(null); } });
    return promptText('Type what you would say', { placeholder: 'Remind me to pay rent on the 5th', ok: 'Add', max: 160 });
  }
  async function voiceAdd(preset) {
    const text = preset || await listen(); if (!text) return;
    const v = parseVoice(text); if (!v) return;
    const KIND = { reminder: ['🔔', 'Reminder'], task: ['✅', 'Task'], note: ['📝', 'Note'], alarm: ['⏰', 'Alarm'], shop: ['🛒', 'Shopping list'], expense: ['₹', 'Expense'] };
    const rep = v.repeat && v.repeat !== 'once' ? (v.repeat === 'weekly' ? 'every ' + v.days.map((on, i) => on ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i] : '').filter(Boolean).join(', ') : { daily: 'every day', monthly: 'every month', yearly: 'every year' }[v.repeat]) : '';
    const detail = v.kind === 'reminder' ? `${t12(v.time)} · ${rep || dayName(v.date)}` : v.kind === 'task' ? (v.date ? `${dayName(v.date)}${v.time ? ' · ' + t12(v.time) : ''}` : 'Any time') : v.kind === 'alarm' ? `${t12(v.time)} · ${v.days.some(Boolean) ? 'repeats' : 'once'}` : v.kind === 'shop' ? `${v.items.length} item${v.items.length > 1 ? 's' : ''} to ${v.list}` : v.kind === 'expense' ? `₹${v.amount}${v.payee ? ' · ' + v.payee : ''}` : '';
    const title = v.kind === 'note' ? v.text : v.kind === 'shop' ? v.items.join(', ') : v.kind === 'expense' ? (v.payee || 'Expense') : v.kind === 'alarm' ? 'Alarm' : v.title;
    const s = sheet(`<h2>Got it</h2><p class="sub">“${esc(text)}”</p>
      <div class="vres"><span class="vk">${KIND[v.kind][0]}</span><div><small>${KIND[v.kind][1]}</small><b>${esc(title || '')}</b><span>${esc(detail)}</span></div></div>
      <div class="presets" style="justify-content:flex-start">${Object.entries(KIND).filter(([k]) => k !== v.kind && ['reminder', 'task', 'note'].includes(k)).map(([k, x]) => `<button class="chip small" data-vk="${k}">Make it a ${x[1].toLowerCase()}</button>`).join('')}</div>
      <div class="btns two"><button class="btn" data-a="again">${ic('mic')}Try again</button><button class="btn primary" data-a="ok">${ic('check')}Save</button></div>`);
    s.el.addEventListener('click', async e => {
      const vk = e.target.closest('[data-vk]');
      if (vk) { s.close(); const base = v.kind === 'note' ? v.text : title; const w = parseWhen(base); if (vk.dataset.vk === 'note') return saveVoice({ kind: 'note', text: base }); return saveVoice(Object.assign({ kind: vk.dataset.vk }, w, vk.dataset.vk === 'reminder' ? { time: w.time || '09:00', date: w.date || dkey(new Date()) } : {})); }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'again') { s.close(); return setTimeout(() => voiceAdd(), 200); }
      s.close(); saveVoice(v);
    });
  }
  async function saveVoice(v) {
    if (v.kind === 'reminder') { L.reminders.push({ id: uid(), nid: nextNid(), title: v.title || 'Reminder', note: '', time: v.time, date: v.date || dkey(new Date()), repeat: v.repeat, days: v.repeat === 'weekly' ? v.days : [0, 1, 1, 1, 1, 1, 0], on: true }); save(); await askNotif(); reschedule(); toast(`Reminder set · ${t12(v.time)}`); }
    else if (v.kind === 'task') { L.tasks.unshift({ id: uid(), nid: nextNid(), title: v.title || 'Task', due: v.date, time: v.time, done: false, at: Date.now() }); save(); reschedule(); toast('Task added'); }
    else if (v.kind === 'note') { L.notes.unshift({ id: uid(), type: 'text', title: '', body: v.text, items: [], color: '', pin: false, at: Date.now() }); save(); toast('Note saved'); }
    else if (v.kind === 'alarm') { const a = { id: Date.now() % 1e9, hm: v.time, days: v.days, label: v.label || '', tone: 'b:rise', vibrate: true, snooze: 10, on: true, smart: false, brief: true }; L.alarms.push(a); L.alarms.sort((x, y) => x.hm.localeCompare(y.hm)); save(); const ok = await syncAlarms(); if (ok || !P.Alarm) alarmToast(a); else toast('Alarm saved, but the phone refused to schedule it.'); }
    else if (v.kind === 'shop') { let l = L.lists.find(x => x.name.toLowerCase() === v.list.toLowerCase()); if (!l) { l = { id: uid(), name: v.list, icon: '🛒', items: [] }; L.lists.push(l); } v.items.forEach(t => l.items.unshift({ t: t.charAt(0).toUpperCase() + t.slice(1), q: '', d: false })); save(); toast(`Added to ${l.name}`); }
    else if (v.kind === 'expense') { return Money.quickAddPre({ amount: v.amount, payee: v.payee ? v.payee.charAt(0).toUpperCase() + v.payee.slice(1) : '' }); }
    refresh();
  }

  /* ---------- Life widget ---------- */
  async function widgetPush() {
    if (!P.Widget || !P.Widget.updateLife) return;
    const k = dkey(new Date()), now = hmNow(), items = [];
    L.reminders.filter(r => r.on && r.time >= now && (r.repeat === 'daily' || (r.repeat === 'weekly' && r.days[new Date().getDay()]) || dkey(nextOccur(r)) === k)).forEach(r => items.push([r.time, `🔔 ${t12(r.time)}  ${r.title}`]));
    L.meds.filter(md => md.on !== false).forEach(md => md.times.forEach((tm, i) => { if (!(((L.medLog[k] || {})[md.id] || {})[i]) && tm >= now) items.push([tm, `💊 ${t12(tm)}  ${md.name}`]); }));
    L.tasks.filter(t => !t.done && t.due && t.due <= k).forEach(t => items.push([t.time || '23:58', `☐ ${t.title}`]));
    (billsSafe(0) || []).forEach(b => items.push(['00:00', `🧾 ${b.name} ₹${Math.round(b.amount || 0)}`]));
    items.sort((a, b) => a[0].localeCompare(b[0]));
    const nx = nextAlarm();
    try { await P.Widget.updateLife({ alarm: nx ? `⏰ ${t12(nx.hm)}` : 'No alarm', items: items.slice(0, 3).map(x => x[1]), more: Math.max(0, items.length - 3) }); } catch (e) { /* widget not added */ }
  }
  async function doAction(a) {
    if (!a) return;
    if (S.mode !== 'life') setMode('life');
    setTimeout(() => { if (a === 'note') noteEditor(null, 'text'); else if (a === 'voice') voiceAdd(); else if (a === 'task') add('task'); }, 300);
  }
  async function checkWidgetAction() { if (!P.Widget || !P.Widget.pendingAction) return; try { const r = await P.Widget.pendingAction(); if (r && r.action) doAction(r.action); } catch (e) { /* ignore */ } }
  try { if (P.Widget && P.Widget.addListener) P.Widget.addListener('action', d => doAction(d && d.action)); } catch (e) { /* ignore */ }

  /* ---------- quick add (centre button) ---------- */
  function quickAdd() {
    const s = sheet(`<h2>Add</h2><button class="lvoice wide" data-q="voice">${ic('mic')}<span><b>Speak to add</b><small>Reminders, tasks, notes, alarms, shopping or expenses</small></span></button><div class="sgrid">
      <button data-q="note">${ic('note')}<b>Note</b></button><button data-q="list">${ic('list')}<b>Checklist</b></button><button data-q="task">${ic('check')}<b>Task</b></button>
      <button data-q="reminder">${ic('bell')}<b>Reminder</b></button><button data-q="alarm">${ic('clock')}<b>Alarm</b></button><button data-q="journal">${ic('book')}<b>Journal</b></button>
      <button data-q="expense"><span class="rs" style="font-size:22px;font-weight:800;color:var(--accent-text)">₹</span><b>Expense</b></button><button data-q="water">${ic('drop')}<b>+250 ml water</b></button><button data-q="event">${ic('cake')}<b>Birthday</b></button>
    </div>`);
    s.el.addEventListener('click', e => {
      const b = e.target.closest('[data-q]'); if (!b) return; s.close();
      setTimeout(() => add(b.dataset.q), 120);
    });
  }
  function add(k) {
    if (k === 'note') return noteEditor(null, 'text');
    if (k === 'list') return noteEditor(null, 'list');
    if (k === 'task') { taskSeg = 'todo'; go('l-tasks'); return setTimeout(() => { const q = $('#tq', view); if (q) q.focus(); }, 100); }
    if (k === 'reminder') return reminderSheet(null);
    if (k === 'alarm') return alarmSheet(null);
    if (k === 'journal') return journalTool().then(ok => { if (ok !== false) journalEditor(null, () => refresh()); });
    if (k === 'expense') return Money.quickAdd();
    if (k === 'water') { Health._addW(250); toast('+250 ml water 💧'); return; }
    if (k === 'event') return eventSheet(null, () => refresh());
    if (k === 'voice') return voiceAdd();
    if (k === 'doc') return docSheet(null, () => refresh());
  }

  /* ---------- routing ---------- */
  function renderTab(t) {
    tab = t;
    ({ home: homeView, notes: notesView, tasks: tasksView, clock: clockView })[t]();
  }
  function refresh() { if (S.mode === 'life' && currentTab.startsWith('l-') && !$('#layer > .screen')) { const sc = view.scrollTop; renderTab(tab); view.scrollTop = sc; } }
  async function handleClick(e) {
    const t = e.target;
    const g = t.closest('[data-go]'); if (g) { const [where, seg] = g.dataset.go.split(':'); if (where === 'tasks' && seg) taskSeg = seg; if (where === 'clock') clockSeg = 'alarms'; return go('l-' + where); }
    const ad = t.closest('[data-add]'); if (ad) return add(ad.dataset.add);
    const tool = t.closest('[data-tool]'); if (tool) return openTool(tool.dataset.tool);
    const note = t.closest('[data-note]'); if (note) return noteEditor(L.notes.find(n => n.id === note.dataset.note));
    const ts = t.closest('[data-tseg]'); if (ts) { taskSeg = ts.dataset.tseg; return tasksView(); }
    const cs = t.closest('[data-cseg]'); if (cs) { clockSeg = cs.dataset.cseg; return clockView(); }
    const td = t.closest('[data-tdone]'); if (td) { const x = L.tasks.find(y => y.id === td.dataset.tdone); if (x) { x.done = !x.done; x.doneAt = Date.now(); if (x.done) { tap(); toast('Done ✓'); } save(); reschedule(); refresh(); } return; }
    const tk = t.closest('[data-task]'); if (tk) return taskSheet(L.tasks.find(y => y.id === tk.dataset.task));
    const rm = t.closest('[data-rem]'); if (rm) return reminderSheet(L.reminders.find(y => y.id === rm.dataset.rem));
    const rt = t.closest('[data-remtog]'); if (rt) { const r = L.reminders.find(y => y.id === rt.dataset.remtog); r.on = !r.on; save(); reschedule(); return refresh(); }
    const hb = t.closest('[data-hab]'); if (hb) return toggleHabit(hb.dataset.hab);
    const he = t.closest('[data-habed]'); if (he) return habitSheet(L.habits.find(y => y.id === he.dataset.habed));
    const li = t.closest('[data-list]'); if (li) return listScreen(li.dataset.list);
    const md = t.closest('[data-med]'); if (md) return markMed(md.dataset.med);
    const al = t.closest('[data-alarm]'); if (al) return alarmSheet(L.alarms.find(a => a.id === +al.dataset.alarm));
    const at = t.closest('[data-altog]'); if (at) { const a = L.alarms.find(x => x.id === +at.dataset.altog); a.on = !a.on; save(); const ok = await syncAlarms(); refresh(); if (a.on) { if (ok || !P.Alarm) alarmToast(a); else toast('The phone refused to schedule this alarm. Check Settings → Phone features.'); } return; }
    const cz = t.closest('[data-czdel]'); if (cz) { L.cities = L.cities.filter(z => z !== cz.dataset.czdel); save(); return refresh(); }
    const bd = t.closest('[data-bd]'); if (bd) { L.bed.days[+bd.dataset.bd] = L.bed.days[+bd.dataset.bd] ? 0 : 1; save(); syncBedAlarm(); reschedule(); return refresh(); }
    const cy = t.closest('[data-cyc]'); if (cy) { L.bed.bed = cy.dataset.cyc; save(); syncBedAlarm(); reschedule(); toast(`Bedtime set to ${t12(cy.dataset.cyc)}`); return refresh(); }
    const ev = t.closest('[data-ev]'); if (ev) return eventSheet(L.events.find(x => x.id === ev.dataset.ev), refresh);
    const pb = t.closest('[data-paybill]'); if (pb) { const [id, due] = pb.dataset.paybill.split('|'); const r = Money.payBill(id, due); if (r) { tap(); toast(`${r.name} paid · ₹${Math.round(r.left).toLocaleString('en-IN')} left this cycle`); } return refresh(); }
    const b = t.closest('[data-a]'); if (!b) return;
    switch (b.dataset.a) {
      case 'habadd': return habitSheet(null);
      case 'listadd': { const n = await promptText('New list', { placeholder: 'e.g. Groceries', suggestions: ['Groceries', 'Vegetables', 'Amazon', 'Trip packing'], ok: 'Create' }); if (n) { const l = { id: uid(), name: n, icon: /trip|pack/i.test(n) ? '🧳' : /amazon|online/i.test(n) ? '📦' : '🛒', items: [] }; L.lists.push(l); save(); refresh(); listScreen(l.id); } return; }
      case 'cityadd': return citySheet();
      case 'notifperm': await askNotif(); reschedule(); setTimeout(refresh, 800); return;
      case 'notiftest': try { await P.LocalNotifications.schedule({ notifications: [{ id: 9990, title: '🔔 Test reminder', body: 'Reminders are working.', channelId: 'kw_remind', schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, smallIcon: 'ic_stat_kw', iconColor: S.accent }] }); toast('A test reminder will pop up in 5 seconds'); } catch (err) { toast('Could not send a test reminder'); } return;
      case 'voice': return voiceAdd();
      case 'alltools': return allTools();
      case 'brief': return openBriefing(false);
      case 'bedon': { L.bed.on = !L.bed.on; save(); if (L.bed.on) await askNotif(); syncBedAlarm(); reschedule(); toast(L.bed.on ? `Bedtime ${t12(L.bed.bed)} · wake ${t12(L.bed.wake)}` : 'Bedtime schedule off'); return refresh(); }
      case 'exact': try { await P.Alarm.openExactSettings(); } catch (err) { /* ignore */ } return;
      case 'fullscreen': try { await P.Alarm.openFullScreenSettings(); } catch (err) { /* ignore */ } return;
    }
  }
  // Clock face ticks while visible
  setInterval(() => { if (S.mode === 'life' && tab === 'clock' && !$('#layer > .screen')) { const n = $('#lcnow', view); if (n) n.innerHTML = t12(hmNow()).replace(/ (AM|PM)/, '<small> $1</small>'); if (clockSeg === 'world') refresh(); } }, 15000);

  function search(q) {
    const k = q.toLowerCase(); const out = [];
    L.notes.forEach(n => { if ((n.title + ' ' + n.body + ' ' + (n.items || []).map(i => i.t).join(' ')).toLowerCase().includes(k)) out.push({ type: 'note', id: n.id, title: n.title || (n.body || '').slice(0, 40) || 'Note', sub: n.type === 'list' ? 'Checklist' : 'Note' }); });
    L.tasks.forEach(t => { if (t.title.toLowerCase().includes(k)) out.push({ type: 'task', id: t.id, title: t.title, sub: t.done ? 'Done' : t.due ? 'Due ' + dayName(t.due) : 'Task' }); });
    L.reminders.forEach(r => { if (r.title.toLowerCase().includes(k)) out.push({ type: 'rem', id: r.id, title: r.title, sub: `Reminder · ${t12(r.time)}` }); });
    L.events.forEach(e => { if (e.name.toLowerCase().includes(k)) out.push({ type: 'ev', id: e.id, title: e.name, sub: e.type === 'birthday' ? 'Birthday' : 'Date' }); });
    if (!L.journalLock && !secSealed) L.journal.forEach(j => { if ((j.text || '').toLowerCase().includes(k)) out.push({ type: 'jr', id: j.id, title: dayName(j.date), sub: 'Journal' }); });
    return out.slice(0, 10);
  }
  function openResult(type, id) {
    if (type === 'note') return noteEditor(L.notes.find(n => n.id === id));
    if (type === 'task') return taskSheet(L.tasks.find(t => t.id === id));
    if (type === 'rem') return reminderSheet(L.reminders.find(r => r.id === id));
    if (type === 'ev') return eventSheet(L.events.find(e => e.id === id), refresh);
    if (type === 'jr') return journalEditor(L.journal.find(j => j.id === id), refresh);
  }

  function boot() { unsealLife().then(() => { reschedule(); onResume().then(syncAlarms); setTimeout(checkWidgetAction, 600); }); }

  return {
    renderTab, handleClick, refresh, quickAdd, boot, onResume, search, openResult, openTool, widgetPush, voiceAdd, openBriefing,
    get rawData() { return clone(L); },
    isSealed: () => secSealed, photoB64, reschedule,
    get data() { const d = clone(L); d.journal = d.journal.map(j => Object.assign({}, j, { photos: (j.photos || []).filter(p => !p.data) })); d.docs = (d.docs || []).map(x => Object.assign({}, x, { photos: (x.photos || []).filter(p => !p.data) })); return d; },
    set data(v) { L = Object.assign(fresh(), v || {}, P.Vault ? { secure: true } : {}); secSealed = false; secFailed = false; save(); reschedule(); syncAlarms(); },
    merge(v) { if (!v) return; if (secFailed) { secSealed = false; secFailed = false; } const byId = (a, b) => { const m = new Map(); (a || []).forEach(x => m.set(x.id, x)); (b || []).forEach(x => { if (!m.has(x.id)) m.set(x.id, x); }); return [...m.values()]; }; ['notes', 'reminders', 'tasks', 'habits', 'lists', 'journal', 'events', 'meds', 'alarms', 'docs'].forEach(k => { L[k] = byId(L[k], v[k]); }); save(); reschedule(); syncAlarms(); },
    _calc: calcEval, _smart: smartDate, _synth: synthTone, _voice: parseVoice, _when: parseWhen,
  };
})();
