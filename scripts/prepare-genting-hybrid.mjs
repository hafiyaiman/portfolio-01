// node --experimental-strip-types scripts/prepare-genting-hybrid.mjs
import fs from 'node:fs/promises';
import { Mesh } from 'three';
import { loadGeometryGLB } from './load-gltf-geometry.mjs';
import { prepareHybridScenery } from '../components/game/environment/hybridScenery.ts';
import { ROAD_LENGTH, ROUTE_INFO, roadFrame, terrainHeightAt } from '../components/game/environment/track.ts';

const directory = 'public/maps/genting';
const bytes = await fs.readFile(`${directory}/game-scenery.glb`);
const length = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + length));
const binary = bytes.subarray(28 + length);
const loaded = await loadGeometryGLB(bytes);
const alignment = JSON.parse(await fs.readFile(`${directory}/alignment.json`, 'utf8'));
const hybrid = prepareHybridScenery(loaded.scene, alignment, {
  length: ROAD_LENGTH, frame: roadFrame, groundHeight: terrainHeightAt,
  origin: ROUTE_INFO.origin, elevationBaseline: ROUTE_INFO.elevationBaseline,
});
const chunks = [binary];
let offset = binary.length;
function append(attribute, type, min, max) {
  const values = new Float32Array(attribute.array);
  const buffer = Buffer.from(values.buffer);
  const view = gltf.bufferViews.length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: buffer.length });
  chunks.push(buffer); offset += buffer.length;
  const accessor = gltf.accessors.length;
  gltf.accessors.push({ bufferView: view, componentType: 5126, count: attribute.count, type, ...(min ? { min, max } : {}) });
  return accessor;
}
for (const node of gltf.nodes) {
  if (node.mesh === undefined || node.name?.startsWith('treeBaked_')) continue;
  const object = hybrid.scene.getObjectByName(node.name);
  if (!(object instanceof Mesh)) throw Error(`Expected mesh ${node.name}`);
  if (!object.visible) { delete node.mesh; continue; }
  const geometry = object.geometry;
  geometry.computeBoundingBox();
  const p = gltf.meshes[node.mesh].primitives;
  if (p.length !== 1) throw Error('Multi-primitive mesh needs explicit mapping.');
  const attributes = {
    POSITION: append(geometry.attributes.position, 'VEC3', geometry.boundingBox.min.toArray(), geometry.boundingBox.max.toArray()),
    NORMAL: append(geometry.attributes.normal, 'VEC3'),
  };
  if (geometry.attributes.uv) attributes.TEXCOORD_0 = append(geometry.attributes.uv, 'VEC2');
  p[0] = { attributes, material: p[0].material, mode: 4 };
}
gltf.buffers[0].byteLength = offset;
const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + offset, 8);
header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
await fs.writeFile(`${directory}/hybrid-scenery.glb`, Buffer.concat([header, padded, binHeader, ...chunks]));
const trees = hybrid.trees(JSON.parse(await fs.readFile(`${directory}/trees.json`, 'utf8')));
await fs.writeFile(`${directory}/hybrid-trees.json`, JSON.stringify(trees));
console.log({ sceneryBytes: 28 + padded.length + offset, trees: trees.trunk.length });
hybrid.dispose();
