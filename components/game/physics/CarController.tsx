"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CuboidCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import { Group } from "three";
import { SPAWN, SPAWN_YAW } from "../environment/track";
import { useGameStore } from "../stores/useGameStore";
import { drivingInput } from "./useDrivingInput";
import { driftScore, PHYSICS_DT } from "./driftMath";
import { SilviaModel } from "../models/SilviaModel";
import { resolveDrive } from "./driveDirection";
import { CarOrbitCamera } from "../camera/CarOrbitCamera";
import { S15, S15_WHEELS, S15Vehicle, gearForSpeed } from "./s15Physics";
import { TireSmoke } from "../effects/TireSmoke";
import { SkidMarks } from "../effects/SkidMarks";

export function CarController() {
  const body = useRef<RapierRigidBody>(null);
  const visual = useRef<Group>(null);
  const wheels = useRef<(Group | null)[]>([]);
  const [vehicle] = useState(() => new S15Vehicle());
  const direction = useRef<{ direction: 1 | -1; stoppedFor: number }>({
    direction: 1,
    stoppedFor: 0,
  });
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

  useBeforePhysicsStep(() => {
    const rb = body.current;
    if (!rb || useGameStore.getState().paused) return;
    if (vehicle.grounded >= 2) sim.current.lastRoadHeight = rb.translation().y;
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
      vehicle.forwardSpeed,
      vehicle.speed,
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
      vehicle.grounded >= 3
    ) {
      const gear = gearForSpeed(vehicle.speed, state.gear);
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

    vehicle.step(
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
      vehicle.beta,
      vehicle.speed,
      state.duration,
      dt,
      vehicle.grounded,
      vehicle.forwardSpeed,
    );
    state.duration = score.active ? state.duration + dt : 0;
    state.score += score.points;
    useGameStore.setState({
      speed: vehicle.speed * 3.6,
      signedSpeed: vehicle.forwardSpeed,
      braking: drive.braking || isHandbrake,
      gear: state.gear,
      rpm: vehicle.rpm,
      boost: vehicle.boost,
      throttle: drive.throttle,
      tireSlip: vehicle.tireSlip,
      angle: (vehicle.beta * 180) / Math.PI,
      score: state.score,
      multiplier: score.multiplier,
      drifting: score.active,
      grounded: vehicle.grounded,
    });
  });

  useFrame((_, delta) => {
    wheels.current.forEach((wheel, index) => {
      if (!wheel) return;
      wheel.position.y = S15_WHEELS[index][1] - vehicle.wheels[index].length;
      wheel.rotation.y = index < 2 ? vehicle.steer : 0;
      if (!useGameStore.getState().paused && wheel.children[0])
        wheel.children[0].rotation.x += vehicle.wheels[index].omega * delta;
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
