# Kathmandu Afterglow

An original Three.js browser driving prototype set in a compressed, stylized Koteshwor–Balkumari neighborhood. All included geometry and signs are generated locally. This is an artistic blockout, not a geographically accurate reconstruction.

## Run

Requires Node.js 22.12+ (or another version supported by Vite 7).

```sh
npm ci
npm run dev
```

Open the URL printed by Vite, then choose **Take the wheel**. Desktop Chrome and Firefox are the intended browsers.

```sh
npm test
npm run build
npm run preview
```

The production output is `dist/`, deployable to any static host. No server, account, API key, or paid asset tool is needed. Google Fonts is an optional external font request; system fallbacks work when it is unavailable.

## Play

- WASD or arrows: accelerate, brake/reverse, steer.
- Space: handbrake.
- R or Reset car: return to the starting road without losing delivery progress.
- Escape or Pause: pause/resume. Leaving the tab or window automatically pauses and releases held inputs.
- Stop inside the gold marker for 1.25 seconds to collect the parcel. Drive to the Balkumari courtyard and stop again to deliver it. The mission card offers another run after completion.

The speedometer, destination distance, elapsed active time, stop progress, and minimap update while driving. The timer freezes on completion and pause. Reset does not restart the timer.

## Architecture

- `src/main.ts`: scene bootstrap, fixed-step arcade controller, input, chase camera, HUD, lifecycle, and opt-in QA hooks.
- `src/world.ts`: reusable procedural building kit, original car and pagoda, signs, lamps, skyline, static colliders.
- `src/data/map.ts`: roads, spawn, courtyard, deterministic building placement.
- `src/data/vehicle.ts`: acceleration, braking, speed limits, steering and grip.
- `src/data/mission.ts`: locations and independently tested delivery state machine.
- `src/assets.ts`: optional GLB manifest and loader with explicit transforms and simple colliders.

Physics uses Rapier at 60 Hz with a bounded frame accumulator and continuous collision detection. Pitch/roll are constrained for arcade stability. Static geometry is merged by shared material; windows, tanks, and lane marks use instancing. Fixed daylight, fog, limited shadow coverage, and capped device pixel ratio keep the rendering budget bounded.

## Assets

See [the photography and asset guide](docs/ASSETS.md). No photo-to-3D model has been generated yet because no reference photographs were provided. The courtyard includes an original geometric pagoda placeholder. The importer and documentation are ready for a reviewed GLB.

## Verification

`npm test` covers sustained stops, stop interruptions, completion/replay, and keeping generated buildings clear of roads/courtyard. Browser acceptance results and limitations are recorded in `docs/VERIFICATION.md`.

Add `?qa` to a local URL for deterministic QA state/teleport helpers under `window.gameQA`. Normal sessions do not expose them. Teleport is for testing mission transitions, not a gameplay control.

Next milestones: refine the map against supplied photographs, replace one landmark, extend toward Baneshwor, and then build a distinctive Patan kit. Moving traffic, walking, combat, interiors, multiplayer, and day/night cycles are outside this prototype.
