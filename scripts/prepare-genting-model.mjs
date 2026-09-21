// Usage: node scripts/prepare-genting-model.mjs extracted-directory source.gpx
import fs from 'node:fs/promises';
import path from 'node:path';
import { BufferGeometry, BufferAttribute, Mesh, MeshBasicMaterial, DoubleSide, Raycaster, Vector3 } from 'three';

const [directory, gpxPath] = process.argv.slice(2);
if (!directory || !gpxPath) throw Error('Provide the extracted Maps3D directory and GPX path.');
const files = await fs.readdir(directory);
const projectFile = files.find(name => name.endsWith('.maps3d.json'));
const project = JSON.parse(await fs.readFile(path.join(directory, projectFile), 'utf8'));
const source = await fs.readFile(path.join(directory, files.find(name => name.endsWith('.glb'))));
if (source.readUInt32LE(0) !== 0x46546c67 || source.readUInt32LE(4) !== 2) throw Error('Expected GLB 2.');
const jsonLength = source.readUInt32LE(12);
const gltf = JSON.parse(source.subarray(20, 20 + jsonLength).toString());
const binary = source.subarray(28 + jsonLength);
const geo = JSON.parse(await fs.readFile(path.join(directory, 'georeference.json'), 'utf8'));
if (geo.crs !== 'EPSG:3857' || geo.northRotationDeg !== 0) throw Error('Unsupported georeference.');
if (gltf.nodes.some(n => n.matrix || n.translation || n.rotation || n.scale)) throw Error('Node transforms require explicit handling.');
// This export stores print millimetres as GLB units (220 units across).
const scale = 1 / geo.printScaleMmPerMeter;
const positions = gltf.meshes.flatMap(m => m.primitives.map(p => gltf.accessors[p.attributes.POSITION]));
const width = Math.max(...positions.map(a => a.max[0])) - Math.min(...positions.map(a => a.min[0]));
if (Math.abs(width - 220) > 1) throw Error('Unexpected model units; verify scale before importing.');
const material = new MeshBasicMaterial({ side: DoubleSide });
function accessor(index) {
  const a = gltf.accessors[index], view = gltf.bufferViews[a.bufferView];
  if (a.sparse) throw Error('Unsupported sparse accessor.');
  const Constructor = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
  const size = { SCALAR: 1, VEC3: 3 }[a.type];
  if (!Constructor || !size) throw Error('Unsupported accessor type.');
  const offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const elementBytes = size * Constructor.BYTES_PER_ELEMENT;
  const copy = new Uint8Array(a.count * elementBytes);
  for (let i = 0; i < a.count; i++) {
    const start = offset + i * (view.byteStride ?? elementBytes);
    copy.set(binary.subarray(start, start + elementBytes), i * elementBytes);
  }
  return new BufferAttribute(new Constructor(copy.buffer), size);
}
const roads = [], terrain = [];
for (const node of gltf.nodes) {
  const destination = node.name?.startsWith('road_') ? roads : node.name === 'tinMesh' ? terrain : null;
  if (!destination || node.mesh === undefined) continue;
  for (const primitive of gltf.meshes[node.mesh].primitives) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', accessor(primitive.attributes.POSITION));
    if (primitive.indices !== undefined) geometry.setIndex(accessor(primitive.indices));
    geometry.scale(scale, scale, scale);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material);
    mesh.updateMatrixWorld(); destination.push(mesh);
  }
}
if (!roads.length || !terrain.length) throw Error('Road or terrain geometry missing.');
const xml = await fs.readFile(gpxPath, 'utf8');
const sourcePoints = [...xml.matchAll(/<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>/g)].map(match => {
  const lat = Number(match[1].match(/\blat="([^"]+)"/)?.[1]);
  const lon = Number(match[1].match(/\blon="([^"]+)"/)?.[1]);
  const elevation = Number(match[2].match(/<ele>([^<]+)<\/ele>/)?.[1]);
  if (![lat, lon, elevation].every(Number.isFinite)) throw Error('Invalid GPX point.');
  const radians = Math.PI / 180;
  return { x: 6378137 * lon * radians - geo.sceneOriginProjected.easting,
    z: geo.sceneOriginProjected.northing - 6378137 * Math.log(Math.tan(Math.PI / 4 + lat * radians / 2)), elevation };
});
if (sourcePoints.length < 2) throw Error('GPX has too few points.');
// Densify straight GPX segments to 5 m to detect gaps between recorded points.
const samples = [];
for (let i = 1; i < sourcePoints.length; i++) {
  const a = sourcePoints[i - 1], b = sourcePoints[i];
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 5);
  for (let j = 0; j < steps; j++) samples.push(Object.fromEntries(['x', 'z', 'elevation'].map(k => [k, a[k] + (b[k] - a[k]) * j / steps])));
}
samples.push(sourcePoints.at(-1));
const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
function heightAt(meshes, x, z) {
  ray.ray.origin.set(x, 10000, z);
  const candidates = meshes.filter(m => { const b = m.geometry.boundingBox; return x >= b.min.x && x <= b.max.x && z >= b.min.z && z <= b.max.z; });
  return ray.intersectObjects(candidates, false)[0]?.point.y ?? null;
}
const measured = samples.map(p => ({ ...p, roadHeight: heightAt(roads, p.x, p.z), terrainHeight: heightAt(terrain, p.x, p.z) }));
const offsets = measured.filter(p => p.roadHeight !== null).map(p => p.elevation - p.roadHeight).sort((a, b) => a - b);
if (!offsets.length) throw Error('No GPX samples intersect roads; check coordinate transform.');
const datumOffset = offsets[Math.floor(offsets.length / 2)];
const residuals = measured.filter(p => p.roadHeight !== null).map(p => Math.abs(p.elevation - datumOffset - p.roadHeight)).sort((a, b) => a - b);
const points = measured.map(p => [p.x, p.roadHeight ?? p.terrainHeight ?? p.elevation - datumOffset, p.z]);
const missing = measured.flatMap((p, i) => p.roadHeight === null ? [i] : []);
const steepSegments = [];
for (let i = 1; i < measured.length; i++) {
  const a = measured[i - 1], b = measured[i];
  if (a.roadHeight === null || b.roadHeight === null) continue;
  const distance = Math.hypot(b.x - a.x, b.z - a.z);
  if (distance < 0.1) continue;
  const grade = Math.abs(b.roadHeight - a.roadHeight) / distance;
  if (grade > 0.3) steepSegments.push({ sampleIndex: i, grade, riseMeters: b.roadHeight - a.roadHeight });
}
const report = {
  sourceModel: files.find(name => name.endsWith('.glb')),
  roadRenderMode: project.params.roads.renderMode,
  roadWidthScale: project.params.roads.widthScale,
  sourcePointCount: sourcePoints.length, sampleCount: samples.length, spacingMeters: 5,
  roadHitCount: samples.length - missing.length, roadCoveragePercent: Number((100 * (1 - missing.length / samples.length)).toFixed(2)),
  terrainMissCount: measured.filter(p => p.terrainHeight === null).length,
  scale, datumOffset, medianElevationResidualMeters: residuals[Math.floor(residuals.length / 2)],
  p95ElevationResidualMeters: residuals[Math.floor(residuals.length * 0.95)],
  segmentsAbove30PercentGrade: steepSegments.length,
  interpretation: 'Vertical rays test exported road coverage, not road identity or drivability. Highest surface used at overlaps. GPX altitude datum fitted by median; not survey calibration. Uncovered samples use terrain height for display only.',
};
// Editor extras duplicate large geometry arrays; rendering uses the binary accessors.
function stripExtras(value) {
  if (!value || typeof value !== 'object') return;
  delete value.extras;
  for (const child of Object.values(value)) stripExtras(child);
}
stripExtras(gltf);
const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + padded.length + 8 + binary.length, 8);
header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binary.length); binHeader.writeUInt32LE(0x004e4942, 4);
const output = Buffer.concat([header, padded, binHeader, binary]);
report.sourceBytes = source.length; report.optimizedBytes = output.length;
const out = path.resolve('public/maps/genting');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'scenery.glb'), output);
await fs.writeFile(path.join(out, 'alignment.json'), JSON.stringify({ report, points, missing, steepSegments }));
await fs.copyFile(path.join(directory, 'georeference.json'), path.join(out, 'georeference.json'));
await fs.copyFile(path.join(directory, 'README.txt'), path.join(out, 'SOURCE-README.txt'));
await fs.writeFile(path.join(out, 'source.gpx'), xml);
console.log(JSON.stringify(report, null, 2));
for (const mesh of [...roads, ...terrain]) mesh.geometry.dispose();
material.dispose();
