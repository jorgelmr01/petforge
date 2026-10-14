// PETFORGE — Trials: PvE gauntlet with animated auto-battles.

import { G, Screen } from '../main';
import { TRIALS, TRIAL_ENERGY_COST, Trial } from '../game/data';
import { PetState, addShards, clamp, gainBond, powerOf, saveStateSoon } from '../game/state';
import { sfx } from '../game/audio';
import { Assets, drawPet, drawShadow } from '../game/sprites';

export function make(): Screen {
  const g = () => G.ctx!;
  const el = document.createElement('div');
  el.className = 'page';
  let battle: Battle | null = null;

  const state = () => g().state;

  function mount() {
    el.innerHTML = `
      <div class="page-head"><h1>⚔️ Trials</h1>
      <div class="sub">Test your legend. Entry costs ${TRIAL_ENERGY_COST} ⚡ energy. Win all 5 tiers!</div></div>
      <div class="trait-list" id="trial-list"></div>
    `;
    renderList();
  }

  function renderList() {
    const s = state();
    const list = el.querySelector('#trial-list')!;
    list.innerHTML = '';
    const power = powerOf(s);
    TRIALS.forEach((tr, i) => {
      const cleared = s.clearedTrials.includes(tr.id);
      const prevCleared = i === 0 || s.clearedTrials.includes(TRIALS[i - 1].id);
      const card = document.createElement('div');
      card.className = 'trial-card' + (cleared ? ' cleared' : '');
      const art = document.createElement('div');
      art.className = 'foe-art';
      const c = document.createElement('canvas');
      c.width = 96; c.height = 96;
      art.appendChild(c);
      drawFoePreview(c, tr, g().assets);
      const info = document.createElement('div');
      info.className = 'info';
      const odds = winOdds(power, tr.foePower);
      info.innerHTML = `
        <div class="nm">${tr.foeName} <span class="stars">${cleared ? '★★★' : ''}</span></div>
        <div class="ds">${tr.name} · ${tr.desc}</div>
        <div class="rw">Foe ⚡${tr.foePower} · Reward 💎${tr.reward} · Win odds ~${Math.round(odds * 100)}%</div>`;
      const btn = document.createElement('button');
      btn.className = 'btn small';
      btn.textContent = 'Battle!';
      btn.disabled = !prevCleared || s.needs.energy < TRIAL_ENERGY_COST;
      if (!prevCleared) btn.textContent = '🔒';
      else if (s.needs.energy < TRIAL_ENERGY_COST) btn.textContent = 'No energy';
      btn.onclick = () => startBattle(tr);
      card.append(art, info, btn);
      list.appendChild(card);
    });
    const note = document.createElement('div');
    note.style.cssText = 'text-align:center;color:#b9aec9;font-size:12px;padding:8px';
    note.textContent = `Your power: ⚡${power} · Clear tiers in order. Losing only costs energy — no shame!`;
    list.appendChild(note);
  }

  function drawFoePreview(canvas: HTMLCanvasElement, tr: Trial, assets: Assets) {
    const c = canvas.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    const strip = shadowStrip(tr, assets);
    if (strip) c.drawImage(strip, 0, 0, 96, 96, 4, 4, 88, 88);
    else { c.font = '44px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('👹', 48, 52); }
  }

  /** Pre-tinted "shadow" version of the foe's sprite strip. */
  const tintCache = new Map<string, HTMLCanvasElement>();
  function shadowStrip(tr: Trial, assets: Assets): HTMLCanvasElement | null {
    const key = `${tr.foeSpecies}_${tr.foeForm}_idle`;
    const src = assets.strips.get(key);
    if (!src) return null;
    if (tintCache.has(key)) return tintCache.get(key)!;
    const off = document.createElement('canvas');
    off.width = src.width; off.height = src.height;
    const c = off.getContext('2d')!;
    try {
      c.filter = 'brightness(0.35) saturate(1.6) hue-rotate(190deg)';
    } catch { /* older canvas */ }
    c.drawImage(src, 0, 0);
    tintCache.set(key, off);
    return off;
  }

  function winOdds(power: number, foe: number): number {
    return clamp(0.5 + (power - foe) * 0.03, 0.08, 0.95);
  }

  // ---------------- battle ----------------

  interface Battle {
    trial: Trial;
    round: number;
    meHp: number; meMax: number;
    foeHp: number; foeMax: number;
    phase: 'intro' | 'clash' | 'resolve' | 'done';
    t: number;
    meLunge: number; foeLunge: number;
    meShake: number; foeShake: number;
    log: string;
    result: 'win' | 'lose' | null;
    foeStrip: HTMLCanvasElement | null;
  }

  function startBattle(tr: Trial) {
    const s = state();
    if (s.needs.energy < TRIAL_ENERGY_COST) { sfx.play('error'); g().toast('Not enough energy — rest up! 😴'); return; }
    s.needs.energy = clamp(s.needs.energy - TRIAL_ENERGY_COST, 0, 100);
    saveStateSoon(s);

    const power = powerOf(s);
    const meMax = Math.round(34 + power * 0.9);
    const foeMax = Math.round(34 + tr.foePower * 0.9);
    battle = {
      trial: tr, round: 0,
      meHp: meMax, meMax, foeHp: foeMax, foeMax,
      phase: 'intro', t: 0, meLunge: 0, foeLunge: 0, meShake: 0, foeShake: 0,
      log: `${s.name} vs ${tr.foeName}! Round 1…`, result: null,
      foeStrip: shadowStrip(tr, g().assets),
    };
    sfx.play('hit');
    renderBattle();
  }

  function renderBattle() {
    const s = state();
    const b = battle!;
    el.innerHTML = `
      <div class="page-head"><h1>⚔️ ${b.trial.name}</h1><div class="sub">${s.name} vs ${b.trial.foeName}</div></div>
      <div class="battle-hp">
        <div class="hp-side me"><div class="nm">${escapeHtml(s.name)} ⚡${powerOf(s)}</div><div class="bar"><div class="fill" id="me-hp" style="width:100%"></div></div></div>
        <div class="hp-side foe"><div class="nm">${b.trial.foeName} ⚡${b.trial.foePower}</div><div class="bar"><div class="fill" id="foe-hp" style="width:100%"></div></div></div>
      </div>
      <div class="battle-arena" id="arena"></div>
      <div class="battle-log" id="blog">${b.log}</div>
      <div style="padding:0 16px calc(var(--nav-h) + var(--sab) + 12px);display:flex;gap:8px">
        <button class="btn ghost" id="flee" style="flex:1">🏳️ Flee</button>
      </div>
    `;
    el.querySelector('#flee')!.addEventListener('click', () => {
      if (battle && battle.phase !== 'done') { battle = null; sfx.play('tap'); mount(); }
    });
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));
  }

  function damage(atk: number, def: number): number {
    return Math.round(clamp(9 + (atk - def) * 0.45 + (Math.random() - 0.5) * 10, 5, 34));
  }

  function updateBattle(dt: number) {
    const b = battle!;
    const s = state();
    b.t += dt;
    const setLog = (t: string) => {
      b.log = t;
      const el2 = el.querySelector('#blog');
      if (el2) el2.textContent = t;
    };

    if (b.phase === 'intro' && b.t > 1.2) {
      b.phase = 'clash'; b.t = 0; b.round = 1;
      setLog(`Round ${b.round} — FIGHT!`);
      sfx.play('hit');
    } else if (b.phase === 'clash') {
      // lunge in, impact at t≈0.45
      const k = Math.min(1, b.t / 0.45);
      b.meLunge = k; b.foeLunge = k;
      if (!(b as any).hitDone && b.t >= 0.45) {
        (b as any).hitDone = true;
        const power = powerOf(s);
        const meFirst = Math.random() < 0.5 + (power - b.trial.foePower) * 0.01;
        if (meFirst) {
          const d = damage(power, b.trial.foePower);
          b.foeHp = Math.max(0, b.foeHp - d);
          b.foeShake = 1;
          setLog(`${s.name} strikes for ${d}! 💥`);
          g().particles.floatText(window.innerWidth * 0.72, window.innerHeight * 0.42, `-${d}`, '#ffd97a', 26);
        } else {
          const d = damage(b.trial.foePower, power);
          b.meHp = Math.max(0, b.meHp - d);
          b.meShake = 1;
          setLog(`${b.trial.foeName} hits for ${d}! 😖`);
          g().particles.floatText(window.innerWidth * 0.28, window.innerHeight * 0.42, `-${d}`, '#ff8fb2', 26);
        }
        sfx.play('hit');
        g().particles.burst(window.innerWidth / 2, window.innerHeight * 0.42, 'star', 10, { color: '#ffe066' });
        updateHpBars();
      }
      if (b.t > 1.1) {
        b.phase = 'resolve'; b.t = 0;
        (b as any).hitDone = false;
      }
    } else if (b.phase === 'resolve') {
      b.meLunge = Math.max(0, b.meLunge - dt * 3);
      b.foeLunge = Math.max(0, b.foeLunge - dt * 3);
      b.meShake = Math.max(0, b.meShake - dt * 4);
      b.foeShake = Math.max(0, b.foeShake - dt * 4);
      if (b.t > 0.7) {
        if (b.foeHp <= 0 || b.meHp <= 0) endBattle(b.foeHp <= 0 && b.meHp > 0 ? 'win' : b.meHp <= 0 && b.foeHp > 0 ? 'lose' : b.foeHp <= 0 ? 'win' : 'lose');
        else if (b.round >= 3) endBattle(b.foeHp >= b.meHp ? 'lose' : 'win');
        else {
          b.round++;
          b.phase = 'clash'; b.t = 0;
          setLog(`Round ${b.round} — FIGHT!`);
        }
      }
    }
  }

  function updateHpBars() {
    const b = battle!;
    const me = el.querySelector('#me-hp') as HTMLElement;
    const foe = el.querySelector('#foe-hp') as HTMLElement;
    if (me) me.style.width = `${(b.meHp / b.meMax) * 100}%`;
    if (foe) foe.style.width = `${(b.foeHp / b.foeMax) * 100}%`;
  }

  function endBattle(result: 'win' | 'lose') {
    const b = battle!;
    const s = state();
    b.phase = 'done';
    b.result = result;
    if (result === 'win') {
      const firstClear = !s.clearedTrials.includes(b.trial.id);
      if (firstClear) s.clearedTrials.push(b.trial.id);
      const reward = addShards(s, b.trial.reward + (firstClear ? 50 : 0));
      s.stats.battlesWon++;
      gainBond(s, 15);
      sfx.play('win');
      g().particles.burst(window.innerWidth / 2, window.innerHeight * 0.4, 'star', 24, { color: '#ffb02e' });
      (el.querySelector('#blog') as HTMLElement).innerHTML =
        `🏆 <b>VICTORY!</b> ${s.name} wins!<br/>+${reward} 💎${firstClear ? ' (first clear bonus!)' : ''}`;
    } else {
      s.stats.battlesLost++;
      s.needs.happy = clamp(s.needs.happy - 10, 0, 100);
      s.needs.energy = clamp(s.needs.energy - 5, 0, 100);
      sfx.play('lose');
      (el.querySelector('#blog') as HTMLElement).innerHTML =
        `💔 <b>Defeat…</b> ${b.trial.foeName} was too strong.<br/>Train up (Bond + traits) and retry!`;
    }
    saveStateSoon(s);
    const flee = el.querySelector('#flee') as HTMLButtonElement;
    flee.textContent = '← Back to Trials';
    flee.onclick = () => { battle = null; mount(); };
  }

  function drawBattleScene(ctx: CanvasRenderingContext2D, t: number, dt: number, w: number, h: number) {
    if (!battle) return;
    const b = battle;
    const s = state();
    const P = g().particles;
    updateBattle(dt);

    // arena backdrop
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#2a1b3d');
    grad.addColorStop(1, '#14101f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // torch glow
    for (const tx of [w * 0.1, w * 0.9]) {
      const tg = ctx.createRadialGradient(tx, h * 0.3, 4, tx, h * 0.3, 90);
      tg.addColorStop(0, 'rgba(255,150,50,.25)');
      tg.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.fillStyle = tg;
      ctx.fillRect(tx - 90, h * 0.3 - 90, 180, 180);
      if (Math.random() < 0.15) P.spawn({ x: tx + (Math.random() - 0.5) * 20, y: h * 0.3, kind: 'ember', color: '#ff9a3c', size: 6, vy: -40, maxLife: 1.2 });
    }

    const meX = w * 0.28 + b.meLunge * w * 0.14 + (b.meShake > 0 ? Math.sin(t / 30) * 6 * b.meShake : 0);
    const foeX = w * 0.72 - b.foeLunge * w * 0.14 + (b.foeShake > 0 ? Math.sin(t / 30) * 6 * b.foeShake : 0);
    const gy = h * 0.52;
    const sc = Math.min(w / 400, 1.2) * 2.2;

    drawShadow(ctx, meX, gy, sc, 0);
    drawShadow(ctx, foeX, gy, sc, 0);

    const myTraits = Object.values(s.traits).filter(Boolean) as string[];
    drawPet(ctx, g().assets, s.species, s.form, myTraits, {
      x: meX, y: gy, scale: sc, t,
      squash: b.meLunge > 0.8 ? -0.25 : 0,
      alpha: b.result === 'lose' ? 0.55 : 1,
    });

    // foe: draw tinted strip directly (same frame timing)
    const foeStrip = b.foeStrip;
    if (foeStrip) {
      const frame = Math.floor(t / 167) % 4;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (b.result === 'win') ctx.globalAlpha = 0.45;
      // flip to face left
      ctx.translate(foeX, 0); ctx.scale(-1, 1); ctx.translate(-foeX, 0);
      ctx.drawImage(foeStrip, frame * 96, 0, 96, 96, foeX - 48 * sc, gy - 96 * sc, 96 * sc, 96 * sc);
      ctx.restore();
    } else {
      ctx.font = `${70 * sc / 2}px serif`; ctx.textAlign = 'center';
      ctx.fillText('👹', foeX, gy - 40);
    }

    // clash impact flash
    if (b.phase === 'clash' && b.t > 0.4 && b.t < 0.6) {
      ctx.fillStyle = `rgba(255,240,200,${0.35 * (1 - Math.abs(b.t - 0.5) * 10)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  return {
    name: 'trials',
    mount(root) { battle = null; root.appendChild(el); mount(); },
    unmount() { battle = null; },
    draw: drawBattleScene,
  };
}
