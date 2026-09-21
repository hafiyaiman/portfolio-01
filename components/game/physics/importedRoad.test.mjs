import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Quaternion, Vector3 } from 'three';
import { prepareImportedWorld } from '../environment/importedWorld.ts';
import { S15, S15Vehicle } from './s15Physics.ts';

const R = createRequire(import.meta.resolve('@react-three/rapier'))('@dimforge/rapier3d-compat');
await R.init();
// Headless geometry load: keep the exact accessors and binary; omit only textures.
const bytes = await fs.readFile('public/maps/genting/game-scenery.glb');
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength));
gltf.materials = gltf.materials.map(() => ({}));
gltf.images = []; gltf.textures = [];
const json = Buffer.from(JSON.stringify(gltf));
const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32); json.copy(padded);
const header = Buffer.from(bytes.subarray(0, 20));
const tail = bytes.subarray(20 + jsonLength);
header.writeUInt32LE(20 + padded.length + tail.length, 8); header.writeUInt32LE(padded.length, 12);
const model = Buffer.concat([header, padded, tail]);
const loaded = await new GLTFLoader().parseAsync(model.buffer.slice(model.byteOffset, model.byteOffset + model.byteLength), '');
const alignment = JSON.parse(await fs.readFile('public/maps/genting/alignment.json', 'utf8'));
const imported = prepareImportedWorld(loaded.scene, alignment.report.scale, alignment.points);

test('imported road collider supports all four suspension rays at spawn and reset positions', () => {
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  try {
    const { vertices, indices } = imported.collider;
    assert.ok(vertices.every(Number.isFinite));
    assert.ok(indices.every(i => i < vertices.length / 3));
    world.createCollider(R.ColliderDesc.trimesh(vertices, indices));
    world.step();
    const frames = [
      { point: imported.route.spawn, tangent: new Vector3(Math.sin(imported.route.spawnYaw), 0, Math.cos(imported.route.spawnYaw)) },
      ...[0.2, 0.5, 0.8].map(t => imported.route.nearestFrame(new Vector3(...alignment.points[Math.floor(t * alignment.points.length)]))),
    ];
    for (const frame of frames) {
      const yaw = Math.atan2(frame.tangent.x, frame.tangent.z);
      const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
      for (const x of [-0.85, 0.85]) for (const z of [-1.25, 1.25]) {
        const origin = new Vector3(x, 0.8, z).applyQuaternion(q).add(frame.point);
        const hit = world.castRayAndGetNormal(new R.Ray(origin, { x: 0, y: -1, z: 0 }), 1.2, true);
        assert.ok(hit, 'Wheel must contact imported geometry');
        assert.ok(hit.normal.y > 0.95, `Surface normal ${hit.normal.y}`);
        assert.ok(hit.timeOfImpact > 0.3 && hit.timeOfImpact < 1.2);
      }
    }
  } finally { world.free(); }
});

test('S15 settles and accelerates on the actual imported road', () => {
  const world = new R.World({ x: 0, y: -9.81, z: 0 });
  const dt = 1 / 120; world.timestep = dt;
  try {
    world.createCollider(R.ColliderDesc.trimesh(imported.collider.vertices, imported.collider.indices).setFriction(0.7));
    const p = imported.route.spawn;
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), imported.route.spawnYaw);
    const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(p.x, p.y + S15.cgHeight + 0.25, p.z).setRotation(q).setAngularDamping(0.15).setCanSleep(false));
    world.createCollider(R.ColliderDesc.cuboid(0.8, 0.15, 2.1).setTranslation(0, -0.1, 0).setMassProperties(S15.mass, { x: 0, y: 0.1, z: 0 }, S15.inertia, { x: 0, y: 0, z: 0, w: 1 }), body);
    const vehicle = new S15Vehicle();
    const input = { steer: 0, throttle: 0, direction: 1, braking: true, handbrake: false, gear: 1, shifting: false };
    for (let i = 0; i < 360; i++) { vehicle.step(body, world, R, input, dt); world.step(); }
    assert.equal(vehicle.grounded, 4);
    assert.ok(Math.abs(body.translation().y - p.y - S15.cgHeight) < 0.25);
    const start = new Vector3().copy(body.translation());
    for (let i = 0; i < 180; i++) { vehicle.step(body, world, R, { ...input, throttle: 0.5, braking: false }, dt); world.step(); }
    assert.ok(new Vector3().copy(body.translation()).distanceTo(start) > 1, 'Car should accelerate');
    assert.ok(body.translation().y > p.y - 5, 'Car must not fall through the road');
  } finally { world.free(); }
});

test.after(() => imported.dispose());
