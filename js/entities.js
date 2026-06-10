// ===== entities.js : 물리, 드롭 아이템, 파티클, 투사체(포켓볼/화살), TNT, 폭발 =====
'use strict';

// ---------- AABB 물리 바디 ----------
class PhysBody {
  constructor(x, y, z, halfW, height){
    this.x = x; this.y = y; this.z = z;
    this.w = halfW; this.h = height;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.onGround = false; this.hitWall = false; this.inWater = false;
    this.noClip = false;
  }
  update(dt, world){
    this.hitWall = false;
    // 두 지점 샘플로 수면 경계에서의 상태 깜빡임(떨림) 방지
    const wa = world.getBlock(this.x, this.y + 0.25, this.z);
    const wb = world.getBlock(this.x, this.y + this.h * 0.55, this.z);
    this.inWater = BLOCKS[wa].rt === RT.WATER || BLOCKS[wb].rt === RT.WATER;
    if(this.noClip){
      this.x += this.vx * dt; this.y += this.vy * dt; this.z += this.vz * dt;
      this.y = clamp(this.y, 1, WORLD_H + 20);
      return;
    }
    if(!this.noGravity){
      if(this.inWater){
        this.vy -= 7 * dt;
        this.vy *= Math.max(0, 1 - dt * 2.2); // 물의 저항 — 수면에서 출렁임 감쇠
        if(this.vy < -3.2) this.vy = -3.2;
      } else {
        this.vy -= 26 * dt;
        if(this.vy < -42) this.vy = -42;
      }
    }
    this.onGround = false;
    this._sweep(0, this.vx * dt, world);
    this._sweep(1, this.vy * dt, world);
    this._sweep(2, this.vz * dt, world);
  }
  // 한 프레임 이동이 1블록을 넘으면 터널링하므로 잘게 나눠 이동
  _sweep(axis, d, world){
    if(d === 0) return;
    const steps = Math.max(1, Math.ceil(Math.abs(d) / 0.45));
    const sd = d / steps;
    for(let i = 0; i < steps; i++) this.moveAxis(axis, sd, world);
  }
  moveAxis(axis, d, world){
    if(d === 0) return;
    if(axis === 0) this.x += d; else if(axis === 1) this.y += d; else this.z += d;
    const eps = 0.001;
    const x0 = Math.floor(this.x - this.w), x1 = Math.floor(this.x + this.w - eps * 0.1);
    const y0 = Math.floor(this.y),          y1 = Math.floor(this.y + this.h - eps * 0.1);
    const z0 = Math.floor(this.z - this.w), z1 = Math.floor(this.z + this.w - eps * 0.1);
    for(let bx = x0; bx <= x1; bx++){
      for(let by = y0; by <= y1; by++){
        for(let bz = z0; bz <= z1; bz++){
          if(!world.isSolid(bx, by, bz)) continue;
          if(axis === 0){
            this.x = d > 0 ? bx - this.w - eps : bx + 1 + this.w + eps;
            this.vx = 0; this.hitWall = true;
          } else if(axis === 1){
            if(d > 0){ this.y = by - this.h - eps; this.vy = 0; }
            else { this.y = by + 1 + eps; this.vy = 0; this.onGround = true; }
          } else {
            this.z = d > 0 ? bz - this.w - eps : bz + 1 + this.w + eps;
            this.vz = 0; this.hitWall = true;
          }
          return;
        }
      }
    }
  }
}

// ---------- GPU 리소스 정리 ----------
// userData.shared가 표시된 지오메트리/머티리얼(캐시 공유분)은 건드리지 않는다
function disposeObject(root){
  if(!root || !root.traverse) return;
  root.traverse(o => {
    if(o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    if(o.material){
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => {
        if(m.userData.shared) return;
        if(m.map) m.map.dispose();
        m.dispose();
      });
    }
  });
}

// ---------- 아이콘 → 스프라이트 텍스처 ----------
const _iconTexCache = {};
function iconSpriteMaterial(id){
  if(!_iconTexCache[id]){
    const tex = new THREE.CanvasTexture(getIconCanvas(id));
    tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter;
    _iconTexCache[id] = new THREE.SpriteMaterial({ map: tex, transparent: true });
    _iconTexCache[id].userData.shared = true;
  }
  return _iconTexCache[id];
}

