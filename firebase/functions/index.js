// ELGRAVION — funzioni sul server (Firebase).
// 1) arbitro: rigioca le partite online, decide chi ha vinto, aggiorna ranghi e premi.
// 2) economia: collezione, GRA e pacchetti stanno sul server e cambiano solo da qui.
'use strict';
const { onValueWritten } = require('firebase-functions/v2/database');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const crypto = require('crypto');
const vm = require('vm');
const { arbitrate } = require('./arbiter.js');
const { verifyAi } = require('./aigame.js');
const R = require('./rank.js');
const BOT_RANKED_DAY = 40; // Classificate contro gli Sfidanti che contano per il rango, al giorno
const ECON = require('./economy.js');
const SHOP = require('./shop.js');

// Regole e carte: il server le legge dal gioco pubblicato, così carte nuove, modifiche e ampliamenti
// valgono subito anche qui senza ripubblicare le funzioni. Se il sito non risponde usa la copia interna.
const SITE = 'https://manulosicco-glitch.github.io/Elgravion/';
const BUNDLED = (() => { const E = require('./game/engine.js'); const D = require('./game/data.js'); return { E, CARDS: D.CARDS, AI_DECKS: D.AI_DECKS, ver: 'interna' }; })();
let GAME = null, GAME_T = 0, OLD = []; // OLD: versioni precedenti, per le partite iniziate prima di un aggiornamento
function loadFrom(dataSrc, engineSrc){
  const ctx = vm.createContext({ console, Math, JSON, Object, Array, String, Number, Boolean, Set, Map, Date: Date });
  ctx.module = { exports: {} }; vm.runInContext(dataSrc, ctx, { filename: 'data.js', timeout: 5000 }); const D = ctx.module.exports;
  ctx.module = { exports: {} }; ctx.require = () => D; vm.runInContext(engineSrc, ctx, { filename: 'engine.js', timeout: 5000 }); const E = ctx.module.exports;
  if (!D.CARDS || !E.newGame || !E.act) throw new Error('gioco incompleto');
  return { E, CARDS: D.CARDS, AI_DECKS: D.AI_DECKS || {} };
}
async function game(){
  if (GAME && Date.now() - GAME_T < 10 * 60 * 1000) return GAME;
  try {
    const get = async f => { const r = await fetch(SITE + f + '?t=' + Date.now(), { signal: AbortSignal.timeout(8000) }); if (!r.ok) throw new Error(f + ' ' + r.status); return r.text(); };
    const [d, e] = await Promise.all([get('data.js'), get('engine.js')]);
    const ver = crypto.createHash('sha1').update(d + e).digest('hex').slice(0, 10);
    if (!GAME || GAME.ver !== ver) { if (GAME) OLD = [GAME, ...OLD].slice(0, 3); GAME = Object.assign(loadFrom(d, e), { ver }); logger.info('regole del gioco aggiornate', ver, Object.keys(GAME.CARDS).length + ' carte'); }
  } catch (err) { logger.warn('uso la copia interna delle regole', err.message); if (!GAME) GAME = BUNDLED; }
  GAME.X = GAME.X || ECON.make(GAME.E, GAME.CARDS); GAME_T = Date.now();
  return GAME;
}

initializeApp();
const REGION = 'europe-west1', INSTANCE = 'elgravion-default-rtdb';
const db = () => getDatabase();
const rnd = () => crypto.randomBytes(4).readUInt32BE(0) / 4294967296;
const today = () => new Date().toISOString().slice(0, 10);

// modifica atomica del profilo; fn(p) restituisce il risultato o lancia un errore per il giocatore
async function withProfile(uid, fn, opt){
  opt = opt || {}; let out, err = null; const X = (await game()).X;
  const tx = await db().ref('profiles/' + uid).transaction(cur => {
    if (cur == null && !opt.create) { err = 'Profilo non trovato: accedi di nuovo.'; return; }
    const p = X.norm(cur); err = null;
    try { out = fn(p); } catch (e) { if (e && e.user) { err = e.message; return; } throw e; }
    return p;
  });
  if (err) throw new HttpsError('failed-precondition', err);
  if (!tx.committed) throw new HttpsError('aborted', 'Riprova.');
  return { profile: tx.snapshot.val(), res: out };
}
function ownsDeck(Gm, p, cls, deck){ const d = deck || Gm.E.DECKS[cls]; return !!p && Gm.X.deckOwned(Gm.X.norm(p), d); }

