# Genting mapped scenery implementation plan

**Goal:** Rebuild the approved GPX scene in Blender with mapped terrain/building placement and natural low-poly trees.

**Architecture:** Keep the shared 18 m driving mesh and boundary clipping. Import the georeferenced hybrid map into Blender, retain its building footprints, and author facade materials and tree meshes there. Export GLB assets consumed by the existing instanced renderer.

- [x] Verify exported buildings preserve source world-space footprints.
- [x] Replace approximate landmark placements with mapped buildings and terrain; add facade treatment without changing footprints.
- [x] Build six branching broadleaf variants using CC0 bark; ground forest on imported terrain and exclude buildings.
- [x] Export Blender source files and game assets, render inspection views, run road/asset tests and TypeScript checks.

Validation: 10 asset/road/physics tests passed, including 307 footprint comparisons and 1,135 road-contact probes. TypeScript and scoped ESLint passed. Inspected Blender road, building-district and tree-kit renders. Final forest: 10,652 instances. Course GLB: 35.24 MB. Live browser gameplay and frame rate were not measured because no browser surface was available.

References: official Resorts World Genting road, First World Hotel and Chin Swee galleries; ambientCG Bark012 (CC0). GPX provides route/elevation only. Building accuracy remains limited to the supplied map geometry.
