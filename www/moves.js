/* Vyora: animated exercise library.
   Every exercise is a jointed figure posed with angles and blended between keyframes.
   The worked muscles glow, equipment is drawn in the hands, and feet stay on the floor.
   Uses helpers from app.js ($, $$, el, esc, ic, sheet, S, isNative) and Program._EX for the gym library. */
'use strict';

const Moves = (() => {
  /* ---------- body model ---------- */
  const L = { T: 28, UA: 14, FA: 13, TH: 17, SH: 17, FT: 6, HR: 6 };
  const GROUND = 108;
  const BASE = { t: 0, a1: 4, f1: 8, a2: -4, f2: 4, l1: 2, s1: 0, l2: -2, s2: 0, ft: 0, lift: 0, h: 0, b: 0 };
  const R = d => d * Math.PI / 180;
  const V = (a, len) => [Math.sin(R(a)) * len, Math.cos(R(a)) * len];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];

  // Joint positions with the hip at (0, 0). Angles: torso from straight up, limbs from straight down; positive = toward the way the figure faces.
  function joints(p, front) {
    const td = [Math.sin(R(p.t)), -Math.cos(R(p.t))];
    const perp = [-td[1], td[0]];
    const sh = [td[0] * L.T, td[1] * L.T];
    const hd = [Math.sin(R(p.t + p.h)), -Math.cos(R(p.t + p.h))];
    const J = { hip: [0, 0], sh, head: [sh[0] + hd[0] * 9.5, sh[1] + hd[1] * 9.5] };
    const limb = (base, a, f, side, n1, n2) => {
      const A = front && side < 0 ? -a : a, F = front && side < 0 ? -f : f;
      const e = add(base, V(A, n1)); return [base, e, add(e, V(F, n2))];
    };
    const sb1 = front ? add(sh, [perp[0] * 7, perp[1] * 7]) : sh, sb2 = front ? add(sh, [-perp[0] * 7, -perp[1] * 7]) : sh;
    const hb1 = front ? [4.5, 0] : [0, 0], hb2 = front ? [-4.5, 0] : [0, 0];
    [J.s1, J.e1, J.w1] = limb(sb1, p.a1, p.f1, 1, L.UA, L.FA);
    [J.s2, J.e2, J.w2] = limb(sb2, p.a2, p.f2, -1, L.UA, L.FA);
    [J.h1, J.k1, J.n1] = limb(hb1, p.l1, p.s1, 1, L.TH, L.SH);
    [J.h2, J.k2, J.n2] = limb(hb2, p.l2, p.s2, -1, L.TH, L.SH);
    const foot = (ank, s, side) => {
      if (front) return add(ank, [side * 4, 1]);
      if (Math.abs(s) <= 60) { const a = R(-p.ft); return add(ank, [Math.cos(a) * L.FT, -Math.sin(a) * L.FT]); }
      return add(ank, [Math.cos(R(s)) * L.FT, -Math.sin(R(s)) * L.FT]);
    };
    J.t1 = foot(J.n1, p.s1, 1); J.t2 = foot(J.n2, p.s2, -1);
    return J;
  }
  const BODY_PTS = ['hip', 'sh', 'e1', 'e2', 'w1', 'w2', 'k1', 'k2', 'n1', 'n2', 't1', 't2'];
  function lowest(J) { let m = J.head[1] + L.HR; BODY_PTS.forEach(k => { if (J[k][1] > m) m = J[k][1]; }); return m; }
  function anchorPt(J, ax) {
    if (ax === 'feet') return [(J.n1[0] + J.n2[0]) / 2, (J.n1[1] + J.n2[1]) / 2];
    if (ax === 'hands') return [(J.w1[0] + J.w2[0]) / 2, (J.w1[1] + J.w2[1]) / 2];
    if (ax === 'ankle1') return J.n1;
    if (ax === 'knee1') return J.k1;
    return J[ax] || J.hip;
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  function mix(p, q, k) { const o = {}; for (const key in BASE) o[key] = lerp(p[key], q[key], k); return o; }

  /* ---------- motion patterns ---------- */
  const ARMS = {
    side: { a1: 4, f1: 8, a2: -4, f2: 4 }, down: { a1: 0, f1: 0, a2: 0, f2: 0 }, forward: { a1: 86, f1: 90, a2: 86, f2: 90 },
    back: { a1: -62, f1: 158, a2: -62, f2: 158 }, front: { a1: 82, f1: 200, a2: 82, f2: 200 }, goblet: { a1: 22, f1: 168, a2: 22, f2: 168 },
    shoulders: { a1: 28, f1: 172, a2: 28, f2: 172 }, chest: { a1: 35, f1: 150, a2: 35, f2: 150 }, head: { a1: 150, f1: 290, a2: 150, f2: 290 },
  };
  const P = o => o; // readability
  const PUSHUP_TOP = { t: 70, l1: -70, s1: -70, l2: -70, s2: -70, a1: 0, f1: 0, a2: 0, f2: 0 };
  const PUSHUP_LOW = { t: 80, l1: -80, s1: -80, l2: -80, s2: -80, a1: -55, f1: 48, a2: -55, f2: 48 };
  const SEATED = { l1: 86, s1: 0, l2: 86, s2: 0 };
  const LYING = { t: -90, l1: 58, s1: 0, l2: 58, s2: 0 };
  const ARCH = {
    squat: { kf: [P({}), P({ t: 38, l1: 88, s1: -32, l2: 88, s2: -32 })], dur: 3000, arms: 'forward' },
    deadlift: { kf: [P({ a1: 0, f1: 0, a2: 0, f2: 0 }), P({ t: 62, l1: 55, s1: -22, l2: 55, s2: -22, a1: 0, f1: 0, a2: 0, f2: 0 })], dur: 3200, start: 1 },
    hinge: { kf: [P({ a1: 2, f1: 2, a2: 2, f2: 2 }), P({ t: 80, l1: 12, s1: -6, l2: 12, s2: -6, a1: 0, f1: 0, a2: 0, f2: 0 })], dur: 3000 },
    swing: { kf: [P({ t: 62, l1: 30, s1: -14, l2: 30, s2: -14, a1: -18, f1: -24, a2: -18, f2: -24 }), P({ a1: 88, f1: 90, a2: 88, f2: 90 })], dur: 1500 },
    bridge: { kf: [P({ b: -1, t: -90, l1: 128, s1: -8, l2: 128, s2: -8, a1: 90, f1: 90, a2: 90, f2: 90 }), P({ b: -3, t: -106, l1: 100, s1: -4, l2: 100, s2: -4, a1: 100, f1: 100, a2: 100, f2: 100 })], dur: 2600 },
    hipthrust: { kf: [P({ t: -69, l1: 123, s1: 16, l2: 123, s2: 16, a1: 110, f1: 110, a2: 110, f2: 110 }), P({ t: -90, l1: 90, s1: 0, l2: 90, s2: 0, a1: 90, f1: 90, a2: 90, f2: 90 })], dur: 2600, ax: 'sh', ay: 'pin', props: ['benchShoulder'] },
    backext: { kf: [P({ t: 150, l1: -50, s1: -50, l2: -50, s2: -50, a1: 150, f1: 300, a2: 150, f2: 300 }), P({ t: 52, l1: -50, s1: -50, l2: -50, s2: -50, a1: 60, f1: 200, a2: 60, f2: 200 })], dur: 2600, ax: 'hip', ay: 'pin', props: ['pad'] },
    lunge: { kf: [P({ l1: 22, s1: 0, l2: -20, s2: -30 }), P({ t: 4, l1: 75, s1: 0, l2: 0, s2: -95 })], dur: 2800, arms: 'side' },
    latlunge: { view: 'front', kf: [P({ l1: 18, s1: 18, l2: 18, s2: 18 }), P({ t: 8, l1: 72, s1: -18, l2: 36, s2: 36 })], dur: 2800, arms: 'goblet' },
    stepup: { kf: [P({ l1: 75, s1: -5, l2: -5, s2: 0, a1: 10, f1: 10, a2: -10, f2: -6 }), P({ l1: 0, s1: 0, l2: 70, s2: -8, a1: -14, f1: -6, a2: 20, f2: 30 })], dur: 2800, ax: 'ankle1', ay: 'pin', props: ['box'] },
    jump: { kf: [P({ t: 34, l1: 80, s1: -32, l2: 80, s2: -32, a1: -40, f1: -40, a2: -40, f2: -40 }), P({ lift: 12, a1: 170, f1: 175, a2: 170, f2: 175, ft: -40 })], dur: 1500 },
    bench: { kf: [P({ ...LYING, a1: 176, f1: 180, a2: 176, f2: 180 }), P({ ...LYING, a1: 40, f1: 175, a2: 40, f2: 175 })], dur: 2800, ax: 'sh', ay: 'pin', props: ['bench'] },
    incline: { kf: [P({ t: -55, l1: 70, s1: 0, l2: 70, s2: 0, a1: 150, f1: 152, a2: 150, f2: 152 }), P({ t: -55, l1: 70, s1: 0, l2: 70, s2: 0, a1: 10, f1: 160, a2: 10, f2: 160 })], dur: 2800, ax: 'hip', ay: 'pin', props: ['incline'] },
    floorpress: { kf: [P({ t: -90, l1: 128, s1: -8, l2: 128, s2: -8, a1: 178, f1: 180, a2: 178, f2: 180 }), P({ t: -90, l1: 128, s1: -8, l2: 128, s2: -8, a1: 90, f1: 178, a2: 90, f2: 178 })], dur: 2600 },
    seatpress: { kf: [P({ ...SEATED, a1: -40, f1: 90, a2: -40, f2: 90 }), P({ ...SEATED, a1: 86, f1: 90, a2: 86, f2: 90 })], dur: 2600, ax: 'hip', ay: 'pin', props: ['seat'], start: 0 },
    standpress: { kf: [P({ a1: -40, f1: 90, a2: -40, f2: 90 }), P({ a1: 86, f1: 90, a2: 86, f2: 90 })], dur: 2600 },
    pushup: { kf: [P(PUSHUP_TOP), P(PUSHUP_LOW)], dur: 2400 },
    inclinepush: { kf: [P({ t: 52, l1: -52, s1: -52, l2: -52, s2: -52, a1: 10, f1: 10, a2: 10, f2: 10 }), P({ t: 60, l1: -60, s1: -60, l2: -60, s2: -60, a1: -55, f1: 50, a2: -55, f2: 50 })], dur: 2400, ax: 'feet', props: ['boxHands'] },
    pike: { kf: [P({ t: 128, l1: -46, s1: -46, l2: -46, s2: -46, a1: 52, f1: 52, a2: 52, f2: 52 }), P({ t: 150, l1: -40, s1: -40, l2: -40, s2: -40, a1: -10, f1: 70, a2: -10, f2: 70 })], dur: 2600 },
    dips: { kf: [P({ t: 4, l1: 14, s1: -60, l2: 14, s2: -60, a1: 0, f1: 0, a2: 0, f2: 0 }), P({ t: 18, l1: 24, s1: -55, l2: 24, s2: -55, a1: -72, f1: 12, a2: -72, f2: 12 })], dur: 2600, ax: 'hands', ay: 'pin', props: ['dipbars'] },
    benchdip: { kf: [P({ t: 0, l1: 86, s1: 10, l2: 86, s2: 10, a1: -14, f1: -14, a2: -14, f2: -14 }), P({ t: 2, l1: 70, s1: 20, l2: 70, s2: 20, a1: -78, f1: -2, a2: -78, f2: -2 })], dur: 2400, ax: 'hands', ay: 'pin', props: ['benchHands'] },
    ohp: { kf: [P({ a1: 28, f1: 172, a2: 28, f2: 172 }), P({ a1: 176, f1: 180, a2: 176, f2: 180 })], dur: 2600, start: 0 },
    seatohp: { kf: [P({ ...SEATED, a1: 28, f1: 172, a2: 28, f2: 172 }), P({ ...SEATED, a1: 176, f1: 180, a2: 176, f2: 180 })], dur: 2600, ax: 'hip', ay: 'pin', props: ['seat'] },
    pushpress: { kf: [P({ t: 6, l1: 18, s1: -10, l2: 18, s2: -10, a1: 28, f1: 172, a2: 28, f2: 172 }), P({ a1: 176, f1: 180, a2: 176, f2: 180, ft: -15 })], dur: 1600 },
    thruster: { kf: [P({ t: 32, l1: 88, s1: -32, l2: 88, s2: -32, a1: 28, f1: 172, a2: 28, f2: 172 }), P({ a1: 176, f1: 180, a2: 176, f2: 180 })], dur: 2200 },
    row: { kf: [P({ t: 72, l1: 16, s1: -8, l2: 16, s2: -8, a1: 0, f1: 0, a2: 0, f2: 0 }), P({ t: 72, l1: 16, s1: -8, l2: 16, s2: -8, a1: -72, f1: 8, a2: -72, f2: 8 })], dur: 2400 },
    row1: { kf: [P({ t: 80, l1: 18, s1: -8, l2: -10, s2: -10, a1: 0, f1: 0, a2: 14, f2: 14 }), P({ t: 80, l1: 18, s1: -8, l2: -10, s2: -10, a1: -72, f1: 8, a2: 14, f2: 14 })], dur: 2400, props: ['benchHand2'] },
    renegade: { kf: [P(PUSHUP_TOP), P({ ...PUSHUP_TOP, a1: -74, f1: 10 })], dur: 2000 },
    seatrow: { kf: [P({ t: 12, l1: 82, s1: 82, l2: 82, s2: 82, a1: 88, f1: 90, a2: 88, f2: 90 }), P({ t: -6, l1: 82, s1: 82, l2: 82, s2: 82, a1: -42, f1: 96, a2: -42, f2: 96 })], dur: 2400, ax: 'hip', ay: 'pin', cable: 'front' },
    invrow: { kf: [P({ t: -72, l1: 72, s1: 72, l2: 72, s2: 72, a1: 180, f1: 180, a2: 180, f2: 180 }), P({ t: -60, l1: 60, s1: 60, l2: 60, s2: 60, a1: 150, f1: 215, a2: 150, f2: 215 })], dur: 2400, ax: 'hands', ay: 'pin', props: ['bar'] },
    pulldown: { kf: [P({ t: -6, ...SEATED, l1: 80, l2: 80, a1: 172, f1: 176, a2: 172, f2: 176 }), P({ t: -14, ...SEATED, l1: 80, l2: 80, a1: 18, f1: 168, a2: 18, f2: 168 })], dur: 2400, ax: 'hip', ay: 'pin', props: ['seat'], cable: 'top' },
    pullup: { view: 'front', kf: [P({ a1: 162, f1: 168, a2: 162, f2: 168, l1: 3, s1: 3, l2: 3, s2: 3 }), P({ a1: 104, f1: 178, a2: 104, f2: 178, l1: 3, s1: 3, l2: 3, s2: 3 })], dur: 2600, ax: 'hands', ay: 'bar', props: ['bar'] },
    facepull: { kf: [P({ a1: 86, f1: 90, a2: 86, f2: 90 }), P({ a1: -80, f1: 118, a2: -80, f2: 118 })], dur: 2200, cable: 'front' },
    curl: { kf: [P({ a1: -6, f1: -2, a2: -6, f2: -2 }), P({ a1: -2, f1: 148, a2: -2, f2: 148 })], dur: 2400 },
    pushdown: { kf: [P({ t: 8, a1: -8, f1: 150, a2: -8, f2: 150 }), P({ t: 8, a1: -8, f1: -4, a2: -8, f2: -4 })], dur: 2200, cable: 'high' },
    ohext: { kf: [P({ a1: 170, f1: 178, a2: 170, f2: 178 }), P({ a1: 172, f1: 345, a2: 172, f2: 345 })], dur: 2400, hold: 'D1' },
    skull: { kf: [P({ ...LYING, a1: 180, f1: 180, a2: 180, f2: 180 }), P({ ...LYING, a1: 196, f1: 276, a2: 196, f2: 276 })], dur: 2400, ax: 'sh', ay: 'pin', props: ['bench'] },
    latraise: { view: 'front', kf: [P({ a1: 8, f1: 12, a2: 8, f2: 12, l1: 4, s1: 4, l2: 4, s2: 4 }), P({ a1: 86, f1: 90, a2: 86, f2: 90, l1: 4, s1: 4, l2: 4, s2: 4 })], dur: 2400 },
    fly: { view: 'front', kf: [P({ a1: 82, f1: 90, a2: 82, f2: 90, l1: 4, s1: 4, l2: 4, s2: 4 }), P({ a1: 20, f1: -26, a2: 20, f2: -26, l1: 4, s1: 4, l2: 4, s2: 4 })], dur: 2400 },
    pullapart: { view: 'front', kf: [P({ a1: 72, f1: 48, a2: 72, f2: 48, l1: 4, s1: 4, l2: 4, s2: 4 }), P({ a1: 90, f1: 92, a2: 90, f2: 92, l1: 4, s1: 4, l2: 4, s2: 4 })], dur: 2000 },
    revfly: { kf: [P({ t: 76, l1: 14, s1: -6, l2: 14, s2: -6, a1: 4, f1: 4, a2: 4, f2: 4 }), P({ t: 76, l1: 14, s1: -6, l2: 14, s2: -6, a1: -62, f1: -66, a2: -62, f2: -66 })], dur: 2200 },
    proneY: { kf: [P({ t: 90, l1: -90, s1: -90, l2: -90, s2: -90, a1: 92, f1: 92, a2: 92, f2: 92 }), P({ t: 88, l1: -90, s1: -90, l2: -90, s2: -90, a1: 108, f1: 108, a2: 108, f2: 108 })], dur: 2200 },
    legext: { kf: [P({ ...SEATED, a1: 30, f1: 20, a2: 30, f2: 20 }), P({ ...SEATED, s1: 84, s2: 84, a1: 30, f1: 20, a2: 30, f2: 20 })], dur: 2200, ax: 'hip', ay: 'pin', props: ['seat'] },
    legcurl: { kf: [P({ t: 90, l1: -90, s1: -90, l2: -90, s2: -90, a1: 30, f1: 80, a2: 30, f2: 80 }), P({ t: 90, l1: -90, s1: -186, l2: -90, s2: -186, a1: 30, f1: 80, a2: 30, f2: 80 })], dur: 2200, ax: 'hip', ay: 'pin', props: ['bench'] },
    slidecurl: { kf: [P({ t: -100, l1: 80, s1: 72, l2: 80, s2: 72, a1: 92, f1: 92, a2: 92, f2: 92 }), P({ t: -106, l1: 112, s1: -6, l2: 112, s2: -6, a1: 100, f1: 100, a2: 100, f2: 100 })], dur: 2400 },
    nordic: { kf: [P({ t: 0, l1: 0, s1: -90, l2: 0, s2: -90, ...ARMS.chest }), P({ t: 58, l1: -58, s1: -90, l2: -58, s2: -90, a1: 80, f1: 120, a2: 80, f2: 120 })], dur: 3200, ax: 'knee1', ay: 'pin' },
    kickback: { kf: [P({ t: 20, l1: 0, s1: -8, a1: 60, f1: 70, a2: 60, f2: 70 }), P({ t: 22, l1: -42, s1: -54, a1: 60, f1: 70, a2: 60, f2: 70 })], dur: 2000, cable: 'low' },
    abduction: { view: 'front', kf: [P({ l1: 3, s1: 3, l2: 3, s2: 3, a1: 30, f1: 120, a2: 30, f2: 120 }), P({ l1: 36, s1: 36, l2: 3, s2: 3, a1: 30, f1: 120, a2: 30, f2: 120 })], dur: 2000 },
    calf: { kf: [P({ a1: 2, f1: 2, a2: 2, f2: 2 }), P({ a1: 2, f1: 2, a2: 2, f2: 2, ft: -42 })], dur: 1800 },
    wallsit: { kf: [P({ t: 0, l1: 90, s1: 0, l2: 90, s2: 0, a1: 4, f1: 4, a2: 4, f2: 4 }), P({ t: 0, l1: 90, s1: 0, l2: 90, s2: 0, a1: 6, f1: 6, a2: 6, f2: 6 })], dur: 3000, props: ['wall'], still: true },
    plank: { kf: [P({ t: 82.6, l1: -82.6, s1: -82.6, l2: -82.6, s2: -82.6, a1: 0, f1: 90, a2: 0, f2: 90 }), P({ t: 81.6, l1: -81.6, s1: -81.6, l2: -81.6, s2: -81.6, a1: 0, f1: 90, a2: 0, f2: 90 })], dur: 3000, still: true },
    sideplank: { view: 'front', kf: [P({ t: 72, l1: -72, s1: -72, l2: -76, s2: -76, a1: -18, f1: 72, a2: -150, f2: -150 }), P({ t: 70, l1: -70, s1: -70, l2: -74, s2: -74, a1: -18, f1: 72, a2: -150, f2: -150 })], dur: 3000, still: true },
    deadbug: { kf: [P({ t: -90, a1: 180, f1: 180, a2: 180, f2: 180, l1: 180, s1: 90, l2: 180, s2: 90 }), P({ t: -90, a1: 262, f1: 262, a2: 180, f2: 180, l1: 180, s1: 90, l2: 96, s2: 96 }), P({ t: -90, a1: 180, f1: 180, a2: 180, f2: 180, l1: 180, s1: 90, l2: 180, s2: 90 }), P({ t: -90, a1: 180, f1: 180, a2: 262, f2: 262, l1: 96, s1: 96, l2: 180, s2: 90 })], dur: 4400, per: 2 },
    birddog: { kf: [P({ t: 90, a1: 0, f1: 0, a2: 0, f2: 0, l1: 0, s1: -90, l2: 0, s2: -90 }), P({ t: 90, a1: 96, f1: 96, a2: 0, f2: 0, l1: 0, s1: -90, l2: -92, s2: -92 }), P({ t: 90, a1: 0, f1: 0, a2: 0, f2: 0, l1: 0, s1: -90, l2: 0, s2: -90 }), P({ t: 90, a1: 0, f1: 0, a2: 96, f2: 96, l1: -92, s1: -92, l2: 0, s2: -90 })], dur: 4400, per: 2 },
    crunch: { kf: [P({ b: 1, t: -90, l1: 130, s1: 40, l2: 130, s2: 40, a1: 118, f1: 118, a2: 118, f2: 118 }), P({ b: 5, t: -56, l1: 130, s1: 40, l2: 130, s2: 40, a1: 100, f1: 100, a2: 100, f2: 100 })], dur: 2000 },
    cablecrunch: { kf: [P({ b: 1, t: 14, l1: 0, s1: -90, l2: 0, s2: -90, ...ARMS.head }), P({ b: 5, t: 70, l1: -6, s1: -90, l2: -6, s2: -90, a1: 210, f1: 330, a2: 210, f2: 330 })], dur: 2200, ax: 'knee1', ay: 'pin', cable: 'high' },
    twist: { kf: [P({ t: -40, l1: 120, s1: 50, l2: 120, s2: 50, a1: 70, f1: 120, a2: 70, f2: 120 }), P({ t: -40, l1: 120, s1: 50, l2: 120, s2: 50, a1: 120, f1: 150, a2: 120, f2: 150 })], dur: 1400, per: 2, hold: 'D1' },
    legraise: { kf: [P({ t: -90, l1: 88, s1: 88, l2: 88, s2: 88, a1: 90, f1: 90, a2: 90, f2: 90 }), P({ t: -90, l1: 176, s1: 176, l2: 176, s2: 176, a1: 90, f1: 90, a2: 90, f2: 90 })], dur: 2400 },
    hangraise: { kf: [P({ a1: 180, f1: 180, a2: 180, f2: 180, l1: 2, s1: 2, l2: 2, s2: 2 }), P({ t: -8, a1: 172, f1: 176, a2: 172, f2: 176, l1: 92, s1: 20, l2: 92, s2: 20 })], dur: 2400, ax: 'hands', ay: 'bar', props: ['bar'] },
    bicycle: { kf: [P({ t: -70, ...ARMS.head, a1: 150, a2: 150, l1: 150, s1: 60, l2: 96, s2: 96 }), P({ t: -70, ...ARMS.head, a1: 150, a2: 150, l1: 96, s1: 96, l2: 150, s2: 60 })], dur: 1600, per: 2 },
    superman: { kf: [P({ b: 0, t: 90, a1: 90, f1: 90, a2: 90, f2: 90, l1: -90, s1: -90, l2: -90, s2: -90 }), P({ b: -5, t: 78, a1: 104, f1: 104, a2: 104, f2: 104, l1: -102, s1: -102, l2: -102, s2: -102 })], dur: 2400 },
    climber: { kf: [P({ ...PUSHUP_TOP, l1: 12, s1: -64 }), P({ ...PUSHUP_TOP, l2: 12, s2: -64 })], dur: 900, per: 2 },
    highknees: { kf: [P({ l1: 84, s1: 0, l2: -2, s2: -4, a1: -32, f1: 60, a2: 42, f2: 112, lift: 3 }), P({ l2: 84, s2: 0, l1: -2, s1: -4, a2: -32, f2: 60, a1: 42, f1: 112, lift: 3 })], dur: 700, per: 2 },
    jack: { view: 'front', kf: [P({ a1: 8, f1: 12, a2: 8, f2: 12, l1: 3, s1: 3, l2: 3, s2: 3 }), P({ a1: 164, f1: 172, a2: 164, f2: 172, l1: 22, s1: 22, l2: 22, s2: 22, lift: 4 })], dur: 900 },
    burpee: { kf: [P({ a1: 2, f1: 2, a2: 2, f2: 2 }), P({ t: 52, l1: 100, s1: -30, l2: 100, s2: -30, a1: 18, f1: 18, a2: 18, f2: 18 }), P(PUSHUP_TOP), P({ t: 52, l1: 100, s1: -30, l2: 100, s2: -30, a1: 18, f1: 18, a2: 18, f2: 18 }), P({ lift: 12, a1: 172, f1: 176, a2: 172, f2: 176, ft: -40 })], dur: 2600, ax: 'hip' },
    inchworm: { kf: [P({ a1: 2, f1: 2, a2: 2, f2: 2 }), P({ t: 150, l1: 4, s1: 2, l2: 4, s2: 2, a1: 0, f1: 0, a2: 0, f2: 0 }), P(PUSHUP_TOP), P({ t: 150, l1: 4, s1: 2, l2: 4, s2: 2, a1: 0, f1: 0, a2: 0, f2: 0 })], dur: 4600, ax: 'hip' },
    clean: { kf: [P({ t: 26, l1: 22, s1: -10, l2: 22, s2: -10, a1: -4, f1: -4, a2: -4, f2: -4 }), P({ t: -6, l1: -4, s1: -4, l2: -4, s2: -4, a1: 12, f1: 12, a2: 12, f2: 12, ft: -34 }), P({ t: 12, l1: 46, s1: -20, l2: 46, s2: -20, ...ARMS.front })], dur: 2400 },
    snatch: { kf: [P({ t: 66, l1: 32, s1: -16, l2: 32, s2: -16, a1: 0, f1: 0, a2: 24, f2: 24 }), P({ a1: 176, f1: 180, a2: 6, f2: 8 })], dur: 1800, hold: 'D11' },
    skater: { view: 'front', kf: [P({ t: -10, l1: 40, s1: -12, l2: -16, s2: 30, a1: -24, f1: -20, a2: 64, f2: 70 }), P({ t: 10, l2: 40, s2: -12, l1: -16, s1: 30, a2: -24, f2: -20, a1: 64, f1: 70 })], dur: 1300, per: 2, ax: 'hip' },
    carry: { kf: [P({ l1: 24, s1: -4, l2: -20, s2: -28, a1: 0, f1: 0, a2: 0, f2: 0 }), P({ l2: 24, s2: -4, l1: -20, s1: -28, a1: 0, f1: 0, a2: 0, f2: 0 })], dur: 1100, per: 2, ax: 'hip' },
    bear: { kf: [P({ t: 84, a1: 26, f1: 26, a2: -8, f2: -8, l1: 4, s1: -84, l2: 34, s2: -74 }), P({ t: 84, a2: 26, f2: 26, a1: -8, f1: -8, l2: 4, s2: -84, l1: 34, s1: -74 })], dur: 1400, per: 2, ax: 'hip' },
    armcircle: { view: 'front', kf: [P({ a1: 82, f1: 86, a2: 82, f2: 86, l1: 4, s1: 4, l2: 4, s2: 4 }), P({ a1: 96, f1: 104, a2: 96, f2: 104, l1: 4, s1: 4, l2: 4, s2: 4 }), P({ a1: 90, f1: 92, a2: 90, f2: 92, l1: 4, s1: 4, l2: 4, s2: 4 })], dur: 1100 },
    legswing: { kf: [P({ l1: -34, s1: -38, a1: 90, f1: 90, a2: 4, f2: 4 }), P({ l1: 70, s1: 62, a1: 90, f1: 90, a2: 4, f2: 4 })], dur: 1400, ax: 'ankle2' },
    // stretches (holds)
    quadstretch: { kf: [P({ l1: -8, s1: -168, a1: -30, f1: -24, a2: 90, f2: 92 }), P({ l1: -10, s1: -170, a1: -32, f1: -26, a2: 90, f2: 92 })], dur: 4000, still: true, ax: 'ankle2' },
    hamfold: { kf: [P({ b: 5, t: 148, l1: 4, s1: 2, l2: 4, s2: 2, a1: 0, f1: 0, a2: 0, f2: 0 }), P({ b: 6, t: 152, l1: 4, s1: 2, l2: 4, s2: 2, a1: -4, f1: -4, a2: -4, f2: -4 })], dur: 4000, still: true },
    chestopen: { kf: [P({ t: -4, a1: -56, f1: -62, a2: -56, f2: -62 }), P({ t: -6, a1: -60, f1: -66, a2: -60, f2: -66 })], dur: 4000, still: true },
    sidebend: { view: 'front', kf: [P({ t: -16, a1: 172, f1: 200, a2: 40, f2: 20, l1: 4, s1: 4, l2: 4, s2: 4 }), P({ t: -20, a1: 176, f1: 204, a2: 40, f2: 20, l1: 4, s1: 4, l2: 4, s2: 4 })], dur: 4000, still: true },
    child: { kf: [P({ b: 5, t: 104, h: -30, l1: 50, s1: -90, l2: 50, s2: -90, a1: 75, f1: 88, a2: 75, f2: 88 }), P({ b: 6, t: 107, h: -32, l1: 50, s1: -90, l2: 50, s2: -90, a1: 77, f1: 90, a2: 77, f2: 90 })], dur: 4000, still: true },
    cobra: { kf: [P({ b: -6, t: 52, l1: -90, s1: -90, l2: -90, s2: -90, a1: 8, f1: 2, a2: 8, f2: 2 }), P({ b: -7, t: 48, l1: -90, s1: -90, l2: -90, s2: -90, a1: 12, f1: 4, a2: 12, f2: 4 })], dur: 4000, still: true },
    hipflexor: { kf: [P({ t: -6, l1: 75, s1: 0, l2: -4, s2: -95, a1: 170, f1: 176, a2: 170, f2: 176 }), P({ t: -9, l1: 76, s1: 0, l2: -8, s2: -95, a1: 172, f1: 178, a2: 172, f2: 178 })], dur: 4000, still: true },
    // yoga & mobility poses: slow 8-second breath (4 in, 4 out)
    y_mountain: { kf: [P({ a1: 150, f1: 156, a2: 150, f2: 156 }), P({ a1: 178, f1: 182, a2: 178, f2: 182, ft: -8 })], dur: 8000 },
    y_fold: { kf: [P({ b: 5, t: 146, l1: 6, s1: 2, l2: 6, s2: 2, a1: 2, f1: 2, a2: 2, f2: 2 }), P({ b: 6, t: 154, l1: 4, s1: 2, l2: 4, s2: 2, a1: -4, f1: -6, a2: -4, f2: -6 })], dur: 8000 },
    y_downdog: { kf: [P({ b: -2, t: 133, l1: -38, s1: -38, l2: -38, s2: -38, a1: 47, f1: 47, a2: 47, f2: 47 }), P({ b: -2, t: 137, l1: -34, s1: -34, l2: -34, s2: -34, a1: 43, f1: 43, a2: 43, f2: 43 })], dur: 8000 },
    y_child: { kf: [P({ b: 5, t: 104, h: -30, l1: 50, s1: -90, l2: 50, s2: -90, a1: 75, f1: 88, a2: 75, f2: 88 }), P({ b: 6, t: 107, h: -32, l1: 50, s1: -90, l2: 50, s2: -90, a1: 77, f1: 90, a2: 77, f2: 90 })], dur: 8000 },
    y_catcow: { kf: [P({ b: -6, t: 86, h: -38, a1: 0, f1: 0, a2: 0, f2: 0, l1: 0, s1: -90, l2: 0, s2: -90 }), P({ b: 8, t: 97, h: 42, a1: 0, f1: 0, a2: 0, f2: 0, l1: 0, s1: -90, l2: 0, s2: -90 })], dur: 8000 },
    y_cobra: { kf: [P({ b: -5, t: 62, l1: -90, s1: -90, l2: -90, s2: -90, a1: 14, f1: 10, a2: 14, f2: 10 }), P({ b: -8, t: 48, h: -10, l1: -90, s1: -90, l2: -90, s2: -90, a1: 8, f1: 2, a2: 8, f2: 2 })], dur: 8000 },
    y_sphinx: { kf: [P({ b: -4, t: 72, l1: -90, s1: -90, l2: -90, s2: -90, a1: 0, f1: 90, a2: 0, f2: 90 }), P({ b: -5, t: 66, h: -8, l1: -90, s1: -90, l2: -90, s2: -90, a1: 0, f1: 90, a2: 0, f2: 90 })], dur: 8000 },
    y_lunge: { kf: [P({ t: -2, l1: 75, s1: 0, l2: -4, s2: -95, a1: 168, f1: 174, a2: 168, f2: 174 }), P({ t: -8, l1: 78, s1: 0, l2: -10, s2: -95, a1: 176, f1: 182, a2: 176, f2: 182 })], dur: 8000 },
    y_lungetwist: { kf: [P({ t: 4, l1: 75, s1: 0, l2: -4, s2: -95, a1: 172, f1: 176, a2: 20, f2: 14 }), P({ t: 0, l1: 77, s1: 0, l2: -6, s2: -95, a1: 182, f1: 186, a2: 16, f2: 10 })], dur: 8000 },
    y_warrior2: { view: 'front', kf: [P({ l1: 62, s1: -8, l2: 32, s2: 32, a1: 88, f1: 90, a2: 88, f2: 90 }), P({ l1: 68, s1: -10, l2: 34, s2: 34, a1: 92, f1: 92, a2: 92, f2: 92 })], dur: 8000 },
    y_triangle: { view: 'front', kf: [P({ t: -48, l1: 30, s1: 30, l2: 30, s2: 30, a1: 176, f1: 178, a2: -2, f2: -2 }), P({ t: -56, l1: 30, s1: 30, l2: 30, s2: 30, a1: 182, f1: 184, a2: -6, f2: -6 })], dur: 8000 },
    y_chair: { kf: [P({ t: 28, l1: 55, s1: -24, l2: 55, s2: -24, a1: 160, f1: 166, a2: 160, f2: 166 }), P({ t: 32, l1: 62, s1: -26, l2: 62, s2: -26, a1: 168, f1: 172, a2: 168, f2: 172 })], dur: 8000 },
    y_bridge: { kf: [P({ b: -2, t: -96, l1: 114, s1: -6, l2: 114, s2: -6, a1: 92, f1: 92, a2: 92, f2: 92 }), P({ b: -3, t: -106, l1: 100, s1: -4, l2: 100, s2: -4, a1: 100, f1: 100, a2: 100, f2: 100 })], dur: 8000 },
    y_twist: { kf: [P({ t: -90, l1: 140, s1: 50, l2: 130, s2: 40, a1: 180, f1: 182, a2: 92, f2: 92 }), P({ t: -90, l1: 128, s1: 40, l2: 120, s2: 30, a1: 184, f1: 186, a2: 92, f2: 92 })], dur: 8000 },
    y_happybaby: { kf: [P({ b: 3, t: -90, l1: 200, s1: 178, l2: 200, s2: 178, a1: 168, f1: 176, a2: 168, f2: 176 }), P({ b: 3, t: -90, l1: 206, s1: 182, l2: 206, s2: 182, a1: 172, f1: 180, a2: 172, f2: 180 })], dur: 8000 },
    y_pigeon: { kf: [P({ t: 4, l1: 82, s1: -82, l2: -88, s2: -88, a1: 8, f1: 8, a2: 8, f2: 8 }), P({ t: -4, h: -6, l1: 82, s1: -82, l2: -88, s2: -88, a1: 4, f1: 4, a2: 4, f2: 4 })], dur: 8000 },
    y_fig4: { kf: [P({ t: -90, l1: 112, s1: 92, l2: 130, s2: 40, a1: 120, f1: 120, a2: 120, f2: 120 }), P({ t: -90, l1: 120, s1: 96, l2: 136, s2: 46, a1: 126, f1: 126, a2: 126, f2: 126 })], dur: 8000 },
    y_seatfold: { kf: [P({ b: 4, t: 42, l1: 88, s1: 88, l2: 88, s2: 88, a1: 72, f1: 76, a2: 72, f2: 76 }), P({ b: 7, t: 62, h: 8, l1: 88, s1: 88, l2: 88, s2: 88, a1: 84, f1: 88, a2: 84, f2: 88 })], dur: 8000 },
    y_butterfly: { view: 'front', kf: [P({ l1: 76, s1: -70, l2: 76, s2: -70, a1: 10, f1: -14, a2: 10, f2: -14 }), P({ l1: 82, s1: -74, l2: 82, s2: -74, a1: 8, f1: -16, a2: 8, f2: -16 })], dur: 8000 },
    y_deepsquat: { kf: [P({ t: 26, l1: 108, s1: -34, l2: 108, s2: -34, a1: 40, f1: 150, a2: 40, f2: 150 }), P({ t: 22, l1: 112, s1: -36, l2: 112, s2: -36, a1: 42, f1: 152, a2: 42, f2: 152 })], dur: 8000 },
    y_thread: { kf: [P({ b: 3, t: 104, h: 30, a1: -64, f1: -70, a2: 0, f2: 0, l1: 0, s1: -90, l2: 0, s2: -90 }), P({ b: 4, t: 110, h: 34, a1: -70, f1: -76, a2: 6, f2: 6, l1: 0, s1: -90, l2: 0, s2: -90 })], dur: 8000 },
    y_openbook: { kf: [P({ t: -90, l1: 90, s1: 0, l2: 90, s2: 0, a1: 90, f1: 90, a2: 90, f2: 90 }), P({ t: -90, l1: 90, s1: 0, l2: 90, s2: 0, a1: 240, f1: 244, a2: 90, f2: 90 })], dur: 8000 },
    y_ninety: { view: 'front', kf: [P({ l1: 78, s1: -6, l2: 82, s2: 168, a1: 10, f1: 10, a2: 10, f2: 10 }), P({ t: 6, l1: 80, s1: -8, l2: 84, s2: 170, a1: 14, f1: 14, a2: 14, f2: 14 })], dur: 8000 },
    y_neck: { view: 'front', kf: [P({ h: -22, l1: 4, s1: 4, l2: 4, s2: 4, a1: 4, f1: 4, a2: 4, f2: 4 }), P({ h: -30, l1: 4, s1: 4, l2: 4, s2: 4, a1: 6, f1: 6, a2: 6, f2: 6 })], dur: 8000 },
    y_neckroll: { view: 'front', kf: [P({ h: -28, l1: 4, s1: 4, l2: 4, s2: 4, a1: 4, f1: 4, a2: 4, f2: 4 }), P({ h: 28, l1: 4, s1: 4, l2: 4, s2: 4, a1: 4, f1: 4, a2: 4, f2: 4 })], dur: 6000 },
    y_hamsupine: { kf: [P({ t: -90, l1: 170, s1: 170, l2: 88, s2: 88, a1: 150, f1: 158, a2: 150, f2: 158 }), P({ t: -90, l1: 178, s1: 178, l2: 88, s2: 88, a1: 156, f1: 164, a2: 156, f2: 164 })], dur: 8000 },
    y_legsup: { kf: [P({ t: -90, l1: 178, s1: 178, l2: 178, s2: 178, a1: 94, f1: 94, a2: 94, f2: 94 }), P({ t: -90, l1: 180, s1: 180, l2: 180, s2: 180, a1: 96, f1: 96, a2: 96, f2: 96 })], dur: 8000, props: ['wallLegs'] },
    y_rest: { kf: [P({ t: -90, l1: 88, s1: 88, l2: 88, s2: 88, a1: 96, f1: 96, a2: 96, f2: 96 }), P({ t: -91, l1: 88, s1: 88, l2: 88, s2: 88, a1: 97, f1: 97, a2: 97, f2: 97 })], dur: 8000 },
    y_plank: { kf: [P(PUSHUP_TOP), P({ ...PUSHUP_TOP, t: 71, l1: -71, s1: -71, l2: -71, s2: -71 })], dur: 8000 },
    y_calfwall: { kf: [P({ t: 30, l1: 28, s1: -8, l2: -26, s2: -26, a1: 70, f1: 78, a2: 70, f2: 78 }), P({ t: 34, l1: 34, s1: -12, l2: -28, s2: -28, a1: 74, f1: 82, a2: 74, f2: 82 })], dur: 8000, props: ['wallHands'] },
    y_hipcircle: { kf: [P({ t: -8, a1: -38, f1: 70, a2: -38, f2: 70, l1: 6, s1: 0, l2: 6, s2: 0 }), P({ t: 8, a1: -30, f1: 76, a2: -30, f2: 76, l1: -6, s1: 0, l2: -6, s2: 0 })], dur: 4000 },
  };


  /* ---------- muscles ---------- */
  const SEGS = { chest: 'up', back: 'up', core: 'low', lowback: 'low', shoulders: 'shd', biceps: 'ua', triceps: 'ua', forearms: 'fa', quads: 'th', hams: 'th', glutes: 'glu', calves: 'sh' };
  const MNAME = { chest: 'Chest', back: 'Back', core: 'Core', lowback: 'Lower back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', quads: 'Quads', hams: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', full: 'Full body', cardio: 'Heart & lungs' };
  const PAT_MUS = {
    squat: 'quads glutes core', hinge: 'hams glutes lowback', lunge: 'quads glutes', hpush: 'chest triceps shoulders', vpush: 'shoulders triceps', hpull: 'back biceps', vpull: 'back biceps',
    quad: 'quads', ham: 'hams', glute: 'glutes', calf: 'calves', chest: 'chest', sdelt: 'shoulders', rdelt: 'shoulders back', bi: 'biceps forearms', tri: 'triceps', core: 'core',
    power_l: 'quads glutes calves', power_u: 'chest shoulders triceps', carry: 'core forearms back', cond: 'full cardio', stretch: '',
  };

  /* ---------- library ---------- */
  // [name, arch, equipment (B barbell, D dumbbells, D1 one dumbbell, C cable, R band, M machine, P bar, W none), muscles, type, cues, options]
  // types: c compound, i isolation, k core reps, t timed hold, p power, x carry, h conditioning (timed), s stretch
  const EXTRA = [
    ['Jumping Jacks', 'jack', 'W', 'cardio calves shoulders', 'h', 'Land softly on the balls of your feet|Arms all the way up overhead|Keep a steady rhythm|Step side to side instead to make it low impact'],
    ['Burpee', 'burpee', 'W', 'full cardio', 'h', 'Squat, hands on the floor|Jump or step back to a plank|Bring feet back in|Jump up with arms overhead'],
    ['Mountain Climbers', 'climber', 'W', 'core shoulders cardio', 'h', 'High plank, hands under shoulders|Drive knees to chest one at a time|Hips stay low and level|Fast but controlled'],
    ['High Knees', 'highknees', 'W', 'cardio quads calves', 'h', 'Run on the spot|Knees up to hip height|Pump the arms|Stay on the balls of your feet'],
    ['Crunches', 'crunch', 'W', 'core', 'k', 'Knees bent, feet flat|Curl shoulders off the floor|Ribs toward hips, chin off chest|Lower slowly'],
    ['Russian Twist', 'twist', 'W', 'core', 'k', 'Sit back to about 45°|Feet up or heels down for easier|Rotate the chest side to side|Each side counts as one'],
    ['Lying Leg Raise', 'legraise', 'W', 'core', 'k', 'Lie flat, hands under hips|Lift straight legs to vertical|Lower slowly without arching|Bend knees to make it easier'],
    ['Bicycle Crunch', 'bicycle', 'W', 'core', 'k', 'Hands lightly behind the head|Elbow toward the opposite knee|Other leg reaches long|Slow and controlled'],
    ['Dumbbell Thruster', 'thruster', 'D', 'quads glutes shoulders cardio', 'c', 'Dumbbells at the shoulders|Squat down, chest up|Drive up and press overhead in one move|Lower to shoulders as you squat again'],
    ['Barbell Thruster', 'thruster', 'B', 'quads glutes shoulders cardio', 'c', 'Bar in the front rack, elbows high|Front squat down|Explode up and press overhead|Use a light bar for circuits'],
    ['Renegade Row', 'renegade', 'D', 'back core shoulders', 'c', 'High plank on two dumbbells, feet wide|Row one dumbbell to the hip|Hips stay square, no twisting|Alternate sides'],
    ['Dumbbell Snatch', 'snatch', 'D1', 'glutes hams shoulders cardio', 'p', 'Dumbbell between the feet, hinge down|Drive hips forward explosively|Pull the dumbbell up close to the body|Punch it overhead, switch hands each set'],
    ['Barbell Reverse Lunge', 'lunge', 'B', 'quads glutes', 'c', 'Bar on the upper back|Step back and lower the back knee|Front shin fairly upright|Drive back to standing'],
    ['Dumbbell Squat', 'squat', 'D', 'quads glutes', 'c', 'Dumbbells at your sides|Sit down between the hips|Chest up, back flat|Stand tall'],
    ['Dumbbell Deadlift', 'deadlift', 'D', 'hams glutes lowback back', 'c', 'Dumbbells beside the feet|Flat back, hips back|Push the floor away|Stand tall and squeeze glutes'],
    ['Superman', 'superman', 'W', 'lowback glutes back', 'k', 'Lie face down, arms forward|Lift arms, chest and legs together|Hold 1–2 seconds|Lower slowly'],
    ['Inchworm', 'inchworm', 'W', 'hams shoulders core', 'k', 'Fold forward, hands to the floor|Walk the hands out to a plank|Walk them back in|Keep legs as straight as comfortable'],
    ['Squat to Press', 'thruster', 'D', 'quads glutes shoulders', 'c', 'Dumbbells at shoulders|Squat down|Stand and press overhead|Smooth and steady'],
    ['Arm Circles', 'armcircle', 'W', 'shoulders', 'h', 'Arms straight out to the sides|Small circles, growing bigger|Switch direction halfway|Shoulders relaxed'],
    ['Leg Swings', 'legswing', 'W', 'hams glutes', 'h', 'Hold a wall for balance|Swing one leg forward and back|Grow the range slowly|Switch legs halfway'],
    ['Quad Stretch', 'quadstretch', 'W', 'quads', 's', 'Hold your foot behind you|Knees together, hips forward|Hold a wall if needed|Breathe slowly'],
    ['Hamstring Stretch', 'hamfold', 'W', 'hams lowback', 's', 'Soft knees, fold from the hips|Let the head and arms hang|Breathe into the stretch|Never bounce'],
    ['Chest Opener', 'chestopen', 'W', 'chest shoulders', 's', 'Clasp hands behind your back|Lift the chest and roll shoulders back|Gently raise the arms|Breathe slowly'],
    ['Side Bend Stretch', 'sidebend', 'W', 'core back', 's', 'Reach one arm overhead|Lean gently to the side|Keep hips steady|Switch sides halfway'],
    ["Child's Pose", 'child', 'W', 'back lowback', 's', 'Knees wide, sit back on the heels|Reach the arms long|Forehead toward the floor|Breathe into the back'],
    ['Cobra Stretch', 'cobra', 'W', 'core lowback', 's', 'Lie face down, hands under shoulders|Press up gently, hips stay down|Shoulders away from ears|Only go as high as comfortable'],
    ['Hip Flexor Stretch', 'hipflexor', 'W', 'quads glutes', 's', 'Kneel on one knee|Tuck the hips under and shift forward|Reach the arms up|Switch sides halfway'],
    ['Plank Shoulder Taps', 'renegade', 'W', 'core shoulders', 'k', 'High plank, feet wide|Tap the opposite shoulder|Hips stay still|Alternate sides'],
    ['Squat Jumps', 'jump', 'W', 'quads glutes calves cardio', 'h', 'Squat to about parallel|Jump up explosively|Land softly and sink into the next rep|Keep knees in line with toes'],
    ['Skater Jumps', 'skater', 'W', 'glutes quads cardio', 'h', 'Leap sideways onto one foot|Land soft, other leg swings behind|Stay low|Alternate sides'],
    ['Kettlebell Swing', 'swing', 'D1', 'glutes hams lowback cardio', 'p', 'Hinge and hike the weight back|Snap the hips forward|Arms just guide it|Stand tall at the top'],
    ['Barbell Shrug', 'deadlift', 'B', 'back forearms', 'i', 'Stand tall, bar at the thighs|Lift the shoulders to the ears|Pause, then lower|No rolling'],
  ];
  const ARCH_BY_NAME = [
    [/hip thrust/i, 'hipthrust'], [/glute bridge/i, 'bridge'], [/back extension/i, 'backext'], [/good morning|romanian/i, 'hinge'], [/deadlift/i, 'deadlift'],
    [/lateral lunge/i, 'latlunge'], [/lunge|split squat/i, 'lunge'], [/step-up/i, 'stepup'], [/jump squat|box jump|broad jump/i, 'jump'], [/swing/i, 'swing'],
    [/floor press/i, 'floorpress'], [/incline (bench|dumbbell) press/i, 'incline'], [/machine chest press/i, 'seatpress'], [/band chest press|pallof/i, 'standpress'], [/bench press/i, 'bench'],
    [/incline push-up/i, 'inclinepush'], [/pike/i, 'pike'], [/push-up|pushup/i, 'pushup'], [/bench dip/i, 'benchdip'], [/dips/i, 'dips'],
    [/push press/i, 'pushpress'], [/dumbbell shoulder press|machine shoulder press/i, 'seatohp'], [/overhead press|landmine/i, 'ohp'],
    [/seated cable row|band row|explosive row/i, 'seatrow'], [/single-arm dumbbell row|^dumbbell row/i, 'row1'], [/inverted row|towel door row/i, 'invrow'], [/row/i, 'row'],
    [/pulldown|assisted pull/i, 'pulldown'], [/pull-up|chin-up|negative pull/i, 'pullup'],
    [/leg extension/i, 'legext'], [/wall sit/i, 'wallsit'], [/sliding leg curl/i, 'slidecurl'], [/nordic/i, 'nordic'], [/leg curl/i, 'legcurl'], [/kickback/i, 'kickback'], [/abduction/i, 'abduction'],
    [/calf/i, 'calf'], [/fly|pec deck|crossover/i, 'fly'], [/lateral raise/i, 'latraise'], [/face pull/i, 'facepull'], [/reverse dumbbell fly/i, 'revfly'], [/pull-apart/i, 'pullapart'], [/prone y/i, 'proneY'],
    [/curl/i, 'curl'], [/pushdown/i, 'pushdown'], [/overhead tricep/i, 'ohext'], [/skull/i, 'skull'],
    [/side plank/i, 'sideplank'], [/plank/i, 'plank'], [/dead bug/i, 'deadbug'], [/hanging leg/i, 'hangraise'], [/cable crunch/i, 'cablecrunch'], [/bird dog/i, 'birddog'],
    [/power clean/i, 'clean'], [/lateral bound/i, 'skater'], [/carry/i, 'carry'], [/bear crawl/i, 'bear'],
    [/goblet squat|front squat|hack squat|leg press|box squat|squat/i, 'squat'],
  ];
  const PAT_ARCH = { squat: 'squat', hinge: 'hinge', lunge: 'lunge', hpush: 'bench', vpush: 'ohp', hpull: 'row', vpull: 'pulldown', quad: 'legext', ham: 'legcurl', glute: 'kickback', calf: 'calf', chest: 'fly', sdelt: 'latraise', rdelt: 'revfly', bi: 'curl', tri: 'pushdown', core: 'plank', power_l: 'jump', power_u: 'pushup', carry: 'carry' };
  const TYPE_DEF = {
    c: { sets: 3, reps: 10, rest: 90 }, i: { sets: 3, reps: 12, rest: 60 }, k: { sets: 3, reps: 12, rest: 45 }, t: { sets: 3, time: 30, rest: 45 },
    p: { sets: 4, reps: 5, rest: 90 }, x: { sets: 3, time: 40, rest: 60 }, h: { sets: 3, time: 40, rest: 20 }, s: { sets: 1, time: 30, rest: 5 },
  };
  const HEAVY = /^(squat|deadlift|bench press|overhead press|barbell row|front squat)$/i;
  let LIB = null;
  function build() {
    if (LIB) return LIB;
    LIB = new Map();
    const addMove = (name, arch, eq, mus, type, cues, pattern) => {
      const a = ARCH[arch] ? arch : 'squat';
      const def = Object.assign({}, TYPE_DEF[type] || TYPE_DEF.c);
      if (HEAVY.test(name)) { def.reps = 8; def.rest = 120; }
      if (/^(bodyweight squat|push-ups|glute bridge|crunches)$/i.test(name)) def.reps = 15;
      LIB.set(name.toLowerCase(), { name, arch: a, eq, muscles: mus.split(' ').filter(Boolean), type, cues: Array.isArray(cues) ? cues : String(cues).split('|'), pattern: pattern || '', def, per: ARCH[a].per || 1 });
    };
    const ex = (typeof Program !== 'undefined' && Program._EX) || [];
    ex.forEach(e => {
      const hit = ARCH_BY_NAME.find(([re]) => re.test(e.name));
      const arch = hit ? hit[1] : PAT_ARCH[e.pattern] || 'squat';
      let eq = e.eq.replace('N', '') || 'W';
      if (/goblet|single-arm|swing|overhead tricep/i.test(e.name)) eq = 'D1';
      const type = e.type === 'i' ? 'i' : e.type === 't' ? 't' : e.type === 'k' ? 'k' : e.type === 'p' ? 'p' : e.type === 'x' ? 'x' : 'c';
      addMove(e.name, arch, eq[0] === 'D' && eq !== 'D1' ? 'D' : eq === 'D1' ? 'D1' : eq[0], PAT_MUS[e.pattern] || 'full', type, e.cues, e.pattern);
    });
    EXTRA.forEach(([n, a, eq, m, t, c]) => { if (!LIB.has(n.toLowerCase())) addMove(n, a, eq, m, t, c, ''); });
    // Yoga & mobility poses from yoga.js, stored as "Y:<id>".
    if (typeof Yoga !== 'undefined' && Yoga.poses) {
      const YA = { mountain: 'y_mountain', fold: 'y_fold', downdog: 'y_downdog', child: 'y_child', catcow: 'y_catcow', cobra: 'y_cobra', sphinx: 'y_sphinx', lunge: 'y_lunge', lungetwist: 'y_lungetwist',
        warrior2: 'y_warrior2', triangle: 'y_triangle', chair: 'y_chair', bridge: 'y_bridge', twist: 'y_twist', happybaby: 'y_happybaby', pigeon: 'y_pigeon', fig4: 'y_fig4', seatfold: 'y_seatfold',
        butterfly: 'y_butterfly', squat: 'y_deepsquat', thread: 'y_thread', openbook: 'y_openbook', ninety: 'y_ninety', neck: 'y_neck', neckroll: 'y_neckroll', arms: 'armcircle', chest: 'chestopen',
        hamstring: 'y_hamsupine', legsup: 'y_legsup', rest: 'y_rest', plank: 'y_plank', quad: 'quadstretch', calf: 'y_calfwall', hips: 'y_hipcircle', swing: 'legswing' };
      const FOCUS = [[/hamstring/i, 'hams'], [/calves|calf|ankle/i, 'calves'], [/shoulder|neck|traps/i, 'shoulders'], [/lower back/i, 'lowback'], [/upper back|spine|\bback\b/i, 'back'], [/hip|glute|inner thigh/i, 'glutes'], [/quad|legs/i, 'quads'], [/chest/i, 'chest'], [/core|side body/i, 'core']];
      Object.entries(Yoga.poses).forEach(([id, p]) => {
        const mus = FOCUS.filter(([re]) => re.test(p[3])).map(x => x[1]);
        LIB.set(('y:' + id), { name: p[0], arch: YA[id] || 'y_mountain', eq: 'W', muscles: mus.length ? mus : ['full'], type: 's', cues: [p[5], 'Breathe in through your nose for four counts', 'Breathe out slowly for four counts', 'Ease off if anything pinches'], pattern: 'yoga', def: Object.assign({}, TYPE_DEF.s), per: 1, yoga: true });
      });
    }
    // The full photo library (876 exercises) so any of them can be searched and added to a workout.
    if (typeof EXDB !== 'undefined') {
      const XM = { abdominals: 'core', hamstrings: 'hams', quadriceps: 'quads', glutes: 'glutes', chest: 'chest', lats: 'back', 'middle back': 'back', 'lower back': 'lowback', shoulders: 'shoulders', biceps: 'biceps', triceps: 'triceps', forearms: 'forearms', calves: 'calves', traps: 'back', neck: 'shoulders', abductors: 'glutes', adductors: 'quads' };
      const XE = { B: 'B', D: 'D', W: 'W', C: 'C', M: 'M', K: 'D1', R: 'R', O: 'W' };
      EXDB.rows.forEach(r => {
        const [id, name, cat, eq, , prim, sec, steps] = r;
        const k = name.toLowerCase(); if (LIB.has(k)) return;
        const hit = ARCH_BY_NAME.find(([re]) => re.test(name));
        const type = cat === 'y' ? 's' : cat === 'p' || cat === 'c' ? 'h' : /plank|hold|wall sit|static/i.test(name) ? 't' : 'c';
        const mus = [...new Set([...prim, ...sec].map(x => XM[x]).filter(Boolean))];
        const arch = cat === 'y' ? (/hamstring|toe|fold/i.test(name) ? 'hamfold' : /quad/i.test(name) ? 'quadstretch' : /chest|shoulder/i.test(name) ? 'chestopen' : /side|lateral|oblique/i.test(name) ? 'sidebend' : /hip|groin|glute/i.test(name) ? 'hipflexor' : 'y_mountain') : hit ? hit[1] : 'squat';
        const m = { name, arch: ARCH[arch] ? arch : 'squat', eq: XE[eq] || 'W', muscles: mus.length ? mus : ['full'], type, cues: steps.slice(0, 4).map(x => x.replace(/\s*This will be your starting position\.?/i, '').trim()).filter(Boolean), steps, pattern: '', def: Object.assign({}, TYPE_DEF[type]), per: 1, photo: id, lib: true };
        m.per = ARCH[m.arch].per || 1;
        LIB.set(k, m);
      });
      Object.entries(EXDB.map).forEach(([n, id]) => { const m = LIB.get(n.toLowerCase()); if (m && !m.photo) { m.photo = id; const row = EXDB.rows.find(r => r[0] === id); if (row) m.steps = row[7]; } });
    }
    // Names used by the older gym log
    const ALIAS = { 'Incline Dumbbell Press': 'Incline Dumbbell Press', 'Chest Fly': 'Dumbbell Fly', 'Cable Crossover': 'Cable Fly', 'Lunges': 'Walking Lunge', 'T-Bar Row': 'Barbell Row', 'Ab Wheel Rollout': 'Plank', 'Preacher Curl': 'Dumbbell Curl', 'Close-Grip Bench Press': 'Bench Press', 'Arnold Press': 'Dumbbell Shoulder Press', 'Upright Row': 'Lateral Raise', 'Shrugs': 'Barbell Shrug', 'Rear Delt Fly': 'Reverse Dumbbell Fly', 'Military Press': 'Overhead Press', 'Push-up': 'Push-ups' };
    Object.entries(ALIAS).forEach(([a, b]) => { const m = LIB.get(b.toLowerCase()); if (m && !LIB.has(a.toLowerCase())) LIB.set(a.toLowerCase(), Object.assign({}, m, { name: a })); });
    return LIB;
  }
  function get(name) {
    const lib = build();
    const k = String(name || '').trim().toLowerCase();
    if (lib.has(k)) return lib.get(k);
    // Unknown names still get a sensible animation from keywords.
    const hit = ARCH_BY_NAME.find(([re]) => re.test(name || ''));
    const arch = hit ? hit[1] : 'squat';
    const eq = /barbell/i.test(name) ? 'B' : /dumbbell/i.test(name) ? 'D' : /cable/i.test(name) ? 'C' : /band/i.test(name) ? 'R' : 'W';
    return { name: String(name || 'Exercise'), arch, eq, muscles: ['full'], type: ['plank', 'wallsit', 'sideplank'].includes(arch) ? 't' : 'c', cues: ['Move with control', 'Keep a neutral spine', 'Breathe out on the hard part'], pattern: '', def: Object.assign({}, TYPE_DEF.c), per: ARCH[arch].per || 1, custom: true };
  }
  const isKnown = name => build().has(String(name || '').trim().toLowerCase());
  function all(withLib = true) { return [...new Map([...build().values()].filter(m => !m.yoga && (withLib || !m.lib)).map(m => [m.name, m])).values()]; }
  const poseKey = id => 'Y:' + id;
  function search(q, n = 8) {
    const s = String(q || '').trim().toLowerCase(); if (!s) return [];
    const words = s.split(/\s+/);
    return all().map(m => { const nm = m.name.toLowerCase(); let sc = 0; if (nm.startsWith(s)) sc = 3; else if (nm.includes(s)) sc = 2; else if (words.every(w => nm.includes(w))) sc = 1; return { m, sc }; })
      .filter(x => x.sc).sort((a, b) => b.sc - a.sc || (a.m.lib ? 1 : 0) - (b.m.lib ? 1 : 0) || a.m.name.length - b.m.name.length).slice(0, n).map(x => x.m.name);
  }
  function alts(name) {
    const m = get(name);
    const key = m.pattern || m.arch;
    return all(false).filter(x => x.name !== m.name && (x.pattern ? x.pattern === key : x.arch === m.arch)).map(x => x.name).slice(0, 8);
  }

  /* ---------- drawing ---------- */
  let uidN = 0;
  function prep(m) {
    const A = ARCH[m.arch];
    let kf = A.kf.map(k => Object.assign({}, BASE, k));
    if (A.arms && ARMS[A.arms]) {
      let arms = A.arms;
      if (m.arch === 'squat') arms = /goblet/i.test(m.name) ? 'goblet' : /front squat|thruster/i.test(m.name) ? 'front' : m.eq === 'B' ? 'back' : m.eq === 'D' ? 'side' : m.eq === 'R' ? 'shoulders' : /hack|leg press/i.test(m.name) ? 'side' : 'forward';
      if (m.arch === 'lunge') arms = m.eq === 'B' ? 'back' : 'side';
      kf = kf.map(k => Object.assign(k, ARMS[arms]));
    }
    const front = A.view === 'front';
    const J0 = joints(kf[0], front);
    // Horizontal placement: centre the figure using the widest frame.
    let minX = 1e9, maxX = -1e9, maxH = 0;
    kf.forEach(k => { const J = joints(k, front); const ap = anchorPt(J, A.ax || 'feet'), a0 = anchorPt(J0, A.ax || 'feet'); const dx = a0[0] - ap[0];
      ['head', ...BODY_PTS].forEach(n => { minX = Math.min(minX, J[n][0] + dx); maxX = Math.max(maxX, J[n][0] + dx); });
      const lo = lowest(J); maxH = Math.max(maxH, lo - Math.min(J.head[1] - L.HR, ...BODY_PTS.map(n => J[n][1])) + k.lift); });
    const a0 = anchorPt(J0, A.ax || 'feet');
    const X0 = 60 - (minX + maxX) / 2 + a0[0];
    const ground0 = GROUND - lowest(J0);
    let barY = 12;
    const pin = A.ay === 'pin' ? [X0, a0[1] + ground0] : null;
    if (A.ay === 'bar') { const J1 = joints(kf[1], front); const span = Math.max(lowest(J0) - a0[1], lowest(J1) - anchorPt(J1, 'hands')[1]); barY = Math.max(10, Math.min(20, GROUND - span - 2)); }
    return { A, kf, front, X0, pin, barY, eq: A.hold || m.eq, m, J0, ground0 };
  }
  function place(pr, pose) {
    const J = joints(pose, pr.front); const A = pr.A;
    const ap = anchorPt(J, A.ax || 'feet');
    let tx, ty;
    if (pr.pin) { tx = pr.pin[0] - ap[0]; ty = pr.pin[1] - ap[1]; }
    else if (A.ay === 'bar') { tx = pr.X0 - ap[0]; ty = pr.barY - ap[1]; }
    else { tx = pr.X0 - ap[0]; ty = GROUND - lowest(J) - pose.lift; }
    const W = {}; for (const k in J) W[k] = [J[k][0] + tx, J[k][1] + ty];
    return W;
  }
  const f1 = n => Math.round(n * 10) / 10;
  const pts = arr => arr.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('');
  const circ = (c, r) => `M${f1(c[0] - r)} ${f1(c[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const midp = (a, b, k = 0.5) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  function propsSvg(pr) {
    const W0 = place(pr, pr.kf[0]); const out = [`<line class="mv-gr" x1="8" y1="${GROUND + 0.5}" x2="112" y2="${GROUND + 0.5}"/>`];
    const rect = (x, y, w, h) => `<rect class="mv-pr" x="${f1(x)}" y="${f1(y)}" width="${f1(Math.max(2, w))}" height="${f1(Math.max(2, h))}" rx="2"/>`;
    (pr.A.props || []).forEach(p => {
      if (p === 'bench') { const x0 = Math.min(W0.hip[0], W0.sh[0]) - 6, x1 = Math.max(W0.hip[0], W0.sh[0]) + 6, y = Math.max(W0.hip[1], W0.sh[1]) + 4; out.push(rect(x0, y, x1 - x0, 4), rect(x0 + 3, y + 4, 3, GROUND - y - 4), rect(x1 - 6, y + 4, 3, GROUND - y - 4)); }
      if (p === 'benchShoulder') { const y = W0.sh[1] + 4, x = W0.sh[0] - 16; out.push(rect(x, y, 20, 4), rect(x + 8, y + 4, 4, GROUND - y - 4)); }
      if (p === 'seat') { const y = W0.hip[1] + 3; out.push(rect(W0.hip[0] - 9, y, 18, 4), rect(W0.hip[0] - 2, y + 4, 4, GROUND - y - 4)); }
      if (p === 'incline') { out.push(`<path class="mv-pr" d="M${f1(W0.hip[0] + 4)} ${f1(W0.hip[1] + 4)}L${f1(W0.sh[0] - 3)} ${f1(W0.sh[1] + 5)}L${f1(W0.sh[0] - 7)} ${f1(W0.sh[1] + 3)}L${f1(W0.hip[0] + 2)} ${f1(W0.hip[1] + 8)}Z"/>`, rect(W0.hip[0], W0.hip[1] + 6, 4, GROUND - W0.hip[1] - 6)); }
      if (p === 'pad') { out.push(rect(W0.hip[0] - 5, W0.hip[1] + 2, 10, 4), `<line class="mv-gr" x1="${f1(W0.hip[0])}" y1="${f1(W0.hip[1] + 6)}" x2="${f1(W0.hip[0] - 18)}" y2="${GROUND}"/>`); }
      if (p === 'box') { const y = W0.n1[1] + 1; out.push(rect(W0.n1[0] - 6, y, 22, GROUND - y)); }
      if (p === 'boxHands') { const y = (W0.w1[1] + W0.w2[1]) / 2 + 1; out.push(rect(W0.w1[0] - 8, y, 18, GROUND - y)); }
      if (p === 'benchHands') { const y = W0.w1[1] + 1; out.push(rect(W0.w1[0] - 12, y, 18, 4), rect(W0.w1[0] - 9, y + 4, 3, GROUND - y - 4)); }
      if (p === 'benchHand2') { const y = W0.w2[1] + 1; out.push(rect(W0.w2[0] - 10, y, 22, 4), rect(W0.w2[0] - 6, y + 4, 3, GROUND - y - 4), rect(W0.w2[0] + 6, y + 4, 3, GROUND - y - 4)); }
      if (p === 'bar') { const y = Math.min(W0.w1[1], W0.w2[1]) - 1.5; out.push(`<line class="mv-bar" x1="${f1(Math.min(W0.w1[0], W0.w2[0]) - 18)}" y1="${f1(y)}" x2="${f1(Math.max(W0.w1[0], W0.w2[0]) + 18)}" y2="${f1(y)}"/>`); }
      if (p === 'dipbars') { const y = W0.w1[1] + 1.5; out.push(`<line class="mv-bar" x1="${f1(W0.w1[0] - 10)}" y1="${f1(y)}" x2="${f1(W0.w1[0] + 10)}" y2="${f1(y)}"/>`, rect(W0.w1[0] + 6, y, 3, GROUND - y)); }
      if (p === 'wallLegs') { const x = Math.max(W0.n1[0], W0.n2[0], W0.k1[0]) + 4; out.push(rect(x, 10, 3, GROUND - 10)); }
      if (p === 'wallHands') { const x = Math.max(W0.w1[0], W0.w2[0]) + 1; out.push(rect(x, 14, 3, GROUND - 14)); }
      if (p === 'wall') { out.push(rect(W0.hip[0] - 10, 14, 3, GROUND - 14)); }
    });
    return out.join('');
  }
  function eqPaths(pr, W) {
    const eq = pr.eq; let st = '', fill = '', cab = '';
    const h1 = W.w1, h2 = W.w2;
    if (eq === 'B') {
      if (pr.front) { const y = (h1[1] + h2[1]) / 2, x0 = Math.min(h1[0], h2[0]) - 16, x1 = Math.max(h1[0], h2[0]) + 16; st += `M${f1(x0)} ${f1(y)}L${f1(x1)} ${f1(y)}`; fill += circ([x0, y], 4.2) + circ([x1, y], 4.2); }
      else { fill += circ(h1, 7.2); st += circ(h1, 2); }
    } else if (eq === 'D') {
      if (pr.front) [h1, h2].forEach(h => { st += `M${f1(h[0] - 4)} ${f1(h[1])}L${f1(h[0] + 4)} ${f1(h[1])}`; fill += circ([h[0] - 4, h[1]], 2.3) + circ([h[0] + 4, h[1]], 2.3); });
      else { fill += circ(h1, 3.6); st += circ(h2, 3); }
    } else if (eq === 'D1') { fill += circ(midp(h1, h2), 4.2); }
    else if (eq === 'D11') { fill += circ(h1, 3.8); }
    if (eq === 'C' || pr.A.cable && (eq === 'C' || eq === 'R')) {
      const from = pr.A.cable === 'top' ? [ (h1[0] + h2[0]) / 2, 4] : pr.A.cable === 'high' ? [114, 14] : pr.A.cable === 'low' ? [114, GROUND - 2] : [114, (h1[1] + h2[1]) / 2];
      const to = pr.A.cable === 'low' ? W.n1 : h1;
      cab += `M${f1(from[0])} ${f1(from[1])}L${f1(to[0])} ${f1(to[1])}`;
    } else if (eq === 'R') { cab += `M${f1(W.n1[0])} ${f1(W.n1[1])}L${f1(h1[0])} ${f1(h1[1])}`; }
    return { st, fill, cab };
  }
  /* ---------- human body shapes ---------- */
  const sub2 = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const mul = (p, k) => [p[0] * k, p[1] * k];
  const unit = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
  const ccw = (v, deg) => { const r = R(deg), c = Math.cos(r), sn = Math.sin(r); return [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c]; };
  const circCW = (c, r) => `M${f1(c[0] - r)} ${f1(c[1])}a${r} ${r} 0 1 1 ${f1(2 * r)} 0a${r} ${r} 0 1 1 ${f1(-2 * r)} 0Z`;
  function poly(p) {
    let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
    const o = a < 0 ? p.slice().reverse() : p; // keep every shape clockwise so overlaps merge cleanly
    return o.map((x, i) => `${i ? 'L' : 'M'}${f1(x[0])} ${f1(x[1])}`).join('') + 'Z';
  }
  function cap(a, b, ra, rb) {
    const v = sub2(b, a), l = Math.hypot(v[0], v[1]);
    if (l < 0.05) return circCW(a, Math.max(ra, rb));
    const n = [-v[1] / l, v[0] / l];
    return poly([add(a, mul(n, ra)), add(b, mul(n, rb)), add(b, mul(n, -rb)), add(a, mul(n, -ra))]) + circCW(a, ra) + circCW(b, rb);
  }
  const PROF = { k: [-0.07, 0, 0.3, 0.55, 0.8, 0.97, 1.05], f: [3.4, 4.6, 4.1, 4.3, 5.6, 4.7, 2.6], b: [4.9, 5.9, 4.6, 4.3, 4.8, 4.7, 3.0] };
  const FRNT = { k: [-0.05, 0, 0.3, 0.55, 0.8, 0.95, 1.05], f: [8.4, 9.2, 7.5, 7.7, 9.6, 10.9, 7.4] };
  const interp = (ks, vs, k) => { if (k <= ks[0]) return vs[0]; for (let i = 1; i < ks.length; i++) if (k <= ks[i]) { const t = (k - ks[i - 1]) / (ks[i] - ks[i - 1]); return lerp(vs[i - 1], vs[i], t); } return vs[vs.length - 1]; };
  // Torso outline between two points along the spine (0 = hip, 1 = shoulder), bent by pose.b.
  function torsoShape(W, pose, front, from, to) {
    const u = unit(sub2(W.sh, W.hip)), n = [-u[1], u[0]], len = Math.hypot(W.sh[0] - W.hip[0], W.sh[1] - W.hip[1]);
    const left = [], right = [];
    for (let i = 0; i <= 7; i++) {
      const k = lerp(from, to, i / 7);
      const bend = front ? 0 : -(pose.b || 0) * Math.sin(Math.PI * Math.max(0, Math.min(1, k)));
      const c = add(add(W.hip, mul(u, len * k)), mul(n, bend));
      const fw = front ? interp(FRNT.k, FRNT.f, k) : interp(PROF.k, PROF.f, k), bw = front ? fw : interp(PROF.k, PROF.b, k);
      left.push(add(c, mul(n, fw))); right.push(add(c, mul(n, -bw)));
    }
    return poly(left.concat(right.reverse()));
  }
  function hairPath(W, pose, front) {
    const up = unit(sub2(W.head, W.sh)); const back = front ? [up[1], -up[0]] : mul([-up[1], up[0]], -1);
    const r = L.HR + 0.6, out = [];
    const [t0, t1] = front ? [-78, 78] : [-38, 150];
    for (let i = 0; i <= 10; i++) { const th = R(lerp(t0, t1, i / 10)); out.push(add(W.head, add(mul(up, Math.cos(th) * r), mul(back, Math.sin(th) * r)))); }
    out.push(add(W.head, add(mul(up, front ? 2.4 : 1.2), mul(back, front ? 0 : 1.4))));
    return poly(out);
  }
  function bodyD(pr, pose, W) {
    const fr = pr.front, D = {};
    const arm = (s, e, w) => cap(s, e, 3.0, 2.4) + cap(e, w, 2.3, 1.9) + circCW(w, 2.2);
    const leg = (h, k, n) => cap(h, k, 5.1, 3.7) + cap(k, n, 3.5, 2.3);
    D.fskin = arm(W.s2, W.e2, W.w2) + leg(W.h2, W.k2, W.n2);
    D.fshort = cap(W.h2, midp(W.h2, W.k2, 0.55), 5.8, 4.5);
    D.fsleeve = cap(W.s2, midp(W.s2, W.e2, 0.45), 3.6, 3.0);
    D.fshoe = cap(W.n2, W.t2, 2.5, 2.0);
    const up = unit(sub2(W.head, W.sh));
    D.neck = cap(add(W.sh, mul(up, 1)), add(W.head, mul(up, -3.5)), 2.7, 2.5);
    D.shorts = torsoShape(W, pose, fr, -0.07, 0.25);
    D.shirt = torsoShape(W, pose, fr, 0.2, 1.05);
    D.nskin = leg(W.h1, W.k1, W.n1) + arm(W.s1, W.e1, W.w1);
    D.nshort = cap(W.h1, midp(W.h1, W.k1, 0.55), 5.8, 4.5);
    D.nsleeve = cap(W.s1, midp(W.s1, W.e1, 0.45), 3.6, 3.0);
    D.nshoe = cap(W.n1, W.t1, 2.5, 2.0);
    D.head = circCW(W.head, L.HR);
    D.hair = hairPath(W, pose, fr);
    if (!fr) { const back = mul([-up[1], up[0]], -1); D.ear = circCW(add(W.head, mul(back, 0.9)), 1.3); } else D.ear = '';
    return D;
  }
  function hlPath(pr, W, pose) {
    const segs = new Set(pr.m.muscles.map(x => SEGS[x]).filter(Boolean)); const fr = pr.front;
    let d = '';
    if (segs.has('up')) d += torsoShape(W, pose, fr, 0.5, 0.93);
    if (segs.has('low')) d += torsoShape(W, pose, fr, 0.06, 0.5);
    if (segs.has('ua')) d += cap(W.s1, W.e1, 2.7, 2.1) + (fr ? cap(W.s2, W.e2, 2.7, 2.1) : '');
    if (segs.has('fa')) d += cap(W.e1, W.w1, 2.0, 1.6) + (fr ? cap(W.e2, W.w2, 2.0, 1.6) : '');
    if (segs.has('th')) d += cap(W.h1, W.k1, 4.5, 3.2) + cap(W.h2, W.k2, 4.5, 3.2);
    if (segs.has('sh')) d += cap(W.k1, W.n1, 3.0, 2.0) + cap(W.k2, W.n2, 3.0, 2.0);
    if (segs.has('shd')) d += circCW(midp(W.s1, W.e1, 0.12), 3.6) + (fr ? circCW(midp(W.s2, W.e2, 0.12), 3.6) : '');
    if (segs.has('glu')) { const u = unit(sub2(W.sh, W.hip)); d += fr ? circCW(W.hip, 4.6) : circCW(add(W.hip, mul([u[1], -u[0]], 2.4)), 4.8); }
    return d;
  }
  // Muscle definition lines for the anatomy look: chest, abs, shoulder, arm, thigh and calf contours.
  function defPath(pr, W, pose) {
    const fr = pr.front, f = v => v.toFixed(1);
    const seg = (a, b) => `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
    const u = unit(sub2(W.sh, W.hip)), n = [-u[1], u[0]], len = Math.hypot(W.sh[0] - W.hip[0], W.sh[1] - W.hip[1]);
    const at = (k, side) => { const fw = fr ? interp(FRNT.k, FRNT.f, k) : interp(PROF.k, PROF.f, k); const bend = fr ? 0 : -(pose.b || 0) * Math.sin(Math.PI * k); return add(add(W.hip, mul(u, len * k)), mul(n, bend + side * fw)); };
    let d = '';
    if (fr) {
      const mid = k => at(k, 0);
      d += seg(mid(0.9), mid(0.12));                       // centre line (sternum and abs)
      d += seg(at(0.58, 0.85), mid(0.62)) + seg(at(0.58, -0.85), mid(0.62)); // lower edge of the chest
      [0.44, 0.33, 0.22].forEach(k => { d += seg(at(k, 0.45), at(k, -0.45)); }); // ab rows
    } else {
      d += seg(at(0.6, 0.95), at(0.52, 0.35));             // chest
      [0.42, 0.3, 0.19].forEach(k => { d += seg(at(k, 0.92), at(k, 0.55)); }); // abs from the side
      d += seg(at(0.85, -0.6), at(0.35, -0.75));           // back muscle line
    }
    const arm = (s0, e, w) => { d += seg(midp(s0, e, 0.32), midp(s0, e, 0.92)) + seg(midp(e, w, 0.1), midp(e, w, 0.6)); };
    const leg = (h, k, an) => { d += seg(midp(h, k, 0.18), midp(h, k, 0.9)) + seg(midp(k, an, 0.12), midp(k, an, 0.55)); };
    arm(W.s1, W.e1, W.w1); leg(W.h1, W.k1, W.n1);
    if (fr) { arm(W.s2, W.e2, W.w2); leg(W.h2, W.k2, W.n2); }
    return d;
  }
  const PARTS = ['cab', 'fskin', 'fshort', 'fsleeve', 'fshoe', 'neck', 'shorts', 'shirt', 'nskin', 'nshort', 'nsleeve', 'nshoe', 'head', 'hair', 'ear', 'def', 'glow', 'hl', 'eqs', 'eqf'];
  function frameD(pr, pose) {
    const W = place(pr, pose);
    const D = bodyD(pr, pose, W); const hl = hlPath(pr, W, pose); const eq = eqPaths(pr, W);
    D.def = defPath(pr, W, pose); D.glow = hl; D.hl = hl; D.eqs = eq.st; D.eqf = eq.fill; D.cab = eq.cab;
    return D;
  }
  // Pose at phase k (0..1) of one rep.
  function poseAt(pr, k) {
    const kf = pr.kf, n = kf.length;
    if (n === 2) { const t = k < 0.5 ? ease(k * 2) : ease((1 - k) * 2); return mix(kf[0], kf[1], t); }
    const x = k * n; const i = Math.floor(x) % n; return mix(kf[i], kf[(i + 1) % n], ease(x - Math.floor(x)));
  }
  const GFILL = { nskin: 'n', neck: 'n', head: 'n', shirt: 'n', nsleeve: 'n', nshoe: 'n', fskin: 'f', fsleeve: 'f', fshoe: 'f', hl: 'r', shorts: 'k', nshort: 'k' };
  function svgFor(name, { cls = '', still = null } = {}) {
    const m = get(name), pr = prep(m), id = 'mvg' + (++uidN);
    const k = still != null ? still : (pr.kf.length === 2 ? 0.5 : 0.2);
    const D = frameD(pr, poseAt(pr, k));
    return `<svg class="mvfig ${cls}" viewBox="0 0 120 116" role="img" aria-label="${esc(m.name)} demo" data-mv="${esc(m.custom ? name : (m.yoga ? name : m.name))}">
      <defs><filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
        <linearGradient id="${id}n" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1F3F5"/><stop offset=".55" stop-color="#C9CED4"/><stop offset="1" stop-color="#9AA1A9"/></linearGradient>
        <linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#BFC4CA"/><stop offset="1" stop-color="#858C95"/></linearGradient>
        <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7A6E"/><stop offset=".6" stop-color="#E5483D"/><stop offset="1" stop-color="#B92D24"/></linearGradient>
        <linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3E45"/><stop offset="1" stop-color="#16181C"/></linearGradient></defs>
      <g class="mv-props">${propsSvg(pr)}</g>
      ${PARTS.map(c => `<path class="mv-${c}"${c === 'glow' ? ` filter="url(#${id})"` : ''}${GFILL[c] ? ` style="fill:url(#${id}${GFILL[c]})"` : ''} d="${D[c] || ''}"/>`).join('')}
    </svg>`;
  }

  /* ---------- animation loop ---------- */
  const live = new Set(); let raf = 0;
  function tick(now) {
    raf = 0;
    live.forEach(a => {
      if (!a.svg.isConnected) { live.delete(a); return; }
      if (!a.visible) return;
      const ms = a.clock ? a.clock() : now - a.t0;
      if (ms == null) return;
      let k = (ms % a.dur) / a.dur; if (k < 0) k += 1;
      const D = frameD(a.pr, poseAt(a.pr, k));
      PARTS.forEach(c => { const e = a.el[c]; if (e) e.setAttribute('d', D[c] || ''); });
    });
    if (live.size) raf = requestAnimationFrame(tick);
  }
  let io = null;
  function animate(svg, opts = {}) {
    if (!svg || svg.__mv) return svg && svg.__mv;
    // Respect "remove animations": keep figures still unless a workout timer is driving them.
    if (!opts.clock && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    const m = get(svg.dataset.mv), pr = prep(m);
    const el = {}; PARTS.forEach(c => { el[c] = svg.querySelector('.mv-' + c); });
    const a = { svg, pr, m, t0: performance.now(), dur: opts.dur || pr.A.dur, clock: opts.clock || null, visible: true, el };
    svg.__mv = a; live.add(a);
    if ('IntersectionObserver' in window) {
      io = io || new IntersectionObserver(es => es.forEach(e => { if (e.target.__mv) e.target.__mv.visible = e.isIntersecting; }), { rootMargin: '60px' });
      io.observe(svg);
    }
    if (!raf) raf = requestAnimationFrame(tick);
    return a;
  }
  function mount(root) { $$('svg[data-mv]', root || document).forEach(s => animate(s)); }
  const tempo = name => { const m = get(name); return ARCH[m.arch].dur; };

  /* ---------- real photo demos ---------- */
  // Photos live in www/ex/ inside the app; if one is missing (or in a web preview) it loads from the library online.
  const PHOTO_WEB = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
  const photoId = name => { const m = get(name); return m.photo || null; };
  const photoSrc = (id, i) => `ex/${id}/${i}.jpg`;
  const imgTag = (id, i, cls = '', name = '') => `<img class="${cls}" src="${photoSrc(id, i)}" data-exid="${esc(id)}" data-exi="${i}" data-exn="${esc(name)}" alt="" loading="lazy" decoding="async">`;
  document.addEventListener('error', e => {
    const t = e.target; if (!t || t.tagName !== 'IMG' || !t.dataset.exid) return;
    if (!t.dataset.web) { t.dataset.web = 1; t.src = PHOTO_WEB + t.dataset.exid + '/' + t.dataset.exi + '.jpg'; return; }
    // Neither the bundled nor the online photo loaded: show the animated figure instead of a broken image.
    const box = t.closest('.exph, .exthumb'); const n = t.dataset.exn;
    if (box && n && !box.dataset.fell) { box.dataset.fell = 1; const holder = document.createElement('span'); holder.innerHTML = svgFor(n, { cls: box.classList.contains('exthumb') ? 'th' : 'big' }); box.replaceWith(holder.firstChild); mount(document); }
  }, true);
  const wantsPhoto = () => (typeof S === 'undefined' || S.demo !== 'anim');
  // A demo: the real photos flipping between start and end position, or the animated figure.
  function demo(name, { cls = '', anim = null, still = null } = {}) {
    const id = photoId(name); const useAnim = anim != null ? anim : !wantsPhoto();
    if (!id || useAnim) return svgFor(name, { cls, still });
    const dur = Math.max(1600, Math.min(4200, (ARCH[get(name).arch] || {}).dur || 2400));
    return `<div class="exph ${cls}" style="--exd:${dur}ms" role="img" aria-label="${esc(get(name).name)} photo demo">${imgTag(id, 0, 'a', name)}${imgTag(id, 1, 'b', name)}</div>`;
  }
  // Small square thumbnail: first photo, or the figure.
  function thumb(name, cls = 'th') { const id = photoId(name); return id && wantsPhoto() ? `<span class="exthumb">${imgTag(id, 0, '', name)}</span>` : svgFor(name, { cls }); }
  const hasBoth = name => !!photoId(name);

  /* ---------- back-friendly mode & pain flags ---------- */
  // Heavy hinges and twisting core work are swapped for options that load the lower back less.
  // This is a cautious default, not a diagnosis. Moves you mark as painful are always swapped.
  const BACK_SWAPS = [
    [/^(barbell |dumbbell |trap bar |sumo )?deadlift$/i, 'Hip Thrust'], [/romanian deadlift|stiff.?legged/i, 'Leg Curl'], [/single-leg romanian/i, 'Single-Leg Glute Bridge'],
    [/good morning/i, 'Glute Bridge'], [/bent.?over|^barbell row$|t-bar row|^dumbbell row$|pendlay/i, 'Chest-Supported Row'],
    [/swing/i, 'Glute Bridge'], [/snatch|power clean|hang clean|^clean/i, 'Step-Up'], [/thruster/i, 'Dumbbell Shoulder Press'],
    [/russian twist|bicycle crunch|woodchop|windmill|oblique twist|plate twist/i, 'Dead Bug'], [/back extension|hyperextension/i, 'Bird Dog'],
    [/jefferson|toes to bar/i, 'Dead Bug'],
  ];
  const painList = () => (typeof S !== 'undefined' && Array.isArray(S.painMoves) ? S.painMoves : []);
  const isPainful = name => painList().some(n => n.toLowerCase() === String(name || '').toLowerCase());
  function setPainful(name, on) {
    const l = painList().filter(n => n.toLowerCase() !== String(name).toLowerCase()); if (on) l.push(get(name).name);
    S.painMoves = l; saveSettings();
  }
  // Returns { name, why } when a move should be swapped, otherwise null.
  function safeSwap(name) {
    const m = get(name); const n = m.name;
    if (isPainful(n)) { const a = alts(n).find(x => !isPainful(x) && !BACK_SWAPS.some(([re]) => re.test(x))); return a ? { name: a, why: 'you marked it as painful' } : null; }
    if (typeof S !== 'undefined' && S.backSafe === false) return null;
    const hit = BACK_SWAPS.find(([re]) => re.test(n)); if (!hit || hit[1].toLowerCase() === n.toLowerCase()) return null;
    return { name: hit[1], why: 'back-friendly mode' };
  }

  /* ---------- how-to sheet ---------- */
  function youtube(name) {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' exercise proper form');
    if (isNative) window.location.href = url; else window.open(url, '_blank', 'noopener');
  }
  const musChips = m => m.muscles.filter(x => MNAME[x]).map(x => `<span class="mvchip">${MNAME[x]}</span>`).join('');
  const EQN = { B: 'Barbell', D: 'Dumbbells', D1: 'One dumbbell', C: 'Cable', R: 'Band', M: 'Machine', P: 'Pull-up bar', W: 'No equipment' };
  function howTo(name, { onSwap } = {}) {
    const m = get(name);
    let anim = !wantsPhoto() || !hasBoth(m.name);
    const steps = m.steps && m.steps.length ? m.steps : null;
    const s = sheet(`<h2>${esc(m.name)}</h2>
      ${hasBoth(m.name) ? `<div class="seg demoseg"><button data-dm="photo" class="${anim ? '' : 'on'}">${ic('camera')}Real photos</button><button data-dm="anim" class="${anim ? 'on' : ''}">${ic('play')}Animated</button></div>` : ''}
      <div class="mvstage demo" id="mvd">${demo(m.name, { cls: 'big', anim })}</div>
      <div class="mvchips">${musChips(m)}<span class="mvchip eq">${EQN[m.eq] || 'Equipment'}</span></div>
      ${m.lib ? '' : `<div class="cues">${m.cues.slice(0, 4).map((c, i) => `<div class="cue"><b>${i + 1}</b><span>${esc(c)}</span></div>`).join('')}</div>`}
      ${steps ? `<details class="xsteps" ${m.lib ? 'open' : ''}><summary>Step by step</summary><ol>${steps.map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>` : ''}
      ${alts(m.name).length ? `<div class="sect">Similar moves</div><div class="accchips">${alts(m.name).slice(0, 6).map(n => `<button class="catchip" data-alt="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
      <label class="mremember painrow" data-a="pain"><span class="toggle sm ${isPainful(m.name) ? 'on' : ''}"></span><span><b>This move hurts me</b><br><small>It will be swapped out of workouts and never pushed heavier</small></span></label>
      ${safeSwap(m.name) && !isPainful(m.name) ? `<p class="hint">🛡 With back-friendly mode on, workouts use <b>${esc(safeSwap(m.name).name)}</b> instead.</p>` : ''}
      <div class="btns ${typeof Coach !== 'undefined' && Coach.hasHistory(m.name) ? 'two' : ''}">${typeof Coach !== 'undefined' && Coach.hasHistory(m.name) ? `<button class="btn" data-a="hist">${ic('chart')}My history</button>` : ''}<button class="btn" data-a="yt">${ic('play')}YouTube demos</button></div>`);
    mount(s.el);
    s.el.addEventListener('click', e => {
      const dm = e.target.closest('[data-dm]');
      if (dm) { anim = dm.dataset.dm === 'anim'; if (typeof S !== 'undefined') { S.demo = anim ? 'anim' : 'photo'; saveSettings(); } $$('[data-dm]', s.el).forEach(x => x.classList.toggle('on', x === dm)); $('#mvd', s.el).innerHTML = demo(m.name, { cls: 'big', anim }); mount(s.el); return; }
      if (e.target.closest('[data-a="yt"]')) return youtube(m.name);
      if (e.target.closest('[data-a="hist"]')) { s.close(); return setTimeout(() => Coach.history(m.name), 150); }
      const pn = e.target.closest('[data-a="pain"]'); if (pn) { const on = !isPainful(m.name); setPainful(m.name, on); $('.toggle', pn).classList.toggle('on', on); toast(on ? 'Marked as painful. It will be swapped in your workouts.' : 'Unmarked'); return; }
      const alt = e.target.closest('[data-alt]'); if (alt) { s.close(); setTimeout(() => (onSwap ? onSwap(alt.dataset.alt) : howTo(alt.dataset.alt)), 150); }
    });
  }

  return { safeSwap, isPainful, setPainful, demo, thumb, photoId, hasBoth, get, all, search, alts, svgFor, animate, mount, howTo, tempo, isKnown, poseKey, MNAME, EQN, TYPE_DEF, _ARCH: ARCH, _prep: prep };
})();
