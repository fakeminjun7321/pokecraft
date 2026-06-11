// ===== quests.js : 📜 일일 도전 — 매일 바뀌는 3개의 퀘스트로 보상! =====
'use strict';

const QuestMan = {
  list: [], _dateKey: '',

  _today(){
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  },
  // 날짜 시드 결정론 — 모두 같은 날 같은 도전
  _rng(seedStr){
    let h = 2166136261;
    for(let i = 0; i < seedStr.length; i++){ h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
    return mulberry32(h >>> 0);
  },

  TEMPLATES: [
    { key:'catchAny',  make:r => ({ goal: 3 + Math.floor(r() * 3), text: g => '야생 포켓몬 ' + g + '마리 잡기' }),
      reward: () => { player.addItem(I.GREATBALL, 3); return '슈퍼볼 3개'; } },
    { key:'catchType', make:r => { const ts = ['water','fire','grass','electric','normal','flying','bug','rock'];
        const t = ts[Math.floor(r() * ts.length)];
        return { type: t, goal: 2, text: g => (TYPES[t] ? TYPES[t].n : t) + ' 타입 포켓몬 ' + g + '마리 잡기' }; },
      reward: () => { player.addItem(I.ULTRABALL, 2); return '하이퍼볼 2개'; } },
    { key:'defeatWild', make:r => ({ goal: 4 + Math.floor(r() * 4), text: g => '야생 포켓몬 ' + g + '마리 쓰러뜨리기' }),
      reward: () => { player.addItem(I.RARECANDY, 1); player.addItem(I.POTION, 2); return '이상한사탕 1개 + 상처약 2개'; } },
    { key:'mineOre',   make:r => ({ goal: 8 + Math.floor(r() * 8), text: g => '광물 ' + g + '개 캐기' }),
      reward: () => { player.addItem(I.EMERALD, 3); return '에메랄드 3개'; } },
    { key:'trainer',   make:r => ({ goal: 1, text: g => '트레이너/관장/로켓단 배틀에서 승리하기' }),
      reward: () => { player.addItem(I.RARECANDY, 2); return '이상한사탕 2개'; } },
    { key:'evolve',    make:r => ({ goal: 1, text: g => '포켓몬 진화시키기' }),
      reward: () => { player.addItem(I.ULTRABALL, 1); player.addItem(I.EMERALD, 2); return '하이퍼볼 1개 + 에메랄드 2개'; } },
    { key:'boss',      make:r => ({ goal: 1, text: g => '👑 보스 포켓몬 쓰러뜨리기' }),
      reward: () => { player.addItem(I.RARECANDY, 3); return '이상한사탕 3개'; } },
  ],

  init(){
    const today = this._today();
    this._dateKey = today;
    const r = this._rng(today + '|pokecraft');
    // 오늘의 3개 선택 (중복 없이)
    const pool = [...this.TEMPLATES];
    this.list = [];
    for(let i = 0; i < 3 && pool.length; i++){
      const idx = Math.floor(r() * pool.length);
      const tpl = pool.splice(idx, 1)[0];
      const q = tpl.make(r);
      this.list.push({ key: tpl.key, type: q.type || null, goal: q.goal, text: q.text(q.goal), prog: 0, done: false, tpl });
    }
    // 저장된 진행도 복원 (오늘 것만)
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey('quests')) || 'null');
      if(saved && saved.date === today){
        saved.prog.forEach((p, i) => { if(this.list[i]){ this.list[i].prog = p.prog; this.list[i].done = p.done; } });
      }
    } catch(e){}
  },
  save(){
    try {
      localStorage.setItem(storeKey('quests'), JSON.stringify({
        date: this._dateKey, prog: this.list.map(q => ({ prog: q.prog, done: q.done }))
      }));
    } catch(e){}
  },
  _bump(key, n, filter){
    if(!game.started) return;
    if(this._dateKey !== this._today()) this.init(); // 자정 넘김
    let changed = false;
    for(const q of this.list){
      if(q.key !== key || q.done) continue;
      if(filter && !filter(q)) continue;
      q.prog = Math.min(q.goal, q.prog + n);
      changed = true;
      if(q.prog >= q.goal){
        q.done = true;
        const rw = q.tpl.reward();
        UI.toast('📜 일일 도전 완료! 「' + q.text + '」 → ' + rw, 7000);
        SFX.play('level');
        if(this.list.every(x => x.done)){
          player.addItem(I.RARECANDY, 2); player.addItem(I.EMERALD, 5);
          UI.toast('🌟 오늘의 도전 전부 완료! 보너스: 이상한사탕 2개 + 에메랄드 5개', 8000);
        }
      } else {
        UI.toast('📜 ' + q.text + ' (' + q.prog + '/' + q.goal + ')', 2500);
      }
    }
    if(changed) this.save();
  },

  onCatch(inst){
    this._bump('catchAny', 1);
    this._bump('catchType', 1, q => inst.spec.types.includes(q.type));
  },
  onDefeatWild(){ this._bump('defeatWild', 1); },
  onMineOre(){ this._bump('mineOre', 1); },
  onTrainerWin(){ this._bump('trainer', 1); },
  onEvolve(){ this._bump('evolve', 1); },
  onBoss(){ this._bump('boss', 1); },

  // ---------- UI ----------
  openPanel(){
    const list = document.getElementById('quest-list');
    if(!list) return;
    if(this._dateKey !== this._today()) this.init();
    UI.showOverlay('quest-overlay');
    UI.open = 'quest';
    if(document.exitPointerLock) document.exitPointerLock();
    list.innerHTML = this.list.map(q => {
      const pct = Math.round(q.prog / q.goal * 100);
      return '<div class="quest-row' + (q.done ? ' done' : '') + '">' +
        '<div class="quest-text">' + (q.done ? '✅ ' : '⬜ ') + q.text + '</div>' +
        '<div class="quest-bar"><div style="width:' + pct + '%"></div></div>' +
        '<div class="quest-prog">' + q.prog + ' / ' + q.goal + '</div></div>';
    }).join('') +
    '<p class="hint" style="margin-top:8px">매일 자정에 새로운 도전 3개가 나와요! 전부 깨면 보너스 보상 🌟</p>';
  }
};
