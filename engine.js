// ELGRAVION TCG — motore di gioco (regole + effetti delle carte). Gira nel browser e in Node.
(function(root){
const DB = (typeof CARDS!=='undefined') ? CARDS : require('./data.js').CARDS;
const HDB = (typeof HEROES!=='undefined') ? HEROES : require('./data.js').HEROES;

const MAXHAND=11, SLOTS=6, MAXGRA=11, HEROPF=35;
const KWS=['Ordalia','Volo','Momentum','Tempra','Estraneo','Salasso','Predatore','Caccia','Via di fuga'];
const MUT_KW=['Volo','Tempra','Salasso','Predatore','Ordalia','Estraneo','Caccia'];

// ---------- RNG deterministico (serve all'online: stesso seme = stessa partita)
function rnd(g){ g.seed=(g.seed*1664525+1013904223)>>>0; return g.seed/4294967296; }
function pick(g,arr){ return arr.length? arr[Math.floor(rnd(g)*arr.length)] : null; }
function prnd(p){ p.ps=(p.ps*1664525+1013904223)>>>0; return p.ps/4294967296; }
function ppick(p,arr){ return arr.length? arr[Math.floor(prnd(p)*arr.length)] : null; }
function pshuffle(p,a){ if(p.ps==null) return a; for(let i=a.length-1;i>0;i--){const j=Math.floor(prnd(p)*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
function shuffle(g,a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd(g)*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

// ---------- Mazzi
const DECKS={
 minatore:[["Apprendista di Sveltopasso",2],["Portatore di Lanterne",2],["Sondatore delle Vene",2],["Minatore di Valborea",2],["Spaccapietre",2],["Guardia della Stretta del Respiro",2],["Lucidatore di Gemme",1],["Cartografa di Lyr Veil",1],["Cercatore di Meteore",1],["Colosso di Piombo",1],["Frammento Alieno",1],["Crollo della Galleria",1],["Ponte di Sveltopasso",1],["Astrologa della Caduta",1],["Tempesta su Sveltopasso",1],["Custode della Corona di Ghiaccio",1],["Iggyar, Guardiano del Pedaggio",1],["Gran Minatrice di Valborea",1],["Mercenario di Nerveth",1],["Esattore della Camera Rossa",1],["Cacciatore Xeno",1],["Frammento Xeno",1],["Esploratore di Prescix",1],["Assassino dei Defectus Imperi",1],["Archonimbus",1],["Veggente della Corona di Ghiaccio",2],["Incastonatore di Valborea",1],["Larva della Scissione",1]],
 adepto:[["Pashey Errante",2],["Ratto delle Grondaie",2],["Straxiart Inquieto",2],["Nidiata dei Vicoli",2],["Monaco del Silenzio",2],["Corriera Codalunga",1],["Vendetta degli Ungart",2],["Custode Zhyol",1],["Araldo del Re Ratto",1],["Aspirante al Seggio",1],["Meigubra",2],["Spirito della Vendetta",1],["Tisquy",1],["Profeta delle Fogne",1],["Maestro dei Cinque Clan",1],["L'Usurpatore",1],["Raighar Ungart",1],["Il Rat King",1],["Mercenario di Nerveth",1],["Esattore della Camera Rossa",1],["Assassino dei Defectus Imperi",1],["Frammento Xeno",1],["Ospite dell'Altro Cielo",1],["Vagabondo della Nebbia",1],["Novizio dei Cinque Clan",2],["Sciame delle Chiaviche",1],["Gemello Scisso",1]],
 traccia:[["Esploratrice Eley",2],["Cartografo Ambulante",2],["Guida di Nerveth",2],["Vivandiera di Nerveth",2],["Sentinella del Sottosuolo",2],["Mercante d'Armi della Seraspina",1],["Superstite dell'Orologio",1],["Agguato nelle Gallerie",2],["Branco Eley",1],["Capocordata",1],["Lettore di Nebbia",1],["Orologio della Violenza",1],["Spedizione verso il Sud",1],["Ciò che Torna dalla Nebbia",1],["Pando, l'Uomo Panda",1],["Dallvad, l'Uomo Chiave",1],["Stige nebbiosa",1],["Depand",1],["Mercenario di Nerveth",1],["Esattore della Camera Rossa",1],["Cacciatore Xeno",1],["Corsaro di Arolderion",1],["Assassino dei Defectus Imperi",1],["Vagabondo della Nebbia",1],["Esploratore di Prescix",1],["Portamappe Eley",2],["Becchino dell'Orologio",1],["Larva della Scissione",1]],
 incisore:[["Paziente Mutilato",2],["Garzone di Bottega",2],["Costrutto di Pietra Bianca",2],["Carne Coltivata",2],["Apprendista Incisore",2],["Scimmia Frondosa Innestata",1],["Chirurgo del Recupero",1],["Bisturi Runico",2],["Golem dell'Officina",1],["Ospite di Ogmeth",1],["Laboratorista della Giungla",1],["Chimera di Khromara",1],["Colosso Runico",1],["Rinascita in Carne",1],["L'Opera Ultima",1],["Kheth-Amarra, la Madre Silente",1],["Le Figlie di Kheth-Amarra",1],["Tripia",1],["Mercenario di Nerveth",1],["Esattore della Camera Rossa",1],["Cacciatore Xeno",1],["Frammento Xeno",1],["Assassino dei Defectus Imperi",1],["Ospite dell'Altro Cielo",1],["Esploratore di Prescix",1],["Ampolla della Giungla",2],["Chirurga delle Rune",1],["Gemello Scisso",1]],
 scudiera:[["Uovo di Magga",2],["Stalliere Imperiale",2],["Nutrice delle Magghe",2],["Cucciolo di Magga",2],["Legionario di Aurelion",2],["Rito di Legame",2],["Magga dallo Sguardo di Pietra",1],["Funzionario del Vomagg",1],["Magga Giovane Corazzata",1],["Guardia del Lago Vomagg",1],["Vouhdel, la Freccia del Mercato",1],["Decreto Imperiale",1],["Jodathyr, il Bastione Consacrato",1],["Matriarca del Lago",1],["Chromakyon, il Trono delle Cinque Gemme",1],["Hoegh l'Avanguardia",1],["Cavaliere Acrobata",1],["Porto di Casa Uyvergg",1],["Mercenario di Nerveth",1],["Esattore della Camera Rossa",1],["Corsaro di Arolderion",1],["Vagabondo della Nebbia",1],["Assassino dei Defectus Imperi",1],["Archonimbus",1],["Frammento Xeno",1],["Sorvegliante delle Covate",2],["Magga Sentinella",1],["Gemello Scisso",1]],
 sirena:[["Mozzo di CrimsonHolt",2],["Cantore del Vento Favorevole",2],["Marinaio della Baia",2],["Cantrice della Marea",2],["Serpe di Corallo",2],["Fiocinatore della Ciurma",1],["Squalo della Baia",1],["Richiamo delle Onde",2],["Medusa degli Abissi",1],["Primo Ufficiale",1],["Vedova del Porto",1],["Nostromo della Camera Rossa",1],["Baessa",1],["Canto della Marea Rossa",1],["Cathuviss del Mar Placido",1],["Leviatano della Baia della Giustizia",1],["La Voce dell'Amarina",1],["Vuldros, il Vecchio della Foce",1],["Mercenario di Nerveth",1],["Esattore della Camera Rossa",1],["Corsaro di Arolderion",1],["Vagabondo della Nebbia",1],["Assassino dei Defectus Imperi",1],["Ospite dell'Altro Cielo",1],["Frammento Xeno",1],["Tamburino della Marina",2],["Polena di CrimsonHolt",1],["Larva della Scissione",1]]
};

// ---------- Bersagli richiesti dalle carte (per l'interfaccia e l'IA)
// tipi: ally, enemy, any (seguaci), enemyAtk3, enemy2 (due seguaci nemici diversi), piombo (eroe o seguace)
const TARGETS={
 'Frammento Alieno':['ally'], 'Richiamo delle Onde':['enemy','enemy2'], 'Esattore della Camera Rossa':['anyOpt'],
 'Stella di Piombo':['piombo'], 'Stella di Adamantio':['allyStar'], 'Pietra Meteorica':['any'],
 'Leviatano della Baia della Giustizia':['enemyAtk3Opt'], 'Vendetta degli Ungart':['any'], 'Agguato nelle Gallerie':['any','allyOpt'], 'Bisturi Runico':['any'], 'Rito di Legame':['allyDrago'],
 'Cripiosauro':['enemyOpt'], 'Lysara':['enemyOpt'],
 "Veggente della Corona di Ghiaccio":['divinaOpt'], "Incastonatore di Valborea":['divinaOpt'], "Novizio dei Cinque Clan":['divinaOpt'], "Sciame delle Chiaviche":['divinaOpt'], "Portamappe Eley":['divinaOpt'], "Becchino dell'Orologio":['divinaOpt'], "Ampolla della Giungla":['divinaOpt'], "Polena di CrimsonHolt":['divinaOpt'], "Sorvegliante delle Covate":['divinaOpt'], "Magga Sentinella":['divinaOpt'], "Gemello Scisso":['divinaOpt'],
};
const POWER_TARGETS={ sirena:['enemy'] };
const DIVINA=new Set(["Veggente della Corona di Ghiaccio", "Incastonatore di Valborea", "Novizio dei Cinque Clan", "Sciame delle Chiaviche", "Portamappe Eley", "Becchino dell'Orologio", "Ampolla della Giungla", "Polena di CrimsonHolt", "Sorvegliante delle Covate", "Magga Sentinella", "Gemello Scisso"]);
function powerReq(p){ if(p.cls==='sirena') return p.mutated?['enemyOpt']:['enemy']; if(p.cls==='incisore') return p.mutated?['protAny','allyRoom']:['allyRoom']; if(p.cls==='scudiera') return ['ally']; return []; }
const PROT={'Protesi runica minore':{t:'r',a:1,d:1},'Braccio Runico':{t:'r',a:2,d:1},'Innesto di Carne':{t:'b',a:2,d:3}};
const PASHEY=['Pashey','Pashey Errante'], STRAX=['Straxiart','Straxiart Inquieto'];

// ---------- Creazione partita
function newGame(opts){
  const g={seed:(opts.seed>>>0)||((Math.random()*4e9)>>>0), turn:0, cur:0, over:false, winner:null, uid:1, log:[], pending:[], phase:'mulligan', ev:[], online:!!opts.online, endPay:0};
  // Ogni giocatore mescola il proprio mazzo con un seme privato: online l'avversario non lo conosce.
  const priv = opts.priv || [ (rnd(g)*4e9)>>>0, (rnd(g)*4e9)>>>0 ];
  g.players=[0,1].map(i=>{
    const cls=opts.classes[i];
    const p={i, name:opts.names?opts.names[i]:('Giocatore '+(i+1)), cls,
      pf:HEROPF, maxPf:HEROPF, armor:0, mutated:false, powerUsed:false, gra:0, graMax:0, deck:[], hand:[],
      slots:Array.from({length:SLOTS},()=>({emo:false, blockedUntil:-1, unit:null})),
      pegno:null, fatigue:0, burned:0, ownTurns:0, starsDouble:false, discount:0, discountChecked:false,
      graPenalty:0, mulliganDone:false, cantoUntil:-1, ps:(priv[i]==null?null:(priv[i]>>>0)), diedTurn:-1, nsA:0, nsD:0, dead:[], deadInfo:[], esca:null, powerLock:-1, nextFuga:false, innesti:0};
    p.known = p.ps!=null;
    const list=(opts.decks&&opts.decks[i])||DECKS[cls];
    if(p.known){ for(const [n,k] of list) for(let j=0;j<k;j++) p.deck.push(n); }
    else { const size=(opts.deckSizes&&opts.deckSizes[i])||list.reduce((m,[,k])=>m+k,0); for(let j=0;j<size;j++) p.deck.push(null); }
    return p;
  });
  g.units={};
  g.cur = rnd(g)<0.5?0:1; g.first=g.cur;
  for(const p of g.players){ pshuffle(p,p.deck); for(let k=0;k<4;k++) draw(g,p,true); }
  log(g, `Inizia ${g.players[g.cur].name}.`);
  return g;
}
function card(n){ return DB[n]; }
function mkHand(g,n){ return {uid:g.uid++, n, free:false}; }
function log(g,s){ g.log.push(s); if(g.log.length>200) g.log.shift(); }
function opp(g,p){ return g.players[1-p.i]; }

// ---------- Mulligan: solo epiche e leggendarie si possono rimettere
function mulligan(g,pi,uids){
  const p=g.players[pi]; if(p.mulliganDone) return;
  const back=p.hand.filter(h=>uids.includes(h.uid) && (h.n==null || ['Epica','Leggendaria'].includes(card(h.n).r)));
  for(const h of back){ p.hand.splice(p.hand.indexOf(h),1); p.deck.push(h.n); }
  pshuffle(p,p.deck); for(let k=0;k<back.length;k++) draw(g,p,true);
  p.mulliganDone=true;
  if(g.players.every(x=>x.mulliganDone)){ g.phase='play'; startTurn(g); }
}

// ---------- Pesca, mano piena, Nebbia
function draw(g,p,quiet){
  if(!loopOk(g,'Pesca:'+p.name)) return;
  if(!p.deck.length){
    p.fatigue++; log(g,`La Nebbia colpisce ${p.name}: ${p.fatigue} danni.`);
    if(!minionsOf(g,p).some(u=>u.n==="Dallvad, l'Uomo Chiave"&&!u.silenced)) heroDamage(g,p,p.fatigue,'nebbia'); else log(g,'Dallvad protegge dalla Nebbia.');
    for(const u of unitsOf(g,p)) if(u.n==='Vagabondo della Nebbia') mutare(g,u);
    if(p.fatigue>=5 && !p.mutated) mutateHero(g,p);
    return;
  }
  const n=p.deck.shift(); addHand(g,p,n,quiet);
}
function addHand(g,p,n,quiet){
  if(p.hand.length>=MAXHAND){
    p.burned++;
    if(p.burned===1 && !p.pegno){ p.pegno={n,paid:0}; log(g,`${p.name} brucia una carta: va nel Pegno.`); }
    else log(g,`${p.name} ha la mano piena: ${n&&p.known&&g.players.every(x=>x.known)?n:'una carta'} viene bruciata.`);
    return;
  }
  p.hand.push(mkHand(g,n)); if(!quiet) g.ev.push({t:'draw',p:p.i});
}

// ---------- Unità (seguaci e Domini)
function unitsOf(g,p){ const out=[]; for(const s of p.slots) if(s.unit && g.units[s.unit] && !out.includes(g.units[s.unit])) out.push(g.units[s.unit]); return out; }
function allUnits(g){ return Object.values(g.units); }
function minionsOf(g,p){ return unitsOf(g,p).filter(u=>u.kind==='minion'); }
function ownerOf(g,u){ return g.players[u.owner]; }
function hasKw(u,k){ return !!(u.kw[k]||u.akw[k]); }
function isStrofa(u){ return u.kind==='minion' && !u.silenced && /Strofa:/.test(card(u.n).x); }
// Limite: un'unità ha al massimo 20 Attacco e 20 Difesa.
const STAT_MAX=20;
function stat(u){ return {a:Math.min(STAT_MAX,Math.max(0,u.baseA+u.buffA+u.auraA)), d:Math.min(STAT_MAX,u.baseD+u.buffD+u.auraD)}; }
// Limite ai cicli: lo stesso effetto (per carta) si attiva al massimo 20 volte per azione o inizio turno.
const LOOP_MAX=15, STAR_MAX=5, IDLE_MAX=4;
function loopOk(g,key){ g.loops=g.loops||{}; const k=(g.loops[key]||0)+1; g.loops[key]=k;
  if(k>LOOP_MAX){ if(k===LOOP_MAX+1){ const [ev,n]=key.split(':'); log(g,`Ciclo interrotto: ${n?n+' ('+ev+')':ev} si è già attivato ${LOOP_MAX} volte.`); } return false; } return true; }
function hpLeft(u){ return stat(u).d-u.dmg; }
function slotIsEmo(g,u){ const p=ownerOf(g,u); return u.slots.every(i=>p.slots[i].emo); }
function empatia(g,u){ return !u.silenced && (u.empForce || slotIsEmo(g,u)); }

function freeSlots(g,p,forDomain){
  const res=[];
  for(let i=0;i<SLOTS;i++){
    const ok=s=>s && !s.unit && s.blockedUntil<g.turn;
    if(!ok(p.slots[i])) continue;
    if(forDomain){ if(i<SLOTS-1 && ok(p.slots[i+1])) res.push(i); }
    else res.push(i);
  }
  return res;
}
function mkUnit(g,p,n,slot,extra){
  const c=card(n); const dom=c.t==='Dominio';
  const u={uid:g.uid++, n, owner:p.i, kind:dom?'domain':'minion', slots:dom?[slot,slot+1]:[slot],
    baseA:c.a||0, baseD:c.d||0, buffA:0, buffD:0, auraA:0, auraD:0, dmg:0, turnDmg:0,
    kw:{}, akw:{}, tribe:c.tr, sick:true, attacked:false, petri:0, cantAttack:false,
    cacciaUsed:false, inCaccia:false, tempra:0, mutated:false, silenced:false, legato:false,
    stonata:false, pedaggio:false, played:g.turn, tempFrom:null, anime:0};
  const sent=c.x.split(/\.\s*/).map(x=>x.trim());
  for(const k of KWS) if(sent.includes(k)) u.kw[k]=true;
  if(u.kw.Tempra) u.tempra=1;
  u.prot=[]; u.scaglia=0; for(const t of sent){ const m=/^Scaglia (\d+)$/.exec(t); if(m) u.scaglia=+m[1]; } u.scagliaMax=u.scaglia;
  Object.assign(u,extra||{});
  g.units[u.uid]=u; for(const i of u.slots) p.slots[i].unit=u.uid;
  return u;
}
function removeUnit(g,u){ const p=ownerOf(g,u); for(const i of u.slots) if(p.slots[i].unit===u.uid) p.slots[i].unit=null; delete g.units[u.uid]; }

// ---------- Aure (Strofe, Stonata, Vuldros…) ricalcolate sempre
function strofaMult(g,p){ return unitsOf(g,p).some(u=>u.n==="La Voce dell'Amarina"&&!u.silenced)?2:1; }
function recompute(g){
  for(const u of allUnits(g)){ u.auraA=0; u.auraD=0; u.akw={}; }
  for(const p of g.players){
    const m=strofaMult(g,p); const mine=minionsOf(g,p);
    const cb = p.cantoUntil>=g.turn ? 1 : 0; // Canto Cremisi: le tue Strofe danno +1 Attacco in più
    for(const s of mine){
      if(s.silenced) continue;
      if(s.n==='Cantore del Vento Favorevole') for(const o of mine) if(o!==s && o.tribe==='Ciurma') o.auraA+=1*m+cb;
      if(s.n==='Nostromo della Camera Rossa') for(const o of mine) if(o!==s && o.tribe==='Ciurma'){ o.auraA+=1*m+cb; o.auraD+=1*m; }
      if(s.n==='Tamburino della Marina') for(const o of mine) if(o!==s && o.tribe==='Thalari') o.auraA+=1*m+cb;
      if(s.n==='Vuldros, il Vecchio della Foce') for(const o of mine) if(o!==s && o.tribe==='Thalari') o.akw.Salasso=true;
      if(s.stonata) for(const o of [s,...adjacentAllies(g,s,p)]){ o.auraA-=1; o.auraD-=1; }
      if(s.n==='Corriera Codalunga'||s.n==='Il Rat King') for(const o of mine) if(o!==s && o.tribe==='Codalunga') o.auraA+=1;
      if(s.tmpOrd) s.akw.Ordalia=true;
      if(s.n==='Ospite di Ogmeth') for(const o of mine) if(o!==s && isInnestato(o)){ o.auraA+=1; o.auraD+=1; }
      if(s.n==='Legionario di Aurelion' && empatia(g,s)) s.akw.Ordalia=true;
      // Cappellano Noxari: +1/+1 per ogni tribù diversa tra i tuoi seguaci (max +3/+3)
      if(s.n==='Cappellano Noxari'){ const k=Math.min(3,new Set(mine.map(x=>x.tribe).filter(Boolean)).size); for(const o of mine){ o.auraA+=k; o.auraD+=k; } }
      // Coltivatore di grano: il tuo Codalunga più lontano da lui ha +1/+1 (a parità, il più a sinistra)
      if(s.n==='Coltivatore di grano della Doralia'){ let best=null,bd=-1; for(const o of mine) if(o.tribe==='Codalunga'){ const d=Math.abs(o.slots[0]-s.slots[0]); if(d>bd||(d===bd&&o.slots[0]<best.slots[0])){ bd=d; best=o; } } if(best){ best.auraA+=1; best.auraD+=1; } }
    }
    for(const o of mine){ const mul=o.n==="L'Opera Ultima"&&!o.silenced?2:1; for(const pr of (o.prot||[])){ o.auraA+=pr.a*mul; o.auraD+=pr.d*mul; } }
    for(const d of unitsOf(g,p)) if(!d.silenced){
      if(d.n==='Tisquy' && !d.silenced) for(const o of mine) if(o.tribe==='Spirito'){ o.auraA+=1; o.auraD+=1; }
      if(d.n==='Tripia' && empatia(g,d)) for(const o of mine) if(o.tribe==='Costrutto') o.akw.Predatore=true;
      if(d.n==='Porto di Casa Uyvergg' && empatia(g,d)) for(const o of mine) if(o.tribe==='Drago'||o.tribe==='Thalari') o.akw.Salasso=true;
    }
  }
  for(const u of allUnits(g)) if(u.inCaccia){ u.akw.__noOrdalia=true; }
}

// ---------- Danni, cure, morte
// Statistiche per la carta MVP: chi infligge danni e uccisioni (g.src = carta che sta agendo)
function credit(g,victimOwner,n,kill){ const s=g.src; if(!s||!s.n||s.p===victimOwner) return; g.mvp=g.mvp||[{},{}]; const m=g.mvp[s.p]; const e=m[s.n]||(m[s.n]={d:0,k:0}); e.d+=n; if(kill) e.k++; }
function withSrc(g,p,n,fn){ const old=g.src; g.src={p,n}; try{ return fn(); } finally{ g.src=old; } }
function heroDamage(g,p,n,src){
  if(n<=0||g.over) return;
  const ab=Math.min(p.armor,n); p.armor-=ab; n-=ab;
  p.pf-=n; g.ev.push({t:'hdmg',p:p.i,n}); credit(g,p.i,n,false);
  if(p.pf<=0 && p.heroFuga){ p.heroFuga=false; p.pf=1; log(g,`Via di fuga: ${p.name} sfugge alla morte e resta a 1 PF.`); g.ev.push({t:'kw',k:'Via di fuga',hero:p.i}); return; }
  if(p.pf<=0){ p.pf=0; g.over=true; g.winner=1-p.i; log(g,`${p.name} cade. Vince ${opp(g,p).name}!`); return; }
  if(p.pf<=20 && !p.mutated) mutateHero(g,p);
}
function heroHeal(g,p,n){ p.pf=Math.min(p.maxPf||HEROPF,p.pf+n); }
// Alcuni effetti aumentano i PF massimi dell'eroe (e i PF attuali della stessa quantità)
function gainMaxPf(g,p,n){ p.maxPf=(p.maxPf||HEROPF)+n; p.pf+=n; log(g,`${p.name}: PF massimi +${n} (${p.maxPf}).`); }
function mutateHero(g,p){
  if(p.mutated) return; p.mutated=true; log(g,`${p.name} MUTA! Il potere eroe cambia.`); g.ev.push({t:'mutate',p:p.i});
  if(p.cls==='traccia'){ p.heroFuga=true; log(g,`${p.name} ottiene Via di fuga: la prima volta che scenderebbe a 0 PF resta a 1.`); }
}
function damage(g,u,n,src){
  if(n<=0||!g.units[u.uid]) return 0;
  if(u.kind==='domain' && !(src&&src.canHitDomain)) return 0;
  if(u.scaglia>0){ const ab=Math.min(u.scaglia,n); u.scaglia-=ab; n-=ab; if(!n){ g.ev.push({t:'dmg',u:u.uid,n:0}); return 0; } }
  u.dmg+=n; u.turnDmg+=n; g.ev.push({t:'dmg',u:u.uid,n}); credit(g,u.owner,n,u.kind==='minion'&&hpLeft(u)<=0);
  recompute(g);
  if(u.kind==='minion' && hpLeft(u)>0){
    if(u.tempra>0){ u.tempra--; u.dmg=0; u.turnDmg=0; log(g,`${u.n} resiste (Tempra).`); g.ev.push({t:'kw',k:'Tempra',u:u.uid}); }
    if(u.n==='Vuldros, il Vecchio della Foce' && !u.muta && !u.silenced){ u.muta=true; mutare(g,u); }
  }
  return n;
}
function heal(g,u,n){ if(!g.units[u.uid]) return; u.dmg=Math.max(0,u.dmg-n); }
function dono(g,target,n){ if(target.pf!==undefined) heroHeal(g,target,n); else heal(g,target,n); }

function checkDeaths(g){
  let loop=true, guard=0;
  while(loop && guard++<LOOP_MAX){
    loop=false; recompute(g);
    for(const u of allUnits(g)){
      const st=stat(u); const emo=slotIsEmo(g,u) && u.kind==='minion';
      let dead = emo ? (u.turnDmg>=st.d && u.turnDmg>0) || st.d<=0 : u.dmg>=st.d;
      if(u.kind==='domain') dead = u.dmg>=st.d;
      if(dead && u.paura && !u.pauraUsed && !u.silenced && slotIsEmo(g,u) && st.d>0){ u.pauraUsed=true; u.dmg=st.d-1; u.turnDmg=0; log(g,`${u.n} sopravvive (Paura).`); dead=false; }
      if(dead){ withSrc(g,u.owner,u.n,()=>kill(g,u)); loop=true; }
    }
    // Dominio assediato: l'avversario ha 6 seguaci e il proprietario nessuno
    for(const p of g.players){ const o=opp(g,p);
      if(minionsOf(g,o).length>=6 && minionsOf(g,p).length===0) for(const d of unitsOf(g,p)) if(d.kind==='domain'){ log(g,`${d.n} è assediato e cade.`); kill(g,d); loop=true; }
    }
  }
}
function kill(g,u){
  if(!g.units[u.uid]) return;
  const p=ownerOf(g,u), c=card(u.n);
  log(g,`${u.n} ${u.kind==='domain'?'viene distrutto':'muore'}.`);
  g.ev.push({t:'die',u:u.uid,slot:u.slots[0],p:p.i});
  removeUnit(g,u);
  if(u.kind==='domain'){ p.graPenalty++; p.graMax=Math.max(0,p.graMax-1); log(g,`${p.name} perde 1 GRA massimo.`); return; }
  p.diedTurn=g.turn; p.dead.push(u.n); p.deadInfo.push({n:u.n,prot:(u.prot||[]).map(x=>Object.assign({},x))});
  if(!u.silenced && (/Lascito/.test(card(u.n).x)||u.esca||u.eco)) g.ev.push({t:'kw',k:'Lascito',p:p.i,slot:u.slots[0]});
  if(!u.silenced && loopOk(g,'Lascito:'+u.n)) deathFx(g,u,p);
  if(u.esca && !u.silenced) p.riscattoNext=(p.riscattoNext||0)+1;
  for(const x of minionsOf(g,p)) if(!x.silenced){
    if(x.n==='Orologio della Violenza'){ x.clock=(x.clock||0)+1; if(x.clock>=5){ x.clock=0; const s2=summonToken(g,p,'Superstite',5,5); if(s2) log(g,"L'Orologio della Violenza batte: arriva un Superstite."); } }
    if(x.n==='Stige nebbiosa'){ x.buffA+=1; x.buffD+=1; }
  }
  const killer=u.lastHitBy&&g.units[u.lastHitBy];
  if(killer && killer.owner!==u.owner && killer.kind==='minion'){ const kp=g.players[killer.owner];
    for(const d of unitsOf(g,kp)) if(d.n==='Depand' && !d.silenced){ if(g.cur===kp.i) kp.gra+=1; else kp.riscattoNext=(kp.riscattoNext||0)+1; log(g,'Depand: Bottino, Riscatto 1.'); if(empatia(g,d)){ killer.buffA+=1; killer.buffD+=1; killer.kw.Ordalia=true; } } }
  if(hasKw(u,'Via di fuga') && !u.silenced && !u.fugaUsed && loopOk(g,'Via di fuga:'+u.n)) viaDiFuga(g,p,u);
  const isRat = u.tribe==='Codalunga' || card(u.n).tr==='Codalunga';
  if(isRat){
    for(const r of minionsOf(g,p)) if(!r.silenced && r.n==='Ratto delle Grondaie') r.buffA+=1;
    const o=opp(g,p);
    for(const k of minionsOf(g,p)) if(!k.silenced && k.n==='Il Rat King'){ heroDamage(g,o,1); const e=pick(g,minionsOf(g,o).filter(x=>!x.inCaccia)); if(e) damage(g,e,1); }
  }
  for(const t of allUnits(g)) if(t.n==='Tisquy' && t.anime<6){ t.anime++; if(empatia(g,t)) heroHeal(g,ownerOf(g,t),1); }
  // Vedova del Porto: quando un tuo seguace muore, gli altri +1/+1
  for(const v of minionsOf(g,p)) if(v.n==='Vedova del Porto' && !v.silenced){ const m=strofaMult(g,p); for(const o of minionsOf(g,p)) if(o!==v){ o.buffA+=m; o.buffD+=m; } }
  if(u.legato) for(const o of adjacentAllies(g,u,p)) { o.buffA+=1; o.buffD+=1; }
}
function viaDiFuga(g,p,u){
  const free=u.slots.every(i=>p.slots[i] && !p.slots[i].unit); if(!free) return;
  const n=mkUnit(g,p,u.n,u.slots[0],{slots:[...u.slots]}); for(const i of n.slots) p.slots[i].unit=n.uid;
  if(u.baseA!==card(u.n).a) n.baseA=u.baseA; if(u.baseD!==card(u.n).d) n.baseD=u.baseD;
  n.kw['Via di fuga']=false; n.fugaUsed=true; n.esca=u.esca; n.paura=u.paura; n.pauraUsed=u.pauraUsed; n.ambizione=u.ambizione; n.legato=u.legato;
  const hp=minionsOf(g,p).some(x=>x.n==='Capocordata'&&!x.silenced&&x!==n)?3:1; recompute(g); n.dmg=Math.max(0,stat(n).d-hp);
  for(const x of minionsOf(g,p)) if(x.n==="Becchino dell'Orologio"&&!x.silenced&&x!==n){ n.buffA+=1; n.buffD+=1; }
  log(g,`${u.n} torna in gioco (Via di fuga).`); g.ev.push({t:'kw',k:'Via di fuga',u:n.uid});
  for(const x of minionsOf(g,p)) if(x.n==='Lettore di Nebbia'&&!x.silenced) draw(g,p);
  if(false){ const o=opp(g,p); const e=pick(g,minionsOf(g,o).filter(z=>!z.inCaccia)); if(e){ pietrifica(g,e); log(g,`Paura contagiosa: ${e.n} è Pietrificato.`); } }
}
function adjacentAllies(g,u,p){ const out=[]; for(const i of [u.slots[0]-1,u.slots[u.slots.length-1]+1]){ const s=p.slots[i]; if(s&&s.unit&&g.units[s.unit]&&g.units[s.unit].kind==='minion') out.push(g.units[s.unit]); } return out; }

// ---------- Protesi e Innesti (Incisore)
function isInnestato(u){ return u.tribe==='Innestato' || (u.prot&&u.prot.length>0) || u.innestato; }
function capacity(g,u){ if(u.n==="L'Opera Ultima"&&!u.silenced) return 99; return 1+(u.meraviglia&&slotIsEmo(g,u)?1:0); }
function hasRoom(g,u){ return u && u.kind==='minion' && (u.prot||[]).length<capacity(g,u); }
function innesto(g,p,u,name,fromHero){
  if(!hasRoom(g,u)) return false; const pr=Object.assign({n:name},PROT[name]); u.prot.push(pr); u.innestato=true; p.innesti++;
  if(u.n==='Paziente Mutilato' && !u.silenced){ u.buffA+=1; u.buffD+=1; }
  log(g,`Innesto: ${u.n} riceve ${name}.`); recompute(g); return true;
}
function randRoom(g,x){ return hasRoom(g,x) && (!(x.prot||[]).length || capacity(g,x)>1); }
function innestoRandom(g,p,name){ const a=pick(g,minionsOf(g,p).filter(x=>randRoom(g,x))); if(a) innesto(g,p,a,name); return a; }
// ---------- Magghe: crescita
const GROW={'Uovo di Magga':['Cucciolo di Magga',2,2],'Cucciolo di Magga':['Magga Giovane',3,4],'Magga Giovane':['Magga Adulta',5,5]};
function levelUp(g,u){
  const nx=GROW[u.n]; if(!nx||!g.units[u.uid]) return null; if(u.n==='Magga Giovane'&&!u.grown) return null;
  const p=ownerOf(g,u); const sl=u.slots[0]; const keep={scaglia:u.scaglia,buffA:u.buffA,buffD:u.buffD,prot:u.prot,ambizione:u.ambizione,paura:u.paura};
  removeUnit(g,u); const n=mkUnit(g,p,nx[0],sl); n.baseA=nx[1]; n.baseD=nx[2]; n.grown=true; n.sick=u.sick; n.attacked=u.attacked;
  if(nx[0]==='Magga Giovane'){ n.scaglia=0; n.scagliaMax=0; } n.scaglia+=keep.scaglia; n.buffA=keep.buffA; n.buffD=keep.buffD; n.prot=keep.prot||[];
  log(g,`${u.n} cresce: ${nx[0]}!`); onSummon(g,p,n); recompute(g); return n;
}
function dragonFx(g,p,u){ // Guardia del Lago e Porto: i Draghi entrano con Scaglia 1
  if(u.tribe!=='Drago') return;
  if(minionsOf(g,p).some(x=>x!==u&&x.n==='Guardia del Lago Vomagg'&&!x.silenced) && u.scaglia<1){ u.scaglia=1; u.scagliaMax=Math.max(u.scagliaMax,1); }
}

// ---------- Mutare (seguace)
function mutare(g,u){
  if(!g.units[u.uid]) return; g.ev.push({t:'kw',k:'Mutare',u:u.uid}); u.buffA++; u.buffD++; u.tribe='Mutato'; u.mutated=true;
  const opts=MUT_KW.filter(k=>!hasKw(u,k)); const k=pick(g,opts); if(k){ u.kw[k]=true; if(k==='Tempra') u.tempra++; }
  log(g,`${u.n} Muta${k?' e ottiene '+k:''}.`);
}
function esorcizza(g,u){ g.ev.push({t:'kw',k:'Esorcizza',u:u.uid}); u.silenced=true; u.kw={}; u.tempra=0; u.stonata=false; u.legato=false; log(g,`${u.n} viene Esorcizzato.`); }
function pietrifica(g,u){ u.petri=1; g.ev.push({t:'kw',k:'Pietrifica',u:u.uid}); }

// ---------- Scava, Analizza, Stelle (scelte del giocatore = "pending")
function scava(g,p,n,then){
  if(!p.deck.length){ return; }
  const look=p.deck.splice(0,Math.min(n,p.deck.length));
  g.pending.push({type:'scava',p:p.i,cards:look,then});
}
function resolvePending(g,pi,choice){
  const pd=g.pending[0]; if(!pd||pd.p!==pi) return false;
  g.pending.shift(); const p=g.players[pi];
  if(pd.type==='scava'){
    const took = (choice!==null && choice>=0 && choice<pd.cards.length); const take = took ? pd.cards[choice] : null;
    pd.cards.forEach((n,i)=>{ if(i!==choice) p.deck.push(n); });
    if(took){ addHand(g,p,take); log(g,`${p.name} Scava e prende una carta.`); }
    else {
      let k=1;
      for(let j=0;j<k;j++) addHand(g,p,'Stella di Piombo');
      log(g,`${p.name} Scava e aggiunge ${k} Stell${k>1?'e':'a'}.`);
    }
    if(pd.then==='profondo'){
      const stars=p.known?p.hand.filter(h=>h.n&&card(h.n).star).length:Math.max(0,Math.min(p.hand.length,(g.__stars|0))); const o=opp(g,p);
      for(let j=0;j<stars;j++){ const ms=minionsOf(g,o).filter(u=>g.units[u.uid]&&hpLeft(u)>0&&!hasKw(u,'Estraneo')&&!u.inCaccia); const mx=Math.max(...ms.map(hpLeft)); const tg=ms.length?pick(g,ms.filter(u=>hpLeft(u)===mx)):'hero'; if(tg==='hero') heroDamage(g,o,1); else damage(g,tg,1); }
      checkDeaths(g);
    }
  } else if(pd.type==='analizza'){
    const i=(choice===0||choice===1)?choice:0; addHand(g,p,pd.cards[i]);
  } else if(pd.type==='tutor'){
    const idx = p.known ? tutorIdx(p,pd.f,pd.k) : (Array.isArray(choice)?choice.slice(0,pd.k).map(x=>x|0):[]);
    tutorApply(g,p,pd.f,idx);
  } else if(pd.type==='scruta'){
    // choice: indice della carta da mettere in fondo (-1 = lasciale)
    if(choice===0||choice===1){ const n=pd.cards[choice]; const keep=pd.cards[1-choice]; p.deck.unshift(keep); p.deck.push(n); }
    else { p.deck.unshift(...pd.cards); }
  } else if(pd.type==='emo'){
    const s=p.slots[choice]; if(s && !s.emo && !s.revoked){ s.emo=true; log(g,`${p.name} colora uno slot d'Emozione.`); }
  } else if(pd.type==='pegnoCheck'){
    const c=choice||{}; if(c.ready && p.pegno) pegnoResolve(g,p,c.spell?null:c.n,!!c.spell);
  } else if(pd.type==='ritorno'){
    const n=pd.cards[(choice>=0&&choice<pd.cards.length)?choice:0]; const fs=freeSlots(g,p,false);
    if(n&&fs.length){ const u=mkUnit(g,p,n,fs[0]); onSummon(g,p,u);
      if(pd.ctx==='rinascita'){ const inf=[...p.deadInfo].reverse().find(x=>x.n===n); if(inf) u.prot=inf.prot.map(x=>Object.assign({},x)); u.buffA+=2; u.buffD+=2; recompute(g); }
      mutare(g,u); log(g,`${n} ${pd.ctx==='rinascita'?'rinasce in carne':'torna dalla Nebbia'}.`); }
  } else if(pd.type==='decreto'){
    const c=choice||{}; const o=opp(g,p);
    const okS=i=>p.slots[i]&&!p.slots[i].emo, okR=i=>o.slots[i]&&!o.slots[i].emo&&!o.slots[i].revoked;
    if(c.k==='revoca'&&okR(c.slot)){ o.slots[c.slot].revoked=true; log(g,`${p.name} usa la Revoca: uno slot di ${o.name} diventa d'oro.`); }
    else { const i=okS(c.slot)?c.slot:p.slots.findIndex((x,k)=>okS(k)); if(i>=0){ p.slots[i].emo=true; p.slots[i].sigillo=true; log(g,`${p.name} pone un Sigillo su uno slot.`);
      for(const x of minionsOf(g,p)) if(x.n==='Notaio del Sigillo' && !x.silenced){ x.buffA+=1; x.buffD+=2; log(g,'Il Notaio del Sigillo ottiene +1/+2.'); } recompute(g); } }
  } else if(pd.type==='sposta'){
    const u=g.units[pd.uid]; if(u && choice!=null && choice>=0 && p.slots[choice] && !p.slots[choice].unit && p.slots[choice].blockedUntil<g.turn){ p.slots[u.slots[0]].unit=null; u.slots=[choice]; p.slots[choice].unit=u.uid; log(g,`${u.n} si sposta.`); recompute(g); }
  } else if(pd.type==='opz'){
    resolveOpz(g,p,pd,choice===1?1:0);
  } else if(pd.type==='bersaglio'){
    const e=pd.uids.includes(choice)?g.units[choice]:g.units[pd.uids[0]]; if(e) resolveBersaglio(g,p,pd,e);
  }
  checkDeaths(g);
  if(g.ending && !g.pending.length && !g.over) finishEnd(g,g.cur);
  return true;
}
// Cerca nel proprio mazzo: online solo il proprietario conosce il mazzo, quindi sceglie lui (in automatico) quali carte prende.
const TUTOR={rituale:n=>card(n)&&card(n).t==='Rituale', codalunga:n=>card(n)&&card(n).tr==='Codalunga'};
function tutorIdx(p,f,k){ const out=[], d=p.deck.slice(); for(let j=0;j<k;j++){ const i=d.findIndex(TUTOR[f]); if(i<0) break; out.push(i); d.splice(i,1); } return out; }
function tutorApply(g,p,f,idx){ let got=0; for(const i of idx){ if(!(i>=0&&i<p.deck.length)) break; const n=p.deck.splice(i,1)[0]; addHand(g,p,n); got++; }
  if(got&&f==='rituale') log(g,'Il Cappellano lascia un Rituale.'); }
function tutor(g,p,f,k){ if(g.online) g.pending.push({type:'tutor',p:p.i,f,k}); else tutorApply(g,p,f,tutorIdx(p,f,k)); }
function decretoPossible(g,p){ const o=opp(g,p); return p.slots.some(x=>!x.emo) || o.slots.some(x=>!x.emo&&!x.revoked); }
function analizza(g,p){
  if(!p.known){ g.pending.push({type:'analizza',p:p.i,cards:[null,null]}); return; }
  const pool=Object.values(DB).filter(c=>(c.cl===p.cls||c.cl==='neutrali') && c.r!=='Gettone').map(c=>c.n);
  g.pending.push({type:'analizza',p:p.i,cards:[ppick(p,pool),ppick(p,pool)]});
}

// ---------- Costi
const FOCUS_MIN=3;
// Focus: lo sconto di 1 GRA sugli slot d'Emozione si attiva solo dal 3° slot d'Emozione
// Adepto: il Focus si sblocca dal 2° slot e resta così per tutta la partita (anche da Mutato)
function focusMin(p){ return p.cls==='adepto' ? 2 : FOCUS_MIN; }
function focusOn(p){ return p.slots.filter(s=>s.emo).length>=focusMin(p); }
function costOf(g,p,h,slot){
  const c=card(h.n); if(h.free) return 0;
  let k=c.c;
  if(c.star && minionsOf(g,p).some(u=>u.n==='Lucidatore di Gemme'&&!u.silenced)) k--;
  if(c.n==='Vendetta degli Ungart' && p.diedTurn===g.turn) k--;
  if(c.n==='Colosso Runico') k-=p.innesti;
  if(slot!=null && c.t!=='Incanto' && c.t!=='Rituale' && c.cl===p.cls && c.n!=="L'Usurpatore"){
    const sl = c.t==='Dominio'?[slot,slot+1]:[slot];
    if(focusOn(p) && sl.every(i=>p.slots[i]&&p.slots[i].emo)) k--; // Focus
  }
  return Math.max(0,k);
}

// ---------- Bersagli legali
function targetable(g,u,bySpell){ if(!g.units[u.uid]||u.kind!=='minion') return false; if(u.inCaccia) return false; if(bySpell && hasKw(u,'Estraneo')) return false; return true; }
function legalTargets(g,p,kind){
  const o=opp(g,p);
  const mine=minionsOf(g,p).filter(u=>targetable(g,u,true)), theirs=minionsOf(g,o).filter(u=>targetable(g,u,true));
  switch(kind.replace('Opt','')){
    case 'ally': return mine.map(u=>u.uid);
    case 'enemy': case 'enemy2': return theirs.map(u=>u.uid);
    case 'any': return [...mine.filter(u=>u.n!=='Strephey'),...theirs].map(u=>u.uid);
    case 'enemyAtk3': return theirs.filter(u=>stat(u).a<=3).map(u=>u.uid);
    case 'piombo': return ['hero',...mine.filter(u=>(u.stars||0)<STAR_MAX).map(u=>u.uid)];
    case 'allyStar': return mine.filter(u=>(u.stars||0)<STAR_MAX).map(u=>u.uid);
    case 'allyRoom': return mine.filter(u=>hasRoom(g,u)).map(u=>u.uid);
    case 'protAny': return [...mine,...theirs].filter(u=>u.prot&&u.prot.length).map(u=>u.uid);
    case 'allyDrago': return mine.filter(u=>u.tribe==='Drago').map(u=>u.uid);
    case 'divina': return minionsOf(g,o).filter(u=>targetable(g,u,false)).map(u=>u.uid);
  }
  return [];
}

// ---------- Giocare una carta
function canPlay(g,pi,h,slot){
  const p=g.players[pi]; if(g.over||g.phase!=='play'||g.cur!==pi||g.pending.length) return 'non è il momento';
  const c=card(h.n);
  if(c.t==='Seguace'||c.t==='Dominio'){
    if(slot==null) return 'scegli uno slot';
    const owner = c.n==="L'Usurpatore" ? opp(g,p) : p;
    if(!freeSlots(g,owner,c.n==="L'Usurpatore"?false:needsTwo(g,p,c)).includes(slot)) return 'slot non disponibile';
  }
  const ex=playable(g,p,c); if(ex) return ex;
  if(costOf(g,p,h,c.n==="L'Usurpatore"?null:slot)>p.gra) return 'GRA insufficiente';
  return null;
}
function playable(g,p,c){
  if(c.n==='Meigubra'){ const mine=minionsOf(g,p).filter(u=>!u.inCaccia); if(!mine.some(u=>PASHEY.includes(u.n)||STRAX.includes(u.n))) return 'serve un tuo Pashey o Straxiart'; }
  if(c.n==="L'Usurpatore" && !freeSlots(g,opp(g,p),false).length) return 'nessuno slot nemico libero';
  if(c.n==='Decreto Imperiale' && !decretoPossible(g,p)) return 'nessuno slot per un Decreto';
  if(c.n==='Rinascita in Carne' && !(p.dead.some(x=>card(x)&&card(x).t==='Seguace') && freeSlots(g,p,false).length)) return 'nessun seguace da far rinascere';
  return null;
}
function playCard(g,pi,huid,slot,targets,reveal){
  const p=g.players[pi]; const h=p.hand.find(x=>x.uid===huid); if(!h) return 'carta non in mano';
  if(h.n==null){ if(!reveal||!card(reveal)) return 'carta sconosciuta'; h.n=reveal; }
  const err=canPlay(g,pi,h,slot); if(err) return err;
  const c=card(h.n); targets=targets||[];
  const req=TARGETS[c.n]||[];
  for(let k=0;k<req.length;k++){
    const opt=req[k].endsWith('Opt'); const leg=legalTargets(g,p,req[k]);
    if(targets[k]==null){ if(!opt && leg.length) return 'scegli un bersaglio'; if(!opt && !leg.length && (c.t==='Incanto'||c.t==='Rituale')) return 'nessun bersaglio valido'; }
    else if(!leg.includes(targets[k])) return 'bersaglio non valido';
  }
  if(c.n==='Richiamo delle Onde' && targets[0]===targets[1]) return 'scegli due seguaci diversi';
  const cost=costOf(g,p,h,c.n==="L'Usurpatore"?null:slot);
  p.gra-=cost; p.hand.splice(p.hand.indexOf(h),1);
  log(g,`${p.name} gioca ${c.n}.`); g.ev.push({t:'play',p:pi,n:c.n});
  if(c.t==='Seguace'||c.t==='Dominio'){ const u=summonFromCard(g,p,c.n,slot,targets,true);
    if(h.fog && c.t==='Seguace' && u && g.units[u.uid]){ log(g,`${c.n} porta con sé la Nebbia.`); mutare(g,u); } }
  else { spellFx(g,p,c.n,targets); if(c.star) onStar(g,p,targets); }
  checkDeaths(g);
  return null;
}
function needsTwo(g,p,c){ return c.t==='Dominio' || (c.t==='Seguace' && !!p.esca && c.n!=="L'Usurpatore" && freeSlots(g,p,true).length>0); }
function summonFromCard(g,p,n,slot,targets,fromHand){
  const c=card(n);
  if(fromHand && c.t==='Seguace' && p.esca && n!=="L'Usurpatore" && freeSlots(g,p,true).includes(slot)){
    const es=p.esca; p.esca=null; const u=mkUnit(g,p,n,slot,{slots:[slot,slot+1]}); for(const i of u.slots) p.slots[i].unit=u.uid; u.esca=true; if(es.fuga) u.kw['Via di fuga']=true;
    log(g,`Esca: ${n} occupa 2 slot.`); return afterSummon(g,p,u,c,targets,fromHand);
  }
  if(n==="L'Usurpatore"){ // si gioca nel tavolo nemico
    const o=opp(g,p); const u=mkUnit(g,o,n,slot,{ctrl:p.i,noAttack:true});
    const b=summonToken(g,p,'Bersaglio',1,3); if(b) u.bers=b.uid;
    log(g,`L'Usurpatore si infiltra tra le file di ${o.name}.`); recompute(g); return u;
  }
  if(c.t==='Dominio'){ for(const d of unitsOf(g,p)) if(d.kind==='domain'){ kill(g,d); } }
  const u=mkUnit(g,p,n,slot); return afterSummon(g,p,u,c,targets,fromHand);
}
function afterSummon(g,p,u,c,targets,fromHand){
  const n=u.n; onSummon(g,p,u);
  if(fromHand && u.kind==='minion' && p.nextFuga){ p.nextFuga=false; u.kw['Via di fuga']=true; }
  if(fromHand && u.kind==='minion' && u.tribe==='Imperiale' && u.slots.some(i=>p.slots[i]&&p.slots[i].sigillo) && minionsOf(g,p).some(x=>x!==u&&x.n==='Notaio del Sigillo'&&!x.silenced)){ u.buffA+=1; u.buffD+=1; u.kw.Ordalia=true; log(g,`Il Notaio registra ${u.n}: +1/+1 e Ordalia.`); }
  const emoBonus = c.cl===p.cls && slotIsEmo(g,u);
  if(emoBonus && fromHand && u.kind==='minion'){
    if(p.cls==='minatore' && p.deck.length>=2){ g.pending.push({type:'scruta',p:p.i,cards:p.deck.splice(0,2)}); }
    if(p.cls==='sirena') u.legato=true;
    if(p.cls==='adepto') u.ambizione=true;
    if(p.cls==='traccia') u.paura=true;
    if(p.cls==='incisore') u.meraviglia=true;
  }
  recompute(g);
  playFx(g,p,u,targets||[]);
  return u;
}
function summonToken(g,p,n,a,d,extra){
  const fs=freeSlots(g,p,false); if(!fs.length) return null; if(!loopOk(g,'Evocazione:'+n)) return null;
  const u=mkUnit(g,p,n,fs[0],extra); u.baseA=a; u.baseD=d; onSummon(g,p,u); return u;
}
function onSummon(g,p,u){
  if(u.kind==='minion' && u.tribe==='Costrutto' && minionsOf(g,p).some(x=>x!==u&&x.n==='Kheth-Amarra, la Madre Silente'&&!x.silenced) && !u.kw.Tempra){ u.kw.Tempra=true; u.tempra+=1; }
  if(u.kind==='minion') dragonFx(g,p,u);
  onSummon2(g,p,u);
}
function onSummon2(g,p,u){ // Eco dello Spirito: il prossimo Spirito riceve il bonus
  if(u.kind==='minion' && u.tribe==='Spirito' && (p.nsA||p.nsD)){ u.buffA+=p.nsA; u.buffD+=p.nsD; } // Eco dello Spirito: bonus permanente e cumulativo
}
function summonSpirit(g,p,which,eco){
  const n = which==='straxiart'?'Straxiart':'Pashey';
  const u=summonToken(g,p,n,n==='Pashey'?1:2,n==='Pashey'?2:1,eco?{eco:true}:null);
  if(u) log(g,`${p.name} evoca ${n==='Pashey'?'un Pashey':'uno Straxiart'}.`);
  return u;
}

// ---------- Effetti: Imboscata (quando entra)

// ---------- Scissione (solo neutrali): si divide sempre in due metà, arrotondando per eccesso
function scissione(g,p,u){
  const a=Math.ceil((u.baseA||0)/2), d=Math.ceil((u.baseD||0)/2); u.baseA=a; u.baseD=d;
  const s=u.slots[0]; const fs=freeSlots(g,p,false); if(!fs.length){ log(g,`Scissione: ${u.n} non trova spazio per la seconda metà.`); recompute(g); return; }
  const near=fs.find(i=>i===s+1)??fs.find(i=>i===s-1)??fs[0];
  const tw=g.uid; u.twin=tw;
  const v=mkUnit(g,p,u.n,near,{twin:tw}); v.baseA=a; v.baseD=d; onSummon(g,p,v);
  log(g,`Scissione: ${u.n} si divide in due ${a}/${d}.`); g.ev.push({t:'kw',k:'Scissione',u:u.uid}); g.ev.push({t:'kw',k:'Scissione',u:v.uid}); recompute(g);
}
// ---------- Divinazione: scegli un seguace nemico; se all'inizio del tuo prossimo turno è morto, ottieni l'effetto
function divina(g,p,u,tg){
  p.divs=p.divs||[]; p.divs.push({t:tg.uid,n:u.n,src:u.uid,twin:u.twin||null});
  tg.divBy=(tg.divBy||[]).concat([p.i]);
  log(g,`Divinazione: ${u.n} predice la morte di ${tg.n}.`); g.ev.push({t:'kw',k:'Divinazione',u:tg.uid});
}
function resolveDivine(g,p){
  const list=p.divs||[]; p.divs=[];
  for(const d of list){
    const tg=g.units[d.t];
    if(tg){ tg.divBy=(tg.divBy||[]).filter(x=>x!==p.i); log(g,`Divinazione fallita: ${tg.n} è ancora vivo.`); continue; }
    log(g,`Divinazione avverata (${d.n})!`); g.ev.push({t:'divina',p:p.i,n:d.n});
    const src=g.units[d.src];
    switch(d.n){
      case 'Veggente della Corona di Ghiaccio': scava(g,p,2); break;
      case 'Incastonatore di Valborea': addHand(g,p,'Stella di Adamantio'); break;
      case 'Novizio dei Cinque Clan': { const x=summonSpirit(g,p,'straxiart',false); if(x){ x.kw.Momentum=true; } break; }
      case 'Sciame delle Chiaviche': for(const x of minionsOf(g,p)) if(x.tribe==='Codalunga') x.buffA+=1; break;
      case 'Portamappe Eley': draw(g,p); break;
      case "Becchino dell'Orologio": { const a=pick(g,minionsOf(g,p).filter(x=>!hasKw(x,'Via di fuga')&&!x.fugaUsed)); if(a) a.kw['Via di fuga']=true; break; }
      case 'Ampolla della Giungla': innestoRandom(g,p,'Innesto di Carne'); break;
      case 'Polena di CrimsonHolt': for(const x of minionsOf(g,p)) if(x.tribe==='Ciurma'){ x.buffA+=1; x.buffD+=1; } break;
      case 'Sorvegliante delle Covate': { const e=minionsOf(g,p).find(x=>x.n==='Uovo di Magga'); if(e) levelUp(g,e); else addHand(g,p,'Uovo di Magga'); break; }
      case 'Magga Sentinella': if(src){ src.scaglia+=2; src.scagliaMax=(src.scagliaMax||0)+2; } break;
      case 'Gemello Scisso': for(const x of minionsOf(g,p)) if(x.n==='Gemello Scisso' && (x.uid===d.src || (d.twin && x.twin===d.twin))){ x.buffA+=1; x.buffD+=1; } break;
    }
  }
  recompute(g); checkDeaths(g);
}
function playFx(g,p,u,t){
  if(/Imboscata/.test(card(u.n).x)) g.ev.push({t:'kw',k:'Imboscata',u:u.uid});
  const o=opp(g,p);
  if(!u.silenced && /^Scissione\./.test(card(u.n).x)) scissione(g,p,u);
  if(!u.silenced && DIVINA.has(u.n) && t[0] && g.units[t[0]]) divina(g,p,u,g.units[t[0]]);
  switch(u.n){
    case 'Chirurga delle Rune': for(const x of minionsOf(g,p)) if(x!==u && isInnestato(x)) innesto(g,p,x,'Protesi runica minore'); break;
    case "Pando, l'Uomo Panda": for(const x of minionsOf(g,p)) if(x!==u){ x.buffA+=1; x.buffD+=1; } break;
    case "L'Opera Ultima": for(const x of minionsOf(g,p)) if(x!==u && x.prot.length){ u.prot.push(...x.prot); x.prot=[]; } u.innestato=true; break;
    case 'Kheth-Amarra, la Madre Silente': for(const x of minionsOf(g,p)) if(x.tribe==='Costrutto'){ if(!x.kw.Tempra){ x.kw.Tempra=true; x.tempra+=1; } innesto(g,p,x,'Protesi runica minore'); } break;
    case 'Le Figlie di Kheth-Amarra': { const adj=[u.slots[0]+1,u.slots[0]-1].filter(i=>p.slots[i]&&!p.slots[i].unit&&p.slots[i].blockedUntil<g.turn); const sl=adj.length?adj[0]:freeSlots(g,p,false)[0];
      if(sl!=null){ const sa=mkUnit(g,p,'Sareth',sl); onSummon(g,p,sa); if(minionsOf(g,p).some(x=>x.n==='Kheth-Amarra, la Madre Silente')){ sa.buffA+=2; sa.buffD+=2; u.buffA+=2; u.buffD+=2; } } break; }
    case 'Chromakyon, il Trono delle Cinque Gemme': { const k=g.players.reduce((m,pl)=>m+pl.slots.filter(x=>x.emo).length,0); u.buffA+=k; u.buffD+=k; if(k) log(g,`Chromakyon assorbe ${k} slot d'Emozione: +${k}/+${k}.`); break; }
    case 'Guardia del Lago Vomagg': for(const x of minionsOf(g,p)) if(x!==u&&x.tribe==='Drago'&&x.scaglia<1){ x.scaglia=1; x.scagliaMax=Math.max(x.scagliaMax,1); } break;
    case 'Ciò che Torna dalla Nebbia': { const pool=[...new Set(p.dead.filter(x=>card(x)&&card(x).t==='Seguace'))]; if(pool.length&&freeSlots(g,p,false).length) g.pending.push({type:'ritorno',p:p.i,cards:pool.slice(-8)}); break; }
    case 'Raighar Ungart': g.pending.push({type:'opz',p:p.i,ctx:'raighar',src:u.uid,opts:['Muro di Roccia 1/5 con Ordalia','Frana: 2 danni a un seguace nemico e ai suoi vicini']}); break;
    case 'Esattore della Camera Rossa': if(t[0]&&g.units[t[0]]) esorcizza(g,g.units[t[0]]); break;
    case 'Archonimbus': for(const e of minionsOf(g,o)) if(!e.inCaccia) damage(g,e,2); break;
    case 'Coltivatore di grano della Doralia': { const m=summonToken(g,p,'Miraggio di Grano',2,2); if(m) log(g,'Un Miraggio di Grano si alza dalla Doralia.'); break; }
    case 'Cripiosauro': { const e=t[0]&&g.units[t[0]]; if(e){ const adj=[e.slots[0]-1,e.slots[e.slots.length-1]+1].map(i=>o.slots[i]).map(s2=>s2&&s2.unit&&g.units[s2.unit]).filter(x=>x&&x.kind==='minion'&&!x.inCaccia);
        log(g,`Fauci roventi: ${e.n} subisce 4 danni.`); damage(g,e,4); for(const x of adj) damage(g,x,1); } break; }
    case 'Lysara': { const first=t[0]&&g.units[t[0]]; if(!first) break; const hit=[first]; log(g,`Catena di fulmini su ${first.n}.`); damage(g,first,3);
        for(const amt of [2,1]){ const pool=minionsOf(g,o).filter(x=>!x.inCaccia&&!hit.includes(x)&&hpLeft(x)>0); const x=pick(g,pool); if(!x) break; hit.push(x); damage(g,x,amt); }
        break; }
    case 'Custode della Corona di Ghiaccio': for(const e of minionsOf(g,o)) if(!e.inCaccia) pietrifica(g,e); break;
    case 'Gran Minatrice di Valborea': addHand(g,p,'Stella di Adamantio'); p.starsDouble=true; break;
    case 'Leviatano della Baia della Giustizia': {
      const e=t[0]&&g.units[t[0]]; const fs=freeSlots(g,p,false);
      if(e && fs.length){ const from={owner:e.owner,slot:e.slots[0]}; removeUnit(g,e); e.owner=p.i; e.slots=[fs[0]]; e.tempFrom=from; e.sick=false; e.attacked=false; e.cantAttack=false; g.units[e.uid]=e; p.slots[fs[0]].unit=e.uid; log(g,`${p.name} prende il controllo di ${e.n}.`); }
      break; }
  }
}
// ---------- Effetti: Lascito
function deathFx(g,u,p){
  const o=opp(g,p);
  switch(u.n){
    case 'Apprendista di Sveltopasso': scava(g,p,1); break;
    case 'Cappellano Noxari': tutor(g,p,'rituale',1); break;
    case 'Miraggio di Grano': tutor(g,p,'codalunga',2); break;
    case 'Spaccapietre': addHand(g,p,'Stella di Piombo'); addHand(g,p,'Stella di Piombo'); break;
    case 'Cercatore di Meteore': addHand(g,p,'Pietra Meteorica'); break;
    case 'Astrologa della Caduta': for(const e of minionsOf(g,o)) if(!e.inCaccia) damage(g,e,3); break;
    case 'Esploratore di Prescix': { const a=pick(g,minionsOf(g,p)); if(a) mutare(g,a); break; }
    case 'Corsaro di Arolderion': if(g.cur===p.i) p.gra+=1; else p.riscattoNext=(p.riscattoNext||0)+1; break;
    case 'Mozzo di CrimsonHolt': { const a=pick(g,minionsOf(g,p)); if(a) a.buffA+=1; break; }
    case 'Primo Ufficiale': { const a=pick(g,minionsOf(g,p).filter(isStrofa)); if(a){ a.buffA+=2; a.buffD+=2; } break; }
    case 'Pashey Errante': gainMaxPf(g,p,1); break;
    case 'Cartografo Ambulante': p.nextFuga=true; break;
    case 'Garzone di Bottega': innestoRandom(g,p,'Braccio Runico'); break;
    case 'Carne Coltivata': case 'Scimmia Frondosa Innestata': innestoRandom(g,p,'Innesto di Carne'); break;
    case 'Apprendista Incisore': innestoRandom(g,p,'Protesi runica minore'); break;
    case 'Chirurgo del Recupero': { const e=pick(g,minionsOf(g,o).filter(x=>x.prot&&x.prot.length&&!x.inCaccia)); if(e){ const pr=e.prot.pop(); recompute(g); const a=pick(g,minionsOf(g,p).filter(x=>randRoom(g,x))); if(a) innesto(g,p,a,pr.n); } break; }
    case 'Funzionario del Vomagg': addHand(g,p,'Uovo di Magga'); break;
    case 'Nutrice delle Magghe': { const a=pick(g,minionsOf(g,p).filter(x=>GROW[x.n]&&(x.n!=='Magga Giovane'||x.grown))); if(a) levelUp(g,a); break; }
    case 'Jodathyr, il Bastione Consacrato': { const e=pick(g,minionsOf(g,o).filter(x=>!x.inCaccia&&!x.silenced)); if(e) esorcizza(g,e); break; }
    case 'Guida di Nerveth': { const a=pick(g,minionsOf(g,p).filter(x=>!hasKw(x,'Via di fuga'))); if(a) a.kw['Via di fuga']=true; break; }
    case 'Nidiata dei Vicoli': for(let k=0;k<2;k++) summonToken(g,p,'Codalunga',2,1); break;
    case 'Araldo del Re Ratto': for(let k=0;k<4;k++) summonToken(g,p,'Codalunga',1,1); break;
    case 'Pashey': if(u.eco){ p.nsD+=1; log(g,`Eco dello Spirito: i tuoi Spiriti futuri ottengono +${p.nsA}/+${p.nsD}.`); } break;
    case 'Straxiart': if(u.eco){ p.nsA+=1; log(g,`Eco dello Spirito: i tuoi Spiriti futuri ottengono +${p.nsA}/+${p.nsD}.`); } break;
    case 'Muro di Roccia': { const r=g.units[u.raighar]; if(r){ r.buffA+=1; r.kw.Ordalia=true; log(g,'Raighar ottiene +1 Attacco e Ordalia.'); } break; }
    case "L'Usurpatore": { // p è il padrone del tavolo dove si trova
      const adj=adjacentAllies(g,u,p).filter(x=>!x.inCaccia); const v=pick(g,adj); if(v){ damage(g,v,4); log(g,`L'Usurpatore colpisce ${v.n} (4 danni).`); }
      const b=g.units[u.bers]; if(b){ b.buffA+=1; b.buffD+=1; } break; }
  }
}
// ---------- Effetti: Incanti e Rituali
function spellFx(g,p,n,t){
  const o=opp(g,p); const T=i=>t[i]&&g.units[t[i]];
  const mult=p.starsDouble?2:1;
  switch(n){
    case 'Frammento Alieno': if(T(0)){ T(0).buffA+=3; T(0).buffD+=3; T(0).kw.Estraneo=true; } break;
    case 'Crollo della Galleria': {
      const hit=minionsOf(g,o).filter(e=>!e.inCaccia); for(const e of hit) damage(g,e,2);
      const slotsBefore=hit.map(e=>e.slots[0]); checkDeaths(g);
      hit.forEach((e,k)=>{ if(!g.units[e.uid]) o.slots[slotsBefore[k]].blockedUntil=g.turn+1; });
      break; }
    case 'Tempesta su Sveltopasso': {
      scava(g,p,1);
      for(const e of minionsOf(g,o)) if(!e.inCaccia && stat(e).a>=3) pietrifica(g,e);
      if(minionsOf(g,p).some(u=>u.n==='Iggyar, Guardiano del Pedaggio')) scava(g,p,2);
      break; }
    case 'Richiamo delle Onde': if(T(0)&&T(1)){ fight(g,T(0),T(1),true); } break;
    case 'Canto della Marea Rossa': {
      const k=2+minionsOf(g,p).filter(isStrofa).length; for(const e of minionsOf(g,o)) if(!e.inCaccia) damage(g,e,k); heroHeal(g,p,2); break; }
    case 'Stella di Piombo': {
      if(t[0]==='hero'){ p.armor+=3*mult; } else if(T(0)){ T(0).buffD+=3*mult; } break; }
    case 'Stella di Adamantio': if(T(0)){ T(0).kw.Tempra=true; T(0).tempra+=mult; } break;
    case 'Pietra Meteorica': if(T(0)){ damage(g,T(0),3); heroDamage(g,p,1); } break;
    case 'Vendetta degli Ungart': if(T(0)) damage(g,T(0),4); break;
    case 'Bisturi Runico': { const e=T(0); if(e){ damage(g,e,3); checkDeaths(g); if(!g.units[e.uid]) innestoRandom(g,p,'Braccio Runico'); } break; }
    case 'Rito di Legame': { const a=T(0); if(a){ a.buffA+=2; a.buffD+=2; a.scaglia+=1; a.scagliaMax=Math.max(a.scagliaMax,a.scaglia); } break; }
    case 'Decreto Imperiale': if(decretoPossible(g,p)) g.pending.push({type:'decreto',p:p.i}); break;
    case 'Rinascita in Carne': { const pool=[...new Set(p.dead.filter(x=>card(x)&&card(x).t==='Seguace'))]; if(pool.length&&freeSlots(g,p,false).length) g.pending.push({type:'ritorno',p:p.i,ctx:'rinascita',cards:pool.slice(-8)}); break; }
    case 'Agguato nelle Gallerie': { if(T(0)) damage(g,T(0),3); const a=T(1); if(a) a.kw['Via di fuga']=true; break; }
    case 'Spedizione verso il Sud': { let k=0; for(const x of minionsOf(g,p)){ if(hasKw(x,'Via di fuga')) k++; else x.kw['Via di fuga']=true; } if(p.pegno&&k){ p.pegno.paid+=k; log(g,`Spedizione: ${k} GRA versati nel Pegno.`); } break; }
    case 'Meigubra': {
      const mine=minionsOf(g,p).filter(u=>!u.inCaccia);
      const a=mine.find(u=>PASHEY.includes(u.n)), b=mine.find(u=>STRAX.includes(u.n));
      const old=minionsOf(g,p).find(u=>u.n==='Strephey');
      if(a&&b){
        const sl=a.slots[0]; removeUnit(g,a); removeUnit(g,b);
        if(old){ old.buffA+=2; old.buffD+=2; log(g,'Gli spiriti si fondono nello Strephey: +2/+2.'); }
        else { const u=mkUnit(g,p,'Strephey',sl); onSummon(g,p,u); log(g,`${p.name} fonde gli spiriti: nasce lo Strephey!`); }
      } else { const x=a||b; if(x){ const sl=x.slots[0]; removeUnit(g,x); const u=mkUnit(g,p,'Distorsione',sl); onSummon(g,p,u); log(g,'Fusione squilibrata: nasce una Distorsione.'); } }
      break; }
  }
}
// Cicli costruiti con più azioni nello stesso turno (es. Stelle gratuite + Minatore di Valborea): massimo LOOP_MAX per turno.
function turnLoopOk(g,key,label){ g.tloops=g.tloops||{}; const k=(g.tloops[key]||0)+1; g.tloops[key]=k;
  if(k>LOOP_MAX){ if(k===LOOP_MAX+1) log(g,`Ciclo interrotto: ${label} si sono già attivate ${LOOP_MAX} volte in questo turno.`); return false; } return true; }
function onStar(g,p,t){
  { const su=t&&t[0]&&t[0]!=='hero'&&g.units[t[0]]; if(su) su.stars=(su.stars||0)+1; }
  if(!turnLoopOk(g,'Stelle:'+p.i,'le Stelle di '+p.name)) return;
  const tu=t&&t[0]&&t[0]!=='hero'&&g.units[t[0]];
  for(const u of minionsOf(g,p)){
    if(u.silenced) continue;
    if(u.n==='Incastonatore di Valborea' && tu){ tu.buffA+=1; log(g,`Incastonatore: ${tu.n} ottiene +1 Attacco.`); }
    if(u.n==='Portatore di Lanterne') u.buffA+=1;
    if(u.n==='Minatore di Valborea') scava(g,p,1);
  }
}

// ---------- Combattimento
function attackersLegal(g,pi){ const p=g.players[pi]; return minionsOf(g,p).filter(u=>canAttack(g,u)).map(u=>u.uid); }
function canAttack(g,u){
  if(u.kind!=='minion'||g.cur!==u.owner||u.attacked||u.cantAttack||u.noAttack||stat(u).a<=0) return false;
  if(u.sick && !hasKw(u,'Momentum')) return false;
  return true;
}
function attackTargets(g,u){
  const p=ownerOf(g,u), o=opp(g,p); if(!canAttack(g,u)) return [];
  const enemies=minionsOf(g,o).filter(e=>!e.inCaccia);
  const ord=enemies.filter(e=>hasKw(e,'Ordalia')&&!e.akw.__noOrdalia);
  let pool = (ord.length && !hasKw(u,'Volo')) ? ord : enemies;
  const res=pool.map(e=>e.uid);
  const heroOk = !(ord.length && !hasKw(u,'Volo')) && !(u.sick); // Momentum: solo seguaci nel turno in cui entra
  if(heroOk) res.push('hero');
  return res;
}
function canHeroAttack(g,pi){ const p=g.players[pi]; return !g.over&&g.phase==='play'&&g.cur===pi&&!g.pending.length&&(p.heroA|0)>0&&!p.heroAttacked; }
function heroAttackTargets(g,pi){
  if(!canHeroAttack(g,pi)) return []; const o=g.players[1-pi];
  const enemies=minionsOf(g,o).filter(e=>!e.inCaccia); const ord=enemies.filter(e=>hasKw(e,'Ordalia')&&!e.akw.__noOrdalia);
  const res=(ord.length?ord:enemies).map(e=>e.uid); if(!ord.length) res.push('hero'); return res;
}
// Lysara – Fuggitiva: sopravvissuta a un attacco, un altro tuo seguace casuale ottiene Ordalia e +1/+1; lei ottiene Estraneo
function fuggitiva(g,x){ const p=ownerOf(g,x); const a=pick(g,minionsOf(g,p).filter(y=>y!==x));
  if(a){ a.buffA+=1; a.buffD+=1; a.kw.Ordalia=true; log(g,`Lysara fugge: ${a.n} ottiene Ordalia e +1/+1.`); }
  if(!x.kw.Estraneo){ x.kw.Estraneo=true; log(g,'Lysara ottiene Estraneo.'); g.ev.push({t:'kw',k:'Estraneo',u:x.uid}); } recompute(g); }
function heroAttack(g,pi,target){
  if(!heroAttackTargets(g,pi).includes(target)) return 'bersaglio non valido';
  const p=g.players[pi], o=opp(g,p), a=p.heroA|0; p.heroAttacked=true;
  if(target==='hero'){ log(g,`L'eroe di ${p.name} attacca l'eroe (${a}).`); g.ev.push({t:'atk',hero:pi,h:o.i}); heroDamage(g,o,a); }
  else { const e=g.units[target]; log(g,`L'eroe di ${p.name} attacca ${e.n}.`); g.ev.push({t:'atk',hero:pi,v:e.uid}); const ea=stat(e).a; damage(g,e,a); heroDamage(g,p,ea);
    checkDeaths(g); if(g.units[e.uid] && e.n==='Lysara' && !e.silenced) fuggitiva(g,e); return null; }
  checkDeaths(g); return null;
}
function attack(g,pi,auid,target){
  if(g.over||g.phase!=='play'||g.cur!==pi||g.pending.length) return 'non è il momento';
  if(auid==='hero') return heroAttack(g,pi,target);
  const u=g.units[auid]; if(!u||u.owner!==pi) return 'attaccante non valido';
  if(!attackTargets(g,u).includes(target)) return 'bersaglio non valido';
  if(u.n==='Distorsione' && !u.silenced){ target=pick(g,attackTargets(g,u)); log(g,'La Distorsione sceglie un bersaglio a caso.'); }
  const p=g.players[pi], o=opp(g,p);
  u.attacked=true;
  // Ponte di Sveltopasso (Empatia del difensore): chi attacca perde 1 Attacco
  for(const d of unitsOf(g,o)) if(d.n==='Ponte di Sveltopasso' && empatia(g,d)){ u.buffA-=1; }
  recompute(g);
  if(target==='hero'){
    const a=stat(u).a; log(g,`${u.n} attacca l'eroe (${a}).`); g.ev.push({t:'atk',u:u.uid,h:o.i});
    heroDamage(g,o,a);
    if(hasKw(u,'Salasso')) heal(g,u,a);
    if(u.n==='Vouhdel, la Freccia del Mercato'&&!u.silenced) p.gra+=1;
    if(hasKw(u,'Caccia') && !u.cacciaUsed){ u.cacciaUsed=true; u.inCaccia=true; log(g,`${u.n} entra in Caccia.`); g.ev.push({t:'kw',k:'Caccia',u:u.uid}); }
  } else {
    const e=g.units[target];
    if(u.n==='Vouhdel, la Freccia del Mercato'&&!u.silenced) p.gra+=1;
    if(e.n==='Iggyar, Guardiano del Pedaggio' && !e.silenced) addHand(g,o,'Stella di Piombo');
    // Cripiosauro – Corazza di spine: chi lo attacca subisce 2 danni prima del combattimento
    if(e.n==='Cripiosauro' && !e.silenced){ log(g,`${u.n} si ferisce sulla Corazza di spine (2).`); damage(g,u,2); checkDeaths(g); }
    if(g.units[u.uid] && g.units[e.uid]){
      fight(g,u,e,false);
      // Manutentore dei Fulgura – Carica statica: un tuo seguace con Protesi attaccato scarica 2 danni sull'attaccante
      if(isInnestato(e) && (e.prot||[]).length) for(const m of minionsOf(g,o)) if(m.n==='Manutentore dei Fulgura' && !m.silenced && g.units[u.uid]){ log(g,`Carica statica: ${u.n} subisce 2 danni.`); g.ev.push({t:'kw',k:'Carica statica',u:u.uid}); damage(g,u,2); }
    }
    // Ponte di Sveltopasso (attaccante): Passo stretto
    for(const d of unitsOf(g,p)) if(d.n==='Ponte di Sveltopasso' && !d.silenced){
      const adj=u.slots.some(i=>d.slots.includes(i-1)||d.slots.includes(i+1));
      if(adj && e) for(const i of [e.slots[0]-1,e.slots[0]+1]){ const s=o.slots[i]; const x=s&&s.unit&&g.units[s.unit]; if(x&&x.kind==='minion'&&x!==e&&!x.inCaccia) damage(g,x,1); }
    }
    if(u.n==='Magga dallo Sguardo di Pietra'&&!u.silenced&&g.units[e.uid]) pietrifica(g,e);
  }
  checkDeaths(g);
  for(const x of [u, target!=='hero'?g.units[target]:null]) if(x && g.units[x.uid] && x.n==='Lysara' && !x.silenced) fuggitiva(g,x);
  if(g.units[u.uid] && u.n==='Distorsione' && !u.silenced && !u.empForce){ u.empForce=true; u.ambizione=true; log(g,'La Distorsione sopravvive e ottiene Empatia.'); g.ev.push({t:'kw',k:'Empatia',u:u.uid}); }
  for(const x of allUnits(g)) x.lastHitBy=null;
  if(g.units[u.uid] && u.n==='Cavaliere Acrobata' && !u.silenced && freeSlots(g,p,false).length) g.pending.push({type:'sposta',p:pi,uid:u.uid});
  return null;
}
function fight(g,u,e,forced){
  const ua=stat(u).a, ea=stat(e).a;
  g.ev.push({t:'atk',u:u.uid,v:e.uid});
  log(g,`${u.n} attacca ${e.n}.`);
  if(hasKw(u,'Predatore') && e.dmg>0 && !forced){ log(g,`${u.n} giustizia ${e.n} (Predatore).`); g.ev.push({t:'kw',k:'Predatore',p:e.owner,slot:e.slots[0]}); e.lastHitBy=u.uid; kill(g,e); return; }
  e.lastHitBy=u.uid; u.lastHitBy=e.uid;
  damage(g,e,ua); damage(g,u,ea);
  for(const [x,amt] of [[u,ua],[e,ea]]) if(hasKw(x,'Salasso')){ if(x.salassoHero) heroHeal(g,ownerOf(g,x),amt); else heal(g,x,amt); }
}

// ---------- Potere eroe
function canPower(g,pi){ const p=g.players[pi]; return !g.over&&g.phase==='play'&&g.cur===pi&&!g.pending.length&&!p.powerUsed&&p.gra>=(p.cls==='incisore'&&!p.mutated?1:2)&&powerReq(p).every((k,i)=>k.endsWith('Opt')||legalTargets(g,p,k).length>0)&&p.powerLock!==p.ownTurns&&!(p.cls==='traccia'&&p.esca); }
// Strofa stonata: al massimo 2 alla volta sui nemici; la terza fa sparire la più vecchia
function stona(g,p,u){ const o=opp(g,p); u.stonata=true; u.stonaAt=g.uid++;
  const on=minionsOf(g,o).filter(x=>x.stonata).sort((a,b)=>(a.stonaAt||0)-(b.stonaAt||0));
  const cap=p.mutated?3:2; while(on.length>cap){ const x=on.shift(); x.stonata=false; log(g,`${x.n} non è più stonato.`); } recompute(g); }
function usePower(g,pi,target){
  if(!canPower(g,pi)) return 'non puoi usare il potere';
  const p=g.players[pi], o=opp(g,p);
  if(p.cls==='sirena' && !p.mutated){
    const leg=legalTargets(g,p,'enemy'); if(!leg.includes(target)) return 'scegli un seguace nemico';
    stona(g,p,g.units[target]); log(g,`${p.name} usa Strofa stonata su ${g.units[target].n}.`);
  } else if(p.cls==='sirena'){
    const tg=target!=null&&g.units[target]; if(tg && !legalTargets(g,p,'enemy').includes(target)) return 'scegli un seguace nemico';
    if(tg){ stona(g,p,tg); log(g,`${p.name} usa Canto Cremisi: Strofa stonata su ${tg.n}.`); } else log(g,`${p.name} usa Canto Cremisi.`);
    p.cantoUntil=g.turn;
  } else if(p.cls==='incisore'){
    const req=powerReq(p); const ts=Array.isArray(target)?target:[target];
    for(let k=0;k<req.length;k++) if(!legalTargets(g,p,req[k]).includes(ts[k])) return 'scegli un bersaglio valido';
    if(!p.mutated){ const u=g.units[ts[0]]; const cost=(u.meraviglia&&!u.meravUsed&&slotIsEmo(g,u))?1:2; if(p.gra<cost) return 'GRA insufficiente';
      if(cost===1) u.meravUsed=true; log(g,`${p.name} usa Incisione.`); innesto(g,p,u,'Protesi runica minore'); p.gra-=cost; p.powerUsed=true; g.ev.push({t:'power',p:pi}); checkDeaths(g); return null; }
    const src=g.units[ts[0]], dst=g.units[ts[1]]; if(src===dst) return 'scegli due seguaci diversi';
    const pr=src.prot.pop(); recompute(g); log(g,`${p.name} usa Trapianto.`);
    if(!innesto(g,p,dst,pr.n)) src.prot.push(pr); dst.buffA+=1; dst.buffD+=1; if(rnd(g)<0.5) mutare(g,dst);
  } else if(p.cls==='scudiera'){
    const u=g.units[target]; if(!legalTargets(g,p,'ally').includes(target)) return 'scegli un tuo seguace';
    u.scaglia+=p.mutated?2:3; u.scagliaMax=Math.max(u.scagliaMax,u.scaglia); if(p.mutated){ u.kw.Salasso=true; u.salassoHero=true; }
    log(g,`${p.name} usa ${p.mutated?'Rito di sangue':'Rito di scaglia'} su ${u.n}.`);
  } else if(p.cls==='traccia'){
    p.esca={fuga:p.mutated}; log(g,`${p.name} usa ${p.mutated?'Esca di fuga':'Esca'}: il prossimo seguace occuperà 2 slot.`);
  } else if(p.cls==='adepto'){
    const which = target==='straxiart'?'straxiart':'pashey';
    log(g,`${p.name} usa ${p.mutated?'Eco dello Spirito':'Meditazione'}.`);
    if(!p.mutated){ p.heroA=(p.heroA||0)+1; log(g,`L'eroe di ${p.name} ottiene +1 Attacco in questo turno.`); }
    summonSpirit(g,p,which,p.mutated);
    for(const t of unitsOf(g,p)) if(t.n==='Tisquy' && t.anime>=2 && freeSlots(g,p,false).length){ t.anime-=2; { const sp=summonSpirit(g,p,which,false); if(sp){ sp.baseA=2; sp.baseD=2; } } log(g,'Tisquy spende 2 Anime: evoca uno Spirito 2/2.'); }
    const times=1;
    for(let k=0;k<times;k++) for(const u of minionsOf(g,p)) if(!u.silenced && g.units[u.uid]) immersione(g,p,u);
  } else if(p.cls==='minatore'){
    if(!p.deck.length) return 'il mazzo è vuoto';
    log(g,`${p.name} usa ${p.mutated?'Scavo profondo':'Scavo'}.`);
    scava(g,p,p.mutated?2:1,p.mutated?'profondo':null);
  }
  p.gra-=2; p.powerUsed=true; g.ev.push({t:'power',p:pi});
  p.powerUses=(p.powerUses||0)+1;
  if(p.cls==='scudiera' && p.powerUses%4===0){ p.armor+=4; log(g,`${p.name}: ${p.powerUses}° Rito, l'eroe ottiene Scaglia 4.`); g.ev.push({t:'kw',k:'Scaglia 4',hero:pi}); }
  checkDeaths(g); return null;
}

function immersione(g,p,u){
  switch(u.n){
    case 'Sciame delle Chiaviche': summonToken(g,p,'Codalunga',1,1); break;
    case 'Monaco del Silenzio': if((u.monacoUses||0)<3){ u.monacoUses=(u.monacoUses||0)+1; summonSpirit(g,p,'pashey',false); } break;
    case 'Custode Zhyol': for(const s of minionsOf(g,p)) if(s.tribe==='Spirito') s.buffD+=1; break;
    case 'Aspirante al Seggio': { const a=pick(g,minionsOf(g,p).filter(x=>x!==u)); const k=empatia(g,u)?2:1; if(a){ a.buffA+=k; a.buffD+=k; } break; }
    case 'Spirito della Vendetta': u.tmpOrd=true; break;
    case 'Maestro dei Cinque Clan': g.pending.push({type:'opz',p:p.i,ctx:'maestro',src:u.uid,opts:['Pashey 1/2','Straxiart 2/1']}); break;
    case 'Strephey': u.buffA+=1; u.buffD+=1; break;
  }
}
function resolveOpz(g,p,pd,k){
  if(pd.ctx==='vouhdel'){ const v=g.units[pd.src]; if(k===0){ heroDamage(g,p,1); if(v) v.buffD+=2; } else if(v) mutare(g,v); }
  if(pd.ctx==='maestro') summonSpirit(g,p,k===1?'straxiart':'pashey',false);
  if(pd.ctx==='raighar'){
    if(k===0){ const w=summonToken(g,p,'Muro di Roccia',1,5,{raighar:pd.src}); if(w) log(g,'Sorge un Muro di Roccia.'); }
    else { const o=opp(g,p); const ts=minionsOf(g,o).filter(e=>!e.inCaccia).map(e=>e.uid); if(ts.length) g.pending.unshift({type:'bersaglio',p:p.i,ctx:'frana',uids:ts}); }
  }
}
function resolveBersaglio(g,p,pd,e){
  if(pd.ctx==='frana'){ const o=ownerOf(g,e); const adj=adjacentAllies(g,e,o).filter(x=>!x.inCaccia); damage(g,e,2); for(const x of adj) damage(g,x,2); log(g,`Frana su ${e.n}.`); }
}

// ---------- Pegno
function toPegno(g,pi,huid){
  const p=g.players[pi]; if(g.cur!==pi||g.phase!=='play'||g.pending.length) return 'non è il momento';
  if(p.pegno) return 'il Pegno è occupato';
  if(p.gra<1) return 'serve almeno 1 GRA libero';
  const h=p.hand.find(x=>x.uid===huid); if(!h) return 'carta non in mano';
  p.hand.splice(p.hand.indexOf(h),1); p.gra--; p.pegno={n:h.n,paid:1}; log(g,`${p.name} mette una carta nel Pegno e versa 1 GRA.`);
  return null;
}
function slotsFor(g,p,c){ return c.n==="L'Usurpatore" ? freeSlots(g,opp(g,p),false) : freeSlots(g,p,c.t==='Dominio'); }
// Il Pegno è saldato? (lo sa solo chi possiede la carta)
function pegnoReady(g,pi){
  const p=g.players[pi]; if(!p.pegno||p.pegno.n==null) return {ready:false};
  const c=card(p.pegno.n); if(p.pegno.paid<pegnoCost(g,p)) return {ready:false};
  if(c.t==='Seguace'||c.t==='Dominio'){ if(!slotsFor(g,p,c).length) return {ready:false}; return {ready:true,n:c.n}; }
  return {ready:true,spell:true};
}
function pegnoResolve(g,p,n,spell){
  if(spell){ log(g,`Il Pegno di ${p.name} è saldato: la magia torna in mano gratis.`); const h=mkHand(g,p.pegno.n); h.free=true; p.pegno=null; p.discount=0; if(p.hand.length<MAXHAND) p.hand.push(h); return; }
  const c=card(n); if(!c||!(c.t==='Seguace'||c.t==='Dominio')) return;
  const fs=slotsFor(g,p,c); if(!fs.length) return;
  log(g,`Il Pegno di ${p.name} è saldato: ${c.n} entra in gioco.`); const bd=p.pegno.bonusD||0; p.pegno=null; p.discount=0; const nu=summonFromCard(g,p,n,fs[0],[],false); nu.buffD+=bd;
}
function pegnoCost(g,p){ return p.pegno? Math.max(0,card(p.pegno.n).c - p.discount) : 0; }

// ---------- Turni
function emoTurn(g,p){ const second=p.i!==g.first; const n=p.ownTurns; return second ? (n===2||(n>2&&(n-2)%3===0)) : (n%3===0); }
// Ondata di Nebbia: arriva nel turno in cui il primo giocatore raggiunge il suo 10°, 20°, 30°… turno.
// Infligge 2 danni a tutti i seguaci in gioco, poi entrambi i giocatori pescano una carta:
// se è un Seguace, quando verrà giocato otterrà Mutare.
const FOG_EVERY=10, FOG_DMG=2;
function fogDue(g,p){ return p.ownTurns>0 && p.ownTurns%FOG_EVERY===0 && opp(g,p).ownTurns<p.ownTurns; }
function fogWave(g,p){
  log(g,`La Nebbia avanza sul campo: ${FOG_DMG} danni a tutti i seguaci, ogni giocatore pesca una carta.`);
  g.ev.push({t:'fog',turn:g.turn});
  for(const u of allUnits(g).filter(u=>u.kind==='minion')) damage(g,u,FOG_DMG,{nebbia:true});
  g.fogN=(g.fogN||0)+1;
  // alla prima ondata il secondo giocatore pesca due carte
  for(const pl of [p,opp(g,p)]){ const n=(pl!==p && g.fogN===1)?2:1; for(let i=0;i<n;i++){ const k=pl.hand.length; draw(g,pl); if(pl.hand.length>k) pl.hand[pl.hand.length-1].fog=true; } }
  if(g.fogN===1) log(g,`Prima ondata: ${opp(g,p).name} pesca una carta in più.`);
}
function startTurn(g){
  g.loops={}; g.tloops={}; const p=g.players[g.cur], o=opp(g,p);
  p.ownTurns++; g.turn++;
  p.graMax=Math.min(MAXGRA,p.graMax+1); p.gra=p.graMax + (p.riscattoNext||0); p.riscattoNext=0; p.powerUsed=false;
  if(p.graMax===MAXGRA && !p.discountChecked){
    p.discountChecked=true; const col=x=>x.slots.filter(s=>s.emo).length;
    if(col(p)<col(o)){ p.discount=1; log(g,`${p.name} ottiene lo Sconto di recupero sul Pegno.`); }
  }
  for(const u of minionsOf(g,p)){
    u.sick=false; u.attacked=false; u.inCaccia=false;
    if(u.petri>0){ u.cantAttack=true; u.petri=0; } else u.cantAttack=false;
  }
  // Pegno saldato
  if(p.pegno){
    if(g.online) g.pending.push({type:'pegnoCheck',p:p.i}); // online decide chi conosce la carta
    else { const r=pegnoReady(g,p.i); if(r.ready) pegnoResolve(g,p,r.n,r.spell); }
  }
  if(p.divs&&p.divs.length) resolveDivine(g,p);
  p.heroA=0; p.heroAttacked=false;
  for(const u of minionsOf(g,p)){
    if(u.silenced) continue; u.age=(u.age||0)+1;
    const stall=minionsOf(g,p).some(x=>x.n==='Stalliere Imperiale'&&empatia(g,x));
    if(u.n==='Uovo di Magga' && u.age>=(stall?0:1)) levelUp(g,u);
    if(u.n==='Stalliere Imperiale' && u.age>=1 && !u.stallDone){ u.stallDone=true; if(summonToken(g,p,'Uovo di Magga',0,2)) log(g,`Stalliere Imperiale porta un Uovo di Magga.`); }
    else if((u.n==='Cucciolo di Magga' || (u.n==='Magga Giovane'&&u.grown)) && u.age>=1) levelUp(g,u);
  }
  if(false){ const bio=minionsOf(g,p).reduce((m,u)=>m+(u.prot||[]).filter(x=>x.t==='b').length,0); if(bio){ heroDamage(g,p,bio); log(g,`Le Protesi biologiche infliggono ${bio} danni a ${p.name}.`); } }
  for(const d of unitsOf(g,p)) if(!d.silenced){
    if(d.n==='Tripia') for(const x of minionsOf(g,p)) if(x.slots.some(i=>d.slots.includes(i-1)||d.slots.includes(i+1))) x.dmg=0;
    if(d.n==='Porto di Casa Uyvergg'){ summonToken(g,p,'Drago del Porto',1,1); if(empatia(g,d)) for(const x of minionsOf(g,p)) if((x.tribe==='Drago'||x.tribe==='Thalari')&&x.scaglia<1){ x.scaglia=1; x.scagliaMax=Math.max(x.scagliaMax,1); } }
  }
  for(const u of minionsOf(g,p)) if(u.n==='Vouhdel, la Freccia del Mercato'&&!u.silenced) g.pending.push({type:'opz',p:p.i,ctx:'vouhdel',src:u.uid,opts:['Subisci 1 danno: Vouhdel ottiene +0/+2','Vouhdel ottiene Mutare']});
  for(const u of minionsOf(g,p)){ u.tmpOrd=false; if(u.ambizione && !u.silenced && (u.empForce||slotIsEmo(g,u))){ u.buffA+=1; p.heroA+=1; } }
  if(p.heroA) log(g,`Ambizione: l'eroe di ${p.name} ottiene +${p.heroA} Attacco in questo turno.`);
  // Effetti di inizio turno
  for(const u of minionsOf(g,p)) if(!u.silenced){
    if(u.n==='Cantrice della Marea'){ const m=strofaMult(g,p); for(const o2 of minionsOf(g,p)) heal(g,o2,1*m); }
  }
  draw(g,p);
  if(fogDue(g,p)) fogWave(g,p);
  if(emoTurn(g,p)){ if(p.cls==='scudiera'){ if(decretoPossible(g,p)) g.pending.push({type:'decreto',p:p.i}); } else if(p.slots.some(s=>!s.emo&&!s.revoked)) g.pending.push({type:'emo',p:p.i}); }
  checkDeaths(g);
  log(g,`— Turno ${g.turn}: ${p.name} —`);
}
function endTurn(g,pi,payArg){
  if(g.over||g.phase!=='play'||g.cur!==pi) return 'non è il tuo turno';
  if(g.pending.length) return 'completa prima la scelta in corso';
  if(g.ending) return null;
  const p=g.players[pi], o=opp(g,p);
  g.ending=true; g.endPay=payArg|0;
  for(const u of minionsOf(g,p)) if(!u.silenced && g.units[u.uid]){ g.src={p:p.i,n:u.n};
    switch(u.n){
      case 'Sondatore delle Vene': if(empatia(g,u)) scava(g,p,1); break;
      case 'Avvelenatore del Porto': { const s2=o.slots[u.slots[0]]; const e=s2&&s2.unit&&g.units[s2.unit]; if(e&&e.kind==='minion'&&!e.inCaccia){ log(g,`L'Avvelenatore colpisce ${e.n}: 2 danni.`); damage(g,e,2); checkDeaths(g); if(!g.units[e.uid]){ log(g,'Il veleno ha fatto effetto: Acquisisci 1.'); draw(g,p); } } break; }
      case 'Cartografa di Lyr Veil': if(empatia(g,u)) analizza(g,p); break;
      case 'Fiocinatore della Ciurma': { const e=pick(g,minionsOf(g,o).filter(x=>!x.inCaccia)); if(e) damage(g,e,1); break; }
      case 'Cathuviss del Mar Placido': { if(!minionsOf(g,p).some(isStrofa)) break; const e=pick(g,minionsOf(g,o).filter(x=>!x.inCaccia)); if(e) pietrifica(g,e); break; }
      case "Ospite dell'Altro Cielo": { const e=pick(g,[...minionsOf(g,o).filter(x=>!x.inCaccia),'hero']); if(e==='hero') heroDamage(g,o,2); else if(e) damage(g,e,2); break; }
      case "La Voce dell'Amarina": { const m=strofaMult(g,p); for(const x of minionsOf(g,p)) heal(g,x,2*m); break; }
      case 'Profeta delle Fogne': summonToken(g,p,'Codalunga',1,1); break;
      case 'Laboratorista della Giungla': innestoRandom(g,p,'Protesi runica minore'); break;
      case 'Matriarca del Lago': summonToken(g,p,'Uovo di Magga',0,2); break;
      case "Hoegh l'Avanguardia": for(const x of minionsOf(g,p)) if(x!==u){ heal(g,x,2); if(x.scaglia<1){ x.scaglia=1; x.scagliaMax=Math.max(x.scagliaMax,1); } } break;
      case 'Vivandiera di Nerveth': { const a=pick(g,minionsOf(g,p)); if(a){ a.buffA+=1; heal(g,a,1); } break; }
      case "Mercante d'Armi della Seraspina": { const a=pick(g,minionsOf(g,p).filter(x=>x!==u)); if(a) a.buffA+=1; break; }
      case "Pando, l'Uomo Panda": { const a=pick(g,minionsOf(g,p).filter(x=>!hasKw(x,'Via di fuga'))); if(a) a.kw['Via di fuga']=true; break; }
      case "Dallvad, l'Uomo Chiave": { const a=pick(g,minionsOf(g,p).filter(x=>x.fugaUsed)); if(a){ a.dmg=0; a.fugaUsed=false; a.kw['Via di fuga']=true; log(g,`Dallvad ripara ${a.n}.`); } break; }
      case 'Il Rat King': for(let k=0;k<2;k++) summonToken(g,p,'Codalunga del Re',2,1); break;
    }
    checkDeaths(g); if(g.over) return null;
  }
  g.src=null;
  for(const u of minionsOf(g,p)) if(!u.silenced && (u.prot||[]).some(x=>x.n==='Innesto di Carne') && rnd(g)<0.5) mutare(g,u);
  checkDeaths(g); if(g.over) return null;
  if(!g.pending.length) finishEnd(g,pi);
  return null;
}
function finishEnd(g,pi){
  const p=g.players[pi], o=opp(g,p);
  g.ending=false;
  if(false){
    const s=minionsOf(g,p).filter(isStrofa).length; if(s>=2) heroHeal(g,p,Math.floor(s/2)); else if(!s) heroDamage(g,p,2);
  }
  // Baessa dell'avversario: riscuote 1 GRA inutilizzato
  for(const d of unitsOf(g,o)) if(d.n==='Baessa' && p.gra>0){
    p.gra--; if(o.pegno){ o.pegno.paid++; if(empatia(g,d)) o.pegno.bonusD=(o.pegno.bonusD||0)+1; }
    { heroDamage(g,p,1); const ws=minionsOf(g,o); if(ws.length){ const m=Math.min(...ws.map(x=>hpLeft(x))); const w=pick(g,ws.filter(x=>hpLeft(x)===m)); w.buffD+=1; log(g,`Baessa: ${p.name} perde 1 PF, ${w.n} ottiene +0/+1.`); } if(g.over) return null; }
    log(g,`Baessa riscuote 1 GRA da ${p.name}.`);
  }
  // GRA avanzato nel Pegno
  if(p.pegno && p.gra>0){ const k = g.online ? Math.min(g.endPay|0,p.gra) : Math.min(Math.max(0,pegnoCost(g,p)-p.pegno.paid),p.gra); p.pegno.paid+=k; p.gra-=k; if(k) log(g,`${p.name} versa ${k} GRA nel Pegno.`); }
  // Leviatano: il seguace preso torna al padrone
  for(const u of allUnits(g)) if(u.tempFrom){
    const back=g.players[u.tempFrom.owner]; removeUnit(g,u); const fs=freeSlots(g,back,false);
    const sl = back.slots[u.tempFrom.slot] && !back.slots[u.tempFrom.slot].unit ? u.tempFrom.slot : fs[0];
    u.tempFrom=null; if(sl==null){ log(g,`${u.n} non ha dove tornare e si perde.`); continue; }
    u.owner=back.i; u.slots=[sl]; g.units[u.uid]=u; back.slots[sl].unit=u.uid;
  }
  // Fine turno: gli slot d'Emozione tornano intatti
  for(const u of allUnits(g)){ if(slotIsEmo(g,u)) u.dmg=0; u.turnDmg=0; }
  p.cantoUntil=-1; p.heroA=0;
  checkDeaths(g); if(g.over) return null;
  g.cur=o.i; startTurn(g);
}

// ---------- Azioni (unico ingresso: usato da interfaccia, IA e online)
function act(g,pi,a){
  g.loops={}; let r=null; const P=g.players[pi], oldSrc=g.src;
  if(a.type==='play'){ const h=P.hand.find(x=>x.uid===a.uid); g.src={p:pi,n:a.n||(h&&h.n)}; if(g.src.n){ g.pstat=g.pstat||[{plays:0},{plays:0}]; } }
  else if(a.type==='attack') g.src={p:pi,n:a.uid==='hero'?HDB[P.cls].n:(g.units[a.uid]&&g.units[a.uid].n)};
  else if(a.type==='power') g.src={p:pi,n:(P.mutated?HDB[P.cls].m:HDB[P.cls].b)[0]};
  else g.src=null;
  try{
  switch(a.type){
    case 'mulligan': mulligan(g,pi,a.uids||[]); break;
    case 'play': P.idle=0; r=playCard(g,pi,a.uid,a.slot,a.targets,a.n); break;
    case 'attack': P.idle=0; r=attack(g,pi,a.uid,a.target); break;
    case 'power': P.idle=0; r=usePower(g,pi,a.target); break;
    case 'pegno': r=toPegno(g,pi,a.uid); break;
    case 'choose': g.__stars=a.stars|0; r=resolvePending(g,pi,a.choice)?null:'nessuna scelta'; delete g.__stars; break;
    case 'end': {
      // chi lascia scadere il tempo senza giocare per più di IDLE_MAX turni di fila perde (solo online)
      if(a.idle){ P.idle=(P.idle||0)+1; } else P.idle=0;
      if(g.online && P.idle>IDLE_MAX && !g.over){ g.over=true; g.winner=1-pi; log(g,`${P.name} non gioca da più di ${IDLE_MAX} turni: vince ${g.players[1-pi].name}.`); break; }
      r=endTurn(g,pi,a.pay); break; }
    case 'concede': if(!g.over){ g.over=true; g.winner=1-pi; g.conceded=pi; log(g,`${g.players[pi].name} si arrende.`); } break;
  }
  } finally { g.src=oldSrc; }
  if(a.type==='play'&&!r){ g.pstat=g.pstat||[{plays:0},{plays:0}]; g.pstat[pi].plays++; }
  return r;
}

// Completa un'azione con ciò che solo chi la fa conosce (carta giocata, GRA versato nel Pegno)
function enrich(g,pi,a){
  a=Object.assign({},a); const p=g.players[pi];
  if(a.type==='play'){ const h=p.hand.find(x=>x.uid===a.uid); if(h&&h.n) a.n=h.n; }
  if(a.type==='choose'){ const pd=g.pending[0]; if(pd&&pd.p===pi&&pd.type==='scava'&&pd.then==='profondo'){ const c=JSON.parse(JSON.stringify(g)); c.ev=[]; c.pending[0].then=null; resolvePending(c,pi,a.choice); a.stars=c.players[pi].hand.filter(h=>h.n&&card(h.n).star).length; } if(pd&&pd.p===pi&&pd.type==='tutor') a.choice=tutorIdx(p,pd.f,pd.k); }
  if(a.type==='end'){ let pay=0; if(p.pegno&&p.pegno.n!=null){ const o=opp(g,p); let gra=p.gra; if(unitsOf(g,o).some(d=>d.n==='Baessa')&&gra>0) gra--; pay=Math.max(0,Math.min(pegnoCost(g,p)-p.pegno.paid,gra)); } a.pay=pay; }
  return a;
}

// ---------- IA
function ai(g,pi){
  // restituisce la prossima azione dell'IA, o null se ha finito
  const p=g.players[pi], o=opp(g,p);
  if(g.over) return null;
  if(g.phase==='mulligan') return p.mulliganDone?null:{type:'mulligan',uids:p.hand.filter(h=>h.n&&card(h.n).c>6&&['Epica','Leggendaria'].includes(card(h.n).r)).map(h=>h.uid)};
  const pd=g.pending[0];
  if(pd){ if(pd.p!==pi) return null; return {type:'choose',choice:aiChoice(g,p,pd)}; }
  if(g.cur!==pi || g.ending) return null;
  // 0) Traccia: Esca prima di un seguace
  if(p.cls==='traccia' && canPower(g,pi) && freeSlots(g,p,true).length && p.hand.some(h=>{const c=card(h.n); return c.t==='Seguace'&&c.c>=3&&costOf(g,p,h,null)<=p.gra-2;})) return {type:'power'};
  // 1) carte giocabili, dalla più costosa
  const hand=[...p.hand].sort((a,b)=>card(b.n).c-card(a.n).c);
  for(const h of hand){
    const c=card(h.n);
    if(c.t==='Seguace'||c.t==='Dominio'){
      if(c.t==='Dominio' && unitsOf(g,p).some(u=>u.kind==='domain')) continue;
      if(playable(g,p,c)) continue;
      if(c.n==="L'Usurpatore"){ if(costOf(g,p,h,null)>p.gra) continue; const fe=freeSlots(g,o,false); const best=fe.map(s=>({s,v:[s-1,s+1].map(i=>o.slots[i]&&o.slots[i].unit&&g.units[o.slots[i].unit]).filter(x=>x&&x.kind==='minion').reduce((m,x)=>Math.max(m,stat(x).a+stat(x).d),0)})).sort((a,b)=>b.v-a.v)[0]; if(!best||best.v<4) continue; return {type:'play',uid:h.uid,slot:best.s,targets:[]}; }
      const two=needsTwo(g,p,c); const fs=freeSlots(g,p,two); if(!fs.length) continue;
      const emoS=fs.find(s=>c.cl===p.cls && (two?[s,s+1]:[s]).every(i=>p.slots[i].emo));
      const slot=emoS!=null?emoS:fs[0];
      if(costOf(g,p,h,slot)>p.gra) continue;
      const t=aiTargets(g,p,c); if(t===false) continue;
      return {type:'play',uid:h.uid,slot,targets:t};
    } else {
      if(costOf(g,p,h,null)>p.gra) continue;
      if(playable(g,p,c)) continue;
      if(c.n==='Meigubra' && !(minionsOf(g,p).some(u=>PASHEY.includes(u.n)) && minionsOf(g,p).some(u=>STRAX.includes(u.n)))) continue;
      const t=aiTargets(g,p,c); if(t===false) continue;
      return {type:'play',uid:h.uid,targets:t};
    }
  }
  // 2) potere eroe
  if(canPower(g,pi)){
    if(p.cls==='minatore' && p.deck.length) return {type:'power'};
    if(p.cls==='incisore'){ const big=arr=>arr.map(x=>g.units[x]).sort((a,b)=>(stat(b).a+stat(b).d)-(stat(a).a+stat(a).d))[0];
      if(!p.mutated){ const t=big(legalTargets(g,p,'allyRoom')); if(t) return {type:'power',target:t.uid}; }
      else { const src=legalTargets(g,p,'protAny').map(x=>g.units[x]).find(x=>x.owner!==pi); const dst=big(legalTargets(g,p,'allyRoom')); if(src&&dst) return {type:'power',target:[src.uid,dst.uid]}; } }
    if(p.cls==='scudiera'){ const t=legalTargets(g,p,'ally').map(x=>g.units[x]).filter(x=>x.scaglia<2).sort((a,b)=>stat(b).a-stat(a).a)[0]; if(t) return {type:'power',target:t.uid}; }
    if(p.cls==='adepto' && (freeSlots(g,p,false).length || minionsOf(g,p).some(u=>['Strephey','Custode Zhyol','Aspirante al Seggio','Spirito della Vendetta','Maestro dei Cinque Clan'].includes(u.n))) && !(p.mutated && p.pf<=3)){
      const hasP=minionsOf(g,p).some(u=>PASHEY.includes(u.n)), hasS=minionsOf(g,p).some(u=>STRAX.includes(u.n));
      return {type:'power',target: hasP&&!hasS?'straxiart': !hasP&&hasS?'pashey' : (minionsOf(g,o).length>minionsOf(g,p).length?'pashey':'straxiart')};
    }
    if(p.cls==='sirena'){
      if(p.mutated){ const leg=legalTargets(g,p,'enemy').map(x=>g.units[x]).filter(x=>!x.stonata).sort((a,b)=>stat(b).a-stat(a).a); if(minionsOf(g,p).some(isStrofa) || minionsOf(g,o).length>1) return {type:'power',target:leg.length&&minionsOf(g,o).length>1?leg[leg.length-1].uid:(leg[0]?leg[0].uid:null)}; }
      else { const leg=legalTargets(g,p,'enemy'); if(leg.length && minionsOf(g,o).length>1) return {type:'power',target:leg[0]}; }
    }
  }
  // 3) Pegno: la carta più cara che non si può giocare presto
  if(!p.pegno && p.hand.length && p.gra>=1){ const big=hand.find(h=>card(h.n).c>=p.graMax+2); if(big) return {type:'pegno',uid:big.uid}; }
  // 4) attacchi
  for(const uid of attackersLegal(g,pi)){
    const u=g.units[uid]; const ts=attackTargets(g,u); if(!ts.length) continue;
    const ua=stat(u).a, ud=hpLeft(u);
    let best=null,bestScore=-1e9;
    for(const t of ts){
      let s;
      if(t==='hero') s= ua*1.0 + (o.pf-ua<=0?1000:0);
      else { const e=g.units[t]; const kills=ua>=hpLeft(e)||(hasKw(u,'Predatore')&&e.dmg>0); const dies=stat(e).a>=ud && !(hasKw(u,'Predatore')&&e.dmg>0);
        const ev=stat(e).a+stat(e).d, uv=ua+stat(u).d; s=(kills?ev*1.2:ua*0.3)-(dies?uv:0)+(hasKw(e,'Ordalia')?1:0); }
      if(s>bestScore){bestScore=s;best=t;}
    }
    if(best!=null && (best==='hero'||bestScore>-1)) return {type:'attack',uid,target:best};
  }
  if(canHeroAttack(g,pi)){
    const ts=heroAttackTargets(g,pi), a=p.heroA; let pickT=null;
    const kills=ts.filter(t=>t!=='hero'&&hpLeft(g.units[t])<=a&&stat(g.units[t]).a<p.pf-8).sort((x,y)=>(stat(g.units[y]).a+stat(g.units[y]).d)-(stat(g.units[x]).a+stat(g.units[x]).d));
    if(ts.includes('hero')&&o.pf-a<=0) pickT='hero'; else if(kills.length) pickT=kills[0]; else if(ts.includes('hero')) pickT='hero';
    if(pickT!=null) return {type:'attack',uid:'hero',target:pickT};
  }
  return {type:'end'};
}
function aiTargets(g,p,c){
  const req=TARGETS[c.n]||[]; const o=opp(g,p); const t=[];
  for(const r of req){
    const leg=legalTargets(g,p,r).filter(x=>!t.includes(x));
    const opt=r.endsWith('Opt');
    if(!leg.length){ if(opt){t.push(null);continue;} return false; }
    const units=leg.filter(x=>x!=='hero').map(x=>g.units[x]);
    const enemies=units.filter(u=>u.owner!==p.i), allies=units.filter(u=>u.owner===p.i);
    const big=arr=>arr.sort((a,b)=>(stat(b).a+stat(b).d)-(stat(a).a+stat(a).d))[0];
    let pickT=null;
    if(r==='divinaOpt'){ const myAtk=minionsOf(g,p).reduce((m,u)=>m+stat(u).a,0); const e=enemies.filter(e=>!hasKw(e,'Via di fuga')).sort((a,b)=>(hpLeft(a)-(hpLeft(a)<=myAtk?10:0))-(hpLeft(b)-(hpLeft(b)<=myAtk?10:0)))[0]; t.push(e?e.uid:null); continue; }
    if(c.n==='Stella di Piombo') pickT = allies.length? big(allies).uid : 'hero';
    else if(c.n==='Esattore della Camera Rossa'){ const e=big(enemies); pickT=e?e.uid:null; }
    else if(r.startsWith('ally')) pickT = allies.length? big(allies).uid : null;
    else if(c.n==='Pietra Meteorica'){ const e=enemies.find(e=>hpLeft(e)<=3)||big(enemies); pickT=e?e.uid:null; }
    else pickT = enemies.length? big(enemies).uid : (opt?null:leg[0]);
    if(pickT==null && !opt) return false;
    t.push(pickT);
  }
  if(c.n==='Canto della Marea Rossa'||c.n==='Crollo della Galleria'){ if(minionsOf(g,o).length<2) return false; }
  if(c.n==='Tempesta su Sveltopasso' && !minionsOf(g,o).some(e=>stat(e).a>=3)) return false;
  return t;
}
function aiChoice(g,p,pd){
  if(pd.type==='scava'){ let best=-1,bc=-1; pd.cards.forEach((n,i)=>{ const c=card(n).c; if(c<=p.graMax+1 && c>bc){bc=c;best=i;} }); return best; }
  if(pd.type==='analizza') return 0;
  if(pd.type==='scruta') return card(pd.cards[0]).c>p.graMax+2?0:-1;
  if(pd.type==='pegnoCheck') return pegnoReady(g,p.i);
  if(pd.type==='tutor') return tutorIdx(p,pd.f,pd.k);
  if(pd.type==='decreto'){ const fs=p.slots.map((x,i)=>i).filter(i=>!p.slots[i].emo); if(fs.length) return {k:'sigillo',slot:fs.find(i=>!p.slots[i].unit)??fs[0]}; const o=opp(g,p); return {k:'revoca',slot:o.slots.findIndex(x=>!x.emo&&!x.revoked)}; }
  if(pd.type==='sposta'){ const fs=freeSlots(g,p,false); const e=fs.find(i=>p.slots[i].emo); return e!=null?e:-1; }
  if(pd.type==='ritorno'){ let b=0; pd.cards.forEach((n,i)=>{ if(card(n).c>card(pd.cards[b]).c) b=i; }); return b; }
  if(pd.type==='opz'){ if(pd.ctx==='vouhdel') return p.pf>12?0:1; if(pd.ctx==='raighar') return minionsOf(g,opp(g,p)).filter(e=>!e.inCaccia).length?1:0; return 1; }
  if(pd.type==='bersaglio'){ return pd.uids.map(x=>g.units[x]).filter(Boolean).sort((a,b)=>(stat(b).a+stat(b).d)-(stat(a).a+stat(a).d))[0].uid; }
  if(pd.type==='emo'){ const fs=p.slots.map((s,i)=>i).filter(i=>!p.slots[i].emo&&!p.slots[i].revoked); return fs.find(i=>!p.slots[i].unit)??fs[0]; }
  return 0;
}


// ---------- IA DIFFICILE: prova ogni mossa su una copia della partita, gioca il resto del turno
// con l'IA normale e sceglie la mossa che lascia la situazione migliore.
function aiValUnit(u){ if(!u) return 0; if(u.kind==='domain') return 5; const st=stat(u); const hp=Math.max(0,st.d-u.dmg);
  let v=st.a*1.1+hp*0.9+(u.scaglia||0)*0.6;
  for(const k of ['Ordalia','Volo','Tempra','Salasso','Predatore','Estraneo','Via di fuga','Caccia']) if(hasKw(u,k)) v+=0.6;
  if(u.petri||u.cantAttack) v-=st.a*0.4; return v; }
function aiEval(g,pi){
  const p=g.players[pi], o=g.players[1-pi];
  if(g.over) return g.winner===pi?1e6:-1e6;
  const hp=x=>x.pf+(x.armor||0);
  let v=hp(p)*1.0-hp(o)*1.25;
  for(const u of unitsOf(g,p)) v+=aiValUnit(u);
  for(const u of unitsOf(g,o)) v-=aiValUnit(u)*1.05;
  v+=Math.min(p.hand.length,8)*0.8-Math.min(o.hand.length,8)*0.5;
  if(p.pegno) v+=(p.pegno.paid||0)*0.5;
  // minaccia: quanto può farmi l'avversario al suo turno
  const threat=minionsOf(g,o).filter(u=>!u.petri&&!u.cantAttack).reduce((m,u)=>m+stat(u).a,0);
  const myWall=minionsOf(g,p).filter(u=>hasKw(u,'Ordalia')).reduce((m,u)=>m+Math.max(0,hpLeft(u)),0);
  if(threat-myWall*0.5>=hp(p)) v-=400;
  // pressione: vicino al letale avversario
  const myAtk=minionsOf(g,p).reduce((m,u)=>m+stat(u).a,0);
  if(myAtk>=hp(o)) v+=30;
  return v;
}
// seme delle simulazioni dell'IA ricavato dalla partita: stessa situazione = stessa scelta (il server può ricontrollare le partite contro il computer)
function aiClone(g){ const c=JSON.parse(JSON.stringify(g)); c.seed=((g.seed^Math.imul((g.log?g.log.length:0)+1,2654435761)^Math.imul(g.uid|0,40503)^Math.imul(g.turn|0,97))>>>0)||1; c.ev=[]; return c; }
function aiRollout(c,pi){
  for(let n=0;n<60;n++){
    if(c.over) return;
    const a=ai(c,pi); if(!a) return;
    const r=act(c,pi,a);
    if(a.type==='end') return;
    if(r){ act(c,pi,{type:'end'}); return; }
  }
}
function aiCandidates(g,pi){
  const p=g.players[pi], out=[], seen=new Set();
  const add=a=>{ const k=JSON.stringify(a); if(!seen.has(k)){ seen.add(k); out.push(a); } };
  const base=ai(g,pi); if(base) add(base);
  add({type:'end'});
  for(const h of p.hand){
    const c=card(h.n); if(!c||c.n==="L'Usurpatore") continue;
    if(playable(g,p,c)) continue;
    const req=TARGETS[c.n]||[];
    let tsets=[];
    if(req.length===1 && !req[0].endsWith('Opt')) tsets=legalTargets(g,p,req[0]).slice(0,8).map(x=>[x]);
    else { const t=aiTargets(g,p,c); if(t!==false) tsets=[t]; }
    if(!tsets.length) continue;
    if(c.t==='Seguace'||c.t==='Dominio'){
      const two=needsTwo(g,p,c); const fs=freeSlots(g,p,two); if(!fs.length) continue;
      const emo=fs.find(s=>c.cl===p.cls&&(two?[s,s+1]:[s]).every(i=>p.slots[i].emo));
      const slots=[...new Set([emo,fs[0],fs[fs.length-1]].filter(x=>x!=null))];
      for(const sl of slots){ if(costOf(g,p,h,sl)>p.gra) continue; for(const t of tsets) add({type:'play',uid:h.uid,slot:sl,targets:t}); }
    } else {
      if(costOf(g,p,h,null)>p.gra) continue;
      for(const t of tsets) add({type:'play',uid:h.uid,targets:t});
    }
  }
  if(canPower(g,pi)){
    const req=powerReq(p);
    if(p.cls==='adepto'){ add({type:'power',target:'pashey'}); add({type:'power',target:'straxiart'}); }
    else if(req.length===0) add({type:'power'});
    else if(req.length===1) for(const t of legalTargets(g,p,req[0]).slice(0,8)) add({type:'power',target:t});
  }
  for(const uid of attackersLegal(g,pi)) for(const t of attackTargets(g,g.units[uid])) add({type:'attack',uid,target:t});
  if(canHeroAttack(g,pi)) for(const t of heroAttackTargets(g,pi)) add({type:'attack',uid:'hero',target:t});
  return out;
}
function aiHard(g,pi){
  const p=g.players[pi];
  if(g.over) return null;
  if(g.phase!=='play' || g.pending.length || g.cur!==pi || g.ending) return ai(g,pi);
  const cands=aiCandidates(g,pi);
  let best=null, bestV=-Infinity;
  for(const a of cands){
    const c=aiClone(g);
    const r=act(c,pi,a);
    if(r && a.type!=='end') continue;
    if(a.type!=='end'){
      // completa eventuali scelte in sospeso, poi il resto del turno con l'IA normale
      aiRollout(c,pi);
    }
    let v=aiEval(c,pi);
    if(a.type==='end') v-=0.01;
    if(v>bestV){ bestV=v; best=a; }
  }
  return best||ai(g,pi);
}

// ---------- Vista per un giocatore (nasconde mano e mazzo avversari)
function view(g,pi){
  const v=JSON.parse(JSON.stringify(g));
  const o=v.players[1-pi]; o.hand=o.hand.map(h=>({uid:h.uid,hidden:true})); o.deckCount=o.deck.length; o.deck=[];
  v.players[pi].deckCount=v.players[pi].deck.length; v.players[pi].deck=[];
  if(o.pegno) o.pegno={hidden:true,paid:o.pegno.paid,cost:'?'};
  v.pending=v.pending.map(pd=>pd.p===pi?pd:{type:pd.type,p:pd.p,hidden:true});
  return v;
}

// ---------- Regole del mazzo (documento di design)
const DECK_SIZE=35, MAX_COPIES={Comune:3,Rara:2,Epica:2,Leggendaria:1};
function deckCheck(cls,list){
  const cnt=n=>list.filter(([x])=>x===n).reduce((m,[,k])=>m+k,0); let tot=0; const errs=[];
  let leg=0,com=0,inc=0,rit=0;
  for(const [n,k] of list){ const c=card(n); if(!c){ errs.push('carta sconosciuta: '+n); continue; } tot+=k;
    if(c.cl!==cls && c.cl!=='neutrali') errs.push(n+' non è della classe'); if(c.r==='Gettone') errs.push(n+' è un gettone');
    if(k>(MAX_COPIES[c.r]||0)) errs.push(n+': massimo '+MAX_COPIES[c.r]+' copie');
    if(c.r==='Leggendaria') leg+=k; if(c.r==='Comune') com+=k; if(c.t==='Incanto') inc+=k; if(c.t==='Rituale') rit+=k; }
  const rules=[[tot===DECK_SIZE,`${tot}/${DECK_SIZE} carte`],[leg>=1,'Almeno 1 leggendaria'],[com>=4,'Almeno 4 comuni'],[inc>=1,'Almeno 1 Incanto'],[rit>=1,'Almeno 1 Rituale']];
  return {ok:!errs.length&&rules.every(r=>r[0]),tot,rules,errs};
}
const API={tutorIdx,FOCUS_MIN,focusOn,focusMin,STAR_MAX,LOOP_MAX,FOG_EVERY,aiHard,deckCheck,DECK_SIZE,MAX_COPIES,powerReq,hasRoom,gainMaxPf,HEROPF,needsTwo,canHeroAttack,heroAttackTargets,newGame,act,ai,view,enrich,pegnoReady,playable,PASHEY,STRAX,card,stat,hpLeft,hasKw,canAttack,attackTargets,legalTargets,freeSlots,costOf,canPower,TARGETS,POWER_TARGETS,DECKS,isStrofa,empatia,slotIsEmo,pegnoCost,minionsOf,unitsOf};
if(typeof module!=='undefined') module.exports=API; else root.Engine=API;
})(this);
