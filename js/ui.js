// ===== ui.js : HUD, 인벤토리/제작/화로 UI, 파티, 도감, 메뉴 =====
'use strict';

function $id(s){ return document.getElementById(s); }

function renderStackEl(el, stack){
  el.style.backgroundImage = stack ? `url("${getIconURL(stack.id)}")` : 'none';
  el.classList.toggle('ench', !!(stack && stack.ench));
  let cnt = el.querySelector('.slot-cnt');
  if(!cnt){ cnt = document.createElement('span'); cnt.className = 'slot-cnt'; el.appendChild(cnt); }
  cnt.textContent = stack && stack.n > 1 ? stack.n : '';
  let dur = el.querySelector('.dur-bar');
  const t = stack ? toolInfo(stack.id) : null;
  if(stack && t && stack.dur !== undefined && stack.dur < t.dur){
    if(!dur){ dur = document.createElement('div'); dur.className = 'dur-bar'; el.appendChild(dur); }
    const pct = stack.dur / t.dur;
    dur.style.width = Math.max(2, pct * 36) + 'px';
    dur.style.background = pct > 0.5 ? '#3f3' : pct > 0.2 ? '#fc3' : '#f33';
  } else if(dur) dur.remove();
}

const UI = {
  cursor: null,
  craftCells: [], craftSize: 2,
  furnaceKey: null,
  open: null,
  _slots: [],
  _heldNameTimer: null,

  init(){
    // 핫바
    const hb = $id('hotbar');
    hb.innerHTML = '';
    for(let i = 0; i < 9; i++){
      const d = document.createElement('div');
      d.className = 'hslot';
      // 탭/클릭으로 슬롯 선택 (모바일 필수)
      d.addEventListener('pointerdown', e => {
        if(!game.started || this.isOpen()) return;
        e.preventDefault();
        player.selected = i;
        this.updateHotbar();
      });
      hb.appendChild(d);
    }
    // 하트
    const hearts = $id('hearts');
    hearts.innerHTML = '';
    for(let i = 0; i < 10; i++){
      const s = document.createElement('span');
      s.textContent = '❤';
      hearts.appendChild(s);
    }
    const bub = $id('bubbles');
    bub.innerHTML = '';
    for(let i = 0; i < 10; i++){
      const s = document.createElement('span');
      s.textContent = '●';
      s.style.color = '#6ab8f5';
      bub.appendChild(s);
    }
    // 커서 스택 따라다니기
    document.addEventListener('mousemove', e => {
      const c = $id('cursor-stack');
      c.style.left = (e.clientX - 20) + 'px';
      c.style.top = (e.clientY - 20) + 'px';
    });
    // 닫기 버튼
    document.querySelectorAll('.overlay-close').forEach(b => {
      b.addEventListener('click', () => this.close());
    });
    // 일시정지 메뉴
    $id('resume-btn').onclick = () => { this.close(); requestLock(true); };
    $id('save-btn').onclick = () => { saveGame(); this.toast('저장 완료!'); };
    $id('help-btn').onclick = () => { this._helpFromPause = true; this.showOverlay('help-overlay'); this.open = 'help'; };
    const orb = $id('open-recipes-btn');
    if(orb) orb.onclick = () => this.openRecipes();
    $id('quit-btn').onclick = () => { saveGame(); location.reload(); };
    $id('respawn-btn').onclick = () => { player.respawn(); requestLock(); };
    // 업적 버튼
    const ab = $id('ach-btn');
    if(ab) ab.onclick = () => this.openAchievements();
    // BGM 토글
    const bb = $id('bgm-toggle');
    if(bb){
      const opts = JSON.parse(localStorage.getItem('pokecraft_opts') || '{}');
      bb.checked = opts.bgm !== false;
      bb.onchange = () => Music.setOn(bb.checked);
    }
    // 렌더 거리 설정
    const rd = $id('render-dist');
    if(rd){
      const opts = JSON.parse(localStorage.getItem('pokecraft_opts') || '{}');
      rd.value = String(opts.renderDist || 4);
      rd.onchange = () => {
        const v = clamp(+rd.value || 4, 3, 6);
        if(typeof world !== 'undefined' && world) world.renderDist = v;
        localStorage.setItem('pokecraft_opts', JSON.stringify({ renderDist: v }));
      };
    }
  },

  isOpen(){ return !!this.open; },
  showOverlay(id){
    ['inv-overlay','furnace-overlay','chest-overlay','party-overlay','dex-overlay','pause-overlay','help-overlay','recipe-overlay','ench-overlay','trade-overlay','ach-overlay'].forEach(o => $id(o).classList.add('hidden'));
    if(id) $id(id).classList.remove('hidden');
  },

  // ---------- 조합법 책 ----------
  _recipeTab: '전체',
  openRecipes(){
    this.closeOnly();
    const tabs = $id('recipe-tabs');
    const cats = ['전체', '블록', '도구/무기', '음식', '포켓몬', '재료'];
    tabs.innerHTML = '';
    cats.forEach(c => {
      const b = document.createElement('button');
      b.textContent = c;
      b.classList.toggle('active', c === this._recipeTab);
      b.onclick = () => { this._recipeTab = c; this.openRecipes(); };
      tabs.appendChild(b);
    });
    const catOf = (id) => {
      if([I.POKEBALL, I.GREATBALL, I.ULTRABALL, I.POTION].includes(id)) return '포켓몬';
      if(foodValue(id) > 0) return '음식';
      if(toolInfo(id) || id === I.ARROW) return '도구/무기';
      if(isBlockId(id)) return '블록';
      return '재료';
    };
    const list = $id('recipe-list');
    list.innerHTML = '';
    RECIPES.forEach(r => {
      const outId = r.out[0];
      if(this._recipeTab !== '전체' && catOf(outId) !== this._recipeTab) return;
      const card = document.createElement('div');
      card.className = 'recipe-card';
      // 필요 재료 집계
      const needs = {};
      let gridEl, isTable = false;
      if(r.sl){
        r.sl.forEach(([id, n]) => { needs[id] = (needs[id] || 0) + n; });
        gridEl = document.createElement('div');
        gridEl.className = 'recipe-sl';
        r.sl.forEach(([id, n]) => {
          for(let i = 0; i < n; i++){
            const c = document.createElement('div');
            c.className = 'recipe-cell';
            c.style.backgroundImage = `url("${getIconURL(id)}")`;
            c.title = itemName(id);
            gridEl.appendChild(c);
          }
        });
      } else {
        const rg = recipeGrid(r);
        const rw = rg[0].length, rh = rg.length;
        isTable = rw > 2 || rh > 2;
        gridEl = document.createElement('div');
        gridEl.className = 'recipe-grid';
        gridEl.style.gridTemplateColumns = `repeat(${rw}, 30px)`;
        rg.forEach(row => row.forEach(id => {
          const c = document.createElement('div');
          c.className = 'recipe-cell';
          if(id){
            c.style.backgroundImage = `url("${getIconURL(id)}")`;
            c.title = itemName(id);
            needs[id] = (needs[id] || 0) + 1;
          }
          gridEl.appendChild(c);
        }));
      }
      // 재료 보유 체크 (인게임에서만)
      let craftable = false;
      if(typeof player !== 'undefined' && player){
        craftable = Object.keys(needs).every(id => player.countItem(+id) >= needs[id]);
      }
      if(craftable) card.classList.add('craftable');
      card.appendChild(gridEl);
      const arrow = document.createElement('span');
      arrow.className = 'craft-arrow';
      arrow.textContent = '→';
      card.appendChild(arrow);
      const out = document.createElement('div');
      out.className = 'recipe-out';
      out.style.backgroundImage = `url("${getIconURL(outId)}")`;
      if(r.out[1] > 1){
        const cnt = document.createElement('span');
        cnt.className = 'slot-cnt';
        cnt.textContent = r.out[1];
        out.appendChild(cnt);
      }
      card.appendChild(out);
      const info = document.createElement('div');
      info.className = 'recipe-info';
      const nm = document.createElement('span');
      nm.className = 'r-name';
      nm.textContent = itemName(outId);
      const tag = document.createElement('span');
      tag.className = 'r-tag';
      tag.textContent = (isTable ? '제작대 필요' : '손 제작 가능') + (craftable ? ' · ✅ 재료 충분!' : '');
      info.appendChild(nm);
      info.appendChild(tag);
      card.appendChild(info);
      list.appendChild(card);
    });
    this.showOverlay('recipe-overlay');
    this.open = 'recipes';
    if(document.exitPointerLock) document.exitPointerLock();
  },

  // ---------- 슬롯 시스템 ----------
  _makeSlot(container, ref, opts){
    const el = document.createElement('div');
    el.className = 'slot';
    container.appendChild(el);
    const slot = { el, ref, opts: opts || {} };
    el.addEventListener('mousedown', e => {
      e.preventDefault();
      if(e.button === 0) this._slotClick(slot, e, false);
      else if(e.button === 2) this._slotClick(slot, e, true);
    });
    // 드래그 분배 + 숫자키 스왑용 호버 추적
    el.addEventListener('mouseenter', () => {
      this._hoverSlot = slot;
      this._dragEnter(slot);
    });
    el.addEventListener('mouseleave', () => { if(this._hoverSlot === slot) this._hoverSlot = null; });
    el.addEventListener('contextmenu', e => e.preventDefault());
    this._slots.push(slot);
    return slot;
  },
  // 우클릭 드래그: 지나가는 슬롯마다 1개씩 놓기 / 좌클릭 드래그: 마우스 뗄 때 균등 분배
  _dragEnter(slot){
    const d = this._drag;
    if(!d || !this.cursor || slot.opts.output) return;
    const s = slot.ref.get();
    if(slot.opts.filter && !slot.opts.filter(this.cursor)) return;
    if(d.btn === 2){
      if(!s){ slot.ref.set({ ...this.cursor, n: 1 }); this.cursor.n--; }
      else if(s.id === this.cursor.id && !s.ench && !this.cursor.ench && s.n < maxStack(s.id)){ s.n++; this.cursor.n--; }
      else return;
      if(this.cursor.n <= 0){ this.cursor = null; this._drag = null; }
      SFX.play('click');
      this.refresh();
    } else if(d.btn === 0){
      if((!s || (s.id === d.id && !s.ench)) && !d.slots.includes(slot)){
        d.slots.push(slot);
        slot.el.classList.add('drag-mark');
      }
    }
  },
  _finishDrag(){
    const d = this._drag;
    this._drag = null;
    document.querySelectorAll('.drag-mark').forEach(el => el.classList.remove('drag-mark'));
    if(!d || d.btn !== 0 || !this.cursor) return;
    const slots = d.slots.filter(sl => { const s = sl.ref.get(); return !s || (s.id === this.cursor.id && s.n < maxStack(s.id)); });
    if(slots.length <= 1){
      // 한 칸 = 일반 클릭과 동일 (전부 놓기/합치기)
      if(slots.length === 1){
        const sl = slots[0], s = sl.ref.get();
        if(!s){ sl.ref.set(this.cursor); this.cursor = null; }
        else {
          const take = Math.min(this.cursor.n, maxStack(s.id) - s.n);
          s.n += take; this.cursor.n -= take;
          if(this.cursor.n <= 0) this.cursor = null;
        }
      }
    } else {
      // 균등 분배
      const each = Math.floor(this.cursor.n / slots.length);
      if(each >= 1){
        for(const sl of slots){
          if(!this.cursor || this.cursor.n <= 0) break;
          const s = sl.ref.get();
          const put = Math.min(each, maxStack(this.cursor.id) - (s ? s.n : 0), this.cursor.n);
          if(put <= 0) continue;
          if(!s) sl.ref.set({ ...this.cursor, n: put });
          else s.n += put;
          this.cursor.n -= put;
        }
        if(this.cursor && this.cursor.n <= 0) this.cursor = null;
      }
    }
    SFX.play('click');
    this.refresh();
  },
  _slotClick(slot, e, right){
    const { ref, opts } = slot;
    const cur = this.cursor;
    if(opts.output){
      const s = ref.get();
      if(!s) return;
      if(e.shiftKey && !right){
        let guard = 0;
        while(guard++ < 64){
          const r = ref.get();
          if(!r) break;
          const left = player.addItem(r.id, r.n);
          if(left === r.n) break;          // 하나도 못 넣음 → 재료 소모 없이 중단
          opts.onTake();                    // 일부라도 넣었으면 재료 소모
          if(left > 0){                     // 못 넣은 나머지는 바닥에 드롭
            ItemDrops.spawn(player.body.x, player.body.y + 1, player.body.z, r.id, left);
            break;
          }
        }
      } else {
        if(cur && (cur.id !== s.id || cur.n + s.n > maxStack(s.id))) return;
        this.cursor = cur ? { id: s.id, n: cur.n + s.n } : { ...s };
        opts.onTake();
      }
      SFX.play('click');
      this.refresh();
      return;
    }
    const s = ref.get();
    if(e.shiftKey && !right){
      if(s && opts.quick){
        const left = opts.quick(s);
        ref.set(left > 0 ? { ...s, n: left } : null);
        SFX.play('click');
        this.refresh();
      }
      return;
    }
    if(right){
      if(!cur && s){
        const half = Math.ceil(s.n / 2);
        this.cursor = { ...s, n: half };
        const rem = s.n - half;
        ref.set(rem > 0 ? { ...s, n: rem } : null);
      } else if(cur){
        if(opts.filter && !opts.filter(cur)) return;
        if(!s){
          const one = { ...cur, n: 1 };
          ref.set(one);
          cur.n--;
          if(cur.n <= 0) this.cursor = null;
        } else if(s.id === cur.id && s.n < maxStack(s.id)){
          s.n++;
          cur.n--;
          if(cur.n <= 0) this.cursor = null;
        }
        if(this.cursor) this._drag = { btn: 2 }; // 우클릭 드래그 계속 뿌리기
      }
    } else {
      if(!cur && s){
        ref.set(null);
        this.cursor = s;
      } else if(cur && !s){
        if(opts.filter && !opts.filter(cur)) return;
        // 드래그 분배 시작 (마우스 뗄 때 확정)
        this._drag = { btn: 0, id: cur.id, slots: [slot] };
        slot.el.classList.add('drag-mark');
        return;
      } else if(cur && s){
        if(opts.filter && !opts.filter(cur)) return;
        if(cur.id === s.id && maxStack(s.id) > 1){
          const max = maxStack(s.id);
          const take = Math.min(cur.n, max - s.n);
          s.n += take;
          cur.n -= take;
          if(cur.n <= 0) this.cursor = null;
        } else {
          ref.set(cur);
          this.cursor = s;
        }
      }
    }
    SFX.play('click');
    this.refresh();
  },
  refresh(){
    this._slots.forEach(s => renderStackEl(s.el, s.opts.output ? s.ref.get() : s.ref.get()));
    // 멀티플레이: 화로/상자 내용 동기화 (UI를 막 열었을 때는 전송 안 함 — 스테일 에코 방지)
    if(!this._suppressSync && typeof Net !== 'undefined' && Net.mode !== 'off'){
      if(this.open === 'furnace' && this.furnaceKey) Net.containerChanged('furnace', this.furnaceKey);
      if(this.open === 'chest' && this.chestKey) Net.containerChanged('chest', this.chestKey);
    }
    // 커서
    const c = $id('cursor-stack');
    if(this.cursor){
      c.classList.remove('hidden');
      c.style.backgroundImage = `url("${getIconURL(this.cursor.id)}")`;
      let cnt = c.querySelector('.slot-cnt');
      if(!cnt){ cnt = document.createElement('span'); cnt.className = 'slot-cnt'; c.appendChild(cnt); }
      cnt.textContent = this.cursor.n > 1 ? this.cursor.n : '';
    } else {
      c.classList.add('hidden');
    }
    this.updateHotbar();
  },
  // 인벤토리 범위로 이동 (셰프트클릭)
  _moveToRange(stack, from, to){
    let n = stack.n;
    const max = maxStack(stack.id);
    if(max > 1){
      for(let i = from; i <= to && n > 0; i++){
        const s = player.inventory[i];
        if(s && s.id === stack.id && s.n < max){
          const take = Math.min(n, max - s.n);
          s.n += take; n -= take;
        }
      }
    }
    for(let i = from; i <= to && n > 0; i++){
      if(!player.inventory[i]){
        player.inventory[i] = { ...stack, n: Math.min(n, max) };
        n -= Math.min(n, max);
      }
    }
    return n;
  },
  _invRef(i){
    return { get: () => player.inventory[i], set: v => { player.inventory[i] = v; } };
  },
  _buildInvGrids(invGridId, barGridId){
    const ig = $id(invGridId), bg = $id(barGridId);
    ig.innerHTML = ''; bg.innerHTML = '';
    for(let i = 9; i < 36; i++){
      this._makeSlot(ig, this._invRef(i), { quick: s => this._moveToRange(s, 0, 8) });
    }
    for(let i = 0; i < 9; i++){
      this._makeSlot(bg, this._invRef(i), { quick: s => this._moveToRange(s, 9, 35) });
    }
  },

  // ---------- 인벤토리/제작 ----------
  openInventory(table){
    this.closeOnly();
    this._slots = [];
    this.craftSize = table ? 3 : 2;
    this.craftCells = new Array(this.craftSize * this.craftSize).fill(null);
    $id('inv-title').textContent = table ? '제작대' : '인벤토리';
    const creative = game.mode === 'creative' && !table;
    $id('craft-wrap').classList.toggle('hidden', creative);
    $id('creative-wrap').classList.toggle('hidden', !creative);
    if(creative){
      const cg = $id('creative-grid');
      cg.innerHTML = '';
      CREATIVE_ITEMS.forEach(id => {
        const el = document.createElement('div');
        el.className = 'slot';
        el.style.backgroundImage = `url("${getIconURL(id)}")`;
        el.title = itemName(id);
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          if(e.button === 0) this.cursor = { id, n: maxStack(id) };
          else if(e.button === 2){
            if(this.cursor && this.cursor.id === id && this.cursor.n < maxStack(id)) this.cursor.n++;
            else if(!this.cursor) this.cursor = { id, n: 1 };
            else this.cursor = null; // 다른 아이템 들고 클릭 → 버리기
          }
          SFX.play('click');
          this.refresh();
        });
        el.addEventListener('contextmenu', e => e.preventDefault());
        cg.appendChild(el);
      });
    } else {
      const cgrid = $id('craft-grid');
      cgrid.innerHTML = '';
      cgrid.className = 'slot-grid size' + this.craftSize;
      for(let i = 0; i < this.craftCells.length; i++){
        this._makeSlot(cgrid, {
          get: () => this.craftCells[i],
          set: v => { this.craftCells[i] = v; }
        }, { quick: s => player.addItem(s.id, s.n, s.dur) });
      }
      const out = $id('craft-out');
      out.innerHTML = '';
      this._makeSlot(out, {
        get: () => {
          const m = matchCraft(this.craftCells, this.craftSize);
          return m ? { id: m.out[0], n: m.out[1] } : null;
        },
        set: () => {}
      }, {
        output: true,
        onTake: () => {
          for(let i = 0; i < this.craftCells.length; i++){
            const c = this.craftCells[i];
            if(c){ c.n--; if(c.n <= 0) this.craftCells[i] = null; }
          }
        }
      });
    }
    // 갑옷 슬롯 (투구/갑옷/바지)
    const ag = $id('armor-grid');
    ag.innerHTML = '';
    for(let i = 0; i < 3; i++){
      this._makeSlot(ag, { get: () => player.armor[i], set: v => { player.armor[i] = v; } },
        { filter: s => armorInfo(s.id) && armorInfo(s.id).slot === i, quick: s => player.addItem(s.id, s.n, s.dur) });
    }
    this._buildInvGrids('inv-grid', 'invbar-grid');
    this.showOverlay('inv-overlay');
    this.open = 'inv';
    this.refresh();
    if(document.exitPointerLock) document.exitPointerLock();
  },

  // ---------- 화로 ----------
  openFurnace(key){
    this.closeOnly();
    this._slots = [];
    this.furnaceKey = key;
    if(!world.furnaces.has(key)) world.furnaces.set(key, { in:null, fuel:null, out:null, burn:0, burnMax:1, prog:0 });
    const f = world.furnaces.get(key);
    const mk = (id, prop, opts) => {
      const c = $id(id);
      c.innerHTML = '';
      this._makeSlot(c, { get: () => f[prop], set: v => { f[prop] = v; } }, opts);
    };
    mk('fur-in', 'in', { quick: s => player.addItem(s.id, s.n, s.dur) });
    mk('fur-fuel', 'fuel', { filter: s => !!FUEL[s.id], quick: s => player.addItem(s.id, s.n, s.dur) });
    const outC = $id('fur-out');
    outC.innerHTML = '';
    this._makeSlot(outC, { get: () => f.out, set: v => { f.out = v; } },
      { output: true, onTake: () => { f.out = null; } });
    this._buildInvGrids('fur-inv-grid', 'fur-bar-grid');
    this.showOverlay('furnace-overlay');
    this.open = 'furnace';
    this._suppressSync = true;
    this.refresh();
    this._suppressSync = false;
    if(document.exitPointerLock) document.exitPointerLock();
  },
  tickOpenUI(){
    if(this.open === 'furnace' && this.furnaceKey){
      const f = world.furnaces.get(this.furnaceKey);
      if(!f){ this.close(); return; } // 화로 블록이 파괴됨 → UI 닫기
      $id('fur-flame-fill').style.height = (f.burn > 0 ? clamp(f.burn / f.burnMax, 0, 1) * 100 : 0) + '%';
      $id('fur-arrow-fill').style.width = clamp(f.prog / SMELT_TIME, 0, 1) * 100 + '%';
      this._slots.forEach(s => renderStackEl(s.el, s.ref.get()));
    }
    if(this.open === 'chest' && this.chestKey){
      if(!world.chests.has(this.chestKey)){ this.close(); return; }
      this._slots.forEach(s => renderStackEl(s.el, s.ref.get()));
    }
  },

  // ---------- 상자 ----------
  openChest(key){
    this.closeOnly();
    this._slots = [];
    this.chestKey = key;
    if(!world.chests.has(key)) world.chests.set(key, { slots: new Array(27).fill(null) });
    const ch = world.chests.get(key);
    const grid = $id('chest-grid');
    grid.innerHTML = '';
    for(let i = 0; i < 27; i++){
      this._makeSlot(grid, { get: () => ch.slots[i], set: v => { ch.slots[i] = v; } },
        { quick: s => player.addItem(s.id, s.n, s.dur) });
    }
    this._buildInvGrids('chest-inv-grid', 'chest-bar-grid');
    this.showOverlay('chest-overlay');
    this.open = 'chest';
    this._suppressSync = true;
    this.refresh();
    this._suppressSync = false;
    if(document.exitPointerLock) document.exitPointerLock();
  },

  // ---------- 인챈트 ----------
  enchSlot: null,
  openEnchant(){
    this.closeOnly();
    this._slots = [];
    const c = $id('ench-slot');
    c.innerHTML = '';
    this._makeSlot(c, { get: () => this.enchSlot, set: v => { this.enchSlot = v; } },
      { quick: s => player.addItem(s.id, s.n, s.dur, s.ench) });
    const ENCH_DEFS = {
      eff:   { n:'효율',     kinds:['pick','axe','shovel','hoe'] },
      sharp: { n:'날카로움', kinds:['sword'] },
      unb:   { n:'내구',     kinds:['pick','axe','shovel','sword','bow','rod','hoe'] },
      fort:  { n:'행운',     kinds:['pick'] },
      power: { n:'파워',     kinds:['bow'] },
    };
    const roman = ['', 'I', 'II', 'III'];
    const msg = $id('ench-msg');
    msg.textContent = '도구를 올리고 다이아몬드로 인챈트하세요';
    const btns = $id('ench-btns');
    btns.innerHTML = '';
    [1, 2, 3].forEach(cost => {
      const b = document.createElement('button');
      b.className = 'big-btn';
      b.textContent = '✨ 인챈트 ' + roman[cost] + ' (다이아 ' + cost + '개)';
      b.onclick = () => {
        const it = this.enchSlot;
        if(!it){ msg.textContent = '도구를 먼저 올려주세요!'; return; }
        const tool = toolInfo(it.id);
        if(!tool){ msg.textContent = '도구만 인챈트할 수 있어요'; return; }
        if(player.countItem(I.DIAMOND) < cost){ msg.textContent = '다이아몬드가 부족해요 (' + cost + '개 필요)'; return; }
        const pool = Object.keys(ENCH_DEFS).filter(k => ENCH_DEFS[k].kinds.includes(tool.kind));
        if(!pool.length){ msg.textContent = '이 도구에 맞는 인챈트가 없어요'; return; }
        player.removeItem(I.DIAMOND, cost);
        const k = pool[Math.floor(Math.random() * pool.length)];
        it.ench = { k, l: cost };
        SFX.play('evolve');
        Particles && Particles.spawn(player.body.x, player.body.y + 1.5, player.body.z, 0xb06ae8, 16, 2, 0.7, 1);
        msg.textContent = '✨ ' + itemName(it.id) + '에 [' + ENCH_DEFS[k].n + ' ' + roman[cost] + '] 인챈트 성공!';
        this.refresh();
      };
      btns.appendChild(b);
    });
    this._buildInvGrids('ench-inv-grid', 'ench-bar-grid');
    this.showOverlay('ench-overlay');
    this.open = 'ench';
    this.refresh();
    if(document.exitPointerLock) document.exitPointerLock();
  },

  // ---------- 주민 거래 ----------
  openTrade(){
    this.closeOnly();
    const TRADES = [
      { give: [[I.WHEAT, 6]],    get: [I.EMERALD, 1] },
      { give: [[I.FISH_RAW, 4]], get: [I.EMERALD, 1] },
      { give: [[I.EMERALD, 2]],  get: [I.POKEBALL, 3] },
      { give: [[I.EMERALD, 3]],  get: [I.ARROW, 8] },
      { give: [[I.EMERALD, 4]],  get: [I.GREATBALL, 2] },
      { give: [[I.EMERALD, 8]],  get: [I.RARECANDY, 1] },
    ];
    const list = $id('trade-list');
    list.innerHTML = '';
    TRADES.forEach(t => {
      const row = document.createElement('div');
      row.className = 'trade-row';
      const left = document.createElement('div');
      left.className = 'trade-items';
      t.give.forEach(([id, n]) => {
        const c = document.createElement('div');
        c.className = 'recipe-cell';
        c.style.backgroundImage = `url("${getIconURL(id)}")`;
        c.title = itemName(id) + ' ×' + n;
        const cnt = document.createElement('span'); cnt.className = 'slot-cnt'; cnt.textContent = n;
        c.appendChild(cnt);
        left.appendChild(c);
      });
      const arrow = document.createElement('span');
      arrow.className = 'craft-arrow'; arrow.textContent = '→';
      const right = document.createElement('div');
      right.className = 'recipe-cell';
      right.style.backgroundImage = `url("${getIconURL(t.get[0])}")`;
      const rc = document.createElement('span'); rc.className = 'slot-cnt'; rc.textContent = t.get[1];
      right.appendChild(rc);
      const name = document.createElement('span');
      name.style.flex = '1';
      name.textContent = itemName(t.get[0]) + ' ×' + t.get[1];
      const can = t.give.every(([id, n]) => player.countItem(id) >= n);
      const btn = document.createElement('button');
      btn.textContent = '교환';
      btn.disabled = !can;
      btn.onclick = () => {
        if(!t.give.every(([id, n]) => player.countItem(id) >= n)) return;
        t.give.forEach(([id, n]) => player.removeItem(id, n));
        player.addItem(t.get[0], t.get[1]);
        SFX.play('pop');
        this.openTrade(); // 갱신
      };
      row.appendChild(left); row.appendChild(arrow); row.appendChild(right); row.appendChild(name); row.appendChild(btn);
      list.appendChild(row);
    });
    this.showOverlay('trade-overlay');
    this.open = 'trade';
    if(document.exitPointerLock) document.exitPointerLock();
  },

  // ---------- 파티 ----------
  openParty(){
    if(!PokeMan.enabled){ this.toast('포켓몬 모드가 꺼져 있습니다'); return; }
    this.closeOnly();
    const list = $id('party-list');
    list.innerHTML = '';
    if(!PokeMan.party.length){
      list.innerHTML = '<p style="padding:10px">아직 포켓몬이 없어요. 포켓볼을 만들어 야생 포켓몬에게 던져보세요!<br>(포켓볼 조합법: 철 주괴 4 + 레드스톤 1)</p>';
    } else {
      const fb = document.createElement('button');
      fb.className = 'big-btn';
      fb.style.fontSize = '13px';
      fb.textContent = '파트너 따라오기: ' + (game.followerOn ? 'ON' : 'OFF');
      fb.onclick = () => { game.followerOn = !game.followerOn; this.openParty(); };
      list.appendChild(fb);
    }
    PokeMan.party.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'party-row' + (p.hp <= 0 ? ' fainted' : '');
      const hpPct = p.hp / p.maxHp * 100;
      row.innerHTML = `
        <img src="${portraitURL(p.sp)}" alt="">
        <div class="party-mid">
          <div><b>${p.shiny ? '✨' : ''}${p.name}</b> Lv.${p.level} ${typeTagsHTML(p.spec.types)}</div>
          <div class="p-hpbar"><div style="width:${hpPct}%; background:${hpPct > 50 ? '#44c944' : hpPct > 20 ? '#e8b820' : '#e23b3b'}"></div></div>
          <div>HP ${p.hp}/${p.maxHp} · 공격 ${p.atk} · 방어 ${p.def} · 스피드 ${p.spd} · EXP ${Math.floor(p.expPct() * 100)}%</div>
          <div class="p-moves">기술: ${p.moves.map(k => MOVES[k].n).join(', ')}</div>
        </div>
        <div class="party-btns"></div>`;
      const btns = row.querySelector('.party-btns');
      if(p.hp < p.maxHp && player.countItem(I.POTION) > 0){
        const b = document.createElement('button');
        b.textContent = '상처약 (' + player.countItem(I.POTION) + ')';
        b.onclick = () => {
          player.removeItem(I.POTION, 1);
          p.hp = Math.min(p.maxHp, p.hp + 25);
          SFX.play('pop');
          this.openParty();
        };
        btns.appendChild(b);
      }
      if(player.countItem(I.RARECANDY) > 0 && p.level < 100){
        const b = document.createElement('button');
        b.textContent = '이상한사탕 (' + player.countItem(I.RARECANDY) + ')';
        b.onclick = () => {
          player.removeItem(I.RARECANDY, 1);
          PokeMan.applyCandy(p);
          this.openParty();
        };
        btns.appendChild(b);
      }
      // 진화의 돌
      for(const sidStr of Object.keys(STONE_EVOS)){
        const sid = +sidStr;
        if(STONE_EVOS[sid][p.sp] && player.countItem(sid) > 0){
          const b = document.createElement('button');
          b.textContent = '🌟 ' + itemName(sid);
          b.onclick = () => {
            player.removeItem(sid, 1);
            PokeMan.useStone(p, sid);
            this.openParty();
          };
          btns.appendChild(b);
        }
      }
      if(PokeMan.party.length > 1){
        const b = document.createElement('button');
        b.textContent = '박스로';
        b.onclick = () => {
          PokeMan.party.splice(i, 1);
          PokeMan.box.push(p);
          this.openParty();
        };
        btns.appendChild(b);
      }
      if(i > 0){
        const b = document.createElement('button');
        b.textContent = '맨 앞으로';
        b.onclick = () => {
          PokeMan.party.splice(i, 1);
          PokeMan.party.unshift(p);
          this.openParty();
        };
        btns.appendChild(b);
      }
      const rel = document.createElement('button');
      rel.textContent = '놓아주기';
      rel.onclick = () => {
        if(confirm(p.name + '을(를) 정말 놓아줄까요?')){
          PokeMan.party.splice(i, 1);
          this.openParty();
        }
      };
      btns.appendChild(rel);
      list.appendChild(row);
    });
    // 보관함
    if(PokeMan.box.length){
      const h = document.createElement('h4');
      h.textContent = '보관함 (' + PokeMan.box.length + '마리)';
      list.appendChild(h);
      PokeMan.box.forEach((p, i) => {
        const row = document.createElement('div');
        row.className = 'party-row';
        row.innerHTML = `<img src="${portraitURL(p.sp)}" alt=""><div class="party-mid"><b>${p.shiny ? '✨' : ''}${p.name}</b> Lv.${p.level}</div><div class="party-btns"></div>`;
        if(PokeMan.party.length < 6){
          const b = document.createElement('button');
          b.textContent = '파티로';
          b.onclick = () => {
            PokeMan.box.splice(i, 1);
            PokeMan.party.push(p);
            this.openParty();
          };
          row.querySelector('.party-btns').appendChild(b);
        }
        list.appendChild(row);
      });
    }
    this.showOverlay('party-overlay');
    this.open = 'party';
    if(document.exitPointerLock) document.exitPointerLock();
  },

  // ---------- 도감 ----------
  openDex(){
    if(!PokeMan.enabled){ this.toast('포켓몬 모드가 꺼져 있습니다'); return; }
    this.closeOnly();
    $id('dex-stats').textContent = `· 봤다 ${PokeMan.seen.size} · 잡았다 ${PokeMan.caught.size} / ${SPECIES.length - 1}`;
    const grid = $id('dex-grid');
    grid.innerHTML = '';
    for(let sp = 1; sp < SPECIES.length; sp++){
      const cell = document.createElement('div');
      cell.className = 'dex-cell';
      if(PokeMan.caught.has(sp)){
        cell.innerHTML = `<img src="${portraitURL(sp)}"><div>No.${sp} ${SPECIES[sp].name}</div><div>${typeTagsHTML(SPECIES[sp].types)}</div>`;
      } else if(PokeMan.seen.has(sp)){
        cell.classList.add('unseen');
        cell.innerHTML = `<img src="${silhouetteURL(sp)}"><div>No.${sp} ???</div>`;
      } else {
        cell.classList.add('unseen');
        cell.innerHTML = `<div style="width:64px;height:64px;display:flex;align-items:center;justify-content:center;font-size:30px">?</div><div>No.${sp}</div>`;
      }
      grid.appendChild(cell);
    }
    this.showOverlay('dex-overlay');
    this.open = 'dex';
    if(document.exitPointerLock) document.exitPointerLock();
  },

  // ---------- 업적 ----------
  openAchievements(){
    this.closeOnly();
    const list = $id('ach-list');
    list.innerHTML = '';
    const data = Ach.data();
    $id('ach-count').textContent = Ach.count() + ' / ' + Object.keys(ACH_DEFS).length;
    for(const id in ACH_DEFS){
      const row = document.createElement('div');
      row.className = 'ach-row' + (data[id] ? ' done' : '');
      const icon = document.createElement('span');
      icon.textContent = data[id] ? '🏆' : '🔒';
      const mid = document.createElement('div');
      mid.className = 'world-mid';
      const nm = document.createElement('span');
      nm.className = 'w-name';
      nm.textContent = ACH_DEFS[id].n;
      const ds = document.createElement('span');
      ds.className = 'w-meta';
      ds.textContent = ACH_DEFS[id].d + (data[id] ? ' · ' + new Date(data[id]).toLocaleDateString('ko-KR') : '');
      mid.appendChild(nm); mid.appendChild(ds);
      row.appendChild(icon); row.appendChild(mid);
      list.appendChild(row);
    }
    this.showOverlay('ach-overlay');
    this.open = 'ach';
    if(document.exitPointerLock) document.exitPointerLock();
  },

  // ---------- 일시정지 ----------
  openPause(){
    this.closeOnly();
    this.showOverlay('pause-overlay');
    this.open = 'pause';
  },

  // 닫기 (아이템 반환 포함)
  closeOnly(){
    if(this.open === 'inv'){
      this.craftCells.forEach(c => {
        if(!c) return;
        const left = player.addItem(c.id, c.n, c.dur);
        if(left > 0) ItemDrops.spawn(player.body.x, player.body.y + 1, player.body.z, c.id, left, c.dur);
      });
      this.craftCells = [];
    }
    if(this.enchSlot){
      const es = this.enchSlot;
      if(player.addItem(es.id, es.n, es.dur, es.ench) > 0)
        ItemDrops.spawn(player.body.x, player.body.y + 1, player.body.z, es.id, es.n, es.dur, es.ench);
      this.enchSlot = null;
    }
    if(this.cursor){
      const cu = this.cursor;
      const left = player.addItem(cu.id, cu.n, cu.dur, cu.ench);
      if(left > 0) ItemDrops.spawn(player.body.x, player.body.y + 1, player.body.z, cu.id, left, cu.dur, cu.ench);
      this.cursor = null;
    }
    this._drag = null;
    document.querySelectorAll('.drag-mark').forEach(el => el.classList.remove('drag-mark'));
    this._slots = [];
    this.open = null;
    this.showOverlay(null);
    $id('cursor-stack').classList.add('hidden');
  },
  close(){
    const wasHelp = this.open === 'help';
    this.closeOnly();
    // 일시정지 메뉴에서 연 조작법은 닫으면 일시정지로 복귀 (F1로 연 경우는 게임으로)
    if(wasHelp && game.started && this._helpFromPause){ this.openPause(); return; }
    this.updateHotbar();
  },

  // ---------- HUD ----------
  updateHUD(){
    if(!player) return;
    // 버프 표시
    const eff = $id('effects');
    if(eff){
      const names = { speed:'💨신속', jump:'🐇도약', regen:'💗재생' };
      eff.textContent = Object.keys(player.effects).map(k => names[k] + ' ' + Math.ceil(player.effects[k]) + 's').join('  ');
    }
    const hearts = $id('hearts').children;
    for(let i = 0; i < 10; i++){
      const need = (i + 1) * 2;
      hearts[i].style.color = player.health >= need ? '#e23b3b' : player.health >= need - 1 ? '#e88a3b' : '#3a3a3a';
    }
    const bub = $id('bubbles');
    if(player.air < 9.9){
      bub.style.display = 'flex';
      const n = Math.ceil(player.air);
      for(let i = 0; i < 10; i++) bub.children[i].style.visibility = i < n ? 'visible' : 'hidden';
    } else {
      bub.style.display = 'none';
    }
  },
  updateHotbar(){
    const hb = $id('hotbar').children;
    for(let i = 0; i < 9; i++){
      renderStackEl(hb[i], player.inventory[i]);
      hb[i].classList.toggle('sel', i === player.selected);
    }
    const s = player.inventory[player.selected];
    const hn = $id('held-name');
    hn.textContent = s ? itemName(s.id) : '';
    hn.style.opacity = 1;
    clearTimeout(this._heldNameTimer);
    this._heldNameTimer = setTimeout(() => { hn.style.opacity = 0; }, 1500);
    if(typeof updateHeldItem === 'function') updateHeldItem();
    this.updateHUD();
  },
  flashDamage(){
    const f = $id('flash');
    f.style.transition = 'none';
    f.style.opacity = 0.45;
    setTimeout(() => {
      f.style.transition = 'opacity .4s';
      f.style.opacity = 0;
    }, 80);
  },
  toast(msg, dur){
    const t = $id('toasts');
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    t.appendChild(d);
    while(t.children.length > 4) t.removeChild(t.firstChild);
    setTimeout(() => { d.remove(); }, dur || 3000);
  }
};
