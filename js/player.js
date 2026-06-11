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
    this.armor = [null, null, null]; // 투구/갑옷/바지
    this.effects = {};    // {speed:t, jump:t, regen:t}
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
    // 라이드 타입 — 종별 성능!
    const rideInfo = game.riding && PokeMan.party.length ? rideStatsFor(PokeMan.party[0].sp) : null;
    const ride = rideInfo ? rideInfo.t : null;
    // 수면 위인가? (서핑 글라이딩용)
    const surfWaterY = ride === 'surf' ? this._waterSurfaceY(b.x, b.z) : -1;
    const onSurfWater = surfWaterY >= 0;
    let speed;
    if(ride === 'fly') speed = rideInfo.speed * (sprint ? 1.3 : 1);          // ✈ 라이딩 부스트
    else if(ride === 'surf' && onSurfWater) speed = rideInfo.speed * (sprint ? 1.3 : 1);
    else if(ride === 'run') speed = rideInfo.speed * (sprint ? 1.25 : 1);
    else if(ride === 'surf') speed = rideInfo.land;
    else if(this.fly) speed = sprint ? 14 : 9;
    else if(b.inWater) speed = 2.6;
    else speed = sprint ? 5.8 : 4.3;
    if(this.effects.speed > 0) speed *= 1.4;
    // 🐾 동행 효과: 전기=이속, 물=수영
    const cType = typeof companionType === 'function' ? companionType() : null;
    if(cType === 'electric') speed *= 1.1;
    if(cType === 'water' && b.inWater) speed *= 1.5;

    // 라이딩 중엔 가속/제동이 빠릿하게
    const accel = ride ? 16 : (b.onGround || this.fly || b.inWater ? 10 : 3);
    b.vx = lerp(b.vx, mx * speed, Math.min(1, dt * accel));
    b.vz = lerp(b.vz, mz * speed, Math.min(1, dt * accel));

    if(ride === 'fly'){
      // ✈ 비행: 시선 방향으로 난다! (위를 보며 W = 상승) + Space/Shift 보조
      b.noGravity = true;
      let vy = 0;
      if(fw > 0) vy += Math.sin(this.pitch) * speed * fw;   // 시선 기울기 비행
      if(jump) vy += rideInfo.vert;
      if(down) vy -= rideInfo.vert;
      b.vy = lerp(b.vy, clamp(vy, -rideInfo.vert * 1.4, rideInfo.vert * 1.4), Math.min(1, dt * 10));
      if(Math.abs(b.vy) > 1 && typeof Ach !== 'undefined') Ach.unlock('first_fly');
    } else if(ride === 'surf' && onSurfWater){
      // 🌊 서핑: 수면 위를 미끄러진다 (보트처럼!) — Space로 돌고래 점프
      b.noGravity = true;
      const targetY = surfWaterY + 0.15;
      if(jump && Math.abs(b.y - targetY) < 0.5){
        b.vy = 7.5; // 돌고래 점프!
        b.noGravity = false;
      } else if(b.y > targetY + 0.6){
        b.noGravity = false; // 점프 후 낙하
      } else {
        b.vy = lerp(b.vy, clamp((targetY - b.y) * 10, -6, 8), Math.min(1, dt * 12));
      }
      if(typeof Ach !== 'undefined') Ach.unlock('first_surf');
    } else if(this.fly){
      b.noGravity = true;
      b.vy = lerp(b.vy, (jump ? 1 : 0) * 9 + (down ? -1 : 0) * 9, Math.min(1, dt * 10));
    } else {
      b.noGravity = false;
      const jumpV = (ride === 'run' ? rideInfo.jump : 8.6) * (this.effects.jump > 0 ? 1.25 : 1);
      if(jump){
        if(b.inWater) b.vy = Math.min(b.vy + 28 * dt, 3.4);
        else if(b.onGround) b.vy = jumpV;
      }
      // 🏇 질주 자동 턱넘기: 말처럼 1칸 장애물을 알아서 뛰어넘는다
      if(ride === 'run' && b.hitWall && b.onGround && (fw || rt)){
        b.vy = Math.max(b.vy, 9);
        b.vx = mx * speed; b.vz = mz * speed;
      }
    }

    const prevVy = b.vy;
    b.update(dt, this.world);
    if(b.inWater && jump && b.hitWall && (fw || rt)) b.vy = Math.max(b.vy, 5.2);
    if(this.fly && b.onGround) this.fly = false;

    // 낙하 데미지 (🪂 비행 타입 동행 시 무효)
    if(b.onGround && prevVy < -13 && !b.inWater && !this.fly){
      if((typeof companionType === 'function' ? companionType() : null) === 'flying'){
        Particles.spawn(b.x, b.y + 0.3, b.z, 0xa890f0, 10, 1.5, 0.5, 1);
      } else {
        this.hurt(Math.floor((-prevVy - 13) * 0.7), 0, 0, true);
      }
    }

    // 공허 추락 (엔드)
    if(b.y < -12 && !this.dead){ this.hurt(1000, 0, 0, true); return; }
    // 용암 데미지
    if(b.inLava){
      this.lavaAcc = (this.lavaAcc || 0) + dt;
      if(this.lavaAcc > 0.5){
        this.lavaAcc = 0;
        this.hurt(3, 0, 0, true);
        Particles.spawn(b.x, b.y + 1, b.z, 0xf08020, 8, 2, 0.5, 2);
        SFX.play('hurt');
      }
    }
    this.cactusAcc = Math.max(0, (this.cactusAcc || 0) - dt);
    if(this.cactusAcc <= 0 && this.touchingBlock(B.CACTUS)){
      this.cactusAcc = 0.65;
      this.hurt(1, 0, 0, true);
    }
    // 🌿 풀숲 인카운터: 수풀을 헤치며 걸으면 야생이 튀어나온다!
    if(PokeMan.enabled && !game.inBattle){
      this._grassCd = (this._grassCd || 0) - dt;
      if(this._grassCd <= 0 && Math.hypot(b.vx, b.vz) > 1.5 &&
         this.world.getBlock(b.x, b.y + 0.2, b.z) === B.TALLGRASS && Math.random() < dt * 0.3){
        this._grassCd = 12;
        PokeMan.grassEncounter(this);
      }
    }
    // 포탈에 서 있으면 차원 이동 (도착 후 한 번 나갔다 와야 재발동 — 무한 왕복 방지)
    const feetB = this.world.getBlock(b.x, b.y + 0.5, b.z);
    if(feetB === B.PORTAL || feetB === B.END_PORTAL){
      if(this.portalArmed !== false){
        this.portalT = (this.portalT || 0) + dt;
        if(this.portalT === dt) UI.toast('🌀 포탈 이동 중... 2초만 기다리세요');
        if(this.portalT > 2 && (!game.portalCd || game.portalCd <= 0)){
          this.portalT = 0;
          this.portalArmed = false;
          switchDimension(feetB === B.END_PORTAL ? (game.dim === 'end' ? 'over' : 'end') : undefined);
        }
      }
    } else { this.portalT = 0; this.portalArmed = true; }
    if(game.portalCd > 0) game.portalCd -= dt;

    // 익사 (서핑 라이딩 중엔 숨 안 참)
    if(ride === 'surf'){ this.air = 10; }
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

    // 버프 타이머
    for(const k in this.effects){
      this.effects[k] -= dt;
      if(this.effects[k] <= 0) delete this.effects[k];
    }
    // 자연 회복 (재생 물약이면 2.5초마다)
    this.regenTimer += dt;
    if(this.regenTimer > (this.effects.regen > 0 ? 2 : 3.5)){
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
    const bob = (b.onGround && !b.inWater) ? Math.sin(this.bobPhase * 2) * 0.045 : 0;
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    let shX = 0, shY = 0;
    if(game.shake > 0){
      game.shake -= dt;
      shX = (Math.random() - 0.5) * game.shake * 0.3;
      shY = (Math.random() - 0.5) * game.shake * 0.3;
    }
    if(game.camMode === 1){
      // 3인칭: 시선 반대 방향으로 카메라 후퇴 (벽 통과 방지 레이캐스트)
      const d = this.dir();
      const e = { x: b.x, y: b.y + 1.62, z: b.z };
      let dist = 4;
      const hit = this.world.raycast(e.x, e.y, e.z, -d.x, -d.y, -d.z, 4.2);
      if(hit) dist = Math.max(0.5, hit.dist - 0.3);
      this.camera.position.set(e.x - d.x * dist + shX, e.y - d.y * dist + bob + shY, e.z - d.z * dist);
    } else {
      this.camera.position.set(b.x + shX, b.y + 1.62 + bob + shY, b.z);
    }
  }

  // 발밑/주변의 수면 y (물이 아니면 -1)
  _waterSurfaceY(x, z){
    for(let y = Math.floor(this.body.y + 1.2); y >= Math.floor(this.body.y - 2.5) && y > 0; y--){
      if(this.world.getBlock(x, y, z) === B.WATER && this.world.getBlock(x, y + 1, z) !== B.WATER){
        return y + 1; // 물 블록 윗면
      }
    }
    return -1;
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
    let mul = tool && def.tool && tool.kind === def.tool ? tool.speed : 1;
    if(item && item.ench && item.ench.k === 'eff' && tool && def.tool === tool.kind) mul *= 1 + 0.5 * item.ench.l;
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
    if(withDrops && typeof QuestMan !== 'undefined' &&
       [B.COAL_ORE, B.IRON_ORE, B.GOLD_ORE, B.REDSTONE_ORE, B.DIAMOND_ORE, B.MYSTIC_ORE].includes(hit.id))
      QuestMan.onMineOre(hit.id);
    if(hit.id === B.END_CRYSTAL){
      this.world.setBlock(hit.bx, hit.by, hit.bz, B.AIR);
      explode(this.world, hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5, 2, false);
      UI.toast('💥 엔드 크리스탈 파괴! (' + (this.world.crystals ? this.world.crystals.size : 0) + '개 남음)');
      return;
    }
    const def = BLOCKS[hit.id];
    if(typeof Ach !== 'undefined'){
      if(hit.id === B.LOG || hit.id === B.BIRCH_LOG || hit.id === B.ACACIA_LOG) Ach.unlock('first_tree');
      if(hit.id === B.DIAMOND_ORE) Ach.unlock('first_diamond');
    }
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
      const fortune = item && item.ench && item.ench.k === 'fort' ? item.ench.l : 0;
      drops.forEach(([id, n]) => {
        if(fortune && !isBlockId(id) && Math.random() < 0.35 * fortune) n += 1 + Math.floor(Math.random() * fortune);
        if(n > 0) ItemDrops.spawn(hit.bx + 0.5, hit.by + 0.4, hit.bz + 0.5, id, n);
      });
    }
    // 도구 내구도
    if(tool) this.damageTool(item);
  }
  damageTool(item){
    const t = toolInfo(item.id);
    if(!t) return;
    if(item.ench && item.ench.k === 'unb' && Math.random() < 0.25 * item.ench.l) return; // 내구 인챈트
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
        if(tool && (tool.kind === 'sword' || tool.kind === 'axe')) this.damageTool(item);
      }
      return;
    }
    const mob = MobManager.rayHit(e.x, e.y, e.z, d.x, d.y, d.z, 3.5);
    if(mob && this.attackCd <= 0){
      this.attackCd = 0.35;
      const sharp = item && item.ench && item.ench.k === 'sharp' ? item.ench.l : 0;
      mob.hurt(dmg + sharp, d.x * 0.6, d.z * 0.6);
      if(tool && (tool.kind === 'sword' || tool.kind === 'axe')) this.damageTool(item);
    }
  }

  // ----- 사용/설치 (우클릭) -----
  use(){
    if(this.dead || game.uiOpen || game.inBattle || !game.locked) return;
    const hit = this.raycastBlock();
    game.swing = 0.25;
    // NPC/동물 상호작용 (거래 / 도전 / 번식 / 길들이기)
    {
      const e0 = this.eye(), d0 = this.dir();
      const npc = MobManager.rayHit(e0.x, e0.y, e0.z, d0.x, d0.y, d0.z, 3.5);
      if(npc && (!hit || hit.dist > 3.5)){
        const held = this.currentItem();
        if(npc.def.npc){
          if(npc.def.leader && npc.gym) startGymBattle(npc.gym);
          else if(npc.def.rocket) startRocketBattle(npc);
          else if(npc.def.trademan) TradeNPC.interact(npc);
          else if(npc.def.trainer) startNPCBattle(npc);
          else if(npc.type === 'villager'){ UI.openTrade(); if(typeof Ach !== 'undefined') Ach.unlock('trade'); }
          return;
        }
        // 늑대 길들이기 (뼈다귀)
        if(npc.def.tameable && !npc.tamed && held && held.id === I.BONE){
          this.consumeSelected();
          if(Math.random() < 0.4){
            npc.tamed = true;
            npc.setTag('🐶 내 늑대');
            Particles.spawn(npc.body.x, npc.body.y + 1, npc.body.z, 0xf06ba8, 16, 2, 0.8, 1.5);
            SFX.play('caught');
            UI.toast('늑대를 길들였다!');
            if(typeof Ach !== 'undefined') Ach.unlock('first_tame');
          } else {
            Particles.spawn(npc.body.x, npc.body.y + 1, npc.body.z, 0x888888, 8, 1.5, 0.5, 1);
          }
          return;
        }
        // 번식 (밀)
        if(!npc.def.hostile && !npc.def.npc && !npc.def.tameable && held && held.id === I.WHEAT && npc.love <= 0 && npc.babyT <= 0){
          this.consumeSelected();
          npc.love = 30;
          SFX.play('eat');
          return;
        }
      }
    }
    // 상호작용 블록
    if(hit){
      if(hit.id === B.CRAFT){ UI.openInventory(true); return; }
      if(hit.id === B.FURNACE || hit.id === B.FURNACE_LIT){ UI.openFurnace(hit.bx + ',' + hit.by + ',' + hit.bz); return; }
      if(hit.id === B.CHEST){ UI.openChest(hit.bx + ',' + hit.by + ',' + hit.bz); return; }
      if(hit.id === B.ENCHANT){ UI.openEnchant(); return; }
      // 레버: 토글 + 주변 3블록 내 철문/램프 작동
      if(hit.id === B.LEVER_OFF || hit.id === B.LEVER_ON){
        const on = hit.id === B.LEVER_OFF;
        this.world.setBlock(hit.bx, hit.by, hit.bz, on ? B.LEVER_ON : B.LEVER_OFF);
        SFX.play('click');
        for(let dx = -3; dx <= 3; dx++) for(let dy = -3; dy <= 3; dy++) for(let dz = -3; dz <= 3; dz++){
          const id2 = this.world.getBlock(hit.bx + dx, hit.by + dy, hit.bz + dz);
          if(id2 === B.LAMP_OFF && on) this.world.setBlock(hit.bx + dx, hit.by + dy, hit.bz + dz, B.LAMP_ON);
          else if(id2 === B.LAMP_ON && !on) this.world.setBlock(hit.bx + dx, hit.by + dy, hit.bz + dz, B.LAMP_OFF);
          else if(id2 === B.IRON_DOOR && on) this.world.setBlock(hit.bx + dx, hit.by + dy, hit.bz + dz, B.IRON_DOOR_OPEN);
          else if(id2 === B.IRON_DOOR_OPEN && !on) this.world.setBlock(hit.bx + dx, hit.by + dy, hit.bz + dz, B.IRON_DOOR);
        }
        return;
      }
      if(hit.id === B.DOOR || hit.id === B.DOOR_OPEN){
        const to = hit.id === B.DOOR ? B.DOOR_OPEN : B.DOOR;
        this.world.setBlock(hit.bx, hit.by, hit.bz, to);
        for(const dy of [-1, 1]){ // 위/아래 문짝도 같이
          const nb = this.world.getBlock(hit.bx, hit.by + dy, hit.bz);
          if(nb === B.DOOR || nb === B.DOOR_OPEN) this.world.setBlock(hit.bx, hit.by + dy, hit.bz, to);
        }
        SFX.play('place');
        return;
      }
      if(hit.id === B.IRON_DOOR){ UI.toast('철문은 레버로만 열려요'); return; }
      // 부싯돌과 부시: 흑요석 프레임 점화
      {
        const held0 = this.currentItem();
        if(held0 && toolInfo(held0.id) && toolInfo(held0.id).kind === 'igniter'){
          if(hit.id === B.OBSIDIAN){
            if(this.world.ignitePortal(hit.bx, hit.by, hit.bz)){
              SFX.play('evolve');
              UI.toast('🌀 네더 포탈이 열렸다! 포탈 안에 2초간 서 있으면 이동해요');
              this.damageTool(held0);
            } else {
              UI.toast('흑요석 프레임(안쪽 2×3 비움)이 필요해요 — 프레임 바닥을 클릭!');
            }
            return;
          }
          if(hit.id === B.TNT){
            this.world.setBlock(hit.bx, hit.by, hit.bz, B.AIR);
            if(typeof Net !== 'undefined' && Net.mode === 'guest') Net.sendIgnite(hit.bx, hit.by, hit.bz);
            else TNTs.spawn(hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5, 3);
            this.damageTool(held0);
            return;
          }
        }
      }
      if(hit.id === B.HEAL_MACHINE){
        if(!PokeMan.enabled || !PokeMan.party.length){ UI.toast('회복할 포켓몬이 없어요'); return; }
        if(game.healCd > 0){ UI.toast('회복 머신 충전 중... ' + Math.ceil(game.healCd) + '초'); return; }
        game.healCd = 60;
        PokeMan.party.forEach(q => { q.hp = q.maxHp; });
        Particles.spawn(hit.bx + 0.5, hit.by + 1.2, hit.bz + 0.5, 0x48e0c8, 18, 2, 0.8, 1.5);
        SFX.play('level');
        UI.toast('💖 포켓몬들이 모두 회복했다! 삐리리~');
        if(typeof Ach !== 'undefined') Ach.unlock('heal');
        // 🥚 같은 종 2마리가 파티에 있으면 알 발견!
        if(!PokeMan.egg){
          const cnt = {};
          let pair = 0;
          PokeMan.party.forEach(q => { cnt[q.sp] = (cnt[q.sp] || 0) + 1; if(cnt[q.sp] === 2 && !pair) pair = q.sp; });
          if(pair && Math.random() < 0.4){
            PokeMan.egg = { sp: baseFormOf(pair), t: 240 };
            SFX.play('caught');
            UI.toast('🥚 회복 머신 옆에서 알을 발견했다!! 4분 뒤 부화해요 (P에서 확인)', 6000);
          }
        }
        return;
      }
      if(hit.id === B.FOSSIL_MACHINE){
        const held1 = this.currentItem();
        if(held1 && FOSSIL_POKES[held1.id]){
          held1.n--; if(held1.n <= 0) this.inventory[this.selected] = null;
          UI.updateHotbar();
          Particles.spawn(hit.bx + 0.5, hit.by + 1.2, hit.bz + 0.5, 0x7ad0c8, 20, 2, 1, 2);
          PokeMan.reviveFossil(held1.id);
        } else {
          UI.toast('화석을 들고 우클릭하세요 (화석 광석: 지하 y20 아래)');
        }
        return;
      }
      if(hit.id === B.PC_BLOCK){
        if(!PokeMan.enabled){ UI.toast('포켓몬 모드가 꺼져 있어요'); return; }
        UI.openParty();
        return;
      }
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
    // 엔더의 눈: 포탈 프레임에 끼우기 / 스트롱홀드 방향 탐지
    if(item.id === I.ENDER_EYE){
      if(hit && hit.id === B.END_FRAME){
        this.world.setBlock(hit.bx, hit.by, hit.bz, B.END_FRAME_LIT);
        item.n--; if(item.n <= 0) this.inventory[this.selected] = null;
        UI.updateHotbar();
        SFX.play('place');
        if(typeof tryActivateEndPortal === 'function' && tryActivateEndPortal(this.world, hit.bx, hit.by, hit.bz)){
          SFX.play('evolve');
          UI.toast('🌌 엔드 포탈이 열렸다!! 포탈에 들어가면 엔더드래곤이 기다린다...', 6000);
        } else {
          UI.toast('👁 엔더의 눈을 끼웠다 — 프레임 12개를 모두 채우자');
        }
        return;
      }
      if(hit && hit.id === B.END_FRAME_LIT){ UI.toast('이미 눈이 끼워져 있어요'); return; }
      if(game.dim !== 'over'){ UI.toast('👁 엔더의 눈이 잠잠하다... (오버월드에서만 반응해요)'); return; }
      const shs = this.world.strongholdsNear(this.body.x, this.body.z);
      if(!shs.length){ UI.toast('👁 눈이 반응하지 않는다... 더 멀리 가보자'); return; }
      let best = null, bd = 1e9;
      for(const s of shs){
        const d2 = Math.hypot(s.x - this.body.x, s.z - this.body.z);
        if(d2 < bd){ bd = d2; best = s; }
      }
      const dx = best.x - this.body.x, dz = best.z - this.body.z;
      let a = Math.atan2(dx, -dz) * 180 / Math.PI; if(a < 0) a += 360;
      const fx2 = -Math.sin(this.yaw), fz2 = -Math.cos(this.yaw);
      let va = Math.atan2(fx2, -fz2) * 180 / Math.PI; if(va < 0) va += 360;
      const rel = ((a - va) % 360 + 360) % 360;
      const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
      SFX.play('pop');
      UI.toast('👁 엔더의 눈이 ' + arrows[Math.round(rel / 45) % 8] + ' ' + Math.round(bd) + 'm 방향을 가리킨다! (지하 y13 부근)', 5000);
      return;
    }
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
    // 🎒 포켓몬 가방: 우클릭 = 장착한 볼 던지기, 웅크리고 우클릭 = 가방 열기
    if(item.id === I.POKE_BAG){
      if(!PokeMan.enabled){ UI.toast('포켓몬 모드가 꺼져 있습니다'); return; }
      if(game.keys['ShiftLeft'] || game.keys['ShiftRight']){ UI.openBag(); return; }
      const ballId = PokeMan.bestBall();
      if(!ballId){ UI.toast('가방에 몬스터볼이 없어요! (철+레드스톤으로 제작)'); return; }
      const e = this.eye(), d = this.dir();
      Projectiles.throwBall(e.x + d.x * 0.4, e.y + d.y * 0.4 - 0.1, e.z + d.z * 0.4, d.x, d.y, d.z, ballId);
      PokeMan.bagRemove(ballId, 1);
      UI.updateHotbar();
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
    // 물약 마시기
    if(buffOf(item.id)){
      this.effects[buffOf(item.id)] = 60;
      SFX.play('eat');
      Particles.spawn(this.body.x, this.body.y + 1.4, this.body.z,
        item.id === I.POTION_SPEED ? 0x58c8e8 : item.id === I.POTION_JUMP ? 0x8ae060 : 0xf06ba8, 10, 1.5, 0.6, 1);
      this.consumeSelected();
      return;
    }
    // 갑옷 착용 (우클릭)
    if(armorInfo(item.id)){
      const slot = armorInfo(item.id).slot;
      const prev = this.armor[slot];
      this.armor[slot] = { ...item, n: 1 };
      this.inventory[this.selected] = prev ? { ...prev } : null;
      SFX.play('place');
      UI.toast(itemName(item.id) + ' 착용! (방어 ' + this.armorPts() + ')');
      UI.updateHotbar();
      return;
    }
    // 양동이: 물/용암 뜨기
    if(item.id === I.BUCKET){
      const e2 = this.eye(), d2 = this.dir();
      for(let t = 0.4; t < this.reach; t += 0.15){
        const sx2 = e2.x + d2.x * t, sy2 = e2.y + d2.y * t, sz2 = e2.z + d2.z * t;
        const id2 = this.world.getBlock(sx2, sy2, sz2);
        if(id2 === B.WATER || id2 === B.LAVA){
          this.world.setBlock(sx2, sy2, sz2, B.AIR);
          this.inventory[this.selected] = { id: id2 === B.WATER ? I.WATER_BUCKET : I.LAVA_BUCKET, n: 1 };
          SFX.play('pop');
          UI.toast(id2 === B.WATER ? '🪣 물을 펐다!' : '🪣 용암을 펐다! 뜨겁다!!');
          UI.updateHotbar();
          return;
        }
        if(this.world.isSolid(sx2, sy2, sz2)) break;
      }
      UI.toast('물이나 용암을 향해 사용하세요');
      return;
    }
    // 물/용암 붓기
    if(item.id === I.WATER_BUCKET || item.id === I.LAVA_BUCKET){
      if(!hit){ UI.toast('블록 옆면을 향해 부으세요'); return; }
      const cx2 = hit.bx + hit.nx, cy2 = hit.by + hit.ny, cz2 = hit.bz + hit.nz;
      const cur2 = this.world.getBlock(cx2, cy2, cz2);
      if(cur2 !== B.AIR && cur2 !== B.TALLGRASS){ UI.toast('빈 공간에만 부을 수 있어요'); return; }
      if(item.id === I.WATER_BUCKET && this.world.dim === 'nether'){
        UI.toast('치이익... 네더에서는 물이 증발한다!');
        this.inventory[this.selected] = { id: I.BUCKET, n: 1 };
        UI.updateHotbar();
        return;
      }
      this.world.setBlock(cx2, cy2, cz2, item.id === I.WATER_BUCKET ? B.WATER : B.LAVA);
      this.inventory[this.selected] = { id: I.BUCKET, n: 1 };
      SFX.play('pop');
      UI.updateHotbar();
      return;
    }
    // 엔더 진주: 던져서 순간이동
    if(item.id === I.ENDERPEARL){
      const e = this.eye(), d = this.dir();
      Projectiles.throwPearl(e.x + d.x * 0.4, e.y + d.y * 0.4, e.z + d.z * 0.4, d.x, d.y, d.z);
      this.consumeSelected();
      return;
    }
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
    if(typeof Ach !== 'undefined') Ach.unlock('first_fish');
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
    const power = item.ench && item.ench.k === 'power' ? item.ench.l * 1.5 : 0;
    Projectiles.shootArrow(e.x + d.x * 0.4, e.y + d.y * 0.4 - 0.1, e.z + d.z * 0.4, d.x, d.y, d.z,
      { fromPlayer: true, speed: 12 + 20 * ch, dmg: Math.round(2 + 5 * ch + power) });
    SFX.play('throw');
    this.damageTool(item);
    game.swing = 0.25;
  }

  trySleep(hit){
    if(this.world.dim === 'nether'){
      UI.toast('💥 네더에서 침대는... 폭발한다!!');
      this.world.setBlock(hit.bx, hit.by, hit.bz, B.AIR);
      explode(this.world, hit.bx + 0.5, hit.by + 0.5, hit.bz + 0.5, 3, false);
      return;
    }
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
  // 든 아이템 버리기 (Q / Ctrl+Q)
  dropSelected(all){
    const s = this.inventory[this.selected];
    if(!s || this.dead) return;
    if(s.id === I.POKE_BAG){ UI.toast('포켓몬 가방은 버릴 수 없어요!'); return; }
    const n = all ? s.n : 1;
    const e = this.eye(), d = this.dir();
    ItemDrops.spawn(e.x + d.x * 0.6, e.y - 0.2, e.z + d.z * 0.6, s.id, n, s.dur, s.ench,
      { x: d.x * 6, y: 1.5, z: d.z * 6 });
    s.n -= n;
    if(s.n <= 0) this.inventory[this.selected] = null;
    UI.updateHotbar();
  }
  consumeSelected(){
    const s = this.inventory[this.selected];
    if(!s) return;
    s.n--;
    if(s.n <= 0) this.inventory[this.selected] = null;
    UI.updateHotbar();
  }

  // ----- 데미지/죽음 -----
  armorPts(){
    return this.armor.reduce((s, a) => s + (a ? armorInfo(a.id).pts : 0), 0);
  }
  touchingBlock(id){
    const b = this.body;
    const x0 = Math.floor(b.x - b.w - 0.04), x1 = Math.floor(b.x + b.w + 0.04);
    const y0 = Math.floor(b.y), y1 = Math.floor(b.y + b.h);
    const z0 = Math.floor(b.z - b.w - 0.04), z1 = Math.floor(b.z + b.w + 0.04);
    for(let x = x0; x <= x1; x++) for(let y = y0; y <= y1; y++) for(let z = z0; z <= z1; z++){
      if(this.world.getBlock(x, y, z) === id) return true;
    }
    return false;
  }
  hurt(dmg, kx, kz, ignoreInvuln){
    if(this.dead) return;
    if(game.mode === 'creative') return;
    if(game.inBattle) return; // 포켓몬 배틀 중에는 무적
    if(!ignoreInvuln && this.invuln > 0) return;
    // 갑옷: 포인트당 5% 감소 (최대 60%) + 무작위 부위 내구 소모
    const pts = this.armorPts();
    if(pts > 0){
      dmg = Math.max(1, Math.round(dmg * (1 - Math.min(0.6, pts * 0.05))));
      const worn = this.armor.map((a, i) => a ? i : -1).filter(i => i >= 0);
      const idx = worn[Math.floor(Math.random() * worn.length)];
      const piece = this.armor[idx];
      const info = armorInfo(piece.id);
      if(piece.dur === undefined) piece.dur = info.dur;
      piece.dur -= dmg;
      if(piece.dur <= 0){
        this.armor[idx] = null;
        SFX.play('fail');
        UI.toast(itemName(piece.id) + '이(가) 부서졌다!');
      }
    }
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
    // 네더에서 죽으면 오버월드 스폰으로 복귀 (마크와 동일)
    if(typeof game !== 'undefined' && game.dim !== 'over' && typeof swapWorldTo === 'function'){
      swapWorldTo('over');
      game.portalCd = 3;
      UI.toast('🌍 오버월드에서 다시 시작합니다');
    }
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
  addItem(id, n, dur, ench){
    // 🎒 포켓몬 아이템은 포켓몬 가방으로 자동 수납
    if(typeof POKE_ITEM_SET !== 'undefined' && POKE_ITEM_SET.has(id) &&
       typeof PokeMan !== 'undefined' && PokeMan.enabled){
      PokeMan.bagAdd(id, n);
      return 0;
    }
    const max = maxStack(id);
    if(max > 1 && !ench){
      for(let i = 0; i < 36; i++){
        const s = this.inventory[i];
        if(s && s.id === id && s.n < max && !s.ench){
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
        if(ench) this.inventory[i].ench = ench;
        n -= put;
        if(n <= 0) break;
      }
    }
    UI.updateHotbar();
    return n;
  }
  countItem(id){
    const inv = this.inventory.reduce((s, it) => s + (it && it.id === id ? it.n : 0), 0);
    const bag = (typeof PokeMan !== 'undefined' && PokeMan.bag) ? (PokeMan.bag[id] || 0) : 0;
    return inv + bag;
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
    if(n > 0 && typeof PokeMan !== 'undefined' && PokeMan.bag) n = PokeMan.bagRemove(id, n);
  }
  serialize(){
    const pets = MobManager.list.filter(m => m.tamed).length;
    return {
      x: this.body.x, y: this.body.y, z: this.body.z,
      yaw: this.yaw, pitch: this.pitch,
      health: this.health, inv: this.inventory, sel: this.selected,
      armor: this.armor, effects: this.effects, pets
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
    this.armor = (d.armor || [null, null, null]).map(a => a ? { ...a } : null);
    this.effects = d.effects || {};
    // 길들인 늑대 복원
    for(let i = 0; i < (d.pets || 0); i++){
      const w = new Mob('wolf', this.body.x + 1 + i, this.body.y + 1, this.body.z + 1);
      w.tamed = true;
      w.setTag('🐶 내 늑대');
      MobManager.list.push(w);
    }
    // 저장 당시 커서/제작칸에 있던 아이템 복원
    (d.extra || []).forEach(s => { if(s) this.addItem(s.id, s.n, s.dur); });
  }
}
