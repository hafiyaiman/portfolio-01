import { Quaternion, Vector3 } from "three";
import type { RapierRigidBody, useRapier } from "@react-three/rapier";

type Context = ReturnType<typeof useRapier>;
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// Drift-spec S15: stripped interior, extended arms/spacers, coilover drop, chromoly flywheel.
// CG, inertia, balance and suspension/tire parameters are game-calibration estimates.
export const S15 = {
  mass: 1160,
  wheelbase: 2.5,
  frontTrack: 1.53,
  rearTrack: 1.51,
  radius: 0.31595,
  cgHeight: 0.47,
  frontWeight: 0.496,
  mountY: 0.02,
  inertia: { x: 1280, y: 1850, z: 450 },
  // Front: 8.5 kg/mm stiff ARB keeps nose flat. Rear: 6 kg/mm, soft ARB lets rear dig in.
  spring: [83400, 58900],
  compressionDamping: [3400, 2900],
  reboundDamping: [4400, 3700],
  antiRoll: [8500, 2500],
  minLength: 0.2,
  ratios: [3.626, 2.2, 1.541, 1.213, 1, 0.767],
  finalDrive: 4.08,
  reverseRatio: 3.437,
  wheelInertia: 0.9,
};
export const S15_WHEELS = [
  [-S15.frontTrack / 2, S15.mountY, S15.wheelbase * (1 - S15.frontWeight)],
  [S15.frontTrack / 2, S15.mountY, S15.wheelbase * (1 - S15.frontWeight)],
  [-S15.rearTrack / 2, S15.mountY, -S15.wheelbase * S15.frontWeight],
  [S15.rearTrack / 2, S15.mountY, -S15.wheelbase * S15.frontWeight],
] as const;
export const S15_STATIC_LENGTH = S15.cgHeight + S15.mountY - S15.radius;
export const S15_REST = S15.spring.map(
  (k, axle) =>
    S15_STATIC_LENGTH +
    (S15.mass * 9.81 * (axle === 0 ? S15.frontWeight : 1 - S15.frontWeight)) /
      (2 * k),
);

export function lateralGrip(angle: number, load: number, grip = 0.94) {
  // Pacejka Magic Formula: Fy = D · sin(C · atan(B·α − E·(B·α − atan(B·α))))
  // B=10 (cornering stiffness), C=1.5 (shape), D=peak, E=0.5 (post-peak curvature).
  // Peak grip at ~8°; smooth post-peak decline to ~85% at 70° covers the full drift band.
  const D = load * grip;
  const x = 10 * angle;
  return -(D * Math.sin(1.5 * Math.atan(x - 0.5 * (x - Math.atan(x)))));
}

/** SR20DET drift-spec: Garrett GT2871R / G25-550 calibration — quick spool, flat mid-range. */
export function turboEngine(
  boost: number,
  rpm: number,
  throttle: number,
  shifting: boolean,
  grounded: number,
  dt: number,
) {
  // Spool zone 3,200–4,200 RPM: narrower ramp = quicker on-boost snap like a small ball-bearing turbo.
  const spool = clamp((rpm - 3200) / 1000, 0, 1);
  const load = throttle * (shifting ? 0.25 : 1) * (grounded >= 2 ? 1 : 0.2);
  const target = 1.0 * spool * load; // Gauge pressure in bar; wastegate target 1.0 bar.
  const pressure =
    boost +
    (target - boost) * (1 - Math.exp(-dt / (target > boost ? 0.45 : 0.18)));
  const baseTorque = 165 + 30 * Math.exp(-(((rpm - 4600) / 2600) ** 2));
  return {
    boost: clamp(pressure, 0, 1),
    torque: rpm > 7900 ? 0 : baseTorque * (1 + pressure * 0.9),
  };
}

export function gearForSpeed(speed: number, current: number) {
  const gear = clamp(current, 1, 6);
  const rpm =
    (((Math.abs(speed) / S15.radius) * 60) / (2 * Math.PI)) *
    S15.ratios[gear - 1] *
    S15.finalDrive;
  if (rpm > 6600 && gear < 6) return gear + 1;
  if (gear > 1) {
    const downRpm = (rpm * S15.ratios[gear - 2]) / S15.ratios[gear - 1];
    if (rpm < 3000 && downRpm < 5600) return gear - 1;
  }
  return gear;
}

