# Genting scene sources

- Route: `../source.gpx`, matching the user-supplied `New file 1.gpx` (460 coordinates). The GPX contains no building geometry.
- Terrain and building footprints: supplied Maps3D scene, georeferenced through `../georeference.json` and the existing hybrid map conversion. Building positions and silhouettes come from that map; facade treatments are authored interpretations, not surveyed reconstructions.
- Visual references: [Resorts World Genting roads](https://www.rwgenting.com/en/welovegenting.html), [First World Hotel](https://www.rwgenting.com/en/hotels/first-world-hotel.html), [Chin Swee](https://www.rwgenting.com/en/things-to-do/attractions/chinswee.html). Reference photographs are not redistributed.
- Tree bark: [ambientCG Bark012](https://ambientcg.com/view?id=Bark012), photogrammetry color texture, [CC0 1.0](https://docs.ambientcg.com/license/). Embedded in the tree GLB and Blender source. No attribution required; credit retained for traceability.
- Scanned leaf colour and opacity: [ambientCG LeafSet024](https://ambientcg.com/view?id=LeafSet024), CC0. Applied to authored leaf meshes; the tree kit also contains branching fern fronds and understory shrubs.
- [Resorts World Genting road photograph](https://www.rwgenting.com/content/dam/approved/rw-genting/web/welovegenting/we-love-our-roads/roads-1-1w.png) informed canopy density, tree ferns and layered verge vegetation.
- [Genting aerial photograph](https://www.building.am/buildingimages/bigimages/260/2.jpg) informed pale resort facades, the coloured First World slabs and removal of the erroneous large enclosing roof over the outdoor resort area.
- Landmark positions cross-checked against [Genting Grand map](https://mapcarta.com/32497364), [Chin Swee pagoda map](https://mapcarta.com/N6173512385) and [First World coordinates](https://latitude.to/satellite-map/my/malaysia/38518/first-world-hotel-plaza). These are map/photo-based game interpretations, not surveyed replicas.
- Branches, leaf meshes, road infrastructure and facade tiles are authored in Blender by the scripts in `scripts/`. Eight vegetation variants are instanced by the game.

The 18 m drift road is wider than the photographed road. `asset-manifest.json` records every building setback and replaced source proxy. First World and Chin Swee meshes replace their coarse source blocks. Terrain is resampled into a closed 6 m grid with continuous shared edges and an explicit road shelf; outside the survey extent, the hillside extension is an approximation.

Rebuild: run `node --experimental-strip-types scripts/prepare-genting-hybrid.mjs`, then `node --experimental-strip-types scripts/export-genting-blender.mjs`, then Blender background with `--python scripts/build-genting-blender.py`. The Blender build writes the final terrain-grounded `forest.json`; do not stop after the Node export.
