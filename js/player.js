// ===== player.js : 플레이어 이동/시점/채굴/설치/전투/인벤토리 =====
'use strict';

class Player {
  constructor(world, camera){
    this.world = world;
    this.camera = camera;
    this.body = new PhysBody(0.5, 45, 0.5, 0.3, 1.8);
    this.yaw = 0; this.pitch = 0;
    this.inventory = new Array(36).fill(null); // 0-8 핫바, 9-35 인벤토리
    this.selected = 0;
    this.health = 20; this.maxHealth = 20;
    this.air = 10; this.drownAcc = 0;
    this.dead = false;
    this.fly = false;
    this.invuln = 0; this.attackCd = 0; this.eatCd = 0;
    this.regenTimer = 0;
    this.breaking = null; // {x,y,z, progress, total}
    this.mouseLeft = false;
    this.bobPhase = 0;
    this.digSfxAcc = 0;
    this.reach = 4.5;
    this.bobber = null;   // 낚시찌
    this.charging = -1;   // 활 차징 (-1 = 안 함)
  }

  spawnAt(p){
    this.body.x = p.x; this.body.y = p.y; this.body.z = p.z;
    this.body.vx = this.body.vy = this.body.vz = 0;
  }
  look(dx, dy){
    this.yaw -= dx * 0.0024;
    this.pitch = clamp(this.pitch - dy * 0.0024, -1.55, 1.55);
  }
  dir(){
    const cp = Math.cos(this.pitch);
    return {
      x: -Math.sin(this.yaw) * cp,
      y: Math.sin(this.pitch),
      z: -Math.cos(this.yaw) * cp
    };
  }
  eye(){
    return { x: this.body.x, y: this.body.y + 1.62, z: this.body.z };
  }
  currentItem(){ return this.inventory[this.selected]; }

  update(dt){
    this.invuln -= dt; this.attackCd -= dt; this.eatCd -= dt;
    if(this.dead) return;
    const b = this.body, k = game.keys;
    const canControl = !game.uiOpen && !game.inBattle && game.locked;

    // 이동 입력
    let fw = 0, rt = 0, jump = false, down = false;
    if(canControl){
      fw = (k['KeyW'] ? 1 : 0) - (k['KeyS'] ? 1 : 0);
      rt = (k['KeyD'] ? 1 : 0) - (k['KeyA'] ? 1 : 0);
      jump = !!k['Space'];
      down = !!k['ShiftLeft'] || !!k['ShiftRight'];
    }
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let mx = fx * fw + rx * rt, mz = fz * fw + rz * rt;
    const ml = Math.hypot(mx, mz);
    if(ml > 0){ mx /= ml; mz /= ml; }

    const sprint = canControl && (k['ControlLeft'] || game.sprint) && fw > 0;
    let speed;
    if(this.fly) speed = sprint ? 14 : 9;
    else if(b.inWater) speed = 2.6;
    else speed = sprint ? 5.8 : 4.3;

    const accel = b.onGround || this.fly || b.inWater ? 10 : 3;
    b.vx = lerp(b.vx, mx * speed, Math.min(1, dt * accel));
    b.vz = lerp(b.vz, mz * speed, Math.min(1, dt * accel));

    if(this.fly){
      b.noGravity = true;
      b.vy = lerp(b.vy, (jump ? 1 : 0) * 9 + (down ? -1 : 0) * 9, Math.min(1, dt * 10));
    } else {
      b.noGravity = false;
      if(jump){
        if(b.inWater) b.vy = Math.min(b.vy + 28 * dt, 3.4);
        else if(b.onGround) b.vy = 8.6;
      }
    }

    const prevVy = b.vy;
    b.update(dt, this.world);
    if(this.fly && b.onGround) this.fly = false;

    // 낙하 데미지
    if(b.onGround && prevVy < -13 && !b.inWater && !this.fly){
      this.hurt(Math.floor((-prevVy - 13) * 0.7), 0, 0, true);
    }

    // 익사
    const eyeBlock = this.world.getBlock(b.x, b.y + 1.62, b.z);
    if(BLOCKS[eyeBlock].rt === RT.WATER){
      this.air -= dt;
      if(this.air <= 0){
        this.drownAcc += dt;
        if(this.drownAcc >= 1){ this.drownAcc = 0; this.hurt(2, 0, 0, true); }
      }
    } else {
      this.air = Math.min(10, this.air + dt * 3);
      this.drownAcc = 0;
    }

    // 자연 회복
    this.regenTimer += dt;
    if(this.regenTimer > 5){
      this.regenTimer = 0;
      if(this.health < this.maxHealth) this.health++;
    }

    // 채굴
    this.updateBreaking(dt);
    // 낚시찌
    this.updateBobber(dt);
    // 활 차징
    if(this.charging >= 0) this.charging += dt;

    // 카메라
    const hSpeed = Math.hypot(b.vx, b.vz);
    if(b.onGround && hSpeed > 0.5) this.bobPhase += dt * hSpeed * 1.7;
    const bob = b.onGround ? Math.sin(this.bobPhase * 2) * 0.045 : 0;
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    let shX = 0, shY = 0;
    if(game.shake > 0){
      game.shake -= dt;
      shX = (Math.random() - 0.5) * game.shake * 0.3;
      shY = (Math.random() - 0.5) * game.shake * 0.3;
    }
    this.camera.position.set(b.x + shX, b.y + 1.62 + bob + shY, b.z);
  }

