# PETFORGE — Game Design Document

**Tagline:** *Raise your critter. Forge its legend.*
**Platform:** iPhone (Capacitor-wrapped PWA, portrait, offline-first)
**Genre:** Virtual-pet raising sim + trait-fusion battler
**Session shape:** 2–5 minute check-ins, 3–6× per day (very 2010s-pet-game)

## 1. Design pillars

1. **Alive in your pocket.** The pet is *animated* — it breathes, blinks, bounces, sleeps, celebrates. Every interaction gets a visible, juicy reaction within 300ms.
2. **Cute → cool → powerful.** The fantasy arc: you adopt a round baby blob and, through care + forged traits, it becomes a detailed, armored, aura-crackling powerhouse. The art must sell both ends.
3. **Fusion is the signature.** Buy traits, fuse them onto your pet, watch it transform. The Forge moment (scan-lines, particles, reveal) should feel like unboxing.
4. **No babysitting guilt.** Needs decay slowly; offline progress is capped and gentle. Missing a day never punishes — it just pauses the party.

## 2. The fantasy

You are a **Keeper**. In your pocket dimension (your *Den*), a wild critter egg hatches for you. You feed it, play with it, keep it clean, tuck it in. As your **Bond** grows it **evolves** (Sprout → Prime). You earn **Shards** and spend them in the **Trait Forge**, buying horns, wings, auras, armor, tails, eyes — each fused trait changes how your pet looks *and* how strong it is. Strong pets enter **Trials** (PvE gauntlets) to win more shards and glory.

## 3. Core loop

```
CHECK IN → pet greets you (animated, reacts to need state)
  → NEEDS: feed / play / clean / rest (each = animation + stat gain + shards + bond XP)
  → FORGE: spend shards on traits → FUSE → pet transforms → Power rises
  → TRIALS: spend energy to battle → win shards/loot → back to care
```

**Moment-to-moment:** tap the pet → it squeaks, hearts pop, it hops. Drag food to its mouth → chomp-chomp animation. Bubble-scrub → sparkles. These micro-interactions are the soul of the 2010s pet game.

## 4. Species (base animals — pick 1 at hatch)

| Species | Element | Vibe (Sprout) | Vibe (Prime) | Colors |
|---|---|---|---|---|
| **Embercub** | Fire | round fox-cub, ember-tipped tail, head flame-tuft | sleek vulpine, blazing mane, molten claws | orange/cream, ember glow |
| **Tidepup** | Water | axolotl-pup, fin-ears, bubble cheeks | deep-sea guardian, coral crown-fins | teal/aqua, bioluminescent spots |
| **Galekit** | Storm | griffin-chick, lightning crest, nub wings | tempest raptor, storm-plume wings | violet/white, electric arcs |

Each species: **Sprout** form (cute, simple, big eyes) → **Prime** form at Bond 5 (cool/powerful, detailed armor-like natural plating, glowing accents). 4-frame idle animation per form.

## 5. Needs system

Four needs, 0–100. Decay per real hour (offline capped at 8h):

| Need | Decay/h | Action | Effect | Cooldown |
|---|---|---|---|---|
| Hunger | −4 | **Feed** (choose food) | +30 (+40 if favorite) | none, food costs 5 shards |
| Happiness | −5 | **Play** (tap-the-sparkle mini) | +25, −10 Energy | none |
| Cleanliness | −2 | **Clean** (bubble scrub) | +35 | none |
| Energy | −3 | **Rest** (sleep toggle) | +40 over 30s nap | — |

- **Pet** (tap pet): +5 Bond XP, hearts, hop animation. No cooldown, tiny shard trickle (1 shard / 10 taps, anti-grind).
- Need states change idle behavior: hungry → tummy rumble + sad blink; sleepy → yawns; dirty → stink lines; happy → sparkles.
- **Mood** = average of needs; shown as face icon. Mood ≥ 70: "Radiant" (+10% trial power).

## 6. Bond & evolution

- Bond XP from every care action (Feed 10, Play 12, Clean 10, Rest 8, Pet 2).
- Bond levels 1–10. XP curve: `level * 40`.
- **Evolution at Bond 5:** Sprout → Prime. Evolution ceremony: white flash, rising particles, new form reveal + fanfare. Prime form = new sprite set, +25 base Power, unlocks Epic traits.
- Bond 10: "Soulbound" — golden nameplate, +10% all shard gains.

## 7. Trait Forge (the Instagram-trend mechanic)

- 6 equip slots: **Crown/Horns, Wings, Aura, Armor, Tail, Eyes**.
- 12 traits, 2 per slot, across 4 rarities:

