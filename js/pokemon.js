// ===== pokemon.js : 포켓몬 데이터, 모델, 야생 스폰, 포획, 배틀 =====
'use strict';

// ---------- 타입 ----------
const TYPES = {
  normal:  { n:'노말',   c:'#9b9b7a' },
  fire:    { n:'불꽃',   c:'#e8633a' },
  water:   { n:'물',     c:'#5a8fdd' },
  grass:   { n:'풀',     c:'#6cbb3c' },
  electric:{ n:'전기',   c:'#e8b820' },
  flying:  { n:'비행',   c:'#a890f0' },
  bug:     { n:'벌레',   c:'#a8b820' },
  rock:    { n:'바위',   c:'#b8a038' },
  ground:  { n:'땅',     c:'#c0a048' },
  psychic: { n:'에스퍼', c:'#f85888' },
  fairy:   { n:'페어리', c:'#ee99ac' },
  ice:     { n:'얼음',   c:'#78c8d0' },
  poison:  { n:'독',     c:'#a040a0' },
  fighting:{ n:'격투',   c:'#c03028' },
  ghost:   { n:'고스트', c:'#705898' },
  dragon:  { n:'드래곤', c:'#7038f8' },
};
const TYPE_CHART = {
  normal:  { rock:0.5, ghost:0 },
  fire:    { grass:2, ice:2, bug:2, water:0.5, fire:0.5, rock:0.5, dragon:0.5 },
  water:   { fire:2, rock:2, ground:2, water:0.5, grass:0.5, dragon:0.5 },
  grass:   { water:2, rock:2, ground:2, fire:0.5, grass:0.5, flying:0.5, bug:0.5, poison:0.5, dragon:0.5 },
  electric:{ water:2, flying:2, grass:0.5, electric:0.5, ground:0, dragon:0.5 },
  flying:  { grass:2, bug:2, fighting:2, electric:0.5, rock:0.5 },
  bug:     { grass:2, psychic:2, fire:0.5, flying:0.5, poison:0.5, fairy:0.5, fighting:0.5, ghost:0.5 },
  rock:    { fire:2, ice:2, flying:2, bug:2, ground:0.5, fighting:0.5 },
  ground:  { fire:2, electric:2, rock:2, poison:2, grass:0.5, bug:0.5, flying:0 },
  psychic: { poison:2, fighting:2, psychic:0.5 },
  fairy:   { fighting:2, dragon:2, poison:0.5, fire:0.5 },
  ice:     { grass:2, ground:2, flying:2, dragon:2, fire:0.5, water:0.5, ice:0.5 },
  poison:  { grass:2, fairy:2, poison:0.5, rock:0.5, ground:0.5, ghost:0.5 },
  fighting:{ normal:2, rock:2, ice:2, flying:0.5, poison:0.5, bug:0.5, psychic:0.5, fairy:0.5, ghost:0 },
  ghost:   { ghost:2, psychic:2, normal:0 },
  dragon:  { dragon:2, fairy:0 },
};
function typeMult(moveType, defTypes){
  let m = 1;
  defTypes.forEach(t => {
    const row = TYPE_CHART[moveType];
    if(row && row[t] !== undefined) m *= row[t];
  });
  return m;
}

// ---------- 기술 ----------
const MOVES = {
  tackle:      { n:'몸통박치기',   t:'normal',  p:40,  a:100 },
  scratch:     { n:'할퀴기',       t:'normal',  p:40,  a:100 },
  quick:       { n:'전광석화',     t:'normal',  p:40,  a:100, prio:1 },
  headbutt:    { n:'박치기',       t:'normal',  p:70,  a:100 },
  bodyslam:    { n:'깔아뭉개기',   t:'normal',  p:85,  a:100 },
  bite:        { n:'깨물기',       t:'normal',  p:60,  a:100 },
  ember:       { n:'불꽃세례',     t:'fire',    p:40,  a:100 },
  flamethrower:{ n:'화염방사',     t:'fire',    p:90,  a:100 },
  fireblast:   { n:'불대문자',     t:'fire',    p:110, a:85 },
  watergun:    { n:'물대포',       t:'water',   p:40,  a:100 },
  surf:        { n:'파도타기',     t:'water',   p:90,  a:100 },
  hydropump:   { n:'하이드로펌프', t:'water',   p:110, a:80 },
  vinewhip:    { n:'덩굴채찍',     t:'grass',   p:45,  a:100 },
  razorleaf:   { n:'잎날가르기',   t:'grass',   p:55,  a:95 },
  solarbeam:   { n:'솔라빔',       t:'grass',   p:120, a:100 },
  thundershock:{ n:'전기쇼크',     t:'electric',p:40,  a:100 },
  spark:       { n:'스파크',       t:'electric',p:65,  a:100 },
  thunderbolt: { n:'10만볼트',     t:'electric',p:90,  a:100 },
  thunder:     { n:'번개',         t:'electric',p:110, a:70 },
  gust:        { n:'바람일으키기', t:'flying',  p:40,  a:100 },
  wingattack:  { n:'날개치기',     t:'flying',  p:60,  a:100 },
  drill:       { n:'회전부리',     t:'flying',  p:80,  a:100 },
  bugbite:     { n:'벌레먹기',     t:'bug',     p:60,  a:100 },
  confusion:   { n:'염동력',       t:'psychic', p:50,  a:100 },
  psychic:     { n:'사이코키네시스',t:'psychic', p:90, a:100 },
  rockthrow:   { n:'바위던지기',   t:'rock',    p:50,  a:90 },
  rockslide:   { n:'스톤샤워',     t:'rock',    p:75,  a:90 },
  earthquake:  { n:'지진',         t:'ground',  p:100, a:100 },
  icywind:     { n:'얼다바람',     t:'ice',     p:55,  a:95 },
  icebeam:     { n:'냉동빔',       t:'ice',     p:90,  a:100 },
  fairywind:   { n:'요정의바람',   t:'fairy',   p:40,  a:100 },
  moonblast:   { n:'문포스',       t:'fairy',   p:95,  a:100 },
  splash:      { n:'튀어오르기',   t:'normal',  p:0,   a:100 },
  blizzard:    { n:'눈보라',       t:'ice',     p:110, a:70 },
  psystrike:   { n:'사이코브레이크', t:'psychic', p:100, a:100 },
  firewheel:   { n:'불꽃바퀴',     t:'fire',    p:60,  a:100 },
  bubblebeam:  { n:'거품광선',     t:'water',   p:65,  a:100 },
  megadrain:   { n:'메가드레인',   t:'grass',   p:65,  a:100 },
  pinmissile:  { n:'미사일바늘',   t:'bug',     p:50,  a:95 },
  megahorn:    { n:'메가혼',       t:'bug',     p:120, a:85 },
  stoneedge:   { n:'스톤에지',     t:'rock',    p:100, a:80 },
  mudshot:     { n:'머드샷',       t:'ground',  p:55,  a:95 },
  dig:         { n:'구멍파기',     t:'ground',  p:80,  a:100 },
  dazzling:    { n:'매지컬샤인',   t:'fairy',   p:80,  a:100 },
  poisonsting: { n:'독침',         t:'poison',  p:35,  a:100 },
  sludge:      { n:'오물공격',     t:'poison',  p:65,  a:100 },
  sludgebomb:  { n:'오물폭탄',     t:'poison',  p:90,  a:100 },
  karatechop:  { n:'가라테촙',     t:'fighting',p:50,  a:100 },
  brickbreak:  { n:'깨트리기',     t:'fighting',p:75,  a:100 },
  closecombat: { n:'인파이트',     t:'fighting',p:110, a:95 },
  lick:        { n:'핥기',         t:'ghost',   p:30,  a:100 },
  shadowpunch: { n:'섀도펀치',     t:'ghost',   p:60,  a:100 },
  shadowball:  { n:'섀도볼',       t:'ghost',   p:80,  a:100 },
  dragonbreath:{ n:'용의숨결',     t:'dragon',  p:60,  a:100 },
  dragonclaw:  { n:'드래곤클로',   t:'dragon',  p:80,  a:100 },
  outrage:     { n:'역린',         t:'dragon',  p:110, a:90 },
};

// ---------- 추가 모델 빌더 ----------
function buildBlob(o){
  const g = new THREE.Group();
  const s = o.s || 0.7;
  const body = makeBox(g, s, s * 0.95, s * 0.9, o.body, 0, 0.12 + s * 0.48, 0);
  addEyes(body, s, s * 0.9, o.eyeC, o.pupilC);
  const legs = [];
  if(o.feet !== false){
    legs.push(makeLeg(g, s * 0.22, 0.14, o.feetC || o.body, -s * 0.25, 0.14, 0));
    legs.push(makeLeg(g, s * 0.22, 0.14, o.feetC || o.body,  s * 0.25, 0.14, 0));
  }
  return { group: g, legs, head: body, body };
}
function buildFloat(o){
  const g = new THREE.Group();
  const s = o.s || 0.5;
  const body = makeBox(g, s, s, s * 0.85, o.body, 0, 0.9, 0);
  addEyes(body, s, s * 0.85);
  return { group: g, legs: [], head: body, body, hover: true };
}
function buildSerpent(o){
  const g = new THREE.Group();
  const s = o.segSize || 0.35, n = o.segs || 4;
  const segs = [];
  for(let i = 0; i < n; i++){
    const sz = s * (1 - i * 0.06);
    segs.push(makeBox(g, sz, sz, sz, o.body, 0, s / 2 + 0.02 + (o.rise ? i * s * 0.12 : 0), -i * s * 0.92));
  }
  const head = makeBox(g, s * 1.15, s * 1.15, s * 1.15, o.headC || o.body, 0, s * 0.65 + (o.rise ? n * s * 0.1 : 0), s * 0.85);
  addEyes(head, s * 1.15, s * 1.15);
  return { group: g, legs: [], head, body: segs[0], segs };
}

// ---------- 포켓몬 종 데이터 (1세대 151종 전국도감) ----------
const SPECIES = [null];

// 타입별 공격기 풀 (위력 오름차순) — 자동 학습기 생성용
const TYPE_MOVES = {};
(function(){
  for(const k in MOVES){
    const mv = MOVES[k];
    if(mv.p <= 0) continue;
    (TYPE_MOVES[mv.t] || (TYPE_MOVES[mv.t] = [])).push(k);
  }
  for(const t in TYPE_MOVES) TYPE_MOVES[t].sort((a, b) => MOVES[a].p - MOVES[b].p);
})();

function autoLearn(types){
  const t1 = TYPE_MOVES[types[0]] || [];
  const t2 = types[1] ? (TYPE_MOVES[types[1]] || []) : [];
  const pick = (arr, i, fb) => arr[Math.min(i, arr.length - 1)] || fb;
  const ls = [];
  // 1레벨부터 기술 2개 (기본기 + 타입기)
  ls.push([1, types[0] === 'normal' ? 'quick' : 'tackle']);
  ls.push([1, t1[0] || 'scratch']);
  ls.push([7, pick(t1, 1, 'quick')]);
  ls.push([13, t2.length ? pick(t2, Math.min(1, t2.length - 1), 'headbutt') : 'headbutt']);
  ls.push([20, pick(t1, t1.length >= 3 ? 2 : 1, 'bodyslam')]);
  ls.push([28, t2.length >= 3 ? t2[2] : 'bodyslam']);
  ls.push([36, t1[t1.length - 1] || 'bodyslam']);
  // 중복 제거
  const out = [];
  const seen = new Set();
  ls.forEach(([lv, k]) => { if(!seen.has(k)){ seen.add(k); out.push([lv, k]); } });
  return out;
}

