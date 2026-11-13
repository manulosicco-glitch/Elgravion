// ELGRAVION — catalogo del negozio. I prezzi stanno solo qui, sul server: il dispositivo li mostra ma non li decide.
'use strict';
const CURRENCY_NAME = 'Adamantio';      // valuta per creare carte (nome provvisorio, si cambia qui e nel gioco)
const CLASS_PACK = { size: 5, adam: 50 }; // pacchetto di classe: 5 carte della classe + 50 Adamantio
const CATALOG = {
  dono: { min: 1, max: 200, suggest: [2, 5, 10, 20] },
  cosm: [
    { id: 'dorso-stellato', n: 'Dorso Stellato', k: 'back', eur: 1.49 },
    { id: 'dorso-ossidiana', n: "Dorso d'Ossidiana", k: 'back', eur: 1.49 },
    { id: 'dorso-marea', n: 'Dorso della Marea', k: 'back', eur: 1.49 },
    { id: 'dorso-brace', n: 'Dorso di Brace', k: 'back', eur: 1.99 },
    { id: 'cornice-oro', n: "Cornice d'Oro", k: 'frame', eur: 1.99 },
    { id: 'cornice-argento', n: "Cornice d'Argento", k: 'frame', eur: 1.49 },
    { id: 'cornice-stellata', n: 'Cornice Stellata', k: 'frame', eur: 2.49 },
    { id: 'cornice-brace', n: 'Cornice di Brace', k: 'frame', eur: 2.49 }
  ],
  packs: [
    { id: 'classe-1', n: '1 pacchetto di classe', qty: 1, eur: 1.99 },
    { id: 'classe-3', n: '3 pacchetti di classe', qty: 3, eur: 4.99 },
    { id: 'classe-10', n: '10 pacchetti di classe', qty: 10, eur: 14.99 }
  ]
};
const CLASSES = ['minatore', 'sirena', 'adepto', 'traccia', 'incisore', 'scudiera'];
const eur = x => (Math.round(x * 100) / 100).toFixed(2);

// cosa si sta comprando e a che prezzo (deciso qui)
function priceOf(req){
  const kind = req && req.kind;
  if (kind === 'dono') { const a = Math.round(Number(req.amount) * 100) / 100; if (!(a >= CATALOG.dono.min && a <= CATALOG.dono.max)) return null; return { kind, eur: eur(a), desc: 'Donazione a Elgravion' }; }
  if (kind === 'cosm') { const c = CATALOG.cosm.find(x => x.id === req.id); if (!c) return null; return { kind, id: c.id, eur: eur(c.eur), desc: c.n }; }
  if (kind === 'pack') { const k = CATALOG.packs.find(x => x.id === req.id); if (!k || !CLASSES.includes(req.cls)) return null; return { kind, id: k.id, cls: req.cls, qty: k.qty, eur: eur(k.eur), desc: k.n + ' — ' + req.cls }; }
  return null;
}
// consegna dopo il pagamento (sul profilo)
function grant(p, o){
  if (o.kind === 'cosm') { p.cosm = p.cosm || []; if (!p.cosm.includes(o.id)) p.cosm.push(o.id); }
  if (o.kind === 'pack') { p.cpacks = p.cpacks || {}; p.cpacks[o.cls] = (p.cpacks[o.cls] || 0) + o.qty; }
  if (o.kind === 'dono') { p.donor = (p.donor || 0) + 1; }
  return p;
}
module.exports = { CATALOG, CURRENCY_NAME, CLASS_PACK, CLASSES, priceOf, grant };
