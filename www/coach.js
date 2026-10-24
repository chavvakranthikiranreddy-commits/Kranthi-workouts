/* Muscle & Money: workouts you build by typing exercise names, ready-made full-body templates,
   and a guided player that counts down, counts every rep out loud and runs your rests.
   Uses helpers from app.js and Moves (moves.js). */
'use strict';

const Coach = (() => {
  let mine = DB.get('workouts', []);
  const saveMine = () => DB.set('workouts', mine);
  const COLORS = ['#00E5FF', '#22D46A', '#FF9F1C', '#B26BFF', '#FF4057', '#4D8DFF', '#FFD43B'];

  /* ---------- workout model ----------
     { id, name, color, warm, cool, blocks: [{ id, kind: 'single'|'superset'|'circuit', rounds, rest, gap, items: [{ name, reps, time, w }] }] } */
  const item = (name, reps, time, w) => ({ name, reps: reps || null, time: time || null, w: w || null });
  function single(name, o = {}) {
    const m = Moves.get(name); const d = m.def;
    const it = item(m.custom ? name : m.name, o.time ? null : (o.reps || (d.time ? null : d.reps)), o.time || (o.reps ? null : d.time), o.w);
    return { id: uid(), kind: 'single', rounds: o.sets || d.sets, rest: o.rest != null ? o.rest : d.rest, gap: 0, items: [it] };
  }
  const parseAmt = v => (typeof v === 'string' && /s$/.test(v) ? { time: parseInt(v, 10) } : { reps: v });
  function circuit(kind, rounds, rest, gap, list) {
    return { id: uid(), kind, rounds, rest, gap, items: list.map(([n, a]) => { const m = Moves.get(n); const x = parseAmt(a); return item(m.name, x.reps, x.time); }) };
  }

  /* ---------- templates (always editable as your own copy) ---------- */
  const T = (id, group, name, level, desc, blocks, warm = true, cool = true) => ({ id, group, name, level, desc, blocks, warm, cool, tpl: true });
  function templates() {
    return [
      T('db-beg', 'Full body · Dumbbells', 'Dumbbell Full Body', 'Beginner', 'Six basics, 3 sets each. A great first gym or home routine.', [
        single('Goblet Squat', { sets: 3, reps: 10, rest: 75 }), single('Dumbbell Floor Press', { sets: 3, reps: 10, rest: 75 }), single('Single-Arm Dumbbell Row', { sets: 3, reps: 10, rest: 60 }),
        single('Dumbbell Romanian Deadlift', { sets: 3, reps: 10, rest: 75 }), single('Dumbbell Shoulder Press', { sets: 3, reps: 10, rest: 60 }), single('Plank', { sets: 3, time: 30, rest: 30 })]),
      T('db-adv', 'Full body · Dumbbells', 'Dumbbell Full Body', 'Advanced', 'Heavier work, split squats and an arm superset to finish.', [
        single('Bulgarian Split Squat', { sets: 4, reps: 8, rest: 90 }), single('Dumbbell Bench Press', { sets: 4, reps: 8, rest: 90 }), single('Dumbbell Row', { sets: 4, reps: 10, rest: 75 }),
        single('Dumbbell Romanian Deadlift', { sets: 3, reps: 8, rest: 90 }), single('Dumbbell Push Press', { sets: 3, reps: 6, rest: 90 }),
        circuit('superset', 3, 60, 10, [['Hammer Curl', 12], ['Overhead Tricep Extension', 12]])]),
      T('db-cond', 'Full body · Dumbbells', 'Dumbbell Conditioning', 'All levels', '6 moves, 40 s on and 20 s off, 4 rounds. Light dumbbells, big sweat.', [
        circuit('circuit', 4, 90, 20, [['Dumbbell Thruster', '40s'], ['Renegade Row', '40s'], ['Kettlebell Swing', '40s'], ['Reverse Lunge', '40s'], ['Push-ups', '40s'], ['Dumbbell Snatch', '40s']])]),
      T('bb-str', 'Full body · Barbell', 'Barbell Full Body Strength', 'Intermediate', 'The big lifts with long rests. Add a little weight each week.', [
        single('Squat', { sets: 3, reps: 5, rest: 180 }), single('Bench Press', { sets: 3, reps: 5, rest: 180 }), single('Barbell Row', { sets: 3, reps: 8, rest: 120 }),
        single('Romanian Deadlift', { sets: 3, reps: 8, rest: 120 }), single('Overhead Press', { sets: 3, reps: 6, rest: 120 }), single('Barbell Curl', { sets: 2, reps: 10, rest: 60 })]),
      T('bb-cx', 'Full body · Barbell', 'Barbell Complex', 'Intermediate', '6 reps of each move without putting the bar down, 5 rounds. Use a light bar.', [
        circuit('circuit', 5, 120, 0, [['Romanian Deadlift', 6], ['Barbell Row', 6], ['Hang Power Clean', 6], ['Front Squat', 6], ['Overhead Press', 6], ['Barbell Reverse Lunge', 6]])]),
      T('mx-gym', 'Dumbbell + barbell', 'Gym Full Body', 'Intermediate', 'Barbell for the big lifts, dumbbells for the rest.', [
        single('Squat', { sets: 4, reps: 6, rest: 150 }), single('Dumbbell Bench Press', { sets: 3, reps: 10, rest: 90 }), single('Barbell Row', { sets: 3, reps: 8, rest: 90 }),
        single('Dumbbell Romanian Deadlift', { sets: 3, reps: 10, rest: 90 }), single('Lateral Raise', { sets: 3, reps: 12, rest: 60 }),
        circuit('superset', 3, 60, 10, [['Barbell Curl', 10], ['Skull Crusher', 10]]), single('Plank', { sets: 2, time: 40, rest: 30 })]),
      T('mx-cond', 'Dumbbell + barbell', 'Mixed Conditioning', 'All levels', '45 s on, 15 s off, 4 rounds of barbell and dumbbell moves.', [
        circuit('circuit', 4, 90, 15, [['Barbell Thruster', '45s'], ['Renegade Row', '45s'], ['Deadlift', '45s'], ['Kettlebell Swing', '45s'], ['Burpee', '45s'], ['Mountain Climbers', '45s']])]),
      T('bw-full', 'Bodyweight & home', 'Bodyweight Full Body', 'Beginner', 'No equipment. Squat, push, pull, lunge, bridge and plank.', [
        single('Bodyweight Squat', { sets: 3, reps: 15, rest: 60 }), single('Push-ups', { sets: 3, reps: 10, rest: 60 }), single('Towel Door Row', { sets: 3, reps: 10, rest: 60 }),
        single('Reverse Lunge', { sets: 3, reps: 10, rest: 60 }), single('Glute Bridge', { sets: 3, reps: 15, rest: 45 }), single('Plank', { sets: 3, time: 30, rest: 30 })]),
      T('bw-hiit', 'Bodyweight & home', 'HIIT 20', 'All levels', '40 s on, 20 s off, 5 rounds. Go at your own pace.', [
        circuit('circuit', 5, 60, 20, [['Jumping Jacks', '40s'], ['Squat Jumps', '40s'], ['Mountain Climbers', '40s'], ['Push-ups', '40s'], ['High Knees', '40s'], ['Burpee', '40s']])], true, true),
      T('bw-core', 'Bodyweight & home', 'Core 10', 'All levels', 'Seven core moves, 2 rounds, about 10 minutes.', [
        circuit('circuit', 2, 45, 15, [['Crunches', '40s'], ['Russian Twist', '40s'], ['Lying Leg Raise', '40s'], ['Bicycle Crunch', '40s'], ['Plank', '40s'], ['Side Plank', '30s'], ['Dead Bug', '40s']])], false, false),
    ];
  }
  let TPL = null;
  const tpls = () => (TPL = TPL || templates());
  const findW = id => mine.find(w => w.id === id) || tpls().find(w => w.id === id);

  /* ---------- helpers ---------- */
  const speed = () => ({ slow: 1.3, normal: 1, fast: 0.8 })[S.repSpeed || 'normal'] || 1;
  const repMs = name => { const m = Moves.get(name); return Moves.tempo(name) * speed() / (m.per || 1); };
  const allItems = w => w.blocks.flatMap(b => b.items);
  const uniqNames = w => [...new Set(allItems(w).map(i => i.name))];
  function warmList(w) {
    const mus = new Set(allItems(w).flatMap(i => Moves.get(i.name).muscles));
    const legs = ['quads', 'hams', 'glutes', 'calves'].some(x => mus.has(x)), upper = ['chest', 'back', 'shoulders', 'biceps', 'triceps'].some(x => mus.has(x));
    return ['Jumping Jacks', upper ? 'Arm Circles' : 'Inchworm', legs ? 'Leg Swings' : 'Inchworm', legs ? 'Bodyweight Squat' : 'Push-ups'].filter((v, i, a) => a.indexOf(v) === i);
  }
  function coolList(w) {
    const mus = new Set(allItems(w).flatMap(i => Moves.get(i.name).muscles));
    const legs = ['quads', 'hams', 'glutes'].some(x => mus.has(x)), upper = ['chest', 'back', 'shoulders'].some(x => mus.has(x));
    return [legs ? 'Quad Stretch' : 'Side Bend Stretch', 'Hamstring Stretch', upper ? 'Chest Opener' : 'Hip Flexor Stretch', "Child's Pose"];
  }
  function estSec(w) {
    let s = 0;
    w.blocks.forEach(b => { for (let r = 0; r < b.rounds; r++) { b.items.forEach((it, i) => { s += it.time || Math.round((it.reps || 10) * repMs(it.name) / 1000); if (i < b.items.length - 1) s += b.gap || 0; }); s += b.rest; } s -= b.rest; s += 15; });
    if (w.warm) s += 4 * 35; if (w.cool) s += 4 * 35;
    return Math.max(60, s);
  }
  const amtTxt = it => (it.time ? `${it.time} s` : `${it.reps} reps`) + (it.w ? ` · ${wOut(it.w)} ${wUnit()}` : '');
  const blockTxt = b => b.kind === 'single' ? `${b.rounds} × ${b.items[0].time ? b.items[0].time + ' s' : b.items[0].reps}${b.items[0].w ? ` · ${wOut(b.items[0].w)} ${wUnit()}` : ''} · rest ${fmtShort(b.rest)}`
    : `${b.kind === 'superset' ? 'Superset' : 'Circuit'} · ${b.rounds} round${b.rounds > 1 ? 's' : ''} · rest ${fmtShort(b.rest)}`;
  const eqOf = w => { const e = new Set(allItems(w).map(i => Moves.get(i.name).eq)); return ['B', 'D', 'D1'].filter(x => e.has(x)).length ? [e.has('B') ? 'Barbell' : '', e.has('D') || e.has('D1') ? 'Dumbbells' : ''].filter(Boolean).join(' + ') : 'No equipment'; };

  // Weight suggestion from your last session of this exercise.
  function suggest(name, reps) {
    const st = exerciseStats(name); if (!st.last) return null;
    const sets = st.last.sets; const top = sets.reduce((m, s) => Math.max(m, s.w || 0), 0);
    if (!top) return { text: `Last: ${sets.map(s => s.r).join(', ')} reps`, w: null };
    const hitAll = sets.filter(s => (s.w || 0) === top).every(s => s.r >= (reps || 0));
    const m = Moves.get(name);
    const step = m.eq === 'B' ? 2.5 : 2;
    const next = hitAll ? Math.round((top + step) * 2) / 2 : top;
    return { text: `Last: ${wOut(top)} ${wUnit()} × ${sets.filter(s => (s.w || 0) === top).map(s => s.r).join(', ')}`, tip: hitAll ? `Try ${wOut(next)} ${wUnit()}` : `Stay at ${wOut(top)} ${wUnit()}`, w: next, up: hitAll };
  }

  /* ---------- Train tab: workouts list ---------- */
  const thumbs = w => uniqNames(w).slice(0, 3).map(n => `<span class="wkth">${Moves.svgFor(n, { cls: 'th' })}</span>`).join('');
  function card(w) {
    return `<button class="wkcard" data-wk="${w.id}" style="--wc:${w.color || 'var(--accent)'}"><span class="wkfigs">${thumbs(w)}</span>
      <span class="wkt"><b>${esc(w.name)}</b><span>${allItems(w).length} moves · ~${Math.round(estSec(w) / 60)} min${w.level ? ' · ' + esc(w.level) : ''}</span><small>${esc(eqOf(w))}</small></span>${ic('chevR', 'chev')}</button>`;
  }
  function listHtml() {
    const groups = {}; tpls().forEach(t => { (groups[t.group] = groups[t.group] || []).push(t); });
    return `<div class="wkactions"><button class="btn primary" data-wa="new">${ic('plus')}Create workout</button><button class="btn" data-wa="import">${ic('download')}Import</button></div>
      <div class="sect">My workouts</div>
      ${mine.length ? mine.map(card).join('') : `<div class="empty" style="padding:18px 10px"><b>Build your own</b>Type exercise names like "squat, push-ups, curl" and the app fills in sets, reps and rest. Or open a template below and tap Customise.</div>`}
      ${Object.entries(groups).map(([g, list]) => `<div class="sect">${esc(g)}</div>${list.map(card).join('')}`).join('')}
      <div class="sect">Yoga &amp; mobility</div>
      <button class="wkcard" data-wa="yoga"><span class="wkfigs"><span class="wkth">${Moves.svgFor('Cobra Stretch', { cls: 'th' })}</span><span class="wkth">${Moves.svgFor("Child's Pose", { cls: 'th' })}</span></span><span class="wkt"><b>Yoga &amp; mobility routines</b><span>Follow-along flows with poses</span></span>${ic('chevR', 'chev')}</button>`;
  }
  async function handleList(e) {
    const wk = e.target.closest('[data-wk]'); if (wk) return openDetail(findW(wk.dataset.wk));
    const a = e.target.closest('[data-wa]'); if (!a) return false;
    if (a.dataset.wa === 'new') return openBuilder(null);
    if (a.dataset.wa === 'import') return importSheet();
    if (a.dataset.wa === 'yoga') return Yoga.openPicker();
    return true;
  }

  /* ---------- detail screen ---------- */
  function openDetail(w) {
    if (!w) return;
    const scr = el(`<section class="screen wkdetail"><header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Back">${ic('chevL')}</button></div><h1>${esc(w.name)}</h1><div class="tb-right"><button class="round-btn" data-a="more" aria-label="More">${ic('more')}</button></div></header><div class="scroll"><div class="page" id="wkd"></div></div>
      <div class="gym-bar"><button class="btn" data-a="${w.tpl ? 'custom' : 'edit'}">${ic('edit')}${w.tpl ? 'Customise' : 'Edit'}</button><button class="btn primary" data-a="start">${ic('play')}Start</button></div></section>`);
    const paint = () => {
      const blocks = w.blocks.map(b => {
        const rows = b.items.map(it => { const sg = it.reps ? suggest(it.name, it.reps) : null; return `<button class="wkrow" data-how="${esc(it.name)}"><span class="wkfig">${Moves.svgFor(it.name)}</span><span class="wkt"><b>${esc(it.name)}</b><span>${b.kind === 'single' ? esc(blockTxt(b)) : esc(amtTxt(it))}</span>${sg ? `<small class="${sg.up ? 'okt' : ''}">${esc(sg.text)}${sg.tip ? ' · ' + esc(sg.tip) : ''}</small>` : ''}</span>${ic('info', 'chev')}</button>`; }).join('');
        return b.kind === 'single' ? rows : `<div class="wkgroup"><div class="wkgh">${ic('repeat')}${esc(blockTxt(b))}${b.gap ? ` · ${b.gap} s between moves` : ''}</div>${rows}</div>`;
      }).join('');
      $('#wkd', scr).innerHTML = `${w.desc ? `<p class="sub" style="text-align:left;margin:0 0 10px">${esc(w.desc)}</p>` : ''}
        <div class="wkmeta"><span>${ic('stopwatch')}~${Math.round(estSec(w) / 60)} min</span><span>${ic('dumbbell')}${esc(eqOf(w))}</span><span>${ic('list')}${allItems(w).length} moves</span></div>
        ${w.warm ? `<div class="wkwarm">${ic('flame')}<span><b>Warm-up · 2 min</b> ${esc(warmList(w).join(', '))}</span></div>` : ''}
        <div class="block" style="padding:0">${blocks}</div>
        ${w.cool ? `<div class="wkwarm">${ic('lotus')}<span><b>Cool-down · 2 min</b> ${esc(coolList(w).join(', '))}</span></div>` : ''}
        <div class="wkpace"><span>Rep speed</span><div class="seg sm">${['slow', 'normal', 'fast'].map(k => `<button class="${(S.repSpeed || 'normal') === k ? 'on' : ''}" data-sp="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div></div>
        <p class="hint">Tap an exercise to see how to do it. The voice counts every rep at this speed.</p>`;
      Moves.mount(scr);
    };
    paint();
    layer.appendChild(scr);
    const close = () => { unback(); scr.remove(); if (currentTab === 'timers') rerenderKeepScroll(); };
    const unback = pushBack(close);
    scr.addEventListener('click', async e => {
      const how = e.target.closest('[data-how]'); if (how) return Moves.howTo(how.dataset.how);
      const sp = e.target.closest('[data-sp]'); if (sp) { S.repSpeed = sp.dataset.sp; saveSettings(); return paint(); }
      const b = e.target.closest('[data-a]'); if (!b) return;
      switch (b.dataset.a) {
        case 'close': return close();
        case 'start': return play(w);
        case 'custom': { const c = copyOf(w); close(); return openBuilder(c, true); }
        case 'edit': close(); return openBuilder(w);
        case 'more': return menu(w.name, [
          { icon: 'share', label: 'Share with a friend', run: () => share(w) },
          { icon: 'copy', label: w.tpl ? 'Save to My workouts' : 'Duplicate', run: () => { const c = copyOf(w); if (!w.tpl) c.name = w.name + ' copy'; mine.unshift(c); saveMine(); toast('Saved to My workouts'); } },
          ...(w.tpl ? [] : [{ icon: 'trash', label: 'Delete', danger: true, run: async () => { if (await confirmBox('Delete workout?', `"${w.name}" will be removed.`, [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { mine = mine.filter(x => x.id !== w.id); saveMine(); close(); } } }]),
        ]);
      }
    });
  }
  function copyOf(w) {
    const c = clone(w); c.id = uid(); delete c.tpl; delete c.group; c.color = c.color || COLORS[mine.length % COLORS.length];
    c.blocks.forEach(b => { b.id = uid(); }); return c;
  }

  /* ---------- builder ---------- */
  function openBuilder(w0, isNewCopy) {
    const isNew = !w0 || isNewCopy;
    const w = w0 ? clone(w0) : { id: uid(), name: '', color: COLORS[mine.length % COLORS.length], warm: true, cool: true, blocks: [] };
    let query = '';
    const scr = el(`<section class="screen wkbuild"><header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Close">${ic('close')}</button></div><h1>${isNew ? 'New workout' : 'Edit workout'}</h1></header>
      <div class="scroll"><div class="page">
        <input class="field" id="wn" placeholder="Workout name (e.g. Monday Full Body)" maxlength="40" value="${esc(w.name)}">
        <div class="wkadd"><input class="field body" id="wq" placeholder="Type an exercise: squat, curl, plank…" autocomplete="off" enterkeyhint="done"><button class="btn sm" data-a="paste">Paste list</button></div>
        <div id="wsug"></div>
        <div id="wrows"></div>
        <div class="block" style="margin-top:14px">
          <button class="set-row" data-a="warm"><span class="st"><div class="t">Warm-up first</div><div class="s">2 minutes matched to your moves</div></span><span class="toggle" id="tw"></span></button>
          <button class="set-row" data-a="cool"><span class="st"><div class="t">Cool-down after</div><div class="s">2 minutes of stretches</div></span><span class="toggle" id="tc"></span></button>
        </div>
        <p class="hint" id="west"></p>
      </div></div>
      <div class="gym-bar"><button class="btn" data-a="close">Cancel</button><button class="btn primary" data-a="save">Save</button></div></section>`);
    const sug = () => {
      const box = $('#wsug', scr);
      if (!query) { box.innerHTML = ''; return; }
      const list = Moves.search(query, 6);
      box.innerHTML = `<div class="block wksug">${list.map(n => `<button class="wksrow" data-add="${esc(n)}"><span class="wkth">${Moves.svgFor(n, { cls: 'th' })}</span><span class="wkt"><b>${esc(n)}</b><span>${esc(Moves.EQN[Moves.get(n).eq] || '')}</span></span>${ic('plus')}</button>`).join('')}
        ${list.some(n => n.toLowerCase() === query.toLowerCase()) ? '' : `<button class="wksrow" data-add="${esc(query)}" data-custom="1"><span class="wkth custom">${ic('plus')}</span><span class="wkt"><b>Add "${esc(query)}"</b><span>As your own exercise</span></span></button>`}</div>`;
    };
    const rowHtml = (b, bi) => {
      const head = b.kind === 'single' ? '' : `<button class="wkgh" data-grp="${bi}">${ic('repeat')}<span>${esc(blockTxt(b))}${b.gap ? ` · ${b.gap} s between` : ''}</span>${ic('edit')}</button>`;
      const rows = b.items.map((it, ii) => `<div class="wkbrow"><button class="wkrow" data-ed="${bi}:${ii}"><span class="wkth">${Moves.svgFor(it.name, { cls: 'th' })}</span><span class="wkt"><b>${esc(it.name)}</b><span>${b.kind === 'single' ? esc(blockTxt(b)) : esc(amtTxt(it))}</span></span></button><button class="round-btn sm" data-mn="${bi}:${ii}" aria-label="Options">${ic('more')}</button></div>`).join('');
      return b.kind === 'single' ? rows : `<div class="wkgroup">${head}${rows}</div>`;
    };
    const paint = () => {
      $('#wrows', scr).innerHTML = w.blocks.length ? `<div class="block" style="padding:0;margin-top:12px">${w.blocks.map(rowHtml).join('')}</div>` : `<div class="empty" style="padding:22px 10px"><b>Add exercises</b>Type a name above. Sets, reps and rest are filled in for you, and you can change anything.</div>`;
      $('#tw', scr).classList.toggle('on', !!w.warm); $('#tc', scr).classList.toggle('on', !!w.cool);
      $('#west', scr).textContent = w.blocks.length ? `About ${Math.round(estSec(w) / 60)} minutes · ${allItems(w).length} moves` : '';
    };
    const addName = (name, custom) => {
      const n = String(name || '').trim(); if (!n) return;
      const m = custom ? null : Moves.get(n);
      const b = single(m ? m.name : n);
      if (b.items[0].reps) { const sg = suggest(b.items[0].name, b.items[0].reps); if (sg && sg.w) b.items[0].w = sg.w; }
      w.blocks.push(b); query = ''; $('#wq', scr).value = ''; sug(); paint();
      try { if (P.Haptics) P.Haptics.impact({ style: 'LIGHT' }); } catch (e) { /* ignore */ }
    };
    const bestMatch = s => { const r = Moves.search(s, 1); return r.length && (Moves.isKnown(s) || r[0].toLowerCase().includes(s.toLowerCase().split(' ')[0])) ? r[0] : null; };
    paint();
    layer.appendChild(scr);
    const close = () => { unback(); scr.remove(); if (currentTab === 'timers') rerenderKeepScroll(); };
    const unback = pushBack(close);
    const q = $('#wq', scr);
    q.addEventListener('input', () => { query = q.value.trim(); sug(); });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const s = q.value.trim(); if (s) addName(bestMatch(s) || s, !bestMatch(s)); } });
    scr.addEventListener('click', async e => {
      const t = e.target;
      const ad = t.closest('[data-add]'); if (ad) return addName(ad.dataset.add, !!ad.dataset.custom);
      const ed = t.closest('[data-ed]'); if (ed) { const [bi, ii] = ed.dataset.ed.split(':').map(Number); return itemSheet(w, bi, ii, paint); }
      const gp = t.closest('[data-grp]'); if (gp) return groupSheet(w, +gp.dataset.grp, paint);
      const mn = t.closest('[data-mn]'); if (mn) { const [bi, ii] = mn.dataset.mn.split(':').map(Number); return rowMenu(w, bi, ii, paint); }
      const b = t.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') { if (w.blocks.length && !(await confirmBox('Leave without saving?', '', [{ label: 'Leave', cls: 'danger', value: 1 }, { label: 'Keep editing', cls: 'ghost', value: 0 }]))) return; return close(); }
      if (b.dataset.a === 'warm') { w.warm = !w.warm; return paint(); }
      if (b.dataset.a === 'cool') { w.cool = !w.cool; return paint(); }
      if (b.dataset.a === 'paste') return pasteSheet(lines => { lines.forEach(l => { const bm = bestMatch(l); addName(bm || l, !bm); }); });
      if (b.dataset.a === 'save') {
        w.name = $('#wn', scr).value.trim() || (w.blocks[0] ? `${w.blocks[0].items[0].name.split(' ')[0]} workout` : 'My workout');
        if (!w.blocks.length) { toast('Add at least one exercise'); return; }
        const i = mine.findIndex(x => x.id === w.id); if (i >= 0) mine[i] = w; else mine.unshift(w);
        saveMine(); close(); toast('Workout saved'); setTimeout(() => openDetail(w), 150);
      }
    });
  }
  function pasteSheet(cb) {
    const s = sheet(`<h2>Paste a list</h2><p class="sub">One exercise per line, or separated by commas. You can copy it from WhatsApp or notes.</p>
      <textarea class="field body" id="pl" rows="7" placeholder="Squat&#10;Bench press&#10;Lat pulldown&#10;Plank"></textarea>
      <div class="btns"><button class="btn primary" data-a="ok">Add all</button></div>`);
    setTimeout(() => $('#pl', s.el).focus(), 250);
    s.el.addEventListener('click', e => {
      if (!e.target.closest('[data-a="ok"]')) return;
      const lines = $('#pl', s.el).value.split(/[\n,;]+/).map(x => x.replace(/^\s*[\d.)\-•*]+\s*/, '').replace(/\s*[-–:]?\s*\d+\s*[x×]\s*\d+.*$/i, '').trim()).filter(Boolean);
      if (!lines.length) { toast('Type at least one exercise'); return; }
      s.close(); cb(lines);
    });
  }
  function stepper(id, label, val, unit, step, min, max) {
    return `<div class="stp"><span>${label}</span><div class="stpc"><button data-st="${id}" data-d="${-step}" aria-label="Less">−</button><b id="${id}" data-v="${val}" data-min="${min}" data-max="${max}">${val}${unit}</b><button data-st="${id}" data-d="${step}" aria-label="More">+</button></div></div>`;
  }
  function wireSteppers(root, unitOf) {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-st]'); if (!b) return;
      const o = $('#' + b.dataset.st, root); let v = parseFloat(o.dataset.v) + parseFloat(b.dataset.d);
      v = Math.max(parseFloat(o.dataset.min), Math.min(parseFloat(o.dataset.max), Math.round(v * 10) / 10));
      o.dataset.v = v; o.textContent = (unitOf ? unitOf(b.dataset.st, v) : v);
    });
  }
  const val = (root, id) => parseFloat($('#' + id, root).dataset.v);
  function itemSheet(w, bi, ii, after) {
    const b = w.blocks[bi], it = b.items[ii], single1 = b.kind === 'single';
    let mode = it.time ? 'time' : 'reps';
    const sg = suggest(it.name, it.reps);
    const wkg = it.w != null ? it.w : 0;
    const s = sheet(`<h2>${esc(it.name)}</h2>
      <div class="mvstage sm">${Moves.svgFor(it.name)}</div>
      <div class="seg" style="background:var(--surface-2)"><button class="${mode === 'reps' ? 'on' : ''}" data-md="reps">Reps</button><button class="${mode === 'time' ? 'on' : ''}" data-md="time">Time</button></div>
      <div class="block" style="padding:4px 14px">
        ${single1 ? stepper('xs', 'Sets', b.rounds, '', 1, 1, 10) : ''}
        <div id="rp" ${mode === 'time' ? 'hidden' : ''}>${stepper('xr', 'Reps', it.reps || 10, '', 1, 1, 50)}</div>
        <div id="tm" ${mode === 'reps' ? 'hidden' : ''}>${stepper('xt', 'Seconds', it.time || 30, ' s', 5, 5, 300)}</div>
        ${stepper('xw', `Weight (${wUnit()})`, S.unit === 'lb' ? Math.round(wkg * KG_LB) : wkg, '', S.unit === 'lb' ? 5 : (Moves.get(it.name).eq === 'B' ? 2.5 : 1), 0, 500)}
        ${single1 ? stepper('xrest', 'Rest after each set', b.rest, ' s', 15, 0, 600) : ''}
      </div>
      ${sg ? `<p class="hint">${esc(sg.text)}${sg.tip ? ' · <b>' + esc(sg.tip) + '</b>' : ''}</p>` : '<p class="hint">Leave weight at 0 for bodyweight moves.</p>'}
      <div class="btns two"><button class="btn" data-a="how">How to</button><button class="btn primary" data-a="ok">Done</button></div>`);
    Moves.mount(s.el); wireSteppers(s.el, (id, v) => v + (id === 'xt' || id === 'xrest' ? ' s' : ''));
    s.el.addEventListener('click', e => {
      const md = e.target.closest('[data-md]'); if (md) { mode = md.dataset.md; $$('[data-md]', s.el).forEach(x => x.classList.toggle('on', x === md)); $('#rp', s.el).hidden = mode !== 'reps'; $('#tm', s.el).hidden = mode !== 'time'; return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'how') return Moves.howTo(it.name);
      if (single1) { b.rounds = val(s.el, 'xs'); b.rest = val(s.el, 'xrest'); }
      if (mode === 'reps') { it.reps = val(s.el, 'xr'); it.time = null; } else { it.time = val(s.el, 'xt'); it.reps = null; }
      const wv = val(s.el, 'xw'); it.w = wv > 0 ? (S.unit === 'lb' ? Math.round(wv / KG_LB * 10) / 10 : wv) : null;
      s.close(); after();
    });
  }
  function groupSheet(w, bi, after) {
    const b = w.blocks[bi];
    const s = sheet(`<h2>${b.kind === 'superset' ? 'Superset' : 'Circuit'}</h2><p class="sub">${esc(b.items.map(i => i.name).join(' → '))}</p>
      <div class="block" style="padding:4px 14px">${stepper('gr', 'Rounds', b.rounds, '', 1, 1, 10)}${stepper('gg', 'Rest between moves', b.gap || 0, ' s', 5, 0, 120)}${stepper('gx', 'Rest after each round', b.rest, ' s', 15, 0, 600)}</div>
      <div class="btns two"><button class="btn" data-a="split">Ungroup</button><button class="btn primary" data-a="ok">Done</button></div>`);
    wireSteppers(s.el, (id, v) => v + (id === 'gr' ? '' : ' s'));
    s.el.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'split') { const parts = b.items.map(it => { const nb = single(it.name, { sets: b.rounds, rest: Moves.get(it.name).def.rest }); nb.items[0] = it; return nb; }); w.blocks.splice(bi, 1, ...parts); }
      else { b.rounds = val(s.el, 'gr'); b.gap = val(s.el, 'gg'); b.rest = val(s.el, 'gx'); }
      s.close(); after();
    });
  }
  function rowMenu(w, bi, ii, after) {
    const b = w.blocks[bi], it = b.items[ii];
    const moveItem = d => {
      if (b.kind === 'single') { const j = bi + d; if (j < 0 || j >= w.blocks.length) return; [w.blocks[bi], w.blocks[j]] = [w.blocks[j], w.blocks[bi]]; }
      else { const j = ii + d; if (j < 0 || j >= b.items.length) return; [b.items[ii], b.items[j]] = [b.items[j], b.items[ii]]; }
      after();
    };
    const next = w.blocks[bi + 1];
    menu(it.name, [
      { icon: 'swap', label: 'Swap for a similar move', run: () => swapSheet(it.name, n => { it.name = n; const sg = it.reps ? suggest(n, it.reps) : null; it.w = sg && sg.w ? sg.w : null; after(); }) },
      ...(next ? [{ icon: 'repeat', label: b.kind === 'single' && next.kind === 'single' ? `Superset with ${next.items[0].name}` : 'Group with the next move', run: () => { const items = b.items.concat(next.items); const kind = items.length > 2 ? 'circuit' : 'superset'; w.blocks.splice(bi, 2, { id: uid(), kind, rounds: Math.max(b.rounds, next.rounds), rest: Math.max(60, b.rest), gap: kind === 'superset' ? 10 : 15, items }); after(); } }] : []),
      { icon: 'chevU', label: 'Move up', run: () => moveItem(-1) },
      { icon: 'chevD', label: 'Move down', run: () => moveItem(1) },
      { icon: 'info', label: 'How to do it', run: () => Moves.howTo(it.name) },
      { icon: 'trash', label: 'Remove', danger: true, run: () => { b.items.splice(ii, 1); if (!b.items.length) w.blocks.splice(bi, 1); else if (b.items.length === 1) { b.kind = 'single'; } after(); } },
    ]);
  }
  function swapSheet(name, cb) {
    const list = Moves.alts(name);
    if (!list.length) { toast('No similar moves found'); return; }
    const s = sheet(`<h2>Swap ${esc(name)}</h2><p class="sub">Same muscles, different equipment.</p><div class="block" style="padding:0">${list.map(n => `<button class="wksrow" data-sw="${esc(n)}"><span class="wkth">${Moves.svgFor(n, { cls: 'th' })}</span><span class="wkt"><b>${esc(n)}</b><span>${esc(Moves.EQN[Moves.get(n).eq] || '')}</span></span>${ic('swap')}</button>`).join('')}</div>`);
    s.el.addEventListener('click', e => { const b = e.target.closest('[data-sw]'); if (b) { s.close(); cb(b.dataset.sw); } });
  }

  /* ---------- share & import ---------- */
  const b64u = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  const KIND = ['single', 'superset', 'circuit'];
  function encode(w) {
    return 'MM1.' + b64u(JSON.stringify({ n: w.name, w: w.warm ? 1 : 0, c: w.cool ? 1 : 0, b: w.blocks.map(b => [KIND.indexOf(b.kind), b.rounds, b.rest, b.gap || 0, b.items.map(i => [i.name, i.reps || 0, i.time || 0, i.w || 0])]) }));
  }
  function decode(code) {
    const m = String(code || '').match(/MM1\.([A-Za-z0-9_-]+)/); if (!m) return null;
    try {
      const o = JSON.parse(unb64u(m[1]));
      return { id: uid(), name: String(o.n || 'Shared workout').slice(0, 40), color: COLORS[mine.length % COLORS.length], warm: !!o.w, cool: !!o.c,
        blocks: (o.b || []).map(b => ({ id: uid(), kind: KIND[b[0]] || 'single', rounds: Math.max(1, Math.min(20, +b[1] || 3)), rest: Math.max(0, Math.min(900, +b[2] || 60)), gap: Math.max(0, +b[3] || 0), items: (b[4] || []).map(i => item(String(i[0]).slice(0, 50), +i[1] || null, +i[2] || null, +i[3] || null)) })).filter(b => b.items.length) };
    } catch (e) { return null; }
  }
  async function share(w) {
    const lines = w.blocks.map(b => b.kind === 'single' ? `• ${b.items[0].name} – ${blockTxt(b)}` : `• ${b.kind === 'superset' ? 'Superset' : 'Circuit'} ×${b.rounds}: ${b.items.map(i => `${i.name} (${i.time ? i.time + 's' : i.reps})`).join(', ')}`);
    const text = `💪 ${w.name}\n${lines.join('\n')}\n\nOpen Muscle & Money → Timers → Workouts → Import, and paste this code:\n${encode(w)}`;
    try { if (P.Share) await P.Share.share({ title: w.name, text, dialogTitle: 'Share workout' }); else if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Copied. Paste it in a chat.'); } } catch (e) { /* cancelled */ }
  }
  function importSheet() {
    const s = sheet(`<h2>Import a workout</h2><p class="sub">Paste the whole message your friend sent. The app finds the code in it.</p>
      <textarea class="field body" id="ic" rows="6" placeholder="Paste here…"></textarea><p class="hint" id="ip"></p>
      <div class="btns"><button class="btn primary" data-a="ok">Import</button></div>`);
    const inp = $('#ic', s.el);
    setTimeout(async () => { inp.focus(); try { const t = await navigator.clipboard.readText(); if (/MM1\./.test(t)) { inp.value = t; preview(); } } catch (e) { /* no clipboard access */ } }, 250);
    const preview = () => { const w = decode(inp.value); $('#ip', s.el).textContent = w ? `${w.name} · ${allItems(w).length} moves` : inp.value.trim() ? 'No workout code found yet.' : ''; };
    inp.addEventListener('input', preview);
    s.el.addEventListener('click', e => {
      if (!e.target.closest('[data-a="ok"]')) return;
      const w = decode(inp.value); if (!w) { toast('No workout code found in that text'); return; }
      mine.unshift(w); saveMine(); s.close(); if (currentTab === 'timers') rerenderKeepScroll(); toast(`${w.name} added`); setTimeout(() => openDetail(w), 150);
    });
  }

  /* ---------- guided player ---------- */
  function buildSteps(w) {
    const steps = [];
    const push = s => steps.push(s);
    if (w.warm) { push({ k: 'ready', dur: 5000, name: warmList(w)[0], label: 'Warm-up' }); warmList(w).forEach((n, i, a) => { push({ k: 'time', dur: 30000, name: n, phase: 'Warm-up', idx: `${i + 1}/${a.length}` }); if (i < a.length - 1) push({ k: 'rest', dur: 5000, next: a[i + 1], quick: true, label: 'Next' }); }); }
    w.blocks.forEach((b, bi) => {
      if (steps.length) push({ k: 'rest', dur: Math.max(10000, steps.length && w.warm && bi === 0 ? 15000 : (w.blocks[bi - 1] ? w.blocks[bi - 1].rest * 1000 : 15000)), next: b.items[0].name, nextIt: b.items[0], label: bi === 0 ? 'Get ready' : 'Rest', setLabel: `Set 1 of ${b.rounds}` });
      else push({ k: 'ready', dur: 5000, name: b.items[0].name, label: 'Get ready' });
      for (let r = 0; r < b.rounds; r++) {
        b.items.forEach((it, ii) => {
          const ref = { bi, ii, r };
          if (it.time) push({ k: 'time', dur: it.time * 1000, name: it.name, it, set: r + 1, sets: b.rounds, ref, kind: b.kind });
          else { const rm = repMs(it.name); push({ k: 'reps', dur: it.reps * rm, rep: rm, reps: it.reps, name: it.name, it, set: r + 1, sets: b.rounds, ref, kind: b.kind }); }
          const lastItem = ii === b.items.length - 1, lastRound = r === b.rounds - 1;
          if (!lastItem) { if (b.gap) push({ k: 'rest', dur: b.gap * 1000, next: b.items[ii + 1].name, nextIt: b.items[ii + 1], quick: true, label: 'Switch', setLabel: `Round ${r + 1} of ${b.rounds}` }); else steps[steps.length - 1].thenNoRest = true; }
          else if (!lastRound) push({ k: 'rest', dur: b.rest * 1000, next: b.items[0].name, nextIt: b.items[0], label: 'Rest', setLabel: `${b.kind === 'single' ? 'Set' : 'Round'} ${r + 2} of ${b.rounds}`, logRef: it.reps && b.kind === 'single' ? ref : null });
        });
      }
    });
    if (w.cool) { push({ k: 'rest', dur: 10000, next: coolList(w)[0], label: 'Cool-down next' }); coolList(w).forEach((n, i, a) => { push({ k: 'time', dur: 30000, name: n, phase: 'Cool-down', idx: `${i + 1}/${a.length}` }); if (i < a.length - 1) push({ k: 'rest', dur: 5000, next: a[i + 1], quick: true, label: 'Next' }); }); }
    return steps;
  }
  let PL = null;
  function play(w) {
    if (PL) return;
    Snd.unlock();
    const steps = buildSteps(w);
    const done = {}; // "bi:ii" -> [{ w, r }]
    const logSet = (ref, wv, r) => { const k = ref.bi + ':' + ref.ii; (done[k] = done[k] || [])[ref.r] = { w: wv || 0, r }; };
    const scr = el(`<section class="screen coach"><header class="topbar"><div class="tb-left"><button class="round-btn" data-a="x" aria-label="Stop">${ic('close')}</button></div><h1 id="cphase">${esc(w.name)}</h1><div class="tb-right"><button class="round-btn" data-a="pace" id="cpace" aria-label="Rep speed">${ic('stopwatch')}</button></div></header>
      <div class="cprog"><i id="cbar"></i></div>
      <div class="cbody" id="cbody"></div>
      <div class="cctl"><button class="round-btn big" data-a="prev" aria-label="Back">${ic('chevL')}</button><button class="cplay" data-a="pp" id="cpp" aria-label="Pause">${ic('pause')}</button><button class="round-btn big" data-a="next" aria-label="Skip">${ic('chevR')}</button></div></section>`);
    layer.appendChild(scr);
    const st = PL = { i: 0, t0: performance.now(), paused: 0, pausedAt: 0, lastRep: 0, lastSec: -1, fig: null, start: Date.now(), extra: 0 };
    const el2 = id => $('#' + id, scr);
    const elapsed = () => (st.pausedAt ? st.pausedAt : performance.now()) - st.t0 - st.paused;
    const cur = () => steps[st.i];
    const totalMs = steps.reduce((a, s) => a + s.dur, 0);
    function render() {
      const s = cur(); if (!s) return;
      const isWork = s.k === 'reps' || s.k === 'time';
      const showName = isWork || s.k === 'ready' ? s.name : s.next;
      const it = isWork ? s.it : s.nextIt;
      const sg = it && it.reps ? suggest(showName, it.reps) : null;
      const prevLog = s.logRef ? (done[s.logRef.bi + ':' + s.logRef.ii] || [])[s.logRef.r] : null;
      const logIt = s.logRef ? steps.find(x => x.ref === s.logRef) : null;
      el2('cphase').textContent = s.phase || (s.k === 'rest' ? s.label : s.k === 'ready' ? s.label : s.kind && s.kind !== 'single' ? (s.kind === 'superset' ? 'Superset' : 'Circuit') : w.name);
      el2('cbody').innerHTML = `
        <div class="cstage ${isWork ? 'work' : 'rest'}">${Moves.svgFor(showName, { cls: 'big' })}</div>
        <div class="cinfo">
          ${!isWork ? `<div class="clabel">${esc(s.k === 'ready' ? 'Get ready' : s.label)}${s.setLabel ? ` · ${esc(s.setLabel)}` : ''}</div><div class="cname sm">${s.k === 'rest' ? 'Next: ' : ''}${esc(showName || '')}</div>` : `<div class="cname">${esc(s.name)}</div><div class="clabel">${s.idx ? esc(s.idx) : s.sets ? `${s.kind === 'single' ? 'Set' : 'Round'} ${s.set} of ${s.sets}` : ''}${it && it.w ? ` · ${wOut(it.w)} ${wUnit()}` : ''}</div>`}
          <div class="cbig" id="cbig"></div>
          <div class="csub" id="csub"></div>
          ${sg && !isWork ? `<div class="csug">${esc(sg.text)}${sg.tip ? ` · <b>${esc(sg.tip)}</b>` : ''}</div>` : ''}
          ${s.k === 'rest' && !s.quick ? `<div class="cbtns"><button class="btn sm" data-a="plus">+15 s</button><button class="btn sm" data-a="skip">Skip rest</button></div>` : ''}
          ${s.k === 'reps' ? `<div class="cbtns"><button class="btn sm primary" data-a="done">${ic('check')}Done</button></div>` : ''}
          ${prevLog && logIt ? `<div class="clog"><span>Last set</span>${stepper('lw', wUnit(), wOut(prevLog.w || 0), '', S.unit === 'lb' ? 5 : 2.5, 0, 500)}${stepper('lr', 'reps', prevLog.r, '', 1, 0, 60)}</div>` : ''}
        </div>`;
      const svg = $('svg[data-mv]', scr);
      st.fig = Moves.animate(svg, s.k === 'reps' ? { dur: s.rep * (Moves.get(s.name).per || 1), clock: () => elapsed() } : { clock: () => (st.pausedAt ? null : performance.now()) });
      if (prevLog) wireSteppers(scr.querySelector('.clog'), (id, v) => v);
      update(true);
    }
    function speak(t) { say(t); }
    function cue(s) {
      if (s.k === 'reps') { speak(`${s.name}. ${s.reps} reps${s.it && s.it.w ? `, ${wOut(s.it.w)} ${S.unit === 'lb' ? 'pounds' : 'kilos'}` : ''}. Go`); Snd.go(); }
      else if (s.k === 'time') { speak(`${s.name}. ${Math.round(s.dur / 1000)} seconds. Go`); Snd.go(); }
      else if (s.k === 'rest') { speak(s.quick ? `Next, ${s.next}` : `Rest. Next, ${s.next}`); }
      else if (s.k === 'ready') speak(`Get ready. ${s.name}`);
      buzz(150);
    }
    function update(first) {
      const s = cur(); if (!s) return;
      const e = elapsed();
      const left = Math.max(0, s.dur - e);
      const big = el2('cbig'), sub = el2('csub');
      if (s.k === 'reps') {
        const n = Math.min(s.reps, Math.floor(e / s.rep));
        if (big) big.innerHTML = `${n}<small>/${s.reps}</small>`;
        if (sub) sub.textContent = n >= s.reps ? 'Done!' : 'Move with the voice';
        if (n > st.lastRep && !first) { st.lastRep = n; if (n < s.reps) speak(n === s.reps - 1 ? `${n}. Last one` : String(n)); else speak(String(n)); Snd.tick(); }
      } else {
        const sec = Math.ceil(left / 1000);
        if (big) big.textContent = fmt(sec);
        if (sub) sub.textContent = s.k === 'time' ? (sec <= 3 ? 'Almost done' : 'Keep going') : '';
        if (sec !== st.lastSec && !first) { st.lastSec = sec; if (sec <= 3 && sec > 0) { Snd.tick(); if (s.k !== 'time') speak(String(sec)); } if (s.k === 'time' && s.dur >= 30000 && sec === Math.round(s.dur / 2000)) speak('Halfway'); }
      }
      const doneMs = steps.slice(0, st.i).reduce((a, x) => a + x.dur, 0) + Math.min(e, s.dur);
      el2('cbar').style.width = (doneMs / totalMs * 100).toFixed(1) + '%';
      if (e >= s.dur && !st.pausedAt) advance();
    }
    function saveLogFrom() {
      // Read the "last set" steppers before leaving a rest step.
      const s = cur(); if (!s || !s.logRef) return;
      const box = scr.querySelector('.clog'); if (!box) return;
      const wv = val(box, 'lw'), r = val(box, 'lr');
      logSet(s.logRef, S.unit === 'lb' ? wv / KG_LB : wv, r);
    }
    function advance(manual) {
      const s = cur();
      if (s && s.k === 'reps') { const n = manual ? Math.max(Math.floor(elapsed() / s.rep), s.reps) : s.reps; logSet(s.ref, s.it.w || 0, Math.min(n, s.reps)); }
      if (s && s.k === 'time' && s.ref) logSet(s.ref, s.it.w || 0, 0);
      saveLogFrom();
      st.i++; st.t0 = performance.now(); st.paused = 0; st.lastRep = 0; st.lastSec = -1;
      if (st.i >= steps.length) return finish();
      render(); cue(cur());
    }
    function back() { if (st.i === 0) { st.t0 = performance.now(); st.paused = 0; return render(); } st.i = Math.max(0, st.i - 1); st.t0 = performance.now(); st.paused = 0; st.lastRep = 0; render(); cue(cur()); }
    function togglePause() {
      if (st.pausedAt) { st.paused += performance.now() - st.pausedAt; st.pausedAt = 0; el2('cpp').innerHTML = ic('pause'); Awake.on(); }
      else { st.pausedAt = performance.now(); el2('cpp').innerHTML = ic('play'); }
    }
    const timer = setInterval(() => update(false), 100);
    const close = () => { clearInterval(timer); unback(); scr.remove(); PL = null; Awake.off(); };
    const unback = pushBack(() => stop());
    async function stop() {
      if (!st.pausedAt) togglePause();
      const anyLogged = Object.values(done).some(a => a.some(x => x && x.r > 0));
      const v = await confirmBox('End workout?', anyLogged ? 'Save what you did so far to your calendar?' : '', anyLogged ? [{ label: 'Save & finish', cls: 'primary', value: 'save' }, { label: 'Discard', cls: 'danger', value: 'drop' }, { label: 'Keep going', cls: 'ghost', value: null }] : [{ label: 'End', cls: 'danger', value: 'drop' }, { label: 'Keep going', cls: 'ghost', value: null }]);
      if (!v) return togglePause();
      if (v === 'save') return finish(true);
      close();
    }
    function finish(early) {
      clearInterval(timer);
      Snd.finish(); speak(early ? 'Workout saved' : 'Workout complete. Great job!');
      const exercises = [];
      w.blocks.forEach((b, bi) => b.items.forEach((it, ii) => { const sets = (done[bi + ':' + ii] || []).filter(Boolean).filter(x => x.r > 0).map(x => ({ w: Math.round((x.w || 0) * 10) / 10, r: x.r })); if (sets.length) exercises.push({ name: it.name, sets }); else if (it.time && (done[bi + ':' + ii] || []).some(Boolean)) exercises.push({ name: it.name, sets: [], timed: true }); }));
      const dur = Math.round((Date.now() - st.start) / 1000);
      const prs = [];
      exercises.forEach(ex => { if (!ex.sets.length) return; const s0 = exerciseStats(ex.name); const top = Math.max(...ex.sets.map(x => x.w || 0)); if (s0.sessions.length && top > s0.maxW && top > 0) prs.push(`${ex.name}: ${wOut(top)} ${wUnit()} (heaviest)`); });
      const entry = { id: uid(), date: dkey(new Date()), at: st.start, title: w.name, kind: 'gym', cat: 'Strength', dur, exercises: exercises.filter(x => x.sets.length), notes: '', feel: 0, color: w.color || S.accent, auto: true, prs, wk: w.id };
      log.push(entry); saveLog();
      const sets = entry.exercises.reduce((a, x) => a + x.sets.length, 0), vol = entry.exercises.reduce((a, x) => a + x.sets.reduce((b, s) => b + (s.w || 0) * s.r, 0), 0);
      el2('cbody').innerHTML = `<div class="cdone"><div class="cdbig">💪</div><h2>${early ? 'Saved' : 'Workout complete'}</h2><p class="sub">${esc(w.name)} · ${fmtMins(dur)}</p>
        <div class="stats"><div class="stat"><div class="k">Sets</div><div class="v">${sets}</div></div><div class="stat"><div class="k">Lifted</div><div class="v sm">${vol ? Math.round(S.unit === 'lb' ? vol * KG_LB : vol).toLocaleString() + ' ' + wUnit() : '—'}</div></div></div>
        ${prs.length ? `<div class="prs">🏆 <b>New personal record${prs.length > 1 ? 's' : ''}</b><br>${prs.map(esc).join('<br>')}</div>` : ''}
        <div class="sect" style="justify-content:center">How did it feel?</div><div class="feel">${FEEL.map((f, i) => `<button data-f="${i + 1}" aria-label="${f.t}">${f.e}</button>`).join('')}</div>
        <button class="btn primary" data-a="close" style="margin-top:16px">Done</button></div>`;
      scr.querySelector('.cctl').style.display = 'none'; el2('cbar').style.width = '100%';
      scr.addEventListener('click', e => { const f = e.target.closest('[data-f]'); if (f) { entry.feel = +f.dataset.f; saveLog(); $$('[data-f]', scr).forEach(x => x.classList.toggle('on', x === f)); } });
      if (typeof pushWidget === 'function') pushWidget();
    }
    scr.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      switch (b.dataset.a) {
        case 'x': return stop();
        case 'close': close(); if (currentTab === 'today' || currentTab === 'calendar') rerenderKeepScroll(); return;
        case 'pp': return togglePause();
        case 'next': case 'skip': return advance(true);
        case 'done': return advance(true);
        case 'prev': return back();
        case 'plus': { const s = cur(); s.dur += 15000; return update(true); }
        case 'pace': { const order = ['slow', 'normal', 'fast']; S.repSpeed = order[(order.indexOf(S.repSpeed || 'normal') + 1) % 3]; saveSettings(); toast(`Rep speed: ${S.repSpeed}`); return; }
      }
    });
    Awake.on();
    render(); cue(cur());
  }

  return {
    byId: findW, listHtml, handleList, openDetail, openBuilder, play, importSheet, templates: tpls, decode, encode, get mine() { return mine; },
    set mine(v) { mine = Array.isArray(v) ? v : []; saveMine(); }, buildSteps, _suggest: suggest,
  };
})();
