import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Vector3 } from "three";

type Road = {
  length: number;
  frame: (t: number) => { point: Vector3 };
  groundHeight: (x: number, z: number) => number;
  origin: { lat: number; elevation: number };
  elevationBaseline: number;
};
type Alignment = { points: number[][]; report: { scale: number; datumOffset: number } };

export function prepareHybridScenery(source: Group, alignment: Alignment, road: Road) {
  const scale = alignment.report.scale;
  const origin = alignment.points[0];
  const latitude = road.origin.lat * Math.PI / 180;
  const ratio = 6371000 / 6378137 * Math.cos(latitude);
  const northing = 6378137 * Math.log(Math.tan(Math.PI / 4 + latitude / 2));
  const yOffset = alignment.report.datumOffset - road.elevationBaseline + 12;
  const bins = new Map<string, Vector3[]>();
  for (let i = 0; i <= Math.ceil(road.length / 4); i++) {
    const p = road.frame(i / Math.ceil(road.length / 4)).point;
    const key = `${Math.floor(p.x / 32)}:${Math.floor(p.z / 32)}`;
    if (!bins.has(key)) bins.set(key, []);
    bins.get(key)!.push(p);
  }
  function distance(x: number, z: number) {
    const bx = Math.floor(x / 32), bz = Math.floor(z / 32);
    let d = Infinity;
    for (let ix = bx - 3; ix <= bx + 3; ix++) for (let iz = bz - 3; iz <= bz + 3; iz++) {
      for (const p of bins.get(`${ix}:${iz}`) ?? []) d = Math.min(d, (p.x - x) ** 2 + (p.z - z) ** 2);
    }
    return Math.sqrt(d);
  }
  function toGame(point: Vector3) {
    const x = (point.x * scale - origin[0]) * ratio;
    const n = northing - (point.z * scale - origin[2]);
    const z = (2 * Math.atan(Math.exp(n / 6378137)) - Math.PI / 2 - latitude) * 6371000;
    return new Vector3(x, point.y * scale + yOffset, z);
  }
  function groundY(x: number, y: number, z: number) {
    const d = distance(x, z);
    if (d >= 65) return y;
    const t = Math.max(0, Math.min(1, (d - 16) / 49));
    const blend = t * t * (3 - 2 * t);
    return road.groundHeight(x, z) * (1 - blend) + y * blend;
  }
  const scene = source.clone(true);
  scene.updateMatrixWorld(true);
  const owned: BufferGeometry[] = [];
  const colliders: { vertices: Float32Array; indices: Uint32Array }[] = [];
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    // The old road provides all pavement, shoulders, markings and guardrails.
    if (object.name.startsWith("road_") || object.name.startsWith("treeBaked_")) { object.visible = false; return; }
    const original = object.geometry;
    const positions = original.getAttribute("position"), uv = original.getAttribute("uv");
    const index = original.index;
    const building = object.name.startsWith("building_");
    const mapped = Array.from({ length: positions.count }, (_, i) => toGame(new Vector3().fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld)));
    let rigidOffset = 0;
    if (building) {
      const center = new Vector3(); let bottom = Infinity;
      for (const p of mapped) { center.add(p); bottom = Math.min(bottom, p.y); }
      center.divideScalar(mapped.length);
      rigidOffset = groundY(center.x, bottom, center.z) - bottom;
    }
    const output: number[] = [], texcoords: number[] = [];
    type Vertex = { p: Vector3; u: number; v: number };
    const midpoint = (a: Vertex, b: Vertex): Vertex => ({ p: a.p.clone().add(b.p).multiplyScalar(0.5), u: (a.u + b.u) / 2, v: (a.v + b.v) / 2 });
    function triangle(a: Vertex, b: Vertex, c: Vertex, depth = 0) {
      const edges = [a.p.distanceTo(b.p), b.p.distanceTo(c.p), c.p.distanceTo(a.p)];
      const longest = Math.max(...edges);
      const center = a.p.clone().add(b.p).add(c.p).multiplyScalar(1 / 3);
      const near = distance(center.x, center.z) - longest;
      const target = near < 22 ? 4 : near < 65 ? 16 : Infinity;
      if (!building && longest > target && depth < 14) {
        const edge = edges.indexOf(longest);
        if (edge === 0) { const m = midpoint(a, b); triangle(a, m, c, depth + 1); triangle(m, b, c, depth + 1); }
        if (edge === 1) { const m = midpoint(b, c); triangle(a, b, m, depth + 1); triangle(a, m, c, depth + 1); }
        if (edge === 2) { const m = midpoint(c, a); triangle(a, b, m, depth + 1); triangle(m, b, c, depth + 1); }
        return;
      }
      // North changes sign between the map and game, so reverse triangle winding.
      for (const v of [a, c, b]) {
        output.push(v.p.x, building ? v.p.y + rigidOffset : groundY(v.p.x, v.p.y, v.p.z), v.p.z);
        if (uv) texcoords.push(v.u, v.v);
      }
    }
    for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
      const vertices = [0, 1, 2].map(j => {
        const n = index ? index.getX(i + j) : i + j;
        return { p: mapped[n], u: uv?.getX(n) ?? 0, v: uv?.getY(n) ?? 0 };
      });
      triangle(vertices[0], vertices[1], vertices[2]);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(output, 3));
    if (uv) geometry.setAttribute("uv", new Float32BufferAttribute(texcoords, 2));
    geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    object.geometry = geometry;
    object.position.set(0, 0, 0); object.rotation.set(0, 0, 0); object.scale.setScalar(1);
    owned.push(geometry);
    if (building || object.name === "tinMesh") colliders.push({ vertices: geometry.attributes.position.array as Float32Array, indices: Uint32Array.from({ length: output.length / 3 }, (_, i) => i) });
  });
  scene.updateMatrixWorld(true);
  function trees(data: Record<string, number[][]>) {
    const result: Record<string, number[][]> = { foliage: [], trunk: [] };
    data.trunk.forEach((trunk, i) => {
      const base = toGame(new Vector3(trunk[0], trunk[1] - trunk[4], trunk[2]));
      if (distance(base.x, base.z) < 13) return;
      const delta = groundY(base.x, base.y, base.z) - base.y;
      for (const kind of ["trunk", "foliage"]) {
        const t = data[kind][i], p = toGame(new Vector3(t[0], t[1], t[2]));
        result[kind].push([p.x, p.y + delta, p.z, t[3] * scale * ratio, t[4] * scale, t[5] * scale * ratio]);
      }
    });
    return result;
  }
  return { scene, colliders, trees, toGame, distance, dispose() { owned.forEach(g => g.dispose()); } };
}
