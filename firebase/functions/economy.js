// ELGRAVION — economia sul server: collezione, GRA, pacchetti. Stesse regole del gioco, ma decise qui.
'use strict';
const CRAFT = { Comune: 50, Rara: 150, Epica: 500, Leggendaria: 1500 };
const SELL = { Comune: 5, Rara: 15, Epica: 50, Leggendaria: 150 };
const PACK = { size: 5, cost: CRAFT.Comune * 3, winAmt: 100, lossAmt: 10, startGra: 100, classBonus: 300, neutralBonus: 150, pity: 15,
  odds: [['Leggendaria', 0.02], ['Epica', 0.08], ['Rara', 0.20], ['Comune', 0.70]],
  last: [['Leggendaria', 0.02], ['Epica', 0.08], ['Rara', 0.90]] };
const RAR_ORD = { Comune: 0, Rara: 1, Epica: 2, Leggendaria: 3 };
const SEASON_REWARDS = [{ gra: 100, packs: 0 }, { gra: 200, packs: 1 }, { gra: 300, packs: 2 }, { gra: 500, packs: 3, cosm: 'dorso-nera' }, { gra: 800, packs: 5, cosm: 'dorso-cremisi' }];
const CLASSES = ['minatore', 'sirena', 'adepto', 'traccia', 'incisore', 'scudiera'];
const DAILY_REWARDS = 30; // partite premiate al giorno (contro il computer + online)
const IMPORT_MAX_COINS = 3000, IMPORT_MAX_PACKS = 10;

