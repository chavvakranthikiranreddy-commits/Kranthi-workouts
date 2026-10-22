/* Muscle & Money: daily health.
   Protein & water, sleep & readiness, progress photos, muscle map, daily check-in and weekly scorecard.
   Uses helpers from app.js ($, $$, el, esc, ic, sheet, toast, DB, S, P, log, plan, STP, latestBody ...). */
'use strict';

const Health = (() => {
  const fresh = () => ({ nut: {}, sleep: {}, check: {}, photos: [], targets: {}, lastSleep: { bed: '23:00', wake: '06:30' } });
  let H = Object.assign(fresh(), DB.get('health', {}));
  const save = () => DB.set('health', H);
  const todayK = () => dkey(new Date());

  /* ---------- protein & water ---------- */
  // About 1.6 g protein per kg body weight per day (Morton et al. 2018 meta-analysis: gains plateau near 1.6 g/kg),
  // and about 35 ml water per kg (common clinical rule of thumb, more on hot or sweaty days).
  const kg = () => { const b = latestBody(); return b ? b.kg : null; };
  const targets = () => {
    const w = kg() || 70;
    return { p: H.targets.p || Math.round(w * 1.6), w: H.targets.w || Math.round(w * 35 / 250) * 250, est: !kg() && !(H.targets.p && H.targets.w) };
  };
  const nutOn = k => H.nut[k] || { p: 0, w: 0, items: [] };
  const FOODS = [
    ['Egg (1 whole)', 6, '🥚'], ['Egg whites (3)', 11, '🥚'], ['Chicken breast 100 g', 31, '🍗'], ['Fish 100 g', 22, '🐟'], ['Mutton 100 g', 25, '🍖'],
    ['Paneer 100 g', 18, '🧀'], ['Tofu 100 g', 12, '⬜'], ['Soya chunks 50 g (dry)', 26, '🟤'], ['Dal, 1 bowl', 9, '🥣'], ['Chana / rajma, 1 bowl', 12, '🫘'],
    ['Curd, 1 bowl', 8, '🥛'], ['Greek yogurt 100 g', 10, '🥛'], ['Milk, 1 glass', 8, '🥛'], ['Whey, 1 scoop', 24, '💪'], ['Peanuts 30 g', 7, '🥜'],
    ['Sprouts, 1 bowl', 7, '🌱'], ['Roti (1)', 3, '🫓'], ['Rice, 1 cup cooked', 4, '🍚'],
  ];
  function addP(g, name) {
    const k = todayK(); const n = H.nut[k] = nutOn(k);
    n.p = Math.max(0, Math.round((n.p + g) * 10) / 10); n.items = (n.items || []).concat({ n: name || `${g} g protein`, p: g, at: Date.now() }).slice(-40);
    save(); afterNut(n.p - g, n.p, 'p');
  }
  function addW(ml) {
    const k = todayK(); const n = H.nut[k] = nutOn(k);
    n.w = Math.max(0, n.w + ml); save(); afterNut(n.w - ml, n.w, 'w');
  }
  function afterNut(before, now, kind) {
    const t = targets()[kind];
    try { if (P.Haptics) P.Haptics.impact({ style: 'LIGHT' }); } catch (e) { /* ignore */ }
    if (before < t && now >= t) toast(kind === 'p' ? `💪 Protein goal hit: ${Math.round(now)} g` : `💧 Water goal hit: ${(now / 1000).toFixed(1)} L`);
    paintFuel();
  }
  const L = ml => String(Math.round(ml / 10) / 100).replace(/\.0+$/, '');
  const bar = (v, t, color) => `<span class="fbar"><i style="width:${Math.min(100, t ? v / t * 100 : 0).toFixed(1)}%;background:${color}"></i></span>`;
  function fuelInner() {
    const n = nutOn(todayK()); const t = targets();
    return `<div class="frow"><button class="fl" data-h="nut"><span class="fk">Protein</span><b>${Math.round(n.p)}<small> / ${t.p} g</small></b>${bar(n.p, t.p, 'var(--accent)')}</button>
        <div class="fq"><button data-h="p" data-v="10">+10</button><button data-h="p" data-v="20">+20</button><button data-h="foods">${ic('plus')}Food</button></div></div>
      <div class="frow"><button class="fl" data-h="nut"><span class="fk">Water</span><b>${L(n.w)}<small> / ${L(t.w)} L</small></b>${bar(n.w, t.w, '#4F86F7')}</button>
        <div class="fq"><button data-h="w" data-v="250">+250</button><button data-h="w" data-v="500">+500</button><button data-h="w" data-v="1000">+1 L</button></div></div>
      ${t.est ? `<button class="fnote" data-h="weight">Targets use 70 kg. Log your weight for yours.</button>` : ''}`;
  }
  const fuelHtml = () => `<div class="fuel" id="fuel"><div class="ph"><span class="t">PROTEIN &amp; WATER</span><button data-h="nut">Details</button></div>${fuelInner()}</div>`;
  function paintFuel() { const f = $('#fuel'); if (f) f.innerHTML = `<div class="ph"><span class="t">PROTEIN &amp; WATER</span><button data-h="nut">Details</button></div>${fuelInner()}`; }
  function foodsSheet() {
    const s = sheet(`<h2>Add protein</h2><p class="sub">Typical amounts. Tap to add.</p>
      <div class="foods">${FOODS.map(([n, g, e], i) => `<button data-f="${i}"><span>${e}</span><b>${esc(n)}</b><em>${g} g</em></button>`).join('')}</div>
      <div class="sect">Custom</div><div class="unit-in"><input class="field" id="cg" inputmode="decimal" placeholder="25" style="text-align:center"><span>g</span><button class="btn primary sm" data-a="add" style="width:auto;padding:0 18px">Add</button></div>`);
    s.el.addEventListener('click', e => {
      const f = e.target.closest('[data-f]'); if (f) { const [n, g] = FOODS[+f.dataset.f]; addP(g, n); s.close(); toast(`+${g} g · ${n}`); return; }
      if (e.target.closest('[data-a="add"]')) { const g = parseFloat($('#cg', s.el).value); if (!(g > 0 && g < 300)) { toast('Enter grams of protein'); return; } addP(g); s.close(); }
    });
  }
  function nutSheet() {
    const k = todayK(); const n = nutOn(k); const t = targets();
    const days = []; for (let i = 6; i >= 0; i--) { const d = addDays(today0(), -i); days.push({ d, n: nutOn(dkey(d)) }); }
    const s = sheet(`<h2>Protein &amp; water</h2>
      <div class="stats"><div class="stat"><div class="k">Protein today</div><div class="v">${Math.round(n.p)}<small>g</small></div><div class="s">target ${t.p} g</div></div><div class="stat"><div class="k">Water today</div><div class="v">${(n.w / 1000).toFixed(1)}<small>L</small></div><div class="s">target ${(t.w / 1000).toFixed(1)} L</div></div></div>
      <div class="sect">Last 7 days</div>
      <div class="block" style="padding:8px 14px">${days.map(x => `<div class="nday"><span>${esc(WD[x.d.getDay()].slice(0, 3))}</span>${bar(x.n.p, t.p, 'var(--accent)')}<em>${Math.round(x.n.p)} g</em>${bar(x.n.w, t.w, '#4F86F7')}<em>${(x.n.w / 1000).toFixed(1)} L</em></div>`).join('')}</div>
      ${(n.items || []).length ? `<div class="sect">Today's protein</div><div class="block" style="padding:0">${n.items.slice().reverse().map((it, i) => `<div class="mini-row"><span>${esc(it.n)}<small>${new Date(it.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></span><span style="display:flex;gap:10px;align-items:center"><b>${it.p} g</b><button class="rm" data-rm="${n.items.length - 1 - i}" aria-label="Remove">${ic('close')}</button></span></div>`).join('')}</div>` : ''}
      ${n.w ? `<button class="btn ghost" data-a="wundo" style="margin-top:10px">Remove last 250 ml of water</button>` : ''}
      <div class="sect">Daily targets</div>
      <div class="mrow2"><div class="unit-in"><input class="field body" id="tp" inputmode="numeric" value="${t.p}" style="text-align:center"><span>g</span></div><div class="unit-in"><input class="field body" id="tw" inputmode="numeric" value="${t.w}" style="text-align:center"><span>ml</span></div></div>
      <p class="hint">Suggested from ${kg() ? `your weight (${Math.round(kg())} kg)` : 'a 70 kg body weight'}: 1.6 g protein and 35 ml water per kg. Drink more on hot days and when you sweat a lot.</p>
      <div class="btns two"><button class="btn" data-a="auto">Use suggested</button><button class="btn primary" data-a="ok">Save</button></div>`);
    s.el.addEventListener('click', e => {
      const rm = e.target.closest('[data-rm]'); if (rm) { const it = n.items.splice(+rm.dataset.rm, 1)[0]; n.p = Math.max(0, n.p - it.p); H.nut[k] = n; save(); s.close(); paintFuel(); nutSheet(); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'wundo') { n.w = Math.max(0, n.w - 250); H.nut[k] = n; save(); s.close(); paintFuel(); return nutSheet(); }
      if (b.dataset.a === 'auto') { H.targets = {}; save(); s.close(); paintFuel(); toast('Using suggested targets'); return; }
      if (b.dataset.a === 'ok') { const p = parseInt($('#tp', s.el).value, 10), w = parseInt($('#tw', s.el).value, 10); if (p > 20 && p < 400) H.targets.p = p; if (w > 500 && w < 8000) H.targets.w = w; save(); s.close(); paintFuel(); }
    });
  }

  /* ---------- sleep & readiness ---------- */
  const mins = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
  const sleepHours = e => { if (!e) return 0; let d = mins(e.wake) - mins(e.bed); if (d <= 0) d += 1440; return d / 60; };
  const hm = h => `${Math.floor(h)}h ${pad(Math.round((h % 1) * 60))}m`;
  const FACES = ['😫', '😕', '😐', '🙂', '😄'];
  function sleepSheet(k = todayK()) {
    const e = H.sleep[k] || { bed: H.lastSleep.bed, wake: H.lastSleep.wake, q: 0 };
    let q = e.q || 0;
    const s = sheet(`<h2>How did you sleep?</h2><p class="sub">Night before ${esc(parseKey(k).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }))}</p>
      <div class="mrow2"><label class="tlab"><span>Went to bed</span><input type="time" id="sb" class="field body" value="${esc(e.bed)}"></label><label class="tlab"><span>Woke up</span><input type="time" id="sw" class="field body" value="${esc(e.wake)}"></label></div>
      <p class="hint" id="sh"></p>
      <div class="sect">How rested do you feel?</div>
      <div class="faces">${FACES.map((f, i) => `<button class="${q === i + 1 ? 'on' : ''}" data-q="${i + 1}" aria-label="${i + 1} of 5">${f}</button>`).join('')}</div>
      <div class="btns ${H.sleep[k] ? 'two' : ''}">${H.sleep[k] ? '<button class="btn danger" data-a="del">Delete</button>' : ''}<button class="btn primary" data-a="ok">Save</button></div>`);
    const paint = () => { $('#sh', s.el).textContent = `${hm(sleepHours({ bed: $('#sb', s.el).value, wake: $('#sw', s.el).value }))} of sleep`; };
    paint(); s.el.addEventListener('input', paint);
    s.el.addEventListener('click', e2 => {
      const f = e2.target.closest('[data-q]'); if (f) { q = +f.dataset.q; $$('[data-q]', s.el).forEach(x => x.classList.toggle('on', x === f)); return; }
      const b = e2.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'del') { delete H.sleep[k]; save(); s.close(); refreshToday(); return; }
      if (!q) { toast('Tap how rested you feel'); return; }
      const ent = { bed: $('#sb', s.el).value || '23:00', wake: $('#sw', s.el).value || '06:30', q };
      H.sleep[k] = ent; H.lastSleep = { bed: ent.bed, wake: ent.wake }; save(); s.close(); refreshToday();
      const r = readiness(); toast(`${hm(sleepHours(ent))} sleep · readiness ${r.score}`);
    });
  }
  function trainingMins(k) { return log.filter(x => x.date === k && x.kind !== 'note').reduce((a, x) => a + (x.dur || 0) / 60, 0); }
  // Readiness blends last night's sleep, how rested you feel and the last two days of training.
  // Short sleep lowers strength and endurance performance (Craven et al. 2022 meta-analysis), so the advice leans lighter after poor nights.
  function readiness(k = todayK()) {
    const e = H.sleep[k]; if (!e) return null;
    const h = sleepHours(e);
    const sl = h >= 7.5 ? (h > 10 ? 85 : 100) : h >= 7 ? 90 + (h - 7) * 20 : h >= 6 ? 65 + (h - 6) * 25 : h >= 5 ? 40 + (h - 5) * 25 : Math.max(10, 40 - (5 - h) * 30);
    const rs = (e.q - 1) / 4 * 100;
    const y = trainingMins(dkey(addDays(parseKey(k), -1))), y2 = trainingMins(dkey(addDays(parseKey(k), -2)));
    let streak = 0; for (let i = 1; i <= 6; i++) { if (trainingMins(dkey(addDays(parseKey(k), -i))) > 0) streak++; else break; }
    const ld = Math.max(30, 100 - Math.min(35, y / 3) - Math.min(15, y2 / 6) - (streak >= 4 ? 15 : 0));
    const prev = [1, 2].map(i => H.sleep[dkey(addDays(parseKey(k), -i))]).filter(Boolean);
    const debt = prev.length && (prev.reduce((a, x) => a + sleepHours(x), 0) + h) / (prev.length + 1) < 6 ? 8 : 0;
    const score = Math.round(clamp(sl * 0.45 + rs * 0.35 + ld * 0.2 - debt, 0, 100));
    const lv = score >= 80 ? ['Ready to push', 'Good day to go for a PR or add a set to your main lift.', 'ok']
      : score >= 60 ? ['Train as planned', 'Normal session. Stop each set with 1–2 reps in the tank.', 'ok']
      : score >= 40 ? ['Go a bit lighter', 'Keep the weights, stop 2–3 reps short, or cut one set from each exercise.', 'warn']
      : ['Recovery day', 'An easy walk or a yoga flow will help more than a hard session today.', 'bad'];
    return { score, h, q: e.q, label: lv[0], tip: lv[1], tone: lv[2], streak };
  }
  function sleepCardHtml() {
    const k = todayK(); const hr = new Date().getHours();
    const r = readiness(k);
    if (!r) {
      if (hr < 4) return '';
      return `<button class="sleepask" data-h="sleep"><span class="si">🌙</span><span><b>How did you sleep?</b><span>Log bedtime, wake time and how rested you feel to see today's readiness.</span></span>${ic('chevR', 'chev')}</button>`;
    }
    const wk = []; for (let i = 6; i >= 0; i--) { const d = addDays(today0(), -i); wk.push({ d, h: sleepHours(H.sleep[dkey(d)]) }); }
    return `<div class="ready ${r.tone}"><button class="rmain" data-h="sleep"><span class="rring" style="--p:${r.score}"><b>${r.score}</b></span>
      <span class="rt"><span class="rk">READINESS</span><b>${r.label}</b><span>${r.tip}</span><small>${hm(r.h)} sleep · rested ${FACES[r.q - 1]}</small></span></button>
      <div class="sbars">${wk.map(x => `<span title="${esc(dkey(x.d))}: ${x.h ? hm(x.h) : 'not logged'}"><i style="height:${Math.min(100, x.h / 10 * 100).toFixed(0)}%;${x.h && x.h < 6.5 ? 'background:var(--warn,#D9781C)' : ''}"></i><em>${WD[x.d.getDay()][0]}</em></span>`).join('')}</div>
      ${r.tone === 'bad' ? `<button class="btn sm" data-h="yoga" style="margin-top:10px">${ic('lotus')}Pick a yoga flow</button>` : ''}</div>`;
  }

  /* ---------- muscle map ---------- */
  const MUS = { chest: 'Chest', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', abs: 'Abs', back: 'Upper back & lats', lowback: 'Lower back', glutes: 'Glutes', quads: 'Quads', hams: 'Hamstrings', calves: 'Calves' };
  const PAT = {
    squat: { quads: 1, glutes: 1 }, hinge: { hams: 1, glutes: 1, lowback: 1 }, lunge: { quads: 1, glutes: 1, hams: 0.5 },
    hpush: { chest: 1, shoulders: 0.5, triceps: 0.5 }, vpush: { shoulders: 1, triceps: 0.5 }, hpull: { back: 1, biceps: 0.5, shoulders: 0.5 },
    vpull: { back: 1, biceps: 0.5 }, quad: { quads: 1 }, ham: { hams: 1 }, glute: { glutes: 1 }, calf: { calves: 1 }, chest: { chest: 1 },
    sdelt: { shoulders: 1 }, rdelt: { shoulders: 0.5, back: 0.5 }, bi: { biceps: 1 }, tri: { triceps: 1 }, core: { abs: 1 },
    power_l: { quads: 0.5, glutes: 0.5, calves: 0.5 }, power_u: { chest: 0.5, shoulders: 0.5 }, carry: { abs: 0.5, back: 0.5 },
  };
  const KW = [
    [/leg curl|hamstring|nordic|romanian|rdl|stiff|good morning/i, 'ham'], [/deadlift|swing|back extension|hyperextension/i, 'hinge'], [/calf/i, 'calf'],
    [/hip thrust|glute|bridge|kickback|abduct/i, 'glute'], [/lunge|split squat|step-up|step up/i, 'lunge'], [/leg extension/i, 'quad'], [/squat|leg press|hack/i, 'squat'],
    [/fly|pec deck|crossover/i, 'chest'], [/bench|push-up|pushup|push up|chest press|dip/i, 'hpush'], [/overhead|shoulder press|military|arnold|pike/i, 'vpush'],
    [/lateral|side raise|upright/i, 'sdelt'], [/face pull|rear delt|reverse fly/i, 'rdelt'], [/pull-up|pullup|pull up|chin|pulldown|lat /i, 'vpull'],
    [/row|shrug|inverted/i, 'hpull'], [/curl/i, 'bi'], [/tricep|pushdown|skull|extension|close-grip|kickback/i, 'tri'],
    [/plank|crunch|leg raise|twist|ab |rollout|sit-up|situp|dead bug|hollow|core|pallof|woodchop/i, 'core'], [/carry|farmer/i, 'carry'], [/jump|box|plyo|broad/i, 'power_l'],
  ];
  function patternOf(ex) {
    if (ex.t && ex.t.pattern) return ex.t.pattern;
    const p = Program.byName && Program.byName(ex.name); if (p) return p.pattern;
    const hit = KW.find(([re]) => re.test(ex.name)); return hit ? hit[1] : null;
  }
  function muscleSets(days = 7) {
    const from = addDays(today0(), -(days - 1));
    const out = {}; Object.keys(MUS).forEach(m => { out[m] = 0; });
    log.forEach(x => {
      if (!x.exercises || parseKey(x.date) < from) return;
      x.exercises.forEach(ex => {
        const n = (ex.sets || []).filter(s => (s.r > 0) || s.done).length; if (!n) return;
        const w = PAT[patternOf(ex)]; if (!w) return;
        Object.entries(w).forEach(([m, f]) => { out[m] += n * f; });
      });
    });
    Object.keys(out).forEach(m => { out[m] = Math.round(out[m] * 2) / 2; });
    return out;
  }
  const lvl = v => (v >= 10 ? 1 : v >= 5 ? 0.62 : v > 0 ? 0.32 : 0);
  function bodySvg(sets, side) {
    const f = m => { const l = lvl(sets[m]); return l ? `fill="var(--accent)" fill-opacity="${l}"` : 'fill="var(--surface-2)"'; };
    const base = 'fill="var(--surface-2)" opacity=".55"';
    const sk = 'stroke="var(--bg)" stroke-width="1.5"';
    // A simple, symmetric figure: viewBox 120 x 250.
    const common = `<circle cx="60" cy="20" r="13" ${base}/><rect x="53" y="32" width="14" height="8" rx="3" ${base}/>
      <path d="M22 116 q-6 30 -4 44 l8 0 q2 -18 6 -40z" ${base}/><path d="M98 116 q6 30 4 44 l-8 0 q-2 -18 -6 -40z" ${base}/>`;
    if (side === 'front') return `<svg viewBox="0 0 120 250" class="bodysvg" role="img" aria-label="Front muscles">${common}
      <ellipse cx="33" cy="52" rx="11" ry="10" ${f('shoulders')} ${sk}/><ellipse cx="87" cy="52" rx="11" ry="10" ${f('shoulders')} ${sk}/>
      <path d="M42 46 h17 v26 q-10 4 -19 -2 q-3 -14 2 -24z" ${f('chest')} ${sk}/><path d="M78 46 h-17 v26 q10 4 19 -2 q3 -14 -2 -24z" ${f('chest')} ${sk}/>
      <path d="M22 62 q-6 14 -5 32 q6 4 11 0 q3 -16 2 -30z" ${f('biceps')} ${sk}/><path d="M98 62 q6 14 5 32 q-6 4 -11 0 q-3 -16 -2 -30z" ${f('biceps')} ${sk}/>
      <rect x="46" y="76" width="28" height="42" rx="7" ${f('abs')} ${sk}/><path d="M46 90 h28 M46 104 h28 M60 78 v38" stroke="var(--bg)" stroke-width="1.2"/>
      <path d="M44 122 h15 l-1 62 q-9 4 -16 -2 q-4 -32 2 -60z" ${f('quads')} ${sk}/><path d="M76 122 h-15 l1 62 q9 4 16 -2 q4 -32 -2 -60z" ${f('quads')} ${sk}/>
      <path d="M44 192 q7 -3 13 0 q2 22 -2 46 h-8 q-5 -24 -3 -46z" ${f('calves')} ${sk}/><path d="M76 192 q-7 -3 -13 0 q-2 22 2 46 h8 q5 -24 3 -46z" ${f('calves')} ${sk}/>
    </svg>`;
    return `<svg viewBox="0 0 120 250" class="bodysvg" role="img" aria-label="Back muscles">${common}
      <ellipse cx="33" cy="52" rx="11" ry="10" ${f('shoulders')} ${sk}/><ellipse cx="87" cy="52" rx="11" ry="10" ${f('shoulders')} ${sk}/>
      <path d="M42 44 h36 q4 18 -3 40 q-15 8 -30 0 q-7 -22 -3 -40z" ${f('back')} ${sk}/>
      <path d="M22 62 q-6 14 -5 32 q6 4 11 0 q3 -16 2 -30z" ${f('triceps')} ${sk}/><path d="M98 62 q6 14 5 32 q-6 4 -11 0 q-3 -16 -2 -30z" ${f('triceps')} ${sk}/>
      <rect x="47" y="88" width="26" height="24" rx="6" ${f('lowback')} ${sk}/>
      <path d="M43 114 h17 v24 q-10 5 -18 -2 q-2 -12 1 -22z" ${f('glutes')} ${sk}/><path d="M77 114 h-17 v24 q10 5 18 -2 q2 -12 -1 -22z" ${f('glutes')} ${sk}/>
      <path d="M43 142 q8 3 15 0 l0 42 q-8 4 -15 -2 q-2 -20 0 -40z" ${f('hams')} ${sk}/><path d="M77 142 q-8 3 -15 0 l0 42 q8 4 15 -2 q2 -20 0 -40z" ${f('hams')} ${sk}/>
      <path d="M44 192 q7 -3 13 0 q2 22 -2 46 h-8 q-5 -24 -3 -46z" ${f('calves')} ${sk}/><path d="M76 192 q-7 -3 -13 0 q-2 22 2 46 h8 q5 -24 3 -46z" ${f('calves')} ${sk}/>
    </svg>`;
  }
  function muscleMapHtml() {
    const sets = muscleSets(7);
    const total = Object.values(sets).reduce((a, v) => a + v, 0);
    const low = Object.entries(sets).filter(([, v]) => v < 10).sort((a, b) => a[1] - b[1]);
    return `<div class="chart-card musmap">
      <div class="bodies"><div>${bodySvg(sets, 'front')}<span>Front</span></div><div>${bodySvg(sets, 'back')}<span>Back</span></div></div>
      <div class="heat-legend" style="margin-top:6px"><span>Hard sets, last 7 days</span><span class="lv"><i style="background:var(--surface-2)"></i>0 <i style="background:var(--accent);opacity:.32"></i>1–4 <i style="background:var(--accent);opacity:.62"></i>5–9 <i style="background:var(--accent)"></i>10+</span></div>
      ${total ? `<div class="muslist">${Object.entries(sets).sort((a, b) => b[1] - a[1]).map(([m, v]) => `<span class="${v >= 10 ? 'ok' : ''}">${MUS[m]} <b>${v}</b></span>`).join('')}</div>
        <p class="hint" style="margin:8px 0 0">${low.length ? `Under 10 sets: ${low.slice(0, 4).map(([m]) => MUS[m]).join(', ')}${low.length > 4 ? '…' : ''}. ` : 'Every muscle got 10+ sets. '}Research suggests about 10–20 hard sets per muscle each week for growth.</p>`
      : '<p class="hint" style="margin:8px 0 0">Log a gym workout and the muscles you trained light up here.</p>'}
    </div>`;
  }

  /* ---------- progress photos ---------- */
  const POSES = [['front', 'Front'], ['side', 'Side'], ['back', 'Back']];
  let pose = 'front';
  const imgCache = new Map();
  async function loadImg(ph) {
    if (imgCache.has(ph.id)) return imgCache.get(ph.id);
    let src = null;
    try {
      if (ph.path && P.Filesystem) { const r = await P.Filesystem.readFile({ path: ph.path, directory: 'DATA' }); src = 'data:image/jpeg;base64,' + r.data; }
      else src = DB.get('ph_' + ph.id, null);
    } catch (e) { src = null; }
    if (src) imgCache.set(ph.id, src);
    return src;
  }
  function shrink(dataUrl, max = 1280) {
    return new Promise(res => {
      const im = new Image();
      im.onload = () => { const sc = Math.min(1, max / Math.max(im.width, im.height)); const c = document.createElement('canvas'); c.width = Math.round(im.width * sc); c.height = Math.round(im.height * sc); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.82)); };
      im.onerror = () => res(null); im.src = dataUrl;
    });
  }
  function addPhoto() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      const raw = await new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.onerror = () => r(null); rd.readAsDataURL(f); });
      const small = raw && await shrink(raw, isNative ? 1280 : 700); if (!small) { toast('Could not open that photo'); return; }
      const ph = { id: uid(), date: dkey(new Date()), pose, at: Date.now() };
      try {
        if (P.Filesystem) { ph.path = `progress/${ph.id}.jpg`; await P.Filesystem.writeFile({ path: ph.path, data: small.split(',')[1], directory: 'DATA', recursive: true }); }
        else DB.set('ph_' + ph.id, small);
      } catch (e) { toast('Could not save the photo'); return; }
      imgCache.set(ph.id, small);
      H.photos.push(ph); save(); refreshProgress(); toast(`${POSES.find(p => p[0] === pose)[1]} photo saved`);
    };
    document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  }
  const photosOf = p => H.photos.filter(x => x.pose === p).sort((a, b) => a.at - b.at);
  function photosHtml() {
    const list = photosOf(pose);
    return `<div class="chart-card photos">
      <div class="seg" style="background:var(--surface-2);margin:0 0 10px">${POSES.map(([k, n]) => `<button class="${pose === k ? 'on' : ''}" data-h="pose" data-v="${k}">${n} · ${photosOf(k).length}</button>`).join('')}</div>
      <div class="phgrid">${list.slice().reverse().map(ph => `<button class="ph" data-h="phview" data-v="${ph.id}"><img data-ph="${ph.id}" alt="${esc(pose)} photo ${esc(ph.date)}"><span>${esc(shortDate(parseKey(ph.date)))}</span></button>`).join('')}<button class="ph add" data-h="phadd">${ic('plus')}<span>Add ${pose}</span></button></div>
      ${list.length >= 2 ? `<button class="btn" data-h="phcmp" style="margin-top:10px">Compare first and latest</button>` : `<p class="hint" style="margin:8px 0 0">Same spot, same light, every 2–4 weeks. Photos stay on this phone only and are not in backups.</p>`}
    </div>`;
  }
  function hydrate(root = document) { $$('img[data-ph]', root).forEach(async im => { const ph = H.photos.find(x => x.id === im.dataset.ph); if (!ph) return; const src = await loadImg(ph); if (src) im.src = src; }); }
  function nearestWeight(k) { const t = parseKey(k).getTime(); const b = body.filter(x => x.kg != null).sort((a, c) => Math.abs(a.at - t) - Math.abs(c.at - t))[0]; return b && Math.abs(b.at - t) < 10 * 864e5 ? b.kg : null; }
  function viewPhoto(id) {
    const ph = H.photos.find(x => x.id === id); if (!ph) return;
    const s = sheet(`<h2>${esc(parseKey(ph.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }))}</h2><p class="sub">${esc(POSES.find(p => p[0] === ph.pose)[1])}${nearestWeight(ph.date) ? ` · ${wOut(nearestWeight(ph.date))} ${wUnit()}` : ''}</p>
      <img data-ph="${ph.id}" class="phbig" alt="Progress photo">
      <div class="btns two"><button class="btn danger" data-a="del">Delete</button><button class="btn" data-a="c">Close</button></div>`);
    hydrate(s.el);
    s.el.addEventListener('click', async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'c') return s.close();
      if (await confirmBox('Delete this photo?', '', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) {
        try { if (ph.path && P.Filesystem) await P.Filesystem.deleteFile({ path: ph.path, directory: 'DATA' }); else DB.del('ph_' + ph.id); } catch (err) { /* ignore */ }
        H.photos = H.photos.filter(x => x.id !== id); imgCache.delete(id); save(); s.close(); refreshProgress();
      }
    });
  }
  function compare() {
    const list = photosOf(pose); if (list.length < 2) return;
    let a = list[0].id, b = list[list.length - 1].id;
    const opts = sel => list.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(shortDate(parseKey(p.date)))}</option>`).join('');
    const s = sheet(`<h2>Compare</h2><div class="cmp" id="cmp"></div>`);
    const paint = () => {
      const pa = list.find(p => p.id === a), pb = list.find(p => p.id === b);
      const days = Math.round((parseKey(pb.date) - parseKey(pa.date)) / 864e5);
      const wa = nearestWeight(pa.date), wb = nearestWeight(pb.date);
      $('#cmp', s.el).innerHTML = `<div class="cmpgrid"><div><select data-s="a">${opts(a)}</select><img data-ph="${a}" alt="Before"></div><div><select data-s="b">${opts(b)}</select><img data-ph="${b}" alt="After"></div></div>
        <p class="hint" style="text-align:center">${Math.abs(days)} days apart${wa && wb ? ` · ${wOut(wa)} → ${wOut(wb)} ${wUnit()} (${wb - wa > 0 ? '+' : ''}${wOut(wb - wa)})` : ''}</p>`;
      hydrate(s.el);
    };
    paint();
    s.el.addEventListener('change', e => { const x = e.target.closest('[data-s]'); if (!x) return; if (x.dataset.s === 'a') a = x.value; else b = x.value; paint(); });
  }

  /* ---------- daily check-in & weekly scorecard ---------- */
  function habits(k) {
    const d = parseKey(k); const t = targets(); const n = nutOn(k);
    const p = plan && plan[d.getDay()];
    const restPlanned = p && p.rest;
    const worked = log.some(x => x.date === k);
    const out = [
      { id: 'train', name: restPlanned && !worked ? 'Rest day' : 'Workout', icon: 'dumbbell', ok: worked || !!restPlanned },
      STP.enabled || stepsOn(k) ? { id: 'steps', name: 'Steps', icon: 'feet', ok: stepsOn(k) >= S.stepGoal } : null,
      { id: 'protein', name: 'Protein', icon: '🍗', ok: n.p >= t.p },
      { id: 'water', name: 'Water', icon: '💧', ok: n.w >= t.w },
      { id: 'sleep', name: 'Sleep 7h+', icon: '🌙', ok: sleepHours(H.sleep[k]) >= 7 },
      Money.dayOnPace ? (() => { const v = Money.dayOnPace(k); return v == null ? null : { id: 'money', name: 'On budget', icon: '₹', ok: v }; })() : null,
    ];
    return out.filter(Boolean);
  }
  const hIcon = h => (h.icon.length > 2 ? ic(h.icon) : `<span>${h.icon}</span>`);
  function checkinHtml() {
    const k = todayK(); const hs = habits(k); const c = H.check[k];
    const done = hs.filter(h => h.ok).length;
    return `<div class="checkin"><div class="ph"><span class="t">DAILY CHECK-IN · ${done}/${hs.length}</span><button data-h="score">Weekly scorecard</button></div>
      <div class="habits">${hs.map(h => `<span class="hab ${h.ok ? 'ok' : ''}">${hIcon(h)}<b>${esc(h.name)}</b>${h.ok ? ic('check') : ''}</span>`).join('')}</div>
      <div class="moodq">${c ? `<span>Today felt ${FACES[c.mood - 1]}${c.note ? ` · ${esc(c.note)}` : ''}</span><button class="linkbtn" data-h="mood">Change</button>` : `<span>How was today?</span><div class="faces sm">${FACES.map((f, i) => `<button data-h="moodq" data-v="${i + 1}">${f}</button>`).join('')}</div>`}</div></div>`;
  }
  function moodSheet(pre) {
    const k = todayK(); const c = H.check[k] || {}; let mood = pre || c.mood || 0;
    const s = sheet(`<h2>Daily check-in</h2><div class="faces">${FACES.map((f, i) => `<button class="${mood === i + 1 ? 'on' : ''}" data-q="${i + 1}">${f}</button>`).join('')}</div>
      <input class="field body" id="cn" placeholder="One win from today (optional)" value="${esc(c.note || '')}" maxlength="60" style="margin-top:12px">
      <div class="btns"><button class="btn primary" data-a="ok">Save</button></div>`);
    s.el.addEventListener('click', e => {
      const q = e.target.closest('[data-q]'); if (q) { mood = +q.dataset.q; $$('[data-q]', s.el).forEach(x => x.classList.toggle('on', x === q)); return; }
      if (!e.target.closest('[data-a="ok"]')) return;
      if (!mood) { toast('Pick how today felt'); return; }
      H.check[k] = { mood, note: $('#cn', s.el).value.trim() }; save(); s.close(); refreshToday(); toast('Checked in. See you tomorrow!');
    });
  }
  function weekStats(offsetWeeks = 0) {
    const t0 = today0(); const off = (t0.getDay() - S.weekStart + 7) % 7;
    const start = addDays(t0, -off + offsetWeeks * 7);
    const days = []; for (let i = 0; i < 7; i++) { const d = addDays(start, i); const k = dkey(d); days.push({ d, k, fut: d > t0, hs: d > t0 ? [] : habits(k) }); }
    const past = days.filter(x => !x.fut);
    const possible = past.reduce((a, x) => a + x.hs.length, 0), got = past.reduce((a, x) => a + x.hs.filter(h => h.ok).length, 0);
    const workouts = log.filter(x => { const d = parseKey(x.date); return d >= start && d < addDays(start, 7); }).length;
    const sl = past.map(x => sleepHours(H.sleep[x.k])).filter(Boolean);
    const stp = past.map(x => stepsOn(x.k)).filter(Boolean);
    const moods = past.map(x => (H.check[x.k] || {}).mood).filter(Boolean);
    const byHabit = {}; past.forEach(x => x.hs.forEach(h => { const b = byHabit[h.id] = byHabit[h.id] || { name: h.name === 'Rest day' ? 'Workout' : h.name, icon: h.icon, ok: 0, n: 0 }; b.n++; if (h.ok) b.ok++; }));
    return { start, days, score: possible ? Math.round(got / possible * 100) : 0, workouts, avgSleep: sl.length ? sl.reduce((a, v) => a + v, 0) / sl.length : 0, avgSteps: stp.length ? stp.reduce((a, v) => a + v, 0) / stp.length : 0, avgMood: moods.length ? moods.reduce((a, v) => a + v, 0) / moods.length : 0, byHabit, pastN: past.length };
  }
  function scorecard(offset = 0) {
    const w = weekStats(offset), prev = weekStats(offset - 1);
    const rows = Object.entries(w.byHabit);
    const weakest = rows.filter(([, b]) => b.n).sort((a, b) => a[1].ok / a[1].n - b[1].ok / b[1].n)[0];
    const diff = w.score - prev.score;
    const s = sheet(`<h2>Weekly scorecard</h2><p class="sub">${esc(shortDate(w.start))} – ${esc(shortDate(addDays(w.start, 6)))}</p>
      <div class="scorehead"><span class="rring big" style="--p:${w.score}"><b>${w.score}</b></span><span><b>${w.score >= 80 ? 'Excellent week' : w.score >= 60 ? 'Solid week' : w.score >= 40 ? 'Getting there' : 'Fresh start next week'}</b>${prev.pastN ? `<span class="${diff >= 0 ? 'okt' : 'badt'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)} vs last week</span>` : ''}</span></div>
      <div class="scgrid"><span></span>${w.days.map(x => `<span class="dh">${WD[x.d.getDay()][0]}</span>`).join('')}
        ${rows.map(([id, b]) => `<span class="hn">${hIcon(b)}${esc(b.name)} <small>${b.ok}/${b.n}</small></span>${w.days.map(x => { const h = x.hs.find(y => y.id === id); return `<i class="${x.fut ? 'fut' : h && h.ok ? 'ok' : ''}"></i>`; }).join('')}`).join('')}</div>
      <div class="stats" style="margin-top:12px">
        <div class="stat"><div class="k">Workouts</div><div class="v">${w.workouts}</div><div class="s">${prev.workouts} last week</div></div>
        <div class="stat"><div class="k">Avg sleep</div><div class="v">${w.avgSleep ? hm(w.avgSleep) : '—'}</div><div class="s">${w.avgMood ? `mood ${FACES[Math.round(w.avgMood) - 1]}` : 'log sleep each morning'}</div></div>
        ${w.avgSteps ? `<div class="stat"><div class="k">Avg steps</div><div class="v">${fmtN(w.avgSteps)}</div><div class="s">goal ${fmtN(S.stepGoal)}</div></div>` : ''}
        ${Money.weekSpend ? (() => { const m = Money.weekSpend(w.start); return m ? `<div class="stat"><div class="k">Spent</div><div class="v">${m.locked ? '••••' : Money.inr(m.spent)}</div><div class="s">${m.locked ? 'Money is locked' : `${m.pace ? `even pace ${Money.inr(m.pace)}` : ''}`}</div></div>` : ''; })() : ''}
      </div>
      ${weakest && weakest[1].ok < weakest[1].n ? `<div class="mwarn" style="margin-top:12px">${ic('info')}<span>Focus for next week: <b>${esc(weakest[1].name.toLowerCase())}</b> (${weakest[1].ok} of ${weakest[1].n} days).</span></div>` : ''}
      <div class="btns two"><button class="btn" data-a="prev">${ic('chevL')}Earlier</button><button class="btn" data-a="next" ${offset >= 0 ? 'disabled' : ''}>Later${ic('chevR')}</button></div>`);
    s.el.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; s.close(); setTimeout(() => scorecard(offset + (b.dataset.a === 'prev' ? -1 : 1)), 120); });
  }

  /* ---------- wiring ---------- */
  function refreshToday() { if (currentTab === 'today' && !$('#layer > .screen')) rerenderKeepScroll(); }
  function refreshProgress() { if (currentTab === 'progress' && !$('#layer > .screen')) rerenderKeepScroll(); }
  function handle(b) {
    const v = b.dataset.v;
    switch (b.dataset.h) {
      case 'p': return addP(+v);
      case 'w': return addW(+v);
      case 'foods': return foodsSheet();
      case 'nut': return nutSheet();
      case 'weight': return openBodyEntry(null);
      case 'sleep': return sleepSheet();
      case 'yoga': return Yoga.openPicker();
      case 'mood': return moodSheet();
      case 'moodq': return moodSheet(+v);
      case 'score': return scorecard(0);
      case 'pose': pose = v; return refreshProgress();
      case 'phadd': return addPhoto();
      case 'phview': return viewPhoto(v);
      case 'phcmp': return compare();
    }
  }
  async function scheduleScorecard() {
    if (!P.LocalNotifications) return;
    try {
      await P.LocalNotifications.cancel({ notifications: [{ id: 710 }] });
      const p = await P.LocalNotifications.checkPermissions(); if (p.display !== 'granted') return;
      const wd = ((S.weekStart + 6) % 7) + 1; // last day of your week, Capacitor weekday 1 = Sunday
      await P.LocalNotifications.schedule({ notifications: [{ id: 710, title: 'Your weekly scorecard 📊', body: 'See how your training, sleep, protein and money went this week', channelId: 'kw_remind', schedule: { on: { weekday: wd, hour: 19, minute: 0 }, allowWhileIdle: true }, isExactNotification: false, smallIcon: 'ic_stat_kw', iconColor: S.accent }] });
    } catch (e) { /* ignore */ }
  }
  function widgetPart() {
    const k = todayK(); const r = readiness(k);
    return { readiness: r ? r.score : -1 };
  }

  return {
    get data() { const d = clone(H); return d; },
    set data(v) { const photos = H.photos; H = Object.assign(fresh(), v || {}); H.photos = photos; save(); },
    merge(v) { if (!v) return; ['nut', 'sleep', 'check'].forEach(k => { H[k] = Object.assign({}, v[k] || {}, H[k]); }); H.targets = Object.keys(H.targets).length ? H.targets : (v.targets || {}); save(); },
    fuelHtml, sleepCardHtml, checkinHtml, muscleMapHtml, photosHtml, hydrate, handle, scheduleScorecard, readiness, habits, muscleSets, widgetPart, scorecard,
    _addP: addP, _addW: addW,
  };
})();
