import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Box3, Vector3 } from "three";

test("game asset is an assembled metre-scale S15 with a reusable centered wheel", async () => {
  const bytes = await fs.readFile(
    new URL("../../../public/models/silvia-s15.glb", import.meta.url),
  );
  const { scene } = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const body = scene.getObjectByName("Body");
  const wheel = scene.getObjectByName("Wheel");
  assert.ok(body && wheel, "Runtime expects separate Body and Wheel nodes");
  for (const name of [
    "Chassis",
    "Engine",
    "Suspension",
    "Headlights",
    "Taillights",
    "ReverseLights",
  ])
    assert.ok(body.getObjectByName(name), `Missing editable ${name} assembly`);
  const roles = new Set();
  body.traverse((node) => {
    if (!node.isMesh) return;
    roles.add(node.userData.role);
    const center = new Box3().setFromObject(node).getCenter(new Vector3());
    if (node.userData.role === "head")
      assert.ok(
        center.z > 1.5,
        "Headlight emitter must face the front of the car",
      );
    if (["tail", "reverse"].includes(node.userData.role))
      assert.ok(center.z < -1, "Rear emitters must be at the rear");
  });
  for (const role of ["head", "tail", "reverse"])
    assert.ok(roles.has(role), `Missing ${role} emitters`);
  const bounds = new Box3().setFromObject(body);
  const size = bounds.getSize(new Vector3());
  assert.ok(
    size.x > 1.7 && size.x < 2 && size.z > 4.3 && size.z < 4.6,
    "Exploded variant transforms must not enter the game asset",
  );
  assert.ok(bounds.min.y > 0 && bounds.max.y < 1.5);
  const wheelBounds = new Box3().setFromObject(wheel);
  assert.ok(
    wheelBounds.getCenter(new Vector3()).length() < 0.02,
    "Wheel needs a centered pivot for steering/spin",
  );
  assert.ok(
    Math.abs(wheelBounds.getSize(new Vector3()).y / 2 - 0.32) < 0.01,
    "Visual tire radius must match the raycast radius",
  );
  assert.ok(bytes.length < 7_000_000);
  const tire = wheel.getObjectByName("mesh289_slivki_Tire_TOSP_0");
  assert.equal(tire.material.transparent, false);
  assert.equal(tire.material.opacity, 1);
  const geometry = tire.geometry;
  const a = new Vector3(),
    b = new Vector3(),
    c = new Vector3(),
    normal = new Vector3(),
    edge = new Vector3(),
    center = new Vector3();
  let treadFaces = 0;
  for (let i = 0; i < geometry.index.count; i += 3) {
    a.fromBufferAttribute(geometry.attributes.position, geometry.index.getX(i));
    b.fromBufferAttribute(
      geometry.attributes.position,
      geometry.index.getX(i + 1),
    );
    c.fromBufferAttribute(
      geometry.attributes.position,
      geometry.index.getX(i + 2),
    );
    center.copy(a).add(b).add(c).divideScalar(3);
    if (Math.hypot(center.y, center.z) < 0.3) continue;
    normal.subVectors(b, a).cross(edge.subVectors(c, a));
    assert.ok(
      normal.y * center.y + normal.z * center.z > 0,
      "Tire tread must face outward",
    );
    treadFaces++;
  }
  assert.ok(treadFaces > 100);
  assert.match(
    scene.getObjectByName("SilviaS15").userData.author,
    /ZapupaNekra/,
  );
});
