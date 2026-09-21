# Genting model alignment

> Current `/game` uses the Blender-built 18 m drift course. See
> `public/maps/genting/blender/README.md` for its assets, build and validation.
> The notes below describe the retained earlier import/hybrid workflows.

The game at `/game` uses a hybrid: the pre-Maps3D procedural road and Malaysian
kilometre posts with imported Maps3D terrain, buildings and trees. The optional
inspector at `/game/route-preview` shows the unmodified import.

## Reproduce

Extract `maps3d-gltf-2026-09-07_00-38-28.zip` into
`tmp/genting-source-003828`, then run:

```powershell
node scripts/prepare-genting-model.mjs tmp/genting-source-003828 'C:\Users\USER\Downloads\New file 1.gpx'
node scripts/prepare-genting-game.mjs
node --experimental-strip-types scripts/prepare-genting-hybrid.mjs
```

This generates `public/maps/genting/` with the scenery, georeference, source
GPX, source attribution notice, and alignment report. The original Downloads
files are not modified. The importer currently validates this export's
220-unit width, zero rotation, identity node transforms, and EPSG:3857 CRS.
Other exports must be checked for units and transforms before reuse.
The current export uses surface roads (replacing the old raised extrusion)
and a road-width multiplier of 3.9. Both are preserved from the source.
`gentingAssets.ts` versions all runtime requests together; update its revision
when replacing the export to invalidate browser and loader caches.

## Hybrid game assets

`prepare-genting-hybrid.mjs` converts the imported model to the old GPX road's
east/north coordinate system, reversing triangle winding after the north-axis
flip. The vertical datum uses the alignment fit. Imported pavement is removed.
The original road's smoothed elevations, width, markings, barriers, spawn and
kilometre posts remain intact. Imported ground is tessellated near the road and
blended to the old shelf: full blending within 16 m and a smooth transition to
the unchanged imported terrain at 65 m. Buildings move vertically as rigid
objects and each tree's trunk and foliage share a ground-anchor adjustment.
Tree placements inside the road corridor are excluded.

The resulting `hybrid-scenery.glb` (approximately 39 MB) and `hybrid-trees.json`
are loaded by `HybridMountain.tsx`, avoiding terrain preparation on the browser
main thread. Imported terrain and buildings supply scenery collisions; the old
road supplies the driving surface and guardrail collisions. Original imagery
textures are retained. Rebuild these assets when changing the old track or the
source model, and update the hybrid asset revision in `gentingAssets.ts`.

`hybridRoad.test.mjs` checks the actual exported terrain against 2,538 pavement
positions, scene inclusion/exclusion, coordinate origin and tree pairing.
This supplements the original road physics test; it is not a visual full-lap test.

## Coordinates and checks

The model uses print millimetres as geometry units. Dividing by
`printScaleMmPerMeter` restores projected metres. East is +X, north is -Z,
and Y is model-relative elevation. This differs from the existing game's
north-positive Z convention; do not drop the scene into the game untransformed.

GPX segments are sampled at intervals no greater than 5 projected metres.
Downward rays intersect the exported road meshes, taking the highest surface
at overlaps. Missing road hits fall back to terrain for display only. The
vertical datum offset is fitted using the median GPX-minus-road height.
It is not an independently known elevation datum.

For this source, all 2,259 samples hit roads. Median absolute elevation
residual is 2.92 m; the 95th percentile is 14.14 m. There are 180 sampled
segments with absolute grades above 30%. These may include steep terrain,
mesh artifacts, or overlapping surfaces and require investigation.
Coverage is not proof of correct road identity, lane alignment, smoothness,
collision suitability, or bridge/tunnel handling.

The preview follows measured road heights, without smoothing or snapping
horizontal coordinates. Orange overlay sections identify steep segments.
Editor extras are stripped while the GLB binary payload is preserved;
the full-resolution preview asset is approximately 170 MB.

The game preparation step replaces the two baked tree meshes with reusable
low-poly templates and separate placement data, validating the original
vertex/index blocks before extracting instance positions and bounds. It then
compacts unused accessors and binary data. The game loads a 1.7 MB scenery
GLB and approximately 7.9 MB tree placement JSON, preserving all 34,140 tree positions and
bounds. Trees are batched into 128 m cells for frustum culling. Roads, terrain,
and buildings retain their exported geometry and provide a combined static
triangle collider; trees and decorative map layers do not have colliders.

The car uses the imported coordinate system directly. Spawn selection searches
forward along the GPX for four supported wheel positions on a gentle surface.
Recovery searches in 3D for a nearby supported GPX position rather than using
the old generated track. Subtle arrows follow GPX travel direction. The raw
steep sections remain present; the importer does not silently reshape roads.
Source attribution is displayed in both the game and the preview.

Run `node --experimental-strip-types --test components/game/physics/importedRoad.test.mjs`
to check the actual imported collider, spawn/reset suspension contacts, and
S15 settling/acceleration. These are headless physics checks, not a full lap
or visual browser verification.
