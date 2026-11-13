// ELGRAVION TCG — interfaccia, IA e partite online
const E=Engine, $=s=>document.querySelector(s), app=$('#app');
const CLS_COLOR={minatore:'#3d7be0',sirena:'#e0374f',adepto:'#2fae6a',traccia:'#b0707a',incisore:'#c9d6c4',scudiera:'#d4b36a',neutrali:'#8e7fb0'};
const EMO_COLOR={minatore:'#3d8bff',sirena:'#ff3a55',adepto:'#3ddc84',traccia:'#cfc6d8',incisore:'#f4f4f4',scudiera:'#9aa0a8'};
const ALL_CLS=Object.keys(HEROES); const TURN_MS=90000;
let turnKey=null, turnStart=0, timedOut=false, autoPeg=null;
let shielded=new Set();
let G=null, me=0, vsAI=false, NET=null, sel=null, chosenCls='minatore', logOn=false, busy=false, toastT=null;

function fitTexts(root){
  (root||document).querySelectorAll('.fit').forEach(el=>{
    el.style.fontSize=''; el.classList.remove('clamp'); el.style.webkitLineClamp=''; const cs=getComputedStyle(el); let fs=parseFloat(cs.fontSize); const min=el.closest('.mc')?7:7.5;
    let guard=0; while(el.scrollHeight>el.clientHeight+1 && fs>min && guard++<40){ fs-=0.5; el.style.fontSize=fs+'px'; }
    if(el.scrollHeight>el.clientHeight+1){ const lh=parseFloat(getComputedStyle(el).lineHeight)||fs*1.15; const n=Math.max(1,Math.min(6,Math.floor(el.clientHeight/lh))); el.classList.add('clamp'); el.style.webkitLineClamp=n; }
  });
}
new MutationObserver(()=>{ clearTimeout(window.__fitT); window.__fitT=setTimeout(()=>fitTexts(document),0); }).observe(document.body,{childList:true,subtree:true});
function rarGem(c,all){ return c&&c.r&&c.r!=='Gettone'&&(all||c.r!=='Leggendaria')?`<span class="rg ${({Comune:'rc',Rara:'rr',Epica:'re',Leggendaria:'rl'})[c.r]||''}" title="${c.r}"></span>`:''; }
const KW_ICON={Ordalia:'🛡',Lascito:'☠',Volo:'🪽',Momentum:'⚡',Tempra:'✦',Estraneo:'◈',Salasso:'🩸',Predatore:'🐾',Caccia:'🎯','Via di fuga':'↺',Imboscata:'✷',Empatia:'♥',Divinazione:'👁',Scissione:'⟁'};
const KW_DESC={Imboscata:'Si attiva quando la carta entra in gioco.',Lascito:'Si attiva quando il seguace muore.',Ordalia:'I nemici devono attaccare prima questo seguace.',Volo:"Può attaccare ignorando l'Ordalia.",Momentum:"Può attaccare nel turno in cui entra, ma solo seguaci.",Tempra:'La prima volta che subisce danni e sopravvive, torna subito alla Difesa massima.',Estraneo:'Non può essere bersaglio di incantesimi né di poteri eroe.',Salasso:'I danni che infligge gli ripristinano altrettanta Difesa.',Predatore:'Quando attacca un seguace ferito, lo distrugge senza subire danni.',Caccia:"La prima volta che attacca l'eroe, fino al tuo prossimo turno non può essere attaccato né bersagliato e perde l'Ordalia.",'Via di fuga':'La prima volta che muore, torna in gioco con 1 Difesa.',Empatia:"Effetto attivo finché il seguace è in uno slot d'Emozione.",Pietrificato:'Non può attaccare nel suo prossimo turno.',Esorcizzato:'Ha perso parole chiave ed effetti.'};
function unitKws(u){ const c=E.card(u.n); const out=['Ordalia','Volo','Momentum','Tempra','Estraneo','Salasso','Predatore','Caccia','Via di fuga'].filter(k=>E.hasKw(u,k));
  if(!u.silenced && (/Lascito/.test(c.x)||u.esca)) out.push('Lascito'); return out; }
function rose(c){ return c&&c.r==='Leggendaria'?`<img class="rose" src="art/gemme/rosone_${c.cl}.svg" alt="">`:''; }
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
const KW_POP={"Corazza di spine": "Ogni seguace che attacca il Cripiosauro subisce 2 danni prima del combattimento: se muore, l'attacco non avviene.", "Carica statica": "Quando un tuo seguace con almeno una Protesi viene attaccato da un seguace, l'attaccante subisce 2 danni in più.", "Fuggitiva": "Ogni volta che Lysara sopravvive a un attacco (suo o subìto), un altro tuo seguace casuale ottiene Ordalia e +1/+1, e Lysara ottiene Estraneo.", "Fauci roventi": "4 danni al bersaglio e 1 danno ai seguaci accanto a lui.","Imboscata": "Si attiva quando la carta entra in gioco.", "Lascito": "Si attiva quando il seguace muore.", "Ordalia": "I nemici devono attaccare prima questo seguace.", "Volo": "Può attaccare ignorando l'Ordalia.", "Momentum": "Può attaccare nel turno in cui entra in gioco, ma solo seguaci: in quel turno non può attaccare l'eroe.", "Tempra": "La prima volta che subisce danni e sopravvive, torna subito alla Difesa massima.", "Estraneo": "Non può essere bersaglio di incantesimi né di poteri eroe.", "Pietrificare": "Il bersaglio non può attaccare nel suo prossimo turno.", "Mutare": "Il seguace ottiene +1/+1, un effetto casuale e la tribù Mutato.", "Acquisisci": "Pesca N carte.", "Analizza": "Guarda 2 carte casuali (della tua classe o neutrali) e aggiungine una alla tua mano.", "Esorcizza": "Un seguace perde tutte le parole chiave e gli effetti.", "Salasso": "I danni che questo seguace infligge gli ripristinano altrettanta Difesa, fino al massimo.", "Empatia": "Effetto attivo finché il seguace si trova in uno slot d'Emozione.", "Riscatto": "Ottieni N GRA da usare in questo turno.", "Dono": "Ripristina N Difesa a un seguace o N PF a un eroe, fino al massimo.", "Predatore": "Quando questo seguace attacca un seguace ferito (che ha subito danni), lo giustizia: lo distrugge senza subire danni.", "Caccia": "La prima volta che questo seguace attacca l'eroe avversario, fino all'inizio del prossimo turno del suo giocatore non può essere attaccato né bersagliato da nessun effetto, nemico o alleato, e perde l'Ordalia.", "Dominio": "Tipo di carta: un luogo. Occupa 2 slot accanto; massimo 1 per giocatore (un nuovo Dominio distrugge il vecchio). Ha sempre Empatia, attiva solo se entrambi i suoi slot sono slot d'Emozione. Ha PF ma i seguaci non possono attaccarlo: lo distruggono solo Rituali o effetti specifici. Se viene distrutto, il tuo GRA massimo scende di 1.", "Scava": "Guarda le prime N carte del mazzo: puoi prenderne una e mettere le altre in fondo; se non ne prendi nessuna, aggiungi una Stella alla mano.", "Immersione": "Si attiva ogni volta che usi il potere eroe.", "Via di fuga": "La prima volta che il seguace muore, torna in gioco con 1 Difesa.", "Innesto": "Dai una Protesi a un seguace, che diventa Innestato. Gli innesti casuali scelgono solo seguaci senza Protesi (salvo chi può averne di più).", "Strofa": "Bonus passivo attivo finché la carta è in gioco; più Strofe si sommano.", "Scaglia": "Il seguace ha N punti di corazza che assorbono i danni e non si rigenerano.", "Incanto": "Magia piccola che si lancia su un seguace. Può essere solo comune o rara. Ogni classe ne ha uno nel primo set.", "Rituale": "Magia grande che agisce su tutto il campo e può manipolare gli slot o il Pegno. Non può essere comune. Ogni classe ne ha uno nel primo set.", "Stelle": "Gettoni incantesimo del Minatore (vedi Gettoni).", "Meigubra": "Fusione di un Pashey e uno Straxiart in uno Strephey.", "Orologio della Violenza": "Avanza quando muoiono i tuoi seguaci.", "Protesi": "Non sono carte del mazzo: arrivano solo tramite Innesto (vedi Gettoni).", "Uova di Magga e Decreti": "Uova che si schiudono in Magghe; Decreti di Chroma (Sigillo, Revoca).", "Pietrifica": "Il bersaglio non può attaccare nel suo prossimo turno.", "Muta": "Il seguace ottiene +1/+1, un effetto casuale e la tribù Mutato.", "Stella di Piombo": "Gettone del Minatore: il tuo eroe ottiene 3 Armatura, oppure un seguace ottiene +0/+3.", "Stella di Adamantio": "Gettone del Minatore: un seguace alleato ottiene Tempra.", "Pietra Meteorica": "Gettone del Minatore: infliggi 3 danni a un seguace e subisci 1 danno.", "Pedaggio": "Effetto di Iggyar: ogni volta che un seguace nemico lo attacca, aggiungi una Stella di Piombo alla tua mano.", "Passo stretto": "Effetto del Ponte di Sveltopasso: quando un tuo seguace accanto al Ponte attacca un seguace, i nemici adiacenti al bersaglio subiscono 1 danno.", "Riscossione": "Effetto di Baessa: alla fine del turno avversario, se gli è rimasto GRA, ne prendi 1 per il tuo Pegno; l'avversario perde 1 PF e il tuo seguace con meno Difesa ottiene +0/+1.", "Bottino": "Effetto di Depand: ogni volta che un tuo seguace uccide un seguace nemico, Riscatto 1.", "Paura": "Bonus d'Emozione della Traccia: la prima volta che il seguace morirebbe in uno slot d'Emozione, sopravvive con 1 Difesa.", "Sigillo": "Decreto della Scudiera: un tuo slot diventa grigio e conta come slot d'Emozione (anche per il Focus).", "Focus": "Quando hai almeno 3 slot d'Emozione, i seguaci della tua classe giocati su uno slot d'Emozione costano 1 GRA in meno.", "Revoca": "Decreto della Scudiera: uno slot dell'avversario diventa d'oro e non potrà più prendere il colore della sua Emozione."};
Object.assign(KW_POP,{"Divinazione":"Quando giochi la carta scegli un seguace nemico. Se all'inizio del tuo prossimo turno quel seguace è morto, ottieni l'effetto. Il seguace scelto porta un 👁 visibile a entrambi.","Scissione":"Solo carte neutrali. Quando entra in gioco si divide sempre in due seguaci, ognuno con metà Attacco e metà Difesa arrotondate per eccesso. Se c'è un solo slot libero resta una sola metà.","Stella":"Gettone incantesimo del Minatore ottenuto scavando (Stella di Piombo, Stella di Adamantio…).","Pashey":"Spirito di luce, seguace 1/2: protezione e cura.","Straxiart":"Spirito d'ombra, seguace 2/1: forza e furia.","Spiriti":"Seguaci della tribù Spirito (Pashey, Straxiart, Strephey…).","Protesi runica":"Protesi magica e stabile data con l'Innesto: aumenta Attacco e Difesa del seguace.","Esca":"Potere del Traccia Sentieri: la prossima carta occupa 2 slot ma alla sua morte ti dà Riscatto 1 al tuo turno successivo.","Mutazione":"A 20 PF o meno l'eroe passa alla forma mutata: il potere eroe cambia e si attiva la Maledizione."});
function kwBase(k){ k=k.replace(/ \d+$/,''); return ({'Stelle':'Stella','Protesi runiche':'Protesi runica','Protesi runica minore':'Protesi runica','Spirito':'Spiriti'})[k]||k; }
function kwHtml(x){ return esc(x).replace(/\b(Imboscata|Lascito|Immersione|Innesto|Scaglia \d+|Sigillo|Revoca|Via di fuga|Bottino|Acquisisci \d+|Acquisisci|Corazza di spine|Carica statica|Fuggitiva|Fauci roventi|Paura|Meigubra|Ordalia|Volo|Momentum|Tempra|Estraneo|Pietrifica|Mutare|Muta|Analizza|Esorcizza|Salasso|Empatia|Riscatto \d+|Dono \d+|Predatore|Caccia|Scava \d+|Strofa|Stella di Piombo|Stella di Adamantio|Pietra Meteorica|Pedaggio|Passo stretto|Riscossione|Divinazione|Scissione|Protesi runica minore|Protesi runiche|Protesi runica|Protesi|Stelle|Stella|Pashey|Straxiart|Spiriti|Esca)\b/g,(m,k)=>`<b class="kwd" data-kw="${kwBase(k)}">${k}</b>`); }
function toast(s){ clearTimeout(toastT); let t=$('.toast'); if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);} t.textContent=s; toastT=setTimeout(()=>t.remove(),2200); }
function heroImg(p){ return `art/eroi/${p.cls}${p.mutated?'_mutato':''}_art.jpg`; }
function powerImg(p){ return `art/poteri/${p.cls}${p.mutated?'_m':''}.jpg`; }
function powerName(p){ const h=HEROES[p.cls]; return (p.mutated?h.m:h.b); }

// ======================= SUONI (generati, nessun file)
const SND={on:true,ctx:null,last:{}};
try{ SND.on=localStorage.getItem('elg_suoni')!=='0'; }catch(e){}
function actx(){ if(!SND.ctx){ const C=window.AudioContext||window.webkitAudioContext; if(!C) return null; SND.ctx=new C(); } if(SND.ctx.state==='suspended') SND.ctx.resume(); return SND.ctx; }
function sfxVol(){ try{ return Math.max(0,(SET.svol??80)/80); }catch(e){ return 1; } }
function tone(f,d,type,vol,when,slide){ const c=actx(); if(!c) return; const t=c.currentTime+(when||0); const o=c.createOscillator(), g=c.createGain(); o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(slide) o.frequency.exponentialRampToValueAtTime(slide,t+d); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(Math.max(0.0001,(vol||0.15)*sfxVol()),t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+d); o.connect(g).connect(c.destination); o.start(t); o.stop(t+d+0.03); }
function noise(d,vol,when,cut){ const c=actx(); if(!c) return; const t=c.currentTime+(when||0); const b=c.createBuffer(1,Math.floor(c.sampleRate*d),c.sampleRate); const x=b.getChannelData(0); for(let i=0;i<x.length;i++) x[i]=(Math.random()*2-1)*Math.pow(1-i/x.length,2); const s=c.createBufferSource(); s.buffer=b; const f=c.createBiquadFilter(); f.type='lowpass'; f.frequency.value=cut||2500; const g=c.createGain(); g.gain.value=(vol||0.15)*sfxVol(); s.connect(f).connect(g).connect(c.destination); s.start(t); }
const SFX={
  play:()=>{ noise(0.2,0.12,0,3200); tone(440,0.14,'triangle',0.07,0.03,700); },
  atk:()=>{ noise(0.14,0.22,0,1400); tone(150,0.16,'square',0.05,0,70); },
  hit:()=>{ tone(240,0.09,'sawtooth',0.04,0,120); },
  hero:()=>{ noise(0.2,0.25,0,900); tone(110,0.3,'triangle',0.1,0,60); },
  die:()=>{ tone(320,0.4,'triangle',0.09,0,90); noise(0.3,0.07,0.05,700); },
  power:()=>{ [660,880,1320].forEach((f,i)=>tone(f,0.28,'sine',0.07,i*0.06)); },
  turn:()=>{ tone(523,0.35,'triangle',0.09); tone(784,0.5,'triangle',0.07,0.13); },
  end:()=>{ tone(392,0.16,'triangle',0.06); },
  rip:()=>{ noise(0.5,0.18,0,5000); noise(0.3,0.12,0.25,2500); },
  burst:()=>{ noise(0.35,0.2,0,1800); [523,659,784].forEach((f,i)=>tone(f,0.3,'triangle',0.06,i*0.05)); },
  flip:()=>{ noise(0.08,0.1,0,4000); tone(600,0.08,'triangle',0.04); },
  rare:()=>{ noise(0.08,0.1,0,4000); tone(660,0.25,'sine',0.08); tone(990,0.3,'sine',0.06,0.08); },
  epic:()=>{ noise(0.08,0.1,0,4000); [523,659,880,1046].forEach((f,i)=>tone(f,0.35,'sine',0.07,i*0.07)); },
  leg:()=>{ noise(0.3,0.15,0,1200); tone(130,0.9,'triangle',0.12,0,65); [392,523,659,784,1046,1318].forEach((f,i)=>tone(f,0.6,'triangle',0.08,0.1+i*0.08)); },
  coin:()=>{ tone(1318,0.08,'square',0.04); tone(1760,0.18,'square',0.04,0.07); },
  lasc:()=>{ tone(196,0.7,'sine',0.12,0,98); tone(294,0.6,'sine',0.05,0.06,147); },
  ord:()=>{ tone(880,0.2,'square',0.03); tone(587,0.3,'triangle',0.06,0.03); },
  kw:()=>{ tone(740,0.18,'sine',0.06); tone(988,0.22,'sine',0.05,0.07); },
  mut:()=>{ tone(180,0.7,'sawtooth',0.04,0,420); noise(0.4,0.05,0.1,600); },
  win:()=>{ [523,659,784,1047].forEach((f,i)=>tone(f,0.45,'triangle',0.09,i*0.13)); },
  lose:()=>{ [392,330,262,196].forEach((f,i)=>tone(f,0.5,'triangle',0.08,i*0.16)); },
  click:()=>tone(900,0.05,'sine',0.035),
};
function sfx(k){ if(!SND.on) return; const now=Date.now(); if(SND.last[k]&&now-SND.last[k]<70) return; SND.last[k]=now; try{ SFX[k]&&SFX[k](); }catch(e){} }
function soundBtn(){ return `<button class="btn sm snd" id="bSnd" title="Suoni">${SND.on?'🔊':'🔇'}</button>`; }
function bindSound(){ const b=$('#bSnd'); if(b) b.onclick=()=>{ SND.on=!SND.on; try{ localStorage.setItem('elg_suoni',SND.on?'1':'0'); }catch(e){} b.textContent=SND.on?'🔊':'🔇'; if(SND.on) sfx('click'); }; }
document.addEventListener('pointerdown',()=>{ if(SND.on) actx(); },{once:true});

document.addEventListener('dragstart',e=>e.preventDefault());

// ======================= POPUP DELLE PAROLE CHIAVE
function kwPopShow(k,x){ const t=KW_POP[k]||KW_DESC[k]; if(!t) return; let p=$('#kwpop'); if(!p){ p=document.createElement('div'); p.id='kwpop'; document.body.appendChild(p); }
  p.innerHTML=`<div class="kh">${KW_ICON[k]?`<span>${KW_ICON[k]}</span>`:''}${esc(k)}</div><div class="kt">${esc(t)}</div>`;
  p.classList.remove('wide'); p.classList.toggle('left', x>innerWidth/2); p.classList.add('on'); clearTimeout(p.__t); }
function kwPopHide(delay){ const p=$('#kwpop'); if(!p) return; clearTimeout(p.__t); p.__t=setTimeout(()=>p.classList.remove('on'),delay||0); }
document.addEventListener('pointerover',e=>{ const k=e.target.closest&&e.target.closest('[data-kw]'); if(k&&e.pointerType==='mouse') kwPopShow(k.dataset.kw,e.clientX); });
document.addEventListener('pointerout',e=>{ const k=e.target.closest&&e.target.closest('[data-kw]'); if(k&&e.pointerType==='mouse') kwPopHide(150); });
document.addEventListener('click',e=>{ const k=e.target.closest&&e.target.closest('#ov [data-kw], .cc [data-kw], .chero [data-kw]'); if(k){ kwPopShow(k.dataset.kw,e.clientX); kwPopHide(3500); } },true);


function powKw(t){ return kwHtml(String(t||'').replace(/<\/?b>/g,'')); }
function kwsIn(t){ const out=[]; String(t||'').replace(/data-kw="([^"]+)"/g,(m,k)=>{ if(!out.includes(k)&&(KW_POP[k]||KW_DESC[k])) out.push(k); }); return out; }
function kwGloss(ks){ return ks.length?`<div class="hpk">${ks.map(k=>`<div><b>${KW_ICON[k]?KW_ICON[k]+' ':''}${esc(k)}</b>: ${esc(KW_POP[k]||KW_DESC[k])}</div>`).join('')}</div>`:''; }
function heroPopHtml(cls,only){ const h=HEROES[cls]; if(!h) return '';
  const b=powKw(h.b[1]), m=powKw(h.m[1]), mal=powKw(h.p.charAt(0).toUpperCase()+h.p.slice(1));
  if(only==='b') return `<div class="kh">${esc(h.b[0])} · 2 GRA</div><div class="kt">${b}</div>${kwGloss(kwsIn(b))}`;
  if(only==='m') return `<div class="kh">${esc(h.m[0])} · forma mutata</div><div class="kt">${m}</div>${kwGloss(kwsIn(m))}`;
  return `<div class="kh">${esc(h.n)}</div><div class="kt"><small>${esc(h.reg)} · Emozione: ${esc(h.e)}</small></div>
   <div class="kt hps"><b>${esc(h.b[0])}</b> (2 GRA): ${b}</div><div class="kt hps"><b>${esc(h.m[0])}</b> — forma mutata: ${m}</div>${kwGloss(kwsIn(b+m))}`; }
function powerPopHtml(pl){ const h=HEROES[pl.cls]; const pw=pl.mutated?h.m:h.b; const t=powKw(pw[1]); const mal=pl.mutated?powKw(h.p.charAt(0).toUpperCase()+h.p.slice(1)):'';
  return `<div class="kh">${esc(pw[0])} · 2 GRA</div><div class="kt">${t}</div>${kwGloss(kwsIn(t))}`; }
function popShowHtml(html,x){ if(!html) return; let p=$('#kwpop'); if(!p){ p=document.createElement('div'); p.id='kwpop'; document.body.appendChild(p); }
  p.innerHTML=html; p.classList.add('wide'); p.classList.toggle('left', x>innerWidth/2); p.classList.add('on'); clearTimeout(p.__t); }
document.addEventListener('pointerover',e=>{ if(e.pointerType!=='mouse'||!e.target.closest) return; if(e.target.closest('[data-kw]')) return;
  const pw=e.target.closest('[data-pw]'); if(pw&&G&&!dragging&&!gesture){ const pl=G.players[pw.dataset.pw==='me'?me:1-me]; popShowHtml(powerPopHtml(pl),e.clientX); return; }
  const hp=e.target.closest('[data-hp]'); if(hp){ const [c,w]=hp.dataset.hp.split(':'); popShowHtml(heroPopHtml(c,w),e.clientX); return; }
  const he=e.target.closest('[data-hero]'); if(he&&HEROES[he.dataset.hero]) popShowHtml(heroPopHtml(he.dataset.hero),e.clientX); });
document.addEventListener('pointerout',e=>{ if(e.pointerType==='mouse'&&e.target.closest&&e.target.closest('[data-hp],[data-hero],[data-pw]')) kwPopHide(150); });
document.addEventListener('pointerdown',e=>{ if(e.target.closest&&e.target.closest('[data-pw]')) kwPopHide(0); },true);