// 폼 코드: q=네발 b=이족 B=새 o=덩어리 f=부유 s=뱀
function autoModel(form, s, c1, c2, types){
  const F = { q:'quad', b:'biped', B:'bird', o:'blob', f:'float', s:'serpent' };
  const o = { body: c1 };
  if(form === 'q'){ Object.assign(o, { hs:0.5, bh:0.45, bd:0.75, legH:0.24, ears:c2 }); }
  else if(form === 'b'){ Object.assign(o, { headC:c1, legH:0.32, bh:0.55, bw:0.46, armW:0.13 }); }
  else if(form === 'B'){ Object.assign(o, { headC:c1, wingC:c2, bh:0.42, bd:0.55 }); }
  else if(form === 'o'){ Object.assign(o, { s:0.75 }); }
  else if(form === 'f'){ Object.assign(o, { s:0.5 }); }
  else if(form === 's'){ Object.assign(o, { headC:c1, segs:4, segSize:0.4 }); }
  const deco = m => {
    const g = m.group;
    // 타입별 자동 장식 (보조색 c2 사용)
    if(types.includes('fire')) makeBox(g, 0.16, 0.24, 0.16, '#ffce3d', 0, 0.7, -0.45);
    if(types.includes('water') && form !== 's') makeBox(g, 0.08, 0.22, 0.3, c2, 0, 0.6, -0.4);
    if(types.includes('grass')) makeBox(m.head || g, 0.3, 0.1, 0.3, '#3e8a2e', 0, (m.head ? 0.3 : 0.9), 0);
    if(types.includes('electric')) makeBox(g, 0.2, 0.2, 0.07, '#f5d327', 0.1, 0.55, -0.4);
    if(types.includes('ice')) makeBox(m.head || g, 0.12, 0.22, 0.12, '#bfeaf5', 0, (m.head ? 0.32 : 0.95), 0);
    if(types.includes('rock') || types.includes('ground')) makeBox(g, 0.34, 0.18, 0.34, '#8d9296', 0, 0.78, -0.1);
    if(types.includes('poison')){ makeBox(g, 0.12, 0.12, 0.05, c2, -0.15, 0.55, 0.3); makeBox(g, 0.1, 0.1, 0.05, c2, 0.18, 0.42, 0.3); }
    if(types.includes('psychic')) makeBox(m.head || g, 0.1, 0.1, 0.06, '#f85888', 0, (m.head ? 0.18 : 0.8), (m.head ? 0.28 : 0.3));
    if(types.includes('bug') && m.head){ makeBox(m.head, 0.05, 0.22, 0.05, c2, -0.12, 0.32, 0); makeBox(m.head, 0.05, 0.22, 0.05, c2, 0.12, 0.32, 0); }
    if(types.includes('ghost')) { /* 부유감은 폼으로 충분 */ }
    if(types.includes('dragon') && m.head){ makeBox(m.head, 0.08, 0.2, 0.08, c2, -0.16, 0.3, -0.05); makeBox(m.head, 0.08, 0.2, 0.08, c2, 0.16, 0.3, -0.05); }
    if(types.includes('flying') && form !== 'B'){
      makeBox(g, 0.06, 0.3, 0.45, c2, -0.35, 0.7, -0.1);
      makeBox(g, 0.06, 0.3, 0.45, c2, 0.35, 0.7, -0.1);
    }
    if(types.includes('fighting') && m.head) makeBox(m.head, 0.26, 0.08, 0.26, c2, 0, 0.3, 0);
    if(types.includes('fairy') && m.head) makeBox(m.head, 0.1, 0.16, 0.1, '#ffffff', 0.2, 0.3, 0);
  };
  return { form: F[form], s, o, deco };
}

