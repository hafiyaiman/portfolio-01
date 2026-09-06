import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';

let source = fs.readFileSync(new URL('./track.ts', import.meta.url), 'utf8');
source = source.replace('"three"', JSON.stringify(pathToFileURL(`${process.cwd()}/node_modules/three/build/three.module.js`).href));
source = source.replace('"./gentingRoute.mjs"', JSON.stringify(new URL('./gentingRoute.mjs', import.meta.url).href));
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const track = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
let intersections = 0, unsupported = 0, maxGap = 0;
const failures = [];
const started = performance.now();
for (let i = 0; i <= track.ROAD_SEGMENTS; i++) {
  const frame = track.roadFrame(i / track.ROAD_SEGMENTS);
  for (const offset of [-7, -5, 0, 5, 7]) {
    const p = frame.point.clone().addScaledVector(frame.right, offset);
    const gap = track.roadSurfaceHeightAt(p.x, p.z) - track.terrainHeightAt(p.x, p.z);
    if (gap < 0) intersections++;
    if (gap > 1.5) unsupported++;
    maxGap = Math.max(gap, maxGap);
    if ((gap < 0 || gap > 1.5) && failures.length < 12) failures.push({ i, offset, gap });
  }
}
const verge = track.createRoadVerge();
const terrain = track.createTerrain();
const road = track.createRoadStrip(track.ROAD_WIDTH);
if (track.ROUTE_INFO.closed) {
  assert.ok(track.roadFrame(0).point.distanceTo(track.roadFrame(1).point) < 1e-6, 'Loop position must meet');
  assert.ok(track.roadFrame(0).tangent.distanceTo(track.roadFrame(1).tangent) < 1e-6, 'Loop tangent must meet');
  const p = road.attributes.position;
  const row = Math.ceil(track.ROAD_WIDTH / 2) + 1;
  for (let i = 0; i < row; i++) for (let axis = 0; axis < 3; axis++) {
    assert.ok(Math.abs(p.array[i * 3 + axis] - p.array[(p.count - row + i) * 3 + axis]) < 1e-5, 'Pavement seam must meet across its entire width');
  }
}
let meshIntersections = 0;
const positions = road.attributes.position, indices = road.index;
for (let i = 0; i < indices.count; i += 3) {
  const a = indices.getX(i), b = indices.getX(i + 1), c = indices.getX(i + 2);
  const x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3;
  const y = (positions.getY(a) + positions.getY(b) + positions.getY(c)) / 3;
  const z = (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3;
  const ground = track.terrainHeightAt(x, z);
  if (!Number.isFinite(ground) || ground >= y) meshIntersections++;
}
console.log({ samples: (track.ROAD_SEGMENTS + 1) * 5, terrainIntersections: intersections, unsupported, maxGap, meshIntersections, roadTriangles: indices.count / 3, triangles: terrain.index.count / 3, seconds: (performance.now() - started) / 1000, failures });
if (process.argv.includes('--diagnose')) {
  for (const failure of failures.slice(0, 3)) {
    const f = track.roadFrame(failure.i / track.ROAD_SEGMENTS);
    let closest = Infinity, other;
    for (let i = 0; i <= track.ROAD_SEGMENTS; i += 4) {
      if (Math.abs(i - failure.i) < 60) continue;
      const candidate = track.roadFrame(i / track.ROAD_SEGMENTS).point;
      const d = Math.hypot(candidate.x - f.point.x, candidate.z - f.point.z);
      if (d < closest) { closest = d; other = { i, d, y: candidate.y, roadY: f.point.y }; }
    }
    console.log({ failure, other });
  }
}
verge.dispose();
terrain.dispose();
road.dispose();
if (intersections || unsupported || meshIntersections) process.exitCode = 1;
