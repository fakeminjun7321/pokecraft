// ===== net.js : P2P 멀티플레이 (PeerJS / WebRTC) =====
// 호스트의 브라우저가 서버 역할: 몹·야생 포켓몬·드롭·시간을 시뮬레이션하고
// 게스트는 자기 플레이어만 시뮬레이션 + 호스트 상태를 받아 표시한다.
'use strict';

function _randCode(n){
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for(let i = 0; i < n; i++) s += chars[(Math.random() * chars.length) | 0];
  return s;
}
// 네트워크 입력 검증 (악성/버전 불일치 피어로부터 월드 보호)
const MAX_PLAYERS = 20; // 호스트 포함 최대 인원
const PEER_OPTS = { config: { iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
] } };
function _validBlockMsg(m){
  return Number.isInteger(m.x) && Number.isInteger(m.y) && Number.isInteger(m.z) &&
         m.y >= 0 && m.y < WORLD_H && Math.abs(m.x) < 1e7 && Math.abs(m.z) < 1e7 &&
         Number.isInteger(m.id) && (m.id === B.AIR || !!BLOCKS[m.id]);
}
function _validNum(v, lo, hi){ return typeof v === 'number' && isFinite(v) && v >= lo && v <= hi; }
function _validItemId(id){ return Number.isInteger(id) && !!itemDef(id); }

