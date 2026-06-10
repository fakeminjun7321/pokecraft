// ===== util.js : 난수, 노이즈, 헬퍼, 사운드 =====
'use strict';

function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
function lerp(a, b, t){ return a + (b - a) * t; }
function smoothT(t){ return t * t * (3 - 2 * t); }
function dist3(ax, ay, az, bx, by, bz){ const dx=ax-bx, dy=ay-by, dz=az-bz; return Math.sqrt(dx*dx+dy*dy+dz*dz); }
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

function mulberry32(a){
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashInt(x){
  x |= 0;
  x = Math.imul(x ^ x >>> 16, 0x45d9f3b);
  x = Math.imul(x ^ x >>> 16, 0x45d9f3b);
  return (x ^ x >>> 16) >>> 0;
}
function rand2(x, z, seed){
  return hashInt((Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 1442695041)) | 0) / 4294967296;
}
function rand3(x, y, z, seed){
  return hashInt((Math.imul(x, 374761393) ^ Math.imul(y, 1103515245) ^ Math.imul(z, 668265263) ^ Math.imul(seed, 1442695041)) | 0) / 4294967296;
}
// 문자열 시드 → 정수
function strSeed(s){
  s = String(s);
  let h = 0;
  for(let i = 0; i < s.length; i++){ h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; }
  return h || 1;
}

// 2D 값 노이즈 (+fbm)
class Noise2 {
  constructor(seed){ this.seed = seed | 0; }
  noise(x, z){
    const xi = Math.floor(x), zi = Math.floor(z);
    const tx = smoothT(x - xi), tz = smoothT(z - zi);
    const a = rand2(xi, zi, this.seed),     b = rand2(xi + 1, zi, this.seed);
    const c = rand2(xi, zi + 1, this.seed), d = rand2(xi + 1, zi + 1, this.seed);
    return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
  }
  fbm(x, z, oct){
    oct = oct || 4;
    let amp = 1, sum = 0, tot = 0;
    for(let i = 0; i < oct; i++){
      sum += this.noise(x, z) * amp; tot += amp;
      amp *= 0.5; x = x * 2.03 + 31.7; z = z * 2.03 + 17.3;
    }
    return sum / tot;
  }
}

// 3D 값 노이즈 (동굴용)
function noise3(x, y, z, seed){
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const tx = smoothT(x - xi), ty = smoothT(y - yi), tz = smoothT(z - zi);
  const v000 = rand3(xi, yi, zi, seed),       v100 = rand3(xi+1, yi, zi, seed);
  const v010 = rand3(xi, yi+1, zi, seed),     v110 = rand3(xi+1, yi+1, zi, seed);
  const v001 = rand3(xi, yi, zi+1, seed),     v101 = rand3(xi+1, yi, zi+1, seed);
  const v011 = rand3(xi, yi+1, zi+1, seed),   v111 = rand3(xi+1, yi+1, zi+1, seed);
  return lerp(
    lerp(lerp(v000, v100, tx), lerp(v010, v110, tx), ty),
    lerp(lerp(v001, v101, tx), lerp(v011, v111, tx), ty), tz);
}

// ===== 사운드 (WebAudio 신스) =====
const SFX = {
  ctx: null, on: true,
  init(){
    if(!this.on) return;
    if(!this.ctx){
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e){ this.on = false; return; }
    }
    if(this.ctx.state === 'suspended') this.ctx.resume();
  },
  tone(freq, dur, type, vol, slideTo){
    if(!this.on || !this.ctx) return;
    type = type || 'square'; vol = vol === undefined ? 0.12 : vol;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur + 0.03);
  },
  burst(dur, vol, freqLow){
    if(!this.on || !this.ctx) return;
    const sr = this.ctx.sampleRate, n = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    for(let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freqLow || 800;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.2;
    src.connect(f); f.connect(g); g.connect(this.ctx.destination);
    src.start();
  },
  seq(notes, dur, type, vol){ // 멜로디
    notes.forEach((f, i) => setTimeout(() => this.tone(f, dur, type || 'square', vol || 0.1), i * dur * 700));
  },
  play(name){
    if(!this.on || !this.ctx) return;
    switch(name){
      case 'dig':    this.tone(170, 0.07, 'square', 0.06, 120); break;
      case 'break':  this.tone(220, 0.12, 'square', 0.1, 90); break;
      case 'place':  this.tone(260, 0.09, 'square', 0.09, 200); break;
      case 'pop':    this.tone(520, 0.08, 'sine', 0.14, 900); break;
      case 'hurt':   this.tone(190, 0.18, 'sawtooth', 0.14, 80); break;
      case 'hit':    this.tone(140, 0.1, 'square', 0.1, 70); break;
      case 'eat':    this.tone(330, 0.06, 'square', 0.08, 240); setTimeout(()=>this.tone(300,0.06,'square',0.08,220), 90); break;
      case 'throw':  this.tone(600, 0.15, 'sine', 0.1, 200); break;
      case 'catch':  this.tone(700, 0.08, 'square', 0.1); break;
      case 'caught': this.seq([523, 659, 784, 1047], 0.13, 'square', 0.12); break;
      case 'fail':   this.tone(300, 0.25, 'sawtooth', 0.12, 120); break;
      case 'level':  this.seq([523, 659, 784], 0.1, 'square', 0.11); break;
      case 'evolve': this.seq([392, 494, 587, 784, 988], 0.12, 'square', 0.12); break;
      case 'boom':   this.burst(0.6, 0.35, 500); this.tone(60, 0.5, 'sine', 0.3, 30); break;
      case 'click':  this.tone(800, 0.04, 'square', 0.07); break;
      case 'splash': this.burst(0.25, 0.12, 1200); break;
      case 'faint':  this.tone(400, 0.4, 'square', 0.12, 90); break;
      case 'fuse':   this.tone(1200, 0.1, 'square', 0.07); break;
    }
  }
};
