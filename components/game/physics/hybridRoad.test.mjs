import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DoubleSide, Mesh, Raycaster, Vector3 } from 'three';
import { prepareHybridScenery } from '../environment/hybridScenery.ts';
import { loadGeometryGLB } from '../../../scripts/load-gltf-geometry.mjs';
import { ROAD_LENGTH, ROUTE_INFO, roadFrame, terrainHeightAt, roadSurfaceHeightAt } from '../environment/track.ts';
const { MeshBVH, acceleratedRaycast } = createRequire(import.meta.resolve('@react-three/drei'))('three-mesh-bvh');

const bytes = await fs.readFile('public/maps/genting/game-scenery.glb');
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
gltf.materials = gltf.materials.map(() => ({})); gltf.images = []; gltf.textures = [];
const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
const header = Buffer.from(bytes.subarray(0, 20)), tail = bytes.subarray(20 + jsonLength);
header.writeUInt32LE(20 + padded.length + tail.length, 8); header.writeUInt32LE(padded.length, 12);
const model = Buffer.concat([header, padded, tail]);
const loaded = await new GLTFLoader().parseAsync(model.buffer.slice(model.byteOffset, model.byteOffset + model.byteLength), '');
const alignment = JSON.parse(await fs.readFile('public/maps/genting/alignment.json', 'utf8'));
const started = performance.now();
const hybrid = prepareHybridScenery(loaded.scene, alignment, {
  length: ROAD_LENGTH, frame: roadFrame, groundHeight: terrainHeightAt,
  origin: ROUTE_INFO.origin, elevationBaseline: ROUTE_INFO.elevationBaseline,
});
console.log(`Hybrid preparation: ${((performance.now() - started) / 1000).toFixed(2)}s`);
console.log({ triangles: hybrid.colliders.reduce((sum, c) => sum + c.indices.length / 3, 0) });
const exported = await loadGeometryGLB(await fs.readFile('public/maps/genting/hybrid-scenery.glb'));
exported.scene.updateMatrixWorld(true);

test('hybrid keeps imported scenery but hides imported pavement', () => {
  let roads = 0, buildings = 0;
  hybrid.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    if (object.name.startsWith('road_')) { roads++; assert.equal(object.visible, false); }
    if (object.name.startsWith('building_')) { buildings++; assert.equal(object.visible, true); }
    if (object.visible) assert.ok(object.geometry.attributes.position.array.every(Number.isFinite));
  });
  assert.ok(roads > 0 && buildings > 0);
  const origin = hybrid.toGame(new Vector3(...alignment.points[0]).divideScalar(alignment.report.scale));
  assert.ok(Math.abs(origin.x) < 0.001 && Math.abs(origin.z) < 0.001);
});

test('imported ground stays below the old pavement across the GPX loop', () => {
  const surfaces = [];
  exported.scene.traverse(object => {
    if (object instanceof Mesh && object.visible && !object.name.startsWith('building_') && !object.name.startsWith('treeBaked_')) {
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.side = DoubleSide;
      object.geometry.computeBoundingBox(); surfaces.push(object);
      object.geometry.boundsTree = new MeshBVH(object.geometry);
      object.raycast = acceleratedRaycast;
    }
  });
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  let checked = 0, maxIntrusion = -Infinity;
  for (let distance = 0; distance < ROAD_LENGTH; distance += 12) {
    const frame = roadFrame(distance / ROAD_LENGTH);
    for (const offset of [-4.5, 0, 4.5]) {
      const p = frame.point.clone().addScaledVector(frame.right, offset);
      const roadY = roadSurfaceHeightAt(p.x, p.z);
      ray.ray.origin.set(p.x, roadY + 200, p.z);
      const meshes = surfaces.filter(m => { const b = m.geometry.boundingBox; return p.x >= b.min.x && p.x <= b.max.x && p.z >= b.min.z && p.z <= b.max.z; });
      const hit = ray.intersectObjects(meshes, false)[0];
      assert.ok(hit, 'Imported ground must cover the route');
      maxIntrusion = Math.max(maxIntrusion, hit.point.y - roadY);
      checked++;
    }
  }
  console.log({ checked, maxIntrusion });
  assert.ok(maxIntrusion < -0.05, `Terrain protrudes into road by ${maxIntrusion}m`);
});

test('hybrid tree trunks and crowns stay paired and clear of the old roadway', async () => {
  const trees = hybrid.trees(JSON.parse(await fs.readFile('public/maps/genting/trees.json', 'utf8')));
  assert.equal(trees.trunk.length, trees.foliage.length);
  assert.ok(trees.trunk.length > 30000);
  for (let i = 0; i < trees.trunk.length; i++) {
    const trunk = trees.trunk[i], crown = trees.foliage[i];
    assert.ok(trunk.every(Number.isFinite) && crown.every(Number.isFinite));
    assert.ok(hybrid.distance(trunk[0], trunk[2]) >= 13);
    assert.ok(Math.hypot(trunk[0] - crown[0], trunk[2] - crown[2]) < 1);
  }
});
test.after(() => hybrid.dispose());
