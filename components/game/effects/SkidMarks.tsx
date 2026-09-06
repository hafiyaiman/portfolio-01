"use client";

import { useEffect, useState } from "react";
import { createPortal, useThree } from "@react-three/fiber";
import { useAfterPhysicsStep } from "@react-three/rapier";
import { DoubleSide } from "three";
import { S15, type S15Vehicle } from "../physics/s15Physics";
import { useGameStore } from "../stores/useGameStore";
import { SkidTrail } from "./skidTrail";

export function SkidMarks({ vehicle }: { vehicle: S15Vehicle }) {
  const scene = useThree(state => state.scene);
  const [trail] = useState(() => new SkidTrail());
  useEffect(() => () => trail.geometry.dispose(), [trail]);

  useAfterPhysicsStep(() => {
    if (useGameStore.getState().paused) return;
    vehicle.wheels.forEach((wheel, index) => {
      const longitudinal = wheel.velocity.dot(wheel.forward);
      const lateral = Math.abs(wheel.velocity.dot(wheel.right));
      const wheelspin = Math.abs(wheel.omega * S15.radius - longitudinal);
      // Actual per-tire slip, not chassis velocity or ordinary brake-pedal input.
      const slipping = lateral > 0.8 && Math.abs(wheel.slip) > 0.12 || wheelspin > 2.5;
      const intensity = wheel.contact && wheel.load > 100 && slipping
        ? Math.max(lateral / 6, wheelspin / 10) : 0;
      trail.sample(index, wheel, intensity);
    });
    trail.commit();
  });

  // Contact vertices are already world-space. Never inherit the car's transform.
  return createPortal(<mesh geometry={trail.geometry} frustumCulled={false} renderOrder={1}>
    <meshBasicMaterial vertexColors transparent depthWrite={false} side={DoubleSide}
      polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
  </mesh>, scene);
}
