// PETFORGE — Trait Forge: buy traits, fuse them onto your pet.

import { G, Screen } from '../main';
import { RARITY_META, SLOT_LABEL, Slot, TRAITS, Trait, traitById } from '../game/data';
import { addShards, clamp, gainBond, powerOf, saveStateSoon } from '../game/state';
import { sfx } from '../game/audio';
import { drawPet } from '../game/sprites';

export function make(): Screen {
  const g = () => G.ctx!;
  const el = document.createElement('div');
  el.className = 'page';
  let slot: Slot = 'wings';
  let listEl: HTMLElement;
  let headEl: HTMLElement;

  const state = () => g().state;
  const traitIds = () => Object.values(state().traits).filter(Boolean) as string[];

  function mount() {
    el.innerHTML = `
      <div class="page-head" id="forge-head"></div>
      <div class="slot-tabs" id="slot-tabs"></div>
      <div class="trait-list" id="trait-list"></div>
    `;
    headEl = el.querySelector('#forge-head')!;
    const tabs = el.querySelector('#slot-tabs')!;
    listEl = el.querySelector('#trait-list')!;
    for (const s of Object.keys(SLOT_LABEL) as Slot[]) {
      const b = document.createElement('button');
      b.className = 'slot-tab' + (s === slot ? ' on' : '');
      b.textContent = `${slotEmoji(s)} ${SLOT_LABEL[s]}`;
      b.onclick = () => { slot = s; sfx.play('tap'); mount(); };
      tabs.appendChild(b);
    }
    renderHead();
    renderList();
  }

  function slotEmoji(s: Slot) {
    return { crown: '👑', wings: '🪽', aura: '💫', armor: '🛡️', tail: '☄️', eyes: '👁️' }[s];
  }

  function renderHead() {
    const s = state();
    headEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1"><h1>⚒️ Trait Forge</h1>
        <div class="sub">Buy traits. Fuse them. Become legend.</div></div>
        <div class="chip" id="shard-chip">💎 ${s.shards}</div>
        <div class="chip">⚡${powerOf(s)}</div>
      </div>`;
  }

  function renderList() {
    const s = state();
    listEl.innerHTML = '';
    const traits = TRAITS.filter((t) => t.slot === slot);
    for (const t of traits) {
      const meta = RARITY_META[t.rarity];
      const owned = s.ownedTraits.includes(t.id);
      const equipped = s.traits[t.slot] === t.id;
      const locked = !!t.requiresPrime && s.form !== 'prime';

      const card = document.createElement('div');
      card.className = 'trait-card';
      card.style.borderColor = equipped ? meta.color : 'rgba(255,255,255,.09)';
      if (equipped) card.style.boxShadow = `0 0 14px ${meta.color}55`;

      const art = document.createElement('div');
      art.className = 'art';
      const img = g().assets.strips.get(t.id);
      if (img) {
        const c = document.createElement('canvas');
        c.width = 96; c.height = 96;
        const c2 = c.getContext('2d')!;
        c2.imageSmoothingEnabled = false;
        // draw frame 0 cropped to the trait's bounding area: draw full cell scaled
        c2.drawImage(img, 0, 0, 96, 96, 6, 6, 84, 84);
        art.appendChild(c);
      } else {
        art.textContent = slotEmoji(t.slot);
        art.style.fontSize = '34px';
      }

      const info = document.createElement('div');
      info.className = 'info';
      info.innerHTML = `
        <div class="nm">${t.name}</div>
        <div class="ds">${t.desc}</div>
        <div class="meta">
          <span class="rar" style="background:${meta.color}22;color:${meta.color};border:1px solid ${meta.color}66">${meta.label}</span>
          <span style="color:#ffd97a">+${meta.power} ⚡</span>
        </div>
        ${locked ? `<div class="locked-note">🔒 Evolve to PRIME (Bond 5) to forge</div>` : ''}`;

      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.flexDirection = 'column';
      actions.style.gap = '6px';

      if (locked) {
        const b = document.createElement('button');
        b.className = 'btn small ghost'; b.disabled = true; b.textContent = '🔒';
        actions.appendChild(b);
      } else if (equipped) {
        const b = document.createElement('button');
        b.className = 'btn small ghost'; b.textContent = 'Unequip';
        b.onclick = () => { s.traits[t.slot] = null; sfx.play('pop'); saveStateSoon(s); mount(); };
        actions.appendChild(b);
        const sell = document.createElement('button');
        sell.className = 'btn small ghost'; sell.textContent = `Sell +${Math.floor(meta.price * 0.4)}💎`;
        sell.onclick = () => sellTrait(t);
        actions.appendChild(sell);
      } else if (owned) {
        const b = document.createElement('button');
        b.className = 'btn small'; b.textContent = 'Equip';
        b.onclick = () => { s.traits[t.slot] = t.id; sfx.play('pop'); g().toast(`${t.name} equipped!`); saveStateSoon(s); mount(); };
        actions.appendChild(b);
      } else {
        const b = document.createElement('button');
        b.className = 'btn small'; b.textContent = `Fuse 💎${meta.price}`;
        b.disabled = s.shards < meta.price;
        b.onclick = () => buyAndFuse(t);
        actions.appendChild(b);
      }

      card.append(art, info, actions);
      listEl.appendChild(card);
    }
    // footer note
    const note = document.createElement('div');
    note.style.cssText = 'text-align:center;color:#b9aec9;font-size:12px;padding:8px';
    note.textContent = 'Only one trait per slot. Selling refunds 40%.';
    listEl.appendChild(note);
  }

  function sellTrait(t: Trait) {
    const s = state();
    const meta = RARITY_META[t.rarity];
    if (s.traits[t.slot] === t.id) s.traits[t.slot] = null;
    s.ownedTraits = s.ownedTraits.filter((id) => id !== t.id);
    const refund = Math.floor(meta.price * 0.4);
    s.shards += refund;
    sfx.play('coin');
    g().toast(`Sold ${t.name} +${refund}💎`);
    saveStateSoon(s);
    mount();
  }

  function buyAndFuse(t: Trait) {
    const s = state();
    const meta = RARITY_META[t.rarity];
    if (s.shards < meta.price) { sfx.play('error'); g().toast('Not enough shards!'); return; }
    s.shards -= meta.price;
    playFusion(t, () => {
      s.ownedTraits.push(t.id);
      s.traits[t.slot] = t.id;
      s.stats.fusions++;
      const { evolved } = gainBond(s, 15);
      const got = addShards(s, 10);
      saveStateSoon(s);
      mount();
      g().toast(`⚡ +${meta.power} power! (+${got}💎 forge bonus)`);
      if (evolved) g().toast('🌟 EVOLUTION! Your pet became PRIME!');
    });
  }

  /** The fusion ceremony: scan-lines, rising particles, flash, reveal. */
  function playFusion(t: Trait, done: () => void) {
    const s = state();
    const meta = RARITY_META[t.rarity];
    const ov = document.createElement('div');
    ov.className = 'overlay center';
    ov.innerHTML = `<div style="text-align:center">
      <div class="fusion-stage"><canvas width="384" height="384"></canvas></div>
      <div class="fusion-label">FUSING…</div>
      <div style="color:#b9aec9;font-size:13px;margin-top:6px">${t.name} × ${s.name}</div>
    </div>`;
    el.appendChild(ov);
    const canvas = ov.querySelector('canvas')!;
    const c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    sfx.play('fuse');

    const t0 = performance.now();
    const DUR = 2600;
    const newTraits = [...traitIds(), t.id];

    const loop = (now: number) => {
      if (!ov.isConnected) return;
      const e = (now - t0) / DUR;
      const w = 384, h = 384;
      c.clearRect(0, 0, w, h);
      // backdrop
      const bg = c.createRadialGradient(w/2, h/2, 20, w/2, h/2, 200);
      bg.addColorStop(0, meta.color + '33');
      bg.addColorStop(1, 'rgba(10,6,20,0)');
      c.fillStyle = bg;
      c.fillRect(0, 0, w, h);

      if (e < 0.55) {
        // phase 1: pet on pedestal, scan lines sweep
        drawPet(c, g().assets, s.species, s.form, traitIds(), { x: w/2, y: h*0.82, scale: 2.2, t: now });
        const sy = (e / 0.55) * h;
        c.fillStyle = meta.color + '44';
        c.fillRect(0, sy - 14, w, 28);
        c.fillStyle = '#fff';
        c.fillRect(0, sy - 2, w, 4);
        if (Math.random() < 0.5) {
          g().particles.spawn({ x: Math.random() * w, y: h, kind: 'spark', color: meta.color, size: 8 + Math.random() * 8, vy: -90 - Math.random() * 60, maxLife: 1 });
        }
      } else if (e < 0.8) {
        // phase 2: white flash build
        const k = (e - 0.55) / 0.25;
        drawPet(c, g().assets, s.species, s.form, traitIds(), { x: w/2, y: h*0.82, scale: 2.2, t: now, alpha: 1 - k * 0.4 });
        c.fillStyle = `rgba(255,250,235,${k * 0.9})`;
        c.fillRect(0, 0, w, h);
        g().particles.burst(w/2, h/2, 'star', 2, { color: meta.color });
      } else {
        // phase 3: reveal with new trait
        const k = Math.min(1, (e - 0.8) / 0.2);
        if (k >= 1 && !(loop as any).shing) { (loop as any).shing = true; sfx.play('sparkle'); }
        c.fillStyle = `rgba(255,250,235,${(1 - k) * 0.9})`;
        c.fillRect(0, 0, w, h);
        const pop = 1 + Math.sin(Math.min(1, k) * Math.PI) * 0.25;
        drawPet(c, g().assets, s.species, s.form, newTraits, { x: w/2, y: h*0.82, scale: 2.2 * pop, t: now, cheer: 1 - k });
        if (Math.random() < 0.4) {
          g().particles.spawn({ x: w/2 + (Math.random()-0.5)*160, y: h*0.6, kind: 'star', color: meta.color, size: 10, vy: -60, maxLife: 1 });
        }
      }
      // particles draw (screen-space = canvas-space here since overlay canvas is separate)
      g().particles.update(1/60);
      g().particles.draw(c);

      if (e < 1) requestAnimationFrame(loop);
      else {
        ov.querySelector('.fusion-label')!.textContent = '✨ FUSED! ✨';
        setTimeout(() => { ov.remove(); done(); }, 900);
      }
    };
    requestAnimationFrame(loop);
  }

  return {
    name: 'forge',
    mount(root) { root.appendChild(el); mount(); },
    unmount() {},
  };
}

// keep TS happy about unused import
void clamp;
void traitById;