  raycastBlock(){
    const e = this.eye(), d = this.dir();
    return this.world.raycast(e.x, e.y, e.z, d.x, d.y, d.z, this.reach);
  }

  // ----- 채굴 -----
  updateBreaking(dt){
    if(!this.mouseLeft || game.uiOpen || game.inBattle || !game.locked){
      this.breaking = null;
      return;
    }
    const hit = this.raycastBlock();
    if(!hit){ this.breaking = null; return; }
    const def = BLOCKS[hit.id];
    if(def.hard < 0){ this.breaking = null; return; }

    if(game.mode === 'creative'){
      if(this.attackCd <= 0){
        this.attackCd = 0.22;
        this.breakBlock(hit, false);
      }
      return;
    }
    if(!this.breaking || this.breaking.x !== hit.bx || this.breaking.y !== hit.by || this.breaking.z !== hit.bz){
      this.breaking = { x:hit.bx, y:hit.by, z:hit.bz, progress: 0, total: 1 };
    }
    const item = this.currentItem();
    const tool = item ? toolInfo(item.id) : null;
    const mul = tool && def.tool && tool.kind === def.tool ? tool.speed : 1;
    this.breaking.total = Math.max(0.05, def.hard * 1.5 / mul);
    this.breaking.progress += dt;
    this.digSfxAcc += dt;
    if(this.digSfxAcc > 0.25){ this.digSfxAcc = 0; SFX.play('dig'); }
    game.swing = 0.15;
    if(this.breaking.progress >= this.breaking.total){
      this.breakBlock(hit, true);
      this.breaking = null;
    }
  }
  breakBlock(hit, withDrops){
    const def = BLOCKS[hit.id];
    this.world.setBlock(hit.bx, hit.by, hit.bz, B.AIR);
    SFX.play('break');
    Particles.blockBreak(hit.bx, hit.by, hit.bz, hit.id);
    // 위에 있던 식물/횃불/선인장/작물 연쇄 제거 (정규 드롭 테이블 사용)
    for(let yy = hit.by + 1; yy < WORLD_H; yy++){
      const above = this.world.getBlock(hit.bx, yy, hit.bz);
      if(BLOCKS[above].rt !== RT.CROSS && above !== B.CACTUS) break;
      this.world.setBlock(hit.bx, yy, hit.bz, B.AIR);
      if(withDrops){
        const ad = BLOCKS[above];
        const drops = ad.drop ? ad.drop(Math.random) : [[above, 1]];
        drops.forEach(([id, n]) => { if(n > 0) ItemDrops.spawn(hit.bx + 0.5, yy + 0.3, hit.bz + 0.5, id, n); });
      }
    }
    if(!withDrops || game.mode === 'creative') return;
    // 곡괭이 등급 체크
    const item = this.currentItem();
    const tool = item ? toolInfo(item.id) : null;
    let canDrop = true;
    if(def.tool === 'pick'){
      const pickTier = tool && tool.kind === 'pick' ? tool.tier : -1;
      canDrop = pickTier >= def.tier;
    }
    if(canDrop){
      const drops = def.drop ? def.drop(Math.random) : [[hit.id, 1]];
      drops.forEach(([id, n]) => {
        if(n > 0) ItemDrops.spawn(hit.bx + 0.5, hit.by + 0.4, hit.bz + 0.5, id, n);
      });
    }
    // 도구 내구도
    if(tool) this.damageTool(item);
  }
  damageTool(item){
    const t = toolInfo(item.id);
    if(!t) return;
    if(item.dur === undefined) item.dur = t.dur;
    item.dur--;
    if(item.dur <= 0){
      this.inventory[this.selected] = null;
      SFX.play('fail');
      UI.toast(itemName(item.id) + '이(가) 부서졌다!');
    }
    UI.updateHotbar();
  }

