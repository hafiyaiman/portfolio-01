"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, useGLTF } from "@react-three/drei";
import { Group } from "three";
import { gsap } from "gsap";

interface SingleCoinProps {
  progressSeed: number;
  isActive: boolean;
}

function SingleCoin({ progressSeed, isActive }: SingleCoinProps) {
  const { scene } = useGLTF("/models/blackCoin.glb");
  const clone = useMemo(() => scene.clone(), [scene]);
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    const group = groupRef.current;

    if (!group) return;

    gsap.to(group.rotation, {
      y: progressSeed * Math.PI * 4 + (isActive ? Math.PI * 0.6 : 0),
      x: 0.28 + progressSeed * 0.18,
      z: 0.08,
      duration: 0.7,
      ease: "power3.out",
      overwrite: true,
    });

    gsap.to(group.position, {
      y: isActive ? 0.08 : 0,
      z: isActive ? 0.25 : 0,
      duration: 0.7,
      ease: "power3.out",
      overwrite: true,
    });

    gsap.to(group.scale, {
      x: isActive ? 2.95 : 2.65,
      y: isActive ? 2.95 : 2.65,
      z: isActive ? 2.95 : 2.65,
      duration: 0.7,
      ease: "power3.out",
      overwrite: true,
    });
  }, [isActive, progressSeed]);

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      rotation={[0.28, 0, 0.08]}
      scale={2.65}
    >
      <primitive object={clone} />
    </group>
  );
}

interface JourneyCoinSceneProps {
  progressSeed: number;
  isActive: boolean;
}

export function JourneyCoinScene({
  progressSeed,
  isActive,
}: JourneyCoinSceneProps) {
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 0, 7.4], fov: 26 }}>
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
        <SingleCoin progressSeed={progressSeed} isActive={isActive} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/blackCoin.glb");
