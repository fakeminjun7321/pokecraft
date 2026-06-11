// ===== extras.js : 업적, BGM, 미니맵, 터치 조작, 갑옷 표시, 라이드 =====
'use strict';

// ---------- 업적 ----------
const ACH_DEFS = {
  first_tree:    { n:'나무꾼의 시작',  d:'원목을 처음으로 캤다' },
  first_craft:   { n:'제작의 달인',    d:'제작대를 만들었다' },
  first_diamond: { n:'다이아몬드!',    d:'다이아몬드 광석을 캤다' },
  first_enchant: { n:'마법 부여',      d:'도구에 인챈트를 했다' },
  first_catch:   { n:'첫 동료',        d:'야생 포켓몬을 잡았다' },
  dex10:         { n:'포켓몬 박사 입문', d:'도감 10종 등록' },
  dex50:         { n:'포켓몬 박사',    d:'도감 50종 등록' },
  dex151:        { n:'전설의 트레이너', d:'도감 151종 완성!!' },
  first_evolve:  { n:'진화의 빛',      d:'포켓몬을 진화시켰다' },
  badge1:        { n:'첫 배지',        d:'체육관을 클리어했다' },
  badge4:        { n:'배지 마스터',    d:'배지 4개를 모두 모았다' },
  first_fish:    { n:'강태공',         d:'낚시에 성공했다' },
  first_fly:     { n:'하늘을 나는 꿈', d:'포켓몬을 타고 하늘을 날았다' },
  first_surf:    { n:'파도타기',       d:'포켓몬을 타고 물살을 갈랐다' },
  first_tame:    { n:'단짝',           d:'늑대를 길들였다' },
  first_breed:   { n:'농장주',         d:'동물을 번식시켰다' },
  legend:        { n:'전설과의 만남',  d:'전설의 포켓몬을 잡았다' },
  sleep:         { n:'잘 자요',        d:'침대에서 잤다' },
  trade:         { n:'단골 손님',      d:'주민과 거래했다' },
  monument:      { n:'심해 탐험가',    d:'해저신전의 상자를 열었다' },
  nether:        { n:'지옥에 오신 것을 환영합니다', d:'네더에 발을 디뎠다' },
  fortress:      { n:'요새 침입자',    d:'네더 요새를 발견했다' },
  end:           { n:'끝의 세계',      d:'엔드에 도착했다' },
  dragon:        { n:'드래곤 슬레이어', d:'엔더드래곤을 물리쳤다!!' },
  shiny:         { n:'빛나는 만남',    d:'색이 다른 포켓몬을 잡았다!' },
  fossil:        { n:'고고학자',       d:'화석에서 포켓몬을 부활시켰다' },
  trainer:       { n:'라이벌',         d:'떠돌이 트레이너에게 승리했다' },
  heal:          { n:'포켓몬센터',     d:'회복 머신을 사용했다' },
  rocket:        { n:'정의의 트레이너', d:'로켓단을 물리쳤다!' },
  merchant:      { n:'장사꾼의 친구',   d:'교환 상인과 거래했다' },
};
const Ach = {
  _key(){ return storeKey('ach'); },
  data(){
    try { return JSON.parse(localStorage.getItem(this._key()) || '{}'); }
    catch(e){ return {}; }
  },
  has(id){ return !!this.data()[id]; },
  unlock(id){
    if(!ACH_DEFS[id]) return;
    const d = this.data();
    if(d[id]) return;
    d[id] = Date.now();
    try { localStorage.setItem(this._key(), JSON.stringify(d)); } catch(e){}
    SFX.play('level');
    if(typeof UI !== 'undefined') UI.toast('🏆 업적 달성: ' + ACH_DEFS[id].n + ' — ' + ACH_DEFS[id].d, 4500);
  },
  count(){ return Object.keys(this.data()).length; }
};

