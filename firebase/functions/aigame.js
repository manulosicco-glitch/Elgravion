// ELGRAVION — verifica di una partita contro il computer.
// Il dispositivo manda seme, mazzi e mosse; il server rigioca tutto e ricalcola ogni mossa del computer:
// se coincide e la partita finisce davvero così, il premio è meritato.
'use strict';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const asList = x => x == null ? null : (Array.isArray(x) ? x : Object.keys(x).sort((a, b) => a - b).map(k => x[k]));
function verifyAi(E, AI_DECKS, rec, ownedOk){
  if (!rec || typeof rec !== 'object') return { ok: false, why: 'dati mancanti' };
  const classes = asList(rec.classes) || [];
  const decks = (asList(rec.decks) || [null, null]).map(d => d ? asList(d).map(asList) : null);
  const log = asList(rec.log) || [];
  if (classes.length !== 2 || classes[0] === classes[1]) return { ok: false, why: 'classi non valide' };
  if (log.length > 5000) return { ok: false, why: 'partita troppo lunga' };
  if (decks[0] && !E.deckCheck(classes[0], decks[0]).ok) return { ok: false, why: 'mazzo non valido' };
  if (!ownedOk(classes[0], decks[0])) return { ok: false, why: 'mazzo con carte non possedute' };
  if (decks[1] && !(AI_DECKS[classes[1]] && same(AI_DECKS[classes[1]].d, decks[1]))) return { ok: false, why: 'mazzo del computer non valido' };
  const hard = rec.diff === 'h';
  let G; try { G = E.newGame({ seed: rec.seed >>> 0, classes, names: ['Tu', 'Computer'], decks }); } catch (e) { return { ok: false, why: 'avvio' }; }
  let lastErr = false;
  for (const row of log) {
    const x = asList(row) || []; const pi = x[0] === 1 ? 1 : 0, a = x[1], forced = !!x[2];
    if (G.over) break;
    if (!a || typeof a !== 'object') return { ok: false, why: 'registro corrotto' };
    if (pi === 1) {
      if (forced) { if (!lastErr || a.type !== 'end') return { ok: false, why: 'mossa del computer alterata' }; E.act(G, 1, { type: 'end' }); lastErr = false; continue; }
      let exp; try { exp = hard ? E.aiHard(G, 1) : E.ai(G, 1); } catch (e) { exp = null; }
      if (!exp || !same(exp, a)) return { ok: false, why: 'mossa del computer alterata' };
      lastErr = !!E.act(G, 1, a) && a.type !== 'end';
    } else {
      lastErr = false;
      const err = E.act(G, 0, a); if (err) return { ok: false, why: 'mossa non valida' };
    }
  }
  if (!G.over) return { ok: false, why: 'partita non conclusa' };
  return { ok: true, win: G.winner === 0, turns: G.turn };
}
module.exports = { verifyAi };