| Slot | Common | Rare | Epic | Legendary |
|---|---|---|---|---|
| Crown | — | Frost Antlers (❄) | Solar Crown (☀) | — |
| Wings | Moth Wings | — | Phoenix Wings | Storm Wings |
| Aura | Ember Aura | Tidal Ring | — | Void Halo |
| Armor | — | Runed Plate | Crystal Shardback | — |
| Tail | Comet Tail | — | Blade Tail | — |
| Eyes | — | Starlit Eyes | — | Prism Eyes |

- **Trait power:** Common 3 · Rare 6 · Epic 12 · Legendary 20.
- **Prices (shards):** Common 60 · Rare 150 · Epic 350 · Legendary 800.
- **Fusion:** buying a trait triggers the Forge sequence — pet walks to the anvil, scan-lines + rising particles, flash, trait appears with a *shing*. Equipping is instant after owned; only one trait per slot.
- Traits are **drawn as animated overlays** synced to the idle frames (same 96×96 grid, 4 frames). Draw order: Aura (behind) → Body → Tail → Armor → Wings → Crown → Eyes (front glow).
- Selling back: 40% refund.

## 8. Power

`Power = 10 + Bond×4 + Σ trait power + floor(avg(needs)/10) + evolution bonus (0/25)`

Power gates Trials and is the "number go up" flex. Shown big on the pet card.

## 9. Habitats ("place")

Your Den has a biome background. 3 habitats (match species, but any pet can live anywhere):

- **Ember Den** (volcanic cave), **Tide Grotto** (underwater cavern), **Gale Roost** (cloud peak).
- Matching species in matching habitat: +10% shard gains ("Home turf").
- Habitats are backdrops (parallax, animated embers/bubbles/clouds in code).

## 10. Trials (PvE)

- 5 tiers: **Moss Trial → Ember Trial → Tide Trial → Storm Trial → Void Trial**. Foe = shadow version of a species with themed name ("Cinder Maw", "Abyssal Fin"…).
- Entry costs 20 Energy. Battle = 3-round auto-battle with animated clash (both sprites lunge, impact particles, damage numbers), win chance from Power delta with ±15% randomness. 3 wins to clear a tier → big shard chest + trait discount token.
- Losing: pet is "Winded" (needs -10), no shame, retry.

## 11. Economy

- **Shards** (soft currency, earn-only, no IAP in v1).
  - Sources: care actions 5–15, trials 40–120, daily check-in 50, evolution 200.
  - Sinks: food 5, traits 60–800, trial entry is Energy not shards.
- Target pacing: first Rare trait within day 2; first Epic within week 1–2; Legendary = long-term chase.

## 12. Screens

1. **Den (home):** habitat bg, pet (animated, tappable), needs bars, Mood face, Power badge, action bar (Feed/Play/Clean/Rest), nav.
2. **Forge:** trait shop grid by slot, rarity colors, Try/Fuse buttons, fusion animation overlay.
3. **Trials:** tier list, foe preview, battle scene.
4. **Keeper (profile):** pet card (species, form, Bond XP bar, Power breakdown, trait loadout), stats, settings.
- **Onboarding:** species pick (3 animated previews) → name your pet → hatch animation → Den.

## 13. Art direction

- **Chunky pixel art**, 16-bit JRPG monster style, thick outlines, saturated colors, glowing accents, cel-shaded.
- Pet frames: 96×96 px cells, 4-frame idle strips (384×96). Transparent PNG.
- Sprout = cute (big eyes, round, 2:1 head:body). Prime = cool/powerful (sharper silhouette, plating, glow, 1:1).
- UI: dark cozy den theme, rounded chunky buttons, pixel font accents (use "Press Start 2P" for headers, system rounded for body).
- Juice: squash-and-stretch on tap, particle hearts/sparkles/stars, screen shake on evolution/fusion, floating damage numbers.

## 14. Audio

- All synthesized with WebAudio (no assets): soft blips, chomp, sparkle arpeggio, fusion riser, fanfare, battle hits. Mute toggle. Tiny `sfx.ts` synth.

## 15. Tech

- Vite + TypeScript + Canvas 2D (pixel-art, `imageSmoothingEnabled=false`), DOM UI overlay.
- Capacitor for iOS wrapper. `localStorage` saves (versioned), offline-first.
- Logical resolution 420×760 portrait, DPR-aware scaling.

## 16. Roadmap (post-v1)

- Den decor shop (buyable place traits), pet wardrobe recolors, 2nd pet slot, friend visits (share code), seasonal traits, iCloud sync.

## 17. Ship checklist

- [ ] App icon 1024, splash, screenshots (6.7" + 6.5")
- [ ] Privacy policy (no data collection — all local)
- [ ] `ios-SETUP.md` (Xcode archive steps)
- [ ] Tested on real device, 60fps, no jank