// ---------- BGM (WebAudio 절차 음악) ----------
const Music = {
  on: false, _timer: null, _master: null, _step: 0,
  // 펜타토닉 스케일 (낮/밤)
  _scales: {
    day:   [262, 294, 330, 392, 440, 523, 587, 659],
    night: [220, 262, 294, 330, 392, 440, 494, 523],
  },
  _chordsDay:   [[262,330,392], [220,262,330], [175,220,262], [196,247,294]],
  _chordsNight: [[220,262,330], [175,220,262], [147,175,220], [165,208,247]],
  init(){
    const opts = JSON.parse(localStorage.getItem('pokecraft_opts') || '{}');
    this.on = opts.bgm !== false;
  },
  setOn(v){
    this.on = v;
    const opts = JSON.parse(localStorage.getItem('pokecraft_opts') || '{}');
    opts.bgm = v;
    localStorage.setItem('pokecraft_opts', JSON.stringify(opts));
    if(!v) this.stop();
    else this.start();
  },
  start(){
    if(this._timer || !this.on) return;
    SFX.init();
    if(!SFX.ctx) return;
    if(!this._master){
      this._master = SFX.ctx.createGain();
      this._master.gain.value = 0.05;
      this._master.connect(SFX.ctx.destination);
    }
    this._timer = setInterval(() => this._tick(), 280);
  },
  stop(){
    if(this._timer){ clearInterval(this._timer); this._timer = null; }
  },
  _note(freq, dur, type, vol){
    const ctx = SFX.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this._master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  _tick(){
    if(!this.on || !game.started || document.hidden) return;
    const night = game.isNight();
    const battle = game.inBattle;
    const scale = this._scales[night ? 'night' : 'day'];
    const chords = night ? this._chordsNight : this._chordsDay;
    const stepInBar = this._step % 8;
    const bar = Math.floor(this._step / 8) % 4;
    // 코드 패드 (마디 시작)
    if(stepInBar === 0){
      chords[bar].forEach(f => this._note(f, 2.2, 'triangle', 0.5));
      this._note(chords[bar][0] / 2, 2.2, 'sine', 0.7); // 베이스
    }
    // 멜로디 (배틀 중엔 더 잦고 높게)
    const p = battle ? 0.75 : 0.4;
    if(Math.random() < p){
      const f = scale[Math.floor(Math.random() * scale.length)] * (battle ? 1.5 : 1);
      this._note(f, battle ? 0.18 : 0.5, 'square', 0.22);
    }
    this._step++;
  }
};

// ---------- 미니맵 ----------
const Minimap = {
  visible: true, _tiles: new Map(), _cv: null, _ctx: null, _colors: {}, _acc: 0,
  init(){
    this._cv = document.getElementById('minimap');
    if(!this._cv) return;
    this._ctx = this._cv.getContext('2d');
    this._ctx.imageSmoothingEnabled = false;
  },
  invalidate(key){ this._tiles.delete(key); },
  reset(){ this._tiles.clear(); },
  _colorOf(id){
    if(this._colors[id] !== undefined) return this._colors[id];
    const c = tileAvgColor(BLOCKS[id].tiles.top);
    const s = '#' + c.toString(16).padStart(6, '0');
    this._colors[id] = s;
    return s;
  },
  _tile(chunk){
    const key = chunk.cx + ',' + chunk.cz;
    let t = this._tiles.get(key);
    if(t) return t;
    t = document.createElement('canvas');
    t.width = 16; t.height = 16;
    const c = t.getContext('2d');
    for(let lx = 0; lx < 16; lx++){
      for(let lz = 0; lz < 16; lz++){
        const h = chunk.heights[lz * 16 + lx];
        const id = chunk.data[lx + lz * 16 + h * 256] || B.STONE;
        c.fillStyle = this._colorOf(id);
        c.fillRect(lx, lz, 1, 1);
        // 높이 음영
        c.fillStyle = 'rgba(0,0,0,' + clamp(0.45 - h / 64 * 0.45, 0, 0.45).toFixed(2) + ')';
        c.fillRect(lx, lz, 1, 1);
      }
    }
    this._tiles.set(key, t);
    return t;
  },
  render(dt){
    if(!this._ctx || !this.visible || !game.started) return;
    this._acc += dt;
    if(this._acc < 0.25) return; // 4fps면 충분
    this._acc = 0;
    const ctx = this._ctx, S = this._cv.width;
    const scale = 1.5; // px per block
    const px = player.body.x, pz = player.body.z;
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, S, S);
    const ccx = Math.floor(px / 16), ccz = Math.floor(pz / 16);
    const R = 4;
    for(let dx = -R; dx <= R; dx++){
      for(let dz = -R; dz <= R; dz++){
        const c = world.chunks.get((ccx + dx) + ',' + (ccz + dz));
        if(!c) continue;
        const sx = S / 2 + (c.cx * 16 - px) * scale;
        const sz = S / 2 + (c.cz * 16 - pz) * scale;
        ctx.drawImage(this._tile(c), sx, sz, 16 * scale, 16 * scale);
      }
    }
    // 구조물 마커
    const mark = (x, z, color, label) => {
      const sx = S / 2 + (x - px) * scale, sz = S / 2 + (z - pz) * scale;
      if(sx < 4 || sx > S - 4 || sz < 4 || sz > S - 4) return;
      ctx.fillStyle = color;
      ctx.fillRect(sx - 3, sz - 3, 6, 6);
    };
    world.villagesNear(px, pz).forEach(v => mark(v.x, v.z, '#e8c84a'));
    world.gymsNear(px, pz).forEach(g => mark(g.x, g.z, '#e84a8a'));
    // 멀티 친구
    if(typeof Net !== 'undefined' && Net.mode !== 'off'){
      for(const [, p] of Net.players){
        if(p.x === undefined) continue;
        if((p.dm || 'over') !== game.dim) continue; // 다른 차원 친구는 표시 안 함
        mark(p.x, p.z, '#4ae8e8');
      }
    }
    // 내 위치 (시선 방향 화살표)
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-player.yaw);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // 테두리
    ctx.strokeStyle = 'rgba(255,255,255,.5)';
    ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
  }
};

