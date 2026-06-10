// ===== mobs.js : 몹 모델 빌더, AI, 스폰 =====
'use strict';

// ---------- 복셀 모델 헬퍼 (포켓몬도 같이 사용) ----------
function makeBox(parent, w, h, d, color, x, y, z){
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function makePivot(parent, x, y, z){
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
// 다리: pivot(엉덩이 위치) + 아래로 뻗는 박스
function makeLeg(parent, w, len, color, x, y, z){
  const p = makePivot(parent, x, y, z);
  makeBox(p, w, len, w, color, 0, -len / 2, 0);
  return p;
}
// 머리 앞면(+Z)에 눈 두 개
function addEyes(head, hw, hd, color, pupil){
  const e = 0.06;
  makeBox(head, e*1.4, e*1.4, 0.02, color || '#1a1a1a', -hw*0.25, 0.05, hd/2 + 0.011);
  makeBox(head, e*1.4, e*1.4, 0.02, color || '#1a1a1a',  hw*0.25, 0.05, hd/2 + 0.011);
  if(pupil){
    makeBox(head, e*0.7, e*0.7, 0.02, pupil, -hw*0.25, 0.05, hd/2 + 0.02);
    makeBox(head, e*0.7, e*0.7, 0.02, pupil,  hw*0.25, 0.05, hd/2 + 0.02);
  }
}

// 네발짐승: 몸통+머리+다리4 (모델은 +Z 방향을 봄)
function buildQuad(o){
  const g = new THREE.Group();
  const legH = o.legH !== undefined ? o.legH : 0.32;
  const bw = o.bw || 0.62, bh = o.bh || 0.5, bd = o.bd || 0.95;
  const legW = o.legW || 0.16;
  const body = makeBox(g, bw, bh, bd, o.body, 0, legH + bh/2, 0);
  const hs = o.hs || 0.45;
  const head = makeBox(g, hs, hs, hs, o.headC || o.body, 0, legH + bh + hs*0.25 - 0.1, bd/2 + hs/2 - 0.08);
  addEyes(head, hs, hs);
  if(o.snout) makeBox(head, hs*0.5, hs*0.35, 0.06, o.snout, 0, -hs*0.18, hs/2 + 0.03);
  if(o.ears){
    makeBox(head, 0.1, 0.14, 0.05, o.ears, -hs*0.33, hs/2 + 0.05, 0);
    makeBox(head, 0.1, 0.14, 0.05, o.ears,  hs*0.33, hs/2 + 0.05, 0);
  }
  const lx = bw/2 - legW/2, lz = bd/2 - legW/2 - 0.04;
  const legC = o.legC || o.body;
  const legs = [
    makeLeg(g, legW, legH, legC, -lx, legH,  lz),
    makeLeg(g, legW, legH, legC,  lx, legH,  lz),
    makeLeg(g, legW, legH, legC, -lx, legH, -lz),
    makeLeg(g, legW, legH, legC,  lx, legH, -lz),
  ];
  return { group: g, legs, head, body };
}

// 이족보행: 다리2 + 몸통 + 머리 (+팔2)
function buildBiped(o){
  const g = new THREE.Group();
  const legH = o.legH !== undefined ? o.legH : 0.7;
  const bw = o.bw || 0.5, bh = o.bh || 0.65, bd = o.bd || 0.28;
  const legW = o.legW || 0.18;
  const body = makeBox(g, bw, bh, bd, o.body, 0, legH + bh/2, 0);
  const hs = o.hs || 0.5;
  const head = makeBox(g, hs, hs, hs, o.headC || o.body, 0, legH + bh + hs/2, 0);
  if(o.eyes !== false) addEyes(head, hs, hs, o.eyeC, o.pupilC);
  const legC = o.legC || o.body;
  const legs = [
    makeLeg(g, legW, legH, legC, -bw/4 - 0.02, legH, 0),
    makeLeg(g, legW, legH, legC,  bw/4 + 0.02, legH, 0),
  ];
  const arms = [];
  if(o.arms !== false){
    const armC = o.armC || o.headC || o.body;
    const aw = o.armW || 0.14, al = o.armL || bh * 0.9;
    arms.push(makeLeg(g, aw, al, armC, -bw/2 - aw/2, legH + bh - 0.05, 0));
    arms.push(makeLeg(g, aw, al, armC,  bw/2 + aw/2, legH + bh - 0.05, 0));
    if(o.zombieArms){ arms.forEach(a => a.rotation.x = -Math.PI / 2); }
  }
  return { group: g, legs, head, body, arms: o.zombieArms ? [] : arms };
}

// 새: 작은 몸통 + 날개 + 부리
function buildBird(o){
  const g = new THREE.Group();
  const legH = o.legH !== undefined ? o.legH : 0.18;
  const bw = o.bw || 0.4, bh = o.bh || 0.38, bd = o.bd || 0.5;
  const body = makeBox(g, bw, bh, bd, o.body, 0, legH + bh/2, 0);
  const hs = o.hs || 0.3;
  const head = makeBox(g, hs, hs, hs, o.headC || o.body, 0, legH + bh + hs/2 - 0.05, bd/2 - 0.05);
  addEyes(head, hs, hs);
  makeBox(head, 0.12, 0.08, 0.12, o.beak || '#e8a33d', 0, -0.02, hs/2 + 0.06);
  const wings = [
    makeBox(g, 0.06, bh*0.7, bd*0.8, o.wingC || o.body, -bw/2 - 0.03, legH + bh/2 + 0.05, 0),
    makeBox(g, 0.06, bh*0.7, bd*0.8, o.wingC || o.body,  bw/2 + 0.03, legH + bh/2 + 0.05, 0),
  ];
  const legs = [
    makeLeg(g, 0.06, legH, o.legC || '#e8a33d', -bw/4, legH, 0),
    makeLeg(g, 0.06, legH, o.legC || '#e8a33d',  bw/4, legH, 0),
  ];
  return { group: g, legs, head, body, wings };
}

// ---------- 몹 정의 ----------
const MOB_DEFS = {
  pig: { name:'돼지', hp:10, speed:1.2, w:0.42, h:0.85, drops:[[I.PORK_RAW,1,2]],
    model:()=> buildQuad({ body:'#f0a3a3', snout:'#e58c8c', legC:'#e89292' }) },
  cow: { name:'소', hp:10, speed:1.1, w:0.45, h:1.25, drops:[[I.BEEF_RAW,1,2]],
    model:()=> { const m = buildQuad({ body:'#5d4231', bh:0.65, bd:1.1, legH:0.45, hs:0.5, snout:'#d8c8b8', legC:'#4d3829' });
      makeBox(m.head, 0.08, 0.1, 0.08, '#d8d8d8', -0.28, 0.22, 0); makeBox(m.head, 0.08, 0.1, 0.08, '#d8d8d8', 0.28, 0.22, 0);
      makeBox(m.body, 0.64, 0.2, 0.3, '#e8e8e8', 0, -0.25, 0.2); return m; } },
  sheep: { name:'양', hp:8, speed:1.0, w:0.42, h:1.1, drops:[[B.WOOL,1,2]],
    model:()=> buildQuad({ body:'#e8e8e8', bh:0.6, legH:0.4, hs:0.4, headC:'#d8c8a8', legC:'#d8d8d8' }) },
  chicken: { name:'닭', hp:4, speed:1.0, w:0.25, h:0.65, drops:[[I.FEATHER,1,2]],
    model:()=> buildBird({ body:'#f0f0f0', wingC:'#e0e0e0' }) },
  zombie: { name:'좀비', hp:20, speed:1.7, w:0.3, h:1.8, hostile:true, dmg:3, burns:true, drops:[[I.ROTTEN,1,2]],
    model:()=> buildBiped({ body:'#3a7d74', headC:'#5da35d', legC:'#3a4f8f', armC:'#5da35d', legH:0.75, bh:0.7, zombieArms:true }) },
  skeleton: { name:'스켈레톤', hp:20, speed:1.6, w:0.3, h:1.8, hostile:true, dmg:3, ranged:true, burns:true, drops:[[I.BONE,1,2]],
    model:()=> buildBiped({ body:'#cfcfcf', headC:'#dfdfdf', legC:'#cfcfcf', legW:0.12, bw:0.4, armW:0.1, legH:0.8, bh:0.65 }) },
  creeper: { name:'크리퍼', hp:20, speed:1.8, w:0.3, h:1.6, hostile:true, creeper:true, drops:[[I.GUNPOWDER,1,2]],
    model:()=> { const m = buildBiped({ body:'#52a044', headC:'#5cb050', legC:'#478a3a', arms:false, legH:0.35, bh:0.85, bw:0.42, eyes:false });
      // 크리퍼 얼굴
      const hs = 0.5;
      makeBox(m.head, 0.12, 0.12, 0.02, '#111', -0.12, 0.08, hs/2 + 0.011);
      makeBox(m.head, 0.12, 0.12, 0.02, '#111',  0.12, 0.08, hs/2 + 0.011);
      makeBox(m.head, 0.12, 0.16, 0.02, '#111', 0, -0.1, hs/2 + 0.011);
      makeBox(m.head, 0.06, 0.1, 0.02, '#111', -0.08, -0.14, hs/2 + 0.012);
      makeBox(m.head, 0.06, 0.1, 0.02, '#111',  0.08, -0.14, hs/2 + 0.012);
      return m; } },
};

// ---------- 몹 ----------
let _mobIdCounter = 0;
class Mob {
  constructor(type, x, y, z){
    this.netId = ++_mobIdCounter;
    this.type = type;
    this.def = MOB_DEFS[type];
    this.body = new PhysBody(x, y, z, this.def.w, this.def.h);
    const built = this.def.model();
    this.group = built.group;
    this.legs = built.legs || [];
    this.armParts = built.arms || [];
    this.wings = built.wings || [];
    scene.add(this.group);
    this.hp = this.def.hp;
    this.dir = Math.random() * Math.PI * 2;
    this.moveTimer = 0; this.moving = false;
    this.attackCd = 0; this.fuse = -1; this.burnAcc = 0;
    this.hurtFlash = 0; this.walkPhase = 0;
    this.dead = false;
  }
  update(dt, world, player){
    if(this.dead) return;
    const b = this.body, def = this.def;
    // 공격 대상: 싱글은 플레이어, 멀티 호스트는 가장 가까운 플레이어(게스트 포함)
    let tgt = { x: player.body.x, y: player.body.y, z: player.body.z, dead: player.dead,
                hurt: (dmg, kx, kz) => player.hurt(dmg, kx, kz) };
    if(typeof Net !== 'undefined' && Net.mode === 'host'){
      const nt = Net.nearestTarget(b.x, b.y, b.z);
      if(nt) tgt = nt;
    }
    const dToP = dist3(b.x, b.y, b.z, tgt.x, tgt.y, tgt.z);
    let speed = 0;

    if(def.hostile && !tgt.dead && dToP < 16){
      this.dir = Math.atan2(tgt.x - b.x, tgt.z - b.z);
      if(def.creeper){
        if(dToP < 3){
          if(this.fuse < 0){ this.fuse = 1.5; SFX.play('fuse'); }
          this.fuse -= dt;
          if(this.fuse <= 0){
            this.die(false);
            explode(world, b.x, b.y + 0.6, b.z, 3, false);
            return;
          }
        } else {
          this.fuse = -1; this.setTint(null);
          speed = def.speed;
        }
      } else if(def.ranged){
        speed = dToP > 9 ? def.speed : (dToP < 5 ? -def.speed * 0.6 : 0);
        this.attackCd -= dt;
        if(dToP < 13 && this.attackCd <= 0){
          this.attackCd = 2;
          const dx = tgt.x - b.x, dy = (tgt.y + 1.1) - (b.y + 1.4), dz = tgt.z - b.z;
          const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
          Projectiles.shootArrow(b.x, b.y + 1.4, b.z, dx/len, dy/len + 0.05, dz/len);
        }
      } else {
        speed = def.speed;
        this.attackCd -= dt;
        if(dToP < 1.7 && this.attackCd <= 0){
          this.attackCd = 1;
          tgt.hurt(def.dmg, (tgt.x - b.x) * 0.5, (tgt.z - b.z) * 0.5);
        }
      }
    } else {
      this.moveTimer -= dt;
      if(this.moveTimer <= 0){
        this.moveTimer = 2 + Math.random() * 4;
        this.moving = Math.random() < 0.6;
        this.dir = Math.random() * Math.PI * 2;
      }
      speed = this.moving ? def.speed * 0.5 : 0;
    }

    const tvx = Math.sin(this.dir) * speed, tvz = Math.cos(this.dir) * speed;
    b.vx = lerp(b.vx, tvx, Math.min(1, dt * 8));
    b.vz = lerp(b.vz, tvz, Math.min(1, dt * 8));
    if(b.hitWall && b.onGround && speed > 0) b.vy = 7.5;
    if(b.inWater) b.vy = Math.max(b.vy, 1.5);
    b.update(dt, world);

    // 햇빛에 불타는 몹
    if(def.burns && game.isDay() && world.colTop(b.x, b.z) <= b.y + 1){
      this.burnAcc += dt;
      if(this.burnAcc > 1){
        this.burnAcc = 0;
        this.hurt(2, 0, 0);
        Particles.spawn(b.x, b.y + 1.2, b.z, 0xff7700, 6, 1.5, 0.5, 1.5);
      }
    }

    // 애니메이션
    const sp = Math.hypot(b.vx, b.vz);
    this.walkPhase += sp * dt * 4;
    const sw = Math.sin(this.walkPhase) * Math.min(1, sp) * 0.7;
    this.legs.forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? sw : -sw); });
    this.armParts.forEach((a, i) => { a.rotation.x = (i % 2 === 0 ? -sw : sw) * 0.7; });
    this.wings.forEach((w, i) => { w.rotation.z = (i === 0 ? 1 : -1) * (b.onGround ? 0 : Math.sin(performance.now() * 0.02) * 0.7); });
    this.group.position.set(b.x, b.y, b.z);
    this.group.rotation.y = this.dir;

    if(this.hurtFlash > 0){
      this.hurtFlash -= dt;
      if(this.hurtFlash <= 0 && this.fuse < 0) this.setTint(null);
    }
    if(this.fuse > 0){
      this.setTint(Math.floor(this.fuse * 6) % 2 === 0 ? 0x666666 : null);
    }
  }
  setTint(c){
    this.group.traverse(m => {
      if(m.isMesh && m.material && m.material.emissive) m.material.emissive.setHex(c === null ? 0 : c);
    });
  }
  hurt(dmg, kx, kz){
    if(this.dead) return;
    this.hp -= dmg;
    this.hurtFlash = 0.25;
    this.setTint(0xaa0000);
    this.body.vx += (kx || 0) * 6;
    this.body.vz += (kz || 0) * 6;
    this.body.vy = 4.5;
    SFX.play('hit');
    if(this.hp <= 0) this.die(true);
  }
  die(withDrops){
    if(this.dead) return;
    this.dead = true;
    if(withDrops && this.def.drops){
      this.def.drops.forEach(([id, lo, hi]) => {
        const n = lo + Math.floor(Math.random() * (hi - lo + 1));
        if(n > 0) ItemDrops.spawn(this.body.x, this.body.y + 0.5, this.body.z, id, n);
      });
    }
    Particles.spawn(this.body.x, this.body.y + 0.6, this.body.z, 0xdddddd, 12, 2, 0.5, 1);
    scene.remove(this.group);
    disposeObject(this.group);
    const i = MobManager.list.indexOf(this);
    if(i >= 0) MobManager.list.splice(i, 1);
  }
}

