/* Vyora: yoga & mobility poses, follow-along routines and pose drawings.
   Routines are normal interval timers, so they use the same run screen, voice and logging.
   Uses helpers from app.js (TEMPLATES, mk, iv, uid, esc, ic, sheet, totalOf, fmtShort, startTimer ...). */
'use strict';

const Yoga = (() => {
  /* ---------- poses ----------
     id: [name, figure, bothSides, focus, avoid, cue]
     avoid: k kneeling/knees, b lower back, s shoulders, w wrists */
  const P = {
    mountain: ['Mountain Reach', 'mountain', false, 'Posture, breathing', '', 'Stand tall and reach up long'],
    fold: ['Forward Fold', 'standfold', false, 'Hamstrings, back', 'b', 'Soft knees, let your head hang'],
    downdog: ['Down Dog', 'downdog', false, 'Hamstrings, calves, shoulders', 'sw', 'Hips high, press the floor away'],
    child: ["Child's Pose", 'child', false, 'Back, hips', 'k', 'Sink your hips to your heels and breathe'],
    catcow: ['Cat-Cow', 'catcow', false, 'Spine', 'kw', 'Arch and round slowly with your breath'],
    cobra: ['Cobra', 'cobra', false, 'Chest, spine', 'bw', 'Press up gently, shoulders down'],
    sphinx: ['Sphinx', 'sphinx', false, 'Lower back, chest', '', 'Forearms down, chest lifted, relax your legs'],
    lunge: ['Low Lunge', 'lunge', true, 'Hip flexors, quads', 'k', 'Back knee down, push hips gently forward'],
    lungetwist: ['Lunge Twist', 'lungetwist', true, 'Hips, upper back', 'k', 'Reach your top arm to the sky and look up'],
    warrior2: ['Warrior Two', 'warrior2', true, 'Legs, hips', 'k', 'Front knee over ankle, arms long'],
    triangle: ['Triangle', 'triangle', true, 'Side body, hamstrings', '', 'Long legs, reach and open your chest'],
    chair: ['Chair Pose', 'chair', false, 'Quads, glutes', 'k', 'Sit back, arms up, chest tall'],
    bridge: ['Bridge', 'bridge', false, 'Glutes, hip flexors', '', 'Press through your heels and lift your hips'],
    twist: ['Supine Twist', 'twist', true, 'Spine, glutes', '', 'Knees to one side, shoulders stay down'],
    happybaby: ['Happy Baby', 'happybaby', false, 'Hips, lower back', '', 'Hold your feet and gently rock'],
    pigeon: ['Pigeon', 'pigeon', true, 'Glutes, hips', 'k', 'Square your hips and breathe into the stretch'],
    fig4: ['Figure Four', 'fig4', true, 'Glutes, outer hip', '', 'Ankle over knee, pull the leg toward you'],
    seatfold: ['Seated Fold', 'seatfold', false, 'Hamstrings, back', 'b', 'Long spine, fold from the hips'],
    butterfly: ['Butterfly', 'butterfly', false, 'Inner thighs, hips', '', 'Soles together, let the knees fall open'],
    squat: ['Deep Squat Hold', 'deepsquat', false, 'Hips, ankles', 'k', 'Heels down, elbows push the knees out'],
    thread: ['Thread the Needle', 'thread', true, 'Upper back, shoulders', 'k', 'Slide the arm under and rest your shoulder'],
    openbook: ['Open Book', 'openbook', true, 'Upper back, chest', '', 'Knees stacked, open your top arm wide'],
    ninety: ['90/90 Hip Stretch', 'ninety', true, 'Hip rotation', '', 'Both knees at right angles, sit tall'],
    neck: ['Neck Stretch', 'neck', true, 'Neck, upper traps', '', 'Ear to shoulder, keep shoulders relaxed'],
    neckroll: ['Neck Rolls', 'neck', false, 'Neck', '', 'Slow half circles, chin to chest'],
    arms: ['Arm Circles', 'armcircle', false, 'Shoulders', 's', 'Big slow circles, both directions'],
    chest: ['Doorway Chest Stretch', 'chestwall', true, 'Chest, front shoulder', 's', 'Arm on the wall, turn away gently'],
    hamstring: ['Hamstring Stretch', 'hamsupine', true, 'Hamstrings', '', 'Leg up, use a towel, keep it straight'],
    legsup: ['Legs Up the Wall', 'legsup', false, 'Relaxation, legs', '', 'Legs up the wall, arms relaxed, slow breaths'],
    rest: ['Final Rest', 'savasana', false, 'Full relaxation', '', 'Lie still and let your whole body relax'],
    plank: ['Plank', 'plank', false, 'Core, shoulders', 'sw', 'Body in one line, squeeze your belly'],
    quad: ['Standing Quad Stretch', 'quadstand', true, 'Quads, hip flexors', 'k', 'Heel to glute, knees together'],
    calf: ['Wall Calf Stretch', 'calfwall', true, 'Calves, ankles', '', 'Back heel down, lean into the wall'],
    hips: ['Hip Circles', 'hipcircle', false, 'Hips, lower back', '', 'Hands on hips, slow big circles'],
    swing: ['Leg Swings', 'legswing', true, 'Hips, hamstrings', '', 'Hold a wall, swing front to back'],
  };

  /* ---------- routines ---------- */
  // step: [poseId, seconds]. Holds on both sides expand to Left / Right with a short switch.
  const R = [
    { id: 'y-morning', name: 'Morning Mobility', desc: 'Wake up your spine, hips and shoulders.', cat: 'Mobility', ease: 4,
      steps: [['neckroll', 30], ['arms', 30], ['catcow', 45], ['thread', 30], ['lungetwist', 30], ['downdog', 40], ['squat', 40], ['hips', 30], ['fold', 30], ['mountain', 20]] },
    { id: 'y-desk', name: 'Desk Relief', desc: 'Neck, shoulders and back after long sitting.', cat: 'Mobility', ease: 4,
      steps: [['neck', 30], ['arms', 30], ['chest', 30], ['thread', 30], ['catcow', 45], ['openbook', 30], ['fold', 30], ['mountain', 20]] },
    { id: 'y-back', name: 'Lower Back Relief', desc: 'Gentle moves to ease a stiff lower back.', cat: 'Mobility', ease: 5,
      steps: [['catcow', 60], ['child', 60], ['sphinx', 45], ['twist', 45], ['fig4', 45], ['bridge', 30], ['happybaby', 45], ['rest', 60]] },
    { id: 'y-hips', name: 'Hip Opener', desc: 'Long holds for tight hips and glutes.', cat: 'Yoga', ease: 5,
      steps: [['squat', 45], ['lunge', 45], ['ninety', 45], ['pigeon', 60], ['butterfly', 60], ['fig4', 45], ['happybaby', 45]] },
    { id: 'y-sun', name: 'Sun Salutation Flow', desc: 'Six slow rounds that move with your breath, then rest.', cat: 'Yoga', ease: 0,
      flow: { rounds: 6, steps: [['mountain', 8], ['fold', 8], ['plank', 8], ['cobra', 8], ['downdog', 15], ['fold', 8], ['mountain', 6]] },
      steps: [['child', 60], ['rest', 60]] },
    { id: 'y-post', name: 'Post-Workout Stretch', desc: 'Cool down legs, chest and back after training.', cat: 'Mobility', ease: 4,
      steps: [['quad', 30], ['hamstring', 30], ['calf', 30], ['chest', 30], ['child', 45], ['fig4', 30]] },
    { id: 'y-cool', name: 'Quick Cooldown', desc: 'Five calm minutes to finish a lifting session.', cat: 'Mobility', ease: 4,
      steps: [['child', 40], ['fig4', 30], ['hamstring', 30], ['chest', 25], ['rest', 30]] },
    { id: 'y-bed', name: 'Bedtime Yoga', desc: 'Slow, quiet poses to help you switch off.', cat: 'Yoga', ease: 5,
      steps: [['child', 60], ['catcow', 45], ['seatfold', 60], ['butterfly', 60], ['twist', 45], ['happybaby', 45], ['legsup', 120], ['rest', 90]] },
    { id: 'y-full', name: 'Full Body Yoga', desc: 'Standing poses, hips and a long rest. About 25 minutes.', cat: 'Yoga', ease: 5,
      flow: { rounds: 3, steps: [['mountain', 8], ['fold', 8], ['plank', 8], ['cobra', 8], ['downdog', 15], ['fold', 8], ['mountain', 6]] },
      steps: [['warrior2', 45], ['triangle', 40], ['chair', 30], ['lunge', 40], ['pigeon', 60], ['seatfold', 60], ['bridge', 40], ['twist', 45], ['rest', 120]] },
    { id: 'y-legwarm', name: 'Leg Day Warm-up', desc: 'Open your hips and ankles before squats.', cat: 'Mobility', ease: 3,
      steps: [['swing', 30], ['hips', 30], ['squat', 40], ['lungetwist', 30], ['bridge', 30], ['calf', 20]] },
    { id: 'y-upperwarm', name: 'Upper Body Warm-up', desc: 'Loosen shoulders and upper back before pressing.', cat: 'Mobility', ease: 3,
      steps: [['arms', 40], ['thread', 30], ['openbook', 30], ['chest', 30], ['catcow', 30]] },
  ];

  const FLOW = 'flow', EASE = 'ease';
  function intervals(steps, easeSecs) {
    const out = [];
    steps.forEach(([id, secs], i) => {
      const p = P[id];
      const next = () => { if (easeSecs && i < steps.length - 1) { const n = P[steps[i + 1][0]]; out.push(Object.assign(iv('Next: ' + n[0], EASE, easeSecs), { pose: steps[i + 1][0] })); } };
      if (p[2]) {
        out.push(Object.assign(iv(p[0] + ' · Left', FLOW, secs), { pose: id }));
        out.push(Object.assign(iv('Switch sides', EASE, Math.max(3, easeSecs || 4)), { pose: id }));
        out.push(Object.assign(iv(p[0] + ' · Right', FLOW, secs), { pose: id }));
      } else out.push(Object.assign(iv(p[0], FLOW, secs), { pose: id }));
      next();
    });
    return out;
  }
  function toTimer(r) {
    const sets = [];
    if (r.flow) sets.push({ id: 's1', intervals: intervals(r.flow.steps, 0), rounds: r.flow.rounds });
    sets.push({ id: 's2', intervals: intervals(r.steps, r.ease), rounds: 1 });
    return mk({ id: r.id, name: r.name, desc: r.desc, color: '#9D8CFF', prepare: 10, sets, cycles: 1, cycleRest: 0, cat: r.cat, yoga: true });
  }
  const TIMERS = R.map(toTimer);
  TEMPLATES.splice(1, 0, { group: 'Yoga & Mobility', items: TIMERS });

  const poseIds = r => [...new Set([...(r.flow ? r.flow.steps : []), ...r.steps].map(s => s[0]))];
  const conflicts = (r, avoid) => poseIds(r).filter(id => [...P[id][4]].some(c => avoid.includes(c)));

  /* ---------- drawings ---------- */
  // Each figure: head [x, y], lines [[x1, y1, x2, y2] ...], optional extras (svg string). viewBox 120 x 96, floor at y = 88.
  const L = a => a.map(([a1, b1, a2, b2]) => `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}"/>`).join('');
  const FLOOR = '<line class="bn" x1="8" y1="89" x2="112" y2="89"/>';
  const F = {
    mountain: [[60, 14], [[60, 21, 60, 52], [60, 52, 55, 87], [60, 52, 65, 87], [60, 26, 53, 4], [60, 26, 67, 4]], FLOOR],
    standfold: [[70, 76], [[60, 44, 58, 87], [60, 44, 62, 87], [60, 44, 68, 68], [66, 60, 70, 86]], FLOOR],
    downdog: [[38, 70], [[60, 28, 34, 62], [34, 62, 26, 87], [60, 28, 94, 87]], FLOOR],
    child: [[42, 80], [[88, 74, 64, 86], [64, 86, 96, 86], [88, 74, 50, 80], [52, 80, 20, 86]], FLOOR],
    catcow: [[26, 56], [[34, 58, 56, 46], [56, 46, 80, 58], [34, 58, 34, 87], [80, 58, 80, 87], [80, 87, 100, 87]], FLOOR],
    cobra: [[34, 50], [[100, 87, 62, 84], [62, 84, 40, 60], [40, 62, 40, 87]], FLOOR],
    sphinx: [[36, 60], [[100, 87, 64, 85], [64, 85, 42, 70], [42, 70, 42, 86], [42, 86, 60, 86]], FLOOR],
    lunge: [[64, 26], [[64, 34, 64, 64], [64, 64, 40, 64], [40, 64, 40, 87], [64, 64, 88, 87], [88, 87, 106, 87], [64, 38, 58, 14], [64, 38, 70, 14]], FLOOR],
    lungetwist: [[60, 30], [[62, 38, 64, 64], [64, 64, 40, 64], [40, 64, 40, 87], [64, 64, 88, 87], [88, 87, 106, 87], [62, 42, 52, 87], [62, 42, 74, 10]], FLOOR],
    warrior2: [[60, 22], [[60, 29, 60, 58], [60, 58, 36, 64], [36, 64, 30, 87], [60, 58, 98, 87], [60, 34, 26, 34], [60, 34, 94, 34]], FLOOR],
    triangle: [[30, 40], [[60, 54, 30, 87], [60, 54, 96, 87], [60, 54, 38, 44], [40, 46, 36, 74], [40, 46, 46, 8]], FLOOR],
    chair: [[54, 20], [[58, 28, 70, 56], [70, 56, 50, 62], [50, 62, 54, 87], [58, 32, 40, 8], [58, 32, 46, 6]], FLOOR],
    bridge: [[18, 82], [[24, 84, 60, 58], [60, 58, 80, 64], [80, 64, 82, 87], [30, 84, 44, 87]], FLOOR],
    twist: [[16, 82], [[24, 84, 68, 84], [68, 84, 86, 68], [86, 68, 100, 82], [34, 84, 22, 64]], FLOOR],
    happybaby: [[20, 82], [[28, 84, 64, 84], [64, 84, 74, 62], [74, 62, 92, 50], [36, 82, 88, 52]], FLOOR],
    pigeon: [[56, 34], [[58, 42, 60, 76], [60, 76, 36, 86], [36, 86, 60, 86], [60, 76, 106, 87], [58, 48, 46, 87]], FLOOR],
    fig4: [[14, 82], [[22, 84, 58, 84], [58, 84, 74, 60], [74, 60, 92, 70], [64, 70, 86, 52], [30, 82, 70, 62]], FLOOR],
    seatfold: [[88, 62], [[48, 86, 104, 86], [48, 84, 82, 64], [76, 68, 100, 82]], FLOOR],
    butterfly: [[60, 42], [[60, 50, 60, 82], [60, 84, 38, 74], [38, 74, 58, 86], [60, 84, 82, 74], [82, 74, 62, 86], [60, 56, 56, 84]], FLOOR],
    deepsquat: [[56, 34], [[58, 42, 66, 74], [66, 74, 44, 60], [44, 60, 52, 87], [60, 48, 46, 60], [60, 48, 54, 58]], FLOOR],
    thread: [[34, 82], [[44, 76, 82, 58], [82, 58, 82, 87], [82, 87, 100, 87], [56, 70, 56, 87], [44, 78, 72, 86]], FLOOR],
    openbook: [[18, 78], [[26, 80, 62, 80], [62, 80, 76, 66], [76, 66, 92, 80], [30, 80, 52, 74], [30, 76, 26, 50]], FLOOR],
    ninety: [[60, 42], [[60, 50, 60, 82], [60, 84, 38, 80], [38, 80, 32, 87], [60, 84, 86, 82], [86, 82, 96, 70], [60, 56, 48, 84], [60, 56, 72, 84]], FLOOR],
    neck: [[66, 16], [[60, 26, 60, 56], [60, 56, 55, 87], [60, 56, 65, 87], [60, 30, 74, 12], [60, 30, 52, 54]], FLOOR],
    armcircle: [[60, 18], [[60, 25, 60, 56], [60, 56, 55, 87], [60, 56, 65, 87], [60, 30, 34, 30], [60, 30, 86, 30]], FLOOR + '<path class="arr" d="M30 20a10 10 0 1 0 8 4M90 20a10 10 0 1 1-8 4"/>'],
    chestwall: [[60, 18], [[60, 25, 62, 56], [62, 56, 56, 87], [62, 56, 74, 87], [60, 30, 32, 22], [60, 30, 68, 52]], FLOOR + '<line class="bn" x1="28" y1="4" x2="28" y2="89"/>'],
    hamsupine: [[14, 82], [[22, 84, 60, 84], [60, 84, 104, 86], [60, 84, 80, 30], [32, 82, 50, 60]], FLOOR + '<line class="arr" x1="50" y1="60" x2="80" y2="30"/>'],
    legsup: [[22, 82], [[30, 84, 80, 84], [82, 82, 84, 28], [40, 84, 52, 88]], FLOOR + '<line class="bn" x1="90" y1="10" x2="90" y2="89"/>'],
    savasana: [[22, 82], [[30, 84, 74, 84], [74, 84, 106, 86], [40, 84, 60, 88]], FLOOR],
    plank: [[22, 56], [[28, 60, 92, 66], [34, 62, 34, 87], [92, 66, 96, 87]], FLOOR],
    quadstand: [[60, 14], [[60, 21, 60, 52], [60, 52, 60, 87], [60, 52, 62, 72], [62, 72, 76, 54], [60, 26, 76, 54], [60, 26, 52, 48]], FLOOR],
    calfwall: [[40, 26], [[44, 34, 66, 60], [66, 60, 50, 70], [50, 70, 50, 87], [66, 60, 102, 87], [44, 36, 26, 40]], FLOOR + '<line class="bn" x1="22" y1="4" x2="22" y2="89"/>'],
    hipcircle: [[60, 14], [[60, 21, 60, 52], [60, 52, 54, 87], [60, 52, 66, 87], [60, 26, 50, 40], [50, 40, 58, 50], [60, 26, 70, 40], [70, 40, 62, 50]], FLOOR + '<ellipse class="arr" cx="60" cy="52" rx="20" ry="6"/>'],
    legswing: [[56, 14], [[56, 21, 56, 52], [56, 52, 56, 87], [56, 52, 82, 70], [56, 26, 40, 38], [40, 38, 34, 30]], FLOOR + '<path class="arr" d="M86 58a30 30 0 0 1 4 28"/><line class="bn" x1="30" y1="10" x2="30" y2="89"/>'],
  };
  function figure(poseId) {
    if (typeof Moves !== 'undefined') return Moves.svgFor('Y:' + (P[poseId] ? poseId : 'mountain'), { cls: 'fig yfig' });
    const p = P[poseId]; const f = F[p ? p[1] : 'mountain'] || F.mountain;
    return `<svg class="fig yfig" viewBox="0 0 120 96" aria-hidden="true"><g class="props">${f[2] || ''}</g><g class="body">${L(f[1])}<circle cx="${f[0][0]}" cy="${f[0][1]}" r="6.5"/></g></svg>`;
  }
  const cueFor = poseId => (P[poseId] ? P[poseId][5] : '');

  /* ---------- picker ---------- */
  function routineCard(t) {
    const r = R.find(x => x.id === t.id);
    const ids = poseIds(r).slice(0, 5);
    return `<button class="yroutine" data-y="${t.id}"><span class="yr-top"><b>${esc(t.name)}</b><span>${Math.round(totalOf(t) / 60)} min · ${esc(t.cat)}</span></span>
      <span class="yr-desc">${esc(t.desc)}</span>
      <span class="yr-figs">${ids.map(figure).join('')}</span></button>`;
  }
  function openPicker() {
    const s = sheet(`<h2>Yoga &amp; Mobility</h2><p class="sub">Follow along: the app names each pose, shows it and times the hold.</p>
      <div class="ylist">${TIMERS.map(routineCard).join('')}</div>`);
    if (typeof Moves !== 'undefined') Moves.mount(s.el);
    s.el.addEventListener('click', e => { const b = e.target.closest('[data-y]'); if (!b) return; s.close(); showRoutine(b.dataset.y); });
  }
  function showRoutine(id) {
    const t = TIMERS.find(x => x.id === id); const r = R.find(x => x.id === id);
    const list = [...(r.flow ? r.flow.steps.map(s => [...s, `× ${r.flow.rounds} rounds`]) : []), ...r.steps];
    const s = sheet(`<h2>${esc(t.name)}</h2><p class="sub">${Math.round(totalOf(t) / 60)} min · ${esc(t.desc)}</p>
      ${r.flow ? `<div class="sect" style="margin-top:4px">Flow · ${r.flow.rounds} rounds</div>` : ''}
      <div class="block" style="padding:0">${list.map(([pid, secs, tag], i) => `${r.flow && i === r.flow.steps.length ? '</div><div class="sect">Then</div><div class="block" style="padding:0">' : ''}
        <div class="exrow">${figure(pid)}<span class="en"><b>${esc(P[pid][0])}</b><span>${fmtShort(secs)}${P[pid][2] ? ' each side' : ''} · ${esc(P[pid][3])}</span></span></div>`).join('')}</div>
      <div class="btns"><button class="btn primary" data-a="go">${ic('play')}Start routine</button></div>`);
    if (typeof Moves !== 'undefined') Moves.mount(s.el);
    s.el.addEventListener('click', e => { if (e.target.closest('[data-a="go"]')) { s.close(); startTimer(t); } });
  }

  /* ---------- plans ---------- */
  // Rotation for the Mobility & Yoga program goal, gentlest first for beginners and older users.
  function planRoutines(a) {
    const avoid = [...(a.avoid || [])];
    const order = a.level === 0 || a.age === '65+' || a.age === '50-64'
      ? ['y-morning', 'y-back', 'y-hips', 'y-desk', 'y-bed', 'y-post', 'y-full']
      : ['y-sun', 'y-hips', 'y-morning', 'y-full', 'y-back', 'y-desk', 'y-bed'];
    const ok = order.filter(id => !conflicts(R.find(r => r.id === id), avoid).length);
    const rest = order.filter(id => !ok.includes(id)).sort((x, y) => conflicts(R.find(r => r.id === x), avoid).length - conflicts(R.find(r => r.id === y), avoid).length);
    return [...ok, ...rest].map(id => TIMERS.find(t => t.id === id));
  }
  function mobilityDay(a, n) {
    const pool = planRoutines(a).filter(t => ['y-hips', 'y-back', 'y-morning', 'y-full', 'y-desk'].includes(t.id));
    const t = pool[n % pool.length];
    return { type: 'timer', ref: t.id, name: t.name };
  }

  return { poses: P, figure, cueFor, openPicker, showRoutine, planRoutines, mobilityDay, timers: TIMERS, isYoga: t => !!(t && t.yoga) };
})();
