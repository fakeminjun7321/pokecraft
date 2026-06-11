// ===== main.js : 부팅, 게임 루프, 하늘/낮밤, 입력, 저장 =====
'use strict';

let renderer = null, scene = null, camera = null, world = null, player = null;
let worlds = {};          // 차원별 World 인스턴스
let pendingWorldSaves = {}; // 로드한 세이브의 차원별 데이터 (지연 역직렬화)
let sunLight, ambLight, sunSprite, moonSprite, stars, cloudMesh;
let highlightBox, crackBox, heldGroup;
let lastT = 0, autosaveAcc = 0, fpsAcc = 0, fpsCnt = 0, fpsShow = 0;
let debugOn = false, lastWTap = 0, lastSpaceTap = 0;

const game = {
  started: false, mode: 'survival', seed: 1, seedStr: '',
  time: 0.06, // 0 = 일출
  keys: {}, locked: false, inBattle: false, paused: false,
  shake: 0, swing: 0, sprint: false,
  followerOn: true, chatOpen: false, camMode: 0, riding: false, touch: false,
  dim: 'over', portalCd: 0, healCd: 0,
  get uiOpen(){ return typeof UI !== 'undefined' && UI.isOpen(); },
  isNight(){ return Math.sin(this.time * Math.PI * 2) < -0.05; },
  isDay(){ return !this.isNight(); },
};

function requestLock(showPauseOnFail){
  if(game.touch) return; // 터치 모드는 포인터락 불필요 (안드로이드 오류/토스트 방지)
  const cv = document.getElementById('game-canvas');
  if(!cv.requestPointerLock) return;
  // 크롬은 Esc 해제 직후 ~1.25초간 재잠금을 거부함
  const p = cv.requestPointerLock();
  if(p && p.catch) p.catch(() => {
    if(showPauseOnFail && game.started && !UI.isOpen() && !game.inBattle && player && !player.dead) UI.openPause();
    else if(game.started) UI.toast('화면을 클릭하면 계속!');
  });
}

// ---------- 부팅 ----------
function refreshContinueBtn(){
  const last = localStorage.getItem(storeKey('last'));
  const contBtn = document.getElementById('continue-btn');
  contBtn.disabled = !(last && localStorage.getItem(storeKey('save_' + last)));
}

function updateAccountBar(){
  const u = Account.user;
  document.getElementById('acct-status').textContent = u ? '👤 ' + u.name : '👤 로그인 안 됨';
  document.getElementById('acct-login-btn').classList.toggle('hidden', !!u);
  document.getElementById('acct-worlds-btn').classList.toggle('hidden', !u);
  document.getElementById('acct-export-btn').classList.toggle('hidden', !u);
  document.getElementById('acct-logout-btn').classList.toggle('hidden', !u);
  document.getElementById('acct-hint').textContent = u
    ? '세이브는 "' + u.name + '" 계정에 보관돼요 · 다른 컴퓨터로 옮기려면 [백업 저장] → [백업 불러오기]'
    : '로그인하면 세이브가 계정에 안전하게 보관되고, 백업 파일로 다른 컴퓨터에도 옮길 수 있어요';
  if(u){
    Net.myName = u.name;
    const ni = document.getElementById('player-name-input');
    if(ni) ni.value = u.name;
  }
  refreshContinueBtn();
}

function openWorldsModal(){
  const list = document.getElementById('worlds-list');
  list.innerHTML = '';
  const worlds = Account.worlds();
  if(!worlds.length) list.innerHTML = '<p style="padding:8px">아직 저장된 세계가 없어요. 새 게임을 시작해보세요!</p>';
  worlds.forEach(w => {
    const row = document.createElement('div');
    row.className = 'world-row';
    const date = w.savedAt ? new Date(w.savedAt).toLocaleString('ko-KR') : '?';
    // 사용자 입력(시드 문자열)이 들어가므로 textContent로만 구성 (XSS 방지)
    const mid = document.createElement('div');
    mid.className = 'world-mid';
    const nameEl = document.createElement('span');
    nameEl.className = 'w-name';
    nameEl.textContent = w.name;
    const metaEl = document.createElement('span');
    metaEl.className = 'w-meta';
    metaEl.textContent = (w.mode === 'creative' ? '크리에이티브' : '서바이벌') +
      ' · 포켓몬 ' + (+w.party || 0) + '마리 · 도감 ' + (+w.dex || 0) + '종 · ' + date;
    mid.appendChild(nameEl);
    mid.appendChild(metaEl);
    row.appendChild(mid);
    const play = document.createElement('button');
    play.textContent = '플레이';
    play.onclick = () => {
      SFX.init();
      document.getElementById('worlds-modal').classList.add('hidden');
      document.getElementById('start-screen').classList.add('hidden');
      loadGame(w.seed);
    };
    const del = document.createElement('button');
    del.textContent = '삭제';
    del.onclick = () => {
      if(confirm('"' + w.name + '" 세계를 정말 삭제할까요? 되돌릴 수 없어요!')){
        Account.deleteWorld(w.seed);
        openWorldsModal();
        refreshContinueBtn();
      }
    };
    row.appendChild(play);
    row.appendChild(del);
    list.appendChild(row);
  });
  // 멀티 게스트 기록 (친구 세계에서의 내 캐릭터/포켓몬)
  const guestPre = storeKey('guest_');
  let guestCount = 0;
  for(let i = 0; i < localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.startsWith(guestPre)) guestCount++;
  }
  if(guestCount > 0){
    const info = document.createElement('div');
    info.className = 'world-row';
    const mid = document.createElement('div');
    mid.className = 'world-mid';
    mid.textContent = '🌐 멀티 게스트 기록 ' + guestCount + '개 (친구 세계에서의 내 진행상황)';
    const clean = document.createElement('button');
    clean.textContent = '모두 정리';
    clean.onclick = () => {
      if(!confirm('친구 세계에 다시 접속하면 처음부터 시작하게 돼요. 정리할까요?')) return;
      const toDel = [];
      for(let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i);
        if(k && k.startsWith(guestPre)) toDel.push(k);
      }
      toDel.forEach(k => localStorage.removeItem(k));
      openWorldsModal();
    };
    info.appendChild(mid);
    info.appendChild(clean);
    list.appendChild(info);
  }
}

