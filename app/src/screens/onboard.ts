// PETFORGE — onboarding: pick species, name, hatch ceremony.

import { G, Screen } from '../main';
import { SPECIES, SpeciesId } from '../game/data';
import { newGame, saveState } from '../game/state';
import { sfx } from '../game/audio';
import { drawPet } from '../game/sprites';
import { Particles } from '../game/particles';

export function make(): Screen {
  let picked: SpeciesId = 'embercub';
  let nameInput: HTMLInputElement;
  let phase: 'pick' | 'hatch' = 'pick';
  let hatchT = 0;
  let hatchDone = false;
  let previews: { id: SpeciesId; canvas: HTMLCanvasElement }[] = [];
  let raf = 0;

  const el = document.createElement('div');
  el.className = 'onboard';

  function render() {
    el.innerHTML = `
      <h1>PET<span class="forge">FORGE</span></h1>
      <div class="tag">Raise your critter. Forge its legend.</div>
      <div class="sp-pick"></div>
      <input class="name-input" maxlength="16" placeholder="Name your critter…" value="" />
      <button class="big-btn">🥚 HATCH!</button>
      <div style="margin-top:14px;color:#b9aec9;font-size:12px">Your pet lives on your phone.<br/>Check in a few times a day — no guilt, just vibes.</div>
    `;
    const pick = el.querySelector('.sp-pick')!;
    previews = [];
    for (const id of Object.keys(SPECIES) as SpeciesId[]) {
      const sp = SPECIES[id];
      const b = document.createElement('button');
      b.className = 'sp-card' + (id === picked ? ' on' : '');
      b.innerHTML = `<canvas width="168" height="168"></canvas>
        <div><div class="nm">${sp.name} <span style="font-size:11px;color:#b9aec9">${sp.element}</span></div>
        <div class="tg">${sp.tagline}</div><div class="ds">${sp.desc}</div></div>`;
      b.onclick = () => { picked = id; sfx.play('tap'); render(); };
      pick.appendChild(b);
      previews.push({ id, canvas: b.querySelector('canvas')! });
    }
    nameInput = el.querySelector('.name-input')!;
    el.querySelector('.big-btn')!.addEventListener('click', () => {
      sfx.unlock();
      phase = 'hatch';
      hatchT = performance.now();
      renderHatch();
    });
    animatePreviews();
  }

  function animatePreviews() {
    cancelAnimationFrame(raf);
    const g = G.ctx!;
    const loop = (t: number) => {
      if (phase !== 'pick') return;
      for (const p of previews) {
        const c = p.canvas.getContext('2d')!;
        c.clearRect(0, 0, 168, 168);
        c.imageSmoothingEnabled = false;
        drawPet(c, g.assets, p.id, 'sprout', [], { x: 84, y: 150, scale: 1.15, t });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  function renderHatch() {
    cancelAnimationFrame(raf);
    el.innerHTML = `<div style="padding-top:12vh">
      <canvas id="hatch-canvas" width="600" height="600" style="width:min(80vw,320px);height:min(80vw,320px);image-rendering:pixelated"></canvas>
      <div id="hatch-text" style="font-weight:900;font-size:18px;margin-top:8px">Something is stirring…</div>
    </div>`;
    const canvas = el.querySelector('#hatch-canvas') as HTMLCanvasElement;
    const c = canvas.getContext('2d')!;
    const label = el.querySelector('#hatch-text')!;
    const g = G.ctx!;
    const name = (nameInput?.value || 'Buddy').trim() || 'Buddy';
    const t0 = performance.now();
    let cracked = false;
    const localFx = new Particles();

    const loop = (t: number) => {
      if (phase !== 'hatch') return;
      const e = (t - t0) / 1000;
      c.clearRect(0, 0, 600, 600);
      c.imageSmoothingEnabled = false;
      if (e < 2.4) {
        // shaking egg
        const shake = Math.sin(e * 30) * (4 + e * 6);
        c.save();
        c.translate(300 + shake, 330);
        c.rotate(Math.sin(e * 20) * 0.08);
        c.font = '180px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('🥚', 0, 0);
        c.restore();
        if (e > 1.6 && !cracked) { cracked = true; sfx.play('pop'); label.textContent = 'It\'s hatching!!'; }
        if (cracked) {
          c.strokeStyle = '#241b3a'; c.lineWidth = 8;
          c.beginPath(); c.moveTo(250, 280); c.lineTo(300, 310); c.lineTo(350, 275); c.stroke();
        }
        raf = requestAnimationFrame(loop);
      } else if (e < 3.2) {
        // flash + pop
        const k = (e - 2.4) / 0.8;
        c.fillStyle = `rgba(255,240,200,${k})`;
        c.fillRect(0, 0, 600, 600);
        if (!hatchDone) { hatchDone = true; sfx.play('hatch'); }
        raf = requestAnimationFrame(loop);
      } else {
        // reveal pet
        drawPet(c, g.assets, picked, 'sprout', [], { x: 300, y: 520, scale: 3.2, t, cheer: Math.min(1, (e - 3.2) / 1.2) });
        localFx.update(1 / 60);
        // spawn sparkles
        if (Math.random() < 0.3) localFx.spawn({ x: 150 + Math.random() * 300, y: 150 + Math.random() * 200, kind: 'star', color: '#ffb02e', maxLife: 1, vy: -30, size: 14 });
        localFx.draw(c);
        label.innerHTML = `🎉 <b>${escapeHtml(name)}</b> the ${SPECIES[picked].name} hatched!`;
        if (!el.querySelector('.big-btn')) {
          const b = document.createElement('button');
          b.className = 'big-btn';
          b.style.marginTop = '18px';
          b.textContent = 'Start raising!';
          b.onclick = () => {
            const st = newGame(picked, name);
            saveState(st);
            g.state = st;
            sfx.play('fanfare');
            g.showScreen('den');
          };
          el.appendChild(b);
        }
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(loop);
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));
  }

  return {
    name: 'onboard',
    mount(root) { phase = 'pick'; hatchDone = false; root.appendChild(el); render(); },
    unmount() { cancelAnimationFrame(raf); },
  };
}
