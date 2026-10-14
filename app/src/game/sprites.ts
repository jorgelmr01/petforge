// PETFORGE — sprite loading + composite pet renderer (body + trait overlays).

import { Form, HABITATS, HabitatId, SpeciesId } from './data';
import { SPECIES } from './data';

export interface Assets {
  strips: Map<string, HTMLImageElement>;   // key: `${species}_${form}_idle` or trait id
  habitats: Map<string, HTMLImageElement>;
  foods: Map<string, HTMLImageElement>;
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Draw order for trait slots: back → front (aura behind body, eyes in front). */
const DRAW_ORDER = ['aura', 'tail', 'armor', 'wings', 'crown', 'eyes'] as const;

export async function loadAssets(onProgress?: (done: number, total: number) => void): Promise<Assets> {
  const strips = new Map<string, HTMLImageElement>();
  const habitats = new Map<string, HTMLImageElement>();
  const foods = new Map<string, HTMLImageElement>();

  const jobs: { key: string; url: string; map: Map<string, HTMLImageElement> }[] = [];
  const forms: Form[] = ['sprout', 'prime'];
  for (const sp of Object.keys(SPECIES) as SpeciesId[]) {
    for (const f of forms) jobs.push({ key: `${sp}_${f}_idle`, url: `assets/sprites/${sp}_${f}_idle.png`, map: strips });
  }
  const traitIds = ['trait_frost_antlers','trait_solar_crown','trait_moth_wings','trait_phoenix_wings','trait_storm_wings','trait_ember_aura','trait_tidal_ring','trait_void_halo','trait_runed_plate','trait_crystal_shardback','trait_comet_tail','trait_blade_tail','trait_starlit_eyes','trait_prism_eyes'];
  for (const id of traitIds) jobs.push({ key: id, url: `assets/sprites/${id}.png`, map: strips });
  for (const h of Object.keys(HABITATS) as HabitatId[]) jobs.push({ key: h, url: `assets/habitats/habitat_${h}.png`, map: habitats });
  for (const f of ['ember_berry', 'tide_cake', 'gale_fruit']) jobs.push({ key: f, url: `assets/food/food_${f}.png`, map: foods });

  let done = 0;
  await Promise.all(jobs.map(async (j) => {
    const img = await loadImg(j.url);
    if (img) j.map.set(j.key, img);
    done++;
    onProgress?.(done, jobs.length);
  }));
  return { strips, habitats, foods };
}

export interface PetDrawOpts {
  x: number; y: number;        // anchor: feet position
  scale: number;
  t: number;                   // ms timestamp
  hop?: number;                // 0..1 hop animation progress (adds jump arc)
  squash?: number;             // extra squash factor (e.g. on tap)
  sleeping?: boolean;
  cheer?: number;              // 0..1 celebration bounce
  flip?: boolean;              // face left
  alpha?: number;
  filter?: string;
}

const FRAME_MS = 167;
const CELL = 96;

function frameIndex(t: number) {
  return Math.floor(t / FRAME_MS) % 4;
}

function drawStrip(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined,
  frame: number, x: number, y: number, scale: number, flip: boolean, alpha: number,
) {
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  ctx.drawImage(img, frame * CELL, 0, CELL, CELL, x - (CELL / 2) * scale, y - CELL * scale, CELL * scale, CELL * scale);
  ctx.restore();
}

/** Procedural placeholder critter (used when art hasn't loaded / is missing). */
function drawPlaceholder(
  ctx: CanvasRenderingContext2D, species: SpeciesId, form: Form,
  x: number, y: number, scale: number, t: number, squash: number, sleeping: boolean,
) {
  const c = SPECIES[species].colors;
  const bob = Math.sin(t / 300) * 3 * scale * 0.12;
  const blink = (Math.floor(t / 2400) % 4 === 3) ? 0.15 : 1;
  const big = form === 'sprout';
  const w = (big ? 62 : 52) * scale * (1 + squash * 0.25);
  const h = (big ? 56 : 62) * scale * (1 - squash * 0.3);
  const cx = x, cy = y - h / 2 + bob;
  ctx.save();
  if (sleeping) { ctx.translate(cx, cy); ctx.rotate(-0.12); ctx.translate(-cx, -cy); }
  // body
  ctx.fillStyle = c.main;
  ctx.strokeStyle = 'rgba(20,10,30,.9)';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // belly
  ctx.fillStyle = c.belly;
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.14, w * 0.3, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  // ears/tufts per species
  ctx.fillStyle = c.main;
  if (species === 'embercub') {
    triangle(ctx, cx - w * 0.28, cy - h * 0.42, 14 * scale); triangle(ctx, cx + w * 0.28, cy - h * 0.42, 14 * scale);
    // flame tuft
    ctx.fillStyle = c.glow;
    ctx.beginPath(); ctx.ellipse(cx, cy - h * 0.52, 8 * scale, 12 * scale * (0.9 + Math.sin(t / 150) * 0.15), 0, 0, Math.PI * 2); ctx.fill();
  } else if (species === 'tidepup') {
    ctx.fillStyle = c.glow;
    ctx.beginPath(); ctx.ellipse(cx - w * 0.42, cy - h * 0.2, 10 * scale, 16 * scale, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + w * 0.42, cy - h * 0.2, 10 * scale, 16 * scale, -0.4, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#fff';
    triangle(ctx, cx - w * 0.3, cy - h * 0.44, 12 * scale); triangle(ctx, cx + w * 0.3, cy - h * 0.44, 12 * scale);
    ctx.fillStyle = c.glow;
    ctx.beginPath(); ctx.moveTo(cx - 6 * scale, cy - h * 0.5); ctx.lineTo(cx + 6 * scale, cy - h * 0.62); ctx.lineTo(cx + 2 * scale, cy - h * 0.44); ctx.closePath(); ctx.fill();
  }
  if (sleeping) {
    ctx.strokeStyle = '#2a1f3d'; ctx.lineWidth = 2.5 * scale; ctx.lineCap = 'round';
    for (const ex of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + ex * 14 * scale - 6 * scale, cy - 4 * scale);
      ctx.quadraticCurveTo(cx + ex * 14 * scale, cy - 2 * scale, cx + ex * 14 * scale + 6 * scale, cy - 4 * scale);
      ctx.stroke();
    }
  } else {
    // eyes
    const ey = cy - h * 0.08;
    for (const ex of [-1, 1]) {
      const exx = cx + ex * (big ? 15 : 13) * scale;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(exx, ey, 9 * scale, 10 * scale * blink, 0, 0, Math.PI * 2); ctx.fill();
      if (blink > 0.5) {
        ctx.fillStyle = '#1c1230';
        ctx.beginPath(); ctx.arc(exx + 2 * scale, ey + 1 * scale, 4.5 * scale, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(exx + 3.5 * scale, ey - 1 * scale, 1.6 * scale, 0, Math.PI * 2); ctx.fill();
      }
    }
    // mouth
    ctx.strokeStyle = '#2a1f3d'; ctx.lineWidth = 2.5 * scale; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy + h * 0.12, 7 * scale, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  // glow
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, w);
  g.addColorStop(0, c.glow + '00'); g.addColorStop(1, c.glow + '44');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.85, h * 0.85, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function triangle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x - s / 2, y); ctx.lineTo(x + s / 2, y); ctx.lineTo(x, y - s);
  ctx.closePath(); ctx.fill();
  ctx.stroke();
}

export function drawPet(
  ctx: CanvasRenderingContext2D,
  assets: Assets,
  species: SpeciesId,
  form: Form,
  traitIds: string[],
  o: PetDrawOpts,
) {
  const bodyImg = assets.strips.get(`${species}_${form}_idle`);
  const frame = frameIndex(o.t);
  const squash = (o.squash ?? 0) + Math.sin(o.t / 300) * 0.02;
  const hopY = o.hop ? -Math.sin(o.hop * Math.PI) * 55 * o.scale : 0;
  const cheerY = o.cheer ? -Math.abs(Math.sin(o.cheer * Math.PI * 2)) * 30 * o.scale : 0;
  const y = o.y + hopY + cheerY;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (o.filter) ctx.filter = o.filter;
  // squash & stretch around feet anchor
  ctx.translate(o.x, y);
  ctx.scale(1 + squash * 0.6, 1 - squash * 0.6);
  ctx.translate(-o.x, -y);

  if (!bodyImg) {
    drawPlaceholder(ctx, species, form, o.x, y, o.scale, o.t, squash, !!o.sleeping);
    ctx.restore();
    return;
  }

  const alpha = o.alpha ?? 1;
  const flip = !!o.flip;

  // Back-layer traits (aura)
  for (const slot of DRAW_ORDER) {
    if (slot !== 'aura') continue;
    const id = traitIds.find((tid) => tid.includes(slot === 'aura' ? 'aura' : slot) || traitSlotOf(tid) === slot);
    const img = id ? assets.strips.get(id) : undefined;
    if (img) { ctx.save(); ctx.globalAlpha = 0.9; drawStrip(ctx, img, frame, o.x, y, o.scale, flip, alpha); ctx.restore(); }
  }

  // Body
  const sleepFrame = o.sleeping ? 0 : frame;
  drawStrip(ctx, bodyImg, sleepFrame, o.x, y, o.scale, flip, alpha);

  // Front-layer traits
  for (const slot of DRAW_ORDER) {
    if (slot === 'aura') continue;
    const id = traitIds.find((tid) => traitSlotOf(tid) === slot);
    const img = id ? assets.strips.get(id) : undefined;
    if (img) drawStrip(ctx, img, frame, o.x, y, o.scale, flip, alpha);
  }

  ctx.restore();
}

function traitSlotOf(traitId: string): string {
  if (traitId.includes('antlers') || traitId.includes('crown')) return 'crown';
  if (traitId.includes('wings')) return 'wings';
  if (traitId.includes('aura') || traitId.includes('ring') || traitId.includes('halo')) return 'aura';
  if (traitId.includes('plate') || traitId.includes('shardback')) return 'armor';
  if (traitId.includes('tail')) return 'tail';
  if (traitId.includes('eyes')) return 'eyes';
  return '';
}

/** Ground shadow ellipse under the pet. */
export function drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, hop: number) {
  const shrink = 1 - (hop ? Math.sin(hop * Math.PI) * 0.35 : 0);
  ctx.save();
  ctx.fillStyle = 'rgba(8,4,18,.4)';
  ctx.beginPath();
  ctx.ellipse(x, y + 6 * scale, 52 * scale * shrink, 13 * scale * shrink, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