// ======================= IMPOSTAZIONI (salvate in questo browser)
const SET_KEY='elg_impostazioni';
const SET=Object.assign({diff:'normale',speed:'normale',timer:true,big:false,music:true,mvolv:60,svol:80},(()=>{ try{ return JSON.parse(localStorage.getItem(SET_KEY)||'{}'); }catch(e){ return {}; } })());
function saveSet(){ try{ localStorage.setItem(SET_KEY,JSON.stringify(SET)); }catch(e){} applySet(); }
function applySet(){ document.documentElement.classList.toggle('bigtext',!!SET.big); }
applySet();
// ======================= COLONNA SONORA (generata dal browser: epica, dark fantasy, vittoria tragica)
// Ogni sezione ha il suo tempo e il suo metro; l'ordine delle sezioni e i ritmi delle percussioni cambiano a ogni giro.
const MUSIC=(()=>{
  const f=m=>440*Math.pow(2,(m-69)/12);
  const CH={Dm:[[50,57,62,65],38],Bb:[[50,53,58,62],34],F:[[48,53,57,60],41],C:[[48,52,55,60],36],Gm:[[50,55,58,62],43],A:[[49,52,57,61],33],Asus:[[50,52,57,62],33],D:[[50,54,57,62],38]};
  const MEL_A=[[69,2],[65,1],[67,1],[65,3],[62,1],[72,2],[69,1],[65,1],[67,4],[69,2],[74,2],[72,1],[70,1],[69,1],[67,1],[65,2],[62,2],[69,2],[73,2]];
  const SEC={
    A:{bpm:66,beats:4,ch:['Dm','Bb','F','C','Dm','Gm','Bb','A'],mel:MEL_A,lead:'horn',drum:'soft'},
    B:{bpm:66,beats:4,ch:['Bb','F','Gm','Dm','Bb','C','Asus','D'],mel:[[74,3],[77,1],[72,4],[70,2],[74,2],[69,4],[77,2],[74,2],[76,2],[79,2],[76,2],[73,2],[74,4]],lead:'choir',drum:'war',high:true},
    C:{bpm:66,beats:4,ch:['Dm','Bb','Gm','A','Dm','Bb','C','A'],mel:null,drum:'none',bells:true,soft:true},
    A2:{bpm:66,beats:4,ch:['Dm','Bb','F','C','Dm','Gm','Bb','A'],mel:MEL_A,lead:'horn',drum:'war',choirPad:true,high:true},
    // Carica: più veloce, archi staccati incalzanti e tamburi di battaglia
    D:{bpm:96,beats:4,ch:['Dm','Bb','F','C','Gm','Dm','Bb','A'],mel:[[62,1],[65,1],[69,2],[70,2],[69,1],[67,1],[65,1],[67,1],[69,2],[72,4],[74,1],[72,1],[70,2],[69,2],[67,2],[65,1],[64,1],[65,1],[67,1],[69,4]],lead:'horn',drum:'battle',ostinato:true},
    // Lamento: in tre quarti, lento, coro solo e campane
    E:{bpm:58,beats:3,ch:['Dm','Gm','Bb','A','Dm','Gm','A','Dm'],mel:[[74,2],[72,1],[70,3],[69,2],[67,1],[69,3],[65,2],[67,1],[70,2],[69,1],[67,1],[64,1],[61,1],[62,3]],lead:'choir',drum:'waltz',bells:true,soft:true}
  };
  const DRUM_VARS={soft:['soft','soft','half'],war:['war','war','double','half'],battle:['battle','battle2'],waltz:['waltz'],none:['none']};
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  function playlist(first){ if(first) return ['A','B','C','A2','B'];
    const l=['A']; if(Math.random()<0.5) l.push('D'); l.push('B'); l.push(Math.random()<0.5?'C':'E'); if(Math.random()<0.4) l.push('D'); l.push('A2','B'); return l; }
  const melIdx={}; for(const n in SEC){ if(!SEC[n].mel) continue; let beat=0; melIdx[n]=SEC[n].mel.map(([m,d])=>{ const r=[m,d,beat]; beat+=d; return r; }); }
  let ctx=null, out=null, rev=null, dry=null, timer=null, nextT=0, playing=false, vol=0.3;
  let plist=[], pi=0, pb=0, dvar='soft', loops=0;
  function impulse(c){ const len=c.sampleRate*3.6, b=c.createBuffer(2,len,c.sampleRate); for(let ch=0;ch<2;ch++){ const x=b.getChannelData(ch); for(let i=0;i<len;i++) x[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6); } return b; }
  function init(){ ctx=actx(); if(!ctx) return false; if(out) return true;
    out=ctx.createGain(); out.gain.value=0; out.connect(ctx.destination);
    const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=3; comp.connect(out);
    if(!rev){ rev=ctx.createConvolver(); rev.buffer=impulse(ctx); }
    const rg=ctx.createGain(); rg.gain.value=0.55; try{ rev.disconnect(); }catch(e){} rev.connect(rg); rg.connect(comp);
    dry=ctx.createGain(); dry.gain.value=0.6; dry.connect(comp); return true; }
  function env(g,t,a,d,peak,rel){ g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(peak,t+a); g.gain.setValueAtTime(peak,t+Math.max(a,d-rel)); g.gain.exponentialRampToValueAtTime(0.0001,t+d+rel); }
  function send(node,wet){ node.connect(dry); const w=ctx.createGain(); w.gain.value=wet; node.connect(w); w.connect(rev); }
  function strings(m,t,d,v){ const g=ctx.createGain(), lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(500,t); lp.frequency.linearRampToValueAtTime(1300,t+d*0.5); lp.frequency.linearRampToValueAtTime(700,t+d); lp.Q.value=0.7;
    for(const dt of [-8,7]){ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f(m); o.detune.value=dt; o.connect(lp); o.start(t); o.stop(t+d+2); }
    lp.connect(g); env(g,t,Math.min(1.2,d*0.35),d,v,1.4); send(g,0.8); }
  function stacc(m,t,v){ const g=ctx.createGain(), lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(1800,t); lp.frequency.exponentialRampToValueAtTime(400,t+0.2);
    for(const dt of [-6,6]){ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f(m); o.detune.value=dt; o.connect(lp); o.start(t); o.stop(t+0.35); }
    lp.connect(g); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+0.012); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22); send(g,0.35); }
  function bass(m,t,d,v){ const g=ctx.createGain(); for(const [type,mul,lv] of [['sine',1,1],['triangle',2,0.35]]){ const o=ctx.createOscillator(), og=ctx.createGain(); o.type=type; o.frequency.value=f(m)*mul; og.gain.value=lv; o.connect(og); og.connect(g); o.start(t); o.stop(t+d+2); } env(g,t,0.5,d,v,1.0); send(g,0.3); }
  function horn(m,t,d,v){ const g=ctx.createGain(), lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.setValueAtTime(400,t); lp.frequency.linearRampToValueAtTime(1700,t+Math.min(0.35,d*0.5)); lp.frequency.linearRampToValueAtTime(1000,t+d);
    const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=4.6; lg.gain.value=6; lfo.connect(lg); lfo.start(t); lfo.stop(t+d+1.5);
    for(const [type,dt,lv] of [['sawtooth',0,0.7],['triangle',4,0.6]]){ const o=ctx.createOscillator(), og=ctx.createGain(); o.type=type; o.frequency.value=f(m); o.detune.value=dt; lg.connect(o.detune); og.gain.value=lv; o.connect(og); og.connect(lp); o.start(t); o.stop(t+d+1.5); }
    lp.connect(g); env(g,t,Math.min(0.25,d*0.4),d,v,0.6); send(g,0.9); }
  function choir(m,t,d,v){ const g=ctx.createGain(); const src=ctx.createGain();
    const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=5.2; lg.gain.value=9; lfo.connect(lg); lfo.start(t); lfo.stop(t+d+2);
    for(const dt of [-10,0,11]){ const o=ctx.createOscillator(); o.type='sawtooth'; o.frequency.value=f(m); o.detune.value=dt; lg.connect(o.detune); o.connect(src); o.start(t); o.stop(t+d+2); }
    for(const [fq,q,lv] of [[720,9,1],[1150,10,0.55],[2600,12,0.18]]){ const bp=ctx.createBiquadFilter(), bg=ctx.createGain(); bp.type='bandpass'; bp.frequency.value=fq; bp.Q.value=q; bg.gain.value=lv; src.connect(bp); bp.connect(bg); bg.connect(g); }
    env(g,t,Math.min(0.9,d*0.4),d,v,1.6); send(g,1.1); }
  function bell(m,t,v){ const g=ctx.createGain(); for(const [mul,lv] of [[1,1],[2.76,0.35],[5.4,0.12]]){ const o=ctx.createOscillator(), og=ctx.createGain(); o.type='sine'; o.frequency.value=f(m)*mul; og.gain.value=lv; o.connect(og); og.connect(g); o.start(t); o.stop(t+3); }
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+2.6); send(g,1.2); }
  function nbuf(d,shape){ const len=Math.max(1,Math.floor(ctx.sampleRate*d)), b=ctx.createBuffer(1,len,ctx.sampleRate), x=b.getChannelData(0); for(let i=0;i<len;i++) x[i]=(Math.random()*2-1)*Math.pow(1-i/len,shape); return b; }
  function drum(t,v,low){ const o=ctx.createOscillator(), g=ctx.createGain(); o.type='sine'; o.frequency.setValueAtTime(low?70:95,t); o.frequency.exponentialRampToValueAtTime(low?38:50,t+0.5); o.connect(g); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+1.1); o.start(t); o.stop(t+1.2); send(g,0.5);
    const s=ctx.createBufferSource(), lp=ctx.createBiquadFilter(), ng=ctx.createGain(); s.buffer=nbuf(0.25,3); lp.type='lowpass'; lp.frequency.value=600; ng.gain.value=v*0.5; s.connect(lp); lp.connect(ng); send(ng,0.5); s.start(t); }
  function snare(t,v){ const s=ctx.createBufferSource(), bp=ctx.createBiquadFilter(), g=ctx.createGain(); s.buffer=nbuf(0.3,4); bp.type='bandpass'; bp.frequency.value=1800; bp.Q.value=0.7; g.gain.value=v; s.connect(bp); bp.connect(g); send(g,0.7); s.start(t); }
  function swell(t,d,v){ const s=ctx.createBufferSource(), hp=ctx.createBiquadFilter(), g=ctx.createGain(); s.buffer=nbuf(d,0); hp.type='bandpass'; hp.frequency.setValueAtTime(800,t); hp.frequency.exponentialRampToValueAtTime(6000,t+d); hp.Q.value=0.8;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(v,t+d*0.95); g.gain.exponentialRampToValueAtTime(0.0001,t+d+0.4); s.connect(hp); hp.connect(g); send(g,1); s.start(t); s.stop(t+d+0.5); }
  function scheduleBar(name,b,t){
    const s=SEC[name], beat=60/s.bpm, BAR=s.beats*beat, last=b===s.ch.length-1, nextName=plist[pi+1]||'A';
    const [voices,bs]=CH[s.ch[b]];
    const sv=s.soft?0.05:s.ostinato?0.04:0.065;
    for(const m of voices) strings(m,t,BAR,sv);
    if(s.high) for(const m of voices.slice(1)) strings(m+12,t,BAR,0.025);
    bass(bs,t,BAR,0.22);
    if(s.choirPad) for(const m of voices.slice(1)) choir(m+12,t,BAR,0.03);
    if(s.ostinato){ const pat=[0,0,7,0,12,0,7,0]; for(let k=0;k<8;k++) stacc(bs+12+pat[k],t+k*BAR/8,k%4===0?0.09:0.06); }
    if(s.mel){ const b0=b*s.beats; for(const [m,dur,bt] of melIdx[name]) if(bt>=b0&&bt<b0+s.beats){ const tt=t+(bt-b0)*beat, d=dur*beat;
        if(s.lead==='horn') horn(m,tt,d*0.95,s.ostinato?0.08:0.07); else { choir(m,tt,d,0.075); if(!s.soft) horn(m-12,tt,d*0.95,0.03); } } }
    if(s.bells){ const arp=[...voices.slice(1),voices[1]+12,voices[2]+12], n=s.beats*2; for(let k=0;k<n;k++) if(k%2===0||Math.random()<0.4) bell(arp[k%arp.length]+12,t+k*BAR/n,0.025); }
    switch(dvar){
      case 'soft': drum(t,0.35,true); break;
      case 'half': if(b%2===0) drum(t,0.5,true); break;
      case 'war': drum(t,0.55,true); drum(t+BAR*0.375,0.25,false); drum(t+BAR*0.5,0.45,true); drum(t+BAR*0.875,0.2,false); break;
      case 'double': for(let k=0;k<8;k++) drum(t+k*BAR/8,k%4===0?0.55:k%2===0?0.3:0.16,k%4===0); break;
      case 'battle': drum(t,0.6,true); snare(t+beat,0.18); drum(t+beat*2,0.45,true); drum(t+beat*2.5,0.25,false); snare(t+beat*3,0.2); break;
      case 'battle2': for(let k=0;k<4;k++) drum(t+k*beat,k===0?0.6:0.35,true); snare(t+beat*1.5,0.12); snare(t+beat*3.5,0.16); break;
      case 'waltz': drum(t,0.3,true); break;
    }
    if(last){
      if(SEC[nextName].bpm>s.bpm||dvar==='war'||dvar==='double'){ swell(t,BAR,0.12); for(let k=0;k<6;k++) drum(t+BAR*0.6+k*BAR/16,0.2+k*0.06,false); }
      else if(dvar==='soft') for(let k=0;k<8;k++) drum(t+BAR/2+k*BAR/16,0.12+k*0.04,false);
      if(name==='B') drum(t+BAR*0.98,0.7,true);
    }
    return BAR;
  }
  function startSection(){ dvar=pick(DRUM_VARS[SEC[plist[pi]].drum]||['soft']); }
  function pump(){ if(!playing||!ctx) return;
    while(nextT<ctx.currentTime+2.5){
      const dur=scheduleBar(plist[pi],pb,nextT); nextT+=dur; pb++;
      if(pb>=SEC[plist[pi]].ch.length){ pb=0; pi++; if(pi>=plist.length){ loops++; plist=playlist(false); pi=0; } startSection(); }
    } }
  function start(){ if(playing) return; if(!init()) return; playing=true; nextT=ctx.currentTime+0.3; plist=playlist(loops===0); pi=0; pb=0; startSection();
    out.gain.cancelScheduledValues(ctx.currentTime); out.gain.setValueAtTime(0.0001,ctx.currentTime); out.gain.exponentialRampToValueAtTime(Math.max(0.0001,vol),ctx.currentTime+4);
    pump(); timer=setInterval(pump,400); }
  function stop(){ if(!playing) return; playing=false; clearInterval(timer); timer=null; if(out){ const t=ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(Math.max(0.0001,out.gain.value),t); out.gain.exponentialRampToValueAtTime(0.0001,t+1.2);
      const old=out; out=null; setTimeout(()=>{ try{ old.disconnect(); }catch(e){} },1600); } }
  function setVol(v){ vol=v; if(out&&playing){ const t=ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(Math.max(0.0001,out.gain.value),t); out.gain.linearRampToValueAtTime(Math.max(0.0001,v),t+0.15); } }
  document.addEventListener('visibilitychange',()=>{ if(!playing||!ctx) return; if(document.hidden){ clearInterval(timer); timer=null; } else { nextT=Math.max(nextT,ctx.currentTime+0.2); if(!timer) timer=setInterval(pump,400); } });
  return {start,stop,setVol,get playing(){return playing;},get section(){return plist[pi];},get drums(){return dvar;}};
})();
function musicGain(){ return Math.pow(Math.max(0,Math.min(100,+SET.mvolv||0))/100,1.5)*0.6; }
function musicSync(){ if(SET.music&&SET.mvolv>0){ MUSIC.setVol(musicGain()); MUSIC.start(); } else MUSIC.stop(); }
// i browser fanno partire l'audio solo dopo un tocco o un clic
document.addEventListener('pointerdown',()=>{ if(SET.music&&!MUSIC.playing) musicSync(); },true);
document.addEventListener('keydown',()=>{ if(SET.music&&!MUSIC.playing) musicSync(); },true);
const SPEED_MULT={lenta:1.7,normale:1,veloce:0.35};
// ======================= SCHERMO INTERO
const FS_EL=()=>document.fullscreenElement||document.webkitFullscreenElement;
function fsBtn(){ return `<button class="btn sm fsb" id="bFs" title="Schermo intero (F)">${FS_EL()?'🗗':'⛶'}</button>`; }
const LPQ=window.matchMedia?matchMedia('(orientation:landscape) and (max-height:520px)'):null;
function LP(){ return !!(LPQ&&LPQ.matches); }
function lockLand(){ try{ const o=screen.orientation; if(o&&o.lock&&matchMedia('(pointer:coarse)').matches) o.lock('landscape').catch(()=>{}); }catch(e){} }
if(LPQ&&LPQ.addEventListener) LPQ.addEventListener('change',()=>{ if(G) setTimeout(()=>{ try{ render(); }catch(e){} },80); });
window.addEventListener('orientationchange',()=>{ if(G) setTimeout(()=>{ try{ render(); }catch(e){} },250); });
try{ if(matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) lockLand(); }catch(e){}
function toggleFs(){
  const de=document.documentElement;
  if(FS_EL()){ (document.exitFullscreen||document.webkitExitFullscreen).call(document); return; }
  const req=de.requestFullscreen||de.webkitRequestFullscreen;
  if(!req || document.fullscreenEnabled===false){ toast('Lo schermo intero non è permesso qui: apri il gioco in una scheda a sé e riprova'); return; }
  try{ const r=req.call(de,{navigationUI:'hide'}); if(r&&r.then) r.then(lockLand,()=>{}); if(r&&r.catch) r.catch(()=>toast('Il browser non ha permesso lo schermo intero')); }catch(e){ toast('Il browser non ha permesso lo schermo intero'); }
}
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('#bFs'); if(b){ e.preventDefault(); toggleFs(); } });
['fullscreenchange','webkitfullscreenchange'].forEach(ev=>document.addEventListener(ev,()=>{ document.querySelectorAll('#bFs').forEach(b=>b.textContent=FS_EL()?'🗗':'⛶'); if(G) setTimeout(()=>{ try{ fitHand(); render(); }catch(e){} },120); }));
// ======================= INSTALLA APP
let INSTALL_EV=null;
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); INSTALL_EV=e; document.querySelectorAll('.instw').forEach(x=>x.style.display=''); });
window.addEventListener('appinstalled',()=>{ INSTALL_EV=null; document.querySelectorAll('.instw').forEach(x=>x.style.display='none'); try{ toast('Elgravion installato!'); }catch(e){} });
function isInstalled(){ return !!(window.claude || (window.matchMedia&&(matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches)) || navigator.standalone); }
function instBtn(){ return isInstalled()?'':`<span class="instw"><button class="btn sm" id="bInst" title="Installa il gioco come app">⬇</button><span>Installa</span></span>`; }
function installApp(){
  if(INSTALL_EV){ const e=INSTALL_EV; INSTALL_EV=null; e.prompt(); e.userChoice.then(c=>{ if(c.outcome!=='accepted') INSTALL_EV=e; }).catch(()=>{}); return; }
  const ua=navigator.userAgent, ios=/iPhone|iPad|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1), android=/Android/.test(ua), safariMac=/Macintosh/.test(ua)&&/Safari/.test(ua)&&!/Chrome|Edg/.test(ua), firefox=/Firefox/.test(ua);
  let how;
  if(ios) how='Apri questa pagina con <b>Safari</b>, tocca <b>Condividi</b> (il quadrato con la freccia in su) e poi <b>Aggiungi alla schermata Home</b>.';
  else if(android) how='Apri il menu <b>⋮</b> di Chrome in alto a destra e scegli <b>Installa app</b> (o <b>Aggiungi a schermata Home</b>).';
  else if(safariMac) how='Nel menu <b>File</b> di Safari scegli <b>Aggiungi al Dock</b>.';
  else if(firefox) how='Firefox per computer non installa le app web: apri questa pagina con <b>Chrome</b> o <b>Edge</b> e premi il pulsante Installa.';
  else how='Apri questa pagina con <b>Chrome</b> o <b>Edge</b>: clicca l’icona <b>Installa</b> (un monitor con la freccia) a destra nella barra degli indirizzi, oppure menu <b>⋮</b> → <b>Trasmetti, salva e condividi</b> → <b>Installa pagina come app</b>.';
  modal(`<h3>Installa Elgravion</h3><p class="note" style="max-width:440px;margin:0 auto 14px;font-size:16px;line-height:1.45">${how}</p><p class="note" style="max-width:440px;margin:0 auto 14px">Dopo l’installazione il gioco si apre come un’app e funziona anche senza internet.</p><div class="row"><button class="btn" id="mInstOk">Ho capito</button></div>`);
  $('#mInstOk').onclick=closeModal;
}
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('#bInst'); if(b){ e.preventDefault(); installApp(); } });
// ======================= POTERE EROE: castone ad anello per classe
const RING_PAL={
  minatore:{m:['#f4f7ff','#9fb2d8','#5a6c96','#e3ebff','#3b4870'],g:'#3f7dff',g2:'#bfe0ff'},
  sirena:{m:['#fff0c8','#e0b04a','#8a5a14','#ffd77a','#5a3608'],g:'#e2263c',g2:'#ffc0c8'},
  adepto:{m:['#fff1cf','#c79a52','#6e4a1c','#e8c27a','#3f2a10'],g:'#1fae6a',g2:'#bff5d6'},
  traccia:{m:['#c9b8b0','#6e5c58','#2a2224','#9c8580','#141012'],g:'#b23a2a',g2:'#ffb08a'},
  incisore:{m:['#ffffff','#e6e1d6','#a89f8c','#fbf6ea','#6d6556'],g:'#d6a43a',g2:'#fff0b8'},
  scudiera:{m:['#fff6d2','#e9c45a','#9a6f12','#ffe08a','#5c4006'],g:'#3b6fe0',g2:'#d0e0ff'}
};
// Intarsi del titolo: volute dorate ai lati e fascia intarsiata sotto
const TORN=`<svg viewBox="0 0 160 40" aria-hidden="true"><defs><linearGradient id="tg1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9a24b" stop-opacity="0"/><stop offset=".5" stop-color="#e8c56c"/><stop offset="1" stop-color="#fff1c4"/></linearGradient></defs><path d="M4 20 H118" stroke="url(#tg1)" stroke-width="2"/><path d="M30 20 C44 6 62 6 66 16 C70 26 56 30 52 22 C49 16 58 13 60 18" fill="none" stroke="#e8c56c" stroke-width="1.8"/><path d="M30 20 C44 34 62 34 66 24 C70 14 56 10 52 18" fill="none" stroke="#c9a24b" stroke-width="1.4" opacity=".8"/><path d="M78 20 C90 10 104 10 110 20 C104 30 90 30 78 20Z" fill="none" stroke="#e8c56c" stroke-width="1.4"/><circle cx="94" cy="20" r="3" fill="#7a3fd0" stroke="#fff1c4" stroke-width="1"/><path d="M132 20 l10 -8 l10 8 l-10 8z" fill="#f1d27e" stroke="#7a4e12" stroke-width="1"/><circle cx="142" cy="20" r="2.4" fill="#fff8e0"/></svg>`;
const TBAND=`<svg viewBox="0 0 520 18" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="tb1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9a24b" stop-opacity="0"/><stop offset=".2" stop-color="#e8c56c"/><stop offset=".8" stop-color="#e8c56c"/><stop offset="1" stop-color="#c9a24b" stop-opacity="0"/></linearGradient></defs><path d="M10 5 H510 M10 13 H510" stroke="url(#tb1)" stroke-width="1.2"/>${Array.from({length:23},(_,i)=>{const x=40+i*20; return i===11?`<path d="M${x} 1 l8 8 l-8 8 l-8 -8z" fill="#f1d27e" stroke="#5a3a0c"/><circle cx="${x}" cy="9" r="2.6" fill="#8f45ef"/>`:`<path d="M${x} 6 l3 3 l-3 3 l-3 -3z" fill="#e8c56c" opacity="${(1-Math.abs(i-11)/13).toFixed(2)}"/>`;}).join('')}</svg>`;
function ringSvg(cls,id){
  const P=RING_PAL[cls]||RING_PAL.minatore, m=P.m, k='rg'+id+cls;
  const gem=(x,y,r,c,c2)=>`<circle cx="${x}" cy="${y}" r="${r+1.6}" fill="url(#${k}m)" stroke="#000a" stroke-width=".8"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${k}g)"/><circle cx="${x-r*.35}" cy="${y-r*.35}" r="${r*.32}" fill="#fff" opacity=".75"/>`;
  const prong=a=>{ const r=a*Math.PI/180, c=Math.cos(r), s=Math.sin(r); const p=(R,o)=>[(R*c-o*s).toFixed(1),(R*s+o*c).toFixed(1)];
    const [x1,y1]=p(86,-6),[x2,y2]=p(86,6),[x3,y3]=p(61,0); return `<path d="M${x1} ${y1} Q${p(74,-7)} ${x3} ${y3} Q${p(74,7)} ${x2} ${y2}Z" fill="url(#${k}m)" stroke="#0008" stroke-width=".8"/><circle cx="${p(63,0)[0]}" cy="${p(63,0)[1]}" r="2.4" fill="${m[0]}" opacity=".9"/>`; };
  const prongs=(n,off)=>Array.from({length:n},(_,i)=>prong(off+i*360/n)).join('');
  let deco='';
  if(cls==='minatore'){ // stelle a quattro punte e zaffiri
    const star=(x,y,s)=>`<path d="M${x} ${y-s}L${x+s*.22} ${y-s*.22}L${x+s} ${y}L${x+s*.22} ${y+s*.22}L${x} ${y+s}L${x-s*.22} ${y+s*.22}L${x-s} ${y}L${x-s*.22} ${y-s*.22}Z" fill="url(#${k}m)" stroke="#0007" stroke-width=".7"/>`;
    deco=star(0,-92,13)+star(0,92,10)+star(-92,0,10)+star(92,0,10)+gem(-66,-66,6)+gem(66,-66,6)+gem(-66,66,5)+gem(66,66,5)+prongs(4,45);
  } else if(cls==='sirena'){ // conchiglie, onde e perle
    const shell=(a,s)=>`<g transform="rotate(${a}) translate(0 -88)"><path d="M0 ${-s} C${s*1.1} ${-s} ${s*1.2} ${s*.6} 0 ${s*.8} C${-s*1.2} ${s*.6} ${-s*1.1} ${-s} 0 ${-s}Z" fill="url(#${k}m)" stroke="#0008" stroke-width=".8"/>${[-.6,-.3,0,.3,.6].map(t=>`<path d="M0 ${s*.7} L${(t*s*1.3).toFixed(1)} ${(-s*.8).toFixed(1)}" stroke="#5a3608" stroke-width=".9" opacity=".7"/>`).join('')}</g>`;
    const pearls=Array.from({length:16},(_,i)=>{ const a=(i*22.5+11.25)*Math.PI/180; return `<circle cx="${(84*Math.cos(a)).toFixed(1)}" cy="${(84*Math.sin(a)).toFixed(1)}" r="3.4" fill="url(#${k}p)" stroke="#0006" stroke-width=".5"/>`; }).join('');
    deco=pearls+shell(0,15)+shell(180,11)+gem(-90,0,6)+gem(90,0,6)+prongs(4,45);
  } else if(cls==='adepto'){ // foglie e volute di nuvola, giada
    const leaf=(a)=>`<g transform="rotate(${a})"><path d="M0 -80 C14 -88 20 -100 6 -104 C-2 -96 -6 -88 0 -80Z" fill="url(#${k}m)" stroke="#0008" stroke-width=".8"/><path d="M0 -80 C-14 -88 -20 -100 -6 -104 C2 -96 6 -88 0 -80Z" fill="url(#${k}m)" stroke="#0008" stroke-width=".8" opacity=".85"/></g>`;
    const cloud=(a)=>`<g transform="rotate(${a})"><path d="M-14 -84 a7 7 0 1 1 10 -6 a8 8 0 0 1 14 2 a6 6 0 0 1 4 10" fill="none" stroke="url(#${k}m)" stroke-width="4" stroke-linecap="round"/></g>`;
    deco=leaf(0)+leaf(180)+cloud(60)+cloud(120)+cloud(240)+cloud(300)+gem(-88,0,7)+gem(88,0,7)+prongs(6,30);
  } else if(cls==='traccia'){ // ferro brunito, spine e lanterna
    const thorn=(a)=>`<g transform="rotate(${a})"><path d="M-4 -82 L0 -98 L4 -82Z" fill="url(#${k}m)" stroke="#0009" stroke-width=".7"/></g>`;
    const lantern=`<g transform="translate(0 -92)"><rect x="-8" y="-9" width="16" height="17" rx="3" fill="url(#${k}m)" stroke="#000a"/><rect x="-5" y="-6" width="10" height="11" rx="2" fill="${P.g}" opacity=".9"/><circle cx="0" cy="-.5" r="3.4" fill="${P.g2}"/><path d="M-6 -9 Q0 -17 6 -9" fill="none" stroke="url(#${k}m)" stroke-width="2.4"/></g>`;
    deco=Array.from({length:12},(_,i)=>i%3===0?'':thorn(i*30)).join('')+lantern+`<path d="M-10 92 Q0 82 10 92 Q0 100 -10 92Z" fill="url(#${k}m)" stroke="#000a"/>`+gem(-88,0,5)+gem(88,0,5)+prongs(3,90);
  } else if(cls==='incisore'){ // rune incise e ingranaggi
    const runes=Array.from({length:24},(_,i)=>{ const a=i*15*Math.PI/180, c=Math.cos(a), s=Math.sin(a); const r1=72, r2=i%2?78:80; return `<line x1="${(r1*c).toFixed(1)}" y1="${(r1*s).toFixed(1)}" x2="${(r2*c).toFixed(1)}" y2="${(r2*s).toFixed(1)}" stroke="#8a6a1c" stroke-width="1.6"/>`; }).join('');
    const gear=(x,y,r)=>{ const t=Array.from({length:8},(_,i)=>{ const a=i*45*Math.PI/180; return `<rect x="${(x+Math.cos(a)*r-2.5).toFixed(1)}" y="${(y+Math.sin(a)*r-2.5).toFixed(1)}" width="5" height="5" transform="rotate(${i*45} ${(x+Math.cos(a)*r).toFixed(1)} ${(y+Math.sin(a)*r).toFixed(1)})" fill="url(#${k}m)"/>`; }).join(''); return t+`<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${k}m)" stroke="#0008"/><circle cx="${x}" cy="${y}" r="${r*.4}" fill="#6d6556"/>`; };
    deco=runes+gear(0,-92,9)+gear(-90,0,7)+gear(90,0,7)+gem(0,92,6)+prongs(6,0);
  } else if(cls==='scudiera'){ // ali di drago e scaglie
    const wing=(sx)=>`<g transform="scale(${sx} 1)"><path d="M78 -10 C96 -34 118 -40 128 -30 C118 -26 116 -18 120 -10 C110 -12 104 -6 106 4 C96 0 90 4 86 12 Z" fill="url(#${k}m)" stroke="#0009" stroke-width="1"/><path d="M84 -6 L120 -28 M86 2 L114 -10 M86 8 L104 4" stroke="#5c4006" stroke-width="1.1" fill="none" opacity=".75"/></g>`;
    const scales=Array.from({length:10},(_,i)=>{ const a=(200+i*14)*Math.PI/180; return `<path d="M${(84*Math.cos(a)).toFixed(1)} ${(84*Math.sin(a)).toFixed(1)} a5 5 0 0 0 0 9" transform="rotate(${200+i*14+90} ${(84*Math.cos(a)).toFixed(1)} ${(84*Math.sin(a)).toFixed(1)})" fill="none" stroke="url(#${k}m)" stroke-width="2.6"/>`; }).join('');
    deco=wing(1)+wing(-1)+`<path d="M-12 -86 L0 -102 L12 -86 L0 -90Z" fill="url(#${k}m)" stroke="#0009"/>`+gem(0,-80,5)+scales+gem(0,90,6)+prongs(4,45);
  }
  return `<svg class="ring" viewBox="-100 -100 200 200" aria-hidden="true"><defs>
    <linearGradient id="${k}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m[0]}"/><stop offset=".28" stop-color="${m[1]}"/><stop offset=".5" stop-color="${m[3]}"/><stop offset=".72" stop-color="${m[2]}"/><stop offset="1" stop-color="${m[1]}"/></linearGradient>
    <radialGradient id="${k}g" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="${P.g2}"/><stop offset=".55" stop-color="${P.g}"/><stop offset="1" stop-color="#000"/></radialGradient>
    <radialGradient id="${k}p" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f3e6ef"/><stop offset="1" stop-color="#b7a3b5"/></radialGradient>
    <radialGradient id="${k}dome" cx=".5" cy=".5" r=".5"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset=".92" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
  </defs>
  <circle r="77" fill="none" stroke="#000" stroke-width="13" opacity=".55"/>
  <circle r="77" fill="none" stroke="url(#${k}m)" stroke-width="10"/>
  <circle r="77" fill="none" stroke="${m[4]}" stroke-width="1" opacity=".7" stroke-dasharray="1 5"/>
  <circle r="70.5" fill="none" stroke="url(#${k}m)" stroke-width="4"/>
  <circle r="68.5" fill="none" stroke="#000" stroke-width="1.2" opacity=".7"/>
  <circle r="67" fill="url(#${k}dome)"/><path d="M-46 -38 A60 60 0 0 1 22 -60 A70 70 0 0 0 -40 -20Z" fill="#fff" opacity=".28"/><circle cx="34" cy="40" r="4" fill="#fff" opacity=".35"/>
  ${deco}</svg>`;
}
// Gambo e spalle dell'anello: sta dietro la gemma (il potere eroe è la pietra incastonata)
function ringBand(cls,id){
  const P=RING_PAL[cls]||RING_PAL.minatore, m=P.m, k='rb'+id+cls;
  const gem=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r+1.4}" fill="url(#${k}m)" stroke="#000a" stroke-width=".7"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${k}g)"/><circle cx="${x-r*.35}" cy="${y-r*.35}" r="${r*.3}" fill="#fff" opacity=".75"/>`;
  const both=f=>f(1)+f(-1);
  let sh='';
  if(cls==='minatore') sh=both(s=>`<g transform="scale(${s} 1)"><path d="M70 30 L84 18 L90 34 L84 50 Z" fill="url(#${k}m)" stroke="#0008" stroke-width=".8"/>${gem(90,44,4.5)}${gem(80,58,3.5)}<path d="M98 30 l3 -8 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3z" fill="${m[0]}" stroke="#0007" stroke-width=".6"/></g>`);
  else if(cls==='sirena') sh=both(s=>`<g transform="scale(${s} 1)">${[0,1,2].map(i=>`<circle cx="${76+i*8}" cy="${40+i*7}" r="4.6" fill="url(#${k}p)" stroke="#0006" stroke-width=".5"/>`).join('')}<path d="M92 26 C102 22 106 34 98 38 C96 32 92 30 92 26Z" fill="url(#${k}m)" stroke="#0008" stroke-width=".8"/></g>`);
  else if(cls==='adepto') sh=both(s=>`<g transform="scale(${s} 1)"><path d="M70 34 C86 16 104 22 108 32 C96 30 86 36 78 48Z" fill="url(#${k}m)" stroke="#0008" stroke-width=".8"/><path d="M74 40 C88 30 98 30 106 33" stroke="#3f2a10" stroke-width="1" fill="none" opacity=".7"/>${gem(86,52,4.5)}</g>`);
  else if(cls==='traccia') sh=both(s=>`<g transform="scale(${s} 1)">${[0,1,2].map(i=>`<path d="M${74+i*10} ${28+i*8} l14 -6 l-6 12z" fill="url(#${k}m)" stroke="#000a" stroke-width=".7"/>`).join('')}${gem(84,48,4)}</g>`);
  else if(cls==='incisore') sh=both(s=>`<g transform="scale(${s} 1)"><rect x="72" y="24" width="26" height="22" rx="4" transform="rotate(24 85 35)" fill="url(#${k}m)" stroke="#0008" stroke-width=".8"/>${[0,1,2].map(i=>`<line x1="${78+i*6}" y1="${27+i*3}" x2="${74+i*6}" y2="${40+i*3}" stroke="#8a6a1c" stroke-width="1.6"/>`).join('')}${gem(94,52,3.6)}</g>`);
  else if(cls==='scudiera') sh=both(s=>`<g transform="scale(${s} 1)">${[0,1,2].map(i=>`<path d="M${80+i*5} ${20+i*13} C${70+i*3} ${14+i*13} ${62} ${18+i*12} ${58} ${24+i*11}" fill="none" stroke="url(#${k}m)" stroke-width="5" stroke-linecap="round"/><path d="M${58} ${24+i*11} l-5 2 l3 -6z" fill="${m[0]}"/>`).join('')}<path d="M80 20 C96 22 104 40 92 56 C88 44 84 34 80 20Z" fill="url(#${k}m)" stroke="#0009" stroke-width=".9"/></g>`);
  return `<svg class="rband" viewBox="-130 -100 260 200" aria-hidden="true"><defs>
    <linearGradient id="${k}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m[0]}"/><stop offset=".3" stop-color="${m[1]}"/><stop offset=".5" stop-color="${m[3]}"/><stop offset=".75" stop-color="${m[2]}"/><stop offset="1" stop-color="${m[1]}"/></linearGradient>
    <linearGradient id="${k}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m[2]}"/><stop offset=".45" stop-color="${m[3]}"/><stop offset=".7" stop-color="${m[1]}"/><stop offset="1" stop-color="${m[4]}"/></linearGradient>
    <radialGradient id="${k}g" cx=".35" cy=".35" r=".75"><stop offset="0" stop-color="${P.g2}"/><stop offset=".55" stop-color="${P.g}"/><stop offset="1" stop-color="#000"/></radialGradient>
    <radialGradient id="${k}p" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#f3e6ef"/><stop offset="1" stop-color="#b7a3b5"/></radialGradient>
  </defs>
  <ellipse cx="0" cy="40" rx="104" ry="40" fill="none" stroke="#000" stroke-width="20" opacity=".45"/>
  <ellipse cx="0" cy="40" rx="104" ry="40" fill="none" stroke="url(#${k}v)" stroke-width="15"/>
  <ellipse cx="0" cy="40" rx="104" ry="40" fill="none" stroke="${m[0]}" stroke-width="1.4" opacity=".55" transform="translate(0 -5)"/>
  <ellipse cx="0" cy="40" rx="104" ry="40" fill="none" stroke="#000" stroke-width="1" opacity=".5" transform="translate(0 6)"/>
  ${sh}</svg>`;
}
// ======================= ACCOUNT (versione scaricabile, accesso con Google)
let ACCT=null;
function acctBtn(){ if(window.claude||!window.ELG_NET) return ''; return `<span class="instw"><button class="btn sm" id="bAcct" title="${ACCT?'Account: '+esc(ACCT):'Accedi con Google per giocare online'}">${ACCT?'👤':'🔑'}</button><span>${ACCT?esc(ACCT.split(' ')[0]).slice(0,12):'Accedi'}</span></span>`; }
async function acctRefresh(){ if(!window.ELG_NET) return; try{ const u=await window.ELG_NET.currentUser(); const n=u?(u.displayName||'Cacciatore'):null; if(n!==ACCT){ ACCT=n; if($('.menu')&&!G) menu(); } }catch(e){} }
document.addEventListener('click',async e=>{ const b=e.target.closest&&e.target.closest('#bAcct'); if(!b) return; e.preventDefault();
  if(!ACCT){ try{ await window.ELG_NET.signIn(); await acctRefresh(); toast('Accesso effettuato'); accSync(); }catch(err){ toast('Accesso non riuscito'+(err&&err.code?' ('+err.code+')':'')); } return; }
  const d=modal(`<h3>Il tuo account</h3><div class="note" style="margin:0 auto 12px">Sei collegato come <b>${esc(ACCT)}</b>. Il tuo nome appare agli avversari e in classifica.</div><div class="row"><button class="btn" id="acOut">Esci</button><button class="btn" id="acOk">Chiudi</button></div>`);
  $('#acOk').onclick=closeModal; $('#acOut').onclick=async()=>{ try{ await window.ELG_NET.signOut(); }catch(err){} ACCT=null; accOff(); closeModal(); menu(); };
});
if(window.ELG_NET) setTimeout(acctRefresh,800);
// ======================= LINGUA e NEGOZIO
function langBtn(){ const en=window.LANG==='en'; return `<span class="instw"><button class="btn sm" id="bLang" title="${en?'Lingua: inglese':'Lingua: italiano'}">${en?'EN':'IT'}</button><span>Lingua</span></span>`; }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('#bLang'); if(!b) return; e.preventDefault();
  const en=window.LANG==='en';
  modal(`<h3>${en?'Language':'Lingua'}</h3><div class="row langrow"><button class="btn ${!en?'on':''}" id="lgIt">🇮🇹 Italiano</button><button class="btn ${en?'on':''}" id="lgEn">🇬🇧 English</button></div>`);
  $('#lgIt').onclick=()=>window.setLang('it'); $('#lgEn').onclick=()=>window.setLang('en'); });
// ======================= NEGOZIO: sostieni il gioco, personalizzazione, pacchetti di classe
// Prezzi e consegne li decide il server; il pagamento passa da PayPal. Finché PayPal non è collegato, il negozio si mostra in anteprima.
const ADAM='Adamantio', AI_='<span class="ai">◆</span>';
let SHOP=null, SHOP_TAB='dono', PP_SDK=null;
async function shopCall(op,data){ return window.ELG_NET.shop(op,data); }
async function shopLoad(){ if(SHOP&&Date.now()-SHOP.t<300000) return SHOP;
  try{ const c=await shopCall('catalogo'); SHOP=Object.assign({t:Date.now()},c); }catch(e){ SHOP={t:Date.now(),active:false,catalog:null,err:true}; } return SHOP; }
function loadPayPal(clientId){ if(PP_SDK) return PP_SDK;
  PP_SDK=new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://www.paypal.com/sdk/js?client-id='+encodeURIComponent(clientId)+'&currency=EUR&intent=capture&components=buttons'; s.onload=()=>res(window.paypal); s.onerror=()=>{ PP_SDK=null; rej(new Error('PayPal')); }; document.head.appendChild(s); });
  return PP_SDK; }
const eurTxt=v=>Number(v).toFixed(2).replace('.',',')+' €';
function shopReady(){ return !window.claude && !!(window.ELG_NET&&window.ELG_NET.shop); }
async function shopScreen(tab){
  if(tab) SHOP_TAB=tab; G=null; NET&&NET.leave&&NET.leave(); NET=null; closeModal();
  if(!shopReady()){ modal(`<h3>Negozio</h3><div class="note" style="margin:0 auto 12px">Il negozio è disponibile nella versione online del gioco, con l'accesso Google.</div><div class="row"><button class="btn" id="shOk">Chiudi</button></div>`); $('#shOk').onclick=closeModal; return; }
  app.innerHTML=`<div class="coll shop"><div class="chead"><button class="btn sm" id="cBack">‹ Menu</button><h2>Negozio</h2><span class="pill coin">${GI} ${ownLoad().coins}</span>${ACC()?`<span class="pill adam" title="${ADAM}: serve solo a creare carte">${AI_} ${ownLoad().adam|0}</span>`:''}</div>
    <div class="shtabs"><button class="shtab" data-t="dono">❤ Sostieni il gioco</button><button class="shtab" data-t="cosm">✦ Personalizzazione</button><button class="shtab" data-t="pack">🎴 Pacchetti di classe</button></div>
    <div class="shbody" id="shBody"><div class="note">Carico il negozio…</div></div><div class="shpay" id="shPay"></div></div>`;
  $('#cBack').onclick=()=>menu();
  app.querySelectorAll('.shtab').forEach(b=>{ b.classList.toggle('on',b.dataset.t===SHOP_TAB); b.onclick=()=>shopScreen(b.dataset.t); });
  const S=await shopLoad(); const body=$('#shBody'); if(!body) return;
  if(!S.catalog){ body.innerHTML='<div class="note">Il negozio non risponde: riprova tra poco.</div>'; return; }
  const C=S.catalog, o=ownLoad(), have=new Set(o.cosm||[]);
  const banner=!S.active?`<div class="shnote">🛠 Anteprima: i pagamenti con PayPal non sono ancora collegati. Prezzi e contenuti potrebbero cambiare.</div>`:(!ACC()?`<div class="shnote">Per acquistare accedi con Google (pulsante 🔑 nel menu): quello che compri resta sul tuo account.</div>`:'');
  if(SHOP_TAB==='dono'){
    body.innerHTML=`${banner}<div class="shdono"><h3>Sostieni Elgravion</h3><div class="note">Elgravion è un progetto indipendente. Una donazione aiuta a pagare il server e a creare nuove carte. Non dà vantaggi in partita: è solo un grazie.</div>
      <div class="shamts">${C.dono.suggest.map(v=>`<button class="btn shamt" data-a="${v}">${eurTxt(v)}</button>`).join('')}<label class="shfree">Altro: <input id="shAmt" type="number" min="${C.dono.min}" max="${C.dono.max}" step="1" placeholder="€"></label></div></div>`;
    const pick=v=>{ app.querySelectorAll('.shamt').forEach(b=>b.classList.toggle('on',+b.dataset.a===v)); shopPay({kind:'dono',amount:v},`Donazione di ${eurTxt(v)}`,eurTxt(v),S); };
    app.querySelectorAll('.shamt').forEach(b=>b.onclick=()=>pick(+b.dataset.a));
    const inp=$('#shAmt'); inp.onchange=()=>{ const v=Math.round(+inp.value); if(v>=C.dono.min&&v<=C.dono.max) pick(v); else toast(`Importo tra ${C.dono.min} e ${C.dono.max} €`); };
  }
  if(SHOP_TAB==='cosm'){
    const card=it=>{ const own=have.has(it.id), on=SET[it.k]===it.id;
      const prev=it.k==='back'?`<div class="cpv back ${it.id}"></div>`:`<div class="cpvh hero ${it.id}"><img src="art/eroi/${chosenCls}_art.jpg" alt=""></div>`;
      return `<div class="shitem ${own?'own':''}">${prev}<b>${esc(it.n)}</b><small>${it.k==='back'?'Dorso delle carte: lo vede l\'avversario':'Cornice del tuo eroe'}</small>
        ${own?`<button class="btn sm shuse" data-k="${it.k}" data-id="${it.id}">${on?'✓ In uso':'Usa'}</button>`:`<button class="btn sm shbuy" data-id="${it.id}">${eurTxt(it.eur)}</button>`}</div>`; };
    body.innerHTML=`${banner}<h3>Dorsi delle carte</h3><div class="shgrid">${C.cosm.filter(x=>x.k==='back').map(card).join('')}</div>
      <h3>Cornici dell'eroe</h3><div class="shgrid">${C.cosm.filter(x=>x.k==='frame').map(card).join('')}</div>
      <div class="note">Solo estetica: nessun vantaggio in partita. Gli oggetti comprati restano sul tuo account.</div>`;
    app.querySelectorAll('.shuse').forEach(b=>b.onclick=()=>{ const k=b.dataset.k; SET[k]=SET[k]===b.dataset.id?null:b.dataset.id; saveSet&&saveSet(); shopScreen(); });
    app.querySelectorAll('.shbuy').forEach(b=>b.onclick=()=>{ const it=C.cosm.find(x=>x.id===b.dataset.id); app.querySelectorAll('.shbuy').forEach(x=>x.classList.toggle('on',x===b)); shopPay({kind:'cosm',id:it.id},it.n,eurTxt(it.eur),S); });
  }
  if(SHOP_TAB==='pack'){
    const cp=S.classPack||{size:5,adam:50};
    body.innerHTML=`${banner}<div class="shpk"><div class="shpkl">${packArt(true,SHOP.cls||chosenCls)}</div><div><h3>Pacchetti di classe</h3>
      <div class="note" style="text-align:left;max-width:none">Ogni pacchetto contiene <b>${cp.size} carte della classe che scegli</b> (l'ultima almeno Rara) e <b>${cp.adam} ${ADAM}</b> ${AI_}. L'${ADAM} serve <b>solo a creare carte</b>: non si spende in altro. I doppioni oltre il massimo di copie diventano ${ADAM}.</div>
      <div class="shcls">${ALL_CLS.map(c=>`<button class="shc" data-c="${c}" style="--uc:${CLS_COLOR[c]}"><img src="art/eroi/${c}_art.jpg" alt=""><b>${esc(HEROES[c].n)}</b></button>`).join('')}</div>
      <div class="shpacks">${C.packs.map(k=>`<button class="btn shpq" data-id="${k.id}">${esc(k.n)} · ${eurTxt(k.eur)}</button>`).join('')}</div>
      ${ACC()&&Object.keys(o.cpacks||{}).length?`<div class="note" style="text-align:left;max-width:none">Hai pacchetti di classe da aprire: li trovi in <b>Pacchetti</b>.</div>`:''}</div></div>`;
    let cls=SHOP.cls||chosenCls, pid=null;
    const upd=()=>{ const pl=app.querySelector('.shpkl'); if(pl) pl.innerHTML=packArt(true,cls); app.querySelectorAll('.shc').forEach(b=>b.classList.toggle('on',b.dataset.c===cls)); app.querySelectorAll('.shpq').forEach(b=>b.classList.toggle('on',b.dataset.id===pid));
      if(pid){ const k=C.packs.find(x=>x.id===pid); shopPay({kind:'pack',id:pid,cls},`${k.n} — ${HEROES[cls].n}`,eurTxt(k.eur),S); } };
    app.querySelectorAll('.shc').forEach(b=>b.onclick=()=>{ cls=SHOP.cls=b.dataset.c; upd(); });
    app.querySelectorAll('.shpq').forEach(b=>b.onclick=()=>{ pid=b.dataset.id; upd(); });
    upd();
  }
}
// riquadro di pagamento con i pulsanti PayPal per l'articolo scelto
async function shopPay(item,label,price,S){
  const box=$('#shPay'); if(!box) return;
  box.innerHTML=`<div class="shsum"><span>${esc(label)}</span><b>${price}</b></div><div id="ppBtns" class="ppbtns"></div><div class="note shfoot">Pagamento sicuro con PayPal (anche con carta). Nessun dato di pagamento passa dal gioco.</div>`;
  const pb=$('#ppBtns');
  if(!S.active){ pb.innerHTML=`<button class="btn" disabled>Pagamenti in arrivo</button>`; return; }
  if(!ACC()){ pb.innerHTML=`<button class="btn" id="shLog">🔑 Accedi con Google per acquistare</button>`; $('#shLog').onclick=()=>{ const b=document.createElement('button'); b.id='bAcct'; document.body.appendChild(b); b.click(); b.remove(); }; return; }
  try{ const paypal=await loadPayPal(S.clientId); if(!$('#ppBtns')) return; pb.innerHTML='';
    await paypal.Buttons({ style:{layout:'horizontal',height:42,tagline:false,label:item.kind==='dono'?'donate':'pay'},
      createOrder: async()=>{ const r=await shopCall('ordine',{item}); return r.id; },
      onApprove: async(data)=>{ pb.innerHTML='<div class="note">⏳ Confermo il pagamento…</div>';
        try{ const r=await shopCall('conferma',{id:data.orderID}); if(r&&r.profile) setProfile(r.profile); sfx('coin');
          toast(item.kind==='dono'?'Grazie di cuore per il sostegno! ❤':item.kind==='cosm'?'Acquistato: lo trovi in Personalizzazione':'Pacchetti aggiunti: aprili in Pacchetti');
          shopScreen(); }catch(e){ toast(econMsg(e)); shopScreen(); } },
      onCancel: ()=>toast('Pagamento annullato'),
      onError: e=>{ toast('PayPal: '+(e&&e.message?e.message:'errore')); } }).render(pb);
  }catch(e){ pb.innerHTML='<div class="note">PayPal non si carica: controlla la connessione e riprova.</div>'; }
}
// pacchetti di classe comprati: si aprono dalla schermata Pacchetti
async function openClassPackAnim(cls){ const r=await econDo('openClassPack',{cls}); if(!r) return; sfx('rip'); bonusToast(r.res.bonus); toast(`+${r.res.adam} ${ADAM}`);
  revealCards(r.res.cards.map(x=>Object.assign({},x,{extra:x.adam})),{pack:true,packCls:cls,after:()=>packsScreen()}); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('#bShop'); if(!b) return; e.preventDefault(); shopScreen(); });