window.addEventListener('load', () => {
  buildAtlas();
  UI.init();
  Account.restore();
  updateAccountBar();

  // ===== 계정 UI =====
  document.querySelectorAll('[data-mclose]').forEach(b => {
    b.addEventListener('click', () => document.getElementById(b.dataset.mclose).classList.add('hidden'));
  });
  document.getElementById('acct-login-btn').addEventListener('click', () => {
    document.getElementById('acct-error').textContent = '';
    document.getElementById('account-modal').classList.remove('hidden');
    document.getElementById('acct-name').focus();
  });
  async function doAuth(kind){
    if(doAuth.busy) return; // 더블클릭 레이스 방지
    doAuth.busy = true;
    const name = document.getElementById('acct-name').value;
    const pin = document.getElementById('acct-pin').value;
    const err = document.getElementById('acct-error');
    err.textContent = '';
    try {
      const rec = kind === 'login' ? await Account.login(name, pin) : await Account.register(name, pin);
      document.getElementById('account-modal').classList.add('hidden');
      document.getElementById('acct-pin').value = '';
      updateAccountBar();
      UI.toast('환영합니다, ' + rec.name + '님!');
    } catch(e){
      err.textContent = e.message;
    } finally {
      doAuth.busy = false;
    }
  }
  document.getElementById('acct-login-do').addEventListener('click', () => doAuth('login'));
  document.getElementById('acct-register-do').addEventListener('click', () => doAuth('register'));
  document.getElementById('acct-pin').addEventListener('keydown', e => { if(e.key === 'Enter') doAuth('login'); });
  document.getElementById('acct-logout-btn').addEventListener('click', () => {
    Account.logout();
    updateAccountBar();
  });
  document.getElementById('acct-worlds-btn').addEventListener('click', () => {
    openWorldsModal();
    document.getElementById('worlds-modal').classList.remove('hidden');
  });
  document.getElementById('acct-export-btn').addEventListener('click', () => {
    try { Account.download(); } catch(e){ alert(e.message); }
  });
  document.getElementById('acct-import-input').addEventListener('change', e => {
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onerror = () => { alert('백업 파일을 읽지 못했어요'); e.target.value = ''; };
    reader.onload = () => {
      try {
        // 로그인 중인데 다른 사람 백업이면 합치기 전에 확인
        const owner = Account.peek(reader.result);
        if(Account.user && owner && owner !== Account.user.name &&
           !confirm('이 백업은 "' + owner + '" 계정 것이에요.\n지금 로그인된 "' + Account.user.name + '" 계정에 합칠까요?\n(같은 시드의 세계는 덮어써져요)')){
          e.target.value = '';
          return;
        }
        const r = Account.importData(reader.result);
        updateAccountBar();
        alert(r.name + ' 계정의 데이터 ' + r.count + '개를 가져왔어요!');
      } catch(err){ alert(err.message); }
      e.target.value = '';
    };
    reader.readAsText(f);
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    SFX.init();
    const seedStr = document.getElementById('seed-input').value.trim();
    game.seed = seedStr ? strSeed(seedStr) : ((Math.random() * 0x7fffffff) | 0) || 1;
    game.seedStr = seedStr || '랜덤 세계 #' + (game.seed % 1000);
    // 같은 시드의 세계가 이미 있으면 덮어쓰기 전에 확인
    if(localStorage.getItem(storeKey('save_' + game.seed))){
      if(!confirm('같은 시드의 세계가 이미 있어요!\n새로 만들면 기존 세계를 덮어씁니다. 계속할까요?\n(기존 세계를 하려면 취소 후 [내 세계]에서 플레이)')) return;
    }
    game.mode = document.getElementById('mode-select').value;
    const pokeOn = document.getElementById('poke-toggle').checked;
    document.getElementById('start-screen').classList.add('hidden');
    if(pokeOn) showStarterScreen(starterId => startGame({ pokeOn: true, starterId }));
    else startGame({ pokeOn: false });
  });
  document.getElementById('continue-btn').addEventListener('click', () => {
    SFX.init();
    document.getElementById('start-screen').classList.add('hidden');
    loadGame();
  });

  // ===== 멀티플레이 메뉴 =====
  const mainPanel = document.querySelector('#start-screen .panel');
  const mpPanel = document.getElementById('mp-panel');
  const nameInput = document.getElementById('player-name-input');
  nameInput.value = Net.myName;
  document.getElementById('mp-btn').addEventListener('click', () => {
    mainPanel.classList.add('hidden');
    mpPanel.classList.remove('hidden');
  });
  document.getElementById('mp-back-btn').addEventListener('click', () => {
    mpPanel.classList.add('hidden');
    mainPanel.classList.remove('hidden');
  });
  function saveName(){
    Net.myName = (nameInput.value.trim() || '플레이어').slice(0, 12);
    localStorage.setItem('pokecraft_name', Net.myName);
  }
  document.getElementById('mp-host-btn').addEventListener('click', () => {
    SFX.init();
    saveName();
    const btn = document.getElementById('mp-host-btn');
    btn.disabled = true;
    btn.textContent = '연결 중...';
    // 기존 세이브가 있으면 그 세계로, 없으면 새 세계로
    const last = localStorage.getItem(storeKey('last'));
    const hasSave = last && localStorage.getItem(storeKey('save_' + last));
    const useSave = hasSave && confirm('기존 세이브 세계로 방을 열까요?\n(취소하면 새 세계가 만들어져요)');
    Net.host(code => {
      const disp = document.getElementById('mp-code-display');
      disp.classList.remove('hidden');
      disp.innerHTML = '방 코드: <span class="code">' + code + '</span><br>친구에게 알려주세요! 잠시 후 시작합니다...';
      setTimeout(() => {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('pause-mpinfo').innerHTML = '방 코드: <b>' + code + '</b>';
        if(useSave) loadGame();
        else {
          game.seed = ((Math.random() * 0x7fffffff) | 0) || 1;
          game.seedStr = '멀티 세계 #' + (game.seed % 1000);
          game.mode = document.getElementById('mode-select').value;
          const pokeOn = document.getElementById('poke-toggle').checked;
          if(pokeOn) showStarterScreen(starterId => startGame({ pokeOn: true, starterId }));
          else startGame({ pokeOn: false });
        }
      }, 1500);
    }, () => {
      btn.disabled = false;
      btn.textContent = '방 만들기 (내가 호스트)';
      UI.toast('방 생성 실패 — 인터넷 연결을 확인하세요');
    });
  });
  document.getElementById('mp-join-btn').addEventListener('click', () => {
    SFX.init();
    saveName();
    const code = document.getElementById('mp-join-code').value.trim().toUpperCase();
    if(code.length < 4){ alert('초대 코드를 입력하세요'); return; }
    const btn = document.getElementById('mp-join-btn');
    btn.disabled = true;
    btn.textContent = '접속 중...';
    Net.join(code, init => {
      document.getElementById('start-screen').classList.add('hidden');
      game.seed = init.seed;
      game.mode = init.mode || 'survival';
      game.time = init.time;
      const guestSave = localStorage.getItem(storeKey('guest_' + init.seed));
      if(!guestSave && init.pokeOn){
        showStarterScreen(starterId => startGame({ netInit: init, starterId }));
      } else {
        startGame({ netInit: init, guestSave: guestSave ? migrateSave(JSON.parse(guestSave)) : null });
      }
    }, () => {
      btn.disabled = false;
      btn.textContent = '참가하기';
      alert('접속 실패 — 코드를 확인하거나 호스트가 방을 열었는지 확인하세요');
    });
  });

  bindInput();
  Music.init();
  Minimap.init();
  Touch.init();
  if(game.touch) document.body.classList.add('touch');
  requestAnimationFrame(loop);
});

function showStarterScreen(cb){
  const scr = document.getElementById('starter-screen');
  const row = document.getElementById('starter-row');
  row.innerHTML = '';
  [1, 4, 7].forEach(sp => {
    const card = document.createElement('div');
    card.className = 'starter-card';
    card.innerHTML = `<img src="${portraitURL(sp)}"><div class="s-name">${SPECIES[sp].name}</div><div class="s-type">${SPECIES[sp].types.map(t => TYPES[t].n).join(' · ')} 타입</div>`;
    card.onclick = () => {
      SFX.play('caught');
      scr.classList.add('hidden');
      cb(sp);
    };
    row.appendChild(card);
  });
  scr.classList.remove('hidden');
}

