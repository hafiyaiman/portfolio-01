import fs from 'node:fs/promises';
import { SphereGeometry, CylinderGeometry } from 'three';

const directory = 'public/maps/genting';
const source = await fs.readFile(`${directory}/scenery.glb`);
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength));
const binary = source.subarray(28 + jsonLength);
function readAccessor(index) {
  const a = gltf.accessors[index], v = gltf.bufferViews[a.bufferView];
  const size = a.type === 'VEC3' ? 3 : 1;
  const bytes = a.componentType === 5126 || a.componentType === 5125 ? 4 : 2;
  const read = a.componentType === 5126 ? 'readFloatLE' : bytes === 4 ? 'readUInt32LE' : 'readUInt16LE';
  return Array.from({ length: a.count * size }, (_, i) => binary[read]((v.byteOffset ?? 0) + (a.byteOffset ?? 0) + Math.floor(i / size) * (v.byteStride ?? size * bytes) + (i % size) * bytes));
}
const trees = {};
const extraBuffers = [];
let extraOffset = binary.length;
for (const [kind, blockSize, indexSize] of [['foliage', 91, 432], ['trunk', 30, 72]]) {
  const node = gltf.nodes.find(n => n.name === `treeBaked_${kind}`);
  const p = gltf.meshes[node.mesh].primitives[0];
  const positions = readAccessor(p.attributes.POSITION), indices = readAccessor(p.indices);
  const count = positions.length / (3 * blockSize);
  if (!Number.isInteger(count) || indices.length !== count * indexSize) throw Error('Unexpected tree layout.');
  trees[kind] = [];
  for (let tree = 0; tree < count; tree++) {
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = tree * indexSize; i < (tree + 1) * indexSize; i++) {
      if (Math.floor(indices[i] / blockSize) !== tree) throw Error('Tree block crosses instance boundary.');
    }
    for (let i = 0; i < blockSize; i++) for (let axis = 0; axis < 3; axis++) {
      const value = positions[(tree * blockSize + i) * 3 + axis];
      min[axis] = Math.min(min[axis], value); max[axis] = Math.max(max[axis], value);
    }
    trees[kind].push([...min.map((v, i) => (v + max[i]) / 2), ...min.map((v, i) => (max[i] - v) / 2)]);
  }
  // Replace the baked tree geometry with a single reusable low-poly primitive.
  const geometry = kind === 'foliage' ? new SphereGeometry(1, 6, 4) : new CylinderGeometry(1, 1, 2, 5);
  const append = (array, type, componentType, min, max) => {
    const bufferView = gltf.bufferViews.length;
    const payload = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    const byteOffset = extraOffset;
    extraBuffers.push(payload, Buffer.alloc((4 - payload.length % 4) % 4));
    extraOffset += Math.ceil(payload.length / 4) * 4;
    gltf.bufferViews.push({ buffer: 0, byteOffset, byteLength: payload.length });
    const index = gltf.accessors.length;
    gltf.accessors.push({ bufferView, componentType, count: array.length / (type === 'VEC3' ? 3 : 1), type, ...(min ? { min, max } : {}) });
    return index;
  };
  p.attributes = { POSITION: append(geometry.attributes.position.array, 'VEC3', 5126, [-1, -1, -1], [1, 1, 1]), NORMAL: append(geometry.attributes.normal.array, 'VEC3', 5126) };
  p.indices = append(new Uint32Array(geometry.index.array), 'SCALAR', 5125);
  // Instances are rendered separately by the game, using these template meshes.
  geometry.dispose();
}

function collectIndices() {
  const used = new Set();
  for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
    for (const a of Object.values(p.attributes)) used.add(a);
    if (p.indices !== undefined) used.add(p.indices);
  }
  return [...used].sort((a, b) => a - b);
}
const used = collectIndices(), accessorMap = new Map(used.map((a, i) => [a, i]));
gltf.accessors = used.map(i => gltf.accessors[i]);
for (const mesh of gltf.meshes) for (const p of mesh.primitives) {
  for (const key of Object.keys(p.attributes)) p.attributes[key] = accessorMap.get(p.attributes[key]);
  if (p.indices !== undefined) p.indices = accessorMap.get(p.indices);
}
const allBinary = Buffer.concat([binary, ...extraBuffers]);
const views = [...new Set([...gltf.accessors.map(a => a.bufferView), ...gltf.images.map(i => i.bufferView)])].sort((a, b) => a - b);
const viewMap = new Map(views.map((v, i) => [v, i]));
let offset = 0;
const buffers = [];
gltf.bufferViews = views.map(i => {
  const v = gltf.bufferViews[i], bytes = allBinary.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength);
  const result = { ...v, byteOffset: offset };
  buffers.push(bytes, Buffer.alloc((4 - bytes.length % 4) % 4));
  offset += Math.ceil(bytes.length / 4) * 4;
  return result;
});
for (const a of gltf.accessors) a.bufferView = viewMap.get(a.bufferView);
for (const i of gltf.images) i.bufferView = viewMap.get(i.bufferView);
gltf.buffers[0].byteLength = offset;
const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + padded.length + offset, 8);
header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
await fs.writeFile(`${directory}/game-scenery.glb`, Buffer.concat([header, padded, binHeader, ...buffers]));
await fs.writeFile(`${directory}/trees.json`, JSON.stringify(trees));
console.log({ modelBytes: 28 + padded.length + offset, treeCount: trees.trunk.length });
