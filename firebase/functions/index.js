// ELGRAVION — funzioni sul server (Firebase).
// 1) arbitro: rigioca le partite online, decide chi ha vinto, aggiorna ranghi e premi.
// 2) economia: collezione, GRA e pacchetti stanno sul server e cambiano solo da qui.
'use strict';
const { onValueWritten } = require('firebase-functions/v2/database');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const E = require('./game/engine.js');
const { CARDS, AI_DECKS } = require('./game/data.js');
const { arbitrate } = require('./arbiter.js');
const { verifyAi } = require('./aigame.js');
const R = require('./rank.js');
const X = require('./economy.js').make(E, CARDS);

admin.initializeApp();
const REGION = 'europe-west1', INSTANCE = 'elgravion-default-rtdb';
const db = () => admin.database();
const rnd = () => crypto.randomBytes(4).readUInt32BE(0) / 4294967296;
const today = () => new Date().toISOString().slice(0, 10);

// modifica atomica del profilo; fn(p) restituisce il risultato o lancia un errore per il giocatore
async function withProfile(uid, fn, opt){
  opt = opt || {}; let out, err = null;
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
function ownsDeck(p, cls, deck){ const d = deck || E.DECKS[cls]; return !!p && X.deckOwned(X.norm(p), d); }

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
  const end = { season: old.season, tier: old.tier | 0, lvl: old.lvl || 3, rating: old.rating || 1000, value: R.rankValue(R.normalize(Object.assign({}, old, { season: now }))), place };
  const got = await db().ref('profiles/' + uid).once('value');
  if (!got.exists()) return { end, rw: null, gained: [] };
  const { res } = await withProfile(uid, p => X.seasonReward(p, end.tier, place));
  return { end, rw: res.rw, gained: res.gained };
}

// ---------- economia ----------
exports.economia = onCall({ region: REGION, memory: '512MiB', timeoutSeconds: 60 }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Accedi con Google.');
  const uid = req.auth.uid, d = req.data || {}, op = d.op;
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
    case 'craft': return withProfile(uid, p => X.craft(p, String(d.n || '')));
    case 'sell': return withProfile(uid, p => X.sell(p, String(d.n || '')));
    case 'claimAi': {
      const rec = d.rec; const raw = JSON.stringify(rec || null);
      if (raw.length > 400000) throw new HttpsError('invalid-argument', 'Partita troppo grande.');
      const id = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
      const claim = db().ref('claims/' + uid + '/' + id);
      if ((await claim.once('value')).exists()) throw new HttpsError('already-exists', 'Premio già ricevuto.');
      const prof = (await db().ref('profiles/' + uid).once('value')).val();
      const v = verifyAi(E, AI_DECKS, rec, (cls, deck) => ownsDeck(prof, cls, deck));
      if (!v.ok) { logger.warn('claimAi rifiutata', uid, v.why); throw new HttpsError('failed-precondition', 'Partita non verificata: ' + v.why + '.'); }
      const lock = await claim.transaction(cur => cur ? undefined : { t: Date.now(), win: v.win });
      if (!lock.committed) throw new HttpsError('already-exists', 'Premio già ricevuto.');
      return withProfile(uid, p => X.reward(p, v.win, today()));
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
  const deckOk = u => ownsDeck(profs[u], players[u].cls, players[u].deck);
  const out = arbitrate(E, { room, players, msgs, ends: rk.end || {}, present, deckOk });
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