// ---------- three.js 환경 ----------
function setupThree(){
  if(renderer) return;
  const cv = document.getElementById('game-canvas');
  renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 1000);
  scene.add(camera);

  ambLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambLight);
  sunLight = new THREE.DirectionalLight(0xffffff, 0.7);
  sunLight.position.set(40, 80, 20);
  scene.add(sunLight);

  // 해/달
  function skyBillboard(color, size){
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(12, 12, 40, 40);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
    sp.scale.set(size, size, 1);
    sp.renderOrder = -10;
    scene.add(sp);
    return sp;
  }
  sunSprite = skyBillboard('#fdee6a', 30);
  moonSprite = skyBillboard('#e8eef5', 22);

  // 별
  const starPos = [];
  for(let i = 0; i < 350; i++){
    const v = new THREE.Vector3(Math.random()*2-1, Math.random()*1.6-0.2, Math.random()*2-1).normalize().multiplyScalar(380);
    starPos.push(v.x, v.y, v.z);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
  stars.renderOrder = -11;
  scene.add(stars);

  // 구름
  const cc = document.createElement('canvas'); cc.width = cc.height = 256;
  const cctx = cc.getContext('2d');
  cctx.fillStyle = '#fff';
  const crng = mulberry32(7);
  for(let i = 0; i < 26; i++){
    const x = crng()*256, y = crng()*256, w = 24 + crng()*48, h = 10 + crng()*16;
    cctx.fillRect(x, y, w, h);
    cctx.fillRect(x+8, y-6, w*0.6, h*0.6);
  }
  const ctex = new THREE.CanvasTexture(cc);
  ctex.wrapS = ctex.wrapT = THREE.RepeatWrapping;
  ctex.repeat.set(3, 3);
  ctex.magFilter = THREE.NearestFilter;
  cloudMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 900),
    new THREE.MeshBasicMaterial({ map: ctex, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, fog: false })
  );
  cloudMesh.rotation.x = -Math.PI / 2;
  cloudMesh.position.y = 78;
  cloudMesh.renderOrder = -5;
  scene.add(cloudMesh);

  // 블록 하이라이트 + 균열
  highlightBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
    new THREE.LineBasicMaterial({ color: 0x111111 })
  );
  highlightBox.visible = false;
  scene.add(highlightBox);
  crackBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.004, 1.004, 1.004),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 })
  );
  crackBox.visible = false;
  scene.add(crackBox);

  // 손에 든 아이템
  heldGroup = new THREE.Group();
  heldGroup.position.set(0.5, -0.45, -0.75);
  camera.add(heldGroup);

  scene.fog = new THREE.Fog(0x87ceeb, 30, 100);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

let myModel = null;
function updateSelfModel(dt){
  const show = game.camMode === 1;
  if(show && !myModel){
    const mm = buildBiped({ body:'#3aa8a0', headC:'#e0b08a', legC:'#3a4f8f', armC:'#3aa8a0', legH:0.75, bh:0.7 });
    myModel = { group: mm.group, legs: mm.legs, arms: mm.arms, phase: 0 };
    scene.add(myModel.group);
  }
  if(!myModel) return;
  myModel.group.visible = show;
  if(!show) return;
  const b = player.body;
  myModel.group.position.set(b.x, b.y, b.z);
  myModel.group.rotation.y = player.yaw + Math.PI;
  const sp = Math.hypot(b.vx, b.vz);
  myModel.phase += sp * dt * 4;
  const sw = Math.sin(myModel.phase) * Math.min(1, sp) * 0.6;
  myModel.legs.forEach((l, i) => { l.rotation.x = (i % 2 ? -sw : sw); });
  (myModel.arms || []).forEach((a, i) => { a.rotation.x = (i % 2 ? sw : -sw) * 0.7; });
  const armKey = player.armor.map(a => a ? a.id : 0).join(',');
  if(myModel._armKey !== armKey){
    myModel._armKey = armKey;
    applyArmorOverlay(myModel, player.armor.map(a => a ? a.id : 0));
  }
}

function updateHeldItem(){
  if(!heldGroup) return;
  while(heldGroup.children.length){
    const c = heldGroup.children[0];
    heldGroup.remove(c);
    disposeObject(c);
  }
  const s = player && player.currentItem();
  if(!s) return;
  if(isBlockId(s.id) && BLOCKS[s.id].rt !== RT.CROSS){
    heldGroup.add(new THREE.Mesh(makeBlockGeometry(s.id, 0.4), world.matSolid));
  } else {
    const sp = new THREE.Sprite(iconSpriteMaterial(s.id));
    sp.scale.set(0.45, 0.45, 0.45);
    heldGroup.add(sp);
  }
}