// [이름, 타입, hp, 공, 방, 속, 포획률, 진화Lv, 진화→, 폼, 크기, 색1, 색2, 스폰(p평원 f숲 d사막 m산 s설원 w물), 희귀도1~5]
const DEX = {
1:['이상해씨','grass,poison',45,49,49,45,45,16,2,'q',.5,'#5ac08c','#2e8b4f','f',2],
2:['이상해풀','grass,poison',60,62,63,60,45,32,3,'q',.72,'#4aae84','#d65d8e','f',3],
3:['이상해꽃','grass,poison',80,82,83,80,45,0,0,'q',1,'#3f9e78','#e84d60','f',4],
4:['파이리','fire',39,52,43,65,45,16,5,'b',.5,'#f5933c','#ffce3d','d,m',2],
5:['리자드','fire',58,64,58,80,45,36,6,'b',.75,'#e85f3a','#ffce3d','m',3],
6:['리자몽','fire,flying',78,84,78,100,45,0,0,'b',1.1,'#e8773a','#3a8fa8','m',4],
7:['꼬부기','water',44,48,65,43,45,16,8,'b',.5,'#7ec8e8','#b98a4a','w',2],
8:['어니부기','water',59,63,80,58,45,36,9,'b',.75,'#9bb7d4','#a87a3e','w',3],
9:['거북왕','water',79,83,100,78,45,0,0,'b',1.05,'#5a8fc0','#8a7a5a','w',4],
10:['캐터피','bug',45,30,35,45,255,7,11,'s',.45,'#7ac74c','#e84d3a','f',1],
11:['단데기','bug',50,20,55,30,120,10,12,'o',.55,'#c9b94e','#a89a3e','f',2],
12:['버터플','bug,flying',60,45,50,70,45,0,0,'B',.7,'#7a6fc0','#f0f0f8','f',3],
13:['뿔충이','bug,poison',40,35,30,50,255,7,14,'s',.45,'#c8a060','#e8e8e8','f',1],
14:['딱충이','bug,poison',45,25,50,35,120,10,15,'o',.55,'#e8d44a','#c8b43a','f',2],
15:['독침붕','bug,poison',65,90,40,75,45,0,0,'B',.75,'#f0d048','#3a3a3a','f',3],
16:['구구','normal,flying',40,45,40,56,255,18,17,'B',.5,'#c0a070','#a08050','p,f',1],
17:['피죤','normal,flying',63,60,55,71,120,36,18,'B',.7,'#c0a070','#987848','p,f',3],
18:['피죤투','normal,flying',83,80,75,101,45,0,0,'B',.85,'#b89868','#907040','p',4],
19:['꼬렛','normal',30,56,35,72,255,20,20,'q',.45,'#9265ab','#7a4f93','p,f,d',1],
20:['레트라','normal',55,81,60,97,127,0,0,'q',.62,'#b59a64','#9a7f4c','p',3],
21:['깨비참','normal,flying',40,60,30,70,255,20,22,'B',.45,'#b06858','#8a4a3a','p,m,d',1],
22:['깨비드릴조','normal,flying',65,90,65,100,90,0,0,'B',.8,'#b06858','#e8c8a8','m,d',3],
23:['아보','poison',35,60,44,55,255,22,24,'s',.6,'#b06ad0','#e8c83a','f,d',2],
24:['아보크','poison',60,85,69,80,90,0,0,'s',1,'#9a55c0','#e8c83a','d',3],
25:['피카츄','electric',35,55,40,90,190,30,26,'b',.5,'#f7d02c','#e84d3a','p,f',2],
26:['라이츄','electric',60,90,55,110,75,0,0,'b',.65,'#f5a623','#f5d327','p',4],
27:['모래두지','ground',50,75,85,40,255,22,28,'q',.5,'#d8c060','#b89840','d',2],
28:['고지','ground',75,100,110,65,90,0,0,'q',.75,'#c8a850','#e8d8a8','d',3],
29:['니드런♀','poison',55,47,52,41,235,16,30,'q',.45,'#88a8d8','#6888b8','p,f',2],
30:['니드리나','poison',70,62,67,56,120,32,31,'q',.7,'#7898c8','#5878a8','f',3],
31:['니드퀸','poison,ground',90,92,87,76,45,0,0,'b',1,'#6888b8','#c8d8e8','f',4],
32:['니드런♂','poison',46,57,40,50,235,16,33,'q',.45,'#b888d8','#9868b8','p,f',2],
33:['니드리노','poison',61,72,57,65,120,32,34,'q',.7,'#a878c8','#8858a8','f',3],
34:['니드킹','poison,ground',81,102,77,85,45,0,0,'b',1,'#9868b8','#c8a8d8','f',4],
35:['삐삐','fairy',70,45,48,35,150,28,36,'b',.5,'#f8c8d8','#e8a8b8','m,p',2],
36:['픽시','fairy',95,70,73,60,25,0,0,'b',.7,'#f8c8d8','#ffffff','m',4],
37:['식스테일','fire',38,41,40,65,190,30,38,'q',.5,'#e8a050','#f8d8a8','m,d',2],
38:['나인테일','fire',73,76,75,100,75,0,0,'q',.8,'#f0c878','#f8e8c8','m',4],
39:['푸린','fairy,normal',115,45,20,20,170,30,40,'o',.5,'#f9aec5','#f0a0b8','p',2],
40:['푸크린','fairy,normal',140,70,45,45,50,0,0,'o',.7,'#f9aec5','#ffffff','p',4],
41:['주뱃','poison,flying',40,45,35,55,255,22,42,'B',.45,'#6878c8','#8898d8','m,f',1],
42:['골뱃','poison,flying',75,80,70,90,90,0,0,'B',.8,'#5868b8','#e8a8c8','m',3],
43:['뚜벅쵸','grass,poison',45,50,55,30,255,21,44,'o',.45,'#4878b8','#58a838','f',1],
44:['냄새꼬','grass,poison',60,65,70,40,120,36,45,'o',.6,'#4878b8','#e85f3a','f',3],
45:['라플레시아','grass,poison',75,80,85,50,45,0,0,'b',.8,'#4878b8','#e84d60','f',4],
46:['파라스','bug,grass',35,70,55,25,190,24,47,'q',.45,'#e87858','#e8a050','f',2],
47:['파라섹트','bug,grass',60,95,80,30,75,0,0,'q',.7,'#e87858','#e8c8a8','f',3],
48:['콘팡','bug,poison',60,55,50,45,190,31,49,'b',.55,'#a880c8','#e8e8e8','f',2],
49:['도나리','bug,poison',70,65,60,90,75,0,0,'B',.8,'#a880c8','#c8e8f0','f',3],
50:['디그다','ground',10,55,25,95,255,26,51,'o',.35,'#b08858','#f0c8b8','d,p',2],
51:['닥트리오','ground',35,80,50,120,50,0,0,'o',.5,'#b08858','#f0c8b8','d',3],
52:['나옹','normal',40,45,35,90,255,28,53,'q',.45,'#e8d8a8','#c8a850','p',2],
53:['페르시온','normal',65,70,60,115,90,0,0,'q',.7,'#e8d8a8','#e84d3a','p',3],
54:['고라파덕','water',50,52,48,55,190,33,55,'b',.55,'#f3c63f','#e8d8a8','w',2],
55:['골덕','water',80,82,78,85,75,0,0,'b',.8,'#5b9bd5','#e84d3a','w',3],
56:['망키','fighting',40,80,35,70,190,28,57,'b',.5,'#d8c8b8','#b89888','m,f',2],
57:['성원숭','fighting',65,105,60,95,75,0,0,'b',.75,'#d8c8b8','#e85f3a','m',3],
58:['가디','fire',55,70,45,60,190,32,59,'q',.55,'#f09048','#f8d8a8','p,m',2],
59:['윈디','fire',90,110,80,95,75,0,0,'q',.95,'#f09048','#f8e8c8','m',4],
60:['발챙이','water',40,50,40,90,255,25,61,'o',.45,'#6890d0','#f0f0f0','w',1],
61:['슈륙챙이','water',65,65,65,90,120,36,62,'b',.65,'#6890d0','#f0f0f0','w',3],
62:['강챙이','water,fighting',90,95,95,70,45,0,0,'b',.9,'#5880c0','#f0f0f0','w',4],
63:['캐이시','psychic',25,20,15,90,200,16,64,'b',.5,'#e8c860','#b89848','p,f',2],
64:['윤겔라','psychic',40,35,30,105,100,38,65,'b',.7,'#e8c860','#b88858','f',3],
65:['후딘','psychic',55,50,45,120,50,0,0,'b',.85,'#e8c860','#b88858','f',4],
66:['알통몬','fighting',70,80,50,35,180,28,67,'b',.6,'#b8a8a0','#988878','m',2],
67:['근육몬','fighting',80,100,70,45,90,40,68,'b',.8,'#b8a8a0','#686058','m',3],
68:['괴력몬','fighting',90,130,80,55,45,0,0,'b',1,'#a89890','#585048','m',4],
69:['모다피','grass,poison',50,75,35,40,255,21,70,'o',.5,'#58b848','#f8d048','f',1],
70:['우츠동','grass,poison',65,90,50,55,120,36,71,'o',.7,'#58b848','#f8d048','f',3],
71:['우츠보트','grass,poison',80,105,65,70,45,0,0,'o',.9,'#48a838','#f8d048','f',4],
72:['왕눈해','water,poison',40,40,35,70,190,30,73,'f',.5,'#58c8e8','#c83a5a','w',2],
73:['독파리','water,poison',80,70,65,100,60,0,0,'f',.8,'#48b8d8','#c83a5a','w',3],
74:['꼬마돌','rock,ground',40,80,100,20,255,25,75,'o',.45,'#909090','#787878','m,d',1],
75:['데구리','rock,ground',55,95,115,35,120,38,76,'o',.7,'#888888','#707070','m',3],
76:['딱구리','rock,ground',80,120,130,45,45,0,0,'o',.95,'#808080','#686868','m',4],
77:['포니타','fire',50,85,55,90,190,40,78,'q',.8,'#f8d8a8','#f06830','p',2],
78:['날쌩마','fire',65,100,70,105,60,0,0,'q',1,'#f8e8c8','#f06830','p',4],
79:['야돈','water,psychic',90,65,65,15,190,37,80,'q',.7,'#e8a0bc','#f5e0d0','w',2],
80:['야도란','water,psychic',95,75,110,30,75,0,0,'q',.95,'#e8a0bc','#c8c8d8','w',3],
81:['코일','electric',25,35,70,45,190,30,82,'f',.5,'#a8b2bc','#d04030','m',2],
82:['레어코일','electric',50,60,95,70,60,0,0,'f',.7,'#a8b2bc','#3a5ac8','m',3],
83:['파오리','normal,flying',52,65,55,60,45,0,0,'B',.55,'#c8a878','#58a838','w,p',3],
84:['두두','normal,flying',35,85,45,75,190,31,85,'B',.6,'#b88858','#d8c8a8','p,d',2],
85:['두트리오','normal,flying',60,110,70,100,45,0,0,'B',.9,'#a87848','#d8c8a8','d',3],
86:['쥬쥬','water',65,45,55,45,190,34,87,'o',.6,'#c8d8e8','#f0f0f0','w,s',2],
87:['쥬레곤','water,ice',90,70,80,70,75,0,0,'o',.9,'#d8e8f0','#f8f8f8','s',3],
88:['질퍽이','poison',80,80,50,25,190,38,89,'o',.55,'#8868a8','#685888','f',2],
89:['질뻐기','poison',105,105,75,50,75,0,0,'o',.85,'#786098','#584878','f',3],
90:['셀러','water',30,65,100,40,190,30,91,'o',.45,'#b8c8d8','#8898b8','w',2],
91:['파르셀','water,ice',50,95,180,70,60,0,0,'o',.7,'#a8b8c8','#e8e8f0','s',3],
92:['고오스','ghost,poison',30,35,30,80,190,25,93,'f',.5,'#6858a8','#9888d8','f,m',2],
93:['고우스트','ghost,poison',45,50,45,95,90,38,94,'f',.7,'#5848a8','#9888d8','m',3],
94:['팬텀','ghost,poison',60,65,60,110,45,0,0,'f',.85,'#5848a8','#e84d60','m',4],
95:['롱스톤','rock,ground',35,45,160,70,45,0,0,'s',1.1,'#8d9296','#7a8084','m,d',3],
96:['슬리프','psychic',60,48,45,42,190,26,97,'b',.65,'#d8c878','#a88858','p',2],
97:['슬리퍼','psychic',85,73,70,67,75,0,0,'b',.9,'#d8c878','#f0f0f0','p',3],
98:['크랩','water',30,105,90,50,225,28,99,'o',.45,'#e87850','#f0e8d8','w',1],
99:['킹크랩','water',55,130,115,75,60,0,0,'o',.75,'#d86840','#f0e8d8','w',3],
100:['찌리리공','electric',40,30,50,100,190,30,101,'o',.4,'#e84848','#f0f0f0','p,m',2],
101:['붐볼','electric',60,50,70,140,60,0,0,'o',.55,'#e84848','#f0f0f0','m',3],
102:['아라리','grass,psychic',60,40,80,40,90,28,103,'o',.5,'#f0a8b8','#f8d8e0','f',2],
103:['나시','grass,psychic',95,95,85,55,45,0,0,'b',.95,'#d8b868','#58a838','f',4],
104:['탕구리','ground',50,50,95,35,190,28,105,'b',.45,'#c8a878','#e8d8b8','d,m',2],
105:['텅구리','ground',60,80,110,45,75,0,0,'b',.65,'#b89868','#e8d8b8','d',3],
106:['시라소몬','fighting',50,120,53,87,45,0,0,'b',.8,'#c8a060','#a88040','m',4],
107:['홍수몬','fighting',50,105,79,76,45,0,0,'b',.8,'#b89058','#e8d8c8','m',4],
108:['내루미','normal',90,55,75,30,45,0,0,'b',.7,'#f0a8b8','#e88098','p',3],
109:['또가스','poison',40,65,95,35,190,35,110,'f',.5,'#a890b8','#787098','m',2],
110:['또도가스','poison',65,90,120,60,60,0,0,'f',.75,'#988098','#686078','m',3],
111:['뿔카노','ground,rock',80,85,95,25,120,42,112,'q',.8,'#b8a090','#988878','d,m',2],
112:['코뿌리','ground,rock',105,130,120,40,60,0,0,'q',1.05,'#a89888','#888070','d',4],
113:['럭키','normal',250,5,5,50,30,0,0,'o',.8,'#f8c8d8','#f0f0f0','p',4],
114:['덩쿠리','grass',65,55,115,60,45,0,0,'o',.6,'#3878b8','#e85f3a','f',3],
115:['캥카','normal',105,95,80,90,45,0,0,'b',.95,'#b88868','#e8d8b8','p,d',4],
116:['쏘드라','water',30,40,70,60,225,32,117,'s',.4,'#88b8e8','#f8d8a8','w',2],
117:['시드라','water',55,65,95,85,75,0,0,'s',.6,'#6898d8','#f8d8a8','w',3],
118:['콘치','water',45,67,60,63,225,33,119,'o',.5,'#f0a048','#f0f0f0','w',1],
119:['왕콘치','water',80,92,65,68,60,0,0,'o',.8,'#e89038','#f0f0f0','w',3],
120:['별가사리','water',30,45,55,85,225,30,121,'f',.5,'#b88858','#e8c848','w',2],
121:['아쿠스타','water,psychic',60,75,85,115,60,0,0,'f',.7,'#a878b8','#e8c848','w',3],
122:['마임맨','psychic,fairy',40,45,65,90,45,0,0,'b',.7,'#e8a8c8','#f0f0f0','p',3],
123:['스라크','bug,flying',70,110,80,105,45,0,0,'b',.85,'#78c858','#e8e8e8','f',4],
124:['루주라','ice,psychic',65,50,35,95,45,0,0,'b',.8,'#e88098','#f8d048','s',3],
125:['에레브','electric',65,83,57,105,45,0,0,'b',.8,'#f8d048','#2a2a2a','m,p',3],
126:['마그마','fire',65,95,57,93,45,0,0,'b',.8,'#f08048','#f8d048','d,m',3],
127:['쁘사이저','bug',65,125,100,85,45,0,0,'b',.85,'#a87848','#e8e8e8','f',4],
128:['켄타로스','normal',75,100,95,110,45,0,0,'q',.95,'#a87848','#787058','p',3],
129:['잉어킹','water',20,10,55,80,255,20,130,'o',.55,'#e8843a','#f5e9c8','w',1],
130:['갸라도스','water,flying',95,125,79,81,45,0,0,'s',1.15,'#3a6ed8','#f5e9c8','w',4],
131:['라프라스','water,ice',130,85,80,60,45,0,0,'q',1.05,'#5a8fc0','#8a7a6a','w,s',4],
132:['메타몽','normal',48,48,48,48,35,0,0,'o',.5,'#c8a8d8','#b898c8','p,m',4],
133:['이브이','normal',55,55,50,55,45,25,'eevee','q',.5,'#a5683f','#f0e0c0','p,f',3],
134:['샤미드','water',130,65,60,65,45,0,0,'q',.62,'#6bb2e2','#f0f0f0','w',4],
135:['쥬피썬더','electric',65,65,60,130,45,0,0,'q',.62,'#efd14a','#fce88a','p',4],
136:['부스터','fire',65,130,60,65,45,0,0,'q',.62,'#e06438','#f8e8b0','d',4],
137:['폴리곤','normal',65,60,70,40,45,0,0,'f',.6,'#e87898','#58c8e8','p',4],
138:['암나이트','rock,water',35,40,100,35,45,40,139,'f',.45,'#88b8d8','#c8b890','w',3],
139:['암스타','rock,water',70,60,125,55,45,0,0,'f',.7,'#78a8c8','#c8b890','w',4],
140:['투구','rock,water',30,80,90,55,45,40,141,'o',.45,'#b89058','#684828','w',3],
141:['투구푸스','rock,water',60,115,105,80,45,0,0,'o',.7,'#a88048','#684828','w',4],
142:['프테라','rock,flying',80,105,65,130,45,0,0,'B',1,'#b8a8c8','#8878a8','m',4],
143:['잠만보','normal',160,110,65,30,25,0,0,'b',1.15,'#27535e','#f0e0c0','p,m',4],
144:['프리져','ice,flying',90,85,100,85,5,0,0,'B',.95,'#7ad0e8','#aae8f5','s',5],
145:['썬더','electric,flying',90,90,85,100,5,0,0,'B',.95,'#f0c020','#f5dc60','p,m',5],
146:['파이어','fire,flying',90,100,90,90,5,0,0,'B',.95,'#e87030','#ffce3d','d,m',5],
147:['미뇽','dragon',41,64,45,50,45,30,148,'s',.5,'#88a8e8','#f0f0f0','w',3],
148:['신뇽','dragon',61,84,65,70,45,55,149,'s',.8,'#78a8e8','#f0f0f0','w',4],
149:['망나뇽','dragon,flying',91,134,95,80,45,0,0,'b',1.1,'#e8a050','#88c8a8','w',5],
150:['뮤츠','psychic',106,110,90,130,5,0,0,'b',1,'#c8bcd8','#8a5fa8','p,f,d,m,s',5],
151:['뮤','psychic',100,100,100,100,8,0,0,'f',.5,'#f8c8d8','#88c8e8','p,f,d,m,s,w',5],
};

// 디테일 모델 (대표 포켓몬은 손으로 만든 모델 유지)
const DETAIL = {};
DETAIL[1] = { form:'quad', s:0.5, o:{ body:'#5ac08c', hs:0.52, legH:0.22, bh:0.45, bd:0.75, ears:'#4aa87a' },
  deco:m=>{ makeBox(m.group, 0.5, 0.4, 0.5, '#2e8b4f', 0, 0.85, -0.12); } };
DETAIL[2] = { form:'quad', s:0.72, o:{ body:'#4aae84', hs:0.52, legH:0.24, bh:0.5, bd:0.8, ears:'#3a9670' },
  deco:m=>{ makeBox(m.group, 0.55, 0.45, 0.55, '#d65d8e', 0, 0.95, -0.12); makeBox(m.group, 0.3, 0.3, 0.3, '#e88cb0', 0, 1.25, -0.12);
    makeBox(m.group, 0.7, 0.1, 0.7, '#3e8a2e', 0, 0.78, -0.12); } };
DETAIL[3] = { form:'quad', s:1.0, o:{ body:'#3f9e78', hs:0.55, legH:0.28, bh:0.55, bd:0.9, ears:'#358a66' },
  deco:m=>{ makeBox(m.group, 0.85, 0.12, 0.85, '#3e8a2e', 0, 0.95, -0.12);
    makeBox(m.group, 0.6, 0.25, 0.6, '#e84d60', 0, 1.1, -0.12);
    [[-0.35,0],[0.35,0],[0,-0.35],[0,0.35]].forEach(([px,pz])=> makeBox(m.group, 0.3, 0.12, 0.3, '#f58ca0', px, 1.18, -0.12+pz));
    makeBox(m.group, 0.18, 0.3, 0.18, '#f5d327', 0, 1.25, -0.12); } };