  // ----- 공격 (좌클릭) -----
  attack(){
    if(this.dead || game.uiOpen || game.inBattle || !game.locked) return;
    const e = this.eye(), d = this.dir();
    game.swing = 0.25;
    const item = this.currentItem();
    const tool = item ? toolInfo(item.id) : null;
    const dmg = tool ? tool.dmg : 1;
    // 멀티 게스트: 호스트 몹(퍼펫) 공격
    if(typeof Net !== 'undefined' && Net.mode === 'guest'){
      if(this.attackCd <= 0 && Net.guestMeleeHit(e.x, e.y, e.z, d.x, d.y, d.z, 3.5, dmg)){
        this.attackCd = 0.35;
        if(tool && tool.kind === 'sword') this.damageTool(item);
      }
      return;
    }
    const mob = MobManager.rayHit(e.x, e.y, e.z, d.x, d.y, d.z, 3.5);
    if(mob && this.attackCd <= 0){
      this.attackCd = 0.35;
      mob.hurt(dmg, d.x * 0.6, d.z * 0.6);
      if(tool && tool.kind === 'sword') this.damageTool(item);
    }
  }

  // ----- 사용/설치 (우클릭) -----
  use(){
    if(this.dead || game.uiOpen || game.inBattle || !game.locked) return;
    const hit = this.raycastBlock();
    game.swing = 0.25;
    // 상호작용 블록
    if(hit){
      if(hit.id === B.CRAFT){ UI.openInventory(true); return; }
      if(hit.id === B.FURNACE || hit.id === B.FURNACE_LIT){ UI.openFurnace(hit.bx + ',' + hit.by + ',' + hit.bz); return; }
      if(hit.id === B.CHEST){ UI.openChest(hit.bx + ',' + hit.by + ',' + hit.bz); return; }
      if(hit.id === B.BED){ this.trySleep(hit); return; }
      if(hit.id === B.TNT){
        this.world.setBlock(hit.bx, hit.by, hit.bz, B.AIR);
        if(typeof Net !== 'undefined' && Net.mode === 'guest') Net.sendIgnite(hit.bx, hit.by, hit.bz);
        else TNTs.spawn(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5, 3);
        return;
      }
    }
    const item = this.currentItem();
    if(!item) return;
    const heldTool = toolInfo(item.id);
    // 호미: 잔디/흙 → 경작지
    if(heldTool && heldTool.kind === 'hoe'){
      if(hit && (hit.id === B.GRASS || hit.id === B.DIRT) && this.world.getBlock(hit.bx, hit.by + 1, hit.bz) === B.AIR){
        this.world.setBlock(hit.bx, hit.by, hit.bz, B.FARMLAND);
        SFX.play('dig');
        this.damageTool(item);
      }
      return;
    }
    // 낚싯대
    if(heldTool && heldTool.kind === 'rod'){ this.useRod(item); return; }
    // 씨앗 심기
    if(item.id === I.SEEDS){
      if(hit && hit.id === B.FARMLAND && this.world.getBlock(hit.bx, hit.by + 1, hit.bz) === B.AIR){
        this.world.setBlock(hit.bx, hit.by + 1, hit.bz, B.CROP);
        SFX.play('place');
        this.consumeSelected();
      }
      return;
    }
    // 골분: 작물 즉시 성장
    if(item.id === I.BONEMEAL){
      if(hit && hit.id === B.CROP){
        this.world.setBlock(hit.bx, hit.by, hit.bz, B.CROP_RIPE);
        Particles.spawn(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5, 0x7ee07e, 14, 1.5, 0.6, 1);
        SFX.play('pop');
        this.consumeSelected();
      }
      return;
    }
    // 음식
    if(foodValue(item.id)){
      if(this.eatCd <= 0 && this.health < this.maxHealth){
        this.health = Math.min(this.maxHealth, this.health + foodValue(item.id));
        SFX.play('eat');
        Particles.spawn(this.body.x, this.body.y + 1.4, this.body.z, 0xc88c5a, 6, 1, 0.4);
        this.consumeSelected();
        this.eatCd = 0.6;
      }
      return;
    }
    // 포켓볼
    if(ballBonus(item.id)){
      if(!PokeMan.enabled){ UI.toast('포켓몬 모드가 꺼져 있습니다'); return; }
      const e = this.eye(), d = this.dir();
      Projectiles.throwBall(e.x + d.x * 0.4, e.y + d.y * 0.4 - 0.1, e.z + d.z * 0.4, d.x, d.y, d.z, item.id);
      this.consumeSelected();
      return;
    }
    if(item.id === I.POTION){ UI.toast('상처약은 파티 화면(P)이나 배틀 중에 사용할 수 있어요'); return; }
    // 블록 설치
    if(isBlockId(item.id) && hit){
      let cx = hit.bx, cy = hit.by, cz = hit.bz;
      if(hit.id !== B.TALLGRASS){ cx += hit.nx; cy += hit.ny; cz += hit.nz; }
      if(cy < 0 || cy >= WORLD_H) return; // 월드 높이 밖 — 아이템 소모 방지
      const cur = this.world.getBlock(cx, cy, cz);
      if(cur !== B.AIR && cur !== B.WATER && cur !== B.TALLGRASS) return;
      const def = BLOCKS[item.id];
      if(def.solid && this._intersectsEntity(cx, cy, cz)) return;
      // 식물류는 단단한 바닥 위에만
      if(def.rt === RT.CROSS && !this.world.isSolid(cx, cy - 1, cz)) return;
      this.world.setBlock(cx, cy, cz, item.id);
      SFX.play('place');
      if(game.mode !== 'creative') this.consumeSelected();
    }
  }
  _intersectsEntity(bx, by, bz){
    const b = this.body;
    const ix = b.x + b.w > bx && b.x - b.w < bx + 1;
    const iy = b.y + b.h > by && b.y < by + 1;
    const iz = b.z + b.w > bz && b.z - b.w < bz + 1;
    if(ix && iy && iz) return true;
    for(const m of MobManager.list){
      const mb = m.body;
      if(mb.x + mb.w > bx && mb.x - mb.w < bx + 1 && mb.y + mb.h > by && mb.y < by + 1 && mb.z + mb.w > bz && mb.z - mb.w < bz + 1) return true;
    }
    return false;
  }
  // ----- 낚시 -----
  useRod(item){
    if(this.bobber){ this.reelIn(item); return; }
    const e = this.eye(), d = this.dir();
    for(let t = 1; t < 9; t += 0.5){
      const x = e.x + d.x * t, y = e.y + d.y * t, z = e.z + d.z * t;
      if(this.world.getBlock(x, y, z) === B.WATER){
        let sy = Math.floor(y);
        while(sy < WORLD_H - 1 && this.world.getBlock(x, sy + 1, z) === B.WATER) sy++;
        const spr = new THREE.Sprite(iconSpriteMaterial(I.POKEBALL));
        spr.scale.set(0.22, 0.22, 0.22);
        spr.position.set(x, sy + 0.95, z);
        scene.add(spr);
        this.bobber = { x, y: sy + 0.95, z, sprite: spr, state: 'wait', timer: 2 + Math.random() * 5 };
        SFX.play('throw');
        return;
      }
      if(this.world.isSolid(x, y, z)) break;
    }
    UI.toast('물을 향해 던져야 해요');
  }
  clearBobber(){
    if(this.bobber){ scene.remove(this.bobber.sprite); this.bobber = null; }
  }
  reelIn(item){
    const bb = this.bobber;
    const bite = bb.state === 'bite';
    this.clearBobber();
    if(!bite){ SFX.play('splash'); return; }
    SFX.play('caught');
    this.damageTool(item);
    const r = Math.random();
    const bx = this.body.x, by = this.body.y + 1.2, bz = this.body.z;
    if(r < 0.5) ItemDrops.spawn(bx, by, bz, I.FISH_RAW, 1);
    else if(r < 0.62 && PokeMan.enabled){
      const lv = 3 + Math.floor(Math.random() * 12);
      if(typeof Net !== 'undefined' && Net.mode === 'guest') Net.sendSpawnWild(129, lv, bb.x, bb.y + 0.5, bb.z);
      else { PokeMan.wilds.push(new WildPoke(129, lv, bb.x, bb.y + 0.5, bb.z)); PokeMan.seen.add(129); }
      UI.toast('앗! 잉어킹이 낚였다! (R키로 배틀)');
    }
    else if(r < 0.78) ItemDrops.spawn(bx, by, bz, I.STRING, 1 + Math.floor(Math.random() * 2));
    else if(r < 0.88) ItemDrops.spawn(bx, by, bz, I.BONE, 1);
    else if(r < 0.95) ItemDrops.spawn(bx, by, bz, I.POKEBALL, 1);
    else if(r < 0.99) ItemDrops.spawn(bx, by, bz, I.RARECANDY, 1);
    else ItemDrops.spawn(bx, by, bz, I.DIAMOND, 1);
  }
  updateBobber(dt){
    const bb = this.bobber;
    if(!bb) return;
    const item = this.currentItem();
    const tool = item ? toolInfo(item.id) : null;
    if(!tool || tool.kind !== 'rod' || this.dead ||
       dist3(bb.x, bb.y, bb.z, this.body.x, this.body.y, this.body.z) > 12){
      this.clearBobber();
      return;
    }
    bb.timer -= dt;
    if(bb.state === 'wait'){
      bb.sprite.position.y = bb.y + Math.sin(performance.now() * 0.004) * 0.05;
      if(bb.timer <= 0){
        bb.state = 'bite';
        bb.timer = 1.2;
        SFX.play('splash');
        Particles.spawn(bb.x, bb.y, bb.z, 0x5a8af0, 8, 1.5, 0.5, 1.5);
        bb.sprite.position.y = bb.y - 0.25;
      }
    } else if(bb.timer <= 0){
      bb.state = 'wait';
      bb.timer = 2 + Math.random() * 5;
      bb.sprite.position.y = bb.y;
    }
  }