// ---------- 게임 시작/로드 ----------
function startGame(opts){
  setupThree();
  const loading = document.getElementById('loading-screen');
  loading.classList.remove('hidden');

  worlds = {};
  pendingWorldSaves = {};
  game.dim = (opts.loadData && opts.loadData.dim) || 'over';
  if(opts.loadData && opts.loadData.netherWorld) pendingWorldSaves.nether = opts.loadData.netherWorld;
  if(opts.loadData && opts.loadData.endWorld) pendingWorldSaves.end = opts.loadData.endWorld;
  if(opts.netInit && opts.netInit.nether) pendingWorldSaves.nether = opts.netInit.nether;
  if(opts.netInit && opts.netInit.end) pendingWorldSaves.end = opts.netInit.end;
  world = getWorld(game.dim);
  const userOpts = JSON.parse(localStorage.getItem('pokecraft_opts') || '{}');
  if(userOpts.renderDist) world.renderDist = clamp(userOpts.renderDist, 3, 6);
  scene.add(world.group);
  ItemDrops.init(scene);
  Particles.init(scene);
  Projectiles.init(scene);
  TNTs.init(scene);
  MobManager.reset();
  PokeMan.reset();
  Follower.clear();

  player = new Player(world, camera);

  if(opts.netInit){
    // ===== 멀티 게스트: 호스트가 보낸 세계 정보로 시작 =====
    const init = opts.netInit;
    getWorld('over').deserialize({ edits: init.edits, furnaces: init.furnaces, chests: init.chests, spawn: init.spawn });
    PokeMan.enabled = init.pokeOn !== false;
    if(!world.spawnPoint) world.spawnPoint = world.findSpawn();
    if(opts.guestSave){
      player.deserialize(opts.guestSave.player);
      loadAccountPoke(opts.guestSave.poke, opts.guestSave.pokeMigrated);
    } else {
      const sp = world.spawnPoint;
      player.spawnAt({ x: sp.x, y: sp.y + 2, z: sp.z });
      if(game.mode === 'survival'){
        player.addItem(I.APPLE, 5);
        if(PokeMan.enabled) player.addItem(I.POKEBALL, 5);
      }
      loadAccountPoke(null, true);
      if(opts.starterId && !PokeMan.party.length){
        const starter = new PokeInst(opts.starterId, 5);
        PokeMan.party.push(starter);
        PokeMan.seen.add(opts.starterId);
        PokeMan.caught.add(opts.starterId);
      } else if(PokeMan.party.length){
        setTimeout(() => UI.toast('👤 계정에 보관된 내 포켓몬과 함께 시작!', 4000), 1200);
      }
    }
  } else if(opts.loadData){
    const d = opts.loadData;
    if(game.dim === 'over') world.deserialize(d.world);
    else pendingWorldSaves.over = d.world; // 네더에서 저장했으면 오버월드는 지연 로드
    loadAccountPoke(d.poke, d.pokeMigrated);
    game.time = d.time !== undefined ? d.time : 0.06;
    player.deserialize(d.player);
  } else {
    PokeMan.enabled = opts.pokeOn;
    game.time = 0.06;
    if(!world.spawnPoint) world.spawnPoint = world.findSpawn();
    const sp = world.spawnPoint;
    player.spawnAt({ x: sp.x, y: sp.y + 2, z: sp.z });
    if(game.mode === 'survival'){
      player.addItem(I.APPLE, 5);
      if(opts.pokeOn) player.addItem(I.POKEBALL, 5);
    }
    loadAccountPoke(null, true);
    if(opts.starterId && !PokeMan.party.length){
      const starter = new PokeInst(opts.starterId, 5);
      PokeMan.party.push(starter);
      PokeMan.seen.add(opts.starterId);
      PokeMan.caught.add(opts.starterId);
    } else if(PokeMan.party.length){
      setTimeout(() => UI.toast('👤 계정에 보관된 내 포켓몬과 함께 시작!', 4000), 1200);
    }
  }

  // 동기 사전 생성 (진행률 표시) — MessageChannel은 백그라운드 탭에서도 스로틀되지 않음
  const pg = world.pregen(player.body.x, player.body.z);
  const fill = document.getElementById('loading-bar-fill');
  let i = 0;
  const pgChan = new MessageChannel();
  pgChan.port1.onmessage = step;
  function step(){
    const t0 = performance.now();
    while(i < pg.todo.length && performance.now() - t0 < 30){ pg.step(i); i++; }
    fill.style.width = (i / pg.todo.length * 100) + '%';
    if(i < pg.todo.length){ pgChan.port2.postMessage(0); return; }
    // 시작! (게스트 세이브 복원 시에는 저장된 위치 유지)
    if(!opts.loadData && !opts.guestSave){
      const sp = world.spawnPoint;
      player.spawnAt({ x: sp.x, y: world.colTop(sp.x, sp.z) + 1.5, z: sp.z });
    }
    loading.classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    game.started = true;
    Music.start();
    Minimap.reset();
    // 월드 준비 전에 접속해서 대기 중이던 게스트 처리
    if(Net.mode === 'host') Net.flushHello();
    UI.updateHotbar();
    UI.updateHUD();
    UI.toast('화면을 클릭하면 시작! (Esc: 메뉴, 조작법은 메뉴에서)');
    saveGame();
  }
  step();
}

function saveGame(){
  if(!game.started || !world) return;
  try {
    const pdata = player.serialize();
    const overW = worlds.over || world;
    // 커서/제작칸에 들고 있던 아이템도 저장 (소실 방지)
    pdata.extra = [UI.cursor, ...(UI.craftCells || [])].filter(Boolean);
    saveAccountPoke(); // 포켓몬은 계정 귀속
    if(Net.mode === 'guest'){
      // 게스트: 자기 캐릭터만 저장 (세계는 호스트 것, 포켓몬은 계정)
      localStorage.setItem(storeKey('guest_' + game.seed),
        JSON.stringify({ v: SAVE_VERSION, savedAt: Date.now(), player: pdata, poke: PokeMan.serialize(), pokeMigrated: true }));
      return;
    }
    const data = {
      v: SAVE_VERSION, savedAt: Date.now(),
      seed: game.seed, seedStr: game.seedStr || ('세계 ' + game.seed),
      mode: game.mode, time: game.time, dim: game.dim, pokeMigrated: true,
      world: worlds.over ? worlds.over.serialize() : (pendingWorldSaves.over || overW.serialize()),
      netherWorld: worlds.nether ? worlds.nether.serialize() : (pendingWorldSaves.nether || null),
      endWorld: worlds.end ? worlds.end.serialize() : (pendingWorldSaves.end || null),
      player: pdata,
      poke: PokeMan.serialize(),
    };
    localStorage.setItem(storeKey('save_' + game.seed), JSON.stringify(data));
    localStorage.setItem(storeKey('last'), String(game.seed));
  } catch(e){
    console.warn('저장 실패', e);
  }
}
function loadGame(seedArg){
  try {
    const seed = seedArg !== undefined ? seedArg : localStorage.getItem(storeKey('last'));
    const data = migrateSave(JSON.parse(localStorage.getItem(storeKey('save_' + seed))));
    game.seed = data.seed;
    game.seedStr = data.seedStr || ('세계 ' + data.seed);
    game.mode = data.mode || 'survival';
    startGame({ loadData: data });
  } catch(e){
    console.error('불러오기 실패', e);
    UI.toast('저장 데이터를 불러올 수 없어요');
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
  }
}
window.addEventListener('beforeunload', () => saveGame());

// ---------- 잠자기 ----------
function startSleep(){
  const fade = document.getElementById('fade');
  fade.style.opacity = 1;
  game.paused = true;
  setTimeout(() => {
    game.time = 0.03;
    MobManager.list.slice().forEach(m => { if(m.def.hostile) m.die(false); });
    game.paused = false;
    fade.style.opacity = 0;
    UI.toast('푹 잤다! 아침이 되었다 (스폰 지점 설정됨)');
    if(typeof Ach !== 'undefined') Ach.unlock('sleep');
    saveGame();
  }, 1300);
}

// ---------- 배틀 시작 ----------
function tryBattle(){
  if(!PokeMan.enabled){ UI.toast('포켓몬 모드가 꺼져 있어요'); return; }
  if(game.inBattle || UI.isOpen() || player.dead) return;
  if(!PokeMan.party.length){ UI.toast('포켓몬이 없어요! 포켓볼을 야생 포켓몬에게 던져 잡아보세요'); return; }
  if(!PokeMan.partyAlive()){ UI.toast('포켓몬들이 모두 지쳐 있어요... 시간이 지나면 회복돼요'); return; }
  if(Net.mode === 'guest'){
    const p = Net.nearestWildPuppet(9);
    if(!p){ UI.toast('근처에 야생 포켓몬이 없어요 (9블록 이내)'); return; }
    Net.engageWild(p, null);
    return;
  }
  let best = null, bd = 9;
  for(const w of PokeMan.wilds){
    if(w.catching) continue; // 포획 연출 중인 야생 제외
    const d = dist3(w.body.x, w.body.y, w.body.z, player.body.x, player.body.y, player.body.z);
    if(d < bd){ bd = d; best = w; }
  }
  if(!best){ UI.toast('근처에 야생 포켓몬이 없어요 (9블록 이내)'); return; }
  Battle.start(best);
}