export function rpmForSpeed(
  speed: number,
  gear: number,
  throttle: number,
  grounded: number,
) {
  const ratio =
    gear === -1 ? S15.reverseRatio : S15.ratios[clamp(gear, 1, 6) - 1];
  const coupled =
    (((Math.abs(speed) / S15.radius) * 60) / (2 * Math.PI)) *
    ratio *
    S15.finalDrive;
  return clamp(
    Math.max(950, coupled) +
      (grounded === 0
        ? throttle * 5000
        : throttle * Math.max(0, 1 - Math.abs(speed) / 8) * 1400),
    950,
    7600,
  );
}

export type VehicleInput = {
  steer: number;
  throttle: number;
  direction: 1 | -1;
  braking: boolean | number;
  handbrake: boolean;
  gear: number;
  shifting: boolean;
  assistLevel?: "arcade" | "sport" | "pro";
};
function wheelState() {
  return {
    length: S15_STATIC_LENGTH,
    compression: 0,
    load: 0,
    omega: 0,
    grip: 0.94,
    contact: false,
    slip: 0,
    point: new Vector3(),
    normal: new Vector3(),
    velocity: new Vector3(),
    forward: new Vector3(),
    right: new Vector3(),
  };
}

/** Shared by the game and headless Rapier tests; no React state or visual dependencies. */
export class S15Vehicle {
  wheels = Array.from({ length: 4 }, wheelState);
  steer = 0;
  speed = 0;
  forwardSpeed = 0;
  beta = 0;
  grounded = 0;
  tireSlip = 0;
  rpm = 950;
  boost = 0;
  private p = new Vector3();
  private q = new Quaternion();
  private up = new Vector3();
  private forward = new Vector3();
  private right = new Vector3();
  private velocity = new Vector3();
  private angular = new Vector3();
  private com = new Vector3();
  private origin = new Vector3();
  private down = new Vector3();
  private arm = new Vector3();
  private impulse = new Vector3();

