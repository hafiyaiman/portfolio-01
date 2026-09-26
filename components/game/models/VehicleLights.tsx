"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, SpotLight } from "three";
import { useGameStore } from "../stores/useGameStore";

/** Emissive lenses retain the individual lamps; two beams light the road.
 * Small marker lights used to add nine extra lights to every scenery shader. */
export function VehicleLights() {
  const [targets] = useState(() => [new Object3D(), new Object3D()]);
  const beams = useRef<(SpotLight | null)[]>([]);
  useFrame(() => {
    const reversing = useGameStore.getState().gear === -1;
    beams.current.forEach((beam, i) => {
      if (!beam) return;
      beam.position.z = reversing ? -2.2 : 2.035;
      beam.intensity = reversing ? 45 : 140;
      targets[i].position.z = reversing ? -12 : 24;
    });
  });
  return <group>
    {[-1, 1].map((side, i) => <group key={side}>
      <primitive object={targets[i]} position={[side * 0.5, -1.4, 24]} />
      <spotLight ref={node => { beams.current[i] = node; }}
        position={[side * 0.5, -0.337, 2.035]} target={targets[i]}
        color="#fff3df" intensity={140} distance={48}
        angle={0.46} penumbra={0.7} decay={1.5} />
    </group>)}
  </group>;
}
