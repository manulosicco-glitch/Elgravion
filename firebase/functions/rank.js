// ELGRAVION — calcolo del rango della Classificata (stesse regole del gioco, eseguite sul server).
'use strict';
const TIERS = [
  { n: 'Bianca', base: 50, step: 25 }, { n: 'Blu', base: 500, step: 50 }, { n: 'Rossa', base: 1300, step: 100 },
  { n: 'Nera', base: 3000, step: 200 }, { n: 'Cremisi', base: 0, step: 0 }
];
const ROMAN = { 3: 'III', 2: 'II', 1: 'I' }, PEND = 5, CREMISI = 4;

function seasonKey(d){ d = d || new Date(); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
function rankNew(season){ return { season: season || seasonKey(), tier: 0, lvl: 3, pend: 0, rating: 1000, wins: 0, losses: 0, streak: 0, best: { tier: 0, lvl: 3 } }; }
function rankName(r){ return 'Taglia ' + TIERS[r.tier].n + (r.tier < CREMISI ? ' ' + ROMAN[r.lvl] : ''); }
function rankValue(r){ if (r.tier === CREMISI) return Math.round(r.rating * 10); const t = TIERS[r.tier]; return t.base + ((3 - r.lvl) * PEND + r.pend) * t.step; }
function rankBetter(a, b){ return a.tier > b.tier || (a.tier === b.tier && a.tier < CREMISI && a.lvl < b.lvl); }

// legge un record dal database e lo porta alla stagione corrente (a inizio stagione si scende di un rango)
function normalize(rec, now){
  const season = seasonKey(now);
  let r = Object.assign(rankNew(season), rec || {});
  r.tier = Math.min(CREMISI, Math.max(0, r.tier | 0)); r.lvl = [1, 2, 3].includes(r.lvl) ? r.lvl : 3;
  r.pend = Math.min(PEND - 1, Math.max(0, r.pend | 0)); r.rating = Number(r.rating) || 1000;
  r.best = r.best && r.best.tier != null ? r.best : { tier: r.tier, lvl: r.lvl };
  if (rec && rec.season && rec.season !== season) {
    const nt = r.tier === CREMISI ? 3 : Math.max(0, r.tier - 1), nl = r.tier === CREMISI ? 1 : 3;
    r = Object.assign(rankNew(season), { tier: nt, lvl: nl, best: { tier: nt, lvl: nl } });
    r.cr = null;
  }
  return r;
}

// applica una vittoria o una sconfitta; opp = rango dell'avversario
function apply(r, win, opp){
  r = JSON.parse(JSON.stringify(r)); const before = { tier: r.tier, lvl: r.lvl, pend: r.pend, rating: r.rating };
  let note = '';
  if (win) { r.wins++; r.streak = Math.max(1, (r.streak || 0) + 1); } else { r.losses++; r.streak = 0; }
  if (r.tier === CREMISI) {
    const or = opp && opp.tier === CREMISI ? (opp.rating || 1000) : 1000 - (CREMISI - (opp ? opp.tier : 3)) * 120;
    const exp = 1 / (1 + Math.pow(10, (or - r.rating) / 400)); const d = Math.round(32 * ((win ? 1 : 0) - exp));
    r.rating = Math.max(800, r.rating + d); note = (d >= 0 ? '+' : '') + d + ' punti';
  } else if (win) {
    r.pend++; note = '+1 pendente';
    if (r.pend >= PEND) { r.pend = 0; if (r.lvl > 1) { r.lvl--; note = 'Promozione: ' + rankName(r); } else { r.tier++; r.lvl = 3; if (r.tier === CREMISI) r.rating = 1000; note = 'Nuovo rango: ' + rankName(r); } }
  } else if (r.tier === 0) { note = 'Nessun pendente perso (Taglia Bianca)';
  } else if (r.pend > 0) { r.pend--; note = '−1 pendente';
  } else if (r.lvl < 3) { r.lvl++; r.pend = PEND - 1; note = 'Retrocessione: ' + rankName(r);
  } else note = 'Nessun pendente perso (inizio del rango)';
  if (rankBetter(r, r.best)) r.best = { tier: r.tier, lvl: r.lvl };
  r.rating = Math.round(r.rating); r.value = rankValue(r);
  r.cr = r.tier === CREMISI ? r.season + ':' + String(r.rating).padStart(5, '0') : null;
  return { rec: r, before, after: { tier: r.tier, lvl: r.lvl, pend: r.pend, rating: r.rating }, note, win };
}

module.exports = { normalize, apply, seasonKey, rankValue, rankName, CREMISI, PEND };
