// PETFORGE — Trials: PvE gauntlet with readable, fight-to-KO battles.

import { G, Screen } from '../main';
import { TRIALS, TRIAL_ENERGY_COST, Trial } from '../game/data';
import { PetState, addShards, clamp, gainBond, powerOf, saveStateSoon } from '../game/state';
import { sfx } from '../game/audio';
import { Assets, FRAME_MS, drawPet, drawShadow } from '../game/sprites';

export function make(): Screen {
  const g = () => G.ctx!;
  const el = document.createElement('div');
  el.className = 'page';
  let battle: Battle | null = null;

  const state = () => g().state;

  function mount() {
    el.innerHTML = `
      <div class="page-head"><h1>⚔️ Trials</h1>
      <div class="sub">Win shards here! Entry costs ${TRIAL_ENERGY_COST} ⚡ energy. Fights go until someone is KO'd — no cheap sudden-death.</div></div>
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
      const ready = power >= tr.recPower;
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
      info.innerHTML = `
        <div class="nm">${tr.foeName} <span class="stars">${cleared ? '★★★' : ''}</span></div>
        <div class="ds">${tr.name} · ${tr.desc}</div>
        <div class="rw">Foe ⚡${tr.foePower} · You ⚡${power} ${ready ? '✅' : '⚠️'}
          <br/>Recommended ⚡${tr.recPower} · Reward 💎${tr.reward}</div>`;
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
    note.textContent = 'Clear tiers in order. Losing only costs energy — train up (Bond + traits) and retry!';
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
    hitDone: boolean;
  }

  const MAX_ROUNDS = 15;

  function startBattle(tr: Trial) {
    const s = state();
    if (s.needs.energy < TRIAL_ENERGY_COST) { sfx.play('error'); g().toast('Not enough energy — rest up! 😴'); return; }
    s.needs.energy = clamp(s.needs.energy - TRIAL_ENERGY_COST, 0, 100);
    saveStateSoon(s);

    const power = powerOf(s);
    const meMax = Math.round(40 + power);
    const foeMax = Math.round(40 + tr.foePower);
    battle = {
      trial: tr, round: 1,
      meHp: meMax, meMax, foeHp: foeMax, foeMax,
      phase: 'intro', t: 0, meLunge: 0, foeLunge: 0, meShake: 0, foeShake: 0,
      log: `${s.name} (⚡${power}) vs ${tr.foeName} (⚡${tr.foePower})`, result: null,
      foeStrip: shadowStrip(tr, g().assets), hitDone: false,
    };
    sfx.play('hit');
    renderBattle();
  }

  function renderBattle() {
    const s = state();
    const b = battle!;
    el.innerHTML = `
      <div class="page-head"><h1>⚔️ ${b.trial.name}</h1><div class="sub" id="matchup">${escapeHtml(s.name)} ⚡${powerOf(s)} vs ${b.trial.foeName} ⚡${b.trial.foePower} · <span id="roundlbl">Round 1</span></div></div>
      <div class="battle-hp">
        <div class="hp-side me"><div class="nm">${escapeHtml(s.name)} <span id="me-hpnum"></span></div><div class="bar"><div class="fill" id="me-hp" style="width:100%"></div></div></div>
        <div class="hp-side foe"><div class="nm">${b.trial.foeName} <span id="foe-hpnum"></span></div><div class="bar"><div class="fill" id="foe-hp" style="width:100%"></div></div></div>
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
    updateHpBars();
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));
  }

  /** Damage: base 8, ±0.5 per power point of difference, small randomness. */
  function damage(atk: number, def: number): number {
    return Math.round(clamp(8 + (atk - def) * 0.5 + (Math.random() * 6 - 3), 4, 26));
  }

  function setLog(t: string) {
    const b = battle!;
    b.log = t;
    const el2 = el.querySelector('#blog');
    if (el2) el2.innerHTML = t;
  }

  function setRound(n: number) {
    const el2 = el.querySelector('#roundlbl');
    if (el2) el2.textContent = `Round ${n}`;
  }

  function updateBattle(dt: number) {
    const b = battle!;
    const s = state();

    if (b.phase === 'intro') {
      b.t += dt;
      if (b.t > 1.3) { b.phase = 'clash'; b.t = 0; b.hitDone = false; }
    } else if (b.phase === 'clash') {
      b.t += dt;
      const k = Math.min(1, b.t / 0.55);
      b.meLunge = k; b.foeLunge = k;
      if (!b.hitDone && b.t >= 0.55) {
        b.hitDone = true;
        const power = powerOf(s);
        const meFirst = Math.random() < 0.5 + (power - b.trial.foePower) * 0.01;
        if (meFirst) {
          const d = damage(power, b.trial.foePower);
          b.foeHp = Math.max(0, b.foeHp - d);
          b.foeShake = 1;
          setLog(`💥 <b>${escapeHtml(s.name)} strikes for ${d}!</b>`);
          g().particles.floatText(window.innerWidth * 0.72, window.innerHeight * 0.40, `-${d}`, '#ffd97a', 28);
        } else {
          const d = damage(b.trial.foePower, power);
          b.meHp = Math.max(0, b.meHp - d);
          b.meShake = 1;
          setLog(`😖 <b>${b.trial.foeName} hits for ${d}!</b>`);
          g().particles.floatText(window.innerWidth * 0.28, window.innerHeight * 0.40, `-${d}`, '#ff8fb2', 28);
        }
        sfx.play('hit');
        g().particles.burst(window.innerWidth / 2, window.innerHeight * 0.42, 'star', 10, { color: '#ffe066' });
        updateHpBars();
      }
      if (b.t > 1.5) { b.phase = 'resolve'; b.t = 0; }
    } else if (b.phase === 'resolve') {
      b.t += dt;
      b.meLunge = Math.max(0, b.meLunge - dt * 2.5);
      b.foeLunge = Math.max(0, b.foeLunge - dt * 2.5);
      b.meShake = Math.max(0, b.meShake - dt * 3.5);
      b.foeShake = Math.max(0, b.foeShake - dt * 3.5);
      if (b.t > 1.0) {
        if (b.foeHp <= 0 || b.meHp <= 0) {
          endBattle(b.foeHp <= 0 && b.meHp <= 0 ? (b.foeHp >= b.meHp ? 'win' : 'lose') : b.foeHp <= 0 ? 'win' : 'lose', 'ko');
        } else if (b.round >= MAX_ROUNDS) {
          endBattle(b.foeHp / b.foeMax <= b.meHp / b.meMax ? 'win' : 'lose', 'time');
        } else {
          b.round++;
          b.phase = 'intro'; b.t = 0;
          setRound(b.round);
          setLog(`Round ${b.round} — fighters circle…`);
        }
      }
    }
  }

  function updateHpBars() {
    const b = battle!;
    const set = (id: string, numId: string, hp: number, max: number) => {
      const bar = el.querySelector('#' + id) as HTMLElement;
      const num = el.querySelector('#' + numId) as HTMLElement;
      if (bar) bar.style.width = `${(hp / max) * 100}%`;
      if (num) num.textContent = `${hp}/${max}`;
    };
    set('me-hp', 'me-hpnum', b.meHp, b.meMax);
    set('foe-hp', 'foe-hpnum', b.foeHp, b.foeMax);
  }

  function endBattle(result: 'win' | 'lose', how: 'ko' | 'time') {
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
      setLog(how === 'ko'
        ? `🏆 <b>KNOCKOUT! ${escapeHtml(s.name)} wins!</b><br/>+${reward} 💎${firstClear ? ' (first-clear bonus!)' : ''}`
        : `🏆 <b>VICTORY on points! ${escapeHtml(s.name)} wins!</b><br/>+${reward} 💎${firstClear ? ' (first-clear bonus!)' : ''}`);
    } else {
      s.stats.battlesLost++;
      s.needs.happy = clamp(s.needs.happy - 10, 0, 100);
      s.needs.energy = clamp(s.needs.energy - 5, 0, 100);
      sfx.play('lose');
      setLog(how === 'ko'
        ? `💔 <b>${escapeHtml(s.name)} was knocked out…</b><br/>${b.trial.foeName} stands victorious. Heal up, forge traits, and retry!`
        : `💔 <b>Outlasted… ${b.trial.foeName} takes it.</b><br/>Train up (Bond + traits) and retry!`);
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
    for (const tx of [w * 0.1, w * 0.9]) {
      const tg = ctx.createRadialGradient(tx, h * 0.3, 4, tx, h * 0.3, 90);
      tg.addColorStop(0, 'rgba(255,150,50,.25)');
      tg.addColorStop(1, 'rgba(255,150,50,0)');
      ctx.fillStyle = tg;
      ctx.fillRect(tx - 90, h * 0.3 - 90, 180, 180);
      if (Math.random() < 0.12) P.spawn({ x: tx + (Math.random() - 0.5) * 20, y: h * 0.3, kind: 'ember', color: '#ff9a3c', size: 6, vy: -40, maxLife: 1.2 });
    }

    const meX = w * 0.28 + b.meLunge * w * 0.13 + (b.meShake > 0 ? Math.sin(t / 30) * 6 * b.meShake : 0);
    const foeX = w * 0.72 - b.foeLunge * w * 0.13 + (b.foeShake > 0 ? Math.sin(t / 30) * 6 * b.foeShake : 0);
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

    const foeStrip = b.foeStrip;
    if (foeStrip) {
      const frame = Math.floor(t / FRAME_MS) % 4;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      if (b.result === 'win') ctx.globalAlpha = 0.45;
      ctx.translate(foeX, 0); ctx.scale(-1, 1); ctx.translate(-foeX, 0);
      ctx.drawImage(foeStrip, frame * 96, 0, 96, 96, foeX - 48 * sc, gy - 96 * sc, 96 * sc, 96 * sc);
      ctx.restore();
    } else {
      ctx.font = `${70 * sc / 2}px serif`; ctx.textAlign = 'center';
      ctx.fillText('👹', foeX, gy - 40);
    }

    // clash impact flash
    if (b.phase === 'clash' && b.t > 0.5 && b.t < 0.7) {
      ctx.fillStyle = `rgba(255,240,200,${0.35 * (1 - Math.abs(b.t - 0.6) * 10)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // round banner
    if (b.phase === 'intro' && b.result === null) {
      const k = Math.min(1, b.t / 0.3);
      ctx.save();
      ctx.globalAlpha = k;
      ctx.font = '900 44px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(10,6,20,.9)';
      const label = b.round === 0 ? 'FIGHT!' : `ROUND ${b.round}`;
      ctx.strokeText(label, w / 2, h * 0.34);
      ctx.fillStyle = '#ffb02e';
      ctx.fillText(label, w / 2, h * 0.34);
      ctx.restore();
    }
  }

  return {
    name: 'trials',
    mount(root) { battle = null; root.appendChild(el); mount(); },
    unmount() { battle = null; },
    draw: drawBattleScene,
  };
}
