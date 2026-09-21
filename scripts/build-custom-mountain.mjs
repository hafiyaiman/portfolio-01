// Usage: node scripts/build-custom-mountain.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Vector3,
  Color,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
  Raycaster,
  Box3,
  SphereGeometry,
  CylinderGeometry
} from 'three';
import { loadGeometryGLB } from './load-gltf-geometry.mjs';

console.log('--- Starting Custom Mountain Asset Build ---');

const sourceGlbPath = 'tmp/genting-source-003828/maps3d-2026-09-07_00-38-28.glb';
const alignmentPath = 'public/maps/genting/alignment.json';
const treesPath = 'public/maps/genting/trees.json';
const outputDir = 'public/maps/genting';

// 1. Read files
const alignment = JSON.parse(await fs.readFile(alignmentPath, 'utf8'));
const rawTrees = JSON.parse(await fs.readFile(treesPath, 'utf8'));
const sourceBytes = await fs.readFile(sourceGlbPath);
const gltf = await loadGeometryGLB(sourceBytes);

// 2. Coordinate transformation setup
const scale = alignment.report.scale; // ~9.6696 meters per unit
const origin = alignment.points[0];
const latRad = 3.410412 * Math.PI / 180;
const ratio = (6371000 / 6378137) * Math.cos(latRad);
const northing = 6378137 * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
const yOffset = alignment.report.datumOffset - 1278.150680747309 + 12;

function toGame(px, py, pz) {
  const x = (px * scale - origin[0]) * ratio;
  const n = northing - (pz * scale - origin[2]);
  const z = (2 * Math.atan(Math.exp(n / 6378137)) - Math.PI / 2 - latRad) * 6371000;
  return new Vector3(x, py * scale + yOffset, z);
}

// 3. Process tinMesh (Mountain terrain)
console.log('Processing tinMesh (1:1 mountain terrain)...');
const tinObject = gltf.scene.getObjectByName('tinMesh');
if (!tinObject) throw new Error('tinMesh not found in source model');

const tinPos = tinObject.geometry.attributes.position;
const tinIdx = tinObject.geometry.index;
const tinTriCount = tinIdx ? tinIdx.count / 3 : tinPos.count / 3;

const tinVertices = [];
for (let i = 0; i < tinTriCount; i++) {
  const i0 = tinIdx ? tinIdx.getX(i * 3) : i * 3;
  const i1 = tinIdx ? tinIdx.getX(i * 3 + 1) : i * 3 + 1;
  const i2 = tinIdx ? tinIdx.getX(i * 3 + 2) : i * 3 + 2;

  const v0 = toGame(tinPos.getX(i0), tinPos.getY(i0), tinPos.getZ(i0));
  const v1 = toGame(tinPos.getX(i1), tinPos.getY(i1), tinPos.getZ(i1));
  const v2 = toGame(tinPos.getX(i2), tinPos.getY(i2), tinPos.getZ(i2));

  // Direct winding points upward for tinMesh in our coordinate space
  tinVertices.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
}

const tinGeom = new BufferGeometry();
tinGeom.setAttribute('position', new Float32BufferAttribute(tinVertices, 3));
tinGeom.computeVertexNormals();

// Compute slope-based vertex colors
const tinNormals = tinGeom.attributes.normal;
const tinColors = [];
const colorGrass = new Color('#365d30'); // Lush highland grass on gentle slopes
const colorSoil = new Color('#4c573c');  // Transitional soil / moss on moderate slopes
const colorCliff = new Color('#343938'); // Craggy dark granite on steep cliffs

for (let i = 0; i < tinNormals.count; i++) {
  const ny = tinNormals.getY(i); // cos(slope angle)
  const c = new Color();
  if (ny >= 0.88) {
    // Flat / gentle slope (< ~28°)
    const t = (ny - 0.88) / 0.12;
    c.copy(colorSoil).lerp(colorGrass, t);
  } else if (ny >= 0.65) {
    // Moderate slope (28° - 50°)
    const t = (ny - 0.65) / 0.23;
    c.copy(colorCliff).lerp(colorSoil, t);
  } else {
    // Steep cliff (> 50°)
    c.copy(colorCliff);
  }
  tinColors.push(c.r, c.g, c.b);
}
tinGeom.setAttribute('color', new Float32BufferAttribute(tinColors, 3));
tinGeom.computeBoundingBox();

console.log(`tinMesh processed: ${tinVertices.length / 9} triangles, bounds:`, tinGeom.boundingBox);

// 4. Process all 236 road meshes grouped by category
console.log('Processing all 236 road meshes into categories...');
const roadCategories = {
  road_collector: [],
  road_local: [],
  road_service: [],
  road_paths: [],
  road_bridge: []
};