// ---------- 갑옷 오버레이 (내/원격 플레이어 모델에 표시) ----------
function applyArmorOverlay(model, armIds){
  // 이전 오버레이 제거
  (model.armorBoxes || []).forEach(b => { b.parent && b.parent.remove(b); disposeObject(b); });
  model.armorBoxes = [];
  if(!armIds) return;
  const colorOf = id => {
    const nm = itemName(id);
    return nm.startsWith('가죽') ? '#9a6b35' : nm.startsWith('철') ? '#d8d8d8' : '#4ee1d2';
  };
  const g = model.group;
  // 모델 구조: buildBiped 기준 (legH .75, bh .7, 머리 y≈1.7)
  if(armIds[0]){ const b = makeBox(g, 0.56, 0.3, 0.56, colorOf(armIds[0]), 0, 1.85, 0); model.armorBoxes.push(b); }
  if(armIds[1]){ const b = makeBox(g, 0.56, 0.55, 0.34, colorOf(armIds[1]), 0, 1.15, 0); model.armorBoxes.push(b); }
  if(armIds[2]){
    const b1 = makeBox(g, 0.2, 0.45, 0.2, colorOf(armIds[2]), -0.14, 0.5, 0);
    const b2 = makeBox(g, 0.2, 0.45, 0.2, colorOf(armIds[2]), 0.14, 0.5, 0);
    model.armorBoxes.push(b1, b2);
  }
}

// ---------- 라이드 (포켓몬 타기) ----------
function rideTypeFor(sp){
  const types = SPECIES[sp].types;
  if(types.includes('flying')) return 'fly';
  if(types.includes('water')) return 'surf';
  return 'run';
}
// 🏇 종별 라이딩 성능: 그 종의 스피드 능력치가 빠를수록 더 빠르게/높게!
function rideStatsFor(sp){
  const spec = SPECIES[sp];
  const spd = spec ? spec.bs[3] : 60; // 종 스피드 (15~160)
  const k = Math.min(1, spd / 130);
  const t = rideTypeFor(sp);
  if(t === 'fly')  return { t, speed: 14 + k * 9,  vert: 9 + k * 4 };           // 비행 14~23
  if(t === 'surf') return { t, speed: 8.5 + k * 6.5, land: 7.5 + k * 4 };       // 수영 8.5~15
  return { t, speed: 8 + k * 7.5, jump: 10 + k * 4.5 };                          // 질주 8~15.5, 점프 10~14.5
}
const RIDE_MSG = { fly:'을(를) 타고 하늘로!', surf:'을(를) 타고 물살을 가른다!', run:'을(를) 타고 질주한다!' };

