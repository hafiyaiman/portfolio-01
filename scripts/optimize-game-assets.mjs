// Reproducible, lossless course compression and a separate distant-tree LOD.
// Source exports remain untouched. Run: node scripts/optimize-game-assets.mjs
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const root = 'public/maps/genting/blender/';
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const sizes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };

async function optimize(input, output, low = false) {
  const bytes = await fs.readFile(root + input);
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
  const bin = bytes.subarray(28 + jsonLength);
  const views = gltf.bufferViews.map(v => Buffer.from(bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength)));
  if (low) {
    for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
      const position = gltf.accessors[primitive.attributes.POSITION];
      const index = gltf.accessors[primitive.indices];
      const p = views[position.bufferView], i = views[index.bufferView];
      const positions = new Float32Array(p.buffer, p.byteOffset, position.count * 3);
      const Indices = index.componentType === 5123 ? Uint16Array : Uint32Array;
      const indices = new Uint32Array(new Indices(i.buffer, i.byteOffset, index.count));
      let simplified;
      const leafCards = mesh.name.startsWith('Leaves') && indices.length % 6 === 0 &&
        indices.every((v, k) => v === Math.floor(k / 6) * 4 + [0, 1, 2, 0, 2, 3][k % 6]);
      if (leafCards) {
        // Decimation cannot simplify disconnected leaf quads without deleting the
        // crown. Keep distributed whole cards and enlarge them to retain coverage.
        const selected = [];
        for (let card = 0; card < indices.length / 6; card++) {
          if ((card * 13 + Math.floor(card / 4)) % 4 !== 0) continue;
          selected.push(...indices.subarray(card * 6, card * 6 + 6));
          for (let axis = 0; axis < 3; axis++) {
            let center = 0;
            for (let v = 0; v < 4; v++) center += positions[(card * 4 + v) * 3 + axis] / 4;
            for (let v = 0; v < 4; v++) {
              const at = (card * 4 + v) * 3 + axis;
              positions[at] = center + (positions[at] - center) * 1.5;
            }
          }
        }
        simplified = Uint32Array.from(selected);
      } else {
        [simplified] = MeshoptSimplifier.simplify(indices, positions, 3,
          Math.max(3, Math.floor(indices.length * 0.2 / 3) * 3), 0.02);
      }
      const [remap, count] = MeshoptSimplifier.compactMesh(simplified);
      for (const accessorId of Object.values(primitive.attributes)) {
        const attribute = gltf.accessors[accessorId];
        const stride = widths[attribute.type] * sizes[attribute.componentType];
        const compact = Buffer.alloc(count * stride), source = views[attribute.bufferView];
        for (let v = 0; v < attribute.count; v++) {
          if (remap[v] < count) source.copy(compact, remap[v] * stride, v * stride, (v + 1) * stride);
        }
        views[attribute.bufferView] = compact;
        attribute.count = count;
        if (attribute.type === 'VEC3' && attribute.componentType === 5126 && attribute.min) {
          const values = new Float32Array(compact.buffer, compact.byteOffset, count * 3);
          attribute.min = [Infinity, Infinity, Infinity]; attribute.max = [-Infinity, -Infinity, -Infinity];
          for (let v = 0; v < count; v++) for (let axis = 0; axis < 3; axis++) {
            attribute.min[axis] = Math.min(attribute.min[axis], values[v * 3 + axis]);
            attribute.max[axis] = Math.max(attribute.max[axis], values[v * 3 + axis]);
          }
        }
      }
      views[index.bufferView] = Buffer.from(new Indices(simplified).buffer);
      index.count = simplified.length;
      delete index.min; delete index.max;
    }
  }
  // Keep alpha on foliage; 512px is enough for these small, repeated tree crowns.
  if (input.includes('trees')) for (const image of gltf.images ?? []) {
    const size = low ? 256 : 512;
    const pipeline = sharp(views[image.bufferView]).resize(size, size, { fit: 'inside', withoutEnlargement: true });
    views[image.bufferView] = image.mimeType === 'image/jpeg'
      ? await pipeline.jpeg({ quality: 80 }).toBuffer()
      : await pipeline.png({ compressionLevel: 9 }).toBuffer();
  }
  const chunks = [];
  let offset = 0, fallbackOffset = 0;
  const append = data => {
    const start = offset;
    chunks.push(data);
    const pad = (4 - data.length % 4) % 4;
    if (pad) chunks.push(Buffer.alloc(pad));
    offset += data.length + pad;
    return start;
  };
  gltf.bufferViews = gltf.bufferViews.map((view, id) => {
    const data = views[id];
    const accessors = gltf.accessors.filter(a => a.bufferView === id);
    const a = accessors[0];
    // Exporter writes tightly packed, separate attributes. Fail safely if that changes.
    if (a && accessors.length === 1 && !a.byteOffset && !view.byteStride && !a.sparse) {
      const stride = widths[a.type] * sizes[a.componentType];
      const mode = a.type === 'SCALAR' && [5123, 5125].includes(a.componentType) ? 'INDICES' : 'ATTRIBUTES';
      if (data.length !== a.count * stride || (mode === 'ATTRIBUTES' && stride % 4)) throw new Error('Unexpected geometry layout');
      const encoded = Buffer.from(MeshoptEncoder.encodeGltfBuffer(data, a.count, stride, mode));
      const result = { ...view, buffer: 1, byteOffset: fallbackOffset, byteLength: data.length,
        extensions: { EXT_meshopt_compression: { buffer: 0, byteOffset: append(encoded), byteLength: encoded.length, byteStride: stride, count: a.count, mode } } };
      fallbackOffset += Math.ceil(data.length / 4) * 4;
      return result;
    }
    return { ...view, buffer: 0, byteOffset: append(data), byteLength: data.length };
  });
  gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed ?? []), 'EXT_meshopt_compression'])];
  gltf.extensionsRequired = [...new Set([...(gltf.extensionsRequired ?? []), 'EXT_meshopt_compression'])];
  gltf.buffers = [{ byteLength: offset }, { byteLength: fallbackOffset, extensions: { EXT_meshopt_compression: { fallback: true } } }];
  const json = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + padded.length + offset, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
  const result = Buffer.concat([header, padded, binHeader, ...chunks]);
  await fs.writeFile(root + output, result);
  console.log(`${output}: ${(bytes.length / 1048576).toFixed(2)} -> ${(result.length / 1048576).toFixed(2)} MiB`);
}
await optimize('course.glb', 'course-laptop.glb');
await optimize('tropical-trees.glb', 'tropical-trees-laptop.glb');
await optimize('tropical-trees.glb', 'tropical-trees-low.glb', true);
