// ===== guide.js : 🤖 게임 도우미 — 내장 Q&A 엔진 + (선택) 내 AI 키로 진짜 AI 답변 =====
'use strict';

const Guide = {
  _history: [],
  _busy: false,

  // ---------- 지식 베이스 (게임 데이터를 실시간으로 읽는다) ----------
  TOPICS: [
    { k: ['진화', 'evolution', '진화시키'], a: () =>
      '🧬 진화: 1차 진화는 Lv.30, 2차 진화는 Lv.60부터 가능해요. 레벨이 되면 파티 화면(P)에 [진화] 버튼이 떠요.\n' +
      '· 돌 진화: 불꽃/물/천둥/리프/문스톤은 신비한 광석(MYSTIC, y<28)에서 얻고 일부 주민도 팔아요\n' +
      '· 통신 진화: 윤겔라·근육몬·가디 등은 링케이블(조약돌+레드스톤+철)을 쓰거나 친구와 교환하면 진화\n' +
      '· 이브이는 Lv.30에 주변 지형 따라 샤미드/쥬피썬더/부스터/에브이/블래키 등으로 갈라져요' },
    { k: ['잡', '포획', '포켓볼', 'catch'], a: () =>
      '🎯 포획: 야생 포켓몬 HP를 깎을수록 확률이 올라가요. 기절시켜도(HP 0) 20초 안에는 볼을 던져 잡을 수 있어요!\n' +
      '· 볼 성능: 포켓볼 < 슈퍼볼 < 하이퍼볼 (제작: 철+레드스톤, +금, +다이아)\n' +
      '· 잡으면 경험치 보너스, 도감 신규 등록 시 추가 보상도 있어요' },
    { k: ['레벨', '경험치', 'exp', '강해'], a: () =>
      '📈 레벨업 방법: ① 배틀 승리 ② 포켓몬 잡기(잡은 것 레벨 비례) ③ 파트너 데리고 걷기(걷기 경험치) ④ 이상한사탕\n' +
      '풀 타입 파트너를 동행시키면 걷기 경험치가 2배예요!' },
    { k: ['배틀', '싸우', '대전', 'battle'], a: () =>
      '⚔ 배틀: 야생 근처(9블록)에서 R키. 멀티에서는 친구 근처에서 R로 PvP 대전 신청!\n' +
      '기술엔 타입 상성(1.5배/0.5배)과 자속 보정이 있어요. 배틀 화면에 예상 피해가 표시돼요.' },
    { k: ['타', '라이딩', '타기', 'ride'], a: () =>
      '🐾 라이딩: 파트너를 내보낸 상태에서 G키. 비행 타입은 하늘을 날고(시선 방향), 물 타입은 수면 서핑, 나머지는 질주+자동 턱넘기.\n' +
      '빠른 종일수록 더 빨라요 (Ctrl = 부스트)' },
    { k: ['멀티', '같이', '친구', 'multi'], a: () =>
      '🌐 멀티: 타이틀에서 [멀티플레이] → 방 만들기 → 초대 코드 공유. 최대 20명!\n' +
      '친구와 R로 PvP, 파티 화면에서 포켓몬 교환도 돼요. 버전이 다르면 접속이 안 되니 둘 다 새로고침하세요.' },
    { k: ['명령어', '커맨드', 'command', '치트'], a: () =>
      '💬 T로 채팅 열고 입력:\n🟢 서바이벌: /sethome /home /locate village|gym|stronghold|fortress|ruin|monument /seed\n' +
      '🟡 크리에이티브: /give 이름 [개수] /tp x z|spawn /time set day|night /heal /summon 포켓몬 [레벨] [shiny] /gamemode' },
    { k: ['다이아', '광물', '철', '금', '광석'], a: () =>
      '⛏ 광물 깊이: 석탄 y<52 · 철 y<38 · 금 y<24 · 레드스톤 y<20 · 다이아 y<16 · 신비한 광석(진화의돌) y<28 · 화석 y<20\n' +
      'F3으로 좌표 확인! 다이아는 철곡괭이 이상으로 캐야 해요.' },
    { k: ['마을', '체육관', '구조물', '요새', '신전', '폐허'], a: () =>
      '🏘 구조물: 마을(주민 거래·회복머신), 체육관(관장 이기면 배지), 해저신전, 네더 포탈 폐허, 네더 요새(블레이즈), 엔드 요새(엔드 포탈)\n' +
      '/locate village 처럼 명령어로 가까운 위치를 찾을 수 있어요. M키 = 전체 지도!' },
    { k: ['메가', 'mega'], a: () =>
      '💥 메가진화: 메가스톤(다이아+에메랄드 조합)을 들고 배틀에서 [메가진화] 선택. 그 배틀 동안 능력치 대폭 상승!\n' +
      '리자몽·이상해꽃·거북왕·갸라도스·뮤츠 등 유명한 종만 가능해요.' },
    { k: ['특성', '어빌리티', 'ability'], a: () =>
      '✨ 특성(타입별 자동): 바위/강철=옹골참(한방에 안 죽음), 고스트=부유(땅 무효), 전기=정전기(맞으면 반격), 풀/페어리=재생력,\n' +
      '악/독/얼음/벌레=위협(상대 공격↓), 불/물/격투/용/땅=근성(위기에 공격↑), 그 외=픽업' },
    { k: ['동행', '데리고', '팔로워'], a: () =>
      '🚶 동행 효과(파트너 1번 타입): 불=사냥 데미지 +30% · 물=수영 1.5배 · 전기=이동속도↑ · 풀=걷기 경험치 2배 ·\n' +
      '비행=낙하 데미지 무효 · 에스퍼=포획률 1.15배 · 노말=아이템 픽업' },
    { k: ['네더', '지옥', 'nether'], a: () =>
      '🔥 네더: 흑요석(물+용암)으로 4×5 포탈 → 화염석으로 점화. 네더엔 화염 포켓몬, 네더 요새, 발광석이 있어요.\n' +
      '용암 조심! 포탈 폐허를 찾으면 공짜 흑요석을 얻을 수도 있어요 (/locate ruin)' },
    { k: ['엔드', '드래곤', 'end'], a: () =>
      '🌌 엔드: 엔더의 눈(엔더진주+블레이즈 가루)으로 엔드 요새를 찾아(/locate stronghold) 포탈 틀 12개를 채우면 열려요.\n' +
      '엔더드래곤을 쓰러뜨리면 클리어! 엔드 수정을 먼저 부수세요.' },
    { k: ['샤이니', 'shiny', '색이 다른'], a: () =>
      '✨ 샤이니: 야생이 아주 낮은 확률로 반짝이는 색으로 나와요. 이름표에 ✨가 붙어요. 도감과 파티에도 표시!' },
    { k: ['화석', 'fossil'], a: () =>
      '🦴 화석: 화석 광석(y<20)에서 투구/조개/비밀의 호박 화석을 캐고, 마을의 화석 복원 머신에서 살리면 프테라·암나이트·투구가 나와요!' },
    { k: ['교환', '트레이드', 'trade'], a: () =>
      '🔄 교환: 멀티에서 친구 파티 화면으로 교환하거나, 가끔 나타나는 교환 상인 NPC와 거래! 일부 포켓몬은 교환하면 진화해요.' },
    { k: ['box', '박스', 'pc', '보관'], a: () =>
      '📦 PC 박스: 마을 등에 있는 PC 블록을 우클릭하면 잡은 포켓몬을 보관/교체할 수 있어요. 파티는 최대 6마리!' },
    { k: ['알', 'egg', '부화'], a: () =>
      '🥚 알: 회복머신을 쓰다 보면 가끔 알을 받아요. 들고 걸으면 부화 게이지가 차고, 깨어나면 랜덤 포켓몬!' },
    { k: ['렉', '느려', '버벅', 'lag', '최적화'], a: () =>
      '🚀 렉 줄이기: 일시정지(Esc) → [저사양 모드] 켜기 + 렌더 거리 3으로. 탭을 여러 개 열지 말고, 크롬 하드웨어 가속을 켜세요.' },
    { k: ['로켓단', 'rocket'], a: () =>
      '🚀 로켓단: 가끔 나타나 시비를 걸어요! 이기면 보상, 지면 아이템을 뺏길 수도... 간부는 더 강하니 조심!' },
    { k: ['배지', '관장', 'badge', 'gym'], a: () =>
      '🥇 체육관: 바위/물/전기/불꽃 4종. 관장에게 우클릭으로 도전(트레이너 3연전). 이기면 배지 = 포켓몬 공격력 +5%/개!\n/locate gym 으로 찾기' },
    { k: ['회복', '치료', 'heal'], a: () =>
      '💖 회복: 마을의 회복머신(우클릭), 상처약(꽃2+사과 → 업그레이드 가능), 시간이 지나면 천천히 자동 회복도 돼요.' },
    { k: ['집', '스폰', 'home'], a: () =>
      '🏠 침대에서 자면 스폰 지점 설정! /sethome → /home 순간이동도 있어요.' },
    { k: ['계정', '백업', '세이브', '저장'], a: () =>
      '💾 세이브는 계정별로 브라우저에 저장돼요. 다른 컴퓨터로 옮기려면 타이틀에서 [백업 저장] → 거기서 [백업 불러오기].\n예전 데이터가 사라진 것 같으면 타이틀의 🛠 복구 배너를 확인하세요!' },
    { k: ['지도', '맵', 'map'], a: () => '🗺 M키 = 전체 지도(마을·체육관 표시), Shift+M = 미니맵 켜기/끄기' },
    { k: ['조작', '키', '단축키', 'control'], a: () =>
      '🎮 WASD 이동 · Space 점프(2번=비행, 크리에이티브) · R 배틀 · G 라이딩 · P 파티 · E 인벤토리 · M 지도 · T 채팅/명령어 · F5 시점 · Esc 일시정지' },
  ],

  // 종 이름이 질문에 있으면 그 포켓몬 정보로 답한다
  _speciesAnswer(q){
    let found = 0, fname = '';
    for(let i = 1; i < SPECIES.length; i++){
      const n = SPECIES[i] && SPECIES[i].name;
      if(n && q.includes(n) && n.length > fname.length){ found = i; fname = n; }
    }
    if(!found) return null;
    const s = SPECIES[found];
    const tnames = s.types.map(t => (TYPES[t] || {}).n || t).join('/');
    let out = '📕 ' + s.name + ' (' + tnames + ') — HP ' + s.bs[0] + ' · 공격 ' + s.bs[1] + ' · 방어 ' + s.bs[2] + ' · 스피드 ' + s.bs[3];
    // 진화
    if(s.evo && s.evo.to) out += '\n🧬 Lv.' + Math.max(s.evo.lv, evoReqLevel(found)) + ' 이상에서 ' + SPECIES[s.evo.to].name + '(으)로 진화';
    else if(s.evo && s.evo.special === 'eevee') out += '\n🧬 Lv.30에 주변 지형에 따라 여러 모습으로 진화 (물가/평지/사막/숲/밤...)';
    for(const stone in STONE_EVOS){ if(STONE_EVOS[stone][found]) out += '\n🪨 ' + itemName(+stone) + '(으)로 ' + SPECIES[STONE_EVOS[stone][found]].name + ' 진화'; }
    if(TRADE_EVOS[found]) out += '\n🔄 교환/링케이블로 ' + SPECIES[TRADE_EVOS[found]].name + ' 진화';
    // 이전 진화형 (얻는 방법 안내)
    for(let i = 1; i < SPECIES.length; i++){
      const p = SPECIES[i];
      if(p && p.evo && p.evo.to === found){ out += '\n⬅ ' + p.name + ' Lv.' + Math.max(p.evo.lv, evoReqLevel(i)) + ' 진화로도 얻어요'; break; }
    }
    for(const stone in STONE_EVOS){ for(const from in STONE_EVOS[stone]){ if(STONE_EVOS[stone][from] === found) out += '\n⬅ ' + SPECIES[+from].name + ' + ' + itemName(+stone) + '(으)로도 얻어요'; } }
    for(const from in TRADE_EVOS){ if(TRADE_EVOS[from] === found) out += '\n⬅ ' + SPECIES[+from].name + ' 교환/링케이블로도 얻어요'; }
    // 스폰
    if(s.spawn.biomes.length){
      const bn = { plains:'평원', forest:'숲', desert:'사막', mountain:'산', snow:'설원', water:'물', nether:'네더', end:'엔드' };
      out += '\n📍 출현: ' + s.spawn.biomes.map(b => bn[b] || b).join(', ') + ' (희귀도 ' + '★'.repeat(s.spawn.rare) + ')';
    } else out += '\n📍 자연 출현 없음 (진화/화석/이벤트로만)';
    if(LEGENDARIES.includes(found)) out += '\n👑 전설의 포켓몬! 멀리 탐험할수록 만날 확률이 올라가요';
    if(MEGA_FORMS.has(found)) out += '\n💥 메가진화 가능 (메가스톤 필요)';
    return out;
  },

  // 아이템/조합법 질문
  _itemAnswer(q){
    if(!/만들|만드|제작|조합|레시피|얻|구하/.test(q)) return null;
    let found = null, fname = '';
    const scan = (id, name) => { if(name && q.includes(name) && name.length > fname.length){ found = id; fname = name; } };
    for(const idStr in ITEMS){ if(ITEMS[idStr]) scan(+idStr, ITEMS[idStr].name); }
    for(let i = 1; i < BLOCKS.length; i++){ if(BLOCKS[i]) scan(i, BLOCKS[i].name); }
    if(found === null) return null;
    const rs = RECIPES.filter(r => r.out[0] === found);
    if(!rs.length) return '🔍 ' + fname + ' — 제작법은 없어요. 채굴·드롭·거래·상자에서 얻어보세요! (B키 조합법 책도 확인)';
    const lines = rs.map(r => {
      const need = {};
      if(r.sl) r.sl.forEach(([id, n]) => { need[itemName(id)] = (need[itemName(id)] || 0) + n; });
      else { const cnt = {}; r.p.join('').split('').forEach(c => { if(r.k[c]) cnt[c] = (cnt[c] || 0) + 1; });
        for(const c in cnt) need[itemName(r.k[c])] = cnt[c]; }
      return Object.entries(need).map(([n, c]) => n + '×' + c).join(' + ') + ' → ' + itemName(found) + '×' + r.out[1];
    });
    return '🛠 ' + fname + ' 제작법:\n' + lines.join('\n') + '\n(제작대에서, B키로 조합법 책 확인)';
  },

  localAnswer(q){
    q = (q || '').trim();
    if(!q) return null;
    const sp = this._speciesAnswer(q);
    if(sp) return sp;
    const it = this._itemAnswer(q);
    if(it) return it;
    let best = null, bestScore = 0;
    for(const t of this.TOPICS){
      const score = t.k.reduce((s, k) => s + (q.includes(k) ? k.length : 0), 0);
      if(score > bestScore){ bestScore = score; best = t; }
    }
    if(best) return best.a();
    return null;
  },

  // ---------- (선택) 내 AI 키로 진짜 AI 답변 ----------
  aiKey(){ return localStorage.getItem('pokecraft_ai_key') || ''; },
  setAiKey(k){ if(k) localStorage.setItem('pokecraft_ai_key', k.trim()); else localStorage.removeItem('pokecraft_ai_key'); },

  _systemPrompt(){
    return '너는 복셀 게임 "포케크래프트"(마인크래프트+포켓몬 웹게임)의 인게임 도우미야. 한국어로 짧고 친절하게(5줄 이내) 답해.\n' +
      '게임 정보: 1~3세대 386종 포켓몬, 진화는 1차 Lv.30/2차 Lv.60(돌·통신 진화도 있음), R=배틀(턴제), G=라이딩(비행/서핑/질주), ' +
      'P=파티, M=전체지도, T=채팅·명령어(/help, /locate, 크리에이티브 전용 /give /tp /time /heal /summon), ' +
      '구조물: 마을(거래·회복머신·PC)·체육관(배지=공격+5%)·해저신전·네더요새·엔드요새, 네더/엔드 차원, 멀티 20명·PvP·교환, ' +
      '메가진화(메가스톤), 특성(타입별), 동행 효과, 샤이니, 화석 복원, 알 부화, 로켓단 이벤트, ' +
      '광물: 석탄y<52 철y<38 금y<24 레드스톤y<20 다이아y<16 신비광석(진화의돌)y<28 화석y<20.\n' +
      '모르는 건 모른다고 말해. 게임과 무관한 질문은 정중히 게임 얘기로 돌려.';
  },
  async askAI(q){
    const key = this.aiKey();
    const local = this.localAnswer(q);
    if(!key) return local || '🤔 잘 모르겠어요... "진화", "포획", "다이아", 포켓몬 이름처럼 물어봐 주세요!\n(⚙ 일시정지 → AI 키를 넣으면 무엇이든 답하는 진짜 AI가 돼요)';
    const hint = local ? '\n\n[게임 내장 참고자료]\n' + local : '';
    try {
      if(key.startsWith('sk-ant-')){
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': key,
            'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400,
            system: this._systemPrompt(),
            messages: [{ role: 'user', content: q + hint }] })
        });
        if(!r.ok) throw new Error('API ' + r.status);
        const d = await r.json();
        return (d.content && d.content[0] && d.content[0].text) || '(빈 응답)';
      }
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': 'Bearer ' + key },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 400,
          messages: [{ role: 'system', content: this._systemPrompt() }, { role: 'user', content: q + hint }] })
      });
      if(!r.ok) throw new Error('API ' + r.status);
      const d = await r.json();
      return (d.choices && d.choices[0] && d.choices[0].message.content) || '(빈 응답)';
    } catch(e){
      return (local || '답을 찾지 못했어요.') + '\n⚠ AI 연결 실패(' + e.message + ') — 내장 답변으로 대신해요. 키가 맞는지 확인하세요.';
    }
  },

  // ---------- UI ----------
  open(){
    const ov = document.getElementById('guide-overlay');
    if(!ov) return;
    UI.showOverlay('guide-overlay');
    UI.open = 'guide';
    if(document.pointerLockElement) document.exitPointerLock();
    const inp = document.getElementById('guide-input');
    if(!this._history.length) this._push('bot', '안녕! 포케크래프트 도우미예요 🤖\n"리자몽 어떻게 진화해?", "다이아 어디서 캐?", "하이퍼볼 만드는 법"처럼 물어보세요!');
    this._render();
    setTimeout(() => inp && inp.focus(), 60);
  },
  _push(who, text){ this._history.push({ who, text }); if(this._history.length > 60) this._history.shift(); },
  _render(){
    const log = document.getElementById('guide-log');
    if(!log) return;
    log.innerHTML = this._history.map(m =>
      '<div class="guide-msg ' + m.who + '">' + (m.who === 'bot' ? '🤖 ' : '🙋 ') +
      m.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</div>').join('');
    log.scrollTop = log.scrollHeight;
  },
  async submit(){
    if(this._busy) return;
    const inp = document.getElementById('guide-input');
    const q = (inp.value || '').trim();
    if(!q) return;
    inp.value = '';
    this._push('me', q);
    this._render();
    this._busy = true;
    this._push('bot', this.aiKey() ? '생각 중...' : '...');
    this._render();
    const ans = await this.askAI(q);
    this._history.pop();
    this._push('bot', ans);
    this._busy = false;
    this._render();
  },
  init(){
    const send = document.getElementById('guide-send');
    const inp = document.getElementById('guide-input');
    if(send) send.onclick = () => this.submit();
    if(inp) inp.addEventListener('keydown', e => {
      e.stopPropagation();
      if(e.key === 'Enter') this.submit();
      if(e.key === 'Escape'){ UI.close(); if(game.started && !player.dead) requestLock(); }
    });
    const keyBtn = document.getElementById('guide-key-btn');
    if(keyBtn) keyBtn.onclick = () => {
      const cur = this.aiKey();
      const k = prompt('AI 키 (OpenAI sk-... 또는 Anthropic sk-ant-...)\n키는 이 브라우저에만 저장돼요. 비우면 내장 답변만 사용.', cur);
      if(k !== null){ this.setAiKey(k); UI.toast(k ? '🔑 AI 키 저장! 이제 진짜 AI가 답해요' : 'AI 키 삭제 — 내장 답변 사용'); }
    };
  }
};
