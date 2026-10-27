/* Vyora: money tracker.
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
    groceries: ['innovative retail', 'super market', 'supermart', 'chicken', 'mutton', 'meat', 'fish', 'egg', 'coconut', 'provision', 'general store', 'zepto', 'blinkit', 'bigbasket', 'instamart', 'dmart', 'jiomart', 'grocer', 'kirana', 'supermarket', 'more retail', 'ratnadeep', 'milk', 'dairy', 'vegetable', 'fruits', 'country delight', 'swiggy instamart'],
    food: ['swiggy', 'zomato', 'eatsure', 'eatclub', 'domino', 'pizza', 'mcdonald', 'kfc', 'burger', 'starbucks', 'cafe', 'coffee', 'restaurant', 'hotel', 'bakery', 'chai', 'biryani', 'magicpin', 'leankafe', 'swish', 'jilebi', 'tiffin', 'tea', 'bake', 'juice', 'sweets', 'dhaba', 'canteen', 'mess', 'tiffin', 'darshini'],
    transport: ['uber', 'ola', 'rapido', 'metro', 'bmtc', 'irctc', 'redbus', 'petrol', 'fuel', 'hpcl', 'iocl', 'indianoil', 'bharat petroleum', 'bpcl', 'shell', 'fastag', 'parking', 'namma yatri'],
    bills: ['airtel', 'jio', 'vodafone', 'vi ', 'bsnl', 'bescom', 'electricity', 'power', 'water', 'gas', 'broadband', 'act fibernet', 'hathway', 'tata play', 'dth', 'recharge', 'postpaid', 'prepaid', 'bill', 'apspdcl', 'tsspdcl', 'apepdcl', 'tgspdcl', 'hostinger', 'godaddy', 'adobe', 'canva', 'google workspace', 'icloud', 'google one', 'chatgpt', 'openai'],
    shopping: ['amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tata cliq', 'croma', 'reliance digital', 'decathlon', 'ikea', 'lenskart', 'zara', 'h&m', 'westside', 'mall'],
    fun: ['netflix', 'spotify', 'hotstar', 'jiohotstar', 'prime video', 'youtube', 'bookmyshow', 'pvr', 'inox', 'sony liv', 'zee5', 'gaming', 'steam', 'playstation'],
    health: ['apollo', 'pharmeasy', '1mg', 'netmeds', 'medplus', 'pharmacy', 'chemist', 'medical', 'hospital', 'clinic', 'diagnostic', 'lab', 'physio', 'dental', 'fixyoufit'],
    rent: ['rent', 'landlord', 'society', 'maintenance', 'nobroker', 'pg ', 'hostel'],
    emi: ['emi', 'loan', 'bajaj finance', 'home credit', 'credit card', 'cred', 'repayment', 'lending'],
    insurance: ['insurance', 'lic', 'policybazaar', 'acko', 'digit', 'star health', 'hdfc ergo', 'icici lombard'],
    invest: ['icici securities', 'hdfc securities', 'zerodha', 'groww', 'upstox', 'coin', 'kuvera', 'mutual fund', 'sip', 'nps', 'ppf', 'smallcase', 'angel one', 'indmoney', 'stocks'],
    save: ['fixed deposit', 'recurring deposit', ' fd', ' rd', 'savings'],
    fitness: ['gym', 'cult', 'fitness', 'kaizen', 'protein', 'muscleblaze', 'healthkart', 'yoga'],
    education: ['school', 'college', 'course', 'udemy', 'coursera', 'tuition', 'fees', 'books'],
    travel: ['makemytrip', 'goibibo', 'cleartrip', 'indigo', 'air india', 'vistara', 'akasa', 'oyo', 'airbnb', 'booking.com', 'agoda', 'yatra'],
    gifts: ['ketto', 'donation', 'temple', 'charity', 'milaap'],
    personal: ['salon', 'spa', 'barber', 'urban company', 'grooming', 'parlour', 'hair', 'beauty', 'unisex'],
  };
  const SPLITS = [[50, 30, 20], [60, 25, 15], [60, 20, 20], [70, 20, 10]];

  const fresh = () => ({ setup: false, cycleDay: 1, budget: 40000, budgets: {}, split: { needs: 50, wants: 30, savings: 20 }, cats: DEFAULT_CATS.map(c => ({ ...c })), txns: [], rules: {}, bills: [], lockOn: false, pin: null, remindTime: '09:00',
    accounts: [], transfers: [], goals: [], limits: {}, alerted: {}, people: [], settles: [], lastReport: null, lastAcc: null, alertsOn: true });
  /* Money can be stored encrypted (Android Keystore key, see VaultPlugin). While it is sealed, only the lock
     settings are readable and nothing is ever written over the encrypted copy. */
  const RAW = DB.get('money', {});
  let LK = Object.assign({ fails: 0, until: 0 }, DB.get('moneylock', {}));
  let sealed = !!(RAW && RAW.enc && RAW.blob);
  let M = sealed ? Object.assign(fresh(), { setup: true, lockOn: true, pin: LK.pin || null, enc: true }) : Object.assign(fresh(), RAW);
  const saveLock = () => DB.set('moneylock', LK);
  let saving = Promise.resolve();
  const save = () => {
    if (sealed) return saving; // never overwrite encrypted data with the empty placeholder
    LK.lockOn = M.lockOn; LK.pin = M.pin; LK.enc = !!M.enc; saveLock();
    if (M.enc && P.Vault) {
      const snap = JSON.stringify(M);
      saving = saving.then(async () => { try { const r = await P.Vault.encrypt({ text: snap }); DB.set('money', { enc: 1, blob: r.data, at: Date.now() }); } catch (e) { toast('Could not save Money securely. Try again.'); } });
      return saving;
    }
    DB.set('money', M); return saving;
  };
  async function unseal() {
    if (!sealed) return true;
    try {
      const r = await P.Vault.decrypt({ data: DB.get('money', {}).blob });
      M = Object.assign(fresh(), JSON.parse(r.text)); sealed = false; return true;
    } catch (e) {
      await confirmBox('Money data can\'t be opened', 'The encrypted Money data on this phone can\'t be read (this can happen after moving to a new phone). Restore it from a Vyora backup in Settings. Your workouts and Life data are not affected.', [{ label: 'OK', cls: 'primary', value: 1 }]);
      return false;
    }
  }
  // Locking again wipes the decrypted copy from memory once pending saves finish.
  async function reseal() { if (!M.enc || !P.Vault || sealed) return; await saving; sealed = true; M = Object.assign(fresh(), { setup: true, lockOn: true, pin: M.pin, enc: true }); }
  let unlocked = false;
  let lastHidden = 0;
  let mTab = 'home';
  let txFilter = 'all', txQuery = '', txCycleOffset = 0, insCycleOffset = 0;

  /* ---------- formatting ---------- */
  const inr = (n, { sign = false, dec = false, raw = false } = {}) => {
    if (M.hide && !raw) return '₹••••'; // amounts hidden (eye button on the Money overview)
    const v = Math.abs(Math.round((n || 0) * (dec ? 100 : 1)) / (dec ? 100 : 1));
    const s = v.toLocaleString('en-IN', { maximumFractionDigits: dec ? 2 : 0 });
    return (n < 0 ? '−' : sign ? '+' : '') + '₹' + s;
  };
  const num = v => { const n = parseFloat(String(v || '').replace(/[,₹\s]/g, '')); return isNaN(n) ? null : n; };
  const cat = id => M.cats.find(c => c.id === id) || INCOME_CATS.find(c => c.id === id) || { id, name: 'Other', icon: '📦', group: 'wants' };
  const isIncome = t => t.type === 'income';
  // Your share of an expense. A split bill only counts your part against the budget.
  const own = t => (t.split ? t.split.mine : t.amount);
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
    tx.forEach(t => { if (isIncome(t)) income += t.amount; else spent[cat(t.catId).group || 'wants'] += own(t); });
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
    const spentToday = tx.filter(t => !isIncome(t) && t.date === todayKey && cat(t.catId).group !== 'savings').reduce((a, t) => a + own(t), 0);
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
      const t = { id: uid(), type: 'expense', amount: bill.amount, catId: bill.catId, payee: bill.name, note: 'Bill', date: dkey(new Date()), at: Date.now(), src: 'bill', acc: pickAcc({}) };
      M.txns.push(t); id = t.id;
    }
    bill.paid[periodKey(bill, due)] = id;
    save(); scheduleBillReminders(); if (!txnId) checkAlerts();
  }
  async function scheduleBillReminders() {
    if (!P.LocalNotifications || sealed) return;
    const ids = [{ id: 700 }]; for (let i = 0; i < 60; i++) ids.push({ id: 600 + i });
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
      list.push({ id: 600 + i, title: S.notifDetails ? `${bill.name} due ${when}` : `A bill is due ${when}`, body: S.notifDetails ? `${inr(bill.amount)} · open Vyora to mark it paid` : 'Open Vyora to see the details', channelId: 'kw_private', schedule: { at, allowWhileIdle: true }, isExactNotification: false, smallIcon: 'ic_stat_kw', iconColor: S.accent });
    });
    if (M.setup) {
      const ns = cycleStart(new Date(), 1); const at = new Date(ns); at.setHours(hh, mi, 0, 0);
      list.push({ id: 700, title: 'New budget cycle 💼', body: `Your ${short(cycleStart(new Date()))} – ${short(cycleEnd(cycleStart(new Date())))} money report is ready`, channelId: 'kw_remind', schedule: { at, allowWhileIdle: true }, isExactNotification: false, smallIcon: 'ic_stat_kw', iconColor: S.accent });
    }
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

    // Which bank account it came from (used to pick the account)
    const bk = BANKS.find(b => low.includes(b)); if (bk) out.bank = bk;
    const l4 = all.match(/(?:x{2,}|\*{2,}|•{2,}|ending\s*(?:in|with)?)\s?(\d{4})\b/i); if (l4) out.last4 = l4[1];
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
    const hit = w => { const x = norm(w); if (!x) return false; return x.length <= 3 ? hay.includes(' ' + x + ' ') : hay.includes(' ' + x); };
    for (const [id, words] of Object.entries(KEYWORDS)) if (words.some(hit) && M.cats.some(c => c.id === id)) return id;
    return null;
  }


  /* ---------- history screens (several payments in one screenshot) ---------- */
  // e.g. PhonePe / Google Pay "History": rows of "Paid to" + name + amount + "1 hour ago".
  function relDate(t) {
    const now = new Date(); const low = t.toLowerCase();
    let m = low.match(/(\d+)\s*(min|minute|hour|hr|day)s?\s*ago/);
    if (m) { const n = +m[1]; const ms = /day/.test(m[2]) ? n * 864e5 : /hour|hr/.test(m[2]) ? n * 36e5 : n * 6e4; return new Date(now - ms); }
    if (/just now|few seconds|moments? ago/.test(low)) return now;
    if (/yesterday/.test(low)) return addDays(now, -1);
    if (/\btoday\b/.test(low)) return now;
    const d = parseReceipt({ lines: [{ t, y: 0, h: 10 }] }).date;
    return d || null;
  }
  function parseHistory(r) {
    const lines = (r && r.lines ? r.lines : []).map(l => ({ t: String(l.t || '').trim(), y: l.y || 0, h: l.h || 14, x: l.x || 0, w: l.w || 0 })).filter(l => l.t);
    if (lines.length < 4) return [];
    lines.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const head = /^(paid to|received from|sent to|money sent to|paid by|transfer to|refund from)\b\s*:?\s*(.*)$/i;
    const rows = [];
    lines.forEach((l, i) => { const m = l.t.match(head); if (m) rows.push({ i, l, kind: /received|refund|paid by/i.test(m[1]) ? 'income' : 'expense', rest: m[2] }); });
    if (rows.length < 2) return [];
    const amtRe = /(?:₹|rs\.?|inr|^[%zZF?<])\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*$/i;
    const used = new Set();
    const out = [];
    rows.forEach((row, k) => {
      const end = k + 1 < rows.length ? rows[k + 1].l.y : Infinity;
      const block = lines.filter(l => l.y >= row.l.y - row.l.h * 0.6 && l.y < end - 2);
      // Name: rest of the header line, or the next line that is not an amount or time.
      let name = row.rest, nameLine = row.l;
      if (!name || amtRe.test(name)) {
        nameLine = block.find(l => l !== row.l && l.y > row.l.y && /[a-z]{2}/i.test(l.t) && !/ago|yesterday|today|just now|debited|credited|^\d/i.test(l.t)) || row.l;
        name = nameLine !== row.l ? nameLine.t : '';
      }
      // Amount: a rupee value in this row, preferring the one level with the name.
      let best = null;
      block.forEach(l => {
        if (used.has(l)) return;
        const m = l.t.match(amtRe) || (l.t.match(/([0-9][0-9,]*\.[0-9]{1,2})\s*$/) && l !== nameLine ? l.t.match(/([0-9][0-9,]*\.[0-9]{1,2})\s*$/) : null);
        if (!m || (l === nameLine && /[a-z]{2}/i.test(l.t.replace(m[0], '')))) return; // the name line's own amount is handled below
        const dy = Math.abs((l.y + l.h / 2) - (nameLine.y + nameLine.h / 2));
        if (!best || dy < best.dy) best = { l, v: parseFloat(m[1].replace(/,/g, '')), dy };
      });
      // Name and amount read as one line, e.g. "FRIENDS BAKE ₹30".
      const inline = name.match(/^(.*?)\s+(?:₹|rs\.?)\s?([0-9][0-9,]*(?:\.[0-9]{1,2})?)$/i);
      if (inline) { name = inline[1]; if (!best) best = { v: parseFloat(inline[2].replace(/,/g, '')) }; }
      if (!best || !(best.v > 0)) return;
      if (best.l) used.add(best.l);
      const timeLine = block.find(l => /ago|yesterday|today|just now|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i.test(l.t));
      const date = (timeLine && relDate(timeLine.t)) || new Date();
      name = name.replace(/\s*(\.{2,}|…)\s*$/, '').replace(/\s{2,}/g, ' ').trim();
      out.push({ payee: name.slice(0, 40), amount: best.v, type: row.kind, date });
    });
    return out;
  }
  function handleOcr(r, image) {
    const list = parseHistory(r);
    if (list.length >= 2) enqueue({ batch: list, image });
    else { const pr = parseReceipt(r); enqueue(Object.assign(pr, { image, src: 'screenshot' }, pr.amount ? { ocrOk: true } : { error: (r && r.text ? 'Could not find the amount in this screenshot' : 'No text found in this image') })); }
  }
  function isDupe(it) {
    const k = norm(it.payee).slice(0, 10); const dk = dkey(it.date);
    return M.txns.some(t => t.date === dk && Math.abs(t.amount - it.amount) < 0.01 && norm(t.payee).slice(0, 10) === k);
  }
  function catPicker(type, current, cb) {
    let group = type === 'income' ? 'income' : (current ? cat(current).group : 'needs');
    const s = sheet(`<h2>Category</h2><div id="cp"></div>`);
    const paint = () => {
      $('#cp', s.el).innerHTML = type === 'income'
        ? `<div class="catgrid">${INCOME_CATS.map(c => `<button class="catchip ${current === c.id ? 'on' : ''}" data-cat="${c.id}"><span>${c.icon}</span>${esc(c.name)}</button>`).join('')}</div>`
        : `<div class="gtabs">${GKEYS.map(g => `<button class="${group === g ? 'on' : ''}" data-g="${g}" style="--gc:${GROUPS[g].color}">${GROUPS[g].name}</button>`).join('')}</div>
           <div class="catgrid">${M.cats.filter(c => c.group === group).map(c => `<button class="catchip ${current === c.id ? 'on' : ''}" data-cat="${c.id}"><span>${c.icon}</span>${esc(c.name)}</button>`).join('')}</div>`;
    };
    paint();
    s.el.addEventListener('click', e => {
      const g = e.target.closest('[data-g]'); if (g) { group = g.dataset.g; return paint(); }
      const c = e.target.closest('[data-cat]'); if (c) { s.close(); cb(c.dataset.cat); }
    });
  }
  function batchSheet(item, onDone) {
    const rows = item.batch.map(r => ({ ...r, catId: guessCat(r.payee, '', r.type), dupe: isDupe(r) }));
    rows.forEach(r => { r.on = !r.dupe; });
    let bAcc = pickAcc(item.batch[0] || {});
    const s = sheet(`<h2>${rows.length} payments found</h2>
      ${item.image ? `<button class="shot" data-a="img"><img src="${item.image}" alt="Payment history screenshot"><span>Tap a category to change it. Untick anything you don't want to add.</span></button>` : ''}
      ${M.accounts.length ? `<div class="sect" style="margin-top:4px">Account</div><div id="bacc"></div>` : ''}
      <div class="block" style="padding:0" id="brows"></div>
      <div class="btns"><button class="btn primary" data-a="saveall" id="bsave"></button></div>`, { onClose: () => { if (onDone) setTimeout(onDone, 80); } });
    const paint = () => {
      if ($('#bacc', s.el)) $('#bacc', s.el).innerHTML = accChips(bAcc);
      $('#brows', s.el).innerHTML = rows.map((r, i) => `<div class="brow ${r.on ? '' : 'off'}">
        <button class="bck ${r.on ? 'on' : ''}" data-tog="${i}" aria-label="${r.on ? 'Skip' : 'Add'} this payment">${ic('check')}</button>
        <span class="bm"><b>${esc(r.payee || 'Unknown')}</b><span>${esc(dlabel(dkey(r.date)))}${r.dupe ? ' · already added' : ''}${r.type === 'income' ? ' · income' : ''}</span>
          <button class="bcat ${r.catId ? '' : 'need'}" data-cp="${i}">${r.catId ? `${cat(r.catId).icon} ${esc(cat(r.catId).name)}` : 'Pick category'}</button></span>
        <span class="txa ${r.type === 'income' ? 'in' : ''}">${r.type === 'income' ? '+' : '−'}${inr(r.amount, { dec: true })}</span></div>`).join('');
      const n = rows.filter(r => r.on).length;
      const b = $('#bsave', s.el); b.textContent = n ? `Add ${n} payment${n > 1 ? 's' : ''}` : 'Nothing selected'; b.disabled = !n;
    };
    paint();
    s.el.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-a="img"]')) return viewImage(item.image);
      const ac = t.closest('[data-acc]'); if (ac) { bAcc = ac.dataset.acc; return paint(); }
      const tg = t.closest('[data-tog]'); if (tg) { const r = rows[+tg.dataset.tog]; r.on = !r.on; return paint(); }
      const cp = t.closest('[data-cp]'); if (cp) { const r = rows[+cp.dataset.cp]; return catPicker(r.type, r.catId, id => { r.catId = id; r.on = true; rows.forEach(o => { if (o !== r && !o.catId && norm(o.payee) === norm(r.payee)) o.catId = id; }); paint(); }); }
      if (t.closest('[data-a="saveall"]')) {
        const sel = rows.filter(r => r.on);
        const missing = sel.find(r => !r.catId);
        if (missing) { toast(`Pick a category for ${missing.payee || 'each payment'}`); return; }
        sel.forEach(r => {
          const tx = { id: uid(), type: r.type, amount: r.amount, catId: r.catId, payee: r.payee, note: '', date: dkey(r.date), at: Date.now(), src: 'screenshot', acc: bAcc };
          M.txns.push(tx);
          if (r.type === 'expense' && r.payee) M.rules[norm(r.payee)] = r.catId;
          if (r.type === 'expense') autoLinkBill(tx);
        });
        if (bAcc) M.lastAcc = bAcc;
        save(); s.close(); refresh(); checkAlerts();
        const st = stats();
        toast(`${sel.length} added · ${inr(sel.filter(r => r.type === 'expense').reduce((a, r) => a + r.amount, 0))} spent. ${st.left >= 0 ? inr(st.left) + ' left' : inr(-st.left) + ' over budget'}`);
      }
    });
  }

  /* ---------- add / edit sheet ---------- */
  let queue = [], busy = false;
  function enqueue(item) { queue.push(item); if (!busy) nextInQueue(); }
  function nextInQueue() {
    const it = queue.shift();
    if (!it) { busy = false; return; }
    busy = true;
    if (it.batch) batchSheet(it, () => nextInQueue());
    else entrySheet(it, () => nextInQueue());
  }

  function entrySheet(pre = {}, onDone) {
    const existing = pre.id ? M.txns.find(t => t.id === pre.id) : null;
    const d = existing ? clone(existing) : {
      id: uid(), type: pre.type || 'expense', amount: pre.amount || null, payee: pre.payee || '', upi: pre.upi || '', note: '',
      date: pre.date ? dkey(pre.date) : dkey(new Date()), catId: pre.catId || null, src: pre.src || 'manual', ref: pre.ref || '', app: pre.app || '',
      acc: pickAcc(pre), goal: pre.goal || null,
    };
    let splitCfg = d.split ? { by: d.split.by, with: d.split.with, incMe: d.split.incMe } : null;
    if (!existing && !d.catId) d.catId = guessCat(d.payee, d.upi, d.type);
    const suggested = d.catId;
    let group = d.type === 'income' ? 'income' : (d.catId ? cat(d.catId).group : 'needs');
    let remember = !existing;
    const dup = !existing && d.ref ? M.txns.find(t => t.ref && t.ref === d.ref) : null;
    const left = queue.length;
    const s = sheet(`<h2>${existing ? 'Edit' : pre.src === 'screenshot' ? 'From screenshot' : 'Add'} ${d.type === 'income' ? 'income' : 'expense'}</h2>
      ${pre.image ? `<button class="shot" data-a="img"><img src="${pre.image}" alt="Payment screenshot"><span>${pre.app ? esc(pre.app) + ' · ' : ''}tap to view</span></button>` : ''}
      ${pre.ocrOk ? `<div class="mwarn ok">${ic('scan')}<span>Read from your screenshot. <b>Check the amount, payee and date</b> before saving.</span></div>` : ''}
      ${pre.error ? `<div class="mwarn">${ic('info')}<span>${esc(pre.error)}. Fill in the details below.</span></div>` : ''}
      ${pre.noOcr ? `<div class="mwarn">${ic('info')}<span>${isNative ? 'This build of the app is missing the screenshot reader. Upload the <b>android</b> folder from the update and install the new build.' : 'Reading screenshots works in the installed app.'} Fill in the details below for now.</span></div>` : ''}
      ${pre.status === 'failed' ? `<div class="mwarn bad">${ic('info')}<span>This payment looks <b>failed</b>. Only save it if money actually left your account.</span></div>` : ''}
      ${pre.status === 'pending' ? `<div class="mwarn">${ic('info')}<span>This payment looks <b>pending</b>.</span></div>` : ''}
      ${dup ? `<div class="mwarn bad">${ic('info')}<span>You already saved this payment on ${esc(dlabel(dup.date))} (${inr(dup.amount)}, ${esc(dup.payee || cat(dup.catId).name)}).</span></div>` : ''}
      <div class="seg" style="background:var(--surface-2)"><button class="${d.type === 'expense' ? 'on' : ''}" data-type="expense">Expense</button><button class="${d.type === 'income' ? 'on' : ''}" data-type="income">Income</button></div>
      <div class="amt"><span>₹</span><input id="mamt" inputmode="decimal" placeholder="0" value="${d.amount != null ? esc(String(d.amount)) : ''}" aria-label="Amount"></div>
      <div class="mrow2"><input class="field body" id="mpayee" placeholder="${d.type === 'income' ? 'From (e.g. Employer)' : 'Paid to (e.g. Swiggy)'}" value="${esc(d.payee)}" maxlength="40"><input class="field body" id="mdate" type="date" value="${esc(d.date)}" max="${dkey(addDays(new Date(), 1))}"></div>
      <div id="mcats"></div>
      <div id="mextra"></div>
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
      paintExtra();
    };
    const paintExtra = () => {
      const box = $('#mextra', s.el); if (!box) return;
      const amt = num($('#mamt', s.el).value) || 0;
      const exp = d.type === 'expense';
      const friendPaid = exp && splitCfg && splitCfg.by !== 'me';
      const sp = exp && splitCfg && amt ? calcSplit(amt, splitCfg) : null;
      const showGoal = exp && M.goals.length && d.catId && cat(d.catId).group === 'savings';
      box.innerHTML = (exp ? `<button class="msplit ${splitCfg ? 'on' : ''}" data-a="split">👥 <span>${splitCfg ? (friendPaid ? `${esc(personName(splitCfg.by))} paid · you owe ${sp ? inr(sp.mine, { dec: true }) : 'your share'}` : `Split with ${esc(splitCfg.with.map(personName).join(', '))}${sp ? ` · your share ${inr(sp.mine, { dec: true })}` : ''}`) : 'Split with friends'}</span>${ic('chevR', 'chev')}</button>` : '')
        + (showGoal ? `<div class="sect" style="margin-top:12px">Towards goal</div><div class="accchips"><button class="catchip ${!d.goal ? 'on' : ''}" data-goal-pick="">None</button>${M.goals.map(g => `<button class="catchip ${d.goal === g.id ? 'on' : ''}" data-goal-pick="${g.id}"><span>${g.icon}</span>${esc(g.name)}</button>`).join('')}</div>` : '')
        + (M.accounts.length && !friendPaid ? `<div class="sect" style="margin-top:12px">${exp ? 'Paid from' : 'Received in'}</div>${accChips(d.acc)}` : '');
    };
    paintCats();
    if (!pre.image) setTimeout(() => { const a = $('#mamt', s.el); if (a && !a.value) a.focus(); }, 250);
    s.el.addEventListener('input', e => { if (e.target.id === 'mamt' && splitCfg) paintExtra(); if (e.target.id === 'mpayee') { if (!existing && !d.catId) { const g = guessCat(e.target.value, '', d.type); if (g) { d.catId = g; group = cat(g).group; } } paintCats(); } });
    s.el.addEventListener('click', async e => {
      const ty = e.target.closest('[data-type]');
      if (ty) { d.type = ty.dataset.type; d.catId = d.type === 'income' ? guessCat($('#mpayee', s.el).value, '', 'income') : guessCat($('#mpayee', s.el).value, d.upi, 'expense'); group = d.type === 'income' ? 'income' : (d.catId ? cat(d.catId).group : 'needs'); $$('[data-type]', s.el).forEach(b => b.classList.toggle('on', b === ty)); $('#mpayee', s.el).placeholder = d.type === 'income' ? 'From (e.g. Employer)' : 'Paid to (e.g. Swiggy)'; return paintCats(); }
      const g = e.target.closest('[data-g]'); if (g) { group = g.dataset.g; return paintCats(); }
      const c = e.target.closest('[data-cat]'); if (c) { d.catId = c.dataset.cat; return paintCats(); }
      const ac = e.target.closest('[data-acc]'); if (ac) { d.acc = ac.dataset.acc; return paintExtra(); }
      const gp = e.target.closest('[data-goal-pick]'); if (gp) { d.goal = gp.dataset.goalPick || null; return paintExtra(); }
      if (e.target.closest('#mrem')) { remember = !remember; $('#mrem .toggle', s.el).classList.toggle('on', remember); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'img') return viewImage(pre.image);
      if (b.dataset.a === 'split') return splitSheet(num($('#mamt', s.el).value), splitCfg && calcSplit(num($('#mamt', s.el).value) || 1, splitCfg), cfg => { splitCfg = cfg; paintExtra(); });
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
        d.split = d.type === 'expense' && splitCfg ? calcSplit(d.amount, splitCfg) : null;
        if (!d.split) delete d.split;
        if (d.split && d.split.by !== 'me') d.acc = null; else if (d.acc) M.lastAcc = d.acc;
        if (d.type !== 'expense' || cat(d.catId).group !== 'savings') d.goal = null;
        const goalBefore = d.goal ? M.goals.find(g => g.id === d.goal) : null;
        const wasDone = goalBefore ? goalSaved(goalBefore) >= goalBefore.target : false;
        if (remember && d.payee && d.type === 'expense') M.rules[norm(d.payee)] = d.catId;
        const i = M.txns.findIndex(t => t.id === d.id);
        if (i >= 0) M.txns[i] = d; else M.txns.push(d);
        const linked = !existing && d.type === 'expense' ? autoLinkBill(d) : null;
        save(); s.close(); refresh();
        const st = stats();
        const undo = existing ? null : () => { M.txns = M.txns.filter(t => t.id !== d.id); if (linked) M.bills.forEach(bl => Object.keys(bl.paid || {}).forEach(k => { if (bl.paid[k] === d.id) delete bl.paid[k]; })); save(); refresh(); toast('Removed'); };
        if (goalBefore && !wasDone && goalSaved(goalBefore) >= goalBefore.target) { toast(`🎉 Goal reached: ${goalBefore.name}!`); try { buzz(400); } catch (err) { /* ignore */ } return; }
        toast(d.type === 'income' ? `Income saved: ${inr(d.amount)}` : `${inr(own(d))} · ${cat(d.catId).name}${linked ? ` · ${linked} marked paid` : ''}. ${st.left >= 0 ? inr(st.left) + ' left' : inr(-st.left) + ' over budget'}`, { undo });
        if (d.type === 'expense') checkAlerts();
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
  function pickScreenshots(pdfOnly) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = pdfOnly ? 'application/pdf' : 'image/*,application/pdf'; inp.multiple = !pdfOnly;
    inp.onchange = async () => {
      const all = [...(inp.files || [])];
      const pdf = all.find(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
      if (pdf) { const buf = await pdf.arrayBuffer().catch(() => null); if (buf) importPdf(new Uint8Array(buf)); else toast('Could not open that PDF'); return; }
      const files = all.slice(0, 10);
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
      handleOcr(r, dataUrl);
    } catch (e) { enqueue({ image: dataUrl, src: 'screenshot', error: 'Could not read this screenshot' }); }
  }
  async function checkShared() {
    if (!P.Ocr) return;
    let items = [];
    try { items = (await P.Ocr.getPending()).items || []; } catch (e) { return; }
    if (!items.length) return;
    const ok = await openMoney();
    if (!ok) return;
    items.filter(r => r.pdf).forEach(r => importPdf(b64bytes(r.pdf)));
    items.filter(r => !r.pdf).forEach(r => (r.error ? enqueue({ image: r.image, src: 'screenshot', error: r.error }) : handleOcr(r, r.image)));
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
    if (!M.lockOn || unlocked) return sealed ? unseal() : true;
    if (M.pin) {
      if (LK.until > Date.now()) { toast(`Too many wrong PINs. Try again in ${Math.ceil((LK.until - Date.now()) / 1000)} s`); return false; }
      const v = await pinPad('Unlock Money', LK.fails ? `Enter your 4-digit PIN · ${Math.max(0, 5 - LK.fails)} tries before a short wait` : 'Enter your 4-digit PIN');
      if (v && (await sha(v)) === M.pin) { LK.fails = 0; LK.until = 0; saveLock(); if (!(await unseal())) return false; unlocked = true; await upgradeEnc(); return true; }
      if (v) {
        LK.fails = (LK.fails || 0) + 1;
        // After 5 wrong tries: wait 30 s, doubling each time, up to 15 minutes.
        if (LK.fails >= 5) LK.until = Date.now() + Math.min(15 * 60000, 30000 * Math.pow(2, LK.fails - 5));
        saveLock(); toast(LK.until > Date.now() ? `Wrong PIN. Locked for ${Math.round((LK.until - Date.now()) / 1000)} s` : 'Wrong PIN');
      }
      return false;
    }
    if (P.AppLock && !(await deviceLockAvailable())) {
      // Fail closed: without a screen lock there's no way to confirm it's you, so Money stays locked.
      await confirmBox('Money stays locked', 'Your phone\'s screen lock (PIN, pattern or fingerprint) is turned off, so Vyora can\'t confirm it\'s you. Turn the screen lock back on in phone Settings → Security, then open Money again.', [{ label: 'OK', cls: 'primary', value: 1 }]);
      return false;
    }
    if (P.AppLock) {
      try { const r = await P.AppLock.authenticate({ title: 'Unlock Money' }); if (r.ok) { if (!(await unseal())) return false; unlocked = true; await upgradeEnc(); return true; } } catch (e) { /* ignore */ }
      return false;
    }
    // No way to check who you are on this build: keep Money closed rather than opening it.
    if (isNative) { toast('Money can\'t be unlocked: phone lock isn\'t available'); return false; }
    if (!(await unseal())) return false;
    unlocked = true; return true;
  }
  // Lock on + the phone supports the secure keystore: keep Money encrypted at rest.
  async function upgradeEnc() {
    if (!M.lockOn || M.enc || !P.Vault) return;
    try { const a = await P.Vault.available(); if (!a.available) return; } catch (e) { return; }
    M.enc = true; await save();
  }
  async function toggleLock() {
    if (M.lockOn) {
      if (!(await unlock())) return;
      M.lockOn = false; M.pin = null; M.enc = false; save(); unlocked = true; toast('Money lock is off. Money data is no longer encrypted.'); return refresh();
    }
    if (await deviceLockAvailable()) {
      const r = await P.AppLock.authenticate({ title: 'Turn on Money lock' }).catch(() => ({ ok: false }));
      if (!r.ok) return;
      M.lockOn = true; M.pin = null; save(); unlocked = true; await upgradeEnc(); toast(M.enc ? 'Money is locked and encrypted on this phone' : 'Money is locked with your fingerprint or phone lock');
      return refresh();
    }
    const a = await pinPad('Create a PIN', 'Pick 4 digits to lock the Money side'); if (!a) return;
    const b = await pinPad('Confirm PIN', 'Enter the same 4 digits again'); if (!b) return;
    if (a !== b) { toast('PINs did not match. Try again.'); return; }
    M.lockOn = true; M.pin = await sha(a); save(); unlocked = true; await upgradeEnc(); toast(M.enc ? 'Money lock is on and data is encrypted' : 'Money lock is on');
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
    if (M.lockOn && lastHidden && Date.now() - lastHidden > (S.lockAfter ?? 60) * 1000) {
      unlocked = false; reseal();
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
      <span class="txm"><b>${esc(t.payee || c.name)}</b><span>${esc(c.name)}${t.split ? ` · 👥 of ${inr(t.amount)}${t.split.by !== 'me' ? ' · ' + esc(personName(t.split.by)) + ' paid' : ''}` : ''}${t.goal && M.goals.find(g => g.id === t.goal) ? ' · ' + M.goals.find(g => g.id === t.goal).icon : ''}${t.acc && accOf(t.acc) ? ' · ' + esc(accOf(t.acc).name) : ''}${t.note ? ' · ' + esc(t.note) : ''}${t.src === 'screenshot' ? ' · 📷' : ''}</span></span>
      <span class="txa ${isIncome(t) ? 'in' : ''}">${isIncome(t) ? inr(t.amount, { sign: true, dec: true }) : '−' + inr(own(t), { dec: true })}</span></button>`;
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
    view.innerHTML = topbarM('Money', `<button class="round-btn" data-a="hideamt" aria-label="${M.hide ? 'Show amounts' : 'Hide amounts'}">${ic(M.hide ? 'lock' : 'unlock')}</button>`) + `<div class="page">
      <div class="mhero">
        <div class="k">Budget period ${short(st.s)} – ${short(st.e)} · ${st.daysLeft} day${st.daysLeft === 1 ? '' : 's'} left</div>
        <div class="mlabel">Budget left${M.accounts && M.accounts.length ? ' (not your bank balance)' : ''}</div>
        <div class="big ${st.left < 0 ? 'neg' : ''}">${inr(st.left)}</div>
        <div class="sub2">${st.left >= 0 ? 'left' : 'over'} of ${inr(st.budget)} budget · ${Math.round(pct)}% used</div>
        ${stackBar(st)}
        <div class="mlegend">${GKEYS.map(g => `<span><i style="background:${GROUPS[g].color}"></i>${GROUPS[g].name} ${inr(st.spent[g])}</span>`).join('')}</div>
        <div class="mhero-row">
          <div class="safe" data-a="safewhy" role="button" tabindex="0"><span>Safe to spend today ⓘ</span><b>${inr(Math.max(0, st.safe - st.spentToday))}</b><small>${st.spentToday ? `${inr(st.safe)}/day · ${inr(st.spentToday)} spent today` : `${inr(st.safe)} per day for ${st.daysLeft} days`}</small></div>
          ${paceChip(st)}
        </div>
        ${st.reserve > 0 ? `<p class="hint" style="margin:8px 0 0">Keeps ${inr(st.reserve)} aside for ${[st.billNW ? 'upcoming bills' : '', st.savingsLeft ? 'your savings goal' : ''].filter(Boolean).join(' and ')}.</p>` : ''}
      </div>
      <div class="mactions"><button class="btn primary" data-a="add">${ic('plus')}Add expense</button><button class="btn" data-a="scan">${ic('scan')}Scan / PDF</button></div>
      ${reportCardHtml()}
      ${alertsHtml(st)}
      ${accountsHtml()}
      <div class="sect"><span>${M.split.needs}/${M.split.wants}/${M.split.savings} plan</span><button class="linkbtn" data-go="budget">Edit</button></div>
      <div class="block" style="padding:4px 0">${GKEYS.map(g => { const tg = st.target(g); const v = st.spent[g]; const over = g !== 'savings' && v > tg; return `
        <div class="grow"><div class="gl"><span><i style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</span><span><b>${inr(v)}</b> / ${inr(tg)}${over ? ' <em class="bad">over</em>' : g === 'savings' && v >= tg && tg > 0 ? ' <em class="ok">done</em>' : ''}</span></div>
        <div class="gbar"><i style="width:${Math.min(100, tg ? v / tg * 100 : 0).toFixed(1)}%;background:${GROUPS[g].color}"></i></div></div>`; }).join('')}</div>
      ${goalsHtml() || `<button class="nudge" data-a="addgoal">${ic('plus')}<span><b>Save for something.</b> Set a goal like an emergency fund or a bike and watch it fill up.</span></button>`}
      ${friendsHtml()}
      ${st.income ? `<div class="sect">Income this cycle</div><div class="block inc"><div><span>Income</span><b>${inr(st.income)}</b></div><div><span>Spent</span><b>${inr(st.spent.needs + st.spent.wants)}</b></div><div><span>Saved</span><b>${st.income ? Math.round((st.income - st.spent.needs - st.spent.wants) / st.income * 100) : 0}%</b></div></div>` : ''}
      ${bills.length ? `<div class="sect"><span>Upcoming bills</span><button class="linkbtn" data-go="budget">All</button></div><div class="block" style="padding:0">${bills.map(({ b, nd }) => billRow(b, nd)).join('')}</div>` : ''}
      <div class="sect"><span>Recent</span>${M.txns.length ? '<button class="linkbtn" data-go="txns">See all</button>' : ''}</div>
      <div class="block" style="padding:0">${recent.map(txRow).join('') || `<div class="empty" style="padding:18px">No entries yet. Tap <b style="display:inline;font-family:var(--body);font-size:14px">Add expense</b> or share a payment screenshot to this app.</div>`}</div>
      <p class="hint" style="margin-top:14px">Tip: in PhonePe or Google Pay, open a payment and tap <b>Share</b> → <b>Vyora</b>. You can also share a whole <b>PhonePe statement PDF</b> (History → Download statement) to add a month in one go.</p>
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
    const total = tx.filter(t => !isIncome(t)).reduce((a, t) => a + own(t), 0);
    view.innerHTML = topbarM('Transactions') + `<div class="page">
      <div class="cal-head" style="padding:0 0 10px"><button data-cy="-1" aria-label="Previous cycle">${ic('chevL')}</button><span class="m" style="font-size:22px">${short(s)} – ${short(e)}</span><button data-cy="1" aria-label="Next cycle" ${txCycleOffset >= 0 ? 'disabled style="opacity:.3"' : ''}>${ic('chevR')}</button></div>
      <input class="search" id="txq" placeholder="Search payee, category or note" value="${esc(txQuery)}">
      <div class="chips" style="margin-bottom:12px">${[['all', 'All'], ['needs', 'Needs'], ['wants', 'Wants'], ['savings', 'Savings'], ['income', 'Income']].map(([k, n]) => `<button class="chip small ${txFilter === k ? 'on' : ''}" data-f="${k}">${n}</button>`).join('')}</div>
      <p class="hint" style="margin:0 2px 10px">${tx.length} entr${tx.length === 1 ? 'y' : 'ies'}${total ? ` · ${inr(total)} spent` : ''}</p>
      ${Object.entries(byDay).map(([k, list]) => `<div class="sect"><span>${esc(dlabel(k))}</span><span style="text-transform:none;letter-spacing:0">${inr(list.filter(t => !isIncome(t)).reduce((a, t) => a + own(t), 0))}</span></div><div class="block" style="padding:0">${list.map(txRow).join('')}</div>`).join('') || `<div class="empty">Nothing here yet.</div>`}
    </div>
    <button class="fab" data-a="add" aria-label="Add expense">${ic('plus')}</button>`;
    const q = $('#txq', view);
    q.addEventListener('input', () => { txQuery = q.value; const pos = q.selectionStart; txnsView(); const n = $('#txq', view); n.focus(); n.setSelectionRange(pos, pos); });
  }

  function budgetView() {
    const st = stats();
    view.innerHTML = topbarM('Budget & bills') + `<div class="page">
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
      ${GKEYS.map(g => { const list = M.cats.filter(c => c.group === g).map(c => ({ c, v: st.tx.filter(t => !isIncome(t) && t.catId === c.id).reduce((a, t) => a + own(t), 0) })).sort((a, b) => b.v - a.v); const max = Math.max(1, ...list.map(x => x.v)); return `
        <div class="sect"><span><i class="gdot" style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</span><span style="text-transform:none;letter-spacing:0">${inr(st.spent[g])} of ${inr(st.target(g))}</span></div>
        <div class="block" style="padding:4px 0">${list.map(({ c, v }) => { const lim = (M.limits || {})[c.id]; const w = lim ? Math.min(100, v / lim * 100) : v / max * 100; return `<button class="catrow tap" data-lim="${c.id}"><span class="ce">${c.icon}</span><span class="cn">${esc(c.name)}<i style="width:${w.toFixed(1)}%;background:${lim && v > lim ? 'var(--danger)' : GROUPS[g].color};opacity:${v ? 1 : 0}"></i></span><span class="cv">${v ? inr(v) : '—'}${lim ? `<small>of ${inr(lim)}</small>` : ''}</span></button>`; }).join('')}</div>`; }).join('')}
      <p class="hint" style="margin:8px 2px 0">Tap a category to set a spending limit. You get a warning at 80% and when you go over.</p>
      <div class="sect"><span>Recurring bills</span><button class="linkbtn" data-a="addbill">+ Add</button></div>
      <div class="block" style="padding:0">${M.bills.map(b => ({ b, nd: nextDue(b) })).sort((x, y) => (x.nd ? x.nd.due : 9e15) - (y.nd ? y.nd.due : 9e15)).map(({ b, nd }) => nd ? billRow(b, nd) : '').join('') || `<div class="empty" style="padding:18px">Add rent, EMIs, SIPs or subscriptions. You get a reminder the day before, and paying them keeps your budget right.</div>`}</div>
    </div>`;
  }

  function lineCum(st) {
    const W = 320, H = 150, L = 40, R = 10, T = 14, B = 20;
    const days = st.totalDays, upto = st.current ? st.elapsed : days;
    const daily = new Array(days).fill(0);
    st.tx.forEach(t => { if (isIncome(t)) return; const i = Math.round((parseKey(t.date) - st.s) / 864e5); if (i >= 0 && i < days) daily[i] += own(t); });
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
    if (insMode === 'month') return monthView();
    if (insMode === 'year') return yearView();
    const st = stats(insCycleOffset);
    const byCat = {}; st.tx.filter(t => !isIncome(t)).forEach(t => { byCat[t.catId] = (byCat[t.catId] || 0) + own(t); });
    const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const top = cats.slice(0, 7); const otherV = cats.slice(7).reduce((a, x) => a + x[1], 0);
    const maxC = Math.max(1, ...top.map(x => x[1]), otherV);
    const payees = {}; st.tx.filter(t => !isIncome(t) && t.payee).forEach(t => { const k = t.payee.trim(); payees[k] = payees[k] || { v: 0, n: 0 }; payees[k].v += own(t); payees[k].n++; });
    const topP = Object.entries(payees).sort((a, b) => b[1].v - a[1].v).slice(0, 5);
    // Only cycles since your first entry, up to six.
    const first = M.txns.reduce((m, t) => (t.date < m ? t.date : m), dkey(new Date()));
    const firstStart = cycleStart(parseKey(first));
    const hist = []; for (let o = insCycleOffset - 5; o <= insCycleOffset; o++) { const h = stats(o); if (h.s >= firstStart || o === insCycleOffset) hist.push(h); }
    const maxH = Math.max(1, ...hist.map(h => Math.max(h.total, h.budget)));
    view.innerHTML = topbarM('Insights') + `<div class="page">${insSeg()}
      <div class="cal-head" style="padding:4px 0 10px"><button data-icy="-1" aria-label="Previous cycle">${ic('chevL')}</button><span class="m" style="font-size:22px">${short(st.s)} – ${short(st.e)}</span><button data-icy="1" aria-label="Next cycle" ${insCycleOffset >= 0 ? 'disabled style="opacity:.3"' : ''}>${ic('chevR')}</button></div>
      <div class="stats">
        <div class="stat"><div class="k">Spent</div><div class="v">${inr(st.total)}</div><div class="s">of ${inr(st.budget)} budget</div></div>
        <div class="stat"><div class="k">Income</div><div class="v">${inr(st.income)}</div><div class="s">${st.income ? `${Math.round((st.income - st.spent.needs - st.spent.wants) / st.income * 100)}% kept after needs & wants` : 'Log salary to see your savings rate'}</div></div>
      </div>
      <button class="nudge" data-a="report" style="margin:12px 0 0">${ic('pie')}<span><b>${st.current ? 'This cycle so far' : 'Cycle report'}.</b> Plan vs actual, top categories, goals and a tip.</span></button>
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
    st.tx.forEach(t => { if (isIncome(t)) return; const i = Math.round((parseKey(t.date) - st.s) / 864e5); if (i >= 0 && i < days) daily[i] += own(t); });
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
      <div class="sect">Accounts, goals & friends</div>
      <div class="block">
        <button class="set-row" data-a="addacc"><span class="st"><div class="t">Accounts</div><div class="s">${M.accounts.length ? M.accounts.map(a => a.name).join(' · ') : 'Bank, cash and cards with live balances'}</div></span>${ic('plus')}</button>
        <button class="set-row" data-a="addgoal"><span class="st"><div class="t">Savings goals</div><div class="s">${M.goals.length ? M.goals.length + ' goal' + (M.goals.length > 1 ? 's' : '') : 'Emergency fund, bike, trip…'}</div></span>${ic('plus')}</button>
        <button class="set-row" data-a="friends"><span class="st"><div class="t">Friends & splits</div><div class="s">${M.people.length ? M.people.length + ' friend' + (M.people.length > 1 ? 's' : '') : 'Who owes what from shared bills'}</div></span>${ic('chevR', 'chev')}</button>
        <button class="set-row" data-a="alerts"><span class="st"><div class="t">Spending alerts</div><div class="s">Warn at 80% and 100% of your budget, needs, wants and category limits</div></span><span class="toggle ${M.alertsOn !== false ? 'on' : ''}"></span></button>
      </div>
      <div class="sect">Categories</div>
      <div class="block" style="padding:0">${GKEYS.map(g => `<div class="catgroup"><div class="cg"><i class="gdot" style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</div><div class="catgrid">${M.cats.filter(c => c.group === g).map(c => `<button class="catchip" data-ecat="${c.id}"><span>${c.icon}</span>${esc(c.name)}</button>`).join('')}<button class="catchip add" data-acat="${g}">+ Add</button></div></div>`).join('')}</div>
      <p class="hint" style="margin:8px 2px 0">${Object.keys(M.rules).length} payee${Object.keys(M.rules).length === 1 ? '' : 's'} remembered for automatic categories.${Object.keys(M.rules).length ? ' <button class="linkbtn" data-a="rules">Manage</button>' : ''}</p>
      <div class="sect">Privacy & reminders</div>
      <div class="block">
        ${M.lockOn ? `<div class="set-row"><span class="st"><div class="t">Lock again</div><div class="s">After you leave the app</div></span><select id="lockafter" class="timein">${[[0, 'Right away'], [60, 'After 1 min'], [300, 'After 5 min']].map(([v, n]) => `<option value="${v}" ${(S.lockAfter ?? 60) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>` : ''}
        <button class="set-row" data-a="lock"><span class="st"><div class="t">Money lock</div><div class="s">${M.lockOn ? (M.pin ? 'On · 4-digit PIN' : 'On · fingerprint or phone lock') + (M.enc ? ' · encrypted on this phone' : '') + ` · locks again ${(S.lockAfter ?? 60) === 0 ? 'as soon as you leave the app' : (S.lockAfter ?? 60) === 300 ? '5 minutes after you leave the app' : '1 minute after you leave the app'}` : 'Ask for fingerprint, phone lock or PIN before showing Money, and encrypt your money data on this phone'}</div></span><span class="toggle ${M.lockOn ? 'on' : ''}"></span></button>
        <div class="set-row"><span class="st"><div class="t">Bill reminder time</div><div class="s">The day before a bill is due</div></span><input type="time" id="rtime" value="${esc(M.remindTime)}" class="timein"></div>
      </div>
      <div class="sect">Your data</div>
      <div class="block">
        <button class="set-row" data-a="pdf"><span class="st"><div class="t">Import PhonePe statement</div><div class="s">PDF from PhonePe → History → Download statement. Already-added payments are skipped.</div></span>${ic('upload')}</button>
        <button class="set-row" data-a="csv"><span class="st"><div class="t">Export to spreadsheet</div><div class="s">CSV file of all ${M.txns.length} entries, opens in Excel or Google Sheets</div></span>${ic('upload')}</button>
        <button class="set-row" data-a="backup"><span class="st"><div class="t">Back up everything</div><div class="s">Workouts and money in one file</div></span>${ic('upload')}</button>
        <button class="set-row" data-a="wipe"><span class="st"><div class="t" style="color:var(--danger)">Delete all money data</div><div class="s">Entries, bills and categories. Workouts are not touched.</div></span></button>
      </div>
      <p class="hint" style="margin-top:14px">Everything stays on this phone. Screenshots are read on the phone and never uploaded.</p>
    </div>`;
    const la = $('#lockafter', view); if (la) la.addEventListener('change', () => { S.lockAfter = +la.value; saveSettings(); toast('Saved'); refresh(); });
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
    const rows = [['Date', 'Type', 'Amount', 'Your share', 'Group', 'Category', 'Payee', 'Account', 'Note', 'Source']];
    M.txns.slice().sort((a, b) => a.date.localeCompare(b.date)).forEach(t => { const c = cat(t.catId); rows.push([t.date, t.type, t.amount, isIncome(t) ? t.amount : own(t), isIncome(t) ? 'Income' : GROUPS[c.group || 'wants'].name, c.name, t.payee || '', t.acc && accOf(t.acc) ? accOf(t.acc).name : '', t.note || '', t.src || '']); });
    const csv = rows.map(r => r.map(v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(',')).join('\n');
    const fname = `vyora-${dkey(new Date())}.csv`;
    try {
      if (P.Filesystem && P.Share) { const r = await P.Filesystem.writeFile({ path: fname, data: csv, directory: 'CACHE', encoding: 'utf8' }); await P.Share.share({ title: 'Money export', files: [r.uri], dialogTitle: 'Save or send the spreadsheet' }); }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = fname; document.body.appendChild(a); a.click(); a.remove(); }
    } catch (e) { if (!String(e && e.message || e).toLowerCase().includes('cancel')) toast('Export failed'); }
  }

  /* ---------- accounts & balances ---------- */
  const ACC_TYPES = [['bank', '🏦', 'Bank'], ['cash', '💵', 'Cash'], ['card', '💳', 'Credit card'], ['wallet', '👛', 'Wallet']];
  const accIcon = a => (ACC_TYPES.find(x => x[0] === a.type) || ACC_TYPES[0])[1];
  const accOf = id => M.accounts.find(a => a.id === id);
  const r2 = n => Math.round(n * 100) / 100;
  // Only entries saved after the starting balance was set move it, so older history does not count twice.
  const afterStart = (acc, x) => (x.at || 0) >= acc.since && (!x.date || x.date >= acc.sinceDay);
  function balance(acc) {
    let b = acc.start || 0;
    M.txns.forEach(t => { if (t.acc === acc.id && afterStart(acc, t)) b += isIncome(t) ? t.amount : -t.amount; });
    M.transfers.forEach(x => { if (!afterStart(acc, x)) return; if (x.from === acc.id) b -= x.amount; if (x.to === acc.id) b += x.amount; });
    M.settles.forEach(x => { if (x.acc === acc.id && afterStart(acc, x)) b += x.dir === 'in' ? x.amount : -x.amount; });
    return r2(b);
  }
  const BANKS = ['hdfc', 'axis', 'icici', 'kotak', 'sbi', 'state bank', 'yes bank', 'idfc', 'indusind', 'canara', 'union bank', 'baroda', 'pnb', 'punjab national', 'federal', 'au small', 'bandhan', 'rbl', 'paytm payments', 'airtel payments', 'jupiter', 'fi money', 'slice', 'onecard'];
  // Pick the account a payment most likely came from: matching last 4 digits, then bank name, then the last one you used.
  function pickAcc(pre) {
    if (!M.accounts.length) return null;
    if (pre.last4) { const a = M.accounts.find(x => x.last4 && x.last4 === pre.last4); if (a) return a.id; }
    if (pre.bank) { const a = M.accounts.find(x => norm(x.name).includes(pre.bank.split(' ')[0])); if (a) return a.id; }
    if (M.lastAcc && accOf(M.lastAcc)) return M.lastAcc;
    return (M.accounts.find(a => a.type === 'bank') || M.accounts[0]).id;
  }
  const accChips = (sel, attr = 'data-acc') => `<div class="accchips">${M.accounts.map(a => `<button class="catchip ${sel === a.id ? 'on' : ''}" ${attr}="${a.id}"><span>${accIcon(a)}</span>${esc(a.name)}</button>`).join('')}</div>`;

  function accountSheet(acc, pre = {}, onSaved) {
    const isNew = !acc;
    const a = acc ? clone(acc) : Object.assign({ id: 'a' + uid(), name: '', type: pre.last4 ? 'bank' : M.accounts.some(x => x.type === 'cash') ? 'bank' : (M.accounts.length ? 'cash' : 'bank'), start: 0, last4: '' }, pre);
    const cur = acc ? balance(acc) : null;
    const moves = acc ? accMoves(acc).slice(0, 8) : [];
    const s = sheet(`<h2>${isNew ? 'Add account' : esc(a.name)}</h2>
      ${isNew ? '<p class="sub">Enter what is in it right now. Every expense, income and transfer you save after this moves the balance.</p>' : ''}
      <div class="accchips">${ACC_TYPES.map(([k, ico, n]) => `<button class="catchip ${a.type === k ? 'on' : ''}" data-at="${k}"><span>${ico}</span>${n}</button>`).join('')}</div>
      <input class="field body" id="an" placeholder="Name (e.g. HDFC Savings, Cash)" value="${esc(a.name)}" maxlength="24" style="margin:10px 0">
      <div class="sect" style="margin-top:4px" id="alab">${a.type === 'card' ? 'Amount you owe right now' : 'Balance right now'}</div>
      <div class="amt"><span>₹</span><input id="ab" inputmode="decimal" value="${cur != null ? (a.type === 'card' ? -cur : cur) : ''}" placeholder="0"></div>
      <input class="field body" id="a4" placeholder="Last 4 digits (optional, helps match screenshots)" value="${esc(a.last4 || '')}" inputmode="numeric" maxlength="4">
      ${moves.length ? `<div class="sect">Recent</div><div class="block" style="padding:0">${moves.map(m => `<div class="mini-row"><span>${esc(m.label)}<small>${esc(dlabel(m.date))}</small></span><b class="${m.v > 0 ? 'okt' : ''}">${m.v > 0 ? '+' : '−'}${inr(Math.abs(m.v), { dec: true })}</b></div>`).join('')}</div>` : ''}
      <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="ok">Save</button></div>`);
    if (isNew) setTimeout(() => $('#an', s.el).focus(), 250);
    s.el.addEventListener('click', async e => {
      const at = e.target.closest('[data-at]');
      if (at) { a.type = at.dataset.at; $$('[data-at]', s.el).forEach(x => x.classList.toggle('on', x === at)); $('#alab', s.el).textContent = a.type === 'card' ? 'Amount you owe right now' : 'Balance right now'; if (!$('#an', s.el).value && a.type === 'cash') $('#an', s.el).value = 'Cash'; return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'del') {
        if (await confirmBox(`Delete ${a.name}?`, 'Your entries stay. They just stop moving a balance.', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) {
          M.accounts = M.accounts.filter(x => x.id !== a.id); if (M.lastAcc === a.id) M.lastAcc = null; save(); s.close(); refresh();
        }
        return;
      }
      a.name = $('#an', s.el).value.trim(); if (!a.name) { toast('Give the account a name'); return; }
      let v = num($('#ab', s.el).value) || 0; if (a.type === 'card') v = -v;
      a.last4 = ($('#a4', s.el).value.match(/\d{4}/) || [''])[0];
      if (isNew) { a.start = r2(v); a.since = Date.now(); a.sinceDay = dkey(new Date()); M.accounts.push(a); M.lastAcc = M.lastAcc || a.id; }
      else { a.start = r2((acc.start || 0) + (v - cur)); Object.assign(acc, a); }
      save(); s.close(); refresh(); toast(isNew ? `${a.name} added` : 'Saved');
      if (onSaved) onSaved(a);
    });
  }
  function accMoves(acc) {
    const out = [];
    M.txns.forEach(t => { if (t.acc === acc.id && afterStart(acc, t)) out.push({ date: t.date, at: t.at, label: t.payee || cat(t.catId).name, v: isIncome(t) ? t.amount : -t.amount }); });
    M.transfers.forEach(x => { if (!afterStart(acc, x)) return; if (x.from === acc.id) out.push({ date: x.date, at: x.at, label: `To ${(accOf(x.to) || { name: 'account' }).name}`, v: -x.amount }); if (x.to === acc.id) out.push({ date: x.date, at: x.at, label: `From ${(accOf(x.from) || { name: 'account' }).name}`, v: x.amount }); });
    M.settles.forEach(x => { if (x.acc === acc.id && afterStart(acc, x)) out.push({ date: x.date, at: x.at, label: `${x.dir === 'in' ? 'From' : 'To'} ${personName(x.pid)}`, v: x.dir === 'in' ? x.amount : -x.amount }); });
    return out.sort((a, b) => b.date.localeCompare(a.date) || b.at - a.at);
  }
  function transferSheet() {
    if (M.accounts.length < 2) { toast('Add at least two accounts first'); return accountSheet(null); }
    const x = { from: (M.accounts.find(a => a.type === 'bank') || M.accounts[0]).id, to: (M.accounts.find(a => a.type === 'cash') || M.accounts[1]).id };
    const s = sheet(`<h2>Move money</h2><p class="sub">ATM cash, paying a card bill or moving between banks. This does not count as spending.</p>
      <div class="amt"><span>₹</span><input id="tamt" inputmode="decimal" placeholder="0"></div>
      <div class="sect" style="margin-top:4px">From</div><div id="tf"></div><div class="sect">To</div><div id="tt"></div>
      <input class="field body" id="tdate" type="date" value="${dkey(new Date())}" max="${dkey(new Date())}" style="margin-top:12px">
      <div class="btns"><button class="btn primary" data-a="ok">Move</button></div>`);
    const paint = () => { $('#tf', s.el).innerHTML = accChips(x.from, 'data-tf'); $('#tt', s.el).innerHTML = accChips(x.to, 'data-tt'); };
    paint(); setTimeout(() => $('#tamt', s.el).focus(), 250);
    s.el.addEventListener('click', e => {
      const f = e.target.closest('[data-tf]'); if (f) { x.from = f.dataset.tf; if (x.to === x.from) x.to = (M.accounts.find(a => a.id !== x.from) || {}).id; return paint(); }
      const t = e.target.closest('[data-tt]'); if (t) { x.to = t.dataset.tt; if (x.to === x.from) x.from = (M.accounts.find(a => a.id !== x.to) || {}).id; return paint(); }
      if (!e.target.closest('[data-a="ok"]')) return;
      const amt = num($('#tamt', s.el).value); if (!amt || amt <= 0) { toast('Enter the amount'); return; }
      M.transfers.push({ id: uid(), from: x.from, to: x.to, amount: r2(amt), date: $('#tdate', s.el).value || dkey(new Date()), at: Date.now() });
      save(); s.close(); refresh(); toast(`${inr(amt)} moved to ${accOf(x.to).name}`);
    });
  }
  function accountsHtml() {
    if (!M.accounts.length) return `<button class="nudge" data-a="addacc" style="margin-top:12px">${ic('plus')}<span><b>Track your balances.</b> Add your bank accounts, cash and cards with what's in them now. Every payment then moves the right balance.</span></button>`;
    const total = M.accounts.reduce((a, x) => a + balance(x), 0);
    return `<div class="sect"><span>Accounts · ${inr(total)}</span><button class="linkbtn" data-a="transfer">Move money</button></div>
      <div class="accstrip">${M.accounts.map(a => { const b = balance(a); return `<button class="acc" data-acct="${a.id}"><span class="ai">${accIcon(a)}</span><span class="an">${esc(a.name)}</span><b class="${b < 0 ? 'neg' : ''}">${a.type === 'card' && b <= 0 ? (b ? inr(-b) + ' due' : 'Nothing due') : inr(b)}</b></button>`; }).join('')}<button class="acc add" data-a="addacc">${ic('plus')}<span class="an">Add</span></button></div>`;
  }

  /* ---------- savings goals ---------- */
  const GOAL_ICONS = ['🎯', '🛟', '🏍️', '🚗', '🏠', '✈️', '💍', '📱', '💻', '🎓', '🏖️', '👶', '🎁', '📈'];
  const goalSaved = g => r2((g.start || 0) + M.txns.filter(t => t.goal === g.id && !isIncome(t)).reduce((a, t) => a + own(t), 0));
  function goalLine(g) {
    const sv = goalSaved(g); const rest = g.target - sv;
    if (rest <= 0) return 'Reached 🎉';
    if (g.by) {
      const [y, m] = g.by.split('-').map(Number); const now = new Date();
      const months = (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()) + 1;
      if (months <= 0) return `${inr(rest)} to go · target date passed`;
      return `${inr(Math.ceil(rest / months))} a month to reach it by ${MONTHS[m - 1].slice(0, 3)} ${y}`;
    }
    return `${inr(rest)} to go`;
  }
  function goalsHtml() {
    if (!M.goals.length) return '';
    return `<div class="sect"><span>Savings goals</span><button class="linkbtn" data-a="addgoal">+ Add</button></div>
      <div class="block" style="padding:0">${M.goals.map(g => { const sv = goalSaved(g); const p = Math.min(100, g.target ? sv / g.target * 100 : 0); return `
        <div class="goalrow"><button class="gm" data-goal="${g.id}"><span class="gi">${g.icon}</span><span class="gt"><b>${esc(g.name)}</b><span>${inr(sv)} of ${inr(g.target)} · ${goalLine(g)}</span>
          <span class="gbar"><i style="width:${p.toFixed(1)}%;background:${GROUPS.savings.color}"></i></span></span></button>
          ${sv < g.target ? `<button class="paybtn" data-gadd="${g.id}">+ Add</button>` : ''}</div>`; }).join('')}</div>`;
  }
  function goalSheet(goal) {
    const isNew = !goal;
    const g = goal ? clone(goal) : { id: 'g' + uid(), name: '', icon: '🎯', target: null, start: 0, by: '' };
    const s = sheet(`<h2>${isNew ? 'New savings goal' : 'Edit goal'}</h2>
      <input class="field body" id="gn" placeholder="What for? (e.g. Emergency fund, Bike)" value="${esc(g.name)}" maxlength="28" style="margin-bottom:10px">
      <div class="emojis">${GOAL_ICONS.map(x => `<button class="${g.icon === x ? 'on' : ''}" data-em="${x}">${x}</button>`).join('')}</div>
      <div class="sect">Target</div><div class="amt"><span>₹</span><input id="gtg" inputmode="numeric" placeholder="0" value="${g.target || ''}"></div>
      <div class="sect">Already saved</div><div class="amt"><span>₹</span><input id="gst" inputmode="numeric" placeholder="0" value="${g.start || ''}"></div>
      <div class="sect">Reach it by (optional)</div><input class="field body" id="gby" type="month" value="${esc(g.by || '')}" min="${dkey(new Date()).slice(0, 7)}">
      <p class="hint">Add money to a goal with the <b>+ Add</b> button, or pick the goal when you save a Savings expense like an SIP or FD.</p>
      <div class="btns ${isNew ? '' : 'two'}">${isNew ? '' : '<button class="btn danger" data-a="del">Delete</button>'}<button class="btn primary" data-a="ok">Save</button></div>`);
    s.el.addEventListener('click', async e => {
      const em = e.target.closest('[data-em]'); if (em) { g.icon = em.dataset.em; $$('[data-em]', s.el).forEach(x => x.classList.toggle('on', x === em)); return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'del') {
        if (await confirmBox('Delete this goal?', 'Payments you made towards it stay in your transactions.', [{ label: 'Delete', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) {
          M.goals = M.goals.filter(x => x.id !== g.id); M.txns.forEach(t => { if (t.goal === g.id) delete t.goal; }); save(); s.close(); refresh();
        }
        return;
      }
      g.name = $('#gn', s.el).value.trim(); g.target = num($('#gtg', s.el).value); g.start = num($('#gst', s.el).value) || 0; g.by = $('#gby', s.el).value || '';
      if (!g.name) { toast('Give the goal a name'); return; }
      if (!g.target) { toast('Enter the target amount'); return; }
      const i = M.goals.findIndex(x => x.id === g.id); if (i >= 0) M.goals[i] = g; else M.goals.push(g);
      save(); s.close(); refresh();
    });
  }

  /* ---------- spending alerts (80% and 100%) ---------- */
  function limitList(st) {
    const out = [{ key: 'all', name: 'Total budget', icon: '₹', v: st.total, lim: st.budget }];
    ['needs', 'wants'].forEach(g => out.push({ key: 'g:' + g, name: GROUPS[g].name, icon: '', color: GROUPS[g].color, v: st.spent[g], lim: st.target(g) }));
    Object.entries(M.limits || {}).forEach(([id, lim]) => { const c = cat(id); out.push({ key: 'c:' + id, name: c.name, icon: c.icon, color: GROUPS[c.group || 'wants'].color, v: st.tx.filter(t => !isIncome(t) && t.catId === id).reduce((a, t) => a + own(t), 0), lim }); });
    return out.filter(x => x.lim > 0).map(x => ({ ...x, pct: x.v / x.lim }));
  }
  const alertText = x => x.pct >= 1 ? `⚠️ ${x.name} is over its ${inr(x.lim)} limit (${inr(x.v)} spent)` : `${x.name} has used ${Math.round(x.pct * 100)}% of ${inr(x.lim)}`;
  function checkAlerts() {
    if (M.alertsOn === false || !M.setup) return;
    const st = stats(); const ck = dkey(st.s);
    if (!M.alerted || !M.alerted[ck]) M.alerted = { [ck]: {} };
    const done = M.alerted[ck]; const hits = [];
    limitList(st).forEach(x => { const lv = x.pct >= 1 ? 100 : x.pct >= 0.8 ? 80 : 0; if (lv > (done[x.key] || 0)) { done[x.key] = lv; hits.push(x); } else if (!lv && done[x.key]) delete done[x.key]; });
    save();
    if (!hits.length) return;
    hits.sort((a, b) => b.pct - a.pct);
    setTimeout(() => {
      $$('.toast').forEach(t => t.remove());
      const t = el(`<div class="toast warn">${esc(alertText(hits[0]))}${hits.length > 1 ? ` <small>+${hits.length - 1} more</small>` : ''}</div>`);
      document.body.appendChild(t); try { buzz(120); } catch (e) { /* ignore */ } setTimeout(() => t.remove(), 4200);
    }, 2500);
  }
  function alertsHtml(st) {
    const list = limitList(st).filter(x => x.pct >= 0.8).sort((a, b) => b.pct - a.pct).slice(0, 3);
    if (!list.length || M.alertsOn === false) return '';
    return `<div class="alerts">${list.map(x => `<button class="alertrow ${x.pct >= 1 ? 'bad' : ''}" data-go="budget"><span class="ai">${x.icon || `<i class="gdot" style="background:${x.color}"></i>`}</span><span class="at"><b>${esc(x.name)}</b> ${x.pct >= 1 ? `over by ${inr(x.v - x.lim)}` : `${Math.round(x.pct * 100)}% used`}<span class="gbar"><i style="width:${Math.min(100, x.pct * 100).toFixed(1)}%"></i></span></span><span class="av">${inr(x.v)}<small>of ${inr(x.lim)}</small></span></button>`).join('')}</div>`;
  }
  function limitSheet(id) {
    const c = cat(id); const cur = (M.limits || {})[id];
    const s = sheet(`<h2>${c.icon} ${esc(c.name)} limit</h2><p class="sub">Per budget cycle. You get a warning at 80% and when you go over.</p>
      <div class="amt"><span>₹</span><input id="lv" inputmode="numeric" placeholder="0" value="${cur || ''}"></div>
      <div class="presets">${[1000, 2000, 3000, 5000, 8000, 10000].map(v => `<button class="chip small" data-v="${v}">${inr(v)}</button>`).join('')}</div>
      <div class="btns ${cur ? 'two' : ''}">${cur ? '<button class="btn" data-a="rm">Remove limit</button>' : ''}<button class="btn primary" data-a="ok">Save</button></div>`);
    setTimeout(() => $('#lv', s.el).focus(), 250);
    s.el.addEventListener('click', e => {
      const v = e.target.closest('[data-v]'); if (v) { $('#lv', s.el).value = v.dataset.v; return; }
      const b = e.target.closest('[data-a]'); if (!b) return;
      M.limits = M.limits || {};
      if (b.dataset.a === 'rm') delete M.limits[id];
      else { const n = num($('#lv', s.el).value); if (!n) { toast('Enter a limit'); return; } M.limits[id] = Math.round(n); }
      save(); s.close(); refresh(); checkAlerts();
    });
  }

  /* ---------- salary-day report ---------- */
  function hasData(st) { return st.tx.length > 0; }
  function reportSheet(offset = -1) {
    const st = stats(offset); const prev = stats(offset - 1);
    if (offset < 0) { M.lastReport = dkey(st.s); save(); refresh(); }
    const byCat = {}; st.tx.filter(t => !isIncome(t)).forEach(t => { byCat[t.catId] = (byCat[t.catId] || 0) + own(t); });
    const pbyCat = {}; prev.tx.filter(t => !isIncome(t)).forEach(t => { pbyCat[t.catId] = (pbyCat[t.catId] || 0) + own(t); });
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const biggest = st.tx.filter(t => !isIncome(t)).sort((a, b) => own(b) - own(a))[0];
    let noWant = 0; for (let i = 0; i < st.elapsed; i++) { const k = dkey(addDays(st.s, i)); if (!st.tx.some(t => t.date === k && !isIncome(t) && cat(t.catId).group === 'wants')) noWant++; }
    const under = st.budget - st.total;
    const rate = st.income ? Math.round((st.income - st.spent.needs - st.spent.wants) / st.income * 100) : null;
    const wantsOver = st.spent.wants - st.target('wants');
    const topWant = Object.entries(byCat).filter(([id]) => cat(id).group === 'wants').sort((a, b) => b[1] - a[1])[0];
    const tip = under < 0 ? `You went ${inr(-under)} over. ${topWant ? `${cat(topWant[0]).name} was your biggest want at ${inr(topWant[1])}. A limit on it would warn you at 80% next time.` : ''}`
      : wantsOver > 0 ? `Wants went ${inr(wantsOver)} over plan, but the total stayed inside budget.`
      : st.spent.savings < st.target('savings') ? `You saved ${inr(st.spent.savings)} against a ${inr(st.target('savings'))} plan. Moving savings on salary day makes it automatic.`
      : 'Every part of your plan stayed on target. Nice cycle!';
    const s = sheet(`<h2>${st.current ? 'This cycle so far' : 'Cycle report'}</h2><p class="sub">${short(st.s)} – ${short(st.e)}${st.current ? ` · ${st.daysLeft} days left` : ''}</p>
      <div class="rephero ${under < 0 ? 'bad' : ''}"><b>${inr(st.total)}</b><span>spent of ${inr(st.budget)}</span><em>${Math.abs(under) < 1 ? 'Right on budget' : under > 0 ? `${inr(under)} under budget` : `${inr(-under)} over budget`}</em></div>
      <div class="stats" style="margin-top:10px">
        <div class="stat"><div class="k">Saved</div><div class="v">${rate != null ? rate + '%' : inr(st.spent.savings)}</div><div class="s">${rate != null ? 'of income kept' : 'put into savings'}</div></div>
        <div class="stat"><div class="k">No-wants days</div><div class="v">${noWant}</div><div class="s">of ${st.elapsed} days</div></div>
      </div>
      <div class="sect">Plan vs actual</div>
      <div class="block" style="padding:4px 0">${GKEYS.map(g => { const tg = st.target(g); const v = st.spent[g]; return `<div class="grow"><div class="gl"><span><i style="background:${GROUPS[g].color}"></i>${GROUPS[g].name}</span><span><b>${inr(v)}</b> / ${inr(tg)}</span></div><div class="gbar"><i style="width:${Math.min(100, tg ? v / tg * 100 : 0).toFixed(1)}%;background:${GROUPS[g].color}"></i></div></div>`; }).join('')}</div>
      ${top.length ? `<div class="sect">Top categories</div><div class="block" style="padding:0">${top.map(([id, v]) => { const c = cat(id); const p = pbyCat[id]; const ch = hasData(prev) && p ? Math.round((v - p) / p * 100) : null; return `<div class="mini-row"><span>${c.icon} ${esc(c.name)}${ch != null ? `<small class="${ch > 0 ? 'badt' : 'okt'}">${ch > 0 ? '▲' : '▼'} ${Math.abs(ch)}% vs last cycle</small>` : ''}</span><b>${inr(v)}</b></div>`; }).join('')}</div>` : ''}
      ${biggest ? `<p class="hint">Biggest single payment: <b>${inr(own(biggest))}</b> to ${esc(biggest.payee || cat(biggest.catId).name)} on ${esc(short(parseKey(biggest.date)))}.</p>` : ''}
      ${M.goals.length ? `<div class="sect">Goals</div><div class="block" style="padding:0">${M.goals.map(g => `<div class="mini-row"><span>${g.icon} ${esc(g.name)}<small>${goalLine(g)}</small></span><b>${Math.min(100, Math.round(goalSaved(g) / g.target * 100))}%</b></div>`).join('')}</div>` : ''}
      <div class="mwarn" style="margin-top:12px">${ic('info')}<span>${esc(tip)}</span></div>
      <div class="btns"><button class="btn primary" data-a="ok">Done</button></div>`);
    s.el.addEventListener('click', e => { if (e.target.closest('[data-a="ok"]')) s.close(); });
  }
  function reportCardHtml() {
    const prev = stats(-1);
    if (!hasData(prev) || M.lastReport === dkey(prev.s)) return '';
    return `<button class="nudge" data-a="report" style="border-color:${GROUPS.savings.color}">${ic('pie')}<span><b>Your ${short(prev.s)} – ${short(prev.e)} report is ready.</b> ${Math.abs(prev.budget - prev.total) < 1 ? 'Right on budget.' : prev.total < prev.budget ? `${inr(prev.budget - prev.total)} under budget.` : `${inr(prev.total - prev.budget)} over budget.`} Tap to see where it went.</span></button>`;
  }

  /* ---------- split with friends ---------- */
  const personName = id => (M.people.find(p => p.id === id) || { name: 'Friend' }).name;
  function calcSplit(amount, cfg) {
    const withP = (cfg.with || []).filter(id => M.people.some(p => p.id === id));
    const incMe = cfg.by !== 'me' ? true : cfg.incMe !== false;
    const n = withP.length + (incMe ? 1 : 0);
    if (!withP.length || !n) return null;
    const share = r2(amount / n);
    const each = {}; withP.forEach(id => { each[id] = share; });
    const mine = incMe ? r2(amount - share * withP.length) : 0;
    return { by: cfg.by || 'me', with: withP, incMe, mine, each };
  }
  function owes(pid) {
    let v = 0;
    M.txns.forEach(t => { const s = t.split; if (!s) return; if (s.by === 'me') v += (s.each && s.each[pid]) || 0; else if (s.by === pid) v -= s.mine; });
    M.settles.forEach(x => { if (x.pid === pid) v += x.dir === 'in' ? -x.amount : x.amount; });
    return r2(v);
  }
  async function addPerson() {
    const name = await promptText('Add a friend', { placeholder: 'Name' });
    if (!name) return null;
    const p = { id: 'p' + uid(), name: name.slice(0, 20) }; M.people.push(p); save(); return p.id;
  }
  function splitSheet(amount, cur, cb) {
    const cfg = cur ? { by: cur.by, with: cur.with.slice(), incMe: cur.incMe } : { by: 'me', with: [], incMe: true };
    const s = sheet(`<h2>Split ${amount ? inr(amount, { dec: true }) : 'this'}</h2><p class="sub">Split equally. Only your share counts against your budget.</p>
      <div class="sect" style="margin-top:4px">With</div><div id="sp1"></div>
      <div class="sect">Who paid?</div><div id="sp2"></div>
      <label class="mremember" id="spme"><span class="toggle sm"></span><span>Include my share</span></label>
      <p class="hint" id="sp3"></p>
      <div class="btns ${cur ? 'two' : ''}">${cur ? '<button class="btn" data-a="rm">Remove split</button>' : ''}<button class="btn primary" data-a="ok">Done</button></div>`);
    const paint = () => {
      $('#sp1', s.el).innerHTML = `<div class="accchips">${M.people.map(p => `<button class="catchip ${cfg.with.includes(p.id) ? 'on' : ''}" data-pp="${p.id}"><span>👤</span>${esc(p.name)}</button>`).join('')}<button class="catchip add" data-a="addp">+ Friend</button></div>`;
      $('#sp2', s.el).innerHTML = `<div class="accchips"><button class="catchip ${cfg.by === 'me' ? 'on' : ''}" data-by="me"><span>🙋</span>Me</button>${cfg.with.map(id => `<button class="catchip ${cfg.by === id ? 'on' : ''}" data-by="${id}"><span>👤</span>${esc(personName(id))}</button>`).join('')}</div>`;
      $('#spme', s.el).style.display = cfg.by === 'me' ? '' : 'none';
      $('#spme .toggle', s.el).classList.toggle('on', cfg.incMe !== false);
      const r = amount ? calcSplit(amount, cfg) : null;
      $('#sp3', s.el).textContent = !cfg.with.length ? 'Pick at least one friend.' : !r ? '' : cfg.by === 'me' ? `Each owes you ${inr(r.each[cfg.with[0]], { dec: true })} · your share ${inr(r.mine, { dec: true })}` : `You owe ${personName(cfg.by)} ${inr(r.mine, { dec: true })}. Nothing leaves your account now.`;
    };
    paint();
    s.el.addEventListener('click', async e => {
      const pp = e.target.closest('[data-pp]'); if (pp) { const id = pp.dataset.pp; cfg.with = cfg.with.includes(id) ? cfg.with.filter(x => x !== id) : cfg.with.concat(id); if (!cfg.with.includes(cfg.by)) cfg.by = 'me'; return paint(); }
      const by = e.target.closest('[data-by]'); if (by) { cfg.by = by.dataset.by; return paint(); }
      if (e.target.closest('#spme')) { cfg.incMe = cfg.incMe === false; return paint(); }
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'addp') { const id = await addPerson(); if (id) cfg.with.push(id); return paint(); }
      if (b.dataset.a === 'rm') { s.close(); return cb(null); }
      if (b.dataset.a === 'ok') { if (!cfg.with.length) { toast('Pick a friend'); return; } s.close(); cb(cfg); }
    });
  }
  function friendsHtml() {
    if (!M.people.length) return '';
    const list = M.people.map(p => ({ p, v: owes(p.id) })).filter(x => Math.abs(x.v) >= 1);
    const inV = list.filter(x => x.v > 0).reduce((a, x) => a + x.v, 0), outV = list.filter(x => x.v < 0).reduce((a, x) => a - x.v, 0);
    return `<div class="sect"><span>Friends</span><button class="linkbtn" data-a="friends">Open</button></div>
      <button class="block friendsum" data-a="friends"><span><small>Owed to you</small><b class="okt">${inr(inV)}</b></span><span><small>You owe</small><b class="${outV ? 'badt' : ''}">${inr(outV)}</b></span><span class="fn">${list.slice(0, 3).map(x => `${esc(x.p.name)} ${x.v > 0 ? 'owes you' : 'gets'} ${inr(Math.abs(x.v))}`).join(' · ') || 'All settled up'}</span></button>`;
  }
  function friendsSheet() {
    const s = sheet(`<h2>Friends</h2><p class="sub">From split bills. Settling up moves the money in or out of an account.</p><div id="fl"></div>
      <div class="btns"><button class="btn" data-a="addp">${ic('plus')}Add friend</button></div>`);
    const paint = () => {
      $('#fl', s.el).innerHTML = `<div class="block" style="padding:0">${M.people.map(p => { const v = owes(p.id); return `<div class="billrow"><span class="txi" style="--gc:var(--accent)">👤</span><button class="txm" data-person="${p.id}"><b>${esc(p.name)}</b><span class="${v < 0 ? 'badt' : v > 0 ? 'okt' : ''}">${Math.abs(v) < 1 ? 'Settled up' : v > 0 ? `Owes you ${inr(v, { dec: true })}` : `You owe ${inr(-v, { dec: true })}`}</span></button>${Math.abs(v) >= 1 ? `<button class="paybtn" data-settle="${p.id}">Settle</button>` : ''}</div>`; }).join('') || '<div class="empty" style="padding:18px">No friends yet. Split an expense to add one.</div>'}</div>`;
    };
    paint();
    s.el.addEventListener('click', async e => {
      const st = e.target.closest('[data-settle]'); if (st) return settleSheet(st.dataset.settle, paint);
      const pe = e.target.closest('[data-person]'); if (pe) return personSheet(pe.dataset.person, paint);
      if (e.target.closest('[data-a="addp"]')) { await addPerson(); paint(); refresh(); }
    });
  }
  function personSheet(pid, after) {
    const p = M.people.find(x => x.id === pid); if (!p) return;
    const v = owes(pid);
    const items = [];
    M.txns.forEach(t => { const s = t.split; if (!s) return; if (s.by === 'me' && s.each[pid]) items.push({ date: t.date, label: t.payee || cat(t.catId).name, txt: `You paid ${inr(t.amount)}`, v: s.each[pid] }); else if (s.by === pid) items.push({ date: t.date, label: t.payee || cat(t.catId).name, txt: `${p.name} paid ${inr(t.amount)}`, v: -s.mine }); });
    M.settles.forEach(x => { if (x.pid === pid) items.push({ date: x.date, label: x.dir === 'in' ? 'They paid you' : 'You paid them', txt: 'Settled', v: x.dir === 'in' ? -x.amount : x.amount }); });
    items.sort((a, b) => b.date.localeCompare(a.date));
    const s = sheet(`<h2>${esc(p.name)}</h2><p class="sub ${v < 0 ? 'badt' : ''}">${Math.abs(v) < 1 ? 'All settled up' : v > 0 ? `Owes you ${inr(v, { dec: true })}` : `You owe ${inr(-v, { dec: true })}`}</p>
      <div class="block" style="padding:0">${items.slice(0, 20).map(i => `<div class="mini-row"><span>${esc(i.label)}<small>${esc(dlabel(i.date))} · ${esc(i.txt)}</small></span><b class="${i.v > 0 ? 'okt' : 'badt'}">${i.v > 0 ? '+' : '−'}${inr(Math.abs(i.v), { dec: true })}</b></div>`).join('') || '<div class="empty" style="padding:16px">Nothing yet.</div>'}</div>
      <div class="btns ${Math.abs(v) >= 1 ? 'two' : 'two'}">${Math.abs(v) >= 1 ? `<button class="btn" data-a="remind">${v > 0 ? 'Send reminder' : 'Share'}</button><button class="btn primary" data-a="settle">Settle up</button>` : '<button class="btn danger" data-a="del">Remove</button><button class="btn" data-a="close">Close</button>'}</div>`);
    s.el.addEventListener('click', async e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') return s.close();
      if (b.dataset.a === 'settle') { s.close(); return settleSheet(pid, after); }
      if (b.dataset.a === 'del') { M.people = M.people.filter(x => x.id !== pid); save(); s.close(); if (after) after(); refresh(); return; }
      if (b.dataset.a === 'remind') {
        const text = v > 0 ? `Hi ${p.name}, quick reminder: you owe me ${inr(v, { dec: true })} for ${items.filter(i => i.v > 0).slice(0, 3).map(i => i.label).join(', ')}. Thanks!` : `Hi ${p.name}, I owe you ${inr(-v, { dec: true })}. Sending it now.`;
        try { if (P.Share) await P.Share.share({ text, dialogTitle: 'Send to ' + p.name }); else if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Message copied'); } } catch (err) { /* cancelled */ }
      }
    });
  }
  function settleSheet(pid, after) {
    const v = owes(pid); const dir = v > 0 ? 'in' : 'out';
    let acc = pickAcc({});
    const s = sheet(`<h2>Settle with ${esc(personName(pid))}</h2><p class="sub">${dir === 'in' ? 'They paid you back' : 'You paid them back'}.</p>
      <div class="amt"><span>₹</span><input id="sv" inputmode="decimal" value="${Math.abs(v)}"></div>
      ${M.accounts.length ? `<div class="sect" style="margin-top:4px">${dir === 'in' ? 'Into' : 'From'}</div><div id="sa"></div>` : ''}
      <div class="btns"><button class="btn primary" data-a="ok">Save</button></div>`);
    const paint = () => { const box = $('#sa', s.el); if (box) box.innerHTML = accChips(acc); };
    paint();
    s.el.addEventListener('click', e => {
      const a = e.target.closest('[data-acc]'); if (a) { acc = a.dataset.acc; return paint(); }
      if (!e.target.closest('[data-a="ok"]')) return;
      const amt = num($('#sv', s.el).value); if (!amt || amt <= 0) { toast('Enter the amount'); return; }
      M.settles.push({ id: uid(), pid, dir, amount: r2(amt), acc, date: dkey(new Date()), at: Date.now() });
      save(); s.close(); if (after) after(); refresh(); toast(`Settled ${inr(amt)} with ${personName(pid)}`);
    });
  }

  /* ---------- for the daily check-in and weekly scorecard ---------- */
  function dayOnPace(k) {
    if (!M.setup || !M.txns.length) return null;
    const first = M.txns.reduce((m, t) => (t.date < m ? t.date : m), k);
    if (k < first || k > dkey(new Date())) return null;
    const s = cycleStart(parseKey(k)), e = cycleEnd(s);
    const sk = dkey(s);
    const spent = M.txns.filter(t => !isIncome(t) && t.date >= sk && t.date <= k).reduce((a, t) => a + own(t), 0);
    const total = Math.round((e - s) / 864e5) + 1, el = Math.round((parseKey(k) - s) / 864e5) + 1;
    return spent <= budgetFor(s) * el / total;
  }
  function weekSpend(start) {
    if (!M.setup) return null;
    const a = dkey(start), b = dkey(addDays(start, 6));
    const spent = M.txns.filter(t => !isIncome(t) && t.date >= a && t.date <= b).reduce((x, t) => x + own(t), 0);
    const s = cycleStart(start), e = cycleEnd(s);
    return { spent, pace: budgetFor(s) / (Math.round((e - s) / 864e5) + 1) * 7, locked: M.lockOn && !unlocked };
  }

  /* ---------- home-screen widget ---------- */
  function widgetData() {
    if (sealed) return { money: true, locked: true, left: 0, safe: 0 };
    if (!M.setup) return { money: false };
    const st = stats();
    return { money: true, locked: !!M.lockOn, left: Math.round(st.left), safe: Math.round(Math.max(0, st.safe - st.spentToday)) };
  }

  /* ---------- statement PDFs (PhonePe → Statement → share or import) ---------- */
  let pdfjsP = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfjsP) pdfjsP = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = 'lib/pdf.min.js';
      s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js'; res(window.pdfjsLib); };
      s.onerror = () => { pdfjsP = null; rej(new Error('pdf reader missing')); };
      document.head.appendChild(s);
    });
    return pdfjsP;
  }
  // Turns every PDF page into text lines. Cells far apart on a line are joined with " | ".
  async function pdfLines(bytes, password) {
    const lib = await loadPdfJs();
    const doc = await lib.getDocument({ data: bytes, password, isEvalSupported: false }).promise;
    const lines = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      const rows = [];
      tc.items.forEach(i => {
        const s = String(i.str || '').trim(); if (!s) return;
        const it = { s, x: i.transform[4], y: i.transform[5], w: i.width || 0 };
        let r = rows.find(z => Math.abs(z.y - it.y) <= 3);
        if (!r) { r = { y: it.y, items: [] }; rows.push(r); }
        r.items.push(it);
      });
      rows.sort((a, b) => b.y - a.y).forEach(r => {
        r.items.sort((a, b) => a.x - b.x);
        let out = '', end = null;
        r.items.forEach(it => { if (end != null) { const gap = it.x - end; out += gap > 8 ? ' | ' : gap > 1.5 ? ' ' : ''; } out += it.s; end = it.x + it.w; });
        lines.push(out);
      });
    }
    return lines;
  }
  async function readPdf(bytes) {
    let password;
    for (let tries = 0; tries < 4; tries++) {
      try { return await pdfLines(bytes.slice(), password); } catch (e) {
        if (!e || e.name !== 'PasswordException') throw e;
        password = await promptText(tries ? 'Wrong password. Try again' : 'This PDF has a password', { placeholder: 'PDF password', ok: 'Open' });
        if (!password) return null;
      }
    }
    return null;
  }
  const DATE_RE = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.? (\d{1,2}),? (\d{4})$/i;
  function parseStatement(lines) {
    const out = []; let cur = null;
    for (const line of lines) {
      const cells = line.split(' | ').map(c => c.trim()).filter(Boolean);
      if (!cells.length) continue;
      const m = cells[0].match(DATE_RE);
      if (m) {
        const ti = cells.findIndex(c => /^(debit|credit)$/i.test(c));
        if (ti < 1) { cur = null; continue; }
        const am = cells.slice(ti + 1).join(' ').match(/([\d,]+(?:\.\d{1,2})?)/);
        cur = { date: new Date(+m[3], MONTHS3.indexOf(m[1].slice(0, 3).toLowerCase()), +m[2]), details: cells.slice(1, ti).join(' '), dir: cells[ti].toLowerCase(), amount: am ? parseFloat(am[1].replace(/,/g, '')) : 0 };
        if (cur.amount > 0) out.push(cur); else cur = null;
        continue;
      }
      if (!cur) continue;
      const l = cells.join(' ');
      let x;
      if (/^page \d+ of \d+|system generated|^date\b.*amount$/i.test(l)) continue;
      let known = false;
      if ((x = cells[0].match(/^(\d{1,2}):(\d{2})\s*([ap]m)$/i))) {
        cur.time = `${pad((+x[1] % 12) + (/p/i.test(x[3]) ? 12 : 0))}:${x[2]}`; known = true;
        const rest = cells.slice(1).join(' ');
        if (rest && !cur.ref && !/transaction id|utr no/i.test(rest)) cur.details += ' ' + rest; // the payee name wrapped onto the time line
      }
      if ((x = l.match(/transaction id\s*:?\s*(\S+)/i))) { cur.ref = x[1]; known = true; }
      if ((x = l.match(/utr no\.?\s*:?\s*(\S+)/i))) { cur.utr = x[1]; known = true; }
      if ((x = l.match(/^(?:paid by|credited to|debited from)\s+(\S+)/i))) { cur.acct = x[1]; known = true; }
      if (!known && !cur.ref && cells.length === 1) cur.details += ' ' + l; // a long name that wrapped
    }
    return out;
  }
  const last4 = s => (String(s || '').match(/(\d{4})\D*$/) || [])[1] || '';
  const tidy = s => {
    let n = String(s || '').replace(/\s+/g, ' ').replace(/\b(private limited|pvt\.? ltd\.?|limited|ltd\.?)\b/ig, '').replace(/[\s\-–,]+$/, '').trim();
    if (n.length > 3 && n === n.toUpperCase() && /[A-Z]{3}/.test(n)) n = n.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase());
    return n.slice(0, 40);
  };
  function classify(r, ownAccts) {
    const d = r.details.replace(/\s+/g, ' ').trim(); let m;
    const has = id => (M.cats.some(c => c.id === id) ? id : null);
    if (r.dir === 'credit') {
      m = d.match(/^(?:received from|refund from|cashback from|credited by|money received from)\s+(.*)$/i);
      const payee = tidy(m ? m[1] : d);
      return { type: 'income', payee, catId: /refund|cashback/i.test(d) ? 'refund' : guessCat(payee, '', 'income') };
    }
    if ((m = d.match(/^(?:transfer(?:red)? to|self transfer to)\s+(.*)$/i))) {
      const to = last4(m[1]);
      if (to && ownAccts.has(to)) return { kind: 'transfer', to, payee: `To ••${to}` };
      return { type: 'expense', payee: tidy(m[1]), catId: null };
    }
    if ((m = d.match(/^invested in\s+(.*)$/i))) return { type: 'expense', payee: tidy(m[1]), catId: has('invest') || guessCat(m[1], '', 'expense') };
    if ((m = d.match(/^mobile recharged?\s*(.*)$/i))) return { type: 'expense', payee: tidy('Mobile recharge ' + m[1]), catId: has('bills') };
    if ((m = d.match(/^(?:bill paid|paid bill|bill payment)\s*(?:to|for)?\s*(.*)$/i))) return { type: 'expense', payee: tidy(m[1] || 'Bill'), catId: guessCat(m[1], '', 'expense') || has('bills') };
    m = d.match(/^(?:paid to|payment to|sent to|money sent to|paid)\s+(.*)$/i);
    const payee = tidy(m ? m[1] : d);
    return { type: 'expense', payee, catId: guessCat(payee, '', 'expense') };
  }
  function isDupeStmt(it) {
    if (it.ref && M.txns.some(t => t.ref && (t.ref === it.ref || t.ref === it.utr) || (t.utr && t.utr === it.utr))) return true;
    if (it.utr && M.txns.some(t => t.ref === it.utr)) return true;
    const k = norm(it.payee).slice(0, 6); const dk = dkey(it.date);
    return M.txns.some(t => t.date === dk && Math.abs(t.amount - it.amount) < 0.01 && (norm(t.payee).slice(0, 6) === k || !t.ref && t.src === 'screenshot' && norm(t.payee).split(' ')[0] === norm(it.payee).split(' ')[0]));
  }
  async function importPdf(bytes) {
    if (!M.setup) { toast('Set up Money first, then import the statement'); return setupView(); }
    toast('Reading statement…');
    let lines;
    try { lines = await readPdf(bytes); } catch (e) { toast(String(e && e.message || '').includes('missing') ? 'PDF reader is missing from this build' : 'Could not read this PDF'); return; }
    if (!lines) return;
    const rows = parseStatement(lines);
    if (!rows.length) { toast("Couldn't find payments in this PDF. PhonePe statements work best."); return; }
    statementSheet(rows);
  }

  function statementSheet(rows) {
    const ownAccts = new Set(rows.map(r => last4(r.acct)).filter(Boolean));
    const items = rows.map(r => {
      const c = classify(r, ownAccts);
      const it = Object.assign({}, r, c, { from: last4(r.acct) });
      it.dupe = it.kind === 'transfer' ? M.transfers.some(x => x.ref && x.ref === it.ref) : isDupeStmt(it);
      it.on = !it.dupe; it.auto = !!it.catId;
      return it;
    });
    const fresh = items.filter(i => !i.dupe);
    const transfers = fresh.filter(i => i.kind === 'transfer');
    const pays = fresh.filter(i => i.kind !== 'transfer');
    // Payees the app could not place, grouped so one tap sorts all payments to the same person or shop.
    const groups = {};
    pays.filter(i => !i.catId && i.type === 'expense').forEach(i => { const k = norm(i.payee) || i.payee; (groups[k] = groups[k] || { k, payee: i.payee, items: [], catId: null, on: true }).items.push(i); });
    const gList = Object.values(groups).sort((a, b) => b.items.length - a.items.length || b.items.reduce((s, i) => s + i.amount, 0) - a.items.reduce((s, i) => s + i.amount, 0));
    const amap = {};
    [...ownAccts].forEach(l4 => { const a = M.accounts.find(x => x.last4 === l4); amap[l4] = a ? a.id : null; });
    const dates = rows.map(r => r.date).sort((a, b) => a - b);
    const outV = rows.filter(r => r.dir === 'debit' && !(classify(r, ownAccts).kind === 'transfer')).reduce((s, r) => s + r.amount, 0);
    const inV = rows.filter(r => r.dir === 'credit').reduce((s, r) => s + r.amount, 0);
    let showAuto = false;
    const s = sheet(`<h2>Statement</h2><p class="sub">${esc(short(dates[0]))} – ${esc(short(dates[dates.length - 1]))}${dates[0].getFullYear() !== new Date().getFullYear() ? ' ' + dates[0].getFullYear() : ''} · ${rows.length} payments</p>
      <div class="stats"><div class="stat"><div class="k">Money out</div><div class="v sm">${inr(outV)}</div></div><div class="stat"><div class="k">Money in</div><div class="v sm">${inr(inV)}</div></div></div>
      ${items.length - fresh.length ? `<p class="hint">${items.length - fresh.length} already in the app, so they're skipped.</p>` : ''}
      <div id="stbody"></div>
      <div class="btns"><button class="btn primary" data-a="saveall" id="stsave"></button></div>`);
    const row = (i, idx) => `<div class="brow ${i.on ? '' : 'off'}"><button class="bck ${i.on ? 'on' : ''}" data-tog="${idx}" aria-label="Include">${ic('check')}</button>
      <span class="bm"><b>${esc(i.payee || 'Unknown')}</b><span>${esc(dlabel(dkey(i.date)))}${i.time ? ' · ' + i.time : ''}${i.type === 'income' ? ' · income' : ''}</span>
      <button class="bcat" data-icp="${idx}">${i.catId ? `${cat(i.catId).icon} ${esc(cat(i.catId).name)}` : 'Pick category'}</button></span>
      <span class="txa ${i.type === 'income' ? 'in' : ''}">${i.type === 'income' ? '+' : '−'}${inr(i.amount, { dec: true })}</span></div>`;
    const paint = () => {
      const autoList = pays.filter(i => i.auto);
      const left = gList.filter(g => g.on && !g.catId).length;
      $('#stbody', s.el).innerHTML = `
        ${ownAccts.size ? `<div class="sect">Accounts in this statement</div><div class="block" style="padding:4px 14px 10px">${[...ownAccts].map(l4 => `<div class="stacc"><span><b>••${l4}</b><small>${(n => `${n} payment${n === 1 ? '' : 's'}`)(rows.filter(r => last4(r.acct) === l4).length)}</small></span><div class="accchips">${M.accounts.map(a => `<button class="catchip ${amap[l4] === a.id ? 'on' : ''}" data-am="${l4}" data-acc-id="${a.id}"><span>${accIcon(a)}</span>${esc(a.name)}</button>`).join('')}<button class="catchip ${amap[l4] ? '' : 'on'}" data-am="${l4}" data-acc-id="">Don't track</button><button class="catchip add" data-newacc="${l4}">+ New</button></div></div>`).join('')}</div>
          <p class="hint" style="margin-top:6px">Old payments don't change today's balances. Only ones after you set a balance do.</p>` : ''}
        ${gList.length ? `<div class="sect"><span>Pick a category · ${left} left</span>${left ? '<button class="linkbtn" data-a="restother">Rest to Other</button>' : ''}</div>
          <div class="block" style="padding:0">${gList.map((g, gi) => `<div class="brow ${g.on ? '' : 'off'}"><button class="bck ${g.on ? 'on' : ''}" data-gtog="${gi}" aria-label="Include">${ic('check')}</button>
            <span class="bm"><b>${esc(g.payee || 'Unknown')}</b><span>${g.items.length > 1 ? `${g.items.length} payments` : esc(dlabel(dkey(g.items[0].date)))}</span>
            <button class="bcat ${g.catId ? '' : 'need'}" data-gcp="${gi}">${g.catId ? `${cat(g.catId).icon} ${esc(cat(g.catId).name)}` : 'Pick category'}</button></span>
            <span class="txa">−${inr(g.items.reduce((a, i) => a + i.amount, 0), { dec: true })}</span></div>`).join('')}</div>` : ''}
        <button class="sttoggle" data-a="auto">${ic(showAuto ? 'chevU' : 'chevD')}<span>Sorted automatically · ${autoList.length}</span></button>
        ${showAuto ? `<div class="block" style="padding:0">${autoList.map(i => row(i, items.indexOf(i))).join('')}</div>` : ''}
        ${transfers.length ? `<div class="sect">Between your own accounts · not spending</div><div class="block" style="padding:0">${transfers.map(i => `<div class="mini-row"><span>••${i.from} → ••${i.to}<small>${esc(dlabel(dkey(i.date)))}</small></span><b>${inr(i.amount)}</b></div>`).join('')}</div>` : ''}`;
      const n = pays.filter(i => i.auto ? i.on : (groups[norm(i.payee) || i.payee] || {}).on).length;
      const b = $('#stsave', s.el); b.textContent = n ? `Add ${n} payment${n > 1 ? 's' : ''}` : 'Nothing to add'; b.disabled = !n && !transfers.length;
    };
    paint();
    s.el.addEventListener('click', async e => {
      const t = e.target;
      const am = t.closest('[data-am]'); if (am) { amap[am.dataset.am] = am.dataset.accId || null; return paint(); }
      const na = t.closest('[data-newacc]'); if (na) { const l4 = na.dataset.newacc; return accountSheet(null, { last4: l4, name: `Bank ••${l4}` }, a => { amap[l4] = a.id; paint(); }); }
      const tg = t.closest('[data-tog]'); if (tg) { const i = items[+tg.dataset.tog]; i.on = !i.on; return paint(); }
      const gt = t.closest('[data-gtog]'); if (gt) { const g = gList[+gt.dataset.gtog]; g.on = !g.on; return paint(); }
      const gc = t.closest('[data-gcp]'); if (gc) { const g = gList[+gc.dataset.gcp]; return catPicker('expense', g.catId, id => { g.catId = id; g.on = true; paint(); }); }
      const icp = t.closest('[data-icp]'); if (icp) { const i = items[+icp.dataset.icp]; return catPicker(i.type, i.catId, id => { pays.filter(x => x.auto && x.type === i.type && norm(x.payee) === norm(i.payee)).forEach(x => { x.catId = id; x.changed = true; }); paint(); }); }
      const a = t.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'auto') { showAuto = !showAuto; return paint(); }
      if (a.dataset.a === 'restother') { gList.forEach(g => { if (g.on && !g.catId) g.catId = 'other'; }); return paint(); }
      if (a.dataset.a === 'saveall') {
        const missing = gList.filter(g => g.on && !g.catId).length;
        if (missing) { toast(`Pick a category for ${missing} payee${missing > 1 ? 's' : ''}, or tap "Rest to Other"`); return; }
        let added = 0, spent = 0;
        gList.forEach(g => { g.items.forEach(i => { i.catId = g.catId; i.on = g.on; }); if (g.on && g.catId !== 'other') M.rules[norm(g.payee)] = g.catId; });
        pays.forEach(i => { if (i.changed && i.type === 'expense') M.rules[norm(i.payee)] = i.catId; });
        pays.filter(i => i.on).forEach(i => {
          const tx = { id: uid(), type: i.type, amount: i.amount, catId: i.catId, payee: i.payee, note: '', date: dkey(i.date), at: Date.now(), src: 'statement', ref: i.ref || '', utr: i.utr || '', acc: amap[i.from] || null, time: i.time || '' };
          M.txns.push(tx); added++;
          if (i.type === 'expense') { spent += i.amount; autoLinkBill(tx); }
        });
        transfers.forEach(i => { if (amap[i.from] && amap[i.to]) M.transfers.push({ id: uid(), from: amap[i.from], to: amap[i.to], amount: i.amount, date: dkey(i.date), at: Date.now(), ref: i.ref || '' }); });
        save(); s.close();
        insMode = 'month'; insMonth = new Date(dates[dates.length - 1].getFullYear(), dates[dates.length - 1].getMonth(), 1);
        openMoney('insights'); checkAlerts();
        toast(`Added ${added} payments · ${inr(spent)} spent`);
      }
    });
  }
  const b64bytes = b64 => { const bin = atob(String(b64).replace(/^data:[^,]*,/, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

  /* ---------- history: month calendar and year ---------- */
  let insMode = 'cycle', insMonth = null, insYear = null;
  function rangeStats(a, b) {
    const tx = M.txns.filter(t => t.date >= a && t.date <= b);
    const spent = { needs: 0, wants: 0, savings: 0 }; let income = 0; const byDay = {}, byCat = {}, payees = {};
    tx.forEach(t => {
      if (isIncome(t)) { income += t.amount; return; }
      const v = own(t); spent[cat(t.catId).group || 'wants'] += v;
      byDay[t.date] = (byDay[t.date] || 0) + v; byCat[t.catId] = (byCat[t.catId] || 0) + v;
      if (t.payee) { const k = t.payee.trim(); payees[k] = payees[k] || { v: 0, n: 0 }; payees[k].v += v; payees[k].n++; }
    });
    return { tx, spent, total: spent.needs + spent.wants + spent.savings, income, byDay, byCat, payees };
  }
  const kfmt = v => v >= 100000 ? (v / 100000).toFixed(v >= 1e6 ? 0 : 1).replace(/\.0$/, '') + 'L' : v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : String(Math.round(v));
  function breakdownHtml(r) {
    const cats = Object.entries(r.byCat).sort((a, b) => b[1] - a[1]);
    const top = cats.slice(0, 7); const otherV = cats.slice(7).reduce((a, x) => a + x[1], 0);
    const maxC = Math.max(1, ...top.map(x => x[1]), otherV);
    const topP = Object.entries(r.payees).sort((a, b) => b[1].v - a[1].v).slice(0, 5);
    const denom = r.total || 1;
    return `<div class="sect">Needs, wants &amp; savings</div>
      <div class="block" style="padding:14px 16px"><div class="sbar">${GKEYS.filter(g => r.spent[g] > 0).map(g => `<i style="width:${(r.spent[g] / denom * 100).toFixed(2)}%;background:${GROUPS[g].color}"></i>`).join('')}</div>
        <div class="mlegend">${GKEYS.map(g => `<span><i style="background:${GROUPS[g].color}"></i>${GROUPS[g].name} ${inr(r.spent[g])} · ${Math.round(r.spent[g] / denom * 100)}%</span>`).join('')}</div></div>
      <div class="sect">Where it went</div>
      <div class="block" style="padding:6px 0">${top.map(([id, v]) => { const c = cat(id); return `<div class="catrow"><span class="ce">${c.icon}</span><span class="cn">${esc(c.name)}<i style="width:${(v / maxC * 100).toFixed(1)}%;background:${GROUPS[c.group || 'wants'].color}"></i></span><span class="cv">${inr(v)}<small>${Math.round(v / denom * 100)}%</small></span></div>`; }).join('')}
        ${otherV ? `<div class="catrow"><span class="ce">…</span><span class="cn">Everything else<i style="width:${(otherV / maxC * 100).toFixed(1)}%;background:var(--faint)"></i></span><span class="cv">${inr(otherV)}</span></div>` : ''}
        ${top.length ? '' : '<div class="empty" style="padding:16px">No spending in this period.</div>'}</div>
      ${topP.length ? `<div class="sect">Top payees</div><div class="block" style="padding:0">${topP.map(([n, x]) => `<div class="mini-row"><span>${esc(n)}<small>${x.n} payment${x.n > 1 ? 's' : ''}</small></span><b>${inr(x.v)}</b></div>`).join('')}</div>` : ''}`;
  }
  const insSeg = () => `<div class="seg">${[['cycle', 'Cycle'], ['month', 'Month'], ['year', 'Year']].map(([k, n]) => `<button class="${insMode === k ? 'on' : ''}" data-im="${k}">${n}</button>`).join('')}</div>`;
  function monthView() {
    const m0 = insMonth || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const y = m0.getFullYear(), mo = m0.getMonth(), days = dim(y, mo);
    const a = dkey(m0), b = dkey(new Date(y, mo, days));
    const r = rangeStats(a, b);
    const t0 = today0(); const isCur = y === t0.getFullYear() && mo === t0.getMonth();
    const elapsed = isCur ? t0.getDate() : days;
    const vals = Object.values(r.byDay); const max = Math.max(1, ...vals);
    const lead = (new Date(y, mo, 1).getDay() - S.weekStart + 7) % 7;
    const wd = []; for (let i = 0; i < 7; i++) wd.push(WD[(S.weekStart + i) % 7][0]);
    const noSpend = Array.from({ length: elapsed }, (_, i) => dkey(new Date(y, mo, i + 1))).filter(k => !r.byDay[k]).length;
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span></span>');
    for (let d = 1; d <= days; d++) {
      const k = dkey(new Date(y, mo, d)); const v = r.byDay[k] || 0; const fut = new Date(y, mo, d) > t0;
      const op = v ? (0.18 + 0.82 * Math.sqrt(v / max)).toFixed(2) : 0;
      cells.push(`<button class="cd ${fut ? 'fut' : ''} ${k === dkey(t0) ? 'td' : ''} ${op >= 0.5 ? 'dk' : ''}" data-cday="${k}" ${fut ? 'disabled' : ''} aria-label="${d} ${MONTHS[mo]}: ${v ? inr(v) : 'no spending'}"><i style="opacity:${op}"></i><b>${d}</b><em>${v ? kfmt(v) : ''}</em></button>`);
    }
    view.innerHTML = topbarM('Insights') + `<div class="page">${insSeg()}
      <div class="cal-head" style="padding:4px 0 10px"><button data-mm="-1" aria-label="Previous month">${ic('chevL')}</button><span class="m" style="font-size:24px">${MONTHS[mo]} ${y}</span><button data-mm="1" aria-label="Next month" ${isCur ? 'disabled style="opacity:.3"' : ''}>${ic('chevR')}</button></div>
      <div class="stats">
        <div class="stat"><div class="k">Spent</div><div class="v sm">${inr(r.total)}</div><div class="s">${inr(r.total / Math.max(1, elapsed))} a day on average</div></div>
        <div class="stat"><div class="k">Income</div><div class="v sm">${inr(r.income)}</div><div class="s">${r.income ? `${r.income - r.total >= 0 ? 'kept' : 'short by'} ${inr(Math.abs(r.income - r.total))}` : 'no income logged'}</div></div>
      </div>
      <div class="chart-card" style="margin-top:12px"><div class="calm">${wd.map(x => `<span class="wh">${x}</span>`).join('')}${cells.join('')}</div>
        <div class="heat-legend" style="margin-top:8px"><span>${noSpend} no-spend day${noSpend === 1 ? '' : 's'} · tap a day</span><span class="lv">Less <i style="background:var(--accent);opacity:.2"></i><i style="background:var(--accent);opacity:.55"></i><i style="background:var(--accent)"></i> More</span></div></div>
      ${breakdownHtml(r)}
    </div>`;
  }
  function yearView() {
    const y = insYear || new Date().getFullYear();
    const r = rangeStats(`${y}-01-01`, `${y}-12-31`);
    const t0 = today0();
    const months = Array.from({ length: 12 }, (_, i) => { const mr = rangeStats(dkey(new Date(y, i, 1)), dkey(new Date(y, i, dim(y, i)))); return { i, v: mr.total, inc: mr.income, fut: new Date(y, i, 1) > t0 }; });
    const withData = months.filter(m => m.v > 0);
    const max = Math.max(1, ...months.map(m => m.v));
    const hi = withData.slice().sort((a, b) => b.v - a.v)[0], lo = withData.slice().sort((a, b) => a.v - b.v)[0];
    const firstYear = M.txns.reduce((m, t) => Math.min(m, +t.date.slice(0, 4)), t0.getFullYear());
    view.innerHTML = topbarM('Insights') + `<div class="page">${insSeg()}
      <div class="cal-head" style="padding:4px 0 10px"><button data-yy="-1" aria-label="Previous year" ${y <= firstYear ? 'disabled style="opacity:.3"' : ''}>${ic('chevL')}</button><span class="m" style="font-size:24px">${y}</span><button data-yy="1" aria-label="Next year" ${y >= t0.getFullYear() ? 'disabled style="opacity:.3"' : ''}>${ic('chevR')}</button></div>
      <div class="stats">
        <div class="stat"><div class="k">Spent</div><div class="v sm">${inr(r.total)}</div><div class="s">${withData.length ? `${inr(r.total / withData.length)} a month on average` : 'nothing yet'}</div></div>
        <div class="stat"><div class="k">Income</div><div class="v sm">${inr(r.income)}</div><div class="s">${r.income ? `${Math.round((r.income - r.spent.needs - r.spent.wants) / r.income * 100)}% kept after needs & wants` : 'no income logged'}</div></div>
      </div>
      <div class="sect">Each month · tap to open</div>
      <div class="chart-card"><div class="ybars">${months.map(m => `<button class="yb ${m.fut ? 'fut' : ''}" data-mon="${m.i}" ${m.fut ? 'disabled' : ''} aria-label="${MONTHS[m.i]}: ${inr(m.v)}"><em>${m.v ? kfmt(m.v) : ''}</em><span class="col"><i style="height:${(m.v / max * 100).toFixed(1)}%"></i></span><span class="hl">${MONTHS[m.i][0]}</span></button>`).join('')}</div>
        ${hi && withData.length > 1 ? `<p class="hint" style="margin:10px 0 0">Highest: <b>${MONTHS[hi.i]}</b> ${inr(hi.v)} · Lowest: <b>${MONTHS[lo.i]}</b> ${inr(lo.v)}</p>` : ''}</div>
      ${breakdownHtml(r)}
    </div>`;
  }
  function daySheet(k) {
    const list = M.txns.filter(t => t.date === k).sort((a, b) => (a.time || '').localeCompare(b.time || '') || a.at - b.at);
    const out = list.filter(t => !isIncome(t)).reduce((a, t) => a + own(t), 0), inc = list.filter(isIncome).reduce((a, t) => a + t.amount, 0);
    const s = sheet(`<h2>${esc(parseKey(k).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>
      <p class="sub">${out ? `${inr(out)} spent` : 'No spending'}${inc ? ` · ${inr(inc)} received` : ''}</p>
      <div class="block" style="padding:0">${list.map(txRow).join('') || '<div class="empty" style="padding:18px">A no-spend day 🎉</div>'}</div>`);
    s.el.addEventListener('click', e => { const tx = e.target.closest('[data-tx]'); if (tx) { s.close(); setTimeout(() => entrySheet({ id: tx.dataset.tx }), 120); } });
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
    if (t.closest('[data-a="hideamt"]')) { M.hide = !M.hide; save(); refresh(); toast(M.hide ? 'Amounts hidden' : 'Amounts shown'); return; }
    if (t.closest('[data-a="safewhy"]')) {
      const st = stats(); const sp = Math.max(0, st.safe - st.spentToday);
      return confirmBox('How "safe to spend" works', M.hide ? 'Show amounts (eye button) to see the numbers.' : `Budget left this period: ${inr(st.left)}\nKept aside for upcoming bills and savings: ${inr(st.reserve || 0)}\nDays left including today: ${st.daysLeft}\n\n(${inr(st.left)} − ${inr(st.reserve || 0)}) ÷ ${st.daysLeft} days = ${inr(st.safe)} per day\nSpent today: ${inr(st.spentToday)} → ${inr(sp)} left today.\n\nThis is a guide from your budget, not your bank balance.`, [{ label: 'Got it', cls: 'primary', value: 1 }]);
    }
    const tx = t.closest('[data-tx]'); if (tx) return entrySheet({ id: tx.dataset.tx });
    const pay = t.closest('[data-pay]'); if (pay) { const bill = M.bills.find(b => b.id === pay.dataset.pay); markPaid(bill, parseKey(pay.dataset.due)); refresh(); const st = stats(); toast(`${bill.name} paid · ${inr(st.left)} left`); return; }
    const bl = t.closest('[data-bill]'); if (bl) return billSheet(M.bills.find(b => b.id === bl.dataset.bill));
    const gotab = t.closest('[data-go]'); if (gotab) { currentTab = 'm-' + gotab.dataset.go; renderTabs(); render(); view.scrollTop = 0; return; }
    const f = t.closest('[data-f]'); if (f && mTab === 'txns') { txFilter = f.dataset.f; return refresh(); }
    const cy = t.closest('[data-cy]'); if (cy) { txCycleOffset = Math.min(0, txCycleOffset + +cy.dataset.cy); return refresh(); }
    const im = t.closest('[data-im]'); if (im) { insMode = im.dataset.im; view.scrollTop = 0; return refresh(); }
    const mm = t.closest('[data-mm]'); if (mm) { const b0 = insMonth || new Date(new Date().getFullYear(), new Date().getMonth(), 1); insMonth = new Date(b0.getFullYear(), b0.getMonth() + +mm.dataset.mm, 1); return refresh(); }
    const yy = t.closest('[data-yy]'); if (yy) { insYear = (insYear || new Date().getFullYear()) + +yy.dataset.yy; return refresh(); }
    const mon = t.closest('[data-mon]'); if (mon) { insMonth = new Date(insYear || new Date().getFullYear(), +mon.dataset.mon, 1); insMode = 'month'; view.scrollTop = 0; return refresh(); }
    const cday = t.closest('[data-cday]'); if (cday) return daySheet(cday.dataset.cday);
    const icy = t.closest('[data-icy]'); if (icy) { insCycleOffset = Math.min(0, insCycleOffset + +icy.dataset.icy); return refresh(); }
    const sp = t.closest('[data-sp]'); if (sp && mTab === 'budget') { const [a, b, c] = sp.dataset.sp.split(',').map(Number); M.split = { needs: a, wants: b, savings: c }; save(); return refresh(); }
    const acct = t.closest('[data-acct]'); if (acct) return accountSheet(accOf(acct.dataset.acct));
    const gl = t.closest('[data-goal]'); if (gl) return goalSheet(M.goals.find(g => g.id === gl.dataset.goal));
    const ga = t.closest('[data-gadd]'); if (ga) { const g = M.goals.find(x => x.id === ga.dataset.gadd); return entrySheet({ catId: M.cats.some(c => c.id === 'save') ? 'save' : (M.cats.find(c => c.group === 'savings') || {}).id, goal: g.id, payee: g.name }); }
    const lim = t.closest('[data-lim]'); if (lim) return limitSheet(lim.dataset.lim);
    const ec = t.closest('[data-ecat]'); if (ec) return catSheet(M.cats.find(c => c.id === ec.dataset.ecat));
    const ac = t.closest('[data-acat]'); if (ac) return catSheet(null, ac.dataset.acat);
    const b = t.closest('[data-a]'); if (!b) return;
    switch (b.dataset.a) {
      case 'add': return M.setup ? entrySheet({}) : setupView();
      case 'scan': return M.setup ? pickScreenshots() : setupView();
      case 'pdf': return M.setup ? pickScreenshots(true) : setupView();
      case 'cbud': { const st = stats(); return amountSheet("This cycle's budget", st.budget, v => { M.budgets[dkey(st.s)] = v; save(); refresh(); }, `${short(st.s)} – ${short(st.e)} only`); }
      case 'dbud': return amountSheet('Monthly budget', M.budget, v => { M.budget = v; save(); refresh(); }, 'Used for each new cycle');
      case 'day': return dayPicker();
      case 'custom': return customSplit();
      case 'addbill': return billSheet(null);
      case 'lock': return toggleLock();
      case 'csv': return exportCsv();
      case 'backup': return exportBackup();
      case 'rules': return rulesSheet();
      case 'addacc': return accountSheet(null);
      case 'transfer': return transferSheet();
      case 'addgoal': return goalSheet(null);
      case 'friends': return friendsSheet();
      case 'report': return reportSheet(mTab === 'insights' ? insCycleOffset : -1);
      case 'alerts': M.alertsOn = M.alertsOn === false; save(); return refresh();
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
    set data(v) { const keep = { lockOn: M.lockOn, pin: M.pin, enc: M.enc }; M = Object.assign(fresh(), v || {}, keep); sealed = false; save(); },
    // Backups and restores need the real data, so they ask to unlock first.
    async ensureOpen() { if (!M.lockOn && !sealed) return true; return unlock(); },
    isSealed: () => sealed,
    rescheduleBills: () => scheduleBillReminders(),
    renderTab, handleClick, openMoney, onHide, onShow, todayChip, boot, refresh, parseReceipt, parseHistory, stats, inr, widgetData, own, dayOnPace, weekSpend,
    isLocked: () => M.lockOn && !unlocked, lockOn: () => M.lockOn,
    async quickAdd() { if (!(await openMoney())) return; return M.setup ? entrySheet({}) : setupView(); },
    searchTx(q) { if (M.lockOn && !unlocked) return null; const k = q.toLowerCase(); return M.txns.filter(t => ((t.payee || '') + ' ' + cat(t.catId).name + ' ' + (t.note || '')).toLowerCase().includes(k)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map(t => ({ id: t.id, title: t.payee || cat(t.catId).name, sub: `${dlabel(t.date)} · ${cat(t.catId).name}`, amt: (isIncome(t) ? '+' : '−') + inr(own(t), { dec: true }) })); },
    editTx(id) { return entrySheet({ id }); },
    // For the Life side and the morning briefing: unpaid bills due within `days` (overdue first). Null while Money is locked.
    billsDue(days = 7) {
      if (M.lockOn && !unlocked) return null;
      const lim = addDays(today0(), days);
      return M.bills.map(b => ({ b, nd: nextDue(b) })).filter(x => x.nd && x.nd.due <= lim).sort((x, y) => x.nd.due - y.nd.due)
        .map(({ b, nd }) => ({ id: b.id, name: b.name, amount: b.amount, due: nd.due, overdue: nd.overdue }));
    },
    payBill(id, dueKey) { const b = M.bills.find(x => x.id === id); if (!b) return null; markPaid(b, parseKey(dueKey)); const st = stats(); return { name: b.name, left: st.left }; },
    async quickAddPre(pre) { if (!(await openMoney())) return; return M.setup ? entrySheet(pre || {}) : setupView(); },
    _cycleStart: cycleStart, _cycleEnd: cycleEnd, _guess: guessCat, _handleOcr: handleOcr,
  };
})();
