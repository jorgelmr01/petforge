// PETFORGE — Keeper screen: pet card, power breakdown, habitats, stats, settings.

import { G, Screen } from '../main';
import { HABITATS, HabitatId, SLOT_LABEL, Slot, traitById } from '../game/data';
import { PetState, avgNeeds, bondXpNeeded, powerBreakdown, powerOf, resetSave, saveState } from '../game/state';
import { sfx } from '../game/audio';
import { drawPet } from '../game/sprites';

export function make(): Screen {
  const g = () => G.ctx!;
  const el = document.createElement('div');
  el.className = 'page';
  let raf = 0;
  let previewCanvas: HTMLCanvasElement | null = null;

  const state = (): PetState => g().state;

  function mount() {
    const s = state();
    el.innerHTML = `
      <div class="page-head"><h1>🧙 Keeper</h1><div class="sub">Your legend, on record.</div></div>
      <div class="keeper-scroll" id="kscroll"></div>
    `;
    render();
    const loop = (t: number) => {
      if (previewCanvas && previewCanvas.isConnected) {
        const c = previewCanvas.getContext('2d')!;
        c.clearRect(0, 0, 190, 190);
        c.imageSmoothingEnabled = false;
        drawPet(c, g().assets, s.species, s.form, Object.values(s.traits).filter(Boolean) as string[], {
          x: 95, y: 172, scale: 1.35, t,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function render() {
    const s = state();
    const sc = el.querySelector('#kscroll')!;
    const bd = powerBreakdown(s);
    const xpNeed = bondXpNeeded(s.bond);
    const loadout = (Object.keys(SLOT_LABEL) as Slot[])
      .map((slot) => {
        const id = s.traits[slot];
        return id ? `<div class="chip">⚡${traitById(id).name}</div>` : `<div class="chip" style="opacity:.4">${SLOT_LABEL[slot]}: —</div>`;
      }).join('');

    sc.innerHTML = `
      <div class="pet-card">
        <canvas id="pet-preview" width="190" height="190"></canvas>
        <div class="pname">${escapeHtml(s.name)}</div>
        <div class="psub">${s.form === 'prime' ? 'PRIME' : 'Sprout'} ${speciesName()} · Bond Lv.${s.bond}${s.bond >= 10 ? ' 💛 Soulbound' : ''}</div>
        <div class="power-big">⚡ ${powerOf(s)}</div>
        <div style="font-size:12px;color:#b9aec9">POWER</div>
        <div style="text-align:left;margin-top:10px">
          <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800"><span>Bond XP</span><span>${s.bondXp}/${s.bond >= 10 ? 'MAX' : xpNeed}</span></div>
          <div class="bond-bar"><div class="fill" style="width:${s.bond >= 10 ? 100 : (s.bondXp / xpNeed) * 100}%"></div></div>
          ${s.form === 'sprout' ? `<div style="font-size:12px;color:#b366ff;font-weight:700">🌟 Evolves to PRIME at Bond 5 — new look, +25 power, Epic traits unlock!</div>` : ''}
        </div>
      </div>

      <div class="section-title">⚡ Power breakdown</div>
      <div style="background:var(--panel);border-radius:16px;padding:6px 14px;border:1px solid rgba(255,255,255,.09)">
        ${bd.map((r) => `<div class="kv"><span class="k">${r.label}</span><span class="v">+${r.value}</span></div>`).join('')}
        <div class="kv"><span class="k">Mood (${moodLabel()})</span><span class="v">${avgNeeds(s) >= 80 ? '+bonus ✓' : '—'}</span></div>
      </div>

      <div class="section-title">✨ Fused traits</div>
      <div class="loadout">${loadout}</div>

      <div class="section-title">🏕️ Den habitat</div>
      <div class="hab-row" id="habs"></div>

      <div class="section-title">📊 Lifetime stats</div>
      <div style="background:var(--panel);border-radius:16px;padding:6px 14px;border:1px solid rgba(255,255,255,.09)">
        ${[
          ['Meals served', s.stats.feeds], ['Play sessions', s.stats.plays],
          ['Bath times', s.stats.cleans], ['Naps taken', s.stats.rests],
          ['Head pats', s.stats.pets], ['Traits fused', s.stats.fusions],
          ['Battles won', s.stats.battlesWon], ['Trials cleared', s.clearedTrials.length + '/5'],
        ].map(([k, v]) => `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('')}
      </div>

      <div class="section-title">⚙️ Settings</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn ghost" id="mute-btn">${s.muted ? '🔇 Unmute' : '🔊 Mute'}</button>
        <button class="btn ghost" id="reset-btn">🗑️ Reset save</button>
      </div>
      <div style="text-align:center;color:#b9aec9;font-size:11px;margin:18px 0 6px">PETFORGE v1.0 · all data stays on your phone 💜</div>
    `;

    previewCanvas = sc.querySelector('#pet-preview')!;

    const habRow = sc.querySelector('#habs')!;
    for (const h of Object.values(HABITATS)) {
      const b = document.createElement('button');
      b.className = 'hab-card' + (s.habitat === h.id ? ' on' : '');
      const img = g().assets.habitats.get(h.id);
      b.innerHTML = `${img ? `<img src="${img.src}" alt="${h.name}">` : ''}<div class="hn">${h.name}</div>`;
      b.title = h.desc;
      b.onclick = () => {
        s.habitat = h.id as HabitatId;
        saveState(s);
        sfx.play('pop');
        g().toast(`Moved to ${h.name}! 🏕️`);
        render();
      };
      habRow.appendChild(b);
    }

    (sc.querySelector('#mute-btn') as HTMLButtonElement).onclick = (e) => {
      s.muted = !s.muted;
      sfx.muted = s.muted;
      saveState(s);
      (e.target as HTMLButtonElement).textContent = s.muted ? '🔇 Unmute' : '🔊 Mute';
    };
    (sc.querySelector('#reset-btn') as HTMLButtonElement).onclick = () => {
      if (window.confirm('Reset everything? Your pet will be gone forever. 😢')) {
        resetSave();
        window.location.reload();
      }
    };
  }

  function speciesName() {
    return { embercub: 'Embercub', tidepup: 'Tidepup', galekit: 'Galekit' }[state().species];
  }
  function moodLabel() {
    const a = avgNeeds(state());
    return a >= 80 ? 'Radiant' : a >= 60 ? 'Content' : a >= 40 ? 'Meh' : 'Grumpy';
  }
  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));
  }

  return {
    name: 'keeper',
    mount(root) { root.appendChild(el); mount(); },
    unmount() { cancelAnimationFrame(raf); previewCanvas = null; },
  };
}