// ---------- 몹 매니저 ----------
const MobManager = {
  list: [],
  passiveTimer: 2, hostileTimer: 5,
  reset(){
    this.list.slice().forEach(m => { m.dead = true; scene.remove(m.group); disposeObject(m.group); });
    this.list = [];
  },
  count(hostile){ return this.list.filter(m => !!m.def.hostile === hostile).length; },
  update(dt, world, player){
    for(const m of this.list.slice()) m.update(dt, world, player);
    // 너무 먼 몹 디스폰
    for(const m of this.list.slice()){
      if(dist3(m.body.x, m.body.y, m.body.z, player.body.x, player.body.y, player.body.z) > 90){
        m.dead = true;
        scene.remove(m.group);
        disposeObject(m.group);
        const i = this.list.indexOf(m);
        if(i >= 0) this.list.splice(i, 1);
      }
    }
    this.passiveTimer -= dt;
    if(this.passiveTimer <= 0){
      this.passiveTimer = 5;
      if(this.count(false) < 10) this.trySpawn(false, world, player);
    }
    this.hostileTimer -= dt;
    if(this.hostileTimer <= 0){
      this.hostileTimer = 3;
      if(game.isNight() && this.count(true) < 12) this.trySpawn(true, world, player);
    }
  },
  trySpawn(hostile, world, player){
    for(let att = 0; att < 8; att++){
      const ang = Math.random() * Math.PI * 2;
      const dist = hostile ? 20 + Math.random() * 20 : 14 + Math.random() * 28;
      const x = player.body.x + Math.sin(ang) * dist;
      const z = player.body.z + Math.cos(ang) * dist;
      const y = world.colTop(x, z) + 1;
      if(y <= SEA + 1 || y >= WORLD_H - 2) continue;
      const ground = world.getBlock(x, y - 1, z);
      if(!BLOCKS[ground].solid || ground === B.WATER) continue;
      if(world.getBlock(x, y, z) !== B.AIR) continue;
      let type;
      if(hostile){
        const r = Math.random();
        type = r < 0.4 ? 'zombie' : r < 0.72 ? 'skeleton' : 'creeper';
      } else {
        const r = Math.random();
        type = r < 0.3 ? 'pig' : r < 0.55 ? 'cow' : r < 0.8 ? 'sheep' : 'chicken';
      }
      this.list.push(new Mob(type, Math.floor(x) + 0.5, y + 0.1, Math.floor(z) + 0.5));
      return;
    }
  },
  // 근접 공격용 레이 판정
  rayHit(ox, oy, oz, dx, dy, dz, maxDist){
    let best = null, bestT = maxDist;
    for(const m of this.list){
      const cx = m.body.x, cy = m.body.y + m.body.h / 2, cz = m.body.z;
      const px = cx - ox, py = cy - oy, pz = cz - oz;
      const t = px*dx + py*dy + pz*dz;
      if(t < 0 || t > bestT) continue;
      const qx = ox + dx*t - cx, qy = oy + dy*t - cy, qz = oz + dz*t - cz;
      const rr = Math.max(m.body.w + 0.3, m.body.h / 2 + 0.1);
      if(qx*qx + qy*qy + qz*qz < rr*rr){ best = m; bestT = t; }
    }
    return best;
  }
};
