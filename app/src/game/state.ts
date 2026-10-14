// PETFORGE — game state: save/load, needs simulation, bond, power.

import {
  Form, HabitatId, Slot, SpeciesId, TRAITS, traitById,
} from './data';

export interface Needs { hunger: number; happy: number; clean: number; energy: number; }

export interface PetState {
  v: number;
  species: SpeciesId;
  name: string;
  form: Form;
  bond: number;
  bondXp: number;
  needs: Needs;
  traits: Record<Slot, string | null>;
  ownedTraits: string[];
  habitat: HabitatId;
  shards: number;
  muted: boolean;
  sleeping: boolean;
  clearedTrials: string[];
  lastSeen: number;
  createdAt: number;
  stats: {
    feeds: number; plays: number; cleans: number; rests: number;
    pets: number; fusions: number; battlesWon: number; battlesLost: number;
  };
  daily: { date: string; checkin: boolean };
}

const SAVE_KEY = 'petforge_save_v1';

// Decay per hour
const DECAY: Record<keyof Needs, number> = { hunger: 4, happy: 5, clean: 2, energy: 3 };
const MAX_OFFLINE_HOURS = 8;

export function newGame(species: SpeciesId, name: string): PetState {
  const now = Date.now();
  return {
    v: 1,
    species,
    name: name.trim().slice(0, 16) || 'Buddy',
    form: 'sprout',
    bond: 1,
    bondXp: 0,
    needs: { hunger: 85, happy: 85, clean: 85, energy: 90 },
    traits: { crown: null, wings: null, aura: null, armor: null, tail: null, eyes: null },
    ownedTraits: [],
    habitat: ({ embercub: 'ember_den', tidepup: 'tide_grotto', galekit: 'gale_roost' } as Record<SpeciesId, HabitatId>)[species],
    shards: 60,
    muted: false,
    sleeping: false,
    clearedTrials: [],
    lastSeen: now,
    createdAt: now,
    stats: { feeds: 0, plays: 0, cleans: 0, rests: 0, pets: 0, fusions: 0, battlesWon: 0, battlesLost: 0 },
    daily: { date: '', checkin: false },
  };
}

export function loadState(): PetState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PetState;
    if (s.v !== 1 || !s.species) return null;
    applyOfflineProgress(s);
    return s;
  } catch {
    return null;
  }
}

let saveTimer: number | null = null;
export function saveState(s: PetState) {
  s.lastSeen = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  } catch { /* storage full — non-fatal */ }
}
export function saveStateSoon(s: PetState) {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveState(s), 800);
}

export function resetSave() {
  localStorage.removeItem(SAVE_KEY);
}

/** Apply needs decay for elapsed real time (called on load + every minute live). */
export function applyOfflineProgress(s: PetState) {
  const now = Date.now();
  const hours = Math.min((now - s.lastSeen) / 3_600_000, MAX_OFFLINE_HOURS);
  if (hours <= 0) { s.lastSeen = now; return; }
  for (const k of Object.keys(DECAY) as (keyof Needs)[]) {
    s.needs[k] = clamp(Math.round(s.needs[k] - DECAY[k] * hours), 0, 100);
  }
  if (s.sleeping) {
    // Sleeping restores energy while away (up to full), other needs still decay gently
    s.needs.energy = clamp(Math.round(s.needs.energy + 30 * hours), 0, 100);
  }
  s.lastSeen = now;
  saveState(s);
}

export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export const avgNeeds = (s: PetState) =>
  Math.round((s.needs.hunger + s.needs.happy + s.needs.clean + s.needs.energy) / 4);

export function moodOf(s: PetState): { label: string; face: string } {
  const a = avgNeeds(s);
  if (s.sleeping) return { label: 'Dreaming', face: '😴' };
  if (a >= 80) return { label: 'Radiant', face: '🤩' };
  if (a >= 60) return { label: 'Content', face: '😊' };
  if (a >= 40) return { label: 'Meh', face: '😐' };
  if (a >= 20) return { label: 'Grumpy', face: '😒' };
  return { label: 'Miserable', face: '😭' };
}