function setBtn(){ return `<button class="btn sm" id="bSet" title="Impostazioni">⚙</button>`; }
function bindSet(){ const b=$('#bSet'); if(b) b.onclick=()=>settingsBox(); }
function settingsBox(){
  const seg=(k,opts)=>`<div class="seg sset" data-k="${k}">${opts.map(([v,l])=>`<button class="${String(SET[k])===String(v)?'on':''}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const d=modal(`<h3 class="settitle">⚙ Impostazioni</h3>
    <div class="setgrid">
      <div class="sl"><b>Suoni</b></div><div class="seg sset" data-k="__snd"><button class="${SND.on?'on':''}" data-v="1">Accesi</button><button class="${SND.on?'':'on'}" data-v="0">Spenti</button></div>
      <div class="sl"><b>Musica</b><small>Colonna sonora epica in sottofondo.</small></div>${seg('music',[['true','Accesa'],['false','Spenta']])}
      <div class="sl"><b>Volume della musica</b></div><div class="vrow"><input type="range" min="0" max="100" step="1" id="sMvol" value="${SET.mvolv}"><span id="sMvolN">${SET.mvolv}</span></div>
      <div class="sl"><b>Volume degli effetti</b><small>Colpi, carte giocate, turni.</small></div><div class="vrow"><input type="range" min="0" max="100" step="1" id="sSvol" value="${SET.svol}"><span id="sSvolN">${SET.svol}</span></div>
      <div class="sl"><b>Difficoltà del computer</b><small>Difficile: prova ogni mossa prima di sceglierla.</small></div>${seg('diff',[['normale','Normale'],['difficile','Difficile']])}
      <div class="sl"><b>Velocità del computer</b><small>Quanto aspetta tra una mossa e l'altra.</small></div>${seg('speed',[['lenta','Lenta'],['normale','Normale'],['veloce','Veloce']])}
      <div class="sl"><b>Timer del turno</b><small>Solo contro il computer. Online il timer di 1:30 resta sempre.</small></div>${seg('timer',[['true','Attivo'],['false','Spento']])}
      <div class="sl"><b>Testo più grande</b><small>Pop-up, finestre, menu e Diario.</small></div>${seg('big',[['false','No'],['true','Sì']])}
    </div>
    <div class="note" style="margin:12px auto 0"><b>Scorciatoie</b>: <kbd>Spazio</kbd> fine turno · <kbd>F</kbd> schermo intero · <kbd>Esc</kbd> o <b>tasto destro</b> annulla la selezione, il trascinamento o chiude la finestra.</div>
    <div class="row" style="margin-top:12px"><button class="btn" id="mSetOk">Fatto</button></div>`,'setbox');
  d.querySelectorAll('.sset').forEach(g=>g.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    const k=g.dataset.k, v=b.dataset.v;
    if(k==='__snd'){ SND.on=v==='1'; try{ localStorage.setItem('elg_suoni',SND.on?'1':'0'); }catch(e){} const sb=$('#bSnd'); if(sb) sb.textContent=SND.on?'🔊':'🔇'; }
    else SET[k]= v==='true'?true: v==='false'?false: v;
    saveSet(); g.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    if(k==='timer') paintTimer();
    if(k==='music') musicSync();
  }));
  const mv=$('#sMvol'); mv.oninput=()=>{ SET.mvolv=+mv.value; $('#sMvolN').textContent=mv.value; if(SET.music){ if(SET.mvolv>0&&!MUSIC.playing) musicSync(); else MUSIC.setVol(musicGain()); } }; mv.onchange=()=>saveSet();
  const sv=$('#sSvol'); sv.oninput=()=>{ SET.svol=+sv.value; $('#sSvolN').textContent=sv.value; }; sv.onchange=()=>{ saveSet(); sfx('turn'); };
  $('#mSetOk').onclick=()=>{ closeModal(); if(G) render(); else if($('.menu')) menu(); };
}
// Parole chiave presenti nei testi delle carte (per il filtro della Collezione)
let KW_ALL=null;
function allKws(){ if(KW_ALL) return KW_ALL; const set=new Set(); for(const c of Object.values(CARDS)) for(const k of kwsIn(kwHtml(tx(c)||''))) set.add(k); return KW_ALL=[...set].sort((a,b)=>a.localeCompare(b,'it')); }
function cardHasKw(c,k){ return k==='tutte' || kwsIn(kwHtml(tx(c)||'')).includes(k); }
// ======================= ANNULLA (Esc o tasto destro del mouse)
let DRAG_ABORT=null; // impostato dai trascinamenti in corso (attacco / potere)
function cancelAction(){
  kwPopHide(0);
  if(gesture && gesture.mode==='drag'){
    window.removeEventListener('pointermove',gMove); window.removeEventListener('pointerup',gUp); window.removeEventListener('pointercancel',gUp);
    gesture=null; suppressClick=true; setTimeout(()=>suppressClick=false,350);
    if(ghost){ ghost.remove(); ghost=null; } if(cardArrow){ cardArrow.remove(); cardArrow=null; }
    app.querySelectorAll('.hov').forEach(x=>x.classList.remove('hov'));
    sel=null; render(); toast('Carta riportata in mano'); return true;
  }
  if(DRAG_ABORT){ const f=DRAG_ABORT; DRAG_ABORT=null; f(); return true; }
  const ov=$('#ov'); if(ov && !ov.dataset.lock){ closeModal(); return true; }
  if(G && sel){ const k=sel.kind; sel=null; document.querySelectorAll('.dragline').forEach(x=>x.remove()); app.querySelectorAll('.hov').forEach(x=>x.classList.remove('hov')); render();
    toast(k==='attack'?'Attacco annullato':k==='power'?'Potere annullato':'Azione annullata'); return true; }
  return false;
}
// pointerdown: tasto destro da solo; pointermove con button 2: tasto destro premuto durante un trascinamento col sinistro
function rightCancel(e){ if(e.pointerType==='mouse' && e.button===2 && (e.buttons&2) && G){ e.preventDefault(); e.stopPropagation(); cancelAction(); } }
document.addEventListener('pointerdown',rightCancel,true); window.addEventListener('pointermove',rightCancel,true);
document.addEventListener('contextmenu',e=>{ if(G){ const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA')) return; e.preventDefault(); } });
// ======================= SCORCIATOIE DA TASTIERA
document.addEventListener('keydown',e=>{
  const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)) return;
  if(e.key==='Escape'){ if(cancelAction()){ e.preventDefault(); return; } if(G&&!G.over&&!$('#ov')&&!TUT){ e.preventDefault(); askSurrender(); } return; }
  if((e.key==='f'||e.key==='F') && !e.ctrlKey && !e.metaKey && !e.altKey){ e.preventDefault(); toggleFs(); return; }
  if(e.code==='Space' || e.key===' '){
    if(!G || G.over || G.phase!=='play' || G.cur!==me || G.pending.length || $('#ov')) return;
    e.preventDefault(); const b=$('#bEnd'); if(b) b.click();
  }
});
// ======================= MENU
function menu(msg){
  closeModal(); TUT=null; tutBox();
  { const o=ownLoad(); if(o.start && !canPlayCls(chosenCls)) chosenCls=o.start; }
  G=null; NET&&NET.leave&&NET.leave(); NET=null; sel=null;
  app.innerHTML=`<div class="menu">
    <div class="mbg"><div class="mmap"></div><div class="mfog f1"></div><div class="mfog f2"></div><div class="members">${Array.from({length:26},(_,i)=>`<i style="left:${(i*37)%100}%;animation-delay:${(i*0.73)%9}s;animation-duration:${7+(i*1.3)%6}s"></i>`).join('')}</div></div>
    <div class="mside l">${soundBtn()}<span>Suoni</span>${fsBtn()}<span>Schermo</span>${acctBtn()}</div><div class="mside r">${setBtn()}<span>Impostazioni</span>${instBtn()}${langBtn()}</div><button class="shopbtn" id="bShop" title="Negozio"><span class="si">🛒</span><span>Negozio</span></button>
    <header class="mhead"><div class="mtitle2"><span class="orn l">${TORN}</span><h1 aria-label="Elgravion"><span class="tw">ELGRAVI</span><img class="tcoin" src="art/gra_oro.svg" alt=""><span class="tw">N</span></h1><span class="orn r">${TORN}</span></div><div class="tband">${TBAND}</div><div class="sub">Gioco di carte · Primo Set</div></header>
    <div class="mgrid">
    <nav class="mcol left"><div class="mcolh">Grimorio</div>
      <button class="btn mbtn" id="bCol"><i>📜</i><span>Collezione</span></button>
      <button class="btn mbtn" id="bDecks"><i>🂠</i><span>Mazzi</span></button>
      <button class="btn mbtn" id="bPack"><i>🎴</i><span>Pacchetti</span>${ownLoad().packs?`<em class="mbadge">${ownLoad().packs}</em>`:""}</button>
      <div class="note diffnote">${GI} <b>${ownLoad().coins}</b> GRA</div>
      <button class="btn mbtn" id="bGlos"><i>📖</i><span>Glossario</span></button>
    </nav>
    <div class="mcenter"><div class="mpick">Scegli il tuo eroe</div>
    <div class="classes">${ALL_CLS.map(c=>`<div class="cls ${chosenCls===c?'on':''} ${canPlayCls(c)?'':'lockd'}" data-c="${c}" style="--uc:${CLS_COLOR[c]}">
      <div class="frame"><div class="arch"><img class="por" src="art/eroi/${c}_art.jpg" alt=""></div><i class="cr tl"></i><i class="cr tr"></i><i class="cr bl"></i><i class="cr br"></i></div>
      <div class="medal"><img src="art/simboli/${c}.svg" alt=""></div>
      <div class="plate"><b>${esc(HEROES[c].n)}</b><small>${esc(CLASSES[c].region)} · ${esc(HEROES[c].e)}</small><small class="dk ${myDeck(c)?'own':''}">${myDeck(c)?'✦ Il tuo mazzo':baseOwned(c)?'Mazzo base':'🔒 Nessun mazzo'}</small></div>
    </div>`).join('')}</div>
    </div>
    <nav class="mcol right"><div class="mcolh">Battaglia</div>
      ${rankWidget()}
      <button class="btn mbtn big" id="bAI"><i>⚔</i><span>Gioca contro il computer</span></button>
      <div class="note diffnote">Computer: <b>${SET.diff==='difficile'?'Difficile':'Normale'}</b></div>
      <button class="btn mbtn" id="bFind"><i>🔍</i><span>Cerca partita</span></button>
      <button class="btn mbtn" id="bHost"><i>🤝</i><span>Amichevole con codice</span></button>
      <div class="mjoin"><input class="code" id="code" maxlength="5" placeholder="CODICE"><button class="btn" id="bJoin">Unisciti</button></div>
      <button class="btn mbtn" id="bTut"><i>🕯</i><span>Tutorial</span></button>
    </nav>
    </div>
    <div class="note" id="netmsg">${msg?esc(msg):(window.claude?'Online: chi crea la partita dà il codice all\'avversario, che apre questa stessa pagina dal suo account Claude (permesso almeno da Contributor).':window.ELG_NET?'Online: accedi con Google, poi crea una partita e dai il codice all\'avversario, oppure usa Cerca partita.':'Versione scaricabile: gioca contro il computer, apri pacchetti e costruisci mazzi. L\'online arriverà presto.')}</div>
    <div class="note mfoot">Tutte e sei le classi del primo set, con le carte neutrali. Ogni turno dura al massimo 1:30.</div>
  </div>`;
  app.querySelectorAll('.cls').forEach(e=>e.onclick=()=>{ const c=e.dataset.c; if(!canPlayCls(c)){ sfx('end'); return toast(`${HEROES[c].n} è bloccata: costruisci un mazzo valido in Mazzi con le carte che possiedi`); } chosenCls=c; menu(msg); });
  $('#bAI').onclick=()=>{ if(needDeck()) startLocal(); };
  $('#bCol').onclick=()=>collection();
  $('#bDecks').onclick=()=>decksScreen();
  $('#bPack').onclick=()=>packsScreen();
  $('#bTut').onclick=()=>startTutorial();
  $('#bGlos').onclick=()=>glossary();
  $('#bFind').onclick=()=>{ if(needDeck()) findMatchChooser(); };
  { const rb=$('#bRank'); if(rb) rb.onclick=()=>rankScreen(); }
  if(rankLoad().__reward) setTimeout(seasonRewardModal,300);
  bindSound(); bindSet();
  $('#bHost').onclick=()=>{ if(needDeck()) hostOnline(); };
  $('#bJoin').onclick=()=>needDeck()&&joinOnline(($('#code').value||'').trim().toLowerCase());
  if(!ownLoad().start) starterModal();
}


// ======================= GLOSSARIO
const KW_UNIV=['Divinazione','Imboscata','Lascito','Ordalia','Volo','Momentum','Tempra','Estraneo','Pietrifica','Mutare','Acquisisci','Analizza','Esorcizza','Salasso','Empatia','Riscatto','Dono','Predatore','Caccia'];
const KW_CLASS={Scissione:'neutrali',Scava:'minatore',Immersione:'adepto','Via di fuga':'traccia',Innesto:'incisore',Strofa:'sirena',Scaglia:'scudiera'};
const RULES=[
 ['Vittoria','Ogni eroe parte con 35 PF. Vince chi porta l\'eroe avversario a 0 PF. Alcuni effetti aumentano i PF massimi.'],
 ['GRA','La risorsa per giocare le carte. Parti da 1 e ne guadagni 1 in più ogni turno, fino a 11.'],
 ['Mano iniziale','4 carte per entrambi. Puoi rimettere nel mazzo solo le epiche e le leggendarie; comuni e rare restano in mano.'],
 ['Mano massima','11 carte. Una carta pescata con la mano piena viene bruciata. La prima carta bruciata della partita finisce nel Pegno, se è libero.'],
 ['Tavolo','6 slot per giocatore. Un seguace occupa 1 slot; un Dominio ne occupa 2 vicini.'],
 ['Pegno','Il settimo slot: metti una carta coperta e la paghi a rate con il GRA che ti avanza a fine turno. A costo saldato entra in gioco gratis. L\'avversario vede quanto hai versato, non la carta.'],
 ['Slot d\'Emozione','Ogni 3 turni uno dei tuoi slot prende il colore della tua emozione (chi gioca per secondo inizia al turno 2). Un seguace della tua classe giocato lì riceve il bonus della classe. Dal 3° slot d\'Emozione si attiva il <b>Focus</b>: i seguaci della tua classe giocati su uno slot d\'Emozione costano 1 GRA in meno. Lì la Difesa è una soglia: il seguace muore solo se in un turno subisce danni pari o superiori alla Difesa.'],
 ['Focus','Quando hai almeno 3 slot d\'Emozione (il Sigillo della Scudiera conta), i seguaci della tua classe giocati su uno slot d\'Emozione costano 1 GRA in meno. Prima del terzo slot non c\'è sconto.'],
 ['Sconto di recupero','Quando il GRA arriva a 11, chi ha meno slot colorati dell\'avversario ottiene una volta 1 GRA di sconto sulla carta nel Pegno.'],
 ['Mutazione','A 20 PF o meno il tuo eroe Muta: il potere eroe cambia. È permanente. Se passi da sopra 20 a 0 in un colpo muori senza mutare.'],
 ['Nebbia','Pescare con il mazzo vuoto infligge danni crescenti: 1, poi 2, poi 3… Alla quinta volta l\'eroe Muta subito, anche sopra 20 PF.'],
 ['Limiti','Un seguace può avere al massimo 20 Attacco e 20 Difesa. Se più carte si attivano a vicenda in un ciclo, lo stesso effetto si ripete al massimo 15 volte (per le Stelle: 15 volte per turno): poi il ciclo si interrompe. Un seguace può ricevere al massimo 5 Stelle.'],
 ['Ondata di Nebbia','Quando il giocatore che ha iniziato arriva al suo 10° turno (e poi al 20°, al 30°…) la Nebbia avanza: infligge 2 danni a tutti i seguaci in gioco, di entrambi i giocatori, poi ogni giocatore pesca una carta (alla prima ondata chi gioca per secondo ne pesca due). Se la carta pescata è un Seguace, quando lo giochi ottiene <b>Mutare</b>. Lo Scaglia assorbe i danni; i Domini non vengono colpiti. A destra dei Pegni trovi quanti turni mancano.'],
 ['Potere eroe','Costa 2 GRA e si usa una volta per turno. Cambia quando l\'eroe Muta.'],
 ['Dominio','Un luogo di Elgravion. Occupa 2 slot vicini; massimo 1 per giocatore. Ha PF ma i seguaci non possono attaccarlo: lo distruggono solo Rituali o effetti specifici. Se viene distrutto il tuo GRA massimo scende di 1.'],
 ['Tipi di carta','Seguace, Incanto (magia piccola su un seguace), Rituale (magia grande su tutto il campo), Dominio. Le Protesi e le Stelle sono gettoni creati da altre carte.'],
 ['Rarità','Comune fino a 3 copie nel mazzo, rara ed epica fino a 2, leggendaria 1. Il mazzo ha 35 carte.'],
 ['Tribù','Minatore: Noxari e Cultista · Adepto: Spirito e Codalunga · Traccia: Eley e Guida · Incisore: Innestato e Costrutto · Sirena: Ciurma e Thalari · Scudiera: Drago e Imperiale · Neutrali: Mutato e Xeno.'],
];
let GLQ='';
function glossary(){
  const all={...KW_DESC,...KW_POP}; const q=GLQ.toLowerCase(); const hit=(k,t)=>!q||(k+' '+t).toLowerCase().includes(q);
  // testo con <b> ammesso (alcune regole lo usano), il resto come prima
  const txt=t=>kwHtml(t).replace(/&lt;(\/?)b&gt;/g,'<$1b>');
  const RULE_ICON={'Vittoria':'🏆','GRA':`<img src="art/gra_oro.svg" alt="">`,'Mano iniziale':'🂠','Mano massima':'✋','Tavolo':'▦','Pegno':'🔒',"Slot d'Emozione":'❖','Focus':'◎','Sconto di recupero':'↺','Mutazione':'🧬','Nebbia':'🌫','Limiti':'⛔','Ondata di Nebbia':'🌊','Potere eroe':'⚡','Dominio':'🏰','Tipi di carta':'🃏','Rarità':'💎','Tribù':'⚑'};
  const RULE_GROUP=[['Le basi',['Vittoria','GRA','Mano iniziale','Mano massima','Tavolo','Tipi di carta','Rarità','Tribù']],['Meccaniche',['Potere eroe','Pegno',"Slot d'Emozione",'Focus','Sconto di recupero','Dominio','Mutazione']],['Nebbia e limiti',['Nebbia','Ondata di Nebbia','Limiti']]];
  // a quale classe appartiene un termine: quella che lo usa in almeno il 70% delle sue carte
  const termCls=k=>{ const cnt={}; let tot=0; for(const c of Object.values(CARDS)){ if(c.cl==='neutrali'||!(c.x||'').includes(k)) continue; cnt[c.cl]=(cnt[c.cl]||0)+1; tot++; }
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]; return top&&tot>=2&&top[1]/tot>=0.7?top[0]:null; };
  const item=(k,t,o)=>{ o=o||{}; const ic=o.icon!=null?o.icon:(KW_ICON[k]||''); return `<div class="gitem ${o.cls?'gc':''}" ${o.cls?`style="--gc:${CLS_COLOR[o.cls]}"`:''}><div class="gk">${ic?`<i class="gic">${ic}</i>`:''}<b>${esc(k)}</b>${o.extra||''}</div><div class="gt">${txt(t)}</div></div>`; };
  const sec=(id,t,sub,body)=>body?`<section class="gsec" id="${id}"><h3>${t}</h3>${sub?`<div class="gsub">${sub}</div>`:''}${body}</section>`:'';
  // 1) regole, divise in gruppi
  const rmap=Object.fromEntries(RULES); const used=new Set();
  const rules=RULE_GROUP.map(([g,ks])=>{ const arr=ks.filter(k=>rmap[k]&&hit(k,rmap[k])).map(k=>{ used.add(k); return item(k,rmap[k],{icon:RULE_ICON[k]||'•'}); }); return arr.length?`<h4 class="ggr">${g}</h4><div class="ggrid">${arr.join('')}</div>`:''; }).join('')
    +(()=>{ const rest=RULES.filter(([k,t])=>!used.has(k)&&hit(k,t)).map(([k,t])=>item(k,t,{icon:'•'})); return rest.length?`<div class="ggrid">${rest.join('')}</div>`:''; })();
  // 2) parole chiave comuni a tutti
  const univ=KW_UNIV.filter(k=>all[k]&&hit(k,all[k])).map(k=>item(k,all[k]));
  // 3) le classi: parola chiave di classe, bonus dell'Emozione e termini tipici, nel colore della classe
  const skip=['Pietrificare','Muta','Stelle','Uova di Magga e Decreti','Incanto','Rituale','Dominio','Maledizione','Mutazione'];
  const others=Object.keys(all).filter(k=>!KW_UNIV.includes(k)&&!KW_CLASS[k]&&!skip.includes(k));
  const byCls={}; const free=[];
  for(const k of others){ const c=termCls(k); if(c) (byCls[c]=byCls[c]||[]).push(k); else free.push(k); }
  const clsPanels=[...ALL_CLS,'neutrali'].map(c=>{
    const kws=Object.entries(KW_CLASS).filter(([k,cl])=>cl===c&&all[k]&&hit(k,all[k])).map(([k])=>item(k,all[k],{cls:c,icon:KW_ICON[k]||'✦'}));
    const emo=c!=='neutrali'&&EMO_TXT[c]&&hit("Emozione "+HEROES[c].e,EMO_TXT[c])?item('Emozione: '+HEROES[c].e,(c==='scudiera'?'':'Un seguace della classe giocato in uno slot d\'Emozione ')+EMO_TXT[c],{cls:c,icon:'❖'}):'';
    const terms=(byCls[c]||[]).filter(k=>hit(k,all[k])).sort((a,b)=>a.localeCompare(b,'it')).map(k=>item(k,all[k],{cls:c,icon:KW_ICON[k]||'✧'}));
    if(!kws.length&&!emo&&!terms.length) return '';
    const head=c==='neutrali'?`<span class="gch"><b class="nz">◆</b></span><div><b>Neutrali</b><small>Carte di tutte le classi</small></div>`:`<span class="gch"><img src="art/simboli/${c}.svg" alt=""></span><div><b>${esc(HEROES[c].n)}</b><small>${esc(CLASSES[c].region||'')} · Emozione: ${esc(HEROES[c].e)}</small></div>`;
    return `<div class="gcls" style="--uc:${CLS_COLOR[c]}"><div class="gclh">${head}</div><div class="ggrid">${kws.join('')}${emo}${terms.join('')}</div></div>`; }).join('');
  const other=free.filter(k=>hit(k,all[k])).sort((a,b)=>a.localeCompare(b,'it')).map(k=>item(k,all[k]));
  const prevScroll=($('.coll')||{}).scrollTop||0;
  const nav=[['g-reg','📜 Regole'],['g-kw','✦ Parole chiave'],['g-cls','⚔ Classi'],['g-alt','📖 Altri termini']];
  app.innerHTML=`<div class="coll glos"><div class="chead"><button class="btn sm" id="gBack">‹ Menu</button><h2>Glossario</h2><input id="gQ" placeholder="Cerca una parola o una regola…" value="${esc(GLQ)}"></div>
    <nav class="gnav">${nav.map(([id,t])=>`<button class="gnb" data-g="${id}">${t}</button>`).join('')}</nav>
    ${sec('g-reg','Regole del gioco','',rules)}
    ${sec('g-kw','Parole chiave','Valgono per tutte le classi.',univ.length?`<div class="ggrid">${univ.join('')}</div>`:'')}
    ${sec('g-cls','Le classi','Parole chiave, bonus dell\'Emozione e termini tipici di ogni classe, nel suo colore.',clsPanels)}
    ${sec('g-alt','Altri termini delle carte','',other.length?`<div class="ggrid">${other.join('')}</div>`:'')}
    ${!rules&&!univ.length&&!clsPanels&&!other.length?'<div class="note">Nessun risultato.</div>':''}</div>`;
  { const cl=$('.coll'); if(cl) cl.scrollTop=prevScroll; }
  $('#gBack').onclick=()=>menu();
  app.querySelectorAll('.gnb').forEach(b=>b.onclick=()=>{ const t=document.getElementById(b.dataset.g); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); });
  let qt=null; $('#gQ').oninput=e=>{ clearTimeout(qt); const v=e.target.value; qt=setTimeout(()=>{ GLQ=v; glossary(); const f=$('#gQ'); f.focus(); f.setSelectionRange(v.length,v.length); },200); };
}

// ======================= CERCA PARTITA (matchmaking: pronto per un server futuro)
// Quando ci sarà un server, basta impostare MATCH_SERVER con l'indirizzo WebSocket.
// Protocollo previsto:  client -> {type:'search', ver, cls, deckOk}   |   client -> {type:'cancel'}
//                       server -> {type:'queue', pos, wait}           |   server -> {type:'match', role:'host'|'join', code, opp:{cls}}
//                       server -> {type:'error', msg}
const MATCH_SERVER=null; // es. 'wss://elgravion.example/match'
const MATCH_VER=1;
let MM=null;
function mmCode(a,b){ const t=[a,b].sort().join('|'); let h=2166136261; for(const ch of t){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); } return (h>>>0).toString(36).padStart(6,'0').slice(-6); }
// Ricerca automatica: i giocatori in cerca si vedono in una stanza d'attesa (una per Amichevole e una per Classificata),
// si ordinano per grado e si accoppiano a due a due; il codice della partita nasce dai due identificativi.
const MM_WAIT=120000; // dopo 2 minuti senza avversari la ricerca si ferma
async function findMatch(mode,t0){
  t0=t0||Date.now();
  mode=mode==='classificata'?'classificata':'amichevole'; const ranked=mode==='classificata'; closeModal();
  const h=HEROES[chosenCls]; let secs=Math.floor((Date.now()-t0)/1000);
  const d=modal(`<div class="mm ${ranked?'rk':''}"><div class="mmring"><img src="art/eroi/${chosenCls}_art.jpg" alt=""></div>
    <h3>${ranked?'Classificata':'Amichevole'}</h3>${ranked?`<div class="mmrank">${esc(rankName())}</div>`:''}<div class="note" id="mmTxt">Cerco un avversario per ${esc(h.n)}…</div><div class="mmtime" id="mmTime">${Math.floor(secs/60)}:${String(secs%60).padStart(2,'0')}</div>
    <div class="row"><button class="btn" id="mmCancel">Annulla</button></div></div>`,'mmbox');
  d.dataset.lock=1;
  const st={done:false,mm:null,timer:null}; MM=st;
  const tick=setInterval(()=>{ secs++; const t=$('#mmTime'); if(t) t.textContent=Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0'); },1000);
  const end=()=>{ st.done=true; clearInterval(tick); clearInterval(st.timer); try{ st.mm&&st.mm.leave(); }catch(e){} if(MM===st) MM=null; };
  $('#mmCancel').onclick=()=>{ end(); closeModal(); };
  const offline=txt=>{ end(); const t=$('#mmTxt'); if(!t) return; d.querySelector('.mm').classList.add('off'); t.innerHTML=txt; $('#mmTime').textContent='';
    d.querySelector('.row').innerHTML='<button class="btn" id="mmAI">Gioca contro il computer</button><button class="btn" id="mmClose">Chiudi</button>';
    $('#mmAI').onclick=()=>{ closeModal(); startLocal(); }; $('#mmClose').onclick=closeModal; };
  const room=await getRoom(); if(st.done) return;
  if(!room) return offline((window.claude?'La ricerca online non è disponibile in questa vista: apri il gioco dal suo link su claude.ai, con un account che può giocare online.':window.ELG_NET?'Collegamento non riuscito: controlla la connessione e di aver fatto l\'accesso con Google.':'Il gioco online e la Classificata arriveranno presto nella versione scaricabile. Intanto puoi giocare contro il computer.'));
  let mm; try{ mm=await room.join('elg-mm-'+(ranked?'rk':'am')+'-v'+MATCH_VER); }catch(e){ return offline('Impossibile entrare nella sala d\'attesa ('+(e.code||'errore')+').'); }
  if(st.done){ try{ mm.leave(); }catch(e){} return; }
  st.mm=mm; const myId=Math.random().toString(36).slice(2,10);
  try{ await mm.presence({seek:{id:myId,score:ranked?rankScore():0,cls:chosenCls,v:MATCH_VER}}); }catch(e){}
  let last=null, stable=0;
  st.timer=setInterval(()=>{ if(st.done) return;
    const all=mm.peers().map(p=>p.presence&&p.presence.seek).filter(x=>x&&x.id&&x.v===MATCH_VER);
    const list=[...new Map(all.map(x=>[x.id,x])).values()].sort((a,b)=>(a.score-b.score)||(a.id<b.id?-1:1));
    const i=list.findIndex(x=>x.id===myId); if(i<0) return;
    const partner=list[i%2===0?i+1:i-1]; const t=$('#mmTxt');
    if(!partner){ last=null; stable=0; if(Date.now()-t0>MM_WAIT) return offline('Al momento non ci sono giocatori attivi. Riprova più tardi, oppure gioca contro il computer.'); if(t) t.textContent=list.length>1?'Sto abbinando gli avversari…':'In attesa di un avversario…'; return; }
    if(t) t.textContent='Avversario trovato: collegamento…';
    if(partner.id===last) stable++; else { last=partner.id; stable=1; }
    if(stable<3) return;
    const code=(ranked&&SRV()?'rk':'')+mmCode(myId,partner.id), host=myId<partner.id; end(); closeModal();
    if(host) hostOnline(code,{ranked,mode,t0}); else joinOnline(code,{ranked,mode,t0});
  },700);
}

// ======================= MAZZI (uno per classe, salvati in questo browser)
const DKEY='elgravion_mazzi_v1'; let DECKS_MEM=null;
function loadDecks(){ if(DECKS_MEM) return DECKS_MEM; try{ DECKS_MEM=JSON.parse(localStorage.getItem(DKEY)||'{}')||{}; }catch(e){ DECKS_MEM={}; } return DECKS_MEM; }
function saveDecks(){ if(ACC()){ decksPush(); return true; } try{ localStorage.setItem(DKEY,JSON.stringify(DECKS_MEM||{})); return true; }catch(e){ return false; } }
function deckOk(cls,d){ return !!d && E.deckCheck(cls,d).ok && !deckOwnErrs(d).length; }
function myDeck(cls){ const d=loadDecks()[cls]; return deckOk(cls,d)?d:null; }
function deckFor(cls){ return myDeck(cls)||null; }
function deckCount(list){ return list.reduce((m,[,k])=>m+k,0); }
function decksScreen(){
  G=null; NET&&NET.leave&&NET.leave(); NET=null; const all=loadDecks();
  app.innerHTML=`<div class="coll"><div class="chead"><button class="btn sm" id="cBack">‹ Menu</button><h2>I tuoi mazzi</h2><span class="pill">1 mazzo per classe · 35 carte</span></div>
    <div class="note" style="max-width:none;text-align:left">Regole: 35 carte della classe o neutrali; comuni fino a 3 copie, rare ed epiche fino a 2, leggendarie 1; almeno 1 leggendaria, 4 comuni, 1 Incanto e 1 Rituale. Puoi usare solo le carte che possiedi: le altre si trovano nei <b>Pacchetti</b>. Il mazzo base è giocabile solo se ne possiedi tutte le carte (all'inizio quello della classe scelta). Un mazzo valido viene usato in partita al posto del mazzo base, contro il computer e online.</div>
    <div class="dgrid">${COL_TABS.filter(k=>k!=='neutrali').map(k=>{ const d=all[k]; const chk=d?E.deckCheck(k,d):null; const h=HEROES[k];
      return `<div class="dslot" style="--uc:${CLS_COLOR[k]}"><img src="${h.img}" alt="" data-hero="${k}"><div class="di"><b>${esc(h.n)}</b>
        <small>${d?(chk.ok&&!deckOwnErrs(d).length?'<span class="okc">✔ Il tuo mazzo è valido e verrà usato</span>':chk.ok?`<span class="koc">✖ Contiene carte che non possiedi: ${baseOwned(k)?'in partita si usa il mazzo base':'classe bloccata'}</span>`:`<span class="koc">✖ Incompleto (${chk.tot}/35): ${baseOwned(k)?'in partita si usa il mazzo base':'classe bloccata'}</span>`):baseOwned(k)?'Mazzo base (nessun mazzo personale)':'<span class="koc">🔒 Classe bloccata: costruisci un mazzo valido con le tue carte</span>'}</small>
        <div class="row" style="justify-content:flex-start;gap:6px">${d?`<button class="btn sm" data-ed="${k}">Modifica</button><button class="btn sm" data-del="${k}">Elimina</button>`:`<button class="btn sm" data-new="${k}" title="Copia il mazzo base con le carte che possiedi">Crea dal mazzo base</button><button class="btn sm" data-empty="${k}">Crea vuoto</button>`}</div></div></div>`; }).join('')}</div></div>`;
  $('#cBack').onclick=()=>menu();
  app.querySelectorAll('[data-ed]').forEach(e=>e.onclick=()=>deckEditor(e.dataset.ed));
  app.querySelectorAll('[data-new]').forEach(e=>e.onclick=()=>{ all[e.dataset.new]=ownedCopy(E.DECKS[e.dataset.new]); saveDecks(); deckEditor(e.dataset.new); });
  app.querySelectorAll('[data-empty]').forEach(e=>e.onclick=()=>{ all[e.dataset.empty]=[]; saveDecks(); deckEditor(e.dataset.empty); });
  app.querySelectorAll('[data-del]').forEach(e=>e.onclick=()=>{ const k=e.dataset.del; modal(`<h3>Eliminare il mazzo ${esc(HEROES[k].n)}?</h3><div class="note" style="margin:0 auto 10px">In partita tornerai a usare il mazzo base.</div><div class="row"><button class="btn" id="mYes2">Elimina</button><button class="btn" id="mNo2">Annulla</button></div>`);
    $('#mYes2').onclick=()=>{ delete all[k]; saveDecks(); closeModal(); decksScreen(); }; $('#mNo2').onclick=closeModal; });
}
const DED={cost:'tutti',q:'',side:'classe',kw:'tutte',own:false};
function deckEditor(cls){
  const prevScroll=($('.dpool')||{}).scrollTop||0;
  const all=loadDecks(); const list=all[cls]=all[cls]||[];
  const get=n=>(list.find(x=>x[0]===n)||[0,0])[1];
  const set=(n,k)=>{ const i=list.findIndex(x=>x[0]===n); if(k<=0){ if(i>=0) list.splice(i,1); } else if(i>=0) list[i][1]=k; else list.push([n,k]); saveDecks(); };
  const tot=deckCount(list); const chk=E.deckCheck(cls,list); const ownErr=deckOwnErrs(list);
  const pool=Object.values(CARDS).filter(c=>(DED.side==='classe'?c.cl===cls:c.cl==='neutrali')&&c.r!=='Gettone')
    .filter(c=>DED.cost==='tutti'||(+DED.cost===8?c.c>=8:c.c===+DED.cost))
    .filter(c=>cardHasKw(c,DED.kw))
    .filter(c=>!DED.own||owned(c.n)>0)
    .filter(c=>!DED.q||(c.n+' '+c.x+' '+(c.tr||'')).toLowerCase().includes(DED.q.toLowerCase()))
    .sort((a,b)=>(a.c-b.c)||(RAR_ORD[a.r]-RAR_ORD[b.r])||a.n.localeCompare(b.n));
  const rows=[...list].sort((a,b)=>(CARDS[a[0]].c-CARDS[b[0]].c)||a[0].localeCompare(b[0]));
  const curve=[0,1,2,3,4,5,6,7].map(k=>list.filter(([n])=>k===7?CARDS[n].c>=7:CARDS[n].c===k).reduce((m,[,q])=>m+q,0)); const cmax=Math.max(1,...curve);
  const h=HEROES[cls];
  app.innerHTML=`<div class="ded" style="--uc:${CLS_COLOR[cls]}">
    <div class="chead"><button class="btn sm" id="dBack">‹ Mazzi</button><img class="dh" src="${h.img}" alt="" data-hero="${cls}"><h2>${esc(h.n)}</h2><span class="pill ${chk.ok&&!ownErr.length?'okp':''}">${tot}/35</span></div>
    <div class="dbody">
      <div class="dpoolw">
        <div class="cfil"><div class="seg"><button class="${DED.side==='classe'?'on':''}" data-side="classe">${esc(CLASSES[cls].short)}</button><button class="${DED.side==='neutrali'?'on':''}" data-side="neutrali">Neutrali</button></div>
          <select id="dCost">${[['tutti','Tutti i costi'],[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6'],[7,'7'],[8,'8+']].map(([v,l])=>`<option value="${v}" ${String(DED.cost)===String(v)?'selected':''}>${l}</option>`).join('')}</select><select id="dKw">${[['tutte','Tutte le parole chiave'],...allKws().map(k=>[k,k])].map(([v,l])=>`<option value="${esc(v)}" ${DED.kw===v?'selected':''}>${esc(l)}</option>`).join('')}</select>
          <input id="dQ" placeholder="Cerca…" value="${esc(DED.q)}"><label class="ftok"><input type="checkbox" id="dOwn" ${DED.own?'checked':''}> Solo possedute</label></div>
        <div class="dpool">${pool.map(c=>{ const k=get(c.n), mx=Math.min(E.MAX_COPIES[c.r],owned(c.n)); return `<div class="dpc ${k>=mx?'full':''} ${owned(c.n)?'':'nown'}">${colCard(c,`data-add="${esc(c.n)}"`)}<div class="dcnt">${owned(c.n)?`${k}/${mx}`:'🔒 Non posseduta'}</div><button class="dinfo" data-info="${esc(c.n)}" title="Dettagli">🔍</button>${k>0?`<button class="dminus" data-minus="${esc(c.n)}" title="Togli una copia">−</button>`:''}</div>`; }).join('')}</div>
      </div>
      <div class="dlist">
        <div class="drules">${chk.rules.map(([ok,t])=>`<div class="${ok?'okc':'koc'}">${ok?'✔':'✖'} ${esc(t)}</div>`).join('')}${chk.errs.map(t=>`<div class="koc">✖ ${esc(t)}</div>`).join('')}${ownErr.length?`<div class="koc">✖ Carte non possedute: ${esc(ownErr.join(', '))}</div>`:''}</div>
        <div class="dcurve">${curve.map((v,i)=>`<div><span style="height:${Math.round(v/cmax*40)}px"></span><i>${v}</i><b>${i===7?'7+':i}</b></div>`).join('')}</div>
        <div class="drows">${rows.map(([n,k])=>{ const c=CARDS[n]; return `<div class="drow ${c.r==='Leggendaria'?'lg':''}" data-rem="${esc(n)}" style="--uc:${CLS_COLOR[c.cl]}"><span class="dc">${c.c}</span><span class="dn">${esc(n)}</span>${rarGem(c,true)}<span class="dq">×${k}</span></div>`; }).join('')||'<div class="note">Tocca le carte a sinistra per aggiungerle. Tocca una riga qui per toglierne una copia.</div>'}</div>
        <div class="row"><button class="btn sm" id="dClear">Svuota</button><button class="btn sm" id="dBase">Ripristina mazzo base</button></div>
      </div>
    </div></div>`;
  { const pl=$('.dpool'); if(pl) pl.scrollTop=prevScroll; }
  $('#dBack').onclick=()=>decksScreen();
  app.querySelectorAll('[data-side]').forEach(e=>e.onclick=()=>{ DED.side=e.dataset.side; const p=$('.dpool'); if(p) p.scrollTop=0; deckEditor(cls); });
  $('#dCost').onchange=e=>{ DED.cost=e.target.value; deckEditor(cls); };
  $('#dKw').onchange=e=>{ DED.kw=e.target.value; deckEditor(cls); };
  $('#dOwn').onchange=e=>{ DED.own=e.target.checked; deckEditor(cls); };
  let qt=null; $('#dQ').oninput=e=>{ clearTimeout(qt); const v=e.target.value; qt=setTimeout(()=>{ DED.q=v; deckEditor(cls); const f=$('#dQ'); f.focus(); f.setSelectionRange(v.length,v.length); },250); };
  app.querySelectorAll('[data-add]').forEach(e=>e.onclick=()=>{ const n=e.dataset.add, c=CARDS[n]; const k=get(n);
    if(!owned(n)) return cardModal(c,()=>deckEditor(cls),()=>'<div class="note" style="margin:8px auto 0">Non possiedi questa carta: trovala nei pacchetti o creala con i GRA.</div>');
    if(k>=owned(n) && owned(n)<E.MAX_COPIES[c.r]) return toast(`Ne possiedi solo ${owned(n)}: creane un'altra dalla 🔍`);
    if(k>=E.MAX_COPIES[c.r]) return toast(`${c.r}: massimo ${E.MAX_COPIES[c.r]} ${E.MAX_COPIES[c.r]>1?'copie':'copia'}`);
    if(deckCount(list)>=35) return toast('Il mazzo ha già 35 carte'); set(n,k+1); deckEditor(cls); });
  app.querySelectorAll('[data-info]').forEach(e=>e.onclick=ev=>{ ev.stopPropagation(); cardModal(CARDS[e.dataset.info],()=>deckEditor(cls)); });
  app.querySelectorAll('[data-rem]').forEach(e=>e.onclick=()=>{ const n=e.dataset.rem; set(n,get(n)-1); deckEditor(cls); });
  app.querySelectorAll('[data-minus]').forEach(e=>e.onclick=ev=>{ ev.stopPropagation(); const n=e.dataset.minus; set(n,get(n)-1); deckEditor(cls); });
  $('#dClear').onclick=()=>{ list.length=0; saveDecks(); deckEditor(cls); };
  $('#dBase').onclick=()=>{ list.length=0; for(const x of ownedCopy(E.DECKS[cls])) list.push(x); saveDecks(); deckEditor(cls); };
}

// ======================= PACCHETTI E CARTE POSSEDUTE (salvati in questo browser)
const OKEY='elg_collezione_v2';
// Valore delle carte in GRA (la moneta della collezione): creare costa CRAFT, vendere rende SELL.
const CRAFT={Comune:50,Rara:150,Epica:500,Leggendaria:1500};
const SELL={Comune:5,Rara:15,Epica:50,Leggendaria:150};
const GI='<img class="gi" src="art/gra_oro.svg" alt="GRA">';
const PACK={size:5,cost:CRAFT.Comune*3,winAmt:100,lossAmt:10,startGra:100,classBonus:300,neutralBonus:150,pity:15,
  odds:[['Leggendaria',0.02],['Epica',0.08],['Rara',0.20],['Comune',0.70]],
  last:[['Leggendaria',0.02],['Epica',0.08],['Rara',0.90]],
  surplus:SELL};
const RAR_COL={Comune:'#c9c3b8',Rara:'#5aa8ff',Epica:'#c27bff',Leggendaria:'#ffb84a'};
let OWN=null;
function ownLoad(){
  if(OWN) return OWN; let o=null; try{ o=JSON.parse(localStorage.getItem(OKEY)||'null'); }catch(e){}
  if(!o||!o.cards) o={cards:{},coins:0,games:0,wins:0,packs:0,pity:0,opened:0,start:null};
  if(o.start && !o.gStart){ o.gStart=1; o.coins+=PACK.startGra; OWN=o; ownSave(); }
  return OWN=o;
}
// Dono iniziale: il mazzo base della classe scelta, più carte casuali non possedute di qualsiasi classe:
// una seconda leggendaria, un Dominio (luogo), un Rituale, un Incanto e 10 comuni diverse non presenti nel mazzo base.
function grantStarter(cls){
  const o=ownLoad(); o.cards={}; o.start=cls;
  for(const [n,q] of E.DECKS[cls]) o.cards[n]=Math.min(E.MAX_COPIES[CARDS[n].r],(o.cards[n]||0)+q);
  const pick=(f,k)=>{ const out=[]; for(let t=0;t<k;t++){ const pool=collectible().filter(c=>f(c)&&!o.cards[c.n]); if(!pool.length) break; const c=pool[Math.floor(Math.random()*pool.length)]; o.cards[c.n]=1; out.push(c); } return out; };
  const gifts=[...pick(c=>c.r==='Comune',10), ...pick(c=>c.t==='Incanto',1), ...pick(c=>c.t==='Rituale',1), ...pick(c=>c.t==='Dominio',1), ...pick(c=>c.r==='Leggendaria',1)];
  const res=gifts.map(c=>{ o.cards[c.n]=1; return {n:c.n,r:c.r,nuova:true}; });
  o.coins=PACK.startGra; o.gStart=1; o.done={}; checkClassBonus(true); ownSave(); return res;
}
// premio una tantum quando possiedi tutte le carte di una classe (al numero massimo di copie)
function classComplete(cls){ return collectible().filter(c=>c.cl===cls).every(c=>owned(c.n)>=E.MAX_COPIES[c.r]); }
function checkClassBonus(silent){ if(ACC()) return []; const o=ownLoad(); o.done=o.done||{}; let got=[];
  let tot=0; for(const k of [...ALL_CLS,'neutrali']) if(!o.done[k] && classComplete(k)){ o.done[k]=1; const v=k==='neutrali'?PACK.neutralBonus:PACK.classBonus; o.coins+=v; tot+=v; got.push(k); }
  if(got.length){ ownSave(); if(!silent){ sfx('leg'); toast(`Collezione completa: ${got.map(k=>k==='neutrali'?'Neutrali':HEROES[k].n).join(', ')}! +${tot} GRA`); } } return got; }
function baseOwned(cls){ return E.DECKS[cls].every(([n,q])=>owned(n)>=q); }
function canPlayCls(cls){ return !!myDeck(cls) || baseOwned(cls); }
function needDeck(){ if(canPlayCls(chosenCls)) return true; toast(`Non hai un mazzo valido per ${HEROES[chosenCls].n}: costruiscilo in Mazzi con le carte che possiedi`); return false; }
function starterModal(){
  const d=modal(`<div class="mtitle"><span class="orn">❧</span><h3>Benvenuto in Elgravion</h3><span class="orn r">❧</span></div>
    <div class="note" style="margin:0 auto 12px">Scegli la classe con cui iniziare: riceverai il suo <b>mazzo base completo</b>, più in dono una seconda leggendaria, un Dominio, un Rituale, un Incanto e 10 comuni casuali. Le altre classi si sbloccano costruendo un mazzo con le carte trovate nei pacchetti.</div>
    <div class="stgrid">${ALL_CLS.map(c=>`<button class="stc" data-st="${c}" style="--uc:${CLS_COLOR[c]}"><img src="art/eroi/${c}_art.jpg" alt=""><b>${esc(HEROES[c].n)}</b><small>${esc(CLASSES[c].region)} · ${esc(HEROES[c].e)}</small></button>`).join('')}</div>`,'stbox');
  d.dataset.lock=1;
  d.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>{ const cls=b.dataset.st;
    const m2=modal(`<h3>Iniziare con ${esc(HEROES[cls].n)}?</h3><div class="note" style="margin:0 auto 10px">La scelta non si può cambiare.</div><div class="row"><button class="btn" id="stYes">Conferma</button><button class="btn" id="stNo">Indietro</button></div>`); m2.dataset.lock=1;
    $('#stNo').onclick=()=>starterModal();
    $('#stYes').onclick=async()=>{ let res; if(ACC()){ const r=await econDo('starter',{cls}); if(!r) return; res=r.res; } else res=grantStarter(cls); chosenCls=cls; sfx('burst'); revealCards(res,{title:'I tuoi doni di benvenuto',after:()=>menu()}); }; });
}
function ownSave(){ if(ACC()) return; try{ localStorage.setItem(OKEY,JSON.stringify(OWN)); }catch(e){} }
function owned(n){ return ownLoad().cards[n]||0; }
function collectible(){ return Object.values(CARDS).filter(c=>c.r!=='Gettone'); }
function ownedCopy(list){ return list.map(([n,k])=>[n,Math.min(k,owned(n))]).filter(([,k])=>k>0); }
function deckOwnErrs(list){ return (list||[]).filter(([n,k])=>k>owned(n)).map(([n,k])=>`${n} (ne hai ${owned(n)} su ${k})`); }
function rollRar(tab){ let r=Math.random(); for(const [k,p] of tab){ if(r<p) return k; r-=p; } return tab[tab.length-1][0]; }
function openPack(){
  const o=ownLoad(); if(o.packs<=0) return null; o.packs--;
  const res=[]; let leg=false;
  for(let i=0;i<PACK.size;i++){
    let r=rollRar(i===PACK.size-1?PACK.last:PACK.odds);
    if(i===PACK.size-1 && !leg && o.pity>=PACK.pity) r='Leggendaria';
    if(r==='Leggendaria') leg=true;
    const pool=collectible().filter(c=>c.r===r); const c=pool[Math.floor(Math.random()*pool.length)];
    res.push({n:c.n,r});
  }
  // le carte rare escono per ultime, come nei pacchetti veri
  res.sort((a,b)=>RAR_ORD[a.r]-RAR_ORD[b.r]);
  for(const x of res){ const have=o.cards[x.n]||0, mx=E.MAX_COPIES[x.r];
    if(have<mx){ o.cards[x.n]=have+1; x.nuova=have===0; } else { x.extra=PACK.surplus[x.r]; o.coins+=x.extra; } }
  o.pity=leg?0:o.pity+1; o.opened++; ownSave(); setTimeout(()=>checkClassBonus(),3000); return res;
}
function buyPack(){ const o=ownLoad(); if(o.coins<PACK.cost) return false; o.coins-=PACK.cost; o.packs++; ownSave(); return true; }
function gameReward(){
  if(!G||G.__rew) return G&&G.__rew; if(TUT){ G.__rew={none:1}; return G.__rew; }
  if(ACC()){ const g=G;
    if(NET&&NET.srv) return G.__rew={pending:true};
    if(vsAI&&G.rec){ G.__rew={pending:true};
      econDo('claimAi',{rec:G.rec},true).then(r=>{ g.__rew=r&&r.res?r.res:{none:1,why:'Premio non verificato.'}; const el=document.querySelector('.endrew'); if(el&&G===g) el.outerHTML=rewardHtml(); });
      return G.__rew; }
    return G.__rew={none:1};
  }
  const o=ownLoad(); o.games++; o.wins=o.wins||0; const win=G.winner===me; if(win) o.wins++;
  const got=win?PACK.winAmt:PACK.lossAmt; o.coins+=got;
  ownSave(); return G.__rew={got,win};
}
// creare e vendere carte
function craftCard(n){ const c=CARDS[n], o=ownLoad(); if(!c||c.r==='Gettone') return false; if(owned(n)>=E.MAX_COPIES[c.r]||o.coins<CRAFT[c.r]) return false; o.coins-=CRAFT[c.r]; o.cards[n]=owned(n)+1; ownSave(); checkClassBonus(); return true; }
function sellCard(n){ const c=CARDS[n], o=ownLoad(); if(!c||owned(n)<=0) return false; o.coins+=SELL[c.r]; o.cards[n]=owned(n)-1; if(!o.cards[n]) delete o.cards[n]; ownSave(); return true; }
function craftBar(c){ if(!c||c.r==='Gettone') return ''; const k=owned(c.n), mx=E.MAX_COPIES[c.r], o=ownLoad();
  return `<div class="craft"><div class="crinfo">Possiedi <b>${k}/${mx}</b> · hai ${GI} <b>${o.coins}</b></div><div class="row"><button class="btn" id="crMake" ${k<mx&&o.coins>=CRAFT[c.r]?'':'disabled'}>Crea · ${CRAFT[c.r]} ${GI}</button>${ACC()&&(o.adam|0)>0?`<button class="btn" id="crMakeA" ${k<mx&&o.adam>=CRAFT[c.r]?'':'disabled'} title="${ADAM}: serve solo a creare carte">Crea · ${CRAFT[c.r]} ${AI_}</button>`:''}<button class="btn" id="crSell" ${k>0?'':'disabled'}>Vendi · +${SELL[c.r]} ${GI}</button></div>${k>=mx?'<div class="crnote">Hai già il massimo di copie per un mazzo.</div>':o.coins<CRAFT[c.r]?`<div class="crnote">Ti mancano ${CRAFT[c.r]-o.coins} GRA per crearla.</div>`:''}</div>`; }
// finestra di una carta con Crea/Vendi; refresh() ridisegna la schermata sotto
function cardModal(c,refresh,extraHtml){
  const d=modal(`${bigCard(c)}${extraHtml?extraHtml():''}${craftBar(c)}<div class="row" style="margin-top:10px"><button class="btn" id="mClose">Chiudi</button></div>`);
  $('#mClose').onclick=()=>{ closeModal(); refresh&&refresh(); };
  d.onclick=e=>{ if(e.target===d){ closeModal(); refresh&&refresh(); } };
  const ma=$('#crMakeA'); if(ma) ma.onclick=async()=>{ const r=await econDo('craft',{n:c.n,cur:'adam'}); if(r){ bonusToast(r.res&&r.res.bonus); sfx('epic'); toast(`Hai creato ${c.n}`); cardModal(c,refresh,extraHtml); } };
  const mk=$('#crMake'); if(mk) mk.onclick=async()=>{ if(await craftX(c.n)){ sfx('epic'); toast(`Hai creato ${c.n}`); cardModal(c,refresh,extraHtml); } };
  const sl=$('#crSell'); if(sl) sl.onclick=()=>{ const k=owned(c.n); const all=loadDecks(); const hit=Object.entries(all).filter(([cls,l])=>(l||[]).some(([n,q])=>n===c.n&&q>k-1)).map(([cls])=>HEROES[cls].n);
    const base=Object.keys(E.DECKS).filter(cls=>baseOwned(cls)&&E.DECKS[cls].some(([n,q])=>n===c.n&&q>k-1)).map(cls=>HEROES[cls].n);
    const m=modal(`<h3>Vendere ${esc(c.n)}?</h3><div class="note" style="margin:0 auto 10px">Riceverai <b>${SELL[c.r]} GRA</b>; ricrearla costa ${CRAFT[c.r]} GRA.${hit.length?`<br><b class="koc">Il tuo mazzo ${esc(hit.join(', '))} non sarà più valido.</b>`:''}${base.length?`<br><b class="koc">Non avrai più tutto il mazzo base di ${esc(base.join(', '))}.</b>`:''}</div><div class="row"><button class="btn" id="slYes">Vendi</button><button class="btn" id="slNo">Annulla</button></div>`);
    $('#slNo').onclick=()=>cardModal(c,refresh,extraHtml);
    $('#slYes').onclick=async()=>{ if(await sellX(c.n)){ sfx('coin'); toast(`Venduta: +${SELL[c.r]} GRA`); } cardModal(c,refresh,extraHtml); }; };
  return d;
}
function rewardHtml(){ const r=G&&G.__rew; if(!r) return '';
  if(r.none) return r.why?`<div class="endrew off">${esc(r.why)}</div>`:'';
  if(r.pending) return `<div class="endrew wait">⏳ Il server sta verificando il premio…</div>`;
  if(r.cap) return `<div class="endrew off">Premio giornaliero esaurito: domani altre partite premiate · hai ${ownLoad().coins} ${GI}</div>`;
  return `<div class="endrew">${GI} <b>+${r.got} GRA</b> per la ${r.win?'vittoria':'sconfitta'} · ora ne hai ${ownLoad().coins}</div>`; }
function packArt(big,cls){
  const cc=cls&&CLS_COLOR[cls]?` style="--pc:${CLS_COLOR[cls]}"`:'';
  const corner=`<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M3 37V12Q3 3 12 3h25" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 37V15q0-7 7-7h22" fill="none" stroke="currentColor" stroke-width="1" opacity=".6"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/></svg>`;
  const orn=`<svg class="pk-orn" viewBox="0 0 120 120" aria-hidden="true"><g fill="none" stroke="currentColor"><path d="M60 6 114 60 60 114 6 60Z" stroke-width="2"/><path d="M60 20 100 60 60 100 20 60Z" stroke-width="1" opacity=".7"/><circle cx="60" cy="60" r="26" stroke-width="1.5"/><circle cx="60" cy="60" r="31" stroke-width=".8" opacity=".6" stroke-dasharray="2 4"/><path d="M60 34v52M34 60h52" stroke-width=".8" opacity=".5"/></g>${cls?`<image href="art/simboli/${cls}.svg" x="40" y="40" width="40" height="40"/>`:`<path d="M60 44l5 11 11 5-11 5-5 11-5-11-11-5 11-5z" fill="currentColor"/>`}</svg>`;
  return `<div class="pack ${big?'big':''} ${cls?'pcls':''}"${cc}><div class="pk-in">
    <div class="pk-top"></div><div class="pk-frame"></div>
    ${['tl','tr','bl','br'].map(p=>`<i class="pk-c ${p}">${corner}</i>`).join('')}
    ${orn}
    <div class="pk-t"><span class="tw">ELGRAVI</span><img class="pk-coin" src="art/gra_oro.svg" alt="O"><span class="tw">N</span></div>
    <div class="pk-rule"><i></i><b>✦</b><i></i></div>
    <div class="pk-s">${cls?esc(HEROES[cls].n):'Primo Set'}<small>5 carte</small></div>
    <div class="pk-bot"></div></div></div>`; }
function packsScreen(){
  G=null; NET&&NET.leave&&NET.leave(); NET=null; closeModal(); const o=ownLoad();
  const all=collectible(); const have=all.filter(c=>owned(c.n)>0).length;
  const byR=['Comune','Rara','Epica','Leggendaria'].map(r=>{ const l=all.filter(c=>c.r===r); return [r,l.filter(c=>owned(c.n)>0).length,l.length]; });
  const toPity=Math.max(1,PACK.pity+1-o.pity);
  app.innerHTML=`<div class="coll packs"><div class="chead"><button class="btn sm" id="cBack">‹ Menu</button><h2>Pacchetti</h2><span class="pill coin">${GI} ${o.coins}</span>${ACC()&&(o.adam|0)?`<span class="pill adam" title="${ADAM}: serve solo a creare carte">${AI_} ${o.adam}</span>`:''}</div>
    <div class="pkmain">
      <div class="pkleft">${packArt(true)}<div class="pkcount">${o.packs?`Hai <b>${o.packs}</b> ${o.packs===1?'pacchetto':'pacchetti'} da aprire`:'Nessun pacchetto da aprire'}</div>
        ${ACC()&&Object.keys(o.cpacks||{}).length?`<div class="cpacks"><b>Pacchetti di classe</b>${Object.entries(o.cpacks).map(([c,n])=>`<button class="btn sm cpo" data-c="${c}" style="--uc:${CLS_COLOR[c]}">${esc(HEROES[c].n)} · ${n} <span>Apri</span></button>`).join('')}</div>`:''}
        <div class="row"><button class="btn big" id="pOpen" ${o.packs?'':'disabled'}>Apri pacchetto</button><button class="btn" id="pBuy" ${o.coins>=PACK.cost?'':'disabled'}>Compra · ${PACK.cost} ${GI}</button></div></div>
      <div class="pkinfo"><h3>Cosa contiene</h3>
        <div class="note" style="text-align:left;max-width:none">Ogni pacchetto ha <b>${PACK.size} carte</b> di qualsiasi classe o neutrali. La quinta carta è sempre almeno <b style="color:${RAR_COL.Rara}">Rara</b>.</div>
        <div class="pkodds">${PACK.odds.slice().reverse().map(([r,p])=>`<div><i style="background:${RAR_COL[r]}"></i><span>${r}</span><b>${Math.round(p*100)}%</b></div>`).join('')}</div>
        <div class="note" style="text-align:left;max-width:none">✦ Leggendaria garantita: se non ne trovi, il <b>${o.pity>=PACK.pity?'prossimo pacchetto':toPity+'° pacchetto da ora'}</b> ne contiene sicuramente una.<br>${GI} Ricevi <b>${PACK.winAmt} GRA per ogni vittoria</b> e <b>${PACK.lossAmt} per ogni sconfitta</b> (contro il computer o online). Completare tutte le carte di una classe dà <b>${PACK.classBonus} GRA</b>, le neutrali <b>${PACK.neutralBonus} GRA</b>.<br>⚒ Valore delle carte — crea / vendi: ${['Comune','Rara','Epica','Leggendaria'].map(r=>`<span style="color:${RAR_COL[r]}">${r}</span> ${CRAFT[r]} / ${SELL[r]}`).join(' · ')}. Le copie oltre il massimo per mazzo vengono vendute in automatico. Crea e vendi le carte dalla <b>Collezione</b>.</div>
        <h3>La tua collezione</h3><div class="pkprog pkwide"><div class="pkn"><b>${have}</b><span>/${all.length}</span><small>carte diverse possedute · ${Math.round(have/all.length*100)}%</small></div><div class="pkbar"><span style="width:${Math.round(have/all.length*100)}%"></span></div></div>
        <div class="pkodds">${byR.map(([r,h,t])=>`<div><i style="background:${RAR_COL[r]}"></i><span>${r}</span><b>${h}/${t}</b></div>`).join('')}</div>
        <div class="pkcls">${[...ALL_CLS,'neutrali'].map(k=>{ const l=collectible().filter(c=>c.cl===k); const h=l.reduce((a,c)=>a+Math.min(owned(c.n),E.MAX_COPIES[c.r]),0), t=l.reduce((a,c)=>a+E.MAX_COPIES[c.r],0); return `<div style="--uc:${CLS_COLOR[k]}" title="${esc(k==='neutrali'?'Neutrali':HEROES[k].n)}">${k==='neutrali'?'<span class="nz" style="flex:none;width:18px;height:auto;background:none;color:#b9a6e0">◆</span>':`<img src="art/simboli/${k}.svg" alt="">`}<span><i style="width:${Math.round(h/t*100)}%"></i></span><b>${(o.done||{})[k]?'✔':h+'/'+t}</b></div>`; }).join('')}</div>
        <div class="note" style="text-align:left;max-width:none">Pacchetti aperti: ${o.opened}. Nei mazzi puoi usare solo le carte che possiedi; una classe si sblocca quando hai un mazzo valido per lei.</div>
      </div></div></div>`;
  $('#cBack').onclick=()=>menu();
  $('#pBuy').onclick=async()=>{ if(await buyPackX()){ sfx('coin'); packsScreen(); } };
  $('#pOpen').onclick=()=>openPackAnim();
  app.querySelectorAll('.cpo').forEach(b=>b.onclick=()=>openClassPackAnim(b.dataset.c));
}
async function openPackAnim(){
  let res; if(ACC()){ const r=await econDo('openPack'); if(!r) return; res=r.res.cards; bonusToast(r.res.bonus); } else res=openPack();
  if(!res) return; sfx('rip'); revealCards(res,{pack:true});
}
// effetto della carta leggendaria: raggi cremisi e viola che girano, scintille, lampo e scossa
function legendFx(el,box){
  el.classList.add('leg'); const fx=document.createElement('div'); fx.className='legfx';
  let sp=''; for(let k=0;k<18;k++){ const a=k/18*Math.PI*2+Math.random()*.3, dist=90+Math.random()*90; sp+=`<i style="--sx:${Math.round(Math.cos(a)*dist)}px;--sy:${Math.round(Math.sin(a)*dist)}px;--sd:${(Math.random()*.25).toFixed(2)}s;--sc:${k%2?'#dc143c':'#a855f7'}"></i>`; }
  fx.innerHTML=`<div class="rays"></div><div class="core"></div>${sp}`; el.insertBefore(fx,el.firstChild);
  box.classList.add('legflash','legshake'); setTimeout(()=>box.classList.remove('legflash','legshake'),1100);
}
function revealCards(res,opt){
  opt=opt||{};
  const d=modal(`<div class="pkopen">${opt.title?`<h3 class="pktitle">${esc(opt.title)}</h3>`:''}${opt.pack?packArt(true,opt.packCls):''}<div class="pkcards ${res.length>6?'many':''}"></div><div class="row pkbtns"></div></div>`,'pkbox'); d.dataset.lock=1;
  const box=d.querySelector('.pkopen'); const pk=box.querySelector('.pack');
  if(pk) pk.classList.add('shake');
  setTimeout(()=>{ if(pk){ pk.classList.add('burst'); sfx('burst'); setTimeout(()=>pk.remove(),460); }
    const cards=box.querySelector('.pkcards');
    if(opt.pack){ for(let i=res.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [res[i],res[j]]=[res[j],res[i]]; } }
    cards.innerHTML=res.map((x,i)=>`<div class="pkc" data-i="${i}" style="animation-delay:${i*0.07}s"><div class="pkin"><div class="pkback"><div class="pkbk"><img src="art/gra_oro.svg" alt=""></div></div><div class="pkface">${colCard(CARDS[x.n],'')}${x.nuova?'<div class="pktag new">Nuova!</div>':x.extra?`<div class="pktag dup">+${x.extra} ${x.adam?AI_:GI}</div>`:''}</div></div></div>`).join('');
    const left=new Set(res.map((_,i)=>i));
    const btns=box.querySelector('.pkbtns');
    const done=()=>{ const o=ownLoad();
      if(opt.after){ btns.innerHTML=`<button class="btn" id="pkDone">Continua</button>`; $('#pkDone').onclick=()=>{ closeModal(); opt.after(); }; return; }
      btns.innerHTML=`${o.packs?`<button class="btn" id="pkMore">Apri un altro (${o.packs})</button>`:o.coins>=PACK.cost?`<button class="btn" id="pkBuyMore">Compra e apri · ${PACK.cost} ${GI}</button>`:''}<button class="btn" id="pkDone">Fatto</button>`;
      const m=$('#pkMore'); if(m) m.onclick=()=>openPackAnim();
      const b=$('#pkBuyMore'); if(b) b.onclick=async()=>{ if(await buyPackX()){ sfx('coin'); openPackAnim(); } };
      $('#pkDone').onclick=()=>packsScreen(); };
    const flip=i=>{ if(!left.has(i)) return; left.delete(i); const el=cards.querySelector(`[data-i="${i}"]`); const r=res[i].r;
      const show=()=>{ el.classList.add('flip','r-'+r); el.style.setProperty('--rc',RAR_COL[r]);
        sfx(r==='Leggendaria'?'leg':r==='Epica'?'epic':r==='Rara'?'rare':'flip');
        if(r==='Leggendaria') legendFx(el,box);
        if(!left.size) done(); };
      // leggendaria: un attimo di attesa (la carta trema e si accende di cremisi e viola), poi si gira
      if(r==='Leggendaria'&&!REDUCED){ el.classList.add('legpre'); sfx('kw'); setTimeout(()=>{ el.classList.remove('legpre'); show(); },700); } else show(); };
    cards.querySelectorAll('.pkc').forEach(el=>el.onclick=()=>{ const i=+el.dataset.i; if(left.has(i)) flip(i); else { const c=CARDS[res[i].n]; const keep=d; d.remove(); const m=modal(`${bigCard(c)}<div class="row" style="margin-top:10px"><button class="btn" id="pkBack">Indietro</button></div>`); $('#pkBack').onclick=()=>{ m.remove(); document.body.appendChild(keep); }; } });
    btns.innerHTML=`<button class="btn" id="pkAll">Rivela tutte</button>`;
    $('#pkAll').onclick=()=>{ [...left].forEach((i,k)=>setTimeout(()=>flip(i),k*(res.length>6?140:260))); };
  },pk?700:150);
}

// ======================= COLLEZIONE
// riquadro "carte possedute": classe corrente e collezione totale, con barre di avanzamento
function ownStats(cls,shown){
  const all=collectible(); const inCls=all.filter(c=>c.cl===cls);
  const h=inCls.filter(c=>owned(c.n)>0).length, t=inCls.length, H=all.filter(c=>owned(c.n)>0).length, T=all.length;
  const cp=inCls.reduce((a,c)=>a+Math.min(owned(c.n),E.MAX_COPIES[c.r]),0), ct=inCls.reduce((a,c)=>a+E.MAX_COPIES[c.r],0);
  const name=cls==='neutrali'?'Neutrali':HEROES[cls].n;
  return `<div class="ownstats" style="--uc:${CLS_COLOR[cls]}">
    <div class="os"><small>${esc(name)}</small><div class="on"><b>${h}</b><span>/${t}</span></div><div class="ob"><i style="width:${Math.round(h/t*100)}%"></i></div><em>${cp}/${ct} copie${cp>=ct?' · completa ✔':''}</em></div>
    <div class="os tot"><small>Collezione totale</small><div class="on"><b>${H}</b><span>/${T}</span></div><div class="ob"><i style="width:${Math.round(H/T*100)}%"></i></div><em>${Math.round(H/T*100)}% · ${shown} carte mostrate</em></div></div>`;
}
const COL={cls:'minatore',cost:'tutti',rar:'tutte',tipo:'tutti',kw:'tutte',q:'',tok:false,own:'tutte'};
const COL_TABS=['minatore','sirena','adepto','traccia','incisore','scudiera','neutrali'];
const RAR_ORD={Comune:0,Rara:1,Epica:2,Leggendaria:3,Gettone:4};
function collection(){
  const prevScroll=($('.coll')||{}).scrollTop||0;
  G=null; NET&&NET.leave&&NET.leave(); NET=null;
  const all=Object.values(CARDS);
  const inDeck=new Set(); for(const k in E.DECKS) for(const [n] of E.DECKS[k]) inDeck.add(n);
  const list=all.filter(c=>{
    if(c.cl!==COL.cls) return false;
    if(c.r==='Gettone' && !COL.tok) return false;
    if(!cardHasKw(c,COL.kw)) return false;
    if(COL.own!=='tutte' && c.r!=='Gettone' && (COL.own==='poss')!==(owned(c.n)>0)) return false;
    if(COL.rar!=='tutte' && c.r!==COL.rar) return false;
    if(COL.tipo!=='tutti' && c.t!==COL.tipo) return false;
    if(COL.cost!=='tutti'){ const k=+COL.cost; if(k===8 ? c.c<8 : c.c!==k) return false; }
    if(COL.q && !(c.n+' '+c.x+' '+(c.tr||'')).toLowerCase().includes(COL.q.toLowerCase())) return false;
    return true; }).sort((a,b)=>(a.c-b.c)||(RAR_ORD[a.r]-RAR_ORD[b.r])||a.n.localeCompare(b.n));
  const tot=all.filter(c=>c.cl===COL.cls&&c.r!=='Gettone').length;
  const h=HEROES[COL.cls];
  const tabs=COL_TABS.map(k=>`<button class="ctab ${COL.cls===k?'on':''}" data-t="${k}" style="--uc:${CLS_COLOR[k]}">${k==='neutrali'?'<span class="nz">◆</span>':`<img src="art/simboli/${k}.svg" alt="">`}<span>${esc(CLASSES[k].short||CLASSES[k].name)}</span></button>`).join('');
  const sel2=(id,val,opts)=>`<select id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${String(val)===String(v)?'selected':''}>${l}</option>`).join('')}</select>`;
  app.innerHTML=`<div class="coll">
    <div class="chead"><button class="btn sm" id="cBack">‹ Menu</button><h2>Collezione</h2>${ownStats(COL.cls,list.length)}</div>
    <div class="ctabs">${tabs}</div>
    ${h?`<div class="chero" style="--uc:${CLS_COLOR[COL.cls]}"><img class="cp" src="${h.img}" alt="" data-hero="${COL.cls}"><div class="ci"><b>${esc(h.n)}</b><small>${esc(h.reg)} · Emozione: ${esc(h.e)}</small>
       <div class="cpw"><img src="${h.hp}" alt="" data-hp="${COL.cls}:b"><div><b>${esc(h.b[0])}</b> (2 GRA): ${powKw(h.b[1])}</div></div>
       <div class="cpw"><img src="${h.hpM}" alt="" data-hp="${COL.cls}:m"><div><b>${esc(h.m[0])}</b> — forma mutata: ${powKw(h.m[1])}</div></div></div></div>`:''}
    <div class="cfil">${sel2('fCost',COL.cost,[['tutti','Tutti i costi'],[0,'0'],[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6'],[7,'7'],[8,'8+']])}
      ${sel2('fRar',COL.rar,[['tutte','Tutte le rarità'],['Comune','Comuni'],['Rara','Rare'],['Epica','Epiche'],['Leggendaria','Leggendarie']])}
      ${sel2('fTipo',COL.tipo,[['tutti','Tutti i tipi'],['Seguace','Seguaci'],['Incanto','Incanti'],['Rituale','Rituali'],['Dominio','Domini']])}
      ${sel2('fOwn',COL.own,[['tutte','Possedute e mancanti'],['poss','Solo possedute'],['manc','Solo mancanti']])}
      ${sel2('fKw',COL.kw,[['tutte','Tutte le parole chiave'],...allKws().map(k=>[k,k])])}
      <input id="fQ" placeholder="Cerca nome o testo…" value="${esc(COL.q)}"><label class="ftok"><input type="checkbox" id="fTok" ${COL.tok?'checked':''}> Gettoni</label></div>
    <div class="cgrid">${list.map(c=>{ const k=owned(c.n); const tok=c.r==='Gettone'; return `<div class="ccw">${colCard(c,`data-cc="${esc(c.n)}"`,tok||k?'':'locked')}${tok?'':`<div class="owntag ${k?'':'no'}">${k?'×'+k:'🔒'}</div>`}</div>`; }).join('')||'<div class="note">Nessuna carta con questi filtri.</div>'}</div>
  </div>`;
  { const cl=$('.coll'); if(cl) cl.scrollTop=prevScroll; }
  $('#cBack').onclick=()=>menu();
  app.querySelectorAll('.ctab').forEach(e=>e.onclick=()=>{ COL.cls=e.dataset.t; collection(); });
  $('#fCost').onchange=e=>{ COL.cost=e.target.value; collection(); };
  $('#fRar').onchange=e=>{ COL.rar=e.target.value; collection(); };
  $('#fTipo').onchange=e=>{ COL.tipo=e.target.value; collection(); };
  $('#fKw').onchange=e=>{ COL.kw=e.target.value; collection(); };
  $('#fOwn').onchange=e=>{ COL.own=e.target.value; collection(); };
  $('#fTok').onchange=e=>{ COL.tok=e.target.checked; collection(); };
  let qt=null; $('#fQ').oninput=e=>{ clearTimeout(qt); const v=e.target.value; qt=setTimeout(()=>{ COL.q=v; collection(); const f=$('#fQ'); f.focus(); f.setSelectionRange(v.length,v.length); },250); };
  app.querySelectorAll('[data-cc]').forEach(e=>e.onclick=()=>{ const c=CARDS[e.dataset.cc]; const decks=Object.entries(E.DECKS).filter(([k,d])=>d.some(([n])=>n===c.n)).map(([k,d])=>`${CLASSES[k].short} ×${d.find(([n])=>n===c.n)[1]}`);
    cardModal(c,()=>collection(),()=>`<div class="note" style="margin:8px auto 0">${c.r==='Gettone'?'Gettone: non sta nel mazzo, viene creato da altre carte.':(decks.length?'Nei mazzi base: '+esc(decks.join(', ')):'Non è in nessun mazzo base.')}</div>`); });
}

// ======================= TUTORIAL GUIDATO
let TUT=null;
const myMinions=()=>G?E.minionsOf(G,G.players[me]):[];
const TUT_STEPS=[
 {t:'Benvenuto in <b>Elgravion</b>! Questa è una partita di prova contro il <b>Maestro</b>. Ti guido passo passo; durante il tutorial il turno non ha limite di tempo.'},
 {hl:'[data-hero="me"]',t:'Questo è il <b>tuo eroe</b>: ha <b>35 PF</b>. Se scendono a 0 perdi. A 20 PF o meno l\'eroe <b>Muta</b> e cambia potere.'},
 {hl:'[data-hero="opp"]',t:'Questo è l\'<b>eroe avversario</b>. Per vincere devi portare i suoi PF a 0.'},
 {hl:'.bar.me .gra',t:'Il <b>GRA</b> è la tua moneta: ogni turno ne hai 1 in più, fino a 11. Ti serve per giocare carte e usare il potere eroe.'},
 {hl:'.hand',t:'Questa è la tua <b>mano</b>. <b>Trascina il Portatore di Lanterne</b> (costa 1) su uno slot libero del tuo tavolo. Puoi anche toccarlo e premere Gioca.',wait:()=>myMinions().length>0},
 {hl:'.board',t:'Ottimo! I <b>seguaci</b> stanno negli slot. Nel turno in cui entrano non possono attaccare (salvo <b>Momentum</b>). Le carte che puoi giocare hanno il bordo verde.'},
 {hl:'#bEnd',t:'Ora premi <b>Fine turno</b>: il Maestro farà la sua mossa.',wait:()=>G.cur===me&&G.players[me].ownTurns>=2&&!G.pending.length},
 {hl:'.unit.ready',t:'È di nuovo il tuo turno. Il tuo seguace ha l\'alone verde: può <b>attaccare</b>. Trascinalo verso un seguace nemico o verso l\'eroe avversario (oppure toccalo e poi tocca il bersaglio).',wait:()=>myMinions().some(u=>u.attacked)||!myMinions().length},
 {hl:'.unit .kwi',t:'Le icone a sinistra di un seguace sono le sue <b>parole chiave</b>. 🛡 <b>Ordalia</b>: i nemici devono attaccare prima lui. ☠ <b>Lascito</b>: un effetto quando muore. Tieni il dito (o il mouse) su una carta per leggerla tutta.'},
 {hl:'[data-power="me"]',t:'Il <b>potere eroe</b> costa 2 GRA e si usa una volta per turno. Il Minatore <b>Scava</b>: guarda la prima carta del mazzo e può prenderla. Se ha un bersaglio, puoi trascinarlo.'},
 {hl:'.pslot[data-peg="me"]',t:'Questo è il <b>Pegno</b>: puoi metterci una carta costosa (serve 1 GRA libero). A fine turno il GRA avanzato la paga a rate; quando è saldata entra in gioco gratis.'},
 {hl:'.emorow',t:'Ogni 3 turni scegli uno <b>slot d\'Emozione</b> da colorare: i seguaci della tua classe lì ricevono un bonus. Dal 3° slot d\'Emozione arriva il <b>Focus</b>: lì costano anche 1 GRA in meno. Il simbolo sotto lo slot indica che è attivo.'},
 {t:'Ora tocca a te: <b>porta a 0 l\'eroe del Maestro</b>! Puoi rivedere il tutorial dal menu quando vuoi.',last:true},
];
function startTutorial(){
  G=E.newGame({classes:['minatore','sirena'],names:['Tu','Maestro'],seed:4242}); me=0; vsAI=true; NET=null; sel=null;
  G.cur=0; G.first=0; const p=G.players[0];
  p.hand=['Portatore di Lanterne','Spaccapietre','Guardia della Stretta del Respiro','Minatore di Valborea'].map(n=>({uid:G.uid++,n,free:false}));
  E.act(G,1,{type:'mulligan',uids:[]}); E.act(G,0,{type:'mulligan',uids:[]});
  TUT={i:0}; render(); tutBox();
}
function tutCheck(){ if(!TUT||!G) return; const s=TUT_STEPS[TUT.i]; if(s&&s.wait&&s.wait()){ TUT.i++; sfx('kw'); tutBox(); } }
function tutBox(){
  document.querySelectorAll('.tuthl').forEach(e=>e.classList.remove('tuthl'));
  let b=$('#tut'); if(!TUT){ if(b) b.remove(); return; }
  const s=TUT_STEPS[TUT.i]; if(!s){ TUT=null; if(b) b.remove(); return; }
  if(!b){ b=document.createElement('div'); b.id='tut'; document.body.appendChild(b); }
  b.innerHTML=`<div class="tstep">Tutorial · ${TUT.i+1}/${TUT_STEPS.length}</div><div class="ttx">${s.t}</div><div class="tbtn">${s.wait?'<span class="twait">In attesa della tua mossa…</span><button class="btn sm" id="tSkip">Salta passo</button>':`<button class="btn sm" id="tNext">${s.last?'Inizia a giocare':'Avanti'}</button>`}<button class="btn sm" id="tEnd">Esci dal tutorial</button></div>`;
  const nx=$('#tNext'); if(nx) nx.onclick=()=>{ sfx('click'); TUT.i++; if(TUT.i>=TUT_STEPS.length) TUT=null; tutBox(); };
  const sk=$('#tSkip'); if(sk) sk.onclick=()=>{ TUT.i++; tutBox(); };
  $('#tEnd').onclick=()=>{ TUT=null; tutBox(); };
  tutHL();
}
function tutHL(){ if(!TUT) return; const s=TUT_STEPS[TUT.i]; document.querySelectorAll('.tuthl').forEach(e=>e.classList.remove('tuthl')); let el=null; if(s&&s.hl){ el=document.querySelector(s.hl); if(el) el.classList.add('tuthl'); }
  const b=$('#tut'); if(b && window.innerWidth<=760){ const top=!el || el.getBoundingClientRect().top>innerHeight*0.45; b.classList.toggle('tTop',top); b.classList.toggle('tBot',!top); } }

// ======================= PARTITA LOCALE CONTRO IA
// Mazzi aggiuntivi del computer (uno per classe); in partita sceglie a caso tra questo e il mazzo base.
function startLocal(){
  const others=ALL_CLS.filter(c=>c!==chosenCls); const other=others[Math.floor(Math.random()*others.length)];
  const alt=AI_DECKS[other]&&Math.random()<0.5?AI_DECKS[other]:null;
  const seed=privSeed();
  G=E.newGame({seed,classes:[chosenCls,other],names:['Tu','Computer'],decks:[deckFor(chosenCls),alt?alt.d:null]}); me=0; vsAI=true; NET=null; sel=null;
  G.aiDeck=alt?alt.n:'Mazzo base';
  // registro della partita: serve al server per verificare il premio
  G.rec={seed,classes:[chosenCls,other],decks:[deckFor(chosenCls),alt?alt.d:null],diff:SET.diff==='difficile'?'h':'n',log:[]};
  render(); toast(`Il computer gioca ${HEROES[other].n} · ${alt?`mazzo «${alt.n}»`:'mazzo base'}`); aiLoop();
}
function aiLoop(){
  if(!vsAI||!G||busy) return;
  const hard=G.rec?G.rec.diff==='h':SET.diff==='difficile';
  const pickAi=()=>hard?E.aiHard(G,1):E.ai(G,1);
  const a=pickAi();
  if(!a){ render(); return; }
  busy=true; const g0=G;
  setTimeout(()=>{ busy=false; if(!G||G!==g0) return; const b=pickAi(); if(!b){ render(); return; }
    const bc=JSON.parse(JSON.stringify(b)); const r=E.act(G,1,b); if(G.rec) G.rec.log.push([1,bc]);
    if(r&&b.type!=='end'){ E.act(G,1,{type:'end'}); if(G.rec) G.rec.log.push([1,{type:'end'},1]); }
    render(); aiLoop(); }, window.FAST?15:Math.round((a.type==='mulligan'||a.type==='choose'?250:650)*(SPEED_MULT[SET.speed]||1)));
}

// ======================= AZIONI DEL GIOCATORE
function send(a){
  sel=null; a=E.enrich(G,me,a);
  if(NET){ NET.local(a); return; }
  const ac=G.rec?JSON.parse(JSON.stringify(a)):null; const r=E.act(G,me,a); if(r) toast(r); else if(G.rec) G.rec.log.push([0,ac]); render(); aiLoop();
}

// ======================= RENDER
// ======================= STORICO AZIONI (barra laterale con le ultime 3 azioni, come in Hearthstone)
const _engineAct=E.act;
E.act=function(g,pi,a){
  let pre=null, L=0; try{ pre=histPre(g,pi,a); L=g.log.length; }catch(e){ pre=null; }
  const r=_engineAct(g,pi,a);
  if(!r && pre){ try{ histPost(g,pi,pre,L); }catch(e){} }
  return r;
};
const hUnit=(g,uid)=>{ const u=g.units[uid]; return u?{n:u.n}:null; };
function histPre(g,pi,a){
  if(!a||g.phase!=='play'||g.over) return null; const p=g.players[pi], o=g.players[1-pi];
  const tgt=t=>typeof t==='number'?hUnit(g,t):null;
  if(a.type==='play'){ const h=p.hand.find(x=>x.uid===a.uid); return {k:'play',n:h&&h.n&&CARDS[h.n]?h.n:null,tg:(a.targets||[]).map(tgt).find(Boolean)||null}; }
  if(a.type==='attack') return {k:'attack',att:a.uid==='hero'?{hero:p.cls}:hUnit(g,a.uid),tg:a.target==='hero'?{hero:o.cls}:hUnit(g,a.target)};
  if(a.type==='power') return {k:'power',cls:p.cls,mut:!!p.mutated,tg:tgt(a.target)};
  return null;
}
function histPost(g,pi,pre,L){
  if(pre.k==='play' && !pre.n){ for(const l of g.log.slice(L)){ const m=/gioca (.+?)\.$/.exec(l); if(m&&CARDS[m[1]]){ pre.n=m[1]; break; } } }
  g.hist=g.hist||[]; g.histN=(g.histN||0)+1; g.hist.push({...pre,pi,id:g.histN}); if(g.hist.length>12) g.hist.shift();
}
const histArt=x=>!x?null:x.hero?`art/eroi/${x.hero}_art.jpg`:(CARDS[x.n]&&CARDS[x.n].art)||null;
const histName=x=>!x?'':x.hero?HEROES[x.hero].n:(x.n||'una carta');
function histText(h){
  const who=h.pi===me?'Tu':esc(G.players[h.pi].name||'Avversario');
  if(h.k==='play') return `<b>${who}</b> gioca <b>${esc(h.n||'una carta')}</b>${h.tg?' su '+esc(histName(h.tg)):''}`;
  if(h.k==='attack') return `<b>${who}</b>: ${esc(histName(h.att))} attacca ${esc(histName(h.tg))}`;
  const H=HEROES[h.cls]; return `<b>${who}</b> usa il potere eroe <b>${esc((h.mut?H.m:H.b)[0])}</b>${h.tg?' su '+esc(histName(h.tg)):''}`;
}
function histHtml(){
  const H=(G.hist||[]).slice(-3).reverse(); const seen=G.__hseen||0; G.__hseen=Math.max(seen,...(G.hist||[]).map(h=>h.id),0);
  return `<div class="hist">${H.map(h=>{ let art,badge,small=null;
    if(h.k==='play'){ art=histArt({n:h.n}); badge='🂠'; small=h.tg; }
    else if(h.k==='attack'){ art=histArt(h.att); badge='⚔'; small=h.tg; }
    else { art=h.mut?HEROES[h.cls].hpM:HEROES[h.cls].hp; badge='✦'; small=h.tg; }
    const sa=small&&histArt(small);
    return `<div class="ht ${h.pi===me?'me':'op'} ${h.id>seen?'new':''}" data-hid="${h.id}">${art?`<img src="${art}" alt="">`:`<span class="hq">${esc((h.n||'?').charAt(0))}</span>`}<i class="hb">${badge}</i>${small?(sa?`<img class="hs" src="${sa}" alt="">`:`<span class="hs hq2">${esc(histName(small).charAt(0))}</span>`):''}</div>`; }).join('')}</div>`;
}
function histPopShow(el){
  const h=(G&&G.hist||[]).find(x=>x.id===+el.dataset.hid); if(!h) return; histPopHide();
  const d=document.createElement('div'); d.id='histpop'; d.className='histpop '+(h.pi===me?'me':'op');
  let body='';
  const cardOf=x=>x&&!x.hero&&CARDS[x.n]?CARDS[x.n]:null;
  if(h.k==='play'){ const c=cardOf({n:h.n}); body=c?bigCard(c):''; const t=cardOf(h.tg); if(t) body+=`<div class="hparrow">➜</div>`+bigCard(t); }
  else if(h.k==='attack'){ const a=cardOf(h.att), t=cardOf(h.tg); body=(a?bigCard(a):`<img class="hphero" src="${histArt(h.att)}" alt="">`)+`<div class="hparrow">⚔</div>`+(t?bigCard(t):`<img class="hphero" src="${histArt(h.tg)}" alt="">`); }
  else { const H=HEROES[h.cls], pw=h.mut?H.m:H.b; body=`<div class="hppow"><img src="${h.mut?H.hpM:H.hp}" alt=""><div>${powKw(pw[1])}</div></div>`; const t=cardOf(h.tg); if(t) body+=`<div class="hparrow">➜</div>`+bigCard(t); }
  d.innerHTML=`<div class="hptxt">${histText(h)}</div><div class="hpbody">${body}</div>`;
  document.body.appendChild(d);
  const r=el.getBoundingClientRect(); d.style.left=(r.right+12)+'px'; d.style.top=Math.max(8,Math.min(innerHeight-d.offsetHeight-8,r.top+r.height/2-d.offsetHeight/2))+'px';
}
function histPopHide(){ const d=$('#histpop'); if(d) d.remove(); }
function bindHist(){ app.querySelectorAll('.hist .ht').forEach(el=>{
  el.onpointerenter=ev=>{ if(ev.pointerType==='mouse') histPopShow(el); };
  el.onpointerleave=ev=>{ if(ev.pointerType==='mouse') histPopHide(); };
  el.onclick=ev=>{ ev.stopPropagation(); if($('#histpop')) histPopHide(); else histPopShow(el); }; }); }
document.addEventListener('pointerdown',e=>{ if(!(e.target.closest&&e.target.closest('.hist'))) histPopHide(); },true);

// ======================= MONETE DI GRA (come i cristalli di mana): piene = disponibili, spente = usate, buie = non ancora sbloccate
const GRA_SEEN={};
function coinsHtml(pl,isMe){
  const MAX=11, prev=GRA_SEEN[pl.i]; const spentNow=(prev&&prev.max===pl.graMax&&prev.gra>pl.gra)?[pl.gra,prev.gra]:null;
  GRA_SEEN[pl.i]={gra:pl.gra,max:pl.graMax};
  let h=''; for(let i=0;i<Math.max(MAX,pl.gra);i++){
    const st=i<pl.gra?(i<pl.graMax?'full':'bonus'):i<pl.graMax?'spent':'locked';
    const now=spentNow&&i>=spentNow[0]&&i<spentNow[1]?'now':'';
    h+=`<i class="coin ${st} ${now}" data-ci="${i}"></i>`; }
  return `<div class="coins ${isMe?'me':'op'}" title="GRA: ${pl.gra} disponibili su ${pl.graMax}">${h}</div>`;
}
// anteprima: le monete che una carta spenderebbe lampeggiano
function coinPreview(cost){
  const box=document.querySelector('.bar.me .coins'); if(!box||!G) return; const gra=G.players[me].gra;
  box.querySelectorAll('.coin').forEach(c=>{ const i=+c.dataset.ci; c.classList.toggle('pv', cost>0 && i>=gra-cost && i<gra); c.classList.toggle('pvx', cost>gra && i<gra); });
}
function coinPreviewFromState(){
  if(!G) return; const p=G.players[me]; let uid=null;
  if(sel&&sel.kind==='play') uid=sel.uid; else { const hv=document.querySelector('.hand .mc.hv'); if(hv) uid=+hv.dataset.h; }
  if(sel&&sel.kind==='power'){ return coinPreview(p.cls==='incisore'&&!p.mutated?1:2); }
  const h=uid!=null&&p.hand.find(x=>x.uid===uid); coinPreview(h?E.costOf(G,p,h,sel&&sel.slot!=null?sel.slot:null):0);
}
// ======================= ENTRATA IN CAMPO, ATTACCO, "IL TUO TURNO"
// Ogni unità nuova cala sullo slot con polvere dorata (le leggendarie con lampo e anello di luce).
// Se la schermata viene ridisegnata durante l'animazione, questa riprende dal punto in cui era.
const SPAWN_MS=650, SPAWN_LEG_MS=1100;
function spawnInfo(u,c){
  G.__sp=G.__sp||{}; const now=Date.now();
  if(!(u.uid in G.__sp)) G.__sp[u.uid]=G.__spInit?now:0;  // le unità già presenti al primo disegno non si animano
  const t0=G.__sp[u.uid], leg=c.r==='Leggendaria', dur=leg?SPAWN_LEG_MS:SPAWN_MS, el=now-t0;
  if(!t0||el>=dur) return {cls:'',style:'',fx:''};
  return {cls:leg?'spawn spawnleg':'spawn', style:`--spd:-${el}ms`, fx:`<i class="dust" style="animation-delay:-${el}ms"></i>${leg?`<i class="legring" style="animation-delay:-${el}ms"></i>`:''}`};
}
// attacco: piccolo scatto verso il bersaglio
function attackNudge(e){
  const a=e.hero!=null?app.querySelector(`[data-hero="${e.hero===me?'me':'opp'}"]`):app.querySelector(`[data-u="${e.u}"]`);
  const t=e.v!=null?app.querySelector(`[data-u="${e.v}"]`):app.querySelector(`[data-hero="${e.h===me?'me':'opp'}"]`);
  if(!a||!t||!a.animate) return; const ra=a.getBoundingClientRect(), rt=t.getBoundingClientRect();
  const dx=(rt.left+rt.width/2)-(ra.left+ra.width/2), dy=(rt.top+rt.height/2)-(ra.top+ra.height/2), d=Math.hypot(dx,dy)||1, k=Math.min(26,d*0.18)/d;
  a.animate([{transform:'none'},{transform:`translate(${dx*k}px,${dy*k}px) scale(1.05)`,offset:.35},{transform:'none'}],{duration:300,easing:'ease-out'});
  t.animate([{filter:'none'},{filter:'brightness(1.8)',offset:.4},{filter:'none'}],{duration:300});
}
function turnBanner(){
  if(!G||G.over||G.phase!=='play'||G.cur!==me||G.pending.some(p=>p.p===me&&p.type==='mulligan')) return;
  if(G.over||G.__banner===G.turn) return; G.__banner=G.turn;
  document.querySelectorAll('.turnban').forEach(x=>x.remove());
  sfx('turn'); const d=document.createElement('div'); d.className='turnban'; d.innerHTML='<div><b>Il tuo turno</b></div>';
  document.body.appendChild(d); setTimeout(()=>d.remove(), window.FAST?200:1500);
}
// ======================= DESCRIZIONE DEL BONUS DELLO SLOT D'EMOZIONE (a sinistra degli slot)
const EMO_TXT={
  minatore:'guardi le prime 2 carte del mazzo e puoi metterle in fondo.',
  sirena:'ottiene <b>Legato</b>: quando muore, i seguaci accanto ottengono +1/+1.',
  adepto:'ottiene <b>Ambizione</b>: a inizio turno +1 Attacco, e l\'eroe +1 Attacco per quel turno.',
  traccia:'ottiene <b>Paura</b>: la prima volta che morirebbe qui, sopravvive con 1 Difesa.',
  incisore:'ottiene <b>Meraviglia</b>: regge una Protesi in più e la prima Incisione su di lui costa 1 GRA.',
  scudiera:'Invece di colorare usa un <b>Decreto</b>: <b>Sigillo</b> (un suo slot vale come d\'Emozione, anche per il Focus) o <b>Revoca</b> (uno slot nemico non si colorerà più).'
};
function emoInfo(pl,isMe){
  const n=pl.slots.filter(s=>s.emo).length, H=HEROES[pl.cls];
  return `<div class="emoinfo ${isMe?'me':'op'} ${n?'act':''}" style="--emo:${EMO_COLOR[pl.cls]}"><div class="eh"><img src="art/simboli/${pl.cls}.svg" alt=""><b>${esc(H.e)}</b><span>${n?n+' attiv'+(n===1?'o':'i'):'nessuno'}</span></div><div class="et">${pl.cls==='scudiera'?'':`Un seguace ${isMe?'della tua':'della sua'} classe giocato qui: `}${EMO_TXT[pl.cls]||''}<div class="efo ${E.focusOn(pl)?'on':''}"><b>Focus</b> ${E.focusOn(pl)?'attivo: qui costa <b>1 GRA in meno</b>':`dal ${E.focusMin(pl)}° slot d'Emozione (${n}/${E.focusMin(pl)}): costerà 1 GRA in meno`}</div></div><div class="es">Qui la Difesa è una soglia: muore solo se in un turno subisce danni pari o superiori alla Difesa.</div></div>`;
}
// ======================= PIETRIFICA: la carta resta di pietra finché l'effetto è attivo
function stoneHtml(u){
  G.__pet=G.__pet||{};
  if(!(u.petri>0||u.cantAttack)){ delete G.__pet[u.uid]; return ''; }
  const now=Date.now(); if(!G.__pet[u.uid]) G.__pet[u.uid]=now; const el=now-G.__pet[u.uid];
  const txt=u.petri>0?'Non potrà attaccare nel suo prossimo turno':'Non può attaccare in questo turno';
  return `<div class="stone" style="animation-delay:-${el}ms"><i class="crk"></i></div><div class="stonelbl" style="animation-delay:-${el}ms" title="Pietrificato: ${txt}"><b>🪨 Pietrificato</b><small>${txt}</small></div>`;
}
// ======================= AVVISO: SCEGLI LO SLOT D'EMOZIONE
function emoBanner(){
  if(!G||G.over) return; const pd=G.pending[0]; if(!pd||pd.p!==me||pd.type!=='emo'||pd.__ban) return; pd.__ban=1;
  const pl=G.players[me]; document.querySelectorAll('.emoban').forEach(x=>x.remove()); sfx('kw');
  const d=document.createElement('div'); d.className='emoban'; d.style.setProperty('--emo',EMO_COLOR[pl.cls]);
  d.innerHTML=`<div><img src="art/simboli/${pl.cls}.svg" alt=""><span><b>Scegli il tuo slot d'Emozione</b><small>Tocca uno slot illuminato del tuo tavolo: prenderà il colore di ${esc(HEROES[pl.cls].e)}</small></span></div>`;
  document.body.appendChild(d); setTimeout(()=>d.remove(), window.FAST?300:3200);
}
// ======================= MOVIMENTI FLUIDI (FLIP): carte in mano e unità scivolano dalla vecchia alla nuova posizione
const REDUCED=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function flipCapture(){
  const m={h:new Map(),u:new Map()}; if(REDUCED) return m;
  document.querySelectorAll('.hand .mc[data-h]').forEach(e=>{ const r=e.getBoundingClientRect(); m.h.set(e.dataset.h,{x:r.left+r.width/2,y:r.top+r.height/2}); });
  document.querySelectorAll('.board .unit[data-u]').forEach(e=>{ const r=e.getBoundingClientRect(); m.u.set(e.dataset.u,{x:r.left+r.width/2,y:r.top+r.height/2}); });
  m.had=m.h.size>0||m.u.size>0; return m;
}
function flipPlay(m){
  if(REDUCED||!m||!document.body.animate) return; const ease='cubic-bezier(.22,.9,.3,1)';
  document.querySelectorAll('.hand .mc[data-h]').forEach((e,i)=>{ const r=e.getBoundingClientRect(), c={x:r.left+r.width/2,y:r.top+r.height/2}, p=m.h.get(e.dataset.h);
    if(p){ const dx=p.x-c.x, dy=p.y-c.y; if(Math.abs(dx)+Math.abs(dy)>2) e.animate([{translate:`${dx}px ${dy}px`},{translate:'0 0'}],{duration:280,easing:ease}); }
    else if(m.had){ e.animate([{translate:`${innerWidth*0.35}px -40px`,opacity:0,scale:.7},{translate:'0 0',opacity:1,scale:1}],{duration:420,easing:ease}); } // carta appena pescata
    else e.animate([{translate:'0 80px',opacity:0},{translate:'0 0',opacity:1}],{duration:380,delay:i*60,easing:ease,fill:'backwards'}); }); // prima mano
  document.querySelectorAll('.board .unit[data-u]').forEach(e=>{ const p=m.u.get(e.dataset.u); if(!p) return; const r=e.getBoundingClientRect(); const dx=p.x-(r.left+r.width/2), dy=p.y-(r.top+r.height/2);
    if(Math.abs(dx)+Math.abs(dy)>2) e.animate([{translate:`${dx}px ${dy}px`},{translate:'0 0'}],{duration:320,easing:ease}); });
}
function render(){
  if(!G){ return; }
  const p=G.players[me], o=G.players[1-me];
  const myTurn=G.cur===me && G.phase==='play' && !G.over;
  const pd=G.pending[0];
  const legalT=new Set(), hlSlots=new Set(), hlOpp=new Set(); shielded=new Set(); let prompt2='';
  let prompt='';
  if(sel){
    if(sel.step==='eslot'){ E.freeSlots(G,o,false).forEach(i=>hlOpp.add(i)); prompt='Scegli uno slot libero del tavolo nemico per L\'Usurpatore'; }
    if(sel.step==='slot'){ E.freeSlots(G,p,E.needsTwo(G,p,E.card(sel.n))).forEach(i=>hlSlots.add(i)); prompt='Scegli uno slot per '+sel.n; }
    if(sel.step==='target'&&!sel.req[sel.targets.length]&&sel.drag){ prompt='Rilascia la carta sul tavolo per giocarla'; }
    else if(sel.step==='target'){ const kind=sel.req[sel.targets.length]; E.legalTargets(G,p,kind).filter(x=>!sel.targets.includes(x)).forEach(x=>legalT.add(x)); prompt=targetPrompt(kind); }
    if(sel.kind==='attack'&&sel.uid==='hero'){ const tg=E.heroAttackTargets(G,me); for(const e of E.minionsOf(G,o)) if(!tg.includes(e.uid)) shielded.add(e.uid); E.heroAttackTargets(G,me).forEach(x=>legalT.add(x==='hero'?'ehero':x)); prompt='Il tuo eroe attacca: scegli il bersaglio'; }
    else if(sel.kind==='attack'){ const tg=E.attackTargets(G,G.units[sel.uid]); for(const e of E.minionsOf(G,o)) if(!tg.includes(e.uid)) shielded.add(e.uid); if(!tg.includes('hero')&&tg.length) prompt2='Ordalia: devi attaccare prima un seguace con Ordalia'; E.attackTargets(G,G.units[sel.uid]).forEach(x=>legalT.add(x==='hero'?'ehero':x)); prompt='Scegli chi attaccare'; }
  }
  computeLethal(p,o);
  if(pd && pd.p===me && pd.type==='emo'){ p.slots.forEach((s,i)=>{ if(!s.emo&&!s.revoked) hlSlots.add(i); }); prompt='Scegli lo slot da colorare con la tua Emozione'; }
  if(pd && pd.p===me && pd.type==='decreto' && sel && sel.kind==='decreto'){ if(sel.k==='sigillo'){ p.slots.forEach((s,i)=>{ if(!s.emo) hlSlots.add(i); }); prompt='Sigillo: scegli un tuo slot da rendere grigio'; } else { o.slots.forEach((s,i)=>{ if(!s.emo&&!s.revoked) hlOpp.add(i); }); prompt='Revoca: scegli uno slot dell\'avversario da rendere d\'oro'; } }
  if(pd && pd.p===me && pd.type==='sposta'){ E.freeSlots(G,p,false).forEach(i=>hlSlots.add(i)); prompt='Cavaliere Acrobata: puoi spostarlo in uno slot libero'; }
  const heroBar=(pl,isMe)=>{
    const pw=powerName(pl); const canP=isMe&&myTurn&&!pd&&E.canPower(G,me);
    const frm=isMe?SET.frame:(G.oppCosm&&G.oppCosm.frame); const frmC=frm&&COSM[frm]&&COSM[frm].k==='frame'?frm:'';
    const heroEl=`<div class="hero ${frmC} ${!isMe&&LETHAL.has('ehero')?'lethal':''} ${pl.mutated?'mut':''} ${isMe&&E.canHeroAttack(G,me)?'ready':''} ${isMe&&sel&&sel.uid==='hero'?'sel':''} ${(!isMe&&legalT.has('ehero'))||(isMe&&legalT.has('hero'))?'tg':''}" data-hero="${isMe?'me':'opp'}"><img src="${heroImg(pl)}" alt=""><span class="pf ${pl.pf<=10?'low':''}">${pl.pf}</span>${!isMe&&LETHAL.has('ehero')?'<div class="skull">☠</div>':''}${isMe?'<div class="skull me">☠</div>':''}${pl.heroA?`<span class="ha" title="Attacco dell'eroe in questo turno">${pl.heroA}</span>`:''}${pl.armor?`<span class="ar">${pl.armor}</span>`:''}</div>`;
    const infoEl=`<div class="info"><b>${esc(pl.name)} · ${esc(HEROES[pl.cls].n)}${pl.mutated?' (Mutato)':''}</b>${!isMe&&vsAI&&G.aiDeck?`<small class="aideck">${G.aiDeck==='Mazzo base'?'Mazzo base':`Mazzo «${esc(G.aiDeck)}»`}</small>`:''}
        <div class="row" style="justify-content:flex-start;gap:6px"><span class="gra"><img src="art/gra_oro.svg" alt="GRA">${pl.gra}/${pl.graMax}</span>
        <span class="pill">Mazzo ${pl.deck.length}</span>${isMe?'':`<span class="pill">Mano ${pl.hand.length}</span>`}${pl.fatigue?`<span class="pill">Nebbia ${pl.fatigue}</span>`:''}${pl.esca?`<span class="pill" title="Il prossimo seguace occupa 2 slot">Esca attiva</span>`:''}${(pl.nsA||pl.nsD)?`<span class="pill" title="Eco dello Spirito: bonus permanente ai tuoi Spiriti futuri">Spiriti +${pl.nsA}/+${pl.nsD}</span>`:''}${pl.powerLock===pl.ownTurns&&pl.cls==='traccia'?`<span class="pill">Potere bloccato</span>`:''}</div>${coinsHtml(pl,isMe)}</div>`;
    const powerEl=`<div class="power pr-${pl.cls} ${canP?'can':'off'} ${isMe&&sel&&sel.kind==='power'?'sel':''}" data-power="${isMe?'me':'opp'}" data-pw="${isMe?'me':'opp'}"><img src="${powerImg(pl)}" alt="">${ringBand(pl.cls,isMe?'m':'o')}${ringSvg(pl.cls,isMe?'m':'o')}<span class="c">2</span></div>`;
    return `<div class="bar ${isMe?'me':''}">
      <div class="side l">${infoEl}</div>
      <div class="mid">${heroEl}${powerEl}</div>
      <div class="side r">${isMe?`<span class="timer" id="tmr"></span><button class="endbtn ${myTurn&&!pd?'':'wait'} ${myTurn&&!pd&&nothingLeft()?'done':''}" id="bEnd" ${myTurn&&!pd&&nothingLeft()?'title="Non hai altre mosse: puoi finire il turno"':''}>${G.over?'Fine':myTurn?'Fine turno':'Turno avversario'}</button>`:`${soundBtn()}${setBtn()}${fsBtn()}<button class="btn sm" id="bLog">Diario</button><button class="btn sm resa" id="bResa" title="Arrenditi (Esc)">🏳 Resa</button><button class="btn sm" id="bMenu">Menu</button>`}</div>
    </div>`;
  };
  const pegSlot=(pl,isMe)=>{
    const pg=pl.pegno; const w=isMe?'me':'opp';
    if(!pg) return `<div class="pslot" data-peg="${w}"><span class="lbl">Pegno</span><span class="lbl">vuoto</span></div>`;
    const c=(isMe&&pg.n)?E.card(pg.n):null; const cost=c?E.pegnoCost(G,pl):null; const open=c&&pg.paid>=cost;
    return `<div class="pslot full ${open?'open':''}" data-peg="${w}" title="Pegno">${c&&c.art?`<img src="${c.art}" alt="">`:'<div class="bk"></div>'}${open?'':'<div class="chains"></div>'}
      ${c?`<div class="pn">${esc(c.n)}</div>`:''}<span class="lock">${open?'🔓':'🔒'}</span><span class="pl">${pg.paid}/${c?cost:'?'}</span></div>`;
  };
  const slotRow=(pl,isMe)=>{
    let h=`<div class="brow"><div class="slots">${emoInfo(pl,isMe)}`;
    pl.slots.forEach((s,i)=>{
      const blk=s.blockedUntil>=G.turn;
      const occ=s.unit&&G.units[s.unit]; h+=`<div class="slot ${occ?'occ':''} ${s.emo?'emo':''} ${s.sigillo?'sig':''} ${s.revoked?'rev':''} ${blk?'blk':''} ${(isMe&&hlSlots.has(i))||(!isMe&&hlOpp.has(i))?'hl':''}" style="--emo:${EMO_COLOR[pl.cls]};${occ?`--uc:${CLS_COLOR[E.card(occ.n).cl]}`:''}" data-slot="${isMe?'me':'opp'}:${i}">`;
      const u=s.unit&&G.units[s.unit];
      if(u && u.slots[0]===i) h+=unitHtml(u,isMe,legalT,myTurn);
      h+=`</div>`;
    });
    h+=`</div>${pegSlot(pl,isMe)}</div>`;
    const marks=`<div class="brow emorow"><div class="slots">${pl.slots.map(s=>`<div class="emk ${s.emo?'on':''} ${s.revoked?'rv':''}" style="--emo:${EMO_COLOR[pl.cls]}">${s.emo?`<img src="art/simboli/${pl.cls}.svg" alt="Emozione">`:s.revoked?'<span title="Revocato">⊘</span>':''}</div>`).join('')}</div><div class="emk pad"></div></div>`;
    return isMe ? h+marks : marks+h;
  };
  const oBack=G.oppCosm&&COSM[G.oppCosm.back]?' '+G.oppCosm.back:'';
  const oppHand=`<div class="oppHand">${o.hand.map(()=>`<div class="back${oBack}"></div>`).join('')}</div>`;
  const handHtml=p.hand.map(h=>{ const c=E.card(h.n); const k=E.costOf(G,p,h,null); const ok=myTurn&&!pd&&k<=p.gra; const live=ok&&playableNow(p,h,c);
    return miniCard(c,k,`data-h="${h.uid}"`,`${ok?'':'no'} ${live?'can':''} ${sel&&sel.uid===h.uid&&sel.kind==='play'?'selh':''} ${h.fog&&c.t==='Seguace'?'fogc':''}`, k<c.c); }).join('');
  const flipPrev=flipCapture();
  app.innerHTML=`<div class="table">
    ${heroBar(o,false)}
    <div class="ohw" style="display:flex;justify-content:center;padding:2px">${oppHand}</div>
    <div class="board">${histHtml()}${fogCounter()}${slotRow(o,false)}<div class="divider"><span></span></div>${slotRow(p,true)}</div>
    ${heroBar(p,true)}
    <div class="hand">${handHtml||'<span class="pill">Mano vuota</span>'}</div>
  </div>
  ${prompt&&!(sel&&sel.drag&&gesture)&&!dragging?`<div class="prompt">${esc(prompt2||prompt)} ${sel&&sel.step==='target'&&sel.req[sel.targets.length]&&sel.req[sel.targets.length].endsWith('Opt')?'<button class="btn sm" id="bSkip">Nessuno</button>':''} ${sel?'<button class="btn sm" id="bCancel">Annulla</button>':''}${pd&&pd.p===me&&pd.type==='sposta'?'<button class="btn sm" id="bStay">Resta</button>':''}</div>`:''}
  <div class="log ${logOn?'on':''}">${G.log.slice(-40).reverse().map(l=>`<div>${esc(l)}</div>`).join('')}</div>`;
  hideUnitPeek(); histPopHide(); bindHist(); bind(legalT,hlSlots,hlOpp); setTimeout(coinPreviewFromState,0); paintTimer(); setupHand(); if(TUT){ tutCheck(); tutHL(); }
  overlays();
  fx();
  flipPlay(flipPrev);
  G.__spInit=true; turnBanner(); setTimeout(emoBanner, document.querySelector('.turnban')?900:0);
}
// niente altro da fare: nessuna carta giocabile, potere eroe non usabile, nessun attacco possibile
function nothingLeft(){
  if(!G||G.over||G.cur!==me||G.phase!=='play'||G.pending.length) return false;
  const p=G.players[me];
  // una carta conta solo se puoi pagarla E c'è spazio: per seguaci e Domini serve uno slot libero (per il Dominio due vicini)
  const canPlay=h=>{ const c=E.card(h.n); if(!playableNow(p,h,c)) return false;
    if(c.t==='Seguace'||c.t==='Dominio'){ const usu=c.n==="L'Usurpatore"; const sl=usu?E.freeSlots(G,G.players[1-me],false):E.freeSlots(G,p,E.needsTwo(G,p,c)); return sl.some(s=>E.costOf(G,p,h,usu?null:s)<=p.gra); }
    return E.costOf(G,p,h,null)<=p.gra; };
  if(p.hand.some(canPlay)) return false;
  if(E.canPower(G,me)){ const req=E.powerReq(p); if(!req.length || p.cls==='adepto' || E.legalTargets(G,p,req[0]).length) return false; }
  if(E.minionsOf(G,p).some(u=>E.canAttack(G,u)&&E.attackTargets(G,u).length)) return false;
  if(E.canHeroAttack(G,me)&&E.heroAttackTargets(G,me).length) return false;
  return true;
}
function playableNow(p,h,c){
  if(E.playable(G,p,c)) return false;
  if(c.t==='Seguace'||c.t==='Dominio'){ if(c.n==="L'Usurpatore") return E.freeSlots(G,G.players[1-me],false).length>0; return E.freeSlots(G,p,E.needsTwo(G,p,c)).length>0; }
  return (E.TARGETS[c.n]||[]).filter(k=>!k.endsWith('Opt')).every(k=>E.legalTargets(G,p,k).length>(k==='enemy2'?1:0));
}
const SPELL_DMG={'Pietra Meteorica':3,'Vendetta degli Ungart':4,'Bisturi Runico':3,'Agguato nelle Gallerie':3};
function dmgKills(u,n){ if(!u||u.kind!=='minion'||n<=0) return false; let x=n; if(u.scaglia) x=Math.max(0,x-u.scaglia); if(x<=0) return false; const st=E.stat(u);
  if(u.paura&&!u.pauraUsed&&E.slotIsEmo(G,u)) return false; return E.slotIsEmo(G,u) ? u.turnDmg+x>=st.d : u.dmg+x>=st.d; }
let LETHAL=new Set(), KILLS=new Set(), ATK_EL=null;
function computeLethal(p,o){
  LETHAL=new Set(); KILLS=new Set(); ATK_EL=null; if(!sel) return;
  if(sel.kind==='attack'){
    const heroAtk=sel.uid==='hero'; const a=heroAtk?(p.heroA|0):E.stat(G.units[sel.uid]).a; const att=heroAtk?null:G.units[sel.uid];
    ATK_EL=heroAtk?'[data-hero="me"]':`[data-u="${sel.uid}"]`;
    const ts=heroAtk?E.heroAttackTargets(G,me):E.attackTargets(G,att);
    for(const t of ts){
      if(t==='hero'){ if(a>=o.pf+o.armor) LETHAL.add('ehero'); continue; }
      const e=G.units[t]; const pred=att&&E.hasKw(att,'Predatore')&&e.dmg>0;
      if(pred||dmgKills(e,a)) LETHAL.add(t);
      const ea=E.stat(e).a; if(!pred){ if(heroAtk){ if(ea>=p.pf+p.armor) KILLS.add(t); } else if(dmgKills(att,ea)) KILLS.add(t); }
    }
  } else if(sel.kind==='play' && sel.step==='target' && sel.targets.length===0 && SPELL_DMG[sel.n]){
    const n=SPELL_DMG[sel.n]; for(const u2 of Object.values(G.units)) if(dmgKills(u2,n)) LETHAL.add(u2.uid);
  }
}
function targetPrompt(k){ k=k.replace('Opt',''); return {divina:'Divinazione: scegli il seguace nemico di cui predici la morte',allyRoom:'Scegli un tuo seguace che può ricevere una Protesi',protAny:'Scegli il seguace da cui togliere una Protesi',allyDrago:'Scegli un tuo Drago',ally:'Scegli un tuo seguace',enemy:'Scegli un seguace nemico',enemy2:'Scegli il seguace nemico da attaccare',any:'Scegli un seguace',enemyAtk3:'Scegli un seguace nemico con 3 o meno Attacco',piombo:'Scegli il tuo eroe (Armatura) o un tuo seguace (+0/+3)'}[k]||'Scegli un bersaglio'; }
function unitHtml(u,isMe,legalT,myTurn){
  const c=E.card(u.n), st=E.stat(u), hp=st.d-u.dmg;
  const kws=unitKws(u);
  const status=[]; if(u.cantAttack||u.petri) status.push('🪨'); if(u.inCaccia) status.push('🏹 Caccia'); if(u.sick&&u.kind==='minion'&&!E.hasKw(u,'Momentum')&&isMe&&myTurn) status.push('💤'); if(u.stonata) status.push('♪ stonata'); if(u.divBy&&u.divBy.length) status.push('👁 Divinazione'); if(u.silenced) status.push('Esorcizzato'); if(u.tempFrom) status.push('Controllato'); if(u.legato) status.push('♥ Legato'); if(u.ambizione&&E.slotIsEmo(G,u)) status.push('▲ Ambizione'); if(u.n==='Tisquy') status.push('Anime '+u.anime); if(u.ctrl!=null&&u.ctrl!==u.owner) status.push('Infiltrato'); if(u.tmpOrd) status.push('Ordalia fino al tuo turno'); if(u.paura&&!u.pauraUsed&&E.slotIsEmo(G,u)) status.push('◆ Paura'); if(u.n==='Orologio della Violenza') status.push('Orologio '+(u.clock||0)+'/5'); if(u.esca) status.push('Esca'); if(u.fugaUsed) status.push('Fuga usata'); if(u.prot&&u.prot.length) status.push('⚙ '+u.prot.length+' Protesi'); if(u.n==='Uovo di Magga'||u.n==='Cucciolo di Magga'||(u.n==='Magga Giovane'&&u.grown)) status.push('Cresce'); if(u.salassoHero) status.push('Salasso → eroe');
  const ready=isMe&&myTurn&&E.canAttack(G,u)&&E.attackTargets(G,u).length;
  const live=!u.silenced&&E.slotIsEmo(G,u)&&/Empatia/.test(c.x);
  const cls=['unit',LETHAL.has(u.uid)?'lethal':'',KILLS.has(u.uid)?'kills':'',shielded.has(u.uid)?'shd':'',kws.includes('Ordalia')&&!u.akw.__noOrdalia?'ord':'',kws.includes('Lascito')?'lasc':'',kws.includes('Volo')?'volo':'',kws.includes('Estraneo')?'estr':'',u.tempra>0?'temp':'',(u.cantAttack||u.petri)?'petr':'',u.silenced?'sil':'',live?'emp':'',c.r==='Leggendaria'?'leg':'',u.kind==='domain'?'dom':'',u.kind!=='domain'&&u.slots.length>1?'wide':'',ready?'ready':'',sel&&sel.uid===u.uid&&sel.kind==='attack'?'sel':'',legalT.has(u.uid)?'tg':''].join(' ');
  const sp=spawnInfo(u,c);
  return `<div class="${cls} ${sp.cls}" style="--uc:${CLS_COLOR[c.cl]};--emo:${EMO_COLOR[G.players[u.owner].cls]};${sp.style}" data-u="${u.uid}">${sp.fx}${stoneHtml(u)}
    ${c.art?`<img src="${c.art}" alt="">`:''}${rarGem(c)}<div class="nm">${esc(tn(u.n))}</div>
    <div class="st">${status.map(s=>`<span>${s}</span>`).join('')}</div>
    <div class="kwi">${kws.map(k=>`<span class="k-${k.replace(/ /g,'')}" data-kw="${esc(k)}">${KW_ICON[k]||'•'}</span>`).join('')}</div>${kws.includes('Ordalia')&&!u.akw.__noOrdalia?'<div class="ordshield"></div>':''}
    ${LETHAL.has(u.uid)||(sel&&sel.kind==='attack'&&sel.uid===u.uid)?'<div class="skull">☠</div>':''}${u.scaglia?`<div class="sc" title="Scaglia">${u.scaglia}</div>`:''}${u.kind==='minion'?`<div class="a">${st.a}</div>`:''}<div class="d ${u.dmg?'hurt':''}">${hp}</div></div>`;
}
function miniCard(c,cost,attrs,extra,down){
  const art=c.art?`<img class="ar" src="${c.art}" alt="">`:`<div class="ph">${c.star?'✦':c.nuova&&c.cl!=='neutrali'?`<img class="phs" src="art/simboli/${c.cl}.svg" alt="">`:'◆'}</div>`;
  return `<div class="mc t-${c.t} ${c.r==='Leggendaria'?'leg':''} ${extra||''}" style="--uc:${CLS_COLOR[c.cl]}" ${attrs||''}>${art}${rose(c)}<div class="cost ${down?'dn':''}">${cost}</div>
    <div class="nm">${esc(tn(c.n))}</div><div class="tx fit">${kwHtml(tx(c))}</div>
    <div class="mbot">${c.t==='Seguace'?`<div class="a">${c.a}</div>`:'<span></span>'}${rarGem(c)||'<span></span>'}${c.t==='Seguace'||c.t==='Dominio'?`<div class="d">${c.d}</div>`:'<span></span>'}</div></div>`;
}
function typePlate(c){ return `<div class="tplate r-${({Comune:'c',Rara:'r',Epica:'e',Leggendaria:'l',Gettone:'g'})[c.r]||'g'}"><span>${esc(c.t)}</span>${c.tr?`<i>◆</i><span>${esc(c.tr)}</span>`:''}<i>◆</i><span>${esc(c.r)}</span></div>`; }
function colCard(c,attrs,extra){
  const art=c.art?`<img class="ar" src="${c.art}" alt="">`:`<div class="ph">${c.star?'✦':c.nuova&&c.cl!=='neutrali'?`<img class="phs" src="art/simboli/${c.cl}.svg" alt="">`:'◆'}</div>`;
  const stats=c.t==='Seguace'?`<div class="a">${c.a}</div>`:'';
  const def=(c.t==='Seguace'||c.t==='Dominio')?`<div class="d">${c.d}</div>`:'';
  return `<div class="cc t-${c.t} ${c.r==='Leggendaria'?'leg':''} ${extra||''}" style="--uc:${CLS_COLOR[c.cl]}" ${attrs||''}>
    <div class="cart">${art}<div class="cost">${c.c}</div>${rose(c)}</div>
    <div class="cnm">${esc(tn(c.n))}</div>${typePlate(c)}
    <div class="ctx fit">${kwHtml(tx(c))}</div>
    <div class="cbot">${stats||'<span></span>'}${rarGem(c,false)||'<span></span>'}${def||'<span></span>'}</div></div>`;
}
function bigCard(c,u){
  const st=u?E.stat(u):null;
  return `<div class="big t-${c.t}" style="--uc:${CLS_COLOR[c.cl]};position:relative">${rose(c)}${c.art?`<img src="${c.art}" alt="">`:''}<div class="cost">${c.c}</div>
   <div class="h">${esc(c.n)}</div>${typePlate(c)}
   <div class="x fit">${kwHtml(tx(c))}</div>
   ${c.t==='Seguace'?`<div class="sa"><span>${st?st.a:c.a}</span><span>${st?st.d-u.dmg:c.d}</span></div>`:c.t==='Dominio'?`<div class="sa"><span style="visibility:hidden"></span><span>${st?st.d-u.dmg:c.d}</span></div>`:''}</div>`;
}

// ======================= MANO: sempre tutta visibile, carta ingrandita al passaggio
let peekUid=null, peekMoved=false, peekTimer=null, suppressClick=false;
function fitHand(){
  const hd=$('.hand'); if(!hd) return; const cs=[...hd.querySelectorAll('.mc')];
  const fan=window.innerWidth>760||LP(); hd.classList.toggle('fan',fan);
  cs.forEach(c=>{ c.style.marginLeft='0px'; c.style.removeProperty('--fan'); });
  if(cs.length){
    const w=cs[0].offsetWidth, avail=Math.min(hd.clientWidth-16, fan?w*7.2:1e9), n=cs.length, need=n*w+(n-1)*6;
    const gap = need<=avail ? (fan?-w*0.12:6) : -Math.min(w*0.66,(n*w-avail)/(n-1));
    const step=fan?Math.min(7,44/Math.max(1,n-1)):0;
    cs.forEach((c,i)=>{ if(i) c.style.marginLeft=gap+'px'; c.style.zIndex=i+1;
      if(fan){ const k=i-(n-1)/2; c.style.setProperty('--fan',`translateY(${Math.round(k*k*step*0.55)}px) rotate(${(k*step).toFixed(2)}deg)`); } });
  }
  hd.classList.add('measure'); measureHand(); handHover(); void hd.offsetWidth; hd.classList.remove('measure');
  const oh=$('.oppHand'); if(oh){ const bs=[...oh.querySelectorAll('.back')], m=bs.length;
    bs.forEach((b2,i)=>{ const k=i-(m-1)/2; b2.style.transform=fan?`translateY(${Math.round(-k*k*1.2)}px) rotate(${(-k*5).toFixed(1)}deg)`:''; b2.style.marginLeft=(fan&&i)?'-10px':''; }); }
}
function showPeek(el){
  const uid=+el.dataset.h; if(peekUid===uid) return; hidePeek(true); peekUid=uid;
  const h=G.players[me].hand.find(x=>x.uid===uid); if(!h) return;
  el.classList.add('peekon');
  const d=document.createElement('div'); d.className='peek'; d.id='peek'; d.innerHTML=bigCard(E.card(h.n));
  document.body.appendChild(d);
  const r=el.getBoundingClientRect(), hd=$('.hand').getBoundingClientRect();
  const half=Math.min(115,window.innerWidth*0.31); const x=Math.max(half+6,Math.min(window.innerWidth-half-6,r.left+r.width/2));
  d.style.left=x+'px'; d.style.bottom=(window.innerHeight-hd.top+6)+'px';
}
function showUnitPeek(el){
  hideUnitPeek(); const u=G&&G.units[+el.dataset.u]; if(!u||window.innerWidth<=760) return;
  const d=document.createElement('div'); d.className='upeek'; d.id='upeek'; d.innerHTML=bigCard(E.card(u.n),u); document.body.appendChild(d);
  const r=el.getBoundingClientRect(), w=d.offsetWidth, h=d.offsetHeight;
  let x=r.right+12; if(x+w>innerWidth-8) x=r.left-12-w; let y=r.top+r.height/2-h/2; y=Math.max(8,Math.min(innerHeight-h-8,y));
  d.style.left=x+'px'; d.style.top=y+'px';
}
function hideUnitPeek(){ const d=$('#upeek'); if(d) d.remove(); }
function hidePeek(keep){ const d=$('#peek'); if(d) d.remove(); app.querySelectorAll('.peekon').forEach(e=>e.classList.remove('peekon')); if(!keep) peekUid=null; else peekUid=null; }
let gesture=null, ghost=null;
function cardAtPt(x,y){ const e=document.elementFromPoint(x,y); return e&&e.closest&&e.closest('.hand .mc'); }
function canDragCard(uid){
  const p=G.players[me]; const h=p.hand.find(x=>x.uid===uid); if(!h) return false;
  if(!(G.cur===me&&G.phase==='play'&&!G.pending.length&&!G.over)) return false;
  const c=E.card(h.n); const k=E.costOf(G,p,h,null); const unit=(c.t==='Seguace'||c.t==='Dominio')&&c.n!=="L'Usurpatore";
  return (k<=p.gra || (unit&&k-1<=p.gra)) && playableNow(p,h,c);
}
// Hover della mano col mouse: la carta si alza solo tramite la classe .hv, e il punto toccato si confronta
// con la posizione "a riposo" delle carte, così la carta sollevata non sfugge al mouse e non sfarfalla.
let HAND_RECTS=null, MOUSE_XY=null;
function measureHand(){ const hd=$('.hand'); if(!hd){ HAND_RECTS=null; return; }
  const had=hd.classList.contains('measure'); hd.classList.add('measure'); const up=[...hd.querySelectorAll('.mc.hv')]; up.forEach(c=>c.classList.remove('hv'));
  HAND_RECTS=[...hd.querySelectorAll('.mc')].map(c=>({el:c,r:c.getBoundingClientRect()}));
  up.forEach(c=>c.classList.add('hv')); void hd.offsetWidth; if(!had) hd.classList.remove('measure'); }
function handHover(){
  const hd=$('.hand'); if(!hd||!MOUSE_XY||gesture||!G) return; const cur=hd.querySelector('.mc.hv');
  if(!hd.classList.contains('fan')){ if(cur) cur.classList.remove('hv'); return; }
  if(!HAND_RECTS||HAND_RECTS.some(x=>!x.el.isConnected)) measureHand(); if(!HAND_RECTS) return;
  const [x,y]=MOUSE_XY; const inR=(r,pad)=>x>=r.left-pad&&x<=r.right+pad&&y>=r.top-pad&&y<=r.bottom+pad;
  if(cur){ const base=(HAND_RECTS.find(h=>h.el===cur)||{}).r, r=cur.getBoundingClientRect(); if(base && y<base.top && inR(r,4)) return; }
  let hit=null; for(let i=HAND_RECTS.length-1;i>=0;i--){ if(inR(HAND_RECTS[i].r,0)){ hit=HAND_RECTS[i].el; break; } }
  if(hit!==cur){ if(cur) cur.classList.remove('hv'); if(hit) hit.classList.add('hv'); coinPreviewFromState(); }
}
document.addEventListener('pointermove',ev=>{ if(ev.pointerType!=='mouse') return; MOUSE_XY=[ev.clientX,ev.clientY]; handHover(); },{passive:true});
document.addEventListener('mouseout',e=>{ if(e.relatedTarget) return; MOUSE_XY=null; const c=document.querySelector('.hand .mc.hv'); if(c) c.classList.remove('hv'); });
window.addEventListener('resize',()=>{ HAND_RECTS=null; });
function setupHand(){
  const hd=$('.hand'); if(!hd) return; fitHand(); if(!gesture) hidePeek();
  hd.onpointerdown=ev=>{
    if(gesture || (ev.pointerType==='mouse'&&ev.button!==0)) return; const c=ev.target.closest&&ev.target.closest('.hand .mc');
    gesture={type:ev.pointerType,sx:ev.clientX,sy:ev.clientY,uid:c?+c.dataset.h:null,mode:null};
    suppressClick=false; clearTimeout(peekTimer);
    if(ev.pointerType!=='mouse' && c) peekTimer=setTimeout(()=>{ if(gesture&&!gesture.mode){ gesture.mode='peek'; showPeek(c); suppressClick=true; } },180);
    window.addEventListener('pointermove',gMove); window.addEventListener('pointerup',gUp); window.addEventListener('pointercancel',gUp);
  };
  hd.onpointermove=ev=>{ if(ev.pointerType==='mouse'&&!gesture&&!hd.classList.contains('fan')){ const c=cardAtPt(ev.clientX,ev.clientY); if(c) showPeek(c); else hidePeek(); } };
  hd.onpointerleave=ev=>{ if(ev.pointerType==='mouse'&&!gesture) hidePeek(); };
  hd.addEventListener('click',ev=>{ if(suppressClick){ ev.stopPropagation(); ev.preventDefault(); suppressClick=false; } },true);
}
function gMove(ev){
  const g=gesture; if(!g) return;
  if(g.mode==='drag'){ moveGhost(ev); return; }
  const dist=Math.hypot(ev.clientX-g.sx,ev.clientY-g.sy); const hd=$('.hand'); const top=hd?hd.getBoundingClientRect().top:innerHeight;
  const wantDrag = g.uid!=null && ((g.type==='mouse'&&dist>10) || (g.type!=='mouse'&&ev.clientY<top-6)) && canDragCard(g.uid);
  if(wantDrag){ clearTimeout(peekTimer); hidePeek(); startCardDrag(g,ev); return; }
  if(g.type!=='mouse' && (g.mode==='peek'||dist>12)){ g.mode='peek'; suppressClick=true; clearTimeout(peekTimer); const c=cardAtPt(ev.clientX,ev.clientY); if(c) showPeek(c); }
}
function gUp(ev){
  window.removeEventListener('pointermove',gMove); window.removeEventListener('pointerup',gUp); window.removeEventListener('pointercancel',gUp);
  clearTimeout(peekTimer); const g=gesture; gesture=null; if(!g) return;
  if(g.mode==='drag'){ suppressClick=true; setTimeout(()=>suppressClick=false,350); endCardDrag(ev); }
  else if(g.mode==='peek'){ hidePeek(); }
}
function startCardDrag(g,ev){
  g.mode='drag'; const p=G.players[me]; const h=p.hand.find(x=>x.uid===g.uid); const c=E.card(h.n);
  sel={kind:'play',uid:h.uid,n:c.n,slot:null,targets:[],req:E.TARGETS[c.n]||[],drag:true};
  sel.step=c.n==="L'Usurpatore"?'eslot':(c.t==='Seguace'||c.t==='Dominio')?'slot':'target';
  render(); if(sel.step==='target'&&!sel.req.length){ const b=$('.board'); if(b) b.classList.add('drop'); }
  if(sel.step==='target' && sel.req.length){ cardArrow=mkArrow(ev.clientX,ev.clientY-20,'#7fd4ff'); ghost=document.createElement('div'); ghost.className='ghost spell'; ghost.innerHTML=miniCard(c,E.costOf(G,p,h,null)); ghost.style.left=ev.clientX+'px'; ghost.style.top=(ev.clientY-20)+'px'; document.body.appendChild(ghost); moveGhost(ev); return; }
  ghost=document.createElement('div'); ghost.className='ghost'; ghost.innerHTML=miniCard(c,E.costOf(G,p,h,null)); document.body.appendChild(ghost); moveGhost(ev);
}
let cardArrow=null;
function moveGhost(ev){
  if(!ghost) return; if(cardArrow) cardArrow.to(ev.clientX,ev.clientY); else { ghost.style.left=ev.clientX+'px'; ghost.style.top=ev.clientY+'px'; }
  app.querySelectorAll('.hov').forEach(x=>x.classList.remove('hov'));
  const el=document.elementFromPoint(ev.clientX,ev.clientY); const t=el&&el.closest&&el.closest('.slot.hl,.unit.tg,.hero.tg'); if(t) t.classList.add('hov'); doomAttacker(false);
}
function endCardDrag(ev){
  if(ghost){ ghost.remove(); ghost=null; } if(cardArrow){ cardArrow.remove(); cardArrow=null; } app.querySelectorAll('.hov').forEach(x=>x.classList.remove('hov'));
  if(!sel){ render(); return; }
  const el=document.elementFromPoint(ev.clientX,ev.clientY); const at=q=>el&&el.closest&&el.closest(q);
  if(sel.step==='slot'||sel.step==='eslot'){ const s=at('.slot.hl'); if(s){ sel.slot=+s.dataset.slot.split(':')[1]; if(sel.step==='eslot') sel.step='slot'; return advance(); } }
  else if(sel.step==='target'){
    if(sel.req.length){ const t=at('.unit.tg'); if(t){ sel.targets.push(+t.dataset.u); return advance(); } const hh=at('.hero.tg'); if(hh){ sel.targets.push('hero'); return advance(); } }
    else if(at('.board')) return advance();
  }
  sel=null; render(); toast('Carta riportata in mano');
}
window.addEventListener('resize',()=>{ if(G) fitHand(); });

// ======================= FRECCIA DI TRASCINAMENTO (si allunga fino al bersaglio)
function mkArrow(sx,sy,color){
  color=color||'#ffd34d';
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('class','dragline');
  svg.innerHTML=`<defs><marker id="ah2" markerWidth="12" markerHeight="12" refX="7" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L12,6 L0,12 z" fill="${color}"/></marker><filter id="gl"><feGaussianBlur stdDeviation="3"/></filter></defs>
    <path class="glow" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round" opacity=".35" filter="url(#gl)"/>
    <path class="ln" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="1 12" marker-end="url(#ah2)"/>
    <circle cx="${sx}" cy="${sy}" r="9" fill="none" stroke="${color}" stroke-width="3"/>`;
  document.body.appendChild(svg);
  const ps=svg.querySelectorAll('path.glow,path.ln');
  const a={ to(x,y){ const dx=x-sx, dy=y-sy, d=Math.hypot(dx,dy)||1; const bend=Math.min(80,d*0.25); const mx=(sx+x)/2 - dy/d*bend*0.4, my=(sy+y)/2 - Math.abs(dx)/d*bend - 10;
      ps.forEach(p=>p.setAttribute('d',`M${sx},${sy} Q${mx},${my} ${x},${y}`)); },
    remove(){ svg.remove(); } };
  a.to(sx,sy); return a;
}
function hoverAt(x,y,q){ app.querySelectorAll('.hov').forEach(e=>e.classList.remove('hov')); const el=document.elementFromPoint(x,y); const t=el&&el.closest&&el.closest(q); if(t) t.classList.add('hov'); doomAttacker(t&&t.classList.contains('kills')); return t; }
function doomAttacker(on){ app.querySelectorAll('.doomed').forEach(e=>e.classList.remove('doomed')); if(on&&ATK_EL){ const a=app.querySelector(ATK_EL); if(a) a.classList.add('doomed'); } }
// attacco trascinando: dal seguace (o dal tuo eroe) al bersaglio
function attackDragStart(ev,uid){
  if(!ev.isPrimary || (ev.pointerType==='mouse'&&ev.button!==0)) return; if(ev.pointerType==='mouse') ev.preventDefault(); const r=ev.currentTarget.getBoundingClientRect(); const sx=r.left+r.width/2, sy=r.top+r.height/2;
  const px=ev.clientX, py=ev.clientY; let started=false, arrow=null;
  const mv=e=>{ if(!started && Math.hypot(e.clientX-px,e.clientY-py)>10){ started=true; dragging=true; sel={kind:'attack',uid}; render(); arrow=mkArrow(sx,sy,'#ff6a4d'); }
    if(started){ arrow.to(e.clientX,e.clientY); hoverAt(e.clientX,e.clientY,'.unit.tg,.hero.tg'); } };
  const off=()=>{ window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up); if(DRAG_ABORT===abort) DRAG_ABORT=null; };
  const abort=()=>{ off(); if(!started) return; if(arrow) arrow.remove(); dragging=false; dragJustEnded=true; setTimeout(()=>dragJustEnded=false,300); doomAttacker(false); app.querySelectorAll('.hov').forEach(x=>x.classList.remove('hov')); sel=null; render(); toast('Attacco annullato'); };
  DRAG_ABORT=abort;
  const up=e=>{ off();
    if(!started) return; arrow.remove(); dragging=false; dragJustEnded=true; setTimeout(()=>dragJustEnded=false,300);
    const el=document.elementFromPoint(e.clientX,e.clientY); const t=el&&el.closest&&el.closest('.unit.tg,.hero.tg');
    if(t && Math.hypot(e.clientX-sx,e.clientY-sy)>30){ const target=t.dataset.u?+t.dataset.u:'hero'; return send({type:'attack',uid,target}); }
    sel=null; render(); };
  window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up);
}

// ======================= POTERE EROE TRASCINABILE (se ha un bersaglio)
let dragJustEnded=false, dragging=false;
function powerTarget(pl){ const r=E.powerReq(pl); return r.length?r[0]:null; }
function powerDragStart(ev){
  if(ev.pointerType==='mouse'&&ev.button!==0) return; const pl=G.players[me]; const kind=powerTarget(pl); if(!kind||!E.canPower(G,me)) return;
  ev.preventDefault(); const r=ev.currentTarget.getBoundingClientRect(); const sx=r.left+r.width/2, sy=r.top+r.height/2;
  const px=ev.clientX, py=ev.clientY; let started=false, arrow=null;
  const mv=e=>{ if(!started && Math.hypot(e.clientX-px,e.clientY-py)>10){ started=true; dragging=true; sel={kind:'power',step:'target',req:E.powerReq(pl),targets:[]}; render(); arrow=mkArrow(sx,sy); }
    if(started){ arrow.to(e.clientX,e.clientY); hoverAt(e.clientX,e.clientY,'.unit.tg'); } };
  const off=()=>{ window.removeEventListener('pointermove',mv); window.removeEventListener('pointerup',up); window.removeEventListener('pointercancel',up); if(DRAG_ABORT===abort) DRAG_ABORT=null; };
  const abort=()=>{ off(); if(!started) return; if(arrow) arrow.remove(); dragging=false; dragJustEnded=true; setTimeout(()=>dragJustEnded=false,300); app.querySelectorAll('.hov').forEach(x=>x.classList.remove('hov')); sel=null; render(); toast('Potere annullato'); };
  DRAG_ABORT=abort;
  const up=e=>{ off();
    if(!started) return; arrow.remove(); dragging=false; dragJustEnded=true; setTimeout(()=>dragJustEnded=false,300);
    const el=document.elementFromPoint(e.clientX,e.clientY); const t=el&&el.closest&&el.closest('.unit.tg');
    const back=Math.hypot(e.clientX-sx,e.clientY-sy)<36;
    if(t && !back){ sel.targets.push(+t.dataset.u); advance(); }
    else { sel=null; render(); toast(back?'Potere annullato':'Nessun bersaglio: potere annullato'); } };
  window.addEventListener('pointermove',mv); window.addEventListener('pointerup',up); window.addEventListener('pointercancel',up);
}

// ======================= CLICK
function bind(legalT,hlSlots,hlOpp){
  const p=G.players[me];
  const bEnd=$('#bEnd'); if(bEnd) bEnd.onclick=()=>{ if(G.over) return menu(); if(G.cur===me&&!G.pending.length) send({type:'end'}); };
  $('#bLog').onclick=()=>{logOn=!logOn;render();};
  bindSound(); bindSet();
  $('#bMenu').onclick=()=>{ if(confirmBox('Tornare al menu? La partita in corso si chiude.')) {} };
  { const br=$('#bResa'); if(br) br.onclick=askSurrender; }
  const sk=$('#bSkip'); if(sk) sk.onclick=()=>{ sel.targets.push(null); advance(); };
  const bc=$('#bCancel'); if(bc) bc.onclick=()=>{ sel=null; render(); };
  const bs=$('#bStay'); if(bs) bs.onclick=()=>send({type:'choose',choice:-1});
  app.querySelectorAll('[data-h]').forEach(e=>e.onclick=()=>handClick(+e.dataset.h));
  app.querySelectorAll('.kills').forEach(e=>{ e.addEventListener('pointerenter',()=>doomAttacker(true)); e.addEventListener('pointerleave',()=>doomAttacker(false)); });
  app.querySelectorAll('[data-u]').forEach(e=>{ e.onclick=ev=>{ ev.stopPropagation(); if(dragJustEnded){ dragJustEnded=false; return; } unitClick(+e.dataset.u,legalT); };
    if(e.classList.contains('ready')) e.onpointerdown=ev=>attackDragStart(ev,+e.dataset.u);
    e.onpointerenter=ev=>{ if(ev.pointerType==='mouse'&&!dragging&&!gesture&&!sel) showUnitPeek(e); };
    e.onpointerleave=ev=>{ if(ev.pointerType==='mouse') hideUnitPeek(); }; });
  const hme=app.querySelector('[data-hero="me"].ready'); if(hme) hme.onpointerdown=ev=>attackDragStart(ev,'hero');
  app.querySelectorAll('[data-slot]').forEach(e=>e.onclick=()=>{ const [w,i]=e.dataset.slot.split(':'); slotClick(w,+i,w==='me'?hlSlots:hlOpp); });
  app.querySelectorAll('[data-hero]').forEach(e=>e.onclick=()=>{ if(dragJustEnded){ dragJustEnded=false; return; } heroClick(e.dataset.hero,legalT); });
  app.querySelectorAll('[data-power]').forEach(e=>e.onclick=()=>{ if(dragJustEnded){ dragJustEnded=false; return; } powerClick(e.dataset.power); });
  const pme=app.querySelector('[data-power="me"]'); if(pme) pme.onpointerdown=powerDragStart;
  app.querySelectorAll('[data-peg]').forEach(e=>e.onclick=()=>pegnoInfo(e.dataset.peg));
}
function askSurrender(){
  if(!G||G.over) return;
  const rk=G.ranked;
  modal(`<h3>Vuoi arrenderti?</h3><div class="note" style="margin:0 auto 10px">La partita finisce subito e vince ${NET?'l\'avversario':'il computer'}.${rk?' In <b>classificata</b> conta come sconfitta.':''}</div><div class="row"><button class="btn" id="srYes">🏳 Mi arrendo</button><button class="btn" id="srNo">Continua a giocare</button></div>`);
  $('#srNo').onclick=closeModal;
  $('#srYes').onclick=()=>{ closeModal(); if(!G||G.over) return; send({type:'concede'}); };
}
function confirmBox(msg){
  const rk=G&&G.ranked&&!G.over;
  modal(`<h3>${esc(msg)}</h3>${rk?'<div class="note" style="margin:0 auto 10px">È una partita <b>classificata</b>: abbandonare conta come sconfitta.</div>':''}<div class="row"><button class="btn" id="mYes">Sì</button><button class="btn" id="mNo">No</button></div>`);
  $('#mYes').onclick=()=>{ closeModal(); if(rk&&!G.__rankDone){ G.__rankDone=true; rankResult(false,G.oppRank); toast('Partita abbandonata: −1 pendente'); } const n=NET; if(n){ if(G&&!G.over){ try{ n.local(E.enrich(G,me,{type:'concede'})); }catch(e){} } setTimeout(()=>{ try{ n.leave(); }catch(e){} },600); } menu(); }; $('#mNo').onclick=closeModal;
}
function modal(html,cls){ closeModal(); hidePeek(); const d=document.createElement('div'); d.className='ov'; d.id='ov'; d.innerHTML=`<div class="box ${cls||''}">${html}</div>`; d.onclick=e=>{ if(e.target===d && !d.dataset.lock) closeModal(); }; document.body.appendChild(d); return d; }
function closeModal(){ const d=$('#ov'); if(d) d.remove(); }

function handClick(uid){
  const p=G.players[me]; const h=p.hand.find(x=>x.uid===uid); if(!h) return;
  const c=E.card(h.n); const myTurn=G.cur===me&&G.phase==='play'&&!G.pending.length&&!G.over;
  const cost=E.costOf(G,p,h,null);
  const needT=(E.TARGETS[c.n]||[]).filter(k=>!k.endsWith('Opt'));
  const hasT=(c.t==='Seguace'||c.t==='Dominio') || needT.every(k=>E.legalTargets(G,p,k).length>(k==='enemy2'?1:0));
  const isUnit=c.t==='Seguace'||c.t==='Dominio'; const usurp=c.n==="L'Usurpatore"; const ex=E.playable(G,p,c);
  const canPlay=myTurn && hasT && !ex && (usurp ? cost<=p.gra : isUnit ? cost<=p.gra+1 && E.freeSlots(G,p,E.needsTwo(G,p,c)).length>0 : cost<=p.gra);
  const canPeg=myTurn&&!p.pegno&&p.gra>=1;
  modal(`${bigCard(c)}<div class="row" style="margin-top:12px">
    ${canPlay?`<button class="btn" id="mPlay">Gioca</button>`:''}
    ${canPeg?`<button class="btn" id="mPeg">Metti nel Pegno (1 GRA)</button>`:''}
    <button class="btn" id="mClose">Chiudi</button></div>
    ${myTurn&&!canPlay?`<div class="note" style="margin:8px auto 0">${ex?esc(ex.charAt(0).toUpperCase()+ex.slice(1))+'.':!hasT?'Nessun bersaglio valido.':'GRA insufficiente o nessuno slot libero.'}</div>`:''}
    ${myTurn&&!p.pegno&&p.gra<1?`<div class="note" style="margin:6px auto 0">Per mettere una carta nel Pegno serve almeno 1 GRA libero.</div>`:''}`);
  $('#mClose').onclick=closeModal;
  const mp=$('#mPlay'); if(mp) mp.onclick=()=>{ closeModal(); startPlay(h,c); };
  const pg=$('#mPeg'); if(pg) pg.onclick=()=>{ closeModal(); send({type:'pegno',uid}); };
}
function startPlay(h,c){
  sel={kind:'play',uid:h.uid,n:c.n,slot:null,targets:[],req:E.TARGETS[c.n]||[]};
  sel.step=c.n==="L'Usurpatore"?'eslot':(c.t==='Seguace'||c.t==='Dominio')?'slot':'target';
  advance();
}
function advance(){
  const p=G.players[me];
  if(sel.step==='target'||((sel.step==='slot'||sel.step==='eslot')&&sel.slot!=null)){
    sel.step='target';
    while(sel.targets.length<sel.req.length){
      const kind=sel.req[sel.targets.length]; const leg=E.legalTargets(G,p,kind).filter(x=>!sel.targets.includes(x));
      if(!leg.length){ if(kind.endsWith('Opt')){ sel.targets.push(null); continue; } toast('Nessun bersaglio valido'); sel=null; render(); return; }
      render(); return;
    }
    if(sel.kind==='power') return send({type:'power',target:sel.targets.length>1?sel.targets:sel.targets[0]});
    const h=p.hand.find(x=>x.uid===sel.uid); const cost=E.costOf(G,p,h,sel.n==="L'Usurpatore"?null:sel.slot);
    if(cost>p.gra){ toast('GRA insufficiente'); sel=null; render(); return; }
    return send({type:'play',uid:sel.uid,slot:sel.slot,targets:sel.targets});
  }
  render();
}
function slotClick(w,i,hl){
  const p=G.players[me]; const pd=G.pending[0];
  if(pd&&pd.p===me&&pd.type==='emo'&&w==='me'&&hl.has(i)) return send({type:'choose',choice:i});
  if(pd&&pd.p===me&&pd.type==='sposta'&&w==='me'&&hl.has(i)) return send({type:'choose',choice:i});
  if(pd&&pd.p===me&&pd.type==='decreto'&&sel&&sel.kind==='decreto'&&hl.has(i)){ const k=sel.k; sel=null; return send({type:'choose',choice:{k,slot:i}}); }
  if(sel&&sel.step==='slot'&&w==='me'&&hl.has(i)){ sel.slot=i; advance(); }
  if(sel&&sel.step==='eslot'&&w==='opp'&&hl.has(i)){ sel.slot=i; sel.step='slot'; advance(); }
}
function unitClick(uid,legalT){
  const u=G.units[uid]; if(!u) return;
  const pd0=G.pending[0];
  if(pd0&&pd0.p===me&&pd0.type==='decreto'&&sel&&sel.kind==='decreto'){ const pl=G.players[u.owner]; const i=u.slots.find(k=>!pl.slots[k].emo&&!pl.slots[k].revoked);
    if(i!=null && ((sel.k==='sigillo'&&u.owner===me)||(sel.k==='revoca'&&u.owner!==me))){ const k=sel.k; sel=null; return send({type:'choose',choice:{k,slot:i}}); } return; }
  if(pd0&&pd0.p===me&&pd0.type==='emo'&&u.owner===me){ const i=u.slots.find(k=>!G.players[me].slots[k].emo); if(i!=null) return send({type:'choose',choice:i}); return; }
  if(sel&&sel.step==='slot') return;
  if(sel&&sel.kind==='attack'&&shielded.has(uid)){ sfx('ord'); toast('Ordalia: devi attaccare prima il seguace con Ordalia'); return; }
  if(sel&&sel.step==='target'&&legalT.has(uid)){ sel.targets.push(uid); return advance(); }
  if(sel&&sel.kind==='attack'&&legalT.has(uid)) return send({type:'attack',uid:sel.uid,target:uid});
  const myTurn=G.cur===me&&G.phase==='play'&&!G.pending.length&&!G.over;
  if(u.owner===me&&myTurn&&E.canAttack(G,u)&&E.attackTargets(G,u).length&&!(sel&&sel.kind==='attack'&&sel.uid===uid)){ sel={kind:'attack',uid}; return render(); }
  // dettaglio
  const c=E.card(u.n);
  const extra=[]; if(E.slotIsEmo(G,u)) extra.push('In uno slot d\'Emozione: '+(u.kind==='domain'?'Empatia attiva.':'la Difesa è una soglia (muore solo se in un turno subisce danni pari o superiori).'));
  for(const k of unitKws(u)) extra.push(KW_ICON[k]+' '+k+': '+KW_DESC[k]);
  if(u.inCaccia) extra.push('In Caccia: non può essere attaccato né bersagliato fino all\'inizio del turno del suo giocatore.');
  if(u.cantAttack||u.petri) extra.push('Pietrificato: non può attaccare nel suo prossimo turno.');
  if(u.stonata) extra.push('Strofa stonata: i suoi alleati hanno −1/−1.');
  if(u.legato) extra.push('Legato (Amore): quando muore, i seguaci accanto ottengono +1/+1.');
  if(u.ambizione) extra.push('Ambizione: all\'inizio di ogni tuo turno ottiene +1 Attacco, e il tuo eroe +1 Attacco per quel turno, finché resta nello slot d\'Emozione.');
  if(u.n==='Tisquy') extra.push('Anime raccolte: '+u.anime+' su 5.');
  if(u.paura) extra.push(u.pauraUsed?'Paura già usata.':'Paura: la prima volta che morirebbe in uno slot d\'Emozione, sopravvive con 1 Difesa.');
  if(E.hasKw(u,'Via di fuga')) extra.push('Via di fuga: la prima volta che muore, torna in gioco con 1 Difesa.');
  if(u.fugaUsed) extra.push('Ha già usato Via di fuga.');
  if(u.esca) extra.push('Esca: occupa 2 slot. Lascito: Riscatto 1 al tuo prossimo turno.');
  if(u.n==='Orologio della Violenza') extra.push('Orologio: '+(u.clock||0)+' su 5.');
  if(u.scaglia) extra.push('Scaglia '+u.scaglia+': assorbe i prossimi '+u.scaglia+' danni.');
  if(u.prot&&u.prot.length) extra.push('Protesi: '+u.prot.map(x=>x.n+' (+'+x.a+'/+'+x.d+')').join(', ')+'.');
  if(u.meraviglia) extra.push('Meraviglia: in uno slot d\'Emozione può reggere una Protesi in più, e la prima Incisione su di lui costa 1 GRA.');
  if(u.n==='Uovo di Magga') extra.push('Si schiude dopo 2 tuoi turni (ora: '+(u.age||0)+').');
  if(u.ctrl!=null&&u.ctrl!==u.owner) extra.push('Infiltrato: non può attaccare. Quando muore, infligge 4 danni a un seguace accanto.');
  if(u.tempra) extra.push('Tempra: '+u.tempra+' carica/e.');
  if(u.stars) extra.push('Stelle ricevute: '+u.stars+'/'+(E.STAR_MAX||5)+(u.stars>=(E.STAR_MAX||5)?' — non può riceverne altre.':'.'));
  sel=null; render();
  modal(`${bigCard(c,u)}${extra.map(x=>`<div class="note" style="margin:8px auto 0">${esc(x)}</div>`).join('')}<div class="row" style="margin-top:10px"><button class="btn" id="mClose">Chiudi</button></div>`);
  $('#mClose').onclick=closeModal;
}
function heroClick(w,legalT){
  if(w==='me'&&!sel&&E.canHeroAttack(G,me)&&E.heroAttackTargets(G,me).length){ sel={kind:'attack',uid:'hero'}; return render(); }
  if(w==='me'&&sel&&sel.uid==='hero'){ sel=null; return render(); }
  if(sel&&sel.kind==='attack'&&w==='opp'&&legalT.has('ehero')) return send({type:'attack',uid:sel.uid,target:'hero'});
  if(sel&&sel.step==='target'&&w==='me'&&legalT.has('hero')){ sel.targets.push('hero'); return advance(); }
  const pl=G.players[w==='me'?me:1-me]; const h=HEROES[pl.cls];
  modal(`<h3>${esc(h.n)}${pl.mutated?' — Forma mutata':''}</h3><img src="${heroImg(pl)}" style="width:200px;border-radius:12px;border:2px solid var(--gold)">
   <div class="note" style="margin:8px auto">PF ${pl.pf}/${pl.maxPf||35}${pl.armor?` · Armatura ${pl.armor}`:''} · ${pl.mutated?'Mutato':'Muta a 20 PF o meno'}</div>
   <div class="note" style="margin:6px auto;color:var(--txt)"><b>${esc((pl.mutated?h.m:h.b)[0])}</b> (2 GRA): ${powKw((pl.mutated?h.m:h.b)[1])}</div>
   <div class="note pwgl">${kwGloss(kwsIn(powKw((pl.mutated?h.m:h.b)[1])))}</div>
   <div class="row"><button class="btn" id="mClose">Chiudi</button></div>`);
  $('#mClose').onclick=closeModal;
}
function powerClick(w){
  const pl=G.players[w==='me'?me:1-me];
  if(w==='me' && E.canPower(G,me)){
    if(E.powerReq(pl).length){ sel={kind:'power',step:'target',req:E.powerReq(pl),targets:[]}; return advance(); }
    if(pl.cls==='minatore'&&!pl.deck.length) return toast('Il mazzo è vuoto');
    if(pl.cls==='adepto'){ const pw=powerName(pl);
      modal(`<h3>${esc(pw[0])}</h3><div class="note" style="margin:0 auto 10px">${powKw(pw[1])}</div><div class="note pwgl">${kwGloss(kwsIn(powKw(pw[1])))}</div><div class="row"><button class="btn" id="mPa">Pashey 1/2</button><button class="btn" id="mSx">Straxiart 2/1</button><button class="btn" id="mClose">Annulla</button></div>`);
      $('#mPa').onclick=()=>{closeModal();send({type:'power',target:'pashey'});}; $('#mSx').onclick=()=>{closeModal();send({type:'power',target:'straxiart'});}; $('#mClose').onclick=closeModal; return; }
    const pw=powerName(pl);
    modal(`<h3>${esc(pw[0])}</h3><img src="${powerImg(pl)}" style="width:90px;height:90px;border-radius:50%;border:2px solid var(--gold)"><div class="note" style="margin:8px auto 10px">${powKw(pw[1])} <b>(2 GRA)</b></div><div class="note pwgl">${kwGloss(kwsIn(powKw(pw[1])))}</div><div class="row"><button class="btn" id="mUse">Usa il potere</button><button class="btn" id="mClose">Annulla</button></div>`);
    $('#mUse').onclick=()=>{closeModal();send({type:'power'});}; $('#mClose').onclick=closeModal; return;
  }
  { const ttl=w==='me'?'Il tuo potere eroe':'Potere eroe dell\'avversario';
    modal(`<h3>${esc(ttl)}</h3><img src="${powerImg(pl)}" style="width:90px;height:90px;border-radius:50%;border:2px solid var(--gold)"><div class="pwbox">${powerPopHtml(pl)}</div><div class="row"><button class="btn" id="mClose">Chiudi</button></div>`);
    $('#mClose').onclick=closeModal; }
}
function pegnoInfo(w){
  const pl=G.players[w==='me'?me:1-me];
  if(w==='me'&&pl.pegno){ const c=E.card(pl.pegno.n); modal(`<h3>Il tuo Pegno</h3>${bigCard(c)}<div class="note" style="margin:8px auto">Versato ${pl.pegno.paid} su ${E.pegnoCost(G,pl)} GRA. A fine turno il GRA avanzato viene versato qui; a costo saldato la carta entra in gioco gratis.</div><div class="row"><button class="btn" id="mClose">Chiudi</button></div>`); $('#mClose').onclick=closeModal; return; }
  toast(pl.pegno?`Pegno avversario: ${pl.pegno.paid} GRA versati`:'Pegno vuoto. Apri una carta della mano per metterla nel Pegno.');
}

// ======================= SCELTE (mulligan, Scava, Analizza…)

// ======================= FINE PARTITA: animazione e carta MVP
function mvpOf(pi){ const m=(G.mvp||[])[pi]||{}; let best=null,bs=-1;
  for(const [n,v] of Object.entries(m)){ if(!CARDS[n]) continue; const sc=v.d+v.k*4+(CARDS[n].r!=='Gettone'?0.5:0); if(sc>bs){ bs=sc; best={n,...v}; } } return best; }
function endScreenHtml(win){
  const p=G.players[me], o=G.players[1-me]; const m=(G.mvp||[])[me]||{};
  const dmg=Object.values(m).reduce((a,v)=>a+v.d,0), kills=Object.values(m).reduce((a,v)=>a+v.k,0);
  const plays=((G.pstat||[])[me]||{}).plays||0; const mv=mvpOf(me);
  const hero=`art/eroi/${p.cls}${p.mutated?'_mutato':''}_art.jpg`;
  return `<div class="endfx"><div class="endrays"></div>
    <div class="endhero"><img src="${hero}" alt=""></div>
    <h2 class="endtitle">${win?'Vittoria':'Sconfitta'}</h2>
    <div class="endsub">${esc((G.log[G.log.length-1]||'').replace(/^Tu si arrende\.$/,'Ti sei arreso.'))}</div>
    <div class="endstats"><div><b>${dmg}</b><small>danni inflitti</small></div><div><b>${kills}</b><small>seguaci uccisi</small></div><div><b>${plays}</b><small>carte giocate</small></div><div><b>${p.ownTurns}</b><small>turni</small></div></div>
    ${mv?`<div class="endmvp"><div class="mvplab">✦ Carta MVP ✦</div><div class="mvpcard" data-mvp="${esc(mv.n)}">${colCard(CARDS[mv.n],'')}</div><div class="mvpinfo">${mv.d} danni · ${mv.k} ${mv.k===1?'uccisione':'uccisioni'}</div></div>`:''}
    ${rewardHtml()}${rankEndHtml()}${G.abandon?'<div class="note" style="margin:6px auto 0">L\'avversario ha abbandonato la partita.</div>':''}
    <div class="row endbtns">${vsAI?'<button class="btn" id="mAgain">Rivincita</button>':''}<button class="btn" id="mMenu">Menu</button></div></div>`;
}
function endParticles(d,win){ const box=d.querySelector('.endfx'); if(!box) return; const n=win?40:30;
  for(let i=0;i<n;i++){ const s=document.createElement('i'); s.className=win?'spark':'ash'; s.style.left=(Math.random()*100)+'%'; s.style.animationDelay=(Math.random()*2.5)+'s'; s.style.animationDuration=(win?2.2:3.5)+Math.random()*2+'s'; s.style.setProperty('--dx',(Math.random()*80-40)+'px'); box.appendChild(s); } }
function overlays(){
  const p=G.players[me], pd=G.pending[0];
  const ov=$('#ov'); if(ov&&ov.dataset.lock) ov.remove();
  if(G.over){ const win=G.winner===me; if(!G.__sndOver){ G.__sndOver=1; gameReward(); if(NET&&NET.srv&&!G.__srvDone){ G.__srvDone=true; const x=srvEnd(NET,G); if(G.ranked){ G.__rankDone=true; G.__rankRes=x; } } if(G.ranked&&!G.__rankDone){ G.__rankDone=true; G.__rankRes=rankResult(G.winner===me,G.oppRank); } sfx(win?'win':'lose'); if(TUT){ TUT=null; tutBox(); } }
    clearFx(); const d=modal(endScreenHtml(win),'endbox '+(win?'win':'lose')); d.dataset.lock=1; d.classList.add('endov',win?'win':'lose');
    endParticles(d,win);
    const a=$('#mAgain'); if(a) a.onclick=()=>{closeModal();startLocal();}; $('#mMenu').onclick=()=>{closeModal();menu();};
    d.querySelectorAll('[data-mvp]').forEach(e=>e.onclick=()=>{ const c=CARDS[e.dataset.mvp]; if(c) modal(`${bigCard(c)}<div class="row" style="margin-top:10px"><button class="btn" id="mBackEnd">Indietro</button></div>`); const bb=$('#mBackEnd'); if(bb) bb.onclick=()=>{ closeModal(); overlays(); }; });
    return; }
  if(G.phase==='mulligan'){
    if(p.mulliganDone){ const d=modal(`<h3>In attesa dell'avversario…</h3>`); d.dataset.lock=1; return; }
    const pick=new Set();
    const draw=()=>{ const d=modal(`<div class="mtitle"><span class="orn">❧</span><h3>Mano iniziale</h3><span class="orn r">❧</span></div>
      <div class="note" style="margin:0 auto 4px">${p.hand.some(h=>['Epica','Leggendaria'].includes(E.card(h.n).r))?'Puoi rimettere nel mazzo solo le carte <b style="color:#d39bff">epiche</b> e <b style="color:#ffb84a">leggendarie</b>. Tocca quelle da cambiare.':'Non hai carte <b style="color:#d39bff">epiche</b> o <b style="color:#ffb84a">leggendarie</b> da cambiare: tieni la mano e inizia.'}</div>
      <div class="mullcards">${p.hand.map(h=>{const c=E.card(h.n);const ok=['Epica','Leggendaria'].includes(c.r);
        return `<div class="mslot ${pick.has(h.uid)?'mpick':''} ${ok?'mok':'mkeep'}">${colCard(c,`data-m="${h.uid}"`)}<div class="mtag">${pick.has(h.uid)?'↻ Da cambiare':ok?'Tocca per cambiare':'Resta in mano'}</div></div>`;}).join('')}</div>
      <div class="mfoot"><button class="btn mgo ${p.hand.some(h=>['Epica','Leggendaria'].includes(E.card(h.n).r))?'':'okgo'}" id="mOk">${pick.size?'Cambia e inizia':'Tieni e inizia'}</button></div>`,'mull'); d.dataset.lock=1;
      d.querySelectorAll('[data-m]').forEach(e=>e.onclick=()=>{ const uid=+e.dataset.m; const c=E.card(p.hand.find(h=>h.uid===uid).n); if(!['Epica','Leggendaria'].includes(c.r)) return; pick.has(uid)?pick.delete(uid):pick.add(uid); draw(); });
      $('#mOk').onclick=()=>{ closeModal(); send({type:'mulligan',uids:[...pick]}); }; };
    draw(); return;
  }
  if(!pd) return;
  if(pd.p===me && (pd.type==='emo'||pd.type==='sposta')){ closeModal(); return; }
  if(pd.p===me && pd.type==='decreto'){
    if(sel&&sel.kind==='decreto'){ closeModal(); return; }
    const o=G.players[1-me]; const canS=p.slots.some(s=>!s.emo), canR=o.slots.some(s=>!s.emo&&!s.revoked);
    const d=modal(`<h3>Decreto</h3><div class="note" style="margin:0 auto 10px"><b>Sigillo</b>: un tuo slot diventa grigio e conta come slot d'Emozione (anche per il Focus).<br><b>Revoca</b>: uno slot dell'avversario diventa d'oro e non potrà più prendere il colore della sua Emozione.</div><div class="row">${canS?'<button class="btn" id="mSig">Sigillo</button>':''}${canR?'<button class="btn" id="mRev">Revoca</button>':''}</div>`); d.dataset.lock=1;
    const go=k=>{ closeModal(); sel={kind:'decreto',k}; render(); };
    const a=$('#mSig'); if(a) a.onclick=()=>go('sigillo'); const b=$('#mRev'); if(b) b.onclick=()=>go('revoca'); return; }
  if(pd.type==='pegnoCheck'||pd.type==='tutor') return;
  if(pd.p!==me){ if(pd.type!=='emo'){ const d=modal(`<h3>L'avversario sta scegliendo…</h3>`); d.dataset.lock=1; } return; }
  if(pd.type==='scava'){
    const d=modal(`<h3>Scava</h3><div class="note" style="margin:0 auto">Prendi una carta: le altre vanno in fondo al mazzo. Se non ne prendi nessuna, aggiungi una Stella alla mano.</div>
      <div class="choices">${pd.cards.map((n,i)=>{const c=E.card(n);return miniCard(c,c.c,`data-ch="${i}"`);}).join('')}</div><button class="btn" id="mNone">Nessuna: prendo una Stella</button>`); d.dataset.lock=1;
    d.querySelectorAll('[data-ch]').forEach(e=>e.onclick=()=>{closeModal();send({type:'choose',choice:+e.dataset.ch});});
    $('#mNone').onclick=()=>{closeModal();send({type:'choose',choice:-1});};
  } else if(pd.type==='analizza'){
    const d=modal(`<h3>Analizza</h3><div class="note" style="margin:0 auto">Scegli una carta da aggiungere alla mano.</div><div class="choices">${pd.cards.map((n,i)=>{const c=E.card(n);return miniCard(c,c.c,`data-ch="${i}"`);}).join('')}</div>`); d.dataset.lock=1;
    d.querySelectorAll('[data-ch]').forEach(e=>e.onclick=()=>{closeModal();send({type:'choose',choice:+e.dataset.ch});});
  } else if(pd.type==='ritorno'){
    const d=modal(`<h3>${pd.ctx==='rinascita'?'Rinascita in Carne':'Ciò che Torna dalla Nebbia'}</h3><div class="note" style="margin:0 auto">${pd.ctx==='rinascita'?'Scegli un tuo seguace morto: torna con le sue Protesi e +2/+2, poi ottiene Mutare.':'Scegli un tuo seguace morto da riportare in gioco: otterrà Mutare.'}</div><div class="choices">${pd.cards.map((n,i)=>{const c=E.card(n);return miniCard(c,c.c,`data-ch="${i}"`);}).join('')}</div>`); d.dataset.lock=1;
    d.querySelectorAll('[data-ch]').forEach(e=>e.onclick=()=>{closeModal();send({type:'choose',choice:+e.dataset.ch});});
  } else if(pd.type==='opz'){
    const d=modal(`<h3>${({raighar:'Raighar Ungart',maestro:'Maestro dei Cinque Clan',vouhdel:'Vouhdel — Rito di sangue'})[pd.ctx]||'Scegli'}</h3><div class="note" style="margin:0 auto 10px">Scegli:</div><div class="row">${pd.opts.map((t,i)=>`<button class="btn" data-ch="${i}">${esc(t)}</button>`).join('')}</div>`); d.dataset.lock=1;
    d.querySelectorAll('[data-ch]').forEach(e=>e.onclick=()=>{closeModal();send({type:'choose',choice:+e.dataset.ch});});
  } else if(pd.type==='bersaglio'){
    const d=modal(`<h3>Frana</h3><div class="note" style="margin:0 auto">Scegli il seguace nemico: lui e i suoi vicini subiscono 2 danni.</div><div class="choices">${pd.uids.map(id=>{const u=G.units[id]; if(!u) return ''; const c=E.card(u.n); const st=E.stat(u); return miniCard(Object.assign({},c,{a:st.a,d:st.d-u.dmg}),c.c,`data-ch="${id}"`);}).join('')}</div>`); d.dataset.lock=1;
    d.querySelectorAll('[data-ch]').forEach(e=>e.onclick=()=>{closeModal();send({type:'choose',choice:+e.dataset.ch});});
  } else if(pd.type==='scruta'){
    const d=modal(`<h3>Conoscenza</h3><div class="note" style="margin:0 auto">Le prime 2 carte del tuo mazzo. Tocca una carta per metterla in fondo, oppure lasciale così.</div><div class="choices">${pd.cards.map((n,i)=>{const c=E.card(n);return miniCard(c,c.c,`data-ch="${i}"`);}).join('')}</div><button class="btn" id="mNone">Lasciale così</button>`); d.dataset.lock=1;
    d.querySelectorAll('[data-ch]').forEach(e=>e.onclick=()=>{closeModal();send({type:'choose',choice:+e.dataset.ch});});
    $('#mNone').onclick=()=>{closeModal();send({type:'choose',choice:-1});};
  }
}

// carta giocata dall'avversario mostrata al centro per un attimo
const revealQ=[]; let revealOn=false;
function reveal(c,label,html){ if(G&&G.over) return; revealQ.push({c,label,html}); if(!revealOn) nextReveal(); }
// a fine partita spariscono tutti gli avvisi di gioco: niente finestre sovrapposte al risultato
function clearFx(){ revealQ.length=0; revealOn=false; document.querySelectorAll('.emoban,.turnban,.reveal,.fogwave,.prompt,.kwfx,.mutban,.peek').forEach(x=>x.remove()); }
function nextReveal(){
  const r=revealQ.shift(); if(!r||(G&&G.over)){ revealOn=false; revealQ.length=0; return; } revealOn=true;
  const d=document.createElement('div'); d.className='reveal'; d.innerHTML=`<div class="rl">${esc(r.label)}</div>${r.html||bigCard(r.c)}`; document.body.appendChild(d);
  const ms=window.FAST?200:1600; setTimeout(()=>{ d.classList.add('out'); setTimeout(()=>{ d.remove(); nextReveal(); },250); },ms);
}
// ======================= ONDATA DI NEBBIA (turni 10 e 20)
function fogFx(){ if(G&&G.over) return; sfx('lasc'); const d=document.createElement('div'); d.className='fogwave'; d.innerHTML=`<div class="fogtxt"><b>La Nebbia avanza</b><small>2 danni a tutti i seguaci · ogni giocatore pesca una carta${G&&(G.fogN||0)===1?' (chi gioca per secondo ne pesca due)':''} · i seguaci pescati otterranno Mutare</small></div>`; document.body.appendChild(d); setTimeout(()=>d.remove(), window.FAST?300:4000); }
// turni di partita che mancano all'ondata: arriva al 10°, 20°… turno del giocatore che ha iniziato (turno di partita 19, 39, 59…)
function fogLeft(){ if(!G) return null; const step=E.FOG_EVERY*2; let n=step-1; while(n<G.turn) n+=step; return n-G.turn; }
function fogCounter(){ const k=fogLeft(); if(k==null) return '';
  return `<div class="fogctr ${k===0?'now':k<=2?'soon':''}" title="Ondata di Nebbia: 2 danni a tutti i seguaci, ogni giocatore pesca una carta (i seguaci pescati otterranno Mutare)"><i>🌫</i><small>Nebbia</small>${k===0?'<b>ora</b>':`<b>${k}</b><small>${k===1?'turno':'turni'}</small>`}</div>`; }
// ======================= EFFETTI VISIVI (numeri dei danni)
function fx(){
  const ev=G.ev.splice(0);
  for(const e of ev){
    if(e.t==='atk') attackNudge(e);
    if(e.t==='play') sfx('play'); else if(e.t==='atk') sfx(e.h!=null?'hero':'atk'); else if(e.t==='dmg'&&e.n>0) sfx('hit'); else if(e.t==='hdmg'&&e.n>0) sfx('hit');
    else if(e.t==='die') sfx('die'); else if(e.t==='power') sfx('power'); else if(e.t==='mutate') sfx('mut');
    else if(e.t==='kw') sfx(e.k==='Lascito'?'lasc':e.k==='Mutare'?'mut':'kw');
    if(e.t==='dmg'){ const el=app.querySelector(`[data-u="${e.u}"]`); if(el){ const f=document.createElement('div'); f.className='fx'; f.textContent='-'+e.n; el.appendChild(f);} }
    if(e.t==='hdmg'){ const el=app.querySelector(`[data-hero="${e.p===me?'me':'opp'}"]`); if(el){ const f=document.createElement('div'); f.className='fx'; f.textContent='-'+e.n; el.appendChild(f);} }
    if(e.t==='kw'){ let el=null; if(e.u) el=app.querySelector(`[data-u="${e.u}"]`); else if(e.slot!=null) el=app.querySelector(`[data-slot="${e.p===me?'me':'opp'}:${e.slot}"]`);
      if(el){ const f=document.createElement('div'); f.className='kwfx kf-'+e.k.replace(/ /g,''); f.innerHTML=`<i>${KW_ICON[e.k]||({Pietrifica:'🪨',Mutare:'🧬',Esorcizza:'✝',Imboscata:'✷'})[e.k]||'✧'}</i><b>${esc(e.k)}</b>`; el.appendChild(f); setTimeout(()=>f.remove(),1500); } }
    if(e.t==='play' && e.p!==me) reveal(E.card(e.n),'L\'avversario gioca');
    if(e.t==='power' && e.p!==me){ const pl=G.players[e.p]; const pw=powerName(pl); reveal(null,'Potere eroe dell\'avversario',`<div class="big" style="--uc:${CLS_COLOR[pl.cls]}"><img src="${powerImg(pl)}" alt=""><div class="h">${esc(pw[0])}</div><div class="x">${pw[1]}</div></div>`); }
    if(e.t==='fog') fogFx();
    if(e.t==='divina'){ sfx('kw'); toast(e.p===me?`👁 Divinazione avverata: ${e.n}`:`👁 Divinazione avversaria avverata: ${e.n}`); }
    if(e.t==='mutate' && e.p===me) toast('Il tuo eroe Muta! Nuovo potere eroe.');
    if(e.t==='mutate' && e.p!==me) toast('L\'eroe avversario Muta!');
  }
}

// ======================= TIMER DEL TURNO (1:30) E SCELTE AUTOMATICHE
function privSeed(){ const a=new Uint32Array(1); (window.crypto||{getRandomValues:x=>{x[0]=Math.random()*4e9}}).getRandomValues(a); return a[0]>>>0; }
function autoResolveMine(){ if(NET&&NET.waiting) return true; const pd=G.pending[0]; if(pd&&pd.p===me){ const a=E.ai(G,me); if(a&&a.type==='choose'){ closeModal(); send(a); return true; } } return false; }
function paintTimer(){
  const el=$('#tmr'); const left=Math.max(0,TURN_MS-(Date.now()-turnStart)); if(!el||!G) return left;
  if(G.over||(vsAI&&!SET.timer&&!NET)){ el.textContent=''; return left; }
  const s=Math.ceil(left/1000); el.textContent=(window.innerWidth<560?'':(G.phase==='mulligan'?'Mano ':(G.cur===me?'Tuo turno ':'Avversario ')))+Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); el.className='timer'+(s<=15?' low':''); return left;
}
function tick(){
  const el=$('#tmr');
  if(!G||G.over){ if(el) el.textContent=''; return; }
  const key=G.phase+':'+G.turn+':'+G.cur;
  if(key!==turnKey){ turnKey=key; turnStart=Date.now(); timedOut=false; if(G.phase==='play'&&!G.over) sfx(G.cur===me?'turn':'end'); }
  if(TUT) tutCheck();
  // Pegno: chi possiede la carta dice se è saldato, senza mostrarla
  const pd=G.pending[0];
  if(pd&&pd.type==='tutor'&&pd.p===me){ const k='t'+G.turn+':'+G.log.length; if(!autoPeg||autoPeg.k!==k||Date.now()-autoPeg.t>3000){ autoPeg={k,t:Date.now()}; send({type:'choose',choice:null}); } }
  if(pd&&pd.type==='pegnoCheck'&&pd.p===me){ const k=G.turn+':'+G.log.length; if(!autoPeg||autoPeg.k!==k||Date.now()-autoPeg.t>3000){ autoPeg={k,t:Date.now()}; send({type:'choose',choice:E.pegnoReady(G,me)}); } }
  const left=paintTimer();
  if(left===0 && !TUT && !(vsAI&&!SET.timer&&!NET)){
    if(G.phase==='mulligan'){ if(!timedOut&&!G.players[me].mulliganDone){ timedOut=true; closeModal(); send({type:'mulligan',uids:[]}); } return; }
    if(autoResolveMine()) return;
    if(G.cur===me && !G.pending.length && !timedOut){ timedOut=true; closeModal(); sel=null; toast('Tempo scaduto: fine turno.'); send({type:'end',idle:true}); }
    if(G.cur===me && !G.pending.length && timedOut && Date.now()-turnStart>TURN_MS+4000 && NET){ turnStart=Date.now()-TURN_MS+1000; timedOut=false; } // riprova se il messaggio si è perso
  }
}
setInterval(tick,500);

