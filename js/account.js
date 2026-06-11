// ===== account.js : 계정(로그인), 세이브 버전/마이그레이션, 백업 내보내기/가져오기 =====
'use strict';

// 세이브 형식 버전 — 형식이 바뀌면 올리고 migrateSave에 변환 단계를 추가한다
const SAVE_VERSION = 4;

// v3까지의 자체 포켓몬 번호 → 전국도감 번호 (v4에서 1세대 151종 도입)
const OLD_SP_TO_DEX = {
  1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 10:10, 11:11, 12:12,
  13:16, 14:17, 15:18, 16:19, 17:20, 18:25, 19:26, 20:39, 21:54, 22:55,
  23:79, 24:143, 25:133, 26:134, 27:135, 28:136, 29:81, 30:95, 31:131,
  32:129, 33:130, 34:144, 35:145, 36:146, 37:150
};
function _remapPoke(poke){
  if(!poke) return;
  const map = id => OLD_SP_TO_DEX[id] || id;
  (poke.party || []).forEach(p => { p.sp = map(p.sp); });
  (poke.box || []).forEach(p => { p.sp = map(p.sp); });
  if(Array.isArray(poke.seen)) poke.seen = poke.seen.map(map);
  if(Array.isArray(poke.caught)) poke.caught = poke.caught.map(map);
}

// 저장 키 헬퍼: 로그인 중이면 계정 네임스페이스, 아니면 구버전 호환 키
function storeKey(suffix){
  return (typeof Account !== 'undefined' && Account.user)
    ? 'pokecraft_u_' + Account.user.id + '_' + suffix
    : 'pokecraft_' + suffix;
}

// 구버전 세이브 → 현재 버전 변환 (데이터는 절대 버리지 않는다)
function migrateSave(data){
  if(!data || typeof data !== 'object') return data;
  const from = data.v || 2;
  if(from > SAVE_VERSION){
    console.warn('세이브가 게임보다 새 버전입니다 (v' + from + ' > v' + SAVE_VERSION + ') — 그대로 로드 시도');
    return data;
  }
  // v2 → v3: 구조 동일 (버전 스탬프 도입)
  // v3 → v4: 포켓몬 자체 번호 → 전국도감 번호
  if(from < 4) _remapPoke(data.poke);
  data.v = SAVE_VERSION;
  return data;
}

