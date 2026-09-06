"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Object3D, PointLight, SpotLight } from "three";
import { useGameStore } from "../stores/useGameStore";

/** Actual lights illuminate the road; emissive lens materials alone cannot do that. */
export function VehicleLights() {
  const [targets] = useState(() => ({
    highLeft: new Object3D(),
    highRight: new Object3D(),
    lowLeft: new Object3D(),
    lowRight: new Object3D(),
    reverse: new Object3D(),
  }));
  const tails = useRef<(PointLight | null)[]>([]);
  const reverse = useRef<SpotLight>(null);

  useFrame(() => {
    const state = useGameStore.getState();
    for (const light of tails.current)
      if (light) light.intensity = state.braking ? 8 : 1.4;
    if (reverse.current) reverse.current.intensity = state.gear === -1 ? 65 : 0;
  });

  return (
    <group>
      {/* Target markers down the track */}
      <primitive object={targets.highLeft} position={[0.395, -1.4, 26]} />
      <primitive object={targets.highRight} position={[-0.395, -1.4, 26]} />
      <primitive object={targets.lowLeft} position={[0.62, -1.5, 18]} />
      <primitive object={targets.lowRight} position={[-0.62, -1.5, 18]} />
      <primitive object={targets.reverse} position={[0, -1.2, -12]} />

      {/* Headlight assemblies for Left (+X) and Right (-X) sides */}
      {[-1, 1].map((side, i) => (
        <group key={side}>
          {/* Lampu Besar: inner wide reflector chamber / main high beam */}
          <spotLight
            position={[side * 0.395, -0.337, 2.035]}
            target={side > 0 ? targets.highLeft : targets.highRight}
            color="#fff3df"
            intensity={110}
            distance={48}
            angle={0.36}
            penumbra={0.6}
            decay={1.5}
          />
          {/* Lampu Kecil: projector eye & halo ring / cool xenon low beam */}
          <spotLight
            position={[side * 0.563, -0.336, 1.955]}
            target={side > 0 ? targets.lowLeft : targets.lowRight}
            color="#dbeaff"
            intensity={60}
            distance={30}
            angle={0.46}
            penumbra={0.7}
            decay={1.5}
          />
          <pointLight
            position={[side * 0.563, -0.336, 1.955]}
            color="#dbeaff"
            intensity={1.2}
            distance={1.2}
            decay={2}
          />
          {/* Signal: outer amber corner bulb marker glow */}
          <pointLight
            position={[side * 0.655, -0.319, 1.878]}
            color="#ff8c00"
            intensity={1.6}
            distance={1.5}
            decay={2}
          />
          {/* Tail lights */}
          <pointLight
            ref={(node) => {
              tails.current[i] = node;
            }}
            position={[side * 0.61, -0.15, -2.2]}
            color="#ff2420"
            intensity={1.4}
            distance={3.5}
            decay={2}
          />
        </group>
      ))}

      {/* Reverse backup lamp */}
      <spotLight
        ref={reverse}
        position={[0, -0.15, -2.2]}
        target={targets.reverse}
        color="#e7f1ff"
        intensity={0}
        distance={15}
        angle={0.7}
        penumbra={0.8}
        decay={1.5}
      />
    </group>
  );
}