// ---------- 드롭 아이템 ----------
const ItemDrops = {
  list: [], group: null, _geom: {},
  init(scene){
    if(this.group){ this.clear(); return; }
    this.group = new THREE.Group();
    scene.add(this.group);
  },
  clear(){
    this.list.forEach(e => this.group.remove(e.mesh));
    this.list = [];
  },
  geom(id){
    if(!this._geom[id]){
      this._geom[id] = makeBlockGeometry(id, 0.3);
      this._geom[id].userData.shared = true;
    }
    return this._geom[id];
  },
  _idc: 0,
  spawn(x, y, z, id, n, dur, ench, vel){
    // 멀티 게스트: 드롭은 호스트 소유 — 호스트로 보내고 로컬 생성 안 함
    if(typeof Net !== 'undefined' && Net.mode === 'guest'){
      Net.sendSpawnDrop(x, y, z, id, n, dur, ench);
      return;
    }
    if(this.list.length > 200) return;
    let mesh;
    if(isBlockId(id) && BLOCKS[id].rt !== RT.CROSS){
      mesh = new THREE.Mesh(this.geom(id), world.matSolid);
    } else {
      mesh = new THREE.Sprite(iconSpriteMaterial(id));
      mesh.scale.set(0.45, 0.45, 0.45);
    }
    const e = {
      x, y, z, id, n, dur, ench, netId: ++this._idc,
      vx: vel ? vel.x : (Math.random() - 0.5) * 2.5,
      vy: vel ? vel.y : 2.5 + Math.random() * 1.5,
      vz: vel ? vel.z : (Math.random() - 0.5) * 2.5,
      age: vel ? -0.8 : 0, mesh
    };
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.list.push(e);
  },
  update(dt, world, player){
    for(let i = this.list.length - 1; i >= 0; i--){
      const e = this.list[i];
      e.age += dt;
      if(e.age > 300){ this.group.remove(e.mesh); this.list.splice(i, 1); continue; }
      // 자석/줍기
      if(player && !player.dead && e.age > 0.4){
        const d = dist3(e.x, e.y, e.z, player.body.x, player.body.y + 0.9, player.body.z);
        if(d < 2.4 && d > 0.01){
          const f = 8 * dt / d;
          e.vx += (player.body.x - e.x) * f;
          e.vy += (player.body.y + 0.9 - e.y) * f;
          e.vz += (player.body.z - e.z) * f;
        }
        if(d < 1.2){
          const left = player.addItem(e.id, e.n, e.dur, e.ench);
          if(left <= 0){
            SFX.play('pop');
            this.group.remove(e.mesh); this.list.splice(i, 1);
            continue;
          }
          e.n = left;
        }
      }
      // 간이 물리 (한 프레임에 0.45블록 이상 낙하 금지 — 터널링 방지)
      e.vy -= 18 * dt;
      if(e.vy < -20) e.vy = -20;
      let nx = e.x + e.vx * dt, ny = e.y + Math.max(e.vy * dt, -0.45), nz = e.z + e.vz * dt;
      if(world.isSolid(nx, e.y + 0.1, nz)){ e.vx = 0; e.vz = 0; nx = e.x; nz = e.z; }
      if(e.vy < 0 && world.isSolid(nx, ny, nz)){
        ny = Math.floor(ny) + 1.001;
        e.vy = 0; e.vx *= 0.5; e.vz *= 0.5;
      }
      if(e.vy > 0 && world.isSolid(nx, ny + 0.3, nz)){ e.vy = 0; }
      e.x = nx; e.y = ny; e.z = nz;
      e.mesh.position.set(e.x, e.y + 0.18 + Math.sin(e.age * 3) * 0.05, e.z);
      if(e.mesh.isMesh) e.mesh.rotation.y += dt * 2.2;
    }
  }
};

