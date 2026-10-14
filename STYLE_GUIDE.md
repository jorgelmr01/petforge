# PETFORGE — Art Style Guide & Asset Spec

## Global style (applies to EVERY asset)

- **Chunky pixel art**, 16-bit JRPG monster-tamer style. Thick dark outlines (2-3 px at 96px scale), cel-shaded with 2-3 shade steps per color, vibrant saturated palette, subtle glow on energy/magic parts.
- **Cute but cool and powerful:** big expressive eyes AND sharp dynamic silhouettes, armored/plated details, glowing accents, confident poses.
- Character faces **right** in 3/4 view. Centered horizontally in each cell, feet/paws planted at the **bottom edge** of the cell.
- **Transparent background PNG.** No shadows baked in (we add them in code).
- **Frame consistency is critical:** the character's body position, scale, and silhouette anchor must be IDENTICAL across all 4 frames of a strip — only the animated parts (blink, bob, tail, glow pulse) change. Traits must align to the same anchor as the body.

## Sprite sheet format

- **Idle strip:** 4 frames, horizontal, total **384×96 px** (four 96×96 cells, no gaps, no borders).
- Frame timing: f1 neutral → f2 crouch/blink (squash 4%) → f3 neutral → f4 blink + tail sway + glow pulse. Loop at 6 fps (167ms/frame).
- **Naming:** `assets/sprites/<id>_idle.png` (e.g. `embercub_sprout_idle.png`).

## Base species (6 sheets: 3 species × 2 forms)

### Sprout forms — CUTE (baby, round, head:body ≈ 2:1, huge shiny eyes)
1. `embercub_sprout` — fire fox-cub. Round orange body, cream belly/cheeks, small flame-tuft on head (animated flicker), ember-tipped bushy tail, tiny paws.
2. `tidepup_sprout` — water axolotl-pup. Round teal body, external gill fin-ears (gentle wave), bubble cheeks, droplet spots, stubby tail fin.
3. `galekit_sprout` — storm griffin-chick. Round violet-white body, fluffy feather tuft, lightning-bolt crest (electric crackle), tiny nub wings, orange beak.

### Prime forms — COOL & POWERFUL (evolved, sharper, detailed, head:body ≈ 1:1)
4. `embercub_prime` — sleek adult vulpine. Flowing blazing mane, molten claw gauntlets, armored shoulder plates, long flame tail, confident smirk, ember particles in glow.
5. `tidepup_prime` — deep-sea guardian. Coral crown-fins, bioluminescent spot patterns, armored shell-plates on back, ribbon fins, wise eyes.
6. `galekit_prime` — tempest raptor. Broad storm-plume wings (folded at rest), lightning arcs between crest feathers, talon greaves, fierce proud eyes.

## Traits (12 sheets, same 384×96 / 4-frame format)

Draw **ONLY the trait**, positioned exactly where it attaches to the body, bobbing in sync with the idle (match the body's squash timing). Transparent everywhere else.

| ID | Slot | Rarity | Description |
|---|---|---|---|
| `trait_frost_antlers` | crown | rare | crystalline ice antlers, frost sparkle |
| `trait_solar_crown` | crown | epic | golden flame crown, radiant glow |
| `trait_moth_wings` | wings | common | cute dusty-rose moth wings, gentle flap |
| `trait_phoenix_wings` | wings | epic | blazing phoenix wings, fire feathers |
| `trait_storm_wings` | wings | legendary | crackling storm wings, lightning arcs |
| `trait_ember_aura` | aura | common | ring of floating embers behind body |
| `trait_tidal_ring` | aura | rare | orbiting water ring with bubbles |
| `trait_void_halo` | aura | legendary | dark violet halo, star specks |
| `trait_runed_plate` | armor | rare | bronze chest plate with glowing runes |
| `trait_crystal_shardback` | armor | epic | crystal spikes along the back |
| `trait_comet_tail` | tail | common | starry comet tail replacing/augmenting tail |
| `trait_blade_tail` | tail | epic | bladed armored tail |
| `trait_starlit_eyes` | eyes | rare | glowing starry eyes overlay (draw just the eyes, front layer) |
| `trait_prism_eyes` | eyes | legendary | rainbow prismatic eyes overlay |

(That's 14 traits — 2 per slot for crown/wings/aura/armor/tail, eyes has 2. Good: fuller shop.)

## Habitats (3 backgrounds, 840×1520 px portrait PNG)

- `habitat_ember_den` — cozy volcanic cave, glowing lava cracks, ember motes in air, warm rim light.
- `habitat_tide_grotto` — underwater cavern, god rays, floating bubbles, bioluminescent coral.
- `habitat_gale_roost` — mountain peak nest above clouds, wind streaks, distant floating islands.
- Style: painterly but pixel-consistent with sprites; darker edges (vignette) so UI pops; leave the **bottom third relatively calm** (pet stands there).

## Food (3 items, single 96×96 PNG each, transparent)

- `food_ember_berry` — glowing orange berry cluster. `food_tide_cake` — blue fish-shaped cake. `food_gale_fruit` — star-shaped violet fruit.

## App icon (1024×1024)

- `icon_1024` — Embercub Prime head + Solar Crown, dramatic, on deep violet-to-ember gradient, no text.

## Quality bar

Every asset: instantly readable at 48px, gorgeous at 400px. If a generation looks off (wrong frame count, misaligned anchor, background not transparent), regenerate that one — consistency beats quantity.