// cambio di stagione: premio in base al rango raggiunto, poi il rango scende (una volta sola)
async function seasonRoll(uid){
  const now = R.seasonKey(); let old = null;
  const tx = await db().ref('ranks/' + uid).transaction(cur => {
    if (!cur || !cur.season || cur.season === now) { old = null; return; }
    old = cur; return Object.assign(R.normalize(cur), { updated: Date.now() });
  });
  if (!tx.committed || !old) return null;
  let place = null;
  if ((old.tier | 0) === R.CREMISI) {
    const s = await db().ref('ranks').orderByChild('rating').limitToLast(1000).once('value'); const rows = [];
    s.forEach(c => { const v = c.val() || {}; if (v.season === old.season && v.tier === R.CREMISI) rows.push([c.key, v.rating || 0]); });
    rows.sort((a, b) => b[1] - a[1]); const i = rows.findIndex(r => r[0] === uid); place = i >= 0 ? i + 1 : null;
  }
  const X = (await game()).X;
  const end = { season: old.season, tier: old.tier | 0, lvl: old.lvl || 3, rating: old.rating || 1000, value: R.rankValue(R.normalize(Object.assign({}, old, { season: now }))), place };
  const got = await db().ref('profiles/' + uid).once('value');
  if (!got.exists()) return { end, rw: null, gained: [] };
  const { res } = await withProfile(uid, p => X.seasonReward(p, end.tier, place));
  return { end, rw: res.rw, gained: res.gained };
}

// ---------- economia ----------
exports.economia = onCall({ region: REGION, memory: '512MiB', timeoutSeconds: 60 }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Accedi con Google.');
  const uid = req.auth.uid, d = req.data || {}, op = d.op; const Gm = await game(), X = Gm.X;
  switch (op) {
    case 'sync': {
      const snap = await db().ref('profiles/' + uid).once('value');
      if (!snap.exists()) {
        const local = d.local && d.local.start ? d.local : null;
        await withProfile(uid, p => { if (local) X.importLocal(p, local); p.created = Date.now(); return {}; }, { create: true });
      }
      const season = await seasonRoll(uid);
      const p = (await db().ref('profiles/' + uid).once('value')).val();
      return { profile: p, season };
    }
    case 'starter': { const r = await withProfile(uid, p => X.starter(p, String(d.cls || ''), rnd)); return r; }
    case 'buyPack': return withProfile(uid, p => X.buyPack(p));
    case 'openPack': return withProfile(uid, p => X.openPack(p, rnd));
    case 'craft': return withProfile(uid, p => X.craft(p, String(d.n || ''), d.cur === 'adam' ? 'adam' : 'gra'));
    case 'openClassPack': return withProfile(uid, p => X.openClassPack(p, String(d.cls || ''), rnd, SHOP.CLASS_PACK));
    case 'sell': return withProfile(uid, p => X.sell(p, String(d.n || '')));
    case 'claimAi': {
      const rec = d.rec; const raw = JSON.stringify(rec || null);
      if (raw.length > 400000) throw new HttpsError('invalid-argument', 'Partita troppo grande.');
      const id = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
      const claim = db().ref('claims/' + uid + '/' + id);
      if ((await claim.once('value')).exists()) throw new HttpsError('already-exists', 'Premio già ricevuto.');
      const prof = (await db().ref('profiles/' + uid).once('value')).val();
      let v = null;
      for (const g of [Gm, ...OLD, BUNDLED]) { g.X = g.X || ECON.make(g.E, g.CARDS); const r = verifyAi(g.E, g.AI_DECKS, rec, (cls, deck) => ownsDeck(g, prof, cls, deck)); if (!v || r.ok) v = r; if (r.ok) break; }
      if (!v.ok) { logger.warn('claimAi rifiutata', uid, v.why); throw new HttpsError('failed-precondition', 'Partita non verificata: ' + v.why + '.'); }
      const lock = await claim.transaction(cur => cur ? undefined : { t: Date.now(), win: v.win });
      if (!lock.committed) throw new HttpsError('already-exists', 'Premio già ricevuto.');
      const out = await withProfile(uid, p => X.reward(p, v.win, today()));
      // Classificata contro uno Sfidante (computer Difficile o Esperto): il rango cambia come contro un avversario del tuo stesso rango.
      if (d.ranked === true && (v.lv === 'h' || v.lv === 'x')) {
        const day = today(), cnt = await db().ref('botRanked/' + uid + '/' + day).transaction(c => (c || 0) >= BOT_RANKED_DAY ? undefined : (c || 0) + 1);
        if (cnt.committed) {
          const now = new Date(); const ref = db().ref('ranks/' + uid);
          const r0 = R.normalize((await ref.once('value')).val(), now); const a = R.apply(r0, v.win, r0);
          await ref.set(Object.assign(a.rec, { updated: Date.now() }));
          out.rank = { before: a.before, after: a.after, note: a.note, win: a.win };
        } else out.rank = { void: true, note: 'Limite giornaliero di Classificate contro gli Sfidanti raggiunto: rango invariato.' };
      }
      return out;
    }
    default: throw new HttpsError('invalid-argument', 'Operazione sconosciuta.');
  }
});