export const bondXpNeeded = (bond: number) => bond * 40;

/** Add bond XP; returns events: leveledUp, evolved. */
export function gainBond(s: PetState, xp: number): { leveledUp: boolean; evolved: boolean } {
  let leveledUp = false;
  let evolved = false;
  s.bondXp += xp;
  while (s.bond < 10 && s.bondXp >= bondXpNeeded(s.bond)) {
    s.bondXp -= bondXpNeeded(s.bond);
    s.bond += 1;
    leveledUp = true;
    if (s.bond === 5 && s.form === 'sprout') {
      s.form = 'prime';
      evolved = true;
      s.stats.fusions += 0;
    }
  }
  return { leveledUp, evolved };
}

/** Shard multiplier from home-turf habitat. */
export function shardMult(s: PetState): number {
  const home: Record<SpeciesId, HabitatId> = { embercub: 'ember_den', tidepup: 'tide_grotto', galekit: 'gale_roost' };
  let m = home[s.species] === s.habitat ? 1.1 : 1;
  if (s.bond >= 10) m *= 1.1; // Soulbound
  return m;
}

export function addShards(s: PetState, base: number): number {
  const n = Math.round(base * shardMult(s));
  s.shards += n;
  return n;
}

export function traitPowerTotal(s: PetState): number {
  return Object.values(s.traits)
    .filter(Boolean)
    .reduce((sum, id) => sum + (TRAITS.find((t) => t.id === id)?.rarity ? rarityPower(traitById(id as string).rarity) : 0), 0);
}

import { RARITY_META } from './data';
function rarityPower(r: keyof typeof RARITY_META) { return RARITY_META[r].power; }

export function powerOf(s: PetState): number {
  const moodBonus = moodOf(s).label === 'Radiant' ? Math.round((10 + s.bond * 4) * 0.1) : 0;
  return 10 + s.bond * 4 + traitPowerTotal(s) + Math.floor(avgNeeds(s) / 10) + (s.form === 'prime' ? 25 : 0) + moodBonus;
}

export function powerBreakdown(s: PetState): { label: string; value: number }[] {
  return [
    { label: 'Base', value: 10 },
    { label: `Bond Lv.${s.bond}`, value: s.bond * 4 },
    { label: 'Traits', value: traitPowerTotal(s) },
    { label: 'Care', value: Math.floor(avgNeeds(s) / 10) },
    { label: 'Evolution', value: s.form === 'prime' ? 25 : 0 },
  ];
}

/** Daily check-in: 50 shards once per calendar day. */
export function dailyCheckin(s: PetState): number {
  const today = new Date().toDateString();
  if (s.daily.date === today && s.daily.checkin) return 0;
  s.daily = { date: today, checkin: true };
  return addShards(s, 50);
}

export function lowestNeed(s: PetState): keyof Needs {
  const n = s.needs;
  let k: keyof Needs = 'hunger';
  for (const key of Object.keys(n) as (keyof Needs)[]) if (n[key] < n[k]) k = key;
  return k;
}

export function petLine(s: PetState): string {
  if (s.sleeping) return 'z z z…';
  const n = s.needs;
  if (n.hunger < 30) return 'My tummy is rumbling… 🍖';
  if (n.energy < 25) return '*yaaawn*… so sleepy…';
  if (n.clean < 30) return 'I feel icky. Scrub please? 🫧';
  if (n.happy < 30) return 'Play with me? Please? 🥺';
  const a = avgNeeds(s);
  if (a >= 80) return pick(['Best day ever!!', '*happy wiggle*', 'You are the best keeper!']);
  if (a >= 55) return pick(['*content purr*', 'This den is cozy.', 'What are we doing today?']);
  return pick(['*grumble grumble*', 'Hmph.']);
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
