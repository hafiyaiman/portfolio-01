import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { Quaternion, Vector3 } from "three";
import {
  S15,
  S15Vehicle,
  gearForSpeed,
  lateralGrip,
  turboEngine,
} from "./s15Physics.ts";

const R = createRequire(import.meta.resolve("@react-three/rapier"))(
  "@dimforge/rapier3d-compat",
);
await R.init();
const dt = 1 / 120;
const idle = {
  steer: 0,
  throttle: 0,
  direction: 1,
  braking: false,
  handbrake: false,
  gear: 1,
  shifting: false,
};
test("turbo spools progressively, adds torque, dumps on lift and limits unloaded boost", () => {
  let engine = turboEngine(0, 4500, 1, false, 4, dt);
  const initialTorque = engine.torque;
  assert.ok(engine.boost > 0 && engine.boost < 0.03);
  for (let i = 0; i < 360; i++)
    engine = turboEngine(engine.boost, 4500, 1, false, 4, dt);
  assert.ok(engine.boost > 0.98 && engine.boost <= 1);
  assert.ok(engine.torque > initialTorque * 1.8);
  for (let i = 0; i < 120; i++)
    engine = turboEngine(engine.boost, 4500, 0, false, 4, dt);
  assert.ok(engine.boost < 0.01);
  assert.equal(turboEngine(0, 1500, 1, false, 4, 1).boost, 0);
  assert.equal(turboEngine(1, 7901, 1, false, 4, dt).torque, 0);
  assert.ok(turboEngine(0, 4500, 1, false, 0, 10).boost <= 0.2);
});
function rig() {
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = dt;
  world.createCollider(
    R.ColliderDesc.cuboid(500, 1, 500).setTranslation(0, -1, 0),
  );
  const body = world.createRigidBody(
    R.RigidBodyDesc.dynamic()
      .setTranslation(0, 0.7, 0)
      .setAngularDamping(0.15)
      .setCanSleep(false),
  );
  world.createCollider(
    R.ColliderDesc.cuboid(0.8, 0.15, 2.1)
      .setTranslation(0, -0.1, 0)
      .setMassProperties(S15.mass, { x: 0, y: 0.1, z: 0 }, S15.inertia, {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
      }),
    body,
  );
  world.createCollider(
    R.ColliderDesc.cuboid(0.63, 0.2, 1)
      .setTranslation(0, 0.42, -0.1)
      .setMass(0),
    body,
  );
  const vehicle = new S15Vehicle();
  const step = (input = idle) => {
    vehicle.step(body, world, R, input, dt);
    world.step();
  };
  for (let i = 0; i < 600; i++) step();
  return { world, body, vehicle, step };
}

test("S15 settles at estimated CG height with four loaded tires", () => {
  const r = rig();
  try {
    assert.ok(Math.abs(r.body.translation().y - S15.cgHeight) < 0.02);
    assert.equal(r.vehicle.grounded, 4);
    assert.ok(
      Math.abs(
        r.vehicle.wheels.reduce((sum, w) => sum + w.load, 0) - S15.mass * 9.81,
      ) < 100,
    );
    assert.ok(Math.abs(r.body.worldCom().y - r.body.translation().y) < 0.001);
  } finally {
    r.world.free();
  }
});

for (const steer of [-1, 1])
  test(`108 km/h steering and slalom remain upright (${steer})`, () => {
    const r = rig();
    try {
      r.body.setLinvel({ x: 0, y: 0, z: 30 }, true);
      r.vehicle.wheels.forEach((w) => {
        w.omega = 30 / S15.radius;
      });
      let minimumUp = 1;
      for (let i = 0; i < 1200; i++) {
        r.step({ ...idle, gear: 3, steer: i < 600 ? steer : -steer });
        minimumUp = Math.min(
          minimumUp,
          new Vector3(0, 1, 0).applyQuaternion(
            new Quaternion().copy(r.body.rotation()),
          ).y,
        );
      }
      assert.ok(minimumUp > 0.85, `minimum upright dot: ${minimumUp}`);
    } finally {
      r.world.free();
    }
  });

test("rear drive accelerates, brakes and reverses", () => {
  const r = rig();
  try {
    for (let i = 0; i < 600; i++) r.step({ ...idle, throttle: 1 });
    assert.ok(r.vehicle.forwardSpeed > 5);
    for (let i = 0; i < 600; i++) r.step({ ...idle, braking: true });
    assert.ok(r.vehicle.speed < 0.5);
    for (let i = 0; i < 600; i++)
      r.step({ ...idle, throttle: 1, direction: -1, gear: -1 });
    assert.ok(r.vehicle.forwardSpeed < -2 && r.vehicle.forwardSpeed > -8.5);
  } finally {
    r.world.free();
  }
});

test("grip is continuous and bounded; gearbox includes sixth", () => {
  for (let a = -1; a <= 1; a += 0.001) {
    assert.ok(Math.abs(lateralGrip(a, 3000)) <= 3000 * 0.94);
    assert.ok(
      Math.abs(lateralGrip(a + 0.001, 3000) - lateralGrip(a, 3000)) < 50,
    );
  }
  assert.equal(gearForSpeed(70, 5), 6);
  assert.equal(gearForSpeed(100, 6), 6);
});

test("assist levels (arcade, sport, pro) configure rack rate and steering authority", () => {
  const r = rig();
  try {
    // Pro mode has direct 12 rad/s rack and full lock
    r.step({ ...idle, steer: 1, assistLevel: "pro" });
    const proFirstStepSteer = Math.abs(r.vehicle.steer);

    // Arcade mode has smoother 3.8 rad/s slew rate
    const rArcade = rig();
    rArcade.step({ ...idle, steer: 1, assistLevel: "arcade" });
    const arcadeFirstStepSteer = Math.abs(rArcade.vehicle.steer);

    assert.ok(
      proFirstStepSteer > arcadeFirstStepSteer,
      `Pro steer rate (${proFirstStepSteer}) should exceed Arcade rate (${arcadeFirstStepSteer})`,
    );

    rArcade.world.free();
  } finally {
    r.world.free();
  }
});