DETAIL[4] = { form:'biped', s:0.5, o:{ body:'#f5933c', headC:'#f5a050', legH:0.32, bh:0.55, bw:0.45, armW:0.13 },
  deco:m=>{ makeBox(m.group, 0.35, 0.3, 0.3, '#f8d8a8', 0, 0.62, 0.13);
    makeBox(m.group, 0.14, 0.14, 0.5, '#f5933c', 0, 0.55, -0.4); makeBox(m.group, 0.2, 0.3, 0.2, '#ffce3d', 0, 0.72, -0.62);
    makeBox(m.group, 0.12, 0.18, 0.12, '#ff7b2e', 0, 0.92, -0.62); } };
DETAIL[5] = { form:'biped', s:0.75, o:{ body:'#e85f3a', headC:'#f0744e', legH:0.36, bh:0.6, bw:0.48 },
  deco:m=>{ makeBox(m.group, 0.36, 0.34, 0.3, '#f8d8a8', 0, 0.68, 0.14);
    makeBox(m.group, 0.15, 0.15, 0.55, '#e85f3a', 0, 0.6, -0.42); makeBox(m.group, 0.22, 0.34, 0.22, '#ffce3d', 0, 0.8, -0.66); } };
DETAIL[6] = { form:'biped', s:1.1, o:{ body:'#e8773a', headC:'#f08848', legH:0.4, bh:0.7, bw:0.55 },
  deco:m=>{ makeBox(m.group, 0.42, 0.4, 0.32, '#f8d8a8', 0, 0.75, 0.16);
    makeBox(m.group, 0.16, 0.16, 0.6, '#e8773a', 0, 0.65, -0.45); makeBox(m.group, 0.24, 0.38, 0.24, '#ffce3d', 0, 0.88, -0.72);
    makeBox(m.group, 0.08, 0.6, 0.45, '#3a8fa8', -0.42, 1.15, -0.2); makeBox(m.group, 0.08, 0.6, 0.45, '#3a8fa8', 0.42, 1.15, -0.2); } };
DETAIL[7] = { form:'biped', s:0.5, o:{ body:'#7ec8e8', headC:'#8ed4f0', legH:0.28, bh:0.5, bw:0.45 },
  deco:m=>{ makeBox(m.group, 0.45, 0.45, 0.28, '#b98a4a', 0, 0.55, -0.22);
    makeBox(m.group, 0.34, 0.32, 0.06, '#f5e9c8', 0, 0.55, 0.25);
    makeBox(m.group, 0.15, 0.15, 0.3, '#9adcf5', 0, 0.4, -0.42); } };
DETAIL[8] = { form:'biped', s:0.75, o:{ body:'#9bb7d4', headC:'#a8c4e0', legH:0.32, bh:0.55, bw:0.5 },
  deco:m=>{ makeBox(m.group, 0.5, 0.5, 0.3, '#a87a3e', 0, 0.6, -0.24);
    makeBox(m.group, 0.38, 0.36, 0.06, '#f5e9c8', 0, 0.6, 0.27);
    makeBox(m.head, 0.08, 0.2, 0.08, '#e8eef5', -0.22, 0.3, 0); makeBox(m.head, 0.08, 0.2, 0.08, '#e8eef5', 0.22, 0.3, 0);
    makeBox(m.group, 0.3, 0.25, 0.35, '#e8eef5', 0, 0.45, -0.5); } };
DETAIL[9] = { form:'biped', s:1.05, o:{ body:'#5a8fc0', headC:'#6a9fd0', legH:0.36, bh:0.65, bw:0.6 },
  deco:m=>{ makeBox(m.group, 0.6, 0.6, 0.32, '#8a7a5a', 0, 0.7, -0.28);
    makeBox(m.group, 0.45, 0.42, 0.06, '#f5e9c8', 0, 0.7, 0.32);
    makeBox(m.group, 0.14, 0.14, 0.4, '#d8d8d8', -0.3, 1.0, -0.3); makeBox(m.group, 0.14, 0.14, 0.4, '#d8d8d8', 0.3, 1.0, -0.3); } };
DETAIL[10] = { form:'serpent', s:0.45, o:{ body:'#7ac74c', headC:'#8ad45c', segs:4, segSize:0.36 },
  deco:m=>{ makeBox(m.head, 0.08, 0.25, 0.08, '#e84d3a', -0.1, 0.3, 0); makeBox(m.head, 0.08, 0.25, 0.08, '#e84d3a', 0.1, 0.3, 0); } };
DETAIL[11] = { form:'blob', s:0.55, o:{ body:'#c9b94e', feet:false } };
DETAIL[12] = { form:'bird', s:0.7, o:{ body:'#7a6fc0', headC:'#8a7fd0', wingC:'#f0f0f8', bh:0.45, bd:0.45, legH:0.25, beak:'#7a6fc0' },
  deco:m=>{ m.wings.forEach(w=>{ w.scale.set(1.2, 1.6, 1.6); }); } };
DETAIL[16] = { form:'bird', s:0.5, o:{ body:'#c0a070', headC:'#cbb080', wingC:'#a08050' } };
DETAIL[17] = { form:'bird', s:0.7, o:{ body:'#c0a070', headC:'#cbb080', wingC:'#987848' },
  deco:m=>{ makeBox(m.head, 0.1, 0.25, 0.1, '#e8c060', 0, 0.25, 0.05); } };
DETAIL[18] = { form:'bird', s:0.85, o:{ body:'#b89868', headC:'#c4a878', wingC:'#907040' },
  deco:m=>{ makeBox(m.head, 0.12, 0.3, 0.12, '#e84d3a', 0, 0.28, 0.05); makeBox(m.head, 0.1, 0.22, 0.1, '#f5d327', 0, 0.32, -0.06); } };
DETAIL[19] = { form:'quad', s:0.45, o:{ body:'#9265ab', hs:0.45, bh:0.4, bd:0.65, legH:0.18, ears:'#7a4f93' },
  deco:m=>{ makeBox(m.head, 0.14, 0.12, 0.03, '#f0f0f0', 0, -0.16, 0.24);
    makeBox(m.group, 0.07, 0.07, 0.5, '#c9a0d8', 0, 0.35, -0.55); } };
DETAIL[20] = { form:'quad', s:0.62, o:{ body:'#b59a64', hs:0.5, bh:0.45, bd:0.75, legH:0.22, ears:'#9a7f4c' },
  deco:m=>{ makeBox(m.head, 0.16, 0.14, 0.03, '#f0f0f0', 0, -0.17, 0.27);
    makeBox(m.group, 0.08, 0.08, 0.6, '#d8c098', 0, 0.4, -0.62); } };
DETAIL[25] = { form:'biped', s:0.5, o:{ body:'#f7d02c', headC:'#f7d02c', legH:0.22, bh:0.5, bw:0.45, armW:0.12 },
  deco:m=>{ const e1 = makeBox(m.head, 0.12, 0.4, 0.1, '#f7d02c', -0.18, 0.4, 0); e1.rotation.z = 0.25;
    const e2 = makeBox(m.head, 0.12, 0.4, 0.1, '#f7d02c', 0.18, 0.4, 0); e2.rotation.z = -0.25;
    makeBox(e1, 0.13, 0.14, 0.11, '#222', 0, 0.16, 0); makeBox(e2, 0.13, 0.14, 0.11, '#222', 0, 0.16, 0);
    makeBox(m.head, 0.1, 0.1, 0.03, '#e84d3a', -0.2, -0.08, 0.24); makeBox(m.head, 0.1, 0.1, 0.03, '#e84d3a', 0.2, -0.08, 0.24);
    makeBox(m.group, 0.08, 0.25, 0.08, '#c9971a', 0, 0.45, -0.3);
    makeBox(m.group, 0.3, 0.35, 0.07, '#f7d02c', 0.12, 0.75, -0.38); } };
DETAIL[26] = { form:'biped', s:0.65, o:{ body:'#f5a623', headC:'#f5a623', legH:0.26, bh:0.55, bw:0.48 },
  deco:m=>{ makeBox(m.group, 0.3, 0.3, 0.2, '#f8e8c8', 0, 0.55, 0.18);
    const e1 = makeBox(m.head, 0.14, 0.3, 0.1, '#8a5a1a', -0.2, 0.35, 0); e1.rotation.z = 0.5;
    const e2 = makeBox(m.head, 0.14, 0.3, 0.1, '#8a5a1a', 0.2, 0.35, 0); e2.rotation.z = -0.5;
    makeBox(m.head, 0.1, 0.1, 0.03, '#f5d327', -0.2, -0.08, 0.24); makeBox(m.head, 0.1, 0.1, 0.03, '#f5d327', 0.2, -0.08, 0.24);
    makeBox(m.group, 0.06, 0.06, 0.7, '#5a4a2a', 0, 0.5, -0.5); makeBox(m.group, 0.22, 0.22, 0.07, '#f5d327', 0, 0.5, -0.88); } };
DETAIL[39] = { form:'blob', s:0.55, o:{ body:'#f9aec5', eyeC:'#3a8fd0', pupilC:'#fff' },
  deco:m=>{ makeBox(m.head, 0.2, 0.2, 0.2, '#f9aec5', 0, 0.38, 0.12);
    makeBox(m.head, 0.16, 0.22, 0.12, '#f0a0b8', -0.25, 0.32, -0.05); makeBox(m.head, 0.16, 0.22, 0.12, '#f0a0b8', 0.25, 0.32, -0.05); } };
DETAIL[54] = { form:'biped', s:0.55, o:{ body:'#f3c63f', headC:'#f3c63f', legH:0.26, bh:0.5, bw:0.45 },
  deco:m=>{ makeBox(m.head, 0.3, 0.12, 0.25, '#e8d8a8', 0, -0.1, 0.3);
    makeBox(m.head, 0.06, 0.18, 0.06, '#2a2a2a', -0.06, 0.35, 0); makeBox(m.head, 0.06, 0.18, 0.06, '#2a2a2a', 0.06, 0.35, 0); } };
DETAIL[55] = { form:'biped', s:0.8, o:{ body:'#5b9bd5', headC:'#6aaae0', legH:0.32, bh:0.6, bw:0.5 },
  deco:m=>{ makeBox(m.head, 0.32, 0.12, 0.28, '#e8e0c8', 0, -0.1, 0.32);
    makeBox(m.head, 0.07, 0.22, 0.07, '#e84d3a', 0, 0.38, 0); } };
DETAIL[79] = { form:'quad', s:0.7, o:{ body:'#e8a0bc', hs:0.55, bh:0.5, bd:0.85, legH:0.22, snout:'#f5e0d0', ears:'#d890ac' },
  deco:m=>{ makeBox(m.group, 0.12, 0.12, 0.5, '#e8a0bc', 0, 0.45, -0.6); makeBox(m.group, 0.15, 0.15, 0.12, '#f5f5f5', 0, 0.45, -0.85); } };
DETAIL[81] = { form:'float', s:0.55, o:{ body:'#a8b2bc' },
  deco:m=>{ makeBox(m.body, 0.18, 0.18, 0.25, '#d04030', -0.4, 0, 0); makeBox(m.body, 0.18, 0.18, 0.25, '#3a5ac8', 0.4, 0, 0);
    makeBox(m.body, 0.1, 0.1, 0.1, '#888', 0, 0.32, 0); } };
DETAIL[95] = { form:'serpent', s:1.1, o:{ body:'#8d9296', headC:'#9aa0a4', segs:5, segSize:0.5, rise:true },
  deco:m=>{ makeBox(m.head, 0.12, 0.3, 0.12, '#7a8084', 0, 0.4, 0); } };
DETAIL[129] = { form:'blob', s:0.55, o:{ body:'#e8843a', feet:false },
  deco:m=>{ makeBox(m.body, 0.06, 0.35, 0.3, '#f5e9c8', 0, 0.45, -0.1);
    makeBox(m.body, 0.06, 0.3, 0.25, '#f5e9c8', 0, -0.42, -0.1);
    makeBox(m.body, 0.3, 0.25, 0.08, '#f0d8a8', 0, -0.1, -0.42);
    makeBox(m.body, 0.05, 0.2, 0.05, '#f5e9c8', -0.15, -0.2, 0.42); makeBox(m.body, 0.05, 0.2, 0.05, '#f5e9c8', 0.15, -0.2, 0.42); } };
