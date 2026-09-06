import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from "three";
import { ROUTE_POINTS, ROUTE_INFO } from "./gentingRoute.mjs";

export { ROUTE_INFO };
export const roadCurve = new CatmullRomCurve3(ROUTE_POINTS.map(p => new Vector3(...p)), ROUTE_INFO.closed, "centripetal");
roadCurve.arcLengthDivisions = ROUTE_POINTS.length * 8;
export const ROAD_LENGTH = roadCurve.getLength();
export const ROAD_WIDTH = 10;
export const ROAD_SEGMENTS = Math.ceil(ROAD_LENGTH / 1.5);
const ROUTE_SAMPLE_COUNT = ROUTE_POINTS.length - 1;

function routeParameter(t: number) {
  return ROUTE_INFO.closed ? ((t % 1) + 1) % 1 : Math.max(0, Math.min(1, t));
}

function baseRoadPoint(t: number) {
  const clamped = routeParameter(t);
  const point = roadCurve.getPointAt(clamped);
  // Average nearby samples to remove small GPX elevation spikes from the road mesh.
  const elevationSamples = [-0.002, -0.001, 0, 0.001, 0.002].map(offset =>
    roadCurve.getPointAt(routeParameter(clamped + offset)).y,
  );
  point.y = elevationSamples.reduce((sum, value) => sum + value, 0) / elevationSamples.length;
  return point;
}

const sourceCount = Math.ceil(ROAD_LENGTH / 6);
const sourceSamples = Array.from({ length: sourceCount + 1 }, (_, i) => baseRoadPoint(i / sourceCount));
const sourceBins = new Map<string, number[]>();
sourceSamples.forEach((p, i) => {
  const key = `${Math.floor(p.x / 32)}:${Math.floor(p.z / 32)}`;
  if (!sourceBins.has(key)) sourceBins.set(key, []);
  sourceBins.get(key)!.push(i);
});

export function roadSurfaceHeightAt(px: number, pz: number) {
  const bx = Math.floor(px / 32), bz = Math.floor(pz / 32);
  let sum = 0, weights = 0;
  // Repeated GPX traversals of the same pavement share one elevation field.
  // This preserves the alignment without stacking a second deck above it.
  for (let x = bx - 1; x <= bx + 1; x++) for (let z = bz - 1; z <= bz + 1; z++) {
    for (const i of sourceBins.get(`${x}:${z}`) ?? []) {
      const p = sourceSamples[i];
      const d = (p.x - px) ** 2 + (p.z - pz) ** 2;
      const weight = Math.exp(-d / 72);
      sum += p.y * weight; weights += weight;
    }
  }
  return sum / weights;
}

function roadPoint(t: number) {
  const point = baseRoadPoint(t);
  point.y = roadSurfaceHeightAt(point.x, point.z);
  return point;
}

export function roadFrame(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  const point = roadPoint(clamped);
  const before = roadPoint(routeParameter(clamped - 0.00005));
  const after = roadPoint(routeParameter(clamped + 0.00005));
  const tangent = after.sub(before).normalize();
  const right = new Vector3(tangent.z, 0, -tangent.x).normalize();
  return { point, tangent, right };
}

export function nearestRoadFrame(position: Vector3) {
  let closestIndex = 0;
  let closestDistance = Infinity;
  for (let i = 0; i < ROUTE_POINTS.length; i++) {
    const point = ROUTE_POINTS[i];
    const distance = (point[0] - position.x) ** 2 + (point[2] - position.z) ** 2;
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = i;
    }
  }
  return roadFrame(closestIndex / ROUTE_SAMPLE_COUNT);
}

type JunctionPad = {
  index: number;
  point: Vector3;
  yaw: number;
  radius: number;
};

