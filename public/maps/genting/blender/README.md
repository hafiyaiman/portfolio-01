# Genting Highlands drift environment

Blender-authored game assets following the supplied GPX and georeferenced map.
The road is widened for drifting. Landmark models use photographic references;
they are game-scale interpretations, not surveyed architectural replicas.

The active `/game` scene is `BlenderMountain.tsx`. It loads `course.glb` and
instances eight vegetation variants in `tropical-trees.glb` using `forest.json`.
The older imported/custom scenery files are retained for the route inspector
and previous workflows, but are not loaded by the active game.

## Rebuild

From the project root, with Node and Blender 5.1 installed:

```powershell
node --experimental-strip-types scripts/export-genting-blender.mjs
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' --background --python scripts/build-genting-blender.py
node --experimental-strip-types --test components/game/physics/roadPhysics.test.mjs components/game/physics/blenderRoad.test.mjs
node --experimental-strip-types --test components/game/physics/roadBoundary.test.mjs
node --experimental-strip-types --test components/game/physics/sceneryClearance.test.mjs components/game/physics/mappedScenery.test.mjs
& 'C:/Program Files/Blender Foundation/Blender 5.1/blender.exe' --background --python scripts/render-genting-blender.py
```

`genting-highlands.blend` and `tropical-tree-kit.blend` are editable Blender
sources. The Python script builds the sign lettering, metal infrastructure,
reinforced slope panels, mapped Chin Swee pagoda, First World towers, Genting
Grand crown, broadleaf trees, ferns and shrubs inside Blender. CC0 scanned bark
and alpha-cutout leaves supply the tree surfaces. Asphalt uses a packed texture.
The road, terrain shelf, paint, curb, and barrier alignments are transferred
from the same driving geometry rather than independently traced.

Pavement is 18 m wide. Elevation smoothing covers the widened shoulders.
CollisionRail meshes are hidden at runtime; they match the visible rails and
preserve the existing junction openings. Trees remain outside the driving
corridor and landmark footprints, and are instanced in cullable spatial cells.
Landmark decorations beyond the barriers do not have individual colliders.

The mountain is a closed 6 m height-field mesh rebuilt from the mapped surface,
with shared triangle edges, a road shelf, skirts and a bottom. The scenery
clearance test probes the full GPX corridor every 3 m across seven lane offsets;
the terrain test checks all edge incidences for cracks. `asset-manifest.json`
records source proxies replaced by authored landmarks and explicit building
setbacks needed by the wider road. The oversized enclosing park block and a
duplicate Genting Grand wing have been removed.

Roadside segments are also clipped against the complete pavement corridor,
including overlapping GPX traversals and tight offset folds. The same mask
controls visible rails, collision walls, curbs and posts. The boundary tests
check both generated geometry and the shipped GLB for pavement obstructions.

## Visual references

- Resorts World Genting road imagery: https://www.rwgenting.com/en/welovegenting.html
- Mountain-road overview: https://www.carz.com.my/2023/10/toll-charges-soon-to-drive-up-genting-highlands

References guided the broad hairpins, forest, barriers and highland atmosphere.
Reference photographs are not redistributed. CC0 texture provenance and map
references are recorded in `REFERENCES.md`.
Blender QA renders are written to `tmp/genting-blender/`; runtime distance fog
is intentionally omitted from these renders to make geometry defects visible.