const Net = {
  mode: 'off', // 'off' | 'host' | 'guest'
  peer: null, code: '',
  conns: new Map(),      // peerId -> DataConnection (호스트)
  hostConn: null,        // 게스트 → 호스트 연결
  myName: localStorage.getItem('pokecraft_name') || '플레이어',
  players: new Map(),    // peerId -> {name, x,y,z, yaw, fol, model:{group,legs,tag,folEnt,folSp}, tx,ty,tz,tyaw}
  // 게스트 퍼펫 (호스트가 시뮬레이션하는 엔티티의 복제 표시)
  pMobs: new Map(),      // netId -> puppet
  pWilds: new Map(),
  pDrops: new Map(),
  pTnts: [],
  _sendAcc: 0, _snapAcc: 0, _timeAcc: 0, _furnAcc: 0,
  _pendingWild: new Map(), // netId -> wildData 응답
  _pickupReq: new Set(),
  _helloQueue: [],         // 호스트 월드 준비 전 접속한 게스트 대기열

  // ---------- 시작 ----------
  host(onCode, onError){
    this.code = _randCode(6);
    this.peer = new Peer('pokecraft-' + this.code, PEER_OPTS);
    this.peer.on('open', () => {
      this.mode = 'host';
      onCode(this.code);
    });
    this.peer.on('connection', conn => {
      conn.on('open', () => {
        // 최대 20명 (호스트 포함)
        if(this.players.size + 1 >= MAX_PLAYERS){
          this.send(conn, { t: 'full', max: MAX_PLAYERS });
          setTimeout(() => { try { conn.close(); } catch(e){} }, 600);
          return;
        }
        this.conns.set(conn.peer, conn);
      });
      conn.on('data', m => { try { this.onHostMsg(conn, m); } catch(e){ console.error('net', e); } });
      conn.on('close', () => this._dropPlayer(conn.peer));
      conn.on('error', () => this._dropPlayer(conn.peer));
    });
    this.peer.on('error', e => { console.error('peer', e); if(onError) onError(e); });
  },
  join(code, onInit, onError){
    this.peer = new Peer(PEER_OPTS);
    this.peer.on('open', () => {
      const conn = this.peer.connect('pokecraft-' + code.toUpperCase(), { reliable: true });
      this.hostConn = conn;
      let inited = false;
      conn.on('open', () => {
        this.mode = 'guest';
        conn.send({ t: 'hello', name: this.myName });
      });
      conn.on('data', m => {
        try {
          if(m.t === 'init' && !inited){ inited = true; onInit(m); return; }
          this.onGuestMsg(m);
        } catch(e){ console.error('net', e); }
      });
      conn.on('close', () => {
        if(this.mode === 'guest'){
          UI.toast('호스트와의 연결이 끊어졌어요');
          saveGame();
          setTimeout(() => location.reload(), 2500);
        }
      });
      conn.on('error', e => { if(onError && !inited) onError(e); });
      setTimeout(() => {
        if(!inited){
          inited = true; // 늦은 init의 중복 startGame 방지
          try { this.peer.destroy(); } catch(e){}
          this.mode = 'off';
          if(onError) onError(new Error('timeout'));
        }
      }, 30000); // 호스트가 스타터를 고르는 중일 수 있으므로 넉넉하게
    });
    this.peer.on('error', e => { console.error('peer', e); if(onError) onError(e); });
  },
  _dropPlayer(id){
    this.conns.delete(id);
    const p = this.players.get(id);
    if(p && p.model){ scene.remove(p.model.group); disposeObject(p.model.group); if(p.model.folEnt){ scene.remove(p.model.folEnt.root); disposeObject(p.model.folEnt.root); } }
    if(p) this.chat('[' + p.name + '님이 나갔습니다]');
    this.players.delete(id);
    // 이 게스트가 예약했던 야생 포켓몬 동결 해제
    if(typeof PokeMan !== 'undefined'){
      PokeMan.wilds.forEach(w => {
        if(w.reservedBy === id){ w.catching = false; w.reservedBy = null; w.fleeTimer = 3; }
      });
    }
  },
  send(conn, obj){ try { if(conn && conn.open) conn.send(obj); } catch(e){} },
  broadcast(obj, exceptId){
    for(const [id, c] of this.conns){ if(id !== exceptId) this.send(c, obj); }
  },
  toHost(obj){ this.send(this.hostConn, obj); },

  // ---------- 메시지: 호스트 수신 ----------
  _processHello(conn, name){
    const pid = conn.peer;
    const furn = {}, chst = {};
    for(const [k, f] of world.furnaces) furn[k] = f;
    for(const [k, c] of world.chests) chst[k] = c;
    const overW = worlds.over || world;
    this.send(conn, {
      t: 'init', seed: game.seed, time: game.time, mode: game.mode,
      pokeOn: PokeMan.enabled, edits: overW.edits, furnaces: furn, chests: chst,
      spawn: overW.spawnPoint,
      nether: worlds.nether ? worlds.nether.serialize() : null,
      end: worlds.end ? worlds.end.serialize() : null
    });
    this.players.set(pid, { name: (name || '친구').slice(0, 12), x: 0, y: 0, z: 0, yaw: 0, fol: 0 });
    this.chat('[' + this.players.get(pid).name + '님이 접속했습니다]');
  },
  // 호스트 월드 준비 완료 시(startGame 끝) 대기 중인 게스트 처리
  flushHello(){
    this._helloQueue.forEach(({ conn, name }) => { if(conn.open) this._processHello(conn, name); });
    this._helloQueue = [];
  },
  onHostMsg(conn, m){
    const pid = conn.peer;
    switch(m.t){
      case 'hello': {
        if(!game.started || !world){ this._helloQueue.push({ conn, name: m.name }); break; }
        this._processHello(conn, m.name);
        break;
      }
      case 'pos': {
        const p = this.players.get(pid);
        if(p && _validNum(m.x, -1e7, 1e7) && _validNum(m.y, -100, 1000) && _validNum(m.z, -1e7, 1e7)){
          p.x = m.x; p.y = m.y; p.z = m.z;
          p.yaw = _validNum(m.yaw, -100, 100) ? m.yaw : 0;
          p.fol = (Number.isInteger(m.fol) && SPECIES[m.fol]) ? m.fol : 0;
          p.rid = m.rid ? 1 : 0;
          p.dm = (m.dm === 'nether' || m.dm === 'end') ? m.dm : 'over';
          p.arm = Array.isArray(m.arm) ? m.arm.slice(0, 3).map(a => _validItemId(a) && armorInfo(a) ? a : 0) : null;
        }
        break;
      }
      case 'relay': {
        // 플레이어 간 1:1 메시지 (대전/교환)
        if(!m.msg || typeof m.msg !== 'object') break;
        if(m.to === 'host') this._onPeer(pid, m.msg);
        else {
          const c = this.conns.get(m.to);
          if(c) this.send(c, { t: 'peer', from: pid, msg: m.msg });
        }
        break;
      }
      case 'set':
        if(_validBlockMsg(m)){
          getWorld((m.d === 'nether' || m.d === 'end') ? m.d : 'over').setBlock(m.x, m.y, m.z, m.id, true);
          this.broadcast(m, pid);
        }
        break;
      case 'drop':
        if(_validItemId(m.id) && _validNum(m.n, 1, 64) && _validNum(m.x, -1e7, 1e7) && _validNum(m.y, -100, 1000) && _validNum(m.z, -1e7, 1e7)){
          const ench = (m.ench && typeof m.ench.k === 'string' && _validNum(m.ench.l, 1, 3))
            ? { k: String(m.ench.k).slice(0, 8), l: Math.floor(m.ench.l) } : undefined;
          ItemDrops.spawn(m.x, m.y, m.z, m.id, Math.floor(m.n), m.dur, ench);
        }
        break;
      case 'pickup': {
        const d = ItemDrops.list.find(e => e.netId === m.id);
        if(d){
          ItemDrops.group.remove(d.mesh);
          ItemDrops.list.splice(ItemDrops.list.indexOf(d), 1);
          this.send(conn, { t: 'give', id: d.id, n: d.n, dur: d.dur, ench: d.ench });
        }
        break;
      }
      case 'hitmob': {
        const mob = MobManager.list.find(x => x.netId === m.id);
        if(mob) mob.hurt(m.dmg, m.kx, m.kz);
        break;
      }
      case 'reserve': {
        const w = PokeMan.wilds.find(x => x.netId === m.id);
        if(w && !w.catching){
          w.catching = true;
          w.reservedBy = pid;
          this.send(conn, { t: 'wildData', id: w.netId, sp: w.inst.sp, lv: w.inst.level, hp: w.inst.hp });
        } else {
          this.send(conn, { t: 'wildData', id: m.id, fail: true });
        }
        break;
      }
      case 'wildResult': {
        const w = PokeMan.wilds.find(x => x.netId === m.id);
        if(w && w.reservedBy === pid){
          w.reservedBy = null;
          if(m.removed) PokeMan.removeWild(w, !m.caught);
          else { w.catching = false; w.fleeTimer = 3; }
        }
        break;
      }
      case 'spawnWild': {
        if(SPECIES[m.sp] && _validNum(m.lv, 1, 60) && _validNum(m.x, -1e7, 1e7) && _validNum(m.y, 0, WORLD_H) && _validNum(m.z, -1e7, 1e7) && PokeMan.wilds.length < 14){
          PokeMan.wilds.push(new WildPoke(m.sp, Math.floor(m.lv), m.x, m.y, m.z));
          PokeMan.seen.add(m.sp);
        }
        break;
      }
      case 'ignite':
        if(Number.isInteger(m.x) && Number.isInteger(m.y) && Number.isInteger(m.z) && Math.abs(m.x) < 1e7)
          TNTs.spawn(m.x + 0.5, m.y + 0.5, m.z + 0.5, 3);
        break;
      case 'furnace': {
        // 게스트는 슬롯(in/fuel/out)만 보냄 — burn/prog는 호스트 권위 유지
        let f = world.furnaces.get(m.key);
        if(!f){ f = { in:null, fuel:null, out:null, burn:0, burnMax:1, prog:0 }; world.furnaces.set(m.key, f); }
        f.in = m.state.in || null; f.fuel = m.state.fuel || null; f.out = m.state.out || null;
        this.broadcast({ t:'furnace', key: m.key, state: { in: f.in, fuel: f.fuel, out: f.out } }, pid);
        break;
      }
      case 'chest': {
        if(!world.chests.has(m.key)) world.chests.set(m.key, m.state);
        else world.chests.get(m.key).slots = m.state.slots;
        this.broadcast(m, pid);
        break;
      }
      case 'chat': {
        const p = this.players.get(pid);
        const full = (p ? p.name : '?') + ': ' + String(m.msg).slice(0, 80);
        this.broadcast({ t: 'chat', msg: full }, pid); // 보낸 사람 제외 (에코 방지)
        this.chat(full, true);
        break;
      }
    }
  },

  // ---------- 메시지: 게스트 수신 ----------
  onGuestMsg(m){
    if(!game.started || !world || !player) return; // init 처리 전 도착한 메시지 무시
    switch(m.t){
      case 'full':
        UI.toast('😢 방이 가득 찼어요 (최대 ' + (m.max || 20) + '명)');
        try { this.hostConn.close(); } catch(e){}
        break;
      case 'peer': this._onPeer(m.from, m.msg || {}); break;
      case 'set': if(_validBlockMsg(m)) getWorld((m.d === 'nether' || m.d === 'end') ? m.d : 'over').setBlock(m.x, m.y, m.z, m.id, true); break;
      case 'snap': this._applySnap(m); break;
      case 'give': {
        const left = player.addItem(m.id, m.n, m.dur, m.ench);
        SFX.play('pop');
        // 인벤토리가 가득하면 잉여분을 다시 드롭 (소실 방지)
        if(left > 0) this.sendSpawnDrop(player.body.x, player.body.y + 1, player.body.z, m.id, left, m.dur);
        break;
      }
      case 'hurt': player.hurt(m.dmg, m.kx, m.kz); break;
      case 'time': game.time = m.v; break;
      case 'boom': {
        SFX.play('boom');
        Particles.spawn(m.x, m.y, m.z, 0xffa030, 40, 9, 0.9, 2);
        Particles.spawn(m.x, m.y, m.z, 0x777777, 40, 7, 1.4, 3);
        const d = dist3(m.x, m.y, m.z, player.body.x, player.body.y, player.body.z);
        if(d < 30) game.shake = 0.5;
        break;
      }
      case 'wildData': this._pendingWild.set(m.id, m); break;
      case 'furnace': {
        let f = world.furnaces.get(m.key);
        if(!f){ f = { in:null, fuel:null, out:null, burn:0, burnMax:1, prog:0 }; world.furnaces.set(m.key, f); }
        f.in = m.state.in || null; f.fuel = m.state.fuel || null; f.out = m.state.out || null;
        break;
      }
      case 'chest': {
        if(!Array.isArray(m.state.slots)) break;
        if(!world.chests.has(m.key)) world.chests.set(m.key, { slots: m.state.slots.slice(0, 27) });
        else world.chests.get(m.key).slots = m.state.slots.slice(0, 27);
        break;
      }
      case 'furnstates': {
        for(const k in m.states){
          if(!world.furnaces.has(k)) world.furnaces.set(k, m.states[k]);
          else Object.assign(world.furnaces.get(k), m.states[k]);
        }
        break;
      }
      case 'chat': this.chat(m.msg, true); break;
    }
  },

  // ---------- 게임 코드에서 호출하는 훅 ----------
  blockChanged(x, y, z, id, dim){
    const msg = { t: 'set', x, y, z, id, d: dim || game.dim };
    if(this.mode === 'host') this.broadcast(msg);
    else if(this.mode === 'guest') this.toHost(msg);
  },
  sendSpawnDrop(x, y, z, id, n, dur, ench){ this.toHost({ t: 'drop', x, y, z, id, n, dur, ench }); },
  sendSpawnWild(sp, lv, x, y, z){ this.toHost({ t: 'spawnWild', sp, lv, x, y, z }); },
  sendIgnite(x, y, z){ this.toHost({ t: 'ignite', x, y, z }); },
  containerChanged(kind, key){
    const full = kind === 'furnace' ? world.furnaces.get(key) : world.chests.get(key);
    if(!full) return;
    // 화로는 슬롯만 전송 (burn/prog는 호스트 시뮬레이션 권위)
    const state = kind === 'furnace' ? { in: full.in, fuel: full.fuel, out: full.out } : full;
    const msg = { t: kind, key, state };
    if(this.mode === 'host') this.broadcast(msg);
    else this.toHost(msg);
  },
  wildBattleEnd(netId, removed){
    this.toHost({ t: 'wildResult', id: netId, removed, caught: removed });
  },
  // 호스트: 몹 AI가 노릴 가장 가까운 플레이어 (호스트 본인 포함)
  nearestTarget(x, y, z){
    let best = {
      x: player.body.x, y: player.body.y, z: player.body.z, dead: player.dead,
      hurt: (dmg, kx, kz) => player.hurt(dmg, kx, kz)
    };
    // 호스트가 배틀 중이면 몹이 호스트를 노리지 않음
    let bd = (player.dead || game.inBattle) ? Infinity : dist3(x, y, z, best.x, best.y, best.z);
    for(const [id, p] of this.players){
      if((p.dm || 'over') !== game.dim) continue; // 다른 차원은 제외
      const d = dist3(x, y, z, p.x, p.y, p.z);
      if(d < bd){
        bd = d;
        const conn = this.conns.get(id);
        best = { x: p.x, y: p.y, z: p.z, dead: false,
                 hurt: (dmg, kx, kz) => this.send(conn, { t: 'hurt', dmg, kx, kz }) };
      }
    }
    return best;
  },
  arrowHitRemote(e){
    for(const [id, p] of this.players){
      if(dist3(e.x, e.y, e.z, p.x, p.y + 0.9, p.z) < 0.8){
        this.send(this.conns.get(id), { t: 'hurt', dmg: e.dmg, kx: e.vx * 0.05, kz: e.vz * 0.05 });
        return true;
      }
    }
    return false;
  },
  arrowHitPuppet(x, y, z, dmg, kx, kz){
    for(const [id, p] of this.pMobs){
      if(dist3(x, y, z, p.x, p.y + 0.6, p.z) < 1.0){
        this.toHost({ t: 'hitmob', id, dmg, kx, kz });
        return true;
      }
    }
    return false;
  },
  explosion(x, y, z, hurtR){
    this.broadcast({ t: 'boom', x, y, z, r: hurtR });
    for(const [id, p] of this.players){
      const d = dist3(x, y, z, p.x, p.y + 0.9, p.z);
      if(d < hurtR) this.send(this.conns.get(id), { t: 'hurt', dmg: Math.ceil((1 - d / hurtR) * 15), kx: (p.x - x) * 0.4, kz: (p.z - z) * 0.4 });
    }
  },
  // 게스트: 근접 야생 퍼펫과 배틀/포획 (R키·포켓볼)
  async engageWild(puppet, ballId){
    if(puppet.reserved) return;
    puppet.reserved = true;
    this._pendingWild.delete(puppet.netId);
    this.toHost({ t: 'reserve', id: puppet.netId });
    let data = null;
    for(let i = 0; i < 40; i++){
      if(this._pendingWild.has(puppet.netId)){
        data = this._pendingWild.get(puppet.netId);
        this._pendingWild.delete(puppet.netId);
        break;
      }
      await sleep(100);
    }
    if(!data || data.fail){
      puppet.reserved = false;
      if(!data){
        // 타임아웃 — 호스트가 예약했을 수 있으므로 해제 통보
        this.wildBattleEnd(puppet.netId, false);
        UI.toast('연결이 느려요 — 다시 시도해보세요');
      } else {
        UI.toast('다른 사람이 먼저 잡고 있어요!');
      }
      return;
    }
    const inst = new PokeInst(data.sp, data.lv);
    inst.hp = clamp(data.hp, 1, inst.maxHp);
    const pseudo = { inst, isNet: true, netId: puppet.netId, catching: false,
                     body: { x: puppet.x, y: puppet.y, z: puppet.z, h: 1 } };
    if(ballId){
      // 필드 포획 (배틀 없이)
      const success = Math.random() < catchChance(inst, ballBonus(ballId));
      const shakes = success ? 3 : 1 + Math.floor(Math.random() * 2);
      for(let i = 0; i < shakes; i++){ SFX.play('catch'); await sleep(550); }
      if(success){
        SFX.play('caught');
        const where = PokeMan.addCaught(inst);
        UI.toast('신난다! ' + inst.name + '를(을) 잡았다!' + (where === 'box' ? ' (보관함)' : ''));
        this.wildBattleEnd(puppet.netId, true);
      } else {
        SFX.play('fail');
        UI.toast('앗! ' + inst.name + '이(가) 나와버렸다!');
        this.wildBattleEnd(puppet.netId, false);
      }
      puppet.reserved = false;
    } else {
      const ok = await Battle.start(pseudo); // 종료 시 Battle.end → wildBattleEnd 호출
      if(ok === false) this.wildBattleEnd(puppet.netId, false); // 배틀 시작 거부 시 예약 해제
      puppet.reserved = false;
    }
  },

  // ---------- 주기 처리 (메인 루프에서 호출) ----------
  tick(dt){
    if(this.mode === 'off') return;
    // 원격 플레이어 모델 보간 (첫 스냅 좌표 수신 전에는 스킵 — 모델은 lazy 생성)
    for(const [, p] of this.players){
      if(p.tx === undefined) continue;
      this._lerpPlayer(p, dt);
    }
    this._sendAcc += dt;
    if(this.mode === 'guest'){
      if(this._sendAcc >= 0.1){
        this._sendAcc = 0;
        this.toHost({ t: 'pos', x: player.body.x, y: player.body.y, z: player.body.z,
                      yaw: player.yaw, fol: (game.followerOn && PokeMan.party.length) ? PokeMan.party[0].sp : 0,
                      rid: game.riding ? 1 : 0, arm: player.armor.map(a => a ? a.id : 0), dm: game.dim });
      }
      this._lerpPuppets(dt);
      this._tryPickup();
      return;
    }
    // ----- 호스트 -----
    if(this._sendAcc >= 0.1){
      this._sendAcc = 0;
      const snap = {
        t: 'snap', dim: game.dim,
        players: [
          { id: 'host', name: this.myName, x: player.body.x, y: player.body.y, z: player.body.z,
            yaw: player.yaw, fol: (game.followerOn && PokeMan.party.length) ? PokeMan.party[0].sp : 0,
            rid: game.riding ? 1 : 0, arm: player.armor.map(a => a ? a.id : 0), dm: game.dim },
          ...[...this.players.entries()].map(([id, p]) => ({ id, name: p.name, x: p.x, y: p.y, z: p.z, yaw: p.yaw, fol: p.fol, rid: p.rid, arm: p.arm, dm: p.dm }))
        ],
        mobs: MobManager.list.map(m => ({ id: m.netId, type: m.type, x: m.body.x, y: m.body.y, z: m.body.z, dir: m.dir })),
        wilds: PokeMan.wilds.map(w => ({ id: w.netId, sp: w.inst.sp, lv: w.inst.level, hp: w.inst.hp, sh: w.inst.shiny ? 1 : 0,
                                          fn: w.fainted ? 1 : 0,
                                          x: w.body.x, y: w.body.y, z: w.body.z, dir: w.dir, frozen: !!w.catching })),
        drops: ItemDrops.list.filter(d => (d.dim || 'over') === game.dim).map(d => ({ id: d.netId, item: d.id, n: d.n, x: d.x, y: d.y, z: d.z })),
        tnts: TNTs.list.map(e => ({ x: e.x, y: e.y, z: e.z })),
      };
      // 각 게스트에게 그 게스트 자신은 제외하고 전송
      for(const [id, c] of this.conns){
        this.send(c, { ...snap, players: snap.players.filter(pp => pp.id !== id) });
      }
      // 호스트 화면에 게스트 모델 갱신용 타깃 저장
      for(const [id, p] of this.players){ p.tx = p.x; p.ty = p.y; p.tz = p.z; p.tyaw = p.yaw; }
    }
    this._timeAcc += dt;
    if(this._timeAcc >= 5){ this._timeAcc = 0; this.broadcast({ t: 'time', v: game.time }); }
    this._furnAcc += dt;
    if(this._furnAcc >= 1){
      this._furnAcc = 0;
      if(world.furnaces.size){
        const states = {};
        for(const [k, f] of world.furnaces) states[k] = f;
        this.broadcast({ t: 'furnstates', states });
      }
    }
  },

  // ---------- 원격 플레이어 모델 ----------
  _makePlayerModel(name){
    const m = buildBiped({ body: '#3aa8a0', headC: '#e0b08a', legC: '#3a4f8f', armC: '#3aa8a0', legH: 0.75, bh: 0.7 });
    const tag = makeNameTag(name);
    tag.position.y = 2.3;
    m.group.add(tag);
    scene.add(m.group);
    return { group: m.group, legs: m.legs, arms: m.arms, walkPhase: 0, folEnt: null, folSp: 0 };
  },
  _lerpPlayer(p, dt){
    if(!p.model) p.model = this._makePlayerModel(p.name);
    const g = p.model.group;
    const sameDim = (p.dm || 'over') === game.dim;
    g.visible = sameDim;
    if(p.model.folEnt) p.model.folEnt.root.visible = sameDim;
    if(!sameDim) return;
    const tx = p.tx !== undefined ? p.tx : p.x, ty = p.ty !== undefined ? p.ty : p.y, tz = p.tz !== undefined ? p.tz : p.z;
    const k = Math.min(1, dt * 12);
    const dx = tx - g.position.x, dz = tz - g.position.z;
    g.position.x += dx * k; g.position.y += (ty - g.position.y) * k; g.position.z += dz * k;
    const tyaw = (p.tyaw !== undefined ? p.tyaw : p.yaw) || 0;
    g.rotation.y = tyaw + Math.PI; // 모델은 +Z를 봄, yaw는 카메라 기준
    const sp = Math.hypot(dx, dz) / Math.max(dt, 0.01);
    p.model.walkPhase += Math.min(sp, 6) * dt * 4;
    const sw = Math.sin(p.model.walkPhase) * Math.min(1, sp) * 0.6;
    p.model.legs.forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? sw : -sw); });
    (p.model.arms || []).forEach((a, i) => { a.rotation.x = (i % 2 === 0 ? -sw : sw) * 0.7; });
    // 파트너 포켓몬
    if(p.fol !== p.model.folSp){
      if(p.model.folEnt){ scene.remove(p.model.folEnt.root); disposeObject(p.model.folEnt.root); p.model.folEnt = null; }
      if(p.fol && SPECIES[p.fol]){
        p.model.folEnt = buildPokeModel(p.fol);
        scene.add(p.model.folEnt.root);
      }
      p.model.folSp = p.fol;
    }
    if(p.model.folEnt){
      const f = p.model.folEnt.root;
      if(p.rid){
        f.position.set(g.position.x, g.position.y - 0.35, g.position.z);
      } else {
        f.position.set(g.position.x - Math.sin(tyaw) * -1.3, g.position.y, g.position.z - Math.cos(tyaw) * -1.3);
      }
      f.rotation.y = tyaw + Math.PI;
    }
    // 갑옷 표시 (변경 시에만 갱신)
    const armKey = (p.arm || []).join(',');
    if(p.model._armKey !== armKey){
      p.model._armKey = armKey;
      applyArmorOverlay(p.model, p.arm);
    }
  },

  // ---------- 게스트 퍼펫 ----------
  _applySnap(m){
    this.hostDim = m.dim || 'over';
    const dimMatch = this.hostDim === game.dim;
    [this.pMobs, this.pWilds, this.pDrops].forEach(map => {
      for(const [, pp] of map) pp.group.visible = dimMatch;
    });
    if(!dimMatch){
      // 플레이어 위치만 갱신하고 퍼펫은 패스
      m.players.forEach(pp => {
        let p = this.players.get(pp.id);
        if(!p){ p = { name: pp.name }; this.players.set(pp.id, p); }
        p.tx = pp.x; p.ty = pp.y; p.tz = pp.z; p.tyaw = pp.yaw; p.fol = pp.fol;
        p.rid = pp.rid; p.arm = pp.arm; p.dm = pp.dm;
        p.x = pp.x; p.y = pp.y; p.z = pp.z;
      });
      return;
    }
    // 플레이어
    const seen = new Set();
    m.players.forEach(pp => {
      seen.add(pp.id);
      let p = this.players.get(pp.id);
      if(!p){ p = { name: pp.name }; this.players.set(pp.id, p); }
      p.tx = pp.x; p.ty = pp.y; p.tz = pp.z; p.tyaw = pp.yaw; p.fol = pp.fol;
      p.rid = pp.rid; p.arm = pp.arm; p.dm = pp.dm;
      p.x = pp.x; p.y = pp.y; p.z = pp.z;
    });
    for(const [id, p] of this.players){
      if(!seen.has(id)){
        if(p.model){ scene.remove(p.model.group); disposeObject(p.model.group); if(p.model.folEnt){ scene.remove(p.model.folEnt.root); disposeObject(p.model.folEnt.root); } }
        this.players.delete(id);
      }
    }
    this._syncPuppets(this.pMobs, m.mobs, d => {
      const built = MOB_DEFS[d.type].model();
      scene.add(built.group);
      return { built, group: built.group, walkPhase: 0 };
    });
    this._syncPuppets(this.pWilds, m.wilds, d => {
      const built = buildPokeModel(d.sp, !!d.sh);
      const tag = makeNameTag((d.sh ? '✨' : '') + SPECIES[d.sp].name + ' Lv.' + d.lv);
      tag.position.y = clamp(1.1 * (SPECIES[d.sp].model.s || 1), 0.45, 1.8) + 0.45;
      built.root.add(tag);
      scene.add(built.root);
      return { built, group: built.root, walkPhase: 0 };
    });
    this._syncPuppets(this.pDrops, m.drops, d => {
      let mesh;
      if(isBlockId(d.item) && BLOCKS[d.item].rt !== RT.CROSS) mesh = new THREE.Mesh(ItemDrops.geom(d.item), world.matSolid);
      else { mesh = new THREE.Sprite(iconSpriteMaterial(d.item)); mesh.scale.set(0.45, 0.45, 0.45); }
      scene.add(mesh);
      return { group: mesh, isDrop: true };
    });
    // TNT는 단순 표시
    this.pTnts.forEach(t => { scene.remove(t); disposeObject(t); });
    this.pTnts = (m.tnts || []).map(d => {
      const mesh = new THREE.Mesh(makeBlockGeometry(B.TNT, 0.96), world.matSolid);
      mesh.position.set(d.x, d.y, d.z);
      scene.add(mesh);
      return mesh;
    });
  },
  _syncPuppets(map, list, factory){
    const seen = new Set();
    (list || []).forEach(d => {
      seen.add(d.id);
      let p = map.get(d.id);
      if(!p){
        p = Object.assign({ netId: d.id }, factory(d));
        p.x = d.x; p.y = d.y; p.z = d.z;
        map.set(d.id, p);
      }
      Object.assign(p, { tx: d.x, ty: d.y, tz: d.z, tdir: d.dir || 0, data: d });
    });
    for(const [id, p] of map){
      if(!seen.has(id)){
        scene.remove(p.group);
        disposeObject(p.group);
        map.delete(id);
      }
    }
  },
  _lerpPuppets(dt){
    const k = Math.min(1, dt * 10);
    const move = (p, anim) => {
      const dx = (p.tx - p.x), dz = (p.tz - p.z);
      p.x += dx * k; p.y += (p.ty - p.y) * k; p.z += dz * k;
      p.group.position.set(p.x, p.y + (p.isDrop ? 0.2 : 0), p.z);
      if(p.tdir !== undefined && !p.isDrop) p.group.rotation.y = p.tdir;
      if(p.data) p.group.rotation.x = p.data.fn ? Math.PI / 2 : 0;
      if(anim && p.built){
        const sp = Math.hypot(dx, dz) / Math.max(dt, 0.01);
        p.walkPhase += Math.min(sp, 5) * dt * 4;
        const sw = Math.sin(p.walkPhase) * Math.min(1, sp) * 0.6;
        (p.built.legs || []).forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? sw : -sw); });
      }
      if(p.isDrop) p.group.rotation.y = (p.group.rotation.y || 0) + dt * 2;
    };
    for(const [, p] of this.pMobs) move(p, true);
    for(const [, p] of this.pWilds) move(p, true);
    for(const [, p] of this.pDrops) move(p, false);
  },
  _tryPickup(){
    for(const [id, p] of this.pDrops){
      if(this._pickupReq.has(id)) continue;
      if(dist3(p.x, p.y, p.z, player.body.x, player.body.y + 0.9, player.body.z) < 1.4){
        this._pickupReq.add(id);
        this.toHost({ t: 'pickup', id });
        setTimeout(() => this._pickupReq.delete(id), 2000);
      }
    }
  },
  // 게스트 근접 공격 → 퍼펫 몹
  guestMeleeHit(ox, oy, oz, dx, dy, dz, maxDist, dmg){
    let best = null, bestT = maxDist;
    for(const [id, p] of this.pMobs){
      const cx = p.x, cy = p.y + 0.8, cz = p.z;
      const px = cx - ox, py = cy - oy, pz = cz - oz;
      const t = px*dx + py*dy + pz*dz;
      if(t < 0 || t > bestT) continue;
      const qx = ox + dx*t - cx, qy = oy + dy*t - cy, qz = oz + dz*t - cz;
      if(qx*qx + qy*qy + qz*qz < 1.0){ best = id; bestT = t; }
    }
    if(best !== null){
      this.toHost({ t: 'hitmob', id: best, dmg, kx: dx * 0.6, kz: dz * 0.6 });
      return true;
    }
    return false;
  },
  // 게스트: R키 배틀 대상 퍼펫 찾기
  nearestWildPuppet(maxD){
    let best = null, bd = maxD;
    for(const [, p] of this.pWilds){
      if(p.reserved || (p.data && p.data.frozen)) continue;
      const d = dist3(p.x, p.y, p.z, player.body.x, player.body.y, player.body.z);
      if(d < bd){ bd = d; best = p; }
    }
    return best;
  },

  // ---------- 채팅 ----------
  chat(msg, noRelay){
    if(this.mode === 'host' && !noRelay) this.broadcast({ t: 'chat', msg });
    const box = document.getElementById('chat-box');
    if(!box) return;
    const d = document.createElement('div');
    d.textContent = msg;
    box.appendChild(d);
    while(box.children.length > 7) box.removeChild(box.firstChild);
    setTimeout(() => { d.remove(); }, 10000);
  },
  sendChat(msg){
    if(!msg.trim()) return;
    if(this.mode === 'host') this.chat(this.myName + ': ' + msg.trim());
    else if(this.mode === 'guest'){ this.toHost({ t: 'chat', msg: msg.trim() }); this.chat(this.myName + ': ' + msg.trim(), true); }
  },
  playerCount(){
    return this.mode === 'off' ? 1 : this.players.size + 1;
  },
  // ---------- 플레이어 간 1:1 메시지 (대전/교환) ----------
  sendTo(to, msg){
    if(this.mode === 'host'){
      const c = this.conns.get(to);
      if(c) this.send(c, { t: 'peer', from: 'host', msg });
    } else if(this.mode === 'guest'){
      this.toHost({ t: 'relay', to, msg });
    }
  },
  _onPeer(from, msg){
    if(!msg || typeof msg.t !== 'string') return;
    if(msg.t.startsWith('pvp')) Battle.onPvpMsg(from, msg);
    else if(msg.t.startsWith('trade')) TradeMan.onMsg(from, msg);
  },
  // 같은 차원의 가장 가까운 플레이어 id
  nearestPlayerId(maxD){
    let best = null, bd = maxD || 6;
    for(const [id, p] of this.players){
      if(p.x === undefined) continue;
      if((p.dm || 'over') !== game.dim) continue;
      const d = Math.hypot(p.x - player.body.x, p.z - player.body.z);
      if(d < bd){ bd = d; best = id; }
    }
    return best;
  }
};