function buildJunctionPads() {
  const samples = sourceSamples;
  const pads: JunctionPad[] = [];
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 20; j < samples.length; j++) {
      if (ROUTE_INFO.closed && samples.length - (j - i) < 20) continue;
      const a = samples[i], b = samples[j];
      if (Math.hypot(a.x - b.x, a.z - b.z) > 8 || Math.abs(a.y - b.y) > 8) continue;
      const ad = samples[Math.min(i + 1, samples.length - 1)].clone().sub(samples[Math.max(i - 1, 0)]).normalize();
      const bd = samples[Math.min(j + 1, samples.length - 1)].clone().sub(samples[Math.max(j - 1, 0)]).normalize();
      if (Math.abs(ad.dot(bd)) > 0.8) continue;
      const point = a.clone().add(b).multiplyScalar(0.5);
      const existing = pads.find(pad => Math.hypot(pad.point.x - point.x, pad.point.z - point.z) < 35);
      if (existing) {
        const distance = Math.hypot(existing.point.x - point.x, existing.point.z - point.z);
        existing.radius = Math.min(30, Math.max(existing.radius, distance + 8));
      } else {
        pads.push({ index: i, point, radius: 18, yaw: 0 });
      }
    }
  }
  return pads;
}

export const JUNCTION_PADS = buildJunctionPads();
const frames = Array.from({ length: ROAD_SEGMENTS + 1 }, (_, i) => roadFrame(i / ROAD_SEGMENTS));
// Start on a gentle stretch near the GPX origin so all wheels settle together.
export const SPAWN_DISTANCE = Array.from({ length: 30 }, (_, i) => 12 + i * 10)
  .find(distance => Math.abs(roadFrame(distance / ROAD_LENGTH).tangent.y) < 0.07) ?? 12;
export const SPAWN = roadFrame(SPAWN_DISTANCE / ROAD_LENGTH).point;
const spawnTangent = roadFrame(SPAWN_DISTANCE / ROAD_LENGTH).tangent;
export const SPAWN_YAW = Math.atan2(spawnTangent.x, spawnTangent.z);