// ---------- 계정 귀속 포켓몬 ----------
// 포켓몬(파티/박스/도감/배지)은 세계가 아니라 로그인 계정에 저장된다.
function loadAccountPoke(worldPoke, migrated){
  let acct = null;
  try { acct = JSON.parse(localStorage.getItem(storeKey('pokemon')) || 'null'); } catch(e){}
  if(acct){
    PokeMan.deserialize(acct);
    if(worldPoke && !migrated){
      // 업데이트 전 세계별 포켓몬 1회 병합 (계정 박스로)
      const old = [...(worldPoke.party || []), ...(worldPoke.box || [])];
      old.forEach(dd => PokeMan.box.push(PokeInst.from(dd)));
      (worldPoke.seen || []).forEach(s => PokeMan.seen.add(s));
      (worldPoke.caught || []).forEach(s => PokeMan.caught.add(s));
      (worldPoke.badges || []).forEach(s => PokeMan.badges.add(s));
      if(old.length) setTimeout(() => UI.toast('🎒 이 세계의 포켓몬 ' + old.length + '마리를 계정 박스로 옮겼어요!', 5000), 1500);
    }
    return true;
  }
  if(worldPoke){ PokeMan.deserialize(worldPoke); return true; }
  return false;
}
function saveAccountPoke(){
  try { localStorage.setItem(storeKey('pokemon'), JSON.stringify(PokeMan.serialize())); } catch(e){}
}

// ---------- 차원 (오버월드 ↔ 네더) ----------
function getWorld(dim){
  if(!worlds[dim]){
    worlds[dim] = new World(game.seed, dim);
    if(pendingWorldSaves[dim]){
      worlds[dim].deserialize(pendingWorldSaves[dim]);
      delete pendingWorldSaves[dim];
    }
  }
  return worlds[dim];
}
function swapWorldTo(to){
  // 이전 차원 정리 (펫은 같이 이동)
  scene.remove(world.group);
  MobManager.list.slice().forEach(mb => {
    if(mb.tamed) return;
    mb.dead = true; scene.remove(mb.group); disposeObject(mb.group);
  });
  MobManager.list = MobManager.list.filter(mb => mb.tamed);
  PokeMan.wilds.slice().forEach(w2 => PokeMan.removeWild(w2, false));
  Projectiles.clear(); TNTs.clear();
  game.dim = to;
  world = getWorld(to);
  scene.add(world.group);
  player.world = world;
  Minimap.reset();
  ItemDrops.list.forEach(d => {
    d.dim = d.dim || 'over';
    d.mesh.visible = d.dim === to;
  });
}
function switchDimension(target){
  const from = game.dim;
  const to = target || (from === 'over' ? 'nether' : 'over');
  const fade = document.getElementById('fade');
  fade.style.opacity = 1;
  game.portalCd = 5;
  // 좌표 매핑 (네더 1칸 = 오버월드 8칸)
  const sx = to === 'nether' ? player.body.x / 8 : player.body.x * 8;
  const sz = to === 'nether' ? player.body.z / 8 : player.body.z * 8;
  swapWorldTo(to);
  setTimeout(() => {
    let dest;
    if(to === 'end'){
      // 엔드: 본섬 동쪽 가장자리에 도착
      const pg0 = world.pregen(44, 0);
      for(let i = 0; i < pg0.todo.length && pg0.todo[i][2] <= 2.5; i++) pg0.step(i);
      let ty = world.colTop(44, 0);
      if(ty < 5){
        for(let dx = -2; dx <= 2; dx++) for(let dz = -2; dz <= 2; dz++) world.setBlock(44 + dx, 30, dz, B.OBSIDIAN);
        ty = 30;
      }
      dest = { x: 44.5, y: ty + 1.6, z: 0.5 };
    } else if(from === 'end'){
      // 엔드에서 귀환: 오버월드 스폰(침대)으로
      const sp = world.spawnPoint || world.findSpawn();
      const pg0 = world.pregen(sp.x, sp.z);
      for(let i = 0; i < pg0.todo.length && pg0.todo[i][2] <= 2.5; i++) pg0.step(i);
      let ty = sp.y;
      if(world.isSolid(sp.x, ty, sp.z) || world.isSolid(sp.x, ty + 1, sp.z)) ty = world.colTop(sp.x, sp.z) + 1.5;
      dest = { x: sp.x, y: ty + 0.3, z: sp.z };
    } else {
      // 도착 지점 청크 먼저 생성 (포탈 레지스트리가 채워져야 기존 포탈을 찾음)
      const pg0 = world.pregen(sx, sz);
      for(let i = 0; i < pg0.todo.length && pg0.todo[i][2] <= 2.5; i++) pg0.step(i);
      // 도착 포탈 찾기/건설
      dest = world.nearestPortal(sx, sz, 24);
      if(dest) dest = { x: dest.x + 0.5, y: dest.y + 0.2, z: dest.z + 0.5 };
      else dest = world.buildArrivalPortal(sx, sz);
    }
    player.portalArmed = false; // 도착 포탈에서 나가야 재발동
    player.spawnAt(dest);
    // 펫 이동
    MobManager.list.forEach(mb => { if(mb.tamed){ mb.body.x = dest.x + 1; mb.body.y = dest.y + 1; mb.body.z = dest.z + 1; } });
    world.update(dest.x, dest.z);
    fade.style.opacity = 0;
    UI.toast(to === 'nether' ? '🔥 네더에 도착했다...'
      : to === 'end' ? '🌌 엔드에 도착했다... 엔더드래곤을 물리쳐라!'
      : '🌍 오버월드로 돌아왔다!');
    if(typeof Ach !== 'undefined'){
      if(to === 'nether') Ach.unlock('nether');
      if(to === 'end') Ach.unlock('end');
    }
    saveGame();
  }, 700);
}

// 엔드 포탈 프레임 12개가 모두 점등됐는지 검사 → 3x3 포탈 생성
function tryActivateEndPortal(w, fx, fy, fz){
  for(let cx = fx - 2; cx <= fx + 2; cx++){
    for(let cz = fz - 2; cz <= fz + 2; cz++){
      let ok = true;
      for(let t = -1; t <= 1 && ok; t++){
        if(w.getBlock(cx - 2, fy, cz + t) !== B.END_FRAME_LIT) ok = false;
        if(w.getBlock(cx + 2, fy, cz + t) !== B.END_FRAME_LIT) ok = false;
        if(w.getBlock(cx + t, fy, cz - 2) !== B.END_FRAME_LIT) ok = false;
        if(w.getBlock(cx + t, fy, cz + 2) !== B.END_FRAME_LIT) ok = false;
      }
      if(!ok) continue;
      for(let dx = -1; dx <= 1; dx++) for(let dz = -1; dz <= 1; dz++) w.setBlock(cx + dx, fy, cz + dz, B.END_PORTAL);
      return true;
    }
  }
  return false;
}

// 엔더드래곤 처치: 귀환 포탈 + 드래곤 알
function dragonDefeated(mob){
  const w = worlds.end || world;
  if(w.flags.dragonDead) return;
  w.flags.dragonDead = true;
  const ty = w.colTop(0, 0) || 32;
  for(let dx = -2; dx <= 2; dx++) for(let dz = -2; dz <= 2; dz++) w.setBlock(dx, ty + 1, dz, B.BEDROCK);
  for(let dx = -1; dx <= 1; dx++) for(let dz = -1; dz <= 1; dz++) if(dx || dz) w.setBlock(dx, ty + 2, dz, B.END_PORTAL);
  w.setBlock(0, ty + 2, 0, B.BEDROCK);
  w.setBlock(0, ty + 3, 0, B.BEDROCK);
  w.setBlock(0, ty + 4, 0, B.DRAGON_EGG);
  if(mob) explodeFx(mob.body.x, mob.body.y + 1, mob.body.z);
  UI.toast('🏆 엔더드래곤을 물리쳤다!! 섬 중앙의 귀환 포탈로 돌아가자!', 8000);
  SFX.play('evolve');
  if(typeof Ach !== 'undefined') Ach.unlock('dragon');
  saveGame();
}
function explodeFx(x, y, z){
  for(let i = 0; i < 6; i++){
    setTimeout(() => Particles.spawn(x + (Math.random() - 0.5) * 4, y + (Math.random() - 0.5) * 3, z + (Math.random() - 0.5) * 4, 0xc84af0, 20, 3, 1, 2), i * 180);
  }
  game.shake = Math.max(game.shake, 0.8);
}

