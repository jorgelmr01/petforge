// PETFORGE — Den screen: home, pet rendering, care interactions.

import { G, Screen } from '../main';
import { FOODS, FOOD_PRICE, FoodId, HABITATS } from '../game/data';
import {
  PetState, addShards, avgNeeds, clamp, gainBond, moodOf, petLine,
  powerOf, saveStateSoon,
} from '../game/state';
import { sfx } from '../game/audio';
import { drawPet, drawShadow } from '../game/sprites';

type Mode = 'idle' | 'feedfly' | 'play' | 'clean';

interface Ix {
  mode: Mode;
  hop: number;            // 0..1 progress, -1 = inactive
  squash: number;         // decays
  cheer: number;
  sleepT: number;
  feedFly: { food: FoodId; t: number } | null;
  pendingFeed: { food: FoodId; fav: boolean } | null;
  chomp: number;
  playTargets: { x: number; y: number; id: number }[];
  playT: number;
  cleanT: number;
  brush: { x: number; y: number } | null;
  zzzT: number;
  ambientT: number;
  evoFlash: number;
  lastSleepUi: number;
}

const NEED_META = [
  { key: 'hunger', icon: '🍖', label: 'Food' },
  { key: 'happy', icon: '😊', label: 'Fun' },
  { key: 'clean', icon: '🫧', label: 'Clean' },
  { key: 'energy', icon: '⚡', label: 'Rest' },
] as const;