  // ----- 활 -----
  startCharge(){
    if(this.countItem(I.ARROW) <= 0){ UI.toast('화살이 없어요'); return; }
    this.charging = 0;
  }
  releaseBow(){
    if(this.charging < 0) return;
    const ch = clamp(this.charging, 0.15, 1);
    this.charging = -1;
    if(this.dead || game.uiOpen || game.inBattle || !game.locked) return; // 메뉴/사망 중 발사 방지
    const item = this.currentItem();
    const tool = item ? toolInfo(item.id) : null;
    if(!tool || tool.kind !== 'bow') return;
    if(this.countItem(I.ARROW) <= 0) return;
    this.removeItem(I.ARROW, 1);
    const e = this.eye(), d = this.dir();
    Projectiles.shootArrow(e.x + d.x * 0.4, e.y + d.y * 0.4 - 0.1, e.z + d.z * 0.4, d.x, d.y, d.z,
      { fromPlayer: true, speed: 12 + 20 * ch, dmg: Math.round(2 + 5 * ch) });
    SFX.play('throw');
    this.damageTool(item);
    game.swing = 0.25;
  }

  trySleep(hit){
    if(game.isNight()){
      this.world.spawnPoint = { x: hit.bx + 0.5, y: hit.by + 1.2, z: hit.bz + 0.5 };
      if(typeof Net !== 'undefined' && Net.mode === 'guest'){
        UI.toast('스폰 지점 설정! (시간은 호스트만 넘길 수 있어요)');
        return;
      }
      startSleep();
    } else {
      UI.toast('밤에만 잘 수 있어요 (스폰 지점은 설정됨)');
      this.world.spawnPoint = { x: hit.bx + 0.5, y: hit.by + 1.2, z: hit.bz + 0.5 };
    }
  }
  consumeSelected(){
    const s = this.inventory[this.selected];
    if(!s) return;
    s.n--;
    if(s.n <= 0) this.inventory[this.selected] = null;
    UI.updateHotbar();
  }