// ---------- arbitro delle partite online ----------
exports.arbitro = onValueWritten({ ref: '/ranked/{room}/end/{uid}', region: REGION, instance: INSTANCE, memory: '256MiB', timeoutSeconds: 60 }, async (ev) => {
  const room = ev.params.room;
  const m = /^elg-(rk|am)[a-z0-9]{4,12}$/.exec(room); if (!m) return;
  const ranked = m[1] === 'rk';
  const base = db().ref('ranked/' + room);
  const rk = (await base.once('value')).val() || {};
  if (rk.result) return; // già giudicata

  const rm = (await db().ref('rooms/' + room).once('value')).val() || {};
  const msgs = Object.values(rm.msgs || {});
  const present = new Set(Object.values(rm.peers || {}).map(p => p && p.uid).filter(Boolean));
  const players = rk.players || {};
  // il mazzo deve essere fatto di carte possedute
  const profs = {}; await Promise.all(Object.keys(players).map(async u => { profs[u] = (await db().ref('profiles/' + u).once('value')).val(); }));
  const Gm = await game(), X = Gm.X;
  const deckOk = u => ownsDeck(Gm, profs[u], players[u].cls, players[u].deck);
  const args = { room, players, msgs, ends: rk.end || {}, present, deckOk };
  let out = arbitrate(Gm.E, args);
  // una partita iniziata prima di un aggiornamento delle regole si giudica con le regole di allora
  const clean = o => o.status !== 'done' || /conclusa|resa|abbandono/.test(o.reason);
  if (!clean(out)) for (const g of [...OLD, BUNDLED]) { if (g === Gm) continue; const o = arbitrate(g.E, args); if (clean(o)) { out = o; break; } }
  logger.info('arbitro', room, out);
  if (out.status === 'wait') return;

  const lock = await base.child('result').transaction(cur => cur ? undefined : { status: out.status, t: Date.now() });
  if (!lock.committed) return;

  const result = { status: out.status, why: out.why || out.reason || '', ranked, t: Date.now() };
  if (out.status === 'done') {
    const [w, l] = [out.winner, out.loser]; const d = {};
    if (ranked) {
      await Promise.all([seasonRoll(w), seasonRoll(l)]);
      const now = new Date();
      const [rw, rl] = await Promise.all([w, l].map(u => db().ref('ranks/' + u).once('value').then(s => R.normalize(s.val(), now))));
      const aw = R.apply(rw, true, rl), al = R.apply(rl, false, rw);
      await Promise.all([[w, aw], [l, al]].map(([u, a]) => db().ref('ranks/' + u).set(Object.assign(a.rec, { updated: Date.now() }))));
      d[w] = { before: aw.before, after: aw.after, note: aw.note, win: true }; d[l] = { before: al.before, after: al.after, note: al.note, win: false };
    } else { d[w] = { win: true }; d[l] = { win: false }; }
    // premio in GRA (chi abbandona non lo riceve)
    for (const u of [w, l]) {
      if (u === l && out.reason === 'abbandono') continue;
      if (!profs[u]) continue;
      try { const r = await withProfile(u, p => X.reward(p, u === w, today())); d[u].reward = r.res; } catch (e) { logger.warn('premio non assegnato', u, e.message); }
    }
    Object.assign(result, { winner: w, loser: l, d });
  }
  await base.child('result').set(result);
  await db().ref('rooms/' + room).remove().catch(() => {});
});

