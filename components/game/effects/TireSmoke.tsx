"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CanvasTexture,
  Color,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import type { S15Vehicle } from "../physics/s15Physics";

const MAX_SMOKE = 160;

type Particle = {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  maxScale: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
};

function makeSmokeTexture(): CanvasTexture {
  if (typeof document === "undefined") {
    return new CanvasTexture(undefined as unknown as HTMLCanvasElement);
  }
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    grad.addColorStop(0, "rgba(245, 245, 248, 0.95)");
    grad.addColorStop(0.3, "rgba(230, 232, 235, 0.7)");
    grad.addColorStop(0.7, "rgba(210, 212, 218, 0.22)");
    grad.addColorStop(1, "rgba(200, 200, 205, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
  }
  return new CanvasTexture(canvas);
}

function createParticles(): Particle[] {
  return Array.from({ length: MAX_SMOKE }, () => ({
    active: false,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    scale: 0.2,
    maxScale: 1.6,
    life: 0,
    maxLife: 1.0,
    rotation: 0,
    rotSpeed: 0,
    opacity: 0,
  }));
}

export function TireSmoke({
  vehicle,
}: {
  vehicle: S15Vehicle | RefObject<S15Vehicle | null>;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const texture = useMemo(() => makeSmokeTexture(), []);
  const dummyMatrix = useRef(new Matrix4());
  const dummyPos = useRef(new Vector3());
  const dummyScale = useRef(new Vector3());
  const dummyQuat = useRef(new Quaternion());
  const rotQuat = useRef(new Quaternion());
  const axisZ = useRef(new Vector3(0, 0, 1));
  const baseColor = useRef(new Color("#d4d4d8"));
  const particles = useRef<Particle[]>(createParticles());

  const nextIndex = useRef(0);
  const emitTimer = useRef(0);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const v = "current" in vehicle ? vehicle.current : vehicle;
    if (!v) return;
    const clampedDelta = Math.min(delta, 0.05);

    emitTimer.current += clampedDelta;
    const canEmit = emitTimer.current > 0.035; // ~28 Hz emission rate
    if (canEmit) emitTimer.current = 0;

    // 1. Emit from slipping wheels
    if (canEmit && v.grounded >= 2) {
      v.wheels.forEach((wheel, index) => {
        const isRear = index >= 2;
        const slipVal = Math.abs(wheel.slip);
        const isSlipping = slipVal > 0.16;
        const isSpinning =
          isRear && Math.abs(wheel.omega * 0.316 - v.forwardSpeed) > 3.0;

        if (wheel.contact && (isSlipping || isSpinning)) {
          const p = particles.current[nextIndex.current];
          p.active = true;
          // Spawn near wheel contact patch
          p.x = wheel.point.x + (Math.random() - 0.5) * 0.2;
          p.y = wheel.point.y + 0.08;
          p.z = wheel.point.z + (Math.random() - 0.5) * 0.2;

          // Momentum drift + upward billow + turbulence
          const intensity = Math.min(1.0, slipVal * 2.0);
          p.vx = (Math.random() - 0.5) * 0.8;
          p.vy = 0.45 + Math.random() * 0.6;
          p.vz = (Math.random() - 0.5) * 0.8;

          p.scale = 0.25 + Math.random() * 0.15;
          p.maxScale = 1.3 + intensity * 0.9;
          p.maxLife = 0.7 + Math.random() * 0.5;
          p.life = p.maxLife;
          p.rotation = Math.random() * Math.PI * 2;
          p.rotSpeed = (Math.random() - 0.5) * 1.5;
          p.opacity = 0.38 + intensity * 0.22;

          nextIndex.current = (nextIndex.current + 1) % MAX_SMOKE;
        }
      });
    }

    // 2. Update active particles and write instance matrices
    const camQuat = state.camera.quaternion;
    let anyActive = false;

    for (let i = 0; i < MAX_SMOKE; i++) {
      const p = particles.current[i];
      if (!p.active) {
        dummyMatrix.current.makeScale(0, 0, 0);
        meshRef.current.setMatrixAt(i, dummyMatrix.current);
        continue;
      }

      p.life -= clampedDelta;
      if (p.life <= 0) {
        p.active = false;
        dummyMatrix.current.makeScale(0, 0, 0);
        meshRef.current.setMatrixAt(i, dummyMatrix.current);
        continue;
      }

      anyActive = true;
      p.x += p.vx * clampedDelta;
      p.y += p.vy * clampedDelta;
      p.z += p.vz * clampedDelta;
      p.rotation += p.rotSpeed * clampedDelta;

      // Expand over life
      const progress = 1 - p.life / p.maxLife;
      const currentScale =
        p.scale + (p.maxScale - p.scale) * Math.sin(progress * (Math.PI / 2));

      dummyPos.current.set(p.x, p.y, p.z);
      dummyScale.current.set(currentScale, currentScale, currentScale);

      // Billboard: face camera + roll rotation
      dummyQuat.current.copy(camQuat);
      rotQuat.current.setFromAxisAngle(axisZ.current, p.rotation);
      dummyQuat.current.multiply(rotQuat.current);

      dummyMatrix.current.compose(
        dummyPos.current,
        dummyQuat.current,
        dummyScale.current,
      );
      meshRef.current.setMatrixAt(i, dummyMatrix.current);

      // Fade out smoothly
      const alpha = Math.sin(Math.PI * (p.life / p.maxLife)) * p.opacity;
      const col = baseColor.current.clone().multiplyScalar(0.7 + alpha * 0.3);
      meshRef.current.setColorAt(i, col);
    }

    if (anyActive || canEmit) {
      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) {
        meshRef.current.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_SMOKE]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        opacity={0.45}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