// ---------- 터치 조작 (모바일 베타) ----------
const Touch = {
  active: false, move: { x: 0, z: 0 }, _lookId: null, _stickId: null,
  _stickCenter: null, _lastLook: null,
  init(){
    if(!('ontouchstart' in window)) return;
    this.active = true;
    game.touch = true;
    document.getElementById('touch-ui').classList.remove('hidden');
    const stick = document.getElementById('t-stick');
    const cv = document.getElementById('game-canvas');

    stick.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.changedTouches[0];
      this._stickId = t.identifier;
      const r = stick.getBoundingClientRect();
      this._stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, { passive: false });
    stick.addEventListener('touchmove', e => {
      e.preventDefault();
      for(const t of e.changedTouches){
        if(t.identifier !== this._stickId) continue;
        const dx = clamp((t.clientX - this._stickCenter.x) / 40, -1, 1);
        const dy = clamp((t.clientY - this._stickCenter.y) / 40, -1, 1);
        this.move.x = dx; this.move.z = dy;
        document.getElementById('t-knob').style.transform = `translate(${dx * 24}px, ${dy * 24}px)`;
      }
    }, { passive: false });
    const stickEnd = e => {
      for(const t of e.changedTouches){
        if(t.identifier !== this._stickId) continue;
        this._stickId = null;
        this.move.x = 0; this.move.z = 0;
        document.getElementById('t-knob').style.transform = '';
      }
    };
    stick.addEventListener('touchend', stickEnd);
    stick.addEventListener('touchcancel', stickEnd);

    // 화면 드래그 = 시점 (이미 시점 터치가 있으면 새 손가락은 무시 — 멀티터치 점프 방지)
    cv.addEventListener('touchstart', e => {
      e.preventDefault(); // iOS 더블탭 확대/스크롤 방지
      if(this._lookId !== null) return;
      const t = e.changedTouches[0];
      this._lookId = t.identifier;
      this._lastLook = { x: t.clientX, y: t.clientY };
    }, { passive: false });
    cv.addEventListener('touchmove', e => {
      e.preventDefault();
      for(const t of e.changedTouches){
        if(t.identifier !== this._lookId || !player) continue;
        player.look((t.clientX - this._lastLook.x) * 2.4, (t.clientY - this._lastLook.y) * 2.4);
        this._lastLook = { x: t.clientX, y: t.clientY };
      }
    }, { passive: false });
    const lookEnd = e => {
      for(const t of e.changedTouches) if(t.identifier === this._lookId) this._lookId = null;
    };
    cv.addEventListener('touchend', lookEnd);
    cv.addEventListener('touchcancel', lookEnd);

    // 버튼들 (touchcancel도 up 처리 — 알림/제스처에 끊겨도 안 끼이게)
    const bind = (id, down, up) => {
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener('touchstart', e => { e.preventDefault(); down(); }, { passive: false });
      if(up){
        el.addEventListener('touchend', e => { e.preventDefault(); up(); }, { passive: false });
        el.addEventListener('touchcancel', () => up());
      }
    };
    let lastJumpTap = 0;
    bind('t-jump', () => {
      game.keys['Space'] = true;
      // 크리에이티브: 점프 버튼 빠르게 2번 = 비행 토글 (마크와 동일)
      const now = performance.now();
      if(game.mode === 'creative' && player && now - lastJumpTap < 300){
        player.fly = !player.fly;
        player.body.noGravity = player.fly;
        if(player.fly) player.body.vy = 0;
        UI.toast(player.fly ? '비행 모드 ON (점프 2번으로 끄기)' : '비행 모드 OFF');
        lastJumpTap = 0;
      } else lastJumpTap = now;
    }, () => { game.keys['Space'] = false; });
    bind('t-dig', () => { if(player){ player.mouseLeft = true; player.attack(); } }, () => { if(player) player.mouseLeft = false; });
    bind('t-use', () => { if(player) player.use(); });
    bind('t-inv', () => {
      if(UI.open === 'inv') UI.close();
      else if(!UI.isOpen()) UI.openInventory(false);
    });
    bind('t-ride', () => { if(typeof toggleRide === 'function') toggleRide(); });
    bind('t-sneak', () => { game.keys['ShiftLeft'] = true; }, () => { game.keys['ShiftLeft'] = false; });
    bind('t-pause', () => {
      if(game.inBattle) return;
      if(UI.isOpen()) UI.close();
      else UI.openPause();
    });
    bind('t-poke', () => {
      if(UI.open === 'party') UI.close();
      else if(!UI.isOpen()) UI.openParty();
    });
    // 조이스틱 끝까지 밀면 달리기
    this.sprinting = () => this._stickId !== null && Math.hypot(this.move.x, this.move.z) > 0.92 && this.move.z < -0.5;
  }
};
