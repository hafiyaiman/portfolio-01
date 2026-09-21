import { Group, Mesh, MeshBasicMaterial, DoubleSide, Raycaster, Vector3 } from "three";

export type DrivingRoute = {
  spawn: Vector3;
  spawnYaw: number;
  nearestFrame: (position: Vector3) => { point: Vector3; tangent: Vector3 };
};

export function prepareImportedWorld(source: Group, scale: number, coordinates: number[][]) {
  const scene = source.clone(true);
  scene.scale.setScalar(scale);
  scene.updateMatrixWorld(true);
  const vertices: number[] = [], indices: number[] = [];
  const roads: Mesh[] = [];
  const rayMaterial = new MeshBasicMaterial({ side: DoubleSide });
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    if (object.name.startsWith("treeBaked_")) { object.visible = false; return; }
    if (!object.name.startsWith("road_") && object.name !== "tinMesh" && !object.name.startsWith("building_")) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    const position = geometry.getAttribute("position");
    const offset = vertices.length / 3;
    for (let i = 0; i < position.count; i++) vertices.push(position.getX(i), position.getY(i), position.getZ(i));
    const index = geometry.index;
    for (let i = 0; i < (index?.count ?? position.count); i++) indices.push(offset + (index ? index.getX(i) : i));
    if (object.name.startsWith("road_")) {
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const mesh = new Mesh(geometry, rayMaterial);
      mesh.updateMatrixWorld(); roads.push(mesh);
    } else geometry.dispose();
  });
  const ray = new Raycaster(new Vector3(), new Vector3(0, -1, 0));
  function roadHit(point: Vector3) {
    ray.ray.origin.set(point.x, point.y + 5, point.z);
    ray.far = 12;
    return ray.intersectObjects(roads.filter(m => {
      const b = m.geometry.boundingBox!;
      return point.x >= b.min.x && point.x <= b.max.x && point.z >= b.min.z && point.z <= b.max.z;
    }), false)[0];
  }
  const points = coordinates.map(p => new Vector3(p[0], p[1], p[2]));
  function frameAt(index: number) {
    const point = points[index].clone();
    const tangent = points[Math.min(index + 1, points.length - 1)].clone().sub(points[Math.max(0, index - 1)]).normalize();
    return { point, tangent };
  }
  function stableFrame(index: number) {
    const frame = frameAt(index);
    const forward = frame.tangent.clone().setY(0).normalize();
    const right = new Vector3(forward.z, 0, -forward.x);
    const heights: number[] = [];
    for (const x of [-0.85, 0.85]) for (const z of [-1.25, 1.25]) {
      const wheel = frame.point.clone().addScaledVector(right, x).addScaledVector(forward, z);
      const hit = roadHit(wheel);
      if (!hit || Math.abs(hit.face?.normal.y ?? 0) < 0.96) return null;
      heights.push(hit.point.y);
    }
    if (Math.max(...heights) - Math.min(...heights) > 0.3) return null;
    const hit = roadHit(frame.point);
    if (!hit) return null;
    frame.point.y = hit.point.y;
    return frame;
  }
  let spawnFrame = null;
  for (let i = 1; i < points.length - 1; i++) {
    spawnFrame = stableFrame(i);
    if (spawnFrame) break;
  }
  if (!spawnFrame) throw Error(`No stable spawn found on ${roads.length} imported road meshes. First road hit: ${JSON.stringify(roadHit(points[0])?.point)}`);
  const route: DrivingRoute = {
    spawn: spawnFrame.point,
    spawnYaw: Math.atan2(spawnFrame.tangent.x, spawnFrame.tangent.z),
    nearestFrame(position) {
      const candidates = points.map((p, i) => ({ i, distance: p.distanceToSquared(position) })).sort((a, b) => a.distance - b.distance);
      for (const { i } of candidates) {
        if (i === 0 || i === points.length - 1) continue;
        const frame = stableFrame(i);
        if (frame) return frame;
      }
      return { point: route.spawn.clone(), tangent: new Vector3(Math.sin(route.spawnYaw), 0, Math.cos(route.spawnYaw)) };
    },
  };
  const collider = { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
  return { scene, route, collider, dispose() { for (const road of roads) road.geometry.dispose(); rayMaterial.dispose(); } };
}