// ---------- 파티클 ----------
const Particles = {
  MAX: 500, list: [], points: null,
  init(scene){
    if(this.points){ this.list = []; return; }
    this.positions = new Float32Array(this.MAX * 3);
    this.colors = new Float32Array(this.MAX * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const m = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, sizeAttenuation: true });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    scene.add(this.points);
  },
  spawn(x, y, z, hex, n, spread, life, up){
    const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
    for(let i = 0; i < n; i++){
      if(this.list.length >= this.MAX) this.list.shift();
      this.list.push({
        x, y, z,
        vx: (Math.random() - 0.5) * spread,
        vy: (Math.random() - 0.3) * spread + (up || 0),
        vz: (Math.random() - 0.5) * spread,
        life: life * (0.5 + Math.random() * 0.5), r, g, b
      });
    }
  },
  blockBreak(x, y, z, id){
    this.spawn(x + 0.5, y + 0.5, z + 0.5, tileAvgColor(BLOCKS[id].tiles.side), 14, 3, 0.7);
  },
  update(dt){
    for(let i = this.list.length - 1; i >= 0; i--){
      const p = this.list[i];
      p.life -= dt;
      if(p.life <= 0){ this.list.splice(i, 1); continue; }
      p.vy -= 7 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if(world.isSolid(p.x, p.y, p.z)){ p.vy = 0; p.vx *= 0.7; p.vz *= 0.7; p.y = Math.floor(p.y) + 1.01; }
    }
    for(let i = 0; i < this.MAX; i++){
      if(i < this.list.length){
        const p = this.list[i];
        this.positions[i*3] = p.x; this.positions[i*3+1] = p.y; this.positions[i*3+2] = p.z;
        this.colors[i*3] = p.r; this.colors[i*3+1] = p.g; this.colors[i*3+2] = p.b;
      } else {
        this.positions[i*3+1] = -1000;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
};
const _tileColorCache = {};
function tileAvgColor(tile){
  if(_tileColorCache[tile] !== undefined) return _tileColorCache[tile];
  const ctx = ATLAS.canvas.getContext('2d');
  const d = ctx.getImageData((tile % 16) * 16, Math.floor(tile / 16) * 16, 16, 16).data;
  let r = 0, g = 0, b = 0, cnt = 0;
  for(let i = 0; i < d.length; i += 4){
    if(d[i+3] < 100) continue;
    r += d[i]; g += d[i+1]; b += d[i+2]; cnt++;
  }
  cnt = cnt || 1;
  const c = ((r/cnt) << 16) | ((g/cnt) << 8) | (b/cnt);
  _tileColorCache[tile] = c;
  return c;
}

// ---------- 투사체 ----------
const Projectiles = {
  list: [], group: null,
  init(scene){
    if(this.group){ this.clear(); return; }
    this.group = new THREE.Group();
    scene.add(this.group);
  },
  clear(){
    this.list.forEach(e => { this.group.remove(e.mesh); disposeObject(e.mesh); });
    this.list = [];
  },
  throwBall(x, y, z, dx, dy, dz, ballId){
    const mesh = new THREE.Sprite(iconSpriteMaterial(ballId));
    mesh.scale.set(0.35, 0.35, 0.35);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.list.push({ type:'ball', ballId, x, y, z, vx: dx*14, vy: dy*14 + 2.5, vz: dz*14, age:0, mesh });
    SFX.play('throw');
  },
  throwPearl(x, y, z, dx, dy, dz){
    const mesh = new THREE.Sprite(iconSpriteMaterial(I.ENDERPEARL));
    mesh.scale.set(0.3, 0.3, 0.3);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.list.push({ type:'pearl', x, y, z, vx: dx*18, vy: dy*18 + 2, vz: dz*18, age:0, mesh });
    SFX.play('throw');
  },
  shootArrow(x, y, z, dx, dy, dz, opts){
    opts = opts || {};
    const speed = opts.speed || 18;
    const g = new THREE.BoxGeometry(0.06, 0.06, 0.55);
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xcabb9a }));
    m.position.set(x, y, z);
    this.group.add(m);
    this.list.push({ type:'arrow', x, y, z, vx: dx*speed, vy: dy*speed, vz: dz*speed, age:0, mesh: m,
                     fromPlayer: !!opts.fromPlayer, dmg: opts.dmg || 3 });
  },
  _remove(i){
    this.group.remove(this.list[i].mesh);
    disposeObject(this.list[i].mesh);
    this.list.splice(i, 1);
  },
  update(dt, world, player){
    outer:
    for(let i = this.list.length - 1; i >= 0; i--){
      const e = this.list[i];
      e.age += dt;
      e.vy -= (e.type === 'ball' ? 16 : 10) * dt;
      e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
      e.mesh.position.set(e.x, e.y, e.z);

      if(e.type === 'ball'){
        if(typeof PokeMan !== 'undefined' && PokeMan.enabled){
          if(typeof Net !== 'undefined' && Net.mode === 'guest'){
            // 게스트: 야생 퍼펫 명중 → 호스트와 협의 후 포획 시도
            for(const [, w] of Net.pWilds){
              if(w.reserved || (w.data && w.data.frozen)) continue;
              if(dist3(e.x, e.y, e.z, w.x, w.y + 0.5, w.z) < 1.2){
                this._remove(i);
                Net.engageWild(w, e.ballId);
                continue outer;
              }
            }
          } else {
            for(const w of PokeMan.wilds){
              if(w.catching) continue;
              if(dist3(e.x, e.y, e.z, w.body.x, w.body.y + w.body.h*0.5, w.body.z) < 1.2){
                this._remove(i);
                PokeMan.overworldCatch(w, e.ballId);
                continue outer;
              }
            }
          }
        }
        if(world.isSolid(e.x, e.y, e.z) || e.age > 6){
          this._remove(i);
          ItemDrops.spawn(e.x - e.vx*dt*2, e.y - e.vy*dt*2 + 0.3, e.z - e.vz*dt*2, e.ballId, 1);
          continue;
        }
      } else if(e.type === 'pearl'){
        // 엔더 진주: 착지점으로 순간이동
        if(world.isSolid(e.x, e.y, e.z) || e.age > 6){
          const tx = e.x - e.vx * dt * 2, ty = e.y - e.vy * dt * 2, tz = e.z - e.vz * dt * 2;
          Particles.spawn(player.body.x, player.body.y + 1, player.body.z, 0x8a3ae8, 12, 2, 0.6, 1);
          player.body.x = tx; player.body.y = Math.max(2, ty); player.body.z = tz;
          player.body.vx = player.body.vy = player.body.vz = 0;
          player.hurt(2, 0, 0, true);
          Particles.spawn(tx, ty + 1, tz, 0x8a3ae8, 16, 2.5, 0.7, 1);
          SFX.play('throw');
          this._remove(i);
          continue;
        }
      } else { // arrow
        const dir = new THREE.Vector3(e.vx, e.vy, e.vz).normalize();
        e.mesh.lookAt(e.x + dir.x, e.y + dir.y, e.z + dir.z);
        if(e.fromPlayer){
          // 플레이어가 쏜 화살 → 몹 명중
          let hit = false;
          if(typeof Net !== 'undefined' && Net.mode === 'guest'){
            hit = Net.arrowHitPuppet(e.x, e.y, e.z, e.dmg, e.vx * 0.03, e.vz * 0.03);
          } else {
            for(const m of MobManager.list){
              if(dist3(e.x, e.y, e.z, m.body.x, m.body.y + m.body.h / 2, m.body.z) < Math.max(0.9, m.body.w + 0.45)){
                m.hurt(e.dmg, e.vx * 0.03, e.vz * 0.03);
                hit = true;
                break;
              }
            }
          }
          if(hit){ this._remove(i); continue; }
        } else {
          // 몹(스켈레톤)이 쏜 화살 → 플레이어 명중
          if(player && !player.dead && dist3(e.x, e.y, e.z, player.body.x, player.body.y + 0.9, player.body.z) < 0.8){
            player.hurt(e.dmg, e.vx * 0.05, e.vz * 0.05);
            this._remove(i);
            continue;
          }
          if(typeof Net !== 'undefined' && Net.mode === 'host' && Net.arrowHitRemote(e)){
            this._remove(i);
            continue;
          }
        }
        if(world.isSolid(e.x, e.y, e.z) || e.age > 8){
          this._remove(i);
          continue;
        }
      }
    }
  }
};

