// PETFORGE — app shell: canvas, game loop, screen router, toasts.

import './style.css';
import { Assets, loadAssets } from './game/sprites';
import { Particles } from './game/particles';
import { PetState, applyOfflineProgress, dailyCheckin, loadState, saveState, saveStateSoon } from './game/state';
import { sfx } from './game/audio';

export type ScreenName = 'den' | 'forge' | 'trials' | 'keeper' | 'onboard';

export interface Screen {
  name: ScreenName;
  mount(root: HTMLElement): void;
  unmount(): void;
  draw?(ctx: CanvasRenderingContext2D, t: number, dt: number, w: number, h: number): void;
  onTap?(x: number, y: number): void;
  onMove?(x: number, y: number): void;
}

export interface Ctx {
  state: PetState;
  assets: Assets;
  particles: Particles;
  showScreen(name: ScreenName): void;
  toast(msg: string): void;
  bumpShards(): void;
  refresh(): void;
  petAnchor(): { x: number; y: number; scale: number };
}

const app = document.getElementById('app')!;
const canvas = document.createElement('canvas');
canvas.id = 'scene';
app.appendChild(canvas);
const ctx2d = canvas.getContext('2d')!;

const toastEl = document.createElement('div');
toastEl.id = 'toast';
app.appendChild(toastEl);

let toastTimer: number | null = null;
function toast(msg: string) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl.classList.remove('show'), 2200);
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

export const G: {
  ctx: Ctx | null;
  screen: Screen | null;
  screens: Partial<Record<ScreenName, () => Screen>>;
} = { ctx: null, screen: null, screens: {} };

function petAnchor() {
  const w = window.innerWidth, h = window.innerHeight;
  return { x: w / 2, y: h * 0.60, scale: Math.min(w / 400, 1.25) * 2.6 };
}

async function boot() {
  // Loading screen
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.innerHTML = `<div class="egg">🥚</div><div style="font-weight:900;letter-spacing:.1em">PETFORGE</div><div class="bar"><div class="fill"></div></div><div class="lsub" style="color:#b9aec9;font-size:12px">warming up the den…</div>`;
  app.appendChild(loader);
  const fill = loader.querySelector('.fill') as HTMLElement;

  let state = loadState();
  const assets = await loadAssets((done, total) => {
    fill.style.width = `${Math.round((done / total) * 100)}%`;
  });

  const particles = new Particles();

  const gctx: Ctx = {
    state: state as PetState,
    assets,
    particles,
    showScreen(name: ScreenName) {
      if (G.screen) { G.screen.unmount(); }
      root.innerHTML = '';
      const make = G.screens[name];
      if (!make) { console.error('no screen', name); return; }
      const s = make();
      G.screen = s;
      s.mount(root);
      if (name !== 'onboard') renderNav(name);
      else navEl.style.display = 'none';
      particles.clear();
    },
    toast,
    bumpShards() {
      const el = document.getElementById('shard-chip');
      if (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); el.textContent = `💎 ${gctx.state.shards}`; }
    },
    refresh() {
      const cur = G.screen?.name;
      if (cur) { const make = G.screens[cur]; if (make) { G.screen!.unmount(); root.innerHTML = ''; const s = make(); G.screen = s; s.mount(root); renderNav(cur); } }
    },
    petAnchor,
  };
  G.ctx = gctx;
  sfx.muted = !!state?.muted;

  loader.remove();

  if (!state) {
    gctx.showScreen('onboard');
  } else {
    applyOfflineProgress(state);
    const bonus = dailyCheckin(state);
    saveState(state);
    gctx.showScreen('den');
    if (bonus > 0) setTimeout(() => toast(`🎁 Daily check-in: +${bonus} shards!`), 900);
  }

  // Game loop
  let last = performance.now();
  const loop = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    ctx2d.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx2d.imageSmoothingEnabled = false;
    particles.update(dt);
    const s = G.screen;
    if (s?.draw) s.draw(ctx2d, now, dt, window.innerWidth, window.innerHeight);
    particles.draw(ctx2d);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // Live needs tick every 60s
  setInterval(() => {
    if (G.ctx?.state) { applyOfflineProgress(G.ctx.state); saveStateSoon(G.ctx.state); }
  }, 60_000);

  window.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

  // Tap handling on canvas
  canvas.addEventListener('pointerdown', (e) => {
    sfx.unlock();
    G.screen?.onTap?.(e.clientX, e.clientY);
  });
  canvas.addEventListener('pointermove', (e) => {
    G.screen?.onMove?.(e.clientX, e.clientY);
  });
}

const root = document.createElement('div');
const navEl = document.createElement('nav');
navEl.className = 'nav';
app.appendChild(root);
app.appendChild(navEl);

const NAV: { id: ScreenName; icon: string; label: string }[] = [
  { id: 'den', icon: '🏠', label: 'Den' },
  { id: 'forge', icon: '⚒️', label: 'Forge' },
  { id: 'trials', icon: '⚔️', label: 'Trials' },
  { id: 'keeper', icon: '🧙', label: 'Keeper' },
];

function renderNav(active: ScreenName) {
  navEl.style.display = 'flex';
  navEl.innerHTML = '';
  for (const n of NAV) {
    const b = document.createElement('button');
    b.className = n.id === active ? 'on' : '';
    b.innerHTML = `<span class="e">${n.icon}</span>${n.label}`;
    b.onclick = () => { sfx.play('tap'); G.ctx?.showScreen(n.id); };
    navEl.appendChild(b);
  }
}

// Screens register themselves via dynamic import to keep boot fast-ish.
async function registerScreens() {
  const [den, forge, trials, keeper, onboard] = await Promise.all([
    import('./screens/den'), import('./screens/forge'), import('./screens/trials'),
    import('./screens/keeper'), import('./screens/onboard'),
  ]);
  G.screens = { den: den.make, forge: forge.make, trials: trials.make, keeper: keeper.make, onboard: onboard.make };
  await boot();
}

registerScreens();
