import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Quaternion, Vector3 } from "three";
import {
  createRoadStrip,
  ROAD_WIDTH,
  SPAWN,
  SPAWN_YAW,
} from "../environment/track.ts";

// Resolve the same Rapier version as R3F; Drei also brings an older transitive version.
const RAPIER = createRequire(import.meta.resolve("@react-three/rapier"))(
  "@dimforge/rapier3d-compat",
);

test("inclined road closes cleanly and all four rays hit it while excluding the chassis", async () => {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const geometry = createRoadStrip(ROAD_WIDTH);
  try {
    const vertices = geometry.getAttribute("position").array;
    assert.ok(vertices.length >= 6);
    for (const v of vertices.slice(0, 6)) assert.ok(Number.isFinite(v));
    for (const v of vertices.slice(-6)) assert.ok(Number.isFinite(v));
    const normals = geometry.getAttribute("normal").array;
    for (let i = 1; i < normals.length; i += 3) assert.ok(normals[i] > 0.8);
    world.createCollider(
      RAPIER.ColliderDesc.trimesh(
        vertices,
        new Uint32Array(geometry.index.array),
      ),
    );
    const q = new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      SPAWN_YAW,
    );
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(SPAWN.x, SPAWN.y + 0.8, SPAWN.z)
        .setRotation(q),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.86, 0.28, 1.85).setMass(1100),
      body,
    );
    world.step();
    for (const x of [-0.85, 0.85])
      for (const z of [-1.25, 1.25]) {
        const origin = new Vector3(x, -0.05, z)
          .applyQuaternion(q)
          .add(body.translation());
        const hit = world.castRayAndGetNormal(
          new RAPIER.Ray(origin, { x: 0, y: -1, z: 0 }),
          0.97,
          true,
          undefined,
          undefined,
          undefined,
          body,
        );
        assert.ok(hit, `Wheel ${x}, ${z} should contact the road`);
        assert.ok(hit.normal.y > 0.8);
        assert.ok(
          hit.timeOfImpact > 0.3 && hit.timeOfImpact < 0.97,
          `Unexpected ray distance: ${hit.timeOfImpact}`,
        );
        assert.notEqual(hit.collider.parent()?.handle, body.handle);
      }
  } finally {
    geometry.dispose();
    world.free();
  }
});