let totalSourceRoadMeshes = 0;
gltf.scene.traverse((o) => {
  if (o.isMesh && o.name.startsWith('road_')) {
    totalSourceRoadMeshes++;
    const cat = o.name.replace(/_[0-9]+$/, '');
    if (!roadCategories[cat]) {
      console.warn('Unknown road category:', cat);
      return;
    }
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index;
    const triCount = idx ? idx.count / 3 : pos.count / 3;

    for (let i = 0; i < triCount; i++) {
      const i0 = idx ? idx.getX(i * 3) : i * 3;
      const i1 = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
      const i2 = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;

      const v0 = toGame(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
      const v1 = toGame(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
      const v2 = toGame(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

      // Swap v1 and v2 for upward facing road normal
      roadCategories[cat].push(v0.x, v0.y, v0.z, v2.x, v2.y, v2.z, v1.x, v1.y, v1.z);
    }
  }
});
console.log(`Extracted all ${totalSourceRoadMeshes} road meshes across 5 categories.`);

const roadGeometries = {};
for (const [cat, verts] of Object.entries(roadCategories)) {
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(verts, 3));
  geom.computeVertexNormals();
  geom.computeBoundingBox();
  roadGeometries[cat] = geom;
  console.log(`${cat}: ${verts.length / 9} triangles`);
}

// 5. Process all 307 building meshes
console.log('Processing all 307 building meshes...');
const buildingVertices = [];
let buildingCount = 0;

gltf.scene.traverse((o) => {
  if (o.isMesh && o.name.startsWith('building_')) {
    buildingCount++;
    const pos = o.geometry.attributes.position;
    const idx = o.geometry.index;
    const triCount = idx ? idx.count / 3 : pos.count / 3;

    for (let i = 0; i < triCount; i++) {
      const i0 = idx ? idx.getX(i * 3) : i * 3;
      const i1 = idx ? idx.getX(i * 3 + 1) : i * 3 + 1;
      const i2 = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;

      const v0 = toGame(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
      const v1 = toGame(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
      const v2 = toGame(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

      // Invert winding for reflected z-axis
      buildingVertices.push(v0.x, v0.y, v0.z, v2.x, v2.y, v2.z, v1.x, v1.y, v1.z);
    }
  }
});
console.log(`Extracted ${buildingCount} buildings, ${buildingVertices.length / 9} triangles.`);

const buildingGeom = new BufferGeometry();
buildingGeom.setAttribute('position', new Float32BufferAttribute(buildingVertices, 3));
buildingGeom.computeVertexNormals();
buildingGeom.computeBoundingBox();

// 6. Tree template meshes (lightweight low-poly primitives for GPU instancing)
const treeFoliageTemplate = new SphereGeometry(1, 6, 4);
const treeTrunkTemplate = new CylinderGeometry(1, 1, 2, 5);

// 7. Binary GLB Builder
console.log('Packaging clean binary GLB...');
function createGlbBuilder() {
  const chunks = [];
  let byteOffset = 0;
  const bufferViews = [];
  const accessors = [];

  function addAttribute(array, type, componentType = 5126, min = null, max = null) {
    const raw = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const viewIndex = bufferViews.length;
    const alignedOffset = byteOffset;
    bufferViews.push({ buffer: 0, byteOffset: alignedOffset, byteLength: raw.length });
    chunks.push(raw);
    const pad = (4 - (raw.length % 4)) % 4;
    if (pad > 0) chunks.push(Buffer.alloc(pad));
    byteOffset += raw.length + pad;

    const accessorIndex = accessors.length;
    const count = array.length / (type === 'VEC3' ? 3 : type === 'VEC2' ? 2 : 1);
    const acc = { bufferView: viewIndex, componentType, count, type };
    if (min) acc.min = min;
    if (max) acc.max = max;
    accessors.push(acc);
    return accessorIndex;
  }

  function buildGlb(nodes, meshes, materials = []) {
    const gltfDoc = {
      asset: { version: '2.0', generator: 'GentingCustomMountainBuilder' },
      scene: 0,
      scenes: [{ nodes: nodes.map((_, i) => i) }],
      nodes,
      meshes,
      materials,
      accessors,
      bufferViews,
      buffers: [{ byteLength: byteOffset }]
    };
    const jsonStr = JSON.stringify(gltfDoc);
    const jsonBuf = Buffer.from(jsonStr, 'utf8');
    const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
    const paddedJson = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);

    const totalLength = 12 + 8 + paddedJson.length + 8 + byteOffset;
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0); // 'glTF'
    header.writeUInt32LE(2, 4); // version 2
    header.writeUInt32LE(totalLength, 8);

    const jsonChunkHeader = Buffer.alloc(8);
    jsonChunkHeader.writeUInt32LE(paddedJson.length, 0);
    jsonChunkHeader.writeUInt32LE(0x4e4f534a, 4); // 'JSON'

    const binChunkHeader = Buffer.alloc(8);
    binChunkHeader.writeUInt32LE(byteOffset, 0);
    binChunkHeader.writeUInt32LE(0x004e4942, 4); // 'BIN\0'

    return Buffer.concat([header, jsonChunkHeader, paddedJson, binChunkHeader, ...chunks]);
  }

  return { addAttribute, buildGlb };
}

const builder = createGlbBuilder();
const nodes = [];
const meshes = [];

// Helper to register a geometry as a mesh in GLB
function registerMesh(name, geom, extraAttributes = {}) {
  const box = geom.boundingBox ?? new Box3().setFromBufferAttribute(geom.attributes.position);
  const min = [box.min.x, box.min.y, box.min.z];
  const max = [box.max.x, box.max.y, box.max.z];
  const posAcc = builder.addAttribute(geom.attributes.position.array, 'VEC3', 5126, min, max);
  const normAcc = builder.addAttribute(geom.attributes.normal.array, 'VEC3', 5126);

  const attributes = {
    POSITION: posAcc,
    NORMAL: normAcc
  };

  if (geom.attributes.color) {
    attributes.COLOR_0 = builder.addAttribute(geom.attributes.color.array, 'VEC3', 5126);
  }

  for (const [key, acc] of Object.entries(extraAttributes)) {
    attributes[key] = acc;
  }

  const meshIdx = meshes.length;
  meshes.push({
    name,
    primitives: [{ attributes, mode: 4, material: 0 }]
  });
  nodes.push({ name, mesh: meshIdx });
}

// 1. Mountain terrain
registerMesh('tinMesh', tinGeom);

// 2. Road categories
for (const [cat, geom] of Object.entries(roadGeometries)) {
  registerMesh(cat, geom);
}

// 3. Buildings
registerMesh('buildings', buildingGeom);

// 4. Tree templates
if (treeFoliageTemplate) {
  registerMesh('treeBaked_foliage', treeFoliageTemplate);
}
if (treeTrunkTemplate) {
  registerMesh('treeBaked_trunk', treeTrunkTemplate);
}

const glbBuffer = builder.buildGlb(nodes, meshes, [{ name: 'customPbrMaterial' }]);
const outputGlbPath = path.join(outputDir, 'custom-scenery.glb');
await fs.writeFile(outputGlbPath, glbBuffer);
console.log(`Exported ${outputGlbPath} (${(glbBuffer.length / (1024 * 1024)).toFixed(2)} MB)`);

// 8. Transform tree positions to game coordinates
console.log('Processing tree instance positions...');
const roadRaycaster = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
const allRoadMeshes = Object.values(roadGeometries).map(g => new Mesh(g, new MeshBasicMaterial({ side: DoubleSide })));
allRoadMeshes.forEach(m => m.updateMatrixWorld());

const customTrees = { foliage: [], trunk: [] };
let treeCount = rawTrees.trunk.length;
let filteredTrees = 0;

for (let i = 0; i < treeCount; i++) {
  const trunk = rawTrees.trunk[i];
  const foliage = rawTrees.foliage[i];
  const basePos = toGame(trunk[0], trunk[1] - trunk[4], trunk[2]);

  // Check if tree is within 4m of road corridor
  roadRaycaster.ray.origin.set(basePos.x, basePos.y + 10, basePos.z);
  roadRaycaster.far = 25;
  const hits = roadRaycaster.intersectObjects(allRoadMeshes, false);
  if (hits.length > 0 && Math.abs(hits[0].point.y - basePos.y) < 4) {
    filteredTrees++;
    continue; // Don't place tree in the road
  }

  const pTrunk = toGame(trunk[0], trunk[1], trunk[2]);
  const pFoliage = toGame(foliage[0], foliage[1], foliage[2]);

  customTrees.trunk.push([
    pTrunk.x, pTrunk.y, pTrunk.z,
    trunk[3] * scale * ratio,
    trunk[4] * scale,
    trunk[5] * scale * ratio
  ]);

  customTrees.foliage.push([
    pFoliage.x, pFoliage.y, pFoliage.z,
    foliage[3] * scale * ratio,
    foliage[4] * scale,
    foliage[5] * scale * ratio
  ]);
}

const outputTreesPath = path.join(outputDir, 'custom-trees.json');
await fs.writeFile(outputTreesPath, JSON.stringify(customTrees));
console.log(`Exported ${outputTreesPath}: ${customTrees.trunk.length} trees (filtered ${filteredTrees} road conflicts)`);

// 9. Align ROUTE_POINTS with exact surveyed road surface
console.log('Aligning ROUTE_POINTS with 1:1 surveyed road mesh elevations...');
const { ROUTE_POINTS, ROUTE_INFO } = await import('../components/game/environment/gentingRoute.mjs');
const testRay = new Raycaster(new Vector3(), new Vector3(0, -1, 0));

const alignedPoints = ROUTE_POINTS.map((p) => {
  testRay.ray.origin.set(p[0], 2500, p[2]);
  const hits = testRay.intersectObjects(allRoadMeshes, false);
  if (hits.length > 0) {
    return [p[0], Number(hits[0].point.y.toFixed(3)), p[2]];
  }
  return p;
});

const updatedRouteCode = `// Generated by build-custom-mountain.mjs. 1:1 aligned with surveyed road meshes.
export const ROUTE_INFO = ${JSON.stringify(ROUTE_INFO, null, 2)};
export const ROUTE_POINTS = ${JSON.stringify(alignedPoints)};
`;
await fs.writeFile('components/game/environment/gentingRoute.mjs', updatedRouteCode);
console.log('Successfully aligned gentingRoute.mjs with 1:1 surveyed road meshes.');

console.log('--- Custom Mountain Build Completed Successfully ---');
