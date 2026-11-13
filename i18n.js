// ELGRAVION TCG — lingua del gioco (italiano / inglese).
// In italiano non cambia nulla. In inglese traduce carte, parole chiave, eroi e interfaccia.
(function(){
  let L = null;
  try { L = localStorage.getItem('elg_lang'); } catch (e) {}
  if (!L) L = /^it\b/i.test(navigator.language || 'it') ? 'it' : 'en';
  window.LANG = L === 'en' ? 'en' : 'it';
  window.setLang = function(l){ try { localStorage.setItem('elg_lang', l); } catch (e) {} location.reload(); };

  const EN = window.ELG_EN || null;
  const on = window.LANG === 'en' && !!EN;
  const NAMES = {};                       // nomi italiani -> inglesi (carte, poteri eroe, eroi)
  if (on) {
    for (const k in EN.cards) NAMES[k] = EN.cards[k][0];
    for (const k in EN.kw) NAMES[k] = EN.kw[k][0];
  }
  window.T_N = s => (on && NAMES[s]) || s;
  window.T_K = s => (on && EN.kw[s] && EN.kw[s][0]) || s;
  window.tn = window.T_N;
  window.tx = c => (on && c && EN.cards[c.n] && EN.cards[c.n][1]) || (c && c.x) || '';
  window.T = s => (on && (EN.ui[s] || EN.words[s] || NAMES[s])) || s;
  if (!on) { window.I18N_AFTER = function(){}; return; }

  // eroi e classi (solo testi mostrati)
  try {
    for (const k in EN.heroes) { const h = HEROES[k], e = EN.heroes[k]; if (!h) continue;
      NAMES[h.n] = e.n; NAMES[h.b[0]] = e.b[0]; NAMES[h.m[0]] = e.m[0];
      h.n = e.n; h.e = e.e; h.b = e.b; h.m = e.m; }
    for (const k in CLASSES) { const c = CLASSES[k]; if (EN.heroes[k]) { c.name = EN.heroes[k].n; c.short = EN.words[c.short] || c.short; } else if (k === 'neutrali') { c.name = 'Neutrals'; c.short = 'Neutrals'; } }
  } catch (e) {}

  // dopo ui.js: parole chiave in inglese, evidenziate e spiegate
  window.I18N_AFTER = function(){
    try {
      for (const k in EN.kw) if (EN.kw[k][1] && typeof KW_POP === 'object') KW_POP[k] = EN.kw[k][1];
      const pairs = []; // [regex source, italian base]
      const add = (en, it, num) => { if (en) pairs.push([en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (num ? ' \\d+' : ''), it]); };
      for (const k in EN.kw) add(EN.kw[k][0], k, false);
      ['Scale', 'Ransom', 'Gift', 'Dig', 'Acquire'].forEach(w => { const it = Object.keys(EN.kw).find(k => EN.kw[k][0] === w); if (it) add(w, it, true); });
      pairs.sort((a, b) => b[0].length - a[0].length);
      const re = new RegExp('\\b(' + pairs.map(p => p[0]).join('|') + ')\\b', 'g');
      const back = s => { for (const [src, it] of pairs) if (new RegExp('^' + src + '$').test(s)) return it; return s; };
      window.kwHtml = x => esc(x).replace(re, m => `<b class="kwd" data-kw="${kwBase(back(m))}">${m}</b>`);
    } catch (e) {}
  };

  // traduzione dei testi dell'interfaccia mentre vengono disegnati
  const PATS = EN.pat.map(([s, r]) => [new RegExp(s), r]);
  const look = s => EN.ui[s] || EN.words[s] || NAMES[s] || null;
  function trText(t){
    const s = t.trim(); if (!s || s.length > 400) return null;
    let r = look(s);
    if (!r) for (const [re, rep] of PATS) { if (re.test(s)) { r = s.replace(re, rep); break; } }
    if (!r || r === s) return null;
    return t.replace(s, r);
  }
  function walk(n){
    if (n.nodeType === 3) { const p = n.parentNode; if (p && (p.tagName === 'SCRIPT' || p.tagName === 'STYLE' || p.tagName === 'TEXTAREA')) return; const r = trText(n.nodeValue); if (r != null) n.nodeValue = r; return; }
    if (n.nodeType !== 1) return;
    for (const a of ['title', 'placeholder', 'aria-label']) { const v = n.getAttribute && n.getAttribute(a); if (v) { const r = trText(v); if (r != null) n.setAttribute(a, r); } }
    for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
  }
  const start = () => {
    walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') walk(m.target); else m.addedNodes.forEach(walk); } })
      .observe(document.body, { subtree: true, childList: true, characterData: true });
    document.documentElement.lang = 'en'; document.title = 'Elgravion TCG';
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
