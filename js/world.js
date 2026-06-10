// ===== world.js : 청크, 지형 생성, 메싱, 레이캐스트, 화로, 저장 =====
'use strict';

const CHUNK = 16, WORLD_H = 64, SEA = 28;

// 면 정의: n=법선, c=꼭짓점 4개(반시계), shade=면 밝기
const FACE_DEFS = [
  { n:[ 1,0,0], shade:0.78, c:[[1,0,1],[1,0,0],[1,1,0],[1,1,1]] },
  { n:[-1,0,0], shade:0.78, c:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]] },
  { n:[0, 1,0], shade:1.00, c:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
  { n:[0,-1,0], shade:0.55, c:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
  { n:[0,0, 1], shade:0.68, c:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
  { n:[0,0,-1], shade:0.68, c:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },
];
const FACE_UV = [[0,0],[1,0],[1,1],[0,1]];

function ck(cx, cz){ return cx + ',' + cz; }

// 미니 블록 지오메트리(드롭 아이템/손에 든 블록용)
function makeBlockGeometry(id, size){
  const def = BLOCKS[id];
  const pos = [], nor = [], uv = [], col = [], idx = [];
  const s = size, o = -size / 2;
  FACE_DEFS.forEach(f => {
    const tile = f.n[1] === 1 ? def.tiles.top : f.n[1] === -1 ? def.tiles.bottom : def.tiles.side;
    const [u0, v0, u1, v1] = tileUV(tile);
    const base = pos.length / 3;
    f.c.forEach((c, i) => {
      pos.push(o + c[0]*s, o + c[1]*s, o + c[2]*s);
      nor.push(f.n[0], f.n[1], f.n[2]);
      uv.push(FACE_UV[i][0] ? u1 : u0, FACE_UV[i][1] ? v1 : v0);
      col.push(f.shade, f.shade, f.shade);
    });
    idx.push(base, base+1, base+2, base, base+2, base+3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

class Chunk {
  constructor(cx, cz){
    this.cx = cx; this.cz = cz;
    this.data = new Uint8Array(CHUNK * CHUNK * WORLD_H);
    this.heights = new Uint8Array(CHUNK * CHUNK); // 컬럼별 최상단 블록 y (스카이라이트용)
    this.torches = new Set(); // "wx,wy,wz"
    this.meshes = null; // {solid, cutout, water}
  }
}

class World {
  constructor(seed){
    this.seed = seed | 0;
    this.chunks = new Map();
    this.edits = {};        // { "cx,cz": { idx: blockId } }
    this.furnaces = new Map(); // "x,y,z" -> {in,fuel,out,burn,burnMax,prog}
    this.chests = new Map();   // "x,y,z" -> {slots:[27]}
    this.dirty = new Set();
    this.renderDist = 4;
    this.spawnPoint = null;
    this.group = new THREE.Group();
    this._tickAcc = 0;
    this.fluidQ = new Set();     // 물 흐름 대기열 "x,y,z"
    this._fluidAcc = 0;
    this.gymsBeaten = new Set(); // 클리어한 체육관 키

    this.nCont  = new Noise2(seed);
    this.nDet   = new Noise2(seed + 101);
    this.nMt    = new Noise2(seed + 202);
    this.nTemp  = new Noise2(seed + 303);
    this.nMoist = new Noise2(seed + 404);

    this.matSolid = new THREE.MeshLambertMaterial({ map: ATLAS.texture, vertexColors: true });
    this.matCutout = new THREE.MeshLambertMaterial({ map: ATLAS.texture, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide });
    // 물: 흐르는 애니메이션을 위한 전용 반복 텍스처 (월드좌표 UV)
    const wc = document.createElement('canvas'); wc.width = wc.height = 16;
    const wctx = wc.getContext('2d');
    const wrng = mulberry32(99);
    wctx.fillStyle = '#3f76e4'; wctx.fillRect(0, 0, 16, 16);
    for(let i = 0; i < 40; i++){ wctx.fillStyle = wrng() < 0.5 ? '#3666c8' : '#5a8af0'; wctx.fillRect(wrng()*16|0, wrng()*16|0, 2, 1); }
    for(let i = 0; i < 10; i++){ wctx.fillStyle = '#6f9bf5'; wctx.fillRect(wrng()*16|0, wrng()*16|0, 3, 1); }
    this.waterTex = new THREE.CanvasTexture(wc);
    this.waterTex.magFilter = THREE.NearestFilter; this.waterTex.minFilter = THREE.NearestFilter;
    this.waterTex.wrapS = this.waterTex.wrapT = THREE.RepeatWrapping;
    this.matWater = new THREE.MeshLambertMaterial({ map: this.waterTex, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false, side: THREE.DoubleSide });
    [this.matSolid, this.matCutout, this.matWater].forEach(m => { m.userData.shared = true; });

    // 청크 로딩 순서(가까운 곳부터)
    this._offsets = [];
    const R = 10;
    for(let dx = -R; dx <= R; dx++) for(let dz = -R; dz <= R; dz++) this._offsets.push([dx, dz, Math.sqrt(dx*dx+dz*dz)]);
    this._offsets.sort((a, b) => a[2] - b[2]);
  }

  // ---------- 지형 함수(순수) ----------
  terrainH(wx, wz){
    const e1 = this.nCont.fbm(wx * 0.004, wz * 0.004, 4);
    const e2 = this.nDet.fbm(wx * 0.016, wz * 0.016, 3);
    const mt = this.nMt.fbm(wx * 0.003, wz * 0.003, 3);
    let h = 16 + e1 * 22 + e2 * 7;
    if(mt > 0.56) h += (mt - 0.56) / 0.44 * 34 * (0.4 + e2 * 0.8);
    return Math.floor(clamp(h, 4, WORLD_H - 6));
  }
  biomeAt(wx, wz){
    const h = this.terrainH(wx, wz);
    let temp = this.nTemp.fbm(wx * 0.0022, wz * 0.0022, 3) - (h - 30) * 0.004;
    const moist = this.nMoist.fbm(wx * 0.0025, wz * 0.0025, 3);
    if(h < SEA - 1) return 'ocean';
    if(temp < 0.34) return 'snow';
    if(temp > 0.66 && moist < 0.38) return 'desert';
    if(temp > 0.60 && moist < 0.52) return 'savanna';
    if(h > 42) return 'mountain';
    if(moist > 0.68 && h <= SEA + 2) return 'swamp';
    if(moist > 0.62 && temp < 0.45) return 'birch';
    if(moist > 0.55) return 'forest';
    if(moist > 0.50 && temp > 0.52) return 'flower';
    return 'plains';
  }
  surfaceBlockFor(biome, h){
    if(biome === 'desert') return B.SAND;
    if(biome === 'snow') return B.SNOWGRASS;
    if(biome === 'mountain' && h > 48) return B.STONE;
    if(biome === 'swamp') return B.GRASS; // 늪은 물가에도 잔디
    if(h <= SEA + 1) return B.SAND; // 해변/물밑
    return B.GRASS;
  }
  treeAt(wx, wz){
    const b = this.biomeAt(wx, wz);
    const dens = { forest:0.035, birch:0.035, plains:0.004, flower:0.007, snow:0.012, mountain:0.007, swamp:0.022, savanna:0.006 }[b] || 0;
    if(!dens) return null;
    const h = this.terrainH(wx, wz);
    const minH = b === 'swamp' ? SEA : SEA + 1;
    if(h <= minH || (b === 'mountain' && h > 46)) return null;
    if(rand2(wx, wz, this.seed ^ 0x5151) >= dens) return null;
    const type = b === 'birch' ? 'birch' : b === 'savanna' ? 'acacia' : 'oak';
    return { h, th: 4 + Math.floor(rand2(wx, wz, this.seed ^ 0x5252) * 3), type };
  }

  // ---------- 청크 생성 ----------
  ensureChunk(cx, cz){
    const key = ck(cx, cz);
    let c = this.chunks.get(key);
    if(!c){ c = this.genChunk(cx, cz); this.chunks.set(key, c); }
    return c;
  }
  genChunk(cx, cz){
    const c = new Chunk(cx, cz);
    const d = c.data;
    const seed = this.seed;
    const put = (lx, y, lz, id) => { d[lx + lz*CHUNK + y*CHUNK*CHUNK] = id; };
    const get = (lx, y, lz) => d[lx + lz*CHUNK + y*CHUNK*CHUNK];

    for(let lx = 0; lx < CHUNK; lx++){
      for(let lz = 0; lz < CHUNK; lz++){
        const wx = cx*CHUNK + lx, wz = cz*CHUNK + lz;
        const h = this.terrainH(wx, wz);
        const biome = this.biomeAt(wx, wz);
        const surf = this.surfaceBlockFor(biome, h);
        const filler = (biome === 'desert' || surf === B.SAND) ? B.SAND : B.DIRT;
        for(let y = 0; y <= h; y++){
          let id;
          if(y === 0) id = B.BEDROCK;
          else if(y === 1 && rand3(wx, y, wz, seed ^ 77) < 0.5) id = B.BEDROCK;
          else if(y < h - 3) id = B.STONE;
          else if(y < h) id = filler;
          else id = surf;
          // 광물
          if(id === B.STONE){
            const r = rand3(wx, y, wz, seed ^ 0xabc1);
            if(r < 0.013 && y < 52) id = B.COAL_ORE;
            else if(r < 0.021 && y < 36) id = B.IRON_ORE;
            else if(r < 0.0245 && y < 22) id = B.GOLD_ORE;
            else if(r < 0.028 && y < 18) id = B.REDSTONE_ORE;
            else if(r < 0.0305 && y < 14) id = B.DIAMOND_ORE;
          }
          // 동굴
          if(id !== B.BEDROCK && y >= 6 && y <= h - 3 && h >= SEA){
            const c1 = noise3(wx * 0.075, y * 0.105, wz * 0.075, seed ^ 0xCAFE);
            if(Math.abs(c1 - 0.5) < 0.042){
              const c2 = noise3(wx * 0.05 + 77, y * 0.07, wz * 0.05 + 77, seed ^ 0xBEEF);
              if(Math.abs(c2 - 0.5) < 0.075) id = B.AIR;
            }
          }
          put(lx, y, lz, id);
        }
        // 물
        for(let y = h + 1; y <= SEA; y++) put(lx, y, lz, B.WATER);
      }
    }

    // 나무 (이웃 청크에 걸친 나무 포함)
    for(let lx = -2; lx < CHUNK + 2; lx++){
      for(let lz = -2; lz < CHUNK + 2; lz++){
        const wx = cx*CHUNK + lx, wz = cz*CHUNK + lz;
        const tr = this.treeAt(wx, wz);
        if(!tr) continue;
        const topY = tr.h + tr.th;
        const logId = tr.type === 'birch' ? B.BIRCH_LOG : tr.type === 'acacia' ? B.ACACIA_LOG : B.LOG;
        const leafId = tr.type === 'birch' ? B.BIRCH_LEAVES : B.LEAVES;
        // 잎 (아카시아는 납작한 우산형)
        const ly0 = tr.type === 'acacia' ? topY : topY - 2;
        const ly1 = tr.type === 'acacia' ? topY + 1 : topY + 1;
        for(let ly = ly0; ly <= ly1; ly++){
          if(ly < 0 || ly >= WORLD_H) continue;
          const r = tr.type === 'acacia' ? (ly === topY ? 3 : 1) : (ly <= topY - 1 ? 2 : 1);
          for(let dx = -r; dx <= r; dx++){
            for(let dz = -r; dz <= r; dz++){
              if(Math.abs(dx) === r && Math.abs(dz) === r && rand3(wx+dx, ly, wz+dz, seed ^ 33) < 0.6) continue;
              const ax = lx + dx, az = lz + dz;
              if(ax < 0 || ax >= CHUNK || az < 0 || az >= CHUNK) continue;
              if(get(ax, ly, az) === B.AIR) put(ax, ly, az, leafId);
            }
          }
        }
        // 기둥
        if(lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK){
          for(let y = tr.h + 1; y <= topY; y++) put(lx, y, lz, logId);
        }
      }
    }

    // 장식 (청크 내부만)
    for(let lx = 0; lx < CHUNK; lx++){
      for(let lz = 0; lz < CHUNK; lz++){
        const wx = cx*CHUNK + lx, wz = cz*CHUNK + lz;
        const biome = this.biomeAt(wx, wz);
        const h = this.terrainH(wx, wz);
        if(h <= SEA || h + 1 >= WORLD_H) continue;
        const ground = get(lx, h, lz);
        if(get(lx, h + 1, lz) !== B.AIR) continue;
        const r = rand2(wx, wz, seed ^ 0xDEC0);
        if(biome === 'desert' && ground === B.SAND){
          if(r < 0.004){
            const ch = 1 + Math.floor(rand2(wx, wz, seed ^ 0xDEC1) * 3);
            for(let i = 1; i <= ch && h + i < WORLD_H; i++) put(lx, h + i, lz, B.CACTUS);
          }
        } else if(ground === B.GRASS){
          // 늪: 얕은 물웅덩이
          if(biome === 'swamp' && h <= SEA + 1 && r < 0.22){
            put(lx, h, lz, B.WATER);
            continue;
          }
          const flowerP = { flower:0.13, plains:0.012, forest:0.012, birch:0.012, swamp:0.008, savanna:0.004 }[biome] || 0.01;
          const grassP = { plains:0.06, savanna:0.14, swamp:0.10, flower:0.05, forest:0.035, birch:0.035 }[biome] || 0.03;
          if(r < 0.0015) put(lx, h + 1, lz, B.PUMPKIN);
          else if(r < 0.0015 + flowerP) put(lx, h + 1, lz, rand2(wx, wz, seed ^ 0xDEC2) < 0.5 ? B.FLOWER_R : B.FLOWER_Y);
          else if(r < 0.0015 + flowerP + grassP) put(lx, h + 1, lz, B.TALLGRASS);
        }
      }
    }

    // 구조물 (마을/체육관/해저신전)
    this._stampStructures(c, cx, cz);

    // 저장된 수정사항 적용
    const ed = this.edits[ck(cx, cz)];
    if(ed){
      for(const k in ed){
        const idx = +k;
        d[idx] = ed[k];
        if(ed[k] === B.TORCH){
          const y = Math.floor(idx / (CHUNK*CHUNK));
          const rem = idx % (CHUNK*CHUNK);
          c.torches.add((cx*CHUNK + rem % CHUNK) + ',' + y + ',' + (cz*CHUNK + Math.floor(rem / CHUNK)));
        }
      }
    }

    // 컬럼 높이 계산
    for(let lx = 0; lx < CHUNK; lx++){
      for(let lz = 0; lz < CHUNK; lz++){
        c.heights[lz*CHUNK + lx] = this._calcColTop(c, lx, lz);
      }
    }
    return c;
  }
  _calcColTop(c, lx, lz){
    for(let y = WORLD_H - 1; y >= 0; y--){
      const id = c.data[lx + lz*CHUNK + y*CHUNK*CHUNK];
      if(id !== B.AIR && BLOCKS[id].rt !== RT.CROSS) return y;
    }
    return 0;
  }

  // ---------- 블록 접근 ----------
  getBlock(wx, wy, wz){
    if(wy < 0) return B.BEDROCK;
    if(wy >= WORLD_H) return B.AIR;
    wx = Math.floor(wx); wy = Math.floor(wy); wz = Math.floor(wz);
    const cx = Math.floor(wx / CHUNK), cz = Math.floor(wz / CHUNK);
    const c = this.ensureChunk(cx, cz);
    return c.data[(wx - cx*CHUNK) + (wz - cz*CHUNK)*CHUNK + wy*CHUNK*CHUNK];
  }
  isSolid(wx, wy, wz){
    const id = this.getBlock(wx, wy, wz);
    return id !== B.AIR && BLOCKS[id].solid;
  }
  colTop(wx, wz){
    wx = Math.floor(wx); wz = Math.floor(wz);
    const cx = Math.floor(wx / CHUNK), cz = Math.floor(wz / CHUNK);
    const c = this.chunks.get(ck(cx, cz));
    if(!c) return this.terrainH(wx, wz);
    return c.heights[(wz - cz*CHUNK)*CHUNK + (wx - cx*CHUNK)];
  }
  static isFurnaceId(id){ return id === B.FURNACE || id === B.FURNACE_LIT; }

  setBlock(wx, wy, wz, id, fromNet){
    if(!Number.isFinite(wx) || !Number.isFinite(wy) || !Number.isFinite(wz)) return;
    if(id !== B.AIR && !BLOCKS[id]) return; // 알 수 없는 블록 id 방어
    if(wy < 0 || wy >= WORLD_H) return;
    wx = Math.floor(wx); wy = Math.floor(wy); wz = Math.floor(wz);
    const cx = Math.floor(wx / CHUNK), cz = Math.floor(wz / CHUNK);
    const c = this.ensureChunk(cx, cz);
    const lx = wx - cx*CHUNK, lz = wz - cz*CHUNK;
    const idx = lx + lz*CHUNK + wy*CHUNK*CHUNK;
    const old = c.data[idx];
    if(old === id) return;
    c.data[idx] = id;
    (this.edits[ck(cx, cz)] || (this.edits[ck(cx, cz)] = {}))[idx] = id;
    c.heights[lz*CHUNK + lx] = this._calcColTop(c, lx, lz);

    // 물 흐름: 공기가 생기거나 물이 놓이면 주변 갱신 예약
    if(id === B.AIR || id === B.WATER){
      this.fluidQ.add(wx + ',' + wy + ',' + wz);
      this.fluidQ.add((wx+1) + ',' + wy + ',' + wz);
      this.fluidQ.add((wx-1) + ',' + wy + ',' + wz);
      this.fluidQ.add(wx + ',' + wy + ',' + (wz+1));
      this.fluidQ.add(wx + ',' + wy + ',' + (wz-1));
      this.fluidQ.add(wx + ',' + (wy-1) + ',' + wz);
    }

    const pk = wx + ',' + wy + ',' + wz;
    if(old === B.TORCH) c.torches.delete(pk);
    if(id === B.TORCH) c.torches.add(pk);
    const wasFurn = World.isFurnaceId(old), isFurn = World.isFurnaceId(id);
    // 컨테이너 내용물 드롭은 권위 측(싱글/호스트)에서만 — 게스트도 드롭하면 인원수만큼 복제됨
    const authoritative = typeof Net === 'undefined' || Net.mode !== 'guest';
    if(wasFurn && !isFurn){
      // 화로 파괴 시 내용물 드롭
      const f = this.furnaces.get(pk);
      if(f && authoritative && typeof ItemDrops !== 'undefined' && ItemDrops.group){
        [f.in, f.fuel, f.out].forEach(s => {
          if(s && s.n > 0) ItemDrops.spawn(wx + 0.5, wy + 0.5, wz + 0.5, s.id, s.n, s.dur);
        });
      }
      this.furnaces.delete(pk);
    }
    if(isFurn && !this.furnaces.has(pk)) this.furnaces.set(pk, { in:null, fuel:null, out:null, burn:0, burnMax:1, prog:0 });
    // 상자
    if(old === B.CHEST && id !== B.CHEST){
      const ch = this.chests.get(pk);
      if(ch && authoritative && typeof ItemDrops !== 'undefined' && ItemDrops.group){
        ch.slots.forEach(s => { if(s && s.n > 0) ItemDrops.spawn(wx + 0.5, wy + 0.5, wz + 0.5, s.id, s.n, s.dur); });
      }
      this.chests.delete(pk);
    }
    if(id === B.CHEST && !this.chests.has(pk)) this.chests.set(pk, { slots: new Array(27).fill(null) });
    // 멀티플레이 동기화
    if(!fromNet && typeof Net !== 'undefined' && Net.mode !== 'off') Net.blockChanged(wx, wy, wz, id);

    // 리메시 대상
    const lightChanged = old === B.TORCH || id === B.TORCH || BLOCKS[old].light > 0 || BLOCKS[id].light > 0;
    const r = lightChanged ? 1 : 0;
    for(let dx = -1; dx <= 1; dx++){
      for(let dz = -1; dz <= 1; dz++){
        if(!lightChanged){
          // 경계에 닿은 경우만 이웃 포함
          if(dx === -1 && lx > 0) continue;
          if(dx === 1 && lx < CHUNK-1) continue;
          if(dz === -1 && lz > 0) continue;
          if(dz === 1 && lz < CHUNK-1) continue;
        }
        this.dirty.add(ck(cx + dx, cz + dz));
      }
    }
  }

  // ---------- 메싱 ----------
  _gatherTorches(cx, cz){
    const arr = [];
    for(let dx = -1; dx <= 1; dx++){
      for(let dz = -1; dz <= 1; dz++){
        const c = this.chunks.get(ck(cx + dx, cz + dz));
        if(!c) continue;
        c.torches.forEach(s => {
          const [x, y, z] = s.split(',').map(Number);
          arr.push([x + 0.5, y + 0.5, z + 0.5]);
        });
        // 가동 중 화로도 빛
        c.data && null;
      }
    }
    return arr;
  }
  _faceLight(wx, wy, wz, torches){
    // (wx,wy,wz) = 면이 노출된 셀
    const top = this.colTop(wx, wz);
    let l = wy >= top ? 1 : Math.max(0.18, 1 - 0.13 * (top - wy));
    for(let i = 0; i < torches.length; i++){
      const t = torches[i];
      const d = dist3(wx + 0.5, wy + 0.5, wz + 0.5, t[0], t[1], t[2]);
      if(d < 8) l = Math.max(l, 0.25 + (1 - d / 8) * 1.05);
    }
    return Math.min(l, 1.3);
  }
  _shouldDraw(id, nb){
    if(nb === B.AIR) return true;
    const nd = BLOCKS[nb];
    if(nd.rt === RT.CROSS) return true;
    if(id === B.WATER) return nd.rt === RT.GLASS; // 물은 공기/식물/유리에만 면 생성
    if(nd.rt === RT.WATER) return true;           // 물에 잠긴 블록 면은 그림
    if(nd.rt === RT.GLASS) return id !== nb;
    return false; // 불투명 이웃
  }

  buildChunkMesh(chunk){
    const { cx, cz } = chunk;
    // 이웃 데이터 보장 (AO 코너 샘플이 대각 청크도 읽으므로 8방위 모두)
    this.ensureChunk(cx+1, cz); this.ensureChunk(cx-1, cz);
    this.ensureChunk(cx, cz+1); this.ensureChunk(cx, cz-1);
    this.ensureChunk(cx+1, cz+1); this.ensureChunk(cx+1, cz-1);
    this.ensureChunk(cx-1, cz+1); this.ensureChunk(cx-1, cz-1);
    const torches = this._gatherTorches(cx, cz);
    const layers = {
      solid: { pos:[], nor:[], uv:[], col:[], idx:[] },
      cutout:{ pos:[], nor:[], uv:[], col:[], idx:[] },
      water: { pos:[], nor:[], uv:[], col:[], idx:[] },
    };
    const ox = cx * CHUNK, oz = cz * CHUNK;
    const data = chunk.data;

    const blockAt = (lx, y, lz) => {
      if(y < 0) return B.BEDROCK;
      if(y >= WORLD_H) return B.AIR;
      if(lx >= 0 && lx < CHUNK && lz >= 0 && lz < CHUNK) return data[lx + lz*CHUNK + y*CHUNK*CHUNK];
      return this.getBlock(ox + lx, y, oz + lz);
    };

    for(let y = 0; y < WORLD_H; y++){
      for(let lz = 0; lz < CHUNK; lz++){
        for(let lx = 0; lx < CHUNK; lx++){
          const id = data[lx + lz*CHUNK + y*CHUNK*CHUNK];
          if(id === B.AIR) continue;
          const def = BLOCKS[id];

          if(def.rt === RT.CROSS){
            const L = layers.cutout;
            const light = Math.min(this._faceLight(ox+lx, y, oz+lz, torches) + (def.light ? 0.35 : 0), 1.35);
            const [u0, v0, u1, v1] = tileUV(def.tiles.side);
            const quads = [
              [[0.1,0,0.1],[0.9,0,0.9],[0.9,1,0.9],[0.1,1,0.1]],
              [[0.9,0,0.1],[0.1,0,0.9],[0.1,1,0.9],[0.9,1,0.1]],
            ];
            quads.forEach(q => {
              const base = L.pos.length / 3;
              q.forEach((p, i) => {
                L.pos.push(lx + p[0], y + p[1], lz + p[2]);
                L.nor.push(0, 1, 0);
                L.uv.push(FACE_UV[i][0] ? u1 : u0, FACE_UV[i][1] ? v1 : v0);
                L.col.push(light, light, light);
              });
              L.idx.push(base, base+1, base+2, base, base+2, base+3);
            });
            continue;
          }

          const L = def.rt === RT.WATER ? layers.water : def.rt === RT.GLASS ? layers.cutout : layers.solid;
          const isWater = def.rt === RT.WATER;
          const isSolidLayer = L === layers.solid;
          for(let f = 0; f < 6; f++){
            const fd = FACE_DEFS[f];
            const nb = blockAt(lx + fd.n[0], y + fd.n[1], lz + fd.n[2]);
            if(!this._shouldDraw(id, nb)) continue;
            const tile = fd.n[1] === 1 ? def.tiles.top : fd.n[1] === -1 ? def.tiles.bottom : def.tiles.side;
            const [u0, v0, u1, v1] = tileUV(tile);
            let light = this._faceLight(ox + lx + fd.n[0], y + fd.n[1], oz + lz + fd.n[2], torches);
            if(def.light) light = Math.max(light, 1.0 + def.light * 0.3);
            const sh = fd.shade * light;
            // 물 표면 셀은 모든 면을 살짝 낮게 (옆면이 수면 위로 튀어나오지 않게)
            const yScale = (isWater && blockAt(lx, y+1, lz) !== B.WATER) ? 0.875 : 1;
            // AO용: 면이 향한 셀과 접선축
            const ni = fd.n[0] !== 0 ? 0 : fd.n[1] !== 0 ? 1 : 2;
            const ta = ni === 0 ? 1 : 0, tb = ni === 2 ? 1 : 2;
            const ax = lx + fd.n[0], ay = y + fd.n[1], az = lz + fd.n[2];
            const base = L.pos.length / 3;
            fd.c.forEach((p, i) => {
              L.pos.push(lx + p[0], y + p[1] * yScale, lz + p[2]);
              L.nor.push(fd.n[0], fd.n[1], fd.n[2]);
              if(isWater){
                // 물: 월드좌표 기반 반복 UV (텍스처 흐름 애니메이션용)
                let wu, wv;
                if(ni === 1){ wu = (ox + lx + p[0]) * 0.25; wv = (oz + lz + p[2]) * 0.25; }
                else if(ni === 0){ wu = (oz + lz + p[2]) * 0.25; wv = (y + p[1] * yScale) * 0.25; }
                else { wu = (ox + lx + p[0]) * 0.25; wv = (y + p[1] * yScale) * 0.25; }
                L.uv.push(wu, wv);
              } else {
                L.uv.push(FACE_UV[i][0] ? u1 : u0, FACE_UV[i][1] ? v1 : v0);
              }
              // 앰비언트 오클루전 (모서리 이웃 3칸)
              let ao = 1;
              if(isSolidLayer){
                const co = [0, 0, 0];
                co[ta] = p[ta] === 1 ? 1 : -1;
                const cb = [0, 0, 0];
                cb[tb] = p[tb] === 1 ? 1 : -1;
                const sAt = (dx, dy, dz) => {
                  const b = blockAt(ax + dx, ay + dy, az + dz);
                  const bd = BLOCKS[b];
                  return bd.solid && bd.rt === RT.SOLID ? 1 : 0;
                };
                const s1 = sAt(co[0], co[1], co[2]);
                const s2 = sAt(cb[0], cb[1], cb[2]);
                const cr = sAt(co[0] + cb[0], co[1] + cb[1], co[2] + cb[2]);
                ao = (s1 && s2) ? 0.5 : 1 - 0.17 * (s1 + s2 + cr);
              }
              const c2 = sh * ao;
              L.col.push(c2, c2, c2);
            });
            L.idx.push(base, base+1, base+2, base, base+2, base+3);
          }
        }
      }
    }

    // 기존 메시 제거
    this.disposeChunkMeshes(chunk);
    chunk.meshes = {};
    const mats = { solid: this.matSolid, cutout: this.matCutout, water: this.matWater };
    for(const name in layers){
      const L = layers[name];
      if(!L.idx.length){ chunk.meshes[name] = null; continue; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(L.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(L.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(L.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(L.col, 3));
      g.setIndex(L.idx);
      const m = new THREE.Mesh(g, mats[name]);
      m.position.set(ox, 0, oz);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      if(name === 'water') m.renderOrder = 2;
      this.group.add(m);
      chunk.meshes[name] = m;
    }
  }
  disposeChunkMeshes(chunk){
    if(!chunk.meshes) return;
    for(const name in chunk.meshes){
      const m = chunk.meshes[name];
      if(m){ this.group.remove(m); m.geometry.dispose(); }
    }
    chunk.meshes = null;
  }

  // ---------- 로딩 루프 ----------
  update(px, pz){
    const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK);
    const R = this.renderDist;
    let meshBudget = 2;
    for(const [dx, dz, dist] of this._offsets){
      if(dist > R) break;
      const cx = ccx + dx, cz = ccz + dz;
      const c = this.ensureChunk(cx, cz);
      if(!c.meshes && meshBudget > 0){
        this.buildChunkMesh(c);
        meshBudget--;
      }
      if(meshBudget <= 0) break;
    }
    // 수정된 청크 리메시
    if(this.dirty.size){
      for(const key of this.dirty){
        const c = this.chunks.get(key);
        if(c && c.meshes) this.buildChunkMesh(c);
      }
      this.dirty.clear();
    }
    // 먼 청크 메시 해제 (멀티 호스트: 게스트 주변 청크는 유지 — 작물 성장 등)
    const keepCenters = [[ccx, ccz]];
    if(typeof Net !== 'undefined' && Net.mode === 'host'){
      for(const [, p] of Net.players) keepCenters.push([Math.floor(p.x / CHUNK), Math.floor(p.z / CHUNK)]);
    }
    for(const [key, c] of this.chunks){
      const d = Math.max(Math.abs(c.cx - ccx), Math.abs(c.cz - ccz));
      if(d > R + 2 && c.meshes) this.disposeChunkMeshes(c);
      let minD = Infinity;
      for(const [kx, kz] of keepCenters) minD = Math.min(minD, Math.max(Math.abs(c.cx - kx), Math.abs(c.cz - kz)));
      if(minD > R + 8) this.chunks.delete(key);
    }
  }
  pregen(px, pz, onProgress){
    // 시작 시 동기 생성(진행률 콜백)
    const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK);
    const R = this.renderDist;
    const todo = this._offsets.filter(o => o[2] <= R);
    return { todo, ccx, ccz, R,
      step: (i) => {
        const [dx, dz] = todo[i];
        const c = this.ensureChunk(ccx + dx, ccz + dz);
        if(!c.meshes) this.buildChunkMesh(c);
      }
    };
  }

  // ---------- 레이캐스트 (복셀 DDA) ----------
  raycast(ox, oy, oz, dx, dy, dz, maxDist){
    let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
    const stepX = dx > 0 ? 1 : -1, stepY = dy > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tDX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const tDZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tX = dx !== 0 ? ((dx > 0 ? x + 1 - ox : ox - x) * tDX) : Infinity;
    let tY = dy !== 0 ? ((dy > 0 ? y + 1 - oy : oy - y) * tDY) : Infinity;
    let tZ = dz !== 0 ? ((dz > 0 ? z + 1 - oz : oz - z) * tDZ) : Infinity;
    let nx = 0, ny = 0, nz = 0, t = 0;
    for(let i = 0; i < 256; i++){
      const id = this.getBlock(x, y, z);
      if(id !== B.AIR && id !== B.WATER && (BLOCKS[id].solid || BLOCKS[id].rt === RT.CROSS)){
        return { bx:x, by:y, bz:z, nx, ny, nz, dist:t, id };
      }
      if(tX < tY && tX < tZ){ x += stepX; t = tX; tX += tDX; nx = -stepX; ny = 0; nz = 0; }
      else if(tY < tZ){ y += stepY; t = tY; tY += tDY; nx = 0; ny = -stepY; nz = 0; }
      else { z += stepZ; t = tZ; tZ += tDZ; nx = 0; ny = 0; nz = -stepZ; }
      if(t > maxDist) return null;
    }
    return null;
  }

  // ---------- 화로 ----------
  tickFurnaces(dt){
    for(const [key, f] of this.furnaces){
      const [x, y, z] = key.split(',').map(Number);
      // 입력 아이템이 바뀌면 진행도 리셋
      const inId = f.in ? f.in.id : null;
      if(f._lastIn !== inId){ f.prog = 0; f._lastIn = inId; }
      // 언로드된 청크는 블록 외형(켜짐/꺼짐)만 갱신 생략 — 재생성 방지
      const loaded = this.chunks.has(ck(Math.floor(x / CHUNK), Math.floor(z / CHUNK)));
      const result = f.in ? SMELT[f.in.id] : null;
      const canSmelt = !!result && (!f.out || (f.out.id === result[0] && f.out.n + result[1] <= maxStack(result[0])));
      if(f.burn <= 0 && canSmelt && f.fuel && FUEL[f.fuel.id]){
        f.burnMax = f.burn = FUEL[f.fuel.id] * SMELT_TIME;
        f.fuel.n--; if(f.fuel.n <= 0) f.fuel = null;
        if(loaded && this.getBlock(x, y, z) === B.FURNACE) this.setBlock(x, y, z, B.FURNACE_LIT);
      }
      if(f.burn > 0){
        f.burn -= dt;
        if(canSmelt){
          f.prog += dt;
          if(f.prog >= SMELT_TIME){
            f.prog = 0;
            if(f.out) f.out.n += result[1];
            else f.out = { id: result[0], n: result[1] };
            f.in.n--; if(f.in.n <= 0) f.in = null;
          }
        } else f.prog = 0;
        if(f.burn <= 0 && loaded && this.getBlock(x, y, z) === B.FURNACE_LIT) this.setBlock(x, y, z, B.FURNACE);
      } else if(f.prog > 0) f.prog = Math.max(0, f.prog - dt * 2);
    }
  }

  // ---------- 저장 ----------
  serialize(){
    const furn = {}, chst = {};
    for(const [k, f] of this.furnaces) furn[k] = f;
    for(const [k, c] of this.chests) chst[k] = c;
    return { seed: this.seed, edits: this.edits, furnaces: furn, chests: chst, spawn: this.spawnPoint, gyms: [...this.gymsBeaten] };
  }
  deserialize(d){
    this.edits = d.edits || {};
    this.spawnPoint = d.spawn || null;
    this.furnaces.clear();
    if(d.furnaces) for(const k in d.furnaces) this.furnaces.set(k, d.furnaces[k]);
    this.chests.clear();
    if(d.chests) for(const k in d.chests) this.chests.set(k, d.chests[k]);
    this.gymsBeaten = new Set(d.gyms || []);
  }

  // ---------- 물 흐름 (간이 무한수원 규칙) ----------
  // 공기 칸이 (위가 물) 또는 (수평 이웃 2칸 이상이 물)이면 물이 됨
  tickFluids(dt){
    this._fluidAcc += dt;
    if(this._fluidAcc < 0.15) return;
    this._fluidAcc = 0;
    if(!this.fluidQ.size) return;
    const batch = [...this.fluidQ].slice(0, 30);
    batch.forEach(k => this.fluidQ.delete(k));
    for(const k of batch){
      const [x, y, z] = k.split(',').map(Number);
      if(y < 1 || y >= WORLD_H - 1) continue;
      if(this.getBlock(x, y, z) !== B.AIR) continue;
      const above = this.getBlock(x, y + 1, z) === B.WATER;
      let horiz = 0;
      if(this.getBlock(x + 1, y, z) === B.WATER) horiz++;
      if(this.getBlock(x - 1, y, z) === B.WATER) horiz++;
      if(this.getBlock(x, y, z + 1) === B.WATER) horiz++;
      if(this.getBlock(x, y, z - 1) === B.WATER) horiz++;
      if(above || horiz >= 2){
        this.setBlock(x, y, z, B.WATER); // setBlock이 이웃을 다시 큐에 넣음
      }
    }
  }

  // ---------- 구조물 (마을 / 체육관 / 해저신전) — 모두 시드 결정론 ----------
  villageAt(rx, rz){
    if(rand2(rx, rz, this.seed ^ 0x7711) >= 0.22) return null;
    const cx = rx * 128 + 24 + Math.floor(rand2(rx, rz, this.seed ^ 0x7712) * 80);
    const cz = rz * 128 + 24 + Math.floor(rand2(rx, rz, this.seed ^ 0x7713) * 80);
    const b = this.biomeAt(cx, cz);
    if(b !== 'plains' && b !== 'savanna' && b !== 'flower') return null;
    const h = this.terrainH(cx, cz);
    if(h <= SEA + 1 || h > 40) return null;
    return { x: cx, z: cz, y: h, key: 'v' + rx + ',' + rz };
  }
  villageHouses(v){
    const houses = [];
    for(let i = 0; i < 5; i++){
      const ang = i / 5 * Math.PI * 2 + rand2(v.x, v.z + i, this.seed ^ 0x7714) * 0.8;
      const d = 9 + rand2(v.x + i, v.z, this.seed ^ 0x7715) * 9;
      const hx = Math.round(v.x + Math.sin(ang) * d), hz = Math.round(v.z + Math.cos(ang) * d);
      houses.push({ x: hx, z: hz, y: this.terrainH(hx, hz), chest: i === 0, farm: i === 1 });
    }
    return houses;
  }
  gymAt(rx, rz){
    if(rand2(rx, rz, this.seed ^ 0x8811) >= 0.3) return null;
    const cx = rx * 160 + 30 + Math.floor(rand2(rx, rz, this.seed ^ 0x8812) * 100);
    const cz = rz * 160 + 30 + Math.floor(rand2(rx, rz, this.seed ^ 0x8813) * 100);
    const b = this.biomeAt(cx, cz);
    const h = this.terrainH(cx, cz);
    if(h <= SEA + 1) return null;
    const type = b === 'mountain' ? 'rock'
      : (b === 'desert' || b === 'savanna') ? 'fire'
      : (b === 'forest' || b === 'birch' || b === 'swamp') ? 'water'
      : (b === 'plains' || b === 'flower') ? 'electric' : null;
    if(!type) return null;
    return { x: cx, z: cz, y: h, type, key: 'g' + rx + ',' + rz };
  }
  monumentAt(rx, rz){
    if(rand2(rx, rz, this.seed ^ 0x9911) >= 0.35) return null;
    const cx = rx * 192 + 40 + Math.floor(rand2(rx, rz, this.seed ^ 0x9912) * 110);
    const cz = rz * 192 + 40 + Math.floor(rand2(rx, rz, this.seed ^ 0x9913) * 110);
    const h = this.terrainH(cx, cz);
    if(h > SEA - 9) return null; // 깊은 바다 바닥에만
    return { x: cx, z: cz, y: h + 1, key: 'm' + rx + ',' + rz };
  }
  _regionsNear(wx, wz, size, fn){
    const out = [];
    const r0x = Math.floor((wx - size) / size), r1x = Math.floor((wx + size) / size);
    const r0z = Math.floor((wz - size) / size), r1z = Math.floor((wz + size) / size);
    for(let rx = r0x; rx <= r1x; rx++){
      for(let rz = r0z; rz <= r1z; rz++){
        const st = fn(rx, rz);
        if(st) out.push(st);
      }
    }
    return out;
  }
  villagesNear(wx, wz){ return this._regionsNear(wx, wz, 128, (a, b) => this.villageAt(a, b)); }
  gymsNear(wx, wz){ return this._regionsNear(wx, wz, 160, (a, b) => this.gymAt(a, b)); }
  monumentsNear(wx, wz){ return this._regionsNear(wx, wz, 192, (a, b) => this.monumentAt(a, b)); }

  _stampStructures(c, ccx, ccz){
    const x0 = ccx * CHUNK, z0 = ccz * CHUNK;
    const d = c.data;
    // 이 청크 안에 들어오는 블록만 기록
    const wput = (wx, wy, wz, id) => {
      const lx = wx - x0, lz = wz - z0;
      if(lx < 0 || lx >= CHUNK || lz < 0 || lz >= CHUNK || wy < 1 || wy >= WORLD_H) return false;
      d[lx + lz*CHUNK + wy*CHUNK*CHUNK] = id;
      if(id === B.TORCH) c.torches.add(wx + ',' + wy + ',' + wz);
      return true;
    };
    const loot = [];
    for(const v of this.villagesNear(x0 + 8, z0 + 8)){
      for(const hs of this.villageHouses(v)) this._stampHouse(wput, hs, loot);
    }
    for(const g of this.gymsNear(x0 + 8, z0 + 8)) this._stampGym(wput, g);
    for(const m of this.monumentsNear(x0 + 8, z0 + 8)) this._stampMonument(wput, m, loot);
    // 전리품 상자: 최초 생성 시에만 채움 (저장된 상자는 유지)
    for(const [key, slots] of loot){
      if(!this.chests.has(key)) this.chests.set(key, { slots });
    }
  }
  _lootSlots(items){
    const slots = new Array(27).fill(null);
    items.forEach((it, i) => { if(it) slots[2 + i * 3] = it; });
    return slots;
  }
  _stampHouse(wput, hs, loot){
    const y0 = hs.y;
    const X0 = hs.x - 2, X1 = hs.x + 2, Z0 = hs.z - 3, Z1 = hs.z + 2;
    for(let wx = X0; wx <= X1; wx++){
      for(let wz = Z0; wz <= Z1; wz++){
        for(let dy = 1; dy <= 3; dy++) wput(wx, y0 - dy, wz, B.DIRT); // 기초
        wput(wx, y0, wz, B.COBBLE); // 바닥
        const corner = (wx === X0 || wx === X1) && (wz === Z0 || wz === Z1);
        const edge = wx === X0 || wx === X1 || wz === Z0 || wz === Z1;
        for(let wy = y0 + 1; wy <= y0 + 3; wy++) wput(wx, wy, wz, edge ? (corner ? B.LOG : B.PLANKS) : B.AIR);
        wput(wx, y0 + 4, wz, B.PLANKS); // 지붕
      }
    }
    // 문(남쪽) / 창문 / 횃불
    wput(hs.x, y0 + 1, Z1, B.AIR); wput(hs.x, y0 + 2, Z1, B.AIR);
    wput(X0, y0 + 2, hs.z, B.GLASS); wput(X1, y0 + 2, hs.z, B.GLASS);
    wput(hs.x, y0 + 3, hs.z - 1, B.TORCH);
    if(hs.chest){
      if(wput(hs.x, y0 + 1, hs.z - 2, B.CHEST)){
        const r = (n) => 1 + Math.floor(rand2(hs.x, hs.z + n, this.seed ^ 0xA11) * 3);
        loot.push([(hs.x) + ',' + (y0 + 1) + ',' + (hs.z - 2), this._lootSlots([
          { id: I.BREAD, n: r(1) + 1 }, { id: I.EMERALD, n: r(2) },
          { id: I.SEEDS, n: r(3) + 2 }, { id: I.IRON_INGOT, n: r(4) }, { id: I.POKEBALL, n: 2 }
        ])]);
      }
    }
    if(hs.farm){
      const fy = this.terrainH(hs.x + 5, hs.z);
      for(let dx = 0; dx < 3; dx++){
        for(let dz = 0; dz < 3; dz++){
          const fx = hs.x + 4 + dx, fz = hs.z - 1 + dz;
          wput(fx, fy, fz, (dx === 1 && dz === 1) ? B.WATER : B.FARMLAND);
          if(!(dx === 1 && dz === 1)) wput(fx, fy + 1, fz, B.CROP_RIPE);
        }
      }
    }
  }
  _stampGym(wput, g){
    const y0 = g.y;
    const accent = { rock: B.COBBLE, water: B.GLASS, electric: B.GOLD_ORE, fire: B.REDSTONE_ORE }[g.type];
    for(let wx = g.x - 4; wx <= g.x + 4; wx++){
      for(let wz = g.z - 4; wz <= g.z + 4; wz++){
        for(let dy = 1; dy <= 3; dy++) wput(wx, y0 - dy, wz, B.STONE);
        wput(wx, y0, wz, B.STONEBRICK); // 바닥
        const corner = (Math.abs(wx - g.x) === 4) && (Math.abs(wz - g.z) === 4);
        const edge = Math.abs(wx - g.x) === 4 || Math.abs(wz - g.z) === 4;
        for(let wy = y0 + 1; wy <= y0 + 4; wy++){
          wput(wx, wy, wz, corner ? B.STONEBRICK : (edge && wy === y0 + 4 ? B.STONEBRICK : B.AIR));
        }
        wput(wx, y0 + 5, wz, edge ? B.STONEBRICK : B.GLASS); // 천장(중앙 유리)
      }
    }
    // 입구(남쪽 넓게) + 포인트 블록 + 횃불
    for(let dx = -1; dx <= 1; dx++){ wput(g.x + dx, y0 + 1, g.z + 4, B.AIR); wput(g.x + dx, y0 + 2, g.z + 4, B.AIR); }
    wput(g.x - 4, y0 + 5, g.z - 4, accent); wput(g.x + 4, y0 + 5, g.z - 4, accent);
    wput(g.x - 4, y0 + 5, g.z + 4, accent); wput(g.x + 4, y0 + 5, g.z + 4, accent);
    wput(g.x - 3, y0 + 2, g.z - 3, B.TORCH); wput(g.x + 3, y0 + 2, g.z - 3, B.TORCH);
  }
  _stampMonument(wput, m, loot){
    const y0 = m.y;
    for(let wx = m.x - 5; wx <= m.x + 5; wx++){
      for(let wz = m.z - 5; wz <= m.z + 5; wz++){
        wput(wx, y0, wz, B.STONEBRICK);
        const edge = Math.abs(wx - m.x) === 5 || Math.abs(wz - m.z) === 5;
        for(let wy = y0 + 1; wy <= y0 + 4; wy++) wput(wx, wy, wz, edge ? B.STONEBRICK : B.AIR);
        const skylight = Math.abs(wx - m.x) <= 1 && Math.abs(wz - m.z) <= 1;
        wput(wx, y0 + 5, wz, skylight ? B.GLASS : B.STONEBRICK);
      }
    }
    // 기둥 + 입구(북쪽 2x2) + 횃불 + 상자 2개
    [[-3,-3],[3,-3],[-3,3],[3,3]].forEach(([dx,dz]) => {
      for(let wy = y0 + 1; wy <= y0 + 4; wy++) wput(m.x + dx, wy, m.z + dz, B.OBSIDIAN);
    });
    wput(m.x, y0 + 1, m.z - 5, B.AIR); wput(m.x + 1, y0 + 1, m.z - 5, B.AIR);
    wput(m.x, y0 + 2, m.z - 5, B.AIR); wput(m.x + 1, y0 + 2, m.z - 5, B.AIR);
    wput(m.x - 2, y0 + 2, m.z, B.TORCH); wput(m.x + 2, y0 + 2, m.z, B.TORCH);
    const mkLoot = (n) => {
      const r = (k) => 1 + Math.floor(rand2(m.x + k, m.z + n, this.seed ^ 0xB22) * 3);
      return this._lootSlots([
        { id: I.DIAMOND, n: r(1) + 1 }, { id: I.GOLDEN_APPLE, n: 1 },
        { id: I.ULTRABALL, n: r(2) }, { id: I.RARECANDY, n: r(3) },
        { id: I.EMERALD, n: r(4) + 2 }, { id: I.ENDERPEARL, n: r(5) }
      ]);
    };
    if(wput(m.x - 4, y0 + 1, m.z + 4, B.CHEST)) loot.push([(m.x - 4) + ',' + (y0 + 1) + ',' + (m.z + 4), mkLoot(1)]);
    if(wput(m.x + 4, y0 + 1, m.z + 4, B.CHEST)) loot.push([(m.x + 4) + ',' + (y0 + 1) + ',' + (m.z + 4), mkLoot(2)]);
  }

  // ---------- 랜덤 틱 (작물 성장) ----------
  // centers: [{x,z}, ...] — 멀티 호스트는 게스트 위치도 포함 (게스트 밭도 자라게)
  randomTicks(dt, centers){
    this._tickAcc += dt;
    if(this._tickAcc < 0.5) return;
    this._tickAcc = 0;
    const R = this.renderDist;
    const ticked = new Set();
    for(const c0 of centers){
      const ccx = Math.floor(c0.x / CHUNK), ccz = Math.floor(c0.z / CHUNK);
      for(let dx = -R; dx <= R; dx++){
        for(let dz = -R; dz <= R; dz++){
          const key = ck(ccx + dx, ccz + dz);
          if(ticked.has(key)) continue;
          ticked.add(key);
          const c = this.chunks.get(key);
          if(!c) continue;
          for(let i = 0; i < 3; i++){
            const lx = (Math.random() * CHUNK) | 0, lz = (Math.random() * CHUNK) | 0, y = (Math.random() * WORLD_H) | 0;
            const id = c.data[lx + lz*CHUNK + y*CHUNK*CHUNK];
            if(id === B.CROP && Math.random() < 0.25){
              this.setBlock(c.cx*CHUNK + lx, y, c.cz*CHUNK + lz, B.CROP_RIPE);
            }
          }
        }
      }
    }
  }

  // 스폰 지점 찾기 (물 위 제외)
  findSpawn(){
    for(let r = 0; r < 64; r++){
      const wx = Math.floor(rand2(r, 7, this.seed) * 40 - 20) + r * 3;
      const wz = Math.floor(rand2(r, 13, this.seed) * 40 - 20);
      const h = this.terrainH(wx, wz);
      if(h > SEA + 1 && !this.treeAt(wx, wz)) return { x: wx + 0.5, y: h + 2, z: wz + 0.5 };
    }
    return { x: 0.5, y: 50, z: 0.5 };
  }
}
