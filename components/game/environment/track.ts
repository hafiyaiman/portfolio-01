import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, Vector3 } from "three";
import { ROUTE_POINTS, ROUTE_INFO } from "./gentingRoute.mjs";

export { ROUTE_INFO };
// The imported uphill leg is open; never connect the summit to the start.
export const roadCurve = new CatmullRomCurve3(ROUTE_POINTS.map(p => new Vector3(...p)), false, "centripetal");
roadCurve.arcLengthDivisions = ROUTE_POINTS.length * 8;
export const ROAD_LENGTH = roadCurve.getLength();
export const ROAD_WIDTH = 10;
export const ROAD_SEGMENTS = Math.ceil(ROAD_LENGTH / 4);

export function roadFrame(t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  const point = roadCurve.getPointAt(clamped);
  const tangent = roadCurve.getTangentAt(clamped);
  const right = new Vector3(tangent.z, 0, -tangent.x).normalize();
  return { point, tangent, right };
}
const frames = Array.from({ length: ROAD_SEGMENTS + 1 }, (_, i) => roadFrame(i / ROAD_SEGMENTS));
export const SPAWN = roadFrame(12 / ROAD_LENGTH).point;
const spawnTangent = roadFrame(12 / ROAD_LENGTH).tangent;
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
  frames.forEach(({ point, right }, i) => {
    for (const side of [-1, 1]) {
      const vertex = point.clone().addScaledVector(right, offset + side * width / 2);
      positions.push(vertex.x, vertex.y + height, vertex.z);
    }
    if (i < ROAD_SEGMENTS) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  return stripGeometry(positions, indices);
}

/** Continuous roadside walls replace thousands of individual barrier colliders. */
export function createBarrier(side: number) {
  const positions: number[] = [], indices: number[] = [];
  frames.forEach(({ point, right }, i) => {
    const p = point.clone().addScaledVector(right, side * (ROAD_WIDTH / 2 + 0.65));
    positions.push(p.x, p.y, p.z, p.x, p.y + 0.8, p.z);
    if (i < ROAD_SEGMENTS) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
  });
  return stripGeometry(positions, indices);
}

/** Scenic ground inferred from the route corridor, not a surveyed elevation model. */
export function createTerrain() {
  const step = 90;
  const xs = ROUTE_POINTS.map(p => p[0]), zs = ROUTE_POINTS.map(p => p[2]);
  const minX = Math.min(...xs) - 500, minZ = Math.min(...zs) - 500;
  const nx = Math.ceil((Math.max(...xs) + 500 - minX) / step);
  const nz = Math.ceil((Math.max(...zs) + 500 - minZ) / step);
  const positions: number[] = [], indices: number[] = [];
  for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
    const x = minX + ix * step, z = minZ + iz * step;
    let distance = Infinity, elevation = 0;
    for (let i = 0; i < ROUTE_POINTS.length; i += 3) {
      const p = ROUTE_POINTS[i];
      const d = (p[0] - x) ** 2 + (p[2] - z) ** 2;
      if (d < distance) { distance = d; elevation = p[1]; }
    }
    const y = elevation - 45 - Math.sqrt(distance) * 0.28 + Math.sin(x / 180) * Math.cos(z / 210) * 14;
    positions.push(x, y, z);
    if (ix < nx && iz < nz) {
      const a = iz * (nx + 1) + ix;
      indices.push(a, a + nx + 1, a + 1, a + 1, a + nx + 1, a + nx + 2);
    }
  }
  return stripGeometry(positions, indices);
}
