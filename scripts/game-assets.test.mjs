import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { MeshoptDecoder as createDecoder } from 'three-stdlib';
import { loadGeometryGLB } from './load-gltf-geometry.mjs';
const MeshoptDecoder = typeof createDecoder === 'function' ? createDecoder() : createDecoder;

const root = 'public/maps/genting/blender/';
function read(name) {
  assert.ok(fs.existsSync(root + name), `Missing optimized asset: ${name}`);
  const bytes = fs.readFileSync(root + name);
  const length = bytes.readUInt32LE(12);
  return { bytes, json: JSON.parse(bytes.subarray(20, 20 + length)), bin: bytes.subarray(28 + length) };
}
await MeshoptDecoder.ready;
test('compressed course preserves every geometry buffer byte', () => {
  const original = read('course.glb'), optimized = read('course-laptop.glb');
  assert.ok(optimized.bytes.length < original.bytes.length * 0.7, 'Course download should shrink by at least 30%');
  assert.deepEqual(optimized.json.accessors, original.json.accessors);
  assert.deepEqual(optimized.json.nodes, original.json.nodes);
  for (const [i, view] of original.json.bufferViews.entries()) {
    const compressed = optimized.json.bufferViews[i].extensions?.EXT_meshopt_compression;
    if (!compressed) continue;
    const actual = new Uint8Array(view.byteLength);
    MeshoptDecoder.decodeGltfBuffer(actual, compressed.count, compressed.byteStride,
      optimized.bin.subarray(compressed.byteOffset, compressed.byteOffset + compressed.byteLength), compressed.mode);
    assert.deepEqual(Buffer.from(actual), original.bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength));
  }
});
test('distant trees retain all variants with a smaller triangle and texture budget', () => {
  const original = read('tropical-trees.glb'), low = read('tropical-trees-low.glb');
  const triangles = j => j.meshes.reduce((sum, m) => sum + m.primitives.reduce((s, p) => s + j.accessors[p.indices].count / 3, 0), 0);
  assert.deepEqual(low.json.nodes, original.json.nodes);
  assert.ok(triangles(low.json) < triangles(original.json) * 0.4);
  assert.ok(low.bytes.length < 1024 * 1024, 'Distant tree asset must stay below 1 MiB');
  for (const m of low.json.meshes) for (const p of m.primitives) assert.ok(low.json.accessors[p.indices].count > 0);
});
test('optimized assets load as valid Three.js scenes with finite, in-range geometry', async () => {
  for (const name of ['course-laptop.glb', 'tropical-trees-laptop.glb', 'tropical-trees-low.glb']) {
    const { scene } = await loadGeometryGLB(read(name).bytes);
    let meshes = 0;
    scene.traverse(object => {
      if (!object.isMesh) return;
      meshes++;
      const p = object.geometry.attributes.position;
      assert.ok(p.count > 0);
      assert.ok(p.array.every(Number.isFinite));
      assert.ok(object.geometry.index.array.every(i => i < p.count));
    });
    assert.ok(meshes > 0);
  }
});