// ======================= ONLINE (stessa partita su due dispositivi, si scambiano solo le mosse)
function netSrc(){ return window.claude&&window.claude.use?window.claude:(window.ELG_NET||null); }
async function getRoom(){
  const n=netSrc(); if(!n) return null;
  try{ return await n.use('room'); }catch(e){ return null; }
}
function setNetMsg(s){ const n=$('#netmsg'); if(n) n.textContent=s; }
function myCosm(){ const own=new Set(ownLoad().cosm||[]); const ok=k=>SET[k]&&own.has(SET[k])?SET[k]:null; return {back:ok('back'),frame:ok('frame')}; }
// se l'avversario esce dalla stanza e non torna entro 20 secondi, la partita è vinta per abbandono
function netWatch(net){
  let gone=null; const others=()=>net.r.peers().filter(p=>!p.isMe&&p.kind==='viewer').length;
  const un=net.r.onPeers(()=>{ if(!G||G.over||NET!==net) return;
    if(others()===0){ if(!gone) gone=setTimeout(()=>{ if(G&&!G.over&&NET===net&&others()===0){ G.over=true; G.winner=me; G.abandon=true; G.log.push('L\'avversario ha abbandonato la partita.'); render(); } },20000); }
    else if(gone){ clearTimeout(gone); gone=null; } });
  net.unsub.push(un); net.unsub.push(()=>gone&&clearTimeout(gone));
}
async function hostOnline(codeArg,opt){
  opt=opt||{};
  setNetMsg('Collegamento…');
  const room=await getRoom(); if(!room) return setNetMsg((window.claude?'L\'online non è disponibile in questa vista. Apri la pagina dal suo link su claude.ai.':window.ELG_NET?'Collegamento non riuscito: controlla la connessione e di aver fatto l\'accesso con Google.':'Il gioco online e la Classificata arriveranno presto nella versione scaricabile. Intanto puoi giocare contro il computer.'));
  const code=codeArg||Math.random().toString(36).slice(2,7);
  const rname='elg-'+(SRV()&&!/^rk/.test(code)?'am':'')+code;
  let r; try{ r=await room.join(rname); }catch(e){ return setNetMsg('Impossibile creare la stanza: '+(e.code||e.message)); }
  const net={host:true,code,r,log:[],seen:new Set(),applied:0,unsub:[],timers:[],ranked:!!opt.ranked,mode:opt.mode};
  NET=net; me=0; vsAI=false; net.priv=privSeed();
  if(SRV()&&/^elg-(rk|am)/.test(rname)){ net.srv=true; net.room=rname; net.hn=randHex();
    try{ await ELG_NET.rk.register(net.room,{cls:chosenCls,deck:deckFor(chosenCls),hc:await sha256hex(net.hn)}); }
    catch(e){ try{r.leave()}catch(x){} NET=null; menu(); return toast('Classificata: registrazione sul server non riuscita. Riprova.'); } }
  if(opt.mode){ app.innerHTML=`<div class="menu"><h1>ELGRAVION</h1><h3 style="font-family:Cinzel;color:var(--gold2)">Avversario trovato</h3><div class="note" id="netmsg">Collegamento in corso…</div><button class="btn" id="bBack">Annulla</button></div>`; $('#bBack').onclick=()=>{ if(NET===net) net.leave(); NET=null; menu(); }; }
  else {
  app.innerHTML=`<div class="menu"><h1>ELGRAVION</h1><h3 style="font-family:Cinzel;color:var(--gold2)">Codice partita: <span style="letter-spacing:6px">${code.toUpperCase()}</span></h3>
   <div class="note">Dai questo codice al tuo avversario: deve aprire questa pagina, scegliere la classe, scrivere il codice e premere Unisciti.</div><div class="note" id="netmsg">In attesa dell'avversario…</div><button class="btn" id="bBack">Annulla</button></div>`;
  $('#bBack').onclick=()=>menu();
  }
  let start=null;
  net.unsub.push(r.on('hello',m=>{
    if(m.isMe) return; const cls=ALL_CLS.includes(m.data&&m.data.cls)?m.data.cls:'sirena';
    if(net.ranked && !(m.data&&m.data.ranked)) return; // in classificata solo avversari in classificata
    if(net.srv && !(m.data&&m.data.gn)) return;
    if(!start){ start={seed:net.srv?srvSeed(net.room,net.hn,m.data.gn):(Math.random()*4e9)>>>0,classes:[chosenCls,cls],ranked:net.ranked,rank:net.ranked?rankInfo():null,cosm:myCosm()}; if(net.srv){ start.hn=net.hn; start.gn=m.data.gn; }
      G=E.newGame({seed:start.seed,classes:start.classes,names:['Tu','Avversario'],priv:[net.priv,null],online:true,decks:[deckFor(chosenCls),null]});
      G.ranked=net.ranked; G.oppRank=m.data.rank||null; G.oppCosm=m.data.cosm||{}; netWatch(net); render(); }
    r.emit('start',start);
  }));
  net.unsub.push(r.on('req',m=>{
    if(m.isMe||!G) return; const d=m.data||{}; if(net.seen.has(d.nonce)){ return; }
    net.seen.add(d.nonce); const err=E.act(G,1,d.a);
    if(err){ r.emit('rej',{nonce:d.nonce,err}); return; }
    net.log.push({pi:1,a:d.a,nonce:d.nonce}); r.emit('act',{i:net.log.length-1,pi:1,a:d.a,nonce:d.nonce}); net.lastEmit=Date.now(); render();
  }));
  net.unsub.push(r.on('need',m=>{ if(m.isMe) return; const from=(m.data&&m.data.from)|0; for(let i=from;i<Math.min(net.log.length,from+12);i++) r.emit('act',{i,...net.log[i]}); if(start) r.emit('start',start); }));
  // controllo di allineamento raro: i buchi si recuperano subito da chi li nota (meno traffico)
  net.timers.push(setInterval(()=>{ if(G&&!G.over&&Date.now()-(net.lastEmit||0)>12000) r.emit('sync',{n:net.log.length}); },15000));
  if(opt.mode) net.timers.push(setTimeout(()=>{ if(NET===net&&!G){ menu(); toast('Collegamento non riuscito: riprovo la ricerca'); findMatch(opt.mode,opt.t0); } },25000));
  net.local=a=>{ const err=E.act(G,0,a); if(err){ toast(err); render(); return; } net.log.push({pi:0,a}); r.emit('act',{i:net.log.length-1,pi:0,a}); net.lastEmit=Date.now(); render(); };
  net.leave=()=>{ net.unsub.forEach(f=>{try{f()}catch(e){}}); net.timers.forEach(clearInterval); try{r.leave()}catch(e){} };
}
async function joinOnline(code,opt){
  opt=opt||{};
  if(!opt.mode && !/^[a-z0-9]{4,6}$/.test(code)) return setNetMsg('Scrivi il codice della partita (5 caratteri).');
  setNetMsg('Collegamento…');
  const room=await getRoom(); if(!room) return setNetMsg((window.claude?'L\'online non è disponibile in questa vista. Apri la pagina dal suo link su claude.ai.':window.ELG_NET?'Collegamento non riuscito: controlla la connessione e di aver fatto l\'accesso con Google.':'Il gioco online e la Classificata arriveranno presto nella versione scaricabile. Intanto puoi giocare contro il computer.'));
  const rname='elg-'+(SRV()&&!/^rk/.test(code)?'am':'')+code;
  let r; try{ r=await room.join(rname); }catch(e){ return setNetMsg('Impossibile entrare: '+(e.code||e.message)); }
  const net={host:false,code,r,buf:{},applied:0,waiting:null,unsub:[],timers:[],ranked:!!opt.ranked,mode:opt.mode};
  NET=net; me=1; vsAI=false; net.priv=privSeed();
  if(SRV()&&/^elg-(rk|am)/.test(rname)){ net.srv=true; net.room=rname; net.gn=randHex();
    try{ await ELG_NET.rk.register(net.room,{cls:chosenCls,deck:deckFor(chosenCls),gn:net.gn}); }
    catch(e){ try{r.leave()}catch(x){} NET=null; menu(); return toast('Classificata: registrazione sul server non riuscita. Riprova.'); } }
  if(opt.mode){ app.innerHTML=`<div class="menu"><h1>ELGRAVION</h1><h3 style="font-family:Cinzel;color:var(--gold2)">Avversario trovato</h3><div class="note" id="netmsg">Collegamento in corso…</div><button class="btn" id="bBack">Annulla</button></div>`; $('#bBack').onclick=()=>{ if(NET===net) net.leave(); NET=null; menu(); }; }
  else setNetMsg('Entrato. In attesa che la partita parta…');
  const applyBuf=()=>{ let ch=false; while(net.buf[net.applied]){ const m=net.buf[net.applied]; delete net.buf[net.applied]; E.act(G,m.pi,m.a); if(net.waiting&&m.nonce===net.waiting.nonce) net.waiting=null; net.applied++; ch=true; } if(ch) render(); };
  let checking=false;
  net.unsub.push(r.on('start',async m=>{ if(G||!m.data||checking) return;
    if(net.srv){ checking=true; let ok=false;
      try{ const ps=await ELG_NET.rk.players(net.room); const hp=Object.values(ps).find(x=>x&&x.hc);
        ok=!!hp && m.data.gn===net.gn && hp.hc===await sha256hex(m.data.hn) && (m.data.seed>>>0)===srvSeed(net.room,m.data.hn,net.gn); }catch(e){}
      checking=false; if(G||NET!==net) return;
      if(!ok){ net.leave(); NET=null; menu(); return toast('Partita classificata non valida: annullata.'); } }
    G=E.newGame({seed:m.data.seed,classes:m.data.classes,names:['Avversario','Tu'],priv:[null,net.priv],online:true,decks:[null,deckFor(chosenCls)]});
    G.ranked=!!(net.ranked&&m.data.ranked); G.oppRank=m.data.rank||null; G.oppCosm=m.data.cosm||{}; netWatch(net); render(); applyBuf(); }));
  net.unsub.push(r.on('act',m=>{ const d=m.data; net.lastRx=Date.now(); if(!d||d.i<net.applied) return; net.buf[d.i]=d; if(G) applyBuf();
    // manca una mossa prima di questa: la chiedo subito invece di aspettare il controllo periodico
    if(G&&!net.buf[net.applied]&&Object.keys(net.buf).length&&Date.now()-(net.askT||0)>2000){ net.askT=Date.now(); r.emit('need',{from:net.applied}); } }));
  net.unsub.push(r.on('rej',m=>{ if(net.waiting&&m.data&&m.data.nonce===net.waiting.nonce){ toast(m.data.err); net.waiting=null; render(); } }));
  net.unsub.push(r.on('sync',m=>{ if(m.data&&m.data.n>net.applied) r.emit('need',{from:net.applied}); }));
  const hello=()=>{ if(!G) r.emit('hello',{cls:chosenCls,ranked:net.ranked,rank:net.ranked?rankInfo():null,cosm:myCosm(),gn:net.gn||null}); };
  hello(); net.timers.push(setInterval(hello,2000));
  // se tocca all'avversario e da un po' non arriva nulla, chiedo le mosse che potrei aver perso (raro, un messaggio piccolo)
  net.timers.push(setInterval(()=>{ if(G&&!G.over&&!net.waiting&&(G.cur!==me||G.pending.some(x=>x.p!==me))&&Date.now()-Math.max(net.lastRx||0,net.askT||0)>8000){ net.askT=Date.now(); r.emit('need',{from:net.applied}); } },2000));
  net.timers.push(setInterval(()=>{ if(net.waiting&&Date.now()-(net.waiting.t||0)>3000){ net.waiting.t=Date.now(); r.emit('req',{nonce:net.waiting.nonce,a:net.waiting.a}); } },1000));
  if(opt.mode) net.timers.push(setTimeout(()=>{ if(NET===net&&!G){ menu(); toast('Collegamento non riuscito: riprovo la ricerca'); findMatch(opt.mode,opt.t0); } },25000));
  net.local=a=>{ if(net.waiting) return toast('Attendi…'); net.waiting={nonce:Math.random().toString(36).slice(2),a,t:Date.now()}; r.emit('req',{nonce:net.waiting.nonce,a}); };
  net.leave=()=>{ net.unsub.forEach(f=>{try{f()}catch(e){}}); net.timers.forEach(clearInterval); try{r.leave()}catch(e){} };
}

