// ELGRAVION — arbitro della Classificata.
// Rigioca la partita dall'inizio con il motore del gioco, usando:
//   - il seme comune (verificato: nessuno dei due può sceglierlo da solo),
//   - le mosse scambiate nella stanza (ogni messaggio porta l'identità di chi l'ha scritto),
//   - i semi privati che ciascun giocatore rivela solo a partita finita.
// Così il risultato non dipende da quello che dice un dispositivo, ma da quello che è successo davvero.
'use strict';
const crypto = require('crypto');

function h32(s){ let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function sha256hex(s){ return crypto.createHash('sha256').update(String(s)).digest('hex'); }
function seedOf(room, hn, gn){ return h32(room + '|' + hn + '|' + gn); }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const asList = x => x == null ? null : (Array.isArray(x) ? x : Object.keys(x).sort((a, b) => a - b).map(k => x[k]));
const asDeck = d => { const l = asList(d); return l ? l.map(r => asList(r)) : null; };

// room: nome della stanza; players: {uid:{cls,deck,hc|gn}}; msgs: [{topic,data,uid,t}]
// ends: {uid:{priv}}; present: Set di uid ancora collegati alla stanza
// Restituisce {status:'done', winner:uid, loser:uid, reason} | {status:'wait', why} | {status:'void', why}
function arbitrate(E, { room, players, msgs, ends, present }){
  players = players || {}; ends = ends || {}; msgs = (msgs || []).slice().sort((a, b) => (a.t || 0) - (b.t || 0));
  present = present || new Set();
  const start = msgs.find(m => m.topic === 'start' && m.data && players[m.uid]);
  if (!start) return { status: 'void', why: 'partita mai iniziata' };
  const host = start.uid, S = start.data;
  const guest = Object.keys(players).find(u => u !== host && players[u].gn != null && players[u].gn === S.gn);
  if (!guest) return { status: 'void', why: 'avversario non registrato' };
  const P = { [host]: players[host], [guest]: players[guest] };
  const seatOf = { [host]: 0, [guest]: 1 }, uidOf = [host, guest];
  const win = (seat, reason) => ({ status: 'done', winner: uidOf[seat], loser: uidOf[1 - seat], reason });

  // 1) seme comune: chi ospita si era impegnato sul suo numero prima di conoscere quello dell'avversario
  if (!P[host].hc || sha256hex(S.hn) !== P[host].hc || (S.seed >>> 0) !== seedOf(room, S.hn, S.gn)) return win(1, 'seme non valido');
  const classes = asList(S.classes) || [];
  if (classes[0] !== P[host].cls || classes[1] !== P[guest].cls) return win(1, 'classi non corrispondenti');

  // 2) mazzi: devono rispettare le regole del gioco
  const decks = [asDeck(P[host].deck), asDeck(P[guest].deck)];
  for (const s of [0, 1]) if (decks[s] && !E.deckCheck(classes[s], decks[s]).ok) return win(1 - s, 'mazzo non valido');

  // 3) registro delle mosse: lo tiene chi ospita, ma le mosse dell'ospite devono comparire anche firmate da lui
  const log = new Map(), reqs = new Map();
  for (const m of msgs) {
    if (m.topic === 'act' && m.uid === host && m.data && Number.isInteger(m.data.i) && !log.has(m.data.i)) log.set(m.data.i, m.data);
    if (m.topic === 'req' && m.uid === guest && m.data && m.data.nonce && !reqs.has(m.data.nonce)) reqs.set(m.data.nonce, m.data.a);
  }
  const privOf = u => (ends[u] && ends[u].priv != null) ? (Number(ends[u].priv) >>> 0) : null;
  const priv = [privOf(host), privOf(guest)];
  let G;
  try { G = E.newGame({ seed: S.seed >>> 0, classes, names: ['A', 'B'], priv, online: true, decks }); }
  catch (e) { return { status: 'void', why: 'avvio non riuscito' }; }
  for (let i = 0; log.has(i); i++) {
    if (G.over) break;
    const d = log.get(i), pi = d.pi === 1 ? 1 : 0, a = d.a;
    if (!a || typeof a !== 'object') return win(1, 'registro corrotto');
    if (pi === 1 && !(d.nonce && reqs.has(d.nonce) && same(reqs.get(d.nonce), a))) return win(1, 'mossa dell\'avversario alterata');
    const known = priv[pi] != null;
    if (known) {
      // ciò che solo il giocatore conosce deve essere vero
      if (a.type === 'play' && a.n != null) { const h = G.players[pi].hand.find(x => x.uid === a.uid); if (h && h.n != null && h.n !== a.n) return win(1 - pi, 'carta dichiarata falsa'); }
      if (a.type === 'end' && a.pay != null) { const exp = E.enrich(G, pi, { type: 'end' }).pay; if ((a.pay | 0) !== exp) return win(1 - pi, 'Pegno dichiarato falso'); }
      const pd = G.pending[0];
      if (a.type === 'choose' && pd && pd.type === 'pegnoCheck' && pd.p === pi && !!a.choice !== !!E.pegnoReady(G, pi)) return win(1 - pi, 'Pegno dichiarato falso');
    }
    let err; try { err = E.act(G, pi, a); } catch (e) { err = 'errore'; }
    if (err) return win(1 - pi, 'mossa non valida');
  }

  if (G.over) {
    const w = G.winner;
    // il vincitore deve aver rivelato il suo seme: così anche le sue mosse sono state controllate
    if (priv[w] == null) return { status: 'wait', why: 'manca il seme del vincitore' };
    return win(w, G.conceded != null ? 'resa' : 'partita conclusa');
  }
  // partita non finita: vince chi è rimasto, se l'altro ha lasciato la stanza
  const here = [host, guest].filter(u => present.has(u));
  if (here.length === 1 && ends[here[0]] && priv[seatOf[here[0]]] != null) return win(seatOf[here[0]], 'abbandono');
  if (here.length === 0) return { status: 'void', why: 'entrambi usciti' };
  return { status: 'wait', why: 'partita in corso' };
}

module.exports = { arbitrate, h32, sha256hex, seedOf };
