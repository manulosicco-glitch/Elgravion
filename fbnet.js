// ELGRAVION TCG — collegamento online fuori da claude.ai, tramite Firebase.
// Offre le stesse funzioni che il gioco usa su claude.ai (stanze, database, utente),
// così il resto del codice non cambia. Si attiva solo se fbconfig.js contiene la configurazione.
(function(){
  const CFG = window.ELG_FIREBASE_CONFIG;
  if (!CFG || window.claude) return;
  const V = '10.14.1', BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';
  let ready = null, offset = 0;

  function load(src){
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = () => rej(new Error('rete')); document.head.appendChild(s); });
  }
  function init(){
    if (ready) return ready;
    ready = (async () => {
      await load(BASE + 'firebase-app-compat.js');
      await Promise.all([load(BASE + 'firebase-auth-compat.js'), load(BASE + 'firebase-database-compat.js')]);
      firebase.initializeApp(CFG);
      firebase.database().ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
      return firebase;
    })();
    ready.catch(() => { ready = null; });
    return ready;
  }
  const clean = x => x == null ? null : JSON.parse(JSON.stringify(x));
  const now = () => Date.now() + offset;

  // ---------- accesso con Google ----------
  async function currentUser(){
    await init(); const a = firebase.auth();
    if (a.currentUser) return a.currentUser;
    await new Promise(r => { const un = a.onAuthStateChanged(() => { un(); r(); }); });
    return a.currentUser;
  }
  async function signIn(){
    await init(); const a = firebase.auth();
    if (a.currentUser) return a.currentUser;
    const p = new firebase.auth.GoogleAuthProvider();
    try { await a.signInWithPopup(p); }
    catch (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { await a.signInWithRedirect(p); return null; }
      throw e;
    }
    const u = a.currentUser;
    if (u) { try { await firebase.database().ref('users/' + u.uid).update({ name: (u.displayName || 'Cacciatore').slice(0, 39) }); } catch (e) {} }
    return u;
  }
  async function needUser(){
    const u = (await currentUser()) || (await signIn());
    if (!u) { const e = new Error('Accesso necessario'); e.code = 'accesso'; throw e; }
    return u;
  }

  // ---------- stanze in tempo reale ----------
  const roomApi = {
    async join(name){
      const u = await needUser(); const db = firebase.database();
      const base = db.ref('rooms/' + name), peersRef = base.child('peers'), msgs = base.child('msgs');
      const me = peersRef.push(), myKey = me.key;
      await me.onDisconnect().remove();
      await me.set({ uid: u.uid, kind: 'viewer', t: firebase.database.ServerValue.TIMESTAMP });
      let peers = {}; const peerCbs = new Set(); const handlers = {};
      // si scarica solo la presenza che cambia, non tutta la lista ogni volta (meno traffico con tanti giocatori)
      const fire = () => peerCbs.forEach(f => { try { f(); } catch (e) {} });
      const onAdd = s => { peers[s.key] = s.val(); fire(); }, onDel = s => { delete peers[s.key]; fire(); };
      peersRef.on('child_added', onAdd); peersRef.on('child_changed', onAdd); peersRef.on('child_removed', onDel);
      const q = msgs.orderByChild('t').startAt(now() - 30000);
      const onMsg = s => { const m = s.val(); if (!m || !m.topic) return; (handlers[m.topic] || []).slice().forEach(f => { try { f({ isMe: m.from === myKey, data: m.data == null ? null : m.data }); } catch (e) {} }); };
      q.on('child_added', onMsg);
      let left = false;
      return {
        on(topic, cb){ (handlers[topic] = handlers[topic] || []).push(cb); return () => { handlers[topic] = (handlers[topic] || []).filter(x => x !== cb); }; },
        emit(topic, data){ if (left) return; msgs.push({ topic, data: clean(data), from: myKey, uid: u.uid, t: firebase.database.ServerValue.TIMESTAMP }).catch(() => {}); },
        async presence(p){ await me.child('presence').set(clean(p)); },
        peers(){ return Object.entries(peers).map(([k, v]) => ({ id: k, isMe: k === myKey, kind: (v && v.kind) || 'viewer', presence: (v && v.presence) || null })); },
        onPeers(cb){ peerCbs.add(cb); return () => peerCbs.delete(cb); },
        leave(){
          if (left) return; left = true;
          q.off('child_added', onMsg); peersRef.off('child_added', onAdd); peersRef.off('child_changed', onAdd); peersRef.off('child_removed', onDel);
          me.remove().then(() => peersRef.once('value')).then(s => { if (!s.exists()) base.remove().catch(() => {}); }).catch(() => {});
        }
      };
    }
  };

  // ---------- database (classifica) ----------
  function docRef(path){
    return {
      async set(obj){ await needUser(); await firebase.database().ref(path).set(clean(obj)); },
      async get(){ await init(); const s = await firebase.database().ref(path).once('value'); return { exists: s.exists(), id: s.key, data: () => s.val() }; }
    };
  }
  function collection(name){
    const filters = []; let order = null, dir = 'asc', lim = 100;
    const q = {
      where(f, op, v){ filters.push([f, v]); return q; },
      orderBy(f, d){ order = f; dir = d || 'asc'; return q; },
      limit(n){ lim = n; return q; },
      async get(){
        await init(); let ref = firebase.database().ref(name);
        if (order) ref = ref.orderByChild(order);
        const s = await ref.limitToLast(Math.min(1000, lim * 5)).once('value');
        let rows = []; s.forEach(c => { rows.push({ id: c.key, v: c.val() || {} }); });
        rows = rows.filter(r => filters.every(([f, v]) => r.v[f] === v));
        if (order) rows.sort((a, b) => (dir === 'desc' ? -1 : 1) * ((a.v[order] || 0) - (b.v[order] || 0)));
        rows = rows.slice(0, lim);
        return { docs: rows.map(r => ({ id: r.id, data: () => r.v })) };
      }
    };
    return q;
  }
  const dbApi = { doc: docRef, collection };

  // ---------- utente ----------
  const userApi = {
    async id(){ const u = await currentUser(); return u ? u.uid : null; },
    async name(){ const u = await currentUser(); return u ? (u.displayName || 'Cacciatore') : null; },
    async profiles(ids){
      await init(); const out = {};
      await Promise.all(ids.map(async id => { try { const s = await firebase.database().ref('users/' + id + '/name').once('value'); if (s.exists()) out[id] = { name: s.val() }; } catch (e) {} }));
      return out;
    }
  };

  // ---------- Classificata con arbitro sul server ----------
  let rankedFlag = !!window.ELG_RANKED_SERVER, econFlag = false;
  async function checkRanked(){
    try { await init(); const s = await firebase.database().ref('config').once('value'); const c = s.val() || {};
      rankedFlag = rankedFlag || c.rankedServer === true; econFlag = c.economyServer === true; } catch (e) {}
    return rankedFlag;
  }
  // ---------- economia sul server (collezione, GRA, pacchetti) ----------
  let fnApi = null;
  async function functionsApi(){
    await init(); if (!firebase.functions) await load(BASE + 'firebase-functions-compat.js');
    return fnApi || (fnApi = firebase.app().functions('europe-west1'));
  }
  async function econ(op, data){
    await needUser(); const f = (await functionsApi()).httpsCallable('economia', { timeout: 70000 });
    const r = await f(Object.assign({ op }, clean(data) || {})); return r.data;
  }
  const decks = {
    async get(){ const u = await currentUser(); if (!u) return null; const s = await firebase.database().ref('decks/' + u.uid).once('value'); return s.val(); },
    async set(d){ const u = await currentUser(); if (!u) return; await firebase.database().ref('decks/' + u.uid).set(clean(d)); }
  };
  const rk = {
    async register(room, data){ const u = await needUser(); await firebase.database().ref('ranked/' + room + '/players/' + u.uid).set(clean(data)); return u.uid; },
    async players(room){ await init(); const s = await firebase.database().ref('ranked/' + room + '/players').once('value'); return s.val() || {}; },
    async end(room, priv){ const u = await needUser(); await firebase.database().ref('ranked/' + room + '/end/' + u.uid).set({ priv: priv >>> 0, t: firebase.database.ServerValue.TIMESTAMP }); return u.uid; },
    onResult(room, cb){ const ref = firebase.database().ref('ranked/' + room + '/result'); const f = s => { if (s.exists()) cb(s.val()); }; ref.on('value', f); return () => ref.off('value', f); },
    async leaderboard(season){ await init(); const s = await firebase.database().ref('ranks').orderByChild('cr').startAt(season + ':').endAt(season + ':~').limitToLast(200).once('value');
      const rows = []; s.forEach(c => { rows.push(Object.assign({ id: c.key }, c.val() || {})); }); return rows.sort((a, b) => (b.rating || 0) - (a.rating || 0)); },
    async myRank(){ const u = await currentUser(); if (!u) return null; const s = await firebase.database().ref('ranks/' + u.uid).once('value'); return { uid: u.uid, r: s.val() }; }
  };

  window.ELG_NET = {
    online: true,
    // la Classificata fuori da claude.ai si accende solo quando l'arbitro sul server è pronto
    get ranked(){ return rankedFlag; }, get econOn(){ return econFlag; }, checkRanked, rk, econ, decks,
    async use(kind){ await init(); return kind === 'room' ? roomApi : kind === 'db' ? dbApi : kind === 'user' ? userApi : null; },
    signIn, currentUser,
    async signOut(){ await init(); await firebase.auth().signOut(); }
  };
})();