  // ----- 데미지/죽음 -----
  hurt(dmg, kx, kz, ignoreInvuln){
    if(this.dead) return;
    if(game.mode === 'creative') return;
    if(game.inBattle) return; // 포켓몬 배틀 중에는 무적
    if(!ignoreInvuln && this.invuln > 0) return;
    this.health -= dmg;
    this.invuln = 0.6;
    SFX.play('hurt');
    UI.flashDamage();
    this.body.vx += (kx || 0) * 5;
    this.body.vz += (kz || 0) * 5;
    if(kx || kz) this.body.vy = Math.max(this.body.vy, 4);
    if(this.health <= 0){
      this.health = 0;
      this.die();
    }
    UI.updateHUD();
  }
  die(){
    this.dead = true;
    this.breaking = null;
    this.mouseLeft = false;
    this.charging = -1;
    this.clearBobber();
    UI.closeOnly(); // 열려 있던 메뉴 정리 (리스폰 후 소프트락 방지)
    if(document.exitPointerLock) document.exitPointerLock();
    document.getElementById('death-overlay').classList.remove('hidden');
  }
  respawn(){
    this.dead = false;
    this.health = this.maxHealth;
    this.air = 10;
    this.fly = false;
    this.body.noGravity = false;
    const sp = this.world.spawnPoint || this.world.findSpawn();
    // 침대 스폰 좌표가 막혀 있지 않으면 그대로, 막혔으면 컬럼 꼭대기로
    let y = sp.y;
    if(this.world.isSolid(sp.x, y, sp.z) || this.world.isSolid(sp.x, y + 1, sp.z)){
      y = this.world.colTop(sp.x, sp.z) + 1.5;
    }
    this.spawnAt({ x: sp.x, y, z: sp.z });
    document.getElementById('death-overlay').classList.add('hidden');
    UI.updateHUD();
  }

