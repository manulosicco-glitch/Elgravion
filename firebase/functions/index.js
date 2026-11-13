// ELGRAVION — funzioni sul server (Firebase). Arbitro della Classificata.
// Quando un giocatore chiude una partita classificata scrive ranked/{stanza}/end/{uid} con il suo seme privato:
// il server rigioca la partita, decide chi ha vinto e aggiorna il rango di entrambi. Nessun dispositivo può farlo da sé.
'use strict';
const { onValueWritten } = require('firebase-functions/v2/database');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const E = require('./game/engine.js');
const { arbitrate } = require('./arbiter.js');
const R = require('./rank.js');

admin.initializeApp();
const REGION = 'europe-west1', INSTANCE = 'elgravion-default-rtdb';

exports.arbitro = onValueWritten({ ref: '/ranked/{room}/end/{uid}', region: REGION, instance: INSTANCE, memory: '256MiB', timeoutSeconds: 60 }, async (ev) => {
  const room = ev.params.room;
  if (!/^elg-rk[a-z0-9]{4,12}$/.test(room)) return;
  const db = admin.database(), base = db.ref('ranked/' + room);
  const snap = await base.once('value'); const rk = snap.val() || {};
  if (rk.result) return; // già giudicata

  const roomSnap = await db.ref('rooms/' + room).once('value'); const rm = roomSnap.val() || {};
  const msgs = Object.values(rm.msgs || {});
  const present = new Set(Object.values(rm.peers || {}).map(p => p && p.uid).filter(Boolean));
  const out = arbitrate(E, { room, players: rk.players || {}, msgs, ends: rk.end || {}, present });
  logger.info('arbitro', room, out);
  if (out.status === 'wait') return;

  // una sola decisione per stanza, anche se arrivano due chiamate insieme
  const lock = await base.child('result').transaction(cur => cur ? undefined : { status: out.status, t: Date.now() });
  if (!lock.committed) return;

  const result = { status: out.status, why: out.why || out.reason || '', t: Date.now() };
  if (out.status === 'done') {
    const now = new Date();
    const [w, l] = [out.winner, out.loser];
    const [rw, rl] = await Promise.all([w, l].map(u => db.ref('ranks/' + u).once('value').then(s => R.normalize(s.val(), now))));
    const aw = R.apply(rw, true, rl), al = R.apply(rl, false, rw);
    const save = (u, a) => db.ref('ranks/' + u).set(Object.assign(a.rec, { updated: Date.now() }));
    await Promise.all([save(w, aw), save(l, al)]);
    Object.assign(result, { winner: w, loser: l, d: { [w]: { before: aw.before, after: aw.after, note: aw.note, win: true }, [l]: { before: al.before, after: al.after, note: al.note, win: false } } });
  }
  await base.child('result').set(result);
  // la stanza non serve più: si libera lo spazio
  await db.ref('rooms/' + room).remove().catch(() => {});
});