function stripGeometry(vertices: number[], indices: number[]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createRoadStrip(width: number, offset = 0, height = 0) {
  const positions: number[] = [], indices: number[] = [];
  const columns = Math.max(1, Math.ceil(width / 2));
  frames.forEach(({ point, right }, i) => {
    for (let j = 0; j <= columns; j++) {
      const vertex = point.clone().addScaledVector(right, offset - width / 2 + width * j / columns);
      positions.push(vertex.x, roadSurfaceHeightAt(vertex.x, vertex.z) + height, vertex.z);
    }
    if (i < ROAD_SEGMENTS) for (let j = 0; j < columns; j++) {
      const a = i * (columns + 1) + j, b = a + columns + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  });
  // Very tight imported bends can reverse the inner offset edge. Keep all
  // pavement triangles upward-facing for both rendering and suspension rays.
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const normalY = (positions[b + 2] - positions[a + 2]) * (positions[c] - positions[a])
      - (positions[b] - positions[a]) * (positions[c + 2] - positions[a + 2]);
    if (normalY < 0) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  }
  return stripGeometry(positions, indices);
}

/** Continuous roadside walls replace thousands of individual barrier colliders. */
export function createBarrier(side: number) {
  const positions: number[] = [], indices: number[] = [];
  frames.forEach(({ point, right }, i) => {
    const p = point.clone().addScaledVector(right, side * (ROAD_WIDTH / 2 + 0.65));
    p.y = roadSurfaceHeightAt(p.x, p.z);
    positions.push(p.x, p.y, p.z, p.x, p.y + 0.8, p.z);
    if (i < ROAD_SEGMENTS && !JUNCTION_PADS.some(junction =>
      Math.hypot(p.x - junction.point.x, p.z - junction.point.z) < junction.radius + 8)) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  });
  return stripGeometry(positions, indices);
}

const terrainRoad = frames.filter((_, i) => i % 4 === 0).map(frame => frame.point);
terrainRoad.push(frames[frames.length - 1].point);
const roadBins = new Map<string, number[]>();
const BIN_SIZE = 64;
for (let i = 0; i < terrainRoad.length - 1; i++) {
  const a = terrainRoad[i], b = terrainRoad[i + 1];
  for (let x = Math.floor(Math.min(a.x, b.x) / BIN_SIZE); x <= Math.floor(Math.max(a.x, b.x) / BIN_SIZE); x++) {
    for (let z = Math.floor(Math.min(a.z, b.z) / BIN_SIZE); z <= Math.floor(Math.max(a.z, b.z) / BIN_SIZE); z++) {
      const key = `${x}:${z}`;
      if (!roadBins.has(key)) roadBins.set(key, []);
      roadBins.get(key)!.push(i);
    }
  }
}

type GroundSample = { height: number; distance: number };
const groundSamples = new Map<string, GroundSample>();

/** An interpolated mountain, with a narrow shelf cut at the actual road elevation. */
function sampleMountain(x: number, z: number): GroundSample {
  const key = `${x}:${z}`;
  const cached = groundSamples.get(key);
  if (cached) return cached;
  const candidates = new Set<number>();
  for (let radius = 3; candidates.size === 0; radius *= 2) {
    const bx = Math.floor(x / BIN_SIZE), bz = Math.floor(z / BIN_SIZE);
    for (let ix = bx - radius; ix <= bx + radius; ix++) {
      for (let iz = bz - radius; iz <= bz + radius; iz++) {
        for (const i of roadBins.get(`${ix}:${iz}`) ?? []) candidates.add(i);
      }
    }
  }
  let distanceSquared = Infinity, roadY = 0, total = 0, weightSum = 0;
  for (const i of candidates) {
    const a = terrainRoad[i], b = terrainRoad[i + 1];
    const dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const px = a.x + dx * t, pz = a.z + dz * t;
    const y = a.y + (b.y - a.y) * t;
    const d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < distanceSquared) { distanceSquared = d; roadY = y; }
    const weight = 1 / (900 + d) ** 1.5;
    total += (y + (x - px) * 0.38 + (z - pz) * 0.08) * weight;
    weightSum += weight;
  }
  const distance = Math.sqrt(distanceSquared);
  const blend = Math.max(0, Math.min(1, (distance - 14) / 40));
  const smooth = blend * blend * (3 - 2 * blend);
  const ridge = Math.sin(x / 95) * Math.cos(z / 145) * 8;
  const pavementBlend = Math.max(0, Math.min(1, (distance - 18) / 6));
  const shelfHeight = distance < 24 ? roadSurfaceHeightAt(x, z) * (1 - pavementBlend) + roadY * pavementBlend : roadY;
  const height = (shelfHeight - 0.65) * (1 - smooth) + (total / weightSum + ridge) * smooth;
  const result = { height, distance };
  groundSamples.set(key, result);
  return result;
}

type TerrainCell = { x: number; z: number; size: number; boundary: number[]; center: number };
type TerrainMesh = { positions: number[]; indices: number[]; cells: Map<string, TerrainCell> };
let mountainMesh: TerrainMesh | undefined;