function make(E, CARDS){
  const collectible = () => Object.values(CARDS).filter(c => c.r !== 'Gettone');
  const maxOf = n => E.MAX_COPIES[CARDS[n].r] || 0;
  const fresh = () => ({ v: 1, cards: {}, coins: 0, packs: 0, pity: 0, opened: 0, games: 0, wins: 0, start: null, done: {}, cosm: [], day: '', dayN: 0 });
  const norm = p => { p = Object.assign(fresh(), p || {}); p.cards = p.cards || {}; p.done = p.done || {}; p.cosm = Array.isArray(p.cosm) ? p.cosm : Object.values(p.cosm || {}); return p; };
  const fail = m => { const e = new Error(m); e.user = true; throw e; };

  function classComplete(p, cls){ return collectible().filter(c => c.cl === cls).every(c => (p.cards[c.n] || 0) >= maxOf(c.n)); }
  function classBonus(p){
    const got = [];
    for (const k of [...CLASSES, 'neutrali']) if (!p.done[k] && classComplete(p, k)) { p.done[k] = 1; p.coins += k === 'neutrali' ? PACK.neutralBonus : PACK.classBonus; got.push(k); }
    return got;
  }
  function starter(p, cls, rnd){
    if (p.start) fail('Hai già scelto la classe iniziale.');
    if (!CLASSES.includes(cls)) fail('Classe sconosciuta.');
    p.cards = {}; p.start = cls;
    for (const [n, q] of E.DECKS[cls]) p.cards[n] = Math.min(maxOf(n), (p.cards[n] || 0) + q);
    const pick = (f, k) => { const out = []; for (let t = 0; t < k; t++) { const pool = collectible().filter(c => f(c) && !p.cards[c.n]); if (!pool.length) break; const c = pool[Math.floor(rnd() * pool.length)]; p.cards[c.n] = 1; out.push(c); } return out; };
    const gifts = [...pick(c => c.r === 'Comune', 10), ...pick(c => c.t === 'Incanto', 1), ...pick(c => c.t === 'Rituale', 1), ...pick(c => c.t === 'Dominio', 1), ...pick(c => c.r === 'Leggendaria', 1)];
    p.coins = Math.max(p.coins, PACK.startGra); p.done = {}; classBonus(p);
    return gifts.map(c => ({ n: c.n, r: c.r, nuova: true }));
  }
  function rollRar(tab, rnd){ let r = rnd(); for (const [k, x] of tab) { if (r < x) return k; r -= x; } return tab[tab.length - 1][0]; }
  function openPack(p, rnd){
    if (!(p.packs > 0)) fail('Non hai pacchetti da aprire.');
    p.packs--; const res = []; let leg = false;
    for (let i = 0; i < PACK.size; i++) {
      let r = rollRar(i === PACK.size - 1 ? PACK.last : PACK.odds, rnd);
      if (i === PACK.size - 1 && !leg && p.pity >= PACK.pity) r = 'Leggendaria';
      if (r === 'Leggendaria') leg = true;
      const pool = collectible().filter(c => c.r === r); const c = pool[Math.floor(rnd() * pool.length)];
      res.push({ n: c.n, r });
    }
    res.sort((a, b) => RAR_ORD[a.r] - RAR_ORD[b.r]);
    for (const x of res) { const have = p.cards[x.n] || 0, mx = maxOf(x.n);
      if (have < mx) { p.cards[x.n] = have + 1; x.nuova = have === 0; } else { x.extra = SELL[x.r]; p.coins += x.extra; } }
    p.pity = leg ? 0 : p.pity + 1; p.opened++;
    const bonus = classBonus(p);
    return { cards: res, bonus };
  }
  function buyPack(p){ if (p.coins < PACK.cost) fail('GRA insufficienti.'); p.coins -= PACK.cost; p.packs++; return {}; }
  function craft(p, n){ const c = CARDS[n]; if (!c || c.r === 'Gettone') fail('Carta sconosciuta.');
    if ((p.cards[n] || 0) >= maxOf(n)) fail('Hai già il massimo di copie.'); if (p.coins < CRAFT[c.r]) fail('GRA insufficienti.');
    p.coins -= CRAFT[c.r]; p.cards[n] = (p.cards[n] || 0) + 1; return { bonus: classBonus(p) }; }
  function sell(p, n){ const c = CARDS[n]; if (!c || !(p.cards[n] > 0)) fail('Non possiedi questa carta.');
    p.coins += SELL[c.r]; p.cards[n]--; if (!p.cards[n]) delete p.cards[n]; return {}; }
  // premio di fine partita, con un tetto giornaliero
  function reward(p, win, today){
    if (p.day !== today) { p.day = today; p.dayN = 0; }
    p.games++; if (win) p.wins++;
    if (p.dayN >= DAILY_REWARDS) return { got: 0, win, cap: true };
    p.dayN++; const got = win ? PACK.winAmt : PACK.lossAmt; p.coins += got; return { got, win };
  }
  // la collezione di prima (salvata nel browser) entra una volta sola, entro limiti ragionevoli
  function importLocal(p, local){
    const out = fresh(); local = local || {};
    if (local.start && CLASSES.includes(local.start)) out.start = local.start;
    for (const [n, k] of Object.entries(local.cards || {})) { const c = CARDS[n]; if (!c || c.r === 'Gettone') continue; const q = Math.max(0, Math.min(maxOf(n), k | 0)); if (q) out.cards[n] = q; }
    out.coins = Math.max(0, Math.min(IMPORT_MAX_COINS, local.coins | 0));
    out.packs = Math.max(0, Math.min(IMPORT_MAX_PACKS, local.packs | 0));
    out.pity = Math.max(0, Math.min(PACK.pity, local.pity | 0)); out.opened = Math.max(0, local.opened | 0);
    out.games = Math.max(0, local.games | 0); out.wins = Math.max(0, Math.min(out.games, local.wins | 0));
    out.done = {}; for (const k of [...CLASSES, 'neutrali']) if (classComplete(out, k)) out.done[k] = 1; // nessun premio doppio
    if (out.start) for (const [n, q] of E.DECKS[out.start]) out.cards[n] = Math.max(out.cards[n] || 0, Math.min(maxOf(n), q));
    return Object.assign(p, out);
  }
  function seasonReward(p, tier, place){
    const rw = SEASON_REWARDS[tier] || SEASON_REWARDS[0]; p.coins += rw.gra; p.packs += rw.packs; const gained = [];
    if (rw.cosm && !p.cosm.includes(rw.cosm)) { p.cosm.push(rw.cosm); gained.push(rw.cosm); }
    if (tier === 4 && place && place <= 200 && !p.cosm.includes('cornice-cremisi')) { p.cosm.push('cornice-cremisi'); gained.push('cornice-cremisi'); }
    return { rw, gained };
  }
  // un mazzo è usabile solo con carte possedute
  function deckOwned(p, deck){ return !deck || deck.every(([n, k]) => (p.cards[n] || 0) >= k); }
  return { fresh, norm, starter, openPack, buyPack, craft, sell, reward, importLocal, seasonReward, deckOwned, classBonus };
}
module.exports = { make, PACK, CRAFT, SELL, DAILY_REWARDS };
