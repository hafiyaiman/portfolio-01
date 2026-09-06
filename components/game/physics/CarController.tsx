"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Group, Quaternion, Vector3 } from "three";
import { nearestRoadFrame, SPAWN, SPAWN_YAW } from "../environment/track";
import { useGameStore } from "../stores/useGameStore";
import { drivingInput } from "./useDrivingInput";
import { driftScore, PHYSICS_DT } from "./driftMath";
import { SilviaModel } from "../models/SilviaModel";
import { resolveDrive } from "./driveDirection";
import { CarOrbitCamera } from "../camera/CarOrbitCamera";
import { S15, S15_STATIC_LENGTH, S15_WHEELS, S15Vehicle, gearForSpeed } from "./s15Physics";
import { TireSmoke } from "../effects/TireSmoke";
import { SkidMarks } from "../effects/SkidMarks";

export function CarController() {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  const wheels = useRef<(Group | null)[]>([]);
  const vehicle = useRef<S15Vehicle | null>(null);
  if (vehicle.current == null) {
    vehicle.current = new S15Vehicle();
  }
  const direction = useRef<{ direction: 1 | -1; stoppedFor: number }>({
    direction: 1,
    stoppedFor: 0,
  });
  const lastSoftResetId = useRef(0);
  const sim = useRef({
    duration: 0,
    score: 0,
    gear: 1,
    shiftCooldown: 0,
    lastRoadHeight: SPAWN.y,
    digitalThrottle: 0,
    digitalBrake: 0,
  });
  const { world, rapier } = useRapier();

  const resetCarInPlace = () => {
    const rb = body.current;
    if (!rb) return;
    const frame = nearestRoadFrame(new Vector3(rb.translation().x, rb.translation().y, rb.translation().z));
    const yaw = Math.atan2(frame.tangent.x, frame.tangent.z);
    const upright = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw);
    const spawnY = frame.point.y + S15.cgHeight + 0.25;
    rb.setTranslation({ x: frame.point.x, y: spawnY, z: frame.point.z }, true);
    rb.setRotation(upright, true);
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
    rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    rb.wakeUp();
    const v = vehicle.current;
    if (!v) return;
    v.wheels.forEach((wheel) => {
      wheel.length = S15_STATIC_LENGTH;
      wheel.compression = 0;
      wheel.load = 0;
      wheel.omega = 0;
      wheel.grip = 0.94;
      wheel.contact = false;
      wheel.slip = 0;
      wheel.point.set(0, 0, 0);
      wheel.normal.set(0, 1, 0);
      wheel.velocity.set(0, 0, 0);
      wheel.forward.set(0, 0, 1);
      wheel.right.set(1, 0, 0);
    });
    v.steer = 0;
    v.speed = 0;
    v.forwardSpeed = 0;
    v.beta = 0;
    v.grounded = 0;
    v.tireSlip = 0;
    v.rpm = 950;
    v.boost = 0;
    direction.current = { direction: 1, stoppedFor: 0 };
    sim.current = {
      duration: 0,
      score: useGameStore.getState().score,
      gear: 1,
      shiftCooldown: 0,
      lastRoadHeight: spawnY,
      digitalThrottle: 0,
      digitalBrake: 0,
    };
  };

  useBeforePhysicsStep(() => {
    const rb = body.current;
    const v = vehicle.current;
    if (!rb || !v || useGameStore.getState().paused) return;
    const store = useGameStore.getState();
    if (store.softResetId !== lastSoftResetId.current) {
      lastSoftResetId.current = store.softResetId;
      resetCarInPlace();
      return;
    }
    if (v.grounded >= 2) sim.current.lastRoadHeight = rb.translation().y;
    if (rb.translation().y < sim.current.lastRoadHeight - 25) {
      useGameStore.getState().reset();
      return;
    }
    const dt = PHYSICS_DT;
    const state = sim.current;

    // Throttle input: analog triggers (gamepad) are directly mapped with progressive curves.
    // Digital keys (W / Up Arrow) and UI touch/click buttons ramp progressively so quick clicks ("clicking a lil bit")
    // give fine 10-25% modulation instead of slamming 100% instantly!
    let rawThrottle: number;
    if (drivingInput.throttleAxis > 0.02) {
      rawThrottle = drivingInput.throttleAxis;
      state.digitalThrottle = rawThrottle;
    } else if (drivingInput.throttle) {
      state.digitalThrottle = Math.min(1, state.digitalThrottle + 3.2 * dt);
      rawThrottle = Math.pow(state.digitalThrottle, 1.45);
    } else {
      state.digitalThrottle = Math.max(0, state.digitalThrottle - 5.5 * dt);
      rawThrottle =
        state.digitalThrottle > 0.01
          ? Math.pow(state.digitalThrottle, 1.45)
          : 0;
    }

    let rawBrake: number;
    if (drivingInput.brakeAxis > 0.02) {
      rawBrake = drivingInput.brakeAxis;
      state.digitalBrake = rawBrake;
    } else if (drivingInput.brake) {
      state.digitalBrake = Math.min(1, state.digitalBrake + 4.0 * dt);
      rawBrake = Math.pow(state.digitalBrake, 1.3);
    } else {
      state.digitalBrake = Math.max(0, state.digitalBrake - 6.5 * dt);
      rawBrake =
        state.digitalBrake > 0.01 ? Math.pow(state.digitalBrake, 1.3) : 0;
    }

    const drive = resolveDrive(
      direction.current,
      rawThrottle,
      rawBrake,
      v.forwardSpeed,
      v.speed,
      dt,
    );
    direction.current = {
      direction: drive.direction,
      stoppedFor: drive.stoppedFor,
    };
    state.shiftCooldown = Math.max(0, state.shiftCooldown - dt);
    if (drive.direction === -1) state.gear = -1;
    else if (state.gear === -1) {
      state.gear = 1;
      state.shiftCooldown = 0.45;
    }
    if (
      drive.direction === 1 &&
      state.shiftCooldown === 0 &&
      v.grounded >= 3
    ) {
      const gear = gearForSpeed(v.speed, state.gear);
      if (gear !== state.gear) {
        state.gear = gear;
        state.shiftCooldown = 0.45;
      }
    }

    // Prefer analog stick steering; fallback to digital keys
    const steer =
      Math.abs(drivingInput.steerAxis) > 0.02
        ? drivingInput.steerAxis
        : Number(drivingInput.left) - Number(drivingInput.right);

    const isHandbrake =
      drivingInput.handbrake || drivingInput.controllerHandbrake;

    v.step(
      rb,
      world,
      rapier,
      {
        steer,
        throttle: drive.throttle,
        direction: drive.direction,
        braking: drive.braking ? drive.brakeAmount || 1 : 0,
        handbrake: isHandbrake,
        gear: state.gear,
        shifting: state.shiftCooldown > 0.25,
        assistLevel: useGameStore.getState().assistLevel,
      },
      dt,
    );
    const score = driftScore(
      v.beta,
      v.speed,
      state.duration,
      dt,
      v.grounded,
      v.forwardSpeed,
    );
    state.duration = score.active ? state.duration + dt : 0;
    state.score += score.points;
    useGameStore.setState({
      speed: v.speed * 3.6,
      signedSpeed: v.forwardSpeed,
      braking: drive.braking || isHandbrake,
      gear: state.gear,
      rpm: v.rpm,
      boost: v.boost,
      throttle: drive.throttle,
      tireSlip: v.tireSlip,
      angle: (v.beta * 180) / Math.PI,
      score: state.score,
      multiplier: score.multiplier,
      drifting: score.active,
      grounded: v.grounded,
    });
  });

  useFrame((_, delta) => {
    const v = vehicle.current;
    if (!v) return;
    wheels.current.forEach((wheel, index) => {
      if (!wheel) return;
      wheel.position.y = S15_WHEELS[index][1] - v.wheels[index].length;
      wheel.rotation.y = index < 2 ? v.steer : 0;
      if (!useGameStore.getState().paused && wheel.children[0])
        wheel.children[0].rotation.x += v.wheels[index].omega * delta;
    });
  });

  return (
    <>
      <RigidBody
        ref={body}
        position={[SPAWN.x, SPAWN.y + S15.cgHeight + 0.25, SPAWN.z]}
        rotation={[0, SPAWN_YAW, 0]}
        colliders={false}
        angularDamping={0.15}
        canSleep={false}
        ccd
      >
        {/* Collider-local COM offsets put the actual mass center at the body origin. */}
        <CuboidCollider
          args={[0.8, 0.15, 2.1]}
          position={[0, -0.1, 0]}
          friction={0.25}
          restitution={0.02}
          massProperties={{
            mass: S15.mass,
            centerOfMass: { x: 0, y: 0.1, z: 0 },
            principalAngularInertia: S15.inertia,
            angularInertiaLocalFrame: { x: 0, y: 0, z: 0, w: 1 },
          }}
        />
        <CuboidCollider
          args={[0.63, 0.2, 1]}
          position={[0, 0.42, -0.1]}
          mass={0}
          friction={0.25}
        />
        <group ref={visual}>
          <SilviaModel wheels={wheels} />
        </group>
        <CarOrbitCamera car={visual} />
      </RigidBody>
      <TireSmoke vehicle={vehicle} />
      <SkidMarks vehicle={vehicle} />
    </>
  );
}
