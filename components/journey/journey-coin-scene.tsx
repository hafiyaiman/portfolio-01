"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";

type DampableValue = {
  x: number;
  y: number;
  z: number;
};

type CoinGroup = {
  rotation: DampableValue;
  position: DampableValue;
  scale: DampableValue;
};

function lerp(start: number, end: number, alpha: number) {
  return start + (end - start) * alpha;
}

function damp(current: number, target: number, smoothing: number, delta: number) {
  return lerp(current, target, 1 - Math.exp(-smoothing * delta));
}

interface SingleCoinProps {
  progressSeed: number;
}

function SingleCoin({ progressSeed }: SingleCoinProps) {
  const { scene } = useGLTF("/models/blackCoin.glb");
  const clone = useMemo(() => scene.clone(), [scene]);
  const groupRef = useRef<CoinGroup | null>(null);

  useFrame((state, delta) => {
    const group = groupRef.current;

    if (!group) return;

    const t = state.clock.elapsedTime;
    const flipRotation = t * 2.8;
    const scrollTiltX = 0.22 + progressSeed * 0.28;
    const scrollTiltZ = 0.06 + Math.sin(progressSeed * Math.PI * 2) * 0.08;
    const scrollY = lerp(0.18, -0.18, progressSeed);
    const scrollZ = 0.3 + Math.sin(progressSeed * Math.PI) * 0.12;
    const scrollScale = 2.55 + Math.sin(progressSeed * Math.PI) * 0.14;

    group.rotation.y = damp(
      group.rotation.y,
      flipRotation,
      5,
      delta,
    );
    group.rotation.x = damp(
      group.rotation.x,
      scrollTiltX + Math.sin(t * 1.15) * 0.04,
      5,
      delta,
    );
    group.rotation.z = damp(
      group.rotation.z,
      scrollTiltZ,
      5,
      delta,
    );
    group.position.y = damp(
      group.position.y,
      scrollY + Math.sin(t * 1.8) * 0.08,
      5,
      delta,
    );
    group.position.z = damp(group.position.z, scrollZ, 5, delta);
    group.scale.x = damp(group.scale.x, scrollScale, 5, delta);
    group.scale.y = damp(group.scale.y, scrollScale, 5, delta);
    group.scale.z = damp(group.scale.z, scrollScale, 5, delta);
  });

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0.3]}
      rotation={[0.28, 0, 0.08]}
      scale={2.65}
    >
      <primitive object={clone} />
    </group>
  );
}

interface JourneyCoinSceneProps {
  progressSeed: number;
}

export function JourneyCoinScene({ progressSeed }: JourneyCoinSceneProps) {
  return (
    <div className="absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 7.4], fov: 26 }}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => {
          // The Windows/D3D shader compiler emits noisy precision warnings for
          // Three.js-generated shaders in this scene. They don't affect output,
          // so we keep them out of the browser console.
          gl.debug.checkShaderErrors = false;
        }}
      >
        <ambientLight intensity={1.05} />
        <directionalLight position={[4, 5, 6]} intensity={3.1} color="#ffd8bb" />
        <directionalLight position={[-6, -3, 2]} intensity={1.15} color="#7a1600" />
        <spotLight
          position={[0, 5, 6]}
          intensity={30}
          angle={0.34}
          penumbra={1}
          color="#f48a41"
        />
        <SingleCoin progressSeed={progressSeed} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/blackCoin.glb");