// ---------- 포켓몬 타기 ----------
function toggleRide(){
  if(!game.started || game.inBattle || UI.isOpen() || !player || player.dead) return;
  if(game.riding){
    game.riding = false;
    player.body.noGravity = false;
    UI.toast(PokeMan.party.length ? PokeMan.party[0].name + '에서 내렸다' : '내렸다');
    return;
  }
  if(!PokeMan.enabled || !PokeMan.party.length){ UI.toast('탈 포켓몬이 없어요!'); return; }
  if(!game.followerOn){ UI.toast('파티 화면(P)에서 파트너 따라오기를 켜주세요'); return; }
  const p0 = PokeMan.party[0];
  if(p0.hp <= 0){ UI.toast(p0.name + '은(는) 지쳐서 태워줄 수 없어요...'); return; }
  game.riding = true;
  const rt = rideTypeFor(p0.sp);
  UI.toast('🐾 ' + p0.name + RIDE_MSG[rt]);
  SFX.play('pop');
}

// ---------- 체육관 도전 ----------
function startGymBattle(gym){
  if(!PokeMan.enabled){ UI.toast('포켓몬 모드가 꺼져 있어요'); return; }
  if(game.inBattle || UI.isOpen()) return;
  if(!PokeMan.party.length){ UI.toast('포켓몬이 없으면 도전할 수 없어요!'); return; }
  if(!PokeMan.partyAlive()){ UI.toast('포켓몬들이 모두 지쳐 있어요...'); return; }
  if(typeof Net !== 'undefined' && Net.mode === 'guest'){ UI.toast('체육관 도전은 호스트만 가능해요 (다음 업데이트 예정!)'); return; }
  Battle.startTrainer(gym.type, gym.key);
}

// ---------- 채팅 ----------
function openChat(){
  if(Net.mode === 'off') return;
  game.chatOpen = true;
  const inp = document.getElementById('chat-input');
  inp.classList.remove('hidden');
  if(document.exitPointerLock) document.exitPointerLock();
  setTimeout(() => inp.focus(), 50);
}
function closeChat(send){
  const inp = document.getElementById('chat-input');
  if(send && inp.value.trim()) Net.sendChat(inp.value);
  inp.value = '';
  inp.classList.add('hidden');
  inp.blur();
  game.chatOpen = false;
  if(game.started && !UI.isOpen() && !game.inBattle && !player.dead) requestLock();
}

// ---------- 입력 ----------
function bindInput(){
  const cv = document.getElementById('game-canvas');
  cv.addEventListener('click', () => {
    SFX.init();
    if(game.started && !UI.isOpen() && !game.inBattle && !player.dead && !game.locked) requestLock();
  });
  document.addEventListener('pointerlockchange', () => {
    game.locked = document.pointerLockElement === cv;
    if(!game.locked && game.started && !UI.isOpen() && !game.inBattle && !player.dead && !game.chatOpen){
      UI.openPause();
    }
    if(player) player.mouseLeft = false;
  });
  document.addEventListener('mousemove', e => {
    if(game.locked && player && !game.inBattle) player.look(e.movementX, e.movementY);
  });
  document.addEventListener('mousedown', e => {
    if(!game.started || !game.locked || game.inBattle || !player || player.dead) return;
    if(e.button === 0){ player.mouseLeft = true; player.attack(); }
    else if(e.button === 2){
      const it = player.currentItem();
      const t = it ? toolInfo(it.id) : null;
      if(t && t.kind === 'bow'){
        // 활을 들고 있어도 상호작용 블록은 열 수 있게
        const hit = player.raycastBlock();
        const interactive = hit && [B.CRAFT, B.FURNACE, B.FURNACE_LIT, B.CHEST, B.BED, B.TNT].includes(hit.id);
        if(interactive) player.use();
        else player.startCharge();
      }
      else player.use();
    }
  });
  document.addEventListener('mouseup', e => {
    if(e.button === 0 && player) player.mouseLeft = false;
    if(e.button === 2 && player) player.releaseBow();
    if(UI._drag) UI._finishDrag();
  });
  document.addEventListener('contextmenu', e => {
    if(game.started) e.preventDefault();
  });
  document.addEventListener('wheel', e => {
    if(!game.locked || !player) return;
    player.selected = (player.selected + (e.deltaY > 0 ? 1 : -1) + 9) % 9;
    UI.updateHotbar();
  }, { passive: true });

  document.addEventListener('keydown', e => {
    // 채팅 입력 중에는 게임 키 무시
    if(game.chatOpen){
      if(e.code === 'Enter') closeChat(true);
      else if(e.code === 'Escape') closeChat(false);
      e.stopPropagation();
      return;
    }
    game.keys[e.code] = true;
    if(!game.started || game.inBattle) return;

    if(e.code === 'KeyT' && Net.mode !== 'off' && !UI.isOpen() && !player.dead){
      e.preventDefault();
      openChat();
      return;
    }
    if(e.code.startsWith('Digit')){
      const n = +e.code.slice(5);
      if(n >= 1 && n <= 9 && player){
        const hov = UI._hoverSlot;
        if(UI.isOpen() && hov && !hov.opts.output){
          // 마크처럼: 슬롯에 마우스 올리고 숫자키 → 핫바와 스왑
          const tmp = hov.ref.get();
          hov.ref.set(player.inventory[n - 1]);
          player.inventory[n - 1] = tmp;
          UI.refresh();
        } else if(!UI.isOpen()){
          player.selected = n - 1;
          UI.updateHotbar();
        }
      }
    }
    if(e.code === 'KeyQ' && !UI.isOpen() && game.locked && player && !player.dead){
      player.dropSelected(e.ctrlKey || e.metaKey);
    }
    if(e.code === 'F5'){
      e.preventDefault();
      game.camMode = game.camMode === 0 ? 1 : 0;
      UI.toast(game.camMode === 1 ? '3인칭 시점' : '1인칭 시점');
    }
    if(e.code === 'KeyW'){
      const now = performance.now();
      if(now - lastWTap < 280) game.sprint = true;
      lastWTap = now;
    }
    // 마크처럼: 크리에이티브에서 Space 2번 = 비행 토글
    if(e.code === 'Space' && !e.repeat && game.mode === 'creative' && player && !game.uiOpen && !game.inBattle){
      const now = performance.now();
      if(now - lastSpaceTap < 280){
        player.fly = !player.fly;
        player.body.noGravity = player.fly;
        if(player.fly) player.body.vy = 0;
        UI.toast(player.fly ? '비행 모드 ON (Space 2번으로 끄기)' : '비행 모드 OFF');
        lastSpaceTap = 0;
      } else lastSpaceTap = now;
    }
    if(e.code === 'KeyE'){
      if(UI.open === 'inv' || UI.open === 'furnace'){ UI.close(); requestLock(); }
      else if(!UI.isOpen() && !player.dead) UI.openInventory(false);
    }
    if(e.code === 'Escape'){
      if(UI.open === 'help'){ UI.close(); } // close()가 일시정지 메뉴로 복귀시킴 — 재잠금 금지
      else if(UI.isOpen()){ UI.close(); if(!player.dead) requestLock(); }
    }
    if(e.code === 'KeyF' && game.mode === 'creative' && player){
      player.fly = !player.fly;
      player.body.noGravity = player.fly;
      if(player.fly) player.body.vy = 0;
      UI.toast(player.fly ? '비행 모드 ON' : '비행 모드 OFF');
    }
    if(e.code === 'KeyB'){
      if(UI.open === 'recipes'){ UI.close(); requestLock(); }
      else if(!UI.isOpen() && !player.dead) UI.openRecipes();
    }
    if(e.code === 'F1'){
      e.preventDefault();
      if(UI.open === 'help'){ UI.close(); if(!player.dead) requestLock(); }
      else if(!UI.isOpen() && !player.dead){
        UI._helpFromPause = false;
        UI.showOverlay('help-overlay');
        UI.open = 'help';
        if(document.exitPointerLock) document.exitPointerLock();
      }
    }
    if(e.code === 'KeyR') tryBattle();
    if(e.code === 'KeyG') toggleRide();
    if(e.code === 'KeyM'){
      Minimap.visible = !Minimap.visible;
      document.getElementById('minimap').classList.toggle('hidden', !Minimap.visible);
    }
    if(e.code === 'KeyP'){
      if(UI.open === 'party') { UI.close(); requestLock(); }
      else if(!UI.isOpen() && !player.dead) UI.openParty();
    }
    if(e.code === 'KeyK'){
      if(UI.open === 'dex') { UI.close(); requestLock(); }
      else if(!UI.isOpen() && !player.dead) UI.openDex();
    }
    if(e.code === 'F3'){
      e.preventDefault();
      debugOn = !debugOn;
      document.getElementById('debug').classList.toggle('hidden', !debugOn);
    }
  });
  // 터치 이동축 → 가상 키 (매 프레임 갱신은 루프에서)
  document.addEventListener('keyup', e => {
    game.keys[e.code] = false;
    if(e.code === 'KeyW') game.sprint = false;
  });
  // 포커스를 잃으면 키 상태 초기화 (복귀 후 혼자 걸어가는 것 방지)
  window.addEventListener('blur', () => {
    game.keys = {};
    game.sprint = false;
    if(player) player.mouseLeft = false;
  });
}