  // ----- 인벤토리 -----
  addItem(id, n, dur){
    const max = maxStack(id);
    if(max > 1){
      for(let i = 0; i < 36; i++){
        const s = this.inventory[i];
        if(s && s.id === id && s.n < max){
          const take = Math.min(n, max - s.n);
          s.n += take; n -= take;
          if(n <= 0){ UI.updateHotbar(); return 0; }
        }
      }
    }
    for(let i = 0; i < 36; i++){
      if(!this.inventory[i]){
        const put = Math.min(n, max);
        this.inventory[i] = { id, n: put };
        if(dur !== undefined) this.inventory[i].dur = dur;
        n -= put;
        if(n <= 0) break;
      }
    }
    UI.updateHotbar();
    return n;
  }
  countItem(id){
    return this.inventory.reduce((s, it) => s + (it && it.id === id ? it.n : 0), 0);
  }
  removeItem(id, n){
    for(let i = 0; i < 36 && n > 0; i++){
      const s = this.inventory[i];
      if(s && s.id === id){
        const take = Math.min(n, s.n);
        s.n -= take; n -= take;
        if(s.n <= 0) this.inventory[i] = null;
      }
    }
    UI.updateHotbar();
  }
  serialize(){
    return {
      x: this.body.x, y: this.body.y, z: this.body.z,
      yaw: this.yaw, pitch: this.pitch,
      health: this.health, inv: this.inventory, sel: this.selected
    };
  }
  deserialize(d){
    this.spawnAt(d);
    this.yaw = d.yaw || 0; this.pitch = d.pitch || 0;
    // 죽은 채 저장된 세이브는 풀피로 복구
    this.health = d.health > 0 ? d.health : this.maxHealth;
    this.inventory = (d.inv || new Array(36).fill(null)).map(s => s ? { ...s } : null);
    while(this.inventory.length < 36) this.inventory.push(null);
    this.selected = d.sel || 0;
    // 저장 당시 커서/제작칸에 있던 아이템 복원
    (d.extra || []).forEach(s => { if(s) this.addItem(s.id, s.n, s.dur); });
  }
}