// ======================= ACCOUNT: COLLEZIONE, GRA, PACCHETTI E MAZZI SUL SERVER
// Con l'accesso Google e il server attivo, la collezione sta sull'account: la ritrovi su ogni dispositivo
// e cambia solo tramite il server (premi verificati, pacchetti aperti dal server).
let ACC_ON=false, ACC_SYNCING=false;
function ACC(){ return ACC_ON && !window.claude && !!(window.ELG_NET&&window.ELG_NET.econ); }
function normOwn(p){ p=Object.assign({cards:{},coins:0,adam:0,cpacks:{},games:0,wins:0,packs:0,pity:0,opened:0,start:null,done:{},cosm:[]},p||{}); p.cpacks=p.cpacks||{}; p.cards=p.cards||{}; p.done=p.done||{}; p.cosm=Array.isArray(p.cosm)?p.cosm:Object.values(p.cosm||{}); p.gStart=1; return p; }
function setProfile(p){ OWN=normOwn(p); }
function econMsg(e){ const m=(e&&e.message)||''; return /internal|deadline|unavailable/i.test((e&&e.code)||'')?'Server non raggiungibile: riprova tra poco.':(m||'Operazione non riuscita.'); }
async function econDo(op,data,quiet){ try{ const r=await window.ELG_NET.econ(op,data); if(r&&r.profile) setProfile(r.profile); return r; }catch(e){ if(!quiet) toast(econMsg(e)); return null; } }
async function buyPackX(){ if(!ACC()) return buyPack(); return !!(await econDo('buyPack')); }
async function craftX(n){ if(!ACC()) return craftCard(n); const r=await econDo('craft',{n}); if(r&&r.res) bonusToast(r.res.bonus); return !!r; }
async function sellX(n){ if(!ACC()) return sellCard(n); return !!(await econDo('sell',{n})); }
function bonusToast(got){ got=got||[]; if(!got.length) return; sfx('leg'); toast(`Collezione completa: ${got.map(k=>k==='neutrali'?'Neutrali':HEROES[k].n).join(', ')}!`); }
async function syncProfile(){ if(!ACC()) return; const r=await econDo('sync',{},true); if(r&&r.profile&&!G&&$('.menu')) menu(); }
let DECKS_T=null;
function decksPush(){ clearTimeout(DECKS_T); DECKS_T=setTimeout(()=>{ try{ window.ELG_NET.decks.set(DECKS_MEM||{}).catch(()=>{}); }catch(e){} },800); }
async function accSync(){
  if(window.claude||!window.ELG_NET||!window.ELG_NET.econ||ACC_SYNCING) return;
  try{ await window.ELG_NET.checkRanked(); }catch(e){}
  if(!window.ELG_NET.econOn) return;
  let u=null; try{ u=await window.ELG_NET.currentUser(); }catch(e){}
  if(!u){ accOff(); return; }
  ACC_SYNCING=true;
  try{
    let local=null; try{ local=JSON.parse(localStorage.getItem(OKEY)||'null'); }catch(e){}
    const r=await window.ELG_NET.econ('sync',{local});
    ACC_ON=true; setProfile(r.profile);
    if(r.season&&r.season.rw){ rankLoad(); RANK.__reward={end:r.season.end,rw:r.season.rw,gained:r.season.gained||[]}; }
    // mazzi: quelli sull'account vincono; se non ce ne sono, si caricano quelli di questo dispositivo
    let sd=null; try{ sd=await window.ELG_NET.decks.get(); }catch(e){}
    if(sd&&typeof sd==='object'){ const fix={}; for(const [k,l] of Object.entries(sd)){ const arr=Array.isArray(l)?l:Object.values(l||{}); fix[k]=arr.map(x=>Array.isArray(x)?x:Object.values(x||{})); } DECKS_MEM=fix; }
    else { loadDecks(); decksPush(); }
    await rankPull(true);
    if(!G&&!$('#ov')) menu();
  }catch(e){ toast('Account: sincronizzazione non riuscita ('+econMsg(e)+')'); }
  ACC_SYNCING=false;
}
function accOff(){ if(!ACC_ON) return; ACC_ON=false; OWN=null; DECKS_MEM=null; }
if(window.ELG_NET&&window.ELG_NET.econ) setTimeout(accSync,1500);