DETAIL[130] = { form:'serpent', s:1.15, o:{ body:'#3a6ed8', headC:'#4a7ee8', segs:5, segSize:0.48, rise:true },
  deco:m=>{ makeBox(m.head, 0.45, 0.2, 0.1, '#f5e9c8', 0, -0.2, 0.28);
    makeBox(m.head, 0.1, 0.3, 0.1, '#e8e8e8', -0.2, 0.35, 0); makeBox(m.head, 0.1, 0.3, 0.1, '#e8e8e8', 0.2, 0.35, 0);
    m.segs.forEach((s, i) => { makeBox(s, 0.08, 0.25, 0.2, '#e8d860', 0, 0.3, 0); }); } };
DETAIL[131] = { form:'quad', s:1.05, o:{ body:'#5a8fc0', hs:0.5, bh:0.6, bd:1.1, legH:0.25, legW:0.25, headC:'#6a9fd0' },
  deco:m=>{ makeBox(m.group, 0.8, 0.35, 0.8, '#8a7a6a', 0, 1.0, -0.1);
    m.head.position.y += 0.35; makeBox(m.group, 0.22, 0.45, 0.22, '#5a8fc0', 0, 0.95, 0.55);
    makeBox(m.head, 0.12, 0.22, 0.12, '#3a6a98', 0, 0.3, -0.1); } };
DETAIL[133] = { form:'quad', s:0.5, o:{ body:'#a5683f', hs:0.5, bh:0.42, bd:0.65, legH:0.22, ears:'#8a5530' },
  deco:m=>{ makeBox(m.group, 0.55, 0.3, 0.35, '#f0e0c0', 0, 0.52, 0.22);
    makeBox(m.group, 0.25, 0.25, 0.45, '#f0e0c0', 0, 0.5, -0.5); } };
DETAIL[134] = { form:'quad', s:0.62, o:{ body:'#6bb2e2', hs:0.5, bh:0.45, bd:0.7, legH:0.26, ears:'#5aa0d0' },
  deco:m=>{ makeBox(m.group, 0.55, 0.25, 0.3, '#f0f0f0', 0, 0.55, 0.25);
    makeBox(m.group, 0.12, 0.2, 0.55, '#5aa0d0', 0, 0.5, -0.55);
    makeBox(m.head, 0.1, 0.3, 0.1, '#5aa0d0', -0.25, 0.25, -0.05); makeBox(m.head, 0.1, 0.3, 0.1, '#5aa0d0', 0.25, 0.25, -0.05); } };
DETAIL[135] = { form:'quad', s:0.62, o:{ body:'#efd14a', hs:0.5, bh:0.45, bd:0.7, legH:0.28, ears:'#d8b830' },
  deco:m=>{ for(let i=0;i<5;i++){ makeBox(m.group, 0.1, 0.25, 0.1, '#fce88a', (i-2)*0.15, 0.78, -0.2 - Math.abs(i-2)*0.08); } } };
DETAIL[136] = { form:'quad', s:0.62, o:{ body:'#e06438', hs:0.5, bh:0.45, bd:0.7, legH:0.26, ears:'#c85428' },
  deco:m=>{ makeBox(m.group, 0.6, 0.3, 0.35, '#f8e8b0', 0, 0.55, 0.25);
    makeBox(m.group, 0.3, 0.3, 0.4, '#f8e8b0', 0, 0.55, -0.5); } };
DETAIL[143] = { form:'biped', s:1.15, o:{ body:'#27535e', headC:'#27535e', legH:0.3, bh:0.85, bw:0.85, armW:0.22 },
  deco:m=>{ makeBox(m.group, 0.7, 0.7, 0.2, '#f0e0c0', 0, 0.75, 0.32);
    makeBox(m.head, 0.4, 0.25, 0.05, '#f0e0c0', 0, -0.12, 0.26);
    makeBox(m.head, 0.12, 0.18, 0.1, '#27535e', -0.22, 0.32, 0); makeBox(m.head, 0.12, 0.18, 0.1, '#27535e', 0.22, 0.32, 0); } };
DETAIL[144] = { form:'bird', s:0.95, o:{ body:'#7ad0e8', headC:'#8adcf0', wingC:'#aae8f5', beak:'#8a8a9a', bh:0.5, bd:0.6 },
  deco:m=>{ m.wings.forEach(w => { w.scale.set(1.3, 1.8, 1.8); });
    makeBox(m.head, 0.08, 0.35, 0.08, '#5ab8d8', 0, 0.35, 0);
    makeBox(m.group, 0.15, 0.1, 0.7, '#aae8f5', 0, 0.5, -0.65); } };
DETAIL[145] = { form:'bird', s:0.95, o:{ body:'#f0c020', headC:'#f5cc30', wingC:'#f5dc60', beak:'#c87818', bh:0.5, bd:0.6 },
  deco:m=>{ m.wings.forEach(w => { w.scale.set(1.3, 1.7, 1.7); w.rotation.z = 0.3; });
    for(let i = 0; i < 3; i++) makeBox(m.head, 0.1, 0.22, 0.1, '#f5dc60', (i-1)*0.15, 0.32 + (i%2)*0.08, 0); } };
DETAIL[146] = { form:'bird', s:0.95, o:{ body:'#e87030', headC:'#f08040', wingC:'#f5a040', beak:'#a86818', bh:0.5, bd:0.6 },
  deco:m=>{ m.wings.forEach(w => { w.scale.set(1.3, 1.8, 1.8); });
    makeBox(m.head, 0.12, 0.3, 0.12, '#ffce3d', 0, 0.35, 0);
    makeBox(m.group, 0.15, 0.12, 0.8, '#ffce3d', 0, 0.5, -0.7); } };
DETAIL[150] = { form:'biped', s:1.0, o:{ body:'#c8bcd8', headC:'#d2c8e0', legH:0.45, bh:0.65, bw:0.45, armW:0.13 },
  deco:m=>{ makeBox(m.group, 0.25, 0.45, 0.2, '#8a5fa8', 0, 0.7, 0.13);
    makeBox(m.group, 0.12, 0.12, 0.7, '#8a5fa8', 0, 0.6, -0.5); makeBox(m.group, 0.16, 0.16, 0.25, '#8a5fa8', 0, 0.75, -0.85);
    makeBox(m.head, 0.12, 0.25, 0.12, '#c8bcd8', -0.18, 0.32, -0.05); makeBox(m.head, 0.12, 0.25, 0.12, '#c8bcd8', 0.18, 0.32, -0.05); } };

// DEX 테이블 → SPECIES 구성
const BIOME_MAP = { p:'plains', f:'forest', d:'desert', m:'mountain', s:'snow', w:'water' };
for(const idStr in DEX){
  const id = +idStr;
  const [name, typeStr, hp, atk, def, spd, cr, evoLv, evoTo, form, scale, c1, c2, biomeStr, rare] = DEX[idStr];
  const types = typeStr.split(',');
  let evo = null;
  if(evoTo === 'eevee') evo = { special:'eevee' };
  else if(evoTo) evo = { lv: evoLv, to: evoTo };
  SPECIES[id] = {
    name, types,
    bs: [hp, atk, def, spd],
    cr,
    bx: Math.max(20, Math.round((hp + atk + def + spd) * 0.65)),
    evo,
    learn: autoLearn(types),
    model: DETAIL[id] || autoModel(form, scale, c1, c2, types),
    spawn: { biomes: biomeStr ? biomeStr.split(',').map(b => BIOME_MAP[b]) : [], rare }
  };
}

// 스폰 테이블 자동 생성 — 희귀도: 1흔함 2보통 3드묾 4희귀 5전설
const RARE_WEIGHT = { 1: 20, 2: 10, 3: 3.5, 4: 1, 5: 0.12 };
const SPAWN_TABLES = { plains: [], forest: [], desert: [], mountain: [], snow: [], water: [], ocean: [] };
for(let id = 1; id < SPECIES.length; id++){
  const sp = SPECIES[id];
  if(!sp || !sp.spawn.biomes.length) continue;
  const w = RARE_WEIGHT[sp.spawn.rare] || 1;
  sp.spawn.biomes.forEach(b => {
    if(SPAWN_TABLES[b]) SPAWN_TABLES[b].push([id, w]);
    if(b === 'water') SPAWN_TABLES.ocean.push([id, w]);
  });
}
const LEGENDARIES = [144, 145, 146, 149, 150, 151];

// 체육관 관장 팀
const GYM_TEAMS = {
  rock:     { name:'강석',   badge:I.BADGE_ROCK,  team:[[74,14],[95,17],[76,20]] },
  water:    { name:'이슬',   badge:I.BADGE_WATER, team:[[60,14],[118,17],[55,20]] },
  electric: { name:'마티스', badge:I.BADGE_ELEC,  team:[[100,14],[25,17],[26,20]] },
  fire:     { name:'카츠라', badge:I.BADGE_FIRE,  team:[[37,15],[58,18],[126,21]] },
};

// ---------- 포켓몬 모델 ----------
function buildPokeModel(spId){
  const sp = SPECIES[spId], M = sp.model;
  let m;
  switch(M.form){
    case 'quad':    m = buildQuad(Object.assign({}, M.o)); break;
    case 'biped':   m = buildBiped(Object.assign({}, M.o)); break;
    case 'bird':    m = buildBird(Object.assign({}, M.o)); break;
    case 'blob':    m = buildBlob(Object.assign({}, M.o)); break;
    case 'float':   m = buildFloat(Object.assign({}, M.o)); break;
    case 'serpent': m = buildSerpent(Object.assign({}, M.o)); break;
  }
  if(M.deco) M.deco(m);
  const s = M.s || 1;
  m.group.scale.setScalar(s);
  const root = new THREE.Group();
  root.add(m.group);
  m.root = root;
  m.scaleVal = s;
  return m;
}

// 이름표 스프라이트
function makeNameTag(text){
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
  ctx.strokeText(text, 128, 32);
  ctx.fillStyle = '#fff';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(1.7, 0.42, 1);
  return sp;
}

// ---------- 포켓몬 인스턴스 ----------
function expForLevel(lv){ return lv * lv * lv; }

class PokeInst {
  constructor(sp, level){
    this.sp = sp;
    this.level = Math.max(1, level);
    this.exp = expForLevel(this.level);
    this.calc();
    this.hp = this.maxHp;
    this.updateMoves();
  }
  get spec(){ return SPECIES[this.sp]; }
  get name(){ return this.spec.name; }
  calc(){
    const bs = this.spec.bs, lv = this.level;
    this.maxHp = Math.floor(bs[0] * 2 * lv / 100) + lv + 10;
    this.atk = Math.floor(bs[1] * 2 * lv / 100) + 5;
    this.def = Math.floor(bs[2] * 2 * lv / 100) + 5;
    this.spd = Math.floor(bs[3] * 2 * lv / 100) + 5;
  }
  updateMoves(){
    this.moves = this.spec.learn.filter(([lv]) => lv <= this.level).map(([, k]) => k).slice(-4);
    if(!this.moves.length) this.moves = ['tackle'];
  }
  expPct(){
    const a = expForLevel(this.level), b = expForLevel(this.level + 1);
    return clamp((this.exp - a) / (b - a), 0, 1);
  }
  gainExp(n){
    const ev = [];
    this.exp += n;
    while(this.level < 100 && this.exp >= expForLevel(this.level + 1)){
      this.level++;
      const oldMax = this.maxHp;
      this.calc();
      this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - oldMax));
      ev.push({ type:'level', lv: this.level });
      this.spec.learn.filter(([lv]) => lv === this.level).forEach(([, k]) => ev.push({ type:'move', move:k }));
      this.updateMoves();
    }
    // 진화는 모든 레벨업 처리 후 한 번만 (배틀 쪽에서 연쇄 진화 처리)
    const evo = this.evolveTarget();
    if(evo) ev.push({ type:'evolve', to: evo });
    return ev;
  }
  evolveTarget(){
    const e = this.spec.evo;
    if(!e) return null;
    if(e.special === 'eevee'){
      if(this.level < 25) return null;
      const b = world.biomeAt(Math.floor(player.body.x), Math.floor(player.body.z));
      let water = b === 'ocean';
      for(let dx = -4; dx <= 4 && !water; dx += 2){
        for(let dz = -4; dz <= 4; dz += 2){
          if(world.getBlock(player.body.x + dx, SEA, player.body.z + dz) === B.WATER){ water = true; break; }
        }
      }
      if(water) return 134;   // 샤미드
      if(b === 'desert' || b === 'mountain') return 136; // 부스터
      return 135;               // 쥬피썬더
    }
    return this.level >= e.lv ? e.to : null;
  }
  doEvolve(to){
    if(typeof Ach !== 'undefined') Ach.unlock('first_evolve');
    const ratio = this.hp / this.maxHp;
    this.sp = to;
    this.calc();
    this.hp = Math.max(1, Math.round(this.maxHp * ratio));
    this.updateMoves();
    PokeMan.seen.add(to);
    PokeMan.caught.add(to);
  }
  serialize(){ return { sp:this.sp, level:this.level, exp:this.exp, hp:this.hp }; }
  static from(d){
    const p = new PokeInst(d.sp, d.level);
    p.exp = d.exp; p.hp = clamp(d.hp, 0, p.maxHp);
    return p;
  }
}