const Account = {
  user: null, // {id, name, salt, pinHash, created}
  _usersKey: 'pokecraft_users',
  _curKey: 'pokecraft_current_user',

  users(){
    try { return JSON.parse(localStorage.getItem(this._usersKey) || '{}'); }
    catch(e){ return {}; }
  },
  _saveUsers(u){ localStorage.setItem(this._usersKey, JSON.stringify(u)); },

  async _hash(text){
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch(e){
      // crypto.subtle을 못 쓰는 환경 폴백 (간이 해시)
      let h = 7;
      for(let i = 0; i < text.length; i++){ h = (Math.imul(h, 31) + text.charCodeAt(i)) | 0; }
      return 'x' + (h >>> 0).toString(16);
    }
  },

  async register(name, pin){
    name = (name || '').trim();
    if(name.length < 1 || name.length > 12) throw new Error('이름은 1~12자로 해주세요');
    if(!/^\d{4,8}$/.test(pin)) throw new Error('PIN은 숫자 4~8자리로 해주세요');
    const users = this.users();
    if(users[name]) throw new Error('이미 있는 이름이에요 — 로그인하거나 다른 이름을 쓰세요');
    const salt = Math.random().toString(36).slice(2, 10);
    const rec = {
      id: 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name, salt,
      pinHash: await this._hash(salt + pin),
      created: Date.now()
    };
    users[name] = rec;
    this._saveUsers(users);
    this._setCurrent(rec);
    this.adoptLegacy();
    return rec;
  },
  async login(name, pin){
    const rec = this.users()[(name || '').trim()];
    if(!rec) throw new Error('없는 계정이에요 — "새 계정 만들기"를 눌러보세요');
    if(rec.pinHash !== await this._hash(rec.salt + pin)) throw new Error('PIN이 틀렸어요');
    this._setCurrent(rec);
    this.adoptLegacy();
    return rec;
  },
  logout(){
    this.user = null;
    localStorage.removeItem(this._curKey);
  },
  // 부팅 시 자동 로그인 복원
  restore(){
    const name = localStorage.getItem(this._curKey);
    const rec = name && this.users()[name];
    if(rec){
      this.user = rec;
      this.adoptLegacy(); // 비로그인 상태에서 생긴 세이브도 흡수
    }
  },
  _setCurrent(rec){
    this.user = rec;
    localStorage.setItem(this._curKey, rec.name);
  },

  // 계정 없던 시절(또는 비로그인 플레이)의 세이브를 계정으로 복사 (있는 것은 덮어쓰지 않음)
  adoptLegacy(){
    if(!this.user) return 0;
    const pre = 'pokecraft_u_' + this.user.id + '_';
    let copied = 0;
    const legacy = [];
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && /^pokecraft_(save_|guest_|pokemon$|ach$)/.test(k) && !k.startsWith('pokecraft_u_')) legacy.push(k);
    }
    legacy.forEach(k => {
      const target = pre + k.replace(/^pokecraft_/, '');
      if(localStorage.getItem(target) === null){
        try { localStorage.setItem(target, localStorage.getItem(k)); copied++; } catch(e){ return; }
      }
      localStorage.removeItem(k); // '이동' — 다른 계정으로 중복 복제되지 않게
    });
    const last = localStorage.getItem('pokecraft_last');
    if(last && localStorage.getItem(pre + 'last') === null) localStorage.setItem(pre + 'last', last);
    if(last) localStorage.removeItem('pokecraft_last');
    return copied;
  },

  // 이 계정의 세계 목록 (메타데이터)
  worlds(){
    const pre = storeKey('save_');
    const out = [];
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(!k || !k.startsWith(pre)) continue;
      try {
        const d = JSON.parse(localStorage.getItem(k));
        out.push({
          seed: d.seed,
          name: d.seedStr || ('세계 ' + d.seed),
          mode: d.mode || 'survival',
          savedAt: d.savedAt || 0,
          party: d.poke && d.poke.party ? d.poke.party.length : 0,
          dex: d.poke && d.poke.caught ? d.poke.caught.length : 0,
        });
      } catch(e){}
    }
    out.sort((a, b) => b.savedAt - a.savedAt);
    return out;
  },
  deleteWorld(seed){
    localStorage.removeItem(storeKey('save_' + seed));
    localStorage.removeItem(storeKey('guest_' + seed));
    if(localStorage.getItem(storeKey('last')) === String(seed)) localStorage.removeItem(storeKey('last'));
  },

  // ---------- 백업 ----------
  exportData(){
    if(!this.user) throw new Error('로그인 후 백업할 수 있어요');
    const pre = 'pokecraft_u_' + this.user.id + '_';
    const items = {};
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.startsWith(pre)) items[k.slice(pre.length)] = localStorage.getItem(k);
    }
    return JSON.stringify({
      magic: 'pokecraft-backup', v: SAVE_VERSION, exported: Date.now(),
      user: this.user, items
    });
  },
  download(){
    const json = this.exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = 'pokecraft_백업_' + this.user.name + '_' +
      d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  },
  // 백업 JSON 가져오기. 비로그인 상태면 백업 속 계정을 복원해 로그인까지 해준다.
  importData(json){
    let data;
    try { data = JSON.parse(json); } catch(e){ throw new Error('백업 파일을 읽을 수 없어요'); }
    if(!data || data.magic !== 'pokecraft-backup' || !data.user || !data.items)
      throw new Error('포케크래프트 백업 파일이 아니에요');
    if(!this.user){
      const users = this.users();
      const existing = users[data.user.name];
      if(existing && existing.id !== data.user.id){
        // 같은 이름의 다른 계정이 이미 있음 → 이름 뒤에 표식을 붙여 따로 복원
        data.user = { ...data.user, name: (data.user.name + '_복원').slice(0, 12) };
        if(users[data.user.name] && users[data.user.name].id !== data.user.id)
          throw new Error('같은 이름의 계정이 이미 있어요 — 그 계정으로 로그인한 뒤 가져와 주세요');
      }
      users[data.user.name] = data.user;
      this._saveUsers(users);
      this._setCurrent(data.user);
    }
    const pre = 'pokecraft_u_' + this.user.id + '_';
    let n = 0;
    for(const suf in data.items){
      try { localStorage.setItem(pre + suf, data.items[suf]); n++; } catch(e){}
    }
    return { count: n, name: this.user.name };
  },
  // UI에서 가져오기 전 백업 주인 확인용
  peek(json){
    try {
      const d = JSON.parse(json);
      return d && d.magic === 'pokecraft-backup' && d.user ? d.user.name : null;
    } catch(e){ return null; }
  }
};