function buildMountainMesh(): TerrainMesh {
  if (mountainMesh) return mountainMesh;
  const cells = new Map<string, TerrainCell>();
  const corners = new Map<string, number>();
  const positions: number[] = [], indices: number[] = [];
  const vertex = (x: number, z: number) => {
    const key = `${x}:${z}`;
    let id = corners.get(key);
    if (id === undefined) {
      id = positions.length / 3;
      positions.push(x, sampleMountain(x, z).height, z);
      corners.set(key, id);
    }
    return id;
  };
  const subdivide = (x: number, z: number, size: number) => {
    const distance = sampleMountain(x + size / 2, z + size / 2).distance - size * Math.SQRT1_2;
    const target = distance < 22 ? 4 : distance < 75 ? 8 : distance < 180 ? 16 : distance < 300 ? 32 : 64;
    if (size > target) {
      for (const dx of [0, size / 2]) for (const dz of [0, size / 2]) subdivide(x + dx, z + dz, size / 2);
    } else {
      cells.set(`${x}:${z}:${size}`, { x, z, size, boundary: [], center: vertex(x + size / 2, z + size / 2) });
      vertex(x, z); vertex(x + size, z); vertex(x, z + size); vertex(x + size, z + size);
    }
  };
  const xs = terrainRoad.map(p => p.x), zs = terrainRoad.map(p => p.z);
  for (let x = Math.floor((Math.min(...xs) - 400) / 64) * 64; x < Math.max(...xs) + 400; x += 64) {
    for (let z = Math.floor((Math.min(...zs) - 400) / 64) * 64; z < Math.max(...zs) + 400; z += 64) subdivide(x, z, 64);
  }
  // Include fine-neighbour vertices on every coarse edge so there are no terrain cracks.
  for (const cell of cells.values()) {
    const { x, z, size, center } = cell;
    for (let offset = 0; offset < size; offset += 2) {
      const id = corners.get(`${x}:${z + offset}`); if (id !== undefined) cell.boundary.push(id);
    }
    for (let offset = 0; offset < size; offset += 2) {
      const id = corners.get(`${x + offset}:${z + size}`); if (id !== undefined) cell.boundary.push(id);
    }
    for (let offset = 0; offset < size; offset += 2) {
      const id = corners.get(`${x + size}:${z + size - offset}`); if (id !== undefined) cell.boundary.push(id);
    }
    for (let offset = 0; offset < size; offset += 2) {
      const id = corners.get(`${x + size - offset}:${z}`); if (id !== undefined) cell.boundary.push(id);
    }
    cell.boundary.forEach((id, i) => indices.push(center, id, cell.boundary[(i + 1) % cell.boundary.length]));
  }
  mountainMesh = { positions, indices, cells };
  groundSamples.clear();
  return mountainMesh;
}

/** Sample the rendered triangles, including the transition between fine and coarse cells. */
export function terrainHeightAt(x: number, z: number) {
  const { cells, positions } = buildMountainMesh();
  for (const size of [4, 8, 16, 32, 64]) {
    const cell = cells.get(`${Math.floor(x / size) * size}:${Math.floor(z / size) * size}:${size}`);
    if (!cell) continue;
    const a = cell.center * 3;
    for (let i = 0; i < cell.boundary.length; i++) {
      const b = cell.boundary[i] * 3, c = cell.boundary[(i + 1) % cell.boundary.length] * 3;
      const ax = positions[a], az = positions[a + 2], bx = positions[b], bz = positions[b + 2], cx = positions[c], cz = positions[c + 2];
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
      const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
      if (u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6) return positions[a + 1] * u + positions[b + 1] * v + positions[c + 1] * (1 - u - v);
    }
  }
  return sampleMountain(x, z).height;
}

export function createTerrain() {
  const { positions, indices } = buildMountainMesh();
  const geometry = stripGeometry(positions, indices);
  const colors: number[] = [];
  const normals = geometry.getAttribute("normal");
  for (let i = 0; i < positions.length / 3; i++) {
    const variation = 0.025 * Math.sin(positions[i * 3] / 12) * Math.cos(positions[i * 3 + 2] / 18);
    const rocky = Math.max(0, 0.85 - normals.getY(i));
    colors.push(0.18 + variation + rocky * 0.28, 0.28 + variation + rocky * 0.12, 0.11 + variation + rocky * 0.3);
  }
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  return geometry;
}

/** A three-metre verge joins the shoulder directly to the mountain shelf. */
export function createRoadVerge() {
  const positions: number[] = [], indices: number[] = [];
  for (const side of [-1, 1]) {
    const start = positions.length / 3;
    frames.forEach(({ point, right }, i) => {
      for (const offset of [7, 8.5, 10]) {
        const edge = point.clone().addScaledVector(right, side * offset);
        const y = offset === 7 ? roadSurfaceHeightAt(edge.x, edge.z) - 0.08 : terrainHeightAt(edge.x, edge.z) + 0.015;
        positions.push(edge.x, y, edge.z);
      }
      if (i < ROAD_SEGMENTS) for (let j = 0; j < 2; j++) {
        const a = start + i * 3 + j;
        indices.push(a, a + 1, a + 3, a + 1, a + 4, a + 3);
      }
    });
  }
  return stripGeometry(positions, indices);
}