// ---------- 하늘/낮밤 ----------
const skyDay = new THREE.Color(0x87ceeb);
const skyNight = new THREE.Color(0x0b1026);
const skySunset = new THREE.Color(0xe8915a);
const _skyColor = new THREE.Color();

function updateSky(){
  if(game.dim === 'end'){
    ambLight.intensity = 0.55;
    sunLight.intensity = 0.15;
    _skyColor.setHex(0x0b0a16);
    scene.background = _skyColor;
    scene.fog.color.copy(_skyColor);
    scene.fog.near = 35; scene.fog.far = 95;
    sunSprite.material.opacity = 0; moonSprite.material.opacity = 0;
    stars.material.opacity = 0.9;
    cloudMesh.material.opacity = 0;
    document.getElementById('water-tint').style.opacity = 0;
    return;
  }
  if(game.dim === 'nether'){
    ambLight.intensity = 0.55;
    sunLight.intensity = 0.12;
    _skyColor.setHex(0x2a0d0d);
    scene.background = _skyColor;
    scene.fog.color.copy(_skyColor);
    scene.fog.near = 10; scene.fog.far = 52;
    sunSprite.material.opacity = 0; moonSprite.material.opacity = 0;
    stars.material.opacity = 0; cloudMesh.material.opacity = 0;
    document.getElementById('water-tint').style.opacity = 0;
    return;
  }
  const ang = game.time * Math.PI * 2;
  const sunH = Math.sin(ang);
  const dayF = clamp((sunH + 0.12) / 0.35, 0, 1);
  ambLight.intensity = lerp(0.22, 0.66, dayF);
  sunLight.intensity = lerp(0.03, 0.5, dayF);
  sunLight.position.set(Math.cos(ang) * 60, Math.max(10, sunH * 100), 25);

  _skyColor.copy(skyNight).lerp(skyDay, dayF);
  const sunsetF = clamp(1 - Math.abs(sunH) / 0.22, 0, 1) * 0.65;
  _skyColor.lerp(skySunset, sunsetF);

  // 물 속이면 파랗게 (급격한 깜빡임 방지를 위해 부드럽게 전환)
  const camBlock = world.getBlock(camera.position.x, camera.position.y, camera.position.z);
  const inWater = BLOCKS[camBlock] && BLOCKS[camBlock].rt === RT.WATER;
  game._waterT = lerp(game._waterT || 0, inWater ? 1 : 0, Math.min(1, 0.016 * 9));
  const wt = game._waterT;
  document.getElementById('water-tint').style.opacity = (wt * 0.95).toFixed(2);
  _skyColor.lerp(new THREE.Color(0x1a3a8c), wt);
  scene.fog.near = lerp(world.renderDist * CHUNK * 0.55, 2, wt);
  scene.fog.far = lerp(world.renderDist * CHUNK * 1.0, 18, wt);
  scene.background = _skyColor;
  scene.fog.color.copy(_skyColor);

  stars.material.opacity = 1 - dayF;
  stars.position.copy(camera.position);

  const r = 300;
  sunSprite.position.set(camera.position.x + Math.cos(ang) * r, camera.position.y + sunH * r, camera.position.z);
  moonSprite.position.set(camera.position.x - Math.cos(ang) * r, camera.position.y - sunH * r, camera.position.z);
  sunSprite.material.opacity = clamp(sunH + 0.3, 0, 1);
  moonSprite.material.opacity = clamp(-sunH + 0.3, 0, 1);

  cloudMesh.position.x = camera.position.x;
  cloudMesh.position.z = camera.position.z;
  cloudMesh.material.map.offset.x = (game.time * 18) % 1;
  cloudMesh.material.opacity = lerp(0.12, 0.5, dayF);
}

function updateHighlight(){
  if(!game.locked || game.inBattle || player.dead){
    highlightBox.visible = false;
    crackBox.visible = false;
    return;
  }
  const hit = player.raycastBlock();
  if(hit){
    highlightBox.visible = true;
    highlightBox.position.set(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5);
    if(player.breaking && player.breaking.progress > 0){
      crackBox.visible = true;
      crackBox.position.copy(highlightBox.position);
      crackBox.material.opacity = clamp(player.breaking.progress / player.breaking.total, 0, 1) * 0.55;
    } else {
      crackBox.visible = false;
    }
  } else {
    highlightBox.visible = false;
    crackBox.visible = false;
  }
}

