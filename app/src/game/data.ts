// PETFORGE — all static game data: species, traits, foods, habitats, trials.

export type SpeciesId = 'embercub' | 'tidepup' | 'galekit';
export type Form = 'sprout' | 'prime';
export type Slot = 'crown' | 'wings' | 'aura' | 'armor' | 'tail' | 'eyes';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type FoodId = 'ember_berry' | 'tide_cake' | 'gale_fruit';
export type HabitatId = 'ember_den' | 'tide_grotto' | 'gale_roost';

export interface Species {
  id: SpeciesId;
  name: string;
  element: string;
  tagline: string;
  desc: string;
  colors: { main: string; belly: string; glow: string };
  favFood: FoodId;
  greetings: string[];
}

export const SPECIES: Record<SpeciesId, Species> = {
  embercub: {
    id: 'embercub',
    name: 'Embercub',
    element: 'Fire',
    tagline: 'Bold little flame, big brave heart.',
    desc: 'A fox-cub whelped in volcanic ash. Fearless, loyal, and always slightly singed.',
    colors: { main: '#e8632c', belly: '#ffd9a8', glow: '#ffb02e' },
    favFood: 'ember_berry',
    greetings: ['*happy yip!*', 'Did you bring snacks?', 'I dreamed of volcanoes!'],
  },
  tidepup: {
    id: 'tidepup',
    name: 'Tidepup',
    element: 'Water',
    tagline: 'Chill tide, deep heart.',
    desc: 'An axolotl-pup from the quiet deep. Calm, curious, and excellent at naps.',
    colors: { main: '#2ca8c7', belly: '#c8f4ff', glow: '#4de3ff' },
    favFood: 'tide_cake',
    greetings: ['*bloop bloop*', 'The currents missed you.', 'Five more minutes…'],
  },
  galekit: {
    id: 'galekit',
    name: 'Galekit',
    element: 'Storm',
    tagline: 'Tiny wings, hurricane attitude.',
    desc: 'A griffin-chick hatched in a thunderstorm. Loud, proud, and faster than gossip.',
    colors: { main: '#8a63e8', belly: '#efe6ff', glow: '#c99aff' },
    favFood: 'gale_fruit',
    greetings: ['*SKREEE!*', 'Race you to the clouds!', 'I am the storm. Pet me.'],
  },
};

export const RARITY_META: Record<Rarity, { label: string; color: string; power: number; price: number }> = {
  common: { label: 'Common', color: '#9aa3b2', power: 3, price: 60 },
  rare: { label: 'Rare', color: '#4da3ff', power: 6, price: 150 },
  epic: { label: 'Epic', color: '#b366ff', power: 12, price: 350 },
  legendary: { label: 'Legendary', color: '#ffb02e', power: 20, price: 800 },
};

export interface Trait {
  id: string;
  slot: Slot;
  name: string;
  rarity: Rarity;
  desc: string;
  requiresPrime?: boolean;
}

export const SLOT_LABEL: Record<Slot, string> = {
  crown: 'Crown',
  wings: 'Wings',
  aura: 'Aura',
  armor: 'Armor',
  tail: 'Tail',
  eyes: 'Eyes',
};

