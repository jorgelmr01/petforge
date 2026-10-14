# PETFORGE

**Raise your critter. Forge its legend.** 🥚⚒️

🎮 **[Play it in your browser](https://jorgelmr01.github.io/petforge/)** (also ships as an iPhone app — see below)

A 2010s-style virtual pet game for iPhone, with a modern twist: buy **traits** (horns, wings, auras, armor…) in the **Trait Forge** and fuse them onto your pet to make it cuter, cooler, and more powerful. Then take it into **Trials** (PvE battles) to win shards and glory.

## The game

- **Adopt** one of 3 species (Embercub 🔥 / Tidepup 🌊 / Galekit ⛈️), name it, hatch it
- **Raise it** through the day: feed, play, clean, rest — all animated, all juicy
- **Bond** with it to trigger **Evolution** (Sprout → Prime form, all-new art)
- **Forge**: 14 buyable traits across 6 slots × 4 rarities, fused with a full ceremony animation
- **Trials**: 5-tier PvE gauntlet with animated auto-battles
- **Power** score from bond + traits + care + evolution

## Repo layout

```
app/                  # the game (Vite + TypeScript + Canvas, Capacitor wrapper)
  src/game/           # data, state/save, sprites, particles, audio synth
  src/screens/        # onboard, den, forge, trials, keeper
  public/assets/      # generated sprite sheets, habitats, food art
assets/icon_1024.png  # App Store icon
GDD.md                # full game design doc
STYLE_GUIDE.md        # art direction + asset spec
privacy-policy.md     # App Store privacy policy
ios-SETUP.md          # Xcode build & TestFlight steps (needs a Mac)
```

## Develop

```bash
cd app
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/ (this is what ships in the app)
```

All art is AI-generated pixel-art sprite sheets (see `STYLE_GUIDE.md`). All sound is synthesized with WebAudio — zero audio assets. Saves live in `localStorage`, fully offline.

## Ship to iPhone

1. `npm run build`
2. Follow `ios-SETUP.md` (one-time: `npx cap add ios`, open in Xcode on a Mac, archive → TestFlight/App Store)
3. Needs: Apple Developer Program membership ($99/yr)

Privacy: the game collects **nothing** — no accounts, no analytics, no network calls. See `privacy-policy.md`.