// ---------- TNT ----------
const TNTs = {
  list: [], group: null,
  init(scene){
    if(this.group){ this.clear(); return; }
    this.group = new THREE.Group();
    scene.add(this.group);
  },
  clear(){
    this.list.forEach(e => { this.group.remove(e.mesh); disposeObject(e.mesh); });
    this.list = [];
  },
  spawn(x, y, z, fuse){
    const mesh = new THREE.Mesh(makeBlockGeometry(B.TNT, 0.96), world.matSolid);
    const flash = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    mesh.add(flash);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
    this.list.push({ x, y, z, vy: 1.5, fuse: fuse === undefined ? 3 : fuse, mesh, flash });
    SFX.play('fuse');
  },
  update(dt, world){
    for(let i = this.list.length - 1; i >= 0; i--){
      const e = this.list[i];
      e.vy -= 18 * dt;
      if(e.vy < -16) e.vy = -16;
      let ny = e.y + Math.max(e.vy * dt, -0.4);
      if(e.vy < 0 && world.isSolid(e.x, ny - 0.49, e.z)){ ny = e.y; e.vy = 0; }
      e.y = ny;
      e.fuse -= dt;
      e.flash.visible = Math.floor(e.fuse * 4) % 2 === 0;
      const s = 1 + Math.max(0, (1 - e.fuse)) * 0.1;
      e.mesh.scale.set(s, s, s);
      e.mesh.position.set(e.x, e.y, e.z);
      if(e.fuse <= 0){
        this.group.remove(e.mesh);
        disposeObject(e.mesh);
        this.list.splice(i, 1);
        explode(world, e.x, e.y, e.z, 4, true);
      }
    }
  }
};

