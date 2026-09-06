# Genting Drift

A playable core boilerplate for a fictional Genting/Karak-inspired closed mountain pass. Units are metres, kilograms, seconds and radians; car-local +Z is forward, +X is left from the chase camera, +Y is up. Positive yaw steers left; right input produces negative yaw.

## Mountain terrain

The current map uses the complete 10.1 km closed circuit from the user-supplied `New file 1.gpx`, replacing the previous 21.8 km route. The importer detects nearby endpoints, resamples the closing segment and wraps elevation smoothing across the seam. There is no finish barrier on the loop. Road, shoulder and terrain share a smoothed elevation field so repeated GPX traversals do not create vertically stacked pavement. A short grass verge joins each shoulder to a mountain shelf; there are no continuous bridge foundations. Terrain resolution increases to four metres beside the route, with shared triangle edges between detail levels. Vegetation samples those same rendered triangles. The slopes and vegetation are scenic approximations, not surveyed Genting terrain.

`node components/game/environment/check-terrain.mjs` checks clearance and shoulder support along the whole route, plus the actual pavement triangle centres. `node --experimental-strip-types components/game/environment/preview-terrain.mjs` renders terrain-only previews into `tmp/` for inspecting the road-to-mountain connection without WebGL. These previews do not replace driving checks in the browser. Scene edits force a Fast Refresh remount to rebuild cached GPU geometry.

## Structure

```text
app/
  layout.tsx                      Existing fonts and global Tailwind styles
  game/page.tsx                   Server route and game metadata
components/game/
  GentingDriftGame.tsx            Client boundary, lazy canvas, error boundary
  GameCanvas.tsx                  R3F canvas and fixed-step Rapier world
  camera/
    CarOrbitCamera.tsx            Car-following 360-degree orbit, zoom and recenter
    useCameraStore.ts             Follow / Free View mode (Follow by default)
  models/
    SilviaModel.tsx               Cached editable GLB parts and animated wheels/lights
    VehicleLights.tsx             Headlight beams, brake glow and reversing illumination
    prepare-silvia.mjs            Assemble/optimize the user-supplied source kit
    preview-silvia.mjs            Offline front/rear geometry previews
    silvia.test.mjs               Asset scale, wheel pivot and credit validation
  audio/
    GameAudio.tsx                 Gesture unlock, pause/visibility and cleanup
    VehicleSound.ts               Layered procedural Web Audio mixer
    AudioControls.tsx             Sound toggle and master volume
    useAudioStore.ts              Audio status and session preferences
    powertrain.ts                 RPM and automatic gear hysteresis
    powertrain.test.mjs            RPM and gear-boundary regression tests
  environment/
    track.ts                     Inclined closed spline and road-strip geometry
    MountainRoad.tsx              Trimesh road, barriers, forest, mist, lamps
  physics/
    CarController.tsx            Dynamic chassis, suspension, tire forces, camera
    driveDirection.ts            Brake-before-reverse selector and pedal arbitration
    driveDirection.test.mjs       Forward/reverse safety and coasting checks
    driftMath.ts                 Pure slip, grip and scoring functions
    driftMath.test.mjs            Physics-math regression tests
    roadPhysics.test.mjs          Real Rapier raycast and road geometry smoke test
    useDrivingInput.ts           Keyboard and pointer input, focus cleanup
  stores/
    useGameStore.ts               Telemetry, score, pause and reset
  ui/
    GameHUD.tsx                  Swiss/neobrutalist HUD, GSAP, touch controls
```

## Vehicle model

### Garage

**Front fenders** offers five matched left/right pairs: original flared (214/219), two slim variants (215/220 and 216/221), and two dark-finish variants (217/222 and 218/223). **Widebody** swaps the complete roof/rear-quarter shell: original (103), wider rear arches (104), or slimmer arches (105). Each selection hides the corresponding original meshes, including shell trim, to prevent overlapping panels. Names describe the source geometry rather than verified aftermarket brands. Paint follows body-colored panels; dark variants retain their trim finish. Track width, wheel offset and collision geometry remain unchanged. Saved builds without these categories retain the original panels. The alternate asset now contains 34 meshes, approximately 1.47 MB.

Rear-wing choices include five source designs (low lip, raised wing and three GT wings) plus None. The base GT wing (source 47) is managed by the same exclusive selection as the alternatives. Trunk choices are original lid (11), smooth lid (10), or deliberately exposed frame (9). Existing saved builds default to the original trunk. The exporter derives base-asset ownership automatically to avoid duplicate meshes; the updated alternate asset is approximately 0.99 MB.

Use **Garage / customize** in `/game` to enter the body shop. The garage has an orbitable 3D preview, front/rear bumper variants, bonnet variants (including exposed engine), side skirts, rear wings and six paint finishes. Part names such as "Street 01" are neutral UI labels, not verified aftermarket brands. Geometry comes from the user's source kit, not generated substitute bodywork.