function calcDamage(att, def, moveKey, mult){
  const mv = MOVES[moveKey];
  const eff = typeMult(mv.t, def.spec.types);
  if(eff === 0) return { dmg:0, eff:0, crit:false };
  const stab = att.spec.types.includes(mv.t) ? 1.5 : 1;
  const crit = Math.random() < 1 / 16;
  let dmg = ((2 * att.level / 5 + 2) * mv.p * att.atk / Math.max(1, def.def)) / 50 + 2;
  dmg *= stab * eff * (crit ? 1.5 : 1) * (0.85 + Math.random() * 0.15) * (mult || 1);
  return { dmg: Math.max(1, Math.floor(dmg)), eff, crit };
}
function catchChance(inst, ballMod){
  const f = (3 * inst.maxHp - 2 * inst.hp) * inst.spec.cr * ballMod / (3 * inst.maxHp);
  return clamp(f / 255, 0.03, 1);
}

// ---------- 야생 포켓몬 ----------
let _wildIdCounter = 0;
class WildPoke {
  constructor(sp, level, x, y, z){
    this.netId = ++_wildIdCounter;
    this.inst = new PokeInst(sp, level);
    const spec = SPECIES[sp];
    const sc = spec.model.s || 1;
    this.body = new PhysBody(x, y, z, clamp(0.32 * sc / 0.55, 0.2, 0.55), clamp(1.1 * sc, 0.45, 1.8));
    this.built = buildPokeModel(sp);
    this.group = this.built.root;
    this.tag = makeNameTag(spec.name + ' Lv.' + this.inst.level);
    this.tag.position.y = this.body.h + 0.45;
    this.group.add(this.tag);
    scene.add(this.group);
    this.dir = Math.random() * Math.PI * 2;
    this.moveTimer = 0; this.moving = false;
    this.walkPhase = 0; this.bob = Math.random() * 10;
    this.catching = false; this.fleeTimer = 0;
  }
  update(dt, world, player){
    if(this.catching) return;
    const b = this.body;
    let speed = 0;
    if(this.fleeTimer > 0){
      this.fleeTimer -= dt;
      this.dir = Math.atan2(b.x - player.body.x, b.z - player.body.z);
      speed = 3.2;
    } else {
      this.moveTimer -= dt;
      if(this.moveTimer <= 0){
        this.moveTimer = 2 + Math.random() * 5;
        this.moving = Math.random() < 0.55;
        this.dir = Math.random() * Math.PI * 2;
      }
      speed = this.moving ? 0.9 : 0;
    }
    b.vx = lerp(b.vx, Math.sin(this.dir) * speed, Math.min(1, dt * 8));
    b.vz = lerp(b.vz, Math.cos(this.dir) * speed, Math.min(1, dt * 8));
    if(b.hitWall && b.onGround && speed > 0) b.vy = 7;
    if(b.inWater) b.vy = Math.max(b.vy, 1.5);
    b.update(dt, world);
    // 애니메이션
    this.bob += dt;
    const sp = Math.hypot(b.vx, b.vz);
    this.walkPhase += sp * dt * 4;
    const sw = Math.sin(this.walkPhase) * Math.min(1, sp) * 0.7;
    (this.built.legs || []).forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? sw : -sw); });
    (this.built.wings || []).forEach((w, i) => { w.rotation.z = (i === 0 ? 1 : -1) * Math.sin(this.bob * 8) * 0.4; });
    const hoverY = this.built.hover ? Math.sin(this.bob * 2) * 0.15 + 0.1 : 0;
    this.group.position.set(b.x, b.y + hoverY, b.z);
    this.group.rotation.y = this.dir;
    this.tag.rotation.y = -this.dir;
  }
}

// ---------- 포켓몬 매니저 ----------
const PokeMan = {
  enabled: true,
  wilds: [], party: [], box: [],
  seen: new Set(), caught: new Set(),
  badges: new Set(),
  spawnTimer: 2, regenTimer: 0,
  reset(){
    this.wilds.forEach(w => { scene.remove(w.group); disposeObject(w.group); });
    this.wilds = []; this.party = []; this.box = [];
    this.seen = new Set(); this.caught = new Set();
    this.badges = new Set();
  },
  update(dt, world, player){
    if(!this.enabled) return;
    for(const w of this.wilds) w.update(dt, world, player);
    for(const w of this.wilds.slice()){
      if(w.catching) continue; // 포획 연출/배틀 중에는 디스폰 금지
      if(dist3(w.body.x, w.body.y, w.body.z, player.body.x, player.body.y, player.body.z) > 75){
        this.removeWild(w, false);
      }
    }
    this.spawnTimer -= dt;
    if(this.spawnTimer <= 0){
      this.spawnTimer = 2.5;
      if(this.wilds.length < 10) this.trySpawn(world, player);
    }
    this.regenTimer += dt;
    if(this.regenTimer > 8){
      this.regenTimer = 0;
      this.party.forEach(p => { if(p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + 1); });
    }
  },
  removeWild(w, poof){
    if(poof) Particles.spawn(w.body.x, w.body.y + 0.5, w.body.z, 0xffffff, 10, 2, 0.5, 1);
    scene.remove(w.group);
    disposeObject(w.group);
    const i = this.wilds.indexOf(w);
    if(i >= 0) this.wilds.splice(i, 1);
  },
  trySpawn(world, player){
    for(let att = 0; att < 8; att++){
      const ang = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 27;
      const x = Math.floor(player.body.x + Math.sin(ang) * dist) + 0.5;
      const z = Math.floor(player.body.z + Math.cos(ang) * dist) + 0.5;
      const y = world.colTop(x, z) + 1;
      if(y <= SEA || y >= WORLD_H - 2) continue;
      const ground = world.getBlock(x, y - 1, z);
      if(!BLOCKS[ground].solid) continue;
      if(world.getBlock(x, y, z) !== B.AIR) continue;
      // 물가 체크
      let waterNear = false;
      for(let dx = -4; dx <= 4 && !waterNear; dx += 2){
        for(let dz = -4; dz <= 4; dz += 2){
          if(world.getBlock(x + dx, SEA, z + dz) === B.WATER){ waterNear = true; break; }
        }
      }
      const biome = world.biomeAt(Math.floor(x), Math.floor(z));
      const table = waterNear && Math.random() < 0.5 ? SPAWN_TABLES.water : (SPAWN_TABLES[biome] || SPAWN_TABLES.plains);
      const total = table.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * total, sp = table[0][0];
      for(const [id, w] of table){ r -= w; if(r <= 0){ sp = id; break; } }
      const spawnP = world.spawnPoint || { x:0, z:0 };
      const d = Math.hypot(x - spawnP.x, z - spawnP.z);
      let lv = clamp(Math.floor(2 + d / 70 + Math.random() * 5 - 2), 2, 32);
      // 밤에는 아주 낮은 확률로 뮤츠 출현
      if(game.isNight() && Math.random() < 0.012) sp = 150;
      if(LEGENDARIES.includes(sp)) lv = 35 + Math.floor(Math.random() * 10);
      this.wilds.push(new WildPoke(sp, lv, x, y + 0.1, z));
      this.seen.add(sp);
      return;
    }
  },
  addCaught(inst){
    this.seen.add(inst.sp);
    this.caught.add(inst.sp);
    if(typeof Ach !== 'undefined'){
      Ach.unlock('first_catch');
      if(LEGENDARIES.includes(inst.sp)) Ach.unlock('legend');
      const n = this.caught.size;
      if(n >= 10) Ach.unlock('dex10');
      if(n >= 50) Ach.unlock('dex50');
      if(n >= 151) Ach.unlock('dex151');
    }
    if(this.party.length < 6){ this.party.push(inst); return 'party'; }
    this.box.push(inst);
    return 'box';
  },
  partyAlive(){ return this.party.find(p => p.hp > 0); },
  // 필드 포획 (포켓볼 명중)
  async overworldCatch(wild, ballId){
    wild.catching = true;
    wild.group.visible = false;
    const ball = new THREE.Sprite(iconSpriteMaterial(ballId));
    ball.scale.set(0.5, 0.5, 0.5);
    const bx = wild.body.x, by = wild.body.y + 0.5, bz = wild.body.z;
    ball.position.set(bx, by, bz);
    scene.add(ball);
    const inst = wild.inst;
    const success = Math.random() < catchChance(inst, ballBonus(ballId));
    const shakes = success ? 3 : 1 + Math.floor(Math.random() * 2);
    for(let i = 0; i < shakes; i++){
      SFX.play('catch');
      for(let f = 0; f < 8; f++){
        ball.position.x = bx + Math.sin(f * 1.4) * 0.12;
        await sleep(35);
      }
      await sleep(280);
    }
    scene.remove(ball);
    if(success){
      SFX.play('caught');
      Particles.spawn(bx, by, bz, 0xffe97a, 22, 2.5, 0.9, 1.5);
      const where = this.addCaught(inst);
      UI.toast('신난다! ' + inst.name + '를(을) 잡았다!' + (where === 'box' ? ' (보관함으로 이동)' : ''));
      this.removeWild(wild, false);
    } else {
      SFX.play('fail');
      UI.toast('앗! ' + inst.name + '이(가) 볼에서 나와버렸다!');
      wild.group.visible = true;
      wild.catching = false;
      wild.fleeTimer = 2.5;
    }
  },
  // 이상한 사탕: 다음 레벨까지 경험치 채움
  applyCandy(p){
    const need = expForLevel(p.level + 1) - p.exp;
    const evs = p.gainExp(Math.max(1, need));
    SFX.play('level');
    evs.forEach(e => {
      if(e.type === 'level') UI.toast(p.name + '은(는) 레벨 ' + e.lv + '이(가) 되었다!');
      else if(e.type === 'move') UI.toast(p.name + '은(는) ' + MOVES[e.move].n + '을(를) 배웠다!');
      else if(e.type === 'evolve'){
        let target = e.to;
        while(target){
          const old = p.name;
          p.doEvolve(target);
          SFX.play('evolve');
          UI.toast(old + '은(는) ' + p.name + '(으)로 진화했다!');
          target = p.evolveTarget();
        }
      }
    });
  },
  serialize(){
    return {
      enabled: this.enabled,
      party: this.party.map(p => p.serialize()),
      box: this.box.map(p => p.serialize()),
      seen: [...this.seen], caught: [...this.caught],
      badges: [...this.badges],
    };
  },
  deserialize(d){
    if(!d) return;
    this.enabled = d.enabled !== false;
    this.party = (d.party || []).map(PokeInst.from);
    this.box = (d.box || []).map(PokeInst.from);
    this.seen = new Set(d.seen || []);
    this.caught = new Set(d.caught || []);
    this.badges = new Set(d.badges || []);
  }
};