export const TRAITS: Trait[] = [
  { id: 'trait_moth_wings', slot: 'wings', name: 'Moth Wings', rarity: 'common', desc: 'Dusty-rose wings. Adorable. Surprisingly zippy.' },
  { id: 'trait_ember_aura', slot: 'aura', name: 'Ember Aura', rarity: 'common', desc: 'A cozy ring of floating embers.' },
  { id: 'trait_comet_tail', slot: 'tail', name: 'Comet Tail', rarity: 'common', desc: 'Leaves a trail of stardust everywhere.' },
  { id: 'trait_frost_antlers', slot: 'crown', name: 'Frost Antlers', rarity: 'rare', desc: 'Crystalline ice antlers. Majestic. Cold.' },
  { id: 'trait_tidal_ring', slot: 'aura', name: 'Tidal Ring', rarity: 'rare', desc: 'An orbiting ring of living water.' },
  { id: 'trait_runed_plate', slot: 'armor', name: 'Runed Plate', rarity: 'rare', desc: 'Bronze chestplate humming with runes.' },
  { id: 'trait_starlit_eyes', slot: 'eyes', name: 'Starlit Eyes', rarity: 'rare', desc: 'Eyes like a clear night sky.' },
  { id: 'trait_solar_crown', slot: 'crown', name: 'Solar Crown', rarity: 'epic', desc: 'A crown of living flame. Royalty, obviously.', requiresPrime: true },
  { id: 'trait_phoenix_wings', slot: 'wings', name: 'Phoenix Wings', rarity: 'epic', desc: 'Blazing wings. Rebirth included.', requiresPrime: true },
  { id: 'trait_crystal_shardback', slot: 'armor', name: 'Crystal Shardback', rarity: 'epic', desc: 'Prismatic crystal spikes. Do not hug.', requiresPrime: true },
  { id: 'trait_blade_tail', slot: 'tail', name: 'Blade Tail', rarity: 'epic', desc: 'A tail that means business.', requiresPrime: true },
  { id: 'trait_storm_wings', slot: 'wings', name: 'Storm Wings', rarity: 'legendary', desc: 'Wings of pure thunderstorm. The sky obeys.' },
  { id: 'trait_void_halo', slot: 'aura', name: 'Void Halo', rarity: 'legendary', desc: 'A halo of star-specked darkness.' },
  { id: 'trait_prism_eyes', slot: 'eyes', name: 'Prism Eyes', rarity: 'legendary', desc: 'Every color, all at once, judging you lovingly.' },
];

export const traitById = (id: string): Trait => TRAITS.find((t) => t.id === id)!;

export interface Food {
  id: FoodId;
  name: string;
  hunger: number;
  price: number;
  desc: string;
}

export const FOODS: Record<FoodId, Food> = {
  ember_berry: { id: 'ember_berry', name: 'Ember Berry', hunger: 30, price: 5, desc: 'Warm, sweet, faintly spicy.' },
  tide_cake: { id: 'tide_cake', name: 'Tide Cake', hunger: 30, price: 5, desc: 'A fish-shaped cake. Somehow delicious.' },
  gale_fruit: { id: 'gale_fruit', name: 'Gale Fruit', hunger: 30, price: 5, desc: 'Star-shaped. Tastes like wind.' },
};

export interface Habitat {
  id: HabitatId;
  name: string;
  desc: string;
  species: SpeciesId;
  ambient: 'embers' | 'bubbles' | 'leaves';
}

export const HABITATS: Record<HabitatId, Habitat> = {
  ember_den: { id: 'ember_den', name: 'Ember Den', desc: 'A cozy volcanic cave. Home turf for Embercubs: +10% shards.', species: 'embercub', ambient: 'embers' },
  tide_grotto: { id: 'tide_grotto', name: 'Tide Grotto', desc: 'A glowing underwater cavern. Home turf for Tidepups: +10% shards.', species: 'tidepup', ambient: 'bubbles' },
  gale_roost: { id: 'gale_roost', name: 'Gale Roost', desc: 'A nest above the clouds. Home turf for Galekits: +10% shards.', species: 'galekit', ambient: 'leaves' },
};

export interface Trial {
  id: string;
  name: string;
  foeName: string;
  foeSpecies: SpeciesId;
  foeForm: Form;
  foePower: number;
  reward: number;
  desc: string;
}

export const TRIALS: Trial[] = [
  { id: 'moss', name: 'Moss Trial', foeName: 'Mossjaw', foeSpecies: 'tidepup', foeForm: 'sprout', foePower: 18, reward: 40, desc: 'A grumpy garden guardian.' },
  { id: 'ember', name: 'Ember Trial', foeName: 'Cinder Maw', foeSpecies: 'embercub', foeForm: 'sprout', foePower: 32, reward: 70, desc: 'All bark, mostly bite.' },
  { id: 'tide', name: 'Tide Trial', foeName: 'Abyssal Fin', foeSpecies: 'tidepup', foeForm: 'prime', foePower: 50, reward: 110, desc: 'It has seen the deep. It is unimpressed.' },
  { id: 'storm', name: 'Storm Trial', foeName: 'Tempest Beak', foeSpecies: 'galekit', foeForm: 'prime', foePower: 72, reward: 160, desc: 'Faster than your excuses.' },
  { id: 'void', name: 'Void Trial', foeName: 'Null Eater', foeSpecies: 'embercub', foeForm: 'prime', foePower: 102, reward: 250, desc: 'The final shadow. Bring everything.' },
];

export const TRIAL_ENERGY_COST = 20;
export const FOOD_PRICE = 5;