// ---------- negozio (PayPal) ----------
// Le chiavi di PayPal stanno nel database in secret/paypal = {clientId, secret, mode:'sandbox'|'live'},
// leggibili solo dal server. Finché mancano, il negozio si mostra ma i pagamenti restano spenti.
async function paypalCfg(){ const s = await db().ref('secret/paypal').once('value'); const c = s.val(); return c && c.clientId && c.secret ? c : null; }
const ppBase = c => c.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
async function ppToken(c){
  const r = await fetch(ppBase(c) + '/v1/oauth2/token', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(c.clientId + ':' + c.secret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials', signal: AbortSignal.timeout(15000) });
  const j = await r.json(); if (!j.access_token) throw new HttpsError('unavailable', 'PayPal non risponde.'); return j.access_token;
}
async function ppCall(c, path, body){
  const t = await ppToken(c);
  const r = await fetch(ppBase(c) + path, { method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  return r.json();
}
exports.negozio = onCall({ region: REGION, memory: '256MiB', timeoutSeconds: 60 }, async (req) => {
  const d = req.data || {}, op = d.op;
  if (op === 'catalogo') { const c = await paypalCfg().catch(() => null); return { active: !!c, clientId: c ? c.clientId : null, mode: c ? (c.mode || 'sandbox') : null, catalog: SHOP.CATALOG, currency: SHOP.CURRENCY_NAME, classPack: SHOP.CLASS_PACK }; }
  if (!req.auth) throw new HttpsError('unauthenticated', 'Accedi con Google.');
  const uid = req.auth.uid; const c = await paypalCfg(); if (!c) throw new HttpsError('failed-precondition', 'I pagamenti non sono ancora attivi.');
  if (op === 'ordine') {
    const o = SHOP.priceOf(d.item); if (!o) throw new HttpsError('invalid-argument', 'Articolo non valido.');
    if (o.kind === 'cosm') { const p = (await db().ref('profiles/' + uid).once('value')).val() || {}; const have = Array.isArray(p.cosm) ? p.cosm : Object.values(p.cosm || {}); if (have.includes(o.id)) throw new HttpsError('already-exists', 'Lo possiedi già.'); }
    const pp = await ppCall(c, '/v2/checkout/orders', { intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: 'EUR', value: o.eur }, description: o.desc.slice(0, 120), custom_id: uid }], application_context: { brand_name: 'Elgravion', shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW' } });
    if (!pp.id) { logger.error('ordine PayPal', pp); throw new HttpsError('unavailable', 'Ordine non creato.'); }
    await db().ref('orders/' + pp.id).set(Object.assign({ uid, status: 'creato', t: Date.now(), mode: c.mode || 'sandbox' }, o));
    return { id: pp.id };
  }
  if (op === 'conferma') {
    const id = String(d.id || ''); const ref = db().ref('orders/' + id); const o = (await ref.once('value')).val();
    if (!o || o.uid !== uid) throw new HttpsError('not-found', 'Ordine sconosciuto.');
    if (o.status === 'consegnato') return { profile: (await db().ref('profiles/' + uid).once('value')).val(), order: o };
    const cap = await ppCall(c, '/v2/checkout/orders/' + encodeURIComponent(id) + '/capture');
    const pu = cap && cap.purchase_units && cap.purchase_units[0]; const cp = pu && pu.payments && pu.payments.captures && pu.payments.captures[0];
    const ok = cap && cap.status === 'COMPLETED' && cp && cp.amount && cp.amount.currency_code === 'EUR' && cp.amount.value === o.eur;
    if (!ok) { await ref.update({ status: 'non pagato', t2: Date.now() }); logger.warn('cattura non riuscita', id, cap && cap.status); throw new HttpsError('failed-precondition', 'Pagamento non completato.'); }
    // consegna una volta sola
    const lock = await ref.child('status').transaction(st => st === 'consegnato' ? undefined : 'consegnato');
    if (!lock.committed) return { profile: (await db().ref('profiles/' + uid).once('value')).val(), order: o };
    await ref.update({ capture: cp.id, t2: Date.now() });
    if (o.kind === 'dono') await db().ref('donations/' + uid + '/' + id).set({ eur: o.eur, t: Date.now() });
    const r = await withProfile(uid, p => { SHOP.grant(p, o); return {}; }, { create: true });
    return { profile: r.profile, order: Object.assign({}, o, { status: 'consegnato' }) };
  }
  throw new HttpsError('invalid-argument', 'Operazione sconosciuta.');
});