  step(
    body: RapierRigidBody,
    world: Context["world"],
    rapier: Context["rapier"],
    input: VehicleInput,
    dt: number,
  ) {
    this.p.copy(body.translation());
    this.q.copy(body.rotation());
    this.com.copy(body.worldCom());
    this.velocity.copy(body.linvel());
    this.angular.copy(body.angvel());
    this.up.set(0, 1, 0).applyQuaternion(this.q);
    this.forward.set(0, 0, 1).applyQuaternion(this.q);
    this.right.set(1, 0, 0).applyQuaternion(this.q);
    this.forwardSpeed = this.velocity.dot(this.forward);
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.beta = Math.atan2(
      this.velocity.dot(this.right),
      Math.max(this.forwardSpeed, 0.1),
    );
    const level = input.assistLevel ?? "sport";
    const counter = input.steer * this.beta > 0 && this.forwardSpeed > 5;

    let lock: number;
    let desired: number;
    let steerSpeed: number;

    if (level === "pro") {
      // PRO (Simulation / Raw): Direct 1:1 mechanical rack, full ~57° angle kit lock, zero assists
      lock = 1.0;
      desired = clamp(input.steer * lock, -1.0, 1.0);
      steerSpeed = 12.0; // Instantaneous mechanical rack response
    } else if (level === "arcade") {
      // ARCADE (Beginner / Casual): Smooth slew rate, speed-damped lock, and active drift-catch assist
      const gripLock = Math.min(
        1.0,
        (S15.wheelbase * 2.2) / (this.speed * 0.85 + 4.0),
      );
      lock = counter
        ? Math.min(1.0, gripLock + Math.abs(this.beta) * 1.2 + 0.3)
        : Math.min(1.0, gripLock + Math.abs(this.beta) * 0.6);
      const driftAssist = counter
        ? this.beta * 0.28
        : Math.abs(this.beta) > 0.35
          ? this.beta * 0.18
          : 0;
      desired = clamp(input.steer * lock + driftAssist, -1.0, 1.0);
      steerSpeed = counter
        ? 6.5
        : Math.abs(desired) < Math.abs(this.steer)
          ? 5.0
          : 3.8;

      // Mild yaw damping if sliding past 40° to catch runaway 360° spinouts
      if (Math.abs(this.beta) > 0.7 && this.forwardSpeed > 3) {
        body.applyTorqueImpulse(
          this.impulse
            .copy(this.up)
            .multiplyScalar(-this.angular.y * S15.inertia.y * 0.08),
          true,
        );
      }
    } else {
      // SPORT (Enthusiast / Default): Quick-rack (7.5–10 rad/s), wide angle-kit, natural countersteer
      const gripLock = Math.min(
        1.0,
        (S15.wheelbase * 3.2) / (this.speed * 0.65 + 4.5),
      );
      lock = counter
        ? Math.min(1.0, gripLock + Math.abs(this.beta) * 1.0 + 0.25)
        : Math.min(1.0, gripLock + Math.abs(this.beta) * 0.8);
      desired = clamp(
        input.steer * lock + (counter ? this.beta * 0.12 : 0),
        -1.0,
        1.0,
      );
      steerSpeed = counter
        ? 10.0
        : Math.abs(desired) < Math.abs(this.steer)
          ? 9.0
          : 7.5;
    }

    this.steer += clamp(
      desired - this.steer,
      -steerSpeed * dt,
      steerSpeed * dt,
    );
    this.grounded = 0;
    this.tireSlip = 0;

    // Gather all contacts before applying axle-coupled anti-roll forces.
    this.wheels.forEach((wheel, i) => {
      const axle = i < 2 ? 0 : 1;
      const mount = S15_WHEELS[i];
      this.origin
        .set(mount[0], mount[1], mount[2])
        .applyQuaternion(this.q)
        .add(this.p);
      this.down.copy(this.up).negate();
      const hit = world.castRayAndGetNormal(
        new rapier.Ray(this.origin, this.down),
        S15_REST[axle] + S15.radius,
        true,
        undefined,
        undefined,
        undefined,
        body,
      );
      wheel.contact = !!hit && this.up.dot(hit.normal) > 0.55;
      wheel.length = S15_REST[axle];
      wheel.load = 0;
      if (!hit || !wheel.contact) return;
      this.grounded++;
      wheel.length = clamp(hit.timeOfImpact - S15.radius, 0, S15_REST[axle]);
      wheel.compression = S15_REST[axle] - wheel.length;
      wheel.point
        .copy(this.origin)
        .addScaledVector(this.down, hit.timeOfImpact);
      wheel.normal.copy(hit.normal);
      this.arm.copy(wheel.point).sub(this.com);
      wheel.velocity.crossVectors(this.angular, this.arm).add(this.velocity);
      const alignment = Math.max(0.55, this.up.dot(wheel.normal));
      const travelVelocity = wheel.velocity.dot(wheel.normal) / alignment;
      const damping =
        travelVelocity < 0
          ? S15.compressionDamping[axle]
          : S15.reboundDamping[axle];
      // Digressive damping limits sharp-impact forces. Bump stop ramps progressively.
      const damperForce =
        (damping * travelVelocity) / (1 + Math.abs(travelVelocity) / 1.5);
      const bump = Math.max(0, S15.minLength - wheel.length);
      wheel.load = clamp(
        (S15.spring[axle] * wheel.compression -
          damperForce +
          650000 * bump * bump) /
          alignment,
        0,
        12000,
      );
    });
    for (let axle = 0; axle < 2; axle++) {
      const left = this.wheels[axle * 2],
        right = this.wheels[axle * 2 + 1];
      if (!left.contact || !right.contact) continue;
      const force = clamp(
        (left.compression - right.compression) * S15.antiRoll[axle],
        -left.load,
        right.load,
      );
      left.load = clamp(left.load + force, 0, 12000);
      right.load = clamp(right.load - force, 0, 12000);
    }

    const ratio =
      input.gear === -1
        ? S15.reverseRatio
        : S15.ratios[clamp(input.gear, 1, 6) - 1];
    const engineSpeed = Math.max(
      950,
      (Math.abs((this.wheels[2].omega + this.wheels[3].omega) / 2) *
        ratio *
        S15.finalDrive *
        60) /
        (2 * Math.PI),
    );
    const engine = turboEngine(
      this.boost,
      engineSpeed,
      input.throttle,
      input.shifting,
      this.grounded,
      dt,
    );
    this.boost = engine.boost;
    const engineTorque = engine.torque;
    const reverseLimit =
      input.direction === -1
        ? clamp(1 - Math.max(0, -this.forwardSpeed) / 8, 0, 1)
        : 1;
    const driveTorque =
      (input.throttle *
        input.direction *
        engineTorque *
        ratio *
        S15.finalDrive *
        0.87 *
        reverseLimit *
        (input.shifting ? 0.2 : 1)) /
      2;

    // 2-way LSD / spool: equal angular velocity on both rear wheels under throttle AND lift.
    // Inside and outside tires are forced through different arc lengths → both exceed slip limit
    // together, creating the predictable symmetric rear break-out that defines drift initiation.
    if (!input.handbrake) {
      const avgRearOmega = (this.wheels[2].omega + this.wheels[3].omega) / 2;
      this.wheels[2].omega = avgRearOmega;
      this.wheels[3].omega = avgRearOmega;
    }

    this.wheels.forEach((wheel, i) => {
      const rear = i >= 2;
      const handbrake = rear && input.handbrake;
      wheel.grip +=
        ((handbrake ? 0.42 : 0.94) - wheel.grip) * (1 - Math.exp(-dt / 0.12));
      const torque = rear ? driveTorque : 0;
      if (!wheel.contact || wheel.load < 1) {
        wheel.omega = clamp(
          wheel.omega + (torque / S15.wheelInertia) * dt,
          -300,
          300,
        );
        return;
      }
      body.applyImpulseAtPoint(
        this.impulse.copy(wheel.normal).multiplyScalar(wheel.load * dt),
        wheel.point,
        true,
      );
      wheel.forward
        .copy(this.forward)
        .applyAxisAngle(this.up, rear ? 0 : this.steer);
      wheel.forward
        .addScaledVector(wheel.normal, -wheel.forward.dot(wheel.normal))
        .normalize();
      wheel.right.crossVectors(wheel.normal, wheel.forward).normalize();
      const longitudinal = wheel.velocity.dot(wheel.forward);
      const lateral = wheel.velocity.dot(wheel.right);
      const slip = Math.atan2(lateral, Math.max(Math.abs(longitudinal), 1.5));
      wheel.slip = slip;
      let fy = lateralGrip(slip, wheel.load, wheel.grip);
      const predictedOmega = wheel.omega + (torque * dt) / S15.wheelInertia;
      const stiffness = 10 * wheel.load;
      // Implicit longitudinal-slip step avoids wheel-inertia oscillation near zero speed.
      let fx =
        (stiffness * (S15.radius * predictedOmega - longitudinal)) /
        (Math.max(Math.abs(longitudinal), 2) +
          (stiffness * S15.radius ** 2 * dt) / S15.wheelInertia);
      const brakeInput =
        typeof input.braking === "number"
          ? clamp(input.braking, 0, 1)
          : input.braking
            ? 1
            : 0;
      const isBraking = brakeInput > 0 || handbrake;
      if (isBraking) {
        const maxBrake =
          brakeInput > 0 ? (rear ? 3200 : 5000) * brakeInput : 3500;
        fx = -clamp((longitudinal * S15.mass) / (4 * dt), -maxBrake, maxBrake);
      }
      const limit = wheel.grip * wheel.load;
      const scale = Math.min(1, limit / Math.max(0.001, Math.hypot(fx, fy)));
      fx *= scale;
      fy *= scale;
      if (isBraking) wheel.omega = handbrake ? 0 : longitudinal / S15.radius;
      else
        wheel.omega = clamp(
          predictedOmega - (fx * S15.radius * dt) / S15.wheelInertia,
          -300,
          300,
        );
      // Mild rolling resistance is separate from slip force and opposes travel.
      fx -= clamp(longitudinal * 30, -wheel.load * 0.012, wheel.load * 0.012);
      body.applyImpulseAtPoint(
        this.impulse
          .copy(wheel.forward)
          .multiplyScalar(fx)
          .addScaledVector(wheel.right, fy)
          .multiplyScalar(dt),
        wheel.point,
        true,
      );
      this.tireSlip +=
        clamp(
          (Math.abs(lateral) +
            Math.abs(S15.radius * wheel.omega - longitudinal) * 0.3) /
            9,
          0,
          1,
        ) / 4;
    });
    // Modest yaw-only assistance; no roll/pitch locks or artificial upright torque.
    if (this.grounded >= 3 && counter) {
      const assist = clamp(
        this.beta * 600 - this.angular.dot(this.up) * 220,
        -450,
        450,
      );
      body.applyTorqueImpulse(
        this.impulse.copy(this.up).multiplyScalar(assist * dt),
        true,
      );
    }
    // High-caster self-aligning torque (~8° caster): tilted kingpin axis creates a continuous
    // restoring yaw moment proportional to front load × slip angle. Causes steering to naturally
    // whip into countersteer the moment the rear slides — no driver input required.
    if (this.grounded >= 2 && this.speed > 3) {
      const frontLoad = this.wheels[0].load + this.wheels[1].load;
      const satTorque = -this.beta * 0.05 * frontLoad;
      body.applyTorqueImpulse(
        this.impulse.copy(this.up).multiplyScalar(satTorque * dt),
        true,
      );
    }
    body.applyImpulse(
      this.impulse.copy(this.velocity).multiplyScalar(-0.42 * this.speed * dt),
      true,
    );
    const targetRpm = Math.max(
      rpmForSpeed(this.forwardSpeed, input.gear, input.throttle, this.grounded),
      Math.min(engineSpeed, 7600),
    );
    this.rpm += (targetRpm - this.rpm) * (1 - Math.exp(-12 * dt));
  }
}
