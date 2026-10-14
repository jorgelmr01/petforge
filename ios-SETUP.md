# PETFORGE — iOS Ship Guide

Everything below happens **on a Mac with Xcode installed**. Your assistant built and tested the web app; these are the only steps that need Apple hardware.

## One-time setup

1. **Apple Developer Program** — enroll at [developer.apple.com](https://developer.apple.com) ($99/yr). This is required for TestFlight and the App Store.
2. **Xcode** — install from the Mac App Store (free), open it once, accept the license, let it install components.

## Build the iOS app

In a terminal on the Mac, inside this repo:

```bash
cd app
npm install
npm run build          # builds dist/ — the thing that ships

npx cap add ios         # one-time: creates the ios/ native project
npx cap sync           # copies dist/ + config into the native project
npx cap open ios       # opens in Xcode
```

In Xcode:

3. Select the **App** target → **Signing & Capabilities** → pick your Team (your Apple Developer account). Xcode manages the provisioning profile automatically.
4. Set a unique **Bundle Identifier** if needed (default `com.petforge.app` is in `capacitor.config.ts`).
5. **App icon**: drag `assets/icon_1024.png` into Xcode → App → Assets.xcassets → AppIcon (or use the generated icon set).
6. **Display name**: "PETFORGE". **Version**: 1.0 (build 1).
7. Pick **Any iOS Device (arm64)** as the run destination → **Product → Archive**.
8. In the Organizer: **Distribute App → TestFlight & App Store**.

## TestFlight (recommended first)

- Upload the archive to App Store Connect, add yourself + a few testers in TestFlight, install on your iPhone, play for a day or two.
- Things to verify on-device: 60fps pet animation, sounds play (check the mute toggle), save persists after force-quit, no layout issues on your screen size.

## App Store listing

- **Screenshots**: 6.7" (1290×2796) and 6.5" (1242×2688) — capture from the game: Den with pet, Forge mid-fusion, Trials battle, Keeper card.
- **Privacy**: attach `privacy-policy.md` (host it at a URL — e.g. a GitHub gist — and link it in App Store Connect). The app collects no data; fill the privacy nutrition label as "Data Not Collected".
- **Category**: Games → Simulation or Family. **Age rating**: 4+.
- Submit for review. Typical review: 1–3 days.

## Updating later

```bash
cd app && npm run build && npx cap sync
# then Archive again in Xcode, bump the build number
```

## Troubleshooting

- **White screen on launch**: `dist/` is stale — rerun `npm run build && npx cap sync`.
- **Signing errors**: Xcode → Preferences → Accounts → re-add your Apple ID; set Team again.
- **Capacitor plugin warnings**: safe to ignore for this app (no native plugins used).