// ---------- 파트너 포켓몬 (파티 1번이 따라다님) ----------
const Follower = {
  ent: null, sp: 0,
  clear(){
    if(this.ent){
      scene.remove(this.ent.group);
      disposeObject(this.ent.group);
      this.ent = null; this.sp = 0;
    }
  },
  update(dt, world, player){
    if(!PokeMan.enabled || !PokeMan.party.length || player.dead || !game.followerOn){
      this.clear();
      return;
    }
    const want = PokeMan.party[0].sp;
    if(!this.ent || this.sp !== want){
      this.clear();
      const built = buildPokeModel(want);
      const sc = SPECIES[want].model.s || 1;
      this.ent = {
        built, group: built.root,
        body: new PhysBody(player.body.x - 1.2, player.body.y + 1, player.body.z - 1.2,
          clamp(0.32 * sc / 0.55, 0.2, 0.55), clamp(1.1 * sc, 0.45, 1.8)),
        walkPhase: 0, bob: Math.random() * 10, dir: 0
      };
      scene.add(this.ent.group);
      this.sp = want;
    }
    const e = this.ent, b = e.body;
    // 라이딩 중: 플레이어 발 밑에 고정
    if(game.riding){
      const pb = player.body;
      e.bob += dt;
      e.dir = player.yaw + Math.PI;
      e.group.position.set(pb.x, pb.y - 0.35, pb.z);
      e.group.rotation.y = e.dir;
      (e.built.wings || []).forEach((wg, i) => { wg.rotation.z = (i === 0 ? 1 : -1) * Math.sin(e.bob * 10) * 0.6; });
      (e.built.legs || []).forEach((l, i) => { l.rotation.x = Math.sin(e.bob * 8 + i) * 0.5; });
      b.x = pb.x; b.y = pb.y; b.z = pb.z;
      return;
    }
    const d = dist3(b.x, b.y, b.z, player.body.x, player.body.y, player.body.z);
    if(d > 24){ // 너무 멀면 순간이동
      b.x = player.body.x - 1; b.y = player.body.y + 1; b.z = player.body.z - 1;
      b.vx = b.vz = 0;
    }
    let speed = 0;
    if(d > 2.6){
      e.dir = Math.atan2(player.body.x - b.x, player.body.z - b.z);
      speed = clamp((d - 2) * 1.2, 0.8, 6);
    }
    b.vx = lerp(b.vx, Math.sin(e.dir) * speed, Math.min(1, dt * 8));
    b.vz = lerp(b.vz, Math.cos(e.dir) * speed, Math.min(1, dt * 8));
    if(b.hitWall && b.onGround && speed > 0) b.vy = 7;
    if(b.inWater) b.vy = Math.max(b.vy, 2);
    b.update(dt, world);
    e.bob += dt;
    const sp2 = Math.hypot(b.vx, b.vz);
    e.walkPhase += sp2 * dt * 4;
    const sw = Math.sin(e.walkPhase) * Math.min(1, sp2) * 0.7;
    (e.built.legs || []).forEach((l, i) => { l.rotation.x = (i % 2 === 0 ? sw : -sw); });
    (e.built.wings || []).forEach((w, i) => { w.rotation.z = (i === 0 ? 1 : -1) * Math.sin(e.bob * 8) * 0.4; });
    const hoverY = e.built.hover ? Math.sin(e.bob * 2) * 0.15 + 0.1 : 0;
    e.group.position.set(b.x, b.y + hoverY, b.z);
    e.group.rotation.y = e.dir;
  }
};

// ---------- 초상화 렌더링 ----------
let _pr = null, _prScene = null, _prCam = null;
const _portraits = {}, _silhouettes = {};
function _ensurePortraitRenderer(){
  if(_pr) return;
  _pr = new THREE.WebGLRenderer({ alpha:true, antialias:false });
  _pr.setSize(96, 96);
  _prScene = new THREE.Scene();
  _prScene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const dl = new THREE.DirectionalLight(0xffffff, 0.7);
  dl.position.set(2, 4, 3);
  _prScene.add(dl);
  _prCam = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
}
function _renderPortrait(sp){
  _ensurePortraitRenderer();
  const built = buildPokeModel(sp);
  built.root.rotation.y = 0.6;
  _prScene.add(built.root);
  const s = built.scaleVal;
  _prCam.position.set(0.25, s * 0.85 + 0.3, s * 1.4 + 0.8);
  _prCam.lookAt(0, s * 0.55 + 0.05, 0);
  _pr.render(_prScene, _prCam);
  // 일반
  const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96;
  cv.getContext('2d').drawImage(_pr.domElement, 0, 0);
  _portraits[sp] = cv.toDataURL();
  // 실루엣
  const cv2 = document.createElement('canvas'); cv2.width = 96; cv2.height = 96;
  const c2 = cv2.getContext('2d');
  c2.drawImage(_pr.domElement, 0, 0);
  c2.globalCompositeOperation = 'source-in';
  c2.fillStyle = '#333';
  c2.fillRect(0, 0, 96, 96);
  _silhouettes[sp] = cv2.toDataURL();
  _prScene.remove(built.root);
  disposeObject(built.root);
}
function portraitURL(sp){ if(!_portraits[sp]) _renderPortrait(sp); return _portraits[sp]; }
function silhouetteURL(sp){ if(!_silhouettes[sp]) _renderPortrait(sp); return _silhouettes[sp]; }
function typeTagsHTML(types){
  return types.map(t => `<span class="type-tag" style="background:${TYPES[t].c}">${TYPES[t].n}</span>`).join('');
}