Selections preview immediately. **Fit & drive** saves a validated build in browser local storage and respawns the car; **Cancel / back** discards the preview and also respawns. Driving controls/audio are unmounted inside the garage. Saved selections survive resets and reloads; storage-blocked browsers retain the selection only for the session. These changes are cosmetic and do not alter collision geometry, aero or performance.

`garage/catalog.ts` maps categories to source IDs; `garage/useGarageStore.ts` owns saved builds; `garage/Garage.tsx` is the lazily loaded workshop. `SilviaModel.tsx` shares the same part-selection logic between the preview and driving scene and clones paint materials to avoid altering the loader cache. `public/models/silvia-customization.glb` adds approximately 0.76 MB of alternate parts without replacing the base GLB. Regenerate with `node --experimental-strip-types components/game/models/prepare-customization.mjs C:/Users/USER/Downloads/nissan_silvia_200sx_s15.glb`.

The visible car is the user-supplied Nissan Silvia 200SX S15 by ZapupaNekra (CC BY 4.0). Its source was an exploded parts/variant kit with a single generic material. `prepare-silvia.mjs` selects one coherent set, removes display offsets, assigns silver paint and glass/light/trim materials, and welds duplicate vertices within each part. The resulting `public/models/silvia-s15.glb` is approximately 3.6 MB versus the 31.3 MB original. No external model service is contacted at runtime.

Parts remain separately named under `Body/Panels`, `Body/Chassis`, `Body/Headlights`, `Body/Taillights` and `Body/ReverseLights`, with original source part IDs in userData. This preserves the structure needed for a future customization UI; the game does not yet include that editor. Chassis/frame and wheel-well parts are restored. Light covers are transparent with separate bulbs/LEDs behind them. Headlights cast real forward spotlights; tail lamps glow continuously and brighten on braking; reverse LEDs and a rear spotlight activate when gear is -1 (displayed as R). Mutable light materials are cloned so resetting one car does not mutate the GLTF cache.

The body uses +Z forward and is scaled to the supplied stock exterior dimensions. Its ground plane is offset by -0.55 m relative to the physical center of mass. Wheels use the supplied axle tracks, wheelbase and 205/55 R16 radius. Scene transforms are cloned per reset; cached geometries/materials are shared. Creator/source/license and modification notes are in `public/models/CREDITS.md` and linked from the pause menu.

To regenerate from the original supplied file:

```sh
node components/game/models/prepare-silvia.mjs "C:/Users/USER/Downloads/nissan_silvia_200sx_s15.glb"
```

Four suspension rays originate at chassis-local wheel mounts and exclude the chassis collider. The wheel visuals follow suspension travel and have no rigid colliders. The 1,240 kg chassis remains fully dynamic, with explicit mass properties and chassis/roof impact colliders. No roll or pitch locks are used.

At each fixed 1/120-second physics step, `physics/s15Physics.ts` runs the shared game/test simulation:

1. Raycast along negative chassis-up, up to suspension rest length plus tire radius.
2. Compute compression `x = restLength - (hitDistance - wheelRadius)` and contact velocity `vContact = vCOM + omega cross contactOffset`.
3. Compute spring load with separate compression/rebound digressive damping, progressive bump stops and paired axle anti-roll forces. Apply the resulting normal force at each contact point.
4. Project steered wheel-forward onto the road tangent plane. Compute `alpha = atan2(vLateral, max(abs(vLongitudinal), 1.5))`.
5. Use a continuous saturating brush-style lateral curve with gradual high-slip falloff. Rear handbrake grip blends toward 0.42 rather than changing abruptly.
6. Integrate wheel rotational inertia and longitudinal slip implicitly; rear drive torque uses the six supplied gear ratios and 3.692 final drive. Combine longitudinal/lateral forces with a friction circle. Apply `impulse = force*dt` at each contact.
7. While the driver counter-steers toward momentum, add bounded steer assistance and a damped yaw torque. Linear velocity is never rotated or overwritten to fake drift.

Tune the `S15` configuration in `physics/s15Physics.ts`. Supplied specifications: 1,240 kg, 2.525 m wheelbase, 1.470/1.460 m tracks and 0.31595 m tire radius. CG height (0.55 m), 54% front balance, inertia, engine torque curve, reverse ratio and tire parameters are calibration estimates, not measured OEM data. The 58,840/49,033 N/m front/rear effective wheel rates approximate a 6/5 kgf/mm setup assuming unit motion ratio; actual suspension geometry requires measured motion ratios. This is an arcade approximation, not a validated full Pacejka or multi-link simulation. Automatic shifting has RPM hysteresis and a 450 ms cooldown with a short torque cut. Live sound uses the same physics RPM/gear telemetry; the older standalone audio/powertrain helpers are not used by the controller.

`s15Physics.test.mjs` exercises the actual Rapier controller: static load/ride height, both-direction 108 km/h steering reversals, acceleration/braking/reverse, grip continuity and sixth gear. These flat-ground checks do not replace mountain-road play-testing or establish real-car fidelity.

## Scoring and state

