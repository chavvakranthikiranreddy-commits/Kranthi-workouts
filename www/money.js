/* Muscle & Money: money tracker.
   Salary-day budget cycles, needs / wants / savings, safe-to-spend, 50/30/20 targets, income,
   recurring bills with reminders, and payment screenshots read on the phone.
   Uses helpers from app.js ($, $$, el, esc, ic, sheet, menu, toast, confirmBox, DB, S, P, isNative ...). */
'use strict';

const Money = (() => {
  const GROUPS = {
    needs: { name: 'Needs', color: '#4F86F7', d: 'Rent, groceries, bills, travel, EMIs' },
    wants: { name: 'Wants', color: '#D9781C', d: 'Eating out, shopping, fun' },
    savings: { name: 'Savings', color: '#C04BD6', d: 'SIPs, FDs, emergency fund' },
  };
  const GKEYS = ['needs', 'wants', 'savings'];
  const DEFAULT_CATS = [
    ['rent', 'Rent & housing', 'needs', '🏠'], ['groceries', 'Groceries', 'needs', '🛒'], ['bills', 'Bills & recharge', 'needs', '💡'],
    ['transport', 'Transport & fuel', 'needs', '⛽'], ['health', 'Health & medicine', 'needs', '💊'], ['emi', 'EMI & loans', 'needs', '🏦'],
    ['insurance', 'Insurance', 'needs', '🛡️'], ['education', 'Education', 'needs', '📚'],
    ['food', 'Food & dining', 'wants', '🍔'], ['shopping', 'Shopping', 'wants', '🛍️'], ['fun', 'Entertainment', 'wants', '🎬'],
    ['travel', 'Travel', 'wants', '✈️'], ['fitness', 'Fitness', 'wants', '🏋️'], ['personal', 'Personal care', 'wants', '💇'],
    ['gifts', 'Gifts & family', 'wants', '🎁'], ['other', 'Other', 'wants', '📦'],
    ['invest', 'Investments & SIP', 'savings', '📈'], ['save', 'Savings & FD', 'savings', '💰'], ['emergency', 'Emergency fund', 'savings', '🛟'],
  ].map(([id, name, group, icon]) => ({ id, name, group, icon }));
  const INCOME_CATS = [
    { id: 'salary', name: 'Salary', icon: '💼' }, { id: 'business', name: 'Business & freelance', icon: '💻' },
    { id: 'refund', name: 'Refund & cashback', icon: '↩️' }, { id: 'oincome', name: 'Other income', icon: '➕' },
  ];
  // Payee words that point to a category. Your own choices always win over these.
  const KEYWORDS = {
    groceries: ['zepto', 'blinkit', 'bigbasket', 'instamart', 'dmart', 'jiomart', 'grocer', 'kirana', 'supermarket', 'more retail', 'ratnadeep', 'milk', 'dairy', 'vegetable', 'fruits', 'country delight', 'swiggy instamart'],
    food: ['swiggy', 'zomato', 'eatsure', 'eatclub', 'domino', 'pizza', 'mcdonald', 'kfc', 'burger', 'starbucks', 'cafe', 'coffee', 'restaurant', 'hotel', 'bakery', 'chai', 'biryani', 'magicpin', 'leankafe', 'tea'],
    transport: ['uber', 'ola', 'rapido', 'metro', 'bmtc', 'irctc', 'redbus', 'petrol', 'fuel', 'hpcl', 'iocl', 'indianoil', 'bharat petroleum', 'bpcl', 'shell', 'fastag', 'parking', 'namma yatri'],
    bills: ['airtel', 'jio', 'vodafone', 'vi ', 'bsnl', 'bescom', 'electricity', 'power', 'water', 'gas', 'broadband', 'act fibernet', 'hathway', 'tata play', 'dth', 'recharge', 'postpaid', 'prepaid', 'bill'],
    shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tata cliq', 'croma', 'reliance digital', 'decathlon', 'ikea', 'lenskart', 'zara', 'h&m', 'westside', 'mall'],
    fun: ['netflix', 'spotify', 'hotstar', 'prime video', 'youtube', 'bookmyshow', 'pvr', 'inox', 'sony liv', 'zee5', 'gaming', 'steam', 'playstation'],
    health: ['apollo', 'pharmeasy', '1mg', 'netmeds', 'medplus', 'pharmacy', 'chemist', 'medical', 'hospital', 'clinic', 'diagnostic', 'lab', 'physio', 'dental', 'fixyoufit'],
    rent: ['rent', 'landlord', 'society', 'maintenance', 'nobroker', 'pg ', 'hostel'],
    emi: ['emi', 'loan', 'bajaj finance', 'home credit', 'credit card', 'cred', 'repayment', 'lending'],
    insurance: ['insurance', 'lic', 'policybazaar', 'acko', 'digit', 'star health', 'hdfc ergo', 'icici lombard'],
    invest: ['zerodha', 'groww', 'upstox', 'coin', 'kuvera', 'mutual fund', 'sip', 'nps', 'ppf', 'smallcase', 'angel one', 'indmoney', 'stocks'],
    save: ['fixed deposit', 'recurring deposit', ' fd', ' rd', 'savings'],
    fitness: ['gym', 'cult', 'fitness', 'kaizen', 'protein', 'muscleblaze', 'healthkart', 'yoga'],
    education: ['school', 'college', 'course', 'udemy', 'coursera', 'tuition', 'fees', 'books'],
    travel: ['makemytrip', 'goibibo', 'cleartrip', 'indigo', 'air india', 'vistara', 'akasa', 'oyo', 'airbnb', 'booking.com', 'agoda', 'yatra'],
    personal: ['salon', 'spa', 'barber', 'urban company', 'grooming', 'parlour'],
  };
  const SPLITS = [[50, 30, 20], [60, 25, 15], [60, 20, 20], [70, 20, 10]];

  const fresh = () => ({ setup: false, cycleDay: 1, budget: 40000, budgets: {}, split: { needs: 50, wants: 30, savings: 20 }, cats: DEFAULT_CATS.map(c => ({ ...c })), txns: [], rules: {}, bills: [], lockOn: false, pin: null, remindTime: '09:00' });
  let M = Object.assign(fresh(), DB.get('money', {}));
  const save = () => DB.set('money', M);
  let unlocked = false;
  let lastHidden = 0;
  let mTab = 'home';
  let txFilter = 'all', txQuery = '', txCycleOffset = 0, insCycleOffset = 0;

  /* ---------- formatting ---------- */
  const inr = (n, { sign = false, dec = false } = {}) => {
    const v = Math.abs(Math.round((n || 0) * (dec ? 100 : 1)) / (dec ? 100 : 1));
    const s = v.toLocaleString('en-IN', { maximumFractionDigits: dec ? 2 : 0 });
    return (n < 0 ? '−' : sign ? '+' : '') + '₹' + s;
  };
  const num = v => { const n = parseFloat(String(v || '').replace(/[,₹\s]/g, '')); return isNaN(n) ? null : n; };
  const cat = id => M.cats.find(c => c.id === id) || INCOME_CATS.find(c => c.id === id) || { id, name: 'Other', icon: '📦', group: 'wants' };
  const isIncome = t => t.type === 'income';
  const dlabel = k => { const d = parseKey(k); const t = today0(); const diff = Math.round((t - d) / 864e5); return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };
  const short = d => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  /* ---------- cycles (salary day to the day before the next one) ---------- */
  const dim = (y, m) => new Date(y, m + 1, 0).getDate();
  function cycleStart(date, offset = 0) {
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    let y = d.getFullYear(), m = d.getMonth();
    let s = new Date(y, m, Math.min(M.cycleDay, dim(y, m)));
    if (d < s) { m -= 1; s = new Date(y, m, Math.min(M.cycleDay, dim(y, m))); }
    if (offset) { const yy = s.getFullYear(), mm = s.getMonth() + offset; s = new Date(yy, mm, Math.min(M.cycleDay, dim(yy + Math.floor(mm / 12), ((mm % 12) + 12) % 12))); }
    return s;
  }
  function cycleEnd(start) {
    const y = start.getFullYear(), m = start.getMonth() + 1;
    const n = new Date(y, m, Math.min(M.cycleDay, dim(y + Math.floor(m / 12), m % 12)));
    return addDays(n, -1);
  }
  const budgetFor = start => (M.budgets[dkey(start)] != null ? M.budgets[dkey(start)] : M.budget);
  const inCycle = (t, s, e) => { const d = parseKey(t.date); return d >= s && d <= e; };

  function stats(offset = 0) {
    const s = cycleStart(new Date(), offset), e = cycleEnd(s);
    const tx = M.txns.filter(t => inCycle(t, s, e));
    const spent = { needs: 0, wants: 0, savings: 0 };
    let income = 0;
    tx.forEach(t => { if (isIncome(t)) income += t.amount; else spent[cat(t.catId).group || 'wants'] += t.amount; });
    const total = spent.needs + spent.wants + spent.savings;
    const budget = budgetFor(s);
    const left = budget - total;
    const t0 = today0();
    const totalDays = Math.round((e - s) / 864e5) + 1;
    const current = offset === 0;
    const daysLeft = current ? Math.max(1, Math.round((e - t0) / 864e5) + 1) : 0;
    const elapsed = current ? totalDays - daysLeft + 1 : totalDays;
    const target = g => budget * (M.split[g] || 0) / 100;
    const savingsLeft = Math.max(0, target('savings') - spent.savings);
    // Money still promised this cycle: unpaid bills due from today to the cycle end, plus the savings goal.
    const upcoming = current ? upcomingBills(t0, e).filter(b => !b.paid) : [];
    const billNW = upcoming.filter(b => cat(b.bill.catId).group !== 'savings').reduce((a, b) => a + b.bill.amount, 0);
    const billSav = upcoming.filter(b => cat(b.bill.catId).group === 'savings').reduce((a, b) => a + b.bill.amount, 0);
    const reserve = billNW + Math.max(savingsLeft, billSav);
    const safe = current ? Math.max(0, left - reserve) / daysLeft : 0;
    const pace = budget * elapsed / totalDays;
    const todayKey = dkey(t0);
    const spentToday = tx.filter(t => !isIncome(t) && t.date === todayKey).reduce((a, t) => a + t.amount, 0);
    return { s, e, tx, spent, total, income, budget, left, totalDays, daysLeft, elapsed, target, savingsLeft, reserve, billNW, safe, pace, spentToday, current };
  }

  /* ---------- bills ---------- */
  function dueIn(bill, y, m) { return new Date(y, m, Math.min(bill.day, dim(y, m))); }
  const periodKey = (bill, due) => bill.freq === 'yearly' ? String(due.getFullYear()) : `${due.getFullYear()}-${pad(due.getMonth() + 1)}`;
  function occurrences(bill, from, to) {
    const out = [];
    let y = from.getFullYear(), m = from.getMonth();
    for (let i = 0; i < 26; i++) {
      const mm = m + i; const yy = y + Math.floor(mm / 12); const mo = mm % 12;
      if (bill.freq === 'yearly' && mo !== (bill.month || 0)) continue;
      const due = dueIn(bill, yy, mo);
      if (due > to) break;
      if (due >= from) out.push(due);
    }
    return out;
  }
  function upcomingBills(from, to) {
    const out = [];
    M.bills.forEach(bill => occurrences(bill, from, to).forEach(due => out.push({ bill, due, paid: !!(bill.paid || {})[periodKey(bill, due)] })));
    return out.sort((a, b) => a.due - b.due);
  }
  function nextDue(bill) {
    const t0 = today0();
    // Overdue and unpaid from the last 40 days first, then the next one.
    // Dates before the bill was added never count as overdue.
    const since = bill.created ? new Date(new Date(bill.created).setHours(0, 0, 0, 0)) : t0;
    const past = occurrences(bill, addDays(t0, -40) < since ? since : addDays(t0, -40), addDays(t0, -1)).filter(d => !(bill.paid || {})[periodKey(bill, d)]);
    if (past.length) return { due: past[past.length - 1], overdue: true };
    const fut = occurrences(bill, t0, addDays(t0, 400)).find(d => !(bill.paid || {})[periodKey(bill, d)]);
    return fut ? { due: fut, overdue: false } : null;
  }
  function markPaid(bill, due, txnId) {
    bill.paid = bill.paid || {};
    let id = txnId;
    if (!id) {
      const t = { id: uid(), type: 'expense', amount: bill.amount, catId: bill.catId, payee: bill.name, note: 'Bill', date: dkey(new Date()), at: Date.now(), src: 'bill' };
      M.txns.push(t); id = t.id;
    }
    bill.paid[periodKey(bill, due)] = id;
    save(); scheduleBillReminders();
  }
  async function scheduleBillReminders() {
    if (!P.LocalNotifications) return;
    const ids = []; for (let i = 0; i < 60; i++) ids.push({ id: 600 + i });
    try { await P.LocalNotifications.cancel({ notifications: ids }); } catch (e) { /* ignore */ }
    const [hh, mi] = (M.remindTime || '09:00').split(':').map(Number);
    const list = [];
    M.bills.forEach((bill, i) => {
      if (bill.remind === false || i >= 60) return;
      const nd = nextDue(bill); if (!nd || nd.overdue) return;
      let at = addDays(nd.due, -1); at.setHours(hh, mi, 0, 0);
      let when = 'tomorrow';
      if (at <= new Date()) { at = new Date(nd.due); at.setHours(hh, mi, 0, 0); when = 'today'; }
      if (at <= new Date()) return;
      list.push({ id: 600 + i, title: `${bill.name} due ${when}`, body: `${inr(bill.amount)} · open Muscle & Money to mark it paid`, channelId: 'kw_remind', schedule: { at, allowWhileIdle: true }, isExactNotification: false, smallIcon: 'ic_stat_kw', iconColor: S.accent });
    });
    if (!list.length) return;
    try {
      const p = await P.LocalNotifications.checkPermissions();
      if (p.display === 'granted') await P.LocalNotifications.schedule({ notifications: list });
    } catch (e) { /* ignore */ }
  }

  /* ---------- screenshot reading ---------- */
  const MONTHS3 = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  function parseReceipt(r) {
    let lines = (r && r.lines ? r.lines : []).map(l => ({ t: String(l.t || '').trim(), y: l.y || 0, h: l.h || 0, x: l.x || 0 })).filter(l => l.t);
    if (!lines.length && r && r.text) lines = r.text.split('\n').map((t, i) => ({ t: t.trim(), y: i * 20, h: 16, x: 0 })).filter(l => l.t);
    lines.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const all = lines.map(l => l.t).join('\n');
    const low = all.toLowerCase();
    const out = { amount: null, payee: '', upi: '', date: null, ref: '', type: 'expense', status: 'ok', app: '' };
    if (/phonepe/.test(low)) out.app = 'PhonePe'; else if (/google pay|gpay|g pay/.test(low)) out.app = 'Google Pay'; else if (/paytm/.test(low)) out.app = 'Paytm'; else if (/bhim/.test(low)) out.app = 'BHIM'; else if (/amazon pay/.test(low)) out.app = 'Amazon Pay'; else if (/\bcred\b/.test(low)) out.app = 'CRED';
    if (/\b(failed|declined|unsuccessful|cancelled)\b/.test(low)) out.status = 'failed';
    else if (/\b(pending|processing|in progress)\b/.test(low)) out.status = 'pending';
    if (/received from|money received|you received|credited to your|received successfully|got paid/.test(low) && !/paid to|sent to|debited from/.test(low)) out.type = 'income';

    // Amount: prefer numbers with a currency mark, in big text, that repeat on the screen.
    const maxH = Math.max(1, ...lines.map(l => l.h));
    const cands = [];
    const push = (v, score, l, alt) => { if (v > 0 && v < 2e7) cands.push({ v, score: score + (l.h / maxH) * 3, alt }); };
    const val = s => parseFloat(s.replace(/,/g, ''));
    lines.forEach(l => {
      const t = l.t.replace(/\s+/g, ' ');
      if (/\d{9,}/.test(t.replace(/[,\s]/g, '')) && !/[₹,]/.test(t)) return; // reference numbers, phone numbers
      for (const m of t.matchAll(/(?:₹|rs\.?|inr|rupees?)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)/gi)) push(val(m[1]), 4, l);
      let m = t.match(/^[%zZF?<₹€]\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)$/); // a misread rupee sign
      if (m) push(val(m[1]), 3, l);
      m = t.match(/^([0-9][0-9,]*(?:\.[0-9]{1,2})?)$/);
      if (m && !/^(19|20)\d\d$/.test(m[1])) {
        push(val(m[1]), 1, l);
        if (m[1].startsWith('2') && m[1].replace(/,/g, '').length >= 2) push(val(m[1].slice(1).replace(/^,/, '')), 0.5, l, true); // '₹' read as '2'
      }
    });
    const counts = {}; cands.forEach(c => { counts[c.v] = (counts[c.v] || 0) + 1; });
    cands.forEach(c => { if (counts[c.v] > 1) c.score += 2 * (counts[c.v] - 1); });
    cands.sort((a, b) => b.score - a.score);
    if (cands.length) out.amount = cands[0].v;

    // Payee
    const exp = [/^(?:paid to|sent to|payment to|paid successfully to|transferred to|money sent to|to)\b\s*:?\s*(.*)$/i];
    const inc = [/^(?:received from|money received from|from)\b\s*:?\s*(.*)$/i];
    const pats = out.type === 'income' ? inc.concat(exp) : exp.concat(inc);
    const okName = s => s && s.length >= 2 && !/@/.test(s) && !/^[+\d\s-]{6,}$/.test(s) && !/^(upi|bank|a\/c|xx|\*|your|banking name)/i.test(s) && !/(debited|credited|transaction|successful|completed)/i.test(s);
    outer: for (const re of pats) {
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].t.match(re);
        if (!m) continue;
        let name = m[1].trim();
        let j = i + 1;
        while (!okName(name) && j < Math.min(lines.length, i + 4)) { name = lines[j].t.trim(); j++; }
        if (okName(name)) { out.payee = name.replace(/\s*[>›»]+\s*$/, '').replace(/\s{2,}/g, ' ').slice(0, 40); break outer; }
      }
    }
    const upi = all.match(/[a-z0-9._-]{2,}@[a-z]{2,}/i); if (upi) out.upi = upi[0];
    if (!out.payee && out.upi) out.payee = out.upi.split('@')[0];

    // Date
    const now = new Date();
    const mk = (y, mo, d) => { if (y < 100) y += 2000; const dt = new Date(y, mo, d); return (dt.getMonth() === mo && Math.abs(y - now.getFullYear()) <= 1 && dt <= addDays(now, 1)) ? dt : null; };
    let dm = low.match(/(\d{1,2})(?:st|nd|rd|th)?[\s\-/]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,\-/']*(\d{2,4})/);
    if (dm) out.date = mk(+dm[3], MONTHS3.indexOf(dm[2]), +dm[1]);
    if (!out.date) { dm = low.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s*(\d{4})/); if (dm) out.date = mk(+dm[3], MONTHS3.indexOf(dm[1]), +dm[2]); }
    if (!out.date) { dm = low.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/); if (dm) out.date = mk(+dm[3], +dm[2] - 1, +dm[1]); }

    // Reference number (used to warn about duplicates)
    const ref = all.match(/\b(T\d{15,25})\b/) || all.replace(/(\d)\s(?=\d)/g, '$1').match(/(?:upi|utr|ref|transaction)[^\n\d]{0,30}(\d{12})\b/i) || all.match(/\b(\d{12})\b/);
    if (ref) out.ref = ref[1];
    return out;
  }
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  function guessCat(payee, upi, type) {
    if (type === 'income') return /salary|payroll/i.test(payee) ? 'salary' : /refund|cashback/i.test(payee) ? 'refund' : 'oincome';
    const k = norm(payee);
    if (k && M.rules[k]) return M.rules[k];
    const hay = ' ' + norm(payee) + ' ' + norm(upi) + ' ';
    // Short words must match a whole word (so "ola" does not match "cola"); longer ones can start a word.
    const hit = w => { const x = norm(w); if (!x) return false; return x.length <= 4 ? hay.includes(' ' + x + ' ') : hay.includes(' ' + x); };
    for (const [id, words] of Object.entries(KEYWORDS)) if (words.some(hit) && M.cats.some(c => c.id === id)) return id;
    return null;
  }

  /* ---------- add / edit sheet ---------- */
  let queue = [], busy = false;
  function enqueue(item) { queue.push(item); if (!busy) nextInQueue(); }
  function nextInQueue() {
    const it = queue.shift();
    if (!it) { busy = false; return; }
    busy = true;
    entrySheet(it, () => nextInQueue());
  }

  function entrySheet(pre = {}, onDone) {
    const existing = pre.id ? M.txns.find(t => t.id === pre.id) : null;
    const d = existing ? clone(existing) : {
      id: uid(), type: pre.type || 'expense', amount: pre.amount || null, payee: pre.payee || '', upi: pre.upi || '', note: '',
      date: pre.date ? dkey(pre.date) : dkey(new Date()), catId: pre.catId || null, src: pre.src || 'manual', ref: pre.ref || '', app: pre.app || '',
    };
    if (!existing && !d.catId) d.catId = guessCat(d.payee, d.upi, d.type);
    const suggested = d.catId;
    let group = d.type === 'income' ? 'income' : (d.catId ? cat(d.catId).group : 'needs');
    let remember = !existing;
    const dup = !existing && d.ref ? M.txns.find(t => t.ref && t.ref === d.ref) : null;
    const left = queue.length;
    const s = sheet(`<h2>${existing ? 'Edit' : pre.src === 'screenshot' ? 'From screenshot' : 'Add'} ${d.type === 'income' ? 'income' : 'expense'}</h2>
      ${pre.image ? `<button class="shot" data-a="img"><img src="${pre.image}" alt="Payment screenshot"><span>${pre.app ? esc(pre.app) + ' · ' : ''}tap to view</span></button>` : ''}
      ${pre.error ? `<div class="mwarn">${ic('info')}<span>${esc(pre.error)}. Fill in the details below.</span></div>` : ''}
      ${pre.noOcr ? `<div class="mwarn">${ic('info')}<span>Reading screenshots works in the installed app. Fill in the details below.</span></div>` : ''}
      ${pre.status === 'failed' ? `<div class="mwarn bad">${ic('info')}<span>This payment looks <b>failed</b>. Only save it if money actually left your account.</span></div>` : ''}
      ${pre.status === 'pending' ? `<div class="mwarn">${ic('info')}<span>This payment looks <b>pending</b>.</span></div>` : ''}
      ${dup ? `<div class="mwarn bad">${ic('info')}<span>You already saved this payment on ${esc(dlabel(dup.date))} (${inr(dup.amount)}, ${esc(dup.payee || cat(dup.catId).name)}).</span></div>` : ''}
      <div class="seg" style="background:var(--surface-2)"><button class="${d.type === 'expense' ? 'on' : ''}" data-type="expense">Expense</button><button class="${d.type === 'income' ? 'on' : ''}" data-type="income">Income</button></div>
      <div class="amt"><span>₹</span><input id="mamt" inputmode="decimal" placeholder="0" value="${d.amount != null ? esc(String(d.amount)) : ''}" aria-label="Amount"></div>
      <div class="mrow2"><input class="field body" id="mpayee" placeholder="${d.type === 'income' ? 'From (e.g. Employer)' : 'Paid to (e.g. Swiggy)'}" value="${esc(d.payee)}" maxlength="40"><input class="field body" id="mdate" type="date" value="${esc(d.date)}" max="${dkey(addDays(new Date(), 1))}"></div>
      <div id="mcats"></div>
      <input class="field body" id="mnote" placeholder="Note (optional)" value="${esc(d.note || '')}" maxlength="80" style="margin-top:10px">
      <label class="mremember" id="mrem"><span class="toggle sm ${remember ? 'on' : ''}"></span><span id="mremt"></span></label>
      <div class="btns ${existing ? 'two' : ''}">${existing ? '<button class="btn danger" data-a="del">Delete</button>' : ''}<button class="btn primary" data-a="save">${left ? `Save · ${left} more` : 'Save'}</button></div>`,
      { onClose: () => { if (onDone) setTimeout(onDone, 80); } });
    const paintCats = () => {
      const box = $('#mcats', s.el);
      if (d.type === 'income') {
        box.innerHTML = `<div class="catgrid">${INCOME_CATS.map(c => `<button class="catchip ${d.catId === c.id ? 'on' : ''}" data-cat="${c.id}"><span>${c.icon}</span>${esc(c.name)}</button>`).join('')}</div>`;
      } else {
        box.innerHTML = `<div class="gtabs">${GKEYS.map(g => `<button class="${group === g ? 'on' : ''}" data-g="${g}" style="--gc:${GROUPS[g].color}">${GROUPS[g].name}</button>`).join('')}</div>
          <div class="catgrid">${M.cats.filter(c => c.group === group).map(c => `<button class="catchip ${d.catId === c.id ? 'on' : ''}" data-cat="${c.id}"><span>${c.icon}</span>${esc(c.name)}${c.id === suggested && !existing ? '<em>Suggested</em>' : ''}</button>`).join('')}</div>`;
      }
      const p = $('#mpayee', s.el).value.trim();
      $('#mrem', s.el).style.display = p && d.catId && d.type === 'expense' ? '' : 'none';
      $('#mremt', s.el).textContent = `Always put "${p}" in ${d.catId ? cat(d.catId).name : ''}`;
    };
    paintCats();
    if (!pre.image) setTimeout(() => { const a = $('#mamt', s.el); if (a && !a.value) a.focus(); }, 250);
    s.el.addEventListener('input', e => { if (e.target.id === 'mpayee') { if (!existing && !d.catId) { const g = guessCat(e.target.value, '', d.type); if (g) { d.catId = g; group = cat(g).group; } } paintCats(); } });
    s.el.addEventListener('click', async e => {
      const ty = e.target.closest('[data-type]');
      if (ty) { d.type = ty.dataset.type; d.catId = d.type === 'income' ? guessCat($('#mpayee', s.el).value, '', 'income') : guessCat($('#mpayee', s.el).value, d.upi, 'expense'); group = d.type === 'income' ? 'income' : (d.catId ? cat(d.catId).group : 'needs'); $$('[data-type]', s.el).forEach(b => b.classList.toggle('on', b === ty)); $('#mpayee', s.el).placeholder = d.type === 'income' ? 'From (e.g. Employer)' : 'Paid to (e.g. Swiggy)'; return paintCats(); }
      const g = e.target.closest('[data-g]'); if (g) { group = g.dataset.g; return paintCats(); }
      const c = e.target.closest('[data-cat]'); if (c) { d.catId = c.dataset.cat; return paintCats(); }
      if (e.target.closest('#mrem')) { remember = !remember; $('#mrem .toggle', s.el).classList.toggle('on', remember); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'img') return viewImage(pre.image);
      if (b.dataset.a === 'del') {
        if (await confirmBox('Delete this entry?', '', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) {
          M.txns = M.txns.filter(t => t.id !== d.id);
          M.bills.forEach(bl => Object.keys(bl.paid || {}).forEach(k => { if (bl.paid[k] === d.id) delete bl.paid[k]; }));
          save(); s.close(); refresh(); toast('Deleted');
        }
        return;
      }
      if (b.dataset.a === 'save') {
        const amt = num($('#mamt', s.el).value);
        if (!amt || amt <= 0) { toast('Enter the amount'); $('#mamt', s.el).focus(); return; }
        if (!d.catId) { toast('Pick a category'); return; }
        d.amount = Math.round(amt * 100) / 100;
        d.payee = $('#mpayee', s.el).value.trim();
        d.note = $('#mnote', s.el).value.trim();
        d.date = $('#mdate', s.el).value || dkey(new Date());
        if (!existing) d.at = Date.now();
        if (remember && d.payee && d.type === 'expense') M.rules[norm(d.payee)] = d.catId;
        const i = M.txns.findIndex(t => t.id === d.id);
        if (i >= 0) M.txns[i] = d; else M.txns.push(d);
        const linked = !existing && d.type === 'expense' ? autoLinkBill(d) : null;
        save(); s.close(); refresh();
        const st = stats();
        toast(d.type === 'income' ? `Income saved: ${inr(d.amount)}` : `${inr(d.amount)} · ${cat(d.catId).name}${linked ? ` · ${linked} marked paid` : ''}. ${st.left >= 0 ? inr(st.left) + ' left' : inr(-st.left) + ' over budget'}`);
      }
    });
  }
  function autoLinkBill(t) {
    const d = parseKey(t.date);
    for (const bill of M.bills) {
      const nd = nextDue(bill); if (!nd) continue;
      const near = Math.abs((nd.due - d) / 864e5) <= 7;
      const amtOk = Math.abs(bill.amount - t.amount) <= Math.max(1, bill.amount * 0.02);
      const nameOk = bill.catId === t.catId || norm(t.payee).includes(norm(bill.name)) || norm(bill.name).includes(norm(t.payee) || '§');
      if (near && amtOk && nameOk) { markPaid(bill, nd.due, t.id); return bill.name; }
    }
    return null;
  }
  function viewImage(src) {
    const s = sheet(`<img src="${src}" alt="Payment screenshot" style="width:100%;border-radius:14px;display:block">`, { center: true });
    s.el.addEventListener('click', () => s.close());
  }

  /* ---------- screenshots in ---------- */
  function pickScreenshots() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = async () => {
      const files = [...(inp.files || [])].slice(0, 10);
      if (!files.length) return;
      if (files.length > 1) toast(`Reading ${files.length} screenshots…`);
      for (const f of files) {
        const dataUrl = await new Promise(res => { const rd = new FileReader(); rd.onload = () => res(rd.result); rd.onerror = () => res(null); rd.readAsDataURL(f); });
        if (!dataUrl) continue;
        await readOne(dataUrl);
      }
    };
    document.body.appendChild(inp); inp.click(); setTimeout(() => inp.remove(), 60000);
  }
  async function readOne(dataUrl) {
    if (!P.Ocr) { enqueue({ image: dataUrl, src: 'screenshot', noOcr: true }); return; }
    try {
      const r = await P.Ocr.recognize({ data: dataUrl });
      enqueue(Object.assign(parseReceipt(r), { image: dataUrl, src: 'screenshot' }));
    } catch (e) { enqueue({ image: dataUrl, src: 'screenshot', error: 'Could not read this screenshot' }); }
  }
  async function checkShared() {
    if (!P.Ocr) return;
    let items = [];
    try { items = (await P.Ocr.getPending()).items || []; } catch (e) { return; }
    if (!items.length) return;
    const ok = await openMoney();
    if (!ok) return;
    items.forEach(r => enqueue(r.error ? { image: r.image, src: 'screenshot', error: r.error } : Object.assign(parseReceipt(r), { image: r.image, src: 'screenshot' })));
  }

  /* ---------- lock ---------- */
  async function sha(s) {
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mm:' + s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { let h = 0; for (const c of 'mm:' + s) h = (h * 31 + c.charCodeAt(0)) | 0; return 'h' + h; }
  }
  async function deviceLockAvailable() { if (!P.AppLock) return false; try { return !!(await P.AppLock.available()).available; } catch (e) { return false; } }
  function pinPad(title, sub) {
    return new Promise(res => {
      let v = ''; let done = false;
      const s = sheet(`<h2>${esc(title)}</h2><p class="sub">${esc(sub)}</p><div class="pindots">${'<i></i>'.repeat(4)}</div>
        <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => k === '' ? '<span></span>' : `<button data-k="${k}">${k}</button>`).join('')}</div>`, { center: true, onClose: () => { if (!done) res(null); } });
      const paint = () => $$('.pindots i', s.el).forEach((d, i) => d.classList.toggle('on', i < v.length));
      s.el.addEventListener('click', e => {
        const b = e.target.closest('[data-k]'); if (!b) return;
        if (b.dataset.k === '⌫') v = v.slice(0, -1); else if (v.length < 4) v += b.dataset.k;
        paint();
        if (v.length === 4) { done = true; setTimeout(() => { s.close(); res(v); }, 120); }
      });
    });
  }
  async function unlock() {
    if (!M.lockOn || unlocked) return true;
    if (M.pin) {
      const v = await pinPad('Unlock Money', 'Enter your 4-digit PIN');
      if (v && (await sha(v)) === M.pin) { unlocked = true; return true; }
      if (v) toast('Wrong PIN');
      return false;
    }
    if (P.AppLock && !(await deviceLockAvailable())) {
      // The phone's own screen lock was removed, so there is nothing to unlock with.
      M.lockOn = false; save(); unlocked = true; toast('Phone screen lock is off, so Money lock was turned off'); return true;
    }
    if (P.AppLock) {
      try { const r = await P.AppLock.authenticate({ title: 'Unlock Money' }); if (r.ok) { unlocked = true; return true; } } catch (e) { /* ignore */ }
      return false;
    }
    unlocked = true; return true;
  }
  async function toggleLock() {
    if (M.lockOn) { M.lockOn = false; M.pin = null; save(); unlocked = true; toast('Money lock is off'); return refresh(); }
    if (await deviceLockAvailable()) {
      const r = await P.AppLock.authenticate({ title: 'Turn on Money lock' }).catch(() => ({ ok: false }));
      if (!r.ok) return;
      M.lockOn = true; M.pin = null; save(); unlocked = true; toast('Money is locked with your fingerprint or phone lock');
      return refresh();
    }
    const a = await pinPad('Create a PIN', 'Pick 4 digits to lock the Money side'); if (!a) return;
    const b = await pinPad('Confirm PIN', 'Enter the same 4 digits again'); if (!b) return;
    if (a !== b) { toast('PINs did not match. Try again.'); return; }
    M.lockOn = true; M.pin = await sha(a); save(); unlocked = true; toast('Money lock is on');
    refresh();
  }

  /* ---------- mode switching ---------- */
  async function openMoney(tab) {
    if (!(await unlock())) return false;
    if (S.mode !== 'money') { S.mode = 'money'; saveSettings(); }
    if (tab) mTab = tab;
    currentTab = 'm-' + mTab;
    renderTabs(); paintModebar(); render(); view.scrollTop = 0;
    return true;
  }
  function onHide() { lastHidden = Date.now(); }
  function onShow() {
    if (M.lockOn && lastHidden && Date.now() - lastHidden > 60000) {
      unlocked = false;
      if (S.mode === 'money') { setMode('muscle', true); openMoney(); }
    }
    checkShared();
  }

  /* ---------- views ---------- */
  function setupView() {
    const s = sheet(`<h2>Set up Money</h2><p class="sub">Your budget runs from salary day to the day before the next one. Everything stays on this phone.</p>
      <div class="sect" style="margin-top:4px">Salary day</div>
      <div class="daygrid">${Array.from({ length: 31 }, (_, i) => `<button class="${M.cycleDay === i + 1 ? 'on' : ''}" data-day="${i + 1}">${i + 1}</button>`).join('')}</div>
      <p class="hint" id="cyc"></p>
      <div class="sect">Monthly budget</div>
      <div class="amt"><span>₹</span><input id="sbud" inputmode="numeric" value="${M.budget}" aria-label="Monthly budget"></div>
      <div class="sect">Split</div>
      <div class="presets" style="justify-content:flex-start">${SPLITS.map(([a, b, c]) => `<button class="chip small ${M.split.needs === a && M.split.wants === b ? 'on' : ''}" data-sp="${a},${b},${c}">${a}/${b}/${c}</button>`).join('')}</div>
      <p class="hint">Needs / wants / savings. 50/30/20 is a popular starting rule. You can change it any time.</p>
      <div class="btns"><button class="btn primary" data-a="go">Start tracking</button></div>`);
    const paintCyc = () => { const st = cycleStart(new Date()); $('#cyc', s.el).textContent = `This cycle: ${short(st)} – ${short(cycleEnd(st))}`; };
    paintCyc();
    s.el.addEventListener('click', e => {
      const dd = e.target.closest('[data-day]'); if (dd) { M.cycleDay = +dd.dataset.day; $$('[data-day]', s.el).forEach(x => x.classList.toggle('on', x === dd)); return paintCyc(); }
      const sp = e.target.closest('[data-sp]'); if (sp) { const [a, b, c] = sp.dataset.sp.split(',').map(Number); M.split = { needs: a, wants: b, savings: c }; $$('[data-sp]', s.el).forEach(x => x.classList.toggle('on', x === sp)); return; }
      if (e.target.closest('[data-a="go"]')) {
        const v = num($('#sbud', s.el).value); if (!v || v < 100) { toast('Enter your monthly budget'); return; }
        M.budget = Math.round(v); M.setup = true; save(); s.close(); refresh();
      }
    });
  }

  function topbarM(title, right = '') { return topbar(title, right); }
  function lockView() {
    view.innerHTML = topbarM('Money') + `<div class="page"><div class="empty" style="padding-top:60px"><span class="lockico">${ic('lock')}</span><b>Money is locked</b>Unlock with ${M.pin ? 'your PIN' : 'your fingerprint or phone lock'} to see your spending.</div><button class="btn primary" data-a="unlock">Unlock</button></div>`;
    $('[data-a="unlock"]', view).onclick = async () => { if (await unlock()) refresh(); };
  }

  function stackBar(st) {
    const parts = GKEYS.map(g => ({ g, v: st.spent[g] })).filter(p => p.v > 0);
    const denom = Math.max(st.budget, st.total) || 1;
    return `<div class="sbar">${parts.map(p => `<i style="width:${(p.v / denom * 100).toFixed(2)}%;background:${GROUPS[p.g].color}" title="${GROUPS[p.g].name}: ${inr(p.v)}"></i>`).join('')}</div>`;
  }
  function paceChip(st) {
    if (!st.current) return '';
    const diff = st.total - st.pace;
    if (st.left < 0) return `<span class="pchip bad">${ic('info')}Over budget by ${inr(-st.left)}</span>`;
    if (diff > st.budget * 0.05) return `<span class="pchip warn">${ic('chevU')}${inr(diff)} ahead of pace</span>`;
    return `<span class="pchip ok">${ic('check')}On track</span>`;
  }
  function txRow(t) {
    const c = cat(t.catId);
    return `<button class="txrow" data-tx="${t.id}"><span class="txi" style="--gc:${isIncome(t) ? 'var(--accent)' : GROUPS[c.group || 'wants'].color}">${c.icon}</span>
      <span class="txm"><b>${esc(t.payee || c.name)}</b><span>${esc(c.name)}${t.note ? ' · ' + esc(t.note) : ''}${t.src === 'screenshot' ? ' · 📷' : ''}</span></span>
      <span class="txa ${isIncome(t) ? 'in' : ''}">${isIncome(t) ? inr(t.amount, { sign: true, dec: true }) : '−' + inr(t.amount, { dec: true }).slice(0)}</span></button>`;
  }

  function homeView() {
    if (!M.setup) {
      view.innerHTML = topbarM('Money') + `<div class="page">${artCard('rings', 'Know where every rupee goes.', { small: true })}
        <div class="empty" style="padding:16px 8px"><b>Track your money</b>Set your salary day and monthly budget. Add expenses by hand or share a PhonePe / Google Pay screenshot, and see what's left instantly.</div>
        <button class="btn primary" data-a="setup">Set up Money</button></div>`;
      $('[data-a="setup"]', view).onclick = setupView;
      return;
    }
    const st = stats();
    const recent = M.txns.slice().sort((a, b) => (b.date.localeCompare(a.date)) || (b.at - a.at)).slice(0, 6);
    const bills = M.bills.map(b => ({ b, nd: nextDue(b) })).filter(x => x.nd).sort((x, y) => x.nd.due - y.nd.due).slice(0, 3);
    const pct = st.budget ? Math.min(100, st.total / st.budget * 100) : 0;
    view.innerHTML = topbarM('Money') + `<div class="page">
      <div class="mhero">
        <div class="k">${short(st.s)} – ${short(st.e)} · ${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} left</div>
        <div class="big ${st.left < 0 ? 'neg' : ''}">${inr(st.left)}</div>
        <div class="sub2">${st.left >= 0 ? 'left' : 'over'} of ${inr(st.budget)} budget · ${Math.round(pct)}% used</div>
        ${stackBar(st)}
        <div class="mlegend">${GKEYS.map(g => `<span><i style="background:${GROUPS[g].color}"></i>${GROUPS[g].name} ${inr(st.spent[g])}</span>`).join('')}</div>
        <div class="mhero-row">
          <div class="safe"><span>Safe to spend today</span><b>${inr(Math.max(0, st.safe - st.spentToday))}</b><small>${st.spentToday ? `${inr(st.safe)}/day · ${inr(st.spentToday)} spent today` : `${inr(st.safe)} per day for ${st.daysLeft} days`}</small></div>
          ${paceChip(st)}
        </div>
        ${st.reserve > 0 ? `<p class="hint" style="margin:8px 0 0">Keeps ${inr(st.reserve)} aside for ${[st.billNW ? 'upcoming bills' : '', st.savingsLeft ? 'your savings goal' : ''].filter(Boolean).join(' and ')}.</p>` : ''}
      </div>
      <div class="mactions"><button class="btn primary" data-a="add">${ic('plus')}Add expense</button><button class="btn" data-a="scan">${ic('scan')}Screenshot</button></div>
      <div class="sect"><span>${M.split.needs}/${M.split.wants}/${M.split.savings} plan</span><button class="linkbtn" data-go="budget">Edit</button></div>
      <div class="block" style="padding:4px 0">${GKEYS.map(g => { const tg = st.target(g); const v = st.spent[g]; const over = g !== 'savings' && v > tg; return `
        <div class="grow"><div class="gl"><span><i style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</span><span><b>${inr(v)}</b> / ${inr(tg)}${over ? ' <em class="bad">over</em>' : g === 'savings' && v >= tg && tg > 0 ? ' <em class="ok">done</em>' : ''}</span></div>
        <div class="gbar"><i style="width:${Math.min(100, tg ? v / tg * 100 : 0).toFixed(1)}%;background:${GROUPS[g].color}"></i></div></div>`; }).join('')}</div>
      ${st.income ? `<div class="sect">Income this cycle</div><div class="block inc"><div><span>Income</span><b>${inr(st.income)}</b></div><div><span>Spent</span><b>${inr(st.spent.needs + st.spent.wants)}</b></div><div><span>Saved</span><b>${st.income ? Math.round((st.income - st.spent.needs - st.spent.wants) / st.income * 100) : 0}%</b></div></div>` : ''}
      ${bills.length ? `<div class="sect"><span>Upcoming bills</span><button class="linkbtn" data-go="budget">All</button></div><div class="block" style="padding:0">${bills.map(({ b, nd }) => billRow(b, nd)).join('')}</div>` : ''}
      <div class="sect"><span>Recent</span>${M.txns.length ? '<button class="linkbtn" data-go="txns">See all</button>' : ''}</div>
      <div class="block" style="padding:0">${recent.map(txRow).join('') || `<div class="empty" style="padding:18px">No entries yet. Tap <b style="display:inline;font-family:var(--body);font-size:14px">Add expense</b> or share a payment screenshot to this app.</div>`}</div>
      <p class="hint" style="margin-top:14px">Tip: in PhonePe or Google Pay, open a payment and tap <b>Share</b> → <b>Muscle &amp; Money</b>. The app reads the amount and payee for you.</p>
    </div>
    <button class="fab" data-a="add" aria-label="Add expense">${ic('plus')}</button>`;
  }
  function billRow(b, nd) {
    const c = cat(b.catId);
    const days = Math.round((nd.due - today0()) / 864e5);
    const when = nd.overdue ? `Overdue · was due ${short(nd.due)}` : days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due ${short(nd.due)} · in ${days} days`;
    return `<div class="billrow"><span class="txi" style="--gc:${GROUPS[c.group || 'needs'].color}">${c.icon}</span><button class="txm" data-bill="${b.id}"><b>${esc(b.name)}</b><span class="${nd.overdue ? 'badt' : ''}">${when}</span></button>
      <span class="ba">${inr(b.amount)}</span><button class="paybtn" data-pay="${b.id}" data-due="${dkey(nd.due)}">Paid</button></div>`;
  }

  function txnsView() {
    const s = cycleStart(new Date(), txCycleOffset), e = cycleEnd(s);
    let tx = M.txns.filter(t => inCycle(t, s, e));
    if (txFilter === 'income') tx = tx.filter(isIncome);
    else if (txFilter !== 'all') tx = tx.filter(t => !isIncome(t) && cat(t.catId).group === txFilter);
    if (txQuery) { const q = txQuery.toLowerCase(); tx = tx.filter(t => (t.payee + ' ' + cat(t.catId).name + ' ' + (t.note || '')).toLowerCase().includes(q)); }
    tx.sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
    const byDay = {}; tx.forEach(t => { (byDay[t.date] = byDay[t.date] || []).push(t); });
    const total = tx.filter(t => !isIncome(t)).reduce((a, t) => a + t.amount, 0);
    view.innerHTML = topbarM('Transactions') + `<div class="page">
      <div class="cal-head" style="padding:0 0 10px"><button data-cy="-1" aria-label="Previous cycle">${ic('chevL')}</button><span class="m" style="font-size:22px">${short(s)} – ${short(e)}</span><button data-cy="1" aria-label="Next cycle" ${txCycleOffset >= 0 ? 'disabled style="opacity:.3"' : ''}>${ic('chevR')}</button></div>
      <input class="search" id="txq" placeholder="Search payee, category or note" value="${esc(txQuery)}">
      <div class="chips" style="margin-bottom:12px">${[['all', 'All'], ['needs', 'Needs'], ['wants', 'Wants'], ['savings', 'Savings'], ['income', 'Income']].map(([k, n]) => `<button class="chip small ${txFilter === k ? 'on' : ''}" data-f="${k}">${n}</button>`).join('')}</div>
      <p class="hint" style="margin:0 2px 10px">${tx.length} entr${tx.length === 1 ? 'y' : 'ies'}${total ? ` · ${inr(total)} spent` : ''}</p>
      ${Object.entries(byDay).map(([k, list]) => `<div class="sect"><span>${esc(dlabel(k))}</span><span style="text-transform:none;letter-spacing:0">${inr(list.filter(t => !isIncome(t)).reduce((a, t) => a + t.amount, 0))}</span></div><div class="block" style="padding:0">${list.map(txRow).join('')}</div>`).join('') || `<div class="empty">Nothing here yet.</div>`}
    </div>
    <button class="fab" data-a="add" aria-label="Add expense">${ic('plus')}</button>`;
    const q = $('#txq', view);
    q.addEventListener('input', () => { txQuery = q.value; const pos = q.selectionStart; txnsView(); const n = $('#txq', view); n.focus(); n.setSelectionRange(pos, pos); });
  }

  function budgetView() {
    const st = stats();
    view.innerHTML = topbarM('Budget') + `<div class="page">
      <div class="block">
        <button class="set-row" data-a="cbud"><span class="st"><div class="t">This cycle's budget</div><div class="s">${short(st.s)} – ${short(st.e)}</div></span><span class="val">${inr(st.budget)}</span>${ic('chevR', 'chev')}</button>
        <button class="set-row" data-a="dbud"><span class="st"><div class="t">Default monthly budget</div><div class="s">Used for every new cycle</div></span><span class="val">${inr(M.budget)}</span>${ic('chevR', 'chev')}</button>
        <button class="set-row" data-a="day"><span class="st"><div class="t">Salary day</div><div class="s">Cycle starts on this date each month</div></span><span class="val">${M.cycleDay}</span>${ic('chevR', 'chev')}</button>
      </div>
      <div class="sect">Split</div>
      <div class="block" style="padding:12px 16px">
        <div class="presets" style="justify-content:flex-start;margin:0">${SPLITS.map(([a, b, c]) => `<button class="chip small ${M.split.needs === a && M.split.wants === b && M.split.savings === c ? 'on' : ''}" data-sp="${a},${b},${c}">${a}/${b}/${c}</button>`).join('')}<button class="chip small" data-a="custom">Custom</button></div>
        <p class="hint">Needs ${inr(st.target('needs'))} · Wants ${inr(st.target('wants'))} · Savings ${inr(st.target('savings'))} this cycle.</p>
      </div>
      ${GKEYS.map(g => { const list = M.cats.filter(c => c.group === g).map(c => ({ c, v: st.tx.filter(t => !isIncome(t) && t.catId === c.id).reduce((a, t) => a + t.amount, 0) })).sort((a, b) => b.v - a.v); const max = Math.max(1, ...list.map(x => x.v)); return `
        <div class="sect"><span><i class="gdot" style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</span><span style="text-transform:none;letter-spacing:0">${inr(st.spent[g])} of ${inr(st.target(g))}</span></div>
        <div class="block" style="padding:4px 0">${list.map(({ c, v }) => `<div class="catrow"><span class="ce">${c.icon}</span><span class="cn">${esc(c.name)}<i style="width:${(v / max * 100).toFixed(1)}%;background:${GROUPS[g].color};opacity:${v ? 1 : 0}"></i></span><span class="cv">${v ? inr(v) : '—'}</span></div>`).join('')}</div>`; }).join('')}
      <div class="sect"><span>Recurring bills</span><button class="linkbtn" data-a="addbill">+ Add</button></div>
      <div class="block" style="padding:0">${M.bills.map(b => ({ b, nd: nextDue(b) })).sort((x, y) => (x.nd ? x.nd.due : 9e15) - (y.nd ? y.nd.due : 9e15)).map(({ b, nd }) => nd ? billRow(b, nd) : '').join('') || `<div class="empty" style="padding:18px">Add rent, EMIs, SIPs or subscriptions. You get a reminder the day before, and paying them keeps your budget right.</div>`}</div>
    </div>`;
  }

  function lineCum(st) {
    const W = 320, H = 150, L = 40, R = 10, T = 14, B = 20;
    const days = st.totalDays, upto = st.current ? st.elapsed : days;
    const daily = new Array(days).fill(0);
    st.tx.forEach(t => { if (isIncome(t)) return; const i = Math.round((parseKey(t.date) - st.s) / 864e5); if (i >= 0 && i < days) daily[i] += t.amount; });
    const cum = []; daily.reduce((a, v, i) => { cum[i] = a + v; return cum[i]; }, 0);
    const max = Math.max(st.budget, ...cum.slice(0, upto), 1) * 1.08;
    const X = i => L + (i / Math.max(1, days - 1)) * (W - L - R), Y = v => T + (1 - v / max) * (H - T - B);
    const pts = cum.slice(0, upto).map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const ticks = [0, st.budget / 2, st.budget];
    const lastI = upto - 1;
    return `<div class="chartwrap" data-chart="cum"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Spending so far this cycle compared with an even pace">
      ${ticks.map(v => `<line class="grid" x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/><text class="lbl" x="${L - 6}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v)}</text>`).join('')}
      <line x1="${X(0)}" y1="${Y(0)}" x2="${X(days - 1)}" y2="${Y(st.budget)}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4 4"/>
      <text class="lbl" x="${L}" y="${H - 4}">${esc(short(st.s))}</text><text class="lbl" x="${W - R}" y="${H - 4}" text-anchor="end">${esc(short(st.e))}</text>
      ${upto > 1 ? `<path class="line" d="${pts}"/>` : ''}${lastI >= 0 ? `<circle class="pt" cx="${X(lastI).toFixed(1)}" cy="${Y(cum[lastI]).toFixed(1)}" r="4.5"/>` : ''}
      <line class="xhair" id="xh" x1="0" x2="0" y1="${T}" y2="${H - B}" style="display:none"/>
    </svg><div class="tip" id="ctip" hidden></div></div>
    <div class="mlegend" style="margin-top:6px"><span><i style="background:var(--accent)"></i>Spent so far</span><span><i class="dash"></i>Even pace to ${inr(st.budget)}</span></div>`;
  }
  function insightsView() {
    if (!M.setup) return homeView();
    const st = stats(insCycleOffset);
    const byCat = {}; st.tx.filter(t => !isIncome(t)).forEach(t => { byCat[t.catId] = (byCat[t.catId] || 0) + t.amount; });
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const top = cats.slice(0, 7); const otherV = cats.slice(7).reduce((a, x) => a + x[1], 0);
    const maxC = Math.max(1, ...top.map(x => x[1]), otherV);
    const payees = {}; st.tx.filter(t => !isIncome(t) && t.payee).forEach(t => { const k = t.payee.trim(); payees[k] = payees[k] || { v: 0, n: 0 }; payees[k].v += t.amount; payees[k].n++; });
    const topP = Object.entries(payees).sort((a, b) => b[1].v - a[1].v).slice(0, 5);
    // Only cycles since your first entry, up to six.
    const first = M.txns.reduce((m, t) => (t.date < m ? t.date : m), dkey(new Date()));
    const firstStart = cycleStart(parseKey(first));
    const hist = []; for (let o = insCycleOffset - 5; o <= insCycleOffset; o++) { const h = stats(o); if (h.s >= firstStart || o === insCycleOffset) hist.push(h); }
    const maxH = Math.max(1, ...hist.map(h => Math.max(h.total, h.budget)));
    view.innerHTML = topbarM('Insights') + `<div class="page">
      <div class="cal-head" style="padding:0 0 10px"><button data-icy="-1" aria-label="Previous cycle">${ic('chevL')}</button><span class="m" style="font-size:22px">${short(st.s)} – ${short(st.e)}</span><button data-icy="1" aria-label="Next cycle" ${insCycleOffset >= 0 ? 'disabled style="opacity:.3"' : ''}>${ic('chevR')}</button></div>
      <div class="stats">
        <div class="stat"><div class="k">Spent</div><div class="v">${inr(st.total)}</div><div class="s">of ${inr(st.budget)} budget</div></div>
        <div class="stat"><div class="k">Income</div><div class="v">${inr(st.income)}</div><div class="s">${st.income ? `${Math.round((st.income - st.spent.needs - st.spent.wants) / st.income * 100)}% kept after needs & wants` : 'Log salary to see your savings rate'}</div></div>
      </div>
      <div class="sect">Spending pace</div>
      <div class="chart-card">${lineCum(st)}</div>
      <div class="sect">Where it went</div>
      <div class="block" style="padding:6px 0">${top.map(([id, v]) => { const c = cat(id); return `<div class="catrow"><span class="ce">${c.icon}</span><span class="cn">${esc(c.name)}<i style="width:${(v / maxC * 100).toFixed(1)}%;background:${GROUPS[c.group || 'wants'].color}"></i></span><span class="cv">${inr(v)}<small>${st.total ? Math.round(v / st.total * 100) : 0}%</small></span></div>`; }).join('')}
        ${otherV ? `<div class="catrow"><span class="ce">…</span><span class="cn">Everything else<i style="width:${(otherV / maxC * 100).toFixed(1)}%;background:var(--faint)"></i></span><span class="cv">${inr(otherV)}</span></div>` : ''}
        ${top.length ? '' : '<div class="empty" style="padding:16px">No spending in this cycle.</div>'}</div>
      <div class="mlegend">${GKEYS.map(g => `<span><i style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</span>`).join('')}</div>
      <div class="sect">Last 6 cycles</div>
      <div class="chart-card"><div class="hbars" style="grid-template-columns:repeat(${hist.length}, 1fr)">${hist.map(h => `<div class="hb" title="${short(h.s)}: ${inr(h.total)} of ${inr(h.budget)}"><em>${h.total >= 1000 ? Math.round(h.total / 1000) + 'k' : Math.round(h.total)}</em><span class="col"><i style="height:${(h.total / maxH * 100).toFixed(1)}%;${h.total > h.budget ? 'background:var(--danger)' : ''}"></i><b style="bottom:${(h.budget / maxH * 100).toFixed(1)}%"></b></span><span class="hl">${esc(short(h.s))}</span></div>`).join('')}</div>
        <div class="mlegend" style="margin-top:8px"><span><i style="background:var(--accent)"></i>Spent</span><span><i style="background:var(--danger)"></i>Over budget</span><span><i class="tick"></i>Budget</span></div></div>
      ${topP.length ? `<div class="sect">Top payees</div><div class="block" style="padding:0">${topP.map(([n, x]) => `<div class="mini-row"><span>${esc(n)}<small>${x.n} payment${x.n > 1 ? 's' : ''}</small></span><b>${inr(x.v)}</b></div>`).join('')}</div>` : ''}
    </div>`;
    wireChart();
  }
  function wireChart() {
    const wrap = $('[data-chart="cum"]', view); if (!wrap) return;
    const svg = $('svg', wrap), tip = $('#ctip', wrap), xh = $('#xh', wrap);
    const st = stats(insCycleOffset);
    const days = st.totalDays, upto = st.current ? st.elapsed : days;
    const daily = new Array(days).fill(0);
    st.tx.forEach(t => { if (isIncome(t)) return; const i = Math.round((parseKey(t.date) - st.s) / 864e5); if (i >= 0 && i < days) daily[i] += t.amount; });
    let run = 0; const cum = daily.map(v => (run += v));
    const show = ev => {
      const r = svg.getBoundingClientRect(); const px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / r.width * 320;
      const i = clamp(Math.round((px - 40) / (270) * (days - 1)), 0, upto - 1); if (i < 0) return;
      const x = 40 + i / Math.max(1, days - 1) * 270;
      xh.setAttribute('x1', x); xh.setAttribute('x2', x); xh.style.display = '';
      const d = addDays(st.s, i);
      tip.hidden = false; tip.innerHTML = `<b>${esc(short(d))}</b><span>${inr(daily[i])} that day</span><span>${inr(cum[i])} so far · pace ${inr(st.budget * (i + 1) / days)}</span>`;
      tip.style.left = Math.min(r.width - 170, Math.max(0, x / 320 * r.width - 80)) + 'px';
    };
    const hide = () => { tip.hidden = true; xh.style.display = 'none'; };
    svg.addEventListener('pointermove', show); svg.addEventListener('pointerdown', show); svg.addEventListener('pointerleave', hide);
  }

  function settingsView() {
    view.innerHTML = topbarM('Money Settings') + `<div class="page">
      <div class="sect">Budget</div>
      <div class="block">
        <button class="set-row" data-a="day"><span class="st"><div class="t">Salary day</div><div class="s">Your budget cycle starts on this date</div></span><span class="val">${M.cycleDay}</span>${ic('chevR', 'chev')}</button>
        <button class="set-row" data-a="dbud"><span class="st"><div class="t">Monthly budget</div></span><span class="val">${inr(M.budget)}</span>${ic('chevR', 'chev')}</button>
        <button class="set-row" data-go="budget"><span class="st"><div class="t">Split & bills</div><div class="s">${M.split.needs}/${M.split.wants}/${M.split.savings} · ${M.bills.length} recurring bill${M.bills.length === 1 ? '' : 's'}</div></span>${ic('chevR', 'chev')}</button>
      </div>
      <div class="sect">Categories</div>
      <div class="block" style="padding:0">${GKEYS.map(g => `<div class="catgroup"><div class="cg"><i class="gdot" style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</div><div class="catgrid">${M.cats.filter(c => c.group === g).map(c => `<button class="catchip" data-ecat="${c.id}"><span>${c.icon}</span>${esc(c.name)}</button>`).join('')}<button class="catchip add" data-acat="${g}">+ Add</button></div></div>`).join('')}</div>
      <p class="hint" style="margin:8px 2px 0">${Object.keys(M.rules).length} payee${Object.keys(M.rules).length === 1 ? '' : 's'} remembered for automatic categories.${Object.keys(M.rules).length ? ' <button class="linkbtn" data-a="rules">Manage</button>' : ''}</p>
      <div class="sect">Privacy & reminders</div>
      <div class="block">
        <button class="set-row" data-a="lock"><span class="st"><div class="t">Money lock</div><div class="s">${M.lockOn ? (M.pin ? 'On · 4-digit PIN' : 'On · fingerprint or phone lock') : 'Ask for fingerprint, phone lock or PIN before showing Money'}</div></span><span class="toggle ${M.lockOn ? 'on' : ''}"></span></button>
        <div class="set-row"><span class="st"><div class="t">Bill reminder time</div><div class="s">The day before a bill is due</div></span><input type="time" id="rtime" value="${esc(M.remindTime)}" class="timein"></div>
      </div>
      <div class="sect">Your data</div>
      <div class="block">
        <button class="set-row" data-a="csv"><span class="st"><div class="t">Export to spreadsheet</div><div class="s">CSV file of all ${M.txns.length} entries, opens in Excel or Google Sheets</div></span>${ic('upload')}</button>
        <button class="set-row" data-a="backup"><span class="st"><div class="t">Back up everything</div><div class="s">Workouts and money in one file</div></span>${ic('upload')}</button>
        <button class="set-row" data-a="wipe"><span class="st"><div class="t" style="color:var(--danger)">Delete all money data</div><div class="s">Entries, bills and categories. Workouts are not touched.</div></span></button>
      </div>
      <p class="hint" style="margin-top:14px">Everything stays on this phone. Screenshots are read on the phone and never uploaded.</p>
    </div>`;
    const rt = $('#rtime', view); rt.addEventListener('change', () => { M.remindTime = rt.value || '09:00'; save(); scheduleBillReminders(); toast('Reminder time saved'); });
  }

  /* ---------- small editors ---------- */
  function amountSheet(title, value, cb, sub = '') {
    const s = sheet(`<h2>${esc(title)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}<div class="amt"><span>₹</span><input id="av" inputmode="numeric" value="${Math.round(value || 0)}"></div>
      <div class="presets">${[20000, 30000, 40000, 50000, 75000, 100000].map(v => `<button class="chip small" data-v="${v}">${inr(v)}</button>`).join('')}</div>
      <div class="btns two"><button class="btn" data-a="c">Cancel</button><button class="btn primary" data-a="ok">Save</button></div>`);
    setTimeout(() => { const i = $('#av', s.el); i.focus(); i.select(); }, 250);
    s.el.addEventListener('click', e => {
      const v = e.target.closest('[data-v]'); if (v) { $('#av', s.el).value = v.dataset.v; return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'c') return s.close();
      const n = num($('#av', s.el).value); if (!n || n < 1) { toast('Enter an amount'); return; }
      s.close(); cb(Math.round(n));
    });
  }
  function dayPicker() {
    const s = sheet(`<h2>Salary day</h2><p class="sub">If a month is shorter, the cycle starts on its last day.</p><div class="daygrid">${Array.from({ length: 31 }, (_, i) => `<button class="${M.cycleDay === i + 1 ? 'on' : ''}" data-day="${i + 1}">${i + 1}</button>`).join('')}</div>`);
    s.el.addEventListener('click', e => { const d = e.target.closest('[data-day]'); if (!d) return; M.cycleDay = +d.dataset.day; save(); s.close(); refresh(); toast(`Cycle now ${short(cycleStart(new Date()))} – ${short(cycleEnd(cycleStart(new Date())))}`); });
  }
  function customSplit() {
    const s = sheet(`<h2>Custom split</h2><p class="sub">Percent of your budget. Must add up to 100.</p>
      ${GKEYS.map(g => `<div class="unit-in" style="margin-bottom:8px"><span style="width:80px;color:var(--text)"><i class="gdot" style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</span><input class="field body" data-sp="${g}" inputmode="numeric" value="${M.split[g]}" style="text-align:center"><span>%</span></div>`).join('')}
      <p class="hint" id="sum"></p><div class="btns two"><button class="btn" data-a="c">Cancel</button><button class="btn primary" data-a="ok">Save</button></div>`);
    const total = () => GKEYS.reduce((a, g) => a + (parseInt($(`[data-sp="${g}"]`, s.el).value, 10) || 0), 0);
    const paint = () => { $('#sum', s.el).textContent = `Total: ${total()}%`; };
    paint(); s.el.addEventListener('input', paint);
    s.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'c') return s.close();
      if (total() !== 100) { toast('The three numbers must add up to 100'); return; }
      GKEYS.forEach(g => { M.split[g] = parseInt($(`[data-sp="${g}"]`, s.el).value, 10) || 0; }); save(); s.close(); refresh();
    });
  }
  function billSheet(bill) {
    const isNew = !bill;
    const b = bill ? clone(bill) : { id: uid(), name: '', amount: null, catId: 'rent', freq: 'monthly', day: M.cycleDay, month: new Date().getMonth(), remind: true, paid: {}, created: Date.now() };
    const s = sheet(`<h2>${isNew ? 'Add recurring bill' : 'Edit bill'}</h2>
      <input class="field body" id="bn" placeholder="Name (e.g. Rent, Car EMI, Netflix)" value="${esc(b.name)}" maxlength="30" style="margin-bottom:10px">
      <div class="amt"><span>₹</span><input id="ba" inputmode="numeric" placeholder="0" value="${b.amount || ''}"></div>
      <div class="seg" style="background:var(--surface-2)"><button class="${b.freq === 'monthly' ? 'on' : ''}" data-fq="monthly">Every month</button><button class="${b.freq === 'yearly' ? 'on' : ''}" data-fq="yearly">Every year</button></div>
      <div id="bwhen"></div>
      <div class="sect">Category</div>
      <div class="catgrid">${M.cats.map(c => `<button class="catchip ${b.catId === c.id ? 'on' : ''}" data-bc="${c.id}"><span>${c.icon}</span>${esc(c.name)}</button>`).join('')}</div>
      <label class="mremember" data-a="rem"><span class="toggle sm ${b.remind !== false ? 'on' : ''}"></span><span>Remind me the day before</span></label>
      <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="ok">Save</button></div>`);
    const paintWhen = () => {
      $('#bwhen', s.el).innerHTML = `<div class="sect" style="margin-top:12px">Due ${b.freq === 'yearly' ? 'on' : 'every month on day'}</div>
        ${b.freq === 'yearly' ? `<div class="presets" style="justify-content:flex-start">${MONTHS.map((m, i) => `<button class="chip small ${b.month === i ? 'on' : ''}" data-bm="${i}">${m.slice(0, 3)}</button>`).join('')}</div>` : ''}
        <div class="daygrid">${Array.from({ length: 31 }, (_, i) => `<button class="${b.day === i + 1 ? 'on' : ''}" data-bd="${i + 1}">${i + 1}</button>`).join('')}</div>`;
    };
    paintWhen();
    s.el.addEventListener('click', async e => {
      const t = e.target;
      const fq = t.closest('[data-fq]'); if (fq) { b.freq = fq.dataset.fq; $$('[data-fq]', s.el).forEach(x => x.classList.toggle('on', x === fq)); return paintWhen(); }
      const bm = t.closest('[data-bm]'); if (bm) { b.month = +bm.dataset.bm; return paintWhen(); }
      const bd = t.closest('[data-bd]'); if (bd) { b.day = +bd.dataset.bd; return paintWhen(); }
      const bc = t.closest('[data-bc]'); if (bc) { b.catId = bc.dataset.bc; $$('[data-bc]', s.el).forEach(x => x.classList.toggle('on', x === bc)); return; }
      const a = t.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'rem') { b.remind = b.remind === false; $('.toggle', a).classList.toggle('on', b.remind !== false); return; }
      if (a.dataset.a === 'del') { if (await confirmBox('Delete this bill?', 'Past payments stay in your transactions.', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { M.bills = M.bills.filter(x => x.id !== b.id); save(); s.close(); scheduleBillReminders(); refresh(); } return; }
      if (a.dataset.a === 'ok') {
        b.name = $('#bn', s.el).value.trim(); b.amount = num($('#ba', s.el).value);
        if (!b.name) { toast('Give the bill a name'); return; }
        if (!b.amount) { toast('Enter the amount'); return; }
        const i = M.bills.findIndex(x => x.id === b.id); if (i >= 0) M.bills[i] = b; else M.bills.push(b);
        save(); s.close(); refresh();
        if (b.remind !== false) await BG.ensurePermission(true);
        scheduleBillReminders();
      }
    });
  }
  function catSheet(c, group) {
    const isNew = !c;
    const d = c ? clone(c) : { id: 'c' + uid(), name: '', group, icon: '📦' };
    const EM = ['📦', '🏠', '🛒', '💡', '⛽', '💊', '🏦', '🛡️', '📚', '🍔', '☕', '🛍️', '🎬', '✈️', '🏋️', '💇', '🎁', '🐶', '👶', '🚗', '📱', '🧾', '📈', '💰', '🛟', '🎓', '🍺', '🎮'];
    const used = M.txns.some(t => t.catId === d.id) || M.bills.some(b => b.catId === d.id);
    const s = sheet(`<h2>${isNew ? 'New category' : 'Edit category'}</h2>
      <input class="field body" id="cn" placeholder="Name" value="${esc(d.name)}" maxlength="24" style="margin-bottom:10px">
      <div class="gtabs">${GKEYS.map(g => `<button class="${d.group === g ? 'on' : ''}" data-g="${g}" style="--gc:${GROUPS[g].color}">${GROUPS[g].name}</button>`).join('')}</div>
      <div class="emojis">${EM.map(x => `<button class="${d.icon === x ? 'on' : ''}" data-em="${x}">${x}</button>`).join('')}</div>
      <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : `<button class="btn danger" data-a="del">${used ? 'Merge into Other' : 'Delete'}</button>`}<button class="btn primary" data-a="ok">Save</button></div>`);
    s.el.addEventListener('click', e => {
      const g = e.target.closest('[data-g]'); if (g) { d.group = g.dataset.g; $$('[data-g]', s.el).forEach(x => x.classList.toggle('on', x === g)); return; }
      const em = e.target.closest('[data-em]'); if (em) { d.icon = em.dataset.em; $$('[data-em]', s.el).forEach(x => x.classList.toggle('on', x === em)); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'del') {
        if (d.id === 'other') { toast('"Other" is needed as a fallback'); return; }
        M.txns.forEach(t => { if (t.catId === d.id) t.catId = 'other'; }); M.bills.forEach(b => { if (b.catId === d.id) b.catId = 'other'; });
        Object.keys(M.rules).forEach(k => { if (M.rules[k] === d.id) delete M.rules[k]; });
        M.cats = M.cats.filter(x => x.id !== d.id); save(); s.close(); refresh(); return;
      }
      d.name = $('#cn', s.el).value.trim(); if (!d.name) { toast('Give it a name'); return; }
      const i = M.cats.findIndex(x => x.id === d.id); if (i >= 0) M.cats[i] = d; else M.cats.push(d);
      save(); s.close(); refresh();
    });
  }
  function rulesSheet() {
    const s = sheet(`<h2>Remembered payees</h2><p class="sub">New payments from these payees get this category automatically.</p>
      <div class="mini-list">${Object.entries(M.rules).sort().map(([k, id]) => `<div class="mrow"><span>${esc(k)}</span><span style="display:flex;gap:10px;align-items:center"><b style="font-family:var(--body);font-size:14px">${cat(id).icon} ${esc(cat(id).name)}</b><button class="rm" data-rk="${esc(k)}" aria-label="Forget">${ic('close')}</button></span></div>`).join('')}</div>`);
    s.el.addEventListener('click', e => { const r = e.target.closest('[data-rk]'); if (!r) return; delete M.rules[r.dataset.rk]; save(); r.closest('.mrow').remove(); });
  }
  async function exportCsv() {
    const rows = [['Date', 'Type', 'Amount', 'Group', 'Category', 'Payee', 'Note', 'Source']];
    M.txns.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(t => { const c = cat(t.catId); rows.push([t.date, t.type, t.amount, isIncome(t) ? 'Income' : GROUPS[c.group || 'wants'].name, c.name, t.payee || '', t.note || '', t.src || '']); });
    const csv = rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\n');
    const fname = `muscle-money-${dkey(new Date())}.csv`;
    try {
      if (P.Filesystem && P.Share) { const r = await P.Filesystem.writeFile({ path: fname, data: csv, directory: 'CACHE', encoding: 'utf8' }); await P.Share.share({ title: 'Money export', files: [r.uri], dialogTitle: 'Save or send the spreadsheet' }); }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = fname; document.body.appendChild(a); a.click(); a.remove(); }
    } catch (e) { if (!String(e && e.message || e).toLowerCase().includes('cancel')) toast('Export failed'); }
  }

  /* ---------- routing ---------- */
  function renderTab(tab) {
    mTab = tab;
    if (M.lockOn && !unlocked) return lockView();
    ({ home: homeView, txns: txnsView, budget: budgetView, insights: insightsView, settings: settingsView })[tab]();
  }
  function refresh() { if (S.mode === 'money' && !$('#layer > .screen')) { const t = view.scrollTop; renderTab(mTab); view.scrollTop = t; } }
  async function handleClick(e) {
    const t = e.target;
    const tx = t.closest('[data-tx]'); if (tx) return entrySheet({ id: tx.dataset.tx });
    const pay = t.closest('[data-pay]'); if (pay) { const bill = M.bills.find(b => b.id === pay.dataset.pay); markPaid(bill, parseKey(pay.dataset.due)); refresh(); const st = stats(); toast(`${bill.name} paid · ${inr(st.left)} left`); return; }
    const bl = t.closest('[data-bill]'); if (bl) return billSheet(M.bills.find(b => b.id === bl.dataset.bill));
    const gotab = t.closest('[data-go]'); if (gotab) { currentTab = 'm-' + gotab.dataset.go; renderTabs(); render(); view.scrollTop = 0; return; }
    const f = t.closest('[data-f]'); if (f && mTab === 'txns') { txFilter = f.dataset.f; return refresh(); }
    const cy = t.closest('[data-cy]'); if (cy) { txCycleOffset = Math.min(0, txCycleOffset + +cy.dataset.cy); return refresh(); }
    const icy = t.closest('[data-icy]'); if (icy) { insCycleOffset = Math.min(0, insCycleOffset + +icy.dataset.icy); return refresh(); }
    const sp = t.closest('[data-sp]'); if (sp && mTab === 'budget') { const [a, b, c] = sp.dataset.sp.split(',').map(Number); M.split = { needs: a, wants: b, savings: c }; save(); return refresh(); }
    const ec = t.closest('[data-ecat]'); if (ec) return catSheet(M.cats.find(c => c.id === ec.dataset.ecat));
    const ac = t.closest('[data-acat]'); if (ac) return catSheet(null, ac.dataset.acat);
    const b = t.closest('[data-a]'); if (!b) return;
    switch (b.dataset.a) {
      case 'add': return M.setup ? entrySheet({}) : setupView();
      case 'scan': return M.setup ? pickScreenshots() : setupView();
      case 'cbud': { const st = stats(); return amountSheet("This cycle's budget", st.budget, v => { M.budgets[dkey(st.s)] = v; save(); refresh(); }, `${short(st.s)} – ${short(st.e)} only`); }
      case 'dbud': return amountSheet('Monthly budget', M.budget, v => { M.budget = v; save(); refresh(); }, 'Used for each new cycle');
      case 'day': return dayPicker();
      case 'custom': return customSplit();
      case 'addbill': return billSheet(null);
      case 'lock': return toggleLock();
      case 'csv': return exportCsv();
      case 'backup': return exportBackup();
      case 'rules': return rulesSheet();
      case 'wipe':
        if (await confirmBox('Delete all money data?', `${M.txns.length} entries and ${M.bills.length} bills will be removed from this phone. Make a backup first if you might need them.`, [{ label: 'Delete everything', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) { M = fresh(); save(); scheduleBillReminders(); refresh(); toast('Money data deleted'); }
    }
  }

  /* ---------- muscle-side summary ---------- */
  function todayChip() {
    if (!M.setup) return '';
    if (M.lockOn) return `<button class="moneychip" data-a="money">${ic('lock')}<span><b>Money</b> · tap to unlock</span>${ic('chevR', 'chev')}</button>`;
    const st = stats();
    return `<button class="moneychip" data-a="money"><span class="rs">₹</span><span><b>${inr(st.left)}</b> left · safe today ${inr(Math.max(0, st.safe - st.spentToday))}</span>${ic('chevR', 'chev')}</button>`;
  }

  function boot() {
    if (P.Ocr) { try { P.Ocr.addListener('shared', () => checkShared()); } catch (e) { /* ignore */ } }
    setTimeout(checkShared, 600);
    scheduleBillReminders();
  }

  return {
    get data() { return M; },
    set data(v) { M = Object.assign(fresh(), v || {}); save(); },
    renderTab, handleClick, openMoney, onHide, onShow, todayChip, boot, refresh, parseReceipt, stats, inr,
    isLocked: () => M.lockOn && !unlocked, lockOn: () => M.lockOn,
    _cycleStart: cycleStart, _cycleEnd: cycleEnd, _guess: guessCat,
  };
})();