// ---------- 폭발 ----------
function explode(world, x, y, z, r, dropItems){
  SFX.play('boom');
  Particles.spawn(x, y, z, 0xffa030, 40, 9, 0.9, 2);
  Particles.spawn(x, y, z, 0x777777, 40, 7, 1.4, 3);
  const bx = Math.floor(x), by = Math.floor(y), bz = Math.floor(z);
  for(let dx = -r; dx <= r; dx++){
    for(let dy = -r; dy <= r; dy++){
      for(let dz = -r; dz <= r; dz++){
        if(dx*dx + dy*dy + dz*dz > r*r) continue;
        const wx = bx + dx, wy = by + dy, wz = bz + dz;
        const id = world.getBlock(wx, wy, wz);
        if(id === B.AIR || id === B.WATER || id === B.BEDROCK || id === B.OBSIDIAN) continue;
        world.setBlock(wx, wy, wz, B.AIR);
        if(id === B.TNT){
          TNTs.spawn(wx + 0.5, wy + 0.5, wz + 0.5, 0.3 + Math.random() * 0.6);
        } else if(dropItems && Math.random() < 0.3){
          const def = BLOCKS[id];
          const drops = def.drop ? def.drop(Math.random) : [[id, 1]];
          drops.forEach(([did, dn]) => ItemDrops.spawn(wx + 0.5, wy + 0.5, wz + 0.5, did, dn));
        }
      }
    }
  }
  // 데미지
  const hurtR = r + 2.5;
  if(typeof player !== 'undefined' && player && !player.dead){
    const d = dist3(x, y, z, player.body.x, player.body.y + 0.9, player.body.z);
    if(d < hurtR) player.hurt(Math.ceil((1 - d / hurtR) * 15), (player.body.x - x) * 0.4, (player.body.z - z) * 0.4);
  }
  if(typeof Net !== 'undefined' && Net.mode === 'host') Net.explosion(x, y, z, hurtR);
  if(typeof MobManager !== 'undefined'){
    MobManager.list.slice().forEach(m => {
      const d = dist3(x, y, z, m.body.x, m.body.y, m.body.z);
      if(d < hurtR) m.hurt(Math.ceil((1 - d / hurtR) * 15), (m.body.x - x) * 0.3, (m.body.z - z) * 0.3);
    });
  }
  if(typeof PokeMan !== 'undefined'){
    PokeMan.wilds.slice().forEach(w => {
      const d = dist3(x, y, z, w.body.x, w.body.y, w.body.z);
      if(d < r) PokeMan.removeWild(w, true);
    });
  }
  if(typeof game !== 'undefined') game.shake = 0.5;
}