Chassis slip is signed yaw relative to momentum: `beta = atan2(dot(v,right), dot(v,forward))`. Valid drifts require at least three grounded wheels, forward travel, speed above 8 m/s and 12-70 degrees of slip. Points integrate `speed * multiplier * dt * 10`. Multiplier rewards angle and sustained duration, capped at 6x. Leaving the valid range resets the duration bonus; earned points remain until reset.

Physics calls `useGameStore.setState` directly. The HUD uses an imperative subscription to update text, while React subscribes only to pause/reset. This avoids rerendering the scene or HUD on every physics tick. Score is session-only.

## Visuals and controls

Exponential distance fog approximates altitude mist; Drei spotlight cones add visible light shafts. This is not a physically volumetric scattering renderer. Damp asphalt uses a low-roughness clearcoat material and local lights. No remote models or textures are required. Pixel ratio is capped at 1.5, with six non-shadowed streetlights. Large production maps should instance vegetation/barriers and add light-distance culling.

- W/up: drive forward; hold S/down to brake, then reverse once stopped; A/D or left/right: steer.
- Opposite-pedal direction changes require speed below 0.65 m/s for 0.3 seconds. W brakes when reversing, then selects forward. Both pedals together brake. Reverse drive tapers to zero at 8 m/s; downhill rolling can exceed this drive limit.
- Space: rear handbrake; Escape: pause; R: reset car and score.
- Pointer controls support simultaneous steering and throttle.
- Follow mode (default) smoothly turns behind the car with a small speed-dependent distance increase. Free View keeps a user-selected orbit while following the car's position. V or the Follow / Free View HUD button switches modes. In Free View, drag/swipe for 360-degree horizontal rotation and scroll/pinch to zoom (4-18 metres). C recenters behind the car. Vertical orbit stays above the car's ground plane; neither mode provides scenery collision avoidance.
- Losing focus pauses the simulation and clears input.

The model-loading Suspense fallback uses a static status message, deliberately avoiding Drei's global `useProgress` subscription: loader-start events can publish while `useGLTF` renders and cause a cross-component render-update warning.

Run with `npm run dev`, then visit `/game`. Use pnpm 10 for dependency installs to match the existing lockfile/store; the machine's pnpm 11 tries to migrate node_modules.

## Vehicle audio

The engine now uses a tuned SR20DET-inspired torque/boost calibration: 1.0 bar target, progressive spool above 2,100 RPM, approximately 370 Nm at full boost near 4,500 RPM, and a 7,500 RPM torque cut. These are game tuning values, not stock specifications or a measured dyno map. Boost increases rear-wheel drive torque and drops on lift/shift; airborne unloading reduces the boost target. `Telemetry.boost` is gauge pressure in bar. The turbo whistle follows this pressure, and boosted throttle lifts/forward gear changes trigger descending, slowing "stu-tu-tu" filtered-noise pulses. This is synthesized flutter, not a recording of an actual SR20DET or a recommendation for real turbo hardware.

Press a driving key, touch the game, or click Start sound to unlock Web Audio. Sound on/off and the volume slider remain available in the HUD. Preferences are session-only. No microphone, downloads, or audio dependencies are needed.

`VehicleSound` synthesizes a turbo inline-four with a custom combustion waveform at `RPM / 30` firing frequency, a crank-frequency bass layer, mechanical harmonics, filtered intake noise, a resonant exhaust path, subtle detuning and a short reflected exhaust sound. Load opens the exhaust filter and adds intake/turbo sound. Gear changes briefly cut exhaust volume and trigger a shift transient; high-RPM throttle release triggers blow-off hiss and exhaust crackles. Grounded tire-contact slip controls filtered tire scrub and squeal. Road/wind noise follows speed. The HUD displays the same RPM and gear that drive the audio.

Gain and pitch changes are smoothed; a compressor controls transient peaks. Pausing/muting fades the master and cancels transients. Hidden tabs suspend audio, and the next gesture resumes it. Reset clears queued pops. Unmount stops all sources and closes the AudioContext. Physics and audio read/write Zustand without React frame-by-frame renders.

These are procedural sounds, not recordings of a specific car. Recorded on/off-load RPM loops and tire recordings would be needed for a car-specific, production-realistic sound. Audition the mix on speakers and headphones when tuning the gain/filter constants. Browser audio cannot be judged from type checks alone.

Web Audio references: [custom periodic waveforms](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/createPeriodicWave), [gesture-based audio activation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

Validation commands:

```sh
node --experimental-strip-types --test components/game/physics/driftMath.test.mjs
node --experimental-strip-types --test components/game/physics/roadPhysics.test.mjs
node --experimental-strip-types --test components/game/audio/powertrain.test.mjs
node --test components/game/models/silvia.test.mjs
node --experimental-strip-types --test components/game/physics/driveDirection.test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

API references: [Rapier scene-query filtering](https://rapier.rs/docs/user_guides/javascript/scene_queries_filters/), [R3F Rapier physics hooks](https://pmndrs.github.io/react-three-rapier/functions/useBeforePhysicsStep.html).