// ---------- 배틀 ----------
const Battle = {
  active: false, busy: false, _inited: false,
  wild: null, wildEnt: null, ally: null, allyIdx: 0,

  initDom(){
    if(this._inited) return;
    this._inited = true;
    this.$ = id => document.getElementById(id);
    document.querySelectorAll('#b-menu button').forEach(b => {
      b.addEventListener('click', () => this.menuAction(b.dataset.act));
    });
    // 미니 렌더러 2개
    this.rE = new THREE.WebGLRenderer({ canvas: this.$('b-enemy-canvas'), alpha:true, antialias:false });
    this.rE.setSize(260, 200, false);
    this.rA = new THREE.WebGLRenderer({ canvas: this.$('b-ally-canvas'), alpha:true, antialias:false });
    this.rA.setSize(260, 200, false);
    this.scE = new THREE.Scene(); this.scA = new THREE.Scene();
    [this.scE, this.scA].forEach(sc => {
      sc.add(new THREE.AmbientLight(0xffffff, 0.85));
      const dl = new THREE.DirectionalLight(0xffffff, 0.7);
      dl.position.set(2, 4, 3);
      sc.add(dl);
    });
    this.camE = new THREE.PerspectiveCamera(42, 260/200, 0.1, 50);
    this.camA = new THREE.PerspectiveCamera(42, 260/200, 0.1, 50);
  },
  setModel(side, sp){
    const sc = side === 'E' ? this.scE : this.scA;
    const old = side === 'E' ? this.mE : this.mA;
    if(old){ sc.remove(old.root); disposeObject(old.root); }
    const built = buildPokeModel(sp);
    sc.add(built.root);
    built.root.rotation.y = side === 'E' ? 0.3 : Math.PI - 0.3;
    const s = built.scaleVal;
    const cam = side === 'E' ? this.camE : this.camA;
    cam.position.set(0, s * 0.8 + 0.35, s * 1.5 + 0.85);
    cam.lookAt(0, s * 0.55 + 0.08, 0);
    if(side === 'E') this.mE = built; else this.mA = built;
  },
  // 체육관 관장 배틀: 3마리 연속, 포획 불가
  async startTrainer(gymType, gymKey){
    if(this.active) return false;
    const G = GYM_TEAMS[gymType];
    if(!G) return false;
    this.initDom();
    this.active = true; this.busy = true;
    game.inBattle = true;
    if(document.exitPointerLock) document.exitPointerLock();
    this.trainer = { type: gymType, gymKey, ...G };
    this.enemyTeam = G.team.map(([sp, lv]) => new PokeInst(sp, lv));
    this.enemyIdx = 0;
    this.wild = this.enemyTeam[0];
    this.wildEnt = null;
    PokeMan.seen.add(this.wild.sp);
    this.allyIdx = PokeMan.party.findIndex(p => p.hp > 0);
    this.ally = PokeMan.party[this.allyIdx];
    const bgs = { rock:'linear-gradient(#a8b8c8 0%, #8a8a80 70%, #6a6a60 100%)',
                  water:'linear-gradient(#7ec8ff 0%, #5a9fd8 60%, #3a76c0 100%)',
                  electric:'linear-gradient(#f5e8a8 0%, #e8d868 60%, #c8b848 100%)',
                  fire:'linear-gradient(#f5b8a8 0%, #e88868 60%, #c85838 100%)' };
    this.$('battle-stage').style.background = bgs[gymType];
    this.setModel('E', this.wild.sp);
    this.setModel('A', this.ally.sp);
    this.$('b-enemy-canvas').style.visibility = 'visible';
    this.$('battle-overlay').classList.remove('hidden');
    this.hideSub();
    this.updateBars();
    this.menuEnabled(false);
    await this.say('체육관 관장 ' + G.name + '이(가) 승부를 걸어왔다!');
    await this.say(G.name + ': 가랏, ' + this.wild.name + '!');
    await this.say('가랏! ' + this.ally.name + '!');
    this.busy = false;
    this.menuEnabled(true);
    return true;
  },
  async start(wildEnt){
    if(this.active || wildEnt.catching) return false; // 포획 연출 중인 야생과는 배틀 불가
    this.initDom();
    this.active = true; this.busy = true;
    game.inBattle = true;
    if(document.exitPointerLock) document.exitPointerLock();
    this.wildEnt = wildEnt;
    this.wild = wildEnt.inst;
    wildEnt.catching = true; // 필드에서 정지
    PokeMan.seen.add(this.wild.sp);
    this.allyIdx = PokeMan.party.findIndex(p => p.hp > 0);
    this.ally = PokeMan.party[this.allyIdx];
    // 바이옴 배경
    const biome = world.biomeAt(Math.floor(player.body.x), Math.floor(player.body.z));
    const bgs = {
      desert: 'linear-gradient(#8fc8e8 0%, #e8d8a0 60%, #d0b878 100%)',
      snow: 'linear-gradient(#bcd8e8 0%, #eef5f8 60%, #d8e8f0 100%)',
      mountain: 'linear-gradient(#88b8d8 0%, #a8a8a0 65%, #888880 100%)',
      ocean: 'linear-gradient(#7ec8ff 0%, #5a9fd8 60%, #3a76c0 100%)',
    };
    this.$('battle-stage').style.background = bgs[biome] || 'linear-gradient(#7ec8ff 0%, #b9e48f 70%, #6da34d 100%)';
    this.setModel('E', this.wild.sp);
    this.setModel('A', this.ally.sp);
    this.$('b-enemy-canvas').style.visibility = 'visible';
    this.$('battle-overlay').classList.remove('hidden');
    this.hideSub();
    this.updateBars();
    this.menuEnabled(false);
    await this.say('앗! 야생의 ' + this.wild.name + ' Lv.' + this.wild.level + '이(가) 나타났다!');
    await this.say('가랏! ' + this.ally.name + '!');
    this.busy = false;
    this.menuEnabled(true);
    return true;
  },
  say(text){
    const el = this.$('b-msg');
    el.textContent = '';
    return new Promise(res => {
      let i = 0;
      const iv = setInterval(() => {
        el.textContent = text.slice(0, ++i);
        if(i >= text.length){
          clearInterval(iv);
          setTimeout(res, 750);
        }
      }, 22);
    });
  },
  menuEnabled(on){
    document.querySelectorAll('#b-menu button').forEach(b => b.disabled = !on);
  },
  hideSub(){
    const s = this.$('b-sub');
    s.classList.add('hidden');
    s.innerHTML = '';
  },
  updateBars(){
    const w = this.wild, a = this.ally;
    this.$('b-enemy-name').textContent = w.name;
    this.$('b-enemy-lv').textContent = 'Lv.' + w.level;
    this.$('b-enemy-hpfill').style.width = (w.hp / w.maxHp * 100) + '%';
    this.$('b-enemy-hpfill').style.background = w.hp / w.maxHp > 0.5 ? '#44c944' : w.hp / w.maxHp > 0.2 ? '#e8b820' : '#e23b3b';
    this.$('b-ally-name').textContent = a.name;
    this.$('b-ally-lv').textContent = 'Lv.' + a.level;
    this.$('b-ally-hpfill').style.width = (a.hp / a.maxHp * 100) + '%';
    this.$('b-ally-hpfill').style.background = a.hp / a.maxHp > 0.5 ? '#44c944' : a.hp / a.maxHp > 0.2 ? '#e8b820' : '#e23b3b';
    this.$('b-ally-hptext').textContent = a.hp + ' / ' + a.maxHp;
    this.$('b-ally-expfill').style.width = (a.expPct() * 100) + '%';
  },
  flashSide(side){
    const cv = this.$(side === 'E' ? 'b-enemy-canvas' : 'b-ally-canvas');
    cv.style.filter = 'brightness(3)';
    setTimeout(() => { cv.style.filter = ''; }, 120);
  },
  menuAction(act){
    if(this.busy || !this.active) return;
    SFX.play('click');
    if(act === 'fight') this.showMoves();
    else if(act === 'bag') this.showBag();
    else if(act === 'poke') this.showParty();
    else if(act === 'run') this.turn({ type:'run' });
  },
  showMoves(){
    const s = this.$('b-sub');
    s.innerHTML = '';
    s.classList.remove('hidden');
    this.ally.moves.forEach(k => {
      const mv = MOVES[k];
      const b = document.createElement('button');
      b.innerHTML = mv.n + typeTagsHTML([mv.t]) + `<span class="sub-detail">위력 ${mv.p} · 명중 ${mv.a}</span>`;
      b.onclick = () => { this.turn({ type:'move', move:k }); };
      s.appendChild(b);
    });
  },
  showBag(){
    const s = this.$('b-sub');
    s.innerHTML = '';
    s.classList.remove('hidden');
    [I.POKEBALL, I.GREATBALL, I.ULTRABALL, I.POTION].forEach(id => {
      const cnt = player.countItem(id);
      if(cnt <= 0) return;
      const b = document.createElement('button');
      b.innerHTML = itemName(id) + ` <span class="sub-detail">${cnt}개 보유</span>`;
      b.onclick = () => {
        if(id === I.POTION) this.turn({ type:'potion' });
        else this.turn({ type:'ball', id });
      };
      s.appendChild(b);
    });
    if(!s.children.length) s.innerHTML = '<button disabled>가방이 비었다...</button>';
  },
  showParty(){
    const s = this.$('b-sub');
    s.innerHTML = '';
    s.classList.remove('hidden');
    PokeMan.party.forEach((p, i) => {
      const b = document.createElement('button');
      b.innerHTML = `${p.name} Lv.${p.level}<span class="sub-detail">HP ${p.hp}/${p.maxHp}</span>`;
      b.disabled = i === this.allyIdx || p.hp <= 0;
      b.onclick = () => { this.turn({ type:'switch', idx:i }); };
      s.appendChild(b);
    });
  },
  async turn(action){
    if(this.busy) return;
    this.busy = true;
    this.hideSub();
    this.menuEnabled(false);
    const enemyMove = this.wild.moves[Math.floor(Math.random() * this.wild.moves.length)];
    try {
      if(action.type === 'run'){
        const chance = clamp(0.55 + (this.ally.spd - this.wild.spd) / Math.max(1, this.wild.spd) * 0.3, 0.25, 0.95);
        if(Math.random() < chance){
          await this.say('무사히 도망쳤다!');
          this.end('run');
          return;
        }
        await this.say('도망칠 수 없었다!');
        await this.enemyAttack(enemyMove);
      } else if(action.type === 'ball'){
        const caught = await this.tryCatch(action.id);
        if(caught) return;
        await this.enemyAttack(enemyMove);
      } else if(action.type === 'potion'){
        if(player.countItem(I.POTION) > 0){
          player.removeItem(I.POTION, 1);
          this.ally.hp = Math.min(this.ally.maxHp, this.ally.hp + 25);
          this.updateBars();
          SFX.play('pop');
          await this.say(this.ally.name + '의 체력이 회복됐다!');
        } else {
          await this.say('상처약이 없다!');
        }
        await this.enemyAttack(enemyMove);
      } else if(action.type === 'switch'){
        await this.doSwitch(action.idx);
        await this.enemyAttack(enemyMove);
      } else if(action.type === 'move'){
        const aPrio = MOVES[action.move].prio || 0, ePrio = MOVES[enemyMove].prio || 0;
        let allyFirst;
        if(aPrio !== ePrio) allyFirst = aPrio > ePrio;
        else if(this.ally.spd !== this.wild.spd) allyFirst = this.ally.spd > this.wild.spd;
        else allyFirst = Math.random() < 0.5;
        const actingAlly = this.ally; // 기절→강제 교체된 포켓몬이 대신 공격하는 것 방지
        if(allyFirst){
          await this.allyAttack(action.move);
          if(this.active && this.wild.hp > 0) await this.enemyAttack(enemyMove);
        } else {
          await this.enemyAttack(enemyMove);
          if(this.active && this.ally === actingAlly && this.ally.hp > 0) await this.allyAttack(action.move);
        }
      }
    } finally {
      if(this.active){
        this.busy = false;
        this.menuEnabled(true);
      }
    }
  },
  async useMove(user, target, mk, isAlly){
    const mv = MOVES[mk];
    await this.say(user.name + '의 ' + mv.n + '!');
    if(mv.p === 0){
      await this.say('하지만 아무 일도 일어나지 않았다!');
      return;
    }
    if(Math.random() * 100 > mv.a){
      await this.say('하지만 빗나갔다!');
      return;
    }
    // 배지 1개당 내 포켓몬 공격 +4%
    const r = calcDamage(user, target, mk, isAlly ? 1 + 0.04 * PokeMan.badges.size : 1);
    if(r.eff === 0){
      await this.say('효과가 없는 것 같다...');
      return;
    }
    target.hp = Math.max(0, target.hp - r.dmg);
    SFX.play('hit');
    this.flashSide(isAlly ? 'E' : 'A');
    this.updateBars();
    if(r.crit) await this.say('급소에 맞았다!');
    if(r.eff >= 2) await this.say('효과가 굉장했다!');
    else if(r.eff < 1) await this.say('효과가 별로인 듯하다...');
  },
  async allyAttack(mk){
    await this.useMove(this.ally, this.wild, mk, true);
    if(this.wild.hp <= 0) await this.enemyFaintFlow();
  },
  async enemyAttack(mk){
    if(!this.active || this.wild.hp <= 0) return;
    await this.useMove(this.wild, this.ally, mk, false);
    if(this.ally.hp <= 0) await this.allyFaintFlow();
  },
  async enemyFaintFlow(){
    SFX.play('faint');
    if(this.mE) this.mE.root.rotation.x = Math.PI / 2;
    await this.say('야생 ' + this.wild.name + '은(는) 쓰러졌다!');
    const exp = Math.floor(this.wild.spec.bx * this.wild.level / 7) + 1;
    await this.say(this.ally.name + '은(는) 경험치 ' + exp + '을(를) 얻었다!');
    const evs = this.ally.gainExp(exp);
    this.updateBars();
    for(const e of evs){
      if(!this.active) break;
      if(e.type === 'level'){
        SFX.play('level');
        this.updateBars();
        await this.say(this.ally.name + '은(는) 레벨 ' + e.lv + '이(가) 되었다!');
      } else if(e.type === 'move'){
        await this.say(this.ally.name + '은(는) ' + MOVES[e.move].n + '을(를) 배웠다!');
      } else if(e.type === 'evolve'){
        // 연쇄 진화까지 처리 (예: 한 번에 20레벨 오른 경우)
        let target = e.to;
        while(target){
          await this.say('어...?! ' + this.ally.name + '의 모습이...!');
          SFX.play('evolve');
          const oldName = this.ally.name;
          this.ally.doEvolve(target);
          this.setModel('A', this.ally.sp);
          this.updateBars();
          await this.say(oldName + '은(는) ' + this.ally.name + '(으)로 진화했다!');
          target = this.ally.evolveTarget();
        }
      }
    }
    // 관장전: 다음 포켓몬 투입
    if(this.trainer && this.enemyIdx < this.enemyTeam.length - 1){
      this.enemyIdx++;
      this.wild = this.enemyTeam[this.enemyIdx];
      PokeMan.seen.add(this.wild.sp);
      if(this.mE) this.mE.root.rotation.x = 0;
      this.setModel('E', this.wild.sp);
      this.updateBars();
      await this.say(this.trainer.name + ': 가랏, ' + this.wild.name + '!');
      return; // 배틀 계속
    }
    if(this.trainer){
      await this.say(this.trainer.name + ': 훌륭한 승부였다...!');
      if(typeof world !== 'undefined' && !world.gymsBeaten.has(this.trainer.gymKey)){
        world.gymsBeaten.add(this.trainer.gymKey);
        PokeMan.badges.add(this.trainer.type);
        if(typeof Ach !== 'undefined'){ Ach.unlock('badge1'); if(PokeMan.badges.size >= 4) Ach.unlock('badge4'); }
        player.addItem(this.trainer.badge, 1);
        player.addItem(I.EMERALD, 5);
        await this.say(itemName(this.trainer.badge) + '을(를) 획득했다! (포켓몬 공격력 +4%)');
        await this.say('에메랄드 5개도 받았다!');
      } else {
        await this.say('(이미 클리어한 체육관이라 배지는 없다)');
      }
    }
    this.end('win');
  },
  async allyFaintFlow(){
    SFX.play('faint');
    if(this.mA) this.mA.root.rotation.x = -Math.PI / 2;
    await this.say(this.ally.name + '은(는) 쓰러졌다!');
    const nextIdx = PokeMan.party.findIndex(p => p.hp > 0);
    if(nextIdx >= 0){
      await this.doSwitch(nextIdx);
    } else {
      await this.say('눈앞이 캄캄해졌다...');
      PokeMan.party.forEach(p => { p.hp = Math.max(1, Math.floor(p.maxHp / 2)); });
      this.end('lose');
    }
  },
  async doSwitch(idx){
    if(this.ally && this.ally.hp > 0) await this.say('돌아와, ' + this.ally.name + '!');
    this.allyIdx = idx;
    this.ally = PokeMan.party[idx];
    this.setModel('A', this.ally.sp);
    this.updateBars();
    await this.say('가랏! ' + this.ally.name + '!');
  },
  async tryCatch(ballId){
    if(this.trainer){
      await this.say('다른 트레이너의 포켓몬은 잡을 수 없다!');
      return false;
    }
    if(player.countItem(ballId) <= 0){
      await this.say(itemName(ballId) + '이(가) 없다!');
      return false;
    }
    player.removeItem(ballId, 1);
    await this.say(itemName(ballId) + '을(를) 던졌다!');
    this.$('b-enemy-canvas').style.visibility = 'hidden';
    const success = Math.random() < catchChance(this.wild, ballBonus(ballId));
    const shakes = success ? 3 : 1 + Math.floor(Math.random() * 2);
    for(let i = 0; i < shakes; i++){
      SFX.play('catch');
      await this.say('흔들흔들...');
    }
    if(success){
      SFX.play('caught');
      const where = PokeMan.addCaught(this.wild);
      await this.say('신난다! ' + this.wild.name + '을(를) 잡았다!');
      if(where === 'box') await this.say('파티가 가득 차서 보관함으로 보냈다.');
      this.end('catch');
      return true;
    }
    SFX.play('fail');
    this.$('b-enemy-canvas').style.visibility = 'visible';
    await this.say('앗! 나와버렸다!');
    return false;
  },
  end(result){
    this.active = false;
    this.busy = false;
    this.trainer = null;
    this.enemyTeam = [];
    if(this.mE){ this.mE.root.rotation.x = 0; }
    if(this.mA){ this.mA.root.rotation.x = 0; }
    if(this.wildEnt){
      if(this.wildEnt.isNet){
        // 멀티플레이 게스트: 호스트에게 결과 통보
        if(typeof Net !== 'undefined') Net.wildBattleEnd(this.wildEnt.netId, result === 'win' || result === 'catch');
      } else if(result === 'win' || result === 'catch'){
        PokeMan.removeWild(this.wildEnt, result === 'win');
      } else {
        this.wildEnt.catching = false;
        this.wildEnt.fleeTimer = 4;
      }
      this.wildEnt = null;
    }
    setTimeout(() => {
      this.$('battle-overlay').classList.add('hidden');
      game.inBattle = false;
      UI.toast('화면을 클릭하면 게임으로 돌아갑니다');
      if(typeof saveGame === 'function') saveGame();
    }, 900);
  },
  renderTick(t){
    if(!this.active && this.$ === undefined) return;
    if(!this.active) return;
    if(this.mE){ this.mE.root.rotation.y = 0.3 + Math.sin(t * 0.0006) * 0.15; this.rE.render(this.scE, this.camE); }
    if(this.mA){ this.mA.root.rotation.y = Math.PI - 0.3 + Math.sin(t * 0.0007) * 0.15; this.rA.render(this.scA, this.camA); }
  }
};