// ======================= CLASSIFICATA CON ARBITRO SUL SERVER (Firebase)
// Il seme comune nasce da un numero dell'ospite (impegnato prima) e uno di chi si unisce: nessuno lo sceglie da solo.
// A fine partita ognuno rivela il proprio seme privato; il server rigioca la partita e aggiorna i ranghi.
function SRV(){ return !window.claude && !!(window.ELG_NET&&window.ELG_NET.ranked&&window.ELG_NET.rk); }
function randHex(){ const a=new Uint32Array(4); crypto.getRandomValues(a); return [...a].map(x=>x.toString(16).padStart(8,'0')).join(''); }
async function sha256hex(t){ const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(t))); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function srvSeed(room,hn,gn){ let h=2166136261; for(const ch of room+'|'+hn+'|'+gn){ h^=ch.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function srvEnd(net,g){
  const room=net.room, res={pending:true}; let off=null, tries=0;
  const paint=()=>{ const el=document.querySelector('.rkend'); if(el&&G===g){ el.outerHTML=rankEndHtml(); } };
  const send=()=>ELG_NET.rk.end(room,net.priv).catch(()=>{ if(++tries<5) setTimeout(send,3000); });
  send();
  try{ off=ELG_NET.rk.onResult(room,async x=>{
    if(!x||!x.status||g.__rankFinal) return; g.__rankFinal=true; try{ off&&off(); }catch(e){}
    let uid=null; try{ const u=await ELG_NET.currentUser(); uid=u&&u.uid; }catch(e){}
    const d=x.d&&uid&&x.d[uid];
    if(x.status==='done'&&d&&d.reward){ g.__rew=Object.assign({},d.reward); syncProfile(); }
    else if(g.__rew&&g.__rew.pending) g.__rew={none:1,why:x.status==='done'?'':'Partita non valida: nessun premio.'};
    if(!g.ranked){ const el=document.querySelector('.endrew'); if(el&&G===g) el.outerHTML=rewardHtml(); return; }
    if(x.status==='done'&&d){ await rankPull(true); g.__rankRes={before:d.before,after:d.after,note:d.note,win:d.win};
      if((d.win?1:0)!==(g.winner===me?1:0)) toast('Il server ha corretto il risultato: '+(d.win?'vittoria':'sconfitta')+'.'); }
    else g.__rankRes={void:true,note:'Partita non valida per la Classificata: rango invariato.'};
    paint(); const el=document.querySelector('.endrew'); if(el&&G===g) el.outerHTML=rewardHtml(); }); }catch(e){}
  setTimeout(()=>{ if(!g.__rankFinal){ try{ off&&off(); }catch(e){} } },300000);
  return res;
}
// legge il rango ufficiale dal server e lo usa al posto di quello salvato nel browser
let RANK_PULL_T=0;
async function rankPull(force){
  if(!SRV()||(!force&&Date.now()-RANK_PULL_T<20000)) return; RANK_PULL_T=Date.now();
  try{ const x=await ELG_NET.rk.myRank(); if(!x||!x.r) return; const r=rankLoad(), s=x.r; if(s.season!==r.season) return;
    const was=JSON.stringify(r);
    for(const k of ['tier','lvl','pend','rating','wins','losses','streak','best']) if(s[k]!=null) r[k]=s[k];
    if(JSON.stringify(r)===was) return;
    try{ localStorage.setItem(RKEY,JSON.stringify(r)); }catch(e){}
    if(!G&&document.querySelector('.rkw')&&!$('#ov')) menu();
  }catch(e){}
}
if(window.ELG_NET&&window.ELG_NET.checkRanked) setTimeout(()=>{ window.ELG_NET.checkRanked().then(on=>{ if(on) rankPull(true); }).catch(()=>{}); },1200);

// ======================= CLASSIFICATA (taglie: Bianca, Blu, Rossa, Nera, Cremisi)
const TIERS=[
  {n:'Bianca', col:'#ece6d6', ink:'#2a2418', base:50,   step:25},
  {n:'Blu',    col:'#4a8fe0', ink:'#fff',    base:500,  step:50},
  {n:'Rossa',  col:'#d8433d', ink:'#fff',    base:1300, step:100},
  {n:'Nera',   col:'#1d1a20', ink:'#e9dfc8', base:3000, step:200},
  {n:'Cremisi',col:'#9b111e', ink:'#ffe9e9', base:0,    step:0}
];
const ROMAN={3:'III',2:'II',1:'I'}, PEND=5, RKEY='elg_classificata_v1', CREMISI=4;
const SEASON_REWARDS=[
  {gra:100,packs:0},{gra:200,packs:1},{gra:300,packs:2},{gra:500,packs:3,cosm:'dorso-nera'},{gra:800,packs:5,cosm:'dorso-cremisi'}];
const COSM={ 'dorso-nera':{n:'Dorso della Taglia Nera',k:'back'}, 'dorso-cremisi':{n:'Dorso della Taglia Cremisi',k:'back'}, 'cornice-cremisi':{n:'Cornice Cremisi (primi 200)',k:'frame'},
  'dorso-stellato':{n:'Dorso Stellato',k:'back'}, 'dorso-ossidiana':{n:"Dorso d'Ossidiana",k:'back'}, 'dorso-marea':{n:'Dorso della Marea',k:'back'}, 'dorso-brace':{n:'Dorso di Brace',k:'back'},
  'cornice-oro':{n:"Cornice d'Oro",k:'frame'}, 'cornice-argento':{n:"Cornice d'Argento",k:'frame'}, 'cornice-stellata':{n:'Cornice Stellata',k:'frame'}, 'cornice-brace':{n:'Cornice di Brace',k:'frame'} };
function seasonKey(d){ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function seasonLeft(){ const d=new Date(); const end=new Date(d.getFullYear(),d.getMonth()+1,1); const h=Math.max(0,Math.round((end-d)/36e5)); return h>=48?Math.floor(h/24)+' giorni':h+' ore'; }
let RANK=null;
function rankNew(season){ return {season:season||seasonKey(),tier:0,lvl:3,pend:0,rating:1000,wins:0,losses:0,streak:0,best:{tier:0,lvl:3},hist:[],updated:Date.now()}; }
function rankLoad(){
  if(RANK) return RANK; let r=null; try{ r=JSON.parse(localStorage.getItem(RKEY)||'null'); }catch(e){}
  if(!r||r.tier==null) r=rankNew();
  RANK=r; seasonCheck(); return RANK;
}
function rankSave(){ RANK.updated=Date.now(); try{ localStorage.setItem(RKEY,JSON.stringify(RANK)); }catch(e){} rankPush(); }
function rankName(r){ r=r||rankLoad(); return 'Taglia '+TIERS[r.tier].n+(r.tier<CREMISI?' '+ROMAN[r.lvl]:''); }
function rankValue(r){ r=r||rankLoad(); if(r.tier===CREMISI) return Math.round(r.rating*10); const t=TIERS[r.tier]; return t.base+((3-r.lvl)*PEND+r.pend)*t.step; }
function rankScore(r){ r=r||rankLoad(); return r.tier===CREMISI?4000+r.rating:r.tier*1000+(3-r.lvl)*PEND*20+r.pend*20; }
function rankBetter(a,b){ return a.tier>b.tier||(a.tier===b.tier&&a.tier<CREMISI&&a.lvl<b.lvl); }
// fine stagione: premi in base al rango raggiunto, poi si scende di un rango (Cremisi riparte da Nera I)
function seasonCheck(){
  const r=RANK, now=seasonKey(); if(r.season===now) return;
  const end={season:r.season,tier:r.tier,lvl:r.lvl,rating:r.rating,value:rankValue(r),place:r.place||null};
  const rw=SEASON_REWARDS[r.tier]; const o=ACC()?{coins:0,packs:0,cosm:[]}:ownLoad(); o.coins+=rw.gra; o.packs+=rw.packs; o.cosm=o.cosm||[];
  const gained=[]; if(rw.cosm&&!o.cosm.includes(rw.cosm)){ o.cosm.push(rw.cosm); gained.push(rw.cosm); }
  if(r.tier===CREMISI && r.place && r.place<=200 && !o.cosm.includes('cornice-cremisi')){ o.cosm.push('cornice-cremisi'); gained.push('cornice-cremisi'); }
  ownSave();
  const nt=r.tier===CREMISI?3:Math.max(0,r.tier-1), nl=r.tier===CREMISI?1:3;
  const hist=(r.hist||[]).concat([end]).slice(-24);
  RANK=Object.assign(rankNew(now),{tier:nt,lvl:nl,hist,best:{tier:nt,lvl:nl}});
  RANK.__reward={end,rw,gained}; try{ localStorage.setItem(RKEY,JSON.stringify(RANK)); }catch(e){}
}
function seasonRewardModal(){
  const r=rankLoad(); const x=r.__reward; if(!x) return; delete r.__reward; rankSave();
  const d=modal(`<div class="mtitle"><span class="orn">❧</span><h3>Fine della stagione ${esc(x.end.season)}</h3><span class="orn r">❧</span></div>
    <div class="rkbig">${manifestHtml(Object.assign({},x.end,{pend:0}),true)}</div>
    <div class="note" style="margin:8px auto">Hai chiuso la stagione come <b>${esc(rankName(x.end))}</b>${x.end.place?` · <b>#${x.end.place}</b>`:''}.</div>
    <div class="rkrew">${GI} <b>+${x.rw.gra} GRA</b>${x.rw.packs?` · 🎴 <b>+${x.rw.packs} ${x.rw.packs===1?'pacchetto':'pacchetti'}</b>`:''}${x.gained.map(k=>` · ✦ <b>${esc(COSM[k].n)}</b>`).join('')}</div>
    <div class="note" style="margin:8px auto">La nuova stagione parte da <b>${esc(rankName(r))}</b>.</div>
    <div class="row"><button class="btn" id="srOk">Continua</button></div>`);
  $('#srOk').onclick=()=>{ closeModal(); menu(); };
}
// risultato di una partita classificata: pendenti nelle taglie, punteggio nel Cremisi
function rankResult(win,opp){
  const r=rankLoad(); const before={tier:r.tier,lvl:r.lvl,pend:r.pend,rating:r.rating};
  let note='';
  if(win){ r.wins++; r.streak=Math.max(1,(r.streak||0)+1); } else { r.losses++; r.streak=0; }
  if(r.tier===CREMISI){
    const or=opp&&opp.tier===CREMISI?(opp.rating||1000):1000-(CREMISI-(opp?opp.tier:3))*120;
    const exp=1/(1+Math.pow(10,(or-r.rating)/400)); const d=Math.round(32*((win?1:0)-exp));
    r.rating=Math.max(800,r.rating+d); note=(d>=0?'+':'')+d+' punti';
  } else if(win){
    r.pend++; note='+1 pendente';
    if(r.pend>=PEND){ r.pend=0; if(r.lvl>1){ r.lvl--; note='Promozione: '+rankName(r); } else { r.tier++; r.lvl=3; if(r.tier===CREMISI) r.rating=1000; note='Nuovo rango: '+rankName(r); } }
  } else if(r.tier===0){ note='Nessun pendente perso (Taglia Bianca)';
  } else if(r.pend>0){ r.pend--; note='−1 pendente';
  } else if(r.lvl<3){ r.lvl++; r.pend=PEND-1; note='Retrocessione: '+rankName(r);
  } else note='Nessun pendente perso (inizio del rango)';
  if(rankBetter(r,r.best)) r.best={tier:r.tier,lvl:r.lvl};
  rankSave(); return {before,after:{tier:r.tier,lvl:r.lvl,pend:r.pend,rating:r.rating},note,win};
}
function rankEndHtml(){ const x=G&&G.__rankRes; if(!x) return ''; const r=rankLoad();
  if(x.pending||x.void) return `<div class="rkend ${x.void?'void':'wait'}" style="--tc:${TIERS[r.tier].col}">${manifestHtml(r)}<div><b>${esc(rankName(r))}</b>${pendHtml(r)}<small>${x.void?esc(x.note):'⏳ Il server sta verificando la partita…'}</small></div></div>`;
  const up=x.after.tier>x.before.tier||(x.after.tier===x.before.tier&&x.after.lvl<x.before.lvl), down=x.after.tier===x.before.tier&&x.after.lvl>x.before.lvl;
  return `<div class="rkend ${x.win?'win':'loss'} ${up?'up':''} ${down?'down':''}" style="--tc:${TIERS[r.tier].col}">${manifestHtml(r)}<div><b>${esc(rankName(r))}</b>${pendHtml(r)}<small>${esc(x.note)} · valore ${rankValue(r).toLocaleString('it-IT')} GRA</small></div></div>`; }
function rankInfo(){ const r=rankLoad(); return {tier:r.tier,lvl:r.lvl,pend:r.pend,rating:Math.round(r.rating)}; }
// ---- manifesto (grado visivo) ----
function pendHtml(r){ return r.tier===CREMISI?`<span class="rkrating">${Math.round(r.rating)} pt</span>`:`<span class="pends">${Array.from({length:PEND},(_,i)=>`<i class="${i<r.pend?'on':''}"></i>`).join('')}</span>`; }
function manifestHtml(r,big){ r=r||rankLoad(); const t=TIERS[r.tier];
  return `<div class="manif t${r.tier} ${big?'big':''}" style="--tc:${t.col};--ti:${t.ink}"><div class="mfh">TAGLIA</div><div class="mft">${t.n.toUpperCase()}</div><div class="mfl">${r.tier<CREMISI?ROMAN[r.lvl]:'✦'}</div></div>`; }
function rankWidget(){ rankPull(); const r=rankLoad();
  return `<button class="rkw" id="bRank" style="--tc:${TIERS[r.tier].col}">${manifestHtml(r)}<span class="rkwt"><b>${esc(rankName(r))}</b>${pendHtml(r)}<small>Valore di taglia ${rankValue(r).toLocaleString('it-IT')} GRA</small></span></button>`; }
// ---- schermata Classificata ----
let LB=null, LBunsub=null;
function rankScreen(){
  G=null; NET&&NET.leave&&NET.leave(); NET=null; closeModal(); const r=rankLoad(); const o=ownLoad(); o.cosm=o.cosm||[];
  app.innerHTML=`<div class="coll rank"><div class="chead"><button class="btn sm" id="cBack">‹ Menu</button><h2>Classificata</h2><span class="pill">Stagione ${esc(r.season)} · termina tra ${seasonLeft()}</span></div>
   <div class="rkmain">
    <div class="rkcard">${manifestHtml(r,true)}<div class="rkname">${esc(rankName(r))}</div>${pendHtml(r)}
      <div class="rkval">Valore di taglia<b>${rankValue(r).toLocaleString('it-IT')} GRA</b></div>
      <div class="rkstats"><span><b>${r.wins}</b> vittorie</span><span><b>${r.losses}</b> sconfitte</span><span><b>${r.streak||0}</b> di fila</span></div>
      <div class="note" style="max-width:none">Miglior rango della stagione: <b>${esc(rankName({tier:r.best.tier,lvl:r.best.lvl}))}</b></div>
      <button class="btn big" id="rkPlay">⚔ Cerca partita classificata</button>
    </div>
    <div class="rkinfo">
      <h3>Come si sale</h3>
      <div class="note" style="text-align:left;max-width:none">Ogni rango ha tre livelli (III, II, I). In ogni livello si raccolgono <b>5 pendenti</b>, come quelli che si prendono riscuotendo una taglia: <b>vittoria +1</b>, <b>sconfitta −1</b>. Con 5 pendenti sali di livello; a pendenti finiti una sconfitta ti fa scendere di livello, ma mai sotto l'inizio del rango. In <b>Taglia Bianca</b> le sconfitte non tolgono pendenti. Abbandonare una partita conta come sconfitta.<br>Nella <b>Taglia Cremisi</b> i pendenti spariscono: conta un punteggio che sale e scende in base alla forza dell'avversario, e i <b>primi 200</b> sono in classifica. Il primo porta l'annotazione <b>INSUPERATUS</b>.</div>
      <div class="rkladder">${TIERS.map((t,i)=>`<div class="${i===r.tier?'cur':''}" style="--tc:${t.col};--ti:${t.ink}"><i></i><b>Taglia ${t.n}</b><small>${i<CREMISI?`${t.base.toLocaleString('it-IT')}–${(t.base+14*t.step).toLocaleString('it-IT')} GRA`:'classifica a punti'}</small><em>${GI} ${SEASON_REWARDS[i].gra}${SEASON_REWARDS[i].packs?` · 🎴 ${SEASON_REWARDS[i].packs}`:''}${SEASON_REWARDS[i].cosm?' · ✦ dorso':''}</em></div>`).join('')}</div>
      <div class="note" style="text-align:left;max-width:none">A fine stagione (ogni mese) ricevi i premi del rango raggiunto e riparti un rango più in basso; dalla Cremisi si riparte da Nera I. I primi 200 della Cremisi ottengono anche la <b>Cornice Cremisi</b> per l'eroe.</div>
      ${o.cosm.filter(k=>COSM[k]).length?`<h3>Premi sbloccati</h3><div class="rkcosm">${o.cosm.filter(k=>COSM[k]).map(k=>`<label><input type="radio" name="${COSM[k].k}" value="${k}" ${SET[COSM[k].k]===k?'checked':''}> ${esc(COSM[k].n)}</label>`).join('')}<label><input type="radio" name="back" value="" ${!SET.back?'checked':''}> Dorso normale</label>${o.cosm.includes('cornice-cremisi')?`<label><input type="radio" name="frame" value="" ${!SET.frame?'checked':''}> Nessuna cornice</label>`:''}</div>`:''}
      <h3>Classifica Cremisi · primi 200</h3><div class="rklb" id="rkLb"><div class="note">Carico la classifica…</div></div>
      ${r.hist&&r.hist.length?`<h3>Stagioni passate</h3><div class="rkhist">${r.hist.slice().reverse().map(h=>`<div><b>${esc(h.season)}</b> · ${esc(rankName(h))}${h.place?` · #${h.place}`:''}</div>`).join('')}</div>`:''}
    </div></div></div>`;
  $('#cBack').onclick=()=>menu();
  $('#rkPlay').onclick=()=>{ if(needDeck()) findMatch('classificata'); };
  app.querySelectorAll('.rkcosm input').forEach(i=>i.onchange=()=>{ SET[i.name]=i.value||null; saveSet&&saveSet(); });
  lbLoad();
}
async function getDb(){ try{ const n=netSrc(); return n? await n.use('db'):null; }catch(e){ return null; } }
async function getUser(){ try{ const n=netSrc(); return n? await n.use('user'):null; }catch(e){ return null; } }
// scrive il proprio rango nel database condiviso (se disponibile), per la classifica
let RANK_PUSHING=false, RANK_PUSH_AGAIN=false;
async function rankPush(){
  if(SRV()) return; // con l'arbitro attivo il rango lo scrive solo il server
  if(RANK_PUSHING){ RANK_PUSH_AGAIN=true; return; } RANK_PUSHING=true;
  try{ const db=await getDb(), u=await getUser(); const id=u&&await u.id(); if(db&&id){ const r=RANK;
    await db.doc('ranks/'+id).set({season:r.season,tier:r.tier,lvl:r.lvl,pend:r.pend,rating:Math.round(r.rating),value:rankValue(r),wins:r.wins,losses:r.losses,updated:Date.now()}); } }catch(e){}
  RANK_PUSHING=false; if(RANK_PUSH_AGAIN){ RANK_PUSH_AGAIN=false; rankPush(); }
}
let LB_CACHE=null;
async function lbLoad(){
  const box=()=>$('#rkLb'); const fail=t=>{ const b=box(); if(b) b.innerHTML=`<div class="note">${t}</div>`; };
  const db=await getDb(); if(!db) return fail((window.claude?'La classifica condivisa non è disponibile in questa vista: apri il gioco dal suo link su claude.ai con un account che può giocare online.':'Il gioco online e la Classificata arriveranno presto nella versione scaricabile. Intanto puoi giocare contro il computer.'));
  const u=await getUser(); const myId=u&&await u.id();
  const to=setTimeout(()=>fail('La classifica non risponde: riprova più tardi.'),10000);
  try{
    // la classifica si scarica al massimo ogni 3 minuti; con il server attivo si leggono solo i primi 200 della Cremisi
    const season=rankLoad().season; let rows;
    if(LB_CACHE&&LB_CACHE.season===season&&Date.now()-LB_CACHE.t<180000) rows=LB_CACHE.rows;
    else { if(SRV()&&window.ELG_NET.rk.leaderboard) rows=await window.ELG_NET.rk.leaderboard(season);
      else { const s=await db.collection('ranks').where('season','==',season).where('tier','==',CREMISI).orderBy('rating','desc').limit(200).get(); rows=s.docs.map(d=>Object.assign({id:d.id},d.data())); }
      LB_CACHE={season,t:Date.now(),rows}; }
    clearTimeout(to);
    const me_=rows.findIndex(x=>x.id===myId); if(me_>=0){ RANK.place=me_+1; try{ localStorage.setItem(RKEY,JSON.stringify(RANK)); }catch(e){} }
    if(!rows.length) return fail('Nessun cacciatore ha ancora raggiunto la Taglia Cremisi in questa stagione.');
    let names={}; try{ names=u&&u.profiles? await u.profiles(rows.map(x=>x.id)) : {}; }catch(e){}
    const b=box(); if(!b) return;
    b.innerHTML=`<table><tr><th>#</th><th>Cacciatore</th><th>Punti</th><th>V/S</th></tr>${rows.map((x,i)=>`<tr class="${x.id===myId?'me':''}"><td>${i+1}</td><td>${esc((names[x.id]&&names[x.id].name)||'Cacciatore')}${i===0?' <span class="insup">INSUPERATUS</span>':''}${x.id===myId?' (tu)':''}</td><td>${x.rating}</td><td>${x.wins||0}/${x.losses||0}</td></tr>`).join('')}</table>`;
  }catch(e){ clearTimeout(to); fail('Impossibile leggere la classifica ('+(e.code||'errore')+').'); }
}
// ---- ricerca partita: Amichevole o Classificata, tramite la stanza d'attesa ----
function findMatchChooser(){
  const r=rankLoad();
  const d=modal(`<h3>Cerca partita</h3><div class="mmchoice">
    <button class="mmopt" id="mmFr"><b>🤝 Amichevole</b><small>Partita contro un altro giocatore online. Non cambia il tuo rango.</small></button>
    <button class="mmopt rk" id="mmRk" style="--tc:${TIERS[r.tier].col}">${manifestHtml(r)}<span><b>⚔ Classificata</b><small>${esc(rankName(r))} · contro un giocatore di grado simile. Vinci pendenti, sali di taglia.</small></span></button>
  </div><div class="row"><button class="btn" id="mmX">Annulla</button></div>`);
  $('#mmX').onclick=closeModal; $('#mmFr').onclick=()=>findMatch('amichevole'); $('#mmRk').onclick=()=>{ if(!window.claude&&window.ELG_NET&&!window.ELG_NET.ranked){ toast('La Classificata arriva a breve, con l\'arbitro sul server che la protegge dai trucchi. Intanto puoi giocare in Amichevole.'); return; } findMatch('classificata'); };
}

if(window.I18N_AFTER) I18N_AFTER();
menu();