export function make(): Screen {
  const g = () => G.ctx!;
  const el = document.createElement('div');
  el.className = 'screen';

  const ix: Ix = {
    mode: 'idle', hop: -1, squash: 0, cheer: 0, sleepT: 0,
    feedFly: null, chomp: 0, playTargets: [], playT: 0,
    pendingFeed: null,
    cleanT: 0, brush: null, zzzT: 0, ambientT: 0, evoFlash: 0, lastSleepUi: -1,
  };
  let barEls: Record<string, { fill: HTMLElement; val: HTMLElement }> = {};
  let bubbleEl: HTMLElement;
  let hudEl: HTMLElement;
  let uiTimer: number;
  let bubbleTimer: number;

  const state = (): PetState => g().state;
  const traitIds = () => Object.values(state().traits).filter(Boolean) as string[];

  function needColor(v: number) {
    return v >= 60 ? 'linear-gradient(90deg,#5fe08a,#2ea86a)' : v >= 30 ? 'linear-gradient(90deg,#ffb02e,#e08b12)' : 'linear-gradient(90deg,#ff6b6b,#c92a2a)';
  }

  function mount() {
    el.innerHTML = `
      <div class="hud" id="hud"></div>
      <div class="needs" id="needs"></div>
      <div class="bubble-wrap"><div class="speech" id="bubble">…</div></div>
      <div class="actionbar" id="actions"></div>
    `;
    hudEl = el.querySelector('#hud')!;
    const needsEl = el.querySelector('#needs')!;
    barEls = {};
    for (const m of NEED_META) {
      const d = document.createElement('div');
      d.className = 'need';
      d.innerHTML = `<span class="ico">${m.icon}</span><div class="bar"><div class="fill"></div></div><span class="val"></span>`;
      needsEl.appendChild(d);
      barEls[m.key] = { fill: d.querySelector('.fill')!, val: d.querySelector('.val')! };
    }
    bubbleEl = el.querySelector('#bubble')!;
    renderHud();
    refreshNeeds();
    setBubble(petLine(state()));

    const acts = el.querySelector('#actions')!;
    const defs = [
      { id: 'feed', e: '🍖', l: 'Feed' },
      { id: 'play', e: '🎾', l: 'Play' },
      { id: 'clean', e: '🫧', l: 'Clean' },
      { id: 'rest', e: '😴', l: 'Rest' },
    ];
    for (const d of defs) {
      const b = document.createElement('button');
      b.className = 'act-btn';
      b.id = `act-${d.id}`;
      b.innerHTML = `<span class="e">${d.e}</span>${d.l}`;
      b.onclick = () => onAction(d.id as 'feed' | 'play' | 'clean' | 'rest');
      acts.appendChild(b);
    }

    uiTimer = window.setInterval(() => { renderHud(); refreshNeeds(); }, 1000);
    bubbleTimer = window.setInterval(() => { if (ix.mode === 'idle') setBubble(petLine(state())); }, 18000);
  }

  function renderHud() {
    const s = state();
    const mood = moodOf(s);
    hudEl.innerHTML = `
      <div class="pet-tag">${escapeHtml(s.name)} <span class="form-badge">${s.form === 'prime' ? 'PRIME' : 'SPROUT'}</span></div>
      <div class="spacer"></div>
      <div class="chip" id="shard-chip">💎 ${s.shards}</div>
      <div class="chip">⚡${powerOf(s)}</div>
      <div class="chip">${mood.face}</div>
    `;
  }

  function refreshNeeds() {
    const s = state();
    for (const m of NEED_META) {
      const v = Math.round(s.needs[m.key]);
      barEls[m.key].fill.style.width = `${v}%`;
      barEls[m.key].fill.style.background = needColor(v);
      barEls[m.key].val.textContent = `${v}`;
    }
  }

  function setBubble(t: string) {
    bubbleEl.style.animation = 'none';
    void bubbleEl.offsetWidth;
    bubbleEl.textContent = t;
    bubbleEl.style.animation = '';
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));
  }

  function wakeIfSleeping() {
    const s = state();
    if (s.sleeping) { s.sleeping = false; s.stats.rests++; g().toast('Wakey wakey! ☀️'); }
  }

  // ---------------- actions ----------------

  function onAction(a: 'feed' | 'play' | 'clean' | 'rest') {
    const s = state();
    sfx.unlock();
    if (a === 'rest') { toggleRest(); return; }
    if (ix.mode !== 'idle') { g().toast('One thing at a time!'); return; }
    wakeIfSleeping();
    if (a === 'feed') openFeedSheet();
    else if (a === 'play') startPlay();
    else if (a === 'clean') startClean();
  }

  function openFeedSheet() {
    const s = state();
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.innerHTML = `<div class="sheet"><div class="grab"></div><h2>🍖 Feed ${escapeHtml(s.name)}</h2>
      <div class="sub">Favorite food gives extra love. Costs ${FOOD_PRICE} 💎 each.</div><div class="food-row"></div></div>`;
    const row = ov.querySelector('.food-row')!;
    for (const f of Object.values(FOODS)) {
      const fav = f.id === (Object.values(FOODS).find((x) => x.id === f.id) && speciesFav());
      const card = document.createElement('button');
      card.className = 'food-card' + (fav ? ' fav' : '');
      const img = g().assets.foods.get(`food_${f.id}`);
      card.innerHTML = `${img ? `<img src="${img.src}" alt="">` : `<div style="font-size:40px">🍽️</div>`}
        <div class="fn">${f.name}${fav ? ' ⭐' : ''}</div><div class="fd">+${f.hunger}${fav ? '+10' : ''} food</div><div class="fp">💎 ${f.price}</div>`;
      card.onclick = () => {
        if (s.shards < f.price) { sfx.play('error'); g().toast('Not enough shards! Play or win trials 💎'); return; }
        s.shards -= f.price;
        ov.remove();
        doFeed(f.id, fav);
      };
      row.appendChild(card);
    }
    ov.addEventListener('pointerdown', (e) => { if (e.target === ov) ov.remove(); });
    el.appendChild(ov);
    sfx.play('pop');
  }

  function speciesFav(): FoodId {
    const map = { embercub: 'ember_berry', tidepup: 'tide_cake', galekit: 'gale_fruit' } as Record<string, FoodId>;
    return map[state().species];
  }

  function doFeed(food: FoodId, fav: boolean) {
    ix.mode = 'feedfly';
    ix.feedFly = { food, t: 0 };
    ix.pendingFeed = { food, fav };
    sfx.play('pop');
  }

  function finishFeed() {
    const s = state();
    const pf = ix.pendingFeed;
    if (!pf) { ix.mode = 'idle'; return; }
    const { food, fav } = pf;
    const f = FOODS[food];
    s.needs.hunger = clamp(s.needs.hunger + f.hunger + (fav ? 10 : 0), 0, 100);
    s.stats.feeds++;
    const got = addShards(s, 8);
    const { evolved } = gainBond(s, 10);
    ix.chomp = 1;
    sfx.play('eat');
    const a = g().petAnchor();
    g().particles.burst(a.x, a.y - 120, 'heart', fav ? 8 : 4, { color: '#ff8fb2' });
    g().toast(`+${got} 💎  ${fav ? 'Favorite! Extra love ⭐' : 'Yum!'}`);
    setBubble(fav ? 'MY FAVORITE!! *happy dance*' : '*chomp chomp* …more?');
    if (evolved) onEvolve();
    saveStateSoon(s); refreshNeeds(); renderHud();
  }

  function startPlay() {
    const s = state();
    ix.mode = 'play';
    ix.playT = 12;
    ix.playTargets = [];
    const a = g().petAnchor();
    for (let i = 0; i < 6; i++) {
      ix.playTargets.push({
        x: a.x + (Math.random() - 0.5) * a.scale * 220,
        y: a.y - 60 - Math.random() * a.scale * 160,
        id: i,
      });
    }
    setBubble('Tap the sparkles! ✨ (12s)');
    sfx.play('sparkle');
  }

  function finishPlay(caught: number) {
    const s = state();
    const happy = caught * 4;
    s.needs.happy = clamp(s.needs.happy + happy, 0, 100);
    s.needs.energy = clamp(s.needs.energy - 10, 0, 100);
    s.stats.plays++;
    const got = addShards(s, 6 + caught * 2);
    const { evolved } = gainBond(s, 12);
    ix.mode = 'idle';
    ix.cheer = 1;
    sfx.play('happy');
    g().toast(`Caught ${caught}/6! +${got} 💎`);
    setBubble(caught >= 5 ? 'I am the sparkle champion!!' : caught >= 3 ? 'That was fun!' : '…I am not athletic.');
    if (evolved) onEvolve();
    saveStateSoon(s); refreshNeeds(); renderHud();
  }

  function startClean() {
    ix.mode = 'clean';
    ix.cleanT = 4;
    setBubble('Scrub-a-dub! Move your finger! 🫧');
    sfx.play('pop');
  }

  function finishClean() {
    const s = state();
    s.needs.clean = clamp(s.needs.clean + 35, 0, 100);
    s.stats.cleans++;
    const got = addShards(s, 8);
    const { evolved } = gainBond(s, 10);
    ix.mode = 'idle';
    ix.brush = null;
    sfx.play('sparkle');
    const a = g().petAnchor();
    g().particles.burst(a.x, a.y - 100, 'spark', 14, { color: '#bff3ff' });
    g().toast(`Squeaky clean! +${got} 💎`);
    setBubble('*sparkles* I\'m so fresh!');
    if (evolved) onEvolve();
    saveStateSoon(s); refreshNeeds(); renderHud();
  }

  function toggleRest() {
    const s = state();
    s.sleeping = !s.sleeping;
    if (s.sleeping) { sfx.play('sleep'); setBubble('Night night… 💤'); }
    else {
      s.stats.rests++;
      const got = addShards(s, 6);
      gainBond(s, 8);
      sfx.play('happy');
      g().toast(`Rested! +${got} 💎`);
      setBubble('*big stretch* I feel amazing!');
      saveStateSoon(s); refreshNeeds(); renderHud();
    }
    saveStateSoon(s); renderHud();
  }

  function onEvolve() {
    const s = state();
    ix.evoFlash = 1;
    sfx.play('fanfare');
    const got = addShards(s, 200);
    setBubble('WHOA… I feel… POWERFUL!! ⚡');
    g().toast(`🌟 EVOLUTION! ${s.name} became PRIME! +${got} 💎`);
    const a = g().petAnchor();
    g().particles.burst(a.x, a.y - 120, 'star', 30, { color: '#ffb02e' });
    g().particles.burst(a.x, a.y - 120, 'ring', 3, { color: '#b366ff', size: 60 });
    saveStateSoon(s);
  }

  function petTap(x: number, y: number): boolean {
    const a = g().petAnchor();
    const dx = x - a.x, dy = y - (a.y - 70 * a.scale);
    if (dx * dx + dy * dy > Math.pow(95 * a.scale, 2)) return false;
    const s = state();
    if (s.sleeping) { toggleRest(); return true; }
    if (ix.mode !== 'idle') return true;
    ix.hop = 0;
    ix.squash = 0.55;
    s.stats.pets++;
    const { evolved } = gainBond(s, 2);
    g().particles.burst(a.x, a.y - 150 * a.scale, 'heart', 5, { color: '#ff8fb2' });
    sfx.play(Math.random() < 0.3 ? 'happy' : 'tap');
    if (s.stats.pets % 10 === 0) { const got = addShards(s, 5); g().toast(`+${got} 💎 for the love!`); g().bumpShards(); }
    if (evolved) onEvolve();
    saveStateSoon(s); renderHud();
    return true;
  }

  // ---------------- per-frame ----------------

  function drawScene(ctx: CanvasRenderingContext2D, t: number, dt: number, w: number, h: number) {
    const s = state();
    const a = g().petAnchor();
    const P = g().particles;

    // habitat background (cover)
    const hab = g().assets.habitats.get(s.habitat);
    if (hab) {
      const sc = Math.max(w / hab.width, h / hab.height);
      const dw = hab.width * sc, dh = hab.height * sc;
      ctx.drawImage(hab, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#241b3a'); grad.addColorStop(1, '#14101f');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    }

    // ambient particles
    ix.ambientT -= dt;
    if (ix.ambientT <= 0) {
      ix.ambientT = 0.25;
      const amb = HABITATS[s.habitat].ambient;
      if (amb === 'embers') P.spawn({ x: Math.random() * w, y: h * 0.75, kind: 'ember', color: Math.random() < 0.5 ? '#ffb02e' : '#ff6b35', size: 5 + Math.random() * 6, vy: -30 - Math.random() * 30, vx: (Math.random() - 0.5) * 20, maxLife: 2.5 });
      else if (amb === 'bubbles') P.spawn({ x: Math.random() * w, y: h, kind: 'bubble', color: 'rgba(160,230,255,.7)', size: 6 + Math.random() * 10, vy: -40 - Math.random() * 40, vx: Math.sin(t / 500) * 10, maxLife: 4 });
      else P.spawn({ x: Math.random() * w, y: -10, kind: 'leaf', color: 'rgba(190,160,255,.6)', size: 8 + Math.random() * 8, vy: 30 + Math.random() * 30, vx: (Math.random() - 0.5) * 30, maxLife: 6, grav: 4 });
    }

    // den floor glow
    const fg = ctx.createRadialGradient(a.x, a.y, 10, a.x, a.y, 190 * a.scale);
    fg.addColorStop(0, 'rgba(255,176,46,.10)');
    fg.addColorStop(1, 'rgba(255,176,46,0)');
    ctx.fillStyle = fg;
    ctx.fillRect(a.x - 200 * a.scale, a.y - 200 * a.scale, 400 * a.scale, 220 * a.scale);

    // hop progress
    let hop = 0;
    if (ix.hop >= 0) {
      ix.hop += dt / 0.45;
      if (ix.hop >= 1) ix.hop = -1; else hop = ix.hop;
    }
    ix.squash = Math.max(0, ix.squash - dt * 2.2);
    let chompSquash = 0;
    if (ix.chomp > 0) {
      ix.chomp -= dt / 0.7;
      chompSquash = Math.abs(Math.sin(ix.chomp * Math.PI * 3)) * 0.5 * Math.max(0, ix.chomp);
    }
    if (ix.cheer > 0) ix.cheer = Math.max(0, ix.cheer - dt / 1.1);

    drawShadow(ctx, a.x, a.y, a.scale, hop);

    // sleep energy regen
    if (s.sleeping) {
      ix.sleepT += dt;
      s.needs.energy = clamp(s.needs.energy + dt * (40 / 30), 0, 100);
      ix.zzzT -= dt;
      if (ix.zzzT <= 0) { ix.zzzT = 1.1; P.spawn({ x: a.x + 40 * a.scale, y: a.y - 130 * a.scale, kind: 'zzz', color: '#b9aec9', size: 16, vy: -25, vx: 12, maxLife: 1.6 }); }
      if (Math.floor(ix.sleepT) !== ix.lastSleepUi) { ix.lastSleepUi = Math.floor(ix.sleepT); refreshNeeds(); }
    }

    drawPet(ctx, g().assets, s.species, s.form, traitIds(), {
      x: a.x, y: a.y, scale: a.scale * 1.35, t,
      hop, squash: ix.squash + chompSquash, sleeping: s.sleeping,
      cheer: ix.cheer > 0 ? 1 - ix.cheer : 0,
    });

    // feed fly animation
    if (ix.feedFly) {
      ix.feedFly.t += dt / 0.6;
      const ft = ix.feedFly.t;
      const img = g().assets.foods.get(`food_${ix.feedFly.food}`);
      const sx = a.x, sy = h + 40;
      const ex = a.x + 20 * a.scale, ey = a.y - 90 * a.scale;
      const px = sx + (ex - sx) * ft;
      const py = sy + (ey - sy) * ft - Math.sin(ft * Math.PI) * 120;
      if (img) {
        const sz = 64 * a.scale * (1 - ft * 0.3);
        ctx.drawImage(img, px - sz / 2, py - sz / 2, sz, sz);
      } else {
        ctx.font = `${48 * a.scale}px serif`; ctx.textAlign = 'center';
        ctx.fillText('🍖', px, py);
      }
      if (ft >= 1) { ix.feedFly = null; ix.mode = 'idle'; finishFeed(); }
    }

    // play targets
    if (ix.mode === 'play') {
      ix.playT -= dt;
      ctx.save();
      for (const tg of ix.playTargets) {
        const pulse = 1 + Math.sin(t / 200 + tg.id) * 0.15;
        drawSparkleIcon(ctx, tg.x, tg.y, 26 * pulse, '#ffe066');
      }
      ctx.restore();
      if (ix.playT <= 0) finishPlay(6 - ix.playTargets.length);
    }

    // clean brush
    if (ix.mode === 'clean') {
      ix.cleanT -= dt;
      if (ix.brush && Math.random() < 0.5) {
        P.spawn({ x: ix.brush.x + (Math.random() - 0.5) * 60, y: ix.brush.y + (Math.random() - 0.5) * 60, kind: 'bubble', color: 'rgba(190,240,255,.85)', size: 8 + Math.random() * 12, vy: -25, maxLife: 1.2 });
      }
      if (ix.brush) {
        ctx.font = `${44}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🧽', ix.brush.x, ix.brush.y);
      }
      // progress ring
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(a.x, a.y - 190 * a.scale, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#bff3ff';
      ctx.beginPath(); ctx.arc(a.x, a.y - 190 * a.scale, 26, -Math.PI / 2, -Math.PI / 2 + (1 - ix.cleanT / 4) * Math.PI * 2); ctx.stroke();
      ctx.restore();
      if (ix.cleanT <= 0) finishClean();
    }

    // evolution flash
    if (ix.evoFlash > 0) {
      ix.evoFlash -= dt / 1.2;
      ctx.fillStyle = `rgba(255,244,214,${Math.max(0, ix.evoFlash) * 0.75})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawSparkleIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 12;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? s / 2 : s / 5;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function onTap(x: number, y: number) {
    // play targets first
    if (ix.mode === 'play') {
      for (let i = ix.playTargets.length - 1; i >= 0; i--) {
        const tg = ix.playTargets[i];
        if ((x - tg.x) ** 2 + (y - tg.y) ** 2 < 34 * 34) {
          ix.playTargets.splice(i, 1);
          g().particles.burst(tg.x, tg.y, 'spark', 8, { color: '#ffe066' });
          sfx.play('pop');
          if (ix.playTargets.length === 0) finishPlay(6);
          return;
        }
      }
      return;
    }
    if (ix.mode !== 'idle' || ix.feedFly) return;
    petTap(x, y);
  }

  function onMove(x: number, y: number) {
    if (ix.mode === 'clean') ix.brush = { x, y };
  }

  return {
    name: 'den',
    mount(root) { root.appendChild(el); mount(); },
    unmount() {
      window.clearInterval(uiTimer);
      window.clearInterval(bubbleTimer);
      el.querySelectorAll('.overlay').forEach((o) => o.remove());
    },
    draw: drawScene,
    onTap,
    onMove,
  };
}
