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
// 머리 앞면(+Z)에 눈 두 개 — 흰자 + 눈동자 + 반짝 하이라이트 (생기있는 얼굴!)
function addEyes(head, hw, hd, color, pupil){
  const e = 0.06, z = hd / 2;
  [-1, 1].forEach(s => {
    makeBox(head, e*2.0, e*2.3, 0.02, '#ffffff', s*hw*0.24, 0.06, z + 0.011);
    makeBox(head, e*1.15, e*1.5, 0.02, color || '#26262e', s*hw*0.24 + s*0.012, 0.05, z + 0.02);
    makeBox(head, e*0.5, e*0.5, 0.02, '#ffffff', s*hw*0.24 - s*0.008, 0.085, z + 0.028);
    if(pupil) makeBox(head, e*0.6, e*0.8, 0.02, pupil, s*hw*0.24 + s*0.012, 0.04, z + 0.025);
  });
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
  // 🧙 마녀 — 밤에 출현, 원거리 독물약 투척
  witch: { name:'마녀', hp:26, speed:1.4, w:0.3, h:1.8, hostile:true, dmg:3, ranged:true, burns:false, drops:[[I.GLOWDUST,1,3],[I.REDSTONE,0,2],[I.EMERALD,0,1]],
    model:()=> { const m = buildBiped({ body:'#5a3a78', headC:'#7da85d', legC:'#3a2a4a', armC:'#5a3a78', legH:0.7, bh:0.72 });
      makeBox(m.head, 0.5, 0.1, 0.5, '#2a1a3a', 0, 0.28, 0);            // 모자챙
      makeBox(m.head, 0.28, 0.4, 0.28, '#2a1a3a', 0, 0.5, 0);          // 고깔모자
      makeBox(m.head, 0.1, 0.12, 0.06, '#a86a4a', 0, -0.02, 0.3);      // 매부리코
      makeBox(m.head, 0.1, 0.1, 0.02, '#3a3a3a', -0.13, 0.06, 0.26); makeBox(m.head, 0.1, 0.1, 0.02, '#3a3a3a', 0.13, 0.06, 0.26);
      return m; } },
  // 🤖 아이언골렘 — 마을의 수호자, 강하고 느림, 적대몹을 공격
  iron_golem: { name:'아이언골렘', hp:100, speed:1.3, w:0.55, h:2.7, neutral:true, golem:true, dmg:9, drops:[[I.IRON_INGOT,3,5],[B.FLOWER_R,0,2]],
    model:()=> { const m = buildBiped({ body:'#c8c4be', headC:'#bcb8b2', legC:'#a8a49e', armC:'#c0bcb6', legH:1.0, bh:1.0, bw:0.6, legW:0.22, armW:0.2, armL:1.3, hs:0.5 });
      makeBox(m.head, 0.12, 0.3, 0.08, '#9a9690', 0, 0.05, 0.26);     // 코
      makeBox(m.group, 0.45, 0.2, 0.25, '#8fae5a', 0, 1.15, 0.2);     // 가슴 덩굴
      return m; } },
  // 🦇 팬텀 — 밤하늘을 날며 급강하 공격
  phantom: { name:'팬텀', hp:18, speed:7, w:0.5, h:0.4, hostile:true, flyer:true, dmg:4, fireImmune:true, drops:[[I.LEATHER,1,2]],
    model:()=> { const g = new THREE.Group();
      const body = makeBox(g, 0.5, 0.3, 1.0, '#2a4a52', 0, 0.3, 0);
      const head = makeBox(g, 0.4, 0.3, 0.4, '#2a4a52', 0, 0.35, 0.55);
      makeBox(head, 0.08, 0.08, 0.03, '#7af0c8', -0.12, 0.04, 0.2); makeBox(head, 0.08, 0.08, 0.03, '#7af0c8', 0.12, 0.04, 0.2);
      const wingL = makeBox(g, 1.4, 0.06, 0.7, '#1f3a40', -0.9, 0.35, 0);
      const wingR = makeBox(g, 1.4, 0.06, 0.7, '#1f3a40', 0.9, 0.35, 0);
      makeBox(g, 0.18, 0.18, 0.7, '#1f3a40', 0, 0.3, -0.8);          // 꼬리
      return { group: g, legs: [wingL, wingR], head }; } },
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
  pigman: { name:'좀비피그맨', hp:25, speed:1.8, w:0.3, h:1.8, neutral:true, dmg:3, fireImmune:true, drops:[[I.GOLD_INGOT,0,1],[I.ROTTEN,1,2]],
    model:()=> buildBiped({ body:'#e8a0a8', headC:'#e8a0a8', legC:'#8a5a4a', armC:'#e8a0a8', legH:0.75, bh:0.7, zombieArms:true,
      eyeC:'#3a3a3a' }) },
  ghast: { name:'가스트', hp:12, speed:1.2, w:0.8, h:1.5, hostile:true, flier:true, fireball:4.5, fireballR:1.6, fireImmune:true, drops:[[I.GUNPOWDER,1,3]],
    model:()=> { const g = new THREE.Group();
      const body = makeBox(g, 1.4, 1.4, 1.4, '#e8e8e8', 0, 1.0, 0);
      makeBox(body, 0.16, 0.25, 0.04, '#3a3a3a', -0.3, 0.15, 0.71); makeBox(body, 0.16, 0.25, 0.04, '#3a3a3a', 0.3, 0.15, 0.71);
      makeBox(body, 0.5, 0.12, 0.04, '#3a3a3a', 0, -0.25, 0.71);
      for(let i = 0; i < 5; i++) makeBox(g, 0.14, 0.6, 0.14, '#d8d8d8', (i - 2) * 0.28, 0.15, (i % 2) * 0.3 - 0.15);
      return { group: g, legs: [], head: body }; } },
  blaze: { name:'블레이즈', hp:20, speed:1.0, w:0.4, h:1.6, hostile:true, flier:true, fireball:3.2, fireballR:1, fireImmune:true, drops:[[I.BLAZE_ROD,1,2]],
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
  dragon: { name:'엔더드래곤', hp:150, speed:9, w:1.6, h:1.6, hostile:true, boss:true, fireImmune:true,
    drops:[[I.RARECANDY,3,5],[I.DIAMOND,2,4],[I.ENDERPEARL,2,4]],
    model:()=> { const g = new THREE.Group();
      const body = makeBox(g, 1.6, 1.2, 3.2, '#1a1a22', 0, 1.2, 0);
      // 머리는 피벗에 매달아 물기(headLunge) 모션 가능
      const headPivot = makePivot(g, 0, 1.5, 1.4);
      const head = makeBox(headPivot, 0.9, 0.8, 1.1, '#1a1a22', 0, 0, 0.6);
      makeBox(head, 0.18, 0.18, 0.06, '#c84af0', -0.25, 0.1, 0.56); makeBox(head, 0.18, 0.18, 0.06, '#c84af0', 0.25, 0.1, 0.56);
      makeBox(head, 0.5, 0.2, 0.4, '#0e0e14', 0, -0.3, 0.45);
      const tail = makeBox(g, 0.5, 0.5, 2.4, '#15151c', 0, 1.3, -2.6);
      makeBox(g, 0.3, 0.3, 1.4, '#15151c', 0, 1.35, -4.4);
      // 날개는 어깨 피벗에 매달아 펄럭임이 자연스럽게
      const wlP = makePivot(g, -0.8, 1.7, 0), wrP = makePivot(g, 0.8, 1.7, 0);
      makeBox(wlP, 3.4, 0.12, 1.8, '#2a2a36', -1.7, 0, 0);
      makeBox(wrP, 3.4, 0.12, 1.8, '#2a2a36', 1.7, 0, 0);
      return { group: g, legs: [wlP, wrP], head: headPivot, body, tail, wingPivots: [wlP, wrP] }; } },
  trademan: { name:'교환 상인', hp:25, speed:0.7, w:0.3, h:1.8, npc:true, trademan:true,
    model:()=> { const m = buildBiped({ body:'#7a5ab8', headC:'#e0b08a', legC:'#4a3a78', armC:'#7a5ab8', legH:0.7, bh:0.75 });
      makeBox(m.head, 0.56, 0.16, 0.56, '#5a4398', 0, 0.32, 0);   // 보라 모자
      makeBox(m.head, 0.2, 0.1, 0.2, '#e8c84a', 0, 0.44, 0);      // 금장식
      makeBox(m.group, 0.34, 0.3, 0.2, '#a8825a', 0, 0.95, -0.3); // 등짐
      makeBox(m.group, 0.12, 0.12, 0.12, '#e84d60', -0.12, 1.12, -0.42); // 몬스터볼 짐
      makeBox(m.group, 0.12, 0.12, 0.12, '#f5f0e0', 0.12, 1.12, -0.42);
      return m; } },
  rocket: { name:'로켓단', hp:25, speed:1.1, w:0.3, h:1.8, npc:true, rocket:true,
    model:()=> { const m = buildBiped({ body:'#1a1a22', headC:'#e0b08a', legC:'#15151c', armC:'#1a1a22', legH:0.75, bh:0.7 });
      // 가슴의 빨간 R
      makeBox(m.group, 0.06, 0.3, 0.05, '#e23b3b', -0.08, 1.15, 0.2);
      makeBox(m.group, 0.14, 0.07, 0.05, '#e23b3b', 0, 1.27, 0.2);
      makeBox(m.group, 0.14, 0.07, 0.05, '#e23b3b', 0.02, 1.13, 0.2);
      makeBox(m.head, 0.52, 0.14, 0.52, '#15151c', 0, 0.3, 0); // 검은 모자
      return m; } },
  trainer: { name:'떠돌이 트레이너', hp:20, speed:0.9, w:0.3, h:1.8, npc:true, trainer:true,
    model:()=> { const m = buildBiped({ body:'#3a6ac8', headC:'#e0b08a', legC:'#2a3a5a', armC:'#3a6ac8', legH:0.75, bh:0.7 });
      makeBox(m.head, 0.52, 0.16, 0.52, '#c83a3a', 0, 0.3, 0);   // 빨간 모자
      makeBox(m.head, 0.52, 0.08, 0.24, '#c83a3a', 0, 0.24, 0.3); // 챙
      makeBox(m.head, 0.2, 0.08, 0.04, '#e8e8e8', 0, 0.32, 0.27); // 모자 마크
      return m; } },
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
    // 보스(드래곤) 전용 부위 — 다른 몹은 null
    this.headPart = built.head || null;
    this.bodyPart = built.body || null;
    this.tailPart = built.tail || null;
    this.wingPivots = built.wingPivots || this.legs;
    scene.add(this.group);
    this.hp = this.def.hp;
    this.dir = Math.random() * Math.PI * 2;
    this.moveTimer = 0; this.moving = false;
    this.attackCd = 0; this.fuse = -1; this.burnAcc = 0;
    this.hurtFlash = 0; this.walkPhase = 0;
    this.dead = false;
    this.angry = false; this.hopT = 0; this.tpT = 3; this.bobSeed = Math.random() * 10; this.lavaAcc = 0;
    this.love = 0; this.tamed = false; this.babyT = 0; // 번식/펫/아기
    if(this.def.npc) this.setTag(this.def.leader ? '체육관 관장' : this.def.trainer ? '트레이너 · 우클릭 배틀!' : this.def.rocket ? '💀 로켓단' : this.def.trademan ? '🎒 교환 상인 · 우클릭!' : '주민');
    // 👑 보스 초기화 — 파티 최고 레벨로 HP 스케일 (전부 transient, 저장 안 함)
    if(this.def.boss){
      let lv = 25;
      if(typeof PokeMan !== 'undefined' && PokeMan.party && PokeMan.party.length)
        lv = Math.max(...PokeMan.party.map(q => q.level || 25));
      this.maxHp = Math.round(800 + lv * 90); // 1700(L10) ~ 9800(L100)
      this.hp = this.maxHp;
      this.phase = 1;
      this.bossState = 'intro'; this.stateT = 2.2;
      this.attackCd = 4; this.pitch = 0; this.headLunge = 0; this.wingBeat = 0;
      this.perchPillar = null; this.addsSpawned = false; this.breathZones = [];
      if(typeof UI !== 'undefined' && UI.bossShow) UI.bossShow('💀 엔더드래곤');
    }
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
    if(this._deathTick){ this._deathTick(dt); return; } // 👑 보스 사망 연출 중에는 AI 정지
    if(this.battledT > 0) this.battledT -= dt;
    if(this._poof){
      // 연기와 함께 사라진다
      Particles.spawn(this.body.x, this.body.y + 1, this.body.z, 0x444450, 22, 2.5, 1, 2);
      SFX.play('pop');
      this.die(false);
      return;
    }
    const b = this.body, def = this.def;
    // 교환 상인: 시간이 지나면 떠난다
    if(def.trademan){
      this._life = (this._life === undefined ? 180 : this._life) - dt;
      if(this._life <= 0){
        UI.toast('🎒 교환 상인이 떠났다...');
        this._poof = true;
        return;
      }
    }
    // 로켓단: 플레이어를 발견하면 쫓아와 강제 배틀!
    if(def.rocket){
      this._life = (this._life === undefined ? 150 : this._life) - dt;
      if(this._life <= 0){ this._poof = true; return; }
      const dP = dist3(b.x, b.y, b.z, player.body.x, player.body.y, player.body.z);
      if(dP < 18 && !(this.battledT > 0) && !player.dead){
        // 나무/지형에 4초 이상 막히면 연기처럼 플레이어 옆으로 파고든다
        const blocked = b.hitWall || Math.hypot(b.vx, b.vz) < 0.5;
        this._stuckT = blocked ? (this._stuckT || 0) + dt : 0;
        if(this._stuckT > 4 && dP > 4){
          Particles.spawn(b.x, b.y + 1, b.z, 0x444450, 14, 2, 0.8, 1.5);
          const a2 = Math.random() * Math.PI * 2;
          b.x = player.body.x + Math.sin(a2) * 3.5;
          b.z = player.body.z + Math.cos(a2) * 3.5;
          b.y = world.colTop(b.x, b.z) + 1.1;
          b.vx = b.vy = b.vz = 0;
          Particles.spawn(b.x, b.y + 1, b.z, 0x444450, 14, 2, 0.8, 1.5);
          SFX.play('pop');
          this._stuckT = 0;
        }
        this.dir = Math.atan2(player.body.x - b.x, player.body.z - b.z);
        const sp3 = dP > 1.7 ? 2.6 : 0;
        b.vx = lerp(b.vx, Math.sin(this.dir) * sp3, Math.min(1, dt * 8));
        b.vz = lerp(b.vz, Math.cos(this.dir) * sp3, Math.min(1, dt * 8));
        if(b.hitWall && b.onGround && sp3 > 0){
          b.vy = 8.8;
          b.vx = Math.sin(this.dir) * Math.max(sp3, 3);
          b.vz = Math.cos(this.dir) * Math.max(sp3, 3);
        }
        if(b.inWater) b.vy = Math.max(b.vy, 1.5);
        b.update(dt, world);
        const spd2 = Math.hypot(b.vx, b.vz);
        this.walkPhase += spd2 * dt * 4;
        const sw2 = Math.sin(this.walkPhase) * Math.min(1, spd2) * 0.7;
        this.legs.forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? sw2 : -sw2); });
        this.group.position.set(b.x, b.y, b.z);
        this.group.rotation.y = this.dir;
        if(dP < 3.2 && !game.inBattle && !game.uiOpen && typeof startRocketBattle === 'function'){
          startRocketBattle(this);
        }
        return;
      }
    }
    // 공격 대상: 싱글은 플레이어, 멀티 호스트는 가장 가까운 플레이어(게스트 포함)
    let tgt = { x: player.body.x, y: player.body.y, z: player.body.z, dead: player.dead,
                hurt: (dmg, kx, kz) => player.hurt(dmg, kx, kz) };
    if(typeof Net !== 'undefined' && Net.mode === 'host'){
      const nt = Net.nearestTarget(b.x, b.y, b.z);
      if(nt) tgt = nt;
    }
    const dToP = dist3(b.x, b.y, b.z, tgt.x, tgt.y, tgt.z);
    let speed = 0;

    // ---- 👑 엔더드래곤 보스 AI: 페이즈 상태머신 (선회→급강하/브레스/날개치기/안착) ----
    if(def.boss){
      this.attackCd -= dt; this.stateT -= dt;
      const crystalsLeft = world.crystals && world.crystals.size > 0;
      // 🛡️ 크리스탈 보호막: 다 부수기 전엔 빠르게 회복
      if(crystalsLeft){
        this.hp = Math.min(this.maxHp, this.hp + dt * (8 + this.phase * 4));
        if(Math.random() < dt * 4){
          const pks = [...world.crystals];
          const [cx2, cy2, cz2] = pks[(Math.random() * pks.length) | 0].split(',').map(Number);
          Particles.spawn(cx2 + 0.5, cy2 + 0.8, cz2 + 0.5, 0xf06bdc, 3, 1.5, 0.6, 1.5);
          Particles.spawn(b.x, b.y + 1, b.z, 0xf06bdc, 2, 1, 0.6, 1);
        }
      } else {
        // 페이즈 전이 (크리스탈 파괴 후에만 — HP 66%/33%)
        const frac = this.hp / this.maxHp;
        if(this.phase === 1 && frac <= 0.66) this._bossPhase(2, world);
        else if(this.phase === 2 && frac <= 0.33) this._bossPhase(3, world);
      }
      this._bossTickAnim(dt, crystalsLeft);
      this._bossTickZones(dt, tgt);
      this._bossState(dt, world, tgt, dToP, crystalsLeft);
      if(typeof UI !== 'undefined' && UI.bossSet) UI.bossSet(this.hp / this.maxHp, crystalsLeft, this.phase);
      this.group.position.set(b.x, b.y, b.z);
      this.group.rotation.y = this.dir;
      if(b.y < 8) b.y = 8;
      return;
    }

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
      if(b.hitWall && b.onGround && sp2 > 0){
        b.vy = 8.8;
        b.vx = Math.sin(this.dir) * Math.max(sp2, 3);
        b.vz = Math.cos(this.dir) * Math.max(sp2, 3);
      }
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
    // 🦇 팬텀: 밤하늘 선회 ↔ 급강하 공격 (노클립 비행)
    if(def.flyer){
      this._swT = (this._swT || 0) + dt; this.attackCd -= dt;
      const diving = (this._swT % 6) > 4 && !tgt.dead && dToP < 30;
      let tx, ty, tz;
      if(diving){ tx = tgt.x; ty = tgt.y + 0.5; tz = tgt.z; }
      else { const a = this._swT * 0.6 + this.bobSeed; tx = tgt.x + Math.cos(a) * 11; ty = tgt.y + 9 + Math.sin(a * 1.5) * 2; tz = tgt.z + Math.sin(a) * 11; }
      const ddx = tx - b.x, ddy = ty - b.y, ddz = tz - b.z, dl = Math.hypot(ddx, ddy, ddz) || 1;
      const sp = diving ? def.speed * 1.6 : def.speed;
      b.vx = lerp(b.vx, ddx / dl * sp, Math.min(1, dt * 3));
      b.vy = lerp(b.vy, ddy / dl * sp, Math.min(1, dt * 3));
      b.vz = lerp(b.vz, ddz / dl * sp, Math.min(1, dt * 3));
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      this.dir = Math.atan2(b.vx, b.vz);
      if(diving && dToP < 1.8 && this.attackCd <= 0){ this.attackCd = 1.2; tgt.hurt(def.dmg, (tgt.x - b.x) * 0.5, (tgt.z - b.z) * 0.5); SFX.play('hit'); }
      this.walkPhase += dt * (diving ? 16 : 9);
      const flap = Math.sin(this.walkPhase) * 0.5;
      this.legs.forEach((l, i) => { l.rotation.z = (i % 2 === 0 ? flap : -flap); });
      this.group.position.set(b.x, b.y, b.z);
      this.group.rotation.y = this.dir;
      // 낮에는 불타며 사라짐(MC 팬텀)
      if(world.dim === 'over' && !game.isNight() && Math.random() < dt) this.hurt(2, 0, 0);
      return;
    }
    // 🤖 아이언골렘: 주변 적대몹을 능동적으로 공격 (수호자)
    if(def.golem && !this.angry){
      let foe = null, fd = 12;
      for(const mb of MobManager.list){ if(mb === this || mb.dead || !mb.def.hostile) continue; const d2 = dist3(mb.body.x, mb.body.y, mb.body.z, b.x, b.y, b.z); if(d2 < fd){ fd = d2; foe = mb; } }
      if(foe){ this.dir = Math.atan2(foe.body.x - b.x, foe.body.z - b.z); this.attackCd -= dt;
        let speed = fd > 1.8 ? def.speed : 0;
        if(fd < 2 && this.attackCd <= 0){ this.attackCd = 1.2; foe.hurt(def.dmg, (foe.body.x - b.x) * 1.2, (foe.body.z - b.z) * 1.2); foe.body.vy = 6; SFX.play('hit'); }
        b.vx = lerp(b.vx, Math.sin(this.dir) * speed, Math.min(1, dt * 8)); b.vz = lerp(b.vz, Math.cos(this.dir) * speed, Math.min(1, dt * 8));
        if(b.hitWall && b.onGround && speed > 0) b.vy = 8;
        b.update(dt, world);
        const sp2 = Math.hypot(b.vx, b.vz); this.walkPhase += sp2 * dt * 4;
        const sw = Math.sin(this.walkPhase) * Math.min(1, sp2) * 0.7; this.legs.forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? sw : -sw); });
        this.group.position.set(b.x, b.y, b.z); this.group.rotation.y = this.dir;
        return;
      }
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
        // 파트너 포켓몬이 더 가까우면 그쪽을 공격 — 포켓몬도 다친다!
        const fent = (typeof Follower !== 'undefined' && Follower.ent && PokeMan.party.length) ? Follower.ent : null;
        const fpar = fent ? PokeMan.party[0] : null;
        const dToF = fent ? dist3(b.x, b.y, b.z, fent.body.x, fent.body.y, fent.body.z) : 1e9;
        if(fpar && fpar.hp > 0 && dToF < 1.7 && dToF <= dToP && this.attackCd <= 0){
          this.attackCd = 1;
          fpar.hp = Math.max(0, fpar.hp - def.dmg);
          Particles.spawn(fent.body.x, fent.body.y + 0.8, fent.body.z, 0xc83a3a, 8, 1.6, 0.5, 1.5);
          SFX.play('hit');
          if(fpar.hp <= 0){
            SFX.play('faint');
            UI.toast('😵 ' + fpar.name + '은(는) 쓰러졌다! 상처약이나 회복 머신으로 회복시키자', 5000);
          }
        } else if(dToP < 1.7 && this.attackCd <= 0){
          this.attackCd = 1;
          const kb = this.type === 'zombie' ? 0.75 : 0.5;
          tgt.hurt(def.dmg, (tgt.x - b.x) * kb, (tgt.z - b.z) * kb);
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
    if(!def.bounce && b.hitWall && b.onGround && speed > 0){
      b.vy = 8.8;
      b.vx = Math.sin(this.dir) * Math.max(speed, 3);
      b.vz = Math.cos(this.dir) * Math.max(speed, 3);
    }
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
  // ===== 👑 엔더드래곤 보스 헬퍼 =====
  _bossPhase(p, world){
    this.phase = p;
    game.shake = Math.max(game.shake, 0.7);
    SFX.play('evolve');
    if(p === 2) UI.toast('🔥 엔더드래곤이 분노한다! (페이즈 2 — 더 빠르고 사납게!)', 4000);
    if(p === 3){ UI.toast('💜 엔더드래곤 최후의 발악! 엔더맨을 소환한다!', 4500); this._bossSummonAdds(world); }
    this.bossState = 'circle'; this.stateT = 2;
  }
  _fly(b, tx, ty, tz, sp, dt){
    const dx = tx - b.x, dy = ty - b.y, dz = tz - b.z, dl = Math.hypot(dx, dy, dz) || 1;
    b.vx = lerp(b.vx, dx / dl * sp, Math.min(1, dt * 2));
    b.vy = lerp(b.vy, dy / dl * sp, Math.min(1, dt * 2));
    b.vz = lerp(b.vz, dz / dl * sp, Math.min(1, dt * 2));
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; // 노클립 비행
  }
  _pickPillar(world){
    if(!world.crystals || !world.crystals.size) return { x: 0, y: 46, z: 0 };
    const ps = [...world.crystals].map(k => k.split(',').map(Number));
    const [x, y, z] = ps[(Math.random() * ps.length) | 0]; return { x, y, z };
  }
  _bossState(dt, world, tgt, dToP, locked){
    const b = this.body, sp = this.phase === 3 ? 1.35 : this.phase === 2 ? 1.15 : 1.0;
    if(this.stateT <= 0){
      if(this.bossState === 'intro'){ this.bossState = 'circle'; this.stateT = 4; }
      else if(this.bossState === 'circle'){
        const r = Math.random();
        if(locked && r < 0.5){ this.bossState = 'perch'; this.stateT = 3; this.perchPillar = this._pickPillar(world); }
        else if(r < 0.4){ this.bossState = 'dive'; this.stateT = 2.6; this.divePhase = 'windup'; this.diveTimer = 0.9; }
        else if(r < 0.7){ this.bossState = 'breath'; this.stateT = 2.2; this.breathDone = false; }
        else { this.bossState = 'buffet'; this.stateT = 1.4; this.buffetDone = false; }
      }
      else { this.bossState = 'circle'; this.stateT = 2.5 + Math.random() * 2; }
    }
    if(this.bossState === 'intro'){
      this._fly(b, b.x, 42, b.z, 6 * sp, dt); this.dir = Math.atan2(tgt.x - b.x, tgt.z - b.z);
    } else if(this.bossState === 'circle'){
      const a = performance.now() * 0.0004 * sp + this.bobSeed;
      this._fly(b, Math.cos(a) * 30, 40 + Math.sin(a * 1.6) * 5, Math.sin(a) * 30, 9 * sp, dt);
      this.dir = Math.atan2(b.vx, b.vz);
      if(!tgt.dead && dToP < 32 && this.attackCd <= 0){
        this.attackCd = 3.2 / sp;
        const fl = Math.hypot(tgt.x - b.x, (tgt.y + 1) - b.y, tgt.z - b.z) || 1;
        Projectiles.shootFireball(b.x, b.y + 0.6, b.z, (tgt.x - b.x) / fl, ((tgt.y + 1) - b.y) / fl, (tgt.z - b.z) / fl, 1.6);
        SFX.play('fuse');
      }
    } else if(this.bossState === 'dive'){
      if(this.divePhase === 'windup'){
        this.diveTimer -= dt; this.dir = Math.atan2(tgt.x - b.x, tgt.z - b.z);
        this._fly(b, b.x, b.y + 3, b.z, 3, dt); // 예비동작: 솟구침
        this.pitch = Math.min(0.5, (this.pitch || 0) + dt * 1.2);
        if(Math.random() < dt * 30) Particles.spawn(b.x, b.y + 1, b.z, 0xc84af0, 2, 1.2, 0.5, 1);
        if(this.diveTimer <= 0){ this.divePhase = 'lunge'; this.diveTx = tgt.x; this.diveTy = tgt.y + 0.5; this.diveTz = tgt.z; SFX.play('throw'); }
      } else {
        this.pitch = -0.7;
        this._fly(b, this.diveTx, this.diveTy, this.diveTz, 22 * sp, dt);
        this.dir = Math.atan2(b.vx, b.vz);
        if(!tgt.dead && dToP < 3.2 && this.attackCd <= 0){
          this.attackCd = 0.6; this.headLunge = 0.6;
          tgt.hurt(10 + this.phase * 2, (tgt.x - b.x) * 0.9, (tgt.z - b.z) * 0.9);
          game.shake = Math.max(game.shake, 0.5); SFX.play('hit');
        }
        if(dist3(b.x, b.y, b.z, this.diveTx, this.diveTy, this.diveTz) < 3){ this.bossState = 'circle'; this.stateT = 1.5; this.pitch = 0; }
      }
    } else if(this.bossState === 'breath'){
      this.dir = Math.atan2(tgt.x - b.x, tgt.z - b.z);
      this._fly(b, tgt.x - Math.sin(this.dir) * 10, tgt.y + 8, tgt.z - Math.cos(this.dir) * 10, 8 * sp, dt);
      if(!this.breathDone && this.stateT < 1.4){ this.breathDone = true; this._bossBreath(world, tgt); }
    } else if(this.bossState === 'buffet'){
      this.dir = Math.atan2(tgt.x - b.x, tgt.z - b.z);
      this._fly(b, tgt.x, tgt.y + 6, tgt.z, 12 * sp, dt);
      this.wingBeat = 1;
      if(!this.buffetDone && dToP < 9 && this.stateT < 0.7){
        this.buffetDone = true;
        game.shake = Math.max(game.shake, 0.6); SFX.play('boom');
        Particles.spawn(tgt.x, tgt.y + 0.5, tgt.z, 0xddddff, 18, 5, 0.6, 2);
        if(!tgt.dead) tgt.hurt(6 + this.phase, (tgt.x - b.x) * 2.4 || (Math.random() - 0.5), (tgt.z - b.z) * 2.4 || (Math.random() - 0.5));
      }
    } else if(this.bossState === 'perch'){
      const pp = this.perchPillar || { x: 0, y: 46, z: 0 };
      this._fly(b, pp.x, pp.y + 4, pp.z, 10, dt);
      this.dir = Math.atan2(tgt.x - b.x, tgt.z - b.z);
      if(Math.random() < dt * 10) Particles.spawn(b.x, b.y, b.z, 0xf06bdc, 1, 1, 0.5, 1);
    }
  }
  _bossTickAnim(dt, locked){
    if(this.hurtFlash > 0){ this.hurtFlash -= dt; if(this.hurtFlash <= 0) this.setTint(null); } // 피격 빨강 틴트 감쇠
    const fast = this.bossState === 'dive' || this.bossState === 'buffet';
    const base = this.bossState === 'perch' ? 2 : fast ? 14 : 7;
    this.walkPhase += dt * (base + this.phase * 1.5);
    const amp = this.wingBeat ? 0.9 : (this.bossState === 'perch' ? 0.15 : 0.55);
    this.wingBeat = 0;
    const flap = Math.sin(this.walkPhase) * amp;
    if(this.wingPivots){ this.wingPivots[0].rotation.z = flap; this.wingPivots[1].rotation.z = -flap; }
    this.group.rotation.x = lerp(this.group.rotation.x || 0, this.pitch || 0, Math.min(1, dt * 6));
    if(this.headPart){ this.headLunge = Math.max(0, (this.headLunge || 0) - dt * 3); this.headPart.rotation.x = -this.headLunge; }
    if(locked && Math.random() < dt * 6) this.setTint(0x44225a);
    else if(!locked && this.hurtFlash <= 0) this.setTint(null);
  }
  _bossBreath(world, tgt){
    SFX.play('fuse');
    const gx = tgt.x, gz = tgt.z, gy = Math.round(tgt.y);
    if(!this.breathZones) this.breathZones = [];
    this.breathZones.push({ x: gx, y: gy, z: gz, t: 5 + this.phase, r: 3.2 });
    for(let i = 0; i < 22; i++){ const a = Math.random() * 6.283, rr = Math.random() * 3.2;
      Particles.spawn(gx + Math.cos(a) * rr, gy + 0.3, gz + Math.sin(a) * rr, 0xc84af0, 1, 1, 1.2, 1.5); }
  }
  _bossTickZones(dt, tgt){
    if(!this.breathZones || !this.breathZones.length) return;
    for(let i = this.breathZones.length - 1; i >= 0; i--){
      const z = this.breathZones[i]; z.t -= dt;
      if(z.t <= 0){ this.breathZones.splice(i, 1); continue; }
      if(Math.random() < dt * 14) Particles.spawn(z.x + (Math.random() - 0.5) * z.r * 2, z.y + 0.4, z.z + (Math.random() - 0.5) * z.r * 2, 0xc84af0, 1, 0.6, 0.8, 1.2);
      if(!tgt.dead){ const d = Math.hypot(tgt.x - z.x, tgt.z - z.z);
        if(d < z.r && Math.abs(tgt.y - z.y) < 2){ z.dmgT = (z.dmgT || 0) - dt; if(z.dmgT <= 0){ z.dmgT = 0.6; tgt.hurt(3, 0, 0); } } }
    }
  }
  _bossSummonAdds(world){
    if(this.addsSpawned) return; this.addsSpawned = true;
    for(let i = 0; i < 3; i++){
      const a = i / 3 * 6.283, ex = Math.cos(a) * 12, ez = Math.sin(a) * 12, ey = (world.colTop(ex, ez) || 32) + 1;
      if(ey <= 2) continue;
      const em = new Mob('enderman', Math.round(ex) + 0.5, ey + 0.1, Math.round(ez) + 0.5);
      em.angry = true; em._bossAdd = true; MobManager.list.push(em); // 보스 졸개 — 디스폰/LOD 면제
      Particles.spawn(ex, ey + 1, ez, 0x8a3ae8, 14, 2.5, 0.6, 1);
    }
    SFX.play('throw');
  }
  _playBossDeath(){
    const b = this.body; SFX.play('faint');
    game.shake = Math.max(game.shake, 0.6);
    const startY = b.y, self = this; let t = 0; const DUR = 4.5;
    this._deathTick = (dt) => {
      t += dt; const k = Math.min(1, t / DUR);
      b.x += Math.cos(t * 4) * 0.06; b.z += Math.sin(t * 4) * 0.06;
      b.y = lerp(startY, ((world.colTop(0, 0) || 32) + 6), k * k);
      self.group.position.set(b.x, b.y, b.z);
      self.group.rotation.y += dt * (2 + t);
      self.group.rotation.x = lerp(self.group.rotation.x || 0, 0.8, dt * 2);
      if(self.wingPivots){ const f = Math.sin(t * 18) * 0.5; self.wingPivots[0].rotation.z = f; self.wingPivots[1].rotation.z = -f; }
      if(Math.random() < dt * 40) Particles.spawn(b.x + (Math.random() - 0.5) * 3, b.y + (Math.random() - 0.5) * 2, b.z + (Math.random() - 0.5) * 3, 0xc84af0, 4, 2, 0.8, 2);
      if(Math.random() < dt * 8) Particles.spawn(b.x, b.y + Math.random() * 6, b.z, 0xffffff, 2, 0.4, 1.2, 4);
      if(t > DUR){
        self._deathTick = null;
        for(let i = 0; i < 8; i++) setTimeout(() => { Particles.spawn(b.x + (Math.random() - 0.5) * 5, b.y + (Math.random() - 0.5) * 4, b.z + (Math.random() - 0.5) * 5, 0xc84af0, 24, 4, 1, 2); SFX.play('boom'); }, i * 90);
        game.shake = Math.max(game.shake, 1.2);
        if(typeof UI !== 'undefined' && UI.bossHide) UI.bossHide();
        self._finishBossDeath();
      }
    };
  }
  _finishBossDeath(){
    this.dead = true;
    // 보스 졸개(엔더맨)도 함께 사라진다
    MobManager.list.slice().forEach(m => { if(m._bossAdd && !m.dead){ m.dead = true; scene.remove(m.group); disposeObject(m.group); } });
    MobManager.list = MobManager.list.filter(m => !m._bossAdd || !m.dead);
    if(typeof dragonDefeated === 'function') dragonDefeated(this);
    if(this.def.drops) this.def.drops.forEach(([id, lo, hi]) => { const n = lo + Math.floor(Math.random() * (hi - lo + 1)); if(n > 0) ItemDrops.spawn(this.body.x, (world.colTop(0, 0) || 32) + 2, this.body.z, id, n); });
    scene.remove(this.group); disposeObject(this.group);
    const i = MobManager.list.indexOf(this); if(i >= 0) MobManager.list.splice(i, 1);
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
    // 👑 보스: 크리스탈 보호막 + 한 방 최대 6% 제한 + 사망은 연출로
    if(this.def.boss){
      if(this._deathSeq) return;
      if(world.crystals && world.crystals.size > 0){
        this.hurtFlash = 0.15; this.setTint(0x884488);
        Particles.spawn(this.body.x, this.body.y + 1, this.body.z, 0xc84af0, 4, 1.5, 0.4, 1);
        if(Math.random() < 0.2) UI.toast('🛡️ 크리스탈이 드래곤을 지키고 있다! 먼저 부수자!', 2000);
        return;
      }
      this.hp -= Math.min(dmg, this.maxHp * 0.06);
      this.hurtFlash = 0.2; this.setTint(0xaa0000);
      if(this.hp <= 0) this.die(true);
      return;
    }
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
    // 👑 보스는 즉사 대신 다단계 사망 연출 후 _finishBossDeath에서 실제 제거
    if(this.def.boss && !this._deathSeq){
      this._deathSeq = true;
      this.hp = 0; this.bossState = 'dead';
      // ⚠ 처치는 죽는 순간 즉시 확정 — 연출 도중 차원이동/사망해도 포탈·보상·플래그 보존 (dragonDefeated는 중복 방지 가드 있음)
      if(typeof dragonDefeated === 'function') dragonDefeated(this);
      if(typeof UI !== 'undefined' && UI.bossSet) UI.bossSet(0, false, this.phase);
      this._playBossDeath();
      return;
    }
    this.dead = true;
    if(this.def.boss && typeof dragonDefeated === 'function') dragonDefeated(this);
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
    // ⚡ 거리 LOD: 멀리 있는 몹은 5Hz로 묶어서 갱신 (보스/길들인/NPC는 항상 풀레이트)
    const _px = player.body.x, _pz = player.body.z;
    const _farD2 = (typeof game !== 'undefined' && game.perfMode) ? 900 : 1600;
    // 안개 너머 엔티티는 렌더하지 않는다 (드로우콜 절약)
    const _cull = (world.renderDist * 16 + 8); const _cullD2 = _cull * _cull;
    for(const m of this.list.slice()){
      const _vdx = m.body.x - _px, _vdz = m.body.z - _pz, _vd2 = _vdx * _vdx + _vdz * _vdz;
      if(m.group) m.group.visible = _vd2 < _cullD2;
      if(m.def.boss || m.tamed || m.def.npc || m._bossAdd){ m.update(dt, world, player); continue; }
      const _ddx = m.body.x - _px, _ddz = m.body.z - _pz;
      if(_ddx * _ddx + _ddz * _ddz > _farD2){
        m._lodAcc = (m._lodAcc || 0) + dt;
        if(m._lodAcc < 0.2) continue;
        const used = Math.min(m._lodAcc, 0.1); m.update(used, world, player); m._lodAcc -= used; // 누적 시간 보존(반토막 방지)
      } else m.update(dt, world, player);
    }
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
      if(m.def.npc || m.tamed || m.def.boss || m._bossAdd) continue; // 보스 졸개는 거리로 디스폰 안 됨
      if(m.body.y < -20 || dist3(m.body.x, m.body.y, m.body.z, player.body.x, player.body.y, player.body.z) > 90){
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
      if(this.count(false) < (game.perfMode ? 6 : 10)) this.trySpawn(false, world, player);
    }
    this.hostileTimer -= dt;
    if(this.hostileTimer <= 0){
      this.hostileTimer = 3;
      if((game.isNight() || world.dim !== 'over') && this.count(true) < (game.perfMode ? 7 : 12)) this.trySpawn(true, world, player);
    }
    // 구조물 NPC 유지 (주민/관장/가디언)
    this.npcTimer = (this.npcTimer === undefined ? 1 : this.npcTimer) - dt;
    if(this.npcTimer <= 0){
      this.npcTimer = 5;
      const px = player.body.x, pz = player.body.z;
      if(world.dim === 'end'){
        if(!world.flags.dragonDead && !this.list.some(x => x.type === 'dragon')){
          this.list.push(new Mob('dragon', 0.5, 46, 0.5));
          UI.toast('💀 엔더드래곤이 나타났다!! 기둥 위 크리스탈을 먼저 부수자!', 6000);
          SFX.play('fuse');
        }
        return;
      }
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
      // 💀 로켓단 출몰 이벤트 (희귀하게)
      if(PokeMan.enabled && PokeMan.party.length && !this.list.some(x => x.type === 'rocket') && Math.random() < 0.02){
        const ra = Math.random() * Math.PI * 2;
        const rx2 = px + Math.sin(ra) * 24, rz2 = pz + Math.cos(ra) * 24;
        const ry2 = world.colTop(rx2, rz2) + 1.1;
        if(ry2 > SEA + 2){
          const rk = new Mob('rocket', rx2, ry2, rz2);
          if(Math.random() < 0.15){ rk.rocketBoss = true; rk.setTag('💀 로켓단 간부'); }
          this.list.push(rk);
          UI.toast('💀 로켓단이 나타났다!! 이쪽으로 다가온다...', 4500);
          SFX.play('fuse');
        }
      }
      // 🎒 교환 상인: 가끔 찾아온다
      if(PokeMan.enabled && PokeMan.party.length && !this.list.some(x => x.type === 'trademan') && Math.random() < 0.05){
        const ma = Math.random() * Math.PI * 2;
        const mx2 = px + Math.sin(ma) * 20, mz2 = pz + Math.cos(ma) * 20;
        const my2 = world.colTop(mx2, mz2) + 1.1;
        if(my2 > SEA + 2){
          const tm = new Mob('trademan', mx2, my2, mz2);
          tm._life = 180;
          if(typeof TradeNPC !== 'undefined') TradeNPC.makeOffer(tm);
          this.list.push(tm);
          UI.toast('🎒 교환 상인이 찾아왔다! 좋은 포켓몬을 갖고 있을지도?', 5000);
          SFX.play('pop');
        }
      }
      // 떠돌이 트레이너: 주변에 1명 유지
      if(PokeMan.enabled && PokeMan.party.length && !this.list.some(x => x.type === 'trainer') && Math.random() < 0.35){
        const ta = Math.random() * Math.PI * 2;
        const tx = px + Math.sin(ta) * 26, tz = pz + Math.cos(ta) * 26;
        const ty = world.colTop(tx, tz) + 1.1;
        if(ty > SEA + 2) this.list.push(new Mob('trainer', tx, ty, tz));
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
        // 🤖 마을마다 아이언골렘 수호자 1마리
        if(!this.list.some(m => m.golemHome === v.key)){
          const gx = v.x + 4, gz = v.z + 4, gy = world.colTop(gx, gz) + 1.4;
          if(gy > SEA + 1){ const gm = new Mob('iron_golem', gx, gy, gz); gm.golemHome = v.key; this.list.push(gm); }
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
      // 엔드: 엔더맨만
      if(world.dim === 'end'){
        if(!hostile) return;
        const ey = world.colTop(x, z) + 1;
        if(ey <= 2 || !BLOCKS[world.getBlock(x, ey - 1, z)].solid) continue;
        this.list.push(new Mob('enderman', Math.floor(x) + 0.5, ey + 0.1, Math.floor(z) + 0.5));
        return;
      }
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
      if(y <= SEA + 1){
        // 🌊 깊은 물(3블록 이상): 가디언 수중 스폰
        if(hostile && world.getBlock(x, SEA - 1, z) === B.WATER && world.getBlock(x, SEA - 3, z) === B.WATER){
          this.list.push(new Mob('guardian', Math.floor(x) + 0.5, SEA - 1.5, Math.floor(z) + 0.5));
          return;
        }
        continue;
      }
      if(y >= WORLD_H - 2) continue;
      const ground = world.getBlock(x, y - 1, z);
      if(!BLOCKS[ground].solid || ground === B.WATER || ground === B.LEAVES || ground === B.BIRCH_LEAVES) continue;
      if(world.getBlock(x, y, z) !== B.AIR) continue;
      let type;
      if(hostile){
        const r = Math.random();
        type = r < 0.26 ? 'zombie' : r < 0.48 ? 'skeleton' : r < 0.62 ? 'creeper' : r < 0.76 ? 'spider' : r < 0.84 ? 'slime'
          : r < 0.90 ? 'witch' : r < 0.96 ? 'phantom' : 'enderman'; // 🧙🦇 마녀·팬텀 추가
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