// ---------- 디버그 ----------
function updateDebug(dt){
  fpsAcc += dt; fpsCnt++;
  if(fpsAcc > 0.5){ fpsShow = Math.round(fpsCnt / fpsAcc); fpsAcc = 0; fpsCnt = 0; }
  if(!debugOn) return;
  const b = player.body;
  document.getElementById('debug').textContent =
    `FPS ${fpsShow}\n` +
    `XYZ ${b.x.toFixed(1)} / ${b.y.toFixed(1)} / ${b.z.toFixed(1)}\n` +
    `바이옴 ${world.biomeAt(Math.floor(b.x), Math.floor(b.z))}\n` +
    `청크 ${world.chunks.size} · 드롭 ${ItemDrops.list.length}\n` +
    `몹 ${MobManager.list.length} · 야생포켓몬 ${PokeMan.wilds.length}\n` +
    `시간 ${game.time.toFixed(2)} (${game.isNight() ? '밤' : '낮'}) · 모드 ${game.mode}`;
}

// ---------- 메인 루프 ----------
function loop(t){
  requestAnimationFrame(loop);
  tick(t);
}
// 탭이 백그라운드여도 시뮬레이션 유지 (멀티 호스트가 탭을 내려도 게임이 멈추지 않게)
setInterval(() => {
  if(document.hidden || performance.now() - lastT > 400) tick(performance.now());
}, 250);

function tick(t){
  const dt = Math.min(0.05, (t - lastT) / 1000) || 0.016;
  if(dt <= 0) return;
  lastT = t;
  if(!game.started) return;

  // 일시정지/조작법 화면은 진짜 일시정지 (인벤토리 등은 마인크래프트처럼 월드 계속 진행)
  // 멀티플레이 중에는 호스트가 멈추면 게스트도 같이 멈추므로 일시정지를 적용하지 않음
  const hardPaused = (game.paused || UI.open === 'pause' || UI.open === 'help') && Net.mode === 'off';
  const isGuest = Net.mode === 'guest';
  // 멀티 호스트는 배틀 중에도 세계 시뮬레이션 유지 (게스트들이 멈추지 않게)
  const simRun = !hardPaused && (!game.inBattle || Net.mode === 'host');
  if(game.riding && (game.inBattle || player.dead || !PokeMan.party.length || (PokeMan.party[0] && PokeMan.party[0].hp <= 0))){
    game.riding = false;
    player.body.noGravity = false;
  }
  if(simRun){
    if(game.touch){
      game.keys['KeyW'] = Touch.move.z < -0.3;
      game.keys['KeyS'] = Touch.move.z > 0.3;
      game.keys['KeyA'] = Touch.move.x < -0.3;
      game.keys['KeyD'] = Touch.move.x > 0.3;
      game.locked = true; // 터치 모드는 포인터락 없이 조작
      game.sprint = Touch.sprinting ? Touch.sprinting() : false; // 스틱 끝까지 = 달리기
    }
    player.update(dt);
    if(game.healCd > 0) game.healCd -= dt;
    world.update(player.body.x, player.body.z);
    if(!isGuest){
      world.tickFurnaces(dt);
      world.tickFluids(dt);
      const centers = [{ x: player.body.x, z: player.body.z }];
      if(Net.mode === 'host') for(const [, p] of Net.players) centers.push({ x: p.x, z: p.z });
      world.randomTicks(dt, centers);
      ItemDrops.update(dt, world, player);
      TNTs.update(dt, world);
      MobManager.update(dt, world, player);
      PokeMan.update(dt, world, player);
    }
    if(isGuest) ItemDrops.update(dt, world, player); // 게스트 로컬 드롭(다른 차원)
    Particles.update(dt);
    Projectiles.update(dt, world, player);
    Follower.update(dt, world, player);
    updateSelfModel(dt);
    Minimap.render(dt);
    game.time = (game.time + dt / 600) % 1;
    updateSky();
    updateHighlight();
    UI.tickOpenUI();
    UI.updateHUD();
    updateDebug(dt);

    // 물/용암 흐름 애니메이션
    world.waterTex.offset.y = (world.waterTex.offset.y + dt * 0.03) % 1;
    world.waterTex.offset.x = (world.waterTex.offset.x + dt * 0.012) % 1;
    world.lavaTex.offset.y = (world.lavaTex.offset.y + dt * 0.008) % 1;
    world.lavaTex.offset.x = (world.lavaTex.offset.x + dt * 0.005) % 1;

    // 달리기/활 FOV 효과
    const moving = Math.hypot(player.body.vx, player.body.vz) > 4.5;
    let targetFov = 72 + (game.sprint && moving ? 8 : 0) - (player.charging >= 0 ? clamp(player.charging, 0, 1) * 12 : 0);
    if(Math.abs(camera.fov - targetFov) > 0.05){
      camera.fov = lerp(camera.fov, targetFov, Math.min(1, dt * 8));
      camera.updateProjectionMatrix();
    }

    // 손 흔들기
    if(game.swing > 0) game.swing -= dt;
    heldGroup.rotation.x = -Math.max(0, game.swing) * 2.2;
    heldGroup.position.y = -0.45 - Math.max(0, game.swing) * 0.12;

    autosaveAcc += dt;
    if(autosaveAcc > 30){ autosaveAcc = 0; saveGame(); }
  }
  // 좌표 HUD (시선 방위 포함)
  {
    const cb = player.body;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw);
    let ang = Math.atan2(fx, -fz) * 180 / Math.PI; // 북=0°, 동=90°
    if(ang < 0) ang += 360;
    const dirNames = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
    const dn = dirNames[Math.round(ang / 45) % 8];
    document.getElementById('coords').textContent =
      'X ' + Math.floor(cb.x) + '  Y ' + Math.floor(cb.y) + '  Z ' + Math.floor(cb.z) + '  · ' + dn + '쪽';

    // 멀티플레이는 일시정지/배틀 중에도 계속 동기화
    if(Net.mode !== 'off'){
      Net.tick(dt);
      const mi = document.getElementById('mp-info');
      let txt = Net.mode === 'host'
        ? '방 코드 ' + Net.code + ' · ' + Net.playerCount() + '명 접속 중'
        : '멀티플레이 · ' + Net.playerCount() + '명 접속 중';
      // 다른 플레이어 위치: 내 시선 기준 방향 화살표 + 거리 + 좌표
      const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
      for(const [, p] of Net.players){
        const px = p.tx !== undefined ? p.tx : p.x, pz = p.tz !== undefined ? p.tz : p.z;
        if(px === undefined) continue;
        if((p.dm || 'over') !== game.dim){
          txt += '\n👤 ' + p.name + ' · ' + ((p.dm === 'nether') ? '🔥 네더에 있음' : '🌍 오버월드에 있음');
          continue;
        }
        const dx = px - cb.x, dz = pz - cb.z;
        const dist = Math.round(Math.hypot(dx, dz));
        let a = Math.atan2(dx, -dz) * 180 / Math.PI;
        if(a < 0) a += 360;
        const rel = ((a - ang) % 360 + 360) % 360;
        txt += '\n👤 ' + p.name + ' ' + arrows[Math.round(rel / 45) % 8] + ' ' + dist + 'm (X ' + Math.floor(px) + ', Z ' + Math.floor(pz) + ')';
      }
      mi.textContent = txt;
    }
  }
  if(game.inBattle){
    Battle.renderTick(t);
  }
  renderer.render(scene, camera);
}
