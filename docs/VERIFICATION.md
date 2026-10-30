# Prototype verification — 2026-10-29

## Build and automated checks

- `npm run build`: TypeScript and Vite production build pass.
- `npm test`: both tests pass (mission stop/interruption/completion/replay, and building exclusion from roads/courtyard).
- Production assets total approximately 2.85 MB uncompressed, with the main JS bundle approximately 989 kB gzip. The Rapier compatibility package embeds its WASM in the bundle. This is below the 30 MB initial game-asset target; optional Google Fonts requests are additional.
- Vite reports a large-chunk advisory for the physics/rendering bundle. This is a known prototype tradeoff, not a compilation failure.

## Browser checks

Chrome (headed, 1920 × 1080) and Firefox (Playwright desktop browser):

- Start screen and WebGL city render successfully.
- Keyboard acceleration moves the car.
- Sustained stopping triggers pickup and delivery; production Firefox transitions verified using deterministic QA positioning between destinations.
- The final Chrome production build completed the entire spawn → pickup → junctions → courtyard → delivery route using keyboard events only, without teleporting: 49.67 seconds wall time, 49.30 seconds mission time.
- Completion exposes a working replay button; replay resets mission time and target.
- Pause freezes elapsed time. Focus loss pauses and releases held controls.
- Reset returns the car to its spawn and clears physical velocity while preserving mission progress.
- Direct driving into a building stops at the correct wall boundary (car center z ≈ 57.40 at the tested wall); reversing drives away successfully.
- No browser errors after fixing the missing favicon. Rapier emits an upstream WASM initialization deprecation warning; initialization and physics still work.

## Five-minute stability run

A keyboard-event route driver drove the connected road loop continuously, without teleporting:

- Duration: 300.03 seconds.
- Distance: approximately 2,932.56 world meters.
- 26 route waypoints passed.
- No out-of-world or below-ground samples; car height remained stable.
- 299 sampled one-second FPS readings: median 60, tenth percentile 55, maximum 60. Two samples fell below 30; minimum 3.

This run took place while build/browser setup work was also running. It demonstrates typical performance on this host, not a guaranteed minimum across hardware. The strict uninterrupted 30 FPS floor is **not met by this measurement**. A dedicated performance pass on the user's normal play setup remains appropriate. The soak preceded the final brick-texture/camera-obstruction polish; driving physics did not change afterward.

## Known limits

- Geographically inspired blockout, not a surveyed map.
- Geometric temple placeholder; no supplied photos or generated landmark yet.
- Coarse architectural collision boxes; decorative props are visual-only.
- Arcade vehicle pitch/roll are locked, so natural overturns are prevented. Reset is verified for trapped/repositioned cars.
- No moving traffic, walking, combat, interiors, online persistence or mobile controls.
- The game is local/static-build ready; no public deployment was created.
