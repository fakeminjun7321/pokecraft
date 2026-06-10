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
  cow: { name:'소', hp:10, speed:1.1, w:0.45, h:1.25, drops:[[I.BEEF_RAW,1,2],[I.LEATHER,0,2]],
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
  spider: { name:'거미', hp:16, speed:2.2, w:0.6, h:0.7, hostile:true, dmg:2, drops:[[I.STRING,1,2]],
    model:()=> { const m = buildQuad({ body:'#3a3230', bw:0.85, bh:0.35, bd:0.9, legH:0.28, legW:0.1, hs:0.42, headC:'#46403c' });
      makeBox(m.head, 0.07, 0.07, 0.02, '#e83a3a', -0.1, 0.1, 0.22); makeBox(m.head, 0.07, 0.07, 0.02, '#e83a3a', 0.1, 0.1, 0.22);
      makeBox(m.head, 0.05, 0.05, 0.02, '#e83a3a', -0.17, 0.02, 0.22); makeBox(m.head, 0.05, 0.05, 0.02, '#e83a3a', 0.17, 0.02, 0.22);
      return m; } },
  slime: { name:'슬라임', hp:8, speed:0.9, w:0.45, h:0.85, hostile:true, dmg:1, bounce:true, drops:[[I.EMERALD,0,1]],
    model:()=> { const g = new THREE.Group();
      const outer = makeBox(g, 0.9, 0.85, 0.9, '#5ac84a', 0, 0.43, 0);
      outer.material.transparent = true; outer.material.opacity = 0.75;
      makeBox(g, 0.5, 0.45, 0.5, '#3da832', 0, 0.4, 0);
      makeBox(g, 0.1, 0.1, 0.02, '#1a1a1a', -0.15, 0.55, 0.46); makeBox(g, 0.1, 0.1, 0.02, '#1a1a1a', 0.15, 0.55, 0.46);
      return { group: g, legs: [], head: outer }; } },
  enderman: { name:'엔더맨', hp:35, speed:2.4, w:0.3, h:2.5, neutral:true, dmg:5, teleporter:true, drops:[[I.ENDERPEARL,1,2]],
    model:()=> buildBiped({ body:'#16161a', headC:'#1d1d22', legC:'#16161a', armC:'#16161a',
      legH:1.15, bh:0.8, bw:0.34, legW:0.1, armW:0.09, armL:1.0, hs:0.42, eyeC:'#c83ae8', pupilC:'#f0a8ff' }) },
  guardian: { name:'가디언', hp:25, speed:2.0, w:0.5, h:0.7, hostile:true, dmg:4, aquatic:true, drops:[[I.FISH_RAW,1,2],[I.EMERALD,0,1]],
    model:()=> { const g = new THREE.Group();
      const body = makeBox(g, 0.8, 0.6, 0.8, '#5a8a78', 0, 0.4, 0);
      makeBox(body, 0.22, 0.22, 0.05, '#e8c83a', 0, 0, 0.42);
      makeBox(body, 0.12, 0.12, 0.05, '#1a1a1a', 0, 0, 0.45);
      [[-0.45,0.35,0],[0.45,0.35,0],[0,0.45,-0.3],[0,0.45,0.3]].forEach(([x,y,z]) => makeBox(body, 0.08, 0.25, 0.08, '#c8b888', x, y, z));
      makeBox(g, 0.15, 0.3, 0.3, '#4a7a68', 0, 0.4, -0.5);
      return { group: g, legs: [], head: body }; } },
  wolf: { name:'늑대', hp:12, speed:1.9, w:0.35, h:0.85, tameable:true, drops:[[I.BONE,0,1]],
    model:()=> { const m = buildQuad({ body:'#b8b8c0', bw:0.5, bh:0.42, bd:0.8, legH:0.32, hs:0.42, headC:'#c8c8d0', ears:'#9a9aa8', snout:'#8a8a98' });
      makeBox(m.group, 0.1, 0.1, 0.4, '#b8b8c0', 0, 0.62, -0.55);
      return m; } },
  pigman: { name:'좀비피그맨', hp:25, speed:1.8, w:0.3, h:1.8, neutral:true, dmg:4, fireImmune:true, drops:[[I.GOLD_INGOT,0,1],[I.ROTTEN,1,2]],
    model:()=> buildBiped({ body:'#e8a0a8', headC:'#e8a0a8', legC:'#8a5a4a', armC:'#e8a0a8', legH:0.75, bh:0.7, zombieArms:true,
      eyeC:'#3a3a3a' }) },
  ghast: { name:'가스트', hp:12, speed:1.2, w:0.8, h:1.5, hostile:true, flier:true, fireball:3.2, fireballR:2, fireImmune:true, drops:[[I.GUNPOWDER,1,3]],
    model:()=> { const g = new THREE.Group();
      const body = makeBox(g, 1.4, 1.4, 1.4, '#e8e8e8', 0, 1.0, 0);
      makeBox(body, 0.16, 0.25, 0.04, '#3a3a3a', -0.3, 0.15, 0.71); makeBox(body, 0.16, 0.25, 0.04, '#3a3a3a', 0.3, 0.15, 0.71);
      makeBox(body, 0.5, 0.12, 0.04, '#3a3a3a', 0, -0.25, 0.71);
      for(let i = 0; i < 5; i++) makeBox(g, 0.14, 0.6, 0.14, '#d8d8d8', (i - 2) * 0.28, 0.15, (i % 2) * 0.3 - 0.15);
      return { group: g, legs: [], head: body }; } },
  blaze: { name:'블레이즈', hp:20, speed:1.0, w:0.4, h:1.6, hostile:true, flier:true, fireball:2.4, fireballR:1, fireImmune:true, drops:[[I.BLAZE_ROD,1,2]],
    model:()=> { const g = new THREE.Group();
      const body = makeBox(g, 0.4, 0.5, 0.4, '#f0a020', 0, 1.0, 0);
      addEyes(body, 0.4, 0.4, '#3a2a0a');
      for(let i = 0; i < 6; i++){
        const a = i / 6 * Math.PI * 2;
        makeBox(g, 0.14, 0.45, 0.14, '#c87810', Math.sin(a) * 0.45, 0.55 + (i % 2) * 0.35, Math.cos(a) * 0.45);
      }
      return { group: g, legs: [], head: body }; } },
  magma: { name:'마그마큐브', hp:12, speed:0.9, w:0.45, h:0.85, hostile:true, dmg:3, bounce:true, fireImmune:true, drops:[[I.COAL,0,2]],
    model:()=> { const g = new THREE.Group();
      const outer = makeBox(g, 0.9, 0.85, 0.9, '#6e3533', 0, 0.43, 0);
      makeBox(g, 0.5, 0.45, 0.5, '#f08020', 0, 0.4, 0);
      makeBox(g, 0.1, 0.1, 0.02, '#ffce3d', -0.15, 0.55, 0.46); makeBox(g, 0.1, 0.1, 0.02, '#ffce3d', 0.15, 0.55, 0.46);
      return { group: g, legs: [], head: outer }; } },
  villager: { name:'주민', hp:20, speed:0.8, w:0.3, h:1.8, npc:true, drops:[[I.EMERALD,0,1]],
    model:()=> { const m = buildBiped({ body:'#8a6a4a', headC:'#d8a888', legC:'#6a5038', armC:'#8a6a4a', legH:0.7, bh:0.75 });
      makeBox(m.head, 0.12, 0.22, 0.1, '#c89878', 0, -0.05, 0.28);
      return m; } },
  leader: { name:'관장', hp:99, speed:0.4, w:0.3, h:1.8, npc:true, leader:true,
    model:()=> { const m = buildBiped({ body:'#c83a3a', headC:'#e0b08a', legC:'#3a3a4a', armC:'#c83a3a', legH:0.75, bh:0.7 });
      makeBox(m.head, 0.52, 0.14, 0.52, '#e8e8e8', 0, 0.3, 0);
      makeBox(m.head, 0.52, 0.08, 0.2, '#c83a3a', 0, 0.22, 0.25);
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
    this.angry = false; this.hopT = 0; this.tpT = 3; this.bobSeed = Math.random() * 10; this.lavaAcc = 0;
    this.love = 0; this.tamed = false; this.babyT = 0; // 번식/펫/아기
    if(this.def.npc) this.setTag(this.def.leader ? '체육관 관장' : '주민');
  }
  makeBaby(){
    this.babyT = 180; // 3분 뒤 성체
    this.group.scale.setScalar(0.5);
    this.body.h *= 0.5; this.body.w *= 0.6;
  }
  setTag(text){
    if(this.tag){ this.group.remove(this.tag); disposeObject(this.tag); }
    this.tag = makeNameTag(text);
    this.tag.position.y = this.body.h + 0.45;
    this.group.add(this.tag);
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

    // 번식 하트 / 아기 성장 / 길들인 늑대는 주인 따라다님
    if(this.love > 0){
      this.love -= dt;
      if(Math.random() < dt * 3) Particles.spawn(b.x, b.y + this.body.h + 0.3, b.z, 0xf06ba8, 2, 1, 0.5, 1);
    }
    if(this.babyT > 0){
      this.babyT -= dt;
      if(this.babyT <= 0){ this.group.scale.setScalar(1); this.body.h /= 0.5; this.body.w /= 0.6; }
    }
    if(this.tamed){
      const d2 = dist3(b.x, b.y, b.z, player.body.x, player.body.y, player.body.z);
      if(d2 > 20){ b.x = player.body.x - 1; b.y = player.body.y + 1; b.z = player.body.z - 1; }
      let sp2 = 0;
      if(d2 > 3){ this.dir = Math.atan2(player.body.x - b.x, player.body.z - b.z); sp2 = clamp((d2 - 2) * 1.3, 1, 6); }
      b.vx = lerp(b.vx, Math.sin(this.dir) * sp2, Math.min(1, dt * 8));
      b.vz = lerp(b.vz, Math.cos(this.dir) * sp2, Math.min(1, dt * 8));
      if(b.hitWall && b.onGround && sp2 > 0) b.vy = 7.5;
      if(b.inWater) b.vy = Math.max(b.vy, 1.5);
      b.update(dt, world);
      const spd = Math.hypot(b.vx, b.vz);
      this.walkPhase += spd * dt * 4;
      const sww = Math.sin(this.walkPhase) * Math.min(1, spd) * 0.7;
      this.legs.forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? sww : -sww); });
      this.group.position.set(b.x, b.y, b.z);
      this.group.rotation.y = this.dir;
      return;
    }
    const aggro = (def.hostile || (def.neutral && this.angry)) && !def.npc;
    if(aggro && !tgt.dead && dToP < (def.neutral ? 28 : 16)){
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
      } else if(def.fireball){
        // 거리 유지하며 화염구
        speed = dToP > 14 ? def.speed : (dToP < 8 ? -def.speed * 0.7 : 0);
        this.attackCd -= dt;
        if(dToP < 22 && this.attackCd <= 0){
          this.attackCd = def.fireball;
          const sx = b.x, sy = b.y + b.h * 0.6, sz = b.z;
          const dx = tgt.x - sx, dy = (tgt.y + 1) - sy, dz = tgt.z - sz;
          const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
          Projectiles.shootFireball(sx, sy, sz, dx/len, dy/len, dz/len, def.fireballR);
          SFX.play('fuse');
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
    if(def.bounce){
      // 슬라임: 통통 튀며 이동
      this.hopT -= dt;
      if(b.onGround){
        if(this.hopT <= 0 && speed > 0){
          b.vy = 6.5;
          b.vx = tvx * 2.2; b.vz = tvz * 2.2;
          this.hopT = 0.9 + Math.random() * 0.8;
        } else { b.vx *= 0.6; b.vz *= 0.6; }
      }
    } else {
      b.vx = lerp(b.vx, tvx, Math.min(1, dt * 8));
      b.vz = lerp(b.vz, tvz, Math.min(1, dt * 8));
    }
    if(def.flier){
      // 부유 비행: 타깃 높이 +4 유지, 천천히 둥둥
      b.noGravity = true;
      const wantY = (aggro && dToP < 24) ? tgt.y + 5 : b.y + Math.sin(this.walkPhase + this.bobSeed) * 0.4;
      b.vy = lerp(b.vy, clamp(wantY - b.y, -1.5, 1.5), Math.min(1, dt * 2.5));
      this.walkPhase += dt;
    }
    if(def.aquatic){
      b.noGravity = b.inWater;
      if(b.inWater){
        const ty = aggro && dToP < 20 ? tgt.y + 1 : b.y + Math.sin(this.walkPhase) * 0.3;
        b.vy = lerp(b.vy, clamp(ty - b.y, -2.2, 2.2), Math.min(1, dt * 4));
      }
    }
    if(!def.bounce && b.hitWall && b.onGround && speed > 0) b.vy = 7.5;
    if(b.inWater && !def.aquatic) b.vy = Math.max(b.vy, 1.5);
    b.update(dt, world);
    // 엔더맨: 주기적/전투 중 순간이동
    if(def.teleporter){
      this.tpT -= dt;
      if(this.tpT <= 0){
        this.tpT = 2.5 + Math.random() * 4;
        if(this.angry || Math.random() < 0.35) this._teleport(world);
      }
    }

    // 용암 데미지
    if(b.inLava && !def.fireImmune){
      this.lavaAcc += dt;
      if(this.lavaAcc > 0.5){
        this.lavaAcc = 0;
        this.hurt(3, 0, 0);
        Particles.spawn(b.x, b.y + 0.8, b.z, 0xf08020, 5, 1.5, 0.4, 1.5);
      }
    }
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
  _teleport(world){
    const b = this.body;
    Particles.spawn(b.x, b.y + 1.2, b.z, 0x8a3ae8, 14, 2.5, 0.6, 1);
    for(let t = 0; t < 8; t++){
      const nx = b.x + (Math.random() - 0.5) * 18;
      const nz = b.z + (Math.random() - 0.5) * 18;
      const ny = world.colTop(nx, nz) + 1;
      if(ny <= SEA + 1 || ny >= WORLD_H - 4) continue;
      b.x = nx; b.y = ny + 0.1; b.z = nz;
      b.vx = b.vy = b.vz = 0;
      break;
    }
    Particles.spawn(b.x, b.y + 1.2, b.z, 0x8a3ae8, 14, 2.5, 0.6, 1);
    SFX.play('throw');
  }
  hurt(dmg, kx, kz){
    if(this.dead) return;
    if(this.def.leader) return; // 관장은 배틀로만 상대
    if(this.def.neutral) this.angry = true;
    if(this.def.teleporter && Math.random() < 0.5){
      this._teleport(world);
      return; // 순간이동으로 회피
    }
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
    // 번식: 사랑에 빠진 같은 종 2마리가 가까우면 아기
    const lovers = this.list.filter(x => x.love > 0 && !x.dead && x.babyT <= 0);
    for(let i = 0; i < lovers.length; i++){
      for(let j = i + 1; j < lovers.length; j++){
        const a = lovers[i], b2 = lovers[j];
        if(a.type !== b2.type || a.love <= 0 || b2.love <= 0) continue;
        if(dist3(a.body.x, a.body.y, a.body.z, b2.body.x, b2.body.y, b2.body.z) > 4) continue;
        a.love = 0; b2.love = 0;
        const baby = new Mob(a.type, (a.body.x + b2.body.x) / 2, a.body.y + 0.5, (a.body.z + b2.body.z) / 2);
        baby.makeBaby();
        this.list.push(baby);
        Particles.spawn(baby.body.x, baby.body.y + 1, baby.body.z, 0xf06ba8, 14, 2, 0.8, 1.5);
        SFX.play('pop');
        if(typeof Ach !== 'undefined') Ach.unlock('first_breed');
      }
    }
    // 너무 먼 몹 디스폰 (NPC/펫 제외)
    for(const m of this.list.slice()){
      if(m.def.npc || m.tamed) continue;
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
      if((game.isNight() || world.dim === 'nether') && this.count(true) < 12) this.trySpawn(true, world, player);
    }
    // 구조물 NPC 유지 (주민/관장/가디언)
    this.npcTimer = (this.npcTimer === undefined ? 1 : this.npcTimer) - dt;
    if(this.npcTimer <= 0){
      this.npcTimer = 5;
      const px = player.body.x, pz = player.body.z;
      if(world.dim === 'nether'){
        for(const f of world.fortressesNear(px, pz)){
          if(Math.hypot(f.x - px, f.z - pz) > 50) continue;
          if(typeof Ach !== 'undefined' && Math.hypot(f.x - px, f.z - pz) < 16) Ach.unlock('fortress');
          const have = this.list.filter(x => x.type === 'blaze' && x.fortKey === f.key).length;
          for(let i = have; i < 2; i++){
            const mb = new Mob('blaze', f.x + (i ? 3 : -3), f.y + 2, f.z + 2);
            mb.fortKey = f.key;
            this.list.push(mb);
          }
        }
        return;
      }
      for(const v of world.villagesNear(px, pz)){
        if(Math.hypot(v.x - px, v.z - pz) > 80) continue;
        const have = this.list.filter(m => m.homeKey === v.key).length;
        for(let i = have; i < 3; i++){
          const ang = Math.random() * Math.PI * 2;
          const mx = v.x + Math.sin(ang) * 6, mz = v.z + Math.cos(ang) * 6;
          const mb = new Mob('villager', mx, world.colTop(mx, mz) + 1.1, mz);
          mb.homeKey = v.key;
          this.list.push(mb);
        }
      }
      const GYM_NAME = { rock:'바위', water:'물', electric:'전기', fire:'불꽃' };
      for(const g of world.gymsNear(px, pz)){
        if(Math.hypot(g.x - px, g.z - pz) > 80) continue;
        if(!this.list.some(m => m.gym && m.gym.key === g.key)){
          const mb = new Mob('leader', g.x + 0.5, g.y + 1.1, g.z - 2.5);
          mb.gym = g;
          mb.setTag('체육관 관장 · ' + GYM_NAME[g.type] + (world.gymsBeaten.has(g.key) ? ' (클리어!)' : ''));
          this.list.push(mb);
        }
      }
      for(const mo of world.monumentsNear(px, pz)){
        if(Math.hypot(mo.x - px, mo.z - pz) > 60) continue;
        const have = this.list.filter(m => m.type === 'guardian' && m.monKey === mo.key).length;
        for(let i = have; i < 2; i++){
          const mb = new Mob('guardian', mo.x + (i ? 8 : -8), mo.y + 8, mo.z + 7);
          mb.monKey = mo.key;
          this.list.push(mb);
        }
      }
    }
  },
  trySpawn(hostile, world, player){
    for(let att = 0; att < 8; att++){
      const ang = Math.random() * Math.PI * 2;
      const dist = hostile ? 20 + Math.random() * 20 : 14 + Math.random() * 28;
      const x = player.body.x + Math.sin(ang) * dist;
      const z = player.body.z + Math.cos(ang) * dist;
      // 네더: 바닥 찾기 + 전용 몹
      if(world.dim === 'nether'){
        const ny = world.netherFloorY(Math.floor(x), Math.floor(z));
        if(ny < 0) continue;
        const r = Math.random();
        const t = r < 0.4 ? 'pigman' : r < 0.6 ? 'magma' : r < 0.8 ? 'ghast' : 'blaze';
        const mb = new Mob(t, Math.floor(x) + 0.5, ny + (t === 'ghast' ? 8 : 0.1), Math.floor(z) + 0.5);
        this.list.push(mb);
        return;
      }
      const y = world.colTop(x, z) + 1;
      if(y <= SEA + 1 || y >= WORLD_H - 2) continue;
      const ground = world.getBlock(x, y - 1, z);
      if(!BLOCKS[ground].solid || ground === B.WATER) continue;
      if(world.getBlock(x, y, z) !== B.AIR) continue;
      let type;
      if(hostile){
        const r = Math.random();
        type = r < 0.3 ? 'zombie' : r < 0.55 ? 'skeleton' : r < 0.7 ? 'creeper' : r < 0.85 ? 'spider' : r < 0.93 ? 'slime' : 'enderman';
      } else {
        const r = Math.random();
        const biome = world.biomeAt(Math.floor(x), Math.floor(z));
        if((biome === 'forest' || biome === 'snow' || biome === 'birch') && r < 0.15) type = 'wolf';
        else type = r < 0.3 ? 'pig' : r < 0.55 ? 'cow' : r < 0.8 ? 'sheep' : 'chicken';
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
